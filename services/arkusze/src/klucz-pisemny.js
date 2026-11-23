import { tekstKomorki, tekstLinii } from "./tresc-pdf.js";

export const NAGLOWEK = /^(?:Zad(?:ani[ea]|nie)?|Zdanie|Polecenie)\.?\s+(\d+(?:\.\d+)*(?:[a-d](?=\.))?)\.?(?=\s|\(|$)(?:\s*\(\s*(?:0\s*[–−-]\s*)?(\d+)\s*(?:pkt|p\.)?\s*\))?(?:\s+(.*))?$/i;
const SZUM = /^Strona\s+\d+\s+z\s+\d+|^[A-Z]{3,4}-[PRD]\d?[-_]\d{3}|^Egzamin maturalny z |^Zasady oceniania rozwiązań zadań$|^Więcej arkuszy/i;
const PODPUNKT = /^(\d+(?:\.\d+)+)\.?\s*\(\s*0\s*[–−-]\s*(\d+)\s*(?:pkt|p\.)?\s*\)\s*$/;
const PODPUNKT_Z_ODPOWIEDZIA = /^(\d+(?:\.\d+)+)\.\s+((?:Poprawna|Przykładowa|Prawidłowa|Oczekiwana)\s+odpowied[źzi]+.*)$/i;
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
    const odpowiedz = l.s.match(PODPUNKT_Z_ODPOWIEDZIA);
    const m = l.s.match(NAGLOWEK) ?? l.s.match(PODPUNKT) ?? (odpowiedz && [odpowiedz[0], odpowiedz[1]]);
    if (m) {
      const nr = m[1];
      akt = wynik[nr] ??= { nr, strona: l.strona, punkty: m[2] === undefined ? undefined : Number(m[2]), zasady: [], rozwiazanie: [], inne: [] };
      sekcja = odpowiedz ? "rozwiazanie" : "inne";
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
      if (wiersz) {
        akt[sekcja].push(wiersz);
        if (sekcja === "zasady") akt.stronaZasad ??= l.strona;
      }
      continue;
    }
    if (WYMAGANIA.test(l.s)) sekcja = "inne";
    if (PUNKTY.test(l.s) && sekcja !== "rozwiazanie") sekcja = "zasady";
    if (wersjaA !== null && l.seg.length > 1) {
      akt[sekcja].push(l.seg.reduce((a, b) => Math.abs(b.x - wersjaA) < Math.abs(a.x - wersjaA) ? b : a).s);
    } else {
      const linia = tekstLinii(l.czesci);
      if (!linia.tekst) continue;
      if (sekcja === "zasady") akt.stronaZasad ??= l.strona;
      if (sekcja === "rozwiazanie") {
        (akt.wierszeRozwiazania ??= []).push({ linia: l, indeks: akt.rozwiazanie.length });
        for (const m of linia.tekst.matchAll(/\(([^()]+\/[^()]+)\)/g)) {
          const zakresy = [...m[1].matchAll(/[^/]+/g)];
          const pogrubione = zakresy.map(({ 0: s, index }) => {
            const od = m.index + 1 + index;
            return linia.formaty.some(([a, b, f]) => f === "b" && a < od + s.length && b > od
              && /\S/.test(linia.tekst.slice(Math.max(a, od), Math.min(b, od + s.length))));
          });
          const wybrana = pogrubione.filter(Boolean).length === 1 ? pogrubione.indexOf(true) : -1;
          (akt.wybory ??= []).push({ ile: zakresy.length, wybrana });
        }
      }
      akt[sekcja].push(tekstKomorki(linia).replace(/�/g, l.s.includes("•") ? "•" : "�"));
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
    k.strona = k.stronaZasad ?? k.strona;
    delete k.stronaZasad;
    if (k.wybory?.some((w) => w.wybrana < 0)) delete k.wybory;
    if (k.zasady.some((s) => /schemat|rozpad|reakcj|przemian/i.test(s))) odtworzNuklidy(k);
    delete k.wierszeRozwiazania;
    k.zasady = k.zasady.join("\n");
    k.rozwiazanie = k.rozwiazanie.join("\n");
  }
  return wynik;
}

function odtworzNuklidy(k) {
  const wiersze = k.wierszeRozwiazania ?? [];
  for (const { linia, indeks } of wiersze) {
    const czesci = linia.czesci.map((c) => ({ ...c, s: c.s.normalize("NFKC").trim() })).filter((c) => c.s);
    if (!czesci.every((c) => /^(?:[A-Z][a-z]?|[np]|[+→]|\d+)$/u.test(c.s)) || czesci.filter((c) => c.s === "+").length < 2) continue;
    const pas = wiersze.filter((w) => w.linia.strona === linia.strona && Math.abs(w.linia.y - linia.y) <= 24);
    const cyfry = pas.flatMap((w) => w.linia.czesci).filter((c) => /^\d{1,3}$/.test(c.s.normalize("NFKC").trim()));
    const wyrazy = [];
    let duzaPrzerwa = 0;
    let poprzedni;
    for (const c of czesci) {
      if (poprzedni?.s === c.s && c.x - poprzedni.x < 7) continue;
      if (poprzedni && c.x - poprzedni.x >= 58 && poprzedni.s !== "+" && c.s !== "+") {
        wyrazy.push("→");
        duzaPrzerwa++;
      }
      if (/^(?:[A-Z][a-z]?|[np])$/.test(c.s)) {
        const g = cyfry.filter((x) => x.y > c.y + 6 && x.x < c.x && c.x - x.x <= 43).at(-1);
        const d = g && cyfry.find((x) => x.y < c.y - 6 && Math.abs(x.x - g.x) <= 8);
        if (!d) break;
        const a = g.s.normalize("NFKC").trim();
        const z = d.s.normalize("NFKC").trim();
        wyrazy.push(tekstKomorki({ tekst: a + z + c.s, formaty: [[0, a.length, "sup"], [a.length, a.length + z.length, "sub"]] }));
      } else wyrazy.push(c.s);
      poprzedni = c;
    }
    if (poprzedni !== czesci.at(-1) && (poprzedni?.s !== czesci.at(-1)?.s || czesci.at(-1).x - poprzedni.x >= 7)) continue;
    if (duzaPrzerwa !== 1 || wyrazy.filter((s) => /^[⁰-⁹¹²³]/.test(s)).length < 3) continue;
    const poczatek = pas[0].indeks;
    const koniec = pas.at(-1).indeks;
    if (!pas.every((w) => /^[\s\dnp]+$/.test(w.linia.s) || w.indeks === indeks)) continue;
    k.rozwiazanie.splice(poczatek, koniec - poczatek + 1, wyrazy.join(" ").replace(/(\d) (?=[⁰-⁹¹²³])/g, "$1"));
    return;
  }
}

export function kryteriaWypracowania(strony, nr, { bezCalegoKlucza = false } = {}) {
  const linie = linieKlucza(strony);
  const start = linie.findIndex((l) => /^(?:Ogólne )?zasady oceniania (?:wypracowania|wypowiedzi)|^Kryteria oceniania (?:wypracowania|wypowiedzi)|^Przy przyznawaniu punktów na określonym poziomie w zadaniu rozszerzonej odpowiedzi/i.test(l.s));
  const zadanie = linie.findIndex((l) => l.s.match(NAGLOWEK)?.[1] === nr);
  const od = Math.max(start, zadanie);
  if (od < 0 && bezCalegoKlucza) return null;
  const tresc = od < 0 ? linie.filter((l) => l.strona > 1) : linie.slice(od);
  const granica = tresc.findIndex((l, i) => i > 5 && /^Przykładowe wypracowani[ea]|^Przykładowe realizacje tematów/i.test(l.s));
  const zasady = (granica < 0 ? tresc : tresc.slice(0, granica)).map((l) => l.s).join("\n");
  const rozwiazanie = granica < 0 ? "" : tresc.slice(granica).map((l) => l.s).join("\n");
  return zasady ? { strona: tresc[0].strona, zasady, rozwiazanie } : null;
}
