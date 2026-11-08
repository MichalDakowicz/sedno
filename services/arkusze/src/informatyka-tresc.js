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

/** Tekst linii z surowych kawałków i zakresy krojów: [od, do, "b" | "i" | "m" | "sup" | "sub"]. */
export function tekstLinii(czesci) {
  let tekst = "";
  const formaty = [];
  let koniec = null;
  // Linia bazowa: położenie kawałków pełnej wielkości. Drobniejszy kawałek wyżej to wykładnik (m³, 2¹⁰⁰),
  // niżej to indeks (s₁, (2011)₃).
  const maxH = Math.max(...czesci.map((c) => c.h || 0));
  const pelne = czesci.filter((c) => (c.h || 0) >= 0.85 * maxH && c.y !== undefined).map((c) => c.y).sort((a, b) => a - b);
  const bazowa = pelne.length ? pelne[Math.floor(pelne.length / 2)] : undefined;
  for (const c of czesci) {
    let s = c.s;
    if (c.f === "s") s = [...s].map((z, i) => symbol(z, i === 0 && !tekst)).join("");
    s = s.normalize("NFKC");
    if (!s) continue;
    const drobny = bazowa !== undefined && c.h && c.h < 0.8 * maxH && s.trim();
    const indeks = drobny ? (c.y > bazowa + 1.5 ? "sup" : c.y < bazowa - 0.8 ? "sub" : null) : null;
    const przerwa = koniec === null ? 0 : c.x - koniec;
    if (tekst && przerwa > 1.2 && !indeks && !tekst.endsWith(" ") && !s.startsWith(" ")) tekst += " ";
    const od = tekst.length;
    tekst += indeks ? s.trim() : s;
    const kroj = indeks ?? (c.f === "b" || c.f === "i" || c.f === "m" ? c.f : null);
    if (kroj) {
      const ost = formaty.at(-1);
      // Sąsiednie kawałki tego samego kroju (także przez spację) łączymy w jeden zakres.
      if (ost && ost[2] === kroj && ost[1] >= od - 1) ost[1] = tekst.length;
      else formaty.push([od, tekst.length, kroj]);
    }
    koniec = c.x + c.w;
  }
  const lead = tekst.length - tekst.trimStart().length;
  return { tekst: tekst.trim(), formaty: formaty.map(([a, b, f]) => [Math.max(0, a - lead), Math.min(tekst.trim().length, b - lead), f]).filter(([a, b]) => b > a) };
}

function rodzaj(l, lewa) {
  const { tekst } = l.t;
  if (!tekst || DO_POMINIECIA.test(tekst) || /[_…]{6,}|\.{8,}/.test(tekst)) return "pomin";
  // Znak, którego font Symbol nie zdradza: linia idzie do wycinka (wykładniki i indeksy obsługuje tekstLinii).
  if (tekst.includes("�")) return "trudna";
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
  if (l.seg.length === 2 && /^[–−-]\s/.test(l.seg[1].s)) return "tekst";
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
  const wszystkieCzesci = fragmenty.flatMap((f) => f.czesci);
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
      let linie = c.linie
        .map((l) => ({ ...l, czesci: l.czesci.filter((k) => k.x >= 60 && k.x < 520) }))
        .filter((l) => l.czesci.length)
        .map((l) => ({ ...l, x: l.czesci[0].x, t: tekstLinii(l.czesci) }));
      if (!linie.length) continue;
      // Tabele z narysowaną siatką: ich linie tekstu zastępuje jeden element „siatka” (dol: dolna krawędź).
      const pasGora = c.naglowek ? c.gora - 4 : c.gora + 12;
      // Pas kończy się przed następnym fragmentem na tej samej stronie (jak kadr), żeby nie łapać jego tabel.
      const nastepnyFragment = wszystkieCzesci.find((g) => g.strona === c.strona && g.gora < c.gora);
      const pasDol = Math.max(c.brudnopis !== null ? c.brudnopis + 14 : 60, nastepnyFragment ? nastepnyFragment.gora + 14 : 0);
      for (const t of tabeleZSiatki(s, pasGora, pasDol, linie.flatMap((l) => l.czesci))) {
        const w = linie.findIndex((l) => l.y < t.gora && l.y > t.dol);
        linie = linie.filter((l) => !(l.y < t.gora && l.y > t.dol));
        const miejsce = w >= 0 ? w : linie.findIndex((l) => l.y < t.dol);
        linie.splice(miejsce >= 0 ? miejsce : linie.length, 0, { y: t.dol, yGora: t.gora, x: 71, czesci: [], seg: [], t: { tekst: "", formaty: [] }, siatka: t });
      }
      const lewa = Math.min(...linie.map((l) => l.x));
      linie.forEach((l) => (l.rodzaj = l.siatka ? "siatka" : rodzaj(l, lewa)));
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
        // Przerwa liczona do górnej krawędzi elementu (dla tabeli to jej górna ramka).
        const krawedz = l.yGora ?? l.y;
        const przerwa = ost ? ost.linie.at(-1).y - krawedz : 0;
        if (r === "tekst" && ost?.rodzaj === "kod" && l.x > ost.lewa + 10 && przerwa < 2 * ODSTEP_LINII) r = "kod";
        if (r === "etykieta" || r === "trudna" || (r === "tabela" && ost?.rodzaj === "obraz" && przerwa < 2 * ODSTEP_LINII)) r = "obraz";
        // Duża przerwa z tuszem między liniami to rysunek albo wykres bez tekstu.
        if (ost && przerwa > 2.2 * ODSTEP_LINII && tusz(s, ost.linie.at(-1).y - 5, l.siatka ? krawedz + 3 : l.y + 12).length > 6) {
          const dolPasa = l.siatka ? krawedz + 3 : l.y + 12;
          if (ost.rodzaj === "obraz") ost.dol = dolPasa;
          else grupy.push({ rodzaj: "obraz", linie: [], gora: ost.linie.at(-1).y - 5, dol: dolPasa, lewa: l.x });
        }
        const g = grupy.at(-1);
        if (g && g.rodzaj === r && r !== "siatka" && przerwa < 2.2 * ODSTEP_LINII) {
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
          if (g.rodzaj === "obraz" || g.rodzaj === "siatka") return;
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

      // Tabela bez siatki (kolumny z odstępów) z klamrą albo przy wycinku to zwykle wzór: do wycinka.
      for (const [i, g] of scalone.entries()) {
        if (g.rodzaj !== "tabela") continue;
        // Wiersze nad tabelą z siatką o tej samej liczbie kolumn to jej nagłówek bez górnej ramki.
        const pod = scalone[i + 1];
        const kolumny = g.linie[0].seg.length;
        if (pod?.rodzaj === "siatka" && g.linie.every((l) => l.seg.length === kolumny) && pod.linie[0].siatka.wiersze[0].length === kolumny) {
          const t = pod.linie[0].siatka;
          t.wiersze.unshift(Array.from({ length: kolumny }, (_, k) => g.linie.map((l) => l.seg[k].s.normalize("NFKC")).join(" ")));
          t.zakresy.unshift(Array(kolumny).fill(1));
          t.obrazy.forEach((o) => o.r++);
          t.naglowek = Math.min(3, t.naglowek + 1);
          g.rodzaj = "pominieta";
        } else if (g.linie.some((l) => /[{}]/.test(l.t.tekst))) g.rodzaj = "obraz";
      }
      if (scalone.filter((g) => g.rodzaj === "obraz").length >= 3) rozsypany = true;
      for (const g of scalone) {
        if (g.rodzaj === "obraz") {
          // Pas od linii nad grupą do linii pod nią, dociągnięty do tuszu (ramki tabel, osie wykresu).
          const gora = Math.max(g.gora ?? -Infinity, g.linie.length ? g.linie[0].y + 12 : -Infinity);
          let dol = Math.min(g.dol ?? Infinity, g.linie.length ? g.linie.at(-1).y - 5 : Infinity);
          const nastepna = linie.find((l) => l.y < dol - 2 && l.rodzaj !== "pomin" && !g.linie.includes(l));
          const granica = nastepna ? (nastepna.siatka ? nastepna.yGora + 2 : nastepna.y + 12) : c.brudnopis !== null ? c.brudnopis + 14 : 60;
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
        } else if (g.rodzaj === "siatka") {
          const t = g.linie[0].siatka;
          const scalone = t.zakresy.some((w) => w.some((z) => z > 1));
          // Komórki, których tekst nie odda (klamra układu), jako wycinki.
          const obrazy = [];
          for (const { r, c: kol, ramka } of t.obrazy) {
            const [xl, yd, xp, yg] = ramka;
            obrazy.push({ r, c: kol, obraz: await zapiszWycinek(s, [xl + 1, yd + 1, xp - 1, yg - 1], katalog, prefiks, `${f.nr}-k${r}-${kol}.webp`) });
          }
          bloki.push({ typ: "tabelaTresci", wiersze: t.wiersze, naglowek: t.naglowek, ...(scalone ? { zakresy: t.zakresy } : {}), ...(obrazy.length ? { obrazy } : {}), strona: c.strona });
        } else if (g.rodzaj === "pominieta") {
          continue;
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
      else if (l.seg.length === 2 && /^[–−-]\s/.test(l.seg[1].s)) akt.wiszace = l.seg[1].x;
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

// ——— Tabele z siatki linii ———
// Tabela w arkuszu CKE ma narysowane linie. Szukamy ich na wyrenderowanej stronie: poziome to wiersze
// pikseli z ciemnym tuszem na dużej części szerokości, pionowe szukamy osobno w każdym wierszu tabeli
// (scalone komórki nagłówka mają krótsze linie). Tekst trafia do komórki, w której leży jego środek.

const ciemny = (d, i) => d[i] + d[i + 1] + d[i + 2] < CIEMNY * 3 && d[i + 3] > 0;

// Kolejne indeksy spełniające warunek sklejamy w jedną linię (środek grubej kreski).
function sklej(pozycje) {
  const wynik = [];
  for (const p of pozycje) {
    const ost = wynik.at(-1);
    if (ost && p - ost.do <= 2) ost.do = p;
    else wynik.push({ od: p, do: p });
  }
  return wynik.map((l) => (l.od + l.do) / 2);
}

const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "-": "⁻", "+": "⁺" };
const SUB = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" };
// W komórce tabeli wykładniki i indeksy z cyfr zapisujemy znakami Unicode (10⁶, s₁).
function tekstKomorki({ tekst, formaty }) {
  let wynik = "";
  let poz = 0;
  for (const [od, do_, k] of formaty) {
    if (k !== "sup" && k !== "sub") continue;
    const mapa = k === "sup" ? SUP : SUB;
    const s = tekst.slice(od, do_);
    if (![...s].every((z) => mapa[z])) continue;
    wynik += tekst.slice(poz, od) + [...s].map((z) => mapa[z]).join("");
    poz = do_;
  }
  return wynik + tekst.slice(poz);
}

/**
 * Tabele z siatki w pasie [dol, gora] (punkty PDF), od góry. Tabela to ciąg sąsiednich wierszy
 * (między liniami poziomymi), z których każdy ma co najmniej dwie linie pionowe. Każda tabela:
 * wiersze komórek (tekst), rozpiętość komórek w kolumnach, liczba wierszy nagłówka, zakres pionowy.
 */
export function tabeleZSiatki(s, gora, dol, czesci) {
  const [x0, x1] = KADR_X.map((x) => Math.round(x * SKALA));
  const szer = x1 - x0;
  const py0 = Math.max(0, Math.round((s.wys - gora) * SKALA));
  const py1 = Math.round((s.wys - dol) * SKALA);
  if (py1 - py0 < 20) return [];
  const d = s.context.getImageData(x0, py0, szer, py1 - py0).data;
  const yPdf = (r) => s.wys - (py0 + r) / SKALA;
  // Poziome linie: najdłuższy ciągły odcinek tuszu w wierszu pikseli.
  const poziome = [];
  for (let r = 0; r < py1 - py0; r++) {
    let bieg = 0;
    let max = 0;
    for (let c = 0; c < szer; c++) {
      if (ciemny(d, (r * szer + c) * 4)) max = Math.max(max, ++bieg);
      else bieg = 0;
    }
    if (max > 0.2 * szer) poziome.push(r);
  }
  const linieH = sklej(poziome);
  // Pionowe linie w każdym pasie między liniami poziomymi.
  const pasy = [];
  for (let i = 0; i + 1 < linieH.length; i++) {
    const r0 = Math.ceil(linieH[i]) + 2;
    const r1 = Math.floor(linieH[i + 1]) - 2;
    const pionowe = [];
    if (r1 - r0 >= 6) {
      for (let c = 0; c < szer; c++) {
        let tusz = 0;
        for (let r = r0; r <= r1; r++) if (ciemny(d, (r * szer + c) * 4)) tusz++;
        if (tusz >= 0.9 * (r1 - r0 + 1)) pionowe.push(c);
      }
    }
    pasy.push({ gora: linieH[i], dol: linieH[i + 1], linie: sklej(pionowe) });
  }
  // Ciągi pasów z siatką to tabele.
  const tabele = [];
  let akt = null;
  for (const p of pasy) {
    if (p.linie.length >= 2) {
      if (!akt) tabele.push((akt = []));
      akt.push(p);
    } else akt = null;
  }
  return tabele.filter((t) => t.length >= 2 || t[0].linie.length >= 3).map((t) => zbudujTabele(t, czesci, { x0, yPdf })).filter(Boolean);
}

function zbudujTabele(pasy, czesci, { x0, yPdf }) {
  const granice = sklej([...new Set(pasy.flatMap((w) => w.linie.map(Math.round)))].sort((a, b) => a - b));
  const wynik = pasy.map((w) => {
    const yGora = yPdf(w.gora);
    const yDol = yPdf(w.dol);
    const komorki = [];
    for (let k = 0; k + 1 < w.linie.length; k++) {
      const xl = (x0 + w.linie[k]) / SKALA;
      const xp = (x0 + w.linie[k + 1]) / SKALA;
      const wKomorce = czesci.filter((c) => {
        const sx = c.x + c.w / 2;
        const sy = c.y + (c.h || 10) * 0.3;
        return sx > xl && sx < xp && sy < yGora && sy > yDol;
      });
      // Linie tekstu w komórce od góry, kawałki w linii od lewej. Najpierw linie z kawałków pełnej
      // wielkości, potem drobne (wykładniki, indeksy) do najbliższej linii.
      const linieKomorki = [];
      const maxH = Math.max(0, ...wKomorce.map((c) => c.h || 0));
      const drobne = [];
      for (const c of [...wKomorce].sort((a, b) => b.y - a.y || a.x - b.x)) {
        if (c.h && c.h < 0.8 * maxH) {
          drobne.push(c);
          continue;
        }
        const l = linieKomorki.find((x) => Math.abs(x.y - c.y) <= 3.5);
        if (l) l.czesci.push(c);
        else linieKomorki.push({ y: c.y, czesci: [c] });
      }
      for (const c of drobne) {
        const l = [...linieKomorki].sort((a, b) => Math.abs(a.y - c.y) - Math.abs(b.y - c.y))[0];
        if (l && Math.abs(l.y - c.y) <= 8) l.czesci.push(c);
        else linieKomorki.push({ y: c.y, czesci: [c] });
      }
      linieKomorki.sort((a, b) => b.y - a.y);
      const teksty = linieKomorki.map((l) => {
        const cz = l.czesci.sort((a, b) => a.x - b.x);
        const srodek = (cz[0].x + cz.at(-1).x + cz.at(-1).w) / 2;
        return { tekst: tekstKomorki(tekstLinii(cz)), srodek };
      });
      // Ułamek piętrowy: dwie krótkie linie jedna nad drugą, wyśrodkowane („k” nad „2” → k/2).
      let tekst;
      if (teksty.length === 2 && teksty.every((t) => t.tekst.length <= 9) && Math.abs(teksty[0].srodek - teksty[1].srodek) < 8) {
        const [l, m] = teksty.map((t) => (/\s/.test(t.tekst) ? `(${t.tekst})` : t.tekst));
        tekst = `${l}/${m}`;
      } else tekst = teksty.map((t) => t.tekst).join(" ").trim();
      const zakres = granice.filter((g) => g > w.linie[k] + 3 && g < w.linie[k + 1] - 3).length + 1;
      // Klamra układu, przekreślenia i inne znaki łączone albo wykładnik przed podstawą: tekst tego
      // nie odda, komórka będzie wycinkiem.
      const obraz = /[{}̀-ͯ]|^[₀-₉⁰-⁹]/.test(tekst) ? [xl, yDol, xp, yGora] : null;
      komorki.push({ tekst, zakres, obraz, pogrubiona: wKomorce.length > 0 && wKomorce.filter((c) => c.f === "b").length >= wKomorce.length / 2 });
    }
    return komorki;
  });

  // Rysunki z linii (półki, plansze, schemat bazy, ramki w drzewie) to nie tabele: dużo pustych
  // komórek, wiersze o różnej szerokości albo jedna kolumna.
  const wszystkie = wynik.flat();
  const puste = wszystkie.filter((k) => !k.tekst).length / wszystkie.length;
  const szerokosci = new Set(wynik.map((w) => w.reduce((n, k) => n + k.zakres, 0)));
  // Wiersz krótszy o jedną komórkę (np. ostatni wiersz bez kolumny, której w nim nie wypełnia się) jest w porządku.
  const rozrzut = Math.max(...szerokosci) - Math.min(...szerokosci);
  if (puste > 0.6 || rozrzut > 1 || Math.max(...wynik.map((w) => w.length)) < 2) return null;

  // Nagłówek: początkowe wiersze bez pustych komórek i bez przełączników P / F, pogrubione albo
  // opisowe nad wierszem z liczbami.
  const liczbowa = (k) => /^[-\d\s.,·]+$/.test(k.tekst);
  let naglowek = 0;
  while (
    naglowek < wynik.length - 1 &&
    wynik[naglowek].every((k) => k.tekst && !/^[PF]$/.test(k.tekst)) &&
    (wynik[naglowek].some((k) => k.pogrubiona) || (wynik[naglowek].every((k) => !liczbowa(k)) && wynik[naglowek + 1].some(liczbowa)))
  )
    naglowek++;
  return {
    wiersze: wynik.map((w) => w.map((k) => k.tekst)),
    zakresy: wynik.map((w) => w.map((k) => k.zakres)),
    obrazy: wynik.flatMap((w, r) => w.flatMap((k, c) => (k.obraz ? [{ r, c, ramka: k.obraz }] : []))),
    naglowek: Math.min(naglowek, 3),
    gora: yPdf(pasy[0].gora),
    dol: yPdf(pasy.at(-1).dol),
  };
}
