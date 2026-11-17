import { Link } from "react-router-dom";
import { ArrowRight, Target } from "lucide-react";
import { przedmiot } from "../../konto/przedmioty";
import type { Wynik } from "../../konto/wyniki";
import type { ArkuszWpis } from "../../arkusze/typy";
import type { KontekstPulpitu } from "./widgety";
import { Kicker, procent } from "./wspolne";
import styles from "../Dashboard.module.css";

// Próg zdania matury z przedmiotu obowiązkowego na poziomie podstawowym.
const PROG = 30;

function kiedyTemu(iso: string): string {
  const dni = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return dni <= 0 ? "dziś" : dni === 1 ? "wczoraj" : `${dni} dni temu`;
}

/** Linia wyników kolejnych arkuszy jednego przedmiotu, od najstarszego. */
function Trend({ wyniki, podpis }: { wyniki: Wynik[]; podpis: string }) {
  const pkt = wyniki.slice(0, 8).reverse().map(procent);
  const w = 120;
  const h = 40;
  const x = (i: number) => (pkt.length === 1 ? w / 2 : (i / (pkt.length - 1)) * w);
  const y = (v: number) => h - 3 - (v / 100) * (h - 6);
  return (
    <span className={styles.trendWrap}>
      <svg className={styles.trend} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <line x1="0" x2={w} y1={y(PROG)} y2={y(PROG)} className={styles.trendProg} />
        <polyline points={pkt.map((v, i) => `${x(i)},${y(v)}`).join(" ")} className={styles.trendLinia} />
        <circle cx={x(pkt.length - 1)} cy={y(pkt.at(-1)!)} r="3.5" className={styles.trendKropka} />
      </svg>
      <span className={styles.trendPodpis}>{podpis}</span>
    </span>
  );
}

const nazwaArkusza = (a: ArkuszWpis) => przedmiot(a.przedmiot)?.nazwa ?? a.przedmiot;

/** Wyniki z tego samego przedmiotu i poziomu co najnowszy: porównanie angielskiego z matematyką nic nie mówi. */
function tegoSamego(wszystkie: Wynik[]): Wynik[] {
  const [o] = wszystkie;
  return o ? wszystkie.filter((w) => w.arkusz.przedmiot === o.arkusz.przedmiot && w.arkusz.poziom === o.arkusz.poziom) : [];
}

function wniosek(seria: Wynik[]): string {
  const [ostatni, poprzedni] = seria;
  if (!ostatni) return "";
  const nazwa = nazwaArkusza(ostatni.arkusz);
  if (!poprzedni)
    return procent(ostatni) < PROG
      ? `${nazwa}: pierwszy wynik, poniżej progu ${PROG}%. Kolejny arkusz pokaże, czy idzie w górę.`
      : `${nazwa}: pierwszy wynik. Kolejny arkusz pokaże, czy idzie w górę.`;
  const roznica = procent(ostatni) - procent(poprzedni);
  if (Math.abs(roznica) < 3) return `${nazwa}: ostatni arkusz na podobnym poziomie co poprzedni.`;
  return roznica > 0 ? `${nazwa}: o ${roznica} pkt proc. lepiej niż w poprzednim arkuszu.` : `${nazwa}: o ${-roznica} pkt proc. słabiej niż w poprzednim arkuszu.`;
}

export function WynikiZArkuszy({ zakres: podsumowania, co, obok }: KontekstPulpitu) {
  if (!co) return null;
  const wszystkie = podsumowania.flatMap((p) => p.wyniki).sort((a, b) => b.kiedy.localeCompare(a.kiedy));
  const srednia = wszystkie.length ? Math.round(wszystkie.reduce((s, w) => s + procent(w), 0) / wszystkie.length) : null;
  const blok = (
    <div className={styles.block} data-tutor="results" data-tutor-about="Średnia z arkuszy, które sprawdziłeś w Sedno. Z nich wybieram, co polecić.">
      <div className={styles.wynikiNaglowek}>
        <Kicker icon={Target}>Wyniki</Kicker>
        <Link to="/arkusze" className="link">
          Arkusze <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {srednia === null ? (
        <>
          <p className="h2">Jeszcze bez wyniku</p>
          <p className="muted">Sprawdź pierwszy arkusz, a pokażę ci, gdzie jesteś i ile brakuje do progu.</p>
        </>
      ) : (
        <>
          <div className={styles.wynikiGlowa}>
            <p className={styles.stat}>
              {srednia}
              <span>%</span>
              <span className={styles.statOpis}>średnio z {wszystkie.length} {wszystkie.length === 1 ? "arkusza" : "arkuszy"}</span>
            </p>
            {tegoSamego(wszystkie).length > 1 && <Trend wyniki={tegoSamego(wszystkie)} podpis={nazwaArkusza(wszystkie[0]!.arkusz).toLowerCase()} />}
          </div>
          <div className={styles.skala} role="img" aria-label={`Średnio ${srednia}%, próg zdania ${PROG}%`}>
            <span className={styles.skalaPasek}>
              <span style={{ width: `${Math.max(srednia, 1)}%` }} />
              <span className={styles.skalaProg} style={{ left: `${PROG}%` }} />
            </span>
            <span className={styles.skalaOpis} style={{ left: `${PROG}%` }}>
              próg {PROG}%
            </span>
          </div>
          <p className={styles.wniosek}>{wniosek(tegoSamego(wszystkie))}</p>
          <ul className={styles.ostatnie}>
            {wszystkie.slice(0, 2).map((w) => (
              <li key={w.arkusz.id + w.kiedy}>
                <Link to={`/arkusze/${w.arkusz.id}`}>
                  <span>
                    {nazwaArkusza(w.arkusz)} · {w.arkusz.sesja} {w.arkusz.rok}
                    <span className="muted small"> · {kiedyTemu(w.kiedy)}</span>
                  </span>
                  <span className={styles.ostatniWynik}>{procent(w)}%</span>
                </Link>
                {w.zdobyte < w.mozliwe && (
                  <Link to={`/arkusze/${w.arkusz.id}?omow=1`} className={styles.omow}>
                    omów błędy
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
  return obok ? blok : <section className={`${styles.wynikiSam} wejscie`}>{blok}</section>;
}
