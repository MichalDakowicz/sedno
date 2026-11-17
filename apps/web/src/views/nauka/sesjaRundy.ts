import { naukaApi, type SesjaNauki } from "../../nauka/api";
import { useZapytanieNauki } from "../../nauka/stan";

export const UUID_SESJI = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function komunikatRundy(blad: unknown, domyslny: string): string {
  return blad instanceof Error ? blad.message : domyslny;
}

type Odczyt =
  | { status: "laduje" | "brak" | "blad" }
  | { status: "gotowa"; sesja: SesjaNauki };

export function useSesjaRundy(id: string): [Odczyt, () => void] {
  const zapis = useZapytanieNauki(UUID_SESJI.test(id) ? id : null, (signal) => naukaApi.sesja(id, signal));
  if (zapis.stan === "ladowanie") return [{ status: "laduje" }, zapis.ponow];
  if (zapis.stan === "blad") return [{ status: "blad" }, zapis.ponow];
  return [zapis.dane ? { status: "gotowa", sesja: zapis.dane } : { status: "brak" }, zapis.ponow];
}

export function odczytajRunde<T>(klucz: string): T | null {
  try {
    return JSON.parse(sessionStorage.getItem(klucz) ?? "null") as T | null;
  } catch {
    return null;
  }
}

export function zapiszRunde(klucz: string, wartosc: unknown) {
  try {
    if (wartosc === null) sessionStorage.removeItem(klucz);
    else sessionStorage.setItem(klucz, JSON.stringify(wartosc));
  } catch {
    // Brak dostępu do pamięci karty nie blokuje otwartej sesji.
  }
}

export function nazwaOdpowiedzi(odpowiedz: string, prompt: SesjaNauki["answers"][number]["prompt"]): string {
  if (!odpowiedz.trim()) return "Brak odpowiedzi";
  if (prompt.typ === "cke" || prompt.typ === "luka") return odpowiedz;
  return prompt.opcje?.find((o) => o.id === odpowiedz)?.tekst || odpowiedz;
}
