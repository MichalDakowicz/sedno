import { createClient } from "@supabase/supabase-js";

// Adres i klucz publiczny są jawne z założenia; dostęp do danych pilnuje RLS w bazie.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error("Brak VITE_SUPABASE_URL lub VITE_SUPABASE_ANON_KEY w .env (wzór w .env.example).");
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
});

export const functionsUrl = `${url}/functions/v1`;
