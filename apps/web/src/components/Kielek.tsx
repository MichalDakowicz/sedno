// Kiełkująca pestka: umiejętność jako roślina w czterech stadiach, pierwsze z twarzą Pestki (nauka/stadia.ts). Rysunek w tokenach, ten sam
// od 20 px w wierszu mapy do ok. 96 px w panelu. Roślina jest pomarańczowa jak Pestka: zieleń znaczy w Sednie „dobrze”.
// animuj: nowe części rosną od ziemi (rozbiór, panel); w wierszach stoi bez ruchu.
import type { Stadium } from "../nauka/stadia";
import s from "./Kielek.module.css";

export function Kielek({ stadium, rozmiar = 32, animuj = false, opis }: {
  stadium: Stadium;
  rozmiar?: number;
  animuj?: boolean;
  /** Bez opisu rysunek jest ozdobą (aria-hidden), bo stadium mówi tekst obok. */
  opis?: string;
}) {
  const poziom = ["pestka", "kielek", "roslina", "drzewko"].indexOf(stadium);
  return (
    <svg className={s.kielek} data-animuj={animuj || undefined} width={rozmiar} height={rozmiar} viewBox="0 0 48 48"
      role={opis ? "img" : undefined} aria-label={opis} aria-hidden={opis ? undefined : true} data-stadium={stadium}>
      {opis && <title>{opis}</title>}
      <ellipse className={s.ziemia} cx="24" cy="43" rx="17" ry="3.5" />
      {poziom === 0 && (
        <g className={s.czesc}>
          <path className={s.nasiono} d="M24 21c7.4 0 12.6 5.6 12.6 11.8 0 5.4-5.4 9-12.6 9s-12.6-3.6-12.6-9C11.4 26.6 16.6 21 24 21Z" />
          <ellipse className={s.blask} cx="19.5" cy="27.5" rx="3.6" ry="2" transform="rotate(-25 19.5 27.5)" />
          <ellipse className={s.oko} cx="20" cy="31.5" rx="1.5" ry="2.1" />
          <ellipse className={s.oko} cx="28" cy="31.5" rx="1.5" ry="2.1" />
          <path className={s.usmiech} d="M21.4 36c1.6 1.4 3.6 1.4 5.2 0" />
        </g>
      )}
      {poziom >= 1 && (
        <>
          <path className={s.nasiono} d="M24 37c3.8 0 6.6 2 6.6 4.2 0 1.4-3 2.3-6.6 2.3s-6.6-.9-6.6-2.3c0-2.2 2.8-4.2 6.6-4.2Z" />
          <path className={`${s.lodyga} ${s.czesc}`} d={poziom === 1 ? "M24 38v-11" : poziom === 2 ? "M24 38V18" : "M24 40V20"} />
        </>
      )}
      {poziom === 1 && (
        <g className={`${s.czesc} ${s.pozniej}`}>
          <path className={s.lisc} d="M24 28c-1-4.2-4.6-6-8.4-5.4.6 3.8 3.8 6.2 8.4 5.4Z" />
          <path className={s.liscJasny} d="M24 27c1.2-3.6 4.2-5 7.4-4.4-.8 3.2-3.6 5.2-7.4 4.4Z" />
        </g>
      )}
      {poziom === 2 && (
        <g className={`${s.czesc} ${s.pozniej}`}>
          <path className={s.lisc} d="M24 31c-1.4-5.4-6-7.6-11-6.8.8 5 5 8 11 6.8Z" />
          <path className={s.liscJasny} d="M24 26c1.4-5.4 6-7.6 11-6.8-.8 5-5 8-11 6.8Z" />
          <path className={s.lisc} d="M24 20c-.8-3.6-3.8-5-7.2-4.4.6 3.2 3.4 5.2 7.2 4.4Z" />
          <path className={s.liscJasny} d="M24 19c.4-3.2 2.4-5.4 5-6-.2 3-2 5.2-5 6Z" />
        </g>
      )}
      {poziom === 3 && (
        <g className={`${s.czesc} ${s.pozniej}`}>
          <circle className={s.korona} cx="16.5" cy="21" r="8.5" />
          <circle className={s.korona} cx="31.5" cy="20" r="9" />
          <circle className={s.korona} cx="24" cy="12.5" r="9.5" />
          <circle className={s.koronaBlask} cx="21" cy="10" r="3.4" />
          <g className={s.owoc}>
            <circle className={s.owocKolor} cx="30" cy="22" r="4.4" />
            <ellipse className={s.blask} cx="28.6" cy="20.5" rx="1.4" ry="0.9" transform="rotate(-25 28.6 20.5)" />
          </g>
        </g>
      )}
    </svg>
  );
}
