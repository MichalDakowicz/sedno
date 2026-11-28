import { assertEquals } from "jsr:@std/assert";
import { celWewnetrzny, odczytajElementUi, rozdzielUi } from "../functions/_shared/pestka-ui.ts";

const FENCE = "```";
const blok = (json: unknown) => `${FENCE}sedno-ui\n${JSON.stringify(json)}\n${FENCE}`;
const quiz = { typ: "quiz", pytanie: "Które zdanie jest poprawne?", opcje: ["A zdanie", "B zdanie", "C zdanie"], poprawna: "B", wyjasnienie: "Bo present perfect." };

Deno.test("cele: tylko znane trasy aplikacji", () => {
  for (const ok of [
    "/umiejetnosci", "/nauka/wypracowanie", "/nauka/runda?umiejetnosc=present-perfect",
    "/arkusze/matematyka-podstawowy-2026-maj", "/arkusze/matematyka-podstawowy-2026-maj#zadanie-3", "/arkusze/fizyka-rozszerzony-2026-maj?omow=1",
  ]) assertEquals(celWewnetrzny(ok), ok);
  for (const zle of [
    "https://example.com", "//example.com/a", "javascript:alert(1)", "/profil", "/nauka/runda", "/nauka/runda?poziom=podstawowy", "/nauka/runda?umiejetnosc=a&x=1", "/nauka/runda?umiejetnosc=%3Cscript%3E",
    "/nauka/runda#a", "/umiejetnosci?x=1", "/arkusze/AB", "/arkusze/abc/../x", "/arkusze/abc-def#cos", "/arkusze/abc-def?omow=2", 42, null,
  ]) assertEquals(celWewnetrzny(zle), null);
});

Deno.test("quiz: poprawna jako litera albo indeks, w granicach opcji", () => {
  assertEquals(odczytajElementUi(quiz), { typ: "quiz", pytanie: quiz.pytanie, opcje: quiz.opcje, poprawna: 1, wyjasnienie: quiz.wyjasnienie });
  assertEquals(odczytajElementUi({ ...quiz, poprawna: 2 })?.typ, "quiz");
  assertEquals(odczytajElementUi({ ...quiz, poprawna: "D" }), null);
  assertEquals(odczytajElementUi({ ...quiz, opcje: ["tylko jedna"] }), null);
  assertEquals(odczytajElementUi({ ...quiz, wyjasnienie: "" }), null);
  assertEquals(odczytajElementUi({ ...quiz, opcje: ["a", 2] }), null);
});

Deno.test("kroki, fiszki i wykres: granice liczby i długości", () => {
  assertEquals(odczytajElementUi({ typ: "kroki", kroki: ["jeden"] }), null);
  assertEquals(odczytajElementUi({ typ: "kroki", tytul: "Delta", kroki: ["a", "b"] }), { typ: "kroki", tytul: "Delta", kroki: ["a", "b"] });
  assertEquals(odczytajElementUi({ typ: "fiszki", karty: [{ przod: "x", tyl: "y" }, { przod: "z" }] }), null);
  assertEquals(odczytajElementUi({ typ: "fiszki", karty: [{ przod: "x", tyl: "y" }, { przod: "z", tyl: "w" }] })?.typ, "fiszki");
  const dane = [{ etykieta: "mar", wartosc: 40 }, { etykieta: "kwi", wartosc: 55 }];
  assertEquals(odczytajElementUi({ typ: "wykres", rodzaj: "linia", dane, jednostka: "%" })?.typ, "wykres");
  assertEquals(odczytajElementUi({ typ: "wykres", rodzaj: "kolo", dane }), null);
  assertEquals(odczytajElementUi({ typ: "wykres", rodzaj: "slupki", dane: [{ etykieta: "a", wartosc: -1 }, ...dane] }), null);
  assertEquals(odczytajElementUi({ typ: "wykres", rodzaj: "slupki", dane: [{ etykieta: "a", wartosc: "5" }, ...dane] }), null);
});

Deno.test("akcje: przycisk z obcym adresem odrzuca cały element", () => {
  const dobry = { etykieta: "Zacznij rundę", cel: "/nauka/runda?umiejetnosc=present-perfect" };
  assertEquals(odczytajElementUi({ typ: "akcje", przyciski: [dobry] })?.typ, "akcje");
  assertEquals(odczytajElementUi({ typ: "akcje", przyciski: [dobry, { etykieta: "x", cel: "https://evil.example" }] }), null);
  assertEquals(odczytajElementUi({ typ: "akcje", przyciski: [] }), null);
});

Deno.test("odpowiedź: tekst bez bloku i najwyżej dwa elementy", () => {
  const akcje = { typ: "akcje", przyciski: [{ etykieta: "Mapa", cel: "/umiejetnosci" }] };
  const wynik = rozdzielUi(`Zacznijmy.\n${blok({ elementy: [quiz, akcje, quiz] })}\nPowodzenia.`);
  assertEquals(wynik.elementy.map((e) => e.typ), ["quiz", "akcje"]);
  assertEquals(wynik.tekst, "Zacznijmy.\n\nPowodzenia.");
});

Deno.test("odpowiedź: pojedynczy obiekt i lista bez opakowania też działają", () => {
  assertEquals(rozdzielUi(blok(quiz)).elementy.length, 1);
  assertEquals(rozdzielUi(blok([quiz])).elementy.length, 1);
});

Deno.test("odpowiedź: niedokończony blok znika z tekstu w trakcie strumienia", () => {
  assertEquals(rozdzielUi(`Spójrz.\n${FENCE}sedno-ui\n{"typ":"qu`), { tekst: "Spójrz.", elementy: [] });
  assertEquals(rozdzielUi(`Spójrz.\n${FENCE}sedno`).tekst, "Spójrz.");
  assertEquals(rozdzielUi("Zwykły tekst z ```js\nkod\n```").tekst, "Zwykły tekst z ```js\nkod\n```");
});

Deno.test("odpowiedź: nieprawidłowy JSON albo schemat zostawia sam tekst", () => {
  assertEquals(rozdzielUi(`A\n${FENCE}sedno-ui\n{nie json}\n${FENCE}\nB`), { tekst: "A\n\nB", elementy: [] });
  assertEquals(rozdzielUi(blok({ typ: "przycisk-platnosci", cel: "https://evil.example" })).elementy, []);
  assertEquals(rozdzielUi(blok({ ...quiz, opcje: [] })).elementy, []);
});
