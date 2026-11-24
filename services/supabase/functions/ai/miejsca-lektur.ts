import { rzymskie } from "../_shared/liczby-rzymskie.ts";
import { bezAkcentow } from "./lektury.ts";

export const TOMY_WL: Readonly<Record<string, readonly string[]>> = {
  lalka: ["lalka-tom-pierwszy", "lalka-tom-drugi"],
  chlopi: ["chlopi-czesc-pierwsza-jesien", "reymont-chlopi-zima", "chlopi-czesc-trzecia-wiosna", "chlopi-czesc-czwarta-lato"],
};

const RODZAJE = {
  tom: "t", t: "t", czesc: "cz", cz: "cz", rozdzial: "rozdz", rozdz: "rozdz",
  akt: "akt", scena: "sc", sc: "sc", ksiega: "ks", ks: "ks",
} as const;
type RodzajMiejsca = typeof RODZAJE[keyof typeof RODZAJE];
type Miejsce = { rodzaj: RodzajMiejsca; nr: number };
const PREFIKSY_MIEJSC = (Object.keys(RODZAJE) as (keyof typeof RODZAJE)[]).sort((a, b) => b.length - a.length);

const PORZADKOWE = [
  "pierwsz", "drug", "trzec", "czwart", "piat", "szost", "siodm", "osm",
  "dziewiat", "dziesiat", "jedenast", "dwunast", "trzynast", "czternast",
];

export function liczbaMiejsca(s: string): number | undefined {
  if (/^\d+$/.test(s)) return Number(s) || undefined;
  const r = rzymskie(s.toUpperCase());
  if (r) return r;
  const tekst = bezAkcentow(s);
  const i = PORZADKOWE.findIndex((p) => new RegExp(`^${p}(?:i?a|y|i|e|i?ej|i?ego|ym|im|i?emu)?$`).test(tekst));
  return i < 0 ? undefined : i + 1;
}

export function miejscaWZapytaniu(tekst: string): Miejsce[] {
  const miejsca = new Map<RodzajMiejsca, Miejsce>();
  for (const [, typ, liczba] of bezAkcentow(tekst).matchAll(/\b(tom\w*|t(?=\.)|czesc\w*|cz(?=\.)|rozdzial\w*|rozdz(?=\.)|akt\w*|scen\w*|sc(?=\.)|ksieg\w*|ks(?=\.))\.?\s+(\w+)\b/g)) {
    const klucz = PREFIKSY_MIEJSC.find((k) => typ.startsWith(k));
    if (!klucz) continue;
    const rodzaj = RODZAJE[klucz];
    const nr = liczbaMiejsca(liczba);
    if (nr && !miejsca.has(rodzaj)) miejsca.set(rodzaj, { rodzaj, nr });
  }
  return [...miejsca.values()];
}

export function pasujeMiejsce(miejsce: string, szukane: Miejsce[]): boolean {
  const wMiejscu = miejscaWZapytaniu(miejsce);
  return szukane.every(({ rodzaj, nr }) => wMiejscu.some((m) => m.rodzaj === rodzaj && m.nr === nr));
}

export const zapisMiejsca = (miejsca: Miejsce[]) =>
  miejsca.map(({ rodzaj, nr }) => `${rodzaj === "akt" ? "akt" : rodzaj + "."} ${nr}`).join(", ");

export function adresTomu(utwor: string, miejsce: string): string | undefined {
  const nr = miejscaWZapytaniu(miejsce).find((m) => m.rodzaj === "t" || m.rodzaj === "cz")?.nr;
  const slug = nr && TOMY_WL[utwor]?.[nr - 1];
  if (slug) return `https://wolnelektury.pl/katalog/lektura/${slug}/`;
  if (utwor === "zbrodnia-i-kara" && (nr || /^epilog\b/i.test(miejsce))) {
    const tom = nr && nr <= 3 ? "I" : "II";
    return `https://pl.wikisource.org/wiki/Zbrodnia_i_kara_(Dostojewski,_1928)/Tom_${tom}/całość`;
  }
}
