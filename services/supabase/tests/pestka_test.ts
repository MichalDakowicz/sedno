import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { odczytajOdpowiedzPestki, zatwierdzPowierzchnie } from "../functions/_shared/pestka-odpowiedz.ts";
import {
  czyPytanieOLekturze, metadaneCzatu, odpowiedzWeryfikacji, przygotujCzat, prosiOZapisPriorytetu, weryfikuj, wydarzeniaZPytania,
} from "../functions/ai/pestka.ts";
import { typPytania, utworPytania, zawieraCytat } from "../functions/ai/lektury.ts";
import { kartaLektury, okno, type Material } from "../functions/ai/material-lektury.ts";
import { BRAK_MATERIALU, ETYKIETA_OGOLNA, FiltrCzatu, POMINIETO, ProcesorOdpowiedzi } from "../functions/ai/odpowiedz-lektury.ts";
import { KATALOG_LEKTUR } from "../functions/ai/katalog-lektur.ts";

const fragment = "W Zemście Rejent polecił murarzom naprawić mur, co zaostrza spór między sąsiadami.";
const dowod = "Na polecenie Rejenta murarze naprawiają mur";
const rekord = {
  utwor: "zemsta", sekcja: "wydarzenia", tekst: dowod,
  zrodlo_url: "https://wolnelektury.pl/katalog/lektura/zemsta/", zrodlo_rodzaj: "utwór",
};
const cel = JSON.stringify({ tytul: "Zemsta", fakt: "Rejent polecił murarzom naprawić mur", fragment });
const werdykt = JSON.stringify({
  status: "potwierdzone", numer: 1, dowod, komentarz: "Murarze działają na zlecenie Rejenta.",
  teza: "Scena pokazuje, jak decyzja Rejenta zaostrza sąsiedzki konflikt.",
  krok: "Dopisz, jak Cześnik reaguje na decyzję Rejenta.",
});
const bezSieci = () => { throw new Error("Nieoczekiwane wywołanie modelu"); };

const T1 = "https://wolnelektury.pl/katalog/lektura/lalka-tom-pierwszy.html#wl-e4";
const T2 = "https://wolnelektury.pl/katalog/lektura/lalka-tom-drugi.html#wl-e100";
const wiersz = (rodzaj: string, nr: number, miejsce: string, dane: Record<string, unknown>, url = T1, utwor = "lalka") =>
  ({ utwor, rodzaj, nr, miejsce, tekst: "", dane, zrodlo_url: url });
const wyd = (nr: number, miejsce: string, opis: string, url = T1) =>
  wiersz("wydarzenie", nr, miejsce, { nr, miejsce, kto: ["Wokulski"], gdzie: "Warszawa", opis }, url);
const WIERSZE = [
  wyd(1, "t. I, rozdz. 1", "Kupcy w jadłodajni spierają się o Wokulskiego, który wyjechał do Bułgarii."),
  wyd(2, "t. II, rozdz. 3", "Wokulski w Paryżu spotyka profesora Geista.", T2),
  wyd(3, "t. II, rozdz. 14", "Wokulski wysiada w Skierniewicach i rzuca się pod pociąg.", T2),
  wiersz("postac", 1, "t. I, rozdz. 1", { imie: "Stanisław Wokulski", rola: "Warszawski kupiec.", relacje: "Przyjaciel Rzeckiego.", miejsca: ["t. I, rozdz. 1"] }),
  wiersz("motyw", 1, "t. I, rozdz. 13", { motyw: "miłość jako poświęcenie", przyklad: "Wokulski gotów jest oddać życie.", miejsce: "t. I, rozdz. 13", cytat: "Za takie szczęście oddam życie" }),
];
const sekcjaRow = (sekcja: string, tekst: string, utwor = "lalka") =>
  ({ utwor, sekcja, tekst, tytul: "Lalka", zrodlo_url: "https://wolnelektury.pl/katalog/lektura/lalka/", zrodlo_rodzaj: "utwór" });
const FRAGMENT_IMPROWIZACJI = {
  utwor: "dziady-iii", nr: 3, czesc: 1, miejsce: "akt I, sc. 2", tytul_czesci: "Improwizacja", trafienie: "slowa",
  tekst: "KONRAD\n\nSamotność — cóż po ludziach, czym śpiewak dla ludzi?\nNiech się dzieje wola nieba, ja pójdę swoją drogą.\n\n" + "Dalszy tekst sceny. ".repeat(200),
  zrodlo_url: "https://wolnelektury.pl/katalog/lektura/dziady-dziady-poema-dziady-czesc-iii.html",
};

function dostepZ(opcje: { wiersze?: unknown[]; sekcje?: unknown[]; fragmenty?: unknown[] } = {}) {
  const wywolania = { baza: [] as unknown[], uwagi: 0, elementy: [] as { p_rodzaje: string[]; p_pytanie: string; p_limit: number; p_kolejnosc: boolean; p_utwor: string }[], fragmenty: [] as unknown[] };
  return {
    wywolania,
    dostep: {
      baza: (p: unknown) => { wywolania.baza.push(p); return Promise.resolve(opcje.sekcje ?? []); },
      elementy: (p: { p_rodzaje: string[]; p_pytanie: string; p_limit: number; p_kolejnosc: boolean; p_utwor: string }) => {
        if (p.p_rodzaje[0] === "weryfikacja") wywolania.uwagi++;
        else wywolania.elementy.push(p);
        return Promise.resolve((opcje.wiersze ?? WIERSZE).filter((w) => p.p_rodzaje.includes((w as { rodzaj: string }).rodzaj)));
      },
      fragmenty: (p: unknown) => { wywolania.fragmenty.push(p); return Promise.resolve(opcje.fragmenty ?? []); },
      signal: AbortSignal.timeout(10_000), zapytaj: bezSieci as () => Promise<string>,
    },
  };
}
const czat = (content: string, opcje?: Parameters<typeof dostepZ>[0], p: Parameters<typeof przygotujCzat>[1] = { tryb: "czat", przedmiot: "polski" }) => {
  const { dostep, wywolania } = dostepZ(opcje);
  return przygotujCzat([{ role: "user", content }], p, dostep).then((krok) => ({ krok, wywolania }));
};
const system = (krok: { messages: { content: unknown }[] }) => String(krok.messages[0]?.content);
const przez = (m: Material[], tekst: string, pytanie = "", zapisPriorytetu = false) => {
  const p = new ProcesorOdpowiedzi(m, { pytanie, zapisPriorytetu });
  const wynik = p.dodaj(tekst.endsWith("\n") ? tekst : `${tekst}\n`) + p.zakoncz();
  return { wynik: wynik.trimEnd(), zrodla: p.zrodla() };
};

Deno.test("bezpośrednie pytania z matematyki, informatyki i angielskiego nie wywołują wyszukiwania", async () => {
  for (const content of ["Co to jest pochodna?", "Co oznacza GROUP BY?", "Kiedy używam Past Simple?"]) {
    const { krok, wywolania } = await czat(content, undefined, { tryb: "czat" });
    assertEquals(krok.materialy, []);
    assertEquals(krok.procesor, undefined);
    assertEquals(krok.messages.at(-1)?.content, content);
    assertEquals([wywolania.baza.length, wywolania.elementy.length, wywolania.fragmenty.length], [0, 0, 0]);
  }
});

Deno.test("prywatne fragmenty trafiają do promptu tylko przy odwołaniu do wcześniejszego czatu", async () => {
  const wywolania: [string, string | null][] = [];
  const przygotuj = (content: string, chronOdpowiedz = false) => przygotujCzat(
    [{ role: "user", content }], { tryb: "czat", rozmowa: "rbiezaca", chronOdpowiedz },
    { ...dostepZ().dostep, rozmowy: (id, pytanie) => {
      wywolania.push([id, pytanie]);
      return Promise.resolve([{ od: "student", tekst: "Projekt Bursztyn ma kod WIOSNA47." }, { od: "system", tekst: "Tego fragmentu nie ma w rozmowie." }]);
    } },
  );
  const zwykle = await przygotuj("Przypomnij mi, co oznacza GROUP BY.");
  assertEquals(wywolania, []);
  assert(!String(zwykle.messages[0]?.content).includes("WIOSNA47"));
  const pamiec = await przygotuj("Przypomnij kod projektu Bursztyn z poprzedniej rozmowy.");
  assertEquals(wywolania, [["rbiezaca", "kod projektu bursztyn"]]);
  assert(String(pamiec.messages[0]?.content).includes("WIOSNA47"));
  assert(!String(pamiec.messages[0]?.content).includes("Tego fragmentu"));
  await przygotuj("O czym gadaliśmy ostatnio?");
  assertEquals(wywolania.at(-1), ["rbiezaca", null]);
  await przygotuj("Pamiętasz projekt Bursztyn?", true);
  assertEquals(wywolania.length, 2);
});

Deno.test("słowa z tytułu bez związku z lekturą nie ciągną materiałów ani źródeł", async () => {
  const zdania = [
    "Idę na wesele kuzynki w sobotę", "Moja siostra ma nową lalkę", "To była słodka zemsta za klasówkę", "W grze jest dżuma i muszę wyleczyć wioskę",
    "Mój kot nazywa się Hamlet", "Pan Tadeusz to mój sąsiad", "To był dramat, moja lalka się zepsuła", "Mam proces w sądzie za mandat",
    "Ona gra w Tango na weselu", "Kupiłem miejsce w kinie", "Cześć! Pomożesz mi z ortografią?", "Napisałem akt notarialny dla rodziców", "Bohater dnia to mój brat, a jego lalka jest zepsuta",
  ];
  for (const zdanie of zdania) {
    const { krok, wywolania } = await czat(zdanie);
    assertEquals(utworPytania(zdanie), undefined, zdanie);
    assertEquals(czyPytanieOLekturze(zdanie, { przedmiot: "polski" }).lektura, false, zdanie);
    assertEquals(krok.materialy, [], zdanie);
    assertEquals(krok.procesor, undefined, zdanie);
    assertEquals([wywolania.baza.length, wywolania.elementy.length, wywolania.fragmenty.length], [0, 0, 0], zdanie);
    assertStringIncludes(system(krok), "nie wspominaj o lekturze");
    assertEquals(metadaneCzatu("Brzmi radośnie!", [], false).zrodla, []);
  }
});

Deno.test("pytanie o lekturę z kontekstem literackim rozpoznaje utwór", () => {
  for (const [zdanie, id] of [
    ["Co się dzieje w Lalce?", "lalka"], ["Streść mi Lalkę", "lalka"], ["Kto napisał Wesele?", "wesele"],
    ["W dramacie Fredry zemsta napędza fabułę", "zemsta"], ["Opowiedz o Wokulskim", "lalka"], ["Wesele Wyspiańskiego, bohaterowie", "wesele"],
    ["Zacytuj początek Wielkiej Improwizacji", "dziady-iii"], ["Jaki motyw dżumy jest w powieści Camusa?", "dzuma"],
  ] as const) {
    assertEquals(utworPytania(zdanie)?.id, id, zdanie);
    assert(czyPytanieOLekturze(zdanie, { przedmiot: "polski" }).lektura, zdanie);
  }
});

Deno.test("typ pytania wybiera warstwę materiałów", () => {
  assertEquals(typPytania("Podaj plan wydarzeń Lalki"), "plan");
  assertEquals(typPytania("Streść Lalkę"), "streszczenie");
  assertEquals(typPytania("Kim jest Wokulski?"), "postac");
  assertEquals(typPytania("Jakie motywy ma Lalka? Podaj argumenty do rozprawki"), "motywy");
  assertEquals(typPytania("Zacytuj początek Wielkiej Improwizacji"), "cytat");
  assertEquals(typPytania("W którym rozdziale Wokulski jedzie do Paryża?"), "cytat");
  assertEquals(typPytania("Kiedy powstała Lalka?"), "geneza");
  assertEquals(typPytania("Czy Wokulski był w Paryżu?"), "szczegol");
});

Deno.test("kim jest Wokulski: postacie i sekcja bohaterów, identyfikatory w prompcie", async () => {
  const { krok, wywolania } = await czat("Kim jest Wokulski?", { sekcje: [sekcjaRow("bohaterowie", "Wokulski jest kupcem.")] });
  assertEquals(wywolania.elementy[0].p_rodzaje, ["postac"]);
  assertEquals(wywolania.elementy[0].p_utwor, "lalka");
  assertEquals(wywolania.baza[0], { p_przedmiot: "polski", p_utwor: "lalka", p_sekcja: "bohaterowie", p_pytanie: "Kim jest Wokulski?" });
  assertEquals(krok.materialy.map((m) => m.id), ["K", "P1", "S:bohaterowie"]);
  assertStringIncludes(system(krok), "[P1] Stanisław Wokulski.");
  assertStringIncludes(system(krok), "[K] Karta lektury: „Lalka”, autor: Bolesław Prus");
  const { wynik, zrodla } = przez(krok.materialy, "Wokulski to warszawski kupiec [P1].");
  assertStringIncludes(wynik, "[[zrodlo:1]]");
  assertEquals(zrodla[0].id, "P1");
  assertEquals(zrodla[0].typ, "postac");
  assertEquals(zrodla[0].miejsce, "t. I, rozdz. 1");
  assertEquals(zrodla[0].url, T1);
});

Deno.test("plan wydarzeń składa serwer: kolejność, miejsce w tekście, link do rozdziału", async () => {
  const { krok, wywolania } = await czat("Podaj plan wydarzeń Lalki");
  assertEquals(wywolania.elementy[0].p_kolejnosc, true);
  assert(krok.gotowa && krok.procesor);
  const tekst = krok.procesor.dodaj(`${krok.gotowa}\n`) + krok.procesor.zakoncz();
  assertStringIncludes(tekst, "Plan wydarzeń „Lalka”");
  assertStringIncludes(tekst, "1. **t. I, rozdz. 1**. Kupcy w jadłodajni");
  assertStringIncludes(tekst, "3. **t. II, rozdz. 14**. Wokulski wysiada w Skierniewicach");
  assert(!tekst.includes(ETYKIETA_OGOLNA));
  const zrodla = krok.procesor.zrodla();
  assertEquals(zrodla.map((z) => z.miejsce), ["t. I, rozdz. 1", "t. II, rozdz. 3", "t. II, rozdz. 14"]);
  assertEquals(zrodla[2].url, T2);
  assertEquals(zrodla[2].id, "W3");
  assertEquals(odczytajOdpowiedzPestki(metadaneCzatu(tekst, zrodla, false))?.zrodla.length, 3);
});

Deno.test("plan zawęża się do miejsca wskazanego w pytaniu", async () => {
  const { krok } = await czat("Plan wydarzeń Lalki: tom II rozdział 14");
  assertEquals(krok.gotowa?.split("\n").filter((w) => /^\d+\. /.test(w)).length, 1);
  const m = krok.materialy.filter((x) => x.rodzaj === "wydarzenie");
  assertEquals(wydarzeniaZPytania("co w rozdziale 3", m).map((w) => w.id), ["W2"]);
  assertEquals(wydarzeniaZPytania("plan lalki", m).length, 3);
});

Deno.test("plan bez elementów korzysta z numerowanej notatki, bez zmyślonych kotwic", async () => {
  const notatka = "1. [Akt I, scena VIII](https://wolnelektury.pl/katalog/lektura/zemsta/#s6) Ludzie Cześnika przerywają naprawę muru.\n2. [Akt IV] Cześnik i Rejent się godzą.";
  const { krok } = await czat("Podaj plan wydarzeń Zemsty", { wiersze: [], sekcje: [sekcjaRow("wydarzenia", notatka, "zemsta")] });
  assert(krok.gotowa);
  assertStringIncludes(krok.gotowa, "1. **Akt I, scena VIII**. Ludzie Cześnika");
  assertEquals(krok.materialy.find((m) => m.id === "W1")?.zrodlo?.url, "https://wolnelektury.pl/katalog/lektura/zemsta/");
});

Deno.test("czy Wokulski był w Paryżu: weryfikacja szuka w opracowaniu i odpowiada bez statusu „niepotwierdzone”", async () => {
  for (const pytanie of ["Czy Wokulski był w Paryżu?", "Czy Izabela wyszła za Wokulskiego?"]) {
    const { krok, wywolania } = await czat(pytanie);
    assertEquals(wywolania.elementy[0].p_rodzaje, ["wydarzenie", "postac", "motyw", "utwor"]);
    assertEquals(wywolania.elementy[0].p_pytanie, pytanie);
    assert(krok.procesor, "odpowiedź przechodzi przez procesor źródeł");
    assertStringIncludes(system(krok), "[W2] t. II, rozdz. 3: Wokulski w Paryżu spotyka profesora Geista.");
    assertStringIncludes(system(krok), "nie pisz „niepotwierdzone”");
  }
  const { krok } = await czat("Czy Wokulski był w Paryżu?");
  const { wynik, zrodla } = przez(krok.materialy, "Tak, Wokulski był w Paryżu i spotkał tam profesora Geista [W2].", "Czy Wokulski był w Paryżu?");
  assert(!/niepotwierdzone/i.test(wynik));
  assertEquals(zrodla[0].miejsce, "t. II, rozdz. 3");
  assertEquals(zrodla[0].url, T2);
});

Deno.test("motywy: wszystkie motywy z miejscem i cytatem plus wydarzenia do argumentów", async () => {
  const { krok, wywolania } = await czat("Jakie motywy ma Lalka? Podaj argumenty do rozprawki");
  assertEquals(wywolania.elementy.map((w) => w.p_rodzaje.join()).sort(), ["motyw", "motyw", "wydarzenie"]);
  assertStringIncludes(system(krok), "[M1] miłość jako poświęcenie: Wokulski gotów jest oddać życie. (t. I, rozdz. 13) Cytat: „Za takie szczęście oddam życie”");
  assert(krok.materialy.some((m) => m.id === "W1"));
});

Deno.test("cytat z utworu w domenie publicznej pochodzi z fragmentów tekstu z lokalizacją", async () => {
  const { krok, wywolania } = await czat("Zacytuj początek Wielkiej Improwizacji", { fragmenty: [FRAGMENT_IMPROWIZACJI], wiersze: [] });
  assertEquals((wywolania.fragmenty[0] as { p_utwor: string }).p_utwor, "dziady-iii");
  const f = krok.materialy.find((m) => m.id === "F1");
  assert(f?.zrodlo);
  assertEquals(f.zrodlo.miejsce, "akt I, sc. 2 (Improwizacja)");
  assertStringIncludes(f.zrodlo.url, "dziady-dziady-poema-dziady-czesc-iii.html");
  assert(f.tekst.startsWith("KONRAD"), "prośba o początek zaczyna wycinek od początku sceny");
  assert(f.tekst.length <= 1400);
  const { wynik, zrodla } = przez(
    krok.materialy,
    "Początek Wielkiej Improwizacji (akt I, sc. 2): „Samotność — cóż po ludziach, czym śpiewak dla ludzi?” [F1]",
  );
  assert(!wynik.includes(POMINIETO));
  assertStringIncludes(wynik, "„Samotność — cóż po ludziach, czym śpiewak dla ludzi?”");
  assertEquals(zrodla[0].dowod, "Samotność — cóż po ludziach, czym śpiewak dla ludzi?");
  assertEquals(zrodla[0].typ, "fragment");
});

Deno.test("cytat wymyślony przez model jest usuwany z odpowiedzi", async () => {
  const { krok } = await czat("Zacytuj początek Wielkiej Improwizacji", { fragmenty: [FRAGMENT_IMPROWIZACJI] });
  const { wynik } = przez(krok.materialy, [
    "Oto początek Wielkiej Improwizacji [F1]:",
    "„Wolność jest jak ptak, który nigdy nie zna swojej klatki” [F1]",
    "Konrad zwraca się do Boga [F1].",
  ].join("\n"));
  assert(!wynik.includes("ptak"));
  assertStringIncludes(wynik, "Konrad zwraca się do Boga");
  assertStringIncludes(wynik, POMINIETO);
});

Deno.test("identyfikatory zamieniają się na źródła, nieznane znikają, reszta dostaje etykietę ogólnej wiedzy", async () => {
  const { krok } = await czat("Kim jest Wokulski?");
  const { wynik, zrodla } = przez(krok.materialy, [
    "Wokulski jest warszawskim kupcem [P1].",
    "Mieszkał podobno w kamienicy na Powiślu [W99].",
    "Lalka powstała w drugiej połowie XIX wieku.",
    "Prus wydał ją w odcinkach [OW].",
    "Tego nie ma w materiałach Sedno, sprawdź w tekście.",
    "Jaki fragment cię interesuje?",
  ].join("\n"), "Kim jest Wokulski?");
  const linie = wynik.split("\n");
  assertEquals(linie[0], "Wokulski jest warszawskim kupcem [[zrodlo:1]].");
  assertEquals(linie[1], `Mieszkał podobno w kamienicy na Powiślu. ${ETYKIETA_OGOLNA}`);
  assertEquals(linie[2], `Lalka powstała w drugiej połowie XIX wieku. ${ETYKIETA_OGOLNA}`);
  assertEquals(linie[3], `Prus wydał ją w odcinkach. ${ETYKIETA_OGOLNA}`);
  assertEquals(linie[4], "Tego nie ma w materiałach Sedno, sprawdź w tekście.");
  assertEquals(linie[5], "Jaki fragment cię interesuje?");
  assertEquals(zrodla.length, 1);
  assertEquals(zrodla[0].id, "P1");
  assertEquals(zrodla[0].twierdzenie, "[1] Wokulski jest warszawskim kupcem.");
  assert(zrodla[0].dowod && zrodla[0].dowod.length <= 400);
  const meta = odczytajOdpowiedzPestki(metadaneCzatu(wynik, zrodla, false));
  assertEquals(meta?.zrodla[0].id, "P1");
  assertEquals(meta?.akcje, ["zrodlo"]);
});

Deno.test("to samo miejsce w tekście ma jedno źródło, a wiele identyfikatorów w jednym nawiasie działa", () => {
  const { krok } = { krok: { materialy: [kartaLektury(KATALOG_LEKTUR[0]), ...WIERSZE.slice(1, 3).map((w, i): Material => ({
    id: `W${i + 2}`, rodzaj: "wydarzenie", tekst: `${w.miejsce}: ${(w.dane as { opis: string }).opis}`,
    zrodlo: { url: w.zrodlo_url, tytul: "Lalka", rodzaj: "utwór", miejsce: i ? "t. II, rozdz. 14" : "t. II, rozdz. 3", id: `W${i + 2}`, typ: "wydarzenie" },
  }))] } };
  const { wynik, zrodla } = przez(krok.materialy, "Wokulski jedzie do Paryża i wraca do kraju, a potem jest w Skierniewicach [W2, W3][K].");
  assertStringIncludes(wynik, "[[zrodlo:1]][[zrodlo:2]][[zrodlo:3]]");
  assertEquals(zrodla.map((z) => z.id), ["W2", "W3", "K"]);
});

Deno.test("pusta odpowiedź albo wyłącznie niepotwierdzone zdania daje komunikat braku materiału", () => {
  assertEquals(przez([], "").wynik, BRAK_MATERIALU);
  const p = new ProcesorOdpowiedzi([], { pytanie: "", zapisPriorytetu: false });
  assertEquals(p.dodaj("Tak, Wokulski był w Paryżu i rozmawiał tam z Geistem.\n"), `Tak, Wokulski był w Paryżu i rozmawiał tam z Geistem. ${ETYKIETA_OGOLNA}\n`);
  assertEquals(p.zakoncz(), "");
});

Deno.test("zapis priorytetu tylko na prośbę ucznia: znacznik i obietnica znikają z odpowiedzi", () => {
  assert(!prosiOZapisPriorytetu("Chcę zacząć od czytania ze zrozumieniem, to mój priorytet."));
  assert(prosiOZapisPriorytetu("Zapisz priorytet: czytanie ze zrozumieniem"));
  const strumien = (tekst: string, zapis: boolean) => {
    const f = new FiltrCzatu(zapis);
    let wynik = "";
    for (let i = 0; i < tekst.length; i += 7) wynik += f.dodaj(tekst.slice(i, i + 7));
    return wynik + f.zakoncz();
  };
  const odpowiedz = "Zacznij od tekstów argumentacyjnych. Dodałam to do twoich priorytetów. Ćwicz codziennie.\n[[priorytet: teksty argumentacyjne]]";
  const bez = strumien(odpowiedz, false);
  assert(!/priorytet/i.test(bez), bez);
  assertStringIncludes(bez, "Zacznij od tekstów argumentacyjnych.");
  assertStringIncludes(bez, "Ćwicz codziennie.");
  assertStringIncludes(strumien(odpowiedz, true), "[[priorytet: teksty argumentacyjne]]");
  const { krok } = { krok: { materialy: [kartaLektury(KATALOG_LEKTUR[0])] } };
  assertEquals(przez(krok.materialy, "Dodałam do twoich priorytetów lekturę Lalka.\nWokulski był kupcem [K].").wynik, "Wokulski był kupcem [[zrodlo:1]].");
});

Deno.test("do streszczenia bez spoilerów model dostaje tylko zawiązanie fabuły", async () => {
  const { krok } = await czat("Stresc mi Lalke w trzech punktach bez spoilerow", {
    sekcje: [sekcjaRow("streszczenie", "Wokulski jest kupcem. Zabiega o względy Izabeli. Później odkrywa jej zażyłość ze Starskim."),
      sekcjaRow("bohaterowie", "Izabela jest arystokratką. Wokulski zabiega o jej względy. Starski bywa w jej domu.")],
  });
  assertEquals(krok.materialy.map((m) => m.id), ["K", "S:streszczenie", "S:bohaterowie"]);
  assertEquals(krok.materialy[1].tekst, "Wokulski jest kupcem. Zabiega o względy Izabeli.");
  assert(!system(krok).includes("Starsk"));
  assert(!system(krok).includes("Skierniewic"));
  assertEquals(krok.gotowa, undefined);
});

Deno.test("wycinek tekstu ma ograniczony rozmiar i otwiera się na szukanej frazie", () => {
  const tekst = `${"Początek. ".repeat(300)}\n\nNiech się dzieje wola nieba, ja pójdę swoją drogą.\n\n${"Koniec. ".repeat(300)}`;
  const w = okno(tekst, "", "Niech się dzieje wola nieba", false);
  assert(w.length <= 1400);
  assertStringIncludes(w, "Niech się dzieje wola nieba");
  assert(okno(tekst, "", null, true).startsWith("Początek."));
});

Deno.test("brak danych w bazie nie przerywa odpowiedzi: model dostaje kartę i zasadę etykiety", async () => {
  const { dostep } = dostepZ();
  const padajacy = { ...dostep, baza: () => Promise.reject(new Error("db")), elementy: () => Promise.reject(new Error("db")) };
  const krok = await przygotujCzat([{ role: "user", content: "Co się dzieje w Lalce?" }], { tryb: "czat" }, padajacy);
  assertEquals(krok.materialy.map((m) => m.id), ["K"]);
  assertStringIncludes(system(krok), "ogólnej wiedzy");
  assert(krok.procesor);
});

Deno.test("pytanie o lekturę spoza katalogu: bez wymyślania, z etykietą ogólnej wiedzy", async () => {
  const { krok } = await czat("Streść mi lekturę Quo vadis");
  assertEquals(krok.materialy, []);
  assert(krok.procesor);
  assertStringIncludes(system(krok), "Sedno nie ma materiału o tej lekturze");
});

Deno.test("tryb chronOdpowiedz wyłącza materiały lektur", async () => {
  const { krok, wywolania } = await czat("Streść Lalkę", undefined, { tryb: "czat", chronOdpowiedz: true });
  assertEquals(krok.materialy, []);
  assertEquals(krok.procesor, undefined);
  assertEquals(wywolania.elementy.length, 0);
});

Deno.test("akapit jest oceniany w obrębie wskazanego utworu, a karta przechodzi walidację po serializacji", async () => {
  let wywolania = 0;
  const { dostep } = dostepZ({ sekcje: [rekord] });
  const wynik = await weryfikuj(fragment, "Jak rodzi się konflikt?", {
    ...dostep, baza: (p) => {
      assertEquals(p.p_utwor, "zemsta");
      assert(!p.p_pytanie.includes("co zaostrza spór"));
      return Promise.resolve([rekord]);
    },
    zapytaj: () => Promise.resolve(wywolania++ === 0 ? cel : werdykt),
  });
  assertEquals(wynik.sprawdzenie.status, "Potwierdzone");
  assertEquals(wynik.sprawdzenie.fragment, fragment);
  const { tekst, dane } = odpowiedzWeryfikacji(wynik, true);
  assert(tekst.includes("Związek z tezą"));
  const zapis = odczytajOdpowiedzPestki(JSON.parse(JSON.stringify(dane)));
  assert(zapis && zatwierdzPowierzchnie(zapis));
  assertEquals(zapis.zrodla[0].dowod, dowod);
  const podmieniony = { ...dane, a2ui: { ...dane.a2ui as object, dodatkowaAkcja: "download" } };
  assertEquals(zatwierdzPowierzchnie(podmieniony), undefined);
});

Deno.test("brak dowodu daje stan Niepotwierdzone w karcie sprawdzania", async () => {
  let wywolania = 0;
  const { dostep } = dostepZ({ sekcje: [rekord] });
  const wynik = await weryfikuj(fragment, "", {
    ...dostep,
    zapytaj: () => Promise.resolve(wywolania++ === 0 ? cel : werdykt.replace(dowod, "Rejent porzuca mur")),
  });
  assertEquals(wynik.sprawdzenie.status, "Niepotwierdzone");
  assertEquals(wynik.zrodla, []);
});

Deno.test("sprzeczne źródła dają stan Niepotwierdzone", async () => {
  let wywolania = 0;
  const { dostep } = dostepZ({ sekcje: [rekord, { ...rekord, sekcja: "motywy", tekst: "Rejent zabrania naprawy muru." }] });
  const wynik = await weryfikuj(fragment, "", {
    ...dostep, zapytaj: () => Promise.resolve(wywolania++ === 0 ? cel : '{"status":"konflikt"}'),
  });
  assertEquals(wynik.sprawdzenie.status, "Niepotwierdzone");
  assertEquals(wynik.sprawdzenie.podstawa, "Dostępne źródła są sprzeczne w tej sprawie.");
  assertEquals(wynik.zrodla, []);
});

Deno.test("cytat musi występować dosłownie, z tolerancją odstępów", () => {
  assert(zawieraCytat("Niech się dzieje\n wola nieba,", "Niech się dzieje wola nieba"));
  assert(!zawieraCytat("Niech się dzieje wola nieba", "Niech sie dzieje wola nieba"));
  assert(!zawieraCytat("Niech się dzieje wola nieba", "Niech się dzieje wola nieb"));
});
