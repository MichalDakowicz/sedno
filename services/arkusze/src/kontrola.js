// Kontrola spójności zaimportowanych arkuszy (data/arkusze/*.json):
// każde pytanie ma klucz i miejsce w treści, luki wskazują istniejące
// pytania, litery klucza są wśród możliwych odpowiedzi. Matematyka: kadry
// i rysunki bazowe istnieją, zadanie otwarte bez wyniku ma stronę w zasadach,
// każdy wzór LaTeX daje się wyrenderować przez KaTeX.
// Użycie: node src/kontrola.js  (kod wyjścia 1, gdy są błędy)
import { access, readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import katex from "katex";
import { KATALOG_ARKUSZY } from "./sciezki.js";
import { identyfikator } from "./sesje.js";

// Dekoder jest dostarczany przez PDF.js i używany też do renderowania arkuszy.
const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = createRequire(require.resolve("pdfjs-dist/package.json"))("@napi-rs/canvas");

async function obrazRysowania({ src, szer, wys } = {}) {
  const dane = typeof src === "string" && src.match(/^data:image\/(png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!dane || !Number.isInteger(szer) || !Number.isInteger(wys) || szer < 1 || wys < 1) return false;
  const bajty = Buffer.from(dane[2], "base64");
  if (bajty.toString("base64") !== dane[2]) return false;
  if (dane[1] === "png" ? bajty.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    : bajty.toString("ascii", 0, 4) !== "RIFF" || bajty.toString("ascii", 8, 12) !== "WEBP") return false;
  const obraz = await loadImage(bajty);
  // Wycinki są renderowane w skali 2, a wymiary zapisujemy w całych punktach PDF.
  if (Math.abs(obraz.width - 2 * szer) > 1 || Math.abs(obraz.height - 2 * wys) > 1) return false;
  const ctx = createCanvas(obraz.width, obraz.height).getContext("2d");
  ctx.drawImage(obraz, 0, 0);
  const { data } = ctx.getImageData(0, 0, obraz.width, obraz.height);
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    for (let k = 0; k < 3; k++) {
      const kolor = data[i + k] * a + 255 * (1 - a);
      min = Math.min(min, kolor);
      max = Math.max(max, kolor);
    }
    if (max - min >= 12) return true;
  }
  return false;
}

// Wszystkie wzory zadania: bloki „wzor” i \( … \) w tekstach, tabelach i opcjach.
function wzory(z) {
  const teksty = [];
  const wynik = [];
  for (const b of z.bloki) {
    if (b.typ === "wzor") wynik.push(b.tex);
    else if (["akapit", "naglowek", "zrodlo"].includes(b.typ)) teksty.push(b.tekst);
    else if (b.typ === "tabelaTresci") teksty.push(...b.wiersze.flat());
    else if (b.typ === "opcje") teksty.push(...b.opcje.map((o) => o.tresc));
  }
  for (const q of z.pytania) teksty.push(q.tresc, ...(q.opcje ?? []).map((o) => o.tresc));
  for (const t of teksty) for (const m of t.matchAll(/\\\((.*?)\\\)/gs)) wynik.push(m[1]);
  return wynik;
}

const pliki = (await readdir(KATALOG_ARKUSZY)).filter((p) => p.endsWith(".json") && p !== "index.json");
const indeks = JSON.parse(await readFile(join(KATALOG_ARKUSZY, "index.json"), "utf8"));
const wpisy = new Map(indeks.map((w) => [w.id, w]));
const nazwyPlikow = new Set(pliki);
const TERMINY = new Set(["glowny", "dodatkowy", "poprawkowy", "probny"]);
const BLOKI = new Set(["akapit", "naglowek", "zrodlo", "kod", "wzor", "rysunek", "tabelaTresci", "kadr", "opcje", "pytanie", "pytania", "tabela"]);
const KROJE = new Set(["b", "i", "m", "sup", "sub"]);
let bledy = 0;
let pytan = 0;
let ostrzezen = 0;
let dlugieOdpowiedzi = 0;
let rysowan = 0;

if (!indeks.length || wpisy.size !== indeks.length) {
  console.log("✗ Pusty indeks lub powtórzone id w index.json");
  bledy++;
}
for (const id of wpisy.keys()) {
  if (nazwyPlikow.has(id + ".json")) continue;
  console.log("✗ Brak pliku z indeksu: " + id);
  bledy++;
}

for (const plik of pliki.sort()) {
  const a = JSON.parse(await readFile(join(KATALOG_ARKUSZY, plik), "utf8"));
  const problemy = [];
  const wpis = wpisy.get(a.id);
  if (!wpis) problemy.push("brak w index.json");
  else for (const pole of ["przedmiot", "formula", "poziom", "rok", "sesja", "termin", "czesc", "punkty"]) {
    if (wpis[pole] !== a[pole]) problemy.push("niezgodne pole z indeksem: " + pole);
  }
  if (!/^[a-z0-9._-]{1,120}$/.test(a.id) || plik !== a.id + ".json" || a.id !== identyfikator(a)) problemy.push("niepoprawne id arkusza");
  if (!TERMINY.has(a.termin) || !a.sesja || a.czesc !== undefined && (typeof a.czesc !== "string" || !a.czesc.trim())) {
    problemy.push("niepoprawny termin, sesja lub część");
  }
  if (!a.pdf?.arkusz || !a.pdf?.zasady) problemy.push("brak adresu PDF");
  if (a.przedmiot === "angielski" && !a.nagranie) problemy.push("brak nagrania");
  const obrazy = a.zadania.flatMap((z) => [
    ...z.bloki.filter((b) => b.typ === "kadr" || b.typ === "rysunek").map((b) => b.obraz.src),
    ...z.bloki.flatMap((b) => (b.obrazy ?? []).map((o) => o.obraz.src)), ...(z.rysunek ? [z.rysunek.src] : []),
  ]);
  for (const src of obrazy) if (!src.startsWith("data:image/")) await access(join(KATALOG_ARKUSZY, src)).catch(() => problemy.push(`brak pliku ${src.slice(0, 60)}`));

  const suma = a.zadania.reduce((s, z) => s + z.pytania.reduce((t, q) => t + q.punkty, 0), 0);
  if (suma !== a.punkty) problemy.push(`suma punktów ${suma} ≠ ${a.punkty}`);
  if (wpis && (wpis.zadan !== a.zadania.length || wpis.pytan !== a.zadania.flatMap((z) => z.pytania).length
    || wpis.ostrzezen !== a.ostrzezenia.length)) problemy.push("niezgodne liczby zadań, pytań lub ostrzeżeń z indeksem");
  ostrzezen += a.ostrzezenia.length;

  for (const z of a.zadania) {
    if (Math.abs(z.punkty - z.pytania.reduce((n, q) => n + q.punkty, 0)) > 1e-8) problemy.push("zad. " + z.nr + ": suma punktów pytań");
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
    for (const b of z.bloki) {
      if (!BLOKI.has(b.typ)) problemy.push("zad. " + z.nr + ": nieznany blok " + b.typ);
      if (b.typ === "tabelaTresci" && b.pytanie) wBlokach.add(b.pytanie);
      if (b.formaty?.some(([od, do_, kroj]) => !Number.isInteger(od) || !Number.isInteger(do_) || od < 0 || do_ <= od
        || do_ > b.tekst.length || !KROJE.has(kroj))) problemy.push("zad. " + z.nr + ": niepoprawny zakres kroju");
    }
    for (const n of wBlokach) if (!nr.has(n)) problemy.push("zad. " + z.nr + ": blok wskazuje nieznane pytanie " + n);
    const teksty = [...z.bloki.map((b) => b.tekst ?? ""), ...z.pytania.map((q) => q.tresc ?? "")].join(" ");
    const luki = new Set([...teksty.matchAll(/\{\{(\d+\.\d+)\}\}/g)].map((m) => m[1]));
    for (const l of luki) if (!nr.has(l)) problemy.push(`zad. ${z.nr}: luka {{${l}}} bez pytania`);

    for (const q of z.pytania) {
      pytan++;
      if (Object.hasOwn(q, "rysowanie")) {
        rysowan++;
        if (!q.rysowanie || q.typ !== "otwarte"
          || !await obrazRysowania(q.rysowanie.obraz).catch(() => false)) {
          problemy.push(q.nr + ": niepoprawny lub pusty obraz do rysowania");
        }
      }
      if (!wBlokach.has(q.nr) && !luki.has(q.nr)) problemy.push(`${q.nr}: pytania nie ma w treści`);
      if (q.typ === "zamkniete") {
        if (!q.litery?.includes(q.poprawna)) problemy.push(`${q.nr}: poprawna ${q.poprawna} spoza ${q.litery?.join("")}`);
        if (q.opcje && q.opcje.length !== q.litery.length) problemy.push(`${q.nr}: ${q.opcje.length} opcji, ${q.litery.length} liter`);
      } else if (q.typ === "otwarte") {
        if (!q.oczekiwane?.length && !q.akceptowane?.length && !q.zasadyStrona) problemy.push(`${q.nr}: brak odpowiedzi w kluczu`);
        // Pytanie otwarte z własnym blokiem musi mieć gdzie wpisać odpowiedź.
        // Wynik z informatyki bywa kilkoma wierszami liczb, więc długość nie świadczy o sklejeniu.
        const doklejone = q.wynik ? [] : (q.akceptowane ?? []).concat(q.oczekiwane ?? []).filter((s) => s.split(" ").length > 14);
        if (doklejone.length) {
          console.log(`! ${a.id} ${q.nr}: podejrzanie długa odpowiedź w kluczu`);
          dlugieOdpowiedzi++;
        }
      } else if (q.typ !== "wypowiedz") problemy.push(`${q.nr}: nieznany typ ${q.typ}`);
    }
  }

  if (problemy.length) {
    bledy += problemy.length;
    console.log(`✗ ${a.id}`);
    for (const p of problemy) console.log(`    ${p}`);
  } else console.log(`✓ ${a.id}`);
}

console.log(`\n${pliki.length} arkuszy, ${pytan} pytań, ${rysowan} do rysowania, ${bledy} problemów, ${ostrzezen} ostrzeżeń importu, ${dlugieOdpowiedzi} podejrzanie długich odpowiedzi`);
process.exitCode = bledy ? 1 : 0;
