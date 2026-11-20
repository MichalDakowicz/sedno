// Ponawianie po chwilowych błędach modelu: raz na tej samej trasie, potem raz na zapasowej.
// Wszystko dzieje się przed zapisem wyniku przez wywołującego, więc ponowienie niczego nie dubluje.
import { chat, chatStream, type ChatRequest, type ChatResult, LlmError, type Provider, type StreamEvent } from "./llm.ts";

type Route = { p: Provider; reasoningEffort?: string };
type Request = Omit<ChatRequest, "reasoningEffort">;
export interface RetryOptions {
  /** Trasa drugiego poziomu; wywoływana dopiero, gdy ponowienie nie pomogło. */
  fallback?: () => Promise<Route | undefined>;
  fetchImpl?: typeof fetch;
  delayMs?: number;
}

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

function retryable(e: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return false;
  return e instanceof TypeError || (e instanceof LlmError && RETRY_STATUS.has(e.status));
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });
}

const sameModel = (a: Route, b: Route) => a.p.model === b.p.model && a.p.baseUrl === b.p.baseUrl;

export async function chatRetry(route: Route, req: Request, o: RetryOptions = {}): Promise<ChatResult> {
  const run = (r: Route) => chat(r.p, { ...req, reasoningEffort: r.reasoningEffort }, o.fetchImpl);
  let err: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      return await run(route);
    } catch (e) {
      err = e;
      if (!retryable(e, req.signal)) throw e;
      if (i === 0) await wait(o.delayMs ?? 600, req.signal);
    }
  }
  const alt = req.signal?.aborted ? undefined : await o.fallback?.();
  if (alt && !sameModel(alt, route)) {
    try {
      return await run(alt);
    } catch {
      // zostaje pierwotny błąd
    }
  }
  throw err;
}

/** Jak chatStream, ale ponawia tylko, dopóki nic nie poszło do odbiorcy. */
export async function* streamRetry(route: Route, req: Request, o: RetryOptions = {}): AsyncGenerator<StreamEvent> {
  let started = false;
  const run = async function* (r: Route) {
    for await (const ev of chatStream(r.p, { ...req, reasoningEffort: r.reasoningEffort }, o.fetchImpl)) {
      started = true;
      yield ev;
    }
  };
  let err: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      yield* run(route);
      return;
    } catch (e) {
      err = e;
      if (started || !retryable(e, req.signal)) throw e;
      if (i === 0) await wait(o.delayMs ?? 600, req.signal);
    }
  }
  const alt = req.signal?.aborted ? undefined : await o.fallback?.();
  if (alt && !sameModel(alt, route)) {
    try {
      yield* run(alt);
      return;
    } catch (e) {
      if (started) throw e;
    }
  }
  throw err;
}
