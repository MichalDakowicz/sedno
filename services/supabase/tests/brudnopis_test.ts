import assert from "node:assert/strict";
Deno.env.set("SUPABASE_URL", "http://supabase.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test");

const { wynikBrudnopisu } = await import("../functions/nauka-ai/handler.ts");

const odpowiedz = {
  stanProwadzenia: "blad",
  wskazowka: "Sprawdź znak w drugim wierszu.",
  ksztalty: [{ typ: "odcinek", punkty: [[0.1, 0.3], [0.9, 0.3]] }],
  bryla: { typ: "szescian" },
  dopiski: [{ typ: "obliczenia", tekst: "t = 2x\nsin(3t) − 2 sin(t) = 0" }],
  ramkaBledu: [[0.1, 0.2], [0.6, 0.4]],
  odczyt: "t = 2x",
};

Deno.test("Prowadzenie na żywo nie dopisuje na tablicy kształtów, bryły ani dopisków", () => {
  const wynik = wynikBrudnopisu(odpowiedz, { prowadzenie: true, obraz: undefined });
  assert.deepEqual(wynik.ksztalty, []);
  assert.deepEqual(wynik.dopiski, []);
  assert.equal(wynik.bryla, null);
  assert.equal(wynik.wskazowka, odpowiedz.wskazowka);
  assert.ok(wynik.ramkaBledu);
});

Deno.test("Zwykłe omówienie brudnopisu zachowuje kształty i dopiski", () => {
  const wynik = wynikBrudnopisu({ ...odpowiedz, stanProwadzenia: undefined }, { prowadzenie: false, obraz: undefined });
  assert.equal(wynik.ksztalty.length, 1);
  assert.equal(wynik.dopiski.length, 1);
});
