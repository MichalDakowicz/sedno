// Przedmioty maturalne, które konto wybiera w onboardingu i profilu (profiles.subjects).
import type { Poziom } from "../arkusze/typy";

export type PrzedmiotId = "polski" | "matematyka" | "angielski";
export type Ton = "orange" | "blue" | "yellow";
export type MojPrzedmiot = { id: PrzedmiotId; poziom: Poziom };

export const PRZEDMIOTY: { id: PrzedmiotId; nazwa: string; tone: Ton; poziomy: Poziom[] }[] = [
  { id: "polski", nazwa: "Polski", tone: "orange", poziomy: ["podstawowy", "rozszerzony"] },
  { id: "matematyka", nazwa: "Matematyka", tone: "blue", poziomy: ["podstawowy", "rozszerzony"] },
  { id: "angielski", nazwa: "Angielski", tone: "yellow", poziomy: ["podstawowy", "rozszerzony", "dwujezyczny"] },
];

export const nazwaPoziomu: Record<Poziom, string> = { podstawowy: "podstawowy", rozszerzony: "rozszerzony", dwujezyczny: "dwujęzyczny" };

export const przedmiot = (id: string) => PRZEDMIOTY.find((p) => p.id === id);

/** Odfiltrowuje wpisy, których katalog nie zna (np. po zmianie listy przedmiotów). */
export function poprawne(raw: unknown): MojPrzedmiot[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is MojPrzedmiot => {
    const p = x && typeof x === "object" ? przedmiot((x as MojPrzedmiot).id) : undefined;
    return !!p && p.poziomy.includes((x as MojPrzedmiot).poziom);
  });
}

// Początek sesji majowej 2027 (egzamin z polskiego). Do weryfikacji z harmonogramem CKE,
// dlatego w interfejsie zawsze „ok. N dni”.
export const POCZATEK_MATURY = "2027-05-04";

export function dniDoMatury(): number {
  return Math.max(0, Math.ceil((new Date(POCZATEK_MATURY).getTime() - Date.now()) / 86_400_000));
}

/** „polski (podstawowy), angielski (rozszerzony)”: do kontekstu rozmowy z Pestką. */
export function opisPrzedmiotow(moje: MojPrzedmiot[]): string {
  return moje.map((m) => `${przedmiot(m.id)!.nazwa.toLowerCase()} (${nazwaPoziomu[m.poziom]})`).join(", ");
}
