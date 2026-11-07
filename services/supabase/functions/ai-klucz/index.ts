// Zapis i test klucza AI konta. Klucz przychodzi raz po HTTPS, jest tu szyfrowany i nigdy nie
// wraca do aplikacji: ta widzi tylko dostawcę, adres, model i 4 ostatnie znaki.
// Nic tutaj nie loguje klucza, treści zapytania ani odpowiedzi dostawcy.

import { decryptKey, encryptKey, importSecret, rowId } from "../_shared/crypto.ts";
import { UnsafeUrl } from "../_shared/hosts.ts";
import { chat, LlmError } from "../_shared/llm.ts";
import { admin, checkUrl, cors, mayUseServer, reply, serverOllamaUrl, takeToken, userId } from "../_shared/konto.ts";

const PROVIDER = /^[a-z0-9_-]{1,32}$/;
const SERVER_PROVIDER = "ollama-serwer";
const MAX_BODY = 8 * 1024;

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const user = await userId(req);
  if (!user) return reply(401, { error: "not_signed_in" });

  const allowed = await takeToken(user, "ai-klucz", 10, 60);
  if (allowed === null) return reply(500, { error: "server_error" });
  if (!allowed) return reply(429, { error: "rate_limited" });

  const text = await req.text();
  if (text.length > MAX_BODY) return reply(413, { error: "too_large" });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return reply(400, { error: "bad_json" });
  }
  const provider = body.provider;
  if (typeof provider !== "string" || !PROVIDER.test(provider)) return reply(400, { error: "bad_provider" });

  let secret: CryptoKey;
  try {
    secret = await importSecret(Deno.env.get("LLM_KEY_SECRET"));
  } catch {
    return reply(503, { error: "not_configured" });
  }

  if (body.action === "save") return await save(user, provider, body, secret);
  if (body.action === "test") return await test(user, provider, secret);
  return reply(400, { error: "bad_action" });
}

async function save(user: string, provider: string, body: Record<string, unknown>, secret: CryptoKey): Promise<Response> {
  const { model } = body;
  // Ollama nie wymaga klucza; wtedy zapisujemy zaślepkę, żeby jedna ścieżka obsługiwała wszystko.
  const key = typeof body.key === "string" && body.key.trim() ? body.key.trim() : "ollama";
  if (!/^\S{1,512}$/.test(key)) return reply(400, { error: "bad_key" });
  if (typeof model !== "string" || model.length < 1 || model.length > 100) return reply(400, { error: "bad_model" });
  // "ollama-serwer" to Ollama na serwerze Sedno: adres zna tylko backend, konto musi mieć dostęp.
  const rawUrl = provider === SERVER_PROVIDER ? serverOllamaUrl() : body.base_url;
  if (provider === SERVER_PROVIDER && !(rawUrl && (await mayUseServer(user)))) return reply(403, { error: "no_server_access" });
  if (typeof rawUrl !== "string") return reply(400, { error: "bad_base_url" });
  let baseUrl: string;
  try {
    baseUrl = await checkUrl(user, rawUrl);
  } catch (e) {
    if (e instanceof UnsafeUrl) return reply(400, { error: "bad_base_url", reason: e.message });
    return reply(502, { error: "dns_failed" });
  }

  const cipher = await encryptKey(secret, rowId(user, provider), key);
  const last4 = key.slice(-4);
  const { error } = await admin.from("ai_credential").upsert({
    user_id: user,
    provider,
    base_url: baseUrl,
    model,
    key_cipher: cipher,
    key_last4: last4,
    updated_at: new Date().toISOString(),
  });
  if (error) return reply(500, { error: "server_error" });
  return reply(200, { ok: true, last4 });
}

/** Krótka rozmowa zapisanym kluczem: pokazuje, że klucz, adres i model działają. */
async function test(user: string, provider: string, secret: CryptoKey): Promise<Response> {
  const { data, error } = await admin.from("ai_credential").select("base_url, model, key_cipher").eq("user_id", user).eq("provider", provider).maybeSingle();
  if (error) return reply(500, { error: "server_error" });
  if (!data) return reply(404, { error: "no_key" });

  let key: string;
  let baseUrl: string;
  try {
    key = await decryptKey(secret, rowId(user, provider), data.key_cipher);
    baseUrl = await checkUrl(user, data.base_url);
  } catch {
    return reply(400, { error: "bad_credential" });
  }

  try {
    const out = await chat({ baseUrl, key, model: data.model }, { messages: [{ role: "user", content: "Odpowiedz jednym słowem: ok" }], maxTokens: 256, signal: AbortSignal.timeout(60_000) });
    return reply(200, { ok: true, reply: (out.text || out.reasoning).trim().slice(0, 80) });
  } catch (e) {
    if (e instanceof LlmError) return reply(200, { ok: false, status: e.status, detail: e.detail });
    return reply(200, { ok: false, status: 0 });
  }
}

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch {
    return reply(500, { error: "server_error" });
  }
});
