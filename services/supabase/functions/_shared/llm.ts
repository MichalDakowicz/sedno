// OpenAI-compatible chat adapter: one code path for Gemini, OpenRouter, Groq and Ollama (they
// all speak /chat/completions with a base URL, a key and a model). Supports tool calls and
// streaming. A key never appears in an error: provider messages are redacted and shortened.

export type Message =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: WireToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface WireToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
  /** Provider extras that must come back with the call (Gemini 3 thought signatures). */
  extra_content?: unknown;
}

export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema of the arguments object. */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  /** Null when the model sent arguments that are not a JSON object. */
  arguments: Record<string, unknown> | null;
  rawArguments: string;
  /** Echoed back with the call; see WireToolCall. */
  extra?: unknown;
}

export interface Provider {
  baseUrl: string;
  key: string;
  model: string;
}

export interface ChatRequest {
  messages: Message[];
  tools?: ToolSpec[];
  maxTokens?: number;
  temperature?: number;
  /** reasoning_effort modeli z rozumowaniem (none, low, medium, high, xhigh); bez tego model myśli domyślnie. */
  reasoningEffort?: string;
  signal?: AbortSignal;
}

export interface ChatResult {
  text: string;
  /** What a thinking model said before answering; shown nowhere by default. */
  reasoning: string;
  toolCalls: ToolCall[];
  finishReason: string | null;
  usage: { promptTokens: number; completionTokens: number } | null;
}

export type StreamEvent = { type: "text" | "reasoning"; delta: string } | { type: "done"; result: ChatResult };

export class LlmError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(`provider answered ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

type Fetch = typeof fetch;
const DEFAULT_TIMEOUT_MS = 120_000;

// OpenAI's newer models reject max_tokens and want max_completion_tokens. Other OpenAI-compatible
// servers (Ollama and the like) still expect max_tokens, so only api.openai.com gets the new name.
function tokenLimitField(p: Provider): "max_tokens" | "max_completion_tokens" {
  try {
    return new URL(p.baseUrl).hostname === "api.openai.com" ? "max_completion_tokens" : "max_tokens";
  } catch {
    return "max_tokens";
  }
}

function requestInit(p: Provider, req: ChatRequest, stream: boolean): RequestInit {
  const body: Record<string, unknown> = { model: p.model, messages: req.messages, stream };
  if (stream) body.stream_options = { include_usage: true };
  if (req.tools?.length) body.tools = req.tools.map((t) => ({ type: "function", function: t }));
  if (req.maxTokens !== undefined) body[tokenLimitField(p)] = req.maxTokens;
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.reasoningEffort) body.reasoning_effort = req.reasoningEffort;
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
    body: JSON.stringify(body),
    // A provider must not bounce the key to another host.
    redirect: "error",
    signal: req.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  };
}

async function failure(res: Response, key: string): Promise<LlmError> {
  let text = "";
  try {
    text = await res.text();
  } catch {
    // the status is enough
  }
  let message = text;
  try {
    const parsed = JSON.parse(text);
    const err = Array.isArray(parsed) ? parsed[0]?.error : parsed?.error;
    message = typeof err === "string" ? err : (err?.message ?? text);
  } catch {
    // not JSON: keep the text
  }
  return new LlmError(res.status, String(message).replaceAll(key, "[key]").slice(0, 200));
}

function toolCall(id: string, name: string, raw: string, extra?: unknown): ToolCall {
  let args: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) args = parsed;
  } catch {
    // stays null
  }
  return { id, name, arguments: args, rawArguments: raw, ...(extra !== undefined && { extra }) };
}

const usageOf = (u: { prompt_tokens?: number; completion_tokens?: number } | null | undefined) =>
  u ? { promptTokens: u.prompt_tokens ?? 0, completionTokens: u.completion_tokens ?? 0 } : null;

// Ollama and some providers put a thinking model's reasoning in a separate field.
const reasoningOf = (m: { reasoning?: string; reasoning_content?: string } | undefined) => m?.reasoning ?? m?.reasoning_content ?? "";

/** One complete answer. Throws LlmError when the provider refuses. */
export async function chat(p: Provider, req: ChatRequest, fetchImpl: Fetch = fetch): Promise<ChatResult> {
  const res = await fetchImpl(`${p.baseUrl}/chat/completions`, requestInit(p, req, false));
  if (!res.ok) throw await failure(res, p.key);
  const data = await res.json();
  const choice = data.choices?.[0];
  return {
    text: choice?.message?.content ?? "",
    reasoning: reasoningOf(choice?.message),
    toolCalls: (choice?.message?.tool_calls ?? []).map((c: WireToolCall) => toolCall(c.id, c.function?.name ?? "", c.function?.arguments ?? "", c.extra_content)),
    finishReason: choice?.finish_reason ?? null,
    usage: usageOf(data.usage),
  };
}

/** The answer as it is written; ends with a "done" event holding the whole result. */
export async function* chatStream(p: Provider, req: ChatRequest, fetchImpl: Fetch = fetch): AsyncGenerator<StreamEvent> {
  const res = await fetchImpl(`${p.baseUrl}/chat/completions`, requestInit(p, req, true));
  if (!res.ok) throw await failure(res, p.key);
  if (!res.body) throw new LlmError(502, "empty stream");

  let text = "";
  let reasoning = "";
  let finishReason: string | null = null;
  let usage: ChatResult["usage"] = null;
  const calls = new Map<number, { id: string; name: string; args: string; extra?: unknown }>();

  const decoder = new TextDecoder();
  let pending = "";
  const lines = async function* () {
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      pending += decoder.decode(chunk, { stream: true });
      let nl: number;
      while ((nl = pending.indexOf("\n")) >= 0) {
        yield pending.slice(0, nl).trim();
        pending = pending.slice(nl + 1);
      }
    }
    if (pending.trim()) yield pending.trim();
  };

  for await (const line of lines()) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") break;
    let data;
    try {
      data = JSON.parse(payload);
    } catch {
      continue;
    }
    if (data.error) throw new LlmError(502, String(data.error.message ?? data.error).replaceAll(p.key, "[key]").slice(0, 200));
    if (data.usage) usage = usageOf(data.usage);
    const choice = data.choices?.[0];
    if (!choice) continue;
    const delta = choice.delta ?? {};
    const think = reasoningOf(delta);
    if (think) {
      reasoning += think;
      yield { type: "reasoning", delta: think };
    }
    if (delta.content) {
      text += delta.content;
      yield { type: "text", delta: delta.content };
    }
    for (const c of delta.tool_calls ?? []) {
      // Some providers (Gemini) number every parallel call 0. A name arrives once per call, so a
      // name (or a new id) on a call that already has one starts the next call.
      let slotKey: number = c.index ?? 0;
      const open = calls.get(slotKey);
      if (open && ((open.id && c.id && c.id !== open.id) || (open.name && c.function?.name))) slotKey = Math.max(...calls.keys()) + 1;
      const slot = calls.get(slotKey) ?? { id: "", name: "", args: "" };
      slot.id ||= c.id ?? "";
      slot.name += c.function?.name ?? "";
      slot.args += c.function?.arguments ?? "";
      if (c.extra_content !== undefined) slot.extra = c.extra_content;
      calls.set(slotKey, slot);
    }
    if (choice.finish_reason) finishReason = choice.finish_reason;
  }

  const toolCalls = [...calls.entries()].sort(([a], [b]) => a - b).map(([i, c]) => toolCall(c.id || `call_${i}`, c.name, c.args, c.extra));
  yield { type: "done", result: { text, reasoning, toolCalls, finishReason, usage } };
}
