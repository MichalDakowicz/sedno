// Zegar arkusza: odlicza czas egzaminu z arkusza. Stan siedzi w postępie arkusza, więc przeżywa
// odświeżenie strony i synchronizuje się z kontem. Pestka odzywa się tylko w kilku momentach
// (półmetek, 15 minut przed końcem, koniec), bo ciągłe odliczanie rozprasza.
import { useEffect, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import type { Czas } from "../arkusze/postep";
import { useTutor } from "./TutorContext";
import styles from "./Zegar.module.css";

const MIN = 60_000;

/** Czas, który już upłynął (ms). */
export const uplynelo = (c: Czas, teraz = Date.now()) => c.zuzyte + (c.start ? teraz - c.start : 0);

/** Zegar zatrzymany w bieżącej chwili. */
export const zatrzymaj = (c: Czas): Czas => (c.start ? { ...c, start: null, zuzyte: uplynelo(c) } : c);

/** 1:05:09 albo 42:07 */
export function zapisCzasu(ms: number): string {
  const s = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

type Moment = { id: string; po: number; tekst: string };

function momenty(limitMin: number): Moment[] {
  const m: Moment[] = [{ id: "polowa", po: (limitMin / 2) * MIN, tekst: `Półmetek. Zostało ${Math.round(limitMin / 2)} minut.` }];
  if (limitMin > 30) m.push({ id: "15min", po: (limitMin - 15) * MIN, tekst: "Zostało 15 minut. Dobry moment, żeby przejrzeć zadania bez odpowiedzi." });
  m.push({ id: "koniec", po: limitMin * MIN, tekst: "Czas minął. Na maturze to koniec. Możesz sprawdzić arkusz albo pisać dalej po czasie." });
  return m;
}

export function Zegar({ arkusz, limitMin, czas, onZmien }: { arkusz: string; limitMin: number; czas: Czas; onZmien: (c: Czas | undefined) => void }) {
  const { showHints } = useTutor();
  const [teraz, setTeraz] = useState(Date.now());
  const biegnie = czas.start !== null;

  useEffect(() => {
    if (!biegnie) return;
    const t = window.setInterval(() => setTeraz(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [biegnie]);

  const ms = uplynelo(czas, teraz);
  const zostalo = limitMin * MIN - ms;

  // Po powrocie po długiej przerwie mija naraz kilka momentów: Pestka mówi tylko o ostatnim.
  useEffect(() => {
    if (!biegnie) return;
    const ogloszone = czas.ogloszone ?? [];
    const minione = momenty(limitMin).filter((m) => ms >= m.po && !ogloszone.includes(m.id));
    const ostatni = minione.at(-1);
    if (!ostatni) return;
    onZmien({ ...czas, ogloszone: [...ogloszone, ...minione.map((m) => m.id)] });
    showHints(`zegar-${arkusz}-${ostatni.id}-${Date.now()}`, [{ target: "zegar", text: ostatni.tekst }]);
  }, [biegnie, ms >= limitMin * MIN, Math.floor(ms / MIN)]);

  const stan = zostalo <= 0 ? "po" : zostalo <= 15 * MIN ? "koncowka" : undefined;

  return (
    <div className={styles.zegar} data-stan={stan} data-tutor="zegar" role="timer" aria-label="Czas arkusza">
      <span className={styles.czas}>
        {zostalo > 0 ? zapisCzasu(zostalo) : `+${zapisCzasu(zostalo)}`}
        <span className={styles.opis}>{zostalo > 0 ? (biegnie ? "zostało" : "pauza") : "po czasie"}</span>
      </span>
      <button
        type="button"
        className={styles.przycisk}
        onClick={() => onZmien(biegnie ? zatrzymaj(czas) : { ...czas, start: Date.now() })}
        aria-label={biegnie ? "Pauza" : "Wznów"}
        title={biegnie ? "Pauza" : "Wznów"}
      >
        {biegnie ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <button type="button" className={styles.przycisk} onClick={() => onZmien(undefined)} aria-label="Wyłącz zegar" title="Wyłącz zegar">
        <X size={18} />
      </button>
    </div>
  );
}
