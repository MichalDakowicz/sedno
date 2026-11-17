// Kody wymagań z zasad oceniania angielskiego w Formule 2023. Etykiety
// podpunktów są w osobnej kolumnie. Komórka wymagania może obejmować kilka
// wierszy, więc przypisanie ustalamy z narysowanych granic komórki.
import { readFile } from "node:fs/promises";
import { getDocument, OPS, Util } from "pdfjs-dist/legacy/build/pdf.mjs";

const SEKCJE = new Map([
  ["Rozumienie ze słuchu", "II"],
  ["Rozumienie tekstów pisanych", "III"],
  ["Znajomość środków językowych", "I"],
  ["Wypowiedź pisemna", "V"],
]);

const NAGLOWEK_ZADANIA = /^Zadanie (\d+)\.(?: \(\d.*\))?$/;
const PODPUNKT = /^(\d+)\.(\d+)\.?$/;
const KOD = /^([IVX]+)\.\s*(\d+)(?:\)|\.(?=\s|$))/;

export async function przypiszWymagania(sciezka, strony, zadania) {
  const pdf = await getDocument({ data: new Uint8Array(await readFile(sciezka)), verbosity: 0 }).promise;
  try {
    const wymagania = await odczytajWymagania(pdf, strony);
    const brak = [];
    for (const zadanie of zadania) {
      for (const pytanie of zadanie.pytania) {
        const kody = wymagania.pytania.get(pytanie.nr) ?? wymagania.zadania.get(zadanie.nr);
        if (kody?.size) pytanie.wymagania = [...kody];
        else brak.push(pytanie.nr);
      }
    }
    return brak;
  } finally {
    await pdf.destroy();
  }
}

async function odczytajWymagania(pdf, strony) {
  const pytania = new Map();
  const zadania = new Map();
  let sekcja;
  let zadanie;
  let tabela = false;
  let koniec = false;

  for (const [i, strona] of strony.entries()) {
    const etykiety = [];
    const kody = [];
    let granice;
    for (const linia of strona) {
      if (SEKCJE.has(linia.s)) {
        sekcja = SEKCJE.get(linia.s);
        zadanie = undefined;
        tabela = false;
      }

      if (sekcja === "V") {
        if (/^Każda wypowiedź jest oceniana/.test(linia.s)) {
          koniec = true;
          break;
        }
        const nr = linia.s.match(NAGLOWEK_ZADANIA)?.[1];
        if (nr) {
          zadanie = Number(nr);
          if (!zadania.has(zadanie)) zadania.set(zadanie, new Set(["V"]));
        }
        if (/^(Wymagania szczegółowe|Szczegółowe wymagania egzaminacyjne)/.test(linia.s)) tabela = true;
        const kod = linia.s.match(KOD);
        if (tabela && kod) zadania.get(zadanie)?.add(`${kod[1]}.${kod[2]}`);
        continue;
      }

      const nr = linia.s.match(NAGLOWEK_ZADANIA)?.[1];
      if (nr) {
        zadanie = Number(nr);
        tabela = false;
        if (sekcja === "I") zadania.set(zadanie, new Set(["I"]));
      }

      if ((sekcja !== "II" && sekcja !== "III") || !zadanie) continue;
      if (linia.seg.some((s) => /\bWymagani[ae] szczegółow[ae]$/.test(s.s))) tabela = true;
      if (linia.seg.some((s) => /^(Uszczegółowienia|Przykładowe|Inne akceptowane odpowiedzi|Transkrypcja)/i.test(s.s))) tabela = false;
      if (!tabela) continue;

      for (const segment of linia.seg) {
        const etykieta = segment.s.match(PODPUNKT);
        if (etykieta && Number(etykieta[1]) === zadanie && segment.x < 130) {
          etykiety.push({ nr: `${zadanie}.${etykieta[2]}`, zadanie, sekcja, y: linia.y });
        }
        const kod = segment.s.match(KOD);
        if (!kod) continue;
        granice ??= await granicePoziome(await pdf.getPage(i + 1));
        const komorka = znajdzKomorke(granice, segment.x + 2, linia.y);
        if (komorka) kody.push({ ...komorka, zadanie, kod: `${kod[1]}.${kod[2]}` });
      }
    }

    for (const e of etykiety) {
      const pasujace = new Set(kody.filter((k) => k.zadanie === e.zadanie && k.dol < e.y && e.y < k.gora).map((k) => k.kod));
      const glowne = [...pasujace].filter((k) => k.startsWith(`${e.sekcja}.`));
      if (glowne.length === 1) {
        pasujace.delete(glowne[0]);
        const wczesniejsze = pytania.get(e.nr);
        const odczytane = new Set([glowne[0], ...pasujace]);
        // Ten sam podpunkt bywa w tabeli kilka razy. Pierwsza poprawnie
        // dopasowana komórka to wymaganie z tabeli, nie opis przykładu.
        if (!wczesniejsze) pytania.set(e.nr, odczytane);
      }
    }
    if (koniec) break;
  }
  return { pytania, zadania };
}

function znajdzKomorke(granice, x, y) {
  let dol = -Infinity;
  let gora = Infinity;
  for (const linia of granice) {
    if (x < linia.od || x > linia.do) continue;
    if (linia.y < y && linia.y > dol) dol = linia.y;
    if (linia.y > y && linia.y < gora) gora = linia.y;
  }
  return Number.isFinite(dol) && Number.isFinite(gora) ? { dol, gora } : null;
}

async function granicePoziome(strona) {
  const { fnArray, argsArray } = await strona.getOperatorList();
  const wynik = [];
  const stos = [];
  let transformacja = [1, 0, 0, 1, 0, 0];
  const zapisz = (punkty) => {
    if (punkty.length < 2) return;
    const obraz = punkty.map((punkt) => Util.applyTransform(punkt, transformacja));
    const x = obraz.map((punkt) => punkt[0]);
    const y = obraz.map((punkt) => punkt[1]);
    const od = Math.min(...x);
    const doo = Math.max(...x);
    const dol = Math.min(...y);
    const gora = Math.max(...y);
    if (gora - dol <= 1.5 && doo - od > 15) wynik.push({ od, do: doo, y: (dol + gora) / 2 });
  };

  // W starszych kluczach obramowania są prostokątami. W nowszych kilka
  // takich kształtów może być połączonych w jednej transformowanej ścieżce.
  for (const [i, op] of fnArray.entries()) {
    const argumenty = argsArray[i];
    if (op === OPS.save) stos.push(transformacja);
    else if (op === OPS.restore) transformacja = stos.pop() ?? transformacja;
    else if (op === OPS.transform) transformacja = Util.transform(transformacja, argumenty);
    else if (op === OPS.constructPath) {
      const [typy, wspolrzedne] = argumenty;
      let j = 0;
      let punkty = [];
      for (const typ of typy) {
        if (typ === OPS.rectangle) {
          const [x, y, w, h] = wspolrzedne.slice(j, j + 4);
          zapisz([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
          j += 4;
        } else if (typ === OPS.moveTo || typ === OPS.lineTo) {
          if (typ === OPS.moveTo) {
            zapisz(punkty);
            punkty = [];
          }
          punkty.push([wspolrzedne[j], wspolrzedne[j + 1]]);
          j += 2;
        } else if (typ === OPS.closePath) {
          zapisz(punkty);
          punkty = [];
        } else {
          // Jeśli ścieżka zawiera krzywą, nie jest granicą komórki.
          punkty = [];
          j += typ === OPS.curveTo ? 6 : 4;
        }
      }
      zapisz(punkty);
    }
  }
  return wynik;
}
