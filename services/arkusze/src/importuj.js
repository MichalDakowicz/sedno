// Przetwarza pobrane PDF-y CKE (data/cke/katalog.json z pobierz.js) na pliki
// JSON dla aplikacji: data/arkusze/<id>.json oraz data/arkusze/index.json.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { KATALOG_CKE, KATALOG_ARKUSZY } from "./sciezki.js";
import { tekstPdf } from "./tekst.js";
import { parsujArkusz } from "./arkusz.js";
import { parsujKlucz } from "./klucz.js";
import { scal } from "./scal.js";

const MIESIACE = { "05": "maj", "06": "czerwiec", "08": "sierpień" };

await mkdir(KATALOG_ARKUSZY, { recursive: true });
const katalog = JSON.parse(await readFile(join(KATALOG_CKE, "katalog.json"), "utf8"));
const tylko = process.argv[2]; // np. „2015” albo „2015-2019”: tylko pasujące wpisy (do testów)
const indeks = [];

for (const w of katalog) {
  if (!w.arkusz) continue;
  if (tylko && !`${w.formula}-${w.rok}-${w.poziom}`.startsWith(tylko)) continue;
  const sesja = MIESIACE[w.miesiac ?? "05"] ?? "maj";
  // Identyfikatory formuły 2023 zostają bez dopisku, żeby nie zgubić zapisanych postępów.
  const id = `angielski-${w.poziom}-${w.rok}-${sesja}${w.formula === "2015" ? "-formula-2015" : ""}`;
  process.stdout.write(`${id} … `);

  try {
    const strony = await tekstPdf(join(KATALOG_CKE, w.arkusz.plik));
    const metadane = czytajMetadane(strony.slice(0, 2));
    const zadania = parsujArkusz(strony);
    const klucz = w.zasady ? parsujKlucz(await tekstPdf(join(KATALOG_CKE, w.zasady.plik))) : {};
    const { ostrzezenia } = scal(zadania, klucz);
    if (!w.zasady) ostrzezenia.unshift("brak pliku zasad oceniania");

    const pytania = zadania.flatMap((z) => z.pytania);
    const sumaPunktow = pytania.reduce((s, q) => s + q.punkty, 0);
    if (metadane.punkty && sumaPunktow !== metadane.punkty) ostrzezenia.push(`suma punktów ${sumaPunktow} ≠ ${metadane.punkty}`);

    const plik = w.arkusz.plik.split("/").pop();
    const arkusz = {
      id,
      przedmiot: "angielski",
      formula: w.formula,
      poziom: w.poziom,
      rok: w.rok,
      sesja,
      symbol: plik.replace(/(-A)?(-\d{4})?(-arkusz)?\.pdf$/, "").replace(/_1[PA]-\d{3}$/, ""),
      ...metadane,
      punkty: metadane.punkty ?? sumaPunktow,
      ...(w.nagranie ? { nagranie: w.nagranie } : {}),
      zrodlo: { arkusz: w.arkusz.plik, zasady: w.zasady?.plik ?? null },
      pdf: { arkusz: w.arkusz.url, zasady: w.zasady?.url ?? null },
      ostrzezenia,
      zadania,
    };
    await writeFile(join(KATALOG_ARKUSZY, `${id}.json`), JSON.stringify(arkusz, null, 1));
    indeks.push({
      id,
      przedmiot: arkusz.przedmiot,
      formula: w.formula,
      poziom: w.poziom,
      rok: w.rok,
      sesja,
      symbol: arkusz.symbol,
      czas: arkusz.czas,
      punkty: arkusz.punkty,
      zadan: zadania.length,
      pytan: pytania.length,
      ostrzezen: ostrzezenia.length,
    });
    console.log(`${zadania.length} zadań, ${pytania.length} pytań, ${sumaPunktow}/${metadane.punkty ?? "?"} pkt${ostrzezenia.length ? `, ostrzeżenia: ${ostrzezenia.slice(0, 4).join("; ")}${ostrzezenia.length > 4 ? ` (+${ostrzezenia.length - 4})` : ""}` : ""}`);
  } catch (e) {
    console.log(`BŁĄD: ${e.message}`);
  }
}

// Przy imporcie części katalogu dopisujemy do istniejącego indeksu.
const stary = tylko ? JSON.parse(await readFile(join(KATALOG_ARKUSZY, "index.json"), "utf8").catch(() => "[]")) : [];
const wszystkie = [...stary.filter((a) => !indeks.some((n) => n.id === a.id)), ...indeks];
wszystkie.sort((a, b) => b.rok - a.rok || (b.formula ?? "2023").localeCompare(a.formula ?? "2023") || a.poziom.localeCompare(b.poziom));
await writeFile(join(KATALOG_ARKUSZY, "index.json"), JSON.stringify(wszystkie, null, 1));
console.log(`Zapisano ${indeks.length} arkuszy do ${KATALOG_ARKUSZY}`);

function czytajMetadane(strony) {
  const tekst = strony.flat().map((l) => l.s).join("\n");
  const liczba = (r) => {
    const m = tekst.match(r);
    return m ? Number(m[1]) : undefined;
  };
  return {
    czas: liczba(/CZAS (?:TRWANIA|PRACY):?\s*(\d+)\s*minut/i) ?? liczba(/Czas pracy:?\s*(\d+)\s*minut/i),
    punkty: liczba(/LICZBA PUNKTÓW DO UZYSKANIA:?\s*(\d+)/i) ?? liczba(/Liczba punktów do uzyskania:?\s*(\d+)/i),
    data: tekst.match(/DATA:?\s*(\d{1,2} \S+ \d{4})/i)?.[1],
  };
}
