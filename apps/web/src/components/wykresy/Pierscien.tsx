// Pierścień wyniku (arkusz, gotowość): łuk w akcencie na torze z --line, kreska progu i celu, liczba w środku.
// wstepna: łuk w kreskę (maska), gdy liczba opiera się na niewielu próbach.
import { useId } from "react";
import { ogranicz, useWejscie } from "./wejscie";
import s from "./Wykresy.module.css";

// Obwód 100, więc długość łuku to wprost procent.
const R = 15.9155;

export function Pierscien({ wartosc, prog, cel, wstepna = false, rozmiar = 72, opis, srodek }: {
  wartosc: number;
  prog?: number;
  /** Cel ucznia (0–1): kreska w kolorze akcentu-tekstu. */
  cel?: number | null;
  wstepna?: boolean;
  rozmiar?: number;
  opis: string;
  /** Tekst w środku; domyślnie procent. */
  srodek?: string;
}) {
  const [ref, weszlo] = useWejscie<HTMLSpanElement>();
  const v = ogranicz(wartosc);
  const maska = `pierscien-${useId().replace(/:/g, "")}`;
  return (
    <span ref={ref} className={s.pierscien} style={{ width: rozmiar, height: rozmiar }} role="img" aria-label={opis}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle className={s.pierscienTor} cx="18" cy="18" r={R} />
        {wstepna && (
          <mask id={maska}>
            <circle cx="18" cy="18" r={R} fill="none" stroke="#fff" strokeWidth="4" pathLength={100} strokeDasharray="1.6 1.1" />
          </mask>
        )}
        <circle className={s.pierscienLuk} cx="18" cy="18" r={R} pathLength={100} mask={wstepna ? `url(#${maska})` : undefined}
          strokeDasharray={`${weszlo ? Math.max(v * 100, 0.01) : 0} 100`} transform="rotate(-90 18 18)" />
        {prog !== undefined && <line className={s.pierscienProg} x1="18" y1="0" x2="18" y2="4.5" transform={`rotate(${ogranicz(prog) * 360} 18 18)`} />}
        {cel != null && <line className={s.pierscienCel} x1="18" y1="-1" x2="18" y2="5.5" transform={`rotate(${ogranicz(cel) * 360} 18 18)`} />}
      </svg>
      <span className={s.pierscienSrodek} aria-hidden="true" style={{ fontSize: `calc(${Math.max(12, Math.round(rozmiar * 0.24))}px * var(--skala-tekstu, 1))` }}>
        {srodek ?? `${Math.round(v * 100)}%`}
      </span>
    </span>
  );
}
