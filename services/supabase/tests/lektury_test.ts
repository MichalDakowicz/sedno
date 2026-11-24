import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { migracjaElementow, sprawdzPlikLektury, wczytajPlikiLektur, wierszeElementow, type PlikLektury } from "../lektury/format.ts";
import { ostatniaWygenerowana, wygenerowane } from "../lektury/generuj.ts";
import { kotwiceZHtml, naglowek, podzielTekst, wytnijTresc } from "../lektury/teksty.ts";
import { kotwicaLalki } from "../lektury/kotwice-lalki.ts";

const poprawny = (): PlikLektury => ({
  id: "lalka",
  wydarzenia: [{ nr: 1, miejsce: "t. I, rozdz. 1", kto: ["Rzecki"], gdzie: "sklep", opis: "Rzecki prowadzi sklep." }],
  postacie: [{ imie: "Rzecki", odmiany: ["Rzecki", "Rzeckiego"], rola: "Subiekt.", relacje: "Przyjaciel Wokulskiego.", miejsca: ["t. I, rozdz. 2"] }],
  motywy: [{ motyw: "miłość", przyklad: "Wokulski kocha Izabelę.", miejsce: "t. I, rozdz. 13", cytat: "Za takie szczęście oddam życie" }],
  zrodla: [{ url: "https://wolnelektury.pl/katalog/lektura/lalka/", rodzaj: "utwór", co: "tekst" }],
  do_weryfikacji: [],
});

Deno.test("wszystkie pliki lektur przechodzą walidację", async () => {
  const pliki = await wczytajPlikiLektur();
  assert(pliki.length >= 1);
  const bledy = pliki.flatMap(({ nazwa, dane }) => sprawdzPlikLektury(dane, nazwa));
  assertEquals(bledy, []);
});

Deno.test("najnowsza wygenerowana migracja odpowiada plikom JSON", async () => {
  const ostatnia = await ostatniaWygenerowana();
  assert(ostatnia, "brak wygenerowanej migracji: uruchom lektury/generuj.ts");
  assertEquals(ostatnia.tresc, await wygenerowane(), `${ostatnia.nazwa} jest nieaktualna: uruchom lektury/generuj.ts z nowym numerem`);
});

Deno.test("walidator wykrywa typowe błędy", () => {
  assertEquals(sprawdzPlikLektury(poprawny(), "lalka"), []);
  const zle = (zmien: (p: PlikLektury) => void, nazwa = "lalka") => {
    const p = poprawny();
    zmien(p);
    return sprawdzPlikLektury(p, nazwa).join("\n");
  };
  assertStringIncludes(zle((p) => (p.id = "nie-ma-takiego")), "katalogu");
  assertStringIncludes(zle(() => {}, "zemsta"), "równe nazwie pliku");
  assertStringIncludes(zle((p) => (p.wydarzenia[0].miejsce = " ")), "miejsce");
  assertStringIncludes(zle((p) => p.wydarzenia.push({ ...p.wydarzenia[0] })), "musi rosnąć");
  assertStringIncludes(zle((p) => (p.postacie[0].miejsca = [])), "miejsca");
  assertStringIncludes(zle((p) => (p.motywy[0].miejsce = "")), "miejsce");
  assertStringIncludes(zle((p) => (p.motywy[0].cytat = "jeden dwa trzy cztery pięć sześć siedem osiem dziewięć dziesięć jedenaście dwanaście trzynaście czternaście piętnaście szesnaście")), "więcej niż 15");
  assertStringIncludes(zle((p) => (p.zrodla = [])), "zrodla");
  assertStringIncludes(zle((p) => (p.zrodla[0].url = "http://x")), "https");
  assertStringIncludes(zle((p) => ((p as unknown as Record<string, unknown>).wymysl = 1)), "nieznane pole");
});

Deno.test("cytat jest dozwolony tylko dla utworów z domeny publicznej", () => {
  const p = poprawny();
  p.id = "dzuma";
  assertStringIncludes(sprawdzPlikLektury(p, "dzuma").join("\n"), "domeny publicznej");
  delete p.motywy[0].cytat;
  assertEquals(sprawdzPlikLektury(p, "dzuma"), []);
});

Deno.test("generator rozkłada plik na wiersze i bezpiecznie cytuje dane", () => {
  const p = poprawny();
  p.wydarzenia[0].opis = "Rzecki mówi: 'Bywa'; $1 i \ nie psują SQL.";
  const wiersze = wierszeElementow(p);
  assertEquals(wiersze.map((w) => w.rodzaj), ["wydarzenie", "postac", "motyw", "zrodlo"]);
  assertEquals(wiersze[1].miejsce, "t. I, rozdz. 2");
  const sql = migracjaElementow([p]);
  assertStringIncludes(sql, "delete from private.lektury_elementy where utwor = $lektury$lalka$lektury$;");
  assertStringIncludes(sql, "$1 i");
  p.wydarzenia[0].opis = "znacznik $lektury$ w danych";
  assertStringIncludes(sprawdzPlikLektury(p, "lalka").join("\n"), "znacznik");
});

const tekstProby = [
  "Autor", "", "Tytuł", "", "Tom I", "",
  "I. Początek sprawy", "", "Pierwszy akapit ma kilka słów.", "", "Drugi akapit też.", "",
  "II. Dalsza część", "", "Trzeci akapit.", "",
  "Ten utwór jest w domenie publicznej. Reszta stopki.",
].join("\n");

Deno.test("loader: stopka domeny publicznej jest wymagana, a separator w treści nie ucina tekstu", () => {
  assertEquals(wytnijTresc("Tekst bez stopki"), undefined);
  const z = "Początek\n\n------------------------------------------------ Środek\n\nKoniec\n\n-----\nTa lektura, podobnie jak tysiące innych\n\nTen utwór jest w domenie publicznej.";
  const tresc = wytnijTresc(z)!;
  assertStringIncludes(tresc, "Środek");
  assertStringIncludes(tresc, "Koniec");
  assert(!tresc.includes("Ta lektura"));
});

Deno.test("loader: nagłówki strukturalne dają lokalizację w notacji z README", () => {
  assertEquals(naglowek("VIII. Medytacje"), { poziom: "lisc", etykieta: "rozdz. 8", tytul: "Medytacje" });
  assertEquals(naglowek("SCENA II. IMPROWIZACJA")?.etykieta, "sc. 2");
  assertEquals(naglowek("AKT I")?.etykieta, "akt I");
  assertEquals(naglowek("KSIĘGA IV")?.etykieta, "ks. IV");
  assertEquals(naglowek("CZĘŚĆ III")?.etykieta, "cz. III");
  assertEquals(naglowek("Zwykłe zdanie, które nie jest nagłówkiem."), null);
  assertEquals(naglowek("J. Mincel w sklepie"), null);
});

Deno.test("loader: fragmenty mają lokalizację, kotwicę i limity długości", () => {
  const kotwice = kotwiceZHtml('<h2 id="menu-group-1">Katalog</h2><h3 id="wl-e4">I. Początek sprawy</h3>');
  const f = podzielTekst(wytnijTresc(tekstProby)!, { stronaHtml: "https://wolnelektury.pl/katalog/lektura/x.html", kotwice });
  assertEquals(f.map((x) => x.miejsce), ["t. I, rozdz. 1", "t. I, rozdz. 2"]);
  assertEquals(f[0].url, "https://wolnelektury.pl/katalog/lektura/x.html#wl-e4");
  assertEquals(f[1].url, "https://wolnelektury.pl/katalog/lektura/x.html");
  assertEquals(f.map((x) => x.nr), [1, 2]);
  const dlugi = ["Tom II", "", "I. Długi", "", ...Array.from({ length: 12 }, (_, i) => `${"słowo ".repeat(200)}koniec${i}.`).flatMap((a) => [a, ""])].join("\n");
  const kawalki = podzielTekst(dlugi, { stronaHtml: "https://wolnelektury.pl/katalog/lektura/y.html" });
  assert(kawalki.length > 2);
  for (const k of kawalki) {
    assert(k.slowa <= 800 + 200, `za długi fragment: ${k.slowa}`);
    assertEquals(k.miejsce, "t. II, rozdz. 1");
  }
  assertEquals(kawalki.map((k) => k.czesc), kawalki.map((_, i) => i + 1));
});

Deno.test("loader: wiersze dostają zakres wersów w obrębie księgi", () => {
  const wers = (i: number) => `Litwo, ojczyzno moja numer ${i}`;
  const ksiega = ["KSIĘGA I", "", ...[0, 1, 2].flatMap((s) => [Array.from({ length: 10 }, (_, i) => wers(s * 10 + i)).join("\n"), ""])].join("\n");
  const f = podzielTekst(ksiega, { stronaHtml: "https://wolnelektury.pl/katalog/lektura/z.html" });
  assertEquals(f.length, 1);
  assertEquals(f[0].miejsce, "ks. I, w. 1–30");
});

Deno.test("wszystkie 38 rozdziałów Lalki ma zgodną kotwicę w generatorze i loaderze", async () => {
  const { dane } = (await wczytajPlikiLektur()).find((p) => p.nazwa === "lalka")!;
  const adresy = new Map<string, string>();
  for (const [tom, nazwa, liczba] of [["I", "pierwszy", 20], ["II", "drugi", 18]] as const) {
    const slug = "lalka-tom-" + nazwa;
    const [html, txt] = await Promise.all(["html", "txt"].map((rozszerzenie) =>
      Deno.readTextFile(new URL(`fixtures/${slug}.${rozszerzenie}`, import.meta.url))));
    const stronaHtml = `https://wolnelektury.pl/katalog/lektura/${slug}.html`;
    const fragmenty = podzielTekst(txt, { stronaHtml, kotwice: kotwiceZHtml(html), tom: `t. ${tom}` });
    assertEquals(fragmenty.length, liczba);
    const idZHtml = [...html.matchAll(/<h3 id="(wl-e\d+)"/g)].map((m) => m[1]);
    for (const [i, fragment] of fragmenty.entries()) {
      const miejsce = `t. ${tom}, rozdz. ${i + 1}`;
      const url = `${stronaHtml}#${idZHtml[i]}`;
      assertEquals(fragment.miejsce, miejsce);
      assertEquals(fragment.url, url, miejsce);
      assertEquals(kotwicaLalki(miejsce), url, miejsce);
      adresy.set(miejsce, url);
    }
  }
  assertStringIncludes(adresy.get("t. II, rozdz. 14")!, "#wl-e4032");
  for (const w of wierszeElementow(dane as PlikLektury).filter((w) => w.miejsce)) {
    assert(adresy.has(w.miejsce), w.miejsce);
    assertEquals(w.zrodlo_url, adresy.get(w.miejsce), w.miejsce);
  }
});
