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
  const linie = f.czesci.flatMap((c) => c.linie.map((l) => ({ tekst: l.s, strona: c.strona, y: l.y })));
  if (f.dopisek) linie.unshift({ tekst: f.dopisek, strona: f.czesci[0].strona, y: f.czesci[0].gora });
  let offset = 0;
  for (const l of linie) {
    l.od = offset;
    offset += l.tekst.length + 1;
  }
  const tresc = linie.map((l) => l.tekst).join(" ");
  for (const zdanie of tresc.matchAll(/[^!?;]+?(?:[!?;]|[.](?=\s+(?:[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]|[a-d]\)))|$)/gu)) {
    const tekst = zdanie[0];
    if (/^\s*(?:Informacja|Materiał źródłowy) do zadań/i.test(tekst)) break;
    const rysuj = RYSUJ.exec(tekst) ?? UTWORZ.exec(tekst) ?? UZUPELNIJ_SCHEMAT.exec(tekst);
    const oznacz = OZNACZ.exec(tekst);
    const naFigurze = NA_FIGURZE.exec(tekst);
    const ok = oznacz && naFigurze && Math.abs(naFigurze.index - oznacz.index) < 90 && !/\(\s*$/.test(tekst.slice(0, oznacz.index))
      && !/\bw (?:tabeli|kolumnie|wierszu tabeli)\b/i.test(tekst.slice(oznacz.index))
      && !WYBOR.test(tekst.slice(Math.min(naFigurze.index + naFigurze[0].length, oznacz.index + oznacz[0].length),
        Math.max(naFigurze.index, oznacz.index)));
    const czynność = rysuj ?? (ok ? oznacz : null);
    if (!czynność) continue;
    const l = linie.findLast((l) => l.od <= zdanie.index + czynność.index);
    return { ...l, tekst: tekst.trim(), naFigurze: Boolean(naFigurze), wzor: WZOR.test(tekst) && !naFigurze,
      wykres: /wykres|krzywą|diagram w postaci|siatce|układzie współrzędnych/i.test(tekst) };
  }
  return null;
}

export async function oznaczRysowanie(pdf, zadania, fragmenty, { katalog, prefiks }, poprawki = {}) {
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
        let obraz;
        if (poprawka?.ramka) {
          const s = await plotno(pdf, poprawka.strona, cache);
          obraz = await zapiszWycinek(s, poprawka.ramka, katalog, prefiks, q.nr + "-rysowanie.webp");
        } else if (poprawka?.figura !== undefined) {
          obraz = fragment.get(poprawka.fragment ?? q.nr)?.figury?.[poprawka.figura]?.obraz;
          if (!obraz) throw new Error("Nie znaleziono figury do rysowania w zadaniu " + q.nr);
        } else if (!p.wzor && z.pliki === undefined && !z.program) {
          const wspolne = q.nr.includes(".") ? fragment.get(String(z.nr))?.figury ?? [] : [];
          obraz = wybierzFigure(f.figury ?? [], p)?.obraz ?? (p.naFigurze ? wybierzFigure(wspolne, p, true)?.obraz : undefined);
        }
        if (obraz) q.rysowanie = { obraz };
      }
    }
  } finally {
    for (const s of cache.values()) s.fabryka.destroy(s);
  }
}

function wybierzFigure(figury, p, wspolne = false) {
  const miejsce = p.tekst.match(/(?:\bstronie\s+|\bs\.\s*)(\d+)/i)?.[1];
  const naStronie = figury.filter((f) => miejsce ? f.strona === Number(miejsce) : wspolne || f.strona >= p.strona);
  const kandydaci = naStronie.filter(({ obraz }) => obraz.szer >= 65 && obraz.wys >= 35);
  if (kandydaci.length <= 1) return kandydaci[0];
  const przed = /(?:powyż|poprzedni)/i.test(p.tekst);
  const po = kandydaci.filter((f) => f.strona > p.strona || f.ramka[3] < p.y);
  if (przed) return kandydaci.findLast((f) => !po.includes(f));
  if (po.length === 1) return po[0];
  if (p.wykres) return (po.length ? po : kandydaci).at(-1);
  return po[0] ?? kandydaci.at(-1);
}
