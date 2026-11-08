import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { TutorAvatar } from "./TutorAvatar";
import { useTutor, type Hint } from "./TutorContext";
import styles from "./TutorGuide.module.css";

const AV = 48;
const GAP = 12;
const MOVE_MS = 700;
const FADE_MS = 200;
const SPOT_PAD = 8;

type Point = { x: number; y: number };
type Placement = "right" | "left" | "below" | "above";
type Mode = "rest" | "perch";
type Spot = { x: number; y: number; w: number; h: number };

// Liczymy od samych krawędzi okna: natywny pasek przewijania jest ukryty, a własny (ScrollBar) to nakładka.
const viewW = () => window.innerWidth;
const edge = () => (viewW() < 640 ? 16 : 24);

function findTarget(target: Hint["target"]): HTMLElement | null {
  const ids = Array.isArray(target) ? target : [target];
  for (const id of ids) {
    const el = document.querySelector<HTMLElement>(`[data-tutor="${id}"]`);
    if (el && el.getClientRects().length > 0) return el;
  }
  return null;
}

// Pas ekranu, w którym Pestka może siedzieć: pod paskiem nawigacji i nad miejscem spoczynku.
function band() {
  const nav = document.querySelector('nav[aria-label="Główna"]')?.getBoundingClientRect();
  return { top: (nav?.bottom ?? 0) + 8, bottom: window.innerHeight - 8 };
}

function clampX(x: number) {
  return Math.min(Math.max(x, 8), viewW() - AV - 8);
}

// Miejsce spoczynku: prawy dolny róg, w całości na ekranie.
function restPoint(): Point {
  return { x: viewW() - AV - edge(), y: window.innerHeight - AV - edge() };
}

// Siada na prawym górnym rogu elementu. Gdy nad elementem nie ma miejsca (np. pasek nawigacji),
// siada pod nim. Zwraca null, gdy element jest poza ekranem: wtedy Pestka wraca na spoczynek.
function perchPoint(el: HTMLElement): Point | null {
  const r = el.getBoundingClientRect();
  // Element w samym pasku nawigacji może mieć Pestkę także na pasku.
  const b = el.closest('nav[aria-label="Główna"]') ? { top: 8, bottom: window.innerHeight - 8 } : band();
  const x = clampX(r.right - AV * 0.75);
  const above = r.top - AV * 0.7;
  if (above >= b.top && r.top < b.bottom - AV) return { x, y: above };
  const below = r.bottom + 4;
  if (r.bottom > b.top && below + AV <= b.bottom) return { x, y: below };
  return null;
}

function summonPoint(page: Point): Point | null {
  const y = page.y - window.scrollY - AV / 2;
  const b = band();
  if (y < b.top || y + AV > b.bottom) return null;
  return { x: clampX(page.x - window.scrollX + 12), y };
}

function bubbleWidth() {
  return Math.min(340, viewW() - 32);
}

function bubbleLayout(p: Point) {
  const w = bubbleWidth();
  let placement: Placement;
  if (viewW() - (p.x + AV) - GAP - 16 >= w) placement = "right";
  else if (p.x - GAP - 16 >= w) placement = "left";
  else placement = window.innerHeight - (p.y + AV) > 240 ? "below" : "above";
  // Przy dymku pod lub nad avatarem przesuwamy go w poziomie, żeby nie wychodził poza ekran.
  const shift = Math.min(Math.max(16 - p.x, -w + AV), viewW() - 16 - w - p.x);
  // Dymek z boku przy dole ekranu otwiera się w górę.
  const up = window.innerHeight - p.y < 240;
  return { placement, shift, up, w };
}

const near = (a: Point, b: Point) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;

export function TutorGuide() {
  const tutor = useTutor();
  const { guide, summon, isOpen, next, dismiss, open, showHints, summonAt } = tutor;
  const hint = guide ? guide.hints[guide.index] : null;
  const isTourGuide = guide?.kind === "tour";
  const location = useLocation();

  const [pos, setPos] = useState<Point>(restPoint);
  const [mode, setMode] = useState<Mode>("rest");
  const [moving, setMoving] = useState(false);
  const [hop, setHop] = useState(0);
  const [talking, setTalking] = useState(false);
  const [closing, setClosing] = useState(false);
  const [spot, setSpot] = useState<Spot | null>(null);

  const modeRef = useRef<Mode>("rest");
  const posRef = useRef<Point>(pos);
  const focused = useRef<HTMLElement | null>(null);
  const moveTimer = useRef<number>();

  const setFocus = (el: HTMLElement | null) => {
    if (focused.current === el) return;
    focused.current?.classList.remove("tutor-focus");
    el?.classList.add("tutor-focus");
    focused.current = el;
  };

  // Przenosi Pestkę. Zmiana trybu albo nowy cel to skok; podążanie za przewijaną stroną dzieje się bez animacji.
  const place = useCallback((p: Point, m: Mode, jump: boolean) => {
    if (modeRef.current === m && near(posRef.current, p)) return;
    if (jump) {
      setMoving(true);
      setHop((h) => h + 1);
      window.clearTimeout(moveTimer.current);
      moveTimer.current = window.setTimeout(() => setMoving(false), MOVE_MS);
    }
    modeRef.current = m;
    posRef.current = p;
    setMode(m);
    setPos(p);
  }, []);

  // Ustala, gdzie Pestka powinna być teraz. `jump` dla zmian wywołanych przez ucznia lub nową wskazówkę.
  const showSpot = useCallback((el: HTMLElement | null) => {
    const r = el?.getBoundingClientRect();
    // Zbyt duży element (np. cała kolumna) nie dostaje reflektora: przyciemnienie nic by nie pokazało.
    const next = r && r.height < window.innerHeight * 0.8 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null;
    setSpot((prev) => (prev && next && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h ? prev : next));
  }, []);

  const sync = useCallback(
    (jump: boolean) => {
      if (summon) {
        const p = summonPoint(summon);
        setFocus(null);
        showSpot(null);
        if (p) place(p, "perch", jump || modeRef.current !== "perch");
        else dismiss(); // przewinięte poza ekran: przywołanie wygasa
        return;
      }
      const el = hint ? findTarget(hint.target) : null;
      const p = el ? perchPoint(el) : null;
      if (el && p) {
        // Przewodnik przyciemnia resztę ekranu; zwykła wskazówka tylko obwodzi element pulsującym pierścieniem.
        setFocus(isTourGuide ? null : el);
        showSpot(isTourGuide ? el : null);
        place(p, "perch", jump || modeRef.current !== "perch");
      } else {
        // Cel zniknął (zmiana strony albo karty) albo jest poza ekranem: Pestka wraca na spoczynek.
        setFocus(null);
        showSpot(null);
        place(restPoint(), "rest", modeRef.current !== "rest" || jump);
      }
    },
    [summon, hint, place, dismiss, isTourGuide, showSpot],
  );

  // Nowa wskazówka albo przywołanie.
  useLayoutEffect(() => {
    setClosing(false);
    if (hint && !findTarget(hint.target)) {
      next();
      return;
    }
    // Sama z siebie Pestka nie przewija strony: czeka na spoczynku, aż uczeń dojdzie do elementu.
    // Przewija tylko wtedy, gdy uczeń o to poprosił (przewodnik, „Dalej”, „Co dziś robić?”).
    const passive = guide?.kind === "hint" && guide.index === 0 && !guide.key.startsWith("ask-");
    const el = hint ? findTarget(hint.target) : null;
    if (el && !passive && !perchPoint(el)) el.scrollIntoView({ block: "center", behavior: "smooth" });
    sync(true);
  }, [hint, summon]);

  // Przewijanie i zmiana rozmiaru: Pestka podąża za elementem albo wraca na spoczynek, gdy element zniknie.
  useEffect(() => {
    let frame = 0;
    const onChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => sync(false));
    };
    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [sync]);

  // Zmiana strony albo karty (np. przełączenie przedmiotu) usuwa cel albo go przesuwa, a to nie jest ani
  // przewijanie, ani zmiana rozmiaru okna. Bez tego Pestka zostawała tam, gdzie cel już nie istnieje.
  useEffect(() => {
    let frame = 0;
    const onMutate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => sync(false));
    };
    const observer = new MutationObserver(onMutate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [sync]);

  // Przywołanie prawym przyciskiem dotyczy miejsca na stronie, więc po przejściu gdzie indziej wygasa.
  useEffect(() => {
    if (summon) dismiss();
  }, [location.pathname]);

  useEffect(() => () => setFocus(null), []);

  useEffect(() => {
    if (mode !== "perch") return;
    setTalking(true);
    const t = window.setTimeout(() => setTalking(false), 1600);
    return () => window.clearTimeout(t);
  }, [hop, mode]);

  // Dymek najpierw gaśnie, potem Pestka skacze na spoczynek.
  const close = useCallback(() => {
    if (modeRef.current !== "perch") {
      dismiss();
      return;
    }
    setClosing(true);
    window.setTimeout(dismiss, FADE_MS);
  }, [dismiss]);

  // Prawy przycisk (na telefonie przytrzymanie) przywołuje Pestkę do kursora.
  // Pola tekstowe i zaznaczony tekst zostawiamy przeglądarce, żeby dało się kopiować i wklejać.
  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (isOpen || t.closest("input, textarea, select, [contenteditable='true']")) return;
      if (String(window.getSelection() ?? "").trim()) return;
      if (t.closest(`.${styles.guide}`)) return;
      e.preventDefault();
      const about = t.closest<HTMLElement>("[data-tutor-about]")?.dataset.tutorAbout ?? null;
      summonAt({ x: e.pageX, y: e.pageY, about });
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, summonAt, close]);

  if (isOpen) return null;

  const resting = mode === "rest";
  const pending = resting && !!hint;
  const isTour = guide?.kind === "tour";
  const last = guide ? guide.index === guide.hints.length - 1 : false;
  const hasToday = !!document.querySelector('[data-tutor="today-cta"]');
  const layout = bubbleLayout(pos);
  const bubbleStyle: CSSProperties =
    layout.placement === "below" || layout.placement === "above" ? { left: layout.shift, width: layout.w } : { width: layout.w };

  function onAvatar() {
    // Na spoczynku z czekającą wskazówką kliknięcie prowadzi do niej, w innym razie otwiera rozmowę.
    const el = pending && hint ? findTarget(hint.target) : null;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    else open();
  }

  return (
    <>
      {spot && !resting && (
        <div
          className={`${styles.spot} ${closing ? styles.spotClosing : ""}`}
          style={{ left: spot.x - SPOT_PAD, top: spot.y - SPOT_PAD, width: spot.w + SPOT_PAD * 2, height: spot.h + SPOT_PAD * 2 }}
          aria-hidden="true"
        />
      )}
      <div
        className={`${styles.guide} ${moving ? styles.moving : ""} ${resting ? styles.resting : ""}`}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      >
        <button
          key={`a${hop}`}
          type="button"
          className={`${styles.avatar} ${hop === 0 ? styles.enter : styles.hop}`}
          onClick={onAvatar}
          aria-label={pending ? "Pestka ma dla ciebie wskazówkę" : "Porozmawiaj z Pestką"}
          title={pending ? "Pokaż wskazówkę" : "Porozmawiaj z Pestką"}
        >
          <TutorAvatar size={AV} state={talking ? "talking" : tutor.state} />
          {pending && <span className={styles.badge} aria-hidden="true" />}
        </button>

        {!resting && (summon || hint) && (
          <div
            key={`b${hop}`}
            className={`${styles.bubble} ${styles[layout.placement]} ${layout.up ? styles.up : ""} ${closing ? styles.closing : ""}`}
            style={bubbleStyle}
            role="status"
          >
            <button type="button" className={styles.close} onClick={close} aria-label="Odpraw Pestkę">
              <X size={16} />
            </button>

            {summon ? (
              <>
                <p className={styles.text}>{summon.about ?? "Jestem. W czym ci pomóc?"}</p>
                <div className={styles.actions}>
                  <button type="button" className="btn btn-dark btn-sm" onClick={open}>
                    Porozmawiajmy
                  </button>
                  {hasToday && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        showHints(`ask-${Date.now()}`, [{ target: "today-cta", text: "To polecam na dziś. Krótko i w twoim najsłabszym miejscu." }])
                      }
                    >
                      Co dziś robić?
                    </button>
                  )}
                </div>
              </>
            ) : (
              hint && (
                <>
                  {isTour && guide && (
                    <span className={styles.step}>
                      Przewodnik · {guide.index + 1} z {guide.hints.length}
                    </span>
                  )}
                  <p className={styles.text}>{hint.text}</p>
                  <div className={styles.actions}>
                    {hint.waitFor === "summon" ? (
                      <span className={styles.wait}>Czekam na prawy przycisk…</span>
                    ) : (
                      <button type="button" className="btn btn-dark btn-sm" onClick={next}>
                        {last ? "Jasne" : "Dalej"}
                      </button>
                    )}
                    {isTour && !last && (
                      <button type="button" className={styles.skip} onClick={close}>
                        Pomiń przewodnik
                      </button>
                    )}
                  </div>
                </>
              )
            )}
          </div>
        )}
      </div>
    </>
  );
}
