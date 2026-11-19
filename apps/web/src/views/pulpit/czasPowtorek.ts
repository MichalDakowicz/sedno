import { nazwaZadaniaCke, nazwaZadaniaRundy } from "../../arkusze/typy";
import type { Powtorka } from "../../nauka/api";

export function kluczPowtorki(p: Powtorka) {
  const m = p.mistake;
  if (!m) return p.skill_id;
  return `${p.skill_id}:${m.source_id ?? m.sheet_id ?? m.session_id ?? ""}:${m.question ?? ""}`;
}

/** Kolejka bez powtórzeń: każda pozycja to osobna krótka runda. */
export function unikalnePowtorki(kolejka: Powtorka[]) {
  const klucze = new Set<string>();
  return kolejka.filter((p) => {
    const klucz = kluczPowtorki(p);
    if (klucze.has(klucz)) return false;
    klucze.add(klucz);
    return true;
  });
}

/** Podpis źródła błędu bez linku: „Matura maj 2026 · zadanie 1.3” albo „Szybka runda z 18 listopada · zadanie 5”. */
export function etykietaZrodla(blad: NonNullable<Powtorka["mistake"]>): string | null {
  if (blad.sheet_id) return blad.question ? nazwaZadaniaCke(blad.sheet_id, blad.question) : nazwaZadaniaCke(blad.sheet_id, "").replace(/ · zadanie $/, "");
  if (blad.session_id) return blad.question ? nazwaZadaniaRundy(blad.happened_at, blad.question) : "Wynik poprzedniej rundy";
  return null;
}
