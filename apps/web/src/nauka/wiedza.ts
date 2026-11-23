// Mapa wiedzy: prywatne notatki ucznia (knowledge_nodes) i połączenia między nimi (knowledge_edges), przez klienta
// Supabase zalogowanego ucznia (RLS: tylko własne). Kontrakt: services/supabase/narzedzia-nauki.md. Propozycje
// połączeń zapisuje Pestka (nauka-ai, mapa-wiedzy-polaczenia); uczeń je przyjmuje (status accepted) albo odrzuca (delete).
import type { PrzedmiotId } from "../konto/przedmioty";
import { supabase } from "../supabase";

// Mapa wiedzy jest schowana na czas konkursu (decyzja właściciela z 19 listopada): wejścia w Nauce, w rozmowie z Pestką,
// w omawianiu błędów i w panelu umiejętności są wyłączone tą flagą. Trasa /nauka/mapa-wiedzy i dane zostają.
export const MAPA_WIEDZY_WLACZONA = false;

/**
 * Skąd notatka (sprawdza baza): ręczna, z arkusza (`<id arkusza>#<zadanie>`), z rundy nauki (id sesji)
 * albo z rozmowy z Pestką (id rozmowy). Odwołanie służy do powrotu do źródła; dostęp sprawdza jego API.
 */
export type ZrodloNotatki = { source: "manual"; source_ref: null } | { source: "sheet" | "session" | "chat"; source_ref: string };
export type Notatka = {
  id: string; subject: PrzedmiotId; title: string; body: string; updated_at: string;
  /** Umiejętność z ogrodu (tylko angielski, jak w bazie). */
  skill_id: string | null;
} & ZrodloNotatki;
export type Polaczenie = { subject: PrzedmiotId; first_id: string; second_id: string; label: string; origin: "manual" | "pestka"; status: "proposed" | "accepted" };
export type MapaWiedzy = { notatki: Notatka[]; polaczenia: Polaczenie[] };

export const LIMIT_TYTULU = 120;
export const LIMIT_TRESCI = 8000;
export const LIMIT_ETYKIETY = 160;
/** Ile notatek Pestka łączy naraz (serwer: od 2 do 8). */
export const NOTATEK_DO_POLACZEN = 8;

const KOLUMNY = "id, subject, title, body, updated_at, skill_id, source, source_ref";

export class BladWiedzy extends Error {}

function blad(e: { code?: string; message?: string } | null, domyslny: string): never {
  if (e?.message === "knowledge_node_limit") throw new BladWiedzy("Masz już 250 notatek. Usuń kilka, zanim dodasz nową.");
  if (e?.code === "PGRST205" || e?.code === "42P01") throw new BladWiedzy("Mapa wiedzy nie jest jeszcze dostępna na tym serwerze.");
  throw new BladWiedzy(domyslny);
}

/** Baza (migracja 0013) przyjmuje notatki tylko z tych czterech przedmiotów; reszta nie może dojść do zapisu. */
export const PRZEDMIOTY_MAPY_WIEDZY: PrzedmiotId[] = ["polski", "matematyka", "angielski", "informatyka"];
export const czyMapaWiedzy = (p: string): p is PrzedmiotId => (PRZEDMIOTY_MAPY_WIEDZY as string[]).includes(p);
const bezMapy = () => new BladWiedzy("Mapa wiedzy nie obejmuje jeszcze tego przedmiotu.");

export async function pobierzMape(przedmiot: PrzedmiotId, signal?: AbortSignal): Promise<MapaWiedzy> {
  const [n, p] = await Promise.all([
    supabase.from("knowledge_nodes").select(KOLUMNY).eq("subject", przedmiot)
      .order("updated_at", { ascending: false }).abortSignal(signal ?? new AbortController().signal),
    supabase.from("knowledge_edges").select("subject, first_id, second_id, label, origin, status").eq("subject", przedmiot)
      .abortSignal(signal ?? new AbortController().signal),
  ]);
  if (n.error) blad(n.error, "Nie udało się wczytać notatek.");
  if (p.error) blad(p.error, "Nie udało się wczytać połączeń.");
  return { notatki: (n.data ?? []) as Notatka[], polaczenia: (p.data ?? []) as Polaczenie[] };
}

export async function dodajNotatke(
  przedmiot: PrzedmiotId, title: string, body: string,
  dodatki: { zrodlo?: ZrodloNotatki; skill_id?: string | null } = {},
): Promise<Notatka> {
  if (!czyMapaWiedzy(przedmiot)) throw bezMapy();
  const { data, error } = await supabase.from("knowledge_nodes")
    .insert({
      subject: przedmiot, title: title.trim().slice(0, LIMIT_TYTULU), body: body.trim().slice(0, LIMIT_TRESCI),
      ...(dodatki.zrodlo?.source !== "manual" && dodatki.zrodlo ? dodatki.zrodlo : {}),
      ...(przedmiot === "angielski" && dodatki.skill_id ? { skill_id: dodatki.skill_id } : {}),
    })
    .select(KOLUMNY).single();
  if (error || !data) blad(error, "Nie udało się zapisać notatki.");
  return data as Notatka;
}

export async function zmienNotatke(id: string, title: string, body: string): Promise<void> {
  const { error } = await supabase.from("knowledge_nodes")
    .update({ title: title.trim().slice(0, LIMIT_TYTULU), body: body.trim().slice(0, LIMIT_TRESCI) }).eq("id", id);
  if (error) blad(error, "Nie udało się zapisać zmian.");
}

/** Usuwa notatkę; baza usuwa też jej połączenia. */
export async function usunNotatke(id: string): Promise<void> {
  const { error } = await supabase.from("knowledge_nodes").delete().eq("id", id);
  if (error) blad(error, "Nie udało się usunąć notatki.");
}

/** Przypięcie notatki do umiejętności z ogrodu albo odpięcie (null). Baza przyjmuje je tylko dla angielskiego. */
export async function przypnijDoUmiejetnosci(id: string, skill_id: string | null): Promise<void> {
  const { error } = await supabase.from("knowledge_nodes").update({ skill_id }).eq("id", id);
  if (error) blad(error, "Nie udało się przypiąć notatki.");
}

/** Ręczne połączenie dwóch notatek. Krawędź jest nieskierowana: baza trzyma ją z mniejszym id na pierwszym miejscu. */
export async function polaczNotatki(przedmiot: PrzedmiotId, a: string, b: string, label: string): Promise<void> {
  if (a === b) return;
  if (!czyMapaWiedzy(przedmiot)) throw bezMapy();
  const [first_id, second_id] = a < b ? [a, b] : [b, a];
  const { error } = await supabase.from("knowledge_edges").insert({ subject: przedmiot, first_id, second_id, label: label.trim().slice(0, LIMIT_ETYKIETY) });
  if (error?.code === "23505") throw new BladWiedzy("Te notatki są już połączone.");
  if (error?.message === "knowledge_edge_limit") throw new BladWiedzy("Masz już 1000 połączeń. Usuń kilka, zanim dodasz nowe.");
  if (error) blad(error, "Nie udało się połączyć notatek.");
}

const filtr = (p: Pick<Polaczenie, "subject" | "first_id" | "second_id">) => ({ subject: p.subject, first_id: p.first_id, second_id: p.second_id });

export async function przyjmijPolaczenie(p: Polaczenie): Promise<void> {
  const { error } = await supabase.from("knowledge_edges").update({ status: "accepted" }).match(filtr(p));
  if (error) blad(error, "Nie udało się przyjąć połączenia.");
}

/** Odrzucenie propozycji i usunięcie przyjętego połączenia to to samo: wiersz znika (Pestka może zaproponować go znowu). */
export async function usunPolaczenie(p: Polaczenie): Promise<void> {
  const { error } = await supabase.from("knowledge_edges").delete().match(filtr(p));
  if (error) blad(error, "Nie udało się usunąć połączenia.");
}

/** Notatki dla Pestki: najświeższe, bo o nich uczeń teraz myśli (serwer przyjmuje najwyżej osiem). */
export const doPolaczen = (notatki: Notatka[]) => notatki.slice(0, NOTATEK_DO_POLACZEN).map((n) => n.id);
