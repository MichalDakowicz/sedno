// Edytor brudnopisu: Excalidraw z opcjonalnym rysunkiem bazowym z arkusza.
// Ładowany leniwie (Brudnopis.tsx), bo Excalidraw waży kilkaset kB.
import { useEffect, useMemo, useRef, useState } from "react";
import { CaptureUpdateAction, convertToExcalidrawElements, Excalidraw, hashElementsVersion, newElementWith } from "@excalidraw/excalidraw";
import type { AppState, BinaryFileData, DataURL, ExcalidrawImperativeAPI, ExcalidrawInitialDataState, NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { Circle, Eraser, Hand, Minus, MousePointer2, MoveUpRight, Pencil, Redo2, Scan, Square, Trash2, Type, Undo2, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";
import type { Obraz } from "../arkusze/typy";
import styles from "./Brudnopis.module.css";

export const ID_RYSUNKU = "rysunek-bazowy";

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
const GRUBOSCI = [
  { id: "cienka", nazwa: "Cienka kreska", szerokosc: 1, krycie: 100, kropka: 4 },
  { id: "srednia", nazwa: "Średnia kreska", szerokosc: 2, krycie: 100, kropka: 7 },
  { id: "gruba", nazwa: "Gruba kreska", szerokosc: 4, krycie: 100, kropka: 11 },
  { id: "zakreslacz", nazwa: "Zakreślacz", szerokosc: 12, krycie: 35, kropka: 16 },
] as const;
type Grubosc = (typeof GRUBOSCI)[number];
const gruboscZ = (szerokosc: number, krycie: number) => GRUBOSCI.find((g) => g.szerokosc === szerokosc && g.krycie === krycie)?.id;
// Kadry mają wymiary w punktach PDF; w brudnopisie rysunek jest nieco większy,
// żeby domyślna grubość kreski pasowała do skali figury.
const SKALA_RYSUNKU = 1.5;

type Props = {
  plik: string; // identyfikator pliku rysunku, unikalny w arkuszu
  rysunek?: Obraz;
  elementy?: readonly unknown[];
  onZapisz: (elementy: readonly ExcalidrawElement[] | null) => void;
};

function elementyBazowe(plik: string, rysunek?: Obraz): ExcalidrawElement[] {
  if (!rysunek) return [];
  return convertToExcalidrawElements([
    {
      type: "image",
      id: ID_RYSUNKU,
      fileId: plik as FileId,
      x: 0,
      y: 0,
      width: rysunek.szer * SKALA_RYSUNKU,
      height: rysunek.wys * SKALA_RYSUNKU,
      locked: true, // uczeń rysuje po figurze, ale jej nie przesunie ani nie usunie
      status: "saved",
    },
    // Stałe id: po nim poznajemy figurę w zapisanej scenie.
  ], { regenerateIds: false });
}

async function wczytajRysunek(plik: string, rysunek: Obraz): Promise<BinaryFileData | null> {
  try {
    const odp = await fetch(`/dane/arkusze/${rysunek.src}`);
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

export default function BrudnopisEdytor({ plik, rysunek, elementy, onZapisz }: Props) {
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const wersja = useRef<number | null>(null);
  const wczytana = useRef(false);
  const czeka = useRef<{ timer: number; elementy: readonly ExcalidrawElement[] } | null>(null);
  const zapisz = useRef(onZapisz);
  zapisz.current = onZapisz;

  const poczatek = useMemo(
    () => async (): Promise<ExcalidrawInitialDataState> => {
      const bazowe = elementyBazowe(plik, rysunek);
      const zapisane = (elementy ?? []) as ExcalidrawElement[];
      // Starszy zapis albo uczeń odblokował i usunął figurę: dokładamy ją z powrotem.
      const sceny = zapisane.length ? (zapisane.some((e) => e.id === ID_RYSUNKU) ? zapisane : [...bazowe, ...zapisane]) : bazowe;
      const pliki = rysunek ? await wczytajRysunek(plik, rysunek) : null;
      wczytana.current = true;
      return {
        elements: sceny,
        files: pliki ? { [pliki.id]: pliki } : undefined,
        appState: {
          viewBackgroundColor: "#ffffff",
          currentItemStrokeColor: KOLORY[0].wartosc,
          currentItemRoughness: 0,
          currentItemStrokeWidth: 2,
          currentItemOpacity: 100,
          // W brudnopisie zaczyna się od pisania, nie od zaznaczania.
          activeTool: { type: "freedraw", customType: null, lastActiveTool: null, locked: false },
        },
        scrollToContent: true,
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
    zapisz.current(zywe.some((e) => e.id !== ID_RYSUNKU) ? zywe : null);
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
    api.current?.updateScene({ elements: elementyBazowe(plik, rysunek), captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  };

  // Stan paska narzędzi odbija stan edytora (skróty klawiszowe też zmieniają narzędzie).
  const [narzedzie, setNarzedzie] = useState<Narzedzie>("freedraw");
  const [kolor, setKolor] = useState(KOLORY[0].wartosc);
  const [grubosc, setGrubosc] = useState<Grubosc["id"] | undefined>("srednia");

  const wybierz = (typ: Narzedzie) => api.current?.setActiveTool({ type: typ });

  // Styl dla nowych kresek i dla zaznaczonych elementów (bez figury z arkusza).
  const ustawStyl = (zmiana: Partial<Pick<ExcalidrawElement, "strokeColor" | "strokeWidth" | "opacity">>, stan: Partial<AppState>) => {
    const a = api.current;
    if (!a) return;
    const zaznaczone = a.getAppState().selectedElementIds;
    const elementy = a.getSceneElements().map((e) => (zaznaczone[e.id] && e.id !== ID_RYSUNKU ? newElementWith(e, zmiana) : e));
    a.updateScene({ elements: elementy, appState: stan as AppState, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  };
  const ustawKolor = (wartosc: string) => ustawStyl({ strokeColor: wartosc }, { currentItemStrokeColor: wartosc });
  const ustawGrubosc = (g: Grubosc) =>
    ustawStyl({ strokeWidth: g.szerokosc, opacity: g.krycie }, { currentItemStrokeWidth: g.szerokosc, currentItemOpacity: g.krycie });

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
  // Treść zajmuje część widoku, żeby wokół figury było miejsce na obliczenia.
  const dopasuj = (animacja = true) => {
    const a = api.current;
    const els = a?.getSceneElements() ?? [];
    // Na wąskim płótnie (telefon) miejsce na notatki jest nad i pod figurą, więc zajmuje ona prawie całą szerokość.
    if (a && els.length) a.scrollToContent(els, { fitToViewport: true, viewportZoomFactor: a.getAppState().width < 500 ? 0.9 : 0.6, animate: animacja });
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
        <div className={styles.toolbar} role="toolbar" aria-label="Narzędzia brudnopisu" aria-orientation="vertical">
          {NARZEDZIA.map(({ typ, nazwa, ikona: Ikona }) => (
            <button key={typ} type="button" className={styles.tool} aria-pressed={narzedzie === typ} title={nazwa} aria-label={nazwa} onClick={() => wybierz(typ)}>
              <Ikona size={18} aria-hidden="true" />
            </button>
          ))}
          <span className={styles.sep} aria-hidden="true" />
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
          <button type="button" className={styles.tool} title="Cofnij" aria-label="Cofnij" onClick={() => skrot("z")}>
            <Undo2 size={18} aria-hidden="true" />
          </button>
          <button type="button" className={styles.tool} title="Ponów" aria-label="Ponów" onClick={() => skrot("z", true)}>
            <Redo2 size={18} aria-hidden="true" />
          </button>
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
        <div ref={kontener} className={styles.canvas}>
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
              // Pierwsze wywołanie po wczytaniu to scena startowa, nie zmiana.
              // Ustawiamy wtedy ołówek i widok z zapasem miejsca wokół treści.
              wersja.current = h;
              requestAnimationFrame(() => {
                wybierz("freedraw");
                dopasuj(false);
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
      </div>
      <p className="small muted">Brudnopis nie wpływa na wynik. Zapisuje się w postępie arkusza.</p>
    </>
  );
}
