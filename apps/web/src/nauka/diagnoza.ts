// Diagnoza na start. Nowa baza (migracja 0023) ma jedną krótką sesję diagnozy ze stanem na koncie, osobno dla poziomu:
// nauka_diagnoza, nauka_diagnoza_start, nauka_diagnoza_oznacz. Gdy tych funkcji nie ma (produkcja przed migracją),
// zostaje dawna diagnoza: po jednej szybkiej rundzie z każdego obszaru, ze stanem w przeglądarce (niżej, „przeglądarka”).
// Zakończona albo pominięta diagnoza z przeglądarki liczy się też przy nowej bazie, żeby nie proponować jej drugi raz.
import { useSyncExternalStore } from "react";
import type { Poziom } from "../arkusze/typy";
import { currentUserId } from "../auth";
import { type StanDiagnozyBazy, type Umiejetnosc } from "./api";
import { useZapytanie } from "./stan";
import { zapytania } from "./zapytania";

export const OBSZARY = [
  { id: "słuchanie", nazwa: "Rozumienie ze słuchu" },
  { id: "czytanie", nazwa: "Rozumienie tekstów pisanych" },
  { id: "środki językowe", nazwa: "Środki językowe" },
  { id: "pisanie", nazwa: "Wypowiedź pisemna" },
];

// --- Stan w bazie ---

export type TrybDiagnozy =
  | { tryb: "ladowanie" | "pominiete" }
  | { tryb: "blad"; blad: string; ponow: () => void }
  /** Baza bez funkcji diagnozy: dawne rundy i stan w przeglądarce. */
  | { tryb: "przegladarka" }
  | { tryb: "baza"; stan: StanDiagnozyBazy; ponow: () => void };


export function useTrybDiagnozy(poziom: Poziom, wlaczone = true): TrybDiagnozy {
  const z = useZapytanie(wlaczone ? zapytania.diagnoza(poziom) : null);
  if (z.stan === "pominiete") return { tryb: "pominiete" };
  if (z.stan === "ladowanie") return { tryb: "ladowanie" };
  if (z.stan === "blad") return { tryb: "blad", blad: z.blad ?? "", ponow: z.ponow };
  return z.dane ? { tryb: "baza", stan: z.dane, ponow: z.ponow } : { tryb: "przegladarka" };
}

/** Id sesji diagnozy na poziomie (do nazw zadań w Powtórkach i na mapie); null bez diagnozy albo bez funkcji w bazie. */
export function useSesjaDiagnozy(poziom: Poziom, wlaczone = true): string | null {
  const t = useTrybDiagnozy(poziom, wlaczone);
  return t.tryb === "baza" ? t.stan.session?.id ?? null : null;
}

export type Zaproszenie = "zacznij" | "dokoncz" | "wyniki" | null;

/**
 * Co pulpit proponuje: „Sprawdźmy, od czego zacząć”, „Dokończ diagnozę”, „Pierwsze wyniki” (gotowa, a podsumowania
 * jeszcze nie widać) albo nic. baza: undefined, gdy stan jeszcze nie doszedł (wtedy nic), null przy bazie bez funkcji.
 */
export function zaproszenieDoDiagnozy(baza: StanDiagnozyBazy | null | undefined, lokalny: StanDiagnozy): Zaproszenie {
  if (baza === undefined) return null;
  const lokalnieZrobiona = lokalny.koniec || lokalny.pominieta;
  if (baza === null) return lokalnieZrobiona ? null : trwa(lokalny) ? "dokoncz" : "zacznij";
  if (baza.status === "trwa") return "dokoncz";
  if (baza.status === "gotowa") return baza.seen_at ? null : "wyniki";
  if (baza.status === "pominieta") return null;
  return lokalnieZrobiona ? null : "zacznij";
}

// --- Dawna diagnoza w przeglądarce ---
// Po jednej rundzie z każdego obszaru na istniejących rundach (nauka_start dla kolejnych umiejętności). Krok uznajemy
// za zrobiony, gdy umiejętność dostała ćwiczenie po starcie diagnozy (nauka_mapa).

/**
 * od: chwila startu (ms, null przed startem); kroki: umiejętności wybrane na starcie (później ich liczba prób rośnie,
 * więc wybór nie może się przeliczać); koniec: uczeń zobaczył podsumowanie; pominieta: „Pomiń diagnozę”.
 */
export type StanDiagnozy = { poziom: Poziom | null; od: number | null; kroki: string[]; koniec: boolean; pominieta: boolean };
const PUSTY: StanDiagnozy = { poziom: null, od: null, kroki: [], koniec: false, pominieta: false };

const klucz = () => `sedno.diagnoza.${currentUserId() ?? "anonim"}`;
const sluchacze = new Set<() => void>();
let pamiec: { klucz: string; stan: StanDiagnozy } | null = null;

export function stanDiagnozy(): StanDiagnozy {
  const k = klucz();
  if (pamiec?.klucz === k) return pamiec.stan;
  let stan = PUSTY;
  try {
    const v: unknown = JSON.parse(localStorage.getItem(k) ?? "null");
    if (v && typeof v === "object") {
      const o = v as Partial<StanDiagnozy>;
      stan = {
        poziom: o.poziom === "podstawowy" || o.poziom === "rozszerzony" || o.poziom === "dwujezyczny" ? o.poziom : null,
        od: typeof o.od === "number" ? o.od : null,
        kroki: Array.isArray(o.kroki) ? o.kroki.filter((k): k is string => typeof k === "string") : [],
        koniec: o.koniec === true,
        pominieta: o.pominieta === true,
      };
    }
  } catch {
    // zablokowany storage: diagnoza działa do odświeżenia strony
  }
  pamiec = { klucz: k, stan };
  return stan;
}

export function zmienDiagnoze(zmiana: Partial<StanDiagnozy>) {
  const stan = { ...stanDiagnozy(), ...zmiana };
  pamiec = { klucz: klucz(), stan };
  try {
    localStorage.setItem(klucz(), JSON.stringify(stan));
  } catch {
    // jw.
  }
  sluchacze.forEach((f) => f());
}

export function useDiagnoza(): StanDiagnozy {
  return useSyncExternalStore(
    (f) => {
      sluchacze.add(f);
      return () => void sluchacze.delete(f);
    },
    stanDiagnozy,
  );
}

/** Trwa: zaczęta i jeszcze bez podsumowania. */
export const trwa = (s: StanDiagnozy) => s.od !== null && !s.koniec && !s.pominieta;

export type KrokDiagnozy = { obszar: (typeof OBSZARY)[number]; umiejetnosc: Umiejetnosc; zrobiony: boolean };

/**
 * Kroki: w każdym obszarze umiejętność z szybką rundą i najmniejszą liczbą prób (o niej wiemy najmniej).
 * Obszar bez szybkiej rundy (np. wypowiedź pisemna) pomijamy.
 */
export function krokiDiagnozy(umiejetnosci: Umiejetnosc[], { od, kroki }: Pick<StanDiagnozy, "od" | "kroki">): KrokDiagnozy[] {
  return OBSZARY.flatMap((obszar) => {
    const kandydaci = umiejetnosci.filter((u) => u.area === obszar.id && u.formats.includes("szybka-runda"));
    if (!kandydaci.length) return [];
    const umiejetnosc = kandydaci.find((u) => kroki.includes(u.skill_id)) ?? [...kandydaci].sort((a, b) => a.evidence_count - b.evidence_count)[0]!;
    const zrobiony = od !== null && !!umiejetnosc.last_practiced_at && Date.parse(umiejetnosc.last_practiced_at) >= od;
    return [{ obszar, umiejetnosc, zrobiony }];
  });
}
