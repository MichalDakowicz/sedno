// Zegar arkusza: odlicza czas egzaminu z arkusza. Stan siedzi w postępie arkusza, więc przeżywa
// odświeżenie strony i synchronizuje się z kontem. Pestka odzywa się tylko w kilku momentach
// (półmetek, 15 minut przed końcem, koniec), bo ciągłe odliczanie rozprasza.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Pause, Play, Timer, X } from "lucide-react";
import type { Czas } from "../arkusze/postep";
import { useTutor } from "./TutorContext";
import styles from "./Zegar.module.css";

const MIN = 60_000;

/** Czas, który już upłynął (ms). */
export const uplynelo = (c: Czas, teraz = Date.now()) => c.zuzyte + (c.start ? Math.max(0, teraz - c.start) : 0);

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
  // Wysunięty zegar: „zamyka” trwa, póki animacja chowania nie wróci do wyspy.
  const [widok, setWidok] = useState<"schowany" | "otwarty" | "zamyka">("schowany");
  const rozwiniety = widok === "otwarty";
  const biegnie = czas.start !== null;
  // Miejsce w górnym pasku (TopNav). Bez niego zegar wisi pod paskiem jak wcześniej.
  const [wyspa, setWyspa] = useState<HTMLElement | null>(null);
  useEffect(() => setWyspa(document.getElementById("wyspa-zegara")), []);
  const wyspaRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Pełny zegar rośnie z kształtu wyspy: skala startowa to stosunek ich szerokości i wysokości.
  const [ksztalt, setKsztalt] = useState<CSSProperties>({});
  useLayoutEffect(() => {
    // offsetWidth/Height, bo nie zależą od transformacji: panel jest już w trakcie animacji.
    const w = wyspaRef.current?.firstElementChild as HTMLElement | null | undefined;
    const pn = panelRef.current;
    if (widok !== "schowany" && w && pn?.offsetWidth)
      setKsztalt({ "--sx": (w.offsetWidth / pn.offsetWidth).toFixed(3), "--sy": (w.offsetHeight / pn.offsetHeight).toFixed(3) } as CSSProperties);
  }, [widok]);

  // Kliknięcie obok chowa wysunięty zegar z powrotem do wyspy.
  useEffect(() => {
    if (!rozwiniety) return;
    const schowaj = (e: PointerEvent) => {
      if (!wyspaRef.current?.contains(e.target as Node)) setWidok("zamyka");
    };
    document.addEventListener("pointerdown", schowaj);
    return () => document.removeEventListener("pointerdown", schowaj);
  }, [rozwiniety]);

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

  // Przy pauzie i wznowieniu liczymy od tej samej chwili co zapis, inaczej wyświetlacz skacze
  // o czas od ostatniego tyknięcia (do sekundy).
  function przelacz() {
    const t = Date.now();
    setTeraz(t);
    onZmien(biegnie ? { ...czas, start: null, zuzyte: uplynelo(czas, t) } : { ...czas, start: t });
  }

  const tekst = zostalo > 0 ? zapisCzasu(zostalo) : `+${zapisCzasu(zostalo)}`;
  const panel = (
    <div
      ref={panelRef}
      className={`${styles.panel} ${widok === "zamyka" ? styles.zamyka : ""}`}
      style={ksztalt}
      onAnimationEnd={(e) => e.target === e.currentTarget && widok === "zamyka" && setWidok("schowany")}
    >
      <span className={styles.panelCzas}>
        {tekst}
        <span className={styles.opis}>{zostalo > 0 ? (biegnie ? "zostało" : "pauza") : "po czasie"}</span>
      </span>
      <button type="button" className={styles.przycisk} onClick={przelacz} aria-label={biegnie ? "Pauza" : "Wznów"} title={biegnie ? "Pauza" : "Wznów"}>
        {biegnie ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <button type="button" className={styles.przycisk} onClick={() => onZmien(undefined)} aria-label="Wyłącz zegar" title="Wyłącz zegar">
        <X size={18} />
      </button>
    </div>
  );

  // Bez miejsca w pasku: sam pełny zegar pod paskiem.
  if (!wyspa)
    return (
      <div className={styles.samodzielny} data-stan={stan} data-tutor="zegar" role="timer" aria-label="Czas arkusza">
        {panel}
      </div>
    );

  // Wyspa w pasku pokazuje sam czas; kliknięcie wysuwa pod nią pełny zegar z pauzą i wyłączeniem.
  return createPortal(
    <div ref={wyspaRef} className={styles.wyspa} data-stan={stan} data-tutor="zegar" role="timer" aria-label="Czas arkusza">
      <button
        type="button"
        className={styles.czas}
        onClick={() => setWidok((v) => (v === "otwarty" ? "zamyka" : "otwarty"))}
        aria-expanded={rozwiniety}
        title={rozwiniety ? "Schowaj zegar" : "Pokaż zegar"}
      >
        <Timer size={16} aria-hidden="true" className={styles.ikona} />
        {tekst}
        {!biegnie && <span className={styles.pauzaZnak}>pauza</span>}
      </button>
      {widok !== "schowany" && panel}
    </div>,
    wyspa,
  );
}
