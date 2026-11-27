import { mkdir } from "node:fs/promises";
import { zapiszWycinek } from "./matematyka.js";
import { akapity, plotno, rodzaj, tabeleZSiatki, tekstLinii } from "./tresc-pdf.js";
import { ulamkiWLinii, wzoryWielowierszowe } from "./wzory-pdf.js";

const X0 = 48;
const X1 = 558;
const TRESC_X0 = 65;
const TRESC_X1 = 530;
const SKALA = 2;
const PUSTA_LINIA = /^[\s.…_•–-]+$/;
const ZRODLO = /^(?:Źródło|Na podstawie|Opracowano na podstawie|Zaczerpnięto z)\s*:/i;
export const MATERIAL_DO_ZADAN = /^(?:Informacj[ae]|Materiały? źródłow[ye]|Tekst) do zada(?:nia|ń)\s+(\d+)(?:\.(\d+))?/i;
const TYTUL = /^(?:Tekst|Źródło|Materiał|Temat|Mapa|Ilustracja|Rysunek|Wykres|Tabela|Fotografia|Część)\s+(?:[0-9IVX]+|[A-D])(?:[.:]|\s*$)|^(?:Test historycznoliteracki|Język polski w użyciu)$/i;
const PODPIS_FIGURY = /^(?:Rysunek|Diagram|Wykres|Mapa|Fotografia)(?:\s+(?:\d+|[A-D]))?\.?$/i;
const ETYKIETY_FIGURY = /^(?:(?:zestaw|probówka|próba|rysunek|diagram)\s+(?:\d+|[IVX]+)\.?\s*)+$/i;
const PRZEDMIOTY_Z_WZORAMI = new Set(["matematyka", "fizyka", "chemia", "biologia", "informatyka"]);

export async function trescZFragmentow(pdf, fragmenty, { katalog, prefiks }, { przedmiot }) {
  await mkdir(katalog, { recursive: true });
  const cache = new Map();
  const kadry = [];
  for (const f of fragmenty) {
    f.bloki = [];
    f.figury = [];
    for (const [i, c] of f.czesci.entries()) {
      for (const [n, s] of cache) {
        if (n < c.strona) {
          s.fabryka.destroy(s);
          cache.delete(n);
        }
      }
      const s = await plotno(pdf, c.strona, cache);
      const wytnij = (ramka, nazwa) => zapiszWycinek(s, ramka, katalog, prefiks, f.nr + "-" + (i + 1) + "-" + nazwa + ".webp");
      const czesci = c.linie.flatMap((l) => l.czesci);
      const genealogie = ramkiGenealogii(c);
      const tabele = tabeleZSiatki(s, c.gora, c.dol, czesci, { odpowiedzi: true, otwartyDol: true })
        .filter((t) => !genealogie.some(([, yd, , yg]) => yd < t.gora && yg > t.dol));
      const elementy = [];
      const pozaTabelami = c.linie.map((l) => ({ ...l, czesci: l.czesci.filter((k) =>
        !tabele.some((t) => k.y + (k.h || 10) * 0.3 < t.gora && k.y + (k.h || 10) * 0.3 > t.dol)) }))
        .filter((l) => l.czesci.length);
      const ulozone = PRZEDMIOTY_Z_WZORAMI.has(przedmiot) ? ulamkiWLinii(s, pozaTabelami) : pozaTabelami;
      const linie = ulozone.map((l) => ({ ...l, x: l.czesci[0].x, t: tekstLinii(l.czesci) }));
      for (const [nr, t] of tabele.entries()) {
        const obrazy = [];
        for (const { r, c: kol, ramka } of t.obrazy) {
          const [x0, y0, x1, y1] = ramka;
          if (x1 - x0 > 2 && y1 - y0 > 2) obrazy.push({ r, c: kol, obraz: await wytnij([x0 + 1, y0 + 1, x1 - 1, y1 - 1], "tabela-" + nr + "-" + r + "-" + kol) });
        }
        const zakresy = t.zakresy.some((w) => w.some((z) => z > 1));
        elementy.push({ y: t.gora, blok: { typ: "tabelaTresci", wiersze: t.wiersze, naglowek: t.naglowek,
          ...(zakresy && { zakresy: t.zakresy }), ...(obrazy.length && { obrazy }) } });
      }
      const figury = [...genealogie, ...ramkiRysunkow(s, c, tabele, genealogie)];
      for (const [nr, ramka] of figury.entries()) {
        const obraz = await wytnij(ramka, "rysunek-" + nr);
        f.figury.push({ ramka, obraz, strona: c.strona });
        elementy.push({ y: ramka[3], blok: { typ: "rysunek", obraz } });
      }
      const kadrujWzor = async (ramka, linie, nazwa, powod) => {
        const obraz = await wytnij(ramka, nazwa);
        const tekst = linie.map((l) => l.t.tekst).join("\n");
        elementy.push({ y: linie[0].y, blok: { typ: "kadr", tekst, obraz } });
        kadry.push({ nr: f.nr, strona: c.strona, powod, src: obraz.src });
      };
      const zKadru = new Set();
      if (PRZEDMIOTY_Z_WZORAMI.has(przedmiot)) {
        for (const [nr, w] of wzoryWielowierszowe(linie).entries()) {
          const dol = Math.max(c.dol, w.linie.at(-1).y - 5);
          // Pierwsza linia z ułamkiem ma licznik wciągnięty z linii wyżej (ulamkiWLinii): kadr musi go objąć.
          const gora = Math.min(c.gora, w.linie[0].y + (w.linie[0].t.tekst.includes("\\frac") ? 24 : 13));
          if (gora <= dol || figury.some((r) => r[0] <= w.lewa && r[2] >= w.prawa && r[1] <= dol && r[3] >= gora)) continue;
          const ramka = [Math.max(0, w.lewa - 4), dol, Math.min(s.canvas.width / SKALA, w.prawa + 5), gora];
          await kadrujWzor(ramka, w.linie, "wzor-" + nr, "wielowierszowy wzór PDF");
          w.linie.forEach((l) => zKadru.add(l));
        }
      }
      for (const [nr, l] of linie.entries()) {
        if (zKadru.has(l)) continue;
        if (PUSTA_LINIA.test(l.t.tekst) || /^\s*(?:Odpowiedź|Miejsce na odpowiedź)\s*:\s*[_.…]*$/i.test(l.t.tekst)) continue;
        const x1 = Math.max(...l.czesci.map((k) => k.x + k.w));
        if (figury.some(([xl, yd, xp, yg]) => l.y + 4 > yd && l.y + 4 < yg && l.x >= xl && x1 <= xp)) continue;
        if (/[�\u0000-\u0008\u000b-\u001f\uE000-\uF8FF]/.test(l.t.tekst)) {
          const ramka = [Math.max(0, l.x - 3), Math.max(c.dol, l.y - 5), Math.min(s.canvas.width / SKALA, x1 + 3), Math.min(c.gora, l.y + 13)];
          if (ramka[2] > ramka[0] && ramka[3] > ramka[1]) {
            await kadrujWzor(ramka, [l], "kadr-" + nr, "nierozpoznany znak PDF");
            continue;
          }
        }
        const typ = ZRODLO.test(l.t.tekst) ? "zrodlo" : TYTUL.test(l.t.tekst) || MATERIAL_DO_ZADAN.test(l.t.tekst) ? "naglowek" : null;
        elementy.push({ y: l.y, ...(typ ? { blok: { typ, ...l.t } } : { linia: l }) });
      }
      const bufor = [];
      const dodaj = (b) => f.bloki.push({ ...b, strona: c.strona });
      const zamknijAkapity = () => dodajAkapity(bufor.splice(0), dodaj, przedmiot === "informatyka");
      for (const e of elementy.sort((a, b) => b.y - a.y)) {
        if (e.linia) bufor.push(e.linia);
        else {
          zamknijAkapity();
          dodaj(e.blok);
        }
      }
      zamknijAkapity();
    }
  }
  for (const s of cache.values()) s.fabryka.destroy(s);
  return kadry;
}

function dodajAkapity(linie, dodaj, informatyka) {
  const opcja = /^([A-H])[.)]\s+(.+)$/;
  const bufor = [];
  const kod = [];
  const zamknijKod = () => {
    if (!kod.length) return;
    const lewa = Math.min(...kod.map((l) => l.x));
    dodaj({ typ: "kod", tekst: kod.splice(0).map((l) => " ".repeat(Math.max(0, Math.round((l.x - lewa) / 7))) + l.t.tekst).join("\n") });
  };
  const zamknij = () => akapity(bufor.splice(0)).forEach(dodaj);
  for (const l of linie) {
    if (informatyka && rodzaj(l, l.x) === "kod") {
      zamknij();
      kod.push(l);
      continue;
    }
    zamknijKod();
    const opcje = l.seg.map((g) => g.s.match(opcja));
    if (opcje.length > 1 && opcje.every(Boolean)) {
      zamknij();
      for (const o of opcje) dodaj({ typ: "akapit", tekst: o[1] + ". " + o[2] });
    } else bufor.push(l);
  }
  zamknijKod();
  zamknij();
}

// Rozpoznajemy tusz poza obwiedniami znaków i tabel. Ciasno przycinamy do grafiki,
// a sąsiednie podpisy w środku ramki pozostają na grafice (np. legenda w mapie).
function ramkiRysunkow(s, { gora, dol, linie }, tabele, zajete) {
  if (gora - dol < 12) return [];
  const y0 = Math.max(0, Math.round((s.wys - gora) * SKALA));
  const wysokosc = Math.round((s.wys - dol) * SKALA) - y0;
  const szer = (X1 - X0) * SKALA;
  const { data } = s.context.getImageData(X0 * SKALA, y0, szer, wysokosc);
  const maska = new Uint8Array(szer * wysokosc);
  const wiersz = (y) => Math.round((s.wys - y) * SKALA) - y0;
  const zastrzez = (xl, yd, xp, yg) => {
    const a = Math.max(0, Math.floor((xl - X0) * SKALA));
    const b = Math.min(szer, Math.ceil((xp - X0) * SKALA));
    for (let r = Math.max(0, wiersz(yg)); a < b && r <= Math.min(wysokosc - 1, wiersz(yd)); r++) {
      maska.fill(1, r * szer + a, r * szer + b);
    }
  };
  for (const t of tabele) zastrzez(X0, t.dol - 2, X1, t.gora + 2);
  for (const [, yd, , yg] of zajete) zastrzez(X0, yd, X1, yg);
  for (const l of linie) {
    if (MATERIAL_DO_ZADAN.test(l.s)) zastrzez(X0, l.y - 5, X1, l.y + 12);
    for (const c of l.czesci) zastrzez(c.x - 2, c.y - 3, c.x + c.w + 2, c.y + (c.h || 11) + 2);
  }
  const pasy = [];
  for (let r = 0; r < wysokosc; r += 2) {
    let min = szer;
    let max = -1;
    let ile = 0;
    let kontrast = 0;
    for (let c = (TRESC_X0 - X0) * SKALA; c < (TRESC_X1 - X0) * SKALA; c += 2) {
      const p = r * szer + c;
      const i = p * 4;
      if (maska[p] || !data[i + 3] || data[i] + data[i + 1] + data[i + 2] > 680) continue;
      const czerwony = data[i];
      const zielony = data[i + 1];
      const niebieski = data[i + 2];
      if (czerwony + zielony + niebieski < 450 || Math.max(czerwony, zielony, niebieski) - Math.min(czerwony, zielony, niebieski) > 16) kontrast++;
      min = Math.min(min, c);
      max = Math.max(max, c);
      ile++;
    }
    if (ile < 2) continue;
    const ostatni = pasy.at(-1);
    const pasWspolny = ostatni && min < ostatni.max && max > ostatni.min;
    if (ostatni && (r - ostatni.do <= 18 || pasWspolny && r - ostatni.do <= 34)) {
      ostatni.do = r;
      ostatni.min = Math.min(ostatni.min, min);
      ostatni.max = Math.max(ostatni.max, max);
      ostatni.tusz += ile;
      ostatni.kontrast += kontrast;
    } else pasy.push({ od: r, do: r, min, max, tusz: ile, kontrast });
  }
  // Jasna, szara kratka do obliczeń nie jest rysunkiem. Wykresy mają ciemne osie lub kolor.
  const ramki = pasy.filter((p) => p.do - p.od >= 20 && p.max - p.min >= 28 && p.tusz >= 44 && p.kontrast >= 16).map((p) => {
    const bocznyTusz = (kol) => {
      let n = 0;
      for (let r = p.od; r <= p.do; r += 2) {
        const i = (r * szer + kol) * 4;
        if (!maska[i / 4] && data[i + 3] && data[i] + data[i + 1] + data[i + 2] < 695) n++;
      }
      return n >= Math.max(5, (p.do - p.od) * 0.045);
    };
    let { min, max } = p;
    if (p.do - p.od > 75) {
      while (min > 1 && bocznyTusz(min - 2)) min -= 2;
      while (max < szer - 2 && bocznyTusz(max + 2)) max += 2;
    }
    return [Math.max(X0, X0 + min / SKALA - 4), Math.max(dol, s.wys - (y0 + p.do) / SKALA - 5),
      Math.min(X1, X0 + max / SKALA + 5), Math.min(gora, s.wys - (y0 + p.od) / SKALA + 5)];
  });
  return ramki.map((r) => dolaczEtykiety(r, linie, dol, gora));
}

function dolaczEtykiety(r, linie, dol, gora) {
  const [x0, y0, x1, y1] = r;
  for (const l of linie) {
    if (l.y < y0 - 26 || l.y > y1 + 18 || ZRODLO.test(l.s)) continue;
    const podpis = PODPIS_FIGURY.test(l.s) || ETYKIETY_FIGURY.test(l.s);
    // Dłuższy wiersz przy marginesie to treść zadania. Etykiety w legendach mogą zawierać kilka słów.
    const etykieta = podpis || l.x >= 86 && l.s.length <= 55 && !/[.!?]$/.test(l.s)
      || l.s.length <= 17 && !/\p{L}{4}/u.test(l.s) || /(?:^|\s)\d+[.,]?\d*(?:\s+\d+[.,]?\d*){3}/.test(l.s);
    if (!etykieta) continue;
    const xl = Math.min(...l.czesci.map((c) => c.x));
    const xp = Math.max(...l.czesci.map((c) => c.x + c.w));
    if (xp < x0 - (podpis ? 90 : 45) || xl > x1 + 55) continue;
    r[0] = Math.max(X0, Math.min(r[0], xl - 4));
    r[1] = Math.max(dol, Math.min(r[1], l.y - 5));
    r[2] = Math.min(X1, Math.max(r[2], xp + 4));
    r[3] = Math.min(gora, Math.max(r[3], l.y + 13));
  }
  return r;
}

function ramkiGenealogii({ linie, dol }) {
  return linie.flatMap((l, i) => {
    if (!/(?:tablica|drzewo) genealogiczn/i.test(l.s) || !/^Źródło\s/i.test(l.s)) return [];
    const koniec = linie.slice(i + 1).find((x) => ZRODLO.test(x.s) || /^Na podstawie\b|^Źródło |^Rozstrzygnij |^Na podstawie źródeł/i.test(x.s));
    const y = koniec ? koniec.y + 13 : dol;
    return l.y - y >= 55 ? [[X0, y, X1, l.y - 5]] : [];
  });
}
