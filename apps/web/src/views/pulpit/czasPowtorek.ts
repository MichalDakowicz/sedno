import { nazwaZadaniaCke, nazwaZadaniaRundy } from "../../arkusze/typy";
import type { Powtorka } from "../../nauka/api";

export function kluczPowtorki(p: Powtorka) {
  const m = p.mistake;
  if (!m) return p.skill_id;
  return `${p.skill_id}:${m.source_id ?? m.sheet_id ?? m.session_id ?? ""}:${m.question ?? ""}`;
}

/** Ile błędów z jednej umiejętności trafia do kolejki naraz; reszta wraca, gdy te zostaną poprawione. */
const BLEDOW_NA_UMIEJETNOSC = 3;

/** Kolejka bez powtórzeń: każda pozycja to osobna krótka runda. Błędów jednej umiejętności (np. słuchania z całych arkuszy) jest najwyżej kilka, od najnowszych. */
export function unikalnePowtorki(kolejka: Powtorka[]) {
  const klucze = new Set<string>();
  const bledy = new Map<string, number>();
  return kolejka.filter((p) => {
    const klucz = kluczPowtorki(p);
    if (klucze.has(klucz)) return false;
    if (p.mistake) {
      const n = (bledy.get(p.skill_id) ?? 0) + 1;
      if (n > BLEDOW_NA_UMIEJETNOSC) return false;
      bledy.set(p.skill_id, n);
    }
    klucze.add(klucz);
    return true;
  });
}

/**
 * Podpis źródła błędu bez linku: „Matura maj 2026 · zadanie 1.3” albo „Szybka runda z 18 listopada · zadanie 5”.
 * sesjaDiagnozy: id sesji diagnozy na tym poziomie (useSesjaDiagnozy), bo błąd z niej to „Diagnoza z …”, nie runda.
 */
export function etykietaZrodla(blad: NonNullable<Powtorka["mistake"]>, sesjaDiagnozy?: string | null): string | null {
  if (blad.sheet_id) return blad.question ? nazwaZadaniaCke(blad.sheet_id, blad.question) : nazwaZadaniaCke(blad.sheet_id, "").replace(/ · zadanie $/, "");
  const diagnoza = !!sesjaDiagnozy && blad.session_id === sesjaDiagnozy;
  if (blad.session_id) return blad.question ? nazwaZadaniaRundy(blad.happened_at, blad.question, diagnoza ? "Diagnoza" : undefined) : diagnoza ? "Wynik diagnozy" : "Wynik poprzedniej rundy";
  return null;
}

const dzienWarszawa = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" });
const skrotDnia = new Intl.DateTimeFormat("pl-PL", { weekday: "short", timeZone: "UTC" });

/**
 * Liczba powtórek na każdy z najbliższych `ile` dni (strefa Europe/Warsaw). Zaległe, bez terminu i błędy do poprawy
 * (są gotowe od razu, due_at to termin powtórki całej umiejętności) liczą się do dziś. Pozycje dalej niż `ile` dni nie wchodzą.
 */
export function powtorkiNaDni(kolejka: Powtorka[], ile = 7) {
  const dzis = dzienWarszawa.format(new Date());
  const dni = Array.from({ length: ile }, (_, i) => {
    const d = new Date(`${dzis}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const data = d.toISOString().slice(0, 10);
    return { data, podpis: i === 0 ? "dziś" : skrotDnia.format(d).replace(".", ""), liczba: 0 };
  });
  for (const p of kolejka) {
    const data = p.due_at && !p.mistake ? dzienWarszawa.format(new Date(p.due_at)) : dzis;
    const dzien = data <= dzis ? dni[0] : dni.find((d) => d.data === data);
    if (dzien) dzien.liczba++;
  }
  return dni;
}

export const odmianaPowtorek = (n: number) =>
  n === 1 ? "powtórka" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "powtórki" : "powtórek";
