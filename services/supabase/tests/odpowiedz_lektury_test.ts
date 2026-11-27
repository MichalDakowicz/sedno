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

Deno.test("nagłówek porad, lista wskazówek i sugestie do rozprawki nie dostają etykiety", () => {
  const p = new ProcesorOdpowiedzi([], { pytanie: "", zapisPriorytetu: false });
  const tekst = [
    "### Jak to wyjaśnić w rozprawce", "", "1. Teza we wstępie.", "2. Przykład i wniosek w rozwinięciu.", "",
    "Możesz od razu połączyć przykład z tezą.", "", "W rozprawce warto dodać krótkie wyjaśnienie.", "",
    "Jak ująć ten argument? Dobrym początkiem będzie wniosek.", "",
    "Jak to wyjaśnić w rozprawce", "", "- Teza we wstępie.", "",
    "### Fabuła", "", "1. Wokulski kupił nowy dom.",
  ].join("\n");
  assertEquals(p.dodaj(tekst) + p.zakoncz(), tekst + " " + ETYKIETA_OGOLNA);
});

Deno.test("goły identyfikator i identyfikator z miejscem dają karty, obcy znacznik znika", () => {
  const p = new ProcesorOdpowiedzi([
    wydarzenie("W32", "t. II, rozdz. 14", "Wokulski wysiada w Skierniewicach."),
    { ...wydarzenie("F13", "akt II, sc. 2", "Papkin rozmawia z Klarą."), rodzaj: "fragment" },
  ], { pytanie: "", zapisPriorytetu: false });
  const tekst = "Wokulski wysiada w Skierniewicach W32.\n\n" +
    "Papkin rozmawia z Klarą [F13, akt 2, sc. 2].\n\n" +
    "Papkin rozmawia z Klarą F13 (akt II, sc. 2).\n\n" +
    "Zdanie bez materiału [F999, miejsce nieznane] \x60W888\x60 i [F12345]";
  let wynik = "";
  for (let i = 0; i < tekst.length; i += 7) wynik += p.dodaj(tekst.slice(i, i + 7));
  wynik += p.zakoncz();
  assertEquals(wynik.split("\n\n"), [
    "Wokulski wysiada w Skierniewicach [[zrodlo:1]].",
    "Papkin rozmawia z Klarą [[zrodlo:2]].",
    "Papkin rozmawia z Klarą [[zrodlo:2]].",
    "Zdanie bez materiału. " + ETYKIETA_OGOLNA,
  ]);
  assertEquals(p.zrodla().map((z) => z.miejsce), ["t. II, rozdz. 14", "akt II, sc. 2"]);
});

Deno.test("zgodność miejsca uwzględnia zakres scen w elemencie", () => {
  const m = wydarzenie("W2", "akt II, sc. 1–3", "Działanie opisane w kilku scenach.");
  const procesor = new ProcesorOdpowiedzi([m], { pytanie: "", zapisPriorytetu: false });
  const tekst = procesor.dodaj("Scena ta przypada na akt II, sc. 3 [W2].") + procesor.zakoncz();
  assertEquals(tekst, "Scena ta przypada na akt II, sc. 3 [[zrodlo:1]].");
});

Deno.test("zdanie o pamiętniku Rzeckiego potrzebuje zgodnego materiału dla każdego rozdziału", () => {
  const materialy = [
    wydarzenie("W1", "t. I, rozdz. 3", "Pamiętnik starego subiekta."),
    wydarzenie("W2", "t. I, rozdz. 10", "Pamiętnik starego subiekta."),
    wydarzenie("W3", "t. II, rozdz. 15", "Pamiętnik starego subiekta."),
  ];
  const zdanie = "Pamiętnik Rzeckiego pojawia się w tomie I, rozdz. 3 i 10 oraz w tomie II, rozdz. 15";
  const p = new ProcesorOdpowiedzi(materialy, { pytanie: "", zapisPriorytetu: false });
  const odpowiedz = p.dodaj(zdanie + " [W1].\n\n" + zdanie + " [W1][W2][W3].") + p.zakoncz();
  assertEquals(odpowiedz.split("\n\n"), [
    zdanie + ". " + ETYKIETA_OGOLNA,
    zdanie + " [[zrodlo:1]][[zrodlo:2]][[zrodlo:3]].",
  ]);
  assertEquals(p.zrodla().map((z) => z.id), ["W1", "W2", "W3"]);

  const odwrocony = new ProcesorOdpowiedzi(materialy, { pytanie: "", zapisPriorytetu: false });
  const tylkoPierwszyTom = "Pamiętnik Rzeckiego pojawia się w rozdz. 3 i 10 tomu I";
  const zlyTom = "Pamiętnik Rzeckiego pojawia się w rozdz. 3 i 10 tomu II";
  const wynik = odwrocony.dodaj(tylkoPierwszyTom + " [W1][W2].\n\n" + zlyTom + " [W1][W2][W3].") + odwrocony.zakoncz();
  assertEquals(wynik.split("\n\n"), [
    tylkoPierwszyTom + " [[zrodlo:1]][[zrodlo:2]].",
    zlyTom + ". " + ETYKIETA_OGOLNA,
  ]);
});

Deno.test("jedna karta dla strony opracowania zachowuje dowody wyłącznie dla wspartych zdań", () => {
  const url = "https://zpe.gov.pl/a/prezentacja-multimedialna/DOPFL0ddG";
  const materialy = [
    wydarzenie("W1", "cz. I, Praca", "Więźniowie pracują przy wyrębie lasu."),
    wydarzenie("W2", "cz. II, Głód", "Narrator opisuje niedożywienie więźniów."),
  ];
  materialy.forEach((m, i) => {
    m.zrodlo = { ...m.zrodlo!, rodzaj: "opracowanie", url: i ? url + "/?tryb=cwiczenia#glod" : url };
  });
  const p = new ProcesorOdpowiedzi(materialy, { pytanie: "", zapisPriorytetu: false });
  const odpowiedz = p.dodaj(
    "Więźniowie pracują przy wyrębie lasu [W1].\n\nNarrator opisuje niedożywienie więźniów [W2].\n\n" +
    "Narrator opisuje niedożywienie więźniów w 1947 roku [W2].\n\n" +
    "Narrator ucieka łodzią z obozu razem z Kostylewem [W2].\n\n" +
    "Narrator nie opisuje niedożywienia więźniów [W2].\n\n" +
    "Więźniowie w obozie są stale niedożywieni, o czym narrator pisze wprost [W2].",
  ) + p.zakoncz();
  assertEquals(odpowiedz.split("\n\n"), [
    "Więźniowie pracują przy wyrębie lasu [[zrodlo:1]].",
    "Narrator opisuje niedożywienie więźniów [[zrodlo:1]].",
    "Narrator opisuje niedożywienie więźniów w 1947 roku. " + ETYKIETA_OGOLNA,
    "Narrator ucieka łodzią z obozu razem z Kostylewem. " + ETYKIETA_OGOLNA,
    "Narrator nie opisuje niedożywienia więźniów. " + ETYKIETA_OGOLNA,
    // Parafraza własnymi słowami zachowuje źródło.
    "Więźniowie w obozie są stale niedożywieni, o czym narrator pisze wprost [[zrodlo:1]].",
  ]);
  assertEquals(p.zrodla().length, 1);
  const [karta] = p.zrodla();
  assertEquals([karta.url, karta.miejsce], [url, undefined]);
  assertStringIncludes(karta.dowod!, materialy[1].tekst);
  assert(!karta.twierdzenie?.includes("1947"));
  assert(!karta.twierdzenie?.includes("ucieka"));
  assertStringIncludes(karta.twierdzenie!, "stale niedożywieni");
  assert(!karta.twierdzenie?.includes("nie opisuje"));
});

Deno.test("usuwa łączniki między odsyłaczami i domyka zdanie po odrzuceniu identyfikatora", () => {
  const p = new ProcesorOdpowiedzi([
    wydarzenie("W1", "t. I, rozdz. 1", "Kupcy rozmawiają w jadłodajni."),
  ], { pytanie: "", zapisPriorytetu: false });
  const odpowiedz = p.dodaj(
    "Kupcy rozmawiają w jadłodajni [W1]– [W1].\n\n" +
    "Kupcy rozmawiają w jadłodajni [W1] – [W99].\n\n" +
    "Kolejna informacja kończy się na przykładzie – [W999]\n\n" +
    "Osobna wzmianka o rozdz. 4–5 [4]– [4].",
  ) + p.zakoncz();
  const zdania = odpowiedz.split("\n\n");
  assertEquals(zdania[0], "Kupcy rozmawiają w jadłodajni [[zrodlo:1]].");
  assertEquals(zdania[1], "Kupcy rozmawiają w jadłodajni [[zrodlo:1]].");
  assertEquals(zdania[2], "Kolejna informacja kończy się na przykładzie. " + ETYKIETA_OGOLNA);
  assertEquals(zdania[3], "Osobna wzmianka o rozdz. 4–5 [4]. " + ETYKIETA_OGOLNA);
});

Deno.test("odsyłacz do fragmentu tekstu wymaga zgodnego miejsca albo słów z fragmentu", () => {
  const fragment: Material = {
    id: "F2", rodzaj: "fragment", miejsce: "t. II, rozdz. 3",
    tekst: "Wokulski przyjechał do Paryża i spotkał tam profesora Geista, który opowiadał o swoich wynalazkach.",
    zrodlo: { id: "F2", miejsce: "t. II, rozdz. 3", tytul: "Lalka", url: "https://wolnelektury.pl/katalog/lektura/lalka/", rodzaj: "utwór" },
  };
  const przetworz = (zdanie: string) => {
    const procesor = new ProcesorOdpowiedzi([fragment], { pytanie: "", zapisPriorytetu: false });
    const wynik = procesor.dodaj(`${zdanie}\n`) + procesor.zakoncz();
    return { wynik, zrodla: procesor.zrodla().length };
  };
  assertEquals(przetworz("Wokulski spotkał w Paryżu profesora Geista [F2].").zrodla, 1);
  assertEquals(przetworz("W t. II, rozdz. 3 Wokulski jedzie do Paryża [F2].").zrodla, 1);
  // Wymyślona scena z prawdziwym identyfikatorem: bez zgodnego miejsca i bez wspólnych słów nie dostaje karty źródła.
  assertEquals(przetworz("Wokulski toczy pojedynek z baronem na dziedzińcu zamku [F2].").zrodla, 0);
  assertEquals(przetworz("W t. I, rozdz. 5 Wokulski zabija Rzeckiego [F2].").zrodla, 0);
});

Deno.test("interpretacja własnymi słowami i zaznaczona niepewność nie dostają etykiety, konkret bez źródła dostaje", () => {
  const p = new ProcesorOdpowiedzi([
    wydarzenie("W3", "t. II, rozdz. 14", "W pociągu do Krakowa Wokulski wysiada w Skierniewicach i rzuca się pod pociąg, a ratuje go dróżnik Wysocki."),
  ], { pytanie: "", zapisPriorytetu: false });
  const odpowiedz = p.dodaj([
    "Ta scena pokazuje, jak bardzo bohater jest rozdarty między marzeniem a rzeczywistością.",
    "Wokulski kupuje kamienicę Łęckich.",
    "Prawdopodobnie Wokulski kupuje też weksle Łęckiego, ale sprawdź to w tekście.",
    "Na stacji w Skierniewicach bohater wyskakuje z wagonu i kładzie się na torach, skąd wyciąga go dróżnik [W3].",
  ].join("\n\n")) + p.zakoncz();
  assertEquals(odpowiedz.split("\n\n"), [
    "Ta scena pokazuje, jak bardzo bohater jest rozdarty między marzeniem a rzeczywistością.",
    "Wokulski kupuje kamienicę Łęckich. " + ETYKIETA_OGOLNA,
    "Prawdopodobnie Wokulski kupuje też weksle Łęckiego, ale sprawdź to w tekście.",
    "Na stacji w Skierniewicach bohater wyskakuje z wagonu i kładzie się na torach, skąd wyciąga go dróżnik [[zrodlo:1]].",
  ]);
});

Deno.test("zdanie przeczące materiałowi traci źródło mimo wspólnych słów", () => {
  const m = wydarzenie("W22", "epilog", "Rozmówca prosi narratora o zrozumienie, ale narrator odmawia podania mu ręki.");
  const p = new ProcesorOdpowiedzi([m], { pytanie: "", zapisPriorytetu: false });
  const odpowiedz = p.dodaj("Na koniec narrator podaje rozmówcy rękę [W22].\n\nNarrator nie podaje rozmówcy ręki [W22].") + p.zakoncz();
  assertEquals(odpowiedz.split("\n\n"), [
    "Na koniec narrator podaje rozmówcy rękę. " + ETYKIETA_OGOLNA,
    "Narrator nie podaje rozmówcy ręki [[zrodlo:1]].",
  ]);
});
