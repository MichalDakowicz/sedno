// Zegar arkusza: odlicza czas egzaminu z arkusza. Stan siedzi w postępie arkusza, więc przeżywa
// odświeżenie strony i synchronizuje się z kontem. Pestka odzywa się tylko w kilku momentach
// (półmetek, 15 minut przed końcem, koniec), bo ciągłe odliczanie rozprasza.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** onWroc: zegar poza arkuszem; kliknięcie wyspy wraca do arkusza zamiast wysuwać pełny zegar. */
export function Zegar({
  arkusz,
  limitMin,
  czas,
  onZmien,
  onWroc,
}: {
  arkusz: string;
  limitMin: number;
  czas: Czas;
  onZmien: (c: Czas | undefined) => void;
  onWroc?: () => void;
}) {
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
  // Jak Dynamic Island: przy otwarciu wyspa znika z paska (jej miejsce zostaje), a ten sam kształt
  // rozciąga się w dół w pełny zegar: rośnie szerokość, wysokość i zaokrąglenie, kolor przechodzi
  // z ciemnego w biały. Przy zamykaniu ta sama droga z powrotem, a wyspa wraca na koniec.
  useLayoutEffect(() => {
    const wysp = wyspaRef.current?.firstElementChild as HTMLElement | null | undefined;
    const pn = panelRef.current;
    if (widok === "schowany" || !wysp || !pn) return;
    const w = wysp.getBoundingClientRect();
    const r = pn.getBoundingClientRect();
    const male = {
      width: `${w.width}px`,
      height: `${w.height}px`,
      transform: `translateY(${w.top - r.top}px)`,
      backgroundColor: "#0f151d",
      boxShadow: "0 0 0 0 rgba(0,0,0,0)",
    };
    const duze = { width: `${r.width}px`, height: `${r.height}px`, transform: "translateY(0)" };
    const tresc = [...pn.children] as HTMLElement[];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (widok === "zamyka") setWidok("schowany");
      return;
    }
    if (widok === "otwarty") {
      pn.animate([male, duze], { duration: 520, easing: "cubic-bezier(0.32, 1.32, 0.5, 1)" });
      tresc.forEach((el) => el.animate([{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }], { duration: 520, easing: "ease-out" }));
    } else {
      tresc.forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" }));
      const a = pn.animate([duze, male], { duration: 340, easing: "cubic-bezier(0.5, 0, 0.3, 1)", fill: "forwards" });
      a.onfinish = () => setWidok("schowany");
      return () => a.cancel();
    }
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
    <div ref={panelRef} className={styles.panel}>
      <span className={styles.panelCzas} onClick={() => wyspa && setWidok("zamyka")}>
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
        className={`${styles.czas} ${widok !== "schowany" ? styles.ukryta : ""}`}
        onClick={() => (onWroc ? onWroc() : setWidok((v) => (v === "otwarty" ? "zamyka" : "otwarty")))}
        aria-expanded={onWroc ? undefined : rozwiniety}
        aria-label={onWroc ? `Wróć do arkusza na czas, ${zostalo > 0 ? "zostało" : "po czasie"} ${zapisCzasu(zostalo)}` : undefined}
        title={onWroc ? "Wróć do arkusza" : rozwiniety ? "Schowaj zegar" : "Pokaż zegar"}
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
