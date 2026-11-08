// Arkusz z informatyki (poziom rozszerzony, formuła 2023).
//
// Tekst z PDF gubi pseudokod (strzałka przypisania wychodzi jako „•”), tabele
// i wykresy, a formy DOCX nie ma. Treść pokazujemy więc jak w matematyce:
// kadr wycięty z arkusza na każdy fragment „Zadanie N.” / „Zadanie N.M.”,
// a tekst zostaje jako opis obrazka (dostępność, Pestka).
//
// Zadania praktyczne (program, arkusz kalkulacyjny, baza danych) korzystają
// z plików z zipa CKE. Pliki trafiają do JSON-a arkusza (aplikacja uruchamia
// na nich kod i daje je do pobrania), a zadanie dostaje listę swoich plików.
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";

const NAGLOWEK = /^Zadanie (\d+)(?:\.(\d+))?\.(?:\s*\(0[–−-](\d+)\))?(?:\s+(.*))?$/;
const STOPKA_Y = 58;
// Miejsce na odpowiedź i lista plików do oddania zamykają fragment: w aplikacji odpowiedź
// ma własne pole, a oddawania plików nie ma.
const KONIEC = /^(Miejsce na (obliczenia|zapis|odpowied)|Do oceny oddajesz|BRUDNOPIS)/;

export function fragmentyInformatyki(strony) {
  const fragmenty = [];
  let akt = null;
  let informacji = 0;
  strony.forEach((linie, i) => {
    let czesc = null;
    for (const l of linie) {
      if (l.y < STOPKA_Y) continue;
      // Tabelka egzaminatora stoi na marginesie raz z lewej, raz z prawej.
      const seg = l.seg.filter((g) => g.x >= 60 && g.x < 520);
      if (!seg.length) continue;
      const s = seg.map((g) => g.s).join(" ");
      if (/^BRUDNOPIS/.test(s)) {
        akt = null;
        break;
      }
      const m = s.match(NAGLOWEK);
      // Wspólna informacja do kilku podpunktów („Informacja do zadań 2.3. i 2.4.”) to osobny
      // fragment bez punktów, żeby stała przed pierwszym z nich, a nie w poprzednim podpunkcie.
      const info = !m && akt && /^Informacja do zada/.test(s);
      if (m || info) {
        const nr = m ? (m[2] ? `${m[1]}.${m[2]}` : m[1]) : `${akt.zadanie}.i${++informacji}`;
        czesc = { strona: i + 1, gora: l.y, naglowek: true, linie: info ? [{ ...l, seg, s }] : [], brudnopis: null };
        akt = { zadanie: m ? Number(m[1]) : akt.zadanie, nr, punkty: m?.[3] ? Number(m[3]) : 0, tytul: m && !m[2] && !m[3] ? m[4] : undefined, czesci: [czesc] };
        fragmenty.push(akt);
        continue;
      }
      if (!akt) continue;
      if (!czesc) {
        if (akt.czesci[akt.czesci.length - 1].brudnopis !== null) continue;
        czesc = { strona: i + 1, gora: l.y + 4, naglowek: false, linie: [], brudnopis: null };
        akt.czesci.push(czesc);
      }
      if (KONIEC.test(s)) {
        czesc.brudnopis ??= l.y;
        continue;
      }
      if (czesc.brudnopis === null) czesc.linie.push({ ...l, seg, s });
    }
  });
  return fragmenty;
}

// Zasady oceniania: przy każdym podpunkcie „Zasady oceniania” (punktacja) i rozwiązanie
// pod jednym z kilku nagłówków. Bierzemy oba jako tekst; wcięcia pseudokodu odtwarzamy z położenia linii.
const ROZWIAZANIE = /^(Poprawne rozwiązanie|Rozwiązanie|Przykładowe rozwiązani[ea]|Poprawna odpowiedź|Przykładowa odpowiedź|Przykładowe odpowiedzi)$/;
// Nagłówki i stopki stron. Przypis z podstawą prawną („1 Rozporządzenie …”) kończy treść strony.
const POMIN = /^(Strona \d+ z \d+$|Egzamin maturalny z informatyki|Zasady oceniania rozwiązań zadań$)/;
const PRZYPIS = /^\d+ Rozporządzenie /;

export function kluczInformatyki(strony) {
  const klucz = {};
  let akt = null;
  let tryb = null;
  strony.forEach((linie, i) => {
    for (const l of linie) {
      if (PRZYPIS.test(l.s)) break;
      if (l.y < STOPKA_Y || POMIN.test(l.s)) continue;
      const m = l.s.match(/^Zadanie (\d+(?:\.\d+)?)\. \(0[–−-](\d+)\)/);
      if (m) {
        akt = klucz[m[1]] = { nr: m[1], punkty: Number(m[2]), strona: i + 1, zasady: [], rozwiazanie: [] };
        tryb = null;
        continue;
      }
      if (!akt) continue;
      if (/^Zasady oceniania$/.test(l.s)) tryb = "zasady";
      else if (ROZWIAZANIE.test(l.s)) tryb = "rozwiazanie";
      else if (/^Wymagani[ae] (ogóln|szczeg)/.test(l.s) || /^Podstawa programowa/.test(l.s)) tryb = null;
      else if (tryb) akt[tryb].push(l);
    }
  });
  for (const k of Object.values(klucz)) {
    k.zasady = k.zasady.map((l) => l.s).join("\n");
    k.rozwiazanie = wcieciaKodu(k.rozwiazanie);
  }
  return klucz;
}

// Strzałka przypisania „←” jest w PDF znakiem z fontu symboli i wychodzi jako „•”.
const strzalki = (s) => s.replace(/(\S) • /g, "$1 ← ");

function wcieciaKodu(linie) {
  if (!linie.length) return "";
  const lewa = Math.min(...linie.map((l) => l.x));
  // Ok. 5,5 pt na znak w foncie 11 pt.
  return linie.map((l) => " ".repeat(Math.max(0, Math.round((l.x - lewa) / 5.5))) + strzalki(l.s)).join("\n");
}

// Pliki z zipa CKE: { "dron.txt": "…" }. Część plików jest w Windows-1250, reszta w UTF-8.
export async function plikiDanych(sciezka) {
  const zip = unzipSync(new Uint8Array(await readFile(sciezka)));
  const pliki = {};
  for (const [nazwa, bajty] of Object.entries(zip)) {
    if (nazwa.endsWith("/") || !bajty.length) continue;
    const plik = nazwa.split("/").pop();
    let tekst;
    try {
      tekst = new TextDecoder("utf-8", { fatal: true }).decode(bajty);
    } catch {
      tekst = new TextDecoder("windows-1250").decode(bajty);
    }
    pliki[plik] = tekst.replace(/^﻿/, "");
  }
  return pliki;
}

// Odpowiedź z klucza jako lista wariantów do porównania albo null, gdy to algorytm, tabela
// z nagłówkami czy zapytanie SQL. Linie z objaśnieniem w nawiasie odpadają, „A lub B” daje dwa warianty.
function wynik(odp) {
  const linie = odp.split("\n").map((l) => l.trim()).filter((l) => l && !/^\(.*\)$/.test(l));
  if (!linie.length || linie.length > 8 || linie.join(" ").length > 200) return null;
  if (linie.some((l) => /←|SELECT|FROM|jeżeli|dopóki|wykonuj|zwróć/.test(l))) return null;
  if (linie.length === 1 && / lub /.test(linie[0])) return linie[0].split(/ lub /);
  return [linie.join("\n")];
}

// Fragmenty z kluczem składamy w zadania w formacie aplikacji (apps/web/src/arkusze/typy.ts).
export function zadaniaInformatyki(fragmenty, klucz, pliki = {}) {
  const ostrzezenia = [];
  const zadania = [];
  for (const f of fragmenty) {
    let z = zadania.find((x) => x.nr === f.zadanie);
    if (!z) zadania.push((z = { nr: f.zadanie, punkty: 0, strona: f.czesci[0].strona, sluchanie: false, polecenie: [], bloki: [], pytania: [] }));
    if (f.tytul) z.tytul = f.tytul;
    const tekst = f.czesci.flatMap((c) => c.linie.map((l) => l.s)).join(" ");
    // Podpunkt dostaje nagłówek z punktacją jak w arkuszu (wstęp zadania ma go w aplikacji).
    if (f.bloki && f.punkty && f.nr.includes(".")) z.bloki.push({ typ: "naglowek", tekst: `Zadanie ${f.nr} (0–${f.punkty} pkt)`, strona: f.czesci[0].strona });
    // Opcje A–D pytania zamkniętego odpowiadają w aplikacji przyciski, jak w matematyce.
    let opcje = null;
    const kz = f.punkty ? klucz[f.nr] : null;
    if (f.bloki && /^[A-D]$/.test(kz?.rozwiazanie.trim() ?? "")) {
      const zLitera = f.bloki.filter((b) => b.typ === "akapit" && /^[A-D]\.\s/.test(b.tekst));
      if (zLitera.map((b) => b.tekst[0]).join("") === "ABCD") {
        opcje = zLitera.map((b) => ({ litera: b.tekst[0], tresc: b.tekst.slice(2).trim() }));
        f.bloki = f.bloki.filter((b) => !zLitera.includes(b));
      }
    }
    // Tabela w podpunkcie z pustymi komórkami to pole odpowiedzi (komórki do wpisania), a tabela
    // z kolumnami P i F przy pytaniu „Oceń prawdziwość” to przełączniki P / F.
    if (f.bloki && f.punkty) {
      const kodPF = /^[PF]{2,8}$/.test((kz?.rozwiazanie ?? "").replace(/\s/g, ""));
      const t = f.bloki.find(
        (b) => b.typ === "tabelaTresci" && (kodPF ? b.wiersze.some((w) => w.includes("P") && w.includes("F")) : b.wiersze.slice(b.naglowek ?? 1).some((w) => w.some((k) => !k))),
      );
      if (t) t.pytanie = f.nr;
    }
    if (f.bloki) z.bloki.push(...f.bloki);
    else f.czesci.forEach((c, i) => z.bloki.push({ typ: "kadr", obraz: f.kadry[i], tekst: c.linie.map((l) => l.s).join(" "), strona: c.strona }));

    // Pliki danych, o których mówi treść (dron.txt, dron_przyklad.txt). Wyniki (wyniki3.txt) uczeń tworzy sam.
    for (const [nazwa] of tekst.matchAll(/[\w-]+\.txt\b/g)) if (pliki[nazwa] !== undefined && !(z.pliki ??= []).includes(nazwa)) z.pliki.push(nazwa);
    if (/Napisz program|napisz program|Napisz w wybranym języku|język(?:u)? programowania|pseudokod/.test(tekst)) z.program = true;
    if (/w języku SQL|zapytanie|kwerend/.test(tekst)) z.sql = true;

    if (!f.punkty) continue;
    const k = klucz[f.nr];
    if (!k) ostrzezenia.push(`${f.nr}: brak w kluczu`);
    else if (k.punkty !== f.punkty) ostrzezenia.push(`${f.nr}: ${f.punkty} pkt w arkuszu, ${k.punkty} w kluczu`);
    const odp = k?.rozwiazanie.trim() ?? "";
    const baza = { nr: f.nr, tresc: "", punkty: f.punkty, ...(k ? { zasadyStrona: k.strona, zasady: k.zasady, rozwiazanie: k.rozwiazanie } : {}) };
    if (/^[A-D]$/.test(odp) && /Zaznacz właściwą odpowiedź|Wybierz właściwą/.test(tekst)) {
      z.pytania.push({ ...baza, typ: "zamkniete", litery: ["A", "B", "C", "D"], poprawna: odp, ...(opcje ? { opcje } : {}) });
    } else if (/^[PF]{2,8}$/.test(odp.replace(/\s/g, ""))) {
      z.pytania.push({ ...baza, typ: "otwarte", oczekiwane: [odp.replace(/\s/g, "")], kod: true });
    } else if (wynik(odp)) {
      // Wynik (liczby, nazwy, kilka wierszy) aplikacja porównuje z odpowiedzią ucznia; reszta to samoocena.
      z.pytania.push({ ...baza, typ: "otwarte", oczekiwane: wynik(odp), wynik: true });
    } else {
      z.pytania.push({ ...baza, typ: "otwarte" });
    }
    // Odpowiedź w komórkach tabeli: aplikacja sprawdza ją wierszami z kluczem (patrz sprawdz.ts).
    const p = z.pytania.at(-1);
    if (p.typ === "otwarte" && !p.kod && f.bloki?.some((b) => b.typ === "tabelaTresci" && b.pytanie === f.nr)) p.tabela = true;
    z.bloki.push({ typ: "pytanie", nr: f.nr, strona: f.czesci.at(-1).strona });
    z.punkty += f.punkty;
  }
  return { zadania, ostrzezenia };
}
