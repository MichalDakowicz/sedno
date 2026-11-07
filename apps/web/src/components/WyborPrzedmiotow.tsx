// Wybór przedmiotów maturalnych i poziomów. Ten sam w onboardingu i w profilu.
import { Check } from "lucide-react";
import { SubjectIcon } from "./icons";
import { nazwaPoziomu, PRZEDMIOTY, type MojPrzedmiot } from "../konto/przedmioty";
import type { Poziom } from "../arkusze/typy";
import styles from "./WyborPrzedmiotow.module.css";

export function WyborPrzedmiotow({ value, onChange }: { value: MojPrzedmiot[]; onChange: (v: MojPrzedmiot[]) => void }) {
  function przelacz(id: MojPrzedmiot["id"], domyslny: Poziom) {
    onChange(value.some((p) => p.id === id) ? value.filter((p) => p.id !== id) : [...value, { id, poziom: domyslny }]);
  }

  function poziom(id: MojPrzedmiot["id"], p: Poziom) {
    onChange(value.map((x) => (x.id === id ? { ...x, poziom: p } : x)));
  }

  return (
    <ul className={styles.list}>
      {PRZEDMIOTY.map((p) => {
        const wybrany = value.find((x) => x.id === p.id);
        return (
          <li key={p.id} className={`${styles.row} ${wybrany ? styles.on : ""}`}>
            <button type="button" className={styles.toggle} aria-pressed={!!wybrany} onClick={() => przelacz(p.id, p.poziomy[0]!)}>
              <SubjectIcon subject={p} size="md" />
              <span className={styles.name}>{p.nazwa}</span>
              <span className={styles.check} aria-hidden="true">
                {wybrany && <Check size={14} strokeWidth={3} />}
              </span>
            </button>
            {wybrany && (
              <div className={styles.levels} role="radiogroup" aria-label={`Poziom: ${p.nazwa}`}>
                {p.poziomy.map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={wybrany.poziom === l} className={`${styles.level} ${wybrany.poziom === l ? styles.levelOn : ""}`} onClick={() => poziom(p.id, l)}>
                    {nazwaPoziomu[l]}
                  </button>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
