// Wyciąga tekst z PDF strona po stronie. Linia to fragmenty o tej samej
// współrzędnej y; fragmenty oddzielone dużą przerwą zostają osobnymi
// segmentami, bo w tabelach CKE każdy segment to inna kolumna.
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const PRZERWA_KOLUMNY = 12;

// fonty: każdy surowy kawałek dostaje krój `f`: b (pogrubiony), i (kursywa), m (stała szerokość,
// np. Courier z nazwami plików), s (symbole, np. strzałka przypisania), "" (zwykły). Wymaga listy
// operacji strony, więc jest wolniejsze i włączane tylko tam, gdzie potrzebne (informatyka).
export async function tekstPdf(sciezka, { fonty = false } = {}) {
  const data = new Uint8Array(await readFile(sciezka));
  const doc = await getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
  const strony = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const strona = await doc.getPage(n);
    if (fonty) await strona.getOperatorList();
    const { items } = await strona.getTextContent();
    const kroje = {};
    const wiersze = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5];
      let w = wiersze.find((r) => Math.abs(r.y - y) <= 2.5);
      if (!w) wiersze.push((w = { y, czesci: [] }));
      const czesc = { x: it.transform[4], y, s: it.str, w: it.width, h: it.height };
      if (fonty) czesc.f = kroje[it.fontName] ??= kroj(strona, it.fontName);
      w.czesci.push(czesc);
    }
    dolaczIndeksyGorne(wiersze);
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

function segmenty(czesci) {
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
