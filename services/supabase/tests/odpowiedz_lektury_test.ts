import { assertEquals } from "jsr:@std/assert";
import { ETYKIETA_OGOLNA, ProcesorOdpowiedzi } from "../functions/ai/odpowiedz-lektury.ts";
import type { Material } from "../functions/ai/material-lektury.ts";

const wydarzenie = (id: string, miejsce: string, tekst: string): Material => ({
  id, rodzaj: "wydarzenie", tekst, zrodlo: { id, miejsce, tytul: "Lalka", url: "https://wolnelektury.pl/katalog/lektura/lalka/", rodzaj: "utwór" },
});

Deno.test("etykieta dotyczy pojedynczego zdania i ustępuje prawidłowemu identyfikatorowi", () => {
  const procesor = new ProcesorOdpowiedzi([
    wydarzenie("W2", "t. II, rozdz. 3", "W Paryżu Wokulski spotyka profesora Geista."),
    wydarzenie("W3", "t. II, rozdz. 14", "Wokulski wysiada w Skierniewicach."),
  ], { pytanie: "", zapisPriorytetu: false });
  procesor.dodaj("Wokulski spotkał w Paryżu profesora Geista. [OW]");
  procesor.dodaj(`[W2] Kupił wtedy duży dom na przedmieściach [W999]. W rozdz. 14 wysiada w Skierniewicach [OW][W3] ${ETYKIETA_OGOLNA}.`);
  assertEquals(procesor.zakoncz(),
    `Wokulski spotkał w Paryżu profesora Geista. [[zrodlo:1]] Kupił wtedy duży dom na przedmieściach. ${ETYKIETA_OGOLNA} W rozdz. 14 wysiada w Skierniewicach [[zrodlo:2]].`);
  assertEquals(procesor.zrodla().map((z) => z.id), ["W2", "W3"]);
  assertEquals(procesor.zrodla()[0].twierdzenie, "[1] Wokulski spotkał w Paryżu profesora Geista.");
});

Deno.test("cytat z kilku zdań zachowuje oryginalny tekst przy jednym odsyłaczu", () => {
  const tekst = "Pierwsze i drugie zdanie cytatu. Tu jest jego ciąg dalszy.";
  const procesor = new ProcesorOdpowiedzi([{
    id: "F42", rodzaj: "fragment", tekst,
    zrodlo: { id: "F42", tytul: "Utwór", url: "https://wolnelektury.pl/katalog/lektura/", rodzaj: "utwór" },
  }], { pytanie: "", zapisPriorytetu: false });
  procesor.dodaj(`„${tekst}” [F42].`);
  assertEquals(procesor.zakoncz(), `„${tekst}” [[zrodlo:1]].`);
  assertEquals(procesor.zrodla()[0].dowod, tekst);
});
