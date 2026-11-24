// Dzielenie tekstu utworu z Wolnych Lektur na fragmenty z lokalizacją (czysta logika, bez sieci).
// Używa jej wgraj-teksty.ts. Tekstów nie przechowujemy w repozytorium.
import { rzymskie } from "../functions/_shared/liczby-rzymskie.ts";

export type Fragment = {
  nr: number; czesc: number; miejsce: string; tytulCzesci: string; tekst: string; slowa: number; url: string;
};

export const MAX_SLOW = 800;
export const CEL_SLOW = 500;
const MIN_OGON = 150;

const liczbaSlow = (t: string) => t.split(/\s+/).filter(Boolean).length;
const normTytul = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const zdanie = (t: string) => { const m = t.trim().toLowerCase(); return m.charAt(0).toUpperCase() + m.slice(1); };

/** Treść bez nagłówka i stopki Wolnych Lektur. Zwraca undefined, gdy tekst nie jest oznaczony jako domena publiczna. */
export function wytnijTresc(txt: string): string | undefined {
  const t = txt.replace(/\r\n?/g, "\n");
  if (!t.includes("Ten utwór jest w domenie publicznej")) return;
  const znaczniki = [...t.matchAll(/\n-{5,}[ \t]*\n(?=[^\n]*(?:Ta lektura, podobnie|Ten utwór))/g)];
  const koniec = znaczniki.length ? znaczniki.at(-1)!.index! : t.lastIndexOf("Ten utwór jest w domenie publicznej");
  return t.slice(0, koniec);
}

/** Nagłówki Wolnych Lektur mają własne id lub bezpośrednio poprzedzającą kotwicę czytnika. */
export function kotwiceZHtml(html: string): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const m of html.matchAll(/(?:<a name="(s\d+)" class="target">\s*<\/a>\s*)?<h([2-4])\b([^>]*)>([\s\S]*?)<\/h\2>/g)) {
    const id = /\bid="([A-Za-z0-9_-]+)"/.exec(m[3])?.[1];
    const kotwica = id && !id.startsWith("menu-") ? id : m[1];
    if (!kotwica) continue;
    const tekst = normTytul(m[4].replace(/<a\b[^>]*\bclass="annotation"[^>]*>[\s\S]*?<\/a>/g, "")
      .replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " "));
    if (tekst && !mapa.has(tekst)) mapa.set(tekst, kotwica);
  }
  return mapa;
}

type Poziom = "tom" | "czesc" | "ksiega" | "akt" | "lisc";
const KOLEJNOSC: Poziom[] = ["tom", "czesc", "ksiega", "akt", "lisc"];
type Naglowek = { poziom: Poziom; etykieta: string; tytul: string };

const arabska = (s: string) => String(rzymskie(s) ?? s);

/** Rozpoznaje linię nagłówka strukturalnego; null, gdy to zwykły tekst. */
export function naglowek(linia: string): Naglowek | null {
  const l = linia.trim();
  if (!l || l.length > 140) return null;
  let m = /^Tom ([IVX]+)$/.exec(l);
  if (m) return { poziom: "tom", etykieta: `t. ${m[1]}`, tytul: "" };
  m = /^(?:CZĘŚĆ|Część) ([IVXL]+)\.?\s*(.*)$/.exec(l);
  if (m) return { poziom: "czesc", etykieta: `cz. ${m[1]}`, tytul: m[2] };
  m = /^(?:KSIĘGA|Księga) ([IVXL]+|[\p{L}]+)\.?\s*(.*)$/u.exec(l);
  if (m) return { poziom: "ksiega", etykieta: `ks. ${m[1].toUpperCase() === m[1] || rzymskie(m[1]) ? m[1] : zdanie(m[1])}`, tytul: m[2] };
  m = /^(?:AKT|Akt) ([IVXL]+)\.?$/.exec(l);
  if (m) return { poziom: "akt", etykieta: `akt ${m[1]}`, tytul: "" };
  m = /^(?:SCENA|Scena) ([IVXL]+|[\p{Lu}]{3,})\.?\s*(.*)$/u.exec(l);
  if (m) return { poziom: "lisc", etykieta: `sc. ${rzymskie(m[1]) ? arabska(m[1]) : m[1].toLowerCase()}`, tytul: zdanie(m[2].replace(/^[.\s—-]+/, "")) };
  m = /^(?:ROZDZIAŁ|Rozdział) ([IVXL]+|\d+)\.?\s*(.*)$/.exec(l);
  if (m) return { poziom: "lisc", etykieta: `rozdz. ${/^\d+$/.test(m[1]) ? m[1] : arabska(m[1])}`, tytul: m[2] };
  m = /^(PROLOG|USTĘP|EPILOG|WSTĘP|Prolog|Ustęp|Epilog|Wstęp)\.?$/.exec(l);
  if (m) return { poziom: "akt", etykieta: m[1].toLowerCase(), tytul: "" };
  m = /^([IVXLC]{1,7})\. (\S.{1,120})$/.exec(l);
  if (m && rzymskie(m[1])) return { poziom: "lisc", etykieta: `rozdz. ${arabska(m[1])}`, tytul: m[2] };
  return null;
}

type Sekcja = { sciezka: Partial<Record<Poziom, string>>; naglowek: string; tytul: string; akapity: string[][] };

function sekcje(tresc: string, tomPoczatkowy?: string): Sekcja[] {
  const linie = tresc.split("\n");
  const wynik: Sekcja[] = [];
  const sciezka: Partial<Record<Poziom, string>> = tomPoczatkowy ? { tom: tomPoczatkowy } : {};
  let biezaca: Sekcja | undefined;
  let akapit: string[] = [];
  const zamknijAkapit = () => {
    if (akapit.length && biezaca) biezaca.akapity.push(akapit);
    akapit = [];
  };
  linie.forEach((linia, i) => {
    const poprzedniaPusta = i === 0 || !linie[i - 1].trim();
    const h = poprzedniaPusta ? naglowek(linia) : null;
    if (h) {
      zamknijAkapit();
      KOLEJNOSC.slice(KOLEJNOSC.indexOf(h.poziom)).forEach((p) => delete sciezka[p]);
      sciezka[h.poziom] = h.etykieta;
      // Nagłówek wyższego poziomu bez własnego tekstu nie tworzy sekcji; sekcja powstaje przy pierwszym akapicie.
      biezaca = { sciezka: { ...sciezka }, naglowek: linia.trim(), tytul: h.tytul, akapity: [] };
      wynik.push(biezaca);
    } else if (!linia.trim()) zamknijAkapit();
    else if (biezaca) akapit.push(linia.trim());
  });
  zamknijAkapit();
  return wynik.filter((s) => s.akapity.length);
}

const nazwaMiejsca = (s: Sekcja) => KOLEJNOSC.flatMap((p) => s.sciezka[p] ?? []).join(", ");

/** Dzieli zbyt długi akapit na zdania, aby żaden kawałek nie przekroczył MAX_SLOW. */
function porcjeAkapitu(linie: string[]): string[][] {
  if (liczbaSlow(linie.join(" ")) <= MAX_SLOW) return [linie];
  const kawalki: string[][] = [];
  let aktualny: string[] = [];
  let slowa = 0;
  const jednostki = linie.length > 1 ? linie : linie[0].split(/(?<=[.!?…])\s+/);
  for (const j of jednostki) {
    const s = liczbaSlow(j);
    if (aktualny.length && slowa + s > MAX_SLOW) {
      kawalki.push(aktualny);
      aktualny = [];
      slowa = 0;
    }
    aktualny.push(j);
    slowa += s;
  }
  if (aktualny.length) kawalki.push(aktualny);
  return kawalki;
}

const czyWiersze = (akapity: string[][]) => {
  const linie = akapity.flat();
  return linie.length >= 8 && linie.reduce((s, l) => s + l.length, 0) / linie.length < 65 && akapity.every((a) => a.length > 1);
};

export type OpcjeDzielenia = {
  /** Adres strony książki w czytniku, np. https://wolnelektury.pl/katalog/lektura/lalka-tom-pierwszy.html */
  stronaHtml: string;
  kotwice?: Map<string, string>;
  /** Numer pierwszego fragmentu w utworze (dla kolejnych tomów). */
  odNr?: number;
  /** Tom, gdy sam tekst nie ma nagłówka „Tom …”. */
  tom?: string;
};

export function podzielTekst(tresc: string, opcje: OpcjeDzielenia): Fragment[] {
  let lista = sekcje(tresc, opcje.tom);
  if (!lista.length) {
    // Tekst bez nagłówków (np. krótki wiersz): jedna sekcja z całej treści.
    const akapity = tresc.split(/\n\s*\n/).map((a) => a.split("\n").map((l) => l.trim()).filter(Boolean)).filter((a) => a.length);
    lista = akapity.length ? [{ sciezka: {}, naglowek: "", tytul: "", akapity }] : [];
  }
  const fragmenty: Fragment[] = [];
  let nr = opcje.odNr ?? 1;
  let wersy = 0;
  let ksiega = "";
  for (const s of lista) {
    if ((s.sciezka.ksiega ?? "") !== ksiega) { ksiega = s.sciezka.ksiega ?? ""; wersy = 0; }
    const wierszowa = czyWiersze(s.akapity);
    const kawalki: { tekst: string; slowa: number; wersyOd: number; wersyDo: number }[] = [];
    let tekst: string[] = [];
    let slowa = 0;
    let od = wersy + 1;
    const zamknij = () => {
      if (!tekst.length) return;
      kawalki.push({ tekst: tekst.join("\n\n"), slowa, wersyOd: od, wersyDo: wersy });
      tekst = [];
      slowa = 0;
      od = wersy + 1;
    };
    for (const a of s.akapity.flatMap(porcjeAkapitu)) {
      const sa = liczbaSlow(a.join(" "));
      if (tekst.length && (slowa >= CEL_SLOW || slowa + sa > MAX_SLOW)) zamknij();
      tekst.push(a.join("\n"));
      slowa += sa;
      if (wierszowa) wersy += a.length;
    }
    zamknij();
    const ostatni = kawalki.at(-1), przedostatni = kawalki.at(-2);
    if (ostatni && przedostatni && ostatni.slowa < MIN_OGON && przedostatni.slowa + ostatni.slowa <= MAX_SLOW + 200) {
      przedostatni.tekst += `\n\n${ostatni.tekst}`;
      przedostatni.slowa += ostatni.slowa;
      przedostatni.wersyDo = ostatni.wersyDo;
      kawalki.pop();
    }
    const baza = nazwaMiejsca(s) || "fragment";
    const kotwica = opcje.kotwice?.get(normTytul(s.naglowek));
    const url = `${opcje.stronaHtml}${kotwica ? `#${kotwica}` : ""}`;
    kawalki.forEach((k, i) => {
      fragmenty.push({
        nr: nr++, czesc: i + 1,
        miejsce: wierszowa ? `${baza}, w. ${k.wersyOd}–${k.wersyDo}` : baza,
        tytulCzesci: s.tytul, tekst: k.tekst, slowa: k.slowa, url,
      });
    });
  }
  return fragmenty;
}
