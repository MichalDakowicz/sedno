// Parser arkusza egzaminacyjnego CKE (język angielski, formuła 2023).
// Z tekstu PDF buduje listę zadań: polecenie, bloki treści w kolejności
// z arkusza i pytania. Typ pytania (zamknięte czy otwarte) ustala dopiero
// klucz odpowiedzi, patrz scal.js.

const NAGLOWEK_ZADANIA = /^(?:Zadanie|TASK) (\d+)\. \(0[–-](\d+)\)/i;
const SZUM = [
  /Strona \d+ z \d+/,
  /^strona \d+$/,
  /^(PRZENIEŚ|TRANSFER YOUR)/i,
  /^BRUDNOPIS/,
  /^NOTES \(will not/,
];
const TYLKO_LINIA = /^[._…\s]{3,}$/;
const OPCJA = /^([A-H])\.\s+(.*)$/;
const ZRODLO = /^(Na podstawie:|Adapted from:|Źródło:|Based on:)/;
const KONIEC_WYPOWIEDZI = /^(CZYSTOPIS|FINAL COPY)$/;

// Linie jednego akapitu leżą w równych odstępach; akapit kończy wyraźnie
// większy odstęp. Tekst z lukami ma rzadsze linie, więc odstęp mierzymy
// względem dwóch pierwszych linii bloku, nie na sztywno.
const MAKS_ODSTEP = 30;
function blisko(blok, l) {
  const a = blok?.ostatnia;
  if (!a || a.strona !== l.strona) return false;
  const odstep = a.y - l.y;
  return blok.odstep ? odstep <= blok.odstep * 1.5 : odstep < MAKS_ODSTEP;
}
function dopisz(blok, l) {
  if (!blok.odstep && blok.ostatnia && blok.ostatnia.strona === l.strona) blok.odstep = blok.ostatnia.y - l.y;
  blok.ostatnia = l;
}

export function parsujArkusz(strony) {
  const linie = przygotujLinie(strony);
  const start = linie.findIndex((l) => NAGLOWEK_ZADANIA.test(l.s));
  if (start < 0) throw new Error("Nie znaleziono pierwszego zadania");
  const zadania = [];
  let akt = null;
  for (const l of linie.slice(start)) {
    const m = l.s.match(NAGLOWEK_ZADANIA);
    if (m && l.seg.length === 1) {
      akt = { nr: Number(m[1]), punkty: Number(m[2]), linie: [] };
      zadania.push(akt);
    } else if (akt) {
      akt.linie.push(l);
    }
  }
  return zadania.map(parsujZadanie);
}

function przygotujLinie(strony) {
  const wynik = [];
  for (const strona of strony) {
    for (const l of strona) {
      if (SZUM.some((r) => r.test(l.s))) continue;
      const poczatekLuki = TYLKO_LINIA.test(l.seg[0].s) && l.seg[0].s.includes("_");
      const seg = l.seg.filter((g) => !TYLKO_LINIA.test(g.s));
      if (!seg.length) continue;
      wynik.push({ ...l, seg, x: seg[0].x, s: seg.map((g) => g.s).join(" "), poczatekLuki });
    }
  }
  return wynik;
}

// Etykieta pytania na początku segmentu, np. „2.1. The man…” albo samo „4.1.”.
function etykietaNaPoczatku(tekst, nrZadania) {
  const m = tekst.match(/^(\d+)\.(\d+)\.(?=\s|$)(?!\s*[–-])\s*(.*)$/);
  if (!m || Number(m[1]) !== nrZadania) return null;
  if (/^(\([^)]*\)\s*)?_{2,}/.test(m[3])) return null; // to luka, nie pytanie
  return { nr: `${m[1]}.${m[2]}`, reszta: m[3] };
}

// Zamienia „3.1. ______” na znacznik luki {{3.1}} i usuwa resztki podkreśleń.
// Podpowiedź przed luką zostaje: „8.1. (SHORT) ____” → „(SHORT) {{8.1}}”.
function oznaczLuki(tekst, nrZadania, luki) {
  return tekst
    .replace(/(\d+)\.(\d+)\.\s*(\([^)]*\)\s*)?_{2,}/g, (cale, a, b, podpowiedz) => {
      if (Number(a) !== nrZadania) return cale;
      luki.add(`${a}.${b}`);
      return `${podpowiedz ?? ""}{{${a}.${b}}}`;
    })
    .replace(/(\}\})\s*_{2,}/g, "$1")
    .replace(/_{2,}/g, "_____");
}

function parsujZadanie({ nr, punkty, linie }) {
  const luki = new Set();
  const pytania = [];
  const bloki = [];
  const sluchanie = /Usłyszysz|You are going to hear|You will hear/i.test(linie.slice(0, 4).map((l) => l.s).join(" "));

  // Wypowiedź pisemna: brak etykiet pytań i luk w całym zadaniu.
  const luka = new RegExp(`(^|\\s)${nr}\\.\\d+\\.\\s*(\\([^)]*\\)\\s*)?_{2,}`);
  const maEtykiety = linie.some((l) => l.seg.some((g) => etykietaNaPoczatku(g.s, nr)) || luka.test(l.s));
  if (!maEtykiety) return wypowiedzPisemna(nr, punkty, linie);

  let tekst = null; // otwarty akapit
  let opcjeWspolne = null;
  let p = null; // otwarte pytanie

  const dodajTekst = (l) => {
    const s = oznaczLuki(l.s, nr, luki);
    if (ZRODLO.test(s)) {
      bloki.push({ typ: "zrodlo", tekst: s });
      tekst = null;
      return;
    }
    const naglowek = s.length < 70 && s === s.toUpperCase() && /[A-Z]{3}/.test(s) && !s.includes("{{");
    if (naglowek) {
      bloki.push({ typ: "naglowek", tekst: s });
      tekst = null;
      return;
    }
    const nowy = !tekst || !blisko(tekst, l) || /^[•●]\s/.test(s) || (l.x - tekst.x > 8 && !l.poczatekLuki);
    if (nowy) {
      tekst = { typ: "akapit", tekst: s, x: l.x, ostatnia: l };
      bloki.push(tekst);
    } else {
      tekst.tekst = polacz(tekst.tekst, s);
      dopisz(tekst, l);
    }
  };

  for (let i = 0; i < linie.length; i++) {
    const l = linie[i];
    const etykiety = l.seg.map((g) => ({ g, e: etykietaNaPoczatku(g.s, nr) })).filter((x) => x.e);

    // Wiersz kilku etykiet: tabela odpowiedzi albo opcje w kolumnach.
    if (etykiety.length >= 2) {
      tekst = null;
      p = null;
      opcjeWspolne = null;
      const kolumny = etykiety.map(({ g, e }) => {
        const q = { nr: e.nr, tresc: e.reszta || "", opcje: [] };
        pytania.push(q);
        return { x: g.x, q };
      });
      let j = i + 1;
      while (j < linie.length && linie[j].seg.some((g) => OPCJA.test(g.s))) {
        for (const g of linie[j].seg) {
          const m = g.s.match(OPCJA);
          if (!m) continue;
          const kol = kolumny.reduce((a, b) => (Math.abs(b.x - g.x) < Math.abs(a.x - g.x) ? b : a));
          kol.q.opcje.push({ litera: m[1], tresc: m[2] });
        }
        j++;
      }
      const maOpcje = j > i + 1;
      bloki.push({ typ: maOpcje ? "pytania" : "tabela", nr: kolumny.map((k) => k.q.nr) });
      i = j - 1;
      continue;
    }

    // Etykieta na początku linii: nowe pytanie.
    if (etykiety.length === 1 && etykiety[0].g === l.seg[0]) {
      const { e } = etykiety[0];
      opcjeWspolne = null;
      let tresc = [e.reszta, ...l.seg.slice(1).map((g) => g.s)].filter(Boolean).join(" ");
      let ostatnia = l;
      const poprz = linie[i - 1];
      const nast = linie[i + 1];
      const wierszTabeli =
        !tresc &&
        poprz && nast &&
        poprz.strona === l.strona && nast.strona === l.strona &&
        Math.abs(poprz.y - l.y) < 12 && Math.abs(nast.y - l.y) < 12;
      if (wierszTabeli) {
        // Pytanie w tabeli: treść rozbita nad i pod etykietą.
        const ostatni = bloki[bloki.length - 1];
        if (ostatni?.typ === "akapit" && ostatni.tekst.endsWith(poprz.s)) {
          ostatni.tekst = ostatni.tekst.slice(0, -poprz.s.length).trim();
          if (!ostatni.tekst) bloki.pop();
        }
        tresc = polacz(poprz.s, nast.s);
        ostatnia = nast;
        i++;
      }
      tekst = null;
      p = { nr: e.nr, tresc: oznaczLuki(tresc, nr, luki), opcje: [], x: l.x, sekcja: !tresc, ostatnia };
      pytania.push(p);
      bloki.push({ typ: "pytanie", nr: e.nr });
      if (wierszTabeli) p = null; // wiersz tabeli jest kompletny
      continue;
    }

    const opcja = l.seg.length === 1 ? l.s.match(OPCJA) : null;

    if (p) {
      if (opcja && !p.sekcja) {
        p.opcje.push({ litera: opcja[1], tresc: opcja[2], x: l.x });
        p.ostatnia = l;
        p.odstep = null;
        continue;
      }
      const ostOpcja = p.opcje[p.opcje.length - 1];
      if (ostOpcja && l.x > ostOpcja.x + 5 && blisko(p, l)) {
        ostOpcja.tresc = polacz(ostOpcja.tresc, l.s);
        dopisz(p, l);
        continue;
      }
      const ciag = l.x > p.x + 5 || l.poczatekLuki || p.tresc.endsWith("}}");
      if (!p.opcje.length && !p.sekcja && blisko(p, l) && ciag) {
        p.tresc = polaczWiersz(p.tresc, oznaczLuki(l.s, nr, luki));
        dopisz(p, l);
        continue;
      }
      p = null;
    }

    if (opcja) {
      tekst = null;
      if (!opcjeWspolne) {
        opcjeWspolne = { typ: "opcje", opcje: [] };
        bloki.push(opcjeWspolne);
      }
      opcjeWspolne.opcje.push({ litera: opcja[1], tresc: opcja[2], x: l.x });
      opcjeWspolne.ostatnia = l;
      opcjeWspolne.odstep = null;
      continue;
    }
    if (opcjeWspolne) {
      const ost = opcjeWspolne.opcje[opcjeWspolne.opcje.length - 1];
      if (l.x > ost.x + 5 && blisko(opcjeWspolne, l)) {
        ost.tresc = polacz(ost.tresc, l.s);
        dopisz(opcjeWspolne, l);
        continue;
      }
      opcjeWspolne = null;
    }
    dodajTekst(l);
  }

  // Luki w tekście (np. „even 5.4. ____ you are”) to też pytania.
  for (const nrLuki of luki) {
    if (!pytania.some((q) => q.nr === nrLuki)) pytania.push({ nr: nrLuki, tresc: "", wTekscie: true });
  }

  wchlonDialogi(bloki, pytania);
  const polecenie = wydzielPolecenie(bloki);
  return {
    nr,
    punkty,
    sluchanie,
    polecenie,
    bloki: bloki.map(czyscBlok),
    pytania: pytania
      .map(({ x, sekcja, ostatnia, odstep, opcje, ...q }) => ({
        ...q,
        ...(opcje?.length ? { opcje: opcje.map(({ x, ...o }) => o) } : {}),
      }))
      .sort((a, b) => porownajNr(a.nr, b.nr)),
  };
}

// Pytanie bez treści, po którym (przed kolejnym pytaniem) stoi tekst i opcje,
// to np. minidialog: tekst jest treścią pytania, a opcje należą do niego.
function wchlonDialogi(bloki, pytania) {
  for (let i = 0; i < bloki.length; i++) {
    const b = bloki[i];
    if (b.typ !== "pytanie") continue;
    const q = pytania.find((x) => x.nr === b.nr);
    if (q.tresc || q.opcje?.length) continue;
    let j = i + 1;
    while (j < bloki.length && bloki[j].typ === "akapit") j++;
    if (j === i + 1 || bloki[j]?.typ !== "opcje") continue;
    q.tresc = bloki.slice(i + 1, j).map((x) => x.tekst).join("\n");
    q.opcje = bloki[j].opcje;
    bloki.splice(i + 1, j - i);
  }
}

function wypowiedzPisemna(nr, punkty, linie) {
  const koniec = linie.findIndex((l) => KONIEC_WYPOWIEDZI.test(l.s));
  const tresc = koniec < 0 ? linie : linie.slice(0, koniec);
  // Po „CZYSTOPIS” bywa podany początek tekstu (np. „Hi everybody,”).
  const poczatek = [];
  if (koniec >= 0) {
    for (const l of linie.slice(koniec + 1)) {
      if (/^[\d–-]|Treść|Zgodność|Zakres|Spójność|Poprawność|Elementy/.test(l.s)) break;
      poczatek.push(l.s);
    }
  }
  const bloki = [];
  let akt = null;
  for (const l of tresc) {
    const nowy = !akt || !blisko(akt, l) || /^([•●]|\d+\.)\s/.test(l.s);
    if (nowy) bloki.push((akt = { typ: "akapit", tekst: l.s, ostatnia: l }));
    else {
      akt.tekst = polacz(akt.tekst, l.s);
      dopisz(akt, l);
    }
  }
  const polecenie = wydzielPolecenie(bloki);
  bloki.push({ typ: "pytanie", nr: String(nr) });
  return {
    nr,
    punkty,
    sluchanie: false,
    polecenie,
    bloki: bloki.map(czyscBlok),
    pytania: [{ nr: String(nr), typ: "wypowiedz", tresc: "", ...(poczatek.length ? { poczatek: poczatek.join("\n") } : {}) }],
  };
}

// Pierwszy akapit (i ewentualna „Uwaga”) to polecenie zadania.
function wydzielPolecenie(bloki) {
  const polecenie = [];
  while (bloki.length && bloki[0].typ === "akapit" && (polecenie.length === 0 || /^(Uwaga|Note)/.test(bloki[0].tekst))) {
    polecenie.push(bloki.shift().tekst);
  }
  return polecenie;
}

function czyscBlok({ x, ostatnia, odstep, ...b }) {
  if (b.opcje) b.opcje = b.opcje.map(({ x, ...o }) => o);
  return b;
}

// Treść pytania zachowuje podział na wiersze tam, gdzie to coś znaczy
// (zdanie wyjściowe, słowo kluczowe WIELKIMI literami, zdanie z luką).
function polaczWiersz(a, b) {
  const wielkie = (t) => /^[A-Z][A-Z ’'/]+$/.test(t.trim());
  if (/[.?!:”"]$/.test(a) || wielkie(b) || wielkie(a.split("\n").pop())) return `${a}\n${b}`;
  return polacz(a, b);
}

function polacz(a, b) {
  if (!a) return b;
  if (/[a-ząćęłńóśźż]-$/.test(a) && /^[a-ząćęłńóśźż]/.test(b)) return a.slice(0, -1) + b;
  return `${a} ${b}`;
}

export function porownajNr(a, b) {
  const [a1, a2 = 0] = a.split(".").map(Number);
  const [b1, b2 = 0] = b.split(".").map(Number);
  return a1 - b1 || a2 - b2;
}
