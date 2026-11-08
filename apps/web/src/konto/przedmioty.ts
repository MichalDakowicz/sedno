// Przedmioty maturalne, które konto wybiera w onboardingu i profilu (profiles.subjects).
import type { Poziom } from "../arkusze/typy";

export type PrzedmiotId = "polski" | "matematyka" | "angielski" | "informatyka";
export type Ton = "orange" | "blue" | "yellow" | "green";
export type MojPrzedmiot = { id: PrzedmiotId; poziom: Poziom };

export const PRZEDMIOTY: { id: PrzedmiotId; nazwa: string; tone: Ton; poziomy: Poziom[] }[] = [
  { id: "polski", nazwa: "Polski", tone: "orange", poziomy: ["podstawowy", "rozszerzony"] },
  { id: "matematyka", nazwa: "Matematyka", tone: "blue", poziomy: ["podstawowy", "rozszerzony"] },
  { id: "angielski", nazwa: "Angielski", tone: "yellow", poziomy: ["podstawowy", "rozszerzony", "dwujezyczny"] },
  { id: "informatyka", nazwa: "Informatyka", tone: "green", poziomy: ["rozszerzony"] },
];

export const nazwaPoziomu: Record<Poziom, string> = { podstawowy: "podstawowy", rozszerzony: "rozszerzony", dwujezyczny: "dwujęzyczny" };

export const przedmiot = (id: string) => PRZEDMIOTY.find((p) => p.id === id);

/** Odfiltrowuje wpisy, których katalog nie zna (np. po zmianie listy przedmiotów). */
export function poprawne(raw: unknown): MojPrzedmiot[] {
  if (!Array.isArray(raw)) return [];
  const ok = raw.filter((x): x is MojPrzedmiot => {
    const p = x && typeof x === "object" ? przedmiot((x as MojPrzedmiot).id) : undefined;
    return !!p && p.poziomy.includes((x as MojPrzedmiot).poziom);
  });
  return ok.filter((x, i) => ok.findIndex((y) => y.id === x.id && y.poziom === x.poziom) === i);
}

export type PrzedmiotKonta = { id: PrzedmiotId; poziomy: Poziom[] };

/** Konto może zdawać przedmiot na dwóch poziomach (osobne wpisy w subjects); tu każdy przedmiot raz, z jego poziomami. */
export function zgrupuj(moje: MojPrzedmiot[]): PrzedmiotKonta[] {
  return PRZEDMIOTY.flatMap((p) => {
    const poziomy = p.poziomy.filter((l) => moje.some((m) => m.id === p.id && m.poziom === l));
    return poziomy.length ? [{ id: p.id, poziomy }] : [];
  });
}

/** „podstawowy i rozszerzony” */
export const opisPoziomow = (poziomy: Poziom[]) => poziomy.map((l) => nazwaPoziomu[l]).join(" i ");

// Początek sesji majowej 2027 (egzamin z polskiego). Do weryfikacji z harmonogramem CKE,
// dlatego w interfejsie zawsze „ok. N dni”.
export const POCZATEK_MATURY = "2027-05-04";

export function dniDoMatury(): number {
  return Math.max(0, Math.ceil((new Date(POCZATEK_MATURY).getTime() - Date.now()) / 86_400_000));
}

/** „polski (podstawowy i rozszerzony), angielski (rozszerzony)”: do kontekstu rozmowy z Pestką. */
export function opisPrzedmiotow(moje: MojPrzedmiot[]): string {
  return zgrupuj(moje).map((m) => `${przedmiot(m.id)!.nazwa.toLowerCase()} (${opisPoziomow(m.poziomy)})`).join(", ");
}
