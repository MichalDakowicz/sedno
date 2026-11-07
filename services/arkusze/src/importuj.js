// Przetwarza pobrane PDF-y CKE na pliki JSON dla aplikacji:
// data/arkusze/<id>.json oraz data/arkusze/index.json.
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { KATALOG_CKE, KATALOG_ARKUSZY } from "./sciezki.js";
import { tekstPdf } from "./tekst.js";
import { parsujArkusz } from "./arkusz.js";
import { parsujKlucz } from "./klucz.js";
import { scal } from "./scal.js";

const POZIOMY = { P: "podstawowy", R: "rozszerzony", D: "dwujezyczny" };
const MIESIACE = { "05": "maj", "06": "czerwiec", "08": "sierpień" };

await mkdir(KATALOG_ARKUSZY, { recursive: true });
const indeks = [];

for (const rok of (await readdir(KATALOG_CKE)).sort()) {
  const katalog = join(KATALOG_CKE, rok);
  const pliki = await readdir(katalog);
  const nagrania = JSON.parse(await readFile(join(katalog, "nagrania.json"), "utf8").catch(() => "{}"));
  const adresy = JSON.parse(await readFile(join(katalog, "adresy.json"), "utf8").catch(() => "{}"));
  for (const plik of pliki.filter((p) => /^MJA[PA]-[PRD]0-100(-A)?-\d{4}(-arkusz)?\.pdf$/.test(p))) {
    const [, kodPoziomu, sesja] = plik.match(/^MJA[PA]-([PRD])0-100(?:-A)?-(\d{4})/);
    const poziom = POZIOMY[kodPoziomu];
    const plikKlucza = pliki.find((p) => p.startsWith(`MJA${kodPoziomu === "D" ? "A" : "P"}-${kodPoziomu}0-100`) && p.includes(sesja) && p.endsWith("-zasady.pdf"));
    const id = `angielski-${poziom}-${rok}-${MIESIACE[sesja.slice(2)] ?? sesja.slice(2)}`;
    process.stdout.write(`${id} … `);

    const strony = await tekstPdf(join(katalog, plik));
    const metadane = czytajMetadane(strony[0]);
    const zadania = parsujArkusz(strony);
    const klucz = plikKlucza ? parsujKlucz(await tekstPdf(join(katalog, plikKlucza))) : {};
    const { ostrzezenia } = scal(zadania, klucz);
    if (!plikKlucza) ostrzezenia.unshift("brak pliku zasad oceniania");

    const pytania = zadania.flatMap((z) => z.pytania);
    const sumaPunktow = pytania.reduce((s, q) => s + q.punkty, 0);
    if (metadane.punkty && sumaPunktow !== metadane.punkty) ostrzezenia.push(`suma punktów ${sumaPunktow} ≠ ${metadane.punkty}`);

    const arkusz = {
      id,
      przedmiot: "angielski",
      poziom,
      rok: Number(rok),
      sesja: MIESIACE[sesja.slice(2)] ?? sesja.slice(2),
      symbol: plik.replace(/(-A)?-\d{4}(-arkusz)?\.pdf$/, ""),
      ...metadane,
      punkty: metadane.punkty ?? sumaPunktow,
      ...(nagrania[poziom] ? { nagranie: nagrania[poziom] } : {}),
      zrodlo: { arkusz: plik, zasady: plikKlucza ?? null },
      pdf: { arkusz: adresy[plik] ?? null, zasady: (plikKlucza && adresy[plikKlucza]) ?? null },
      ostrzezenia,
      zadania,
    };
    await writeFile(join(KATALOG_ARKUSZY, `${id}.json`), JSON.stringify(arkusz, null, 1));
    indeks.push({
      id,
      przedmiot: arkusz.przedmiot,
      poziom,
      rok: arkusz.rok,
      sesja: arkusz.sesja,
      symbol: arkusz.symbol,
      czas: arkusz.czas,
      punkty: arkusz.punkty,
      zadan: zadania.length,
      pytan: pytania.length,
      ostrzezen: ostrzezenia.length,
    });
    console.log(`${zadania.length} zadań, ${pytania.length} pytań, ${sumaPunktow}/${metadane.punkty ?? "?"} pkt${ostrzezenia.length ? `, ostrzeżenia: ${ostrzezenia.join("; ")}` : ""}`);
  }
}

indeks.sort((a, b) => b.rok - a.rok || a.poziom.localeCompare(b.poziom));
await writeFile(join(KATALOG_ARKUSZY, "index.json"), JSON.stringify(indeks, null, 1));
console.log(`Zapisano ${indeks.length} arkuszy do ${KATALOG_ARKUSZY}`);

function czytajMetadane(strona) {
  const tekst = strona.map((l) => l.s).join("\n");
  const liczba = (r) => {
    const m = tekst.match(r);
    return m ? Number(m[1]) : undefined;
  };
  return {
    czas: liczba(/CZAS (?:TRWANIA|PRACY):?\s*(\d+)\s*minut/i),
    punkty: liczba(/LICZBA PUNKTÓW DO UZYSKANIA:?\s*(\d+)/i),
    data: tekst.match(/DATA:?\s*(\d{1,2} \S+ \d{4})/)?.[1],
  };
}
