// Brudnopis przy zadaniu: szkic w Excalidraw, opcjonalnie na rysunku z treści.
// To pomoc, nie forma odpowiedzi: zadania zamknięte zostają zamknięte.
import { lazy, Suspense, useState } from "react";
import { PenLine, X } from "lucide-react";
import type { Brudnopis as Zapis } from "../arkusze/postep";
import type { Obraz } from "../arkusze/typy";
import styles from "./Brudnopis.module.css";

// Fonty Excalidraw serwujemy sami (vite.config.ts), zamiast pobierać je z CDN.
declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string;
  }
}
window.EXCALIDRAW_ASSET_PATH = "/excalidraw/";

const Edytor = lazy(() => import("./BrudnopisEdytor"));

type Props = {
  plik: string;
  zadanie: number;
  rysunek?: Obraz;
  zapis?: Zapis;
  onZmiana: (zapis: Zapis | null) => void;
};

export function Brudnopis({ plik, zadanie, rysunek, zapis, onZmiana }: Props) {
  const [otwarty, setOtwarty] = useState(false);
  const elementow = zapis?.elementy.length ?? 0;

  if (!otwarty)
    return (
      <div className={styles.closed}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setOtwarty(true)}
          data-tutor-about="Brudnopis to miejsce na obliczenia i szkice. Nie wpływa na wynik, ale zapisuje się razem z odpowiedziami."
        >
          <PenLine size={16} aria-hidden="true" /> {rysunek ? "Brudnopis z rysunkiem" : "Brudnopis"}
        </button>
        {elementow > 0 && <span className="small muted">szkic zapisany</span>}
      </div>
    );

  return (
    <section className={styles.panel} aria-label={`Brudnopis do zadania ${zadanie}`}>
      <header className={styles.head}>
        <span className="label">Brudnopis · zadanie {zadanie}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOtwarty(false)}>
          <X size={16} aria-hidden="true" /> Zamknij
        </button>
      </header>
      <Suspense fallback={<p className={`muted ${styles.loading}`}>Wczytuję brudnopis…</p>}>
        <Edytor
          plik={plik}
          rysunek={rysunek}
          elementy={zapis?.elementy}
          onZapisz={(elementy) => onZmiana(elementy ? { elementy, zmieniony: new Date().toISOString() } : null)}
        />
      </Suspense>
    </section>
  );
}
