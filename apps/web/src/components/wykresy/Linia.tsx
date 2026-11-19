// Linia zmiany w czasie (wyniki z arkuszy) z podpisanym ostatnim punktem i opcjonalną kreską progu.
// Kreska rysuje się w viewBox rozciąganym na szerokość (grubość stała dzięki non-scaling-stroke), a punkty
// i podpisy leżą nad nią w HTML, więc się nie rozciągają.
import { ogranicz, useWejscie } from "./wejscie";
import s from "./Wykresy.module.css";

export function Linia({ punkty, prog, podpisOstatniego, opis, wysokosc = 64 }: {
  /** Wartości 0–1 od najstarszej. */
  punkty: number[];
  prog?: number;
  podpisOstatniego: string;
  opis: string;
  wysokosc?: number;
}) {
  const [ref, weszlo] = useWejscie<HTMLDivElement>();
  if (!punkty.length) return null;
  const x = (i: number) => (punkty.length === 1 ? 100 : (i / (punkty.length - 1)) * 100);
  const y = (v: number) => 100 - ogranicz(v) * 100;
  const ostatni = punkty.at(-1)!;
  return (
    <div ref={ref} className={s.linia} role="img" aria-label={opis} style={{ height: wysokosc }} data-weszlo={weszlo || undefined}>
      <svg className={s.liniaSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {prog !== undefined && <line className={s.liniaProg} x1="0" x2="100" y1={y(prog)} y2={y(prog)} vectorEffect="non-scaling-stroke" />}
        <polyline className={s.liniaKreska} points={punkty.map((v, i) => `${x(i)},${y(v)}`).join(" ")} vectorEffect="non-scaling-stroke" />
      </svg>
      {punkty.slice(0, -1).map((v, i) => (
        <span key={i} className={s.liniaPunkt} style={{ left: `${x(i)}%`, top: `${y(v)}%` }} aria-hidden="true" />
      ))}
      <span className={s.liniaOstatni} style={{ left: `${x(punkty.length - 1)}%`, top: `${y(ostatni)}%` }} aria-hidden="true" />
      <span className={s.liniaPodpis} data-dol={ostatni > 0.75 || undefined} style={{ top: `${y(ostatni)}%` }} aria-hidden="true">{podpisOstatniego}</span>
      {prog !== undefined && <span className={s.liniaProgPodpis} style={{ top: `${y(prog)}%` }} aria-hidden="true">próg {Math.round(prog * 100)}%</span>}
    </div>
  );
}
