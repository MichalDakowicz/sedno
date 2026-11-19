// Pierścień wyniku (arkusz, karta roku): łuk w akcencie na torze z --line, kreska progu, liczba w środku.
import { ogranicz, useWejscie } from "./wejscie";
import s from "./Wykresy.module.css";

// Obwód 100, więc długość łuku to wprost procent.
const R = 15.9155;

export function Pierscien({ wartosc, prog, rozmiar = 72, opis, srodek }: {
  wartosc: number;
  prog?: number;
  rozmiar?: number;
  opis: string;
  /** Tekst w środku; domyślnie procent. */
  srodek?: string;
}) {
  const [ref, weszlo] = useWejscie<HTMLSpanElement>();
  const v = ogranicz(wartosc);
  return (
    <span ref={ref} className={s.pierscien} style={{ width: rozmiar, height: rozmiar }} role="img" aria-label={opis}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle className={s.pierscienTor} cx="18" cy="18" r={R} />
        <circle className={s.pierscienLuk} cx="18" cy="18" r={R} pathLength={100}
          strokeDasharray={`${weszlo ? Math.max(v * 100, 0.01) : 0} 100`} transform="rotate(-90 18 18)" />
        {prog !== undefined && <line className={s.pierscienProg} x1="18" y1="0" x2="18" y2="4.5" transform={`rotate(${ogranicz(prog) * 360} 18 18)`} />}
      </svg>
      <span className={s.pierscienSrodek} aria-hidden="true" style={{ fontSize: `calc(${Math.max(12, Math.round(rozmiar * 0.24))}px * var(--skala-tekstu, 1))` }}>
        {srodek ?? `${Math.round(v * 100)}%`}
      </span>
    </span>
  );
}
