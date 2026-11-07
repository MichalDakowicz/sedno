// Wspólne dla funkcji AI: klient admina, CORS, identyfikacja użytkownika i kontrola adresu dostawcy.
// Adres prywatny (Ollama na serwerze) wolno zapisać tylko kontu, któremu administrator nadał
// profiles.server_ollama. Reszta musi być publicznym https.

import { createClient } from "npm:@supabase/supabase-js@2";
import { assertPublicUrl } from "./hosts.ts";

export const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const reply = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: cors });

/** Id zalogowanego użytkownika albo null. */
export async function userId(req: Request): Promise<string | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

const privateOrigins = (Deno.env.get("LLM_PRIVATE_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** Adres Ollamy na serwerze (OpenAI-compatible) albo null, gdy operator jej nie udostępnił. */
export const serverOllamaUrl = (): string | null => (privateOrigins[0] ? `${privateOrigins[0]}/v1` : null);

export async function mayUseServer(user: string): Promise<boolean> {
  const { data } = await admin.from("profiles").select("server_ollama").eq("id", user).maybeSingle();
  return data?.server_ollama === true;
}

/** Sprawdza adres dostawcy dla danego konta; rzuca UnsafeUrl. */
export async function checkUrl(user: string, raw: string): Promise<string> {
  const allowed = privateOrigins.length && (await mayUseServer(user)) ? privateOrigins : [];
  return await assertPublicUrl(raw, undefined, allowed);
}

/** Bez limitu nikt nie przepali cudzego klucza ani serwera. */
export async function takeToken(user: string, bucket: string, max: number, seconds: number): Promise<boolean | null> {
  const { data, error } = await admin.rpc("take_rate_token", { p_user: user, p_bucket: bucket, p_limit: max, p_window_seconds: seconds });
  return error ? null : data === true;
}
