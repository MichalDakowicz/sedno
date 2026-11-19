// Gotowość z przedmiotu: pierścień z jedną liczbą (nauka/gotowosc.ts), kreską progu 30% i celu ucznia, oraz jedno
// zdanie-wniosek. Na mapie umiejętności duża, na pulpicie mała w wierszu przedmiotu. Prognoza z arkuszy, gdy jest,
// stoi tu jako druga liczba, a nie w osobnej sekcji.
import type { ReactNode } from "react";
import { PasekProgu, Pierscien } from "./wykresy";
import { policzGotowosc, wniosekGotowosci } from "../nauka/gotowosc";
import type { Umiejetnosc } from "../nauka/api";
import s from "./Gotowosc.module.css";

const OPIS = "Gotowość to średnie opanowanie umiejętności z mapy, ważone punktami, które dają na maturze. Umiejętności bez oceny nie wchodzą do średniej. Przy niewielu próbach pokazuję ją w kreskę, bo to wstępna ocena.";

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
  // W wierszu na pulpicie jedna krótka linia zamiast tytułu z dopiskami i pełnego zdania.
  const brakuje = cel !== null ? Math.round((cel - g.wartosc) * 100) : null;
  const krotko = [g.wstepna && "wstępnie", brakuje !== null && (brakuje > 0 ? `do celu ${brakuje} pkt proc.` : "cel osiągnięty")].filter(Boolean).join(" · ");
  // Bez żadnej ocenionej umiejętności 0% wyglądałoby jak zmierzony wynik: mówimy wprost, że jeszcze nie wiemy.
  if (umiejetnosci.every((u) => u.score === null)) {
    return (
      <div className={s.gotowosc} data-maly={maly || undefined} data-tutor-about={OPIS}>
        <Pierscien wartosc={0} wstepna srodek="?" rozmiar={maly ? 56 : 132} opis="Gotowość: za mało danych." />
        <div className={s.tresc}>
          <p className={s.tytul}>{naglowek ?? "Gotowość"}</p>
          <p className={s.wniosek}>{maly ? "jeszcze bez wyniku" : "Za mało odpowiedzi, żeby ją policzyć. Pierwsza runda da pierwszy wynik."}</p>
          {children}
        </div>
      </div>
    );
  }
  const meta = [g.wstepna && "wstępnie", cel !== null && `cel ${Math.round(cel * 100)}%`].filter(Boolean).join(" · ");
  return (
    <div className={s.gotowosc} data-maly={maly || undefined} data-tutor-about={OPIS}>
      <Pierscien wartosc={g.wartosc} wstepna={g.wstepna} rozmiar={maly ? 56 : 132}
        opis={`Gotowość ${procent}%${g.wstepna ? ", wstępnie" : ""}${zCelem}. ${wniosek}`} />
      <div className={s.tresc}>
        <p className={s.tytul}>
          {naglowek ?? "Gotowość"}
          {!maly && meta && <span className={s.meta}>{meta}</span>}
        </p>
        <p className={s.wniosek}>{maly ? krotko || wniosek : wniosek}</p>
        {!maly && (
          <div className={s.droga}>
            <PasekProgu gruby wartosc={g.wartosc} prog={{ wartosc: 0.3, etykieta: "próg 30%" }}
              cel={cel !== null ? { wartosc: cel, etykieta: `cel ${Math.round(cel * 100)}%` } : undefined}
              opis={`Gotowość ${procent}%, próg zdania 30%${zCelem}.`} />
          </div>
        )}
        {!maly && prognoza != null && <p className={s.meta}>Prognoza z arkuszy: {Math.round(prognoza * 100)}%</p>}
        {children}
      </div>
    </div>
  );
}
