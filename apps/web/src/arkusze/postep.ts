// Postęp w arkuszu: pamięć przeglądarki jako szybka kopia, konto w Supabase jako źródło prawdy.
// Bez sieci albo przed zalogowaniem wszystko działa lokalnie, a zapis dogania konto później.
// Zmiana, która jeszcze nie dotarła na konto, ma znacznik „niewysłane” z właścicielem: taka lokalna kopia wygrywa
// ze starszą z konta i idzie na konto przy pobraniu, po błędzie (ponowienie), po powrocie sieci i przy pagehide.
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { currentUserId } from "../auth";
import { supabase } from "../supabase";
import type { Odpowiedzi, Samoocena } from "./sprawdz";

// Szkic ucznia w Excalidraw przy jednym zadaniu. Elementy sceny w formacie
// Excalidraw (JSON), bez plików: rysunek bazowy aplikacja dokleja z arkusza
// przy otwarciu, a własnych obrazków brudnopis nie przyjmuje. Zwykłe dane,
// więc synchronizują się razem z resztą postępu.
export type Brudnopis = { elementy: readonly unknown[]; zmieniony: string };

// Warsztat przy zadaniu z informatyki: kod w Pythonie, zapytanie SQL i otwarta karta.
// arkusz: zmiany w arkuszu kalkulacyjnym jako operacje FortuneSheet (dane CKE wczytujemy za każdym razem).
// brudnopis: swobodne notatki i obliczenia, poza odpowiedziami i oceną.
export type Warsztat = { tryb?: "python" | "sql" | "arkusz" | "dane" | "brudnopis"; python?: string; sql?: string; arkusz?: unknown[]; brudnopis?: string; szkic?: Brudnopis };

// Zegar rozwiązywania na czas. start: chwila wznowienia (ms) albo null przy pauzie; zuzyte: czas sprzed
// ostatniego wznowienia; ogloszone: momenty, o których Pestka już powiedziała.
export type Czas = { start: number | null; zuzyte: number; ogloszone?: string[] };

export type Postep = {
  odpowiedzi: Odpowiedzi;
  samoocena: Samoocena;
  sprawdzony: boolean; // cały arkusz
  sprawdzoneZadania: number[]; // pojedyncze zadania sprawdzone przed końcem
  wynik?: { zdobyte: number; mozliwe: number; kiedy: string };
  brudnopisy?: Record<string, Brudnopis>; // klucz: numer zadania
  czas?: Czas;
  // Wynik zadania podobnego z omawiania błędów: zrozumiane albo do powtórki. Klucz: numer zadania.
  omowione?: Record<number, "dobrze" | "zle">;
  // Rozmowy z Pestką z omawiania błędów, żeby po powrocie do zadania były na miejscu. Klucz: numer zadania.
  rozmowyOmowien?: Record<number, { od: "tutor" | "uczen"; tekst: string }[]>;
  warsztat?: Record<number, Warsztat>; // klucz: numer zadania
  czasZadan?: Record<number, number>; // ms myślenia nad zadaniem, klucz: numer zadania (arkusze/czasZadan.ts)
};

export const pustyPostep: Postep = { odpowiedzi: {}, samoocena: {}, sprawdzony: false, sprawdzoneZadania: [] };
const pusty = pustyPostep;
const klucz = (id: string) => `sedno.arkusz.${id}`;

export function wczytajPostep(id: string): Postep {
  try {
    const zapis = localStorage.getItem(klucz(id));
    return zapis ? { ...pusty, ...JSON.parse(zapis) } : pusty;
  } catch {
    return pusty;
  }
}

// Stan ostatniego zapisu postępu, żeby narzędzia (np. skoroszyt) uczciwie pokazały, czy zmiany są już bezpieczne.
// „lokalnie” to zapis tylko w tej przeglądarce (bez konta), „blad” to nieudany zapis.
export type StanZapisu = "zapisywanie" | "zapisano" | "lokalnie" | "blad";
let stanZapisu: StanZapisu = "zapisano";
const sluchaczeStanu = new Set<() => void>();
function ustawStan(s: StanZapisu) {
  if (s === stanZapisu) return;
  stanZapisu = s;
  sluchaczeStanu.forEach((f) => f());
}
export function useStanZapisu(): StanZapisu {
  return useSyncExternalStore(
    (f) => {
      sluchaczeStanu.add(f);
      return () => void sluchaczeStanu.delete(f);
    },
    () => stanZapisu,
  );
}

function zapiszLokalnie(id: string, p: Postep): boolean {
  try {
    localStorage.setItem(klucz(id), JSON.stringify(p));
    return true;
  } catch {
    // brak miejsca albo zablokowany storage: postęp zostaje tylko w pamięci
    return false;
  }
}

// Znaczniki niewysłanych zmian: { [id arkusza]: { kto, baza } }. kto: konto, na które zmiana ma trafić
// (null: zmiana sprzed zalogowania). baza: zmiana zrobiona na kopii znanej z konta albo z tej przeglądarki;
// bez niej (pierwsze wejście na tym urządzeniu i błąd sieci przy pobraniu) łączymy z kontem zamiast je nadpisać.
type Znacznik = { kto: string | null; baza: boolean };
const KLUCZ_NIEWYSLANYCH = "sedno.arkusze.niewyslane";
// Konto, do którego należą lokalne kopie postępu: inne konto na tym komputerze zaczyna od zera.
const KLUCZ_WLASCICIELA = "sedno.arkusze.wlasciciel";
const PONOWIENIE_MS = 30_000;

function niewyslane(): Record<string, Znacznik> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KLUCZ_NIEWYSLANYCH) ?? "{}");
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const wynik: Record<string, Znacznik> = {};
    for (const [id, z] of Object.entries(v as Record<string, unknown>)) {
      if (!z || typeof z !== "object") continue;
      const { kto, baza } = z as Record<string, unknown>;
      wynik[id] = { kto: typeof kto === "string" ? kto : null, baza: baza === true };
    }
    return wynik;
  } catch {
    return {};
  }
}

function zapiszNiewyslane(n: Record<string, Znacznik>) {
  try {
    if (Object.keys(n).length) localStorage.setItem(KLUCZ_NIEWYSLANYCH, JSON.stringify(n));
    else localStorage.removeItem(KLUCZ_NIEWYSLANYCH);
  } catch {
    // zablokowany storage: zmiana i tak czeka w kolejce zapisu do końca sesji
  }
}

function znacznik(id: string, user: string): Znacznik | null {
  const z = niewyslane()[id];
  return z && (z.kto === user || z.kto === null) ? z : null;
}

function oznacz(id: string, kto: string | null, baza: boolean) {
  const n = niewyslane();
  const byl = n[id];
  n[id] = { kto: kto ?? byl?.kto ?? null, baza: byl ? byl.baza || baza : baza };
  zapiszNiewyslane(n);
}

function odznacz(id: string) {
  const n = niewyslane();
  if (!(id in n)) return;
  delete n[id];
  zapiszNiewyslane(n);
}

function maKopie(id: string): boolean {
  try {
    return localStorage.getItem(klucz(id)) !== null;
  } catch {
    return false;
  }
}

/** Kopia z konta połączona z lokalną zrobioną bez jej znajomości: lokalne wpisy wygrywają, nic z konta nie ginie. */
export function scal(konto: Postep, lok: Postep): Postep {
  const mapa = <T,>(a?: Record<string, T>, b?: Record<string, T>) => (a || b ? { ...a, ...b } : undefined);
  return {
    ...konto,
    ...lok,
    odpowiedzi: { ...konto.odpowiedzi, ...lok.odpowiedzi },
    samoocena: { ...konto.samoocena, ...lok.samoocena },
    sprawdzony: konto.sprawdzony || lok.sprawdzony,
    sprawdzoneZadania: [...new Set([...(konto.sprawdzoneZadania ?? []), ...(lok.sprawdzoneZadania ?? [])])],
    wynik: lok.wynik ?? konto.wynik,
    czas: lok.czas ?? konto.czas,
    brudnopisy: mapa(konto.brudnopisy, lok.brudnopisy),
    omowione: mapa(konto.omowione, lok.omowione),
    rozmowyOmowien: mapa(konto.rozmowyOmowien, lok.rozmowyOmowien),
    warsztat: mapa(konto.warsztat, lok.warsztat),
    czasZadan: mapa(konto.czasZadan, lok.czasZadan),
  };
}

// Wspólny stan postępu w pamięci: kilka miejsc naraz (arkusz i zegar w pasku) widzi ten sam postęp
// i każda zmiana trafia do wszystkich.
const pamiec = new Map<string, Postep>();
const sluchacze = new Map<string, Set<(p: Postep) => void>>();
// Numer zmiany na arkusz: odpowiedź z konta, która przyszła po lokalnej zmianie, jest już nieaktualna
// (zapis na konto idzie z opóźnieniem), więc jej nie bierzemy. Konto czytamy raz na arkusz w sesji,
// a do `pobrane` arkusz trafia dopiero po udanej odpowiedzi.
const wersje = new Map<string, number>();
const pobrane = new Set<string>();
const oczekujace = new Map<string, ReturnType<typeof setTimeout>>();
const ponowienia = new Map<string, ReturnType<typeof setTimeout>>();
// Konto, którego postęp jest w pamięci (undefined: jeszcze nie wiadomo).
let wlascicielPamieci: string | null | undefined;

function ustaw(id: string, p: Postep) {
  pamiec.set(id, p);
  sluchacze.get(id)?.forEach((f) => f(p));
}

/** Zapomina postęp w pamięci (wylogowanie, inne konto). Otwarte widoki dostają to, co zostało w przeglądarce. */
export function wyczyscPostepy() {
  oczekujace.forEach((t) => clearTimeout(t));
  ponowienia.forEach((t) => clearTimeout(t));
  oczekujace.clear();
  ponowienia.clear();
  pamiec.clear();
  pobrane.clear();
  wersje.clear();
  for (const [id, lista] of sluchacze) {
    const p = wczytajPostep(id);
    lista.forEach((f) => f(p));
  }
}

/** Usuwa lokalne kopie postępu i znaczniki (wylogowanie): następna osoba na tym komputerze zaczyna od zera. */
export function wyczyscPostepyLokalne() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sedno.arkusz.") || k === KLUCZ_NIEWYSLANYCH || k === KLUCZ_WLASCICIELA)
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // zablokowany storage: nic do sprzątania
  }
}

function pilnujWlasciciela(user: string | null) {
  if (user === wlascicielPamieci) return;
  const poprzedni = wlascicielPamieci;
  wlascicielPamieci = user;
  if (!user) {
    // Wylogowanie albo wygasła sesja: w pamięci nie zostaje nic z tego konta (lokalne kopie sprząta logout()).
    if (poprzedni) wyczyscPostepy();
    return;
  }
  let zapisany: string | null = null;
  try {
    zapisany = localStorage.getItem(KLUCZ_WLASCICIELA);
  } catch {
    // bez storage pilnujemy tylko pamięci
  }
  const inneWPrzegladarce = zapisany !== null && zapisany !== user;
  if (inneWPrzegladarce) wyczyscPostepyLokalne();
  try {
    localStorage.setItem(KLUCZ_WLASCICIELA, user);
  } catch {
    // jw.
  }
  if (inneWPrzegladarce || (poprzedni && poprzedni !== user)) wyczyscPostepy();
}

supabase.auth.onAuthStateChange((_zdarzenie, sesja) => pilnujWlasciciela(sesja?.user.id ?? null));

async function wyslij(id: string, user: string): Promise<void> {
  if (currentUserId() !== user || wlascicielPamieci !== user) return;
  clearTimeout(ponowienia.get(id));
  ponowienia.delete(id);
  const wersja = wersje.get(id) ?? 0;
  try {
    // Zmiana zrobiona bez znajomości kopii z konta: najpierw ją czytamy i łączymy, żeby nie nadpisać konta.
    const z = znacznik(id, user);
    if (z && !z.baza && !pobrane.has(id)) {
      const { data, error } = await supabase.from("sheet_progress").select("data").eq("user_id", user).eq("sheet_id", id).maybeSingle();
      if (error) throw error;
      if (currentUserId() !== user) return;
      rozstrzygnij(id, data ? { ...pusty, ...(data.data as Postep) } : null, user, wersje.get(id) ?? 0, false);
    }
    const dane = pamiec.get(id) ?? wczytajPostep(id);
    const { error } = await supabase.from("sheet_progress").upsert({ user_id: user, sheet_id: id, data: dane });
    if (error) throw error;
    if (currentUserId() !== user) return;
    pobrane.add(id);
    // Znacznik schodzi tylko wtedy, gdy w trakcie zapisu nie przyszła nowsza zmiana.
    if ((wersje.get(id) ?? 0) === wersja && !oczekujace.has(id)) odznacz(id);
    if (!oczekujace.has(id)) ustawStan("zapisano");
  } catch {
    if (currentUserId() !== user) return;
    if (!oczekujace.has(id)) ustawStan("blad");
    ponowienia.set(
      id,
      setTimeout(() => {
        ponowienia.delete(id);
        if (znacznik(id, user)) void wyslij(id, user);
      }, PONOWIENIE_MS),
    );
  }
}

// Zapis na konto z opóźnieniem, żeby nie wysyłać każdej zmiany osobno.
function zapiszNaKonto(id: string) {
  const user = currentUserId();
  if (!user) return;
  ustawStan("zapisywanie");
  clearTimeout(oczekujace.get(id));
  oczekujace.set(
    id,
    setTimeout(() => {
      oczekujace.delete(id);
      void wyslij(id, user);
    }, 800),
  );
}

/**
 * Kopia z konta dla arkusza (null: na koncie nic nie ma). Niewysłana lokalna zmiana wygrywa i idzie na konto;
 * bez niej bierzemy konto, chyba że od chwili zapytania przyszła lokalna zmiana (`wersja`).
 */
function rozstrzygnij(id: string, zKonta: Postep | null, user: string, wersja: number, wyslijPotem = true) {
  const z = znacznik(id, user);
  pobrane.add(id);
  if (z) {
    if (zKonta && !z.baza) {
      const scalony = scal(zKonta, pamiec.get(id) ?? wczytajPostep(id));
      zapiszLokalnie(id, scalony);
      ustaw(id, scalony);
    }
    oznacz(id, user, true);
    if (wyslijPotem) void wyslij(id, user);
    return;
  }
  if (!zKonta || (wersje.get(id) ?? 0) !== wersja) return;
  zapiszLokalnie(id, zKonta);
  if (pamiec.has(id)) ustaw(id, zKonta);
}

/** Ściąga cały postęp konta do pamięci przeglądarki; niewysłane lokalne zmiany idą na konto. */
export async function pobierzPostepy(user: string): Promise<void> {
  pilnujWlasciciela(user);
  const przed = new Map(wersje);
  const { data, error } = await supabase.from("sheet_progress").select("sheet_id, data").eq("user_id", user);
  if (error || !data || currentUserId() !== user || wlascicielPamieci !== user) return;
  const naKoncie = new Set<string>();
  for (const row of data) {
    naKoncie.add(row.sheet_id);
    rozstrzygnij(row.sheet_id, { ...pusty, ...(row.data as Postep) }, user, przed.get(row.sheet_id) ?? 0);
  }
  for (const id of Object.keys(niewyslane())) if (!naKoncie.has(id) && znacznik(id, user)) rozstrzygnij(id, null, user, przed.get(id) ?? 0);
}

/** Wysyła od razu zaległe zapisy (pagehide, wylogowanie, powrót sieci) i czeka na nie. */
export function splukajPostepy(): Promise<void> {
  const user = currentUserId();
  if (!user) return Promise.resolve();
  const ids = new Set([...oczekujace.keys(), ...Object.keys(niewyslane()).filter((id) => znacznik(id, user))]);
  oczekujace.forEach((t) => clearTimeout(t));
  oczekujace.clear();
  return Promise.all([...ids].map((id) => wyslij(id, user))).then(() => undefined);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => void splukajPostepy());
  window.addEventListener("online", () => void splukajPostepy());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void splukajPostepy();
  });
}

export function usePostep(id: string) {
  const [postep, setPostep] = useState<Postep>(() => pamiec.get(id) ?? wczytajPostep(id));

  useEffect(() => {
    const user = currentUserId();
    if (user) pilnujWlasciciela(user);
    if (!pamiec.has(id)) pamiec.set(id, wczytajPostep(id));
    setPostep(pamiec.get(id)!);
    const lista = sluchacze.get(id) ?? new Set();
    sluchacze.set(id, lista);
    lista.add(setPostep);
    let live = true;
    const wersja = wersje.get(id) ?? 0;
    if (user && !pobrane.has(id))
      supabase
        .from("sheet_progress")
        .select("data")
        .eq("user_id", user)
        .eq("sheet_id", id)
        .maybeSingle()
        .then(
          ({ data, error }) => {
            // Błąd albo porzucone zapytanie (wyjście z arkusza, inne konto) nie liczy się jako pobrane: następne wejście pyta znowu.
            if (!live || error || currentUserId() !== user) return;
            rozstrzygnij(id, data ? { ...pusty, ...(data.data as Postep) } : null, user, wersja);
          },
          () => {},
        );
    return () => {
      live = false;
      lista.delete(setPostep);
    };
  }, [id]);

  const zmien = useCallback(
    (f: (p: Postep) => Postep) => {
      const user = currentUserId();
      const nowy = f(pamiec.get(id) ?? wczytajPostep(id));
      const baza = pobrane.has(id) || maKopie(id);
      wersje.set(id, (wersje.get(id) ?? 0) + 1);
      const lokalnie = zapiszLokalnie(id, nowy);
      oznacz(id, user, baza);
      ustaw(id, nowy);
      zapiszNaKonto(id);
      if (!user) ustawStan(lokalnie ? "lokalnie" : "blad");
    },
    [id],
  );

  return [postep, zmien] as const;
}
