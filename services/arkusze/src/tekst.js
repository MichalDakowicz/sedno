// Wyciąga tekst z PDF strona po stronie. Linia to fragmenty o tej samej
// współrzędnej y; fragmenty oddzielone dużą przerwą zostają osobnymi
// segmentami, bo w tabelach CKE każdy segment to inna kolumna.
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const PRZERWA_KOLUMNY = 12;

export async function tekstPdf(sciezka) {
  const data = new Uint8Array(await readFile(sciezka));
  const doc = await getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
  const strony = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const strona = await doc.getPage(n);
    const { items } = await strona.getTextContent();
    const wiersze = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5];
      let w = wiersze.find((r) => Math.abs(r.y - y) <= 2.5);
      if (!w) wiersze.push((w = { y, czesci: [] }));
      w.czesci.push({ x: it.transform[4], s: it.str, w: it.width });
    }
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
