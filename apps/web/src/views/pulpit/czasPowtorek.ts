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

/** Podpis źródła błędu bez linku: arkusz z numerem zadania albo poprzednie ćwiczenie. */
export function etykietaZrodla(blad: NonNullable<Powtorka["mistake"]>): string | null {
  if (blad.sheet_id) {
    const rok = blad.sheet_id.match(/-(20\d{2})-/)?.[1];
    return [rok ? `Arkusz CKE ${rok}` : "Arkusz CKE", blad.question ? `zad. ${blad.question}` : null].filter(Boolean).join(" · ");
  }
  if (blad.session_id) return blad.question ? `Poprzednie ćwiczenie · zad. ${blad.question}` : "Wynik poprzedniego ćwiczenia";
  return null;
}
