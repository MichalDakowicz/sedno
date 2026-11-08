// Rozmowy z Pestką w zwykłym czacie: bieżąca przeżywa odświeżenie strony, a wcześniejsze da się
// otworzyć i ciągnąć dalej (model dostaje całą historię). Zapis idzie do przeglądarki od razu, a na
// konto (tabela tutor_chats) z opóźnieniem, więc rozmowy są też na innych urządzeniach. Rozmowy przy
// arkuszach (omawianie błędów) siedzą w postępie arkusza, który synchronizuje się osobno.
import { currentUserId } from "../auth";
import { supabase } from "../supabase";

export type WiadomoscRozmowy = { from: "tutor" | "student"; text: string };
export type Rozmowa = { id: string; tytul: string; kiedy: string; wiadomosci: WiadomoscRozmowy[] };

const KLUCZ = "sedno.pestka.rozmowy";
const BIEZACA = "sedno.pestka.biezaca";
const LIMIT = 20;
/** Zdarzenie po ściągnięciu rozmów z konta: TutorContext odświeża wtedy listę. */
export const ZMIANA_ROZMOW = "sedno-rozmowy";

export function wczytajRozmowy(): Rozmowa[] {
  try {
    const z = localStorage.getItem(KLUCZ);
    return z ? (JSON.parse(z) as Rozmowa[]) : [];
  } catch {
    return [];
  }
}

export function idBiezacej(): string | null {
  try {
    return localStorage.getItem(BIEZACA);
  } catch {
    return null;
  }
}

export function ustawBiezaca(id: string) {
  try {
    localStorage.setItem(BIEZACA, id);
  } catch {
    // zablokowany storage: rozmowa zostaje tylko w pamięci
  }
}

/** Tytuł z pierwszego pytania ucznia, skrócony do kilku słów. */
export function tytul(wiadomosci: WiadomoscRozmowy[]): string | null {
  const pierwsze = wiadomosci.find((m) => m.from === "student")?.text.replace(/\s+/g, " ").trim();
  if (!pierwsze) return null;
  return pierwsze.length > 48 ? `${pierwsze.slice(0, 46).replace(/\s+\S*$/, "")}…` : pierwsze;
}

function zapiszLokalnie(lista: Rozmowa[]) {
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(lista));
  } catch {
    // brak miejsca: zostaje poprzedni zapis
  }
}

const oczekujace = new Map<string, ReturnType<typeof setTimeout>>();

// Na konto z opóźnieniem, żeby strumień odpowiedzi i szybkie wiadomości nie szły osobno.
function zapiszNaKonto(r: Rozmowa) {
  const user = currentUserId();
  if (!user) return;
  clearTimeout(oczekujace.get(r.id));
  oczekujace.set(
    r.id,
    setTimeout(() => {
      oczekujace.delete(r.id);
      void supabase.from("tutor_chats").upsert({ user_id: user, id: r.id, title: r.tytul, messages: r.wiadomosci }).then();
    }, 1000),
  );
}

/** Zapisuje rozmowę, gdy uczeń już coś napisał; najnowsze na początku, najwyżej LIMIT. */
export function zapiszRozmowe(id: string, wiadomosci: WiadomoscRozmowy[]): Rozmowa[] {
  const t = tytul(wiadomosci);
  const wszystkie = wczytajRozmowy();
  const poprzednia = wszystkie.find((r) => r.id === id);
  const reszta = wszystkie.filter((r) => r.id !== id);
  // Otwarcie starej rozmowy bez nowych wiadomości nie przesuwa jej na górę i nie idzie na konto.
  const bezZmian = !!poprzednia && JSON.stringify(poprzednia.wiadomosci) === JSON.stringify(wiadomosci);
  const rozmowa = t ? { id, tytul: t, kiedy: bezZmian ? poprzednia.kiedy : new Date().toISOString(), wiadomosci } : null;
  const lista = rozmowa ? [rozmowa, ...reszta].sort((a, b) => b.kiedy.localeCompare(a.kiedy)).slice(0, LIMIT) : reszta;
  zapiszLokalnie(lista);
  if (rozmowa && !bezZmian) zapiszNaKonto(rozmowa);
  return lista;
}

/** Po zalogowaniu: łączy rozmowy z konta z tymi z przeglądarki (nowsza wersja wygrywa) i wysyła
 *  na konto te, których tam jeszcze nie ma (rozmowy sprzed synchronizacji). */
export async function pobierzRozmowy(user: string): Promise<void> {
  const { data, error } = await supabase.from("tutor_chats").select("id, title, messages, updated_at").eq("user_id", user).order("updated_at", { ascending: false }).limit(LIMIT);
  if (error || !data) return;
  const zKonta = new Map<string, Rozmowa>(data.map((r) => [r.id, { id: r.id, tytul: r.title, kiedy: r.updated_at, wiadomosci: r.messages as WiadomoscRozmowy[] }]));
  const lokalne = wczytajRozmowy();
  for (const r of lokalne) {
    const k = zKonta.get(r.id);
    if (!k) zapiszNaKonto(r);
    if (!k || r.kiedy > k.kiedy) zKonta.set(r.id, r);
  }
  zapiszLokalnie([...zKonta.values()].sort((a, b) => b.kiedy.localeCompare(a.kiedy)).slice(0, LIMIT));
  window.dispatchEvent(new Event(ZMIANA_ROZMOW));
}

export const noweId = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
