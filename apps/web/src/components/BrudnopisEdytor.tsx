// Edytor brudnopisu: Excalidraw z opcjonalnym rysunkiem bazowym z arkusza.
// Ładowany leniwie (Brudnopis.tsx), bo Excalidraw waży kilkaset kB.
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CaptureUpdateAction, convertToExcalidrawElements, Excalidraw, getCommonBounds, hashElementsVersion, newElementWith } from "@excalidraw/excalidraw";
import type { AppState, BinaryFileData, DataURL, ExcalidrawImperativeAPI, ExcalidrawInitialDataState, NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { Circle, Eraser, Hand, Maximize2, Minimize2, Minus, MousePointer2, MoveUpRight, Pencil, Redo2, Scan, Square, Trash2, Type, Undo2, X, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";
import { adresObrazu, type Obraz } from "../arkusze/typy";
import styles from "./Brudnopis.module.css";

export const ID_RYSUNKU = "rysunek-bazowy";
// Dodatkowe rysunki (np. wykresy opcji A–F) mają id „rysunek-bazowy-1”, „-2”…
const czyBazowy = (id: string) => id === ID_RYSUNKU || id.startsWith(`${ID_RYSUNKU}-`);

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
  onPelny: () => void;
  onZamknij: () => void;
  /** Rysunki obok rysunku zadania, np. wykresy opcji A–F do zaznaczania. */
  dodatkoweRysunki?: Obraz[];
  /** Zadanie bez obliczeń (odczyt z wykresu): rysunek większy, do zaznaczania na nim. */
  duzyRysunek?: boolean;
};

// Rysunek zadania w (0, 0), a dodatkowe rysunki w rzędzie obok niego. Wszystkie zablokowane:
// uczeń rysuje po nich, ale ich nie przesunie ani nie usunie.
function rysunkiBazowe(plik: string, rysunek?: Obraz, dodatkowe: Obraz[] = []): { id: string; plik: string; obraz: Obraz; x: number; y: number }[] {
  const wynik: { id: string; plik: string; obraz: Obraz; x: number; y: number }[] = [];
  if (rysunek) wynik.push({ id: ID_RYSUNKU, plik, obraz: rysunek, x: 0, y: 0 });
  let x = rysunek ? rysunek.szer * SKALA_RYSUNKU + 60 : 0;
  const y = 0;
  dodatkowe.forEach((obraz, i) => {
    wynik.push({ id: `${ID_RYSUNKU}-${i + 1}`, plik: `${plik}-${i + 1}`, obraz, x, y });
    x += obraz.szer * SKALA_RYSUNKU + 40;
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

async function wczytajRysunek(plik: string, rysunek: Obraz): Promise<BinaryFileData | null> {
  try {
    // Data URL z importu idzie wprost do Excalidraw; fetch obsłuży też starszą ścieżkę.
    if (rysunek.src.startsWith("data:")) return { id: plik as FileId, dataURL: rysunek.src as DataURL, mimeType: "image/png", created: Date.now() };
    const odp = await fetch(adresObrazu(rysunek.src));
    if (!odp.ok) return null;
    const blob = await odp.blob();
    const dataURL = await new Promise<string>((ok, blad) => {
      const r = new FileReader();
      r.onload = () => ok(r.result as string);
      r.onerror = blad;
      r.readAsDataURL(blob);
    });
    return { id: plik as FileId, dataURL: dataURL as DataURL, mimeType: "image/png", created: Date.now() };
  } catch {
    return null; // bez rysunku brudnopis nadal działa, w miejscu obrazka zostaje ramka
  }
}

export default function BrudnopisEdytor({ plik, rysunek, elementy, onZapisz, pelny, onPelny, onZamknij, duzyRysunek, dodatkoweRysunki = [] }: Props) {
  const [startowaGrubosc] = useState(zapamietanaGrubosc);
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const wersja = useRef<number | null>(null);
  const wczytana = useRef(false);
  const czeka = useRef<{ timer: number; elementy: readonly ExcalidrawElement[] } | null>(null);
  const zapisz = useRef(onZapisz);
  zapisz.current = onZapisz;

  const poczatek = useMemo(
    () => async (): Promise<ExcalidrawInitialDataState> => {
      const bazowe = elementyBazowe(plik, rysunek, dodatkoweRysunki);
      const zapisane = (elementy ?? []) as ExcalidrawElement[];
      // Starszy zapis albo uczeń odblokował i usunął rysunek: brakujące dokładamy z powrotem.
      const brakujace = bazowe.filter((b) => !zapisane.some((e) => e.id === b.id));
      const sceny = zapisane.length ? [...brakujace, ...zapisane] : bazowe;
      const pliki = (await Promise.all(rysunkiBazowe(plik, rysunek, dodatkoweRysunki).map((r) => wczytajRysunek(r.plik, r.obraz)))).filter((p): p is BinaryFileData => !!p);
      wczytana.current = true;
      return {
        elements: sceny,
        files: pliki.length ? Object.fromEntries(pliki.map((p) => [p.id, p])) : undefined,
        appState: {
          viewBackgroundColor: "#ffffff",
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
    api.current?.updateScene({ elements: elementyBazowe(plik, rysunek, dodatkoweRysunki), captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  };

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
      <div className={styles.workspace}>
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
          <span className={styles.grow} aria-hidden="true" />
          <button type="button" className={styles.tool} title={pelny ? "Wyjdź z pełnego ekranu" : "Pełny ekran"} aria-label={pelny ? "Wyjdź z pełnego ekranu" : "Pełny ekran"} onClick={onPelny}>
            {pelny ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
          </button>
          <button type="button" className={styles.tool} title="Zamknij brudnopis" aria-label="Zamknij brudnopis" onClick={onZamknij}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {/* Excalidraw zna położenie płótna tylko z resize i (opóźnionego) scrolla. Gdy treść nad
            nim się przesunie, kreska wypadała obok kursora, więc odświeżamy je przed dotknięciem. */}
        <div
          ref={kontener}
          className={styles.canvas}
          onPointerEnter={() => api.current?.refresh()}
          onPointerDownCapture={() => flushSync(() => api.current?.refresh())}
        >
        <Excalidraw
          excalidrawAPI={(a) => (api.current = a)}
          initialData={poczatek}
          langCode="pl-PL"
          UIOptions={{
            canvasActions: { loadScene: false, saveToActiveFile: false, export: false, toggleTheme: false, changeViewBackgroundColor: false, clearCanvas: false },
            tools: { image: false },
          }}
          onChange={(els, stan) => {
            setNarzedzie(stan.activeTool.type as Narzedzie);
            setKolor(stan.currentItemStrokeColor);
            setGrubosc(gruboscZ(stan.currentItemStrokeWidth, stan.currentItemOpacity));
            if (!wczytana.current) return; // pusta scena przed initialData
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
        </div>
        <div className={styles.toolbar} role="toolbar" aria-label="Styl i widok brudnopisu" aria-orientation="vertical">
          {KOLORY.map((k) => (
            <button key={k.wartosc} type="button" className={styles.swatch} aria-pressed={kolor === k.wartosc} title={k.nazwa} aria-label={`Kolor: ${k.nazwa}`} onClick={() => ustawKolor(k.wartosc)}>
              <span style={{ background: k.wartosc }} />
            </button>
          ))}
          <span className={styles.sep} aria-hidden="true" />
          {GRUBOSCI.map((g) => (
            <button key={g.id} type="button" className={styles.swatch} aria-pressed={grubosc === g.id} title={g.nazwa} aria-label={g.nazwa} onClick={() => ustawGrubosc(g)}>
              <span className={styles.width} style={{ width: g.kropka, height: g.kropka, background: kolor, opacity: g.krycie / 100 }} />
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
      </div>
    </>
  );
}
