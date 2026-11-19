import type { Umiejetnosc } from "../../nauka/api";
import { Liczba } from "../../ruch";
import s from "./Umiejetnosci.module.css";

// Wyjaśnienia Pestki po prawym przycisku (data-tutor-about): słowa z mapy, które bez nich są żargonem.
export const OPIS_OPANOWANIA = "Opanowanie to moja ocena, jak pewnie radzisz sobie z tą umiejętnością, liczona z odpowiedzi w rundach i arkuszach. Rośnie po dobrych odpowiedziach, a powoli maleje, gdy długo nie ćwiczysz.";
export const OPIS_MALO_DANYCH = "Mało danych: za mało odpowiedzi, żebym oceniła tę umiejętność. Po jednej rundzie pokażę procent.";

export function Opanowanie({ score, confidence }: Pick<Umiejetnosc, "score" | "confidence">) {
  if (score === null) return <span className={`muted small ${s.brak}`} data-tutor-about={OPIS_MALO_DANYCH}>Mało danych</span>;

  const procent = Math.round(score * 100);
  const malaPewnosc = confidence < 0.5;
  return (
    <span className={`wiersz-pasek ${s.opanowanie}`} data-pewnosc={malaPewnosc ? "mala" : undefined} data-tutor-about={OPIS_OPANOWANIA}>
      <span className={s.pasek} aria-hidden="true">
        <span style={{ width: `${procent}%` }} />
      </span>
      <span>
        <span className="visually-hidden">Opanowanie </span><Liczba wartosc={procent} />%
        {malaPewnosc && <span className="visually-hidden">. Niska pewność oszacowania</span>}
      </span>
    </span>
  );
}
