import { useEffect, useRef, useState, type RefObject } from "react";
import { hashElementsVersion } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, NonDeleted } from "@excalidraw/excalidraw/element/types";
import { AiError } from "../ai";
import { currentUserId } from "../auth";
import { bezZapisowPestki, omowTablice, type OdpowiedzPestki } from "./brudnopisPestkaApi";
import type { ZdarzeniaTablicy } from "./strumienTablicy";

const PAUZA_PO_PISANIU = 2800;
const ODSTEP_ANALIZ = 14_000;

type Element = NonDeleted<ExcalidrawElement>;
export type ZapisProwadzenia = { signal: AbortSignal; aktualny: () => boolean; zmienione: readonly Element[] };
/**
 * Jedna analiza od strony tablicy: figury i dopiski ze strumienia rysują się od razu (`zdarzenia`), wynik je
 * zatwierdza albo dokłada resztę (`pokaz`), a `porzuc` ściera to, co zdążyło się narysować (czekam, nieaktualne, błąd).
 * Wskazówka nie pisze się na żywo: czy to krok, błąd czy „czekam”, wiadomo dopiero z wyniku.
 */
export type ProwadzenieNaZywo = {
  zdarzenia: ZdarzeniaTablicy;
  pokaz: (dane: OdpowiedzPestki) => Promise<boolean>;
  porzuc: () => Promise<void>;
};
type Stan = "wylaczone" | "czeka" | "czyta" | { blad: string };
type Sesja = {
  konto: string;
  polecenie: string;
  timer: number | null;
  kontroler: AbortController | null;
  sprawdzone: Map<string, number>;
  ostatniWidok?: number;
  blokada?: boolean;
  wskazowka?: string;
};

export function useProwadzeniePestki({
  api, konto, plik, polecenie, czyBazowy, pokaz,
}: {
  api: RefObject<ExcalidrawImperativeAPI | null>;
  konto: string | null;
  plik: string;
  polecenie?: string;
  czyBazowy: (id: string) => boolean;
  pokaz: (zapis: ZapisProwadzenia) => ProwadzenieNaZywo;
}) {
  const [stan, setStan] = useState<Stan>("wylaczone");
  const sesja = useRef<Sesja | null>(null);
  const ostatniaAnaliza = useRef(0);
  const wpisz = useRef(pokaz);
  wpisz.current = pokaz;

  function zakoncz(s: Sesja | null) {
    if (!s) return;
    if (s.timer !== null) window.clearTimeout(s.timer);
    s.kontroler?.abort();
    sesja.current = null;
  }

  function zatrzymaj() {
    zakoncz(sesja.current);
    setStan("wylaczone");
  }

  function praca(a: ExcalidrawImperativeAPI) {
    return bezZapisowPestki(a.getSceneElements()).filter((e) => !czyBazowy(e.id));
  }

  function zajeta(a: ExcalidrawImperativeAPI) {
    const stanTablicy = a.getAppState();
    return document.hidden || stanTablicy.isLoading || stanTablicy.cursorButton === "down" ||
      Boolean(stanTablicy.editingTextElement || stanTablicy.newElement);
  }

  function planuj() {
    const s = sesja.current;
    const a = api.current;
    if (!a || !s || s.timer !== null || s.kontroler || zajeta(a) || currentUserId() !== s.konto) return;
    const zmienione = praca(a).some((e) => s.sprawdzone.get(e.id) !== e.versionNonce);
    if (!zmienione) return;
    const opoznienie = Math.max(PAUZA_PO_PISANIU, ODSTEP_ANALIZ - (Date.now() - ostatniaAnaliza.current));
    s.timer = window.setTimeout(() => {
      s.timer = null;
      void analizuj(s, a);
    }, opoznienie);
  }

  function odswiez() {
    const s = sesja.current;
    const a = api.current;
    if (!a || !s) return;
    const wersja = hashElementsVersion(praca(a));
    const blokada = zajeta(a);
    if (wersja === s.ostatniWidok && blokada === s.blokada) return;
    s.ostatniWidok = wersja;
    s.blokada = blokada;
    if (s.timer !== null) window.clearTimeout(s.timer);
    s.timer = null;
    // Uczeń pisze dalej: odpowiedź o poprzednim stanie tablicy byłaby nieaktualna, więc przerywamy strumień
    // (i rysowanie z niego); nowa analiza ruszy po pauzie.
    s.kontroler?.abort();
    planuj();
  }

  async function analizuj(s: Sesja, a: ExcalidrawImperativeAPI) {
    if (sesja.current !== s || api.current !== a || zajeta(a) || currentUserId() !== s.konto) return;
    const elementy = praca(a);
    const zmienione = elementy.filter((e) => s.sprawdzone.get(e.id) !== e.versionNonce);
    if (!zmienione.length) return;
    const wersja = hashElementsVersion(elementy);
    const kontroler = new AbortController();
    s.kontroler = kontroler;
    ostatniaAnaliza.current = Date.now();
    setStan("czyta");
    const aktywna = () => sesja.current === s && api.current === a && currentUserId() === s.konto && !kontroler.signal.aborted;
    const aktualny = () => aktywna() && !zajeta(a) && hashElementsVersion(praca(a)) === wersja;
    const zywy = wpisz.current({ signal: kontroler.signal, aktualny, zmienione });
    try {
      const odpowiedz = await omowTablice(a, s.konto, s.polecenie, "", kontroler.signal, {
        zmienione, poprzedniaWskazowka: s.wskazowka,
      }, zywy.zdarzenia);
      if (!aktualny()) return await zywy.porzuc();
      s.sprawdzone = new Map(elementy.map((e) => [e.id, e.versionNonce]));
      if (odpowiedz.stanProwadzenia === "czekam" || (odpowiedz.wskazowka === s.wskazowka && !odpowiedz.obszarBledu)) return await zywy.porzuc();
      if (await zywy.pokaz(odpowiedz)) {
        // Serwer pokazuje krok, gdy uczeń utknął po wskazówce o błędzie; potwierdzenie albo pokazany krok tego nie liczą.
        s.wskazowka = odpowiedz.stanProwadzenia === "blad" && !odpowiedz.pokazKrok ? odpowiedz.wskazowka : undefined;
      }
    } catch (e) {
      await zywy.porzuc();
      if (aktywna()) {
        zakoncz(s);
        setStan({ blad: e instanceof AiError ? e.code : "server_error" });
      }
    } finally {
      if (sesja.current === s) {
        s.kontroler = null;
        setStan("czeka");
        planuj();
      }
    }
  }

  function wlacz() {
    const a = api.current;
    if (!a || a.getAppState().isLoading || !konto || !polecenie || currentUserId() !== konto || sesja.current) return false;
    sesja.current = {
      konto, polecenie, timer: null, kontroler: null,
      sprawdzone: new Map(),
    };
    setStan("czeka");
    odswiez();
    return true;
  }

  useEffect(() => {
    setStan("wylaczone");
    return () => zakoncz(sesja.current);
  }, [plik, konto, polecenie]);

  useEffect(() => {
    if (stan === "wylaczone" || typeof stan === "object") return;
    document.addEventListener("visibilitychange", odswiez);
    return () => document.removeEventListener("visibilitychange", odswiez);
  }, [stan, api, czyBazowy]);

  return { wlacz, zatrzymaj, odswiez, stan };
}
