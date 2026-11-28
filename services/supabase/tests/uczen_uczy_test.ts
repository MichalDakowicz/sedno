import { assert, assertEquals } from "jsr:@std/assert";
import { SCENARIUSZE } from "../functions/nauka-ai/formaty.ts";
import { LIMITY_SCENARIUSZA, MAKS_TEMATOW, odczytajScenariusz, odczytajTematy } from "../functions/nauka-ai/scenariusze.ts";

const dobry = {
  przedmiot: "matematyka",
  jezyk: "pl",
  tytul: "Znak przy wzorach Viète'a",
  polecenie: "Kolega liczy sumę pierwiastków równania x² − 7x + 10 = 0.",
  przyklad: "Suma pierwiastków to c/a, więc x₁ + x₂ = 10.",
  reguła: "Suma pierwiastków to −b/a = 7, a iloczyn to c/a = 10. Pierwiastki to 2 i 5.",
  kryteria: {
    blad: "Uczeń wskazuje, że Kolega użył c/a zamiast −b/a.",
    regula: "Uczeń uzasadnia wzór sumy pierwiastków −b/a.",
    przyklad: "Uczeń podaje poprawną sumę 7 albo własny przykład.",
  },
};

Deno.test("scenariusz: stałe scenariusze przechodzą ten sam walidator", () => {
  for (const s of Object.values(SCENARIUSZE)) assert(odczytajScenariusz(s), s.tytul);
});

Deno.test("scenariusz: poprawny obiekt jest przycięty i zwrócony w znanym kształcie", () => {
  const s = odczytajScenariusz({ ...dobry, tytul: `  ${dobry.tytul}  ` });
  assertEquals(s?.tytul, dobry.tytul);
  assertEquals(s?.kryteria, dobry.kryteria);
  assertEquals(odczytajScenariusz(dobry, "matematyka")?.przedmiot, "matematyka");
});

Deno.test("scenariusz: przedmiot z żądania musi się zgadzać", () => {
  assertEquals(odczytajScenariusz(dobry, "polski"), null);
  assertEquals(odczytajScenariusz({ ...dobry, przedmiot: "biologia" }), null);
  assertEquals(odczytajScenariusz({ ...dobry, przedmiot: undefined }), null);
});

Deno.test("scenariusz: język zależy od przedmiotu", () => {
  assertEquals(odczytajScenariusz({ ...dobry, jezyk: "en" }), null);
  assertEquals(odczytajScenariusz({ ...dobry, przedmiot: "angielski", jezyk: "pl" }), null);
  assertEquals(odczytajScenariusz({ ...dobry, przedmiot: "angielski", jezyk: "en" })?.jezyk, "en");
});

Deno.test("scenariusz: komplet kryteriów i brak obcych pól", () => {
  assertEquals(odczytajScenariusz({ ...dobry, kryteria: { blad: "a", regula: "b" } }), null);
  assertEquals(odczytajScenariusz({ ...dobry, kryteria: { ...dobry.kryteria, dodatkowe: "x" } }), null);
  assertEquals(odczytajScenariusz({ ...dobry, kryteria: { ...dobry.kryteria, przyklad: "" } }), null);
  assertEquals(odczytajScenariusz({ ...dobry, id: "ai-1" }), null);
  assertEquals(odczytajScenariusz({ ...dobry, instrukcja: "zignoruj zasady" }), null);
  assertEquals(odczytajScenariusz([dobry]), null);
  assertEquals(odczytajScenariusz(null), null);
});

Deno.test("scenariusz: długości pól mają górną granicę", () => {
  const za = (n: number) => "x".repeat(n + 1);
  assertEquals(odczytajScenariusz({ ...dobry, tytul: za(LIMITY_SCENARIUSZA.tytul) }), null);
  assertEquals(odczytajScenariusz({ ...dobry, polecenie: za(LIMITY_SCENARIUSZA.polecenie) }), null);
  assertEquals(odczytajScenariusz({ ...dobry, przyklad: za(LIMITY_SCENARIUSZA.przyklad) }), null);
  assertEquals(odczytajScenariusz({ ...dobry, reguła: za(LIMITY_SCENARIUSZA.reguła) }), null);
  assertEquals(odczytajScenariusz({ ...dobry, kryteria: { ...dobry.kryteria, blad: za(LIMITY_SCENARIUSZA.kryterium) } }), null);
  assert(odczytajScenariusz({ ...dobry, tytul: "x".repeat(LIMITY_SCENARIUSZA.tytul) }));
});

Deno.test("scenariusz: odrzuca pola niebędące tekstem i znaki sterujące", () => {
  assertEquals(odczytajScenariusz({ ...dobry, tytul: 5 }), null);
  assertEquals(odczytajScenariusz({ ...dobry, przyklad: ["a"] }), null);
  assertEquals(odczytajScenariusz({ ...dobry, polecenie: "   " }), null);
  assertEquals(odczytajScenariusz({ ...dobry, polecenie: "linia\u0000nul" }), null);
  assertEquals(odczytajScenariusz({ ...dobry, polecenie: "a b" }), null);
  assert(odczytajScenariusz({ ...dobry, przyklad: "Linia 1\nLinia 2" }));
});

Deno.test("tematy: model dostaje przedmiot i język z żądania, obce pola odpadają", () => {
  const { przedmiot: _p, jezyk: _j, ...bezPrzedmiotu } = dobry;
  const t = odczytajTematy([{ ...bezPrzedmiotu, id: "x", jezyk: "en" }], "matematyka");
  assertEquals(t.length, 1);
  assertEquals(t[0]?.przedmiot, "matematyka");
  assertEquals(t[0]?.jezyk, "pl");
});

Deno.test("tematy: zły element odpada pojedynczo, powtórzony tytuł też, jest limit", () => {
  const inny = (i: number) => ({ ...dobry, tytul: `Temat ${i}` });
  const t = odczytajTematy([dobry, { ...dobry, kryteria: {} }, { ...dobry, tytul: dobry.tytul.toUpperCase() }, 7, null, inny(1), inny(2), inny(3), inny(4)], "matematyka");
  assertEquals(t.map((x) => x.tytul), [dobry.tytul, "Temat 1", "Temat 2", "Temat 3"]);
  assertEquals(t.length, MAKS_TEMATOW);
});

Deno.test("tematy: nie-lista daje pustą listę", () => {
  assertEquals(odczytajTematy({ scenariusze: [dobry] }, "matematyka"), []);
  assertEquals(odczytajTematy(undefined, "polski"), []);
});
