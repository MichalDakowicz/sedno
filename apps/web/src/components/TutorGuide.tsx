import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, X } from "lucide-react";
import { TutorAvatar } from "./TutorAvatar";
import { useTutor, type Hint } from "./TutorContext";
import { mniejRuchu } from "../ruch";
import { glos } from "../pestka/glos";
import styles from "./TutorGuide.module.css";

const AV = 48;
const GAP = 12;
const MOVE_MS = 700;
const FADE_MS = 200;
const SPOT_PAD = 8;

type Point = { x: number; y: number };
type Placement = "right" | "left" | "below" | "above";
/** Na telefonie Pestka z dymkiem dokuje się przy krawędzi ekranu (dolnej albo górnej), zamiast siadać na treści. */
type Dok = "gora" | "dol";
type Mode = "rest" | "perch";
type Spot = { x: number; y: number; w: number; h: number };

// Liczymy od samych krawędzi okna: natywny pasek przewijania jest ukryty, a własny (ScrollBar) to nakładka.
const viewW = () => window.innerWidth;
const WASKI = 640;
const waski = () => viewW() < WASKI;
const edge = () => (waski() ? 16 : 24);

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

// Pestka na spoczynku nie siada na przyciskach i polach (pasek tablicy, „Poprzednia”, przypięty odtwarzacz):
// gdy coś takiego jest pod nią, podnosi się o swoją wysokość, najwyżej kilka razy. Na telefonie dół ekranu jest
// zarezerwowany (pas z zanikaniem, a strona ma pod spodem zapas), więc omija tylko to, czego nie da się spod niej
// wyprzewijać: elementy przypięte (fixed, sticky). Inaczej na liście linków wspinała się na wartości wierszy.
const UNIKAJ = "button, a[href], input, select, textarea, [role='toolbar'], [data-pestka-unikaj]";
function przypiety(el: Element): boolean {
  for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
    const p = getComputedStyle(e).position;
    if (p === "fixed" || p === "sticky") return true;
  }
  return false;
}
function zajete(x: number, y: number): boolean {
  const punkty = [[x + AV / 2, y + AV / 2], [x + 6, y + 6], [x + AV - 6, y + 6], [x + 6, y + AV - 6], [x + AV - 6, y + AV - 6]];
  const tylkoPrzypiete = waski();
  return punkty.some(([px, py]) =>
    document.elementsFromPoint(px!, py!).some((el) => {
      if (el.closest(`.${styles.guide}`) || el.closest(`.${styles.dok}`)) return false;
      const cel = el.closest(UNIKAJ);
      return !!cel && (!tylkoPrzypiete || przypiety(cel));
    }),
  );
}

const rogY = () => window.innerHeight - AV - edge();

// Litera „o” w logu na pasku: z niej Pestka wylatuje do wskazówek i do niej wraca. Ta w rogu zostaje na miejscu.
function dom(): DOMRect | null {
  const el = document.querySelector<SVGElement>("[data-pestka-dom]");
  const r = el?.getBoundingClientRect();
  return r && r.width > 0 && r.bottom > 0 ? r : null;
}

const srodekO = (o: DOMRect): Point => ({ x: o.left + o.width / 2 - AV / 2, y: o.top + o.height / 2 - AV / 2 });
const WYLOT_MS = 650; // szarpanie w „o”, zanim Pestka się wyrwie
const WYSKOK_MS = 450; // „pyk” po wyrwaniu: rozpłaszczenie i odbicie
const WCISK_MS = 450; // wciskanie się z powrotem w literę
const KROPLE_MS = 750;
// Krople przy wyrwaniu i wciśnięciu: kierunek lotu w pikselach i średnica. Opadają jeszcze trochę pod koniec.
const KROPLE: [number, number, number][] = [[-34, -26, 8], [-44, 2, 6], [-26, 22, 7], [32, -30, 8], [46, -2, 6], [28, 20, 7], [-8, -42, 6], [12, -40, 7], [0, 30, 5]];

/** Stan litery „o” w logu (Znak.module.css): szarpanie przed wylotem, pusta litera, wciskanie się z powrotem. */
function stanLogo(stan: "wylot" | "poza" | "powrot" | null) {
  if (stan) document.documentElement.dataset.pestka = stan;
  else delete document.documentElement.dataset.pestka;
}

function restPoint(): Point {
  const x = spoczynekLewy ? edge() : viewW() - AV - edge();
  let y = rogY();
  for (let i = 0; i < 4 && zajete(x, y); i++) y -= AV + 8;
  return { x, y };
}

// Dok na telefonie: Pestka w rogu (dolnym albo górnym, pod paskiem), dymek obok niej na resztę szerokości.
function dokPoint(d: Dok): Point {
  const x = spoczynekLewy ? edge() : viewW() - AV - edge();
  return d === "dol" ? restPoint() : { x, y: band().top + 14 };
}

// Czy element widać w pasie pod nawigacją: wskazówka na telefonie czeka na spoczynku, aż element wjedzie.
function widac(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  // Elementy samego paska (przycisk menu, logo, lupa) leżą nad pasem, a dymek i tak dokuje się przy dolnej krawędzi.
  if (el.closest('nav[aria-label="Główna"]')) return r.bottom > 0 && r.top < window.innerHeight;
  const b = band();
  const w = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top);
  return w >= Math.min(r.height / 2, AV);
}

// Krawędź doku po tej stronie, gdzie dymek nie zasłoni elementu ani jego najbliższego otoczenia (karta, wiersz,
// sekcja, o ile mieszczą się w ekranie). Poprzednia strona zostaje, dopóki nie zasłania: bez skakania przy przewijaniu.
function wybierzDok(el: HTMLElement, h: number, poprzedni: Dok | null): Dok {
  let r = el.getBoundingClientRect();
  const otoczenie = el.closest<HTMLElement>(".karta, li, section")?.getBoundingClientRect();
  if (otoczenie && otoczenie.height < window.innerHeight * 0.6) r = otoczenie;
  const wys = Math.max(h, AV) + 16;
  const pasy: Record<Dok, { top: number; bottom: number }> = {
    dol: { top: window.innerHeight - edge() - wys, bottom: window.innerHeight },
    gora: { top: 0, bottom: band().top + wys },
  };
  const zakryte = (d: Dok) => Math.max(0, Math.min(r.bottom, pasy[d].bottom) - Math.max(r.top, pasy[d].top));
  if (poprzedni && zakryte(poprzedni) === 0) return poprzedni;
  return zakryte("dol") <= zakryte("gora") ? "dol" : "gora";
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
  // Pod elementem tylko wtedy, gdy co najmniej połowa elementu jest widoczna. Inaczej element schowany pod
  // paskiem trzymał Pestkę z dymkiem nad treścią, której dymek nie dotyczy.
  const widac = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top);
  const below = r.bottom + 4;
  if (widac >= r.height / 2 && below + AV <= b.bottom) return { x, y: below };
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

// Dymek w doku: obok Pestki, od krawędzi ekranu; w dolnym doku rośnie w górę, w górnym w dół.
function dokLayout(d: Dok) {
  const w = viewW() - 2 * edge() - AV - GAP;
  return { placement: (spoczynekLewy ? "right" : "left") as Placement, shift: 0, up: d === "dol", w };
}

type Prost = { x: number; y: number; w: number; h: number };
const nachodzi = (a: Prost, b: Prost) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Dymek staje po tej stronie Pestki, gdzie mieści się na ekranie i nie zasłania elementu, o którym mówi.
// Kolejność prób: z prawej, z lewej (w dół albo w górę), nad Pestką, pod nią. Gdy nic nie pasuje w całości,
// wygrywa miejsce, które zasłania element najmniej.
function bubbleLayout(p: Point, h: number, cel: DOMRect | null) {
  const w = bubbleWidth();
  const shift = Math.min(Math.max(16 - p.x, -w + AV), viewW() - 16 - w - p.x);
  const b = { top: 8, bottom: window.innerHeight - 8 };
  const kandydaci: { placement: Placement; up: boolean; r: Prost }[] = [
    { placement: "right", up: false, r: { x: p.x + AV + GAP, y: p.y - 10, w, h } },
    { placement: "right", up: true, r: { x: p.x + AV + GAP, y: p.y + AV + 10 - h, w, h } },
    { placement: "left", up: false, r: { x: p.x - GAP - w, y: p.y - 10, w, h } },
    { placement: "left", up: true, r: { x: p.x - GAP - w, y: p.y + AV + 10 - h, w, h } },
    { placement: "above", up: false, r: { x: p.x + shift, y: p.y - GAP - h, w, h } },
    { placement: "below", up: false, r: { x: p.x + shift, y: p.y + AV + GAP, w, h } },
  ];
  const miesci = (r: Prost) => r.x >= 8 && r.x + r.w <= viewW() - 8 && r.y >= b.top && r.y + r.h <= b.bottom;
  const zakryte = (r: Prost) => {
    if (!cel) return 0;
    const dx = Math.max(0, Math.min(r.x + r.w, cel.right) - Math.max(r.x, cel.left));
    const dy = Math.max(0, Math.min(r.y + r.h, cel.bottom) - Math.max(r.y, cel.top));
    return dx * dy;
  };
  const celProst = cel ? { x: cel.left, y: cel.top, w: cel.width, h: cel.height } : null;
  const wybor = kandydaci.find((k) => miesci(k.r) && (!celProst || !nachodzi(k.r, celProst)))
    ?? [...kandydaci].filter((k) => miesci(k.r)).sort((a, z) => zakryte(a.r) - zakryte(z.r))[0]
    ?? kandydaci[window.innerHeight - (p.y + AV) > 240 ? 5 : 4];
  return { placement: wybor.placement, shift, up: wybor.up, w };
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
  // Wysokość dymka z poprzedniego renderu: potrzebna, żeby wybrać stronę, po której się zmieści.
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleH, setBubbleH] = useState(150);
  const bubbleHRef = useRef(150);
  useLayoutEffect(() => {
    const h = bubbleRef.current?.offsetHeight;
    if (h && Math.abs(h - bubbleH) > 4) {
      bubbleHRef.current = h;
      setBubbleH(h);
    }
  });
  const [dok, setDok] = useState<Dok | null>(null);
  const dokRef = useRef<Dok | null>(null);
  const ustawDok = (d: Dok | null) => {
    dokRef.current = d;
    setDok(d);
  };
  // Zwinięty dymek: Pestka wraca na spoczynek z kropką czekającej wskazówki, kliknięcie ją rozwija.
  const [zwiniety, setZwiniety] = useState(false);

  const modeRef = useRef<Mode>("rest");
  const posRef = useRef<Point>(pos);
  // Pestka, która mówi, przylatuje z „o” logo i tam wraca. W tym czasie w rogu stoi druga (kopia przycisku rozmowy).
  const wylot = useRef<{ timer: number; cel: [Point, Mode, boolean] } | null>(null);
  const powrot = useRef<number | null>(null);
  const [wOku, ustawWOku] = useState(false);
  const [faza, ustawFaze] = useState<"szarpie" | "wyskok" | "wciska" | null>(null);
  const [krople, ustawKrople] = useState<{ x: number; y: number; id: number } | null>(null);
  const pryskaj = (p: Point) => {
    const id = Date.now();
    ustawKrople({ x: p.x + AV / 2, y: p.y + AV / 2, id });
    window.setTimeout(() => ustawKrople((k) => (k?.id === id ? null : k)), KROPLE_MS);
  };
  useEffect(() => () => stanLogo(null), []);
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
  const przenies = useCallback((p: Point, m: Mode, jump: boolean) => {
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

  const place = useCallback((p: Point, m: Mode, jump: boolean) => {
    // Trwa szarpanie w „o”: ruszy po nim, do ostatniego celu.
    if (wylot.current) {
      wylot.current.cel = [p, m, jump];
      return;
    }
    const o = dom();
    // Wraca, a tu nowa wskazówka: zawraca od razu.
    if (powrot.current !== null) {
      if (m === "rest") return;
      window.clearTimeout(powrot.current);
      powrot.current = null;
      stanLogo("poza");
      ustawWOku(false);
      ustawFaze(null);
    } else if (o && !mniejRuchu() && modeRef.current === "rest" && m === "perch") {
      // Wylot: Pestka siedzi w „o” (litera w logu pustoszeje) i szarpie się, żeby się uwolnić; potem wyrywa się
      // z kroplami i „pyk”, i leci do celu. Ostatni cel z tego czasu wygrywa.
      stanLogo("poza");
      const start = srodekO(o);
      posRef.current = start;
      modeRef.current = "perch";
      setMode("perch");
      setPos(start);
      ustawFaze("szarpie");
      wylot.current = {
        cel: [p, m, jump],
        timer: window.setTimeout(() => {
          const [cp, cm] = wylot.current!.cel;
          wylot.current = null;
          pryskaj(start);
          ustawFaze("wyskok");
          window.setTimeout(() => ustawFaze((f) => (f === "wyskok" ? null : f)), WYSKOK_MS);
          przenies(cp, cm, true);
        }, WYLOT_MS),
      };
      return;
    } else if (o && !mniejRuchu() && modeRef.current === "perch" && m === "rest") {
      // Powrót: leci do „o” i maleje, wciska się w literę z kroplami, litera podskakuje. Pestka w rogu stała cały czas.
      const cel = srodekO(o);
      ustawWOku(true);
      przenies(cel, "perch", true);
      powrot.current = window.setTimeout(() => {
        ustawWOku(false);
        ustawFaze("wciska");
        pryskaj(cel);
        powrot.current = window.setTimeout(() => {
          powrot.current = null;
          ustawFaze(null);
          stanLogo("powrot");
          window.setTimeout(() => {
            if (document.documentElement.dataset.pestka === "powrot") stanLogo(null);
          }, 600);
          przenies(p, "rest", false);
        }, WCISK_MS);
      }, MOVE_MS);
      return;
    }
    przenies(p, m, jump);
  }, [przenies]);

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
        if (!p) {
          dismiss(); // przewinięte poza ekran: przywołanie wygasa
          return;
        }
        if (waski()) {
          // Na telefonie dymek dokuje po przeciwnej stronie niż palec, żeby nie zasłonić tego, o co pytamy.
          const d: Dok = p.y > window.innerHeight / 2 ? "gora" : "dol";
          const zmiana = d !== dokRef.current;
          ustawDok(d);
          place(dokPoint(d), "perch", jump || zmiana || modeRef.current !== "perch");
        } else {
          ustawDok(null);
          place(p, "perch", jump || modeRef.current !== "perch");
        }
        return;
      }
      const el = hint && !zwiniety ? findTarget(hint.target) : null;
      if (el && waski() && widac(el)) {
        setFocus(isTourGuide ? null : el);
        showSpot(isTourGuide ? el : null);
        const nowyCel = el !== ostatniCel.current;
        ostatniCel.current = el;
        const d = wybierzDok(el, bubbleHRef.current, nowyCel ? null : dokRef.current);
        const zmiana = d !== dokRef.current;
        ustawDok(d);
        place(dokPoint(d), "perch", jump || nowyCel || zmiana || modeRef.current !== "perch");
        return;
      }
      if (dokRef.current) ustawDok(null);
      const p = el && !waski() ? perchPoint(el) : null;
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
    [summon, hint, place, dismiss, isTourGuide, showSpot, zwiniety],
  );

  // Nowa wskazówka albo przywołanie.
  useLayoutEffect(() => {
    setClosing(false);
    setZwiniety(false);
    if (hint && !findTarget(hint.target)) {
      next();
      return;
    }
    // Sama z siebie Pestka nie przewija strony: czeka na spoczynku, aż uczeń dojdzie do elementu.
    // Przewija tylko wtedy, gdy uczeń o to poprosił (przewodnik, „Dalej”, „Co dziś robić?”).
    const passive = guide?.kind === "hint" && guide.index === 0 && !guide.key.startsWith("ask-");
    const el = hint ? findTarget(hint.target) : null;
    if (el && !passive && !(waski() ? widac(el) : perchPoint(el))) el.scrollIntoView({ block: "center", behavior: "smooth" });
    sync(true);
  }, [hint, summon]);

  // Zwinięcie i rozwinięcie dymka: skok na spoczynek albo z powrotem do doku (pierwszy render ustawia efekt wyżej).
  const pierwszeZwiniecie = useRef(true);
  useEffect(() => {
    if (pierwszeZwiniecie.current) {
      pierwszeZwiniecie.current = false;
      return;
    }
    sync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zwiniety]);

  // Przewijanie i zmiana rozmiaru: Pestka podąża za elementem albo wraca na spoczynek, gdy element zniknie.
  useEffect(() => {
    let frame = 0;
    const onChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        sync(false);
      });
    };
    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);
    // Dom w „o” logo pojawia się i przesuwa z układem paska (pierwsze wczytanie, skala tekstu): wtedy też przeliczamy.
    const start = window.setTimeout(onChange, 60);
    const uklad = new ResizeObserver(onChange);
    uklad.observe(document.body);
    const logo = document.querySelector("[data-pestka-dom]");
    if (logo) uklad.observe(logo);
    return () => {
      window.clearTimeout(start);
      uklad.disconnect();
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

  // Panel z prawej (warsztat, rozmowa) przestawia miejsce spoczynku na lewą stronę okna. Pestka staje tam od razu,
  // bez przelotu przez ekran: animacja przy każdym otwarciu panelu rozpraszała.
  useEffect(() => {
    let ostatnia = document.documentElement.dataset.panelStrona;
    const observer = new MutationObserver(() => {
      const strona = document.documentElement.dataset.panelStrona;
      if (strona === ostatnia) return;
      ostatnia = strona;
      spoczynekLewy = strona === "prawa";
      sync(false);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-panel-strona"] });
    return () => observer.disconnect();
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

  // Prawy przycisk albo, na dotyku, przytrzymanie palca (ok. 0,5 s, bez ruchu i przewijania) przywołuje Pestkę.
  // Pola tekstowe i zaznaczony tekst zostawiamy przeglądarce, żeby dało się kopiować i wklejać.
  useEffect(() => {
    let dlugie = 0;
    const przywolaj = (t: HTMLElement, x: number, y: number): boolean => {
      if (isOpen || t.closest("input, textarea, select, [contenteditable='true']")) return false;
      if (String(window.getSelection() ?? "").trim()) return false;
      if (t.closest(`.${styles.guide}`)) return false;
      // Tablica (Excalidraw) ma własne menu i własny panel Pestki: dwa menu naraz tylko by przeszkadzały.
      if (t.closest(".excalidraw")) return false;
      const about = t.closest<HTMLElement>("[data-tutor-about]")?.dataset.tutorAbout ?? null;
      const zadanie = t.closest<HTMLElement>("[data-tutor-kontekst]");
      const kontekst = zadanie?.dataset.tutorKontekst
        ? {
          klucz: zadanie.dataset.tutorKlucz ?? zadanie.dataset.tutorKontekst,
          tytul: zadanie.dataset.tutorTytul ?? "to zadanie", opis: zadanie.dataset.tutorKontekst,
          przedmiot: zadanie.dataset.tutorPrzedmiot, maProbe: zadanie.dataset.tutorProba === "tak",
          chronOdpowiedz: zadanie.dataset.tutorChron === "tak",
        }
        : null;
      summonAt({ x, y, about, kontekst });
      return true;
    };
    const onContext = (e: MouseEvent) => {
      // Android po przytrzymaniu zgłasza jeszcze contextmenu: przywołanie już było albo zaraz będzie z timera.
      clearTimeout(timer);
      if (Date.now() - dlugie < 1000) {
        e.preventDefault();
        return;
      }
      dlugie = Date.now();
      if (!przywolaj(e.target as HTMLElement, e.pageX, e.pageY)) dlugie = 0;
      else e.preventDefault();
    };

    let timer = 0;
    let start = { x: 0, y: 0 };
    let polknijDotyk = false;
    const anuluj = () => clearTimeout(timer);
    const onTouchStart = (e: TouchEvent) => {
      anuluj();
      polknijDotyk = false;
      if (e.touches.length !== 1) return;
      const t = e.touches[0]!;
      const cel = e.target as HTMLElement;
      start = { x: t.clientX, y: t.clientY };
      timer = window.setTimeout(() => {
        if (Date.now() - dlugie < 1000 || !przywolaj(cel, t.pageX, t.pageY)) return;
        dlugie = Date.now();
        // Puszczenie palca nie ma otworzyć linku ani zaznaczyć słowa pod nim.
        polknijDotyk = true;
        window.getSelection()?.removeAllRanges();
      }, 500);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t && Math.hypot(t.clientX - start.x, t.clientY - start.y) > 10) anuluj();
    };
    const onTouchEnd = (e: TouchEvent) => {
      anuluj();
      if (polknijDotyk && e.cancelable) e.preventDefault();
      polknijDotyk = false;
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", anuluj);
    document.addEventListener("scroll", anuluj, { capture: true, passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      anuluj();
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", anuluj);
      document.removeEventListener("scroll", anuluj, { capture: true });
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, summonAt, close]);

  if (isOpen) return null;

  const resting = mode === "rest";
  const pending = resting && !!hint;
  const isTour = guide?.kind === "tour";
  const last = guide ? guide.index === guide.hints.length - 1 : false;
  const hasToday = !!document.querySelector('[data-tutor="today-cta"]');
  const cel = !summon && hint && mode === "perch" ? findTarget(hint.target)?.getBoundingClientRect() ?? null : null;
  const layout = dok && !resting ? dokLayout(dok) : bubbleLayout(pos, bubbleH, cel);
  // Pas pod Pestką na spoczynku w rogu telefonu: treść pod nią przygasa jak pod paskiem nawigacji, więc Pestka
  // nie siedzi na wierszu ani przycisku (strona ma pod spodem zapas, żeby koniec dało się wyprzewijać nad pas).
  const pasDoku = resting && waski() && Math.abs(pos.y - rogY()) < 1;
  // W „o” (szarpanie, powrót, wciskanie) dymek i reflektor czekają: pokażą się dopiero przy celu, a nie na pasku.
  const wDrodze = faza === "szarpie" || faza === "wciska" || wOku;
  const bubbleStyle: CSSProperties =
    layout.placement === "below" || layout.placement === "above" ? { left: layout.shift, width: layout.w } : { width: layout.w };

  function onAvatar() {
    // Na spoczynku z czekającą wskazówką kliknięcie prowadzi do niej, w innym razie otwiera rozmowę.
    if (zwiniety) {
      setZwiniety(false);
      return;
    }
    const el = pending && hint ? findTarget(hint.target) : null;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    else open();
  }

  return (
    <>
      {pasDoku && <div className={styles.dok} aria-hidden="true" />}
      {krople && (
        <div key={krople.id} className={styles.krople} style={{ left: krople.x, top: krople.y }} aria-hidden="true">
          {KROPLE.map(([dx, dy, r], i) => (
            <span key={i} style={{ width: r, height: r, ["--dx" as string]: dx + "px", ["--dy" as string]: dy + "px" }} />
          ))}
        </div>
      )}
      {!resting && (
        <div className={styles.guide} style={{ transform: `translate(${restPoint().x}px, ${restPoint().y}px)` }}>
          <button type="button" className={styles.avatar} onClick={() => open()} aria-label="Porozmawiaj z Pestką" title="Porozmawiaj z Pestką">
            <TutorAvatar size={AV} state="idle" />
          </button>
        </div>
      )}
      {spot && !resting && !wDrodze && (
        <div
          className={`${styles.spot} ${closing ? styles.spotClosing : ""}`}
          style={{ left: spot.x - SPOT_PAD, top: spot.y - SPOT_PAD, width: spot.w + SPOT_PAD * 2, height: spot.h + SPOT_PAD * 2 }}
          aria-hidden="true"
        />
      )}
      <div
        ref={guideRef}
        className={`${styles.guide} ${moving ? styles.moving : ""} ${wOku ? styles.wOku : ""} ${faza ? styles[faza] : ""}`}
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
          <TutorAvatar size={AV} state={talking ? "talking" : tutor.spi && resting && tutor.state === "idle" ? "sen" : tutor.state} />
          {pending && <span className={styles.badge} aria-hidden="true" />}
        </button>

        {!resting && !wDrodze && (summon || hint) && (
          <div
            key={`b${hop}`}
            ref={bubbleRef}
            className={`${styles.bubble} ${styles[layout.placement]} ${layout.up ? styles.up : ""} ${dok ? styles.wDoku : ""} ${closing ? styles.closing : ""}`}
            style={bubbleStyle}
            role="status"
          >
            {dok && hint && !summon && !isTour && (
              <button type="button" className={`${styles.close} ${styles.zwin}`} onClick={() => setZwiniety(true)} aria-label="Zwiń dymek Pestki" title="Zwiń">
                <ChevronDown size={18} />
              </button>
            )}
            <button type="button" className={styles.close} onClick={close} aria-label="Odpraw Pestkę">
              <X size={16} />
            </button>

            {summon ? (
              <>
                <p className={styles.text}>{summon.about ?? (summon.kontekst ? glos.rozmowa.widze.replace("{n}", summon.kontekst.tytul) : glos.rozmowa.przywolanie)}</p>
                <div className={styles.actions}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => open(summon.kontekst)}>
                    {summon.kontekst ? "Zapytaj o to zadanie" : "Porozmawiajmy"}
                  </button>
                  {hasToday && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        showHints(`ask-${Date.now()}`, [{ target: "today-cta", text: glos.rozmowa.coDzis }])
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
