// Rozmowy z Pestką w zwykłym czacie: bieżąca przeżywa odświeżenie strony, a wcześniejsze da się
// otworzyć i ciągnąć dalej (model dostaje całą historię). Zapis idzie do przeglądarki od razu, a na
// konto (tabela tutor_chats) z opóźnieniem, więc rozmowy są też na innych urządzeniach. Rozmowy przy
// arkuszach (omawianie błędów) siedzą w postępie arkusza, który synchronizuje się osobno.
import { currentUserId } from "../auth";
import { supabase } from "../supabase";
import type { OdpowiedzPestki } from "../../../../services/supabase/functions/_shared/pestka-odpowiedz";

export type WiadomoscRozmowy = { from: "tutor" | "student"; text: string; pestka?: OdpowiedzPestki };
/** naKoncie: ta wersja jest potwierdzona zapisem na koncie; każda lokalna zmiana to zdejmuje (zegary klienta i serwera się nie porównują). */
export type Rozmowa = { id: string; tytul: string; kiedy: string; wiadomosci: WiadomoscRozmowy[]; naKoncie?: boolean };

const KLUCZ = "sedno.pestka.rozmowy";
const BIEZACA = "sedno.pestka.biezaca";
const WLASCICIEL = "sedno.pestka.wlasciciel";
const LIMIT = 20;
/** Zdarzenie po ściągnięciu rozmów z konta: TutorContext odświeża wtedy listę. */
export const ZMIANA_ROZMOW = "sedno-rozmowy";

// Wpis w localStorage mógł zostać uszkodzony (inna wersja aplikacji, ręczna edycja): bierzemy tylko poprawne rozmowy.
function poprawnaRozmowa(r: unknown): r is Rozmowa {
  if (!r || typeof r !== "object") return false;
  const { id, tytul, kiedy, wiadomosci } = r as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof tytul === "string" &&
    typeof kiedy === "string" &&
    Array.isArray(wiadomosci) &&
    wiadomosci.every((m: unknown) => {
      const w = m as Partial<WiadomoscRozmowy> | null;
      return !!w && (w.from === "tutor" || w.from === "student") && typeof w.text === "string";
    })
  );
}

export function wczytajRozmowy(): Rozmowa[] {
  try {
    const z = localStorage.getItem(KLUCZ);
    const lista: unknown = z ? JSON.parse(z) : [];
    return Array.isArray(lista) ? lista.filter(poprawnaRozmowa) : [];
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
  // Po punktach kodowych, żeby nie przeciąć pary zastępczej (emoji).
  const znaki = Array.from(pierwsze);
  return znaki.length > 48 ? `${znaki.slice(0, 46).join("").replace(/\s+\S*$/, "")}…` : pierwsze;
}

function zapiszLokalnie(lista: Rozmowa[]) {
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(lista));
  } catch {
    // brak miejsca: zostaje poprzedni zapis
  }
}

type Oczekujacy = { timer: ReturnType<typeof setTimeout>; wyslij: () => Promise<void> };
const oczekujace = new Map<string, Oczekujacy>();

const tresc = (w: WiadomoscRozmowy[]) => JSON.stringify(w);

// Po udanym zapisie oznaczamy rozmowę jako potwierdzoną, o ile w międzyczasie się nie zmieniła.
function oznaczNaKoncie(r: Rozmowa) {
  const lista = wczytajRozmowy();
  const lokalna = lista.find((x) => x.id === r.id);
  if (!lokalna || lokalna.naKoncie || tresc(lokalna.wiadomosci) !== tresc(r.wiadomosci)) return;
  zapiszLokalnie(lista.map((x) => (x.id === r.id ? { ...x, naKoncie: true } : x)));
}

// Na konto z opóźnieniem, żeby strumień odpowiedzi i szybkie wiadomości nie szły osobno.
// Błąd zapisu zostawia rozmowę niepotwierdzoną: wyśle ją następne pobranie (np. po powrocie sieci).
function zapiszNaKonto(r: Rozmowa) {
  const user = currentUserId();
  if (!user) return;
  clearTimeout(oczekujace.get(r.id)?.timer);
  const wyslij = async () => {
    oczekujace.delete(r.id);
    const { error } = await supabase.from("tutor_chats").upsert({ user_id: user, id: r.id, title: r.tytul, messages: r.wiadomosci });
    if (!error && currentUserId() === user) oznaczNaKoncie(r);
  };
  oczekujace.set(r.id, { timer: setTimeout(() => void wyslij(), 1000), wyslij });
}

/** Przed wylogowaniem: zaległe zapisy idą od razu, jeszcze z sesją tego konta. */
export async function wyslijOczekujace() {
  const zalegle = [...oczekujace.values()];
  zalegle.forEach((o) => clearTimeout(o.timer));
  await Promise.allSettled(zalegle.map((o) => o.wyslij()));
}

/** Przy wylogowaniu: rozmowy należą do konta, więc następna osoba na tym komputerze zaczyna od zera,
 *  a zaległe zapisy nie trafią na jej konto. */
export function wyczyscRozmowy() {
  oczekujace.forEach((o) => clearTimeout(o.timer));
  oczekujace.clear();
  try {
    localStorage.removeItem(KLUCZ);
    localStorage.removeItem(BIEZACA);
    localStorage.removeItem(WLASCICIEL);
  } catch {
    // zablokowany storage: nic do sprzątania
  }
}

/** Zapisuje rozmowę, gdy uczeń już coś napisał; najnowsze na początku, najwyżej LIMIT. */
export function zapiszRozmowe(id: string, wiadomosci: WiadomoscRozmowy[]): Rozmowa[] {
  const t = tytul(wiadomosci);
  const wszystkie = wczytajRozmowy();
  const poprzednia = wszystkie.find((r) => r.id === id);
  const reszta = wszystkie.filter((r) => r.id !== id);
  // Otwarcie starej rozmowy bez nowych wiadomości nie przesuwa jej na górę i nie idzie na konto.
  const bezZmian = !!poprzednia && tresc(poprzednia.wiadomosci) === tresc(wiadomosci);
  const rozmowa: Rozmowa | null = t
    ? bezZmian
      ? { ...poprzednia, tytul: t }
      : { id, tytul: t, kiedy: new Date().toISOString(), wiadomosci }
    : null;
  // Znaczniki czasu mają różne formaty (lokalny „Z”, serwer „+00:00”), więc porównujemy daty, nie napisy.
  const lista = rozmowa ? [rozmowa, ...reszta].sort((a, b) => Date.parse(b.kiedy) - Date.parse(a.kiedy)).slice(0, LIMIT) : reszta;
  zapiszLokalnie(lista);
  if (rozmowa && !bezZmian) zapiszNaKonto(rozmowa);
  return lista;
}

/** Po zalogowaniu: łączy rozmowy z konta z tymi z przeglądarki. Lokalna rozmowa niepotwierdzona na koncie
 *  (zmieniona, po nieudanym zapisie albo sprzed synchronizacji) wygrywa i idzie na konto; potwierdzona ustępuje
 *  wersji z konta, a jeśli jej tam nie ma (poza ostatnimi LIMIT), zostaje lokalnie bez ponownego wysyłania. */
export async function pobierzRozmowy(user: string): Promise<void> {
  const { data, error } = await supabase.from("tutor_chats").select("id, title, messages, updated_at").eq("user_id", user).order("updated_at", { ascending: false }).limit(LIMIT);
  if (error || !data) return;
  if (currentUserId() !== user) return;
  // Rozmowy innego konta (sesja skończyła się bez wylogowania) nie mogą trafić na to konto. Rozmowy bez zapisanego
  // właściciela (sprzed synchronizacji) zostają lokalnie i nie są wysyłane na konto.
  let bezWlasciciela = false;
  try {
    const wlasciciel = localStorage.getItem(WLASCICIEL);
    bezWlasciciela = !wlasciciel;
    if (wlasciciel && wlasciciel !== user) wyczyscRozmowy();
  } catch {
    // zablokowany storage: nie ma lokalnych rozmów do pomylenia
  }
  const wynik = new Map<string, Rozmowa>(data.map((r) => [r.id, { id: r.id, tytul: r.title, kiedy: r.updated_at, wiadomosci: r.messages as WiadomoscRozmowy[], naKoncie: true }]));
  for (const r of wczytajRozmowy()) {
    // Bez właściciela rozmowa może być cudza (poprzednia wersja aplikacji, wspólny komputer): zostaje lokalnie, nie idzie na konto.
    if (!r.naKoncie && !bezWlasciciela) {
      zapiszNaKonto(r);
      wynik.set(r.id, r);
    } else if (!r.naKoncie) wynik.set(r.id, { ...r, naKoncie: true });
    else if (!wynik.has(r.id)) wynik.set(r.id, r);
  }
  zapiszLokalnie([...wynik.values()].sort((a, b) => Date.parse(b.kiedy) - Date.parse(a.kiedy)).slice(0, LIMIT));
  try {
    localStorage.setItem(WLASCICIEL, user);
  } catch {
    // zablokowany storage: nic do zapamiętania
  }
  window.dispatchEvent(new Event(ZMIANA_ROZMOW));
}

export const noweId = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
