// Modele do zobaczenia (akcje wizualizacje i wizualizacja w nauka-ai, services/supabase/nauka-ai.md). Katalog
// i stan liczy serwer bez modelu językowego; tu tylko kształty danych i to, przy jakich zadaniach model pasuje.
import type { Poziom } from "../arkusze/typy";
import { adresStartu } from "./adresy";

export type Parametr = { min: number; max: number; krok: number; wartosc: number };

export type ModelParabola = { id: "parabola"; przedmiot: "matematyka"; nazwa: string; parametry: Record<"a" | "p" | "q", Parametr>; pytania: string[] };
export type ModelWyszukiwania = { id: "wyszukiwanie-binarne"; przedmiot: "informatyka"; nazwa: string; tablica: number[]; szukana: number; pytania: string[] };
export type ModelParafrazy = { id: "tekst-parafraza"; przedmiot: "angielski"; nazwa: string; umiejetnosc?: string; pytania: string[] };
export type Model = ModelParabola | ModelWyszukiwania | ModelParafrazy;

export type StanParaboli = {
  id: "parabola"; a: number; p: number; q: number;
  wierzcholek: { x: number; y: number } | null; ksztalt: "parabola" | "stala"; punkty: { x: number; y: number }[]; opis: string;
};
export type KrokWyszukiwania = { lewy: number; prawy: number; srodek: number; wartosc: number; wynik: "znaleziono" | "szukaj-po-prawej" | "szukaj-po-lewej"; opis: string };
export type StanWyszukiwania = { id: "wyszukiwanie-binarne"; tablica: number[]; szukana: number; kroki: KrokWyszukiwania[]; indeks: number | null };
export type StanParafrazy = { id: "tekst-parafraza"; fragmenty: { id: string; tekst: string }[]; parafraza: string; zgodny?: boolean; objasnienie?: string };

const ZNANE = new Set(["parabola", "wyszukiwanie-binarne", "tekst-parafraza"]);

/** Tylko modele, które aplikacja umie narysować; nowy model z serwera czeka na swój widok. */
export function znaneModele(modele: { id: string }[]): Model[] {
  return modele.filter((m) => ZNANE.has(m.id)) as Model[];
}

export const adresWizualizacji = (model?: string) => (model ? `/nauka/wizualizacje?model=${encodeURIComponent(model)}` : "/nauka/wizualizacje");

// Gdzie model pasuje: typ zadania z wariantów (Zadania) i umiejętność z mapy angielskiego (panel umiejętności).
const DLA_SZABLONU: Record<string, string> = { "rownanie-kwadratowe": "parabola" };
const DLA_UMIEJETNOSCI: Record<string, string> = { "czytanie-szczegoly": "tekst-parafraza" };
const DLA_PRZEDMIOTU: Record<string, string> = { matematyka: "parabola", informatyka: "wyszukiwanie-binarne", angielski: "tekst-parafraza" };

export const modelDlaSzablonu = (szablon: string) => DLA_SZABLONU[szablon] ?? null;
export const modelDlaUmiejetnosci = (umiejetnosc: string) => DLA_UMIEJETNOSCI[umiejetnosc] ?? null;
export const modelDlaPrzedmiotu = (przedmiot: string) => DLA_PRZEDMIOTU[przedmiot] ?? null;

/** Dokąd po modelu: ćwiczenie tego, co model pokazuje. */
export function cwiczeniePoModelu(model: Model, poziom: Poziom): { do: string; etykieta: string } {
  if (model.id === "parabola") return { do: "/nauka/zadania?przedmiot=matematyka&szablon=rownanie-kwadratowe", etykieta: "Rozwiąż równanie kwadratowe" };
  if (model.id === "wyszukiwanie-binarne") return { do: "/nauka/zadania?przedmiot=informatyka", etykieta: "Zadania z informatyki" };
  const skill = model.umiejetnosc ?? "czytanie-szczegoly";
  return { do: adresStartu(poziom, skill), etykieta: "Szybka runda z czytania" };
}
