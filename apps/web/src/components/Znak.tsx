// Znak Sedno: napis, w którego ostatnią literę „o” wciśnięta jest Pestka (pierścień litery zostaje, Pestka się w nim nie mieści). Ten sam rysunek co favicon i ikony aplikacji (public/pestka.svg).
// ZnakPestki jest uproszczony do małego rozmiaru; Pestka w „o” ma detale awatara (gradient, blask, policzki), żeby była tą samą postacią.
import { useId } from "react";
import s from "./Znak.module.css";

export function ZnakPestki({ rozmiar = 24 }: { rozmiar?: number }) {
  return (
    <svg className={s.pestka} width={rozmiar} height={rozmiar} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 4c13.5 0 24 8.6 26.6 21.4 2.4 11.9-2 24-12.6 30.2C38.8 59.8 25.2 59.8 18 55.6 7.4 49.4 3 37.3 5.4 25.4 8 12.6 18.5 4 32 4Z" />
      <ellipse className={s.oko} cx="24" cy="30" rx="4" ry="5.4" />
      <ellipse className={s.oko} cx="40" cy="30" rx="4" ry="5.4" />
      <path className={s.usmiech} d="M26.5 41c3.2 3 7.8 3 11 0" />
    </svg>
  );
}

export function Znak() {
  const gradient = `znak-pestka-${useId().replace(/:/g, "")}`;
  return (
    <span className={s.znak}>
      <span className="visually-hidden">Sedno</span>
      <span aria-hidden="true">Sedn</span>
      <svg className={s.literaO} viewBox="0 0 64 64" aria-hidden="true" data-pestka-dom>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff8a3d" />
            <stop offset="55%" stopColor="#ff7448" />
            <stop offset="100%" stopColor="#ff5e3a" />
          </linearGradient>
        </defs>
        {/* Większa niż dziurka w „o”: wypełnia ją całą i wystaje bokami na zewnątrz, a pierścień na wierzchu ją ściska. */}
        {/* Zewnętrzna grupa znika, gdy Pestka jest poza literą, i podskakuje, gdy do niej wraca (stan na <html data-pestka>, TutorGuide). */}
        <g className={s.szarpie}>
        <g className={s.wnetrze} transform="translate(32 33) scale(1.3 0.9) translate(-32 -32)">
          <path d="M32 4c13.5 0 24 8.6 26.6 21.4 2.4 11.9-2 24-12.6 30.2C38.8 59.8 25.2 59.8 18 55.6 7.4 49.4 3 37.3 5.4 25.4 8 12.6 18.5 4 32 4Z" fill={`url(#${gradient})`} />
          <ellipse cx="22" cy="17" rx="7" ry="4" fill="#fff" opacity="0.25" transform="rotate(-24 22 17)" />
          <circle cx="17.5" cy="38" r="4.2" fill="#ffc8b7" opacity="0.75" />
          <circle cx="46.5" cy="38" r="4.2" fill="#ffc8b7" opacity="0.75" />
          <ellipse className={s.oko} cx="25" cy="31" rx="3.6" ry="6" />
          <ellipse className={s.oko} cx="39" cy="31" rx="3.6" ry="6" />
          <path className={s.usmiech} d="M27.5 42c2.6 2.4 6.4 2.4 9 0" />
        </g>
        </g>
        <circle className={s.pierscien} cx="32" cy="32" r="27" />
      </svg>
    </span>
  );
}
