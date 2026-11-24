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
