// Edytor brudnopisu: Excalidraw z opcjonalnym rysunkiem bazowym z arkusza.
// Ładowany leniwie (Brudnopis.tsx), bo Excalidraw waży kilkaset kB.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CaptureUpdateAction, convertToExcalidrawElements, Excalidraw, getCommonBounds, hashElementsVersion, newElementWith } from "@excalidraw/excalidraw";
import type { AppState, BinaryFileData, DataURL, ExcalidrawImperativeAPI, ExcalidrawInitialDataState, NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { Circle, Eraser, Footprints, Hand, Maximize2, MessagesSquare, Minimize2, Minus, MousePointer2, MoveUpRight, Pencil, Redo2, Scan, Square, Trash2, Type, Undo2, X, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";
import { useCiemny } from "../motyw";
import { CZAS, mniejRuchu } from "../ruch";
import { AiError } from "../ai";
import { currentUserId, useSession } from "../auth";
import { adresObrazu, type Obraz } from "../arkusze/typy";
import { HistoriaPestki, PestkaNaTablicy, type DymekPestki, type FazaPestki, type WpisHistorii } from "./BrudnopisPestka";
import { omowTablice, type OdpowiedzPestki, type Punkt } from "./brudnopisPestkaApi";
import {
  BLAD, dolozNaZywo, ostatniaKreska, pokazZapisPestki, przygotujZapisPestki, usunNaZywo, zapisNaZywo, zapiszDopiskiPestki, zetrzyjDopiskiPestki,
  type PozycjaZapisu,
} from "./brudnopisPestkaRysunek";
import { wczytajCzcionkiWzorow } from "./brudnopisPestkaWzory";
import { TutorAvatar } from "./TutorAvatar";
import { useProwadzeniePestki, type ProwadzenieNaZywo, type ZapisProwadzenia } from "./useProwadzeniePestki";
import styles from "./Brudnopis.module.css";

export const ID_RYSUNKU = "rysunek-bazowy";
// Dodatkowe rysunki (np. wykresy opcji A–F) mają id „rysunek-bazowy-1”, „-2”…
const czyBazowy = (id: string) => id === ID_RYSUNKU || id.startsWith(`${ID_RYSUNKU}-`);

type StanPestki = { faza: FazaPestki; punkt: Punkt; skok: number; dymek?: DymekPestki; prowadzenie?: boolean };

// Excalidraw na zdarzenie focus okna kończy gest, któremu „zginął” pointerup
// (maybeCleanupAfterMissingPointerUp). Gdy strona nie ma fokusu (aktywne inne okno),
// pierwsze dotknięcie piórem najpierw zaczyna kreskę, a dopiero potem okno dostaje
// focus, więc kreska urywała się na kropce. Taki focus połykamy: przyszedł chwilę po
// dociśnięciu, a pióro wciąż jest na płótnie. Nie polegamy na document.hasFocus(),
// bo przeglądarka bywa już „aktywna” w chwili pointerdown. Nasłuch powstaje przy
// wczytaniu modułu, czyli przed nasłuchem Excalidraw, więc idzie pierwszy.
let docisniety = false;
let docisnietyOd = 0;
window.addEventListener(
  "pointerdown",
  () => {
    docisniety = true;
    docisnietyOd = performance.now();
  },
  true,
);
window.addEventListener("pointerup", () => (docisniety = false), true);
window.addEventListener(
  "focus",
  (e) => {
    if (docisniety && performance.now() - docisnietyOd < 1500) e.stopImmediatePropagation();
  },
  true,
);

// Okrojony zestaw: to, czego potrzeba w brudnopisie do matematyki. Wbudowany
// pasek Excalidraw jest ukryty (Brudnopis.module.css), żeby nie zasłaniał płótna.
const NARZEDZIA = [
  { typ: "selection", nazwa: "Zaznacz", ikona: MousePointer2 },
  { typ: "hand", nazwa: "Przesuń widok", ikona: Hand },
  { typ: "freedraw", nazwa: "Ołówek", ikona: Pencil },
  { typ: "line", nazwa: "Linia", ikona: Minus },
  { typ: "arrow", nazwa: "Strzałka", ikona: MoveUpRight },
  { typ: "rectangle", nazwa: "Prostokąt", ikona: Square },
  { typ: "ellipse", nazwa: "Elipsa", ikona: Circle },
  { typ: "text", nazwa: "Tekst", ikona: Type },
  { typ: "eraser", nazwa: "Gumka", ikona: Eraser },
] as const satisfies readonly { typ: string; nazwa: string; ikona: LucideIcon }[];
type Narzedzie = (typeof NARZEDZIA)[number]["typ"];

const KOLORY = [
  { wartosc: "#1b232e", nazwa: "czarny" },
  { wartosc: "#ff7448", nazwa: "pomarańczowy" },
  { wartosc: "#2f55b4", nazwa: "niebieski" },
  { wartosc: "#1f9d63", nazwa: "zielony" },
];

// Excalidraw w ciemnym motywie rysuje płótno przez filtr (invert 93% + hue-rotate 180°), więc zapisany kolor
// kreski wygląda inaczej. Przyciski kolorów pokazują ten kolor z filtrem, żeby zgadzał się z tym, co widać na
// płótnie (czarny #1b232e na ciemnym pasku byłby niewidoczny). Do zapisu idzie zawsze oryginał.
const KOLOR_NA_CIEMNYM: Record<string, string> = {
  "#1b232e": "#cad1da",
  "#ff7448": "#d35c36",
  "#2f55b4": "#86a6f8",
  "#1f9d63": "#2f9b6a",
};

// Grubość kreski. Zakreślacz to gruba, półprzezroczysta kreska do oznaczania
// fragmentów wykresu bez zasłaniania go.
// Cienkie służą do precyzyjnego rysowania po wykresach, średnia (domyślna) do pisania.
// Najcieńsze są dla tabletu graficznego: mocny nacisk pogrubia kreskę kilka razy.
const GRUBOSCI = [
  { id: "wlos", nazwa: "Najcieńsza kreska", szerokosc: 0.15, krycie: 100, kropka: 2 },
  { id: "bardzo-cienka", nazwa: "Bardzo cienka kreska", szerokosc: 0.3, krycie: 100, kropka: 3 },
  { id: "cienka", nazwa: "Cienka kreska", szerokosc: 0.5, krycie: 100, kropka: 4 },
  { id: "srednia", nazwa: "Średnia kreska", szerokosc: 1, krycie: 100, kropka: 7 },
  { id: "gruba", nazwa: "Gruba kreska", szerokosc: 2, krycie: 100, kropka: 11 },
  { id: "zakreslacz", nazwa: "Zakreślacz", szerokosc: 8, krycie: 35, kropka: 16 },
] as const;
type Grubosc = (typeof GRUBOSCI)[number];
const gruboscZ = (szerokosc: number, krycie: number) => GRUBOSCI.find((g) => g.szerokosc === szerokosc && g.krycie === krycie)?.id;
// Wybrana grubość to nawyk ucznia (np. najcieńsza przy tablecie graficznym),
// więc pamiętamy ją między zadaniami i wizytami.
const KLUCZ_GRUBOSCI = "sedno.brudnopis.grubosc";
function zapamietanaGrubosc(): Grubosc {
  const domyslna = GRUBOSCI.find((g) => g.id === "srednia")!;
  try {
    return GRUBOSCI.find((g) => g.id === localStorage.getItem(KLUCZ_GRUBOSCI)) ?? domyslna;
  } catch {
    return domyslna;
  }
}
// Kadry mają wymiary w punktach PDF; w brudnopisie rysunek jest nieco większy,
// żeby domyślna grubość kreski pasowała do skali figury.
const SKALA_RYSUNKU = 2.25;
// Startowe (i największe przy dopasowaniu) przybliżenie. Odręczna kreska
// Excalidraw ma ok. 4× „grubości” średnicy, więc przy 100% pismo wygląda jak
// pisane markerem; 75% z cienką kreską daje ok. 3 px, jak długopis.
const ZOOM_START = 0.75;

type Props = {
  plik: string; // identyfikator pliku rysunku, unikalny w arkuszu
  rysunek?: Obraz;
  elementy?: readonly unknown[];
  onZapisz: (elementy: readonly ExcalidrawElement[] | null) => void;
  pelny: boolean;
  /** Bez nich przycisków pełnego ekranu i zamknięcia nie ma (brudnopis w panelu informatyki). */
  onPelny?: () => void;
  onZamknij?: () => void;
  /** Płótno wypełnia wysokość i szerokość rodzica, paski narzędzi stoją nad nim i pod nim. */
  wPanelu?: boolean;
  /** Rysunki obok rysunku zadania, np. wykresy opcji A–F do zaznaczania. */
  dodatkoweRysunki?: Obraz[];
  pokazDodatkowe?: boolean;
  /** Wycinek z opcjami A–D na rysunkach: gdy da się go podzielić na opcje, to one stoją na płótnie zamiast rysunku zadania. */
  opcjeZWycinka?: Obraz;
  /** Zadanie bez obliczeń (odczyt z wykresu): rysunek większy, do zaznaczania na nim. */
  duzyRysunek?: boolean;
  poleceniePestki?: string;
};

// Rysunek zadania w (0, 0), a dodatkowe rysunki w rzędzie obok niego. Wszystkie zablokowane:
// uczeń rysuje po nich, ale ich nie przesunie ani nie usunie.
function rysunkiBazowe(plik: string, rysunek?: Obraz, dodatkowe: Obraz[] = []): { id: string; plik: string; obraz: Obraz; x: number; y: number }[] {
  const wynik: { id: string; plik: string; obraz: Obraz; x: number; y: number }[] = [];
  if (rysunek) wynik.push({ id: ID_RYSUNKU, plik, obraz: rysunek, x: 0, y: 0 });
  // Dodatkowe rysunki (wykresy opcji) w siatce po trzy w rzędzie, w kolejności liter.
  const x0 = rysunek ? rysunek.szer * SKALA_RYSUNKU + 80 : 0;
  // Cztery opcje w kwadracie 2 × 2, więcej po trzy w rzędzie.
  const kolumny = dodatkowe.length === 4 ? 2 : Math.min(3, dodatkowe.length);
  const szer = Math.max(0, ...dodatkowe.map((o) => o.szer * SKALA_RYSUNKU));
  const wys = Math.max(0, ...dodatkowe.map((o) => o.wys * SKALA_RYSUNKU));
  dodatkowe.forEach((obraz, i) => {
    const [k, w] = [i % kolumny, Math.floor(i / kolumny)];
    wynik.push({ id: `${ID_RYSUNKU}-${i + 1}`, plik: `${plik}-${i + 1}`, obraz, x: x0 + k * (szer + 40), y: w * (wys + 40) });
  });
  return wynik;
}

function elementyBazowe(plik: string, rysunek?: Obraz, dodatkowe: Obraz[] = []): ExcalidrawElement[] {
  const rysunki = rysunkiBazowe(plik, rysunek, dodatkowe);
  if (!rysunki.length) return [];
  return convertToExcalidrawElements(
    rysunki.map((r) => ({
      type: "image" as const,
      id: r.id,
      fileId: r.plik as FileId,
      x: r.x,
      y: r.y,
      width: r.obraz.szer * SKALA_RYSUNKU,
      height: r.obraz.wys * SKALA_RYSUNKU,
      locked: true,
      status: "saved" as const,
    })),
    // Stałe id: po nich poznajemy rysunki w zapisanej scenie.
    { regenerateIds: false },
  );
}

// Wycinek z wykresami opcji bywa sklejony z tekstem polecenia i pustą tabelą z arkusza,
// które są już nad płótnem. Ucinamy wszystko do ostatniej poziomej linii przez prawie
// całą szerokość (dolna krawędź tabeli): siatki wykresów stoją po dwie obok siebie,
// więc żadna ich linia nie ciągnie się przez cały wycinek.
async function bezTekstuNadWykresami(obraz: Obraz): Promise<Obraz> {
  try {
    const img = new Image();
    img.src = obraz.src.startsWith("data:") ? obraz.src : adresObrazu(obraz.src);
    await img.decode();
    const c = document.createElement("canvas");
    [c.width, c.height] = [img.naturalWidth, img.naturalHeight];
    const ctx = c.getContext("2d");
    if (!ctx) return obraz;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let linia = -1;
    for (let y = 0; y < c.height * 0.7; y++) {
      let ciag = 0;
      let najdluzszy = 0;
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        const ciemny = data[i] + data[i + 1] + data[i + 2] < 450;
        ciag = ciemny ? ciag + 1 : 0;
        najdluzszy = Math.max(najdluzszy, ciag);
      }
      if (najdluzszy > c.width * 0.8) linia = y;
    }
    if (linia < 0) return obraz;
    const od = linia + Math.round(c.height * 0.02);
    const wyciety = document.createElement("canvas");
    [wyciety.width, wyciety.height] = [c.width, c.height - od];
    wyciety.getContext("2d")!.drawImage(c, 0, -od);
    return { ...obraz, src: wyciety.toDataURL("image/png"), wys: (obraz.wys * wyciety.height) / c.height };
  } catch {
    return obraz;
  }
}

// Wycinek z kilkoma wykresami opcji (A i B obok siebie, C–F w siatce 2 × 2) dzielimy
// na osobne wykresy wzdłuż pustych pasów między nimi, żeby każda opcja stała na płótnie
// osobno i w tej samej wielkości.
async function naWykresy(obraz: Obraz): Promise<Obraz[]> {
  try {
    const img = new Image();
    img.src = obraz.src.startsWith("data:") ? obraz.src : adresObrazu(obraz.src);
    await img.decode();
    const [W, H] = [img.naturalWidth, img.naturalHeight];
    const c = document.createElement("canvas");
    [c.width, c.height] = [W, H];
    const ctx = c.getContext("2d");
    if (!ctx) return [obraz];
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, W, H);
    const ciemny = (x: number, y: number) => {
      const i = (y * W + x) * 4;
      return data[i] + data[i + 1] + data[i + 2] < 600;
    };
    // Najszerszy pusty pas w środkowej części (30–70%) osi: tam przebiega podział.
    const podzial = (dl: number, pusty: (t: number) => boolean) => {
      let [najlepszy, dlugosc, start] = [-1, 0, -1];
      for (let t = Math.floor(dl * 0.3); t <= Math.ceil(dl * 0.7); t++) {
        if (pusty(t)) {
          if (start < 0) start = t;
          if (t - start + 1 > dlugosc) [dlugosc, najlepszy] = [t - start + 1, Math.round((start + t) / 2)];
        } else start = -1;
      }
      return dlugosc >= Math.max(4, dl * 0.01) ? najlepszy : -1;
    };
    const pustaKolumna = (x: number, y0: number, y1: number) => {
      for (let y = y0; y < y1; y++) if (ciemny(x, y)) return false;
      return true;
    };
    const pustyWiersz = (y: number, x0: number, x1: number) => {
      for (let x = x0; x < x1; x++) if (ciemny(x, y)) return false;
      return true;
    };
    // Tekst polecenia nad rysunkami ciągnie się przez całą szerokość, więc pusty pas między
    // kolumnami szukamy od coraz niższego wiersza; to, co nad nim, jest już nad płótnem.
    let gora = 0;
    let kolumna = podzial(W, (x) => pustaKolumna(x, 0, H));
    for (let y = 8; kolumna < 0 && y < H * 0.6; y += 8) {
      kolumna = podzial(W, (x) => pustaKolumna(x, y, H));
      if (kolumna >= 0) gora = y;
    }
    if (kolumna < 0) return [obraz];
    // Pas mógł trafić w ostatnią linię tekstu: schodzimy do pierwszego całkiem pustego wiersza.
    if (gora > 0) while (gora < H * 0.6 && !pustyWiersz(gora, 0, W)) gora++;
    const wiersz = podzial(H - gora, (y) => pustyWiersz(gora + y, 0, W));
    const wiersze = wiersz < 0 ? [[gora, H]] : [[gora, gora + wiersz], [gora + wiersz, H]];
    const kafelki: Obraz[] = [];
    for (const [y0, y1] of wiersze) {
      // Rysunki w jednym rzędzie zaczynają się na tej samej wysokości (etykiety „A.” i „B.”).
      // Co wystaje wyżej tylko w jednej połowie, to resztka tekstu polecenia.
      const gorny = (x0: number, x1: number) => {
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (ciemny(x, y)) return y;
        return y1;
      };
      const start = Math.max(gorny(0, kolumna), gorny(kolumna, W));
      for (const [x0, x1] of [[0, kolumna], [kolumna, W]]) {
        // Bez białych marginesów wokół wykresu, żeby odstępy w siatce były równe.
        let [l, p, g, d] = [x1, x0, y1, y0];
        for (let y = Math.max(y0, start - 2); y < y1; y++)
          for (let x = x0; x < x1; x++)
            if (ciemny(x, y)) [l, p, g, d] = [Math.min(l, x), Math.max(p, x), Math.min(g, y), Math.max(d, y)];
        if (p < l) continue;
        const k = document.createElement("canvas");
        [k.width, k.height] = [p - l + 9, d - g + 9];
        k.getContext("2d")!.drawImage(c, -(l - 4), -(g - 4));
        kafelki.push({ ...obraz, src: k.toDataURL("image/png"), szer: (obraz.szer * k.width) / W, wys: (obraz.wys * k.height) / H });
      }
    }
    return kafelki;
  } catch {
    return [obraz];
  }
}

// Dodatkowe rysunki ukrywamy (isDeleted), zamiast je usuwać: wracają przy następnym podpunkcie.
const zDodatkowymi = (els: readonly ExcalidrawElement[], pokaz: boolean) =>
  els.map((e) => (czyBazowy(e.id) && e.id !== ID_RYSUNKU && e.isDeleted === pokaz ? newElementWith(e, { isDeleted: !pokaz }) : e));

// Obraz na białym tle. Excalidraw w ciemnym motywie odwraca obrazy, a potem filtr płótna odwraca je jeszcze raz;
// przezroczyste tło zostałoby czarne i czarne linie rysunku zniknęłyby. Z białym tłem wygląda to jak w jasnym motywie.
function naBialym(dataURL: string): Promise<string> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = Object.assign(document.createElement("canvas"), { width: img.naturalWidth, height: img.naturalHeight });
        const ctx = c.getContext("2d");
        if (!ctx || !c.width || !c.height) return ok(dataURL);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        ok(c.toDataURL("image/png"));
      } catch {
        ok(dataURL); // np. za duże płótno: bez spłaszczenia obraz i tak się wczyta
      }
    };
    img.onerror = () => ok(dataURL);
    img.src = dataURL;
  });
}

async function wczytajRysunek(plik: string, rysunek: Obraz): Promise<BinaryFileData | null> {
  try {
    // Data URL z importu nie wymaga pobierania; fetch obsłuży też starszą ścieżkę. Oba przechodzą przez naBialym.
    if (rysunek.src.startsWith("data:")) return { id: plik as FileId, dataURL: (await naBialym(rysunek.src)) as DataURL, mimeType: "image/png", created: Date.now() };
    const odp = await fetch(adresObrazu(rysunek.src));
    if (!odp.ok) return null;
    const blob = await odp.blob();
    const dataURL = await new Promise<string>((ok, blad) => {
      const r = new FileReader();
      r.onload = () => ok(r.result as string);
      r.onerror = blad;
      r.readAsDataURL(blob);
    });
    return { id: plik as FileId, dataURL: (await naBialym(dataURL)) as DataURL, mimeType: "image/png", created: Date.now() };
  } catch {
    return null; // bez rysunku brudnopis nadal działa, w miejscu obrazka zostaje ramka
  }
}

export default function BrudnopisEdytor({ plik, rysunek, elementy, onZapisz, pelny, onPelny, onZamknij, wPanelu, duzyRysunek, dodatkoweRysunki = [], pokazDodatkowe = true, opcjeZWycinka, poleceniePestki }: Props) {
  const [startowaGrubosc] = useState(zapamietanaGrubosc);
  const ciemny = useCiemny();
  const naEkranie = (k: string) => (ciemny ? (KOLOR_NA_CIEMNYM[k] ?? k) : k);
  const przyciete = useRef<Obraz[]>([]);
  const glownyRef = useRef<Obraz | undefined>(rysunek);
  const pokaz = useRef(pokazDodatkowe);
  pokaz.current = pokazDodatkowe;
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const [pestka, setPestka] = useState<StanPestki | null>(null);
  const [historia, setHistoria] = useState<WpisHistorii[]>([]);
  const [historiaOtwarta, setHistoriaOtwarta] = useState(false);
  const pisaniePestki = useRef<AbortController | null>(null);
  const zapytanie = useRef<AbortController | null>(null);
  const nakladkaPestki = useRef<HTMLCanvasElement>(null);
  const idHistorii = useId();
  const przyciskPestki = useRef<HTMLButtonElement>(null);
  const sesja = useSession();
  const konto = sesja ? sesja.user.id : null;
  const prowadzenie = useProwadzeniePestki({ api, konto, plik, polecenie: poleceniePestki, czyBazowy, pokaz: pokazProwadzenie });
  const prowadzi = prowadzenie.stan === "czeka" || prowadzenie.stan === "czyta";
  const dopiszDoHistorii = (wpis: Omit<WpisHistorii, "id">) => setHistoria((h) => [...h, { ...wpis, id: (h.at(-1)?.id ?? 0) + 1 }]);

  useEffect(() => {
    if (!poleceniePestki) setPestka(null);
  }, [poleceniePestki]);
  useEffect(() => () => {
    pisaniePestki.current?.abort();
    zapytanie.current?.abort();
    zapytanie.current = null;
  }, [plik, pelny, poleceniePestki, konto]);

  // Miejsce na Pestkę przy ostatniej kresce ucznia (po prawej, nad jej górną krawędzią), a bez pracy w rogu widoku.
  function punktPrzyKresce(): Punkt {
    const a = api.current;
    if (!a) return [0, 0];
    const stan = a.getAppState();
    const z = stan.zoom.value;
    const kreska = ostatniaKreska(a.getSceneElements(), czyBazowy);
    if (!kreska) return [-stan.scrollX + 16 / z, -stan.scrollY + 16 / z];
    const [, y1, x2] = getCommonBounds([kreska]);
    return [x2 + 12 / z, y1 - 8 / z];
  }

  const zamknijPestke = () => {
    const wPestce = Boolean(document.activeElement?.closest(`.${styles.pestkaNaTablicy}, .${styles.dokTablicy}`));
    setPestka(null);
    if (typeof prowadzenie.stan === "object") prowadzenie.zatrzymaj();
    // Fokus wraca do przycisku tylko, gdy był w polu Pestki; bez przewijania strony.
    if (wPestce) przyciskPestki.current?.focus({ preventScroll: true });
  };

  function otworzPole() {
    if (zapytanie.current || pisaniePestki.current) return;
    if (!konto) return bladPestki("not_signed_in");
    setPestka({ faza: "pole", punkt: punktPrzyKresce(), skok: 0 });
  }

  function zetrzyjDopiski() {
    if (api.current) zetrzyjDopiskiPestki(api.current);
    setPestka((p) => (p?.faza === "dymek" && p.dymek ? { ...p, dymek: { ...p.dymek, zetrzyj: undefined, pokaz: undefined } } : p));
  }

  function bladPestki(kod: string, ponow?: () => void, punkt = punktPrzyKresce()) {
    setPestka({ faza: "dymek", punkt, skok: 0, dymek: { blad: kod, ponow } });
  }

  async function zapytaj(pytanie: string) {
    const a = api.current;
    if (zapytanie.current || pisaniePestki.current) return;
    if (!konto || currentUserId() !== konto) return bladPestki("not_signed_in");
    if (!a || a.getAppState().isLoading || !poleceniePestki) return bladPestki("board_loading", () => void zapytaj(pytanie));
    const c = new AbortController();
    zapytanie.current = c;
    const punkt = punktPrzyKresce();
    // Pole pytania znika, więc fokus wraca do twarzy Pestki w pasku, a nie na początek strony.
    if (document.activeElement?.closest(`.${styles.pestkaNaTablicy}, .${styles.dokTablicy}`)) przyciskPestki.current?.focus({ preventScroll: true });
    setPestka({ faza: "mysli", punkt, skok: 0 });
    // Wskazówka pisze się w dymku od pierwszych słów modelu, a figury i dopiski rysują się, gdy przychodzą (po kolei,
    // jedna kolejka). Wynik tylko zatwierdza zapis jednym krokiem cofania i dokłada resztę (ramka błędu, bryła).
    let naZywo: ReturnType<typeof zapisNaZywo> | null = null;
    let kolejka: Promise<unknown> = Promise.resolve();
    const dokladaj = (p: PozycjaZapisu) => {
      kolejka = kolejka.then(() => rysujNaZywo(a, p, c.signal, () => (naZywo ??= zapisNaZywo(a, czyBazowy)))).catch(() => {});
    };
    const sprzatnij = () => {
      if (naZywo && api.current === a) usunNaZywo(a, naZywo.elementy);
    };
    try {
      const dane = await omowTablice(a, konto, poleceniePestki, pytanie, c.signal, undefined, {
        wskazowka: (tekst) => {
          if (!c.signal.aborted) setPestka((p) => (p?.faza === "mysli" || p?.faza === "pisze" ? { ...p, dymek: { tekst } } : p));
        },
        ksztalt: (ksztalt) => dokladaj({ ksztalt }),
        dopisek: (dopisek) => dokladaj({ dopisek }),
      });
      await kolejka;
      if (c.signal.aborted) return sprzatnij();
      zapytanie.current = null;
      dopiszDoHistorii({ pytanie, dane });
      const zywy = naZywo as ReturnType<typeof zapisNaZywo> | null;
      const gotowe = zywy?.dokoncz(dane);
      // Wynik inny niż strumień (np. serwer przyciął zapis): rysunek z wyniku zastępuje zapis na żywo.
      if (zywy && !gotowe) sprzatnij();
      await pokazNaTablicy(dane, undefined, false, zywy && gotowe ? { elementy: zywy.elementy, ...gotowe } : undefined);
    } catch (e) {
      await kolejka;
      sprzatnij();
      if (c.signal.aborted) return;
      const kod = e instanceof AiError ? e.code : "server_error";
      dopiszDoHistorii({ pytanie, blad: kod });
      bladPestki(kod, () => void zapytaj(pytanie), punkt);
    } finally {
      if (zapytanie.current === c) zapytanie.current = null;
    }
  }

  // Jedna figura albo dopisek ze strumienia: miejsce (raz, przy pierwszym), pismo na nakładce, potem na tablicę bez
  // kroku cofania. Pestka idzie za pismem i wraca do myślenia, dopóki nie przyjdzie wynik.
  async function rysujNaZywo(a: ExcalidrawImperativeAPI, p: PozycjaZapisu, signal: AbortSignal, zapis: () => ReturnType<typeof zapisNaZywo>) {
    const aktywna = () => !signal.aborted && api.current === a && currentUserId() === konto;
    if (!aktywna()) return;
    const pismo = "dopisek" in p ? `Pestka\n${p.dopisek.tekst}` : "Pestka";
    await Promise.all([
      wczytajCzcionkiWzorow(pismo),
      "dopisek" in p && p.dopisek.typ === "kod" ? document.fonts.load("17px Cascadia", pismo).catch(() => []) : [],
    ]);
    if (!aktywna()) return;
    const nowe = zapis().dodaj(p);
    const nakladka = nakladkaPestki.current;
    const z = a.getAppState().zoom.value;
    const przed = (e: ExcalidrawElement): Punkt => [e.x - 48 / z, e.y - 6 / z];
    if (nowe.length && nakladka && !mniejRuchu()) {
      const pierwszy = nowe.find((e) => !(e.type === "text" && e.text === "Pestka")) ?? nowe[0]!;
      setPestka((s) => (s ? { ...s, faza: "pisze", punkt: przed(pierwszy), skok: s.skok + 1 } : s));
      await pokazZapisPestki(nakladka, a, nowe, signal, (e) => {
        if (e.type === "text" && e.text === "Pestka") return;
        setPestka((s) => (s ? { ...s, faza: "pisze", punkt: przed(e), skok: s.skok + 1 } : s));
      });
    }
    if (!aktywna()) return;
    dolozNaZywo(a, nowe);
    setPestka((s) => (s?.faza === "pisze" ? { ...s, faza: "mysli" } : s));
  }

  // Prowadzenie na żywo korzysta ze strumienia jak pytanie: figury i dopiski rysują się, gdy przychodzą, ale tylko
  // dopóki tablica się nie zmieniła (zapis.aktualny). Wynik zatwierdza zapis jednym krokiem cofania; przy „czekam”,
  // nieaktualnej odpowiedzi albo błędzie narysowane na żywo znika. Funkcja bez strumienia nie woła zdarzeń,
  // więc wtedy wszystko rysuje się z wyniku jak dawniej.
  function pokazProwadzenie(zapis: ZapisProwadzenia): ProwadzenieNaZywo {
    const a = api.current;
    let naZywo: ReturnType<typeof zapisNaZywo> | null = null;
    let kolejka: Promise<unknown> = Promise.resolve();
    const dokladaj = (p: PozycjaZapisu) => {
      if (!a) return;
      kolejka = kolejka.then(() => {
        if (zapis.aktualny()) return rysujNaZywo(a, p, zapis.signal, () => (naZywo ??= zapisNaZywo(a, czyBazowy)));
      }).catch(() => {});
    };
    const sprzatnij = () => {
      if (a && naZywo && api.current === a) usunNaZywo(a, naZywo.elementy);
      naZywo = null;
    };
    return {
      zdarzenia: { ksztalt: (ksztalt) => dokladaj({ ksztalt }), dopisek: (dopisek) => dokladaj({ dopisek }) },
      async porzuc() {
        await kolejka;
        if (!naZywo) return;
        sprzatnij();
        setPestka((s) => (s?.faza === "pisze" || s?.faza === "mysli" ? null : s));
      },
      async pokaz(odpowiedz) {
        // Prowadzenie niczego nie dopisuje na tablicy, nawet gdyby serwer to przysłał.
        const dane = { ...odpowiedz, ksztalty: [], dopiski: [], bryla: null };
        await kolejka;
        if (!zapis.aktualny()) {
          sprzatnij();
          return false;
        }
        dopiszDoHistorii({ pytanie: "", prowadzenie: true, dane });
        const zywy = naZywo as ReturnType<typeof zapisNaZywo> | null;
        const gotowe = zywy?.dokoncz(dane);
        if (zywy && !gotowe) sprzatnij();
        const ok = await pokazNaTablicy(dane, zapis, false, zywy && gotowe ? { elementy: zywy.elementy, ...gotowe } : undefined);
        if (!ok) sprzatnij();
        return ok;
      },
    };
  }

  // Pestka pisze w wolnym miejscu przy pracy ucznia, nigdy nie przesuwając jego widoku. Najpierw przechodzi
  // tam, gdzie zacznie pisać, potem idzie za pismem i na końcu odsuwa się na bok z dymkiem.
  // naZywo: zapis narysowany już ze strumienia (elementy na tablicy bez kroku cofania) i reszta do dołożenia.
  async function pokazNaTablicy(dane: OdpowiedzPestki, zapis?: ZapisProwadzenia, bezDymka = false,
    naZywo?: { elementy: ExcalidrawElement[]; reszta: ExcalidrawElement[]; pozaWidokiem: boolean }) {
    const tablica = api.current;
    const nakladka = nakladkaPestki.current;
    if (!tablica || !konto || currentUserId() !== konto || pisaniePestki.current || zapis?.signal.aborted) return false;
    const kontroler = new AbortController();
    const przerwij = () => kontroler.abort();
    zapis?.signal.addEventListener("abort", przerwij, { once: true });
    pisaniePestki.current = kontroler;
    const aktywna = () => !kontroler.signal.aborted && api.current === tablica && currentUserId() === konto && (!zapis || zapis.aktualny());
    const krok = dane.stanProwadzenia;
    try {
      const pismo = ["Pestka", ...dane.dopiski.map((d) => d.tekst), ...Object.values(dane.bryla?.oznaczenia ?? {})].join("\n");
      await Promise.all([
        wczytajCzcionkiWzorow(pismo),
        dane.dopiski.some((d) => d.typ === "kod") ? document.fonts.load("17px Cascadia", pismo).catch(() => []) : [],
      ]);
      if (!aktywna()) return false;
      const { elementy: nowe, pozaWidokiem } = naZywo ? { elementy: naZywo.reszta, pozaWidokiem: naZywo.pozaWidokiem } : przygotujZapisPestki(tablica, dane, czyBazowy);
      const z = tablica.getAppState().zoom.value;
      const przed = (e: ExcalidrawElement): Punkt => [e.x - 48 / z, e.y - 6 / z];
      const pierwszy = nowe.find((e) => e.customData?.pestka && e.strokeColor !== BLAD) ?? nowe[0];
      if (nowe.length && !mniejRuchu() && nakladka && !pozaWidokiem) {
        setPestka((p) => ({ faza: "pisze", punkt: pierwszy ? przed(pierwszy) : punktPrzyKresce(), skok: (p?.skok ?? 0) + 1 }));
        // Chwila na przejście na miejsce zapisu, zanim pojawi się pierwsza kreska.
        await new Promise((r) => window.setTimeout(r, CZAS.zwykly));
        if (!aktywna()) return false;
        await pokazZapisPestki(nakladka, tablica, nowe, kontroler.signal, (e) => {
          if (e.type === "text" && e.text === "Pestka") return;
          setPestka((p) => (p ? { ...p, faza: "pisze", punkt: przed(e), skok: p.skok + 1 } : p));
        });
      }
      if (!aktywna()) return false;
      // Także bez nowych elementów, gdy jest zapis na żywo: to zatwierdzenie robi z całej odpowiedzi jeden krok cofania.
      if (nowe.length || naZywo?.elementy.length) zapiszDopiskiPestki(tablica, nowe);
      const dopisane = [...(naZywo?.elementy ?? []), ...nowe].filter((e) => e.strokeColor !== BLAD);
      const [, y1, x2] = dopisane.length ? getCommonBounds(dopisane) : [0, 0, 0, 0];
      const obok: Punkt = dopisane.length && !pozaWidokiem ? [x2 + 10 / z, y1] : punktPrzyKresce();
      const pokaz = pozaWidokiem && dopisane.length
        ? () => tablica.scrollToContent(dopisane, { fitToViewport: true, viewportZoomFactor: 0.8, maxZoom: tablica.getAppState().zoom.value, animate: !mniejRuchu() })
        : undefined;
      const uwaga = pozaWidokiem && dopisane.length ? "Zapisałam obok, poza widokiem." : dane.pominietoElementy ? "Część zapisu ma błędny format. Poproś mnie o osobny rysunek lub dopisek." : undefined;
      if (bezDymka) setPestka(null);
      else if (krok === "krok" && !pokaz) {
        setPestka((p) => ({ faza: "kiwa", punkt: dopisane.length ? obok : punktPrzyKresce(), skok: (p?.skok ?? 0) + 1 }));
        window.setTimeout(() => setPestka((p) => (p?.faza === "kiwa" ? null : p)), 1600);
      } else {
        setPestka((p) => ({
          faza: "dymek", punkt: obok, skok: (p?.skok ?? 0) + 1,
          dymek: {
            tekst: krok === "krok" ? undefined : dane.wskazowka,
            odczyt: krok ? null : dane.odczyt,
            uwaga, pokaz,
            zetrzyj: dopisane.length && !krok ? zetrzyjDopiski : undefined,
          },
        }));
      }
      return true;
    } finally {
      zapis?.signal.removeEventListener("abort", przerwij);
      pisaniePestki.current = null;
    }
  }

  // Prowadzenie: Pestka myśli przy ostatniej kresce, a gdy nie ma nic do powiedzenia („czekam”), drzemie obok pracy.
  // Znika dopiero po wyłączeniu prowadzenia.
  useEffect(() => {
    if (prowadzenie.stan === "czyta") {
      setPestka((p) => (!p || p.faza === "spi" || p.faza === "kiwa" || (p.faza === "dymek" && !p.dymek?.blad) ? { faza: "mysli", punkt: punktPrzyKresce(), skok: 0, prowadzenie: true } : p));
    } else if (typeof prowadzenie.stan === "object") {
      bladPestki(prowadzenie.stan.blad, () => prowadzenie.wlacz());
    } else if (prowadzenie.stan === "wylaczone") {
      setPestka((p) => (p?.faza === "spi" ? null : p));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prowadzenie.stan]);

  // Zależne też od samej Pestki: po zamknięciu dymka, pola pytania albo kiwnięcia wraca do drzemki (lub myślenia).
  useEffect(() => {
    if (prowadzenie.stan === "czeka" && (!pestka || (pestka.faza === "mysli" && pestka.prowadzenie))) {
      setPestka({ faza: "spi", punkt: punktPrzyKresce(), skok: 0, prowadzenie: true });
    } else if (prowadzenie.stan === "czyta" && !pestka) {
      setPestka({ faza: "mysli", punkt: punktPrzyKresce(), skok: 0, prowadzenie: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prowadzenie.stan, pestka]);

  function przelaczProwadzenie() {
    if (prowadzi) {
      prowadzenie.zatrzymaj();
      setPestka((p) => (p?.prowadzenie ? null : p));
      return;
    }
    if (!konto) return bladPestki("not_signed_in");
    if (!prowadzenie.wlacz()) bladPestki("board_loading");
  }

  const wersja = useRef<number | null>(null);
  const wczytana = useRef(false);
  const czeka = useRef<{ timer: number; elementy: readonly ExcalidrawElement[] } | null>(null);
  const zapisz = useRef(onZapisz);
  zapisz.current = onZapisz;

  const poczatek = useMemo(
    () => async (): Promise<ExcalidrawInitialDataState> => {
      const zapisaneElementy = (elementy ?? []) as ExcalidrawElement[];
      // Rysunek zadania z importu bywa niepełny (np. tylko opcje A i B). Gdy wycinek z opcjami
      // dzieli się na co najmniej cztery rysunki, na płótnie stoją one, a rysunek zadania znika,
      // chyba że leży już na nim szkic.
      const zWycinka = opcjeZWycinka ? await naWykresy(await bezTekstuNadWykresami(opcjeZWycinka)) : [];
      const zamiast = zWycinka.length >= 4 && !zapisaneElementy.some((e) => e.id === ID_RYSUNKU);
      const glowny = zamiast ? undefined : rysunek;
      glownyRef.current = glowny;
      const kafelki = [...(zamiast ? zWycinka : []), ...(await Promise.all(dodatkoweRysunki.map(async (o) => naWykresy(await bezTekstuNadWykresami(o))))).flat()];
      // Każdy wykres opcji w wysokości rysunku zadania, żeby dało się je porównać.
      const wzor = glowny?.wys ?? Math.max(0, ...kafelki.map((k) => k.wys));
      const dodatkowe = kafelki.map((k) => {
        const skala = wzor ? wzor / k.wys : 1;
        return { ...k, szer: k.szer * skala, wys: k.wys * skala };
      });
      przyciete.current = dodatkowe;
      const bazowe = elementyBazowe(plik, glowny, dodatkowe);
      const zapisane = (elementy ?? []) as ExcalidrawElement[];
      // Rysunek zadania zostaje z zapisu (szkic leży na nim), a brakujący dokładamy. Dodatkowe
      // rysunki układamy zawsze od nowa, bo ich podział i siatka mogły się zmienić.
      const zapisanyGlowny = zapisane.some((e) => e.id === ID_RYSUNKU);
      const wszystkie = zapisane.length
        ? [...bazowe.filter((b) => b.id !== ID_RYSUNKU || !zapisanyGlowny), ...zapisane.filter((e) => !czyBazowy(e.id) || e.id === ID_RYSUNKU)]
        : bazowe;
      const sceny = zDodatkowymi(wszystkie, pokaz.current);
      const pliki = (await Promise.all(rysunkiBazowe(plik, glowny, dodatkowe).map((r) => wczytajRysunek(r.plik, r.obraz)))).filter((p): p is BinaryFileData => !!p);
      wczytana.current = true;
      return {
        elements: sceny,
        files: pliki.length ? Object.fromEntries(pliki.map((p) => [p.id, p])) : undefined,
        appState: {
          // W ciemnym motywie filtr płótna (invert 93% + hue-rotate 180°) zamienia ten kolor na ok. --bg (#10151c).
          viewBackgroundColor: ciemny ? "#f7fdff" : "#ffffff",
          currentItemStrokeColor: KOLORY[0].wartosc,
          currentItemRoughness: 0,
          // Domyślnie średnia: odręczne pismo jak długopisem, nie markerem.
          currentItemStrokeWidth: startowaGrubosc.szerokosc,
          currentItemOpacity: startowaGrubosc.krycie,
          // W brudnopisie zaczyna się od pisania, nie od zaznaczania.
          activeTool: { type: "freedraw", customType: null, lastActiveTool: null, locked: false },
          zoom: { value: ZOOM_START as NormalizedZoomValue },
        },
      };
    },
    // Scena startowa liczy się raz na otwarcie; dalej prowadzi ją Excalidraw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Zapis z opóźnieniem: onChange przychodzi przy każdym ruchu kursora.
  // Pusta scena (sama figura) usuwa wpis, żeby samo otwarcie niczego nie zapisywało.
  const wyslij = (els: readonly ExcalidrawElement[]) => {
    const zywe = els.filter((e) => !e.isDeleted);
    zapisz.current(zywe.some((e) => !czyBazowy(e.id)) ? zywe : null);
  };
  useEffect(
    () => () => {
      if (czeka.current) {
        window.clearTimeout(czeka.current.timer);
        wyslij(czeka.current.elementy);
      }
    },
    [],
  );

  const wyczysc = () => {
    api.current?.updateScene({ elements: zDodatkowymi(elementyBazowe(plik, glownyRef.current, przyciete.current), pokaz.current), captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  };

  // Zmiana podpunktu na pełnym ekranie: wykresy opcji znikają albo wracają, a widok obejmuje to, co widać.
  useEffect(() => {
    const a = api.current;
    if (!a || !wczytana.current || !dodatkoweRysunki.length) return;
    a.updateScene({ elements: zDodatkowymi(a.getSceneElementsIncludingDeleted(), pokazDodatkowe), captureUpdate: CaptureUpdateAction.NEVER });
    // Treść nad płótnem ma w innym podpunkcie inną wysokość: dopasowujemy po zmianie rozmiaru płótna.
    const t = window.setTimeout(() => dopasuj(true), 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokazDodatkowe]);

  // Płótno zmienia wysokość, gdy treść nad nim dochodzi (obrazki, wzory). Dopóki uczeń nic
  // nie zrobił, widok startowy dopasowujemy do nowego rozmiaru, żeby rysunek nie był ucięty.
  const ruszone = useRef(false);
  useEffect(() => {
    const el = kontener.current;
    if (!el) return;
    let t = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        if (!ruszone.current && wczytana.current) dopasuj(true);
      }, 150);
    });
    ro.observe(el);
    const ruszyl = () => (ruszone.current = true);
    el.addEventListener("pointerdown", ruszyl);
    el.addEventListener("wheel", ruszyl, { passive: true });
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
      el.removeEventListener("pointerdown", ruszyl);
      el.removeEventListener("wheel", ruszyl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kółko myszy nad płótnem przewija stronę, dopóki uczeń nie zacznie pracy na płótnie (dotknięcie, fokus w nim):
  // przewijając arkusz, nie chce się przesunąć rysunku. Po kliknięciu poza płótnem kółko znów przewija stronę.
  // Ctrl + kółko zostaje dla edytora (przybliżanie rysunku).
  const pelnyTeraz = useRef(pelny);
  pelnyTeraz.current = pelny;
  useEffect(() => {
    const el = kontener.current;
    if (!el) return;
    let wPracy = false;
    const kolko = (e: WheelEvent) => {
      // Na pełnym ekranie strony pod spodem nie widać, więc kółko zawsze przesuwa rysunek.
      if (!wPracy && !e.ctrlKey && !pelnyTeraz.current) e.stopPropagation();
    };
    const dotyk = (e: PointerEvent) => {
      wPracy = el.contains(e.target as Node);
    };
    const fokus = () => {
      wPracy = el.contains(document.activeElement);
    };
    el.addEventListener("wheel", kolko, { capture: true, passive: true });
    document.addEventListener("pointerdown", dotyk, true);
    document.addEventListener("focusin", fokus);
    return () => {
      el.removeEventListener("wheel", kolko, { capture: true });
      document.removeEventListener("pointerdown", dotyk, true);
      document.removeEventListener("focusin", fokus);
    };
  }, []);

  // Stan paska narzędzi odbija stan edytora (skróty klawiszowe też zmieniają narzędzie).
  const [narzedzie, setNarzedzie] = useState<Narzedzie>("freedraw");
  const [kolor, setKolor] = useState(KOLORY[0].wartosc);
  const [grubosc, setGrubosc] = useState<Grubosc["id"] | undefined>(startowaGrubosc.id);

  const wybierz = (typ: Narzedzie) => api.current?.setActiveTool({ type: typ });

  // Styl dla nowych kresek i dla zaznaczonych elementów (bez figury z arkusza).
  const ustawStyl = (zmiana: Partial<Pick<ExcalidrawElement, "strokeColor" | "strokeWidth" | "opacity">>, stan: Partial<AppState>) => {
    const a = api.current;
    if (!a) return;
    const zaznaczone = a.getAppState().selectedElementIds;
    const elementy = a.getSceneElements().map((e) => (zaznaczone[e.id] && !czyBazowy(e.id) ? newElementWith(e, zmiana) : e));
    a.updateScene({ elements: elementy, appState: stan as AppState, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  };
  const ustawKolor = (wartosc: string) => ustawStyl({ strokeColor: wartosc }, { currentItemStrokeColor: wartosc });
  const ustawGrubosc = (g: Grubosc) => {
    try {
      localStorage.setItem(KLUCZ_GRUBOSCI, g.id);
    } catch {
      // zablokowany storage: grubość zostaje tylko w tym brudnopisie
    }
    ustawStyl({ strokeWidth: g.szerokosc, opacity: g.krycie }, { currentItemStrokeWidth: g.szerokosc, currentItemOpacity: g.krycie });
  };

  // Zoom wokół środka widoku.
  const zoom = (mnoznik: number) => {
    const a = api.current;
    if (!a) return;
    const s = a.getAppState();
    const z = s.zoom.value;
    const nowy = Math.min(4, Math.max(0.2, z * mnoznik));
    const [cx, cy] = [s.width / 2, s.height / 2];
    a.updateScene({
      appState: { zoom: { value: nowy as NormalizedZoomValue }, scrollX: s.scrollX + cx / nowy - cx / z, scrollY: s.scrollY + cy / nowy - cy / z },
    });
  };
  // Treść zajmuje część widoku, żeby wokół figury było miejsce na obliczenia,
  // ale przybliżenie nie przekracza startowego: mała figura (sama oś liczbowa)
  // nie może powiększyć płótna tak, że pismo wychodzi grube jak marker.
  const dopasuj = (start = false, proba = 0) => {
    const a = api.current;
    if (!a) return;
    const s = a.getAppState();
    // Tuż po wczytaniu płótno może nie mieć jeszcze zmierzonych wymiarów.
    if ((s.width < 50 || s.height < 50) && proba < 30) {
      requestAnimationFrame(() => dopasuj(start, proba + 1));
      return;
    }
    const els = a.getSceneElements().filter((e) => !e.isDeleted);
    let z = ZOOM_START;
    let [scrollX, scrollY] = [s.width / (2 * z), s.height / (2 * z)];
    if (els.length) {
      const [x1, y1, x2, y2] = getCommonBounds(els);
      // Na wąskim płótnie (telefon) miejsce na notatki jest pod figurą, więc zajmuje ona prawie całą szerokość.
      // Z dodatkowymi rysunkami (opcje A–F) całość na środku, prawie na całe płótno.
      const wiele = dodatkoweRysunki.length > 0;
      const udzial = s.width < 500 || duzyRysunek || wiele ? 0.95 : 0.7;
      z = Math.min(duzyRysunek ? 2 : ZOOM_START, (s.width * udzial) / Math.max(1, x2 - x1), (s.height * udzial) / Math.max(1, y2 - y1));
      if (start && !wiele) {
        // Na start figura w prawym górnym rogu: lewa strona i dół zostają na obliczenia.
        const margines = 16;
        scrollX = (s.width - margines) / z - x2;
        scrollY = margines / z - y1;
      } else {
        scrollX = s.width / (2 * z) - (x1 + x2) / 2;
        scrollY = s.height / (2 * z) - (y1 + y2) / 2;
      }
    }
    const widok: Partial<AppState> = { zoom: { value: z as NormalizedZoomValue }, scrollX, scrollY };
    // Tekst ma na ekranie wyglądać jak zwykłe pismo (ok. 16 px) przy startowym przybliżeniu.
    if (start) widok.currentItemFontSize = Math.min(36, Math.max(16, Math.round(16 / z)));
    a.updateScene({ appState: widok as AppState });
  };

  // Cofanie i ponawianie nie mają API w Excalidraw 0.18, więc wysyłamy skrót
  // klawiszowy do kontenera edytora (tam nasłuchuje, gdy handleKeyboardGlobally=false).
  const kontener = useRef<HTMLDivElement>(null);
  const skrot = (key: string, shiftKey = false) => {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    kontener.current
      ?.querySelector(".excalidraw")
      ?.dispatchEvent(new KeyboardEvent("keydown", { key, code: `Key${key.toUpperCase()}`, ctrlKey: !mac, metaKey: mac, shiftKey, bubbles: true }));
  };

  return (
    <>
      <div className={wPanelu ? `${styles.workspace} ${styles.wPanelu}` : styles.workspace}>
        {/* Pasek po obu stronach płótna: po lewej narzędzia, po prawej styl i widok. */}
        <div className={styles.toolbar} role="toolbar" aria-label="Narzędzia brudnopisu" aria-orientation="vertical">
          {NARZEDZIA.map(({ typ, nazwa, ikona: Ikona }) => (
            <button key={typ} type="button" className={styles.tool} aria-pressed={narzedzie === typ} title={nazwa} aria-label={nazwa} onClick={() => wybierz(typ)}>
              <Ikona size={18} aria-hidden="true" />
            </button>
          ))}
          <span className={styles.sep} aria-hidden="true" />
          <button type="button" className={styles.tool} title="Cofnij" aria-label="Cofnij" onClick={() => skrot("z")}>
            <Undo2 size={18} aria-hidden="true" />
          </button>
          <button type="button" className={styles.tool} title="Ponów" aria-label="Ponów" onClick={() => skrot("z", true)}>
            <Redo2 size={18} aria-hidden="true" />
          </button>
          {poleceniePestki && (
            <>
              <span className={styles.sep} aria-hidden="true" />
              <button
                ref={przyciskPestki}
                type="button"
                className={styles.tool + " " + styles.pestkaTool}
                title="Zapytaj Pestkę"
                aria-label="Zapytaj Pestkę"
                aria-expanded={pestka?.faza === "pole"}
                onClick={() => (pestka?.faza === "pole" ? zamknijPestke() : otworzPole())}
              >
                <TutorAvatar size={26} state={pestka?.faza === "mysli" ? "thinking" : "idle"} />
              </button>
              <button
                type="button"
                className={styles.tool}
                title="Prowadź mnie krok po kroku"
                aria-label="Prowadź mnie krok po kroku"
                aria-pressed={prowadzi}
                onClick={przelaczProwadzenie}
                data-tutor-about="Gdy przerwiesz pisanie, sama przejrzę krok: kiwnę głową, gdy jest dobrze, a przy błędzie powiem, gdzie spojrzeć."
              >
                <Footprints size={18} aria-hidden="true" />
              </button>
              {historia.length > 0 && (
                <button
                  type="button"
                  className={styles.tool}
                  title="Rozmowa z Pestką"
                  aria-label="Rozmowa z Pestką"
                  aria-expanded={historiaOtwarta}
                  aria-controls={historiaOtwarta ? idHistorii : undefined}
                  onClick={() => setHistoriaOtwarta((o) => !o)}
                >
                  <MessagesSquare size={18} aria-hidden="true" />
                </button>
              )}
            </>
          )}
          <span className={styles.grow} aria-hidden="true" />
          {onPelny && (
            <button type="button" className={styles.tool} title={pelny ? "Wyjdź z pełnego ekranu" : "Pełny ekran"} aria-label={pelny ? "Wyjdź z pełnego ekranu" : "Pełny ekran"} onClick={onPelny}>
              {pelny ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
            </button>
          )}
          {onZamknij && (
            <button type="button" className={styles.tool} title="Zamknij brudnopis" aria-label="Zamknij brudnopis" onClick={onZamknij}>
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        {/* Excalidraw zna położenie płótna tylko z resize i (opóźnionego) scrolla. Gdy treść nad
            nim się przesunie, kreska wypadała obok kursora, więc odświeżamy je przed dotknięciem. */}
        <div
          ref={kontener}
          className={styles.canvas}
          onPointerEnter={() => api.current?.refresh()}
          onPointerDownCapture={(e) => {
            flushSync(() => api.current?.refresh());
            // Uczeń wraca do pisania: dymek Pestki znika, żeby niczego nie zasłaniać.
            const wPestce = (e.target as Element).closest(`.${styles.pestkaNaTablicy}, .${styles.dokTablicy}`);
            if (!wPestce && pestka && pestka.faza !== "mysli" && pestka.faza !== "pisze" && pestka.faza !== "spi") zamknijPestke();
          }}
        >
        <Excalidraw
          excalidrawAPI={(a) => (api.current = a)}
          initialData={poczatek}
          langCode="pl-PL"
          theme={ciemny ? "dark" : "light"}
          UIOptions={{
            canvasActions: { loadScene: false, saveToActiveFile: false, export: false, toggleTheme: false, changeViewBackgroundColor: false, clearCanvas: false },
            tools: { image: false },
          }}
          onChange={(els, stan) => {
            setNarzedzie(stan.activeTool.type as Narzedzie);
            setKolor(stan.currentItemStrokeColor);
            setGrubosc(gruboscZ(stan.currentItemStrokeWidth, stan.currentItemOpacity));
            if (!wczytana.current) return; // pusta scena przed initialData
            prowadzenie.odswiez();
            const h = hashElementsVersion(els);
            if (wersja.current === null) {
              // initialData już rozwiązane, ale elementy mogą wejść dopiero w kolejnym wywołaniu.
              const oczekiwane = rysunek || dodatkoweRysunki.length ? els.some((e) => czyBazowy(e.id)) : !elementy?.length || els.length > 0;
              if (!oczekiwane) return;
              // Pierwsze wywołanie po wczytaniu to scena startowa, nie zmiana.
              // Ustawiamy wtedy ołówek i widok z zapasem miejsca wokół treści.
              wersja.current = h;
              requestAnimationFrame(() => {
                wybierz("freedraw");
                dopasuj(true);
              });
              return;
            }
            if (h === wersja.current) return;
            wersja.current = h;
            if (czeka.current) window.clearTimeout(czeka.current.timer);
            czeka.current = {
              elementy: els,
              timer: window.setTimeout(() => {
                czeka.current = null;
                wyslij(els);
              }, 400),
            };
          }}
        />
        <canvas ref={nakladkaPestki} className={styles.pestkaAnimacja} hidden={pestka?.faza !== "pisze"} aria-hidden="true" />
        {pestka && poleceniePestki && (
          <PestkaNaTablicy api={api} faza={pestka.faza} punkt={pestka.punkt} skok={pestka.skok} dymek={pestka.dymek}
            onPytanie={(pytanie) => void zapytaj(pytanie)} onZamknij={zamknijPestke} />
        )}
        </div>
        <div className={styles.toolbar} role="toolbar" aria-label="Styl i widok brudnopisu" aria-orientation="vertical">
          {KOLORY.map((k) => (
            <button key={k.wartosc} type="button" className={styles.swatch} aria-pressed={kolor === k.wartosc} title={k.nazwa} aria-label={`Kolor: ${k.nazwa}`} onClick={() => ustawKolor(k.wartosc)}>
              <span style={{ background: naEkranie(k.wartosc) }} />
            </button>
          ))}
          <span className={styles.sep} aria-hidden="true" />
          {GRUBOSCI.map((g) => (
            <button key={g.id} type="button" className={styles.swatch} aria-pressed={grubosc === g.id} title={g.nazwa} aria-label={g.nazwa} onClick={() => ustawGrubosc(g)}>
              <span className={styles.width} style={{ width: g.kropka, height: g.kropka, background: naEkranie(kolor), opacity: g.krycie / 100 }} />
            </button>
          ))}
          <span className={styles.sep} aria-hidden="true" />
          <button type="button" className={styles.tool} title="Pomniejsz" aria-label="Pomniejsz" onClick={() => zoom(1 / 1.25)}>
            <ZoomOut size={18} aria-hidden="true" />
          </button>
          <button type="button" className={styles.tool} title="Powiększ" aria-label="Powiększ" onClick={() => zoom(1.25)}>
            <ZoomIn size={18} aria-hidden="true" />
          </button>
          <button type="button" className={styles.tool} title="Pokaż całość" aria-label="Pokaż całość" onClick={() => dopasuj()}>
            <Scan size={18} aria-hidden="true" />
          </button>
          <span className={styles.grow} aria-hidden="true" />
          <button type="button" className={styles.tool} title="Wyczyść szkic" aria-label="Wyczyść szkic" onClick={wyczysc}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
        {historiaOtwarta && historia.length > 0 && (
          <HistoriaPestki id={idHistorii} wpisy={historia} onZetrzyj={zetrzyjDopiski} onZamknij={() => setHistoriaOtwarta(false)}
            onBryla={(dane, obrot) => void pokazNaTablicy({ ...dane, obrotBryly: obrot, dopiski: [], ksztalty: [], obszarBledu: undefined }, undefined, true)} />
        )}
      </div>
    </>
  );
}
