// Przedmioty maturalne, które konto wybiera w onboardingu i profilu (profiles.subjects).
import type { Poziom, Przedmiot } from "../arkusze/typy";

// Te same dwanaście przedmiotów co w danych arkuszy (arkusze/typy.ts).
export type PrzedmiotId = Przedmiot;
// Cztery tony z tokens.css: humanistyczne pomarańczowy, ścisłe niebieski, języki żółty, przyroda i informatyka zielony.
export type Ton = "orange" | "blue" | "yellow" | "green";
export type MojPrzedmiot = { id: PrzedmiotId; poziom: Poziom };

// Poziomy według formuły 2023 (matura od 2025): polski, matematyka i angielski mają podstawowy i rozszerzony,
// pozostałe przedmioty tylko rozszerzony. Do weryfikacji z komunikatem CKE przed wydaniem.
export const PRZEDMIOTY: { id: PrzedmiotId; nazwa: string; tone: Ton; poziomy: Poziom[] }[] = [
  { id: "polski", nazwa: "Polski", tone: "orange", poziomy: ["podstawowy", "rozszerzony"] },
  { id: "matematyka", nazwa: "Matematyka", tone: "blue", poziomy: ["podstawowy", "rozszerzony"] },
  { id: "angielski", nazwa: "Angielski", tone: "yellow", poziomy: ["podstawowy", "rozszerzony", "dwujezyczny"] },
  { id: "informatyka", nazwa: "Informatyka", tone: "green", poziomy: ["rozszerzony"] },
  { id: "biologia", nazwa: "Biologia", tone: "green", poziomy: ["rozszerzony"] },
  { id: "chemia", nazwa: "Chemia", tone: "blue", poziomy: ["rozszerzony"] },
  { id: "fizyka", nazwa: "Fizyka", tone: "blue", poziomy: ["rozszerzony"] },
  { id: "geografia", nazwa: "Geografia", tone: "green", poziomy: ["rozszerzony"] },
  { id: "historia", nazwa: "Historia", tone: "orange", poziomy: ["rozszerzony"] },
  { id: "wos", nazwa: "WOS", tone: "orange", poziomy: ["rozszerzony"] },
  { id: "filozofia", nazwa: "Filozofia", tone: "orange", poziomy: ["rozszerzony"] },
  { id: "lacina", nazwa: "Łacina", tone: "yellow", poziomy: ["rozszerzony"] },
];

// Baza (migracja 0003) przyjmuje w profiles.subjects najwyżej 12 wpisów; wpis to przedmiot z jednym poziomem.
export const MAX_WPISOW_PRZEDMIOTOW = 12;

export const nazwaPoziomu: Record<Poziom, string> = { podstawowy: "podstawowy", rozszerzony: "rozszerzony", dwujezyczny: "dwujęzyczny" };

export const przedmiot = (id: string) => PRZEDMIOTY.find((p) => p.id === id);

// Formy do zdań o brakach: „Arkuszy z matematyki na poziomie rozszerzonym jeszcze nie ma.”
export const przedmiotZ: Record<PrzedmiotId, string> = {
  polski: "z polskiego", matematyka: "z matematyki", angielski: "z angielskiego", informatyka: "z informatyki",
  biologia: "z biologii", chemia: "z chemii", fizyka: "z fizyki", geografia: "z geografii", historia: "z historii",
  wos: "z WOS-u", filozofia: "z filozofii", lacina: "z łaciny",
};
export const naPoziomie: Record<Poziom, string> = { podstawowy: "na poziomie podstawowym", rozszerzony: "na poziomie rozszerzonym", dwujezyczny: "na poziomie dwujęzycznym" };

/** „Arkuszy z matematyki na poziomie rozszerzonym jeszcze nie ma. Możesz ćwiczyć na poziomie podstawowym.” */
export function brakArkuszy(id: PrzedmiotId, poziom: Poziom | null, inne: Poziom[]): string {
  const brak = `Arkuszy ${przedmiotZ[id]}${poziom ? ` ${naPoziomie[poziom]}` : ""} jeszcze nie ma w Sedno.`;
  return inne.length ? `${brak} Możesz ćwiczyć ${naPoziomie[inne[0]!]}.` : brak;
}

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

/** Zapas, gdy nie znamy przedmiotów ucznia. Z przedmiotami liczymy od pierwszego egzaminu: `konto/terminy.ts`. */
export function dniDoMatury(): number {
  const [r, m, d] = POCZATEK_MATURY.split("-").map(Number);
  const dzis = new Date();
  const poczatek = new Date(dzis.getFullYear(), dzis.getMonth(), dzis.getDate());
  return Math.max(0, Math.round((new Date(r!, m! - 1, d!).getTime() - poczatek.getTime()) / 86_400_000));
}

/** „polski (podstawowy i rozszerzony), angielski (rozszerzony)”: do kontekstu rozmowy z Pestką. */
export function opisPrzedmiotow(moje: MojPrzedmiot[]): string {
  return zgrupuj(moje).map((m) => `${przedmiot(m.id)!.nazwa.toLowerCase()} (${opisPoziomow(m.poziomy)})`).join(", ");
}
