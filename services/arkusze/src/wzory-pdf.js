import { segmenty } from "./tekst.js";
import { plotno, tekstKomorki, tekstLinii } from "./tresc-pdf.js";

const SYMBOL_MAT = /[\u{1d400}-\u{1d7ff}=+−×·√∑∫≥≤±→^]/u;
const ZWYKLE_SLOWO = /\p{L}{4,}/u;

function liniaWzoru(l) {
  return !ZWYKLE_SLOWO.test(l.t.tekst.replace(/\b(?:lim|cos|sin|log|tg|ctg)\b/g, ""))
    && !/^[\s.…_–-]+$/.test(l.t.tekst);
}

// Kreska widoczna w renderze rozróżnia ułamek od indeksu i etykiet wykresu.
export function ulamkiWLinii(s, linie, { zapisLiniowy = false } = {}) {
  const zuzyte = new Set();
  const wstaw = new Map();
  for (const [i, l] of linie.entries()) {
    const sasiednie = linie.slice(Math.max(0, i - 3), i + 4).flatMap((x) => x.czesci);
    const liczniki = skladniki(sasiednie.filter((c) => c.y - l.y >= 4 && c.y - l.y <= 14));
    const mianowniki = skladniki(sasiednie.filter((c) => l.y - c.y >= 3.5 && l.y - c.y <= 13));
    for (const a of liczniki) {
      const b = mianowniki.find((b) => Math.abs(a.srodek - b.srodek) <= 4.5);
      if (!b || [...a.cz, ...b.cz].some((c) => zuzyte.has(c))) continue;
      const x = Math.min(a.x, b.x);
      const xp = Math.max(a.xp, b.xp);
      if (l.czesci.some((c) => Math.abs(c.y - l.y) < 2.5 && c.x < xp - 1 && c.x + c.w > x + 1)) continue;
      if (!kreskaUlamkowa(s, x, xp, b.y + 3, a.y - 0.8)) continue;
      const tekst = zapisLiniowy ? "(" + skladnikLiniowy(a.zapis) + "/" + skladnikLiniowy(b.zapis) + ")"
        : "\\(\\frac{" + a.tex + "}{" + b.tex + "}\\)";
      for (const c of [...a.cz, ...b.cz]) zuzyte.add(c);
      if (!wstaw.has(l)) wstaw.set(l, []);
      wstaw.get(l).push({ s: tekst, x, y: l.y, w: xp - x, h: 11 });
    }
  }
  if (!wstaw.size) return linie;
  return linie.map((l) => {
    const czesci = [...l.czesci.filter((c) => !zuzyte.has(c)), ...(wstaw.get(l) ?? [])].sort((a, b) => a.x - b.x);
    return { ...l, czesci, seg: segmenty(czesci), x: czesci[0]?.x };
  }).filter((l) => l.czesci.length);
}

function skladnikLiniowy(tekst) {
  return /[\s+−×·]/u.test(tekst.slice(1)) ? "(" + tekst + ")" : tekst;
}

export async function ulamkiKlucza(pdf, strony) {
  const wynik = [];
  for (const [i, linie] of strony.entries()) {
    if (!linie.some((l) => /^\s*[\d\p{L}]{1,4}\s*$/u.test(l.s))) {
      wynik.push(linie);
      continue;
    }
    const s = await plotno(pdf, i + 1, new Map());
    try {
      wynik.push(ulamkiWLinii(s, linie, { zapisLiniowy: true }));
    } finally {
      s.fabryka.destroy(s);
    }
  }
  return wynik;
}

function skladniki(punkty) {
  const grupy = [];
  for (const c of [...punkty].sort((a, b) => a.x - b.x)) {
    const g = grupy.at(-1);
    if (g && c.x - g.xp <= 5 && Math.abs(c.y - g.y) <= 3) {
      g.cz.push(c);
      g.xp = Math.max(g.xp, c.x + c.w);
    } else grupy.push({ cz: [c], x: c.x, xp: c.x + c.w, y: c.y });
  }
  return grupy.flatMap((g) => {
    const { tekst, formaty } = tekstLinii(g.cz);
    if (!/^[\d\p{L}\s().,√+−×·]+$/u.test(tekst) || !tekst || ZWYKLE_SLOWO.test(tekst) || g.xp - g.x > 65) return [];
    let tex = tekst;
    for (const [od, koniec, f] of [...formaty].reverse()) {
      const indeks = tex.slice(od, koniec);
      if ((f === "sub" || f === "sup") && !indeks.includes("√")) {
        tex = tex.slice(0, od) + (f === "sub" ? "_" : "^") + "{" + indeks + "}" + tex.slice(koniec);
      }
    }
    tex = tex.replaceAll("−", "-").replaceAll("·", "\\cdot ").replaceAll("×", "\\times ")
      .replace(/√([A-Za-z0-9]+)/g, "\\sqrt{$1}");
    return tex.includes("√") ? [] : [{ ...g, srodek: (g.x + g.xp) / 2, tex, zapis: tekstKomorki({ tekst, formaty }) }];
  });
}

function kreskaUlamkowa(s, x, xp, dol, gora) {
  const szer = Math.round(2 * (xp - x));
  const wys = Math.round(2 * (gora - dol));
  if (szer < 8 || wys < 1) return false;
  const { data } = s.context.getImageData(Math.round(2 * x), Math.round(2 * (s.wys - gora)), szer, wys);
  for (let r = 0; r < wys; r++) {
    let ciemne = 0;
    for (let c = 0; c < szer; c++) {
      const i = (r * szer + c) * 4;
      if (data[i] + data[i + 1] + data[i + 2] < 555) ciemne++;
    }
    if (ciemne >= szer * 0.8) return true;
  }
  return false;
}

// Licznik, mianownik albo granica operatora mają osobne linie w warstwie tekstu.
// Odróżnia je od akapitu mały odstęp pionowy i nakładające się obwiednie znaków.
export function wzoryWielowierszowe(linie) {
  const grupy = [];
  for (const l of linie) {
    if (!liniaWzoru(l)) continue;
    const prawa = Math.max(...l.czesci.map((c) => c.x + c.w));
    const poprzednia = grupy.at(-1);
    const odstep = poprzednia ? poprzednia.linie.at(-1).y - l.y : Infinity;
    const margines = odstep <= 10 ? 55 : 5;
    if (odstep > 0 && odstep <= 12.4 && l.x < poprzednia.prawa + margines && prawa > poprzednia.lewa - margines) {
      poprzednia.linie.push(l);
      poprzednia.lewa = Math.min(poprzednia.lewa, l.x);
      poprzednia.prawa = Math.max(poprzednia.prawa, prawa);
    } else grupy.push({ linie: [l], lewa: l.x, prawa });
  }
  return grupy.filter(({ linie }) => linie.length >= 2 && linie.some((l) => SYMBOL_MAT.test(l.czesci.map((c) => c.s).join(""))));
}
