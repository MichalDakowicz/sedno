// Panel Pestki z prawej strony: wjeżdża z krawędzi ekranu i wyjeżdża z powrotem. Na szerokim ekranie strona
// od razu robi mu miejsce (bez animowania), na węższym panel ją przykrywa, a pod nim jest zasłona.
// Elementy znajdujemy po data-ksztalt, bo należą do różnych komponentów (TopNav, TutorDock, Ksztalt).
import { mniejRuchu } from "../ruch";

type Poza = "srodek" | "prawy";

/** Od tej szerokości panel Pestki rozsuwa stronę; węższy ją przykrywa (z zasłoną). */
export const PANEL_OBOK_OD = 1100;

const WJAZD = 280;
const WYJAZD = 220;
const KRZYWA = "cubic-bezier(.2,0,0,1)";
const PANEL_WOLNE = 32; // prawy margines panelu + odstęp od treści

let poza: Poza = "srodek";
let biegnie = false;

const el = (nazwa: string) => document.querySelector<HTMLElement>(`[data-ksztalt="${nazwa}"]`);
const px = (n: number) => `${n}px`;

function geometria() {
  const vw = document.documentElement.clientWidth;
  const top = vw <= 640 ? 12 : 16, h = vw <= 640 ? 56 : 64; // te same liczby co .wrap i .nav w TopNav.module.css
  return { vw, dol: top + h, panel: Math.min(420, vw - 32) };
}

// Stan końcowy pozy bez animacji.
function ustawPoze(p: Poza) {
  const g = geometria();
  const html = document.documentElement;
  const zaslona = el("zaslona");
  const root = document.getElementById("root");
  html.dataset.ksztalt = p;
  html.style.setProperty("--ksztalt-dol-paska", px(g.dol));
  html.style.setProperty("--ksztalt-szer-panelu", px(g.panel));
  html.toggleAttribute("data-ksztalt-panel", p === "prawy");
  const zaslonaWidoczna = p === "prawy" && g.vw < PANEL_OBOK_OD;
  zaslona?.toggleAttribute("data-widoczna", zaslonaWidoczna);
  if (zaslona) zaslona.style.opacity = zaslonaWidoczna ? "1" : "0";
  if (root) root.style.paddingRight = p === "prawy" && g.vw >= PANEL_OBOK_OD ? px(g.panel + PANEL_WOLNE) : "";
}

async function czekajNaKoniec() {
  while (biegnie) await new Promise((r) => setTimeout(r, 50));
}

// zostaw: ostatnia klatka trzyma się do zmiany strony, żeby panel nie mignął z powrotem.
async function jedz(klatki: Keyframe[], czas: number, zostaw = false) {
  const panel = el("panel");
  if (!panel || mniejRuchu()) return;
  biegnie = true;
  try {
    const a = panel.animate(klatki, { duration: czas, easing: KRZYWA, fill: "both" });
    await a.finished.catch(() => undefined);
    if (!zostaw) a.cancel();
  } finally {
    biegnie = false;
  }
}

const zaEkranem: Keyframe = { transform: "translateX(calc(100% + 32px))" };

/** Panel Pestki wjeżdża z prawej krawędzi. */
export async function otworzPanel() {
  await czekajNaKoniec();
  if (poza !== "srodek") return;
  poza = "prawy";
  ustawPoze("prawy");
  await jedz([zaEkranem, { transform: "none" }], WJAZD);
}

/** Panel wyjeżdża za prawą krawędź, strona wraca do pełnej szerokości. */
export async function zamknijPanel() {
  await czekajNaKoniec();
  if (poza !== "prawy") return;
  poza = "srodek";
  ustawPoze("srodek");
  document.documentElement.setAttribute("data-ksztalt-panel", "");
  await jedz([{ transform: "none" }, zaEkranem], WYJAZD);
  document.documentElement.removeAttribute("data-ksztalt-panel");
}

/** Z panelu na pełny ekran rozmowy: panel gaśnie, potem przejście na stronę rozmowy. */
export async function doPelnego(nawiguj: () => void) {
  await czekajNaKoniec();
  if (poza === "prawy") await jedz([{ opacity: 1 }, { opacity: 0 }], WYJAZD, true);
  poza = "srodek";
  nawiguj();
  ustawPoze("srodek");
}

/** Wyjście z pełnego ekranu rozmowy. */
export function zamknijPelny(nawiguj: () => void) {
  nawiguj();
}

/** Po zmianie adresu (przed malowaniem): strona rozmowy ma własny układ, więc panel obok niej nie ma sensu. */
export function poZmianieAdresu(czat: boolean) {
  if (czat) poza = "srodek";
  ustawPoze(poza);
}

/** Zmiana rozmiaru okna: miejsce na panel i zasłona dopasowują się bez animacji. */
export function poZmianieRozmiaru() {
  if (biegnie) return;
  ustawPoze(poza);
}
