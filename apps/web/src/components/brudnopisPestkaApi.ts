import { exportToBlob, getCommonBounds } from "@excalidraw/excalidraw";
import type { ExcalidrawElement, NonDeleted } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { AiError } from "../ai";
import { currentUserId } from "../auth";
import { functionsUrl, supabase } from "../supabase";
import { czytajOdpowiedzTablicy, type ZdarzeniaTablicy } from "./strumienTablicy";

export type Punkt = [number, number];
type Ramka = [Punkt, Punkt];
type ZywyElement = NonDeleted<ExcalidrawElement>;
export type ObszarBledu = { x: number; y: number; width: number; height: number };
export type Ksztalt =
  | { typ: "odcinek" | "strzalka" | "prostokat" | "elipsa"; punkty: [Punkt, Punkt] }
  | { typ: "trojkat"; punkty: [Punkt, Punkt, Punkt] };

export type DopisekPestki = { typ: "obliczenia" | "tekst" | "kod"; tekst: string };

export type OznaczenieBryly = "a" | "b" | "h" | "r" | "przekatnaPodstawy" | "przekatnaBryly" | "przeciwprostokatna" | "tworzaca";
export type BrylaPestki = {
  typ: "szescian" | "prostopadloscian" | "graniastoslup-trojkatny" | "ostroslup-czworokatny" | "walec" | "stozek" | "kula";
  wymiary: [number, number, number] | null;
  oznaczenia: Partial<Record<OznaczenieBryly, string>>;
};
export const DOMYSLNY_OBROT_BRYLY = 35;

export type OdpowiedzPestki = {
  odczyt: string | null;
  wskazowka: string;
  ksztalty: Ksztalt[];
  dopiski: DopisekPestki[];
  bryla: BrylaPestki | null;
  obrotBryly?: number;
  pominietoElementy?: boolean;
  stanProwadzenia?: "czekam" | "krok" | "blad";
  /** Uczeń utknął po wskazówce: Pestka pokazuje i tłumaczy jeden krok, także dopiskami. */
  pokazKrok?: boolean;
  ramkaBledu?: Ramka;
  obszarBledu?: ObszarBledu;
};

type Prowadzenie = { zmienione: readonly ZywyElement[]; poprzedniaWskazowka?: string };
const MARGINES_OBRAZU = 16;

export function czyZapisPestki(e: ExcalidrawElement) {
  return e.customData?.pestka === true;
}

export function bezZapisowPestki(elementy: readonly ZywyElement[]) {
  // Starsze zapisy Pestki miały podpis i grupę, zanim zapisywaliśmy oznaczenie źródła.
  const starszeGrupy = new Set(elementy.flatMap((e) =>
    e.type === "text" && e.text === "Pestka" && e.strokeColor === "#2f55b4" && !czyZapisPestki(e) ? e.groupIds : [],
  ));
  return elementy.filter((e) => !czyZapisPestki(e) && !e.groupIds.some((id) => starszeGrupy.has(id)));
}

async function obrazTablicy(api: ExcalidrawImperativeAPI, elements: readonly ZywyElement[], signal: AbortSignal) {
  if (!elements.length) return undefined;
  let obraz: Blob;
  try {
    obraz = await exportToBlob({
      elements,
      files: api.getFiles(),
      appState: { exportBackground: true, viewBackgroundColor: "#ffffff", exportWithDarkMode: false, exportEmbedScene: false, exportScale: 1 },
      maxWidthOrHeight: 1600,
      exportPadding: MARGINES_OBRAZU,
      mimeType: "image/jpeg",
      quality: 0.9,
    });
  } catch {
    throw new AiError("bad_snapshot", 400);
  }
  signal.throwIfAborted();
  if (!obraz.size || obraz.size > 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(obraz.type)) {
    throw new AiError("bad_snapshot", 400);
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const wynik = typeof reader.result === "string" ? reader.result.split(",", 2)[1] : undefined;
      if (wynik) resolve(wynik);
      else reject(new AiError("bad_snapshot", 400));
    };
    reader.onerror = () => reject(new AiError("bad_snapshot", 400));
    reader.readAsDataURL(obraz);
  });
  return { mime: obraz.type, base64 };
}

function wspolrzedneObrazu(elementy: readonly ZywyElement[], zmienione: readonly ZywyElement[]) {
  const [x1, y1, x2, y2] = getCommonBounds(elementy);
  const lewo = x1 - MARGINES_OBRAZU;
  const gora = y1 - MARGINES_OBRAZU;
  const szerokosc = x2 - lewo + MARGINES_OBRAZU;
  const wysokosc = y2 - gora + MARGINES_OBRAZU;
  const [a, b, c, d] = getCommonBounds(zmienione);
  const zapas = 8;
  const zmiana: Ramka = [
    [Math.max(0, (a - zapas - lewo) / szerokosc), Math.max(0, (b - zapas - gora) / wysokosc)],
    [Math.min(1, (c + zapas - lewo) / szerokosc), Math.min(1, (d + zapas - gora) / wysokosc)],
  ];
  function obszarBledu(ramka: Ramka | undefined): ObszarBledu | undefined {
    if (!ramka) return;
    const [[l, g], [p, s]] = ramka;
    if (![l, g, p, s].every(Number.isFinite) || l < 0 || g < 0 || p > 1 || s > 1 || p <= l || s <= g) return;
    const [x, y, xKoniec, yKoniec] = [lewo + l * szerokosc, gora + g * wysokosc, lewo + p * szerokosc, gora + s * wysokosc];
    const przyDopisku = zmienione.some((element) => {
      const [ex, ey, ekx, eky] = getCommonBounds([element]);
      return ex - zapas < xKoniec && ekx + zapas > x && ey - zapas < yKoniec && eky + zapas > y;
    });
    if (przyDopisku) return { x: x - 3, y: y - 3, width: xKoniec - x + 6, height: yKoniec - y + 6 };
  }
  return { zmiana, obszarBledu };
}

const CZAS_ODPOWIEDZI = 65_000;

/** Wywołanie nauka-ai zwykłym fetch w trybie strumienia (functions.invoke czeka na całą odpowiedź). */
async function zapytajFunkcje(body: Record<string, unknown>, signal: AbortSignal, naZywo?: ZdarzeniaTablicy) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AiError("not_signed_in", 401);
  const kontroler = new AbortController();
  const przerwij = () => kontroler.abort();
  signal.addEventListener("abort", przerwij, { once: true });
  const czas = window.setTimeout(przerwij, CZAS_ODPOWIEDZI);
  try {
    const res = await fetch(`${functionsUrl}/nauka-ai`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal: kontroler.signal,
    });
    return await czytajOdpowiedzTablicy(res, naZywo);
  } catch (e) {
    signal.throwIfAborted();
    // Brak sieci, przekroczony czas albo urwane połączenie: jak dawniej przy functions.invoke.
    throw e instanceof AiError ? e : new AiError("server_error", 500);
  } finally {
    window.clearTimeout(czas);
    signal.removeEventListener("abort", przerwij);
  }
}

/**
 * Pyta Pestkę o tablicę. naZywo dostaje kawałki strumienia, zanim dojdzie cała odpowiedź: wskazówkę pisaną na bieżąco
 * oraz gotowe figury i dopiski; przy funkcji sprzed strumienia nic nie jest wołane.
 */
export async function omowTablice(
  api: ExcalidrawImperativeAPI, user: string, polecenie: string, pytanie: string, signal: AbortSignal, prowadzenie?: Prowadzenie,
  naZywo?: ZdarzeniaTablicy,
) {
  const scena = api.getSceneElements();
  const elementy = prowadzenie ? bezZapisowPestki(scena) : scena;
  const wspolrzedne = prowadzenie && elementy.length ? wspolrzedneObrazu(elementy, prowadzenie.zmienione) : undefined;
  const zapisUcznia = prowadzenie?.zmienione.flatMap((e) => e.type === "text" ? [e.text] : []).join("\n").trim().slice(0, 500);
  const obraz = await obrazTablicy(api, elementy, signal);
  if (!obraz && !pytanie) throw new AiError("empty_board", 400);
  signal.throwIfAborted();
  if (currentUserId() !== user) throw new AiError("not_signed_in", 401);
  const data = await zapytajFunkcje({
    action: "omow-brudnopis", polecenie, pytanie: pytanie || undefined, obraz,
    prowadzenie: wspolrzedne && {
      zmiana: wspolrzedne.zmiana, poprzedniaWskazowka: prowadzenie?.poprzedniaWskazowka, zapisUcznia: zapisUcznia || undefined,
    },
  }, signal, naZywo) as OdpowiedzPestki | null;
  if (!data || typeof data.wskazowka !== "string" || !Array.isArray(data.ksztalty)) {
    throw new AiError("server_error", 500);
  }
  if (prowadzenie && !["czekam", "krok", "blad"].includes(data.stanProwadzenia ?? "")) {
    throw new AiError("bad_model_response", 424);
  }
  return {
    ...data,
    dopiski: Array.isArray(data.dopiski) ? data.dopiski : [],
    bryla: data.bryla ?? null,
    obszarBledu: data.stanProwadzenia === "blad" ? wspolrzedne?.obszarBledu(data.ramkaBledu) : undefined,
  };
}
