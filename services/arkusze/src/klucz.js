// Parser zasad oceniania CKE (język angielski, formuła 2023).
// Wynik: dla każdego pytania litera poprawnej odpowiedzi (zadania zamknięte)
// albo listy odpowiedzi oczekiwanych, akceptowanych i niepoprawnych (otwarte).

const ZADANIE = /^Zadanie (\d+)\.$/;
const PYTANIE_SZCZEGOLY = /^Zadanie (\d+\.\d+)\.$/;
const ETYKIETA = /^(\d+\.\d+)\.$/;
const LITERA = /^[A-H]$/;
const SZUM = [/^Egzamin maturalny z języka/, /^Zasady oceniania rozwiązań zadań$/, /Strona \d+ z \d+/];
const POMIN_OPIS = /^(Akceptowane są wszystkie odpowiedzi nieujęte|merytorycznie poprawne i spełniają)/;
const KOLUMNA_ODPOWIEDZI = 250; // w sekcjach szczegółowych dalej są tylko komentarze

export function parsujKlucz(strony) {
  const linie = strony.flat().filter((l) => !SZUM.some((r) => l.seg.some((g) => r.test(g.s))));
  const klucz = {};
  const pyt = (nr) => (klucz[nr] ??= { nr });

  // Podział na zadania.
  const zadania = [];
  for (const l of linie) {
    const m = l.seg.length === 1 && l.s.match(ZADANIE);
    if (m) zadania.push({ nr: Number(m[1]), linie: [] });
    else zadania[zadania.length - 1]?.linie.push(l);
  }

  for (const z of zadania) {
    zamkniete(z, pyt);
    otwarte(z, pyt);
  }
  for (const q of Object.values(klucz)) {
    for (const pole of ["oczekiwane", "akceptowane", "odrzucone"]) {
      if (q[pole]) q[pole] = [...new Set(q[pole].map((s) => s.trim()).filter(Boolean))];
    }
    if (q.opis) q.opis = q.opis.join(" ");
  }
  return klucz;
}

// Litery z kolumny „Poprawna odpowiedź”. Przy dwóch wersjach arkusza
// pierwsza (lewa) kolumna to wersja A. Litery nie zawsze leżą w wierszu
// etykiety, więc łączymy je z etykietami po kolejności.
function zamkniete(z, pyt) {
  const etykiety = [];
  const wiersze = [];
  for (const l of z.linie) {
    if (l.seg.some((g) => /^Uszczegółowienia/.test(g.s))) break;
    for (const g of l.seg) {
      const e = g.s.match(ETYKIETA);
      if (e && g.x < 120 && e[1].startsWith(`${z.nr}.`)) etykiety.push({ nr: e[1], y: l.y, strona: l.strona });
    }
    const litery = l.seg.filter((g) => LITERA.test(g.s) && g.x > 380);
    if (litery.length) wiersze.push({ litera: litery.sort((a, b) => a.x - b.x)[0].s, y: l.y, strona: l.strona });
  }
  if (!etykiety.length || !wiersze.length) return;
  const pierwsza = etykiety[0];
  // Wiersz nad pierwszą etykietą to nagłówek „Wersja arkusza: A B”.
  const odpowiedzi = wiersze.filter((w) => w.strona > pierwsza.strona || w.y <= pierwsza.y + 5);
  // Mniej liter niż etykiet to norma w zadaniach mieszanych (np. 5.1–5.3
  // zamknięte, 5.4–5.7 otwarte): zamknięte stoją w tabeli pierwsze.
  if (odpowiedzi.length > etykiety.length) {
    console.warn(`  ! zadanie ${z.nr}: ${etykiety.length} pytań, ${odpowiedzi.length} liter w kluczu`);
  }
  etykiety.forEach((e, i) => {
    if (odpowiedzi[i]) pyt(e.nr).litera = odpowiedzi[i].litera;
  });
}

function otwarte(z, pyt) {
  let szczegoly = null; // pytanie z sekcji „Zadanie 3.1.”
  let tryb = null;
  let tabela = null; // { tryb, x, etykiety: [], fragmenty: [] }

  const zamknijTabele = () => {
    if (tabela) przypiszTabele(tabela, pyt);
    tabela = null;
  };

  for (const l of z.linie) {
    const s = l.s;
    const szcz = l.seg.length === 1 && s.match(PYTANIE_SZCZEGOLY);
    if (szcz) {
      zamknijTabele();
      szczegoly = szcz[1];
      tryb = "opis";
      continue;
    }
    const kolumny = l.seg.map((g) => ({ tryb: trybNaglowka(g.s), x: g.x, s: g.s })).filter((k) => k.tryb);
    if (kolumny.length) {
      zamknijTabele();
      tryb = kolumny[0].tryb;
      if (!szczegoly) {
        // Sama „Poprawna” to kolumna tabeli wymagań: odpowiedzi leżą tylko pod nią.
        const wymagania = kolumny.length === 1 && kolumny[0].s === "Poprawna";
        tabela = { kolumny, wymagania, etykiety: [], fragmenty: [] };
      }
      continue;
    }
    if (/^(Podstawa programowa|Uszczegółowienia|Zasady oceniania$)/.test(s)) {
      zamknijTabele();
      tryb = null;
      szczegoly = null;
      continue;
    }

    if (tabela) {
      zbierzWierszTabeli(tabela, l, z.nr);
      continue;
    }
    if (!szczegoly || !tryb) continue;

    const q = pyt(szczegoly);
    if (tryb === "opis") {
      if (!POMIN_OPIS.test(s)) (q.opis ??= []).push(s);
      continue;
    }
    const odp = l.seg.find((g) => g.x < KOLUMNA_ODPOWIEDZI);
    if (odp) (q[tryb] ??= []).push(...warianty(odp.s));
  }
  zamknijTabele();
}

function trybNaglowka(s) {
  if (/nieakceptowane|niepoprawne odpowiedzi|odpowiedzi niepoprawnych/i.test(s)) return "odrzucone";
  if (/akceptowane odpowiedzi/i.test(s)) return "akceptowane";
  if (/Odpowied(ź|zi) oczekiwan|(Poprawna|Poprawne) odpowied|Odpowiedzi poprawne|^Poprawna$/.test(s)) return "oczekiwane";
  return null;
}

const NAGLOWEK_RESZTA = /^(odpowied(ź|zi)|\(?\d pkt\)|odpowiedzi \(\d pkt\)|-)$/;
// Kolumny „Podstawa programowa” leżą obok odpowiedzi; odpowiedzi są po
// angielsku, więc polskie znaki i słownictwo wymagań je odróżniają.
const TEKST_WYMAGAN = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]|\[…\]|Zdający|Wymagani|gramatycznych|ortograficznych|leksykalnych|frazeologicznych|^[IVX]+\.\s/;

function zbierzWierszTabeli(t, l, nrZadania) {
  for (const g of l.seg) {
    const e = g.s.match(ETYKIETA);
    if (e && g.x < 120) {
      if (e[1].startsWith(`${nrZadania}.`)) t.etykiety.push({ nr: e[1], y: l.y, strona: l.strona });
      continue;
    }
    if (NAGLOWEK_RESZTA.test(g.s) || TEKST_WYMAGAN.test(g.s)) continue;
    if (t.wymagania ? g.x < t.kolumny[0].x - 45 : g.x <= 110) continue;
    const kol = t.kolumny.reduce((a, b) => (Math.abs(b.x - g.x) < Math.abs(a.x - g.x) ? b : a));
    t.fragmenty.push({ s: g.s, y: l.y, strona: l.strona, kol });
  }
}

// Każda linia trafia do najbliższej w pionie etykiety (etykieta stoi
// zwykle w połowie wysokości swojego wiersza). Linie jednej komórki
// sklejamy, gdy odpowiedź jest zawinięta.
const ODSTEP_W_KOMORCE = 16.5;

function przypiszTabele(t, pyt) {
  if (!t.etykiety.length) return;
  const blisko = (a, b) => a.strona === b.strona && a.ys[a.ys.length - 1] - b.ys[0] < ODSTEP_W_KOMORCE;
  for (const kol of t.kolumny) {
    // 1. Sklejamy linie, które na pewno są jedną odpowiedzią.
    const kawalki = [];
    for (const f of t.fragmenty.filter((x) => x.kol === kol)) {
      const k = { s: f.s, ys: [f.y], strona: f.strona };
      const ost = kawalki[kawalki.length - 1];
      if (ost && blisko(ost, k) && zawinieta(ost.s, k.s)) {
        ost.s += " " + k.s;
        ost.ys.push(f.y);
      } else kawalki.push(k);
    }
    // 2. Kawałek należy do etykiety najbliższej jego środka.
    for (const k of kawalki) {
      const y = k.ys.reduce((a, b) => a + b, 0) / k.ys.length;
      const kandydaci = t.etykiety.filter((e) => e.strona === k.strona);
      k.nr = kandydaci.length ? kandydaci.reduce((a, b) => (Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a)).nr : null;
    }
    // 3. Lista wariantów ze „/” zawinięta w połowie wariantu.
    const odpowiedzi = [];
    for (const k of kawalki.filter((x) => x.nr)) {
      const ost = odpowiedzi[odpowiedzi.length - 1];
      if (ost && ost.nr === k.nr && blisko(ost, k) && ost.s.includes(" / ") && k.s.includes(" / ")) {
        ost.s += " " + k.s;
        ost.ys.push(...k.ys);
      } else odpowiedzi.push(k);
    }
    for (const o of odpowiedzi) (pyt(o.nr)[kol.tryb] ??= []).push(...warianty(o.s));
  }
}

// Odpowiedź zawinięta do następnej linii: poprzednia kończy się „/”,
// następna zaczyna od „/” albo w nowej linii stoją 1–2 słowa małą
// literą (np. „promised (that) he would” + „repair”).
function zawinieta(poprz, nast) {
  if (/\/$/.test(poprz) || /^\//.test(nast)) return true;
  const slowa = nast.split(" ");
  return slowa.length <= 2 && /^[a-z]/.test(nast) && poprz.split(" ").length >= 2 && !/[.!?]$/.test(poprz);
}

// Rozwija zapis CKE na listę wariantów:
// „healthy food / dishes” → healthy food, healthy dishes
// „would be flagged/deleted” → would be flagged, would be deleted
// „(a/the) healthy meal” → healthy meal, a healthy meal, the healthy meal
export function warianty(zapis) {
  const czesci = zapis.replace(/\s+\/\s*|\s*\/\s+/g, " / ").split(" / ").map((s) => s.trim()).filter(Boolean);
  if (!czesci.length) return [];
  // Gdy pierwsza alternatywa jest najdłuższa, krótsze podmieniają jej
  // końcowe słowa („healthy food / dishes”, „promised to repair / fix”).
  // W pozostałych układach („on / at / all over”) każda część stoi osobno.
  const dl = (c) => c.split(" ").length;
  const baza = czesci[0].split(" ");
  const pierwszaNajdluzsza = czesci.every((c) => dl(c) <= baza.length);
  const pelne = czesci.map((c, i) => {
    const slowa = c.split(" ");
    if (!pierwszaNajdluzsza || i === 0 || slowa.length >= baza.length) return c;
    return [...baza.slice(0, baza.length - slowa.length), ...slowa].join(" ");
  });
  const wynik = [];
  for (const p of pelne) wynik.push(...rozwinSlowa(p));
  return [...new Set(wynik)].slice(0, 60);
}

function rozwinSlowa(tekst) {
  let wyniki = [""];
  const tokeny = tekst.match(/\([^)]*\)|\S+/g) || [];
  for (const t of tokeny) {
    let opcje;
    if (t.startsWith("(") && t.endsWith(")")) opcje = ["", ...t.slice(1, -1).split("/")];
    else if (t.includes("/") && !/^https?:/.test(t)) opcje = t.split("/");
    else opcje = [t];
    const nowe = [];
    for (const w of wyniki) for (const o of opcje) nowe.push(o ? (w ? `${w} ${o}` : o) : w);
    wyniki = nowe.slice(0, 60);
  }
  return wyniki.map((w) => w.replace(/\b(\S+) \1\b/g, "$1").trim()).filter(Boolean);
}
