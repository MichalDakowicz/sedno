// Czas przy zadaniach: ile uczeń myślał nad każdym zadaniem arkusza.
// Liczymy czas widocznej karty między kolejnymi czynnościami w arkuszu (odpowiedź, brudnopis,
// sprawdzenie) i przypisujemy go zadaniu, przy którym padła czynność: najpierw się myśli, choćby
// na kartce i bez ruchu na ekranie, potem odpowiada. Ukryta karta (inna aplikacja, zablokowany
// telefon) nie liczy się wcale, a cisza dłuższa niż PRZERWA to przerwa, chyba że arkusz idzie na czas.
import type { Postep } from "./postep";
import type { Arkusz, Zadanie } from "./typy";

const PRZERWA = 20 * 60_000;

let widoczne = 0;
let od: number | null = null;
if (typeof document !== "undefined") {
  od = document.visibilityState === "visible" ? performance.now() : null;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") od ??= performance.now();
    else if (od !== null) {
      widoczne += performance.now() - od;
      od = null;
    }
  });
}
const zegar = () => widoczne + (od !== null ? performance.now() - od : 0);

let ostatnia = zegar();

/** Początek liczenia, np. po otwarciu arkusza. */
export function zacznijOdmierzac() {
  ostatnia = zegar();
}

/** Czas od poprzedniej czynności (ms) i zapamiętanie bieżącej. */
export function odmierz(naCzas: boolean): number {
  const t = zegar();
  const d = t - ostatnia;
  ostatnia = t;
  return !naCzas && d > PRZERWA ? 0 : Math.round(d);
}

export const dodajCzas = (p: Postep, zadanie: number, ms: number): Postep =>
  ms > 0 ? { ...p, czasZadan: { ...p.czasZadan, [zadanie]: (p.czasZadan?.[zadanie] ?? 0) + ms } } : p;

/** Ile zadanie powinno zająć: czas arkusza proporcjonalnie do punktów. CKE nie podaje czasu na zadanie. */
export const norma = (a: Arkusz, z: Zadanie): number | null => (a.czas && a.punkty ? (a.czas * 60_000 * z.punkty) / a.punkty : null);

export type Tempo = "nie-rozumie" | "brak-wprawy" | "pospiech" | "w-normie";

/** Czas razem z poprawnością: wolno i źle to co innego niż wolno i dobrze. */
export function tempo(ms: number, normaMs: number | null, ulamekPunktow: number | null): Tempo | null {
  if (!normaMs || ulamekPunktow === null || ms < 15_000) return null;
  const r = ms / normaMs;
  if (r > 1.5) return ulamekPunktow < 0.5 ? "nie-rozumie" : "brak-wprawy";
  if (r < 0.4 && ulamekPunktow < 0.5) return "pospiech";
  return "w-normie";
}

export const opisTempa: Record<Exclude<Tempo, "w-normie">, string> = {
  "nie-rozumie": "długo i mało punktów: wróć do tego tematu",
  "brak-wprawy": "dobrze, ale wolno: przyda się wprawa",
  pospiech: "szybko i źle: zwolnij i sprawdzaj",
};

export function minuty(ms: number): string {
  const m = Math.round(ms / 60_000);
  return m < 1 ? "poniżej minuty" : `${m} min`;
}
