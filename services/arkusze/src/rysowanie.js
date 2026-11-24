import { zapiszWycinek } from "./matematyka.js";
import { plotno } from "./tresc-pdf.js";

const FIGURA = String.raw`(?:rysunk\p{L}*|wykres\p{L}*|diagram\p{L}*|schemacie|schematach|mapie|mapach|osiach|osi|siatce|układzie współrzędnych|planie|profilu)`;
const RYSUJ = /(?<!\p{L})(?:narysuj|dorysuj|naszkicuj|wrysuj|wykreśl|zamaluj|zakreskuj)(?!\p{L})/iu;
const UTWORZ = /(?<!\p{L})(?:wykonaj|sporządź|skonstruuj|zbuduj|uzupełnij|dokończ)\s+(?:(?:poniższ\p{L}*|podan\p{L}*|brakując\p{L}*)\s+)?(?:szkic|profil|rysunek|wykres\p{L}*|diagram\p{L}*|mapę)(?!\p{L})/iu;
const UZUPELNIJ_SCHEMAT = /(?<!\p{L})uzupełnij (?:poniższ\p{L}* )?schemat\p{L}*(?!\p{L})(?=.{0,80}(?:strzałk|zaznacz|dorysuj))/iu;
const OZNACZ = /(?<!\p{L})(?:zaznacz|oznacz|nanieś|wpisz|wstaw|podpisz|poprowadź|umieść|zamaluj|zakreskuj|uzupełnij)(?!\p{L})/iu;
const NA_FIGURZE = new RegExp(String.raw`(?<!\p{L})(?:na|w|w obrębie)\s+(?:(?:tym|poniższ\p{L}*|powyższ\p{L}*|podan\p{L}*|barwn\p{L}*|zamieszczon\p{L}*)\s+){0,2}${FIGURA}(?!\p{L})`, "iu");
const WYBOR = /(?:spośród|prawdziw\p{L}*|właściwą odpowiedź|we właściwej kolejności|poprawn\p{L}* odpowiedź|informacj\p{L}*|[PF] (?:– |–)?jeśli|któr\p{L}*|wybran\p{L}*|oznaczon\p{L}*|oznaczając\p{L}*|odpowiadając\p{L}*|przedstawion\p{L}*|podan\p{L}*|na podstawie|w tabeli|w kolumnie|zdani[ae])/iu;
const WZOR = /(?:narysuj|naszkicuj)\s+(?:(?:odpowiedni|uproszczony|właściwy)\s+)?wz[oó]r/iu;

export function polecenieRysowania(f) {
  const linie = f.czesci.filter((c) => !c.wstep).flatMap((c) => c.linie.map((l) => ({ tekst: l.s, strona: c.strona, y: l.y })));
  if (f.dopisek) linie.unshift({ tekst: f.dopisek, strona: f.czesci[0].strona, y: f.czesci[0].gora });
  let offset = 0;
  for (const l of linie) {
    l.od = offset;
    offset += l.tekst.length + 1;
  }
  const tresc = linie.map((l) => l.tekst).join(" ");
  for (const zdanie of tresc.matchAll(/[^!?;]+?(?:[!?;]|[.](?=\s+(?:[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]|[WZIAO]\s|[a-d]\)))|$)/gu)) {
    const tekst = zdanie[0];
    if (/^\s*(?:Informacja|Materiał źródłowy) do zadań/i.test(tekst)) break;
    if (/\b(?:uzupełnij|dokończ)\s+(?:poniższ\p{L}+\s+)?zdani[ae]\b/iu.test(tekst)) continue;
    const rysuj = RYSUJ.exec(tekst) ?? UTWORZ.exec(tekst) ?? UZUPELNIJ_SCHEMAT.exec(tekst);
    const oznacz = OZNACZ.exec(tekst);
    const naFigurze = NA_FIGURZE.exec(tekst);
    const dopelnijRownanie = /schemaci/i.test(naFigurze?.[0] ?? "") && /(?:napisz|zapisz|podaj) równani[ea]|współczynniki stechiometryczne/i.test(tresc);
    const ok = oznacz && naFigurze && Math.abs(naFigurze.index - oznacz.index) < 90 && !/\(\s*$/.test(tekst.slice(0, oznacz.index))
      && !/(?:tabeli|kolumnie|w tabelę|numer (?:wskazując|oznaczając))/i.test(tekst) && !dopelnijRownanie
      && !/(?:równanie|liczb\p{L}+\s+(?:atomow|masow)|atomową i masową|schemaci\p{L}*\s+rozpadu)/iu.test(tekst)
      && !WYBOR.test(tekst.slice(Math.min(naFigurze.index + naFigurze[0].length, oznacz.index + oznacz[0].length),
        Math.max(naFigurze.index, oznacz.index)));
    const czynność = rysuj ?? (ok ? oznacz : null);
    if (!czynność || !rysuj && /(?:spośród|z podanych).{0,80}(?:pokazan|przedstawion).{0,35}na rysunk/iu.test(tekst)) continue;
    const l = linie.findLast((l) => l.od <= zdanie.index + czynność.index);
    const odCzynnosci = tekst.slice(czynność.index);
    const koniec = linie.find((x) => x.od > l.od && /^(?:Informacja|Materiał źródłowy) do zadań/i.test(x.tekst));
    return { ...l, tekst: tekst.trim(), koniec, naFigurze: Boolean(naFigurze), wzor: WZOR.test(odCzynnosci) && !naFigurze,
      nowyWykres: /^(?:narysuj|wykonaj|sporządź|naszkicuj|zbuduj)\s+(?:(?!na\s)\p{L}+\s+)?(?:wykres|diagram|krzywą|profil)/iu.test(odCzynnosci),
      odZera: /^(?:narysuj|sporządź|wykonaj|naszkicuj)\s+(?:(?:jeden z możliwych|użyty|prosty)\s+)?(?:schemat|rysunek|szkic|układ|[0-9]+ punkt)/iu.test(odCzynnosci) };
  }
  return null;
}

export async function oznaczRysowanie(pdf, zadania, fragmenty, { katalog, prefiks }, poprawki = {}, mapy = []) {
  const fragment = new Map(fragmenty.map((f) => [f.nr, f]));
  const cache = new Map();
  try {
    for (const z of zadania) {
      for (const q of z.pytania) {
        const f = fragment.get(q.nr);
        const poprawka = poprawki[q.nr];
        if (!f || q.typ !== "otwarte" || poprawka === null) continue;
        const p = polecenieRysowania(f);
        if (!p && !poprawka) continue;
        let cel;
        if (poprawka?.ramka) {
          cel = poprawka;
        } else if (poprawka?.figura !== undefined) {
          cel = fragment.get(poprawka.fragment ?? q.nr)?.figury?.[poprawka.figura];
          if (!cel) throw new Error("Nie znaleziono figury do rysowania w zadaniu " + q.nr);
        } else if (!z.pliki?.length && !z.program) {
          const wspolne = q.nr.includes(".") ? fragment.get(String(z.nr))?.figury ?? [] : [];
          if (p.nowyWykres || p.odZera || p.wzor) {
            cel = (p.nowyWykres && wybierzFigure(f.figury ?? [], p)) || await znajdzSiatke(pdf, f.czesci, p, cache);
          } else {
            const maWskazanie = p.naFigurze && !/(?:poniżej|obok|poniższ)/i.test(p.tekst);
            cel = wybierzFigure(f.figury ?? [], p) ?? (maWskazanie ? wybierzFigure(wspolne, p, true) : undefined);
            if (!cel && mapy.length === 1 && /na (?:barwnej mapie|mapie szczegółowej|załączonej mapie)/i.test(p.tekst)) cel = mapy[0];
          }
        }
        if (!cel) continue;
        const obraz = cel.obraz ?? await zapiszWycinek(await plotno(pdf, cel.strona, cache), cel.ramka, katalog, prefiks, q.nr + "-rysowanie.webp");
        q.rysowanie = { obraz };
        const zastepowane = new Set((f.figury ?? []).filter((g) => g === cel || g.strona === cel.strona && pokrywa(cel.ramka, g.ramka)).map((g) => g.obraz.src));
        if (poprawka?.zrodlo) {
          const [figura] = f.figury;
          const blok = z.bloki.find((b) => b.typ === "rysunek" && b.obraz.src === figura?.obraz.src);
          if (!blok) throw new Error("Brak figury źródłowej w zadaniu " + q.nr);
          blok.obraz = await zapiszWycinek(await plotno(pdf, cel.strona, cache), poprawka.zrodlo, katalog, prefiks, q.nr + "-zrodlo.webp");
        }
        if (zastepowane.size) z.bloki = z.bloki.filter((b) => b.typ !== "rysunek" || !zastepowane.has(b.obraz.src));
        if (z.rysunek?.src === obraz.src) delete z.rysunek;
      }
    }
  } finally {
    for (const s of cache.values()) s.fabryka.destroy(s);
  }
}

function wybierzFigure(figury, p, wspolne = false) {
  const miejsce = p.tekst.match(/(?:\bstronie\s+|\bs\.\s*)(\d+)/i)?.[1];
  const naStronie = figury.filter((f) => miejsce ? f.strona === Number(miejsce) : wspolne || f.strona >= p.strona);
  const kandydaci = naStronie.filter(({ obraz }) => obraz.szer >= 65 && obraz.wys >= 34);
  const po = kandydaci.filter((f) => f.strona > p.strona || f.strona === p.strona && f.ramka[3] <= p.y + 3);
  if (p.nowyWykres) return po.find(({ obraz, ramka, strona }) => obraz.wys >= 70
    && (!p.koniec || strona < p.koniec.strona || strona === p.koniec.strona && ramka[1] > p.koniec.y));
  if (kandydaci.length <= 1) return kandydaci[0];
  const przed = /(?:powyż|poprzedni)/i.test(p.tekst);
  if (przed) return kandydaci.findLast((f) => !po.includes(f));
  return po[0] ?? kandydaci.at(-1);
}

function pokrywa([xl, yd, xp, yg], [l, d, p, g]) {
  const pole = Math.max(0, Math.min(xp, p) - Math.max(xl, l)) * Math.max(0, Math.min(yg, g) - Math.max(yd, d));
  return pole >= 0.92 * (p - l) * (g - d);
}

async function znajdzSiatke(pdf, czesci, p, cache) {
  for (const c of czesci.filter((c) => c.strona >= p.strona && !c.wstep)) {
    if (p.koniec && c.strona > p.koniec.strona) break;
    const gora = c.strona === p.strona ? p.y - 5 : c.gora;
    const dol = Math.max(c.dol ?? Math.max(60, c.brudnopis ?? 0), c.strona === p.koniec?.strona ? p.koniec.y + 12 : 0);
    if (gora - dol < 45) continue;
    const s = await plotno(pdf, c.strona, cache);
    const ramka = ramkaSiatki(s, gora, dol);
    if (ramka) return { strona: c.strona, ramka };
  }
  return null;
}

function ramkaSiatki(s, gora, dol) {
  const skala = 2;
  const lewa = 65;
  const szer = 465 * skala;
  const py = Math.round((s.wys - gora) * skala);
  const wysokosc = Math.round((gora - dol) * skala);
  const { data } = s.context.getImageData(lewa * skala, py, szer, wysokosc);
  const kreska = (x, y) => {
    const i = (y * szer + x) * 4;
    return data[i + 3] && data[i] + data[i + 1] + data[i + 2] < 732;
  };
  const wiersze = [];
  for (let y = 0; y < wysokosc; y++) {
    let poczatek = 0;
    for (let x = 0; x <= szer; x++) {
      if (x < szer && kreska(x, y)) continue;
      if (x - poczatek > 150 * skala) {
        if (wiersze.at(-1)?.y !== y - 1) wiersze.push({ y, x0: poczatek, x1: x });
        break;
      }
      poczatek = x + 1;
    }
  }
  for (const [i, a] of wiersze.entries()) {
    const grupa = [a];
    for (const b of wiersze.slice(i + 1)) {
      if (b.y - grupa.at(-1).y > 32 * skala) break;
      if (Math.abs(b.x0 - a.x0) < 6 && Math.abs(b.x1 - a.x1) < 6 && b.y - grupa.at(-1).y >= 5) grupa.push(b);
    }
    const b = grupa.at(-1);
    if (grupa.length < 5 || b.y - a.y < 32 * skala) continue;
    const pionowe = Array.from({ length: a.x1 - a.x0 }, (_, x) => x + a.x0).filter((x) => {
      let tusz = 0;
      for (let y = a.y; y <= b.y; y += skala) if (kreska(x, y)) tusz++;
      return tusz * skala >= 0.83 * (b.y - a.y);
    });
    if (pionowe.filter((x, n) => n === 0 || x > pionowe[n - 1] + 2).length < 5) continue;
    return [Math.max(49, lewa + a.x0 / skala - 13), Math.max(dol, gora - b.y / skala - 14),
      Math.min(548, lewa + a.x1 / skala + 13), Math.min(gora, gora - a.y / skala + 11)];
  }
  return null;
}
