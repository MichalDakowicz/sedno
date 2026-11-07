// Klient bramki AI. Aplikacja nie ma własnego klucza: zapytanie idzie przez dostawcę z konta
// użytkownika, a konto wybiera dostawcę osobno dla zadań ważnych i lekkich.
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

// Czy konto ma podpięte AI. Pestka pojawia się w aplikacji dopiero wtedy.
// Gotowe = ustawiony dostawca dla zadań lekkich albo dokładnie jeden dostawca (bramka wybierze go sama).
let ready: { user: string; value: boolean } | null = null;
const readyListeners = new Set<() => void>();

export async function refreshAiReady(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user.id;
  if (!user) return;
  const [creds, route] = await Promise.all([
    supabase.from("ai_credential").select("provider").limit(2),
    supabase.from("ai_routing").select("tier").eq("tier", "lekkie").maybeSingle(),
  ]);
  ready = { user, value: !!route.data || creds.data?.length === 1 };
  readyListeners.forEach((l) => l());
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
      no_provider: "To konto nie ma jeszcze dostawcy AI dla tego poziomu. Dodaj go w profilu.",
      not_signed_in: "Zaloguj się, żeby korzystać z AI.",
      rate_limited: "Za dużo zapytań naraz. Spróbuj za chwilę.",
      provider_failed: "Dostawca AI nie odpowiedział poprawnie.",
      bad_credential: "Zapisany klucz nie działa. Zapisz go ponownie w profilu.",
      bad_base_url: "Ten adres dostawcy jest niedozwolony.",
    }[code] ?? "Coś poszło nie tak."
  );
}
