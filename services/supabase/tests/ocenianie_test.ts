import assert from "node:assert/strict";
import { rownaLiczba, zgodnyWynik } from "../functions/nauka-ai/odpowiedzi.ts";
import { wytnijRubryke } from "../functions/nauka-ai/rubryka-cke.ts";
import { katalogWariantow, ocenWariant, SZABLONY } from "../functions/nauka-ai/warianty.ts";

Deno.test("Porównanie wyników zachowuje granice i kolejność pól", () => {
  assert.equal(rownaLiczba("\\frac{3}{4}", "75%"), true);
  assert.equal(rownaLiczba("x = −1,25", "-5/4"), true);
  assert.equal(rownaLiczba("1/0", "0"), null);
  assert.equal(rownaLiczba("9999999999999998", "9999999999999999"), false);
  assert.equal(zgodnyWynik("1 23", "12 3"), false);
  assert.equal(zgodnyWynik("1\n2", "2\n1"), false);
  assert.equal(zgodnyWynik("a) 41498,20 kg", "41498.2"), true);
});

Deno.test("Algorytmiczne klucze można niezależnie sprawdzić dla losowych danych", () => {
  const puste = { tekst: null, kod: null, pola: null };
  for (let i = 0; i < 150; i++) {
    const lin = SZABLONY["rownanie-liniowe"].generuj();
    const wsp = lin.zadanie.polecenie.match(/(\d+)\(x ([+−]) (\d+)\) = (-?\d+)/);
    assert.ok(wsp);
    const x = Number(wsp[4]) / Number(wsp[1]) - (wsp[2] === "+" ? 1 : -1) * Number(wsp[3]);
    assert.equal(ocenWariant(lin.klucz, { ...puste, tekst: String(x) })?.kryteria[0].punkty, 1);
    assert.equal(ocenWariant(lin.klucz, { ...puste, tekst: String(x + 1) })?.kryteria[0].punkty, 0);

    const kw = SZABLONY["rownanie-kwadratowe"].generuj();
    assert.ok(kw.klucz.typ === "korzenie");
    const liczby = kw.zadanie.polecenie.match(/(\d*)x² ([+−]) (\d+)x ([+−]) (\d+)/);
    assert.ok(liczby);
    const [a, b, c] = [Number(liczby[1] || 1), Number(liczby[3]) * (liczby[2] === "+" ? 1 : -1),
      Number(liczby[5]) * (liczby[4] === "+" ? 1 : -1)];
    const [x1, x2] = kw.klucz.wartosci.map(Number);
    assert.notEqual(x1, x2);
    assert.ok([x1, x2].every((r) => a * r ** 2 + b * r + c === 0));
    assert.equal(ocenWariant(kw.klucz, { ...puste, tekst: x2 + "; " + x1 })?.kryteria[0].punkty, 1);
    assert.equal(ocenWariant(kw.klucz, { ...puste, tekst: x1 + "; " + x1 })?.kryteria[0].punkty, 0);

    const algorytm = SZABLONY["algorytm-nwd"].generuj();
    const wejscie = algorytm.zadanie.dane as { a: number; b: number };
    let wspolny = wejscie.b;
    while (wejscie.a % wspolny || wejscie.b % wspolny) wspolny--;
    assert.equal(ocenWariant(algorytm.klucz, { ...puste, tekst: String(wspolny) })?.kryteria[0].punkty, 1);
  }
  assert.deepEqual(new Set(katalogWariantow().map((t) => t.przedmiot)), new Set(["angielski", "matematyka", "informatyka"]));
  assert.equal(katalogWariantow("angielski").length, 3);
});

Deno.test("Punkty częściowe i testy zapytania na kilku zestawach danych", () => {
  const puste = { tekst: null, kod: null, pola: null };
  const arytm = SZABLONY["ciag-arytmetyczny"].generuj();
  assert.equal(arytm.klucz.typ, "pola");
  if (arytm.klucz.typ !== "pola") return;
  const czesciowy = ocenWariant(arytm.klucz, { ...puste, pola: { wyraz: arytm.klucz.wartosci.wyraz } });
  assert.deepEqual(czesciowy?.kryteria.map((k) => k.punkty), [1, 0]);

  const sql = SZABLONY["sql-sumy"].generuj();
  assert.equal(sql.klucz.typ, "sql-sumy");
  if (sql.klucz.typ !== "sql-sumy") return;
  const zapytanie = "SELECT dzial, SUM(kwota) AS suma FROM wydatki WHERE rok = " + sql.klucz.rok + " GROUP BY dzial";
  assert.deepEqual(ocenWariant(sql.klucz, { ...puste, kod: zapytanie + " ORDER BY 1;" })?.kryteria.map((k) => k.punkty), [1, 1]);
  assert.deepEqual(ocenWariant(sql.klucz, { ...puste, kod: zapytanie })?.kryteria.map((k) => k.punkty), [1, 0]);
  const innyRok = zapytanie.replace(String(sql.klucz.rok), String(sql.klucz.rok + 1));
  assert.deepEqual(ocenWariant(sql.klucz, { ...puste, kod: innyRok + " ORDER BY dzial" })?.kryteria.map((k) => k.punkty), [0, 1]);
  assert.equal(ocenWariant(sql.klucz, { ...puste, kod: zapytanie + "; SELECT 1;" }), null);
});

Deno.test("Rubryka pochodzi wyłącznie z odpowiedniego podpunktu z PDF", () => {
  const strony = [
    "Zadanie 2 5 . 1 . (0 – 1)\nZasady oceniania\n1 pkt – poprawnie\n0 pkt – inaczej\nRozwiązanie\nA",
    "Zadanie 2 5 . 2 . (0 – 3)\nZasady oceniania\n3 pkt – całe rozumowanie\n2 pkt – poprawny model",
    "1 pkt – pierwszy krok\n0 pkt – brak rozwiązania\nPrzykładowe rozwiązania\nPrzemyślany przykład.",
    "Zadanie 2 6 . (0 – 4)\nZasady oceniania\n4 pkt – kolejne zadanie\n0 pkt – brak rozwiązania",
  ].join("\n");
  const rubryka = wytnijRubryke(strony, "25.2", 3);
  assert.ok(rubryka);
  assert.match(rubryka.zasady, /2 pkt – poprawny model/);
  assert.doesNotMatch(rubryka.zasady, /kolejne zadanie/);
  assert.equal(rubryka.rozwiazanie, "Przemyślany przykład.");
  assert.equal(wytnijRubryke(strony, "25.2", 4), null);
  assert.equal(wytnijRubryke("Zadanie 4. (0–2)\nZasady oceniania\n2 pkt – rozwiązanie", "4", 2), null);
});

Deno.test("Ostatnia rubryka kończy się przed odrębną częścią PDF", () => {
  const tresc = [
    "Zadanie 3 1 . (0 – 4)\nZasady ocenia nia\n4 pkt – rozwiązanie\n0 pkt – brak",
    "Przykładowe pełne rozwiązanie\nPierwszy i drugi krok.",
    "Ocena prac osób ze stwierdzoną dyskalkulią",
    "Zadanie 31.\nInne kryteria. ".repeat(1300),
  ].join("\n");
  assert.deepEqual(wytnijRubryke(tresc, "31", 4), {
    zasady: "4 pkt – rozwiązanie\n0 pkt – brak", rozwiazanie: "Pierwszy i drugi krok.",
  });
});
