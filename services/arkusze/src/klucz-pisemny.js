import { tekstLinii } from "./tresc-pdf.js";

export const NAGLOWEK = /^(?:Zadani[ea]|Zdanie)\.?\s+(\d+(?:\.\d+)*(?:[a-d](?=\.))?)\.?(?=\s|\(|$)(?:\s*\(\s*(?:0\s*[–−-]\s*)?(\d+)\s*(?:pkt|p\.)?\s*\))?(?:\s+(.*))?$/i;
const SZUM = /^Strona\s+\d+\s+z\s+\d+|^[A-Z]{3,4}-[PRD]\d?[-_]\d{3}|^Egzamin maturalny z |^Zasady oceniania rozwiązań zadań$|^Więcej arkuszy/i;
const PODPUNKT = /^(\d+(?:\.\d+)+)\.?\s*\(\s*0\s*[–−-]\s*(\d+)\s*(?:pkt|p\.)?\s*\)\s*$/;
const ZASADY = /^(?:Zasady (?:oceniania|punktowania)|Schemat (?:punktowania|oceniania)|Punktacja|Punktowanie|Uwagi?)(?:\s*[:.]|\s*$)/i;
const ROZWIAZANIE = /^(?:(?:Poprawn[ae]|Prawidłow[ae]|Przykładow[ae]|Oczekiwan[ae]|Akceptowan[ae])\s+)?(?:pełn[ae]\s+)?(?:odpowiedzi|odpowiedź|rozwiązani[ea]|uzasadnieni[ea]|realizacj[ae]|schemat rozwiązania)(?:\s*(?::|[.–]\s)|\s+[IVX]+ sposób|\s*$)/i;
const WYMAGANIA = /^(?:Wymagani[ae]\s+(?:ogóln|szczeg|egzamin)|Podstawa programowa)/i;
const PUNKTY = /^(\d+)\s*(?:pkt|p\.|punkty?)\s*[–−-]/i;

function linieKlucza(strony) {
  return strony.flatMap((linie, i) => linie.filter((l) => l.y > 49 && !SZUM.test(l.s) && !/^©|^Układ graficzny/.test(l.s))
    .map((l) => ({ ...l, strona: i + 1 })));
}

export function kluczPisemny(strony) {
  const wynik = {};
  let akt;
  let sekcja;
  let wersjaA;
  let stronaPrzypisu;
  for (const l of linieKlucza(strony)) {
    if (l.strona === stronaPrzypisu) continue;
    if (/^\d+\s+(?:Rozporządzenie|Załącznik nr \d+ do rozporządzenia)/i.test(l.s)) {
      stronaPrzypisu = l.strona;
      continue;
    }
    const m = l.s.match(NAGLOWEK) ?? l.s.match(PODPUNKT);
    if (m) {
      const nr = m[1];
      akt = wynik[nr] ??= { nr, strona: l.strona, punkty: m[2] === undefined ? undefined : Number(m[2]), zasady: [], rozwiazanie: [], inne: [] };
      sekcja = "inne";
      wersjaA = null;
      continue;
    }
    if (!akt) continue;
    if (/\b(?:Wersja|Arkusz)\s+A\b/i.test(l.s) && /\b(?:Wersja|Arkusz)\s+B\b/i.test(l.s)) {
      wersjaA = l.seg[0].x;
      sekcja = "rozwiazanie";
      continue;
    }
    const naglowek = l.s.match(ZASADY) ?? l.s.match(ROZWIAZANIE);
    if (naglowek) {
      sekcja = ZASADY.test(l.s) ? "zasady" : "rozwiazanie";
      wersjaA = null;
      const wiersz = l.s.slice(naglowek[0].length).trim();
      if (wiersz) akt[sekcja].push(wiersz);
      continue;
    }
    if (WYMAGANIA.test(l.s)) sekcja = "inne";
    if (PUNKTY.test(l.s) && sekcja !== "rozwiazanie") sekcja = "zasady";
    if (wersjaA !== null && l.seg.length > 1) {
      akt[sekcja].push(l.seg.reduce((a, b) => Math.abs(b.x - wersjaA) < Math.abs(a.x - wersjaA) ? b : a).s);
    } else {
      const tekst = tekstLinii(l.czesci).tekst;
      if (tekst) akt[sekcja].push(tekst.replace(/�/g, l.s.includes("•") ? "•" : "�"));
    }
  }
  for (const k of Object.values(wynik)) {
    if (!k.zasady.length) k.zasady = k.inne.filter((s) => PUNKTY.test(s));
    if (!k.rozwiazanie.length && !k.zasady.length) k.zasady = k.inne;
    if (k.punkty === undefined) {
      const punkty = k.zasady.map((s) => Number(s.match(PUNKTY)?.[1])).filter(Number.isFinite);
      if (punkty.length) k.punkty = Math.max(...punkty);
    }
    delete k.inne;
    k.zasady = k.zasady.join("\n");
    k.rozwiazanie = k.rozwiazanie.join("\n");
  }
  return wynik;
}

export function kryteriaWypracowania(strony, nr, { bezCalegoKlucza = false } = {}) {
  const linie = linieKlucza(strony);
  const start = linie.findIndex((l) => /^(?:Ogólne )?zasady oceniania (?:wypracowania|wypowiedzi)|^Kryteria oceniania (?:wypracowania|wypowiedzi)/i.test(l.s));
  const zadanie = linie.findIndex((l) => l.s.match(NAGLOWEK)?.[1] === nr);
  const od = Math.max(start, zadanie);
  if (od < 0 && bezCalegoKlucza) return null;
  const tresc = od < 0 ? linie.filter((l) => l.strona > 1) : linie.slice(od);
  const granica = tresc.findIndex((l, i) => i > 5 && /^Przykładowe wypracowani[ea]|^Przykładowe realizacje tematów/i.test(l.s));
  const zasady = (granica < 0 ? tresc : tresc.slice(0, granica)).map((l) => l.s).join("\n");
  const rozwiazanie = granica < 0 ? "" : tresc.slice(granica).map((l) => l.s).join("\n");
  return zasady ? { strona: tresc[0].strona, zasady, rozwiazanie } : null;
}
