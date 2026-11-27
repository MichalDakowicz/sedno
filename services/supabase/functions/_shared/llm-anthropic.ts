// Natywne Messages API Anthropic dla tras z adresem api.anthropic.com. Warstwa zgodności z OpenAI
// po stronie Anthropic przyjmuje tylko narzędzia-funkcje (bez wyszukiwania w sieci) i pomija
// reasoning_effort, więc tu idziemy przez oficjalne SDK. Na zewnątrz ten sam kontrakt co llm.ts.
import Anthropic from "npm:@anthropic-ai/sdk@1.8.0";
import { type ChatRequest, type ChatResult, LlmError, type Message, type Provider, type StreamEvent, type ToolCall, type WebSource } from "./llm.ts";

type Fetch = typeof fetch;
type Env = (name: string) => string | undefined;
const denoEnv: Env = (n) => Deno.env.get(n);

const DEFAULT_TIMEOUT_MS = 120_000;
// Sonnet 5.5 myśli zawsze, a myślenie liczy się do max_tokens: przy bardzo małym limicie zostałaby pusta odpowiedź.
const MIN_TOKENS = 1024;
const DEFAULT_TOKENS = 16_000;
// pause_turn: serwer przerwał długą pętlę narzędzi serwera; wznawiamy, ale nie bez końca.
const MAX_CONTINUATIONS = 5;
const MAX_SOURCES = 8;
const EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);

export function isAnthropic(p: Provider): boolean {
  try {
    return new URL(p.baseUrl).hostname === "api.anthropic.com";
  } catch {
    return false;
  }
}

/** Modele z narzędziem web_search_20260209; Haiku go nie dostaje. */
export function supportsWebSearch(model: string): boolean {
  const m = model.toLowerCase();
  if (m.includes("haiku")) return false;
  return /claude-(?:sonnet-5|sonnet-4-6|opus-4-[6-9]|opus-5|fable|mythos)/.test(m);
}

export function webSearchOn(req: ChatRequest, model: string, env: Env = denoEnv): boolean {
  return req.webSearch !== false && env("SEDNO_AI_WEB_SEARCH") !== "0" && supportsWebSearch(model);
}

// none/minimal z ustawień konta nie mają odpowiednika: najniższy poziom wysiłku.
function effortOf(raw: string | undefined): Anthropic.Messages.OutputConfig["effort"] | undefined {
  if (!raw) return undefined;
  if (raw === "none" || raw === "minimal") return "low";
  return EFFORTS.has(raw) ? raw as Anthropic.Messages.OutputConfig["effort"] : undefined;
}

function imageOf(url: string): Anthropic.Messages.ImageBlockParam | null {
  const data = /^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/s.exec(url);
  if (data) return { type: "image", source: { type: "base64", media_type: data[1] as "image/png", data: data[2]! } };
  return /^https:\/\//.test(url) ? { type: "image", source: { type: "url", url } } : null;
}

function parseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

/** Format czatu OpenAI → system + messages Messages API. */
export function toNative(messages: Message[]): { system: string; messages: Anthropic.Messages.MessageParam[] } {
  const system: string[] = [];
  const out: Anthropic.Messages.MessageParam[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      system.push(m.content);
    } else if (m.role === "user") {
      if (typeof m.content === "string") {
        out.push({ role: "user", content: m.content });
      } else {
        const content = m.content.flatMap((part): Anthropic.Messages.ContentBlockParam[] => {
          if (part.type === "text") return [{ type: "text", text: part.text }];
          const img = imageOf(part.image_url.url);
          return img ? [img] : [];
        });
        out.push({ role: "user", content });
      }
    } else if (m.role === "assistant") {
      const content: Anthropic.Messages.ContentBlockParam[] = [];
      if (m.content) content.push({ type: "text", text: m.content });
      for (const c of m.tool_calls ?? []) content.push({ type: "tool_use", id: c.id, name: c.function.name, input: parseArgs(c.function.arguments) });
      if (content.length) out.push({ role: "assistant", content });
    } else {
      out.push({ role: "user", content: [{ type: "tool_result", tool_use_id: m.tool_call_id, content: m.content }] });
    }
  }
  // Messages API zaczyna od wiadomości ucznia. Powitanie Pestki na początku historii idzie do instrukcji.
  while (out[0]?.role === "assistant") {
    const first = out.shift()!;
    const text = typeof first.content === "string" ? first.content
      : first.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
    if (text) system.push(`Rozmowę otworzyła twoja wiadomość:\n${text}`);
  }
  // Wiadomość asystenta na końcu byłaby prefillem, którego nowe modele nie przyjmują.
  while (out.at(-1)?.role === "assistant") out.pop();
  return { system: system.join("\n\n"), messages: out };
}

export function requestParams(p: Provider, req: ChatRequest, env: Env = denoEnv): Anthropic.Messages.MessageCreateParamsNonStreaming {
  const { system, messages } = toNative(req.messages);
  if (!messages.length) throw new LlmError(400, "no user message");
  const tools: Anthropic.Messages.ToolUnion[] = (req.tools ?? []).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Messages.Tool["input_schema"],
  }));
  if (webSearchOn(req, p.model, env)) tools.push({ type: "web_search_20260209", name: "web_search" });
  const effort = effortOf(req.reasoningEffort);
  // Bez temperature, thinking i wymuszonego tool_choice: Sonnet 5.5 odrzuca je kodem 400.
  return {
    model: p.model,
    max_tokens: Math.max(req.maxTokens ?? DEFAULT_TOKENS, MIN_TOKENS),
    messages,
    ...(system && { system }),
    ...(tools.length && { tools }),
    ...(effort && { output_config: { effort } }),
  };
}

function client(p: Provider, fetchImpl: Fetch): Anthropic {
  return new Anthropic({
    apiKey: p.key,
    baseURL: new URL(p.baseUrl).origin,
    // Ponowienia robi llm-retry.ts, z trasą zapasową.
    maxRetries: 0,
    fetch: fetchImpl,
    // Dostawca nie może przekierować klucza na inny host.
    fetchOptions: { redirect: "error" },
  });
}

function mapError(e: unknown, key: string): unknown {
  if (e instanceof LlmError || e instanceof Anthropic.APIUserAbortError) return e;
  if (e instanceof Anthropic.APIConnectionError) return new LlmError(0, "network error", true);
  if (e instanceof Anthropic.APIError) {
    const body = e.error as { error?: { message?: unknown } } | undefined;
    const message = typeof body?.error?.message === "string" ? body.error.message : e.message;
    // Błąd w trakcie strumienia (np. overloaded) nie ma statusu HTTP.
    return new LlmError(e.status ?? 502, String(message).replaceAll(key, "[key]").slice(0, 200), true);
  }
  if (e instanceof Anthropic.AnthropicError) return new LlmError(502, "incomplete stream");
  if (e instanceof TypeError) return new LlmError(0, "network error", true);
  return e;
}

const FINISH: Record<string, string> = { end_turn: "stop", stop_sequence: "stop", max_tokens: "length", tool_use: "tool_calls" };

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Strony, na które powołuje się odpowiedź; gdy model nic nie zacytował, a szukał, pierwsze znalezione wyniki. */
export function webSourcesOf(content: Anthropic.Messages.ContentBlock[]): WebSource[] {
  const found = new Map<string, string>();
  const cited = new Map<string, string>();
  for (const block of content) {
    if (block.type === "web_search_tool_result") {
      // Błąd wyszukiwania przychodzi jako obiekt zamiast listy; model sam o nim pisze, my go pomijamy.
      if (!Array.isArray(block.content)) continue;
      for (const r of block.content) if (r.url && !found.has(r.url)) found.set(r.url, r.title);
    } else if (block.type === "text") {
      for (const c of block.citations ?? []) {
        if (c.type === "web_search_result_location" && c.url && !cited.has(c.url)) cited.set(c.url, c.title ?? found.get(c.url) ?? "");
      }
    }
  }
  const pick = cited.size ? cited : new Map([...found].slice(0, 5));
  return [...pick].slice(0, MAX_SOURCES).map(([url, title]) => ({ url, title: title || found.get(url) || hostOf(url) }));
}

function resultOf(turns: Anthropic.Messages.Message[]): ChatResult {
  const content = turns.flatMap((t) => t.content);
  const text = content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const reasoning = content.flatMap((b) => (b.type === "thinking" ? [b.thinking] : [])).join("");
  const toolCalls: ToolCall[] = content.flatMap((b) => {
    if (b.type !== "tool_use") return [];
    const input = b.input && typeof b.input === "object" && !Array.isArray(b.input) ? b.input as Record<string, unknown> : null;
    return [{ id: b.id, name: b.name, arguments: input, rawArguments: JSON.stringify(b.input ?? {}) }];
  });
  if (!text.trim() && !toolCalls.length) throw new LlmError(502, "empty answer");
  const last = turns.at(-1)!;
  const usage = turns.reduce((sum, t) => ({
    promptTokens: sum.promptTokens + t.usage.input_tokens + (t.usage.cache_creation_input_tokens ?? 0) + (t.usage.cache_read_input_tokens ?? 0),
    completionTokens: sum.completionTokens + t.usage.output_tokens,
  }), { promptTokens: 0, completionTokens: 0 });
  const webSources = webSourcesOf(content);
  return {
    text,
    reasoning,
    toolCalls,
    finishReason: last.stop_reason ? FINISH[last.stop_reason] ?? last.stop_reason : null,
    usage,
    ...(webSources.length && { webSources }),
  };
}

// pause_turn: odsyłamy treść asystenta bez nowej wiadomości ucznia, serwer wznawia od miejsca przerwania.
const continued = (params: Anthropic.Messages.MessageCreateParamsNonStreaming, msg: Anthropic.Messages.Message) => ({
  ...params,
  messages: [...params.messages, { role: "assistant" as const, content: msg.content }],
});

export async function chatAnthropic(p: Provider, req: ChatRequest, fetchImpl: Fetch = fetch, env: Env = denoEnv): Promise<ChatResult> {
  const c = client(p, fetchImpl);
  let params = requestParams(p, req, env);
  const signal = req.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const turns: Anthropic.Messages.Message[] = [];
  try {
    for (let i = 0; ; i++) {
      const msg = await c.messages.create(params, { signal });
      turns.push(msg);
      if (msg.stop_reason !== "pause_turn" || i >= MAX_CONTINUATIONS) break;
      params = continued(params, msg);
    }
  } catch (e) {
    throw mapError(e, p.key);
  }
  return resultOf(turns);
}

export async function* chatStreamAnthropic(p: Provider, req: ChatRequest, fetchImpl: Fetch = fetch, env: Env = denoEnv): AsyncGenerator<StreamEvent> {
  const c = client(p, fetchImpl);
  let params = requestParams(p, req, env);
  const signal = req.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const turns: Anthropic.Messages.Message[] = [];
  for (let i = 0; ; i++) {
    let msg: Anthropic.Messages.Message;
    try {
      const stream = c.messages.stream(params, { signal });
      for await (const ev of stream) {
        if (ev.type !== "content_block_delta") continue;
        if (ev.delta.type === "text_delta" && ev.delta.text) yield { type: "text", delta: ev.delta.text };
        else if (ev.delta.type === "thinking_delta" && ev.delta.thinking) yield { type: "reasoning", delta: ev.delta.thinking };
      }
      msg = await stream.finalMessage();
    } catch (e) {
      throw mapError(e, p.key);
    }
    turns.push(msg);
    if (msg.stop_reason !== "pause_turn" || i >= MAX_CONTINUATIONS) break;
    params = continued(params, msg);
  }
  yield { type: "done", result: resultOf(turns) };
}
