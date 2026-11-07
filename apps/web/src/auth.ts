// Sesja z Supabase Auth: Google albo e-mail z hasłem (konta testowe zakłada administrator).
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Profil = { id: string; display_name: string | null; avatar_url: string | null; server_ollama: boolean };

let current: Session | null = null;
let ready = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

supabase.auth.getSession().then(({ data }) => {
  current = data.session;
  ready = true;
  notify();
});

supabase.auth.onAuthStateChange((_event, session) => {
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
  await supabase.auth.signOut();
  // Lokalna kopia postępu należy do konta; następna osoba na tym komputerze zaczyna od zera.
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sedno.arkusz."))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // zablokowany storage: nic do sprzątania
  }
}

export function useProfil(): Profil | null {
  const session = useSession();
  const [profil, setProfil] = useState<Profil | null>(null);
  const id = session ? session.user.id : null;
  useEffect(() => {
    if (!id) return setProfil(null);
    let live = true;
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, server_ollama")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => live && setProfil(data));
    return () => {
      live = false;
    };
  }, [id]);
  return profil;
}
