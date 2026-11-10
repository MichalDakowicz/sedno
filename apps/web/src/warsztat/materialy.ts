import { createContext, useMemo } from "react";
import type { Warsztat as Zapis } from "../arkusze/postep";
import type { Pytanie, Zadanie } from "../arkusze/typy";
import { czyTabelaryczny } from "./tabele";
import type { Klucz, Tryb } from "./Narzedzia";

/** Pliki, dostępne narzędzia i klucz CKE dla zadania; wspólne dla wiersza przy zadaniu i panelu. */
export function useMaterialy(zadanie: Zadanie, wszystkie: Record<string, string>, zapis?: Zapis) {
  const pliki = useMemo(() => Object.fromEntries((zadanie.pliki ?? []).map((n) => [n, wszystkie[n]] as const)), [zadanie.pliki, wszystkie]);
  const nazwy = Object.keys(pliki);
  const tabelaryczne = nazwy.filter((n) => czyTabelaryczny(pliki[n]));
  const plikiTabel = useMemo(() => Object.fromEntries(Object.entries(pliki).filter(([, t]) => czyTabelaryczny(t))), [pliki]);
  const tryby: Tryb[] = ["python", ...(tabelaryczne.length ? (["sql", "arkusz"] as const) : []), ...(nazwy.length ? (["dane"] as const) : []), "brudnopis"];
  // Zadanie z plikami z tabulatorami bez programu i SQL w treści to zadanie z arkusza kalkulacyjnego.
  const domyslny: Tryb = zadanie.program ? "python" : zadanie.sql && tabelaryczne.length ? "sql" : tabelaryczne.length ? "arkusz" : "python";
  const tryb = zapis?.tryb && tryby.includes(zapis.tryb) ? zapis.tryb : domyslny;
  const klucz: Klucz = zadanie.pytania.flatMap((p) => (p.typ === "otwarte" && p.wynik && p.oczekiwane?.length ? [{ nr: p.nr, oczekiwane: p.oczekiwane }] : []));
  return { pliki, nazwy, tabelaryczne, plikiTabel, tryby, tryb, klucz };
}

/** Czego oczekuje podpunkt: od tego zależy, co z warsztatu ma sens jako odpowiedź. */
export type RodzajOdpowiedzi = "wynik" | "kod" | "sql" | "wykres" | "inne";

export type Cel = { nr: string; rodzaj: RodzajOdpowiedzi; odpowiedz: string };

// Podpunkt rozpoznajemy po treści i kluczu: algorytm i zapytanie to kod, a wynik tabeli czy liczby nie jest
// odpowiedzią na prośbę o zapytanie.
export function rodzajPytania(p: Pytanie, zadanie: Zadanie): RodzajOdpowiedzi {
  if (p.typ !== "otwarte") return "inne";
  if (p.wynik || p.tabela) return "wynik";
  const tekst = `${p.tresc} ${p.opis ?? ""}`;
  if (/wykres/i.test(tekst)) return "wykres";
  if (/zapytani|\bSQL\b/i.test(tekst) || (zadanie.sql && p.rozwiazanie && /select/i.test(p.rozwiazanie))) return "sql";
  if (/algorytm|pseudokod|napisz (program|funkcj)|zapisz (program|funkcj)/i.test(tekst) || (zadanie.program && p.rozwiazanie)) return "kod";
  return "inne";
}

export const CeleWstawiania = createContext<Cel[] | null>(null);

// Zaznaczenie w edytorach panelu (per język), żeby pole odpowiedzi mogło wziąć „wybrany kod”.
export const zaznaczenia: { python: string; sql: string } = { python: "", sql: "" };
