// Sesja z Supabase Auth: Google albo e-mail z hasłem (konta testowe zakłada administrator).
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { poprawne, type MojPrzedmiot } from "./konto/przedmioty";
import { wyczyscRozmowy, wyslijOczekujace } from "./konto/rozmowy";
import { wyczyscOstatnie } from "./components/szukaj";
import { wyczyscArkusze } from "./arkusze/dane";
import { splukajProfil } from "./konto/profilUcznia";
import { splukajUstawienia } from "./konto/ustawienia";
import { splukajUklad } from "./konto/ukladPulpitu";
import { splukajPostepy, wyczyscPostepyLokalne } from "./arkusze/postep";

export type Profil = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  server_ollama: boolean;
  onboarded_at: string | null;
  subjects: MojPrzedmiot[];
};

let current: Session | null = null;
let ready = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

supabase.auth.getSession().then(({ data }) => {
  current = data.session;
  ready = true;
  notify();
});

supabase.auth.onAuthStateChange((event, session) => {
  // Także gdy sesja wygasła bez logout() (odrzucone odświeżenie tokenu): rozmowy nie mogą przejść na następne konto.
  if (event === "SIGNED_OUT") {
    wyczyscRozmowy();
    wyczyscOstatnie();
    wyczyscArkusze();
  }
  current = session;
  ready = true;
  notify();
});

/** null przed pierwszym odczytem sesji, potem Session albo false. */
export function useSession(): Session | false | null {
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  if (!ready) return null;
  return current ?? false;
}

export function currentUserId(): string | null {
  return current?.user.id ?? null;
}

export async function loginGoogle(): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  return error?.message ?? null;
}

export async function loginPassword(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) return null;
  return error.message === "Invalid login credentials" ? "Nieprawidłowy e-mail albo hasło." : error.message;
}

export async function logout(): Promise<void> {
  // Zaległe zapisy rozmów, postępu w arkuszach, ustawień i profilu ucznia idą jeszcze z sesją, potem czyścimy; nieudany ani zawieszony (limit 3 s) zapis nie blokuje wylogowania.
  try {
    await Promise.race([Promise.all([wyslijOczekujace(), splukajPostepy(), splukajUstawienia(), splukajProfil(), splukajUklad()]), new Promise((r) => setTimeout(r, 3000))]);
  } catch {
    // zostaje lokalna kopia, która i tak jest czyszczona
  }
  wyczyscRozmowy();
  wyczyscOstatnie();
  // Lokalna kopia postępu należy do konta; następna osoba na tym komputerze zaczyna od zera. Pamięć postępu
  // czyści zdarzenie SIGNED_OUT w postep.ts, więc otwarte widoki dostają już pustą przeglądarkę.
  wyczyscPostepyLokalne();
  await supabase.auth.signOut();
}

// Profil wspólny dla całej aplikacji: jedno zapytanie na konto, zmiany widzą wszystkie widoki.
let profil: { id: string; data: Profil | null } | null = null;
let loading: string | null = null;
const profilListeners = new Set<() => void>();

async function loadProfil(id: string) {
  if (loading === id) return;
  loading = id;
  const { data } = await supabase.from("profiles").select("id, display_name, avatar_url, server_ollama, onboarded_at, subjects").eq("id", id).maybeSingle();
  loading = null;
  profil = { id, data: data ? { ...data, subjects: poprawne(data.subjects) } : null };
  profilListeners.forEach((l) => l());
}

/** undefined w trakcie wczytywania, null gdy nie ma sesji albo profilu. */
export function useProfil(): Profil | null | undefined {
  const session = useSession();
  const id = session ? session.user.id : null;
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    profilListeners.add(l);
    if (id && profil?.id !== id) void loadProfil(id);
    return () => void profilListeners.delete(l);
  }, [id]);
  if (session === null) return undefined;
  if (!id) return null;
  return profil?.id === id ? profil.data : undefined;
}

export async function markOnboarded(): Promise<void> {
  const id = currentUserId();
  if (!id) return;
  const onboarded_at = new Date().toISOString();
  await supabase.from("profiles").update({ onboarded_at }).eq("id", id);
  if (profil?.id === id && profil.data) profil = { id, data: { ...profil.data, onboarded_at } };
  profilListeners.forEach((l) => l());
}

export async function saveSubjects(subjects: MojPrzedmiot[]): Promise<boolean> {
  const id = currentUserId();
  if (!id) return false;
  const { error } = await supabase.from("profiles").update({ subjects }).eq("id", id);
  if (error) return false;
  if (profil?.id === id && profil.data) profil = { id, data: { ...profil.data, subjects } };
  profilListeners.forEach((l) => l());
  return true;
}

// Słowa, od których zaczynają się nazwy kont niebędące imieniem (konto testowe, demo, szkolne).
const NIE_IMIONA = new Set(["konto", "test", "testowe", "demo", "uczeń", "uczen", "user", "admin", "jury", "gość", "gosc", "klasa", "szkoła", "szkola"]);

/** Imię do powitania („Cześć, Ola.”) albo null, gdy nazwa konta nie wygląda na imię („Konto testowe”, adres, cyfry). */
export function imieZNazwy(nazwa: string | null | undefined): string | null {
  const pierwsze = nazwa?.trim().split(/\s+/)[0];
  if (!pierwsze || /[\d@_.]/.test(pierwsze) || NIE_IMIONA.has(pierwsze.toLocaleLowerCase("pl"))) return null;
  return pierwsze;
}
