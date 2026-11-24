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
type Miejsce = { rodzaj: RodzajMiejsca; nr: number; doNumeru?: number };
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
  for (const [, typ, liczba, koniec] of bezAkcentow(tekst).matchAll(/\b(tom\w*|t(?=\.)|czesc\w*|cz(?=\.)|rozdzial\w*|rozdz(?=\.)|akt\w*|scen\w*|sc(?=\.)|ksieg\w*|ks(?=\.))(?:\.\s*|\s+)(\w+)\b(?:\s*[–—-]\s*([ivxlc]+|\d+)\b)?/g)) {
    const klucz = PREFIKSY_MIEJSC.find((k) => typ.startsWith(k));
    if (!klucz) continue;
    const rodzaj = RODZAJE[klucz];
    const nr = liczbaMiejsca(liczba);
    if (nr && !miejsca.has(rodzaj)) miejsca.set(rodzaj, { rodzaj, nr, doNumeru: koniec ? liczbaMiejsca(koniec) : undefined });
  }
  return [...miejsca.values()];
}

export function pasujeMiejsce(miejsce: string, szukane: Miejsce[]): boolean {
  const wMiejscu = miejscaWZapytaniu(miejsce);
  return szukane.every(({ rodzaj, nr, doNumeru }) =>
    wMiejscu.some((m) => m.rodzaj === rodzaj && m.nr <= nr && (doNumeru ?? nr) <= (m.doNumeru ?? m.nr)));
}

export const zapisMiejsca = (miejsca: Miejsce[]) =>
  miejsca.map(({ rodzaj, nr }) => `${rodzaj === "akt" ? "akt" : rodzaj + "."} ${nr}`).join(", ");

export function rozbijMiejsca(miejsce: string): string[] {
  return miejsce.split(/;|\s+(?:i|[–—-])\s+(?=(?:akt\b|(?:t|cz|sc|ks|rozdz)\.|epilog\b|prolog\b|Jesień\b|Zima\b|Wiosna\b|Lato\b))/i)
    .map((m) => m.trim()).filter(Boolean);
}

export function miejsceWydania(utwor: string, miejsce: string): string {
  if (utwor !== "chlopi") return miejsce;
  const pory = ["jesien", "zima", "wiosna", "lato"];
  const m = /^(jesien|zima|wiosna|lato)(?:[, ]+(?:rozdz\.?\s+)?([ivxlc]+|\d+)\b(.*))?$/i.exec(bezAkcentow(miejsce));
  if (!m) return miejsce;
  const rozdzial = m[2] && liczbaMiejsca(m[2]);
  return `cz. ${pory.indexOf(m[1]) + 1}${rozdzial ? `, rozdz. ${rozdzial}${m[3]}` : ""}`;
}

export function adresTomu(utwor: string, miejsce: string): string | undefined {
  const nr = miejscaWZapytaniu(miejsceWydania(utwor, miejsce)).find((m) => m.rodzaj === "t" || m.rodzaj === "cz")?.nr;
  const slug = nr && TOMY_WL[utwor]?.[nr - 1];
  if (slug) return `https://wolnelektury.pl/katalog/lektura/${slug}/`;
  if (utwor === "zbrodnia-i-kara" && (nr || /^epilog\b/i.test(miejsce))) {
    const tom = nr && nr <= 3 ? "I" : "II";
    return `https://pl.wikisource.org/wiki/Zbrodnia_i_kara_(Dostojewski,_1928)/Tom_${tom}/całość`;
  }
}
