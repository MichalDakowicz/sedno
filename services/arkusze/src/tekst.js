// Wyciąga tekst z PDF strona po stronie. Linia to fragmenty o tej samej
// współrzędnej y; fragmenty oddzielone dużą przerwą zostają osobnymi
// segmentami, bo w tabelach CKE każdy segment to inna kolumna.
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const PRZERWA_KOLUMNY = 12;

// fonty: każdy surowy kawałek dostaje krój `f`: b (pogrubiony), i (kursywa), m (stała szerokość,
// np. Courier z nazwami plików), s (symbole, np. strzałka przypisania), "" (zwykły). Wymaga listy
// operacji strony, więc jest wolniejsze i włączane tylko tam, gdzie potrzebne (informatyka).
export async function tekstPdf(sciezka, opcje = {}) {
  const data = new Uint8Array(await readFile(sciezka));
  const doc = await getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
  try {
    return await tekstDokumentu(doc, opcje);
  } finally {
    await doc.destroy();
  }
}

async function tekstDokumentu(doc, { fonty = false, naprawKodowanie = false }) {
  const strony = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const strona = await doc.getPage(n);
    if (fonty) await strona.getOperatorList();
    const { items } = await strona.getTextContent();
    const przesuniete = naprawKodowanie && items.some((it) => /=DGDQLH\x03|6WURQD\x03/.test(it.str ?? ""));
    const kroje = {};
    const wiersze = [];
    for (const it of items) {
      const s = przesuniete ? dekodujGlify(it.str ?? "") : it.str;
      if (!s || !s.trim()) continue;
      const y = it.transform[5];
      let w = wiersze.find((r) => Math.abs(r.y - y) <= 2.5);
      if (!w) wiersze.push((w = { y, czesci: [] }));
      const czesc = { x: it.transform[4], y, s, w: it.width, h: it.height };
      if (fonty) czesc.f = kroje[it.fontName] ??= kroj(strona, it.fontName);
      w.czesci.push(czesc);
    }
    dolaczIndeksyGorne(wiersze);
    if (naprawKodowanie) dolaczIndeksyDolne(wiersze);
    const linie = wiersze
      .sort((a, b) => b.y - a.y)
      .map((w) => {
        const czesci = w.czesci.sort((a, b) => a.x - b.x);
        const seg = segmenty(czesci);
        // Surowe kawałki zostają do dzielenia tekstu w kolumnach (patrz arkusz.js).
        return { strona: n, y: w.y, x: seg[0].x, seg, czesci, s: seg.map((g) => g.s).join(" ") };
      });
    strony.push(linie);
  }
  return strony;
}

const GLIFY = { y: "ó", Ï: "Ó", ü: "ć", Ċ: "ę", Ę: "Ę",
  á: "ł", à: "Ł", Ĕ: "ń", ē: "Ń", Ğ: "ś", ĝ: "Ś", Ĩ: "ź", Ī: "ż", ĩ: "Ż", "±": "–" };

// Brak mapy ToUnicode w części stron CKE: glify podstawowe mają numery
// o 29 niższe od ASCII, a polskie litery zachowały osobne kody fontu.
function dekodujGlify(s) {
  return [...s].map((z) => GLIFY[z] ?? (/[\x03-\x5d]/.test(z) && z !== " "
    ? String.fromCharCode(z.charCodeAt(0) + 29) : z)).join("");
}

function kroj(strona, fontName) {
  let nazwa = "";
  try {
    nazwa = strona.commonObjs.get(fontName)?.name ?? "";
  } catch {
    return "";
  }
  if (/Symbol|Wingdings/i.test(nazwa)) return "s";
  if (/Courier|Mono|Consolas/i.test(nazwa)) return "m";
  if (/Bold/i.test(nazwa)) return "b";
  if (/Italic|Oblique/i.test(nazwa)) return "i";
  return "";
}

// Indeks górny („12th”, „19th century”) leży kilka punktów wyżej niż jego
// linia i drobniejszym pismem, więc trafiał do osobnego wiersza. Wiersz
// samych drobnych fragmentów tuż nad inną linią doklejamy do niej.
function dolaczIndeksyGorne(wiersze) {
  const wysokosci = wiersze.flatMap((w) => w.czesci.map((c) => c.h)).filter(Boolean).sort((a, b) => a - b);
  const typowa = wysokosci[Math.floor(wysokosci.length / 2)];
  if (!typowa) return;
  for (const w of [...wiersze]) {
    if (!w.czesci.every((c) => c.h && c.h < typowa * 0.8)) continue;
    const pod = wiersze.filter((v) => v !== w && w.y - v.y > 0 && w.y - v.y <= 8).sort((a, b) => b.y - a.y)[0];
    if (!pod) continue;
    pod.czesci.push(...w.czesci);
    wiersze.splice(wiersze.indexOf(w), 1);
  }
}

function dolaczIndeksyDolne(wiersze) {
  for (const w of [...wiersze]) {
    const przeniesione = new Set();
    for (const c of w.czesci) {
      if (c.h > 10 || !/^[\p{L}\d+−-]{1,3}$/u.test(c.s.normalize("NFKC"))) continue;
      const cel = wiersze.find((v) => v !== w && v.y - c.y >= 2.5 && v.y - c.y <= 6.5
        && v.czesci.some((p) => p.h >= c.h * 1.23 && /^[\p{L}\d]{1,2}$/u.test(p.s.normalize("NFKC"))
          && (c.x >= p.x + p.w * 0.5 && c.x <= p.x + p.w + 1.2
            || c.x <= p.x + 1 && c.x + c.w >= p.x - 1.5 && v.czesci.some((g) => g.y > v.y + 3
              && g.x <= c.x + 2 && g.x + g.w >= c.x + c.w - 2))));
      if (!cel) continue;
      cel.czesci.push(c);
      przeniesione.add(c);
    }
    w.czesci = w.czesci.filter((c) => !przeniesione.has(c));
  }
  for (let i = wiersze.length - 1; i >= 0; i--) if (!wiersze[i].czesci.length) wiersze.splice(i, 1);
}

export function segmenty(czesci) {
  const wynik = [];
  let akt = null;
  let koniec = null;
  for (const c of czesci) {
    const przerwa = koniec === null ? 0 : c.x - koniec;
    if (!akt || przerwa > PRZERWA_KOLUMNY) {
      akt = { x: c.x, s: "" };
      wynik.push(akt);
    } else if (przerwa > 1 && !akt.s.endsWith(" ") && !c.s.startsWith(" ")) {
      akt.s += " ";
    }
    akt.s += c.s;
    koniec = c.x + c.w;
  }
  // Znaki z prywatnego obszaru Unicode to symbole z fontów typu Wingdings
  // (w arkuszach CKE: punktory w notatkach), więc zamieniamy je na „•”.
  for (const g of wynik) g.s = g.s.replace(/[-]/g, "•").replace(/\s+/g, " ").trim();
  return wynik.filter((g) => g.s);
}
