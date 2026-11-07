// Parser zasad oceniania CKE (język angielski, formuła 2023).
// Wynik: dla każdego pytania litera poprawnej odpowiedzi (zadania zamknięte)
// albo listy odpowiedzi oczekiwanych, akceptowanych i niepoprawnych (otwarte).

const ZADANIE = /^Zadanie (\d+)\.?(?: \(0[–-]\d+\))?$/;
const PYTANIE_SZCZEGOLY = /^Zadanie (\d+\.\d+)\.$/;
// Kropka na końcu bywa pominięta (np. „9.5” w kluczu z 2018).
const ETYKIETA = /^(\d+\.\d+)\.?$/;
// T/F: zadania prawda/fałsz w formule 2015.
const LITERA = /^[A-HT]$/;
// Etykiety pytań stoją pod nagłówkiem kolumny „Zadanie”, którego położenie
// zmienia się między latami (formuła 2023: przy lewej krawędzi, 2015–2020:
// w środku tabeli). Bez nagłówka przyjmujemy lewą część strony.
const NAGLOWEK_KOLUMNY = /^Zadanie(?: (?!\d).*)?$/;
const MAKS_X_ETYKIETY = 200;
function czyEtykieta(g, kolumna) {
  return kolumna == null ? g.x < MAKS_X_ETYKIETY : Math.abs(g.x - kolumna) < 40;
}
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
  let kolumna = null;
  for (const l of z.linie) {
    if (l.seg.some((g) => /^Uszczegółowienia/.test(g.s))) break;
    for (const g of l.seg) {
      if (NAGLOWEK_KOLUMNY.test(g.s)) kolumna = g.x;
      const e = g.s.match(ETYKIETA);
      if (e && czyEtykieta(g, kolumna) && e[1].startsWith(`${z.nr}.`)) etykiety.push({ nr: e[1], y: l.y, strona: l.strona });
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
    // „Inne akceptowane odpowiedzi:” w środku komórki (klucze 2016–2017) to nie
    // nowa tabela, tylko przełącznik: dalsze odpowiedzi pytania są akceptowane.
    const podtytul = tabela && l.seg.find((g) => PODTYTUL_KOMORKI.test(g.s));
    if (podtytul) {
      zbierzWierszTabeli(tabela, { ...l, seg: l.seg.filter((g) => g !== podtytul), czesci: null }, z.nr);
      tabela.fragmenty.push({ znacznik: "akceptowane", s: "", y: l.y, strona: l.strona, kol: najblizszaKolumna(tabela, podtytul) });
      continue;
    }
    const kolumny = l.seg.map((g) => ({ tryb: trybNaglowka(g.s), x: g.x, s: g.s })).filter((k) => k.tryb);
    if (kolumny.length) {
      zamknijTabele();
      tryb = kolumny[0].tryb;
      if (!szczegoly) {
        // Sama „Poprawna” to kolumna tabeli wymagań: odpowiedzi leżą tylko pod nią.
        // Tak samo, gdy jedyna kolumna odpowiedzi stoi po prawej stronie tabeli.
        const wymagania = kolumny.length === 1 && (kolumny[0].s === "Poprawna" || kolumny[0].s === "Rozwiązanie" || kolumny[0].x > 300);
        const naglowekZadania = l.seg.find((g) => NAGLOWEK_KOLUMNY.test(g.s));
        tabela = { kolumny, wymagania, kolumnaEtykiet: naglowekZadania?.x ?? null, etykiety: [], fragmenty: [] };
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
    // Polski tekst w kolumnie odpowiedzi to uwagi egzaminatora, nie odpowiedź.
    if (odp && !TEKST_WYMAGAN.test(odp.s)) (q[tryb] ??= []).push(...warianty(odp.s));
  }
  zamknijTabele();
}

function trybNaglowka(s) {
  if (/nieakceptowane|niepoprawne odpowiedzi|odpowiedzi niepoprawnych|odpowiedzi na 0 p|^0 pkt$/i.test(s)) return "odrzucone";
  if (/akceptowane odpowiedzi|odpowiedzi na 1 p|^1 pkt$/i.test(s)) return "akceptowane";
  if (/Odpowied(ź|zi) oczekiwan|(Poprawna|Poprawne) odpowied|Odpowiedzi poprawne|^Poprawna$|^Rozwiązanie$/.test(s)) return "oczekiwane";
  return null;
}

const NAGLOWEK_RESZTA = /^(odpowied(ź|zi)|\(?\d pkt\)|odpowiedzi \(\d pkt\)|-)$/;
// Kolumny „Podstawa programowa” leżą obok odpowiedzi; odpowiedzi są po
// angielsku, więc polskie znaki i słownictwo wymagań je odróżniają.
const TEKST_WYMAGAN = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]|\[…\]|Zdający|Wymagani|gramatycznych|ortograficznych|leksykalnych|frazeologicznych|^[IVX]+\.\s/;

// Odpowiedzi w punktach („• knows what…”) z sąsiednich kolumn bywają tak
// blisko, że zlewają się w jeden segment. Dzielimy je na każdym „•”.
function segmentyPunktow(l) {
  if (!l.czesci || !l.s.includes("•")) return l.seg;
  const wynik = [];
  for (const c of l.czesci) {
    const s = c.s.trim();
    if (!s) continue;
    const ost = wynik[wynik.length - 1];
    if (!ost || s.startsWith("•") || c.x - ost.koniec > 12) wynik.push({ x: c.x, s, koniec: c.x + c.w });
    else {
      ost.s += (c.x - ost.koniec > 1 ? " " : "") + s;
      ost.koniec = c.x + c.w;
    }
  }
  return wynik.map(({ x, s }) => ({ x, s: s.replace(/\s+/g, " ") }));
}

const PODTYTUL_KOMORKI = /^Inne akceptowane odpowiedzi:$/;
const najblizszaKolumna = (t, g) => t.kolumny.reduce((a, b) => (Math.abs(b.x - g.x) < Math.abs(a.x - g.x) ? b : a));

function zbierzWierszTabeli(t, l, nrZadania) {
  // Nagłówek „Zadanie” bywa w linii pod nagłówkiem kolumny odpowiedzi.
  const naglowek = t.etykiety.length ? null : l.seg.find((g) => NAGLOWEK_KOLUMNY.test(g.s));
  if (naglowek) {
    t.kolumnaEtykiet = naglowek.x;
    return;
  }
  // Odpowiedź bywa sklejona z tekstem wymagań w jednym fragmencie PDF
  // („…ortograficznych), apart”); w kolumnie po prawej bierzemy tylko jej kawałki.
  if (t.wymagania && l.czesci) {
    const prog = t.kolumny[0].x - 45;
    const wKolumnie = l.czesci.filter((c) => c.x >= prog && c.s.trim());
    if (wKolumnie.length && !l.seg.some((g) => g.x >= prog)) {
      const s = wKolumnie.map((c) => c.s.trim()).join(" ");
      l = { ...l, seg: [...l.seg, { x: wKolumnie[0].x, s }] };
    }
  }
  for (const g of segmentyPunktow(l)) {
    const e = g.s.match(ETYKIETA);
    if (e && czyEtykieta(g, t.kolumnaEtykiet)) {
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
const ODSTEP_W_KOMORCE = 17;

function przypiszTabele(t, pyt) {
  if (!t.etykiety.length) return;
  const blisko = (a, b) => a.strona === b.strona && a.ys[a.ys.length - 1] - b.ys[0] < ODSTEP_W_KOMORCE;
  for (const kol of t.kolumny) {
    // 1. Sklejamy linie, które na pewno są jedną odpowiedzią.
    const kawalki = [];
    const wKolumnie = t.fragmenty.filter((x) => x.kol === kol);
    // Kolumna z odpowiedziami pełnymi zdaniami (kończą się kropką): zdanie
    // łamane w środku ciągnie się, dopóki linia nie kończy się kropką.
    const zKropka = wKolumnie.filter((x) => /\.$/.test(x.s) && x.s.split(" ").length >= 3).length;
    const zdaniowa = wKolumnie.length >= 4 && zKropka / wKolumnie.length >= 0.3;
    for (const f of wKolumnie) {
      const k = { s: f.s, ys: [f.y], strona: f.strona, znacznik: f.znacznik };
      const ost = kawalki[kawalki.length - 1];
      // Złamane zdanie: poprzednia linia jest długa (pełna szerokość kolumny) i bez kropki.
      const dalszyCiag = (a, b) => zawinieta(a, b) || (zdaniowa && a.length >= 30 && !/[.!?)]$/.test(a) && /^[a-z]/.test(b));
      if (ost && !ost.znacznik && !k.znacznik && blisko(ost, k) && dalszyCiag(ost.s, k.s)) {
        ost.s += " " + k.s;
        ost.ys.push(f.y);
      } else kawalki.push(k);
    }
    // 2. Kawałek należy do komórki pytania (patrz granice()), a gdy granic
    //    nie da się wyznaczyć — do etykiety najbliższej jego środka.
    let komorki = granice(t.etykiety, kawalki, t.fragmenty);
    // Model komórek jest zły, jeśli któreś pytanie nie dostaje żadnej linii.
    const sr = (k) => k.ys.reduce((a, b) => a + b, 0) / k.ys.length;
    if (komorki && kawalki.length >= komorki.length && komorki.some((c) => !kawalki.some((k) => !k.znacznik && k.strona === c.strona && sr(k) <= c.gora && sr(k) > c.dol))) komorki = null;
    for (const k of kawalki) {
      const y = k.ys.reduce((a, b) => a + b, 0) / k.ys.length;
      const kandydaci = t.etykiety.filter((e) => e.strona === k.strona);
      const komorka = komorki?.find((c) => c.strona === k.strona && y <= c.gora && y > c.dol);
      k.nr = komorka ? komorka.nr : kandydaci.length ? kandydaci.reduce((a, b) => (Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a)).nr : null;
    }
    // 3. Lista wariantów ze „/” zawinięta w połowie wariantu.
    const odpowiedzi = [];
    for (const k of kawalki.filter((x) => x.nr)) {
      const ost = odpowiedzi[odpowiedzi.length - 1];
      if (ost && !ost.znacznik && !k.znacznik && ost.nr === k.nr && blisko(ost, k) && ost.s.includes(" / ") && k.s.includes(" / ")) {
        ost.s += " " + k.s;
        ost.ys.push(...k.ys);
      } else odpowiedzi.push(k);
    }
    // Po podtytule „Inne akceptowane odpowiedzi:” odpowiedzi pytania idą do akceptowanych.
    const trybPytania = {};
    for (const o of odpowiedzi) {
      if (o.znacznik) {
        trybPytania[o.nr] = o.znacznik;
        continue;
      }
      (pyt(o.nr)[trybPytania[o.nr] ?? kol.tryb] ??= []).push(...warianty(o.s));
    }
  }
}

// Etykieta stoi w pionie na środku swojej komórki, a komórki mają różną
// wysokość. Znając górę pierwszej komórki (pierwsza linia odpowiedzi),
// kolejne granice wynikają z dol = 2·y_etykiety − gora. Jeśli wynik jest
// sprzeczny (granica poza przedziałem między etykietami), zwracamy null.
function granice(etykiety, kawalki, fragmenty) {
  const wynik = [];
  for (const strona of new Set(etykiety.map((e) => e.strona))) {
    const naStronie = etykiety.filter((e) => e.strona === strona).sort((a, b) => b.y - a.y);
    const ys = kawalki.filter((k) => k.strona === strona).flatMap((k) => k.ys);
    if (!ys.length) continue;
    // Gdy przy każdej etykiecie w tej samej linii zaczyna się odpowiedź,
    // etykiety stoją u góry komórek: komórka sięga do następnej etykiety.
    // Sprawdzamy wszystkie kolumny tabeli: w jednej pierwsza linia komórki bywa polskim opisem.
    const ysTabeli = fragmenty.filter((f) => f.strona === strona && !f.znacznik).map((f) => f.y);
    // Nad pierwszą etykietą nie może stać żadna odpowiedź (wtedy etykiety są na środku komórek).
    const uGory =
      naStronie.length > 1 &&
      naStronie.every((e) => ysTabeli.some((y) => Math.abs(y - e.y) < 3)) &&
      !ysTabeli.some((y) => y > naStronie[0].y + 3);
    if (uGory) {
      naStronie.forEach((e, i) => {
        const nast = naStronie[i + 1];
        wynik.push({ nr: e.nr, strona, gora: i ? e.y + 3 : Infinity, dol: nast ? nast.y + 3 : -Infinity });
      });
      continue;
    }
    let gora = Math.max(...ys, naStronie[0].y) + 8;
    for (let i = 0; i < naStronie.length; i++) {
      const e = naStronie[i];
      const nast = naStronie[i + 1];
      const dol = nast ? 2 * e.y - gora : -Infinity;
      if (nast && !(dol < e.y && dol > nast.y)) return null;
      wynik.push({ nr: e.nr, strona, gora, dol });
      gora = dol;
    }
  }
  return wynik;
}

// Odpowiedź zawinięta do następnej linii: poprzednia kończy się „/”,
// następna zaczyna od „/” albo w nowej linii stoją 1–2 słowa małą
// literą (np. „promised (that) he would” + „repair”).
function zawinieta(poprz, nast) {
  if (/\/$/.test(poprz) || /^\//.test(nast)) return true;
  // W listach z punktorami nowa odpowiedź zaczyna się od „•”.
  if (poprz.startsWith("•")) return !nast.startsWith("•");
  const slowa = nast.split(" ");
  return slowa.length <= 2 && /^[a-z]/.test(nast) && poprz.split(" ").length >= 2 && !/[.!?]$/.test(poprz);
}

// Rozwija zapis CKE na listę wariantów:
// „healthy food / dishes” → healthy food, healthy dishes
// „would be flagged/deleted” → would be flagged, would be deleted
// „(a/the) healthy meal” → healthy meal, a healthy meal, the healthy meal
export function warianty(zapis) {
  const czesci = zapis.replace(/^•\s*/, "").replace(/\s+\/\s*|\s*\/\s+/g, " / ").split(" / ").map((s) => s.trim()).filter(Boolean);
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
