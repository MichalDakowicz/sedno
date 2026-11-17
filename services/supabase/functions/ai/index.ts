// Bramka AI. Aplikacja nie ma własnego klucza: każde zapytanie idzie przez dostawcę zapisanego
// na koncie użytkownika (ai_credential). Konto wybiera dostawcę osobno dla zadań ważnych
// i lekkich (ai_routing), a każde wywołanie trafia do ai_usage, żeby porównać dostawców.
//
// POST { tier: "wazne" | "lekkie", messages, task?, provider?, stream?, max_tokens?, temperature? }
// stream=false → { text, provider, model, usage }
// stream=true  → text/event-stream: data: {"type":"text","delta":...} ... data: {"type":"done",...}

import { logAiUsage, resolveAi } from "../_shared/ai-route.ts";
import { readJsonObject } from "../_shared/http.ts";
import { chat, chatStream, LlmError, type Message } from "../_shared/llm.ts";
import { cors, reply, takeToken, userId } from "../_shared/konto.ts";

const MAX_BODY = 256 * 1024;
const TIERS = new Set(["wazne", "lekkie"]);
const ROLES = new Set(["system", "user", "assistant"]);

function parseMessages(raw: unknown): Message[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 100) return null;
  const out: Message[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object" || !ROLES.has(m.role) || typeof m.content !== "string") return null;
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const user = await userId(req);
  if (!user) return reply(401, { error: "not_signed_in" });

  const allowed = await takeToken(user, "ai", 30, 60);
  if (allowed === null) return reply(500, { error: "server_error" });
  if (!allowed) return reply(429, { error: "rate_limited" });

  const parsed = await readJsonObject(req, MAX_BODY);
  if ("error" in parsed) return reply(parsed.status, { error: parsed.error });
  const body = parsed.data;

  const tier = typeof body.tier === "string" ? body.tier : "lekkie";
  if (!TIERS.has(tier)) return reply(400, { error: "bad_tier" });
  const messages = parseMessages(body.messages);
  if (!messages) return reply(400, { error: "bad_messages" });
  const task = typeof body.task === "string" ? body.task.slice(0, 60) : null;
  const override = typeof body.provider === "string" ? body.provider : undefined;
  const maxTokens = typeof body.max_tokens === "number" ? Math.min(Math.max(1, body.max_tokens), 8192) : undefined;
  const temperature = typeof body.temperature === "number" ? body.temperature : undefined;

  const route = await resolveAi(user, tier, override);
  if (route instanceof Response) return route;

  const started = Date.now();
  const base = { user_id: user, tier, task, provider: route.provider, model: route.model };

  if (body.stream !== true) {
    try {
      const signal = AbortSignal.any([req.signal, AbortSignal.timeout(120_000)]);
      const out = await chat(route.p, { messages, maxTokens, temperature, reasoningEffort: route.reasoningEffort, signal });
      await logAiUsage({ ...base, ok: true, status: 200, prompt_tokens: out.usage?.promptTokens, completion_tokens: out.usage?.completionTokens, duration_ms: Date.now() - started });
      return reply(200, { text: out.text, provider: route.provider, model: route.model, usage: out.usage });
    } catch (e) {
      const status = req.signal.aborted ? 499 : e instanceof LlmError ? e.status : 0;
      await logAiUsage({ ...base, ok: false, status, duration_ms: Date.now() - started });
      // 424, nie 502: Cloudflare przed serwerem podmienia odpowiedzi 502 na własną stronę HTML bez CORS,
      // więc aplikacja nie widziała ani kodu, ani powodu błędu dostawcy.
      return reply(424, { error: "provider_failed", status, detail: e instanceof LlmError ? e.detail : undefined });
    }
  }

  const enc = new TextEncoder();
  const cancel = new AbortController();
  const signal = AbortSignal.any([req.signal, cancel.signal, AbortSignal.timeout(120_000)]);
  const events = chatStream(route.p, { messages, maxTokens, temperature, reasoningEffort: route.reasoningEffort, signal });
  let logged = false;
  async function finish(fields: Record<string, unknown>) {
    if (logged) return;
    logged = true;
    await logAiUsage({ ...base, ...fields, duration_ms: Date.now() - started });
  }

  const stream = new ReadableStream({
    async pull(ctrl) {
      const send = (data: unknown) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        for (;;) {
          const next = await events.next();
          if (cancel.signal.aborted) return;
          if (next.done) throw new LlmError(502, "empty stream");
          const ev = next.value;
          if (ev.type === "text") {
            send({ type: "text", delta: ev.delta });
            return;
          }
          if (ev.type !== "done") continue;
          const { usage } = ev.result;
          await finish({ ok: true, status: 200, prompt_tokens: usage?.promptTokens, completion_tokens: usage?.completionTokens });
          if (cancel.signal.aborted) return;
          send({ type: "done", provider: route.provider, model: route.model, usage });
          break;
        }
      } catch (e) {
        if (cancel.signal.aborted) return;
        const status = req.signal.aborted ? 499 : e instanceof LlmError ? e.status : 0;
        await finish({ ok: false, status });
        if (cancel.signal.aborted) return;
        send({ type: "error", status, detail: e instanceof LlmError ? e.detail : undefined });
      }
      ctrl.close();
    },
    async cancel() {
      cancel.abort();
      await Promise.allSettled([events.return(undefined), finish({ ok: false, status: 499 })]);
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
