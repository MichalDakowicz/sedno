import type { Provider } from "./llm.ts";

// Domyślna trasa serwera dla kont bez własnego klucza. Konfiguracja tylko ze zmiennych środowiska.
export type DefaultRoute = { provider: "sedno"; model: string; reasoningEffort?: string; p: Provider };

export function domyslnaTrasa(tier: string, env: (name: string) => string | undefined = (n) => Deno.env.get(n)): DefaultRoute | null {
  const suffix = tier === "wazne" ? "WAZNE" : "LEKKIE";
  const key = env("SEDNO_AI_KEY");
  const model = env(`SEDNO_AI_MODEL_${suffix}`);
  if (!key || !model) return null;
  const baseUrl = (env("SEDNO_AI_BASE_URL") || "https://api.openai.com/v1").replace(/\/+$/, "");
  return { provider: "sedno", model, reasoningEffort: env(`SEDNO_AI_EFFORT_${suffix}`) || undefined, p: { baseUrl, key, model } };
}
