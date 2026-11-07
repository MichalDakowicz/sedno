// Kontrola spójności zaimportowanych arkuszy (data/arkusze/*.json):
// każde pytanie ma klucz i miejsce w treści, luki wskazują istniejące
// pytania, litery klucza są wśród możliwych odpowiedzi. Matematyka: kadry
// i rysunki bazowe istnieją, zadanie otwarte bez wyniku ma stronę w zasadach,
// każdy wzór LaTeX daje się wyrenderować przez KaTeX.
// Użycie: node src/kontrola.js  (kod wyjścia 1, gdy są błędy)
import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import katex from "katex";
import { KATALOG_ARKUSZY } from "./sciezki.js";

// Wszystkie wzory zadania: bloki „wzor” i \( … \) w tekstach, tabelach i opcjach.
function wzory(z) {
  const teksty = [];
  const wynik = [];
  for (const b of z.bloki) {
    if (b.typ === "wzor") wynik.push(b.tex);
    else if (b.typ === "akapit") teksty.push(b.tekst);
    else if (b.typ === "tabelaTresci") teksty.push(...b.wiersze.flat());
    else if (b.typ === "opcje") teksty.push(...b.opcje.map((o) => o.tresc));
  }
  for (const q of z.pytania) teksty.push(...(q.opcje ?? []).map((o) => o.tresc));
  for (const t of teksty) for (const m of t.matchAll(/\\\((.*?)\\\)/gs)) wynik.push(m[1]);
  return wynik;
}

const pliki = (await readdir(KATALOG_ARKUSZY)).filter((p) => p.endsWith(".json") && p !== "index.json");
const indeks = JSON.parse(await readFile(join(KATALOG_ARKUSZY, "index.json"), "utf8"));
let bledy = 0;
let pytan = 0;

for (const plik of pliki.sort()) {
  const a = JSON.parse(await readFile(join(KATALOG_ARKUSZY, plik), "utf8"));
  const problemy = [];
  if (!indeks.some((w) => w.id === a.id)) problemy.push("brak w index.json");
  if (!a.pdf?.arkusz || !a.pdf?.zasady) problemy.push("brak adresu PDF");
  if (a.przedmiot === "angielski" && !a.nagranie) problemy.push("brak nagrania");
  const obrazy = a.zadania.flatMap((z) => [...z.bloki.filter((b) => b.typ === "kadr" || b.typ === "rysunek").map((b) => b.obraz.src), ...(z.rysunek ? [z.rysunek.src] : [])]);
  for (const src of obrazy) await access(join(KATALOG_ARKUSZY, src)).catch(() => problemy.push(`brak pliku ${src}`));

  const suma = a.zadania.reduce((s, z) => s + z.pytania.reduce((t, q) => t + q.punkty, 0), 0);
  if (suma !== a.punkty) problemy.push(`suma punktów ${suma} ≠ ${a.punkty}`);

  for (const z of a.zadania) {
    for (const tex of wzory(z)) {
      try {
        katex.renderToString(tex, { throwOnError: true, strict: "ignore" });
      } catch (e) {
        problemy.push(`zad. ${z.nr}: wzór ${tex.slice(0, 40)}: ${e.message.slice(0, 60)}`);
      }
    }
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
        if (!q.oczekiwane?.length && !q.akceptowane?.length && !q.zasadyStrona) problemy.push(`${q.nr}: brak odpowiedzi w kluczu`);
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
