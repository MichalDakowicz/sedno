// Klient bramki AI. Zapytanie idzie przez dostawcę z konta użytkownika, a gdy konto go nie ma, przez domyślną trasę serwera.
// Klucze zostają po stronie serwera; konto wybiera dostawcę osobno dla zadań ważnych i lekkich.
import { useEffect, useState } from "react";
import { functionsUrl, supabase } from "./supabase";

export type Tier = "wazne" | "lekkie";
export type AiMessage = { role: "system" | "user" | "assistant"; content: string };
export type AiRequest = { tier: Tier; messages: AiMessage[]; task?: string; provider?: string; maxTokens?: number; temperature?: number };
export type AiAnswer = { text: string; provider: string; model: string };

export class AiError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

async function headers(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AiError("not_signed_in", 401);
  return {
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    "Content-Type": "application/json",
  };
}

const body = (r: AiRequest, stream: boolean) =>
  JSON.stringify({ tier: r.tier, messages: r.messages, task: r.task, provider: r.provider, max_tokens: r.maxTokens, temperature: r.temperature, stream });

// Ponowienia i zapasowy poziom robi serwer, więc klient pyta raz.
export async function askAi(r: AiRequest): Promise<AiAnswer> {
  const res = await fetch(`${functionsUrl}/ai`, { method: "POST", headers: await headers(), body: body(r, false) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AiError(data.error ?? "server_error", res.status);
  return data as AiAnswer;
}

/** Odpowiedź kawałkami; onText dostaje kolejne fragmenty tekstu. */
export async function streamAi(r: AiRequest, onText: (delta: string) => void, signal?: AbortSignal): Promise<AiAnswer> {
  const res = await fetch(`${functionsUrl}/ai`, { method: "POST", headers: await headers(), body: body(r, true), signal });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new AiError(data.error ?? "server_error", res.status);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 2);
      if (!line.startsWith("data:")) continue;
      const ev = JSON.parse(line.slice(5));
      if (ev.type === "text") {
        text += ev.delta;
        onText(ev.delta);
      } else if (ev.type === "done") {
        return { text, provider: ev.provider, model: ev.model };
      } else if (ev.type === "error") {
        throw new AiError("provider_failed", ev.status ?? 502);
      }
    }
  }
  throw new AiError("stream_ended", 502);
}

/** Zapis lub test klucza konta (funkcja ai-klucz). */
export async function aiKey(payload: { action: "save"; provider: string; base_url: string; model: string; key?: string } | { action: "test"; provider: string }) {
  const res = await fetch(`${functionsUrl}/ai-klucz`, { method: "POST", headers: await headers(), body: JSON.stringify(payload) });
  return (await res.json().catch(() => ({ error: "server_error" }))) as Record<string, unknown>;
}

// Czy Pestka jest dostępna dla konta (własny dostawca albo domyślna trasa serwera). Pestka pojawia się w aplikacji dopiero wtedy.
let ready: { user: string; value: boolean } | null = null;
const readyListeners = new Set<() => void>();

// Tylko jawne { ready: false } z serwera znaczy „niegotowa”; błąd sieci albo serwera zostawia undefined, żeby spróbować ponownie.
async function zapytajOGotowosc(): Promise<boolean | undefined> {
  try {
    const res = await fetch(`${functionsUrl}/ai`, { method: "POST", headers: await headers(), body: JSON.stringify({ status: true }) });
    const d = await res.json().catch(() => null);
    return res.ok && typeof d?.ready === "boolean" ? d.ready : undefined;
  } catch {
    return undefined;
  }
}

// Jedno zapytanie naraz, niezależnie od liczby zamontowanych widoków.
let sprawdzanie: Promise<void> | null = null;

export function refreshAiReady(): Promise<void> {
  sprawdzanie ??= (async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user.id;
    if (!user) return;
    let value = await zapytajOGotowosc();
    if (value === undefined) {
      await new Promise((r) => setTimeout(r, 4000));
      value = await zapytajOGotowosc();
    }
    if (value === undefined) return;
    ready = { user, value };
    readyListeners.forEach((l) => l());
  })().catch(() => {}).finally(() => (sprawdzanie = null));
  return sprawdzanie;
}

/** undefined w trakcie sprawdzania. */
export function useAiReady(userId: string | null): boolean | undefined {
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    readyListeners.add(l);
    if (userId && ready?.user !== userId) void refreshAiReady();
    return () => void readyListeners.delete(l);
  }, [userId]);
  if (!userId) return false;
  return ready?.user === userId ? ready.value : undefined;
}

/** Komunikat dla użytkownika zamiast kodu błędu. */
export function aiErrorText(code: string): string {
  return (
    {
      no_provider: "Pestka jest chwilowo niedostępna. Spróbuj za chwilę.",
      not_signed_in: "Zaloguj się, żeby rozmawiać z Pestką.",
      rate_limited: "Za dużo zapytań naraz. Spróbuj za chwilę.",
      daily_limit: "Na dziś wykorzystano limit rozmów z Pestką. Wróć jutro.",
      provider_failed: "Pestka nie odpowiedziała. Spróbuj ponownie za chwilę.",
      bad_credential: "Pestka jest chwilowo niedostępna. Spróbuj za chwilę.",
      bad_base_url: "Ten adres dostawcy jest niedozwolony.",
    }[code] ?? "Coś poszło nie tak."
  );
}
