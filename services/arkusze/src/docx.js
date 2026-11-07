// Arkusz z matematyki w formie DOCX (CKE publikuje ją jako formę 660, dla
// osób niewidomych). Wzory są tam równaniami Office (OMML), więc w odróżnieniu
// od PDF da się z nich odtworzyć strukturę: ułamki, potęgi, pierwiastki.
// Wynik to fragmenty „Zadanie N.” z blokami treści; tekst ze wzorami inline
// ma wzory w \( … \), wzory w osobnym akapicie są blokami „wzor”.
import { readFile } from "node:fs/promises";
import { DOMParser } from "@xmldom/xmldom";
import { strFromU8, unzipSync } from "fflate";
import { ommlNaLatex } from "./omml.js";

const NAGLOWEK = /^Zadanie (\d+)(?:\.(\d+))?\.(?:\s*\(0[–-](\d+)\))?$/;
const OPCJA = /^([A-D])\.\s*(.*)$/s;

const dzieci = (n) => {
  const w = [];
  for (let c = n?.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) w.push(c);
  return w;
};

export async function czytajDocx(sciezka) {
  const zip = unzipSync(new Uint8Array(await readFile(sciezka)));
  const doc = new DOMParser().parseFromString(strFromU8(zip["word/document.xml"]), "text/xml");
  return doc.getElementsByTagName("w:body")[0];
}

// Forma 660 każe „zapisać” odpowiedź na kartce; w aplikacji uczeń ją wybiera albo wpisuje.
const UJEDNOLICENIA = [
  [/Zapisz właściwą odpowiedź spośród podanych/g, "Wybierz właściwą odpowiedź spośród podanych"],
  [/Zapisz P, jeśli/g, "Wybierz P, jeśli"],
  [/Zapisz po numerach zdań odpowiednie/g, "Wpisz odpowiednie"],
  [/Zapisz odpowiednią/g, "Wpisz odpowiednią"],
  [/\s*-{3,}\s*/g, " …… "],
];
const ujednolic = (s) => UJEDNOLICENIA.reduce((t, [r, z]) => t.replace(r, z), s);

// Części akapitu w kolejności: tekst, wzór, miejsce rysunku.
function czesci(p) {
  const wynik = [];
  const idz = (n) => {
    for (const c of dzieci(n)) {
      switch (c.nodeName) {
        case "w:t":
          wynik.push({ tekst: c.textContent });
          break;
        case "w:tab":
        case "w:br":
          wynik.push({ tekst: " " });
          break;
        case "w:drawing":
        case "w:pict":
        case "mc:AlternateContent":
          wynik.push({ rysunek: true }); // podpisy z pól tekstowych rysunku pomijamy
          break;
        case "w:object":
          wynik.push({ obiekt: true }); // osadzony obiekt (np. stary edytor równań): nie odczytamy
          break;
        case "m:oMathPara":
          for (const m of dzieci(c).filter((x) => x.nodeName === "m:oMath")) wynik.push({ tex: ommlNaLatex(m), blok: true, surowy: m.textContent });
          break;
        case "m:oMath":
          wynik.push({ tex: ommlNaLatex(c), surowy: c.textContent });
          break;
        case "w:rPr":
        case "w:pPr":
          break;
        default:
          idz(c);
      }
    }
  };
  idz(p);
  return wynik;
}

const zlozTekst = (cz) =>
  cz
    .map((c) => (c.tex !== undefined ? (c.tex ? `\\(${c.tex}\\)` : "") : (c.tekst ?? "")))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
const surowyTekst = (cz) => cz.map((c) => c.surowy ?? c.tekst ?? "").join("");

export function fragmentyDocx(body) {
  const fragmenty = [];
  let akt = null;
  for (const el of dzieci(body)) {
    if (el.nodeName === "w:p") {
      const cz = czesci(el);
      const zwykly = surowyTekst(cz).replace(/\s+/g, " ").trim();
      const m = zwykly.match(NAGLOWEK);
      if (m) {
        akt = { zadanie: Number(m[1]), nr: m[2] ? `${m[1]}.${m[2]}` : m[1], punkty: m[3] ? Number(m[3]) : 0, bloki: [], porownanie: "", obiekty: 0 };
        fragmenty.push(akt);
        continue;
      }
      if (!akt) continue;
      if (zwykly === "Koniec") break;
      akt.porownanie += ` ${zwykly}`;
      dodajAkapit(akt, cz);
    } else if (el.nodeName === "w:tbl" && akt) {
      const wiersze = dzieci(el)
        .filter((r) => r.nodeName === "w:tr")
        .map((r) =>
          dzieci(r)
            .filter((c) => c.nodeName === "w:tc")
            .map((c) => {
              const cz = dzieci(c).filter((p) => p.nodeName === "w:p").flatMap((p) => [...czesci(p), { tekst: " " }]);
              akt.porownanie += ` ${surowyTekst(cz)}`;
              return ujednolic(zlozTekst(cz));
            }),
        );
      akt.bloki.push({ typ: "tabelaTresci", wiersze });
    }
  }
  for (const f of fragmenty) uporzadkuj(f);
  return fragmenty;
}

// Dostosowania formy 660, których w zwykłym arkuszu nie ma.
function uporzadkuj(f) {
  // Legenda „Oznaczenia kolumn / Oc – ocena / … / Tabela”: skróty wracają
  // do nagłówka tabeli jako pełne nazwy, a sama legenda znika.
  const i = f.bloki.findIndex((b) => b.typ === "akapit" && /^Oznaczenia (kolumn|wierszy)$/.test(b.tekst));
  if (i >= 0) {
    const skroty = {};
    let j = i + 1;
    for (; j < f.bloki.length && f.bloki[j].typ === "akapit"; j++) {
      const m = f.bloki[j].tekst.match(/^(\S+) – (.+)$/);
      if (m) skroty[m[1]] = m[2][0].toUpperCase() + m[2].slice(1);
      else if (f.bloki[j].tekst !== "Tabela") break;
    }
    const tabela = f.bloki[j];
    if (tabela?.typ === "tabelaTresci") {
      tabela.wiersze = tabela.wiersze.map((w) => w.map((k) => skroty[k] ?? k));
      f.bloki.splice(i, j - i);
    }
  }
  // Rysunek zakotwiczony w akapicie którejś opcji stoi w arkuszu nad opcjami.
  const pierwszaOpcja = f.bloki.findIndex((b) => b.typ === "opcja");
  const rysunek = f.bloki.findIndex((b) => b.typ === "miejsceRysunku");
  if (pierwszaOpcja >= 0 && rysunek > pierwszaOpcja) {
    const [r] = f.bloki.splice(rysunek, 1);
    f.bloki.splice(pierwszaOpcja, 0, r);
  }
}

function dodajAkapit(f, cz) {
  if (cz.some((c) => c.obiekt)) f.obiekty++;
  const rysunek = cz.some((c) => c.rysunek);
  const tresc = cz.filter((c) => !c.rysunek && !c.obiekt);
  const wzory = tresc.filter((c) => c.tex !== undefined && c.tex);
  const reszta = tresc.filter((c) => c.tex === undefined && c.tekst?.trim());
  // Rysunek przed treścią akapitu (w zad. 19 jest zakotwiczony w akapicie opcji D).
  if (rysunek) f.bloki.push({ typ: "miejsceRysunku" });
  if (!wzory.length && !reszta.length) return;
  if (!reszta.length && (wzory.length === 1 || wzory.every((w) => w.blok))) {
    for (const w of wzory) f.bloki.push({ typ: "wzor", tex: w.tex });
    return;
  }
  const tekst = ujednolic(zlozTekst(tresc));
  const o = tekst.match(OPCJA);
  if (o) f.bloki.push({ typ: "opcja", litera: o[1], tresc: o[2].trim() });
  else f.bloki.push({ typ: "akapit", tekst });
}
