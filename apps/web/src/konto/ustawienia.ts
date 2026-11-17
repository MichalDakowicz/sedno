// Ustawienia aplikacji: wygląd, dostępność i zachowanie Pestki. Kopia w localStorage działa od razu i bez sieci,
// wartość z konta (profiles.settings) wygrywa po zalogowaniu. Zmiana stosuje się od razu, bez przycisku „Zapisz”.
import { useSyncExternalStore } from "react";
import { supabase } from "../supabase";

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

function wczytajLokalne(): Ustawienia {
  try {
    const t = localStorage.getItem(KLUCZ);
    if (t) return { ...DOMYSLNE, ...poprawne(JSON.parse(t)) };
  } catch {
    // zablokowany storage albo uszkodzony zapis: zostają domyślne
  }
  return DOMYSLNE;
}

function zapiszLokalne(u: Ustawienia) {
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(roznice(u)));
  } catch {
    // zostaje wartość w pamięci
  }
}

let biezace: Ustawienia = DOMYSLNE;
const sluchacze = new Set<() => void>();

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

function ustawBiezace(u: Ustawienia) {
  biezace = u;
  zastosuj(u);
  sluchacze.forEach((l) => l());
}

export const ustawienia = () => biezace;

export function useUstawienia(): Ustawienia {
  return useSyncExternalStore(
    (l) => {
      sluchacze.add(l);
      return () => void sluchacze.delete(l);
    },
    ustawienia,
  );
}

// Znacznik zmiany, której konto jeszcze nie widziało: bez niego szybkie odświeżenie po kliknięciu
// nadpisałoby świeżą zmianę starą wartością z konta.
const NIEZAPISANE = "sedno.ustawienia.niezapisane";
const niezapisane = () => {
  try {
    return localStorage.getItem(NIEZAPISANE) === "1";
  } catch {
    return false;
  }
};
function oznaczNiezapisane(tak: boolean) {
  try {
    if (tak) localStorage.setItem(NIEZAPISANE, "1");
    else localStorage.removeItem(NIEZAPISANE);
  } catch {
    // brak storage: zostaje tylko zapis na konto
  }
}

let wersja = 0;

async function zapiszNaKoncie(u: Ustawienia, id: string) {
  const ta = wersja;
  const { error } = await supabase.from("profiles").update({ settings: roznice(u) }).eq("id", id);
  if (!error && ta === wersja) oznaczNiezapisane(false);
}

let idKonta: string | null = null;
let kolejka: number | undefined;

/** Zmienia ustawienia: od razu na ekranie i w kopii lokalnej, na koncie po krótkiej chwili (szybkie klikanie to jeden zapis). */
export function zmienUstawienia(zmiana: Partial<Ustawienia>) {
  const nowe = { ...biezace, ...zmiana };
  zapiszLokalne(nowe);
  wersja++;
  oznaczNiezapisane(true);
  ustawBiezace(nowe);
  const id = idKonta;
  if (!id) return;
  window.clearTimeout(kolejka);
  kolejka = window.setTimeout(() => {
    kolejka = undefined;
    void zapiszNaKoncie(biezace, id);
  }, 500);
}

// Zamknięcie lub ukrycie karty w trakcie oczekiwania: wysyłamy od razu (najlepsze, co się da; resztę dokończy zKonta).
function wyslijOczekujace() {
  if (kolejka === undefined || !idKonta) return;
  window.clearTimeout(kolejka);
  kolejka = undefined;
  void zapiszNaKoncie(biezace, idKonta);
}

// Po zalogowaniu wartość z konta wygrywa. Konto bez zapisanych ustawień dostaje te z tego urządzenia.
async function zKonta(id: string) {
  idKonta = id;
  const { data, error } = await supabase.from("profiles").select("settings").eq("id", id).maybeSingle();
  if (error || idKonta !== id) return;
  const zapisane = poprawne(data?.settings);
  if (niezapisane() || Object.keys(zapisane).length === 0) {
    if (niezapisane() || Object.keys(roznice(biezace)).length > 0) void zapiszNaKoncie(biezace, id);
    return;
  }
  const nowe = { ...DOMYSLNE, ...zapisane };
  zapiszLokalne(nowe);
  ustawBiezace(nowe);
}

let uruchomione = false;

/** Wołane raz przy starcie aplikacji: stosuje zapisane lokalnie ustawienia, zanim odpowie sieć. */
export function uruchomUstawienia() {
  if (uruchomione) return;
  uruchomione = true;
  ustawBiezace(wczytajLokalne());

  // „Jak system” dla kontrastu zmienia się razem z systemem.
  window.matchMedia("(prefers-contrast: more)").addEventListener("change", () => zastosuj(biezace));

  window.addEventListener("pagehide", wyslijOczekujace);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") wyslijOczekujace();
  });

  supabase.auth.onAuthStateChange((zdarzenie, sesja) => {
    if (sesja) {
      // Wywołanie poza callbackiem: zapytania do Supabase w środku onAuthStateChange mogą się zakleszczyć.
      window.setTimeout(() => void zKonta(sesja.user.id), 0);
    } else if (zdarzenie === "SIGNED_OUT") {
      // Następna osoba na tym komputerze zaczyna od domyślnych, jak z rozmowami i postępem.
      idKonta = null;
      window.clearTimeout(kolejka);
      kolejka = undefined;
      oznaczNiezapisane(false);
      try {
        localStorage.removeItem(KLUCZ);
      } catch {
        // nic do sprzątania
      }
      ustawBiezace(DOMYSLNE);
    }
  });
}
