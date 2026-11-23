import { kluczMatematyki, powodKadru, zapiszWycinek } from "./matematyka.js";
import { kluczPisemny, kryteriaWypracowania, NAGLOWEK } from "./klucz-pisemny.js";
import { czyWypracowanie, poczatekWypracowania } from "./polski.js";
import { trescZFragmentow } from "./bloki-pisemne.js";
import { plotno } from "./tresc-pdf.js";
import { segmenty } from "./tekst.js";
import { odpowiedziZTabeli } from "./matematyka-klucz.js";
import { kluczInformatykiZTabeli } from "./informatyka-klucz.js";

const POLECENIE = /^(?:Na podstawie|Wybierz|Dokończ|Uzupełnij|Oceń|Rozstrzygnij|Wyjaśnij|Uzasadnij|Zaznacz|Wyznacz|Oblicz|Rozwiąż|Podaj|Wskaż|Określ|Zapisz|Napisz|Przetłumacz|Wymień|Sformułuj|Przedstaw|Wykaż|Udowodnij)\b/i;
const SZUM = /^Strona\s+\d+\s+z\s+\d+|^[A-Z]{3,4}-[PRD]\d?[-_]\d{3}|^Więcej arkuszy|^©|^Nr strony|^Ciąg dalszy na następnej stronie/i;
const KONIEC = /^(?:BRUDNOPIS|KARTA ODPOWIEDZI|WYPRACOWANIE|CZYSTOPIS|Koniec arkusza)\s*$/i;
const POMIN_KONCOWKE = /^(?:Miejsce na (?:obliczenia|zapis|notatki|odpowiedź)|Do oceny oddajesz)\s*[:.]?$/i;

function liniaTresci(l) {
  const czesci = l.czesci.filter((c) => c.x >= 49 && c.x < 539 && (c.x >= 64 || !/^\s*[\d.−–-]+\s*$/.test(c.s)));
  const seg = segmenty(czesci);
  const s = seg.map((g) => g.s).join(" ").replace(/^(?:\d+(?:\.\d+)*\.?\s+)+(?=Zadani[ea]\s)/i, "");
  if (!s || l.y < 53 || l.y > 790 || SZUM.test(s)) return null;
  return { ...l, x: seg[0].x, czesci, seg, s };
}

export function fragmentyPisemne(strony, wpis) {
  const fragmenty = [];
  const rozpoznane = new Set();
  let akt;
  let zakonczonaTresc = false;
  let przedZadaniem = [];
  for (const [n, wiersze] of strony.entries()) {
    if (n === 0) continue;
    let c;
    for (const l of wiersze.map(liniaTresci).filter(Boolean)) {
      if (/^STRONA (PUSTA|WOLNA)$/i.test(l.s)) break;
      if (KONIEC.test(l.s)) {
        if (c && !zakonczonaTresc) c.dol = Math.max(56, l.y + 12);
        zakonczonaTresc = true;
        if (/^KARTA ODPOWIEDZI|^Koniec arkusza/i.test(l.s)) return fragmenty;
        continue;
      }
      const m = l.s.match(NAGLOWEK);
      const esej = !akt && wpis.przedmiot === "polski" && poczatekWypracowania(l.s, wpis);
      const zapowiedz = m?.[3] && /^(?:rozwiąż|wykonaj|odnosi się|[-–]\s*\d)/i.test(m[3]);
      if (m && !zapowiedz || esej) {
        const nr = m ? m[1] : "1";
        if (rozpoznane.has(nr)) continue;
        rozpoznane.add(nr);
        if (c && !zakonczonaTresc) c.dol = Math.max(56, l.y + 13);
        if (przedZadaniem.at(-1)?.strona === n + 1) przedZadaniem.at(-1).dol = l.y + 13;
        const tytulZPunktami = m?.[3]?.match(/^(.*?)\s*\(0\s*[–−-]\s*(\d+)\)$/);
        const dolaczonyTekst = (tytulZPunktami?.[1] ?? m?.[3])?.replace(new RegExp("^" + nr.replaceAll(".", "\\.") + "\\.?$"), "");
        const punkty = m?.[2] ?? tytulZPunktami?.[2];
        c = { strona: n + 1, gora: m ? l.y - 4 : l.y + 13, dol: 56, linie: esej ? [l] : [] };
        akt = { nr, zadanie: Number(nr.match(/^\d+/)[0]), punkty: punkty === undefined ? undefined : Number(punkty), esej, czesci: [c] };
        if (dolaczonyTekst) {
          if (!m[2] && wpis.przedmiot === "informatyka") akt.tytul = dolaczonyTekst;
          else akt.dopisek = dolaczonyTekst;
        }
        if (przedZadaniem.length) {
          akt.czesci.unshift(...przedZadaniem);
          przedZadaniem = [];
        }
        zakonczonaTresc = false;
        fragmenty.push(akt);
        continue;
      }
      if (!akt) {
        // Pierwsza wiązka w arkuszu polskiego zaczyna się tekstem przed numerem zadania.
        if (wpis.przedmiot !== "polski" || n < 2 || wpis.czesc === "Część 2" || wpis.poziom === "rozszerzony") continue;
        if (!przedZadaniem.length && !/^(?:Język polski w użyciu|Test historycznoliteracki|Przeczytaj|Tekst [12]\b|Część [12]\b)/i.test(l.s)) continue;
        const poprzednia = przedZadaniem.at(-1);
        if (poprzednia?.strona === n + 1) poprzednia.linie.push(l);
        else przedZadaniem.push({ strona: n + 1, gora: l.y + 13, dol: 56, linie: [l] });
        continue;
      }
      if (POMIN_KONCOWKE.test(l.s)) {
        if (c) c.dol = Math.max(56, l.y + 12);
        zakonczonaTresc = true;
      }
      if (zakonczonaTresc) continue;
      if (!c) {
        c = { strona: n + 1, gora: Math.min(785, l.y + 38), dol: 56, linie: [] };
        akt.czesci.push(c);
      }
      c.linie.push(l);
    }
  }
  for (const f of fragmenty) {
    for (const c of f.czesci) if (c.dol >= c.gora) c.dol = c.gora - 1;
  }
  return fragmenty;
}

function zDocx(f, d) {
  if (!d || !d.bloki.some((b) => b.typ === "wzor" || b.tekst?.includes("\\(") || b.tresc?.includes("\\("))) return;
  const rysunki = f.bloki.filter((b) => b.typ === "rysunek");
  const tekstPdf = f.czesci.flatMap((c) => c.linie.map((l) => l.s)).join(" ");
  if (powodKadru({ rysunek: rysunki[0] }, d, tekstPdf)) return;
  const strona = f.czesci[0].strona;
  const bloki = [];
  for (const b of d.bloki) {
    if (b.typ === "miejsceRysunku") {
      if (rysunki.length) bloki.push(rysunki.shift());
    } else if (b.typ === "opcja") bloki.push({ typ: "akapit", tekst: b.litera + ". " + b.tresc, strona });
    else bloki.push({ ...b, strona });
  }
  f.bloki = [...bloki, ...rysunki];
}

function kodOdpowiedzi(tekst) {
  const kod = tekst.trim().replace(/\(kolejność (?:nie ma znaczenia|dowolna)\)/gi, "")
    .replace(/\b\d{1,2}[.)]\s*(?=[A-HFP]\b)/g, "").replace(/[\s,.;–−-]/g, "");
  return /^(?:[PF]{2,10}|[A-H](?:[1-9]|[A-H]){1,4}|[1-9][A-H]|[0-9]{2,6})$/.test(kod) ? kod : null;
}

function krotkaOdpowiedz(tekst, polecenie) {
  const linie = tekst.trim().replace(/^•\s*/gm, "").split("\n").filter(Boolean);
  if (!linie.length || linie.length > 4 || !/^(?:Podaj|Wpisz|Nazwij|Wymień|Określ|Zapisz|Oblicz|Wyznacz|Uzupełnij|Rozpoznaj)/i.test(polecenie.trim())) return null;
  if (linie.some((s) => s.length > 65 || s.trim().split(/\s+/).length > 7 || /[�\uE000-\uF8FF]|ponieważ|dlatego|natomiast|uwzględn|np\.|[;!?]/i.test(s))) return null;
  if (/uzasadnij|wyjaśnij|wykaż|i oblicz|rozumowan|zapisz obliczenia/.test(polecenie.toLowerCase())) return null;
  if (linie.length > 1) return null;
  return linie[0].split(/\s+(?:lub|albo|\/)\s+/i).map((o) => o.trim()).filter(Boolean);
}

function pytanie(f, k, tekst, esej) {
  const baza = { nr: f.nr, tresc: "", punkty: f.punkty, ...(k && { zasadyStrona: k.strona, zasady: k.zasady, rozwiazanie: k.rozwiazanie }) };
  if (esej) return { ...baza, typ: "otwarte" };
  const odpowiedz = k?.rozwiazanie?.trim() || k?.kod || k?.odpowiedz || "";
  const litera = odpowiedz.match(/^([A-H])\.?$/)?.[1];
  const pola = f.bloki.filter((b) => b.typ === "akapit" && /^[A-H][.)]\s/.test(b.tekst));
  const opcje = pola.map((b) => ({ litera: b.tekst[0], tresc: b.tekst.slice(2).trim() })).sort((a, b) => a.litera.localeCompare(b.litera));
  const unikalne = opcje.length >= 2 && opcje.every((o, i) => o.litera === "ABCDEFGH"[i]);
  if (litera && unikalne && opcje.some((o) => o.litera === litera)) {
    f.bloki = f.bloki.filter((b) => !pola.includes(b));
    return { ...baza, typ: "zamkniete", litery: opcje.map((o) => o.litera), poprawna: litera, opcje };
  }
  if (litera && /spośród podanych|zaznacz|właściwą odpowiedź/i.test(tekst)) {
    const koniec = tekst.match(/\bA\s*[–−-]\s*([B-H])\b/)?.[1] ?? "D";
    const litery = [..."ABCDEFGH".slice(0, koniec.charCodeAt(0) - 64)];
    if (litery.includes(litera)) return { ...baza, typ: "zamkniete", litery, poprawna: litera };
  }
  const rozpoznanyKod = kodOdpowiedzi(odpowiedz);
  const kod = rozpoznanyKod && (!/^\d+$/.test(rozpoznanyKod) || /kratki|cyfr[ayę]|przyporządkuj|kod\b/i.test(tekst)) ? rozpoznanyKod : null;
  const polecenie = f.bloki.filter((b) => b.polecenie).map((b) => b.tekst).at(-1) ?? tekst;
  const oczekiwane = kod ? [kod] : krotkaOdpowiedz(odpowiedz, polecenie);
  const tabela = f.bloki.find((b) => b.typ === "tabelaTresci" && (kod && /^[PF]+$/.test(kod)
    ? b.wiersze.some((w) => w.includes("P") && w.includes("F"))
    : /uzupełnij tabelę|wpisz.*tabel/i.test(tekst) && b.wiersze.slice(b.naglowek || 1).some((w) => w.some((komorka) => !komorka))));
  if (tabela) tabela.pytanie = f.nr;
  return { ...baza, typ: "otwarte", ...(oczekiwane?.length && { oczekiwane }), ...(kod && { kod: true }), ...(tabela && !kod && { tabela: true }) };
}

export async function importujPisemny(pdf, strony, stronyKlucza, wpis, metadane, obrazy, docx, dane, mapa) {
  const fragmenty = fragmentyPisemne(strony, wpis);
  const kadry = await trescZFragmentow(pdf, fragmenty, obrazy, wpis);
  const wynik = zadaniaPisemne(fragmenty, stronyKlucza, wpis, metadane, docx, dane);
  if (mapa && wynik.zadania.length) {
    const cache = new Map();
    const zalacznik = [];
    for (let i = 1; i <= mapa.numPages; i++) {
      const s = await plotno(mapa, i, cache);
      const obraz = await zapiszWycinek(s, [0, 0, s.canvas.width / 2, s.wys], obrazy.katalog, obrazy.prefiks, "mapa-" + i + ".webp");
      zalacznik.push({ typ: "rysunek", obraz });
      s.fabryka.destroy(s);
    }
    wynik.zadania[0].bloki.unshift(...zalacznik);
  }
  return { ...wynik, kadry };
}

export function zadaniaPisemne(fragmenty, stronyKlucza, wpis, metadane, docx, dane) {
  const klucz = kluczPisemny(stronyKlucza);
  if (wpis.przedmiot === "informatyka" && wpis.rok === 2014) Object.assign(klucz, kluczInformatykiZTabeli(stronyKlucza));
  if (wpis.przedmiot === "matematyka") Object.assign(klucz, odpowiedziZTabeli(stronyKlucza));
  const kluczMat = wpis.przedmiot === "matematyka" ? kluczMatematyki(stronyKlucza) : {};
  const ostrzezenia = [];
  const zadania = new Map();
  for (const f of fragmenty) {
    let z = zadania.get(f.zadanie);
    const strona = f.czesci[0].strona;
    if (!z) {
      z = { nr: f.zadanie, punkty: 0, strona, sluchanie: false, polecenie: [], bloki: [], pytania: [] };
      zadania.set(f.zadanie, z);
    }
    if (f.tytul) z.tytul = f.tytul;
    const czyMaPodpunkty = !f.nr.includes(".") && fragmenty.some((g) => g.zadanie === f.zadanie && g.nr.includes(".") && (g.punkty || klucz[g.nr]?.punkty));
    let k = klucz[f.nr];
    if (kluczMat[f.nr]) k = { ...kluczMat[f.nr], ...k };
    if (k && !k.rozwiazanie && k.kod) k.rozwiazanie = k.kod;
    const tresc = f.czesci.flatMap((c) => c.linie.map((l) => l.s)).join(" ");
    if (wpis.przedmiot === "polski" && !czyMaPodpunkty && /Temat [12]\.|wybierz jeden temat/i.test(tresc)) f.esej = true;
    if (f.punkty === undefined && !czyMaPodpunkty) {
      f.punkty = k?.punkty;
      if (f.esej && !f.punkty && metadane.punkty !== undefined) {
        const inne = fragmenty.filter((g) => g !== f && !g.esej).reduce((s, g) => s + (g.punkty ?? 0), 0);
        f.punkty = metadane.punkty - inne;
      }
    }
    const esej = f.esej || czyWypracowanie(wpis.przedmiot, tresc, f.punkty ?? 0);
    if ((!k?.zasady && !k?.rozwiazanie) && f.punkty && !czyMaPodpunkty) {
      const skladowe = Object.entries(klucz).filter(([nr, k]) => nr !== f.nr && (nr.startsWith(f.nr + ".") || nr.replace(/[a-d]$/, "") === f.nr)
        && k.punkty && !fragmenty.some((g) => g.nr === nr));
      if (skladowe.length && skladowe.reduce((s, [, k]) => s + k.punkty, 0) === f.punkty) {
        const polacz = (pole) => skladowe.filter(([, cz]) => cz[pole]).map(([nr, cz]) => nr + ". " + cz[pole]).join("\n\n");
        k = { strona: skladowe[0][1].strona, zasady: polacz("zasady"), rozwiazanie: skladowe.length === 1 ? skladowe[0][1].rozwiazanie : polacz("rozwiazanie") };
      }
    }
    if (esej && wpis.przedmiot === "polski" && (!k?.zasady || wpis.czesc === "Część 2")) k = kryteriaWypracowania(stronyKlucza, f.nr) ?? k;
    if (esej && !k?.zasady && wpis.przedmiot !== "polski") {
      const kandydaci = Object.entries(klucz).filter(([nr, cz]) => cz.punkty === f.punkty && cz.zasady
        && !fragmenty.some((g) => g.nr === nr) && /wypracowani|wypowiedzi argumentacyjnej/i.test(cz.zasady));
      if (kandydaci.length === 1) k = kandydaci[0][1];
      else if (!k?.rozwiazanie && f === fragmenty.at(-1)) {
        k = kryteriaWypracowania(stronyKlucza, f.nr, { bezCalegoKlucza: true }) ?? k;
      }
    }
    zDocx(f, docx?.find((d) => d.nr === f.nr));
    if (f.nr.includes(".")) z.bloki.push({ typ: "naglowek", tekst: "Zadanie " + f.nr + "." + (f.punkty ? " (0–" + f.punkty + ")" : ""), strona });
    if (f.dopisek) z.bloki.push({ typ: "akapit", tekst: f.dopisek, strona });
    for (const b of f.bloki) if (b.typ === "akapit" && POLECENIE.test(b.tekst)) b.polecenie = true;
    const tekst = f.bloki.map((b) => b.tekst ?? "").join(" ");
    const podpunkty = czyMaPodpunkty && fragmenty.filter((g) => g.zadanie === f.zadanie && g.nr.includes("."));
    if (podpunkty && f.punkty && podpunkty.reduce((s, g) => s + (g.punkty ?? klucz[g.nr]?.punkty ?? 0), 0) === f.punkty) f.punkty = undefined;
    const q = f.punkty ? pytanie(f, k, tekst, esej) : null;
    z.bloki.push(...f.bloki);
    if (wpis.przedmiot === "informatyka") {
      for (const [plik] of tekst.matchAll(/[\w-]+\.(?:txt|csv)\b/g)) {
        if (dane?.pliki[plik] !== undefined && !(z.pliki ??= []).includes(plik)) z.pliki.push(plik);
      }
      if (/napisz program|język(?:u)? programowania|pseudokod/i.test(tekst)) z.program = true;
      if (/\bSQL\b|zapytanie|kwerend/i.test(tekst)) z.sql = true;
    }
    if (!q) continue;
    if (!k?.zasady && !k?.rozwiazanie && !k?.odpowiedz) ostrzezenia.push(f.nr + ": brak treści w kluczu");
    if (k?.punkty !== undefined && k.punkty !== f.punkty) ostrzezenia.push(f.nr + ": " + f.punkty + " pkt w arkuszu, " + k.punkty + " w kluczu");
    z.pytania.push(q);
    z.bloki.push({ typ: "pytanie", nr: q.nr, strona: f.czesci.at(-1).strona });
    z.punkty += f.punkty;
  }
  return { zadania: [...zadania.values()], ostrzezenia };
}
