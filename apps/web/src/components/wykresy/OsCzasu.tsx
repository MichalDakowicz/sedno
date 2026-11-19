// Oś czasu: egzaminy od dziś do ostatniego (OsCzasu) i siedem najbliższych dni z liczbą (PasDni, powtórki).
import { useWejscie } from "./wejscie";
import s from "./Wykresy.module.css";

export type Zdarzenie = { klucz: string; etykieta: string; opis?: string; wyroznij?: boolean };

/**
 * Dziś po lewej, kreska przerywana z liczbą dni do pierwszego egzaminu, dalej egzaminy po kolei w równych odstępach
 * (terminy w sesji leżą dzień przy dniu, w skali czasu zlałyby się w jedną kropkę). Daty są w podpisach.
 */
export function OsCzasu({ zdarzenia, opis, ile }: { zdarzenia: Zdarzenie[]; opis: string; /** podpis nad przerwą, np. „168 dni” */ ile?: string }) {
  const [ref, weszlo] = useWejscie<HTMLDivElement>();
  if (!zdarzenia.length) return null;
  const PIERWSZY = zdarzenia.length === 1 ? 1 : 0.28;
  const x = (i: number) => (zdarzenia.length === 1 ? 1 : PIERWSZY + ((1 - PIERWSZY) * i) / (zdarzenia.length - 1));
  return (
    <div ref={ref} className={s.os} data-weszlo={weszlo || undefined} role="img" aria-label={opis}>
      <span className={s.osPrzerwa} style={{ width: `${PIERWSZY * 100}%` }} aria-hidden="true" />
      {zdarzenia.length > 1 && <span className={s.osLinia} style={{ left: `${PIERWSZY * 100}%` }} aria-hidden="true" />}
      {ile && <span className={s.osIle} style={{ left: `${(PIERWSZY / 2) * 100}%` }} aria-hidden="true">{ile}</span>}
      <span className={s.osDzis} aria-hidden="true"><span className={s.osZnak} /><span className={s.osDzisPodpis}>dziś</span></span>
      {zdarzenia.map((z, i) => (
        <span key={z.klucz} className={s.osZdarzenie} data-wyroznij={z.wyroznij || undefined} data-dol={i % 2 === 1 || undefined}
          data-krawedz={x(i) > 0.9 ? "prawa" : undefined} style={{ left: `${x(i) * 100}%`, transitionDelay: `${120 + Math.min(i, 8) * 40}ms` }} aria-hidden="true">
          <span className={s.osZnak} />
          <span className={s.osEtykieta}>{z.etykieta}{z.opis && <span className={s.osOpis}>{z.opis}</span>}</span>
        </span>
      ))}
    </div>
  );
}

export type Dzien = { klucz: string; podpis: string; liczba: number; dzis?: boolean; tytul?: string };

/** Siedem kratek: wypełnienie rośnie z liczbą, a liczba jest zawsze napisana (kolor nie niesie informacji sam). */
export function PasDni({ dni, opis }: { dni: Dzien[]; opis: string }) {
  const [ref, weszlo] = useWejscie<HTMLOListElement>();
  const max = Math.max(...dni.map((d) => d.liczba), 1);
  return (
    <ol ref={ref} className={s.pasDni} role="img" aria-label={opis}>
      {dni.map((d, i) => (
        <li key={d.klucz} data-dzis={d.dzis || undefined} data-zero={d.liczba === 0 || undefined} title={d.tytul}>
          <span className={s.kratka} aria-hidden="true">
            <span className={s.kratkaWypelnienie} style={{ transform: `scaleY(${weszlo ? d.liczba / max : 0})`, transitionDelay: `${i * 30}ms` }} />
            <span className={s.kratkaLiczba}>{d.liczba}</span>
          </span>
          <span className={s.kratkaPodpis} aria-hidden="true">{d.podpis}</span>
        </li>
      ))}
    </ol>
  );
}
