// Ustawienia aplikacji: wygląd, dostępność i zachowanie Pestki. Kopia w localStorage działa od razu i bez sieci,
// wartość z konta (profiles.settings) wygrywa po zalogowaniu. Zmiana stosuje się od razu, bez przycisku „Zapisz”.
import { utworzMagazyn } from "./kontoSync";

export type Motyw = "system" | "jasny" | "ciemny";
export type Tekst = "maly" | "normalny" | "duzy";

export type Ustawienia = {
  motyw: Motyw;
  tekst: Tekst;
  /** null: tak jak w systemie. */
  mniejRuchu: boolean | null;
  /** null: tak jak w systemie. */
  kontrast: boolean | null;
  pestkaSama: boolean;
  pestkaKrotko: boolean;
};

export const DOMYSLNE: Ustawienia = {
  motyw: "system",
  tekst: "normalny",
  mniejRuchu: null,
  kontrast: null,
  pestkaSama: true,
  pestkaKrotko: true,
};

export const SKALA_TEKSTU: Record<Tekst, number> = { maly: 0.9, normalny: 1, duzy: 1.15 };

const KLUCZ = "sedno.ustawienia";

const MOTYWY: Motyw[] = ["system", "jasny", "ciemny"];
const TEKSTY: Tekst[] = ["maly", "normalny", "duzy"];

/** Przyjmuje tylko znane klucze i wartości; reszta zostaje domyślna (dane z konta albo z dysku mogą być stare). */
function poprawne(v: unknown): Partial<Ustawienia> {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const wynik: Partial<Ustawienia> = {};
  if (MOTYWY.includes(o.motyw as Motyw)) wynik.motyw = o.motyw as Motyw;
  if (TEKSTY.includes(o.tekst as Tekst)) wynik.tekst = o.tekst as Tekst;
  if (typeof o.mniejRuchu === "boolean") wynik.mniejRuchu = o.mniejRuchu;
  if (typeof o.kontrast === "boolean") wynik.kontrast = o.kontrast;
  if (typeof o.pestkaSama === "boolean") wynik.pestkaSama = o.pestkaSama;
  if (typeof o.pestkaKrotko === "boolean") wynik.pestkaKrotko = o.pestkaKrotko;
  return wynik;
}

// Do konta idą tylko ustawienia różne od domyślnych, więc nowe domyślne dochodzą bez migracji danych.
function roznice(u: Ustawienia): Partial<Ustawienia> {
  const w: Partial<Ustawienia> = {};
  for (const k of Object.keys(DOMYSLNE) as (keyof Ustawienia)[]) if (u[k] !== DOMYSLNE[k]) (w as Record<string, unknown>)[k] = u[k];
  return w;
}

/** Wartości wynikające z systemu, gdy uczeń nie wybrał własnych. */
const systemowy = (zapytanie: string) => window.matchMedia(zapytanie).matches;
export const ruchWSystemie = () => systemowy("(prefers-reduced-motion: reduce)");
export const kontrastWSystemie = () => systemowy("(prefers-contrast: more)");

/** Ustawia atrybuty i zmienne na <html>; CSS (tokens.css, global.css) robi resztę. */
export function zastosuj(u: Ustawienia) {
  const el = document.documentElement;
  if (u.motyw === "system") delete el.dataset.motyw;
  else el.dataset.motyw = u.motyw;
  el.style.setProperty("--skala-tekstu", String(SKALA_TEKSTU[u.tekst]));
  if (u.mniejRuchu === null) delete el.dataset.mniejRuchu;
  else el.dataset.mniejRuchu = u.mniejRuchu ? "tak" : "nie";
  if (u.kontrast ?? kontrastWSystemie()) el.dataset.kontrast = "wysoki";
  else delete el.dataset.kontrast;
}

const magazyn = utworzMagazyn<Ustawienia>({
  klucz: KLUCZ,
  kolumna: "settings",
  domyslne: DOMYSLNE,
  zWire: (raw) => ({ ...DOMYSLNE, ...poprawne(raw) }),
  doWire: roznice,
  naZmiane: zastosuj,
  // Motyw i rozmiar tekstu zostają na ekranie logowania.
  poWylogowaniu: (u) => ({ ...DOMYSLNE, motyw: u.motyw, tekst: u.tekst }),
});

export const ustawienia = () => magazyn.biezace();

export const useUstawienia = (): Ustawienia => magazyn.useStan();

/** true, gdy ostatni zapis ustawień na konto się nie udał. */
export const useBladUstawien = () => magazyn.useBlad();

/** Zmienia ustawienia: od razu na ekranie i lokalnie, na koncie po krótkiej chwili (szybkie klikanie to jeden zapis). */
export const zmienUstawienia = (zmiana: Partial<Ustawienia>) => magazyn.zmien((u) => ({ ...u, ...zmiana }));

/** Wysyła zaległe zmiany na konto, np. przed wylogowaniem. */
export const splukajUstawienia = () => magazyn.flush();

/** Wołane raz przy starcie aplikacji: stosuje zapisane lokalnie ustawienia, zanim odpowie sieć. */
export function uruchomUstawienia() {
  magazyn.uruchom();
  // „Jak system” dla kontrastu zmienia się razem z systemem.
  window.matchMedia("(prefers-contrast: more)").addEventListener("change", () => zastosuj(magazyn.biezace()));
}
