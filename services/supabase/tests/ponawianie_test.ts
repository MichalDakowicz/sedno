import assert from "node:assert/strict";
import { domyslnaTrasa } from "../functions/_shared/ai-default.ts";
import { LlmError } from "../functions/_shared/llm.ts";
import { chatRetry, streamRetry } from "../functions/_shared/llm-retry.ts";

const route = { p: { baseUrl: "https://a.test/v1", key: "k", model: "sol" } };
const lekka = { p: { baseUrl: "https://a.test/v1", key: "k", model: "luna" } };
const req = { messages: [{ role: "user" as const, content: "hej" }] };
const opts = { delayMs: 1 };

const ok = () => Response.json({ choices: [{ message: { content: "cześć" }, finish_reason: "stop" }] });
const blad = (status: number) => Response.json({ error: { message: "x" } }, { status });
const sse = (...chunks: string[]) =>
  new Response(chunks.join(""), { headers: { "Content-Type": "text/event-stream" } });
const delta = (t: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`;

function fake(...odpowiedzi: Array<() => Response | Promise<Response>>) {
  const wywolania: string[] = [];
  const f = ((_url: string, init: RequestInit) => {
    wywolania.push(JSON.parse(init.body as string).model);
    const next = odpowiedzi.shift();
    if (!next) throw new Error("za dużo zapytań");
    return Promise.resolve(next());
  }) as unknown as typeof fetch;
  return { f, wywolania };
}

async function zbierz(g: AsyncGenerator<{ type: string }>) {
  const typy: string[] = [];
  for await (const ev of g) typy.push(ev.type);
  return typy;
}

Deno.test("Po błędzie 500 zapytanie jest ponawiane na tej samej trasie", async () => {
  const { f, wywolania } = fake(() => blad(500), ok);
  const out = await chatRetry(route, req, { ...opts, fetchImpl: f });
  assert.equal(out.text, "cześć");
  assert.deepEqual(wywolania, ["sol", "sol"]);
});

Deno.test("Błąd sieci (TypeError) też jest ponawiany", async () => {
  const { f } = fake(() => Promise.reject(new TypeError("network")) as unknown as Response, ok);
  assert.equal((await chatRetry(route, req, { ...opts, fetchImpl: f })).text, "cześć");
});

Deno.test("Błąd 400 nie jest ponawiany", async () => {
  const { f, wywolania } = fake(() => blad(400), ok);
  await assert.rejects(chatRetry(route, req, { ...opts, fetchImpl: f, fallback: async () => lekka }), (e) => e instanceof LlmError && e.status === 400);
  assert.equal(wywolania.length, 1);
});

Deno.test("Po dwóch błędach próbuje drugiego poziomu, a gdy ten sam model, nie", async () => {
  const a = fake(() => blad(503), () => blad(503), ok);
  assert.equal((await chatRetry(route, req, { ...opts, fetchImpl: a.f, fallback: async () => lekka })).text, "cześć");
  assert.deepEqual(a.wywolania, ["sol", "sol", "luna"]);

  const b = fake(() => blad(503), () => blad(503), ok);
  await assert.rejects(chatRetry(route, req, { ...opts, fetchImpl: b.f, fallback: async () => route }), (e) => e instanceof LlmError && e.status === 503);
  assert.equal(b.wywolania.length, 2);
});

Deno.test("Przerwany sygnał wywołującego wyłącza ponawianie", async () => {
  const ctrl = new AbortController();
  const { f, wywolania } = fake(() => (ctrl.abort(), blad(500)), ok);
  await assert.rejects(chatRetry(route, { ...req, signal: ctrl.signal }, { ...opts, fetchImpl: f }));
  assert.equal(wywolania.length, 1);
});

Deno.test("Strumień jest ponawiany przed pierwszym fragmentem", async () => {
  const { f, wywolania } = fake(() => blad(502), () => sse(delta("a"), "data: [DONE]\n\n"));
  const typy = await zbierz(streamRetry(route, req, { ...opts, fetchImpl: f }));
  assert.deepEqual(typy, ["text", "done"]);
  assert.equal(wywolania.length, 2);
});

Deno.test("Strumień nie jest ponawiany po pierwszym fragmencie", async () => {
  const { f, wywolania } = fake(() => sse(delta("a"), `data: ${JSON.stringify({ error: { message: "x" } })}\n\n`), () => sse(delta("b"), "data: [DONE]\n\n"));
  const typy: string[] = [];
  await assert.rejects(async () => {
    for await (const ev of streamRetry(route, req, { ...opts, fetchImpl: f })) typy.push(ev.type);
  }, (e) => e instanceof LlmError);
  assert.deepEqual(typy, ["text"]);
  assert.equal(wywolania.length, 1);
});

Deno.test("Domyślna trasa serwera: model per poziom, adres domyślny, brak konfiguracji = null", () => {
  const env = (m: Record<string, string>) => (n: string) => m[n];
  const pelne = env({ SEDNO_AI_KEY: "k", SEDNO_AI_MODEL_WAZNE: "sol", SEDNO_AI_MODEL_LEKKIE: "luna", SEDNO_AI_EFFORT_LEKKIE: "low" });
  const wazne = domyslnaTrasa("wazne", pelne)!;
  assert.deepEqual([wazne.provider, wazne.p.model, wazne.p.baseUrl, wazne.reasoningEffort], ["sedno", "sol", "https://api.openai.com/v1", undefined]);
  assert.equal(domyslnaTrasa("lekkie", pelne)!.reasoningEffort, "low");
  assert.equal(domyslnaTrasa("lekkie", env({ SEDNO_AI_KEY: "k", SEDNO_AI_BASE_URL: "https://x.test/v1/", SEDNO_AI_MODEL_LEKKIE: "m" }))!.p.baseUrl, "https://x.test/v1");
  assert.equal(domyslnaTrasa("wazne", env({ SEDNO_AI_KEY: "k", SEDNO_AI_MODEL_LEKKIE: "m" })), null);
  assert.equal(domyslnaTrasa("lekkie", env({ SEDNO_AI_MODEL_LEKKIE: "m" })), null);
});
