// Pobiera ze strony CKE arkusze, zasady oceniania i adresy nagrań
// z języka angielskiego (formuła 2023) do data/cke/<rok>/.
// Pliki CKE nie trafiają do repozytorium (prawa autorskie), patrz .gitignore.
import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { KATALOG_CKE } from "./sciezki.js";

const STRONA = "https://cke.gov.pl/egzamin-maturalny/egzamin-maturalny-w-formule-2023/arkusze/";
// Podstawowa forma arkusza: MJAP-P0-100, MJAP-R0-100, MJAA-D0-100 (wersja A).
// Nazwy plików różnią się między latami (np. MJAP-P0-100-2305.pdf, MJAP-P0-100-A-2405-arkusz.pdf).
const PLIK = /\/(MJA[PA]-[PRD]0-100(?:-A)?-\d{4}(?:-arkusz)?\.pdf|MJA[PA]-[PRD]0-100[-\w]*-\d{4}(?:_[-\w]+)?-zasady\.pdf|MJA[PA]?-[PRD]0?-100[-\w]*\.mp3)$/;

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

const glowna = await pobierzTekst(STRONA);
const lata = [...new Set([...glowna.matchAll(/href="([^"]*\/arkusze\/(\d{4})-2\/)"/g)].map((m) => m[1].replace(/^http:/, "https:")))];
console.log(`Strony lat: ${lata.length}`);

for (const strona of lata) {
  const rok = strona.match(/(\d{4})-2\/$/)[1];
  const html = await pobierzTekst(strona);
  const linki = [...new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/^http:/, "https:")))].filter((h) => PLIK.test(h));
  const katalog = join(KATALOG_CKE, rok);
  await mkdir(katalog, { recursive: true });
  const nagrania = {};
  for (const url of linki) {
    const nazwa = url.split("/").pop();
    if (nazwa.endsWith(".mp3")) {
      // Nagrań nie pobieramy, aplikacja odtwarza je ze strony CKE.
      const poziom = url.match(/poziom_(podstawowy|rozszerzony|dwujezyczny)/)?.[1];
      if (poziom) nagrania[poziom] ??= url;
      continue;
    }
    const cel = join(katalog, nazwa);
    if (await istnieje(cel)) continue;
    const odp = await fetch(url);
    if (!odp.ok) {
      console.warn(`  ! ${odp.status} ${url}`);
      continue;
    }
    await writeFile(cel, Buffer.from(await odp.arrayBuffer()));
    console.log(`  ${rok}/${nazwa}`);
  }
  await writeFile(join(katalog, "nagrania.json"), JSON.stringify(nagrania, null, 2));
  console.log(`${rok}: ${linki.filter((u) => u.endsWith(".pdf")).length} PDF, nagrania: ${Object.keys(nagrania).join(", ") || "brak"}`);
}
