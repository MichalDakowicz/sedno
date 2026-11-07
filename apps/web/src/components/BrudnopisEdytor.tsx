// Edytor brudnopisu: Excalidraw z opcjonalnym rysunkiem bazowym z arkusza.
// Ładowany leniwie (Brudnopis.tsx), bo Excalidraw waży kilkaset kB.
import { useEffect, useMemo, useRef } from "react";
import { CaptureUpdateAction, convertToExcalidrawElements, Excalidraw, hashElementsVersion } from "@excalidraw/excalidraw";
import type { BinaryFileData, DataURL, ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { RotateCcw } from "lucide-react";
import type { Obraz } from "../arkusze/typy";
import styles from "./Brudnopis.module.css";

export const ID_RYSUNKU = "rysunek-bazowy";
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
      return {
        elements: sceny,
        files: pliki ? { [pliki.id]: pliki } : undefined,
        appState: { viewBackgroundColor: "#ffffff", currentItemStrokeColor: "#1b232e", currentItemRoughness: 0 },
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

  return (
    <>
      <div className={styles.canvas}>
        <Excalidraw
          excalidrawAPI={(a) => (api.current = a)}
          initialData={poczatek}
          langCode="pl-PL"
          UIOptions={{
            canvasActions: { loadScene: false, saveToActiveFile: false, export: false, toggleTheme: false, changeViewBackgroundColor: false, clearCanvas: false },
            tools: { image: false },
          }}
          onChange={(els) => {
            const h = hashElementsVersion(els);
            if (wersja.current === null || h === wersja.current) {
              wersja.current = h; // pierwsze wywołanie to wczytana scena, nie zmiana
              return;
            }
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
      <div className={styles.footer}>
        <p className="small muted">Brudnopis nie wpływa na wynik. Zapisuje się w postępie arkusza.</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={wyczysc}>
          <RotateCcw size={15} aria-hidden="true" /> Wyczyść szkic
        </button>
      </div>
    </>
  );
}
