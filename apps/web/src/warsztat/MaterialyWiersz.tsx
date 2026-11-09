// Wiersz przy treści zadania z informatyki: pliki do pobrania i przycisk otwierający panel z narzędziami.
import { PanelRight, Play } from "lucide-react";
import type { Zadanie } from "../arkusze/typy";
import { Pliki } from "./Narzedzia";
import styles from "./Warsztat.module.css";

type Props = {
  zadanie: Zadanie;
  pliki: Record<string, string>; // wszystkie pliki arkusza
  zip?: string;
  otwarty: boolean; // panel jest otwarty właśnie dla tego zadania
  onOtworz: (przycisk: HTMLButtonElement) => void;
};

export function MaterialyWiersz({ zadanie, pliki: wszystkie, zip, otwarty, onOtworz }: Props) {
  const pliki = Object.fromEntries((zadanie.pliki ?? []).map((n) => [n, wszystkie[n]] as const));
  const ma = Object.keys(pliki).length > 0 || !!zadanie.program;
  return (
    <div className={styles.wiersz}>
      {Object.keys(pliki).length > 0 && <Pliki pliki={pliki} zip={zip} />}
      <button type="button" className="btn btn-ghost btn-sm" aria-expanded={otwarty} onClick={(e) => onOtworz(e.currentTarget)}>
        {ma ? <PanelRight size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />} {ma ? "Otwórz materiały do tego zadania" : "Sprawdź coś w Pythonie"}
      </button>
    </div>
  );
}
