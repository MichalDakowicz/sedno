// Zapis matematyczny Pestki: ten sam rozbiór tekstu („√(16 × 2)”, „d²”, „8/2”) rysuje wzór na tablicy
// i zamienia go na LaTeX do dymka i historii, żeby w obu miejscach wyglądał tak samo.
import { FONT_FAMILY } from "@excalidraw/excalidraw";

export type Wezel =
  | { typ: "tekst"; tekst: string }
  | { typ: "potega"; tekst: string }
  | { typ: "pierwiastek"; wnetrze: Wezel[] }
  | { typ: "ulamek"; licznik: Wezel[]; mianownik: Wezel[] };

const INDEKSY_GORNE: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁺": "+", "⁻": "−", "ⁿ": "n",
};
const LITERA_LUB_CYFRA = /[\p{L}\p{N}]/u;
const PODPIERWIASTEK = /^[\p{L}\p{N},.]+/u;
// Krótkie liczniki i mianowniki: „8/2”, „4√2/2”, „(a+b)/2”. Dłuższe zostają zwykłym tekstem z kreską ukośną.
const ULAMEK = /(\([^()]{1,12}\)|[\p{L}\p{N},.√²³]{1,8})\s?\/\s?(\([^()]{1,12}\)|[\p{L}\p{N},.√²³]{1,8})(?![\p{L}\p{N}/])/uy;

function bezNawiasow(s: string) {
  return s.startsWith("(") && s.endsWith(")") ? s.slice(1, -1) : s;
}

// „km/h” to jednostka, nie ułamek: ułamek ma cyfrę albo jednoliterowe składniki.
function toUlamek(licznik: string, mianownik: string) {
  const krotki = (s: string) => /\p{N}/u.test(s) || bezNawiasow(s).replace(/[^\p{L}]/gu, "").length <= 1 || s.startsWith("(");
  return krotki(licznik) && krotki(mianownik);
}

export function rozbierz(tekst: string, ulamki: boolean): Wezel[] {
  const wynik: Wezel[] = [];
  const dopisz = (s: string) => {
    const ostatni = wynik.at(-1);
    if (ostatni?.typ === "tekst") ostatni.tekst += s;
    else wynik.push({ typ: "tekst", tekst: s });
  };
  const zUlamkami = ulamki && !/\/\/|https?:/.test(tekst);
  let i = 0;
  while (i < tekst.length) {
    const znak = tekst[i];
    const przed = i > 0 ? tekst[i - 1] : "";
    if (zUlamkami && !LITERA_LUB_CYFRA.test(przed) && przed !== "√") {
      ULAMEK.lastIndex = i;
      const m = ULAMEK.exec(tekst);
      if (m && toUlamek(m[1], m[2])) {
        wynik.push({ typ: "ulamek", licznik: rozbierz(bezNawiasow(m[1]), false), mianownik: rozbierz(bezNawiasow(m[2]), false) });
        i += m[0].length;
        continue;
      }
    }
    if (znak === "√") {
      let wnetrze: string | null = null;
      let dlugosc = 0;
      if (tekst[i + 1] === "(") {
        let glebokosc = 0;
        for (let j = i + 1; j < tekst.length; j++) {
          if (tekst[j] === "(") glebokosc++;
          else if (tekst[j] === ")" && --glebokosc === 0) {
            wnetrze = tekst.slice(i + 2, j);
            dlugosc = j - i + 1;
            break;
          }
        }
      } else {
        const m = PODPIERWIASTEK.exec(tekst.slice(i + 1));
        if (m) {
          wnetrze = m[0];
          dlugosc = m[0].length + 1;
        }
      }
      if (wnetrze?.trim()) {
        wynik.push({ typ: "pierwiastek", wnetrze: rozbierz(wnetrze, ulamki) });
        i += dlugosc;
        continue;
      }
    }
    if (INDEKSY_GORNE[znak]) {
      let potega = "";
      while (i < tekst.length && INDEKSY_GORNE[tekst[i]]) potega += INDEKSY_GORNE[tekst[i++]];
      wynik.push({ typ: "potega", tekst: potega });
      continue;
    }
    dopisz(znak);
    i++;
  }
  return wynik;
}

const maStrukture = (wezly: Wezel[]) => wezly.some((w) => w.typ !== "tekst");

// ---------- LaTeX do dymka i historii (TekstMat) ----------

const ZNAKI_TEX: Record<string, string> = {
  "×": "\\times ", "÷": "\\div ", "−": "-", "·": "\\cdot ", "≈": "\\approx ", "≤": "\\le ", "≥": "\\ge ",
  "≠": "\\ne ", "π": "\\pi ", "°": "^\\circ ", "∞": "\\infty ", "{": "\\{", "}": "\\}", "%": "\\%", "#": "\\#",
  "&": "\\&", "_": "\\_", "$": "\\$", "\\": "", "~": "", "^": "",
};

function tex(wezly: Wezel[]): string {
  return wezly.map((w) => {
    if (w.typ === "tekst") return Array.from(w.tekst, (z) => ZNAKI_TEX[z] ?? z).join("");
    if (w.typ === "potega") return "^{" + tex([{ typ: "tekst", tekst: w.tekst }]) + "}";
    if (w.typ === "pierwiastek") return "\\sqrt{" + tex(w.wnetrze) + "}";
    return "\\frac{" + tex(w.licznik) + "}{" + tex(w.mianownik) + "}";
  }).join("");
}

// Linia obliczeń bez słów (np. „d² = 4² + 4²”) idzie w całości jako wzór; w zdaniu tylko pierwiastki.
function czyWzor(linia: string) {
  return /[=√²³+×÷−<>≤≥≈/]/.test(linia) && !/\p{L}{4,}/u.test(linia) && !/\\\(/.test(linia);
}

export function wzoryDoWyswietlenia(tekst: string, obliczenia = false) {
  return tekst.split("\n").map((linia) => {
    if (obliczenia && czyWzor(linia)) {
      const wezly = rozbierz(linia.trim(), true);
      return linia.trim() ? "\\(" + tex(wezly) + "\\)" : linia;
    }
    return rozbierz(linia, false).map((w) =>
      w.typ === "tekst" ? w.tekst : w.typ === "potega" ? Object.entries(INDEKSY_GORNE).find(([, v]) => v === w.tekst)?.[0] ?? "^" + w.tekst : "\\(" + tex([w]) + "\\)",
    ).join("");
  }).join("\n");
}

// ---------- Rysunek na tablicy ----------

// Tak jak Excalidraw 0.18 (getFontFamilyString, FONT_METADATA): ta sama lista fontów do pomiaru i metryki
// do położenia linii bazowej, bo pakiet ich nie eksportuje.
const RODZINY: Record<number, { css: string; unitsPerEm: number; ascender: number; descender: number; lineHeight: number }> = {
  [FONT_FAMILY.Excalifont]: { css: "Excalifont, Xiaolai, Segoe UI Emoji", unitsPerEm: 1000, ascender: 886, descender: -374, lineHeight: 1.25 },
  [FONT_FAMILY["Liberation Sans"]]: { css: "Liberation Sans, Segoe UI Emoji", unitsPerEm: 2048, ascender: 1854, descender: -434, lineHeight: 1.15 },
  [FONT_FAMILY.Cascadia]: { css: "Cascadia, Segoe UI Emoji", unitsPerEm: 2048, ascender: 1900, descender: -480, lineHeight: 1.2 },
};
const PISMO = FONT_FAMILY.Excalifont;
const ZAPASOWY = FONT_FAMILY["Liberation Sans"];

export function czcionkaTekstu(fontFamily: number, fontSize: number) {
  return fontSize + "px " + (RODZINY[fontFamily] ?? RODZINY[PISMO]).css;
}

/** Odległość linii bazowej od górnej krawędzi elementu tekstowego, jak w getVerticalOffset w Excalidraw. */
export function liniaBazowa(fontFamily: number, fontSize: number, lineHeight?: number) {
  const m = RODZINY[fontFamily] ?? RODZINY[PISMO];
  const em = fontSize / m.unitsPerEm;
  const wiersz = fontSize * (lineHeight ?? m.lineHeight);
  return em * m.ascender + (wiersz - em * m.ascender + em * m.descender) / 2;
}

/** Wczytuje fonty tablicy dla tych znaków; dopiero potem pomiar mówi, których glifów naprawdę brakuje. */
export function wczytajCzcionkiWzorow(tekst: string) {
  return Promise.all([
    document.fonts.load("20px Excalifont", tekst).catch(() => []),
    document.fonts.load('20px "Liberation Sans"', tekst).catch(() => []),
  ]);
}

const glify = new Map<string, boolean>();
let ctxPomiaru: CanvasRenderingContext2D | null | undefined;
function pomiar() {
  if (ctxPomiaru === undefined) ctxPomiaru = document.createElement("canvas").getContext("2d");
  return ctxPomiaru;
}

// Brak glifu w foncie widać po tym, że szerokość znaku zależy od fontu zastępczego. Excalifont nie ma np. „√”
// ani „²”, a Excalidraw sięga wtedy po Segoe UI Emoji, w którym „√” wygląda jak „Ã”.
function maGlif(fontFamily: number, znak: string) {
  if (fontFamily === PISMO && znak >= " " && znak <= "~") return true;
  const klucz = fontFamily + znak;
  const znany = glify.get(klucz);
  if (znany !== undefined) return znany;
  const ctx = pomiar();
  if (!ctx) return true;
  const nazwa = fontFamily === PISMO ? "Excalifont" : '"Liberation Sans"';
  const szerokosci = ["monospace", "serif", "cursive"].map((zapas) => {
    ctx.font = "40px " + nazwa + ", " + zapas;
    return ctx.measureText(znak).width;
  });
  const ma = szerokosci.every((s) => Math.abs(s - szerokosci[0]) < 0.01);
  // Wynik zapamiętujemy dopiero po wczytaniu fontu: wcześniej każdy znak wygląda na brakujący.
  if (document.fonts.check("20px " + nazwa, znak)) glify.set(klucz, ma);
  return ma;
}

export function szerokoscTekstu(tekst: string, fontFamily: number, fontSize: number) {
  const ctx = pomiar();
  if (!ctx) return tekst.length * fontSize * 0.55;
  ctx.font = czcionkaTekstu(fontFamily, fontSize);
  const m = ctx.measureText(tekst);
  return Math.max(m.width, m.actualBoundingBoxRight);
}

export type Napis = { tekst: string; fontFamily: number; fontSize: number; x: number; y: number };
export type Kreska = [number, number][];
type Pudelko = { szer: number; gora: number; dol: number; napisy: Napis[]; kreski: Kreska[] };

// Napisy i kreski mają współrzędne względem początku pudełka na linii bazowej (y w górę ujemne).
function przesun(p: Pudelko, dx: number, dy: number): Pick<Pudelko, "napisy" | "kreski"> {
  return {
    napisy: p.napisy.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy })),
    kreski: p.kreski.map((k) => k.map(([x, y]) => [x + dx, y + dy] as [number, number])),
  };
}

function wRzedzie(czesci: Pudelko[]): Pudelko {
  const wynik: Pudelko = { szer: 0, gora: 0, dol: 0, napisy: [], kreski: [] };
  for (const c of czesci) {
    const { napisy, kreski } = przesun(c, wynik.szer, 0);
    wynik.napisy.push(...napisy);
    wynik.kreski.push(...kreski);
    wynik.szer += c.szer;
    wynik.gora = Math.max(wynik.gora, c.gora);
    wynik.dol = Math.max(wynik.dol, c.dol);
  }
  return wynik;
}

function napis(tekst: string, fontFamily: number, fontSize: number, przesuniecie = 0): Pudelko {
  return {
    szer: szerokoscTekstu(tekst, fontFamily, fontSize),
    gora: fontSize * 0.74 - przesuniecie,
    dol: fontSize * 0.2 + przesuniecie,
    napisy: [{ tekst, fontFamily, fontSize, x: 0, y: przesuniecie }],
    kreski: [],
  };
}

// Zwykły tekst dzielimy na ciągi jednego fontu: znak, którego nie ma w Excalifont, bierzemy z Liberation Sans.
function tekstWCiagach(tekst: string, fontSize: number): Pudelko[] {
  const ciagi: { tekst: string; rodzina: number }[] = [];
  for (const znak of Array.from(tekst)) {
    const rodzina = maGlif(PISMO, znak) || !maGlif(ZAPASOWY, znak) ? PISMO : ZAPASOWY;
    const ostatni = ciagi.at(-1);
    if (ostatni?.rodzina === rodzina) ostatni.tekst += znak;
    else ciagi.push({ tekst: znak, rodzina });
  }
  return ciagi.map((c) => napis(c.tekst, c.rodzina, fontSize));
}

function uloz(wezly: Wezel[], r: number): Pudelko {
  return wRzedzie(wezly.flatMap((w): Pudelko[] => {
    if (w.typ === "tekst") return tekstWCiagach(w.tekst, r);
    if (w.typ === "potega") {
      const tekst = Object.keys(INDEKSY_GORNE).find((k) => INDEKSY_GORNE[k] === w.tekst && maGlif(PISMO, k));
      if (tekst) return tekstWCiagach(tekst, r);
      const indeks = napis(w.tekst, PISMO, Math.round(r * 0.62), -r * 0.4);
      return [{ ...indeks, szer: indeks.szer + r * 0.06, ...przesun(indeks, r * 0.06, 0) }];
    }
    if (w.typ === "pierwiastek") {
      const pod = uloz(w.wnetrze, r);
      const kreskaY = -(pod.gora + r * 0.14);
      const start = r * 0.5;
      const wewnatrz = przesun(pod, start + r * 0.08, 0);
      const koniec = start + r * 0.08 + pod.szer + r * 0.06;
      return [{
        szer: koniec + r * 0.1,
        gora: -kreskaY + 2,
        dol: Math.max(pod.dol, r * 0.14),
        napisy: wewnatrz.napisy,
        kreski: [[[0, -r * 0.32], [r * 0.12, -r * 0.38], [r * 0.24, r * 0.12], [start, kreskaY], [koniec, kreskaY]], ...wewnatrz.kreski],
      }];
    }
    const f = Math.round(r * 0.86);
    const [licznik, mianownik] = [uloz(w.licznik, f), uloz(w.mianownik, f)];
    const os = -r * 0.3;
    const odstep = r * 0.16;
    const kreska = Math.max(licznik.szer, mianownik.szer) + r * 0.2;
    const bok = r * 0.12;
    const gorny = przesun(licznik, bok + (kreska - licznik.szer) / 2, os - odstep - licznik.dol);
    const dolny = przesun(mianownik, bok + (kreska - mianownik.szer) / 2, os + odstep + mianownik.gora);
    return [{
      szer: kreska + 2 * bok,
      gora: -(os - odstep - licznik.dol - licznik.gora),
      dol: os + odstep + mianownik.gora + mianownik.dol,
      napisy: [...gorny.napisy, ...dolny.napisy],
      kreski: [[[bok, os], [bok + kreska, os]], ...gorny.kreski, ...dolny.kreski],
    }];
  }));
}

export type WierszWzoru = { napisy: Napis[]; kreski: Kreska[]; szer: number; wys: number };

/**
 * Jeden wiersz pisma Pestki od lewego górnego rogu (x, y): napisy jako osobne elementy tekstowe (każdy w jednym
 * foncie, y to górna krawędź elementu) i kreski pierwiastków i kresek ułamkowych. Wiersz bez wzorów i brakujących
 * glifów to jeden napis, jak dotąd.
 */
export function wierszWzoru(linia: string, x: number, y: number, fontSize: number, ulamki: boolean): WierszWzoru {
  const wezly = rozbierz(linia, ulamki);
  const p = uloz(wezly.length ? wezly : [{ typ: "tekst", tekst: linia }], fontSize);
  const gora = Math.max(p.gora + (maStrukture(wezly) ? fontSize * 0.1 : 0), liniaBazowa(PISMO, fontSize));
  const baza = y + gora;
  const { napisy, kreski } = przesun(p, x, baza);
  return {
    napisy: napisy.map((n) => ({ ...n, y: n.y - liniaBazowa(n.fontFamily, n.fontSize) })),
    kreski,
    szer: p.szer,
    wys: gora + Math.max(p.dol, fontSize * RODZINY[PISMO].lineHeight - liniaBazowa(PISMO, fontSize)),
  };
}
