// Wybór przedmiotów maturalnych i poziomów. Ten sam w onboardingu i w profilu.
// Przedmiot można zdawać na kilku poziomach naraz (np. podstawowy i rozszerzony).
import { Check } from "lucide-react";
import { SubjectIcon } from "./icons";
import { MAX_WPISOW_PRZEDMIOTOW, nazwaPoziomu, PRZEDMIOTY, type MojPrzedmiot } from "../konto/przedmioty";
import type { Poziom } from "../arkusze/typy";
import styles from "./WyborPrzedmiotow.module.css";

// Kolejność jak w katalogu, żeby zapisana lista nie zależała od kolejności kliknięć.
const uporzadkuj = (v: MojPrzedmiot[]) =>
  PRZEDMIOTY.flatMap((p) => p.poziomy.filter((l) => v.some((x) => x.id === p.id && x.poziom === l)).map((poziom) => ({ id: p.id, poziom })));

/** bezKrawedzi: lista stoi między nagłówkiem a następną grupą, które mają własne linie, więc bez linii na górze i na dole. */
export function WyborPrzedmiotow({ value, onChange, bezKrawedzi }: { value: MojPrzedmiot[]; onChange: (v: MojPrzedmiot[]) => void; bezKrawedzi?: boolean }) {
  const pelne = value.length >= MAX_WPISOW_PRZEDMIOTOW;

  function przelacz(id: MojPrzedmiot["id"], domyslny: Poziom) {
    if (pelne && !value.some((p) => p.id === id)) return;
    onChange(value.some((p) => p.id === id) ? value.filter((p) => p.id !== id) : uporzadkuj([...value, { id, poziom: domyslny }]));
  }

  // Ostatniego poziomu nie da się odznaczyć: przedmiot wyłącza się przyciskiem z nazwą.
  function poziom(id: MojPrzedmiot["id"], p: Poziom) {
    const jest = value.some((x) => x.id === id && x.poziom === p);
    if (jest && value.filter((x) => x.id === id).length === 1) return;
    if (pelne && !jest) return;
    onChange(jest ? value.filter((x) => !(x.id === id && x.poziom === p)) : uporzadkuj([...value, { id, poziom: p }]));
  }

  return (
    <ul className={bezKrawedzi ? `${styles.list} ${styles.bezKrawedzi}` : styles.list}>
      {PRZEDMIOTY.map((p) => {
        const wybrane = value.filter((x) => x.id === p.id).map((x) => x.poziom);
        const wybrany = wybrane.length > 0;
        return (
          <li key={p.id} className={`${styles.row} ${wybrany ? styles.on : ""}`}>
            <button type="button" className={styles.toggle} aria-pressed={wybrany} disabled={pelne && !wybrany} onClick={() => przelacz(p.id, p.poziomy[0]!)}>
              <span className={styles.check} aria-hidden="true">
                {wybrany && <Check size={14} strokeWidth={3} />}
              </span>
              <SubjectIcon subject={p} size="md" />
              <span className={styles.name}>{p.nazwa}</span>
            </button>
            {wybrany && (
              <div className={styles.levels} role="group" aria-label={`Poziomy: ${p.nazwa}`}>
                {p.poziomy.map((l) => {
                  const on = wybrane.includes(l);
                  return (
                    <button key={l} type="button" aria-pressed={on} disabled={pelne && !on} className={styles.level} onClick={() => poziom(p.id, l)}>
                      {nazwaPoziomu[l]}
                    </button>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
