// Szkic w brudnopisie informatyki (drzewo hierarchii, tabele, schematy): ten sam edytor co
// brudnopis z matematyki, ale wypełnia panel. Ładuje się dopiero po wybraniu „Szkicu”.
import { lazy, Suspense } from "react";
import type { Brudnopis as Zapis } from "../arkusze/postep";
import { Ladowanie } from "../components/Ladowanie";

// Fonty Excalidraw serwujemy sami; ścieżka musi być ustawiona przed wczytaniem biblioteki.
declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string;
  }
}
window.EXCALIDRAW_ASSET_PATH = "/excalidraw/";

const Edytor = lazy(() => import("../components/BrudnopisEdytor"));

type Props = {
  nr: number;
  zapis?: Zapis;
  onZmiana: (zapis: Zapis | null) => void;
};

export function Szkic({ nr, zapis, onZmiana }: Props) {
  return (
    <Suspense fallback={<Ladowanie ksztalt="blok" etykieta="Wczytuję szkic" />}>
      <Edytor
        plik={`warsztat-${nr}`}
        elementy={zapis?.elementy}
        onZapisz={(elementy) => onZmiana(elementy ? { elementy, zmieniony: new Date().toISOString() } : null)}
        pelny={false}
        wPanelu
      />
    </Suspense>
  );
}
