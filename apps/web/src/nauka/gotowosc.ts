// Gotowość do matury z przedmiotu: jedna liczba z mapy umiejętności i jedno zdanie-wniosek.
// Liczba to średnia opanowania umiejętności ważona ich punktami na maturze (exam_points; bez punktów waga 1).
// Umiejętność bez oceny (za mało prób) nie wchodzi do średniej: brak danych to nie zero. Wynik jest wstępny, dopóki oceniona jest mniej niż połowa wagi albo prób jest mniej niż 20.
import type { Umiejetnosc } from "./api";

export const OBSZARY_NAUKI = [
  { id: "słuchanie", nazwa: "Słuchanie" },
  { id: "czytanie", nazwa: "Czytanie" },
  { id: "środki językowe", nazwa: "Środki językowe" },
  { id: "pisanie", nazwa: "Pisanie" },
] as const;

export const nazwaObszaru = (id: string) => OBSZARY_NAUKI.find((o) => o.id === id)?.nazwa ?? id;

export type Gotowosc = {
  /** 0–1 */
  wartosc: number;
  wstepna: boolean;
  /** Obszar z najwyższym opanowaniem (tylko z ocenionych umiejętności); null bez ocen. */
  najmocniej: string | null;
  /** Obszar, w którym do zdobycia jest najwięcej punktów matury. */
  doZyskania: string | null;
};

const waga = (u: Umiejetnosc) => (u.exam_points > 0 ? u.exam_points : 1);

export function policzGotowosc(umiejetnosci: Umiejetnosc[]): Gotowosc | null {
  if (!umiejetnosci.length) return null;
  const suma = umiejetnosci.reduce((s, u) => s + waga(u), 0);
  
  const ocenione = umiejetnosci.filter((u) => u.score !== null);
  const wagaOcenionych = ocenione.reduce((s, u) => s + waga(u), 0);
  const wartosc = wagaOcenionych ? ocenione.reduce((s, u) => s + waga(u) * u.score!, 0) / wagaOcenionych : 0;
  const prob = umiejetnosci.reduce((s, u) => s + u.evidence_count, 0);
  const obszary = OBSZARY_NAUKI.map((o) => {
    const lista = umiejetnosci.filter((u) => u.area === o.id);
    const oc = lista.filter((u) => u.score !== null);
    const w = oc.reduce((s, u) => s + waga(u), 0);
    return {
      id: o.id,
      opanowanie: w ? oc.reduce((s, u) => s + waga(u) * u.score!, 0) / w : null,
      // Brakujące punkty: ocenione do 100%, nieocenione w całości.
      brakuje: lista.reduce((s, u) => s + waga(u) * (1 - (u.score ?? 0)), 0),
    };
  }).filter((o) => umiejetnosci.some((u) => u.area === o.id));
  const zOcena = obszary.filter((o) => o.opanowanie !== null).sort((a, b) => b.opanowanie! - a.opanowanie!);
  const doZyskania = [...obszary].sort((a, b) => b.brakuje - a.brakuje)[0]?.id ?? null;
  return {
    wartosc,
    wstepna: wagaOcenionych < suma / 2 || prob < 20,
    najmocniej: zOcena[0]?.id ?? null,
    doZyskania,
  };
}

/** Jedno zdanie: co najmocniejsze i gdzie najwięcej do zyskania, a z celem: ile brakuje. */
export function wniosekGotowosci(g: Gotowosc, cel: number | null): string {
  const zyskac = g.doZyskania ? nazwaObszaru(g.doZyskania).toLowerCase() : null;
  if (cel !== null && g.wartosc >= cel) return `Cel osiągnięty.${g.najmocniej ? ` Najmocniej: ${nazwaObszaru(g.najmocniej).toLowerCase()}.` : ""}`;
  if (cel !== null) return `Do celu brakuje ${Math.round((cel - g.wartosc) * 100)} pkt proc.${zyskac ? ` Najwięcej da ${zyskac}.` : ""}`;
  if (!g.najmocniej) return zyskac ? `Zacznę od pierwszej rundy. Najwięcej do zyskania: ${zyskac}.` : "Zacznę od pierwszej rundy.";
  const mocno = nazwaObszaru(g.najmocniej).toLowerCase();
  return zyskac && zyskac !== mocno ? `Najmocniej: ${mocno}. Najwięcej do zyskania: ${zyskac}.` : `Najmocniej: ${mocno}.`;
}
