// Arkusz z matematyki (poziom podstawowy, formuła 2023).
//
// Tekst z PDF gubi ułamki, potęgi i pierwiastki („(√32 − √2 ) 2”), więc
// treść zadania pokazujemy jako kadr wycięty z wyrenderowanej strony,
// a tekst zostaje tylko jako opis obrazka (dostępność, wyszukiwanie, AI).
// Z tekstu bierzemy układ: nagłówki „Zadanie N. (0–X)”, etykietę „Brudnopis”
// i linie akapitów, które oddzielają rysunki od reszty treści.
//
// Rysunek bazowy (figura, wykres, oś liczbowa) to pas kadru z ciemnym
// tuszem, w którym nie ma zwykłych linii tekstu. Trafia do aplikacji jako
// osobny PNG, który uczeń dorysowuje w brudnopisie. Gdy heurystyka się myli,
// ramkę poprawia się ręcznie w rysunki.json (same współrzędne, bez treści CKE).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const NAGLOWEK = /^Zadanie (\d+)(?:\.(\d+))?\.(?:\s*\(0[–-](\d+)\))?$/;
const SKALA = 2; // piksele na punkt PDF; ostre kadry na telefonie
const KADR_X = [66, 530]; // bez marginesu z tabelką dla egzaminatora
const STOPKA_Y = 58; // „Strona N z M” i kod arkusza
const CIEMNY = 150; // jasnoszara kratka brudnopisu i miejsca na rozwiązanie to nie tusz
const MIN_RYSUNEK = { wys: 70, szer: 80 };

const FONTY = join(dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json")), "standard_fonts") + "/";

export async function otworzPdf(sciezka) {
  const data = new Uint8Array(await readFile(sciezka));
  return getDocument({ data, verbosity: 0, standardFontDataUrl: FONTY }).promise;
}

// Fragment to jeden nagłówek „Zadanie …” z treścią do następnego nagłówka.
// Wspólny wstęp („Zadanie 12.” bez punktów) też jest fragmentem, tylko bez
// pytania. Treść, która nie zmieściła się na stronie (np. wykresy C–F pod
// tabelą), jest kolejną częścią fragmentu na następnej stronie. Strona
// z samą kratką na rozwiązanie nie ma linii tekstu, więc nic nie dodaje.
export function fragmentyMatematyki(strony) {
  const fragmenty = [];
  let akt = null;
  strony.forEach((linie, i) => {
    let czesc = null;
    for (const l of linie) {
      if (l.y < STOPKA_Y) continue;
      const seg = l.seg.filter((g) => g.x >= 60 && g.x < KADR_X[1] - 10);
      if (!seg.length) continue;
      // Strony brudnopisu na końcu arkusza zamykają ostatnie zadanie.
      if (/^BRUDNOPIS/.test(seg[0].s)) {
        akt = null;
        break;
      }
      const m = seg[0].s.match(NAGLOWEK);
      if (m) {
        czesc = { strona: i + 1, gora: l.y, naglowek: true, linie: [], brudnopis: null };
        akt = { zadanie: Number(m[1]), nr: m[2] ? `${m[1]}.${m[2]}` : m[1], punkty: m[3] ? Number(m[3]) : 0, czesci: [czesc] };
        fragmenty.push(akt);
        continue;
      }
      if (!akt) continue;
      if (!czesc) {
        // Ciąg dalszy z poprzedniej strony, o ile tamtej części nie zamknął brudnopis.
        if (akt.czesci[akt.czesci.length - 1].brudnopis !== null) continue;
        czesc = { strona: i + 1, gora: l.y + 4, naglowek: false, linie: [], brudnopis: null };
        akt.czesci.push(czesc);
      }
      if (seg[0].s === "Brudnopis") {
        czesc.brudnopis ??= l.y;
        continue;
      }
      if (czesc.brudnopis === null) czesc.linie.push({ ...l, seg, s: seg.map((g) => g.s).join(" ") });
    }
  });
  return fragmenty;
}

// Zwykła linia tekstu zaczyna się przy lewym marginesie od słowa, a nie od
// samej litery opcji („A.”) czy liczby na osi; na takich liniach nie ma rysunku.
const akapitowa = (l) => l.seg[0].x <= 90 && l.seg[0].s.length >= 4;

// zRysunkiem: numery fragmentów, w których forma DOCX ma rysunek; tam szukamy
// figury z niższym progiem wysokości (pojedyncza oś liczbowa ma ok. 26 pt).
// bezRysunkow: same kadry (informatyka). format „webp” waży kilka razy mniej niż PNG,
// co ma znaczenie przy arkuszu złożonym z samych kadrów.
export async function kadruj(doc, fragmenty, { katalog, prefiks, poprawki = {}, zRysunkiem = new Set(), bezRysunkow = false, format = "png" }) {
  await mkdir(katalog, { recursive: true });
  const strony = new Map();
  const strona = async (n) => {
    if (!strony.has(n)) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: SKALA });
      const c = doc.canvasFactory.create(viewport.width, viewport.height);
      await page.render({ canvasContext: c.context, viewport }).promise;
      strony.set(n, { ...c, wys: page.view[3], fabryka: doc.canvasFactory });
    }
    return strony.get(n);
  };

  const wszystkie = fragmenty.flatMap((f) => f.czesci);
  for (const f of fragmenty) {
    const poprawka = poprawki[f.nr];
    // Tabela „A albo B oraz 1., 2. albo 3.” to wybór odpowiedzi, nie figura.
    const tabelaWyboru = f.czesci.some((c) => c.linie.some((l) => /A albo B oraz/.test(l.s)));
    f.kadry = [];
    for (const [i, c] of f.czesci.entries()) {
      const s = await strona(c.strona);
      const dolLimit = c.brudnopis !== null ? c.brudnopis + 14 : STOPKA_Y;
      const nastepna = wszystkie.find((g) => g.strona === c.strona && g.gora < c.gora);
      const dol = Math.max(dolLimit, nastepna ? nastepna.gora + 18 : 0);
      const tusz = wierszeTuszu(s, c.gora + 12, dol, s.wys);
      // Dół kadru to ostatni wiersz z tuszem: jasna kratka na rozwiązanie zostaje poza nim.
      let ostatni = c.gora;
      for (const [y, ciemny] of tusz) if (ciemny) ostatni = Math.min(ostatni, y);
      const plik = i ? `${f.nr}-${i + 1}.${format}` : `${f.nr}.${format}`;
      // Pasek „Zadanie N. (0–X)” dubluje nagłówek w aplikacji, więc go obcinamy.
      // Zostaje tylko przy podpunktach (12.2), bo tam niesie numer i punktację.
      const gora = c.naglowek && !f.nr.includes(".") ? c.gora - 6 : c.gora + 13;
      f.kadry.push(await zapiszWycinek(s, [KADR_X[0], Math.max(dol, ostatni - 6), KADR_X[1], gora], katalog, prefiks, plik));

      if (bezRysunkow || f.rysunek || poprawka === null || (poprawka && poprawka.strona !== c.strona)) continue;
      const rysunek = poprawka ? { ramka: poprawka.ramka } : tabelaWyboru ? null : znajdzRysunek(s, c, tusz, zRysunkiem.has(f.nr) ? 20 : MIN_RYSUNEK.wys);
      if (rysunek) f.rysunek = await zapiszWycinek(s, rysunek.ramka, katalog, prefiks, `${f.nr}-rysunek.png`);
    }
  }
}

// Dla każdego punktu w pionie (od góry do dołu): czy w wierszu jest ciemny tusz.
function wierszeTuszu(s, gora, dol, wysStrony) {
  const wynik = [];
  const [x0, x1] = KADR_X.map((x) => Math.round(x * SKALA));
  for (let y = Math.floor(gora); y >= Math.ceil(dol); y--) {
    const py = Math.round((wysStrony - y) * SKALA);
    const dane = s.context.getImageData(x0, py, x1 - x0, SKALA).data;
    let ciemny = false;
    for (let i = 0; i < dane.length; i += 4) {
      if (dane[i] + dane[i + 1] + dane[i + 2] < CIEMNY * 3 && dane[i + 3] > 0) {
        ciemny = true;
        break;
      }
    }
    wynik.push([y, ciemny]);
  }
  return wynik;
}

function znajdzRysunek(s, c, tusz, minWys) {
  const zajete = (y) => (c.naglowek && y >= c.gora - 6) || c.linie.some((l) => akapitowa(l) && y >= l.y - 4 && y <= l.y + 11);
  // Pasy tuszu między liniami akapitów. Linia akapitu zamyka pas (tabela
  // z tekstem w wierszach to nie rysunek), a puste przerwy (odstęp między
  // osiami w opcjach A–D) sklejamy.
  const pasy = [];
  let otwarty = false;
  for (const [y, ciemny] of tusz) {
    if (zajete(y)) {
      otwarty = false;
      continue;
    }
    if (!ciemny) continue;
    const ost = pasy[pasy.length - 1];
    if (otwarty && ost.dol - y <= 40) ost.dol = y;
    else pasy.push({ gora: y, dol: y });
    otwarty = true;
  }
  const kandydaci = pasy.filter((p) => p.gora - p.dol >= minWys);
  if (!kandydaci.length) return null;
  const p = kandydaci.sort((a, b) => b.gora - b.dol - (a.gora - a.dol))[0];
  const [lewo, prawo] = zakresPoziomy(s, p.gora, p.dol);
  if (prawo - lewo < MIN_RYSUNEK.szer) return null;
  return { ramka: [Math.max(KADR_X[0], lewo - 6), p.dol - 6, Math.min(KADR_X[1], prawo + 6), p.gora + 6] };
}

function zakresPoziomy(s, gora, dol) {
  const [x0, x1] = KADR_X.map((x) => Math.round(x * SKALA));
  const py0 = Math.round((s.wys - gora) * SKALA);
  const wys = Math.round((gora - dol) * SKALA);
  const dane = s.context.getImageData(x0, py0, x1 - x0, wys).data;
  const szer = x1 - x0;
  let lewo = szer;
  let prawo = 0;
  for (let i = 0; i < dane.length; i += 4) {
    if (dane[i] + dane[i + 1] + dane[i + 2] >= CIEMNY * 3) continue;
    const x = (i / 4) % szer;
    if (x < lewo) lewo = x;
    if (x > prawo) prawo = x;
  }
  return [x0 / SKALA + lewo / SKALA, x0 / SKALA + prawo / SKALA];
}

// Zapisuje wycinek strony jako PNG. Zwraca opis obrazu dla aplikacji:
// ścieżkę względem data/arkusze i wymiary w punktach PDF.
async function zapiszWycinek(s, [x0, y0, x1, y1], katalog, prefiks, plik) {
  const px = Math.round(x0 * SKALA);
  const py = Math.round((s.wys - y1) * SKALA);
  const w = Math.round((x1 - x0) * SKALA);
  const h = Math.round((y1 - y0) * SKALA);
  const cel = s.fabryka.create(w, h);
  cel.context.putImageData(s.context.getImageData(px, py, w, h), 0, 0);
  await writeFile(join(katalog, plik), plik.endsWith(".webp") ? cel.canvas.toBuffer("image/webp", 80) : cel.canvas.toBuffer("image/png"));
  return { src: `${prefiks}/${plik}`, szer: Math.round(x1 - x0), wys: Math.round(y1 - y0) };
}

// Zasady oceniania: przy zadaniach zamkniętych tabela „Wersja A | Wersja B”
// z kodem odpowiedzi (B, PF, A2, CE; czasem w dwóch wierszach), przy krótkich
// otwartych sama odpowiedź po „Rozwiązanie”, przy dłuższych schemat punktowania.
// Bierzemy wersję A i zapamiętujemy stronę zadania, żeby uczeń mógł zajrzeć do schematu.
const KOD = /^[A-FPT1-9]{1,3}$/;

export function kluczMatematyki(strony) {
  const klucz = {};
  let akt = null;
  let tryb = null; // "wersje" po nagłówku tabeli, "rozwiazanie" po „Rozwiązanie”
  strony.forEach((linie, i) => {
    for (const l of linie) {
      const m = l.s.match(/^Zadanie (\d+(?:\.\d+)?)\. \(0[–-](\d+)\)/);
      if (m) {
        akt = klucz[m[1]] = { nr: m[1], punkty: Number(m[2]), strona: i + 1 };
        tryb = null;
        continue;
      }
      if (!akt || l.y < STOPKA_Y || l.y > 790) continue;
      if (/^Rozwiązanie$/.test(l.s)) {
        tryb = "rozwiazanie";
        continue;
      }
      if (tryb && /^Wersja A/.test(l.seg[0].s)) {
        tryb = "wersje";
        continue;
      }
      // Klucz po zdaniach („29.1. C”, „29.2. A”): litera dla każdej luki z osobna.
      const wybor = tryb === "wersje" && l.seg[0].s.match(/^(\d+\.\d+)\.\s*([A-Z])$/);
      if (wybor) {
        (akt.wybory ??= {})[wybor[1]] = wybor[2];
        continue;
      }
      if (tryb === "wersje" && KOD.test(l.seg[0].s)) {
        akt.kod = (akt.kod ?? "") + l.seg[0].s;
        continue;
      }
      if (tryb === "rozwiazanie" && l.s.length <= 25 && !akt.kod) akt.odpowiedz = l.s;
      tryb = null;
    }
  });
  return klucz;
}

// Zamienia ścieżki PNG (kadry, rysunki) na data URL. Pliki zostają w data/
// do podglądu, a aplikacja dostaje wszystko w jednym JSON-ie z bazy.
export async function osadzObrazy(zadania, katalog) {
  const cache = new Map();
  const osadz = async (obraz) => {
    if (!obraz || obraz.src.startsWith("data:")) return;
    if (!cache.has(obraz.src)) cache.set(obraz.src, `data:image/${obraz.src.endsWith(".webp") ? "webp" : "png"};base64,${(await readFile(join(katalog, obraz.src))).toString("base64")}`);
    obraz.src = cache.get(obraz.src);
  };
  for (const z of zadania) {
    await osadz(z.rysunek);
    for (const b of z.bloki) await osadz(b.obraz);
  }
}

// Zdania-polecenia, które w arkuszu są pogrubione.
const POLECENIE = /^(Dokończ zdanie|Oceń prawdziwość|Uzupełnij|Wybierz|Wpisz|Zapisz obliczenia|Oblicz|Wyznacz|Rozwiąż|Wykaż|Udowodnij|Podaj|Zaznacz)/;

// Forma 660 bywa przerobiona (w zad. 6 z 2025 zamiast czterech osi liczbowych
// są przedziały do wyboru). Wtedy pokazujemy kadr, żeby uczeń ćwiczył na
// zadaniu z prawdziwego arkusza i żeby pasował klucz wersji A.
const PROG_PODOBIENSTWA = 0.8;

function powodKadru(f, d, tekstPdf) {
  if (d.obiekty) return "osadzony obiekt w DOCX";
  if (d.bloki.some((b) => b.typ === "miejsceRysunku") && !f.rysunek) return "rysunek bez wycinka z PDF";
  const a = normalizuj(tekstPdf);
  const b = normalizuj(d.porownanie);
  const p = podobienstwo(a, b);
  if (p >= PROG_PODOBIENSTWA) return null;
  // Tabela bywa w formie 660 obrócona (wiersze zamiast kolumn): te same znaki, inna kolejność.
  if (d.bloki.some((x) => x.typ === "tabelaTresci") && zbiezneZnaki(a, b) >= 0.9) return null;
  return `treść różni się od arkusza (${Math.round(p * 100) / 100})`;
}

// Udział wspólnych znaków bez względu na kolejność (tabela obrócona w formie 660).
function zbiezneZnaki(a, b) {
  const licz = new Map();
  for (const z of a) licz.set(z, (licz.get(z) ?? 0) + 1);
  let wspolne = 0;
  for (const z of b) if (licz.get(z) > 0) (licz.set(z, licz.get(z) - 1), wspolne++);
  return (2 * wspolne) / (a.length + b.length);
}

// Do porównania zostają same litery i cyfry; NFKC zamienia kursywę
// matematyczną z PDF (𝑥) na zwykłe litery. Wycinamy słowa, którymi forma 660
// różni się zawsze („zapisz” zamiast „wybierz”, „jak na rysunku”).
function normalizuj(s) {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/zapisz|wybierz|wpisz|po numerach zdań|jak na rysunku|na rysunku|zobacz rysunek|w wykropkowanych miejscach|brudnopis/g, "")
    .replace(/[^a-z0-9ąćęłńóśźż]/g, "");
}

// 2·LCS / (|a| + |b|): 1 dla identycznych, odporne na pojedyncze wtrącenia.
function podobienstwo(a, b) {
  if (!a.length || !b.length) return 0;
  let poprz = new Uint16Array(b.length + 1);
  let akt = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) akt[j] = a[i - 1] === b[j - 1] ? poprz[j - 1] + 1 : Math.max(poprz[j], akt[j - 1]);
    [poprz, akt] = [akt, poprz];
  }
  return (2 * poprz[b.length]) / (a.length + b.length);
}

// „Uzupełnij zdania 1. i 2. Zapisz po numerze zdania właściwą odpowiedź, wybraną spośród
// oznaczonych literami A–E” z kluczem po zdaniach (29.1. C, 29.2. A): luka „……” w zdaniu
// „1. …” staje się znacznikiem {{29.1}}, a opcja dopisana akapitem („E. 5,70 zł”, DOCX
// nie trzyma jej w liście) dołącza do bloku opcji. Bez pasujących zdań zwraca null.
function lukiZWyborem(z, od, f, k) {
  const wybory = Object.entries(k.wybory).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  const bloki = z.bloki.slice(od);
  const zdania = wybory.map(([nr]) => bloki.find((b) => b.typ === "akapit" && b.tekst.startsWith(`${nr.split(".")[1]}. `) && /…{2,}|\.{4,}/.test(b.tekst)));
  const opcje = bloki.find((b) => b.typ === "opcje");
  if (zdania.some((b) => !b) || !opcje) return null;
  zdania.forEach((b, i) => (b.tekst = b.tekst.replace(/…{2,}|\.{4,}/, `{{${wybory[i][0]}}}`)));
  const dopisane = bloki.filter((b) => b.typ === "akapit" && /^[A-Z]\.\s/.test(b.tekst));
  for (const b of dopisane) {
    opcje.opcje.push({ litera: b.tekst[0], tresc: b.tekst.slice(3).trim() });
    z.bloki.splice(z.bloki.indexOf(b), 1);
  }
  opcje.opcje.sort((a, b) => a.litera.localeCompare(b.litera));
  return { wybory, litery: opcje.opcje.map((o) => o.litera) };
}

// Fragmenty z kluczem składamy w zadania w formacie aplikacji (apps/web/src/arkusze/typy.ts).
export function zadaniaMatematyki(fragmenty, klucz, docx = null) {
  const ostrzezenia = [];
  const zadania = [];
  const kadry = []; // fragmenty pokazane jako obraz, z powodem
  for (const f of fragmenty) {
    let z = zadania.find((x) => x.nr === f.zadanie);
    if (!z) zadania.push((z = { nr: f.zadanie, punkty: 0, strona: f.czesci[0].strona, sluchanie: false, polecenie: [], bloki: [], pytania: [] }));
    // Bloki fragmentu stoją na jego pierwszej stronie (kadry mają własną); finally łapie też „continue”.
    const od = z.bloki.length;
    try {
    const tekst = f.czesci.flatMap((c) => c.linie.map((l) => l.s)).join(" ");
    if (f.rysunek && !z.rysunek) z.rysunek = f.rysunek;

    const d = docx?.find((x) => x.nr === f.nr);
    const powod = d ? powodKadru(f, d, tekst) : "brak DOCX";
    const opcje = [];
    if (powod) {
      kadry.push(`${f.nr}: ${powod}`);
      f.czesci.forEach((c, i) => z.bloki.push({ typ: "kadr", obraz: f.kadry[i], tekst: c.linie.map((l) => l.s).join(" "), strona: c.strona }));
    } else {
      // Podpunkt (12.2) dostaje nagłówek jak pasek w arkuszu; całe zadanie ma go w aplikacji.
      if (f.nr.includes(".")) z.bloki.push({ typ: "naglowek", tekst: `Zadanie ${f.nr} (0–${f.punkty} pkt)` });
      for (const b of d.bloki) {
        if (b.typ === "opcja") opcje.push({ litera: b.litera, tresc: b.tresc });
        else if (b.typ === "miejsceRysunku") z.bloki.push({ typ: "rysunek", obraz: f.rysunek });
        else if (b.typ === "akapit" && POLECENIE.test(b.tekst)) z.bloki.push({ ...b, polecenie: true });
        else z.bloki.push(b);
      }
      // Figura z PDF, której forma 660 nie ma jako rysunku, stoi na końcu treści.
      if (f.rysunek && !d.bloki.some((b) => b.typ === "miejsceRysunku")) z.bloki.push({ typ: "rysunek", obraz: f.rysunek });
    }

    const k = f.punkty ? klucz[f.nr] : null;
    const pelneOpcje = opcje.length === 4 && opcje.map((o) => o.litera).join("") === "ABCD";
    const zamkniete = f.punkty && k?.kod && /^[A-D]$/.test(k.kod) && /Wybierz właściwą odpowiedź spośród podanych/.test(tekst);
    // Opcje zamkniętego zadania renderuje pytanie; pozostałe (np. we wstępie) to zwykły blok.
    if (opcje.length && !(zamkniete && pelneOpcje)) z.bloki.push({ typ: "opcje", opcje });
    if (!f.punkty) continue; // wspólny wstęp do podpunktów

    if (!k) ostrzezenia.push(`${f.nr}: brak w kluczu`);
    else if (k.punkty !== f.punkty) ostrzezenia.push(`${f.nr}: ${f.punkty} pkt w arkuszu, ${k.punkty} w kluczu`);
    const baza = { nr: f.nr, tresc: "", punkty: f.punkty, ...(k ? { zasadyStrona: k.strona } : {}) };
    const luki = !zamkniete && k?.wybory ? lukiZWyborem(z, od, f, k) : null;
    if (luki) {
      // Każda luka to osobne pytanie zamknięte w tekście ({{29.1}}), sprawdzane z kluczem.
      for (const [nr, poprawna] of luki.wybory)
        z.pytania.push({ nr, tresc: "", punkty: f.punkty / luki.wybory.length, zasadyStrona: k.strona, typ: "zamkniete", litery: luki.litery, poprawna });
      z.punkty += f.punkty;
      continue;
    }
    if (zamkniete) {
      z.pytania.push({ ...baza, typ: "zamkniete", litery: ["A", "B", "C", "D"], poprawna: k.kod, ...(pelneOpcje ? { opcje } : {}) });
    } else if (k?.kod || k?.odpowiedz) {
      // Kod (PF, A2, CE) albo krótki wynik: uczeń wpisuje go w pole, a przy
      // niezgodności ocenia sam, bo zapis może się różnić (np. przedział).
      z.pytania.push({ ...baza, typ: "otwarte", oczekiwane: [k.kod ?? k.odpowiedz], ...(k.kod ? { kod: true } : {}) });
    } else {
      z.pytania.push({ ...baza, typ: "otwarte" });
    }
    z.bloki.push({ typ: "pytanie", nr: f.nr });
    z.punkty += f.punkty;
    } finally {
      for (const b of z.bloki.slice(od)) b.strona ??= f.czesci[0].strona;
    }
  }
  return { zadania, ostrzezenia, kadry };
}

