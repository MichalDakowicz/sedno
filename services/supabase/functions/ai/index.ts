// Bramka AI. Aplikacja nie ma własnego klucza: każde zapytanie idzie przez dostawcę zapisanego
// na koncie użytkownika (ai_credential). Konto wybiera dostawcę osobno dla zadań ważnych
// i lekkich (ai_routing), a każde wywołanie trafia do ai_usage, żeby porównać dostawców.
//
// POST { tier: "wazne" | "lekkie", messages, task?, provider?, stream?, max_tokens?, temperature? }
// stream=false → { text, provider, model, usage }
// stream=true  → text/event-stream: data: {"type":"text","delta":...} ... data: {"type":"done",...}

import { decryptKey, importSecret, rowId } from "../_shared/crypto.ts";
import { chat, chatStream, LlmError, type Message, type Provider } from "../_shared/llm.ts";
import { admin, checkUrl, cors, reply, takeToken, userId } from "../_shared/konto.ts";

const MAX_BODY = 256 * 1024;
const TIERS = new Set(["wazne", "lekkie"]);
const ROLES = new Set(["system", "user", "assistant"]);

type Route = { provider: string; model: string; reasoningEffort?: string; p: Provider };

async function resolve(user: string, tier: string, override: string | undefined): Promise<Route | Response> {
  let provider = override;
  let model: string | null = null;
  let reasoningEffort: string | undefined;
  if (!provider) {
    const { data } = await admin.from("ai_routing").select("provider, model, reasoning_effort").eq("user_id", user).eq("tier", tier).maybeSingle();
    provider = data?.provider;
    model = data?.model ?? null;
    reasoningEffort = data?.reasoning_effort ?? undefined;
  }
  let query = admin.from("ai_credential").select("provider, base_url, model, key_cipher").eq("user_id", user);
  if (provider) query = query.eq("provider", provider);
  const { data: creds, error } = await query.limit(2);
  if (error) return reply(500, { error: "server_error" });
  // Bez ustawionego routingu wystarczy, że konto ma dokładnie jednego dostawcę.
  if (!creds?.length || (!provider && creds.length > 1)) return reply(409, { error: "no_provider", tier });
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

function parseMessages(raw: unknown): Message[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 100) return null;
  const out: Message[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object" || !ROLES.has(m.role) || typeof m.content !== "string") return null;
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

async function log(row: Record<string, unknown>) {
  await admin.from("ai_usage").insert(row);
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const user = await userId(req);
  if (!user) return reply(401, { error: "not_signed_in" });

  const allowed = await takeToken(user, "ai", 30, 60);
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

  const tier = typeof body.tier === "string" ? body.tier : "lekkie";
  if (!TIERS.has(tier)) return reply(400, { error: "bad_tier" });
  const messages = parseMessages(body.messages);
  if (!messages) return reply(400, { error: "bad_messages" });
  const task = typeof body.task === "string" ? body.task.slice(0, 60) : null;
  const override = typeof body.provider === "string" ? body.provider : undefined;
  const maxTokens = typeof body.max_tokens === "number" ? Math.min(Math.max(1, body.max_tokens), 8192) : undefined;
  const temperature = typeof body.temperature === "number" ? body.temperature : undefined;

  const route = await resolve(user, tier, override);
  if (route instanceof Response) return route;

  const started = Date.now();
  const base = { user_id: user, tier, task, provider: route.provider, model: route.model };

  if (body.stream !== true) {
    try {
      const out = await chat(route.p, { messages, maxTokens, temperature, reasoningEffort: route.reasoningEffort });
      await log({ ...base, ok: true, status: 200, prompt_tokens: out.usage?.promptTokens, completion_tokens: out.usage?.completionTokens, duration_ms: Date.now() - started });
      return reply(200, { text: out.text, provider: route.provider, model: route.model, usage: out.usage });
    } catch (e) {
      const status = e instanceof LlmError ? e.status : 0;
      await log({ ...base, ok: false, status, duration_ms: Date.now() - started });
      // 424, nie 502: Cloudflare przed serwerem podmienia odpowiedzi 502 na własną stronę HTML bez CORS,
      // więc aplikacja nie widziała ani kodu, ani powodu błędu dostawcy.
      return reply(424, { error: "provider_failed", status, detail: e instanceof LlmError ? e.detail : undefined });
    }
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (data: unknown) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        for await (const ev of chatStream(route.p, { messages, maxTokens, temperature, reasoningEffort: route.reasoningEffort })) {
          if (ev.type === "text") send({ type: "text", delta: ev.delta });
          if (ev.type === "done") {
            await log({ ...base, ok: true, status: 200, prompt_tokens: ev.result.usage?.promptTokens, completion_tokens: ev.result.usage?.completionTokens, duration_ms: Date.now() - started });
            send({ type: "done", provider: route.provider, model: route.model, usage: ev.result.usage });
          }
        }
      } catch (e) {
        const status = e instanceof LlmError ? e.status : 0;
        await log({ ...base, ok: false, status, duration_ms: Date.now() - started });
        send({ type: "error", status, detail: e instanceof LlmError ? e.detail : undefined });
      }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch {
    return reply(500, { error: "server_error" });
  }
});
