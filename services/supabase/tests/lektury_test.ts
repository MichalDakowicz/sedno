import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { migracjaElementow, sprawdzPlikLektury, wczytajPlikiLektur, wierszeElementow, type PlikLektury } from "../lektury/format.ts";
import { ostatniaWygenerowana, wygenerowane } from "../lektury/generuj.ts";

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
