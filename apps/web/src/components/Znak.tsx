// Znak Sedno: napis, w którego ostatnią literę „o” wciśnięta jest Pestka (pierścień litery zostaje, Pestka się w nim nie mieści). Ten sam rysunek co favicon i ikony aplikacji (public/pestka.svg),
// uproszczony do małego rozmiaru: bez blasku i policzków, które przy 24 px tylko brudzą.
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
  return (
    <span className={s.znak}>
      <span className="visually-hidden">Sedno</span>
      <span aria-hidden="true">Sedn</span>
      <svg className={s.literaO} viewBox="0 0 64 64" aria-hidden="true">
        {/* Za szeroka na dziurkę w „o”: wystaje bokami, ściśnięta w pionie, a pierścień na wierzchu ją trzyma. */}
        <g className={s.wnetrze} transform="translate(32 33) scale(1.32 0.8) translate(-32 -32)">
          <path d="M32 4c13.5 0 24 8.6 26.6 21.4 2.4 11.9-2 24-12.6 30.2C38.8 59.8 25.2 59.8 18 55.6 7.4 49.4 3 37.3 5.4 25.4 8 12.6 18.5 4 32 4Z" />
          <ellipse className={s.oko} cx="25" cy="31" rx="3.6" ry="6" />
          <ellipse className={s.oko} cx="39" cy="31" rx="3.6" ry="6" />
          <path className={s.usmiech} d="M27.5 42c2.6 2.4 6.4 2.4 9 0" />
        </g>
        <circle className={s.pierscien} cx="32" cy="32" r="27" />
      </svg>
    </span>
  );
}
