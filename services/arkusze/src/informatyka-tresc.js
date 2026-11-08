// Treść zadań z informatyki jako tekst, jak w matematyce (tam z DOCX, tu z PDF z krojami pisma).
//
// Linie fragmentu dzielimy na:
// - akapity: zwykły tekst z pogrubieniem, kursywą (nazwy funkcji i zmiennych) i krojem
//   o stałej szerokości (nazwy plików, symbole) jako zakresy `formaty`,
// - kod: pseudokod (strzałka przypisania, „jeżeli”, „dopóki”…) i przykłady danych pisane
//   Courierem; wcięcia odtwarzamy z położenia linii,
// - tabele: wiersze o tej samej liczbie kolumn,
// - wycinki: wykresy, rysunki i tabele, których nie da się odczytać z tekstu (komórki
//   w kilku liniach, ułamki), jako obraz z arkusza.
// Gdy wycinki zajmują większość fragmentu, zostaje cały kadr (bezpieczniej niż szatkowanie).
import { mkdir } from "node:fs/promises";
import { zapiszWycinek } from "./matematyka.js";

const SKALA = 2;
const KADR_X = [66, 530];
const CIEMNY = 150;
const ODSTEP_LINII = 14.7; // typowy odstęp linii tekstu 11 pt w arkuszu

// „dla” tylko jako pętla („dla i = 1, 2, …”), żeby nie łapać zdań w rodzaju „dla tego pliku”.
const KOD = /←|^(jeżeli|dopóki|wykonuj|w przeciwnym razie|zwróć|wynikiem jest|funkcja|powtarzaj|koniec)\b|^dla [\p{L}_]\w* ?(=|←)|^[\p{L}_][\w]*\([^()]*\)\s*:?$/u;
const DO_POMINIECIA = /^[\s.…_]+$|^Odpowiedź:\s*[_.…\s]*$|^Miejsce na/;

// Font Symbol koduje znaki w obszarze prywatnym Unicode (U+F0xx). Najczęstsze w arkuszach
// informatyki; nieznany znak to U+FFFD, a linia z nim idzie do wycinka (patrz rodzaj).
const SYMBOL = { 0xac: "←", 0xae: "→", 0xad: "↑", 0xaf: "↓", 0xd7: "·", 0xb7: "•", 0xb4: "×", 0xb8: "÷", 0xa3: "≤", 0xb3: "≥", 0xb9: "≠", 0xb1: "±", 0xd6: "√", 0xa5: "∞", 0xe5: "∑", 0xbb: "≈", 0xba: "≡", 0x3d: "=", 0x2d: "−", 0x2b: "+", 0x3c: "<", 0x3e: ">", 0x28: "(", 0x29: ")", 0x5b: "[", 0x5d: "]", 0xd8: "¬", 0xd9: "∧", 0xda: "∨", 0xc7: "∩", 0xc8: "∪", 0xce: "∈", 0x22: "∀", 0x24: "∃", 0x20: " " };
function symbol(z, naPoczatku) {
  const k = z.codePointAt(0);
  if (k < 0xe000 || k > 0xf8ff) return z;
  if (k >= 0xf000 && k <= 0xf0ff && SYMBOL[k - 0xf000]) return SYMBOL[k - 0xf000];
  // Punktor z fontu Wingdings na początku linii.
  return naPoczatku ? "•" : "�";
}

/** Tekst linii z surowych kawałków i zakresy krojów: [od, do, "b" | "i" | "m"]. */
export function tekstLinii(czesci) {
  let tekst = "";
  const formaty = [];
  let koniec = null;
  for (const c of czesci) {
    let s = c.s;
    if (c.f === "s") s = [...s].map((z, i) => symbol(z, i === 0 && !tekst)).join("");
    s = s.normalize("NFKC");
    if (!s) continue;
    const przerwa = koniec === null ? 0 : c.x - koniec;
    if (tekst && przerwa > 1.2 && !tekst.endsWith(" ") && !s.startsWith(" ")) tekst += " ";
    const od = tekst.length;
    tekst += s;
    if (c.f === "b" || c.f === "i" || c.f === "m") {
      const ost = formaty.at(-1);
      // Sąsiednie kawałki tego samego kroju (także przez spację) łączymy w jeden zakres.
      if (ost && ost[2] === c.f && ost[1] >= od - 1) ost[1] = tekst.length;
      else formaty.push([od, tekst.length, c.f]);
    }
    koniec = c.x + c.w;
  }
  const lead = tekst.length - tekst.trimStart().length;
  return { tekst: tekst.trim(), formaty: formaty.map(([a, b, f]) => [Math.max(0, a - lead), Math.min(tekst.trim().length, b - lead), f]).filter(([a, b]) => b > a) };
}

function rodzaj(l, lewa) {
  const { tekst } = l.t;
  if (!tekst || DO_POMINIECIA.test(tekst) || /[_…]{6,}|\.{8,}/.test(tekst)) return "pomin";
  // Wzór, którego tekst nie odda: nieznany symbol albo drobne pismo (wykładnik 2¹⁰⁰, indeks, ułamek piętrowy).
  if (tekst.includes("�") || l.czesci.some((c) => c.s.trim() && c.h && c.h < 8.5)) return "trudna";
  // Linia w większości Courierem (dane, „+ + + lub o o o”) albo same liczby (wiersz danych „3000 2000”).
  const znakiMono = l.czesci.filter((c) => c.f === "m").reduce((n, c) => n + c.s.replace(/\s/g, "").length, 0);
  // Słowo zwykłym krojem („pliku” w „w pliku symbole.txt”) oznacza zdanie; „lub” między symbolami nie.
  const slowaPoza = l.czesci.filter((c) => c.f !== "m").map((c) => c.s).join(" ");
  if (znakiMono / Math.max(1, tekst.replace(/\s/g, "").length) >= 0.6 && !/\p{L}{4,}/u.test(slowaPoza)) return "kod";
  if (/^-?\d+(?:[.,]\d+)?(?:\s+-?\d+(?:[.,]\d+)?)+$/.test(tekst)) return "kod";
  // Pojedyncza liczba: kilka pod rząd to dane („0 / 1 / 2 …”), jedna to zwykły tekst (patrz skladajTresc).
  if (/^-?\d+(?:[.,]\d+)?$/.test(tekst)) return "liczba";
  // Nagłówek funkcji („przestaw(n):”) liczy się jako kod tylko przed instrukcjami (patrz skladajTresc).
  if (KOD.test(tekst) && !/^[\p{L}_][\w]*\([^()]*\)\s*:?$/u.test(tekst)) return "kod";
  if (/^[\p{L}_][\w]*\([^()]*\)\s*:?$/u.test(tekst)) return "naglowekKodu";
  // Opis pola („data – data przywozu…”): nazwa i opis po myślniku to jeden akapit.
  if (l.seg.length === 2 && /^[–-]\s/.test(l.seg[1].s)) return "tekst";
  // Kolumny: wyraźna przerwa między kawałkami tekstu (słowa w zdaniu dzieli kilka punktów).
  const przerwy = l.czesci.slice(1).map((c, i) => c.x - (l.czesci[i].x + l.czesci[i].w));
  if (przerwy.some((p) => p > 20)) return "tabela";
  // Krótki napis bez słów (liczba na osi, „y”, „[3000, 6000]”) to etykieta wykresu albo rysunku.
  if (tekst.length < 18 && !/[a-ząćęłńóśźż]{4,}/i.test(tekst) && l.x > lewa + 8) return "etykieta";
  return "tekst";
}

// Krótki napis bez słów; między wycinkami należy do rysunku (oś wykresu przy marginesie).
const krotki = (l) => l.t.tekst.length < 18 && !/[a-ząćęłńóśźż]{4,}/i.test(l.t.tekst);

async function plotno(doc, n, cache) {
  if (!cache.has(n)) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: SKALA });
    const c = doc.canvasFactory.create(viewport.width, viewport.height);
    await page.render({ canvasContext: c.context, viewport }).promise;
    cache.set(n, { ...c, wys: page.view[3], fabryka: doc.canvasFactory });
  }
  return cache.get(n);
}

// Wiersze (w punktach PDF, od góry) z ciemnym tuszem między gora a dol.
function tusz(s, gora, dol) {
  const [x0, x1] = KADR_X.map((x) => Math.round(x * SKALA));
  const wynik = [];
  for (let y = Math.floor(gora); y > Math.ceil(dol); y--) {
    const dane = s.context.getImageData(x0, Math.round((s.wys - y) * SKALA), x1 - x0, 1).data;
    for (let i = 0; i < dane.length; i += 4) {
      if (dane[i] + dane[i + 1] + dane[i + 2] < CIEMNY * 3 && dane[i + 3] > 0) {
        wynik.push(y);
        break;
      }
    }
  }
  return wynik;
}

/**
 * Dla każdego fragmentu ustawia `f.bloki` (bloki treści w formacie aplikacji) albo zostawia
 * `f.bloki = null`, gdy fragment lepiej pokazać kadrem. Wycinki zapisuje obok kadrów.
 */
export async function skladajTresc(doc, fragmenty, { katalog, prefiks }) {
  await mkdir(katalog, { recursive: true });
  const strony = new Map();
  const statystyka = { tekstem: 0, kadrem: 0 };
  for (const f of fragmenty) {
    const bloki = [];
    let wycinkiWys = 0;
    let calaWys = 0;
    let nrWycinka = 0;
    // Fragment, w którym tekst przeplata się z kilkoma wycinkami (tabela ze wzorami, schemat
    // z podpisami), czyta się lepiej jako jeden kadr.
    let rozsypany = false;
    for (const c of f.czesci) {
      const s = await plotno(doc, c.strona, strony);
      const linie = c.linie
        .map((l) => ({ ...l, czesci: l.czesci.filter((k) => k.x >= 60 && k.x < 520) }))
        .filter((l) => l.czesci.length)
        .map((l) => ({ ...l, x: l.czesci[0].x, t: tekstLinii(l.czesci) }));
      if (!linie.length) continue;
      const lewa = Math.min(...linie.map((l) => l.x));
      linie.forEach((l) => (l.rodzaj = rodzaj(l, lewa)));
      linie.forEach((l, i) => {
        if (l.rodzaj !== "naglowekKodu") return;
        const dalej = linie.slice(i + 1).find((x) => x.rodzaj !== "pomin");
        l.rodzaj = dalej?.rodzaj === "kod" && dalej.x > l.x ? "kod" : "tekst";
      });
      calaWys += linie[0].y - linie.at(-1).y + 14;

      // Grupy kolejnych linii tego samego rodzaju. Linie wcięte między liniami kodu należą do kodu.
      const grupy = [];
      for (const [i, l] of linie.entries()) {
        if (l.rodzaj === "pomin") continue;
        let r = l.rodzaj === "liczba" ? "kod" : l.rodzaj;
        const ost = grupy.at(-1);
        const przerwa = ost ? ost.linie.at(-1).y - l.y : 0;
        if (r === "tekst" && ost?.rodzaj === "kod" && l.x > ost.lewa + 10 && przerwa < 2 * ODSTEP_LINII) r = "kod";
        if (r === "etykieta" || r === "trudna" || (r === "tabela" && ost?.rodzaj === "obraz" && przerwa < 2 * ODSTEP_LINII)) r = "obraz";
        // Duża przerwa z tuszem między liniami to rysunek albo wykres bez tekstu.
        if (ost && przerwa > 2.2 * ODSTEP_LINII && tusz(s, ost.linie.at(-1).y - 5, l.y + 12).length > 6) {
          if (ost.rodzaj === "obraz") ost.dol = l.y + 12;
          else grupy.push({ rodzaj: "obraz", linie: [], gora: ost.linie.at(-1).y - 5, dol: l.y + 12, lewa: l.x });
        }
        const g = grupy.at(-1);
        if (g && g.rodzaj === r && przerwa < 2.2 * ODSTEP_LINII) {
          g.linie.push(l);
          g.lewa = Math.min(g.lewa, l.x);
        } else grupy.push({ rodzaj: r, linie: [l], lewa: l.x, i });
      }

      // Tabela z równą liczbą kolumn w każdym wierszu zostaje tabelą; inna idzie do wycinka.
      for (const g of grupy) {
        if (g.rodzaj !== "tabela") continue;
        const kolumny = g.linie.map((l) => l.seg.length);
        if (g.linie.length < 2 || new Set(kolumny).size !== 1) g.rodzaj = "obraz";
      }
      // Same krótkie napisy (liczby przy osi) między wycinkami albo tuż przy nich to część rysunku.
      for (let zmiana = true; zmiana; ) {
        zmiana = false;
        grupy.forEach((g, i) => {
          if (g.rodzaj === "obraz") return;
          const przed = grupy[i - 1]?.rodzaj === "obraz";
          const po = grupy[i + 1]?.rodzaj === "obraz";
          // Wiersz samych liczb zwykłym krojem (komórki tabeli, podziałka osi) pod wycinkiem albo między wycinkami.
          const liczby = g.linie.every((l) => /^[-\d\s.,]+$/.test(l.t.tekst));
          if (g.rodzaj === "kod" ? !(liczby && przed) : !g.linie.every(krotki)) return;
          if (przed || po) {
            g.rodzaj = "obraz";
            zmiana = true;
          }
        });
      }
      // Jedna liczba w osobnej linii („6” jako odpowiedź z przykładu) to zwykły akapit.
      for (const g of grupy) if (g.rodzaj === "kod" && g.linie.length === 1 && g.linie[0].rodzaj === "liczba") g.rodzaj = "tekst";
      // Sąsiednie wycinki łączymy w jeden.
      const scalone = [];
      for (const g of grupy) {
        const ost = scalone.at(-1);
        if (g.rodzaj === "obraz" && ost?.rodzaj === "obraz") {
          ost.linie.push(...g.linie);
          ost.dol = Math.min(ost.dol ?? Infinity, g.dol ?? Infinity);
        } else scalone.push(g);
      }

      if (scalone.filter((g) => g.rodzaj === "obraz").length >= 2) rozsypany = true;
      if (scalone.some((g, i) => g.rodzaj === "tabela" && (scalone[i - 1]?.rodzaj === "obraz" || scalone[i + 1]?.rodzaj === "obraz"))) rozsypany = true;
      for (const g of scalone) {
        if (g.rodzaj === "obraz") {
          // Pas od linii nad grupą do linii pod nią, dociągnięty do tuszu (ramki tabel, osie wykresu).
          const gora = Math.max(g.gora ?? -Infinity, g.linie.length ? g.linie[0].y + 12 : -Infinity);
          let dol = Math.min(g.dol ?? Infinity, g.linie.length ? g.linie.at(-1).y - 5 : Infinity);
          const nastepna = linie.find((l) => l.y < dol - 2 && l.rodzaj !== "pomin" && !g.linie.includes(l));
          const granica = nastepna ? nastepna.y + 12 : c.brudnopis !== null ? c.brudnopis + 14 : 60;
          const wTuszu = tusz(s, dol, granica);
          // Tusz ciągnący się pod ostatnią linią (dolna ramka tabeli, oś) dołączamy, aż do pustego paska.
          for (const y of wTuszu) {
            if (dol - y > 4) break;
            dol = y;
          }
          const plik = `${f.nr}-w${++nrWycinka}.webp`;
          const obraz = await zapiszWycinek(s, [KADR_X[0], dol - 3, KADR_X[1], gora + 3], katalog, prefiks, plik);
          wycinkiWys += gora - dol;
          bloki.push({ typ: "kadr", obraz, tekst: g.linie.map((l) => l.t.tekst).join(" "), strona: c.strona });
        } else if (g.rodzaj === "kod") {
          const min = Math.min(...g.linie.map((l) => l.x));
          const mono = g.linie.every((l) => l.czesci.every((k) => k.f === "m" || !k.s.trim()));
          // Pseudokod ma wcięcia co ok. 35 pt; w danych (Courier) liczy się szerokość znaku.
          const krok = mono ? 7.2 : 35 / 4;
          const tekst = g.linie.map((l) => " ".repeat(Math.max(0, Math.round((l.x - min) / krok))) + l.t.tekst).join("\n");
          bloki.push({ typ: "kod", tekst, strona: c.strona });
        } else if (g.rodzaj === "tabela") {
          bloki.push({ typ: "tabelaTresci", wiersze: g.linie.map((l) => l.seg.map((x) => x.s.normalize("NFKC"))), strona: c.strona });
        } else {
          for (const a of akapity(g.linie)) bloki.push({ ...a, strona: c.strona });
        }
      }
    }
    if (rozsypany || (calaWys > 0 && wycinkiWys / calaWys > 0.6)) {
      f.bloki = null;
      statystyka.kadrem++;
    } else {
      f.bloki = bloki;
      statystyka.tekstem++;
    }
  }
  return statystyka;
}

// Linie tekstu w akapity: nowy akapit po większej przerwie, po krótkiej linii (koniec akapitu
// w arkuszu), przy punktorze, numeracji i podpunkcie „a)”, przy wcięciu.
function akapity(linie) {
  const wynik = [];
  let akt = null;
  let poprz = null;
  for (const l of linie) {
    const prawa = Math.max(...l.czesci.map((k) => k.x + k.w));
    const znacznik = /^(•|\d+\.|[a-hA-F][.)])\s/.test(l.t.tekst);
    // Akapit z punktorem, literą opcji albo opisem pola ma wcięcie wiszące: kolejne linie
    // zaczynają się dalej niż pierwsza i nadal do niego należą.
    const wiszace = akt?.wiszace !== undefined && l.x >= akt.wiszace - 4;
    const nowy =
      !akt ||
      poprz.y - l.y > 1.45 * ODSTEP_LINII ||
      znacznik ||
      poprz.prawa < 400 ||
      (Math.abs(l.x - poprz.x) > 12 && !wiszace);
    if (nowy) {
      akt = { typ: "akapit", tekst: l.t.tekst, formaty: [...l.t.formaty] };
      if (znacznik) akt.wiszace = l.x + 6;
      else if (l.seg.length === 2 && /^[–-]\s/.test(l.seg[1].s)) akt.wiszace = l.seg[1].x;
      wynik.push(akt);
    } else {
      const przesun = akt.tekst.length + 1;
      akt.tekst += " " + l.t.tekst;
      akt.formaty.push(...l.t.formaty.map(([a, b, f]) => [a + przesun, b + przesun, f]));
    }
    poprz = { y: l.y, x: l.x, prawa };
  }
  for (const a of wynik) {
    // Zakresy tego samego kroju na granicy linii łączymy.
    a.formaty = a.formaty.reduce((acc, z) => {
      const ost = acc.at(-1);
      if (ost && ost[2] === z[2] && z[0] - ost[1] <= 1) ost[1] = z[1];
      else acc.push(z);
      return acc;
    }, []);
    if (!a.formaty.length) delete a.formaty;
    delete a.wiszace;
  }
  return wynik;
}
