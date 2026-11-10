import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { TutorAvatar } from "./TutorAvatar";
import { useTutor, type Hint } from "./TutorContext";
import styles from "./TutorGuide.module.css";

const AV = 48;
const GAP = 12;
const MOVE_MS = 700;
const PANEL_MS = 500; // jak długo panel wjeżdża (Panel.module.css)
const LOT_MS = 850; // czas lotu Pestki na drugą stronę
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

// Miejsce spoczynku: dolny róg, w całości na ekranie. Prawy, chyba że po prawej stoi panel warsztatu:
// wtedy lewy, żeby panel nie tracił miejsca w pionie. Strona zmienia się dopiero w chwili skoku (patrz
// efekt przy data-panel-strona), a nie od razu z atrybutem, bo inaczej zwykła synchronizacja przeniosłaby
// Pestkę bez animacji.
let spoczynekLewy = false;
function restPoint(): Point {
  return { x: spoczynekLewy ? edge() : viewW() - AV - edge(), y: window.innerHeight - AV - edge() };
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
  const guideRef = useRef<HTMLDivElement>(null);
  const [talking, setTalking] = useState(false);
  const [closing, setClosing] = useState(false);
  const [spot, setSpot] = useState<Spot | null>(null);

  const modeRef = useRef<Mode>("rest");
  const posRef = useRef<Point>(pos);
  const focused = useRef<HTMLElement | null>(null);
  // Element, na którym Pestka siedzi: nowy cel to skok, ten sam (przewijanie) to tylko podążanie.
  const ostatniCel = useRef<HTMLElement | null>(null);
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
        const nowyCel = el !== ostatniCel.current;
        ostatniCel.current = el;
        place(p, "perch", jump || nowyCel || modeRef.current !== "perch");
      } else if (hint?.trzymaj && modeRef.current === "perch") {
        // Cel chwilowo poza ekranem (przewijanie do zadania): Pestka czeka w miejscu i stamtąd skoczy.
        setFocus(null);
        showSpot(null);
      } else {
        ostatniCel.current = null;
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

  // Panel warsztatu wjeżdża z prawej: jego krawędź spycha Pestkę w lewo i ją spłaszcza, po czym ona bez
  // zatrzymania odskakuje jednym łukiem na lewą stronę okna. Przy chowaniu panelu wraca skokiem na prawo.
  useEffect(() => {
    let ostatnia = document.documentElement.dataset.panelStrona;
    let klatka = 0;
    let awaria = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Jeden ciągły łuk (parabola) z łagodnym rozpędem i hamowaniem na całość, bez pauzy w połowie.
    const leć = (lewa: boolean, od: Point) => {
      spoczynekLewy = lewa;
      const cel = restPoint();
      sync(true);
      const g = guideRef.current;
      if (!g || near(od, cel)) return;
      const wysokosc = Math.min(180, Math.max(90, Math.abs(od.x - cel.x) / 6));
      const KROKI = 16;
      const klatki = Array.from({ length: KROKI + 1 }, (_, i) => {
        const u = i / KROKI;
        const x = od.x + (cel.x - od.x) * u;
        const y = od.y + (cel.y - od.y) * u - 4 * wysokosc * u * (1 - u);
        return { transform: `translate(${x}px, ${Math.max(band().top, y)}px)` };
      });
      g.animate(klatki, { duration: LOT_MS, easing: "cubic-bezier(0.4, 0, 0.3, 1)" });
    };

    const observer = new MutationObserver(() => {
      const strona = document.documentElement.dataset.panelStrona;
      if (strona === ostatnia) return;
      ostatnia = strona;
      cancelAnimationFrame(klatka);
      window.clearTimeout(awaria);
      if (modeRef.current !== "rest" || reduce) {
        spoczynekLewy = strona === "prawa";
        sync(false);
        return;
      }
      if (strona !== "prawa") {
        leć(false, posRef.current);
        return;
      }
      const panel = document.querySelector<HTMLElement>('[aria-label^="Materiały do zadania"]');
      const g = guideRef.current;
      const av = g?.querySelector<HTMLElement>("[data-pestka]");
      if (!panel || !g || !av) {
        leć(true, posRef.current);
        return;
      }
      // Krawędź panelu popycha Pestkę przed sobą; im dłużej, tym mocniej ją ściska. Gdy panel jest prawie
      // na miejscu, ona od razu odskakuje (bez czekania), więc ruch jest ciągły.
      const start = performance.now();
      const x0 = posRef.current.x;
      const y0 = posRef.current.y;
      let x = x0;
      let zakonczone = false;
      // Skok jest gwarantowany także wtedy, gdy przeglądarka wstrzymuje klatki (karta w tle).
      const zakoncz = () => {
        if (zakonczone) return;
        zakonczone = true;
        cancelAnimationFrame(klatka);
        window.clearTimeout(awaria);
        av.style.transform = "";
        leć(true, { x, y: y0 });
      };
      const krok = () => {
        const L = panel.getBoundingClientRect().left;
        x = Math.max(8, Math.min(x0, L - 4 - AV));
        g.style.transform = `translate(${x}px, ${y0}px)`;
        const docisk = Math.min(1, (x0 - x) / 60);
        av.style.transformOrigin = "100% 100%";
        av.style.transform = `scale(${1 - 0.5 * docisk}, ${1 + 0.08 * docisk})`;
        if (performance.now() - start < PANEL_MS * 0.85) klatka = requestAnimationFrame(krok);
        else zakoncz();
      };
      awaria = window.setTimeout(zakoncz, PANEL_MS * 0.85 + 150);
      klatka = requestAnimationFrame(krok);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-panel-strona"] });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(klatka);
      window.clearTimeout(awaria);
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
        ref={guideRef}
        className={`${styles.guide} ${moving ? styles.moving : ""} ${resting ? styles.resting : ""}`}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      >
        <button
          key={`a${hop}`}
          type="button"
          className={`${styles.avatar} ${hop === 0 ? styles.enter : styles.hop}`}
          data-pestka="przewodnik"
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
                  <button type="button" className="btn btn-primary btn-sm" onClick={open}>
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
                    {hint.actions ? (
                      hint.actions.map((a) => (
                        <button key={a.label} type="button" className={`btn ${a.primary ? "btn-primary" : "btn-ghost"} btn-sm`} onClick={a.onClick}>
                          {a.label}
                        </button>
                      ))
                    ) : hint.waitFor === "summon" ? (
                      <span className={styles.wait}>Czekam na prawy przycisk…</span>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm" onClick={next}>
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
