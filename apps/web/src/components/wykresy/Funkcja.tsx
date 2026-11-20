// Wykres funkcji na płaszczyźnie z osiami (model w Wizualizacjach): krzywa akcentem, siatka i osie z --line,
// wyróżniony punkt (np. wierzchołek) podpisany wprost na wykresie. Rysuje próbki z serwera, nic nie liczy sam.
// Krzywa idzie za suwakiem od razu (to model do przesuwania, nie wartość, która dochodzi do stanu).
import { useId } from "react";
import s from "./Wykresy.module.css";

type Punkt = { x: number; y: number };

const W = 320;
const H = 240;
const POLE = 18;

export function Funkcja({ punkty, wyrozniony, x = [-6, 6], y = [-8, 8], opis, podpisPod = false }: {
  punkty: Punkt[];
  /** Punkt podpisany na wykresie, np. wierzchołek paraboli. */
  wyrozniony?: (Punkt & { etykieta: string }) | null;
  x?: [number, number];
  y?: [number, number];
  /** Wniosek dla czytnika ekranu (opis stanu modelu). */
  opis: string;
  /** Podpis punktu pod nim (np. wierzchołek paraboli z ramionami w górę), żeby nie stał na krzywej. */
  podpisPod?: boolean;
}) {
  const clip = `funkcja-${useId().replace(/:/g, "")}`;
  const sx = (v: number) => POLE + ((v - x[0]) / (x[1] - x[0])) * (W - 2 * POLE);
  const sy = (v: number) => H - POLE - ((v - y[0]) / (y[1] - y[0])) * (H - 2 * POLE);
  const kreski = (od: number, doo: number) => Array.from({ length: Math.floor(doo) - Math.ceil(od) + 1 }, (_, i) => Math.ceil(od) + i);
  const linia = punkty.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(Math.max(y[0] - 50, Math.min(y[1] + 50, p.y))).toFixed(1)}`).join(" ");
  const w = wyrozniony && wyrozniony.x >= x[0] && wyrozniony.x <= x[1] && wyrozniony.y >= y[0] && wyrozniony.y <= y[1] ? wyrozniony : null;
  return (
    <svg className={s.funkcja} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={opis}>
      <defs>
        <clipPath id={clip}><rect x={POLE} y={POLE} width={W - 2 * POLE} height={H - 2 * POLE} /></clipPath>
      </defs>
      {kreski(x[0], x[1]).filter((v) => v !== 0).map((v) => <line key={`x${v}`} className={s.siatka} x1={sx(v)} x2={sx(v)} y1={POLE} y2={H - POLE} />)}
      {kreski(y[0], y[1]).filter((v) => v !== 0).map((v) => <line key={`y${v}`} className={s.siatka} y1={sy(v)} y2={sy(v)} x1={POLE} x2={W - POLE} />)}
      <line className={s.os} x1={POLE} x2={W - POLE} y1={sy(0)} y2={sy(0)} />
      <line className={s.os} y1={POLE} y2={H - POLE} x1={sx(0)} x2={sx(0)} />
      {kreski(x[0], x[1]).filter((v) => v !== 0 && v % 2 === 0).map((v) => (
        <text key={`tx${v}`} className={s.podpisOsi} x={sx(v)} y={sy(0) + 12} textAnchor="middle">{v < 0 ? `−${-v}` : v}</text>
      ))}
      {kreski(y[0], y[1]).filter((v) => v !== 0 && v % 2 === 0).map((v) => (
        <text key={`ty${v}`} className={s.podpisOsi} x={sx(0) - 4} y={sy(v) + 3} textAnchor="end">{v < 0 ? `−${-v}` : v}</text>
      ))}
      <path className={s.krzywa} d={linia} clipPath={`url(#${clip})`} />
      {w && (
        <g>
          <circle className={s.punktFunkcji} cx={sx(w.x)} cy={sy(w.y)} r={5} />
          <text className={s.podpisPunktu} x={sx(w.x) + (w.x > (x[0] + x[1]) / 2 ? -8 : 8)} y={sy(w.y) + (podpisPod ? 20 : -12)}
            textAnchor={w.x > (x[0] + x[1]) / 2 ? "end" : "start"}>{w.etykieta}</text>
        </g>
      )}
    </svg>
  );
}
