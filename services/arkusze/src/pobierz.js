// Pobiera ze strony CKE arkusze i zasady oceniania z języka angielskiego
// (formuła 2015 i 2023, wszystkie dostępne lata) i z matematyki na poziomie
// podstawowym i z informatyki (formuła 2023, z plikami danych) do data/cke/<rok>/
// i zapisuje katalog.json z listą arkuszy, kluczy i adresów nagrań.
// Pliki CKE nie trafiają do repozytorium (prawa autorskie), patrz .gitignore.
import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { KATALOG_CKE } from "./sciezki.js";
import { klasyfikuj } from "./pliki.js";

const STRONY_FORMUL = [
  "https://cke.gov.pl/egzamin-maturalny/egzamin-maturalny-w-formule-2023/arkusze/",
  "https://cke.gov.pl/egzamin-maturalny/egzamin-maturalny-w-formule-2015/arkusze/",
];

async function pobierzTekst(url) {
  const odp = await fetch(url);
  if (!odp.ok) throw new Error(`${odp.status} ${url}`);
  return odp.text();
}

async function istnieje(sciezka) {
  try {
    await access(sciezka);
    return true;
  } catch {
    return false;
  }
}

// Część linków na stronie CKE jest względna („/images/…”), więc składamy pełny adres.
const linki = (html, baza) => [...new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => new URL(m[1], baza).href.replace(/^http:/, "https:")))];

// Arkusz z kluczem i nagraniem to jeden wpis katalogu: przedmiot, formuła, rok, poziom.
const katalog = new Map();
const wpis = (k) => {
  const id = `${k.przedmiot}-${k.formula}-${k.rok}-${k.poziom}`;
  if (!katalog.has(id)) katalog.set(id, { przedmiot: k.przedmiot, formula: k.formula, rok: k.rok, poziom: k.poziom });
  return katalog.get(id);
};

for (const stronaFormuly of STRONY_FORMUL) {
  const formula = stronaFormuly.match(/formule-(\d{4})/)[1];
  const lata = linki(await pobierzTekst(stronaFormuly), stronaFormuly).filter((u) => u.startsWith(stronaFormuly) && /\/\d{4}-2\/?$/.test(u));
  for (const strona of lata) {
    const rokStrony = Number(strona.match(/(\d{4})-2\/?$/)[1]);
    let pliki = 0;
    for (const url of linki(await pobierzTekst(strona), strona)) {
      const nazwa = decodeURIComponent(url.split("/").pop());
      const k = klasyfikuj(nazwa);
      if (!k) continue;
      const w = wpis({ ...k, rok: k.rok ?? rokStrony });
      if (k.typ === "nagranie") {
        // Nagrań nie pobieramy, aplikacja odtwarza je ze strony CKE.
        w.nagranie ??= url;
        continue;
      }
      if (w[k.typ]) continue; // pierwsza forma arkusza wygrywa (np. wersja A)
      if (k.miesiac) w.miesiac = k.miesiac;
      const katalogRoku = join(KATALOG_CKE, String(w.rok));
      await mkdir(katalogRoku, { recursive: true });
      const cel = join(katalogRoku, nazwa);
      if (!(await istnieje(cel))) {
        const odp = await fetch(url);
        if (!odp.ok) {
          console.warn(`  ! ${odp.status} ${url}`);
          continue;
        }
        await writeFile(cel, Buffer.from(await odp.arrayBuffer()));
        console.log(`  ${w.rok}/${nazwa}`);
      }
      w[k.typ] = { plik: `${w.rok}/${nazwa}`, url };
      pliki++;
    }
    console.log(`formuła ${formula}, ${rokStrony}: ${pliki} plików`);
  }
}

const lista = [...katalog.values()].sort((a, b) => a.przedmiot.localeCompare(b.przedmiot) || b.rok - a.rok || b.formula.localeCompare(a.formula) || a.poziom.localeCompare(b.poziom));
await writeFile(join(KATALOG_CKE, "katalog.json"), JSON.stringify(lista, null, 1));
const braki = lista.filter((w) => !w.arkusz || !w.zasady).map((w) => `${w.przedmiot}/${w.formula}/${w.rok}/${w.poziom}${w.arkusz ? "" : " bez arkusza"}${w.zasady ? "" : " bez klucza"}`);
console.log(`Katalog: ${lista.length} wpisów`);
for (const b of braki) console.log(`  ! ${b}`);
