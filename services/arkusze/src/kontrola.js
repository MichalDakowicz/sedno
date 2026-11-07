// Kontrola spójności zaimportowanych arkuszy (data/arkusze/*.json):
// każde pytanie ma klucz i miejsce w treści, luki wskazują istniejące
// pytania, litery klucza są wśród możliwych odpowiedzi.
// Użycie: node src/kontrola.js  (kod wyjścia 1, gdy są błędy)
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { KATALOG_ARKUSZY } from "./sciezki.js";

const pliki = (await readdir(KATALOG_ARKUSZY)).filter((p) => p.endsWith(".json") && p !== "index.json");
const indeks = JSON.parse(await readFile(join(KATALOG_ARKUSZY, "index.json"), "utf8"));
let bledy = 0;
let pytan = 0;

for (const plik of pliki.sort()) {
  const a = JSON.parse(await readFile(join(KATALOG_ARKUSZY, plik), "utf8"));
  const problemy = [];
  if (!indeks.some((w) => w.id === a.id)) problemy.push("brak w index.json");
  if (!a.pdf?.arkusz || !a.pdf?.zasady) problemy.push("brak adresu PDF");
  if (!a.nagranie) problemy.push("brak nagrania");

  const suma = a.zadania.reduce((s, z) => s + z.pytania.reduce((t, q) => t + q.punkty, 0), 0);
  if (suma !== a.punkty) problemy.push(`suma punktów ${suma} ≠ ${a.punkty}`);

  for (const z of a.zadania) {
    const nr = new Set(z.pytania.map((q) => q.nr));
    if (nr.size !== z.pytania.length) problemy.push(`zad. ${z.nr}: powtórzone numery pytań`);
    const wBlokach = new Set(z.bloki.flatMap((b) => (b.typ === "pytanie" ? [b.nr] : b.typ === "pytania" || b.typ === "tabela" ? b.nr : [])));
    const teksty = [...z.bloki.map((b) => b.tekst ?? ""), ...z.pytania.map((q) => q.tresc ?? "")].join(" ");
    const luki = new Set([...teksty.matchAll(/\{\{(\d+\.\d+)\}\}/g)].map((m) => m[1]));
    for (const l of luki) if (!nr.has(l)) problemy.push(`zad. ${z.nr}: luka {{${l}}} bez pytania`);

    for (const q of z.pytania) {
      pytan++;
      if (!wBlokach.has(q.nr) && !luki.has(q.nr)) problemy.push(`${q.nr}: pytania nie ma w treści`);
      if (q.typ === "zamkniete") {
        if (!q.litery?.includes(q.poprawna)) problemy.push(`${q.nr}: poprawna ${q.poprawna} spoza ${q.litery?.join("")}`);
        if (q.opcje && q.opcje.length !== q.litery.length) problemy.push(`${q.nr}: ${q.opcje.length} opcji, ${q.litery.length} liter`);
      } else if (q.typ === "otwarte") {
        if (!q.oczekiwane?.length && !q.akceptowane?.length) problemy.push(`${q.nr}: brak odpowiedzi w kluczu`);
        // Pytanie otwarte z własnym blokiem musi mieć gdzie wpisać odpowiedź.
        const doklejone = (q.akceptowane ?? []).concat(q.oczekiwane ?? []).filter((s) => s.split(" ").length > 14);
        if (doklejone.length) problemy.push(`${q.nr}: podejrzanie długa odpowiedź w kluczu`);
      } else if (q.typ !== "wypowiedz") problemy.push(`${q.nr}: nieznany typ ${q.typ}`);
    }
  }

  if (problemy.length) {
    bledy += problemy.length;
    console.log(`✗ ${a.id}`);
    for (const p of problemy) console.log(`    ${p}`);
  } else console.log(`✓ ${a.id}`);
}

console.log(`\n${pliki.length} arkuszy, ${pytan} pytań, ${bledy} problemów`);
process.exitCode = bledy ? 1 : 0;
