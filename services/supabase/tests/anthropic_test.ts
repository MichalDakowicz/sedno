import assert from "node:assert/strict";
import { chat, chatStream, LlmError, type StreamEvent } from "../functions/_shared/llm.ts";
import { requestParams, supportsWebSearch, toNative } from "../functions/_shared/llm-anthropic.ts";
import { chatRetry } from "../functions/_shared/llm-retry.ts";
import { opisKartyZrodla, zrodlaZSieci } from "../functions/_shared/pestka-odpowiedz.ts";

const sonnet = { baseUrl: "https://api.anthropic.com/v1", key: "sk-tajny", model: "claude-sonnet-5-5" };
const haiku = { ...sonnet, model: "claude-haiku-5-5" };
const req = { messages: [{ role: "system" as const, content: "Jesteś Pestką." }, { role: "user" as const, content: "Kto wygrał wczoraj?" }] };

const usage = (input: number, output: number) => ({
  input_tokens: input, output_tokens: output, cache_creation_input_tokens: null, cache_read_input_tokens: null,
  server_tool_use: null, service_tier: null,
});
const wiadomosc = (content: unknown[], stop_reason: string, u = usage(10, 5)) => ({
  id: "msg_1", type: "message", role: "assistant", model: "claude-sonnet-5-5", content, stop_reason, stop_sequence: null, usage: u,
});
const sse = (...zdarzenia: Record<string, unknown>[]) =>
  new Response(zdarzenia.map((z) => `event: ${z.type}\ndata: ${JSON.stringify(z)}\n\n`).join(""), {
    headers: { "Content-Type": "text/event-stream" },
  });

const szukanie = { type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: { query: "mecz" } };
const wyniki = {
  type: "web_search_tool_result", tool_use_id: "srvtoolu_1",
  content: [
    { type: "web_search_result", url: "https://sport.example.pl/mecz", title: "Relacja z meczu", encrypted_content: "x", page_age: null },
    { type: "web_search_result", url: "https://www.inny.example.com/a", title: "Inny serwis", encrypted_content: "y", page_age: null },
  ],
};
const cytat = { type: "web_search_result_location", url: "https://sport.example.pl/mecz", title: "Relacja z meczu", cited_text: "2:1", encrypted_index: "e" };

function fake(...odpowiedzi: Array<() => Response>) {
  const zapytania: { url: string; body: Record<string, unknown>; headers: Headers }[] = [];
  const f = ((input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    zapytania.push({ url, body: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) });
    const next = odpowiedzi.shift();
    if (!next) throw new Error("za dużo zapytań");
    return Promise.resolve(next());
  }) as typeof fetch;
  return { f, zapytania };
}

async function zbierz(g: AsyncGenerator<StreamEvent>) {
  const tekst: string[] = [];
  let done: Extract<StreamEvent, { type: "done" }> | undefined;
  for await (const ev of g) {
    if (ev.type === "text") tekst.push(ev.delta);
    if (ev.type === "done") done = ev;
  }
  return { tekst, wynik: done!.result };
}

Deno.test("Trasa api.anthropic.com idzie natywnym Messages API: strumień tekstu, usage i parametry Sonnet 5.5", async () => {
  const { f, zapytania } = fake(() => sse(
    { type: "message_start", message: wiadomosc([], null as unknown as string, usage(42, 0)) },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "", citations: null } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Cześć" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: ", uczniu!" } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 7 } },
    { type: "message_stop" },
  ));
  const { tekst, wynik } = await zbierz(chatStream(sonnet, { ...req, temperature: 0.2, reasoningEffort: "high" }, f));
  assert.deepEqual(tekst, ["Cześć", ", uczniu!"]);
  assert.equal(wynik.text, "Cześć, uczniu!");
  assert.equal(wynik.finishReason, "stop");
  assert.deepEqual(wynik.usage, { promptTokens: 42, completionTokens: 7 });
  assert.equal(wynik.webSources, undefined);

  const [z] = zapytania;
  assert.equal(z!.url, "https://api.anthropic.com/v1/messages");
  assert.equal(z!.headers.get("authorization"), "Bearer sk-tajny");
  assert.equal(z!.body.system, "Jesteś Pestką.");
  assert.deepEqual(z!.body.messages, [{ role: "user", content: "Kto wygrał wczoraj?" }]);
  assert.deepEqual(z!.body.output_config, { effort: "high" });
  assert.deepEqual(z!.body.tools, [{ type: "web_search_20260209", name: "web_search" }]);
  assert.equal(z!.body.stream, true);
  for (const pole of ["temperature", "top_p", "thinking", "tool_choice"]) assert.equal(pole in z!.body, false, pole);
});

Deno.test("Wyszukiwanie w sieci: Haiku bez narzędzia, przełącznik SEDNO_AI_WEB_SEARCH=0 i webSearch: false je wyłączają", () => {
  const env = (wartosc?: string) => (n: string) => (n === "SEDNO_AI_WEB_SEARCH" ? wartosc : undefined);
  assert.equal(requestParams(haiku, req, env()).tools, undefined);
  assert.equal(requestParams(sonnet, req, env("0")).tools, undefined);
  assert.equal(requestParams(sonnet, { ...req, webSearch: false }, env()).tools, undefined);
  assert.deepEqual(requestParams(sonnet, req, env("1")).tools, [{ type: "web_search_20260209", name: "web_search" }]);
  for (const m of ["claude-sonnet-5", "claude-opus-4-6", "claude-opus-5-5", "claude-fable-5-2"]) assert.ok(supportsWebSearch(m), m);
  for (const m of ["claude-haiku-5-5", "claude-haiku-4-5", "claude-sonnet-4-5", "gpt-5"]) assert.ok(!supportsWebSearch(m), m);
});

Deno.test("Wysiłek none przechodzi na low, mały limit tokenów dostaje zapas na myślenie", () => {
  const env = () => undefined;
  const p = requestParams(sonnet, { ...req, reasoningEffort: "none", maxTokens: 64 }, env);
  assert.deepEqual(p.output_config, { effort: "low" });
  assert.equal(p.max_tokens, 1024);
  assert.equal(requestParams(sonnet, { ...req, reasoningEffort: "dziwny" }, env).output_config, undefined);
});

Deno.test("Historia: powitanie Pestki na początku trafia do instrukcji, końcowy prefill znika, obraz i narzędzia mapują się", () => {
  const { system, messages } = toNative([
    { role: "system", content: "Instrukcja." },
    { role: "assistant", content: "Cześć, jestem Pestka." },
    { role: "user", content: [{ type: "text", text: "Co tu jest?" }, { type: "image_url", image_url: { url: "data:image/png;base64,QUJD" } }] },
    { role: "assistant", content: null, tool_calls: [{ id: "t1", type: "function", function: { name: "licz", arguments: '{"a":1}' } }] },
    { role: "tool", tool_call_id: "t1", content: "2" },
    { role: "assistant", content: "Zaczynam od" },
  ]);
  assert.equal(system, "Instrukcja.\n\nRozmowę otworzyła twoja wiadomość:\nCześć, jestem Pestka.");
  assert.deepEqual(messages, [
    { role: "user", content: [{ type: "text", text: "Co tu jest?" }, { type: "image", source: { type: "base64", media_type: "image/png", data: "QUJD" } }] },
    { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "licz", input: { a: 1 } }] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "2" }] },
  ]);
});

Deno.test("pause_turn: zapytanie jest wznawiane z treścią asystenta, tekst i usage się sumują", async () => {
  const pierwsza = [{ type: "text", text: "Sprawdzam. ", citations: null }, szukanie, wyniki];
  const { f, zapytania } = fake(
    () => Response.json(wiadomosc(pierwsza, "pause_turn", usage(100, 20))),
    () => Response.json(wiadomosc([{ type: "text", text: "Wygrali 2:1.", citations: [cytat] }], "end_turn", usage(300, 30))),
  );
  const out = await chat(sonnet, req, f);
  assert.equal(out.text, "Sprawdzam. Wygrali 2:1.");
  assert.deepEqual(out.usage, { promptTokens: 400, completionTokens: 50 });
  assert.equal(zapytania.length, 2);
  const druga = zapytania[1]!.body.messages as unknown[];
  assert.deepEqual(druga.slice(0, -1), zapytania[0]!.body.messages);
  assert.deepEqual(druga.at(-1), { role: "assistant", content: pierwsza });
  assert.deepEqual(out.webSources, [{ url: "https://sport.example.pl/mecz", title: "Relacja z meczu" }]);
});

Deno.test("Strumień z wyszukiwaniem: cytowania z citations_delta stają się źródłami", async () => {
  const { f } = fake(() => sse(
    { type: "message_start", message: wiadomosc([], null as unknown as string, usage(50, 0)) },
    { type: "content_block_start", index: 0, content_block: { ...szukanie, input: {} } },
    { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"query":"mecz"}' } },
    { type: "content_block_stop", index: 0 },
    { type: "content_block_start", index: 1, content_block: wyniki },
    { type: "content_block_stop", index: 1 },
    { type: "content_block_start", index: 2, content_block: { type: "text", text: "", citations: null } },
    { type: "content_block_delta", index: 2, delta: { type: "citations_delta", citation: cytat } },
    { type: "content_block_delta", index: 2, delta: { type: "text_delta", text: "Wygrali 2:1." } },
    { type: "content_block_stop", index: 2 },
    { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 9 } },
    { type: "message_stop" },
  ));
  const { tekst, wynik } = await zbierz(chatStream(sonnet, req, f));
  assert.deepEqual(tekst, ["Wygrali 2:1."]);
  assert.deepEqual(wynik.webSources, [{ url: "https://sport.example.pl/mecz", title: "Relacja z meczu" }]);
});

Deno.test("Strumień: pause_turn wznawia strumień i dokleja dalszy tekst", async () => {
  const start = { type: "message_start", message: wiadomosc([], null as unknown as string, usage(10, 0)) };
  const koniec = (stop: string) => [
    { type: "message_delta", delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 3 } },
    { type: "message_stop" },
  ];
  const { f, zapytania } = fake(
    () => sse(start,
      { type: "content_block_start", index: 0, content_block: { ...szukanie, input: {} } },
      { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"query":"mecz"}' } },
      { type: "content_block_stop", index: 0 }, ...koniec("pause_turn")),
    () => sse(start,
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "", citations: null } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Gotowe." } },
      { type: "content_block_stop", index: 0 }, ...koniec("end_turn")),
  );
  const { tekst, wynik } = await zbierz(chatStream(sonnet, req, f));
  assert.deepEqual(tekst, ["Gotowe."]);
  assert.deepEqual(wynik.usage, { promptTokens: 20, completionTokens: 6 });
  assert.deepEqual((zapytania[1]!.body.messages as unknown[]).at(-1), { role: "assistant", content: [szukanie] });
});

Deno.test("Błąd wyszukiwania w web_search_tool_result nie wywraca odpowiedzi", async () => {
  const blad = { type: "web_search_tool_result", tool_use_id: "srvtoolu_1", content: { type: "web_search_tool_result_error", error_code: "unavailable" } };
  const { f } = fake(() => Response.json(wiadomosc([szukanie, blad, { type: "text", text: "Nie udało się sprawdzić w sieci.", citations: null }], "end_turn")));
  const out = await chat(sonnet, req, f);
  assert.equal(out.text, "Nie udało się sprawdzić w sieci.");
  assert.equal(out.webSources, undefined);
});

Deno.test("Bez cytowań, ale po wyszukiwaniu: źródłami są znalezione strony", async () => {
  const { f } = fake(() => Response.json(wiadomosc([szukanie, wyniki, { type: "text", text: "Wynik 2:1.", citations: null }], "end_turn")));
  const out = await chat(sonnet, req, f);
  assert.deepEqual(out.webSources?.map((s) => s.url), ["https://sport.example.pl/mecz", "https://www.inny.example.com/a"]);
});

Deno.test("Błąd dostawcy: status zostaje, klucz jest zamazany, 529 jest ponawiane", async () => {
  const przeciazony = () => Response.json({ type: "error", error: { type: "overloaded_error", message: "Overloaded sk-tajny" } }, { status: 529 });
  const zly = fake(() => Response.json({ type: "error", error: { type: "invalid_request_error", message: "zły sk-tajny" } }, { status: 400 }));
  await assert.rejects(chat(sonnet, req, zly.f), (e) => e instanceof LlmError && e.status === 400 && e.upstream && e.detail === "zły [key]");

  const { f, zapytania } = fake(przeciazony, () => Response.json(wiadomosc([{ type: "text", text: "ok", citations: null }], "end_turn")));
  const out = await chatRetry({ p: sonnet }, req, { fetchImpl: f, delayMs: 1 });
  assert.equal(out.text, "ok");
  assert.equal(zapytania.length, 2);
});

Deno.test("Inny dostawca dalej idzie ścieżką zgodną z OpenAI", async () => {
  const { f, zapytania } = fake(() => Response.json({ choices: [{ message: { content: "hej" }, finish_reason: "stop" }] }));
  const out = await chat({ baseUrl: "https://api.openai.com/v1", key: "k", model: "gpt-5" }, req, f);
  assert.equal(out.text, "hej");
  assert.equal(zapytania[0]!.url, "https://api.openai.com/v1/chat/completions");
});

Deno.test("Strony z sieci jako źródła Pestki: rodzaj internet, nazwa serwisu, tylko https", () => {
  const zrodla = zrodlaZSieci([
    { url: "https://www.sport.example.pl/mecz", title: "Relacja z meczu" },
    { url: "http://niezabezpieczona.example.pl/", title: "Stara strona" },
    { url: "nie-adres", title: "Zły" },
  ]);
  assert.deepEqual(zrodla, [{ url: "https://www.sport.example.pl/mecz", tytul: "Relacja z meczu", rodzaj: "internet", miejsce: "sport.example.pl" }]);
  assert.deepEqual(opisKartyZrodla(zrodla[0]!), { link: "Relacja z meczu · strona w sieci", miejsce: "sport.example.pl" });
  assert.deepEqual(zrodlaZSieci(undefined), []);
});
