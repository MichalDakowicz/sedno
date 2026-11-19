// Gotowość z przedmiotu: pierścień z jedną liczbą (nauka/gotowosc.ts), kreską progu 30% i celu ucznia, oraz jedno
// zdanie-wniosek. Na mapie umiejętności duża, na pulpicie mała w wierszu przedmiotu. Prognoza z arkuszy, gdy jest,
// stoi tu jako druga liczba, a nie w osobnej sekcji.
import type { ReactNode } from "react";
import { Pierscien } from "./wykresy";
import { policzGotowosc, wniosekGotowosci } from "../nauka/gotowosc";
import type { Umiejetnosc } from "../nauka/api";
import s from "./Gotowosc.module.css";

const OPIS = "Gotowość to średnie opanowanie umiejętności z mapy, ważone punktami, które dają na maturze. Umiejętności bez oceny liczą się jako zero. Przy niewielu próbach pokazuję ją w kreskę, bo to wstępna ocena.";

export function Gotowosc({ umiejetnosci, cel, prognoza, maly = false, naglowek, children }: {
  umiejetnosci: Umiejetnosc[];
  cel: number | null;
  prognoza?: number | null;
  maly?: boolean;
  /** Tytuł obok pierścienia (np. nazwa przedmiotu na pulpicie); domyślnie „Gotowość”. */
  naglowek?: ReactNode;
  children?: ReactNode;
}) {
  const g = policzGotowosc(umiejetnosci);
  if (!g) return null;
  const procent = Math.round(g.wartosc * 100);
  const zCelem = cel !== null ? ` · cel ${Math.round(cel * 100)}%` : "";
  const wniosek = wniosekGotowosci(g, cel);
  const meta = [g.wstepna && "wstępnie", cel !== null && `cel ${Math.round(cel * 100)}%`].filter(Boolean).join(" · ");
  return (
    <div className={s.gotowosc} data-maly={maly || undefined} data-tutor-about={OPIS}>
      <Pierscien wartosc={g.wartosc} prog={0.3} cel={cel} wstepna={g.wstepna} rozmiar={maly ? 56 : 132}
        opis={`Gotowość ${procent}%${g.wstepna ? ", wstępnie" : ""}${zCelem}. ${wniosek}`} />
      <div className={s.tresc}>
        <p className={s.tytul}>
          {naglowek ?? "Gotowość"}
          {meta && <span className={s.meta}>{meta}</span>}
        </p>
        <p className={s.wniosek}>{wniosek}</p>
        {prognoza != null && <p className={s.meta}>Prognoza z arkuszy: {Math.round(prognoza * 100)}%</p>}
        {children}
      </div>
    </div>
  );
}
