// Kształt nawigacji: pływający pasek u góry dociska się do boku ekranu, rozlewa w górę do krawędzi
// i wylewa z siebie panel Pestki (z prawej) albo, na pełnym ekranie rozmowy, kolumnę historii (z lewej).
// Pasek, panel i wklęsłe rogi na stykach rysuje jedna warstwa z jednym cieniem (Ksztalt.tsx), a prawdziwy nav,
// panel i historia leżą nad nią z przezroczystym tłem w tych samych ramkach.
// Elementy znajdujemy po data-ksztalt, bo należą do różnych komponentów (TopNav, TutorDock, TutorChat).
import { mniejRuchu } from "../ruch";

export type Poza = "srodek" | "prawy" | "pelny";
type Strona = "lewy" | "prawy";
type Ramka = { left: string; top: string; width: string; height: string; borderRadius: string };
type Krok = { el: HTMLElement | null; kf: Keyframe[]; start: number; dur: number; easing?: string; odwrotnie?: boolean };
type G = ReturnType<typeof geometria>;

/** Od tej szerokości rozmowa na pełnym ekranie ma kolumnę historii wylaną z nava. */
export const PELNY_OD = 900;
/** Od tej szerokości panel Pestki rozsuwa stronę; węższy ją przykrywa (z zasłoną). */
export const PANEL_OBOK_OD = 1100;

const DOCISK = 650; // jazda paska do boku
const ROZLEW = 950; // potem rozlanie w górę i spływanie panelu w dół, naraz
const KRZYWA = "cubic-bezier(.3,.6,.3,1)";
const MIEKKO = "cubic-bezier(.2,.8,.3,1)";
const R_GORA = 20, R_STYK = 28, R_DOL = 24; // promienie wklęsłych rogów

let poza: Poza = "srodek";
let biegnie = false;
let naCzacie = false;

const el = (nazwa: string) => document.querySelector<HTMLElement>(`[data-ksztalt="${nazwa}"]`);
const px = (n: number) => `${n}px`;
const token = (nazwa: string) => getComputedStyle(document.documentElement).getPropertyValue(nazwa).trim();
const klatka = () => new Promise((r) => requestAnimationFrame(r));
const rosnie: Keyframe[] = [{ transform: "scale(0)" }, { transform: "none" }];
const wylew: Keyframe[] = [{ "--wylew": "0%" }, { "--wylew": "115%" }];

function geometria() {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const maly = vw <= 640;
  // Te same liczby co .wrap i .nav w TopNav.module.css.
  const top = maly ? 12 : 16, h = maly ? 56 : 64, bok = maly ? 16 : 24;
  const w = Math.min(1072, vw - 2 * bok);
  return { vw, vh, top, h, w, x: (vw - w) / 2, dol: top + h, panel: Math.min(420, vw - 48), historia: Math.min(320, vw - 48) };
}

// Promienie: lewy górny, prawy górny, prawy dolny, lewy dolny; dla prawej strony lustro.
const rogi = (s: Strona, lg: string, pg: string, pd: string, ld: string) => (s === "lewy" ? `${lg} ${pg} ${pd} ${ld}` : `${pg} ${lg} ${ld} ${pd}`);

// Klatki zawsze w kierunku „ze środka do boku”; powrót to ta sama oś puszczona od końca.
function klatki(s: Strona, g: G, szer: number) {
  const L = s === "lewy";
  const r = px(g.h / 2);
  const pasekX = L ? 0 : g.vw - g.w;
  const bokX = L ? 0 : g.vw - szer;
  const H = g.vh - g.dol;
  const pasek: (Ramka & Keyframe)[] = [
    { offset: 0, left: px(g.x), top: px(g.top), width: px(g.w), height: px(g.h), borderRadius: `${r} ${r} ${r} ${r}`, easing: "cubic-bezier(.5,0,.9,.5)" },
    // dociśnięty do boku: kształt bez zmian, tylko bok się prostuje; dalej ta sama krzywa co spływanie panelu
    { offset: DOCISK / (DOCISK + ROZLEW), left: px(pasekX), top: px(g.top), width: px(g.w), height: px(g.h), borderRadius: rogi(s, "6px", r, r, "6px"), easing: KRZYWA },
    // rozlany w górę do krawędzi ekranu
    { offset: 1, left: px(pasekX), top: "0px", width: px(g.w), height: px(g.dol), borderRadius: rogi(s, "0px", "0px", r, "0px") },
  ];
  const plaski = "0px 0px 0px 0px / 0px 0px 0px 0px";
  const bok: (Ramka & Keyframe)[] = [
    { offset: 0, left: px(bokX), top: px(g.dol), width: px(szer), height: "0px", borderRadius: plaski },
    // czoło spływającej cieczy: zaokrąglone, mocniej od strony treści
    { offset: 0.88, left: px(bokX), top: px(g.dol), width: px(szer), height: px(H * 0.88), borderRadius: `${rogi(s, "0px", "0px", "160px", "40px")} / ${rogi(s, "0px", "0px", "120px", "60px")}` },
    { offset: 1, left: px(bokX), top: px(g.dol), width: px(szer), height: px(H), borderRadius: plaski },
  ];
  // Wklęsły róg: kwadrat wypełniony poza okręgiem o środku w rogu (cx, cy).
  const wnek = (x: number, y: number, rr: number, cx: string, cy: string, origin: string, kolor = "var(--surface)") => ({
    left: px(x), top: px(y), width: px(rr), height: px(rr), transformOrigin: origin,
    background: `radial-gradient(circle at ${cx} ${cy}, transparent ${rr - 0.5}px, ${kolor} ${rr}px)`,
  });
  const wneki = (kolor?: string) => ({
    "w-gora": L ? wnek(g.w, 0, R_GORA, "100%", "100%", "0 0", kolor) : wnek(g.vw - g.w - R_GORA, 0, R_GORA, "0%", "100%", "100% 0", kolor),
    "w-styk": L ? wnek(szer, g.dol, R_STYK, "100%", "100%", "0 0", kolor) : wnek(g.vw - szer - R_STYK, g.dol, R_STYK, "0%", "100%", "100% 0", kolor),
    "w-dol": L ? wnek(szer, g.vh - R_DOL, R_DOL, "100%", "0%", "0 100%", kolor) : wnek(g.vw - szer - R_DOL, g.vh - R_DOL, R_DOL, "0%", "0%", "100% 100%", kolor),
  });
  return { pasek, bok, wneki };
}

function ramka(e: HTMLElement | null, r: Ramka) {
  if (e) Object.assign(e.style, { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: r.borderRadius });
}

// Stan końcowy pozy bez animacji. „przypiety” trzyma nav poza układem strony także na środku: na czas ruchu
// (wtedy „strona” mówi, przy którym boku czekają schowane rogi).
function ustawPoze(p: Poza, przypiety = false, strona: Strona = "prawy") {
  const g = geometria();
  const html = document.documentElement;
  const wrap = el("wrap"), nav = el("nav"), warstwa = el("warstwa"), scena = el("scena"), zaslona = el("zaslona");
  const root = document.getElementById("root");
  html.dataset.ksztalt = p;
  html.style.setProperty("--ksztalt-dol-paska", px(g.dol));
  html.style.setProperty("--ksztalt-szer-panelu", px(g.panel));
  html.style.setProperty("--ksztalt-szer-historii", px(g.historia));
  html.toggleAttribute("data-ksztalt-panel", p === "prawy");
  if (scena) scena.style.display = "none";
  const zaslonaWidoczna = p === "prawy" && g.vw < PANEL_OBOK_OD;
  zaslona?.toggleAttribute("data-widoczna", zaslonaWidoczna);
  if (zaslona) zaslona.style.opacity = zaslonaWidoczna ? "1" : "0";
  if (root) root.style.paddingRight = p === "prawy" && g.vw >= PANEL_OBOK_OD ? px(g.panel + 24) : "";
  if (!wrap || !nav || !warstwa) return;

  if (p === "srodek" && !przypiety) {
    delete nav.dataset.przyklejony;
    delete wrap.dataset.przyklejony;
    delete warstwa.dataset.widoczna;
    Object.assign(nav.style, { left: "", top: "", width: "", height: "", borderRadius: "" });
    wrap.style.minHeight = "";
    return;
  }
  // Wysokość miejsca po navie mierzymy, póki jeszcze jest w układzie strony.
  if (!("przyklejony" in wrap.dataset)) wrap.style.minHeight = px(wrap.offsetHeight);
  wrap.dataset.przyklejony = "";
  nav.dataset.przyklejony = "";
  warstwa.dataset.widoczna = "";
  const s: Strona = p === "pelny" ? "lewy" : p === "prawy" ? "prawy" : strona;
  const k = klatki(s, g, s === "lewy" ? g.historia : g.panel);
  const pasek = p === "srodek" ? k.pasek[0] : k.pasek[2];
  ramka(nav, pasek);
  ramka(el("tlo-pasek"), pasek);
  ramka(el("tlo-bok"), p === "srodek" ? k.bok[0] : k.bok[2]);
  for (const [nazwa, styl] of Object.entries(k.wneki())) {
    const w = el(nazwa);
    if (w) Object.assign(w.style, styl, { transform: p === "srodek" ? "scale(0)" : "none" });
  }
}

// Puszcza kroki naprzód albo od końca. fill: both trzyma ostatnią klatkę, dopóki wołający nie ustawi pozy i nie anuluje.
async function uruchom(kroki: Krok[], wstecz = false) {
  const calosc = Math.max(...kroki.map((k) => k.start + k.dur));
  const animacje = kroki.flatMap((k) => {
    if (!k.el) return [];
    const a = k.el.animate(k.kf, {
      duration: k.dur,
      delay: wstecz ? calosc - k.start - k.dur : k.start,
      direction: wstecz !== !!k.odwrotnie ? "reverse" : "normal",
      easing: k.easing ?? "linear",
      fill: "both",
    });
    if (wstecz) a.playbackRate = 1.35;
    return [a];
  });
  await Promise.all(animacje.map((a) => a.finished.catch(() => undefined)));
  return () => animacje.forEach((a) => a.cancel());
}

async function czekajNaKoniec() {
  while (biegnie) await new Promise((r) => setTimeout(r, 50));
}

async function czekajAz(warunek: () => boolean, klatek = 60) {
  for (let i = 0; i < klatek && !warunek(); i++) await klatka();
}

async function przebieg(kroki: Krok[], wstecz = false) {
  biegnie = true;
  try {
    const anuluj = await uruchom(kroki, wstecz);
    ustawPoze(poza);
    anuluj();
  } finally {
    biegnie = false;
  }
}

function krokiPanelu(g: G): Krok[] {
  const k = klatki("prawy", g, g.panel);
  const obok = g.vw >= PANEL_OBOK_OD;
  return [
    { el: el("nav"), kf: k.pasek, start: 0, dur: DOCISK + ROZLEW },
    { el: el("tlo-pasek"), kf: k.pasek, start: 0, dur: DOCISK + ROZLEW },
    { el: el("tlo-bok"), kf: k.bok, start: DOCISK, dur: ROZLEW, easing: KRZYWA },
    { el: el("w-gora"), kf: rosnie, start: DOCISK, dur: 480, easing: MIEKKO },
    { el: el("w-styk"), kf: rosnie, start: DOCISK, dur: 480, easing: MIEKKO },
    { el: el("w-dol"), kf: rosnie, start: DOCISK + ROZLEW * 0.62, dur: 380, easing: MIEKKO },
    { el: document.getElementById("root"), kf: [{ paddingRight: "0px" }, { paddingRight: obok ? px(g.panel + 24) : "0px" }], start: DOCISK + 100, dur: 850, easing: "cubic-bezier(.2,0,0,1)" },
    { el: el("zaslona"), kf: [{ opacity: 0 }, { opacity: obok ? 0 : 1 }], start: DOCISK - 100, dur: 700 },
    { el: el("panel"), kf: wylew, start: DOCISK + 60, dur: 1100, easing: "cubic-bezier(.35,.5,.3,1)" },
  ];
}

/** Panel Pestki: nav dociska się do prawego boku i wylewa panel. */
export async function otworzPanel() {
  await czekajNaKoniec();
  if (poza !== "srodek") return;
  poza = "prawy";
  ustawPoze("prawy");
  if (!mniejRuchu()) await przebieg(krokiPanelu(geometria()));
}

/** Panel wsiąka z powrotem w nav, a nav wraca na środek. */
export async function zamknijPanel() {
  await czekajNaKoniec();
  if (poza !== "prawy") return;
  poza = "srodek";
  const kroki = krokiPanelu(geometria());
  ustawPoze("srodek", true);
  document.documentElement.setAttribute("data-ksztalt-panel", "");
  if (mniejRuchu()) ustawPoze("srodek");
  else await przebieg(kroki, true);
}

/** Z panelu na pełny ekran: panel rozlewa się na całą stronę, nav przelewa się na lewo, potem przejście i z nava wylewa się historia. */
export async function doPelnego(nawiguj: () => void) {
  await czekajNaKoniec();
  const g = geometria();
  if (poza !== "prawy" || g.vw < PELNY_OD || mniejRuchu()) {
    poza = g.vw >= PELNY_OD ? "pelny" : "srodek";
    nawiguj();
    ustawPoze(poza);
    return;
  }
  poza = "pelny";
  biegnie = true;
  try {
    const kP = klatki("prawy", g, g.panel), kL = klatki("lewy", g, g.historia);
    const scena = el("scena"), html = document.documentElement;
    const bokP = kP.bok[2];
    const scenaOd = { left: bokP.left, top: bokP.top, width: bokP.width, height: bokP.height, backgroundColor: token("--surface") };
    const scenaDo = { left: "0px", top: "0px", width: px(g.vw), height: px(g.vh), backgroundColor: token("--bg") };
    // Faza A, jeszcze na starej stronie. Tło panelu chowa się pod scenę (ta sama ramka i kolor), czeka na lewym boku.
    ustawPoze("pelny");
    html.setAttribute("data-ksztalt-panel", "");
    ramka(el("tlo-bok"), kL.bok[0]);
    for (const n of ["w-styk", "w-dol"]) el(n)?.style.setProperty("transform", "scale(0)");
    if (scena) Object.assign(scena.style, scenaDo, { display: "block" });
    const kolor = token("--surface");
    const przenies = (n: "w-gora" | "w-styk" | "w-dol", wraca: boolean): Keyframe[] => {
      const a = kP.wneki(kolor)[n], b = kL.wneki(kolor)[n];
      return wraca
        ? [{ ...a, transform: "none" }, { ...a, transform: "scale(0)", offset: 0.2 }, { ...b, transform: "scale(0)", offset: 0.8 }, { ...b, transform: "none" }]
        : [{ ...a, transform: "none" }, { ...a, transform: "scale(0)" }];
    };
    const navP = kP.pasek[2], navL = kL.pasek[2];
    const korzen = document.getElementById("root");
    const anulujA = await uruchom([
      { el: scena, kf: [scenaOd, scenaDo], start: 0, dur: 950, easing: KRZYWA },
      { el: el("panel"), kf: [{ opacity: 1 }, { opacity: 0 }], start: 0, dur: 250 },
      { el: el("nav"), kf: [navP, navL], start: 300, dur: 950, easing: "cubic-bezier(.45,0,.2,1)" },
      { el: el("tlo-pasek"), kf: [navP, navL], start: 300, dur: 950, easing: "cubic-bezier(.45,0,.2,1)" },
      { el: el("w-gora"), kf: przenies("w-gora", true), start: 0, dur: 1250 },
      { el: el("w-styk"), kf: przenies("w-styk", false), start: 0, dur: 200 },
      { el: el("w-dol"), kf: przenies("w-dol", false), start: 0, dur: 200 },
      { el: korzen, kf: [{ paddingRight: korzen?.style.paddingRight || "0px" }, { paddingRight: "0px" }], start: 0, dur: 800, easing: "cubic-bezier(.2,0,0,1)" },
      { el: el("zaslona"), kf: [{ opacity: g.vw < PANEL_OBOK_OD ? 1 : 0 }, { opacity: 0 }], start: 0, dur: 400 },
    ]);
    html.removeAttribute("data-ksztalt-panel");
    anulujA();

    nawiguj();
    await czekajAz(() => !!el("historia"));
    // Faza B, już na stronie rozmowy: scena ma kolor jej tła, więc znika bez śladu, a z nava spływa historia.
    if (scena) scena.style.display = "none";
    ustawPoze("pelny");
    const anulujB = await uruchom([
      { el: el("tlo-bok"), kf: kL.bok, start: 0, dur: ROZLEW, easing: KRZYWA },
      { el: el("w-styk"), kf: rosnie, start: 0, dur: 480, easing: MIEKKO },
      { el: el("w-dol"), kf: rosnie, start: ROZLEW * 0.62, dur: 380, easing: MIEKKO },
      { el: el("historia"), kf: wylew, start: 60, dur: 1000, easing: "cubic-bezier(.35,.5,.3,1)" },
      { el: el("czat"), kf: [{ opacity: 0 }, { opacity: 1 }], start: 0, dur: 400 },
    ]);
    ustawPoze(poza);
    anulujB();
  } finally {
    biegnie = false;
  }
}

/** Zamknięcie pełnego ekranu prosto do zamkniętego: historia wsiąka w nav, rozmowa kurczy się w nav, nav wraca na środek. */
export async function zamknijPelny(nawiguj: () => void) {
  await czekajNaKoniec();
  if (poza !== "pelny" || mniejRuchu()) {
    if (poza === "pelny") poza = "srodek";
    nawiguj();
    ustawPoze(poza);
    return;
  }
  poza = "srodek";
  biegnie = true;
  try {
    const g = geometria(), kL = klatki("lewy", g, g.historia);
    const anuluj = await uruchom([
      { el: el("tlo-bok"), kf: kL.bok, start: 0, dur: 700, easing: KRZYWA, odwrotnie: true },
      { el: el("w-styk"), kf: rosnie, start: 0, dur: 250, odwrotnie: true },
      { el: el("w-dol"), kf: rosnie, start: 0, dur: 200, odwrotnie: true },
      { el: el("historia"), kf: wylew, start: 0, dur: 600, odwrotnie: true },
      { el: el("czat"), kf: [{ opacity: 1 }, { opacity: 0 }], start: 0, dur: 350 },
    ]);
    ramka(el("tlo-bok"), kL.bok[0]);
    for (const n of ["w-styk", "w-dol"]) el(n)?.style.setProperty("transform", "scale(0)");
    const scena = el("scena");
    if (scena) Object.assign(scena.style, { left: "0px", top: "0px", width: px(g.vw), height: px(g.vh), borderRadius: "0px", opacity: "1", display: "block" });
    anuluj();
    nawiguj();
    await czekajAz(() => !naCzacie);
    await powrot();
  } finally {
    biegnie = false;
  }
}

// Ze strony rozmowy na inną: scena w kolorze tła wsiąka w nav, a nav odkleja się od krawędzi i wraca na środek.
async function powrot() {
  const g = geometria(), kL = klatki("lewy", g, g.historia);
  const naStronie = { left: "0px", top: "0px", width: px(g.vw), height: px(g.vh), borderRadius: "0px", backgroundColor: token("--bg"), opacity: 1 };
  const wNavie = { left: "0px", top: px(g.top), width: px(g.w), height: px(g.h), borderRadius: px(g.h / 2), backgroundColor: token("--surface") };
  ustawPoze("srodek", true, "lewy");
  const scena = el("scena");
  if (scena) Object.assign(scena.style, { display: "block", opacity: "0" });
  biegnie = true;
  try {
    const anuluj = await uruchom([
      { el: scena, kf: [naStronie, { ...wNavie, opacity: 1, offset: 0.94 }, { ...wNavie, opacity: 0 }], start: 0, dur: 950, easing: KRZYWA },
      { el: el("nav"), kf: kL.pasek, start: 500, dur: DOCISK + ROZLEW, odwrotnie: true },
      { el: el("tlo-pasek"), kf: kL.pasek, start: 500, dur: DOCISK + ROZLEW, odwrotnie: true },
      { el: el("w-gora"), kf: rosnie, start: 0, dur: 300, odwrotnie: true },
    ]);
    ustawPoze("srodek");
    if (scena) scena.style.opacity = "";
    anuluj();
  } finally {
    biegnie = false;
  }
}

// Wejście na stronę rozmowy inaczej niż z panelu (menu, adres): nav dociska się do lewego boku i wylewa historię.
async function wejscie() {
  const g = geometria(), kL = klatki("lewy", g, g.historia);
  ustawPoze("pelny");
  await przebieg([
    { el: el("nav"), kf: kL.pasek, start: 0, dur: DOCISK + ROZLEW },
    { el: el("tlo-pasek"), kf: kL.pasek, start: 0, dur: DOCISK + ROZLEW },
    { el: el("tlo-bok"), kf: kL.bok, start: DOCISK, dur: ROZLEW, easing: KRZYWA },
    { el: el("w-gora"), kf: rosnie, start: DOCISK, dur: 480, easing: MIEKKO },
    { el: el("w-styk"), kf: rosnie, start: DOCISK, dur: 480, easing: MIEKKO },
    { el: el("w-dol"), kf: rosnie, start: DOCISK + ROZLEW * 0.62, dur: 380, easing: MIEKKO },
    { el: el("historia"), kf: wylew, start: DOCISK + 60, dur: 1000, easing: "cubic-bezier(.35,.5,.3,1)" },
    { el: el("czat"), kf: [{ opacity: 0 }, { opacity: 1 }], start: DOCISK, dur: 500 },
  ]);
}

/** Po każdej zmianie adresu (przed malowaniem): poza dopasowuje się do strony, jeśli nie zrobiło tego przejście. */
export function poZmianieAdresu(czat: boolean, pierwszy: boolean) {
  naCzacie = czat;
  if (biegnie) return;
  const szeroki = geometria().vw >= PELNY_OD;
  const cel: Poza = czat && szeroki ? "pelny" : poza === "pelny" || (czat && poza === "prawy") ? "srodek" : poza;
  if (cel === poza && !pierwszy) return;
  const bylo = poza;
  poza = cel;
  if (pierwszy || mniejRuchu() || bylo === "prawy") ustawPoze(cel);
  else if (cel === "pelny") void wejscie();
  else if (bylo === "pelny") void powrot();
  else ustawPoze(cel);
}

/** Zmiana rozmiaru okna: bez animacji, z przejściem między układem z kolumną historii i bez niej. */
export function poZmianieRozmiaru() {
  if (biegnie) return;
  const szeroki = geometria().vw >= PELNY_OD;
  if (poza === "pelny" && !szeroki) poza = "srodek";
  else if (naCzacie && szeroki && poza === "srodek") poza = "pelny";
  ustawPoze(poza);
}
