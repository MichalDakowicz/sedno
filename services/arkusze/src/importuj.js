// Przetwarza pobrane PDF-y CKE (data/cke/katalog.json z pobierz.js) na pliki
// JSON dla aplikacji: data/arkusze/<id>.json oraz data/arkusze/index.json.
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { KATALOG_CKE, KATALOG_ARKUSZY, KATALOG_NAGRAN } from "./sciezki.js";
import { tekstPdf } from "./tekst.js";
import { parsujArkusz } from "./arkusz.js";
import { parsujKlucz } from "./klucz.js";
import { scal } from "./scal.js";
import { przypiszWymagania } from "./wymagania.js";
import { fragmentyMatematyki, kadruj, kluczMatematyki, osadzObrazy, otworzPdf, zadaniaMatematyki } from "./matematyka.js";
import { czytajDocx, fragmentyDocx } from "./docx.js";
import { fragmentyInformatyki, kluczInformatyki, plikiDanych, zadaniaInformatyki } from "./informatyka.js";
import { skladajTresc } from "./tresc-pdf.js";
import { importujPisemny } from "./arkusz-pisemny.js";
import { identyfikator, MIESIACE, terminMiesiaca } from "./sesje.js";
import { uzupelnijKluczAngielskiego } from "./angielski.js";
import { oznaczRysowanie } from "./rysowanie.js";

// Fragmenty nagrań dopasowane do pytań (services/arkusze/nagrania/dopasuj.py) leżą osobno,
// żeby ponowny import ich nie kasował: { "1.1": { od, do, tekst }, … }.
async function doklejFragmenty(id, pytania) {
  let fragmenty;
  try {
    fragmenty = JSON.parse(await readFile(join(KATALOG_NAGRAN, `${id}-fragmenty.json`), "utf8"));
  } catch {
    return;
  }
  for (const q of pytania) if (fragmenty[q.nr]) q.fragment = fragmenty[q.nr];
}

// Ręczne poprawki ramek rysunków bazowych (matematyka.js).
const POPRAWKI_RYSUNKOW = JSON.parse(await readFile(new URL("../rysunki.json", import.meta.url), "utf8"));
const POPRAWKI_RYSOWANIA = JSON.parse(await readFile(new URL("../rysowanie.json", import.meta.url), "utf8"));

await mkdir(KATALOG_ARKUSZY, { recursive: true });
const katalog = JSON.parse(await readFile(join(KATALOG_CKE, "katalog.json"), "utf8"));
// Np. „2015”, „angielski-2015” albo „matematyka”: tylko pasujące wpisy (do testów).
const prefiksy = process.argv.slice(2);
const indeks = [];
let bledyImportu = 0;

for (const w of katalog) {
  const przedmiot = w.przedmiot ?? "angielski";
  const miesiac = Number(w.miesiac ?? 5);
  const termin = w.termin ?? terminMiesiaca(w.rok, miesiac);
  const sesja = w.sesja ?? MIESIACE[miesiac - 1] ?? "maj";
  const id = identyfikator({ ...w, przedmiot, termin, sesja });
  const klucze = [id, [przedmiot, w.formula, w.rok, w.poziom].join("-"), [w.formula, w.rok, w.poziom].join("-")];
  if (prefiksy.length && !prefiksy.some((p) => klucze.some((k) => k.startsWith(p)))) continue;
  process.stdout.write(`${id} … `);

  try {
    if (!w.arkusz) throw new Error("brak PDF arkusza w katalogu");
    const sciezka = join(KATALOG_CKE, w.arkusz.plik);
    const glowny2023 = termin === "glowny" && w.formula === "2023" && w.rok >= 2023 && w.rok <= 2026;
    const staraMatematyka = glowny2023 && przedmiot === "matematyka" && w.poziom === "podstawowy";
    const staraInformatyka = glowny2023 && przedmiot === "informatyka";
    const wspolnyParser = przedmiot !== "angielski" && !staraMatematyka && !staraInformatyka;
    const strony = await tekstPdf(sciezka, { fonty: wspolnyParser, naprawKodowanie: wspolnyParser });
    const metadane = czytajMetadane(strony.slice(0, 2), wspolnyParser);
    const obrazy = { katalog: join(KATALOG_ARKUSZY, "obrazy", id), prefiks: "obrazy/" + id };
    let zadania, ostrzezenia, dane;
    let pokrycieWymagan = "";
    if (przedmiot === "informatyka" && w.dane) dane = { zip: w.dane.url, pliki: await plikiDanych(join(KATALOG_CKE, w.dane.plik)) };
    if (staraMatematyka) {
      const fragmenty = fragmentyMatematyki(strony);
      // Treść ze wzorami z formy DOCX; kadry zostają dla zadań, których nie da się z niej wziąć.
      const docx = w.tresc ? fragmentyDocx(await czytajDocx(join(KATALOG_CKE, w.tresc.plik))) : null;
      // Kadry i rysunki to wycinki arkusza CKE, więc lądują obok JSON-ów w data/.
      const pdf = await otworzPdf(sciezka);
      let kadry;
      try {
        await kadruj(pdf, fragmenty, {
          ...obrazy,
          poprawki: POPRAWKI_RYSUNKOW[id],
          zRysunkiem: new Set((docx ?? []).filter((d) => d.bloki.some((b) => b.typ === "miejsceRysunku")).map((d) => d.nr)),
        });
        const klucz = w.zasady ? kluczMatematyki(await tekstPdf(join(KATALOG_CKE, w.zasady.plik))) : {};
        ({ zadania, ostrzezenia, kadry } = zadaniaMatematyki(fragmenty, klucz, docx));
        await oznaczRysowanie(pdf, zadania, fragmenty, obrazy, POPRAWKI_RYSOWANIA[id]);
      } finally {
        await pdf.destroy();
      }
      // Arkusz trafia do bazy (npm run wgraj) jako jeden JSON, więc obrazy jadą w nim jako data URL.
      await osadzObrazy(zadania, KATALOG_ARKUSZY);
      if (kadry.length) process.stdout.write(`kadry: ${kadry.join("; ")} … `);
    } else if (staraInformatyka) {
      // Treść z PDF z krojami pisma (pogrubienie, kursywa, Courier), żeby złożyć ją jako tekst.
      const fragmenty = fragmentyInformatyki(await tekstPdf(join(KATALOG_CKE, w.arkusz.plik), { fonty: true }));
      const pdf = await otworzPdf(join(KATALOG_CKE, w.arkusz.plik));
      await kadruj(pdf, fragmenty, { katalog: join(KATALOG_ARKUSZY, "obrazy", id), prefiks: `obrazy/${id}`, bezRysunkow: true, format: "webp" });
      const tresc = await skladajTresc(pdf, fragmenty, { katalog: join(KATALOG_ARKUSZY, "obrazy", id), prefiks: `obrazy/${id}` });
      process.stdout.write(`tekstem ${tresc.tekstem}, kadrem ${tresc.kadrem} … `);
      const klucz = w.zasady ? kluczInformatyki(await tekstPdf(join(KATALOG_CKE, w.zasady.plik))) : {};
      if (!dane) ostrzezenia = ["brak plików danych"];
      const wynik = zadaniaInformatyki(fragmenty, klucz, dane?.pliki);
      zadania = wynik.zadania;
      ostrzezenia = [...(ostrzezenia ?? []), ...wynik.ostrzezenia];
      await osadzObrazy(zadania, KATALOG_ARKUSZY);
    } else if (wspolnyParser) {
      const stronyKlucza = w.zasady ? await tekstPdf(join(KATALOG_CKE, w.zasady.plik), { fonty: true, naprawKodowanie: true }) : [];
      const docx = w.tresc ? fragmentyDocx(await czytajDocx(join(KATALOG_CKE, w.tresc.plik))) : undefined;
      const pdf = await otworzPdf(sciezka);
      let mapa, kadry;
      try {
        if (w.mapa) mapa = await otworzPdf(join(KATALOG_CKE, w.mapa.plik));
        ({ zadania, ostrzezenia, kadry } = await importujPisemny(pdf, strony, stronyKlucza, w, metadane, obrazy, docx, dane, mapa, POPRAWKI_RYSOWANIA[id]));
      } finally {
        await Promise.all([pdf.destroy(), mapa?.destroy()]);
      }
      if (kadry.length) process.stdout.write("kadry (" + kadry.length + "): " + kadry.map((k) => k.nr + " s. " + k.strona + " " + k.powod).join("; ") + " … ");
      if (przedmiot === "informatyka" && w.czesc !== "Część 1" && !dane) ostrzezenia.push("brak plików danych");
      if (metadane.punkty === undefined) ostrzezenia.push("brak sumy punktów na stronie tytułowej w tekście PDF");
      await osadzObrazy(zadania, KATALOG_ARKUSZY);
    } else {
      zadania = parsujArkusz(strony);
      const sciezkaKlucza = w.zasady && join(KATALOG_CKE, w.zasady.plik);
      const stronyKlucza = sciezkaKlucza ? await tekstPdf(sciezkaKlucza) : [];
      ({ ostrzezenia } = scal(zadania, parsujKlucz(stronyKlucza)));
      if (termin !== "glowny" || w.formula === "2015" && w.rok > 2023) uzupelnijKluczAngielskiego(stronyKlucza, zadania, ostrzezenia);
      if (przedmiot === "angielski" && w.formula === "2023") {
        const pytania = zadania.flatMap((z) => z.pytania);
        const brak = sciezkaKlucza ? await przypiszWymagania(sciezkaKlucza, stronyKlucza, zadania) : pytania.map((p) => p.nr);
        if (brak.length) ostrzezenia.push(`brak wymagań CKE (${brak.length}): ${brak.join(", ")}`);
        pokrycieWymagan = `, wymagania CKE ${pytania.length - brak.length}/${pytania.length}`;
      }
    }
    if (!w.zasady) ostrzezenia.unshift("brak pliku zasad oceniania");

    const pytania = zadania.flatMap((z) => z.pytania);
    if (!pytania.length) throw new Error("arkusz bez pytań");
    await doklejFragmenty(id, pytania);
    const sumaPunktow = pytania.reduce((s, q) => s + q.punkty, 0);
    if (metadane.punkty && sumaPunktow !== metadane.punkty) ostrzezenia.push(`suma punktów ${sumaPunktow} ≠ ${metadane.punkty}`);

    const plik = w.arkusz.plik.split("/").pop();
    const arkusz = {
      id,
      przedmiot,
      formula: w.formula,
      poziom: w.poziom,
      rok: w.rok,
      sesja,
      termin,
      ...(w.czesc && { czesc: w.czesc }),
      symbol: plik.replace(/(-A)?(-\d{4})?(-arkusz)?\.pdf$/, "").replace(/_1[PA]-\d{3}$/, ""),
      ...metadane,
      punkty: metadane.punkty ?? sumaPunktow,
      ...(w.nagranie ? { nagranie: w.nagranie } : {}),
      zrodlo: { arkusz: w.arkusz.plik, zasady: w.zasady?.plik ?? null },
      pdf: { arkusz: w.arkusz.url, zasady: w.zasady?.url ?? null },
      ...(dane ? { dane } : {}),
      ostrzezenia,
      zadania,
    };
    await zapiszJson(join(KATALOG_ARKUSZY, `${id}.json`), arkusz);
    indeks.push({
      id,
      przedmiot: arkusz.przedmiot,
      formula: w.formula,
      poziom: w.poziom,
      rok: w.rok,
      sesja,
      termin,
      ...(w.czesc && { czesc: w.czesc }),
      symbol: arkusz.symbol,
      czas: arkusz.czas,
      punkty: arkusz.punkty,
      zadan: zadania.length,
      pytan: pytania.length,
      ostrzezen: ostrzezenia.length,
    });
    console.log(`${zadania.length} zadań, ${pytania.length} pytań, ${sumaPunktow}/${metadane.punkty ?? "?"} pkt${pokrycieWymagan}${ostrzezenia.length ? `, ostrzeżenia: ${ostrzezenia.slice(0, 4).join("; ")}${ostrzezenia.length > 4 ? ` (+${ostrzezenia.length - 4})` : ""}` : ""}`);
  } catch (e) {
    bledyImportu++;
    console.log(`BŁĄD: ${e.message}`);
  }
}

// Pełne wgranie usuwa arkusze nieobecne w indeksie. Publikujemy go tylko po udanym imporcie.
if (bledyImportu || !indeks.length) {
  console.error(`Nie zaktualizowano indeksu: ${bledyImportu ? `błędy importu (${bledyImportu})` : "brak pasujących arkuszy"}.`);
  process.exitCode = 1;
} else {
  // Przy imporcie części katalogu dopisujemy do istniejącego indeksu.
  const stary = prefiksy.length ? JSON.parse(await readFile(join(KATALOG_ARKUSZY, "index.json"), "utf8").catch((e) => {
    if (e.code === "ENOENT") return "[]";
    throw e;
  })) : [];
  const wszystkie = [...stary.filter((a) => !indeks.some((n) => n.id === a.id)), ...indeks];
  wszystkie.sort((a, b) => b.rok - a.rok || (b.formula ?? "2023").localeCompare(a.formula ?? "2023") || a.poziom.localeCompare(b.poziom));
  await zapiszJson(join(KATALOG_ARKUSZY, "index.json"), wszystkie);
  console.log(`Zapisano ${indeks.length} arkuszy do ${KATALOG_ARKUSZY}`);
}

async function zapiszJson(plik, dane) {
  const tymczasowy = `${plik}.${process.pid}.tmp`;
  await writeFile(tymczasowy, JSON.stringify(dane, null, 1));
  await rename(tymczasowy, plik);
}

function czytajMetadane(strony, wspolnyParser) {
  const tekst = strony.flat().map((l) => l.s).join("\n");
  const testy = wspolnyParser ? [...tekst.matchAll(/LICZBA PUNKTÓW DO UZYSKANIA ZA TEST (?:JĘZYK POLSKI W UŻYCIU|HISTORYCZNOLITERACKI):\s*(\d+)/gi)] : [];
  const liczba = (r) => {
    const m = tekst.match(r);
    return m ? Number(m[1]) : undefined;
  };
  return {
    czas: liczba(/CZAS (?:TRWANIA|PRACY):?\s*(\d+)\s*minut/i) ?? liczba(/Czas pracy:?\s*(\d+)\s*minut/i),
    punkty: liczba(/LICZBA PUNKTÓW DO UZYSKANIA:?\s*(\d+)/i) ?? (testy.length === 2 ? Number(testy[0][1]) + Number(testy[1][1]) : undefined) ?? (wspolnyParser
      ? liczba(/LICZBA PUNKTÓW DO UZYSKANIA ZA (?:ARKUSZ [12]\.?|CZĘŚ(?:Ć|CI) [123]\.?|WYPRACOWANIE|TEST)[^:\n]*:\s*(\d+)/i)
        ?? liczba(/(?:ŁĄCZNIE|ZA ROZWIĄZANIE ZADAŃ)\s*(\d+)\s*(?:PKT|PUNKTÓW)/i)
      : undefined),
    data: tekst.match(/DATA:?\s*(\d{1,2} \S+ \d{4})/i)?.[1],
  };
}
