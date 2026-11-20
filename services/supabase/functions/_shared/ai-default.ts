import type { Provider } from "./llm.ts";

// Domyślna trasa serwera dla kont bez własnego klucza. Konfiguracja tylko ze zmiennych środowiska.
export const SEDNO = "sedno";
export type DefaultRoute = { provider: typeof SEDNO; model: string; reasoningEffort?: string; p: Provider };
type Env = (name: string) => string | undefined;
const denoEnv: Env = (n) => Deno.env.get(n);

export function domyslnaTrasa(tier: string, env: Env = denoEnv): DefaultRoute | null {
  const key = env("SEDNO_AI_KEY");
  const own = tier === "wazne" ? "WAZNE" : "LEKKIE";
  // Wystarczy model jednego poziomu: drugi poziom korzysta z niego wraz z jego rozumowaniem.
  const suffix = env(`SEDNO_AI_MODEL_${own}`) ? own : own === "WAZNE" ? "LEKKIE" : "WAZNE";
  const model = env(`SEDNO_AI_MODEL_${suffix}`);
  if (!key || !model) return null;
  const baseUrl = (env("SEDNO_AI_BASE_URL") || "https://api.openai.com/v1").replace(/\/+$/, "");
  return { provider: SEDNO, model, reasoningEffort: env(`SEDNO_AI_EFFORT_${suffix}`) || undefined, p: { baseUrl, key, model } };
}

const dodatnia = (raw: string | undefined, domyslnie: number) => (Number(raw) >= 1 ? Math.floor(Number(raw)) : domyslnie);

/** Klucz serwera nie jest darmowym modelem ogólnego użytku: sufit długości odpowiedzi, także gdy klient go nie podał. */
export const ograniczTokeny = (requested: number | undefined, env: Env = denoEnv) => {
  const max = dodatnia(env("SEDNO_AI_MAX_TOKENS"), 2048);
  return Math.min(requested ?? max, max);
};

export const dziennyLimit = (env: Env = denoEnv) => dodatnia(env("SEDNO_AI_LIMIT_DZIENNY"), 200);

/** Trasa serwera tylko dla konta bez żadnego własnego klucza i bez wskazanego dostawcy. */
export const czyTrasaSerwera = (override: string | undefined, kluczy: number) => !override && kluczy === 0;

/** Zapas nie przeskakuje między własnym kluczem a kluczem serwera. */
export const tenSamWlasciciel = (a: { provider: string }, b: { provider: string }) => (a.provider === SEDNO) === (b.provider === SEDNO);
