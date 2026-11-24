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
const POZIOMY: RodzajMiejsca[] = ["t", "cz", "ks", "akt", "rozdz", "sc"];
const SKLADNIK = /\b((tom\w*|t(?=\.)|czesc\w*|cz(?=\.)|rozdzial\w*|rozdz(?=\.)|akt\w*|scen\w*|sc(?=\.)|ksieg\w*|ks(?=\.))(?:\.\s*|\s+))(\w+)\b(?:\s*[–—-]\s*([ivxlc]+|\d+)\b)?/g;
const NASTEPNY_NUMER = /^(?:[ \t]*,[ \t]*|[ \t]+(?:i|oraz)[ \t]+)((?:\d+|[IVXLC]+)(?![\p{L}\d])(?:[ \t]*[–—-][ \t]*(?:\d+|[IVXLC]+)(?![\p{L}\d]))?)/u;

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

function skladniki(tekst: string) {
  return [...bezAkcentow(tekst).matchAll(SKLADNIK)].flatMap((m) => {
    const [fraza, prefiks, typ, liczba, koniec] = m;
    const klucz = PREFIKSY_MIEJSC.find((k) => typ.startsWith(k));
    const nr = liczbaMiejsca(liczba);
    if (!klucz || !nr) return [];
    const rodzaj = RODZAJE[klucz];
    const od = m.index + prefiks.length;
    let doZnaku = m.index + fraza.length;
    const liczby = [tekst.slice(od, doZnaku)];
    const miejsca: Miejsce[] = [{ rodzaj, nr, doNumeru: koniec ? liczbaMiejsca(koniec) : undefined }];
    for (let dalszy = NASTEPNY_NUMER.exec(tekst.slice(doZnaku)); dalszy; dalszy = NASTEPNY_NUMER.exec(tekst.slice(doZnaku))) {
      const [poczatek, koniec] = dalszy[1].split(/[–—-]/).map((x) => x.trim());
      const nr = liczbaMiejsca(poczatek);
      if (!nr) break;
      miejsca.push({ rodzaj, nr, doNumeru: koniec ? liczbaMiejsca(koniec) : undefined });
      liczby.push(dalszy[1]);
      doZnaku += dalszy[0].length;
    }
    return [{ poczatek: m.index, od, doZnaku, liczby, miejsca }];
  });
}

export function miejscaWZapytaniu(tekst: string): Miejsce[] {
  const miejsca = new Map<RodzajMiejsca, Miejsce>();
  for (const { miejsca: [pierwsze] } of skladniki(tekst.normalize("NFC"))) {
    if (!miejsca.has(pierwsze.rodzaj)) miejsca.set(pierwsze.rodzaj, pierwsze);
  }
  return [...miejsca.values()];
}

/** Każde wymienione miejsce z nadrzędnym tomem, częścią lub aktem. */
export function miejscaWZdaniu(tekst: string): Miejsce[][] {
  tekst = tekst.normalize("NFC");
  const skladnikiZdania = skladniki(tekst);
  const kolejnosc: Miejsce[] = [];
  for (let i = 0; i < skladnikiZdania.length; i++) {
    const biezacy = skladnikiZdania[i];
    const nastepny = skladnikiZdania[i + 1];
    // W zapisie „rozdz. 3 i 10 tomu II” tom określa oba rozdziały.
    if (nastepny && POZIOMY.indexOf(nastepny.miejsca[0].rodzaj) < POZIOMY.indexOf(biezacy.miejsca[0].rodzaj) &&
      /^\s+(?:w\s+)?$/i.test(tekst.slice(biezacy.doZnaku, nastepny.poczatek))) {
      kolejnosc.push(...nastepny.miejsca);
      i++;
    }
    kolejnosc.push(...biezacy.miejsca);
  }
  const wynik: Miejsce[][] = [];
  let biezace: Miejsce[] = [];
  for (const m of kolejnosc) {
    const poziom = POZIOMY.indexOf(m.rodzaj);
    const zachowaj = biezace.filter((w) => POZIOMY.indexOf(w.rodzaj) < poziom);
    if (zachowaj.length < biezace.length) wynik.push(biezace);
    biezace = [...zachowaj, m];
  }
  if (biezace.length) wynik.push(biezace);
  return wynik;
}

export function pasujeMiejsce(miejsce: string, szukane: Miejsce[]): boolean {
  const wMiejscu = miejscaWZapytaniu(miejsce);
  return szukane.every(({ rodzaj, nr, doNumeru }) =>
    wMiejscu.some((m) => m.rodzaj === rodzaj && m.nr <= nr && (doNumeru ?? nr) <= (m.doNumeru ?? m.nr)));
}

export const zapisMiejsca = (miejsca: Miejsce[]) =>
  miejsca.map(({ rodzaj, nr }) => `${rodzaj === "akt" ? "akt" : rodzaj + "."} ${nr}`).join(", ");

export function rozbijMiejsca(miejsce: string): string[] {
  return miejsce.normalize("NFC").split(/;|\s+(?:i|[–—-])\s+(?=(?:akt\b|(?:t|cz|sc|ks|rozdz)\.|epilog\b|prolog\b|Jesień\b|Zima\b|Wiosna\b|Lato\b))/i)
    .map((m) => m.trim()).filter(Boolean).flatMap((m) => {
      const lista = skladniki(m).findLast((s) => s.liczby.length > 1);
      return lista ? lista.liczby.map((nr) => m.slice(0, lista.od) + nr + m.slice(lista.doZnaku)) : [m];
    });
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
