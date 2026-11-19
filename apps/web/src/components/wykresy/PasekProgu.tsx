// Pasek wartości względem progu i celu (prognoza, wynik arkusza, opanowanie przed → po, czas względem normy).
// Kolor ucznia to akcent, tor z --line, próg z --muted; wartość wjeżdża przesunięciem (transform), nie szerokością.
import { useId } from "react";
import { ogranicz, useWejscie } from "./wejscie";
import s from "./Wykresy.module.css";

type Znacznik = { wartosc: number; etykieta: string };

export function PasekProgu({ wartosc, przed, prog, cel, opis, gruby = false, ton = "akcent" }: {
  /** 0–1 */
  wartosc: number;
  /** Wartość sprzed zmiany (rozbiór): jaśniejszy pasek pod spodem, a nowy dochodzi od niej. */
  przed?: number | null;
  prog?: Znacznik;
  cel?: Znacznik;
  /** Wniosek dla czytnika ekranu, np. „Prognoza 42%, próg 30%, cel 60%”. */
  opis: string;
  gruby?: boolean;
  /** „ponad”: wartość ponad normą (np. czas dłuższy niż norma) przygaszonym akcentem. */
  ton?: "akcent" | "ponad";
}) {
  const [ref, weszlo] = useWejscie<HTMLDivElement>();
  const clip = `pasek-${useId().replace(/:/g, "")}`;
  const v = ogranicz(wartosc);
  const start = przed != null ? ogranicz(przed) : 0;
  const pokazany = weszlo ? v : start;
  const znaczniki = [prog && { ...prog, rodzaj: "prog" as const }, cel && { ...cel, rodzaj: "cel" as const }].filter(Boolean) as (Znacznik & { rodzaj: "prog" | "cel" })[];
  return (
    <div ref={ref} className={s.pasek} data-gruby={gruby || undefined} data-ton={ton} data-podpisy={znaczniki.length > 0 || undefined} role="img" aria-label={opis}>
      <svg className={s.pasekSvg} width="100%" aria-hidden="true">
        <defs>
          <clipPath id={clip}><rect width="100%" height="100%" /></clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <rect className={s.tor} width="100%" height="100%" />
          {przed != null && <rect className={s.przed} width="100%" height="100%" style={{ transform: `translateX(${(start - 1) * 100}%)` }} />}
          <rect className={s.wartosc} width="100%" height="100%" style={{ transform: `translateX(${(pokazany - 1) * 100}%)` }} />
        </g>
      </svg>
      {znaczniki.map((z) => (
        <span key={z.rodzaj} className={s.kreska} data-rodzaj={z.rodzaj} style={{ left: `${ogranicz(z.wartosc) * 100}%` }} aria-hidden="true" />
      ))}
      {znaczniki.length > 0 && (
        <span className={s.podpisy} aria-hidden="true">
          {znaczniki.map((z) => {
            const x = ogranicz(z.wartosc);
            return (
              <span key={z.rodzaj} className={s.podpis} data-rodzaj={z.rodzaj} data-krawedz={x < 0.12 ? "lewa" : x > 0.88 ? "prawa" : undefined} style={{ left: `${x * 100}%` }}>
                {z.etykieta}
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
}
