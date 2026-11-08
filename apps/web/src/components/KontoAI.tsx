// Dostawcy AI przypisani do konta: klucze, wybór dostawcy dla zadań ważnych i lekkich, zużycie.
// Klucz trafia tylko do funkcji ai-klucz; aplikacja widzi potem 4 ostatnie znaki.
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { aiKey, refreshAiReady, type Tier } from "../ai";
import { useProfil } from "../auth";
import { supabase } from "../supabase";
import styles from "./KontoAI.module.css";

type Credential = { provider: string; base_url: string; model: string; key_last4: string };
type Routing = { tier: Tier; provider: string; model: string | null; reasoning_effort: string | null };
type Usage = { tier: string; provider: string; model: string; ok: boolean; duration_ms: number; prompt_tokens: number | null; completion_tokens: number | null };

const PRESETS = {
  openai: { label: "OpenAI (ChatGPT)", base_url: "https://api.openai.com/v1", needsKey: true, model: "" },
  "ollama-serwer": { label: "Ollama na serwerze Sedno", base_url: "", needsKey: false, model: "qwen3:8b" },
  ollama: { label: "Ollama (własny adres https)", base_url: "https://", needsKey: false, model: "" },
  inny: { label: "Inny zgodny z OpenAI", base_url: "https://", needsKey: true, model: "" },
} as const;
type PresetId = keyof typeof PRESETS;

// Wartości reasoning_effort z API OpenAI. Pusta = domyślny poziom modelu (parametr nie jest wysyłany).
const MYSLENIE = [
  { id: "", label: "myślenie domyślne" },
  { id: "none", label: "bez myślenia" },
  { id: "low", label: "myślenie niskie" },
  { id: "medium", label: "myślenie średnie" },
  { id: "high", label: "myślenie wysokie" },
  { id: "xhigh", label: "myślenie bardzo wysokie" },
];

const TIERS: { id: Tier; label: string; hint: string }[] = [
  { id: "wazne", label: "Ważne", hint: "ocena wypracowań, wyjaśnienia błędów" },
  { id: "lekkie", label: "Lekkie", hint: "podpowiedzi, krótkie pytania" },
];

const ERRORS: Record<string, string> = {
  bad_base_url: "Niedozwolony adres. Potrzebny publiczny https.",
  bad_key: "Nieprawidłowy klucz.",
  bad_model: "Podaj nazwę modelu.",
  no_server_access: "To konto nie ma dostępu do Ollamy na serwerze.",
  rate_limited: "Za dużo prób. Odczekaj minutę.",
};

export function KontoAI() {
  const profil = useProfil();
  const [creds, setCreds] = useState<Credential[]>([]);
  const [routing, setRouting] = useState<Routing[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [preset, setPreset] = useState<PresetId>("openai");
  const [baseUrl, setBaseUrl] = useState<string>(PRESETS.openai.base_url);
  const [model, setModel] = useState("");
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, r, u] = await Promise.all([
      supabase.from("ai_credential").select("provider, base_url, model, key_last4").order("provider"),
      supabase.from("ai_routing").select("tier, provider, model, reasoning_effort"),
      supabase.from("ai_usage").select("tier, provider, model, ok, duration_ms, prompt_tokens, completion_tokens").order("created_at", { ascending: false }).limit(500),
    ]);
    setCreds(c.data ?? []);
    setRouting((r.data ?? []) as Routing[]);
    setUsage(u.data ?? []);
    // Pestka pojawia się i znika razem z dostawcą, więc stan „AI gotowe” odświeżamy po każdej zmianie.
    void refreshAiReady();
  }, []);

  useEffect(() => void load(), [load]);

  const { hash } = useLocation();
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (hash === "#ai") sectionRef.current?.scrollIntoView({ block: "start" });
  }, [hash]);

  function choose(id: PresetId) {
    setPreset(id);
    setBaseUrl(PRESETS[id].base_url);
    setModel(PRESETS[id].model);
    setKey("");
  }

  const providerName = (id: PresetId) => (id === "inny" || id === "ollama" ? `${id}-${new URL(baseUrl).hostname.split(".")[0] ?? "api"}`.slice(0, 32) : id);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    let provider: string;
    try {
      provider = providerName(preset).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    } catch {
      setBusy(false);
      return setMsg(ERRORS.bad_base_url!);
    }
    if (/[@\s]/.test(model.trim())) {
      setBusy(false);
      return setMsg("To nie wygląda na nazwę modelu (np. gpt-4o-mini). Sprawdź, czy przeglądarka nie wstawiła tu własnych danych.");
    }
    const res = await aiKey({ action: "save", provider, base_url: baseUrl, model: model.trim(), key: key || undefined });
    setBusy(false);
    if (res.ok) {
      setKey("");
      setMsg(`Zapisano dostawcę ${provider}.`);
      // Pierwszy dostawca od razu obsługuje oba poziomy.
      if (!routing.length) await supabase.from("ai_routing").upsert(TIERS.map((t) => ({ tier: t.id, provider, model: null })));
      await load();
    } else setMsg(ERRORS[String(res.error)] ?? "Nie udało się zapisać.");
  }

  async function test(provider: string) {
    setMsg(`Sprawdzam ${provider}…`);
    const res = await aiKey({ action: "test", provider });
    setMsg(res.ok ? `${provider} działa, odpowiedź: „${res.reply}”.` : `${provider} nie działa (${res.status ?? res.error}${res.detail ? `: ${res.detail}` : ""}).`);
  }

  async function remove(provider: string) {
    await supabase.from("ai_credential").delete().eq("provider", provider);
    await load();
  }

  // Zmiana dostawcy zeruje poziom myślenia: inny dostawca może go nie obsługiwać.
  async function route(tier: Tier, provider: string, routeModel: string, effort: string | null = null) {
    if (!provider) await supabase.from("ai_routing").delete().eq("tier", tier);
    else await supabase.from("ai_routing").upsert({ tier, provider, model: routeModel.trim() || null, reasoning_effort: effort });
    await load();
  }

  const presets = (Object.keys(PRESETS) as PresetId[]).filter((id) => id !== "ollama-serwer" || profil?.server_ollama);
  const p = PRESETS[preset];

  // Zużycie zgrupowane po dostawcy, modelu i poziomie: do porównania jakości i czasu.
  const groups = new Map<string, { n: number; fail: number; ms: number; tokens: number }>();
  for (const u of usage) {
    const k = `${u.provider} · ${u.model} · ${u.tier === "wazne" ? "ważne" : "lekkie"}`;
    const g = groups.get(k) ?? { n: 0, fail: 0, ms: 0, tokens: 0 };
    g.n++;
    if (!u.ok) g.fail++;
    g.ms += u.duration_ms;
    g.tokens += (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0);
    groups.set(k, g);
  }

  return (
    <section className={styles.section} id="ai" ref={sectionRef}>
      <div className={styles.head}>
        <h2 className="h3">AI na koncie</h2>
        <p className="muted small">Sedno nie ma wspólnego klucza. Pestka używa dostawców zapisanych na tym koncie.</p>
      </div>

      {creds.length > 0 && (
        <ul className={styles.list}>
          {creds.map((c) => (
            <li key={c.provider} className={styles.row}>
              <span className={styles.grow}>
                <strong>{c.provider}</strong> <span className="muted">· {c.model}</span>
                <span className="muted small"> · klucz …{c.key_last4}</span>
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void test(c.provider)}>
                Sprawdź
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void remove(c.provider)}>
                Usuń
              </button>
            </li>
          ))}
        </ul>
      )}

      {creds.length > 0 && (
        <div className={styles.tiers}>
          {TIERS.map((t) => {
            const r = routing.find((x) => x.tier === t.id);
            return (
              <div key={t.id} className={styles.tier}>
                <span>
                  <strong>{t.label}</strong> <span className="muted small">{t.hint}</span>
                </span>
                <select className="input" value={r?.provider ?? ""} onChange={(e) => void route(t.id, e.target.value, "")} aria-label={`Dostawca dla zadań: ${t.label}`}>
                  <option value="">brak</option>
                  {creds.map((c) => (
                    <option key={c.provider} value={c.provider}>
                      {c.provider}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="model domyślny"
                  defaultValue={r?.model ?? ""}
                  key={`${t.id}-${r?.provider}-${r?.model}`}
                  onBlur={(e) => r && e.target.value !== (r.model ?? "") && void route(t.id, r.provider, e.target.value, r.reasoning_effort)}
                  aria-label={`Model dla zadań: ${t.label}`}
                  disabled={!r}
                />
                <select
                  className="input"
                  value={r?.reasoning_effort ?? ""}
                  onChange={(e) => r && void route(t.id, r.provider, r.model ?? "", e.target.value || null)}
                  aria-label={`Poziom myślenia dla zadań: ${t.label}`}
                  disabled={!r}
                >
                  {MYSLENIE.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      <form className={styles.form} onSubmit={save}>
        <div className="field">
          <label htmlFor="ai-preset">Dodaj dostawcę</label>
          <select id="ai-preset" className="input" value={preset} onChange={(e) => choose(e.target.value as PresetId)}>
            {presets.map((id) => (
              <option key={id} value={id}>
                {PRESETS[id].label}
              </option>
            ))}
          </select>
        </div>
        {preset !== "ollama-serwer" && preset !== "openai" && (
          <div className="field">
            <label htmlFor="ai-url">Adres API</label>
            <input id="ai-url" className="input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required />
          </div>
        )}
        <div className="field">
          <label htmlFor="ai-model">Model</label>
          <input id="ai-model" name="ai-model" className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder={preset === "openai" ? "np. gpt-4o-mini" : "np. qwen3:8b"} autoComplete="off" data-1p-ignore data-lpignore="true" required />
        </div>
        {preset !== "ollama-serwer" && (
          <div className="field">
            <label htmlFor="ai-key">Klucz API{p.needsKey ? "" : " (jeśli wymagany)"}</label>
            <input id="ai-key" name="ai-api-key" className="input" type="password" autoComplete="new-password" data-1p-ignore data-lpignore="true" value={key} onChange={(e) => setKey(e.target.value)} required={p.needsKey} />
          </div>
        )}
        <button type="submit" className="btn btn-secondary" disabled={busy}>
          Zapisz dostawcę
        </button>
      </form>

      {msg && (
        <p className="small" role="status">
          {msg}
        </p>
      )}

      {groups.size > 0 && (
        <table className={styles.usage}>
          <caption className="label">Zużycie (ostatnie 500 zapytań)</caption>
          <thead>
            <tr>
              <th>Dostawca · model · poziom</th>
              <th>Zapytań</th>
              <th>Błędów</th>
              <th>Śr. czas</th>
              <th>Tokeny</th>
            </tr>
          </thead>
          <tbody>
            {[...groups].map(([k, g]) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{g.n}</td>
                <td>{g.fail}</td>
                <td>{(g.ms / g.n / 1000).toFixed(1)} s</td>
                <td>{g.tokens}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
