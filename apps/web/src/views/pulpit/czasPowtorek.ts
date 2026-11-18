import type { Powtorka } from "../../nauka/api";

// Każda rekomendacja z nauka_polec i nauka_powtorki ma w SQL stałe 5 minut na jedną krótką rundę.
const MINUTY_RUNDY = 5;

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

export const szacowanyCzas = (rundy: number) => `ok. ${rundy * MINUTY_RUNDY} minut`;
