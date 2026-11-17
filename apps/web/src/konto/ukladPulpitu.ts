// Układ pulpitu: które widgety są włączone i w jakiej kolejności, osobno dla „Wszystkie” i każdego przedmiotu
// (profiles.dashboard). Kopia w localStorage działa od razu, konto wygrywa po zalogowaniu, a znacznik „niezapisane”
// chroni świeżą zmianę przed starą wartością z konta (jak w konto/ustawienia.ts i konto/profilUcznia.ts).
import { useMemo, useSyncExternalStore } from "react";
import { supabase } from "../supabase";
import { WIDGETY } from "../views/pulpit/widgety";
import { PRZEDMIOTY } from "./przedmioty";

export const WSZYSTKIE = "wszystkie";

export type GotowyUklad = "nauka" | "egzamin";
export type Uklad = GotowyUklad | "wlasny";
export type Pozycja = { id: string; wl: boolean };

/** Co leży na koncie: nazwa gotowego układu (nowe widgety dochodzą wtedy same) albo własna lista. */
type Zapis = Partial<Record<string, "egzamin" | Pozycja[]>>;

/** Widgety do ułożenia, w domyślnej kolejności. Stałe („Dziś warto”) są zawsze na górze i nie należą do listy. */
const RUCHOME = WIDGETY.filter((w) => !w.staly);

const MAX_POZYCJI = 20;
const KLUCZE = new Set<string>([WSZYSTKIE, ...PRZEDMIOTY.map((p) => p.id)]);

export function gotowy(nazwa: GotowyUklad): Pozycja[] {
  return RUCHOME.map((w) => ({ id: w.id, wl: w[nazwa] }));
}

/** Wyrzuca nieznane i powtórzone widgety, a brakujące (dodane w nowszej wersji) wstawia na ich domyślne miejsce. */
function uzupelnij(lista: Pozycja[]): Pozycja[] {
  const wynik: Pozycja[] = [];
  for (const p of lista) if (RUCHOME.some((w) => w.id === p.id) && !wynik.some((x) => x.id === p.id)) wynik.push(p);
  RUCHOME.forEach((w, i) => {
    if (wynik.some((x) => x.id === w.id)) return;
    // Przed pierwszym widgetem, który w rejestrze jest po nim; jeśli takiego nie ma, na końcu.
    const nastepny = wynik.findIndex((x) => RUCHOME.findIndex((r) => r.id === x.id) > i);
    wynik.splice(nastepny === -1 ? wynik.length : nastepny, 0, { id: w.id, wl: w.nauka });
  });
  return wynik;
}

const rowne = (a: Pozycja[], b: Pozycja[]) => a.length === b.length && a.every((p, i) => p.id === b[i]!.id && p.wl === b[i]!.wl);

/** Nazwa układu, który odpowiada liście; każda inna lista to „własny”. */
export function nazwaUkladu(lista: Pozycja[]): Uklad {
  if (rowne(lista, gotowy("nauka"))) return "nauka";
  if (rowne(lista, gotowy("egzamin"))) return "egzamin";
  return "wlasny";
}

function rozwin(z: Zapis[string]): Pozycja[] {
  if (z === "egzamin") return gotowy("egzamin");
  return z ? uzupelnij(z) : gotowy("nauka");
}

/** Przyjmuje tylko znane klucze, widgety i kształty (dane z konta albo z dysku mogą być stare lub uszkodzone). */
function poprawne(v: unknown): Zapis {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const wynik: Zapis = {};
  for (const [klucz, w] of Object.entries(v)) {
    if (!KLUCZE.has(klucz)) continue;
    if (w === "egzamin") {
      wynik[klucz] = w;
    } else if (Array.isArray(w)) {
      const lista = w
        .filter((p): p is Pozycja => !!p && typeof p.id === "string" && typeof p.wl === "boolean" && RUCHOME.some((r) => r.id === p.id))
        .slice(0, MAX_POZYCJI)
        .map((p) => ({ id: p.id, wl: p.wl }));
      if (lista.length) wynik[klucz] = lista;
    }
  }
  return wynik;
}

const KLUCZ = "sedno.ukladPulpitu";
const NIEZAPISANE = "sedno.ukladPulpitu.niezapisane";

function wczytajLokalne(): Zapis {
  try {
    const t = localStorage.getItem(KLUCZ);
    if (t) return poprawne(JSON.parse(t));
  } catch {
    // zablokowany storage albo uszkodzony zapis: układy domyślne
  }
  return {};
}

function zapiszLokalne(z: Zapis) {
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(z));
  } catch {
    // zostaje wartość w pamięci
  }
}

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
    // brak storage
  }
}

let biezace: Zapis = {};
const sluchacze = new Set<() => void>();
const ustawBiezace = (z: Zapis) => {
  biezace = z;
  sluchacze.forEach((l) => l());
};

/** Układ (lista widgetów w kolejności) wskazanego przedmiotu albo „wszystkie”; zmienia się razem z zapisem. */
export function useUklad(klucz: string): Pozycja[] {
  const z = useSyncExternalStore(
    (l) => {
      sluchacze.add(l);
      return () => void sluchacze.delete(l);
    },
    () => biezace,
  );
  return useMemo(() => rozwin(z[klucz]), [z, klucz]);
}

let wersja = 0;
let idKonta: string | null = null;
let kolejka: number | undefined;

async function zapiszNaKoncie(z: Zapis, id: string) {
  const ta = wersja;
  const { error } = await supabase.from("profiles").update({ dashboard: z }).eq("id", id);
  if (!error && ta === wersja) oznaczNiezapisane(false);
}

function zapisz(z: Zapis) {
  zapiszLokalne(z);
  wersja++;
  oznaczNiezapisane(true);
  ustawBiezace(z);
  const id = idKonta;
  if (!id) return;
  window.clearTimeout(kolejka);
  kolejka = window.setTimeout(() => {
    kolejka = undefined;
    void zapiszNaKoncie(biezace, id);
  }, 500);
}

/** Ustawia układ jednego przedmiotu. Lista równa gotowemu układowi zapisuje się jako jego nazwa, a „Nauka” wcale. */
function ustaw(klucz: string, lista: Pozycja[]) {
  if (!KLUCZE.has(klucz)) return;
  const nowe: Zapis = { ...biezace };
  const nazwa = nazwaUkladu(lista);
  if (nazwa === "nauka") delete nowe[klucz];
  else nowe[klucz] = nazwa === "egzamin" ? "egzamin" : lista;
  zapisz(nowe);
}

const biezacy = (klucz: string) => rozwin(biezace[klucz]);

/** Wybór gotowego układu ustawia listę od nowa. */
export const ustawGotowy = (klucz: string, nazwa: GotowyUklad) => ustaw(klucz, gotowy(nazwa));

/** „Przywróć domyślny”: układ „Nauka”. */
export const przywrocUklad = (klucz: string) => ustawGotowy(klucz, "nauka");

export function przelaczWidget(klucz: string, id: string) {
  ustaw(klucz, biezacy(klucz).map((p) => (p.id === id ? { ...p, wl: !p.wl } : p)));
}

/** Przesuwa widget na miejsce o danym indeksie na liście ruchomych widgetów (bez stałych). */
export function przesunWidget(klucz: string, id: string, doIndeksu: number) {
  const lista = biezacy(klucz);
  const z = lista.findIndex((p) => p.id === id);
  const na = Math.max(0, Math.min(lista.length - 1, doIndeksu));
  if (z === -1 || z === na) return;
  const nowa = [...lista];
  const [p] = nowa.splice(z, 1);
  nowa.splice(na, 0, p!);
  ustaw(klucz, nowa);
}

function wyslijOczekujace() {
  if (kolejka === undefined || !idKonta) return;
  window.clearTimeout(kolejka);
  kolejka = undefined;
  void zapiszNaKoncie(biezace, idKonta);
}

// Konto pobieramy tylko przy pierwszej sesji, zmianie użytkownika i po powrocie na kartę (nie częściej niż co minutę),
// a nie przy każdym zdarzeniu logowania, które Supabase wysyła wielokrotnie.
const ODSWIEZ_CO = 60_000;
let pobranyDla: string | null = null;
let pobranoOd = 0;

async function zKonta(id: string) {
  idKonta = id;
  pobranyDla = id;
  pobranoOd = Date.now();
  const ta = wersja;
  const { data, error } = await supabase.from("profiles").select("dashboard").eq("id", id).maybeSingle();
  if (idKonta !== id) return;
  if (error) {
    pobranyDla = null;
    return;
  }
  // Zmiana w trakcie pobierania: odpowiedź mogła być sprzed niej, więc wygrywa lokalna.
  if (wersja !== ta) {
    void zapiszNaKoncie(biezace, id);
    return;
  }
  const zapisane = poprawne(data?.dashboard);
  if (niezapisane() || Object.keys(zapisane).length === 0) {
    if (niezapisane() || Object.keys(biezace).length > 0) void zapiszNaKoncie(biezace, id);
    return;
  }
  zapiszLokalne(zapisane);
  ustawBiezace(zapisane);
}

let uruchomione = false;

/** Wołane raz przy starcie aplikacji: pulpit ma od razu zapisany lokalnie układ, zanim odpowie sieć. */
export function uruchomUkladPulpitu() {
  if (uruchomione) return;
  uruchomione = true;
  ustawBiezace(wczytajLokalne());
  window.addEventListener("pagehide", wyslijOczekujace);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") wyslijOczekujace();
    else if (idKonta && Date.now() - pobranoOd > ODSWIEZ_CO) void zKonta(idKonta);
  });
  supabase.auth.onAuthStateChange((zdarzenie, sesja) => {
    if (sesja) {
      // Poza callbackiem: zapytania do Supabase w środku onAuthStateChange mogą się zakleszczyć.
      const id = sesja.user.id;
      idKonta = id;
      if (pobranyDla !== id) window.setTimeout(() => void zKonta(id), 0);
    } else if (zdarzenie === "SIGNED_OUT") {
      idKonta = null;
      pobranyDla = null;
      window.clearTimeout(kolejka);
      kolejka = undefined;
      oznaczNiezapisane(false);
      try {
        localStorage.removeItem(KLUCZ);
      } catch {
        // nic do sprzątania
      }
      ustawBiezace({});
    }
  });
}
