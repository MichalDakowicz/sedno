import type { Umiejetnosc } from "../../nauka/api";
import s from "./Umiejetnosci.module.css";

export function Opanowanie({ score, confidence }: Pick<Umiejetnosc, "score" | "confidence">) {
  if (score === null) return <span className={`muted small ${s.brak}`}>Mało danych</span>;

  const procent = Math.round(score * 100);
  const malaPewnosc = confidence < 0.5;
  return (
    <span className={s.opanowanie} data-pewnosc={malaPewnosc ? "mala" : undefined}>
      <span className={s.pasek} aria-hidden="true">
        <span style={{ width: `${procent}%` }} />
      </span>
      <span className="small">
        <span className="visually-hidden">Opanowanie </span>{procent}%
        {malaPewnosc && <span className="visually-hidden">. Niska pewność oszacowania</span>}
      </span>
    </span>
  );
}
