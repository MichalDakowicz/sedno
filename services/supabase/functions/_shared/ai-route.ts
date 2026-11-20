import { decryptKey, importSecret, rowId } from "./crypto.ts";
import { admin, checkUrl, reply } from "./konto.ts";
import { czyTrasaSerwera, domyslnaTrasa, dziennyLimit, SEDNO, tenSamWlasciciel } from "./ai-default.ts";
import type { Provider } from "./llm.ts";

export type AiRoute = { provider: string; model: string; reasoningEffort?: string; p: Provider };

export async function resolveAi(user: string, tier: string, override: string | undefined): Promise<AiRoute | Response> {
  let provider = override;
  let model: string | null = null;
  let reasoningEffort: string | undefined;
  if (!provider) {
    const { data, error } = await admin.from("ai_routing").select("provider, model, reasoning_effort").eq("user_id", user).eq("tier", tier).maybeSingle();
    if (error) return reply(500, { error: "server_error" });
    provider = data?.provider;
    model = data?.model ?? null;
    reasoningEffort = data?.reasoning_effort ?? undefined;
  }
  let query = admin.from("ai_credential").select("provider, base_url, model, key_cipher").eq("user_id", user);
  if (provider) query = query.eq("provider", provider);
  const { data: creds, error } = await query.limit(2);
  if (error) return reply(500, { error: "server_error" });
  // Bez ustawionego routingu wystarczy, że konto ma dokładnie jednego dostawcę.
  if (!creds?.length || (!provider && creds.length > 1)) {
    // Trasa serwera tylko dla konta bez żadnego klucza; własny klucz, którego nie da się dobrać, nie przechodzi po cichu na serwer.
    let kluczy = creds?.length ?? 0;
    if (!kluczy && provider && !override) {
      // Routing wskazał usuniętego dostawcę: sprawdzamy, czy konto ma jakiegokolwiek innego.
      const { count, error: e } = await admin.from("ai_credential").select("provider", { count: "exact", head: true }).eq("user_id", user);
      if (e) return reply(500, { error: "server_error" });
      kluczy = count ?? 0;
    }
    const domyslna = czyTrasaSerwera(override, kluczy) ? domyslnaTrasa(tier) : null;
    return domyslna ?? reply(409, { error: "no_provider", tier });
  }
  const c = creds[0]!;

  let secret: CryptoKey;
  try {
    secret = await importSecret(Deno.env.get("LLM_KEY_SECRET"));
  } catch {
    return reply(503, { error: "not_configured" });
  }
  try {
    const key = await decryptKey(secret, rowId(user, c.provider), c.key_cipher);
    const baseUrl = await checkUrl(user, c.base_url);
    const m = model ?? c.model;
    return { provider: c.provider, model: m, reasoningEffort, p: { baseUrl, key, model: m } };
  } catch {
    return reply(400, { error: "bad_credential" });
  }
}

/** Trasa drugiego poziomu dla ponowień; undefined, gdy jej nie ma albo należałaby do innego właściciela klucza. */
export const zapasowa = (user: string, tier: string, route: AiRoute, override?: string) => async (): Promise<AiRoute | undefined> => {
  const r = await resolveAi(user, tier === "wazne" ? "lekkie" : "wazne", override);
  return r instanceof Response || !tenSamWlasciciel(r, route) ? undefined : r;
};

/** Dzienny limit rozmów przez klucz serwera (429 daily_limit); własne klucze go nie dotyczą. Liczy z ai_usage po (user_id, created_at). */
export async function limitDzienny(user: string, route: AiRoute): Promise<Response | null> {
  if (route.provider !== SEDNO) return null;
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count, error } = await admin.from("ai_usage").select("id", { count: "exact", head: true })
    .eq("user_id", user).eq("provider", SEDNO).gte("created_at", since);
  if (error) return reply(500, { error: "server_error" });
  return (count ?? 0) >= dziennyLimit() ? reply(429, { error: "daily_limit" }) : null;
}

export async function logAiUsage(row: Record<string, unknown>) {
  await admin.from("ai_usage").insert(row);
}
