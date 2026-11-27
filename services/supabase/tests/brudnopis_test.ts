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

Deno.test("Prowadzenie zachowuje dopiski tylko przy pokazKrok po wcześniejszej wskazówce", () => {
  const dwa = { ...odpowiedz, pokazKrok: true, dopiski: [...odpowiedz.dopiski, ...odpowiedz.dopiski, ...odpowiedz.dopiski] };
  const wynik = wynikBrudnopisu(dwa, { prowadzenie: true, obraz: undefined, poprzedniaWskazowka: true });
  assert.equal(wynik.pokazKrok, true);
  assert.equal(wynik.dopiski.length, 2);
  assert.deepEqual(wynik.ksztalty, []);
  assert.equal(wynik.bryla, null);
});

Deno.test("Prowadzenie odrzuca dopiski przy pokazKrok bez wcześniejszej wskazówki", () => {
  const wynik = wynikBrudnopisu({ ...odpowiedz, pokazKrok: true }, { prowadzenie: true, obraz: undefined, poprzedniaWskazowka: false });
  assert.deepEqual(wynik.dopiski, []);
  assert.equal(wynik.pokazKrok, false);
});

Deno.test("Prowadzenie odrzuca dopiski bez pokazKrok mimo wcześniejszej wskazówki", () => {
  const wynik = wynikBrudnopisu(odpowiedz, { prowadzenie: true, obraz: undefined, poprzedniaWskazowka: true });
  assert.deepEqual(wynik.dopiski, []);
  assert.equal(wynik.pokazKrok, false);
});

Deno.test("Zwykłe omówienie brudnopisu zachowuje kształty i dopiski", () => {
  const wynik = wynikBrudnopisu({ ...odpowiedz, stanProwadzenia: undefined }, { prowadzenie: false, obraz: undefined });
  assert.equal(wynik.ksztalty.length, 1);
  assert.equal(wynik.dopiski.length, 1);
});
