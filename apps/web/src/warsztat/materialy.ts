import { useMemo } from "react";
import type { Warsztat as Zapis } from "../arkusze/postep";
import type { Zadanie } from "../arkusze/typy";
import { czyTabelaryczny } from "./tabele";
import type { Klucz, Tryb } from "./Narzedzia";

/** Pliki, dostępne narzędzia i klucz CKE dla zadania; wspólne dla wiersza przy zadaniu i panelu. */
export function useMaterialy(zadanie: Zadanie, wszystkie: Record<string, string>, zapis?: Zapis) {
  const pliki = useMemo(() => Object.fromEntries((zadanie.pliki ?? []).map((n) => [n, wszystkie[n]] as const)), [zadanie.pliki, wszystkie]);
  const nazwy = Object.keys(pliki);
  const tabelaryczne = nazwy.filter((n) => czyTabelaryczny(pliki[n]));
  const plikiTabel = useMemo(() => Object.fromEntries(Object.entries(pliki).filter(([, t]) => czyTabelaryczny(t))), [pliki]);
  const tryby: Tryb[] = ["python", ...(tabelaryczne.length ? (["sql", "arkusz"] as const) : []), ...(nazwy.length ? (["dane"] as const) : [])];
  // Zadanie z plikami z tabulatorami bez programu i SQL w treści to zadanie z arkusza kalkulacyjnego.
  const domyslny: Tryb = zadanie.program ? "python" : zadanie.sql && tabelaryczne.length ? "sql" : tabelaryczne.length ? "arkusz" : "python";
  const tryb = zapis?.tryb && tryby.includes(zapis.tryb) ? zapis.tryb : domyslny;
  const klucz: Klucz = zadanie.pytania.flatMap((p) => (p.typ === "otwarte" && p.wynik && p.oczekiwane?.length ? [{ nr: p.nr, oczekiwane: p.oczekiwane }] : []));
  return { pliki, nazwy, tabelaryczne, plikiTabel, tryby, tryb, klucz };
}
