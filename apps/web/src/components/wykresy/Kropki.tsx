// Rząd kropek: dni tygodnia, zadania rundy, ostatnie próby. Pełna akcentowa = było (nauka), zielona i czerwona =
// dobrze i źle (zawsze ze znakiem, nie samym kolorem), pusta = jeszcze nie, przerywana = w planie.
import { Check, Minus, X } from "lucide-react";
import { useWejscie } from "./wejscie";
import s from "./Wykresy.module.css";

export type StanKropki = "pelna" | "dobrze" | "zle" | "pominiete" | "pusta" | "plan";
export type Kropka = { stan: StanKropki; podpis?: string; biezaca?: boolean; tytul?: string };

export function Kropki({ kropki, opis, rozmiar = "zwykle", rowno = false }: {
  kropki: Kropka[];
  opis: string;
  rozmiar?: "male" | "zwykle";
  /** Kropki rozłożone na całą szerokość (siedem dni), a nie ciasno jedna przy drugiej. */
  rowno?: boolean;
}) {
  const [ref, weszlo] = useWejscie<HTMLOListElement>();
  const znak = rozmiar === "male" ? 10 : 14;
  return (
    <ol ref={ref} className={s.kropki} data-rozmiar={rozmiar} data-rowno={rowno || undefined} data-weszlo={weszlo || undefined} role="img" aria-label={opis}>
      {kropki.map((k, i) => (
        <li key={i} data-stan={k.stan} data-biezaca={k.biezaca || undefined} title={k.tytul}>
          <span className={s.kropka} aria-hidden="true" style={{ transitionDelay: `${Math.min(i, 9) * 30}ms` }}>
            {k.stan === "dobrze" && <Check size={znak} strokeWidth={3} />}
            {k.stan === "zle" && <X size={znak} strokeWidth={3} />}
            {k.stan === "pominiete" && <Minus size={znak} strokeWidth={3} />}
          </span>
          {k.podpis && <span className={s.kropkaPodpis} aria-hidden="true">{k.podpis}</span>}
        </li>
      ))}
    </ol>
  );
}
