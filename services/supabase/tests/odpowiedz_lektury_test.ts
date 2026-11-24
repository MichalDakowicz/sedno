import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { ETYKIETA_OGOLNA, ProcesorOdpowiedzi } from "../functions/ai/odpowiedz-lektury.ts";
import type { Material } from "../functions/ai/material-lektury.ts";

const wydarzenie = (id: string, miejsce: string, tekst: string): Material => ({
  id, rodzaj: "wydarzenie", tekst, zrodlo: { id, miejsce, tytul: "Lalka", url: "https://wolnelektury.pl/katalog/lektura/lalka/", rodzaj: "utwór" },
});

Deno.test("etykieta raz na akapit lub punkt i tylko bez prawidłowego identyfikatora", () => {
  const procesor = new ProcesorOdpowiedzi([
    wydarzenie("W2", "t. II, rozdz. 3", "W Paryżu Wokulski spotyka profesora Geista."),
    wydarzenie("W3", "t. II, rozdz. 14", "Wokulski wysiada w Skierniewicach."),
  ], { pytanie: "", zapisPriorytetu: false });
  const odpowiedz = [
    "Paryż [OW]", "------", "Wokulski spotkał w Paryżu profesora Geista. [OW][W2]",
    "Dodatkowe zdanie w tym samym akapicie.", "",
    "1. Kupił dom [W999].", "   Podobno zamieszkał w nim później. [OW]",
    "2. W rozdz. 14 wysiada w Skierniewicach [2] [OW][W3] [W3][W3] [2].",
  ].join("\n");
  let wynik = "";
  for (let i = 0; i < odpowiedz.length; i += 6) wynik += procesor.dodaj(odpowiedz.slice(i, i + 6));
  wynik += procesor.zakoncz();
  assertEquals(wynik, [
    "Paryż", "------", "Wokulski spotkał w Paryżu profesora Geista. [[zrodlo:1]]",
    "Dodatkowe zdanie w tym samym akapicie.", "",
    "1. Kupił dom.", `   Podobno zamieszkał w nim później. ${ETYKIETA_OGOLNA}`,
    "2. W rozdz. 14 wysiada w Skierniewicach [[zrodlo:2]].",
  ].join("\n"));
  assertEquals(procesor.zrodla().map((z) => z.id), ["W2", "W3"]);
});

Deno.test("cytat wierszowany i blok cytatu nie dostają etykiet między wersami", () => {
  const tekst = "Pierwsze i drugie zdanie cytatu.\nTu jest jego ciąg dalszy.\n\nNastępna strofa ma jeden wers.";
  const procesor = new ProcesorOdpowiedzi([{
    id: "F42", rodzaj: "fragment", tekst,
    zrodlo: { id: "F42", tytul: "Utwór", url: "https://wolnelektury.pl/katalog/lektura/", rodzaj: "utwór" },
  }], { pytanie: "", zapisPriorytetu: false });
  const strumien = procesor.dodaj(`### Cytat [OW]\n\n„${tekst} [F42]” [F42].\n\n> Pierwszy wers bloku.\n>\n> Drugi wers bloku. [OW]`);
  const wynik = strumien + procesor.zakoncz();
  assertEquals(wynik, `### Cytat\n\n„${tekst}” [[zrodlo:1]].\n\n> Pierwszy wers bloku.\n>\n> Drugi wers bloku.`);
  assertEquals(procesor.zrodla()[0].dowod, tekst);
});

Deno.test("ważna karta ugruntowuje cały akapit, a sąsiednie numerki nie powtarzają się", () => {
  const procesor = new ProcesorOdpowiedzi([{ id: "K", rodzaj: "karta", tekst: "Karta utworu." }], { pytanie: "", zapisPriorytetu: false });
  const wynik = procesor.dodaj("Pierwsze zdanie. [K]\nDrugie zdanie. [OW]\n\nTwierdzenie bez materiału. [3] [3] [3] [999]") + procesor.zakoncz();
  assertStringIncludes(wynik, "Pierwsze zdanie.\nDrugie zdanie.\n\n");
  assertStringIncludes(wynik, "Twierdzenie bez materiału. [3] [999] " + ETYKIETA_OGOLNA);
  assert(!wynik.includes("[3] [3]"));
});

Deno.test("odrzuca kartę z innego rozdziału pomimo wspólnych słów i nie przenosi źródeł między zdaniami", () => {
  const procesor = new ProcesorOdpowiedzi([
    wydarzenie("W31", "t. I, rozdz. 3", "Rzecki zapisuje w pamiętniku swoje przemyślenia."),
    wydarzenie("W1", "t. I, rozdz. 1", "Kupcy rozmawiają w jadłodajni o interesach Wokulskiego."),
  ], { pytanie: "", zapisPriorytetu: false });
  const wynik = procesor.dodaj(
    "Rzecki zapisuje w pamiętniku swoje przemyślenia w t. II, rozdz. 15. [W31]\n\n" +
    "Kupcy rozmawiają w jadłodajni o Wokulskim. [W1] Wokulski rozmawia z Wysockim [W1].",
  ) + procesor.zakoncz();
  assertEquals(wynik.split("\n\n")[0],
    `Rzecki zapisuje w pamiętniku swoje przemyślenia w t. II, rozdz. 15. ${ETYKIETA_OGOLNA}`);
  assertEquals(wynik.split("\n\n")[1], "Kupcy rozmawiają w jadłodajni o Wokulskim. [[zrodlo:1]] Wokulski rozmawia z Wysockim.");
  assertEquals(procesor.zrodla().map((z) => z.twierdzenie), ["[1] Kupcy rozmawiają w jadłodajni o Wokulskim."]);
});

Deno.test("źródło opracowania wymaga treści w materiale mimo zgodności miejsca", () => {
  const m = wydarzenie("W2", "cz. II, Głód", "Narrator opisuje niedożywienie więźniów.");
  m.zrodlo = { ...m.zrodlo!, rodzaj: "opracowanie", url: "https://zpe.gov.pl/a/przeczytaj/DYOHC1uNy" };
  const procesor = new ProcesorOdpowiedzi([m], { pytanie: "", zapisPriorytetu: false });
  const wynik = procesor.dodaj(
    "W cz. II narrator ucieka łodzią z obozu [W2].\n\nW cz. II narrator opisuje niedożywienie więźniów [W2].",
  ) + procesor.zakoncz();
  assertEquals(wynik.split("\n\n"), [
    `W cz. II narrator ucieka łodzią z obozu. ${ETYKIETA_OGOLNA}`,
    "W cz. II narrator opisuje niedożywienie więźniów [[zrodlo:1]].",
  ]);
  assertEquals(procesor.zrodla()[0]?.rodzaj, "opracowanie");
});

Deno.test("polecenia i pytania do ucznia nie mają etykiety wiedzy ogólnej", () => {
  const procesor = new ProcesorOdpowiedzi([], { pytanie: "", zapisPriorytetu: false });
  const tekst = "Spróbuj napisać 3–4 zdania.\n\nTeraz zastanów się nad motywem. Jak go odczytujesz?\n\n1. Wybierz przykład.\n2. Napisz krótką tezę.";
  assertEquals(procesor.dodaj(tekst) + procesor.zakoncz(), tekst);
});

Deno.test("zgodność miejsca uwzględnia zakres scen w elemencie", () => {
  const m = wydarzenie("W2", "akt II, sc. 1–3", "Działanie opisane w kilku scenach.");
  const procesor = new ProcesorOdpowiedzi([m], { pytanie: "", zapisPriorytetu: false });
  const tekst = procesor.dodaj("Scena ta przypada na akt II, sc. 3 [W2].") + procesor.zakoncz();
  assertEquals(tekst, "Scena ta przypada na akt II, sc. 3 [[zrodlo:1]].");
});
