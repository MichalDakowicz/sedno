// Bramka AI. Zapytanie idzie przez dostawcę zapisanego na koncie użytkownika (ai_credential),
// a gdy konto go nie ma, przez domyślną trasę serwera (SEDNO_AI_*). Konto wybiera dostawcę osobno dla zadań ważnych
// i lekkich (ai_routing), a każde wywołanie trafia do ai_usage, żeby porównać dostawców.
//
// POST { tier: "wazne" | "lekkie", messages, task?, provider?, stream?, max_tokens?, temperature? }
// stream=false → { text, provider, model, usage }
// POST { status: true } → { ready: boolean }: czy Pestka jest dostępna dla konta (oba poziomy).
// stream=true  → text/event-stream: data: {"type":"text","delta":...} ... data: {"type":"done",...}

import { limitDzienny, logAiUsage, resolveAi, zapasowa } from "../_shared/ai-route.ts";
import { ograniczTokeny, SEDNO } from "../_shared/ai-default.ts";
import { readJsonObject } from "../_shared/http.ts";
import { LlmError, type Message } from "../_shared/llm.ts";
import { chatRetry, streamRetry } from "../_shared/llm-retry.ts";
import { admin, cors, reply, takeToken, userId } from "../_shared/konto.ts";
import {
  metadaneCzatu, odpowiedzWeryfikacji, ostatniePytanie, przygotujCzat, prosbaPestki, prosiOZapisPriorytetu, rozpoznajPytanieCzatu, weryfikuj,
} from "./pestka.ts";
import { FiltrCzatu } from "./odpowiedz-lektury.ts";
import type { OdpowiedzPestki } from "../_shared/pestka-odpowiedz.ts";
import type { SzukajRozmow } from "./pamiec.ts";
import type { SzukajBaza, SzukajElementy, SzukajFragmenty, SzukajFragmentyMiejsca } from "./material-lektury.ts";

// Osłona transportu dla całego żądania. Historię czatu ogranicza okno dostawcy.
const MAX_BODY = 8 * 1024 * 1024;
const TIERS = new Set(["wazne", "lekkie"]);
const ROLES = new Set(["system", "user", "assistant"]);

// Poziom modelu dla pytań o lektury (rozpoznany utwór, pytanie o lekturę, sprawdzanie odwołań w wypracowaniu).
// To jedyny przełącznik: SEDNO_TIER_LEKTUR=lekkie przywraca poziom wybrany przez aplikację.
const TIER_LEKTUR: "wazne" | null = Deno.env.get("SEDNO_TIER_LEKTUR") === "lekkie" ? null : "wazne";

function parseMessages(raw: unknown): Message[] | null {
  if (!Array.isArray(raw) || raw.length < 1) return null;
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

  const parsed = await readJsonObject(req, MAX_BODY);
  if ("error" in parsed) return reply(parsed.status, { error: parsed.error });
  const body = parsed.data;

  // Tanie sprawdzenie, czy Pestka jest dostępna dla konta; nie zużywa limitu i niczego nie ujawnia.
  if (body.status === true) {
    const ok = await takeToken(user, "ai-status", 20, 60);
    if (ok === null) return reply(500, { error: "server_error" });
    if (!ok) return reply(429, { error: "rate_limited" });
    const trasy = await Promise.all([resolveAi(user, "lekkie", undefined), resolveAi(user, "wazne", undefined)]);
    // Błąd serwera to nie „niegotowa”: aplikacja ma wtedy zapytać jeszcze raz, a nie chować Pestki.
    const awaria = trasy.find((r) => r instanceof Response && r.status >= 500);
    if (awaria) return awaria as Response;
    return reply(200, { ready: trasy.every((r) => !(r instanceof Response)) });
  }

  const allowed = await takeToken(user, "ai", 30, 60);
  if (allowed === null) return reply(500, { error: "server_error" });
  if (!allowed) return reply(429, { error: "rate_limited" });

  const requestedTier = typeof body.tier === "string" ? body.tier : "lekkie";
  if (!TIERS.has(requestedTier)) return reply(400, { error: "bad_tier" });
  const parsedMessages = parseMessages(body.messages);
  if (!parsedMessages) return reply(400, { error: "bad_messages" });
  const messages = parsedMessages;
  const pestka = prosbaPestki(body.pestka);
  if (body.pestka !== undefined && (!pestka || body.stream !== true)) return reply(400, { error: "bad_pestka_request" });
  const pytanieOLekturze = pestka?.tryb === "lektura" ||
    (pestka?.tryb === "czat" && rozpoznajPytanieCzatu(messages, pestka).lektura);
  const tier = pytanieOLekturze && TIER_LEKTUR ? TIER_LEKTUR : requestedTier;
  const task = typeof body.task === "string" ? body.task.slice(0, 60) : null;
  const override = typeof body.provider === "string" ? body.provider : undefined;
  const czatPestki = pestka?.tryb === "czat" || task === "pestka-czat";
  const requested = typeof body.max_tokens === "number" && Number.isFinite(body.max_tokens)
    ? Math.max(1, Math.floor(body.max_tokens))
    : undefined;
  const temperature = typeof body.temperature === "number" ? body.temperature : undefined;

  const resolvedRoute = await resolveAi(user, tier, override);
  if (resolvedRoute instanceof Response) return resolvedRoute;
  const route = resolvedRoute;
  const limited = await limitDzienny(user, route);
  if (limited) return limited;
  const limitNarzedzia = requested === undefined ? undefined : Math.min(requested, 8192);
  const maxTokens = czatPestki
    ? requested
    : route.provider === SEDNO ? ograniczTokeny(limitNarzedzia) : limitNarzedzia;
  // Komunikat dostawcy może zawierać fragment klucza serwera albo dane organizacji.
  const detailOf = (e: unknown) => (e instanceof LlmError && route.provider !== SEDNO ? e.detail : undefined);

  const fallback = zapasowa(user, tier, route, override);
  const started = Date.now();
  const base = { user_id: user, tier, task, provider: route.provider, model: route.model };

  if (body.stream !== true) {
    try {
      const signal = AbortSignal.any([req.signal, AbortSignal.timeout(120_000)]);
      const out = await chatRetry(route, { messages, maxTokens, temperature, signal }, { fallback });
      const { provider, model } = out.route;
      await logAiUsage({ ...base, provider, model, ok: true, status: 200, prompt_tokens: out.usage?.promptTokens, completion_tokens: out.usage?.completionTokens, duration_ms: Date.now() - started });
      return reply(200, { text: out.text, provider, model, usage: out.usage });
    } catch (e) {
      const status = req.signal.aborted ? 499 : e instanceof LlmError ? e.status : 0;
      await logAiUsage({ ...base, ok: false, status, duration_ms: Date.now() - started });
      // 424, nie 502: Cloudflare przed serwerem podmienia odpowiedzi 502 na własną stronę HTML bez CORS,
      // więc aplikacja nie widziała ani kodu, ani powodu błędu dostawcy.
      return reply(424, { error: "provider_failed", status, detail: detailOf(e) });
    }
  }

  const enc = new TextEncoder();
  const cancel = new AbortController();
  const signal = AbortSignal.any([req.signal, cancel.signal, ...(czatPestki ? [] : [AbortSignal.timeout(120_000)])]);
  const rpc = async (nazwa: string, p: Record<string, unknown>) => {
    const { data, error } = await admin.rpc(nazwa, p).abortSignal(AbortSignal.any([signal, AbortSignal.timeout(3500)]));
    if (error) throw error;
    return data;
  };
  const dostep = {
    baza: ((p) => rpc("pestka_wyszukaj_wiedze", p)) satisfies SzukajBaza,
    elementy: ((p) => rpc("pestka_lektury_elementy", p)) satisfies SzukajElementy,
    fragmenty: ((p) => rpc("pestka_lektury_fragmenty", p)) satisfies SzukajFragmenty,
    fragmentyMiejsca: ((p) => rpc("pestka_lektury_fragmenty_miejsca", p)) satisfies SzukajFragmentyMiejsca,
    rozmowy: (async (biezaca, pytanie) => {
      const { data, error } = await admin.rpc("pestka_wyszukaj_rozmowy", {
        p_user: user, p_biezaca: biezaca, p_pytanie: pytanie,
      }).abortSignal(AbortSignal.any([signal, AbortSignal.timeout(3500)]));
      if (error) throw error;
      return data;
    }) satisfies SzukajRozmow,
    zapytaj: async (messages: Message[]) => {
      const start = Date.now();
      const out = await chatRetry(route, { messages, maxTokens: ograniczTokeny(2700), signal }, { fallback });
      await logAiUsage({
        ...base, task: "pestka-weryfikacja-lektury", provider: out.route.provider, model: out.route.model,
        ok: true, status: 200, prompt_tokens: out.usage?.promptTokens, completion_tokens: out.usage?.completionTokens,
        duration_ms: Date.now() - start,
      });
      return out.text;
    },
    signal,
  };
  let metadane: OdpowiedzPestki | undefined;
  let zweryfikowano = false;
  async function* odpowiedz() {
    if (pestka?.tryb === "lektura") {
      const wynik = await weryfikuj(pestka.fragment, pestka.temat ?? "", dostep);
      const { tekst, dane } = odpowiedzWeryfikacji(wynik, true);
      metadane = dane;
      zweryfikowano = true;
      for (const akapit of tekst.split(/(?<=\n\n)/g)) yield { type: "text" as const, delta: akapit };
      yield { type: "done" as const, route, result: { usage: undefined } };
      return;
    }
    const czat = pestka?.tryb === "czat" ? await przygotujCzat(messages, pestka, dostep) : undefined;
    const procesor = czat?.procesor;
    // Plan wydarzeń złożony przez serwer: bez wywołania modelu.
    if (czat?.gotowa !== undefined && procesor) {
      const tekst = procesor.dodaj(`${czat.gotowa}\n`) + procesor.zakoncz();
      metadane = metadaneCzatu(tekst, procesor.zrodla(), pestka?.tryb === "czat" && pestka.maProbe === true);
      zweryfikowano = true;
      for (const akapit of tekst.split(/(?<=\n\n)/g)) yield { type: "text" as const, delta: akapit };
      yield { type: "done" as const, route, result: { usage: undefined } };
      return;
    }
    // Zapis priorytetu tylko na wyraźną prośbę ucznia; obietnice zapisu bez prośby też znikają.
    const filtr = pestka?.tryb === "czat" && !procesor ? new FiltrCzatu(prosiOZapisPriorytetu(ostatniePytanie(messages))) : undefined;
    let wyslano = "";
    for await (const ev of streamRetry(route, { messages: czat?.messages ?? messages, maxTokens, temperature, signal }, { fallback })) {
      if (ev.type === "text" && (procesor || filtr)) {
        const delta = procesor ? procesor.dodaj(ev.delta) : filtr!.dodaj(ev.delta);
        wyslano += delta;
        if (delta) yield { type: "text" as const, delta };
        continue;
      }
      if (ev.type === "done" && pestka?.tryb === "czat") {
        const reszta = procesor ? procesor.zakoncz() : filtr?.zakoncz() ?? "";
        wyslano += reszta;
        if (reszta) yield { type: "text" as const, delta: reszta };
        metadane = metadaneCzatu(wyslano, procesor?.zrodla() ?? [], pestka.maProbe === true);
      }
      yield ev;
    }
  }
  const events = odpowiedz();
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
          const { provider, model } = ev.route;
          if (!zweryfikowano) await finish({ provider, model, ok: true, status: 200, prompt_tokens: usage?.promptTokens, completion_tokens: usage?.completionTokens });
          if (cancel.signal.aborted) return;
          send({ type: "done", provider, model, usage, pestka: metadane });
          break;
        }
      } catch (e) {
        if (cancel.signal.aborted) return;
        const status = req.signal.aborted ? 499 : e instanceof LlmError ? e.status : 0;
        await finish({ ok: false, status });
        if (cancel.signal.aborted) return;
        send({ type: "error", status, detail: detailOf(e) });
      }
      ctrl.close();
    },
    async cancel() {
      cancel.abort();
      await Promise.allSettled([events.return(undefined), finish({ ok: false, status: 499 })]);
    },
  });
  return new Response(stream, { headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
}

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch {
    return reply(500, { error: "server_error" });
  }
});
