import assert from "node:assert/strict";
import { CzytnikObiektu, type Zdarzenie } from "../functions/nauka-ai/strumien-json.ts";

function czytajPoZnaku(tekst: string) {
  const czytnik = new CzytnikObiektu(["wskazowka"], ["ksztalty", "dopiski"]);
  const zdarzenia: Zdarzenie[] = [];
  for (const znak of tekst) zdarzenia.push(...czytnik.dopisz(znak));
  return zdarzenia;
}

Deno.test("Czytnik składa wskazówkę z przyrostów i oddaje zamknięte elementy tablic", () => {
  const odpowiedz = {
    stanProwadzenia: "krok",
    wskazowka: "Sprawdź znak w drugim wierszu: \"−\" zamiast \"+\".\nPotem podziel przez 2 — ok?",
    ksztalty: [{ typ: "odcinek", punkty: [[0.1, 0.3], [0.9, 0.3]] }, { typ: "trojkat-prostokatny" }],
    bryla: null,
    dopiski: [{ typ: "obliczenia", tekst: "2x = 10\nx = 10 ÷ 2" }],
    odczyt: "x = 5",
  };
  const zdarzenia = czytajPoZnaku("```json\n" + JSON.stringify(odpowiedz, null, 1) + "\n```");
  const tekst = zdarzenia.flatMap((z) => z.rodzaj === "tekst" ? [z.przyrost] : []).join("");
  assert.equal(tekst, odpowiedz.wskazowka);
  const elementy = zdarzenia.flatMap((z) => z.rodzaj === "element" ? [[z.pole, z.wartosc]] : []);
  assert.deepEqual(elementy, [
    ["ksztalty", odpowiedz.ksztalty[0]],
    ["ksztalty", odpowiedz.ksztalty[1]],
    ["dopiski", odpowiedz.dopiski[0]],
  ]);
  // Wskazówka przychodzi przed pierwszym kształtem.
  assert.ok(zdarzenia.findIndex((z) => z.rodzaj === "element") > zdarzenia.findIndex((z) => z.rodzaj === "tekst"));
});

Deno.test("Czytnik nie dzieli sekwencji ucieczki i pomija pola w innej kolejności", () => {
  const czytnik = new CzytnikObiektu(["wskazowka"], ["ksztalty"]);
  assert.deepEqual(czytnik.dopisz('{"odczyt": {"a": [1, "]"]}, "wskazowka": "a\\'), [
    { pole: "wskazowka", rodzaj: "tekst", przyrost: "a" },
  ]);
  assert.deepEqual(czytnik.dopisz("u00"), []);
  assert.deepEqual(czytnik.dopisz('f3", "ksztalty": [{"typ": "elipsa"'), [
    { pole: "wskazowka", rodzaj: "tekst", przyrost: "ó" },
  ]);
  assert.deepEqual(czytnik.dopisz("}]}"), [{ pole: "ksztalty", rodzaj: "element", wartosc: { typ: "elipsa" } }]);
  assert.deepEqual(czytnik.dopisz(" "), []);
});
