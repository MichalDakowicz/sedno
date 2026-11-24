import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { odczytajOdpowiedzPestki, opisKartyZrodla, zatwierdzPowierzchnie } from "../functions/_shared/pestka-odpowiedz.ts";
import {
  czyPytanieOLekturze, metadaneCzatu, odpowiedzWeryfikacji, przygotujCzat, prosiOZapisPriorytetu, rozpoznajPytanieCzatu, weryfikuj,
} from "../functions/ai/pestka.ts";
import { typPytania, utworPytania, zawieraCytat } from "../functions/ai/lektury.ts";
import { kartaLektury, okno, type Material, type SzukajElementy, type SzukajFragmenty, type SzukajFragmentyMiejsca, type SzukajKotwic } from "../functions/ai/material-lektury.ts";
import { BRAK_MATERIALU, ETYKIETA_OGOLNA, FiltrCzatu, POMINIETO, ProcesorOdpowiedzi } from "../functions/ai/odpowiedz-lektury.ts";
import { KATALOG_LEKTUR } from "../functions/ai/katalog-lektur.ts";
import type { Message } from "../functions/_shared/llm.ts";
import { kotwiceZHtml, podzielTekst } from "../lektury/teksty.ts";
import { wczytajPlikiLektur, wierszeElementow, type PlikLektury } from "../lektury/format.ts";

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
const T2 = "https://wolnelektury.pl/katalog/lektura/lalka-tom-drugi.html#wl-e721";
const XIV = "https://wolnelektury.pl/katalog/lektura/lalka-tom-drugi.html#wl-e4032";
const wiersz = (rodzaj: string, nr: number, miejsce: string, dane: Record<string, unknown>, url = T1, utwor = "lalka") =>
  ({ utwor, rodzaj, nr, miejsce, tekst: "", dane, zrodlo_url: url });
const wyd = (nr: number, miejsce: string, opis: string, url = T1) =>
  wiersz("wydarzenie", nr, miejsce, { nr, miejsce, kto: ["Wokulski"], gdzie: "Warszawa", opis }, url);
const WIERSZE = [
  wyd(1, "t. I, rozdz. 1", "Kupcy w jadłodajni spierają się o Wokulskiego, który wyjechał do Bułgarii."),
  wyd(2, "t. II, rozdz. 3", "Wokulski w Paryżu spotyka profesora Geista.", T2),
  wyd(3, "t. II, rozdz. 14", "Wokulski wysiada w Skierniewicach i rzuca się pod pociąg.", XIV),
  wiersz("postac", 1, "t. I, rozdz. 1", { imie: "Stanisław Wokulski", rola: "Warszawski kupiec.", relacje: "Przyjaciel Rzeckiego.", miejsca: ["t. I, rozdz. 1"] }),
  wiersz("motyw", 1, "t. I, rozdz. 13", { motyw: "miłość jako poświęcenie", przyklad: "Wokulski gotów jest oddać życie.", miejsce: "t. I, rozdz. 13", cytat: "Za takie szczęście oddam życie" }),
];
const sekcjaRow = (sekcja: string, tekst: string, utwor = "lalka") =>
  ({ utwor, sekcja, tekst, tytul: "Lalka", zrodlo_url: "https://wolnelektury.pl/katalog/lektura/lalka/", zrodlo_rodzaj: "utwór" });
const FRAGMENT_IMPROWIZACJI = {
  utwor: "dziady-iii", nr: 3, czesc: 1, miejsce: "akt I, sc. 2", tytul_czesci: "Improwizacja", trafienie: "slowa",
  tekst: "KONRAD\n\nSamotność — cóż po ludziach, czy-m śpiewak dla ludzi?\nGdzie człowiek, co z mej pieśni całą myśl wysłucha,\n\n" + "Dalszy tekst sceny. ".repeat(200),
  zrodlo_url: "https://wolnelektury.pl/katalog/lektura/dziady-dziady-poema-dziady-czesc-iii.html",
};

type ParametryElementow = Parameters<SzukajElementy>[0];
type ParametryFragmentow = Parameters<SzukajFragmenty>[0];
function dostepZ(opcje: {
  wiersze?: unknown[]; sekcje?: unknown[]; fragmenty?: unknown[];
  szukajElementow?: SzukajElementy; szukajFragmentow?: SzukajFragmenty; fragmentyMiejsca?: SzukajFragmentyMiejsca; kotwice?: SzukajKotwic;
} = {}) {
  const wywolania = { baza: [] as unknown[], uwagi: 0, elementy: [] as ParametryElementow[], fragmenty: [] as ParametryFragmentow[] };
  return {
    wywolania,
    dostep: {
      baza: (p: unknown) => { wywolania.baza.push(p); return Promise.resolve(opcje.sekcje ?? []); },
      elementy: (p: ParametryElementow) => {
        if (p.p_rodzaje[0] === "weryfikacja") wywolania.uwagi++;
        else wywolania.elementy.push(p);
        return opcje.szukajElementow?.(p) ?? Promise.resolve((opcje.wiersze ?? WIERSZE).filter((w) => p.p_rodzaje.includes((w as { rodzaj: string }).rodzaj)));
      },
      fragmenty: (p: ParametryFragmentow) => {
        wywolania.fragmenty.push(p);
        return opcje.szukajFragmentow?.(p) ?? Promise.resolve(opcje.fragmenty ?? []);
      },
      fragmentyMiejsca: opcje.fragmentyMiejsca,
      kotwice: opcje.kotwice,
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
  for (const pytanie of ["Jak kończy się Lalka?", "Jak się kończy Lalka?", "Opisz zakończenie Lalki", "Co się dzieje w finale Lalki?"]) {
    assertEquals(typPytania(pytanie), "zakonczenie");
    assertEquals(utworPytania(pytanie)?.id, "lalka");
  }
});

Deno.test("kim jest Wokulski: postacie i sekcja bohaterów, identyfikatory w prompcie", async () => {
  const { krok, wywolania } = await czat("Kim jest Wokulski?", { sekcje: [sekcjaRow("bohaterowie", "Wokulski jest kupcem.")] });
  assertEquals(wywolania.elementy[0].p_rodzaje, ["postac"]);
  assertEquals(wywolania.elementy[0].p_utwor, "lalka");
  assertEquals(wywolania.baza[0], { p_przedmiot: "polski", p_utwor: "lalka", p_sekcja: "bohaterowie", p_pytanie: "Kim jest Wokulski?" });
  assertEquals(krok.materialy.map((m) => m.id), ["K", "P1", "W1", "S:bohaterowie"]);
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
  const [, pusty, ...punkty] = tekst.trimEnd().split("\n");
  assertEquals(pusty, "");
  assertEquals(punkty.map((line) => /^(\d+)\. \*\*(t\. \w+, rozdz\. \d+)\*\*/.exec(line)?.slice(1)), [
    ["1", "t. I, rozdz. 1"], ["2", "t. II, rozdz. 3"], ["3", "t. II, rozdz. 14"],
  ]);
  assertStringIncludes(punkty[2], "Wokulski wysiada w Skierniewicach");
  assert(!tekst.includes(ETYKIETA_OGOLNA));
  const zrodla = krok.procesor.zrodla();
  assertEquals(zrodla.map((z) => z.miejsce), ["t. I, rozdz. 1", "t. II, rozdz. 3", "t. II, rozdz. 14"]);
  assertEquals(zrodla[2].url, XIV);
  assertEquals(zrodla[2].id, "W3");
  assertEquals(odczytajOdpowiedzPestki(metadaneCzatu(tekst, zrodla, false))?.zrodla.length, 3);
});

Deno.test("Sonia, Marmieładow i Rodion trafiają do właściwej postaci z historii Zbrodni i kary", async () => {
  const { dane } = (await wczytajPlikiLektur()).find((p) => p.nazwa === "zbrodnia-i-kara")!;
  const wiersze = wierszeElementow(dane as PlikLektury);
  const historia: Message[] = [
    { role: "user", content: "Podaj plan wydarzeń Zbrodni i kary." },
    { role: "assistant", content: "Plan Zbrodni i kary. [1]" },
  ];
  for (const [nazwa, id, twierdzenie] of [
    ["Sonia", "P2", "Sonia jest córką Marmieładowa."],
    ["Zosia", "P2", "Sonia jest pasierbicą Katarzyny."],
    ["Marmieładow", "P10", "Marmieładow jest urzędnikiem i ojcem Soni."],
    ["Rodion", "P1", "Rodion Raskolnikow jest byłym studentem."],
  ]) {
    const messages: Message[] = [...historia, { role: "user", content: `Kim jest ${nazwa}?` }];
    const { dostep } = dostepZ({ szukajElementow: (p) => Promise.resolve(
      p.p_kolejnosc ? wiersze.filter((w) => w.utwor === p.p_utwor && p.p_rodzaje.includes(w.rodzaj)) : [],
    ) });
    assertEquals(rozpoznajPytanieCzatu(messages, {}).utwor?.id, "zbrodnia-i-kara");
    const krok = await przygotujCzat(messages, { tryb: "czat" }, dostep);
    assertEquals(krok.gotowa, undefined);
    assertEquals(krok.materialy.find((m) => m.rodzaj === "postac")?.id, id);
    const odp = przez(krok.materialy, `${twierdzenie} [${id}]`);
    assertEquals(odp.zrodla[0]?.id, id, odp.wynik);
    if (id === "P2") {
      assertStringIncludes(system(krok), "[W2] cz. I, rozdz. 2: Marmieładow opowiada o swoim pijaństwie i pracy Soni");
      assertStringIncludes(system(krok), "Zachowaj kolejność zdarzeń");
    }
  }

  const krok = await przygotujCzat([...historia, { role: "user", content: "Kim jest Alfred?" }], { tryb: "czat" }, dostepZ({ wiersze }).dostep);
  assertStringIncludes(krok.gotowa!, "Sedno nie ma opisu tej postaci");
  assertStringIncludes(krok.gotowa!, "Zbrodnia i kara");
  assert(!przez(krok.materialy, krok.gotowa!).wynik.includes(ETYKIETA_OGOLNA));
});

Deno.test("plan zawęża się do miejsca wskazanego w pytaniu", async () => {
  const { krok } = await czat("Plan wydarzeń Lalki: tom II rozdział 14");
  assertEquals(krok.gotowa?.split("\n").filter((w) => /^\d+\. /.test(w)).length, 1);
  assertEquals(krok.materialy.filter((x) => x.rodzaj === "wydarzenie").map((w) => w.id), ["W3"]);
  const rzymski = await czat("Plan wydarzeń Lalki, rozdział XIV");
  assertStringIncludes(rzymski.krok.gotowa!, "1. **t. II, rozdz. 14**");
  const brak = await czat("Plan wydarzeń Lalki, rozdział 99");
  assertEquals(brak.krok.gotowa, "Sedno nie ma punktów planu dla wskazanego miejsca.");
});

Deno.test("plan bez elementów korzysta z numerowanej notatki, bez zmyślonych kotwic", async () => {
  const notatka = "1. [Akt I, scena VIII](https://wolnelektury.pl/katalog/lektura/zemsta/#s6) Ludzie Cześnika przerywają naprawę muru.\n2. [Akt IV] Cześnik i Rejent się godzą.";
  const { krok } = await czat("Podaj plan wydarzeń Zemsty", { wiersze: [], sekcje: [sekcjaRow("wydarzenia", notatka, "zemsta")] });
  assert(krok.gotowa);
  assertStringIncludes(krok.gotowa, "1. **Akt I, scena VIII** — Ludzie Cześnika");
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
  assertEquals(wywolania.elementy.map((w) => w.p_rodzaje.join()).sort(), ["motyw", "wydarzenie", "wydarzenie"]);
  assertStringIncludes(system(krok), "[M1] miłość jako poświęcenie: Wokulski gotów jest oddać życie. (t. I, rozdz. 13) Cytat: „Za takie szczęście oddam życie”");
  assert(krok.materialy.some((m) => m.id === "W1"));
});

Deno.test("początek Wielkiej Improwizacji korzysta z nagłówka sceny II i kotwicy Wolnych Lektur", async () => {
  const [txt, html] = await Promise.all(["txt", "html"].map((ext) =>
    Deno.readTextFile(new URL(`fixtures/dziady-improwizacja.${ext}`, import.meta.url))));
  const fragmenty = podzielTekst(txt, { stronaHtml: FRAGMENT_IMPROWIZACJI.zrodlo_url, kotwice: kotwiceZHtml(html) });
  assertEquals(fragmenty.map((f) => f.miejsce), ["akt I, sc. 1", "akt I, sc. 2", "akt I, sc. 3"]);
  const pytanie = "Zacytuj, co mówi Konrad na początku Wielkiej Improwizacji";
  const { krok, wywolania } = await czat(pytanie, {
    wiersze: [],
    szukajFragmentow: (p) => Promise.resolve(
      (p.p_poczatek ? fragmenty.filter((f) => f.tytulCzesci === "Improwizacja") : fragmenty.slice(0, 1))
        .map((f) => ({ ...f, utwor: p.p_utwor, tytul_czesci: f.tytulCzesci, zrodlo_url: f.url })),
    ),
  });
  assertEquals(wywolania.fragmenty[0], { p_utwor: "dziady-iii", p_pytanie: pytanie, p_fraza: null, p_limit: 2, p_poczatek: true });
  const f = krok.materialy.find((m) => m.id === "F2");
  assert(f?.zrodlo);
  assertEquals(f.zrodlo.miejsce, "akt I, sc. 2 (Improwizacja)");
  assertEquals(f.zrodlo.url, `${FRAGMENT_IMPROWIZACJI.zrodlo_url}#s6`);
  assert(f.tekst.startsWith("KONRAD"), "prośba o początek zaczyna wycinek od początku sceny");
  assert(f.tekst.length <= 1400);
  const cytat = "Samotność — cóż po ludziach, czy-m śpiewak dla ludzi?";
  const { wynik, zrodla } = przez(
    krok.materialy,
    `Początek Wielkiej Improwizacji (akt I, sc. 2): „${cytat}” [F2]`,
  );
  assert(!wynik.includes(POMINIETO));
  assertStringIncludes(wynik, `„${cytat}”`);
  assertEquals(zrodla[0].dowod, cytat);
  assertEquals(zrodla[0].typ, "fragment");
});

Deno.test("cytat wymyślony przez model jest usuwany z odpowiedzi", async () => {
  const { krok } = await czat("Zacytuj początek Wielkiej Improwizacji", { fragmenty: [FRAGMENT_IMPROWIZACJI] });
  const { wynik } = przez(krok.materialy, [
    "Oto początek Wielkiej Improwizacji [F3]:",
    "„Wolność jest jak ptak, który nigdy nie zna swojej klatki” [F3]",
    "Konrad zwraca się do Boga [F3].",
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
  ].join("\n\n"), "Kim jest Wokulski?");
  const linie = wynik.split("\n\n");
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

Deno.test("pytania o przyczynę sprowadzają sekcje trafne i obie sekcje fabularne", async () => {
  const migracja = await Deno.readTextFile(new URL("../migrations/0040_przywroc_testament_papkina.sql", import.meta.url));
  const wydarzenie = /\[Akt IV, scena IV–V\] ([^\n\\]+)/.exec(migracja)?.[1];
  assert(wydarzenie?.includes("Rejent go otruł winem"));
  for (const pytanie of ["Dlaczego Papkin pisze testament?", "Po co Papkin pisze testament?", "Z jakiego powodu Papkin przygotowuje testament?"]) {
    const sekcje = [
      sekcjaRow("motywy", "Komizm postaci.", "zemsta"), sekcjaRow("geneza", "Geneza sporu.", "zemsta"),
      sekcjaRow("streszczenie", "Spór dotyczy sąsiadów.", "zemsta"),
      sekcjaRow("bohaterowie", "Papkin jest posłańcem Cześnika.", "zemsta"), sekcjaRow("wydarzenia", wydarzenie!, "zemsta"),
    ];
    const { krok } = await czat(pytanie, { sekcje, wiersze: [] });
    assertEquals(krok.materialy.filter((m) => m.sekcja).map((m) => m.sekcja), ["motywy", "geneza", "streszczenie", "bohaterowie", "wydarzenia"]);
    assertStringIncludes(system(krok), `[S:wydarzenia] ${wydarzenie}`);
    assertStringIncludes(system(krok), "nigdy im nie przeczyj");
    const odp = przez(krok.materialy, "Papkin pisze testament, ponieważ podejrzewa, że Rejent go otruł [S:wydarzenia].");
    assertEquals(odp.zrodla[0].id, "S:wydarzenia");
    assert(!odp.wynik.includes(ETYKIETA_OGOLNA));
  }
});

Deno.test("nawias z numerem źródła przy poprzednim planie przywraca jego materiały dla dopytania", async () => {
  const poprzednie = "Podaj plan wydarzeń Lalki";
  const messages: Message[] = [
    { role: "user", content: poprzednie },
    { role: "assistant", content: "1. **t. II, rozdz. 3** — Wokulski spotyka Geista w Paryżu. [1]" },
    { role: "user", content: "Czy na pewno to było w tym rozdziale?" },
  ];
  const { dostep } = dostepZ({
    szukajElementow: (p) => Promise.resolve(p.p_kolejnosc && p.p_rodzaje.includes("wydarzenie") ? WIERSZE.slice(0, 3) : []),
  });
  const krok = await przygotujCzat(messages, { tryb: "czat" }, dostep);
  assertEquals(rozpoznajPytanieCzatu(messages, {}).poprzednie, [poprzednie]);
  assertStringIncludes(system(krok), "Nie wycofuj potwierdzonej informacji");
  assertStringIncludes(system(krok), "[W2] t. II, rozdz. 3: Wokulski w Paryżu spotyka profesora Geista.");
  assertEquals(przez(krok.materialy, "W tym rozdziale Wokulski spotyka Geista [W2].").zrodla[0].url, T2);
  const dopytanie = await przygotujCzat([
    ...messages,
    { role: "assistant", content: "Tak, spotkanie odbywa się w tym rozdziale. [1]" },
    { role: "user", content: "A co jeszcze wiemy o tym rozdziale?" },
  ], { tryb: "czat" }, dostep);
  assertStringIncludes(system(dopytanie), "[W2] t. II, rozdz. 3");
});

Deno.test("poprzednie źródło tekstu zachowuje identyfikator w kolejnym pytaniu o scenę", async () => {
  const poprzednie = "Zacytuj początek Wielkiej Improwizacji";
  const messages: Message[] = [
    { role: "user", content: poprzednie },
    { role: "assistant", content: "„Samotność — cóż po ludziach, czy-m śpiewak dla ludzi?” [1]" },
    { role: "user", content: "Z jakiej sceny pochodzi ten cytat?" },
  ];
  const { dostep } = dostepZ({
    szukajFragmentow: (p) => Promise.resolve(p.p_poczatek ? [FRAGMENT_IMPROWIZACJI] : []),
  });
  const krok = await przygotujCzat(messages, { tryb: "czat" }, dostep);
  assertStringIncludes(system(krok), "[F3] akt I, sc. 2 (Improwizacja)");
  assertEquals(przez(krok.materialy, "To słowa Konrada ze sceny drugiej [F3].").zrodla[0].id, "F3");
});

Deno.test("odsyłacze z wcześniejszej odpowiedzi nie są widoczne dla modelu", async () => {
  for (const [pierwsze, odpowiedz, dopytanie] of [
    ["Podaj plan wydarzeń Lalki", "Wokulski spotyka Geista w Paryżu. [35] [35]", "Czy te rozdziały w planie są pewne?"],
    ["Co robi Sonia w Zbrodni i karze?", "Sonia spotyka Raskolnikowa [[zrodlo:1]] i rozmawia z nim [W12, OW][P3].", "Czy postać Soni miała źródło?"],
    ["Co robi Makbet w akcie II?", "Makbet zabija króla [S:wydarzenia, W12]. W akcie II [K].", "Czy scena w akcie II jest pewna?"],
  ]) {
    const messages: Message[] = [
      { role: "user", content: pierwsze },
      { role: "assistant", content: odpowiedz },
      { role: "user", content: dopytanie + " Pytam o punkt [35]." },
    ];
    const krok = await przygotujCzat(messages, { tryb: "czat" }, dostepZ({ wiersze: [] }).dostep);
    const historia = krok.messages.find((m) => m.role === "assistant")?.content ?? "";
    assertStringIncludes(historia, "Potwierdzona odpowiedź Sedno");
    assert(!historia.includes("["));
    assertEquals(krok.messages.at(-1)?.content, messages.at(-1)?.content);
    assertEquals(messages[1].content, odpowiedz);
    assertStringIncludes(system(krok), "Nie komentuj numeracji źródeł");
  }
});

Deno.test("plan bez tytułu dziedziczy utwór, a zwykłe pytanie i nowy utwór tego nie robią", async () => {
  const historia: Message[] = [
    { role: "user", content: "Podaj plan wydarzeń Lalki" },
    { role: "assistant", content: "Plan wydarzeń Lalki [1]" },
  ];
  const rozmowa = (content: string): Message[] => [...historia, { role: "user", content }];
  const messages = rozmowa("Plan wydarzeń tomu II, rozdział 14");
  assertEquals(rozpoznajPytanieCzatu(messages, {}).utwor?.id, "lalka");
  assert(rozpoznajPytanieCzatu(messages, {}).lektura);
  const krok = await przygotujCzat(messages, { tryb: "czat" }, dostepZ().dostep);
  assertStringIncludes(krok.gotowa!, "1. **t. II, rozdz. 14**");
  assertStringIncludes(krok.gotowa!, "Sedno ma tylko jeden punkt planu");
  assert(!krok.gotowa?.includes("rozdz. 3"));
  assertEquals(rozpoznajPytanieCzatu(rozmowa("Co to jest pochodna?"), {}).utwor, undefined);
  assertEquals(rozpoznajPytanieCzatu(rozmowa("Jak napisać akt notarialny?"), {}).lektura, false);
  assertEquals(rozpoznajPytanieCzatu(rozmowa("Plan wydarzeń Zemsty"), {}).utwor?.id, "zemsta");
  assertEquals(rozpoznajPytanieCzatu(rozmowa("Streść Dziady, część IV"), {}).utwor, undefined);
  assertEquals(rozpoznajPytanieCzatu(rozmowa("Streść „Nieznany tytuł”"), {}).utwor, undefined);
  assertEquals(rozpoznajPytanieCzatu([...rozmowa("Streść „Nieznany tytuł”"), {
    role: "user", content: "Plan wydarzeń pierwszego tomu",
  }], {}).utwor, undefined);
  assertEquals(rozpoznajPytanieCzatu(messages, { chronOdpowiedz: true }).lektura, false);
});

Deno.test("serwer uzupełnia plan tomu II, rozdziału 14 dosłownymi cytatami z tego rozdziału", async () => {
  let wywolania = 0;
  const plik = new URL("./fixtures/lalka-tom-ii-rozdz-14.txt", import.meta.url);
  const tekst = (await Deno.readTextFile(plik)).trim().split(/\r?\n\r?\n/);
  const krok = await przygotujCzat([
    { role: "user", content: "Podaj plan wydarzeń Lalki" },
    { role: "assistant", content: "Oto plan lektury. [35]" },
    { role: "user", content: "Plan wydarzeń tomu II, rozdział 14" },
  ], { tryb: "czat" }, dostepZ({
    wiersze: await elementyLalki(),
    fragmentyMiejsca: (p) => {
      wywolania++;
      assertEquals(p, { p_utwor: "lalka", p_miejsce: "t. 2, rozdz. 14", p_limit: 7 });
      return Promise.resolve([
        { utwor: "lalka", nr: 9, miejsce: "t. I, rozdz. 14", tekst: "Starski grał w karty przez całą noc." },
        ...tekst.map((tekst, i) => ({ utwor: "lalka", nr: 150 + i, miejsce: "t. II, rozdz. 14", tekst, zrodlo_url: XIV })),
        { utwor: "lalka", nr: 160, miejsce: "t. II, rozdz. 15", tekst: "Starski wspomniał o całonocnej grze." },
      ]);
    },
  }).dostep);
  assertEquals(wywolania, 1);
  assert(krok.gotowa);
  assertStringIncludes(krok.gotowa.split("\n").find((w) => w.startsWith("1."))!, "[W32]");
  for (const [i, zdanie] of tekst.entries()) assertStringIncludes(krok.gotowa, `„${zdanie}” [F${150 + i}]`);
  const odp = przez(krok.materialy, krok.gotowa);
  const punkty = odp.wynik.split("\n").filter((w) => /^\d+\./.test(w));
  assert(punkty.length >= 3 && punkty.length <= 6);
  for (const wiersz of punkty) {
    const karta = wiersz.match(/\[\[zrodlo:(\d+)\]\]/);
    assert(karta);
    assertEquals(odp.zrodla[Number(karta[1]) - 1].url, XIV);
  }
  assertEquals(odp.zrodla.filter((z) => z.id?.startsWith("F")).map((z) => z.dowod), tekst);
  assert(!/całonocn|całą noc/i.test(odp.wynik));
  assert(!odp.wynik.includes(ETYKIETA_OGOLNA));
});

Deno.test("plan z wieloma wydarzeniami w rozdziale ma sześć punktów i nie pobiera fragmentów", async () => {
  let wywolania = 0;
  const { krok } = await czat("Plan wydarzeń Lalki, tom II, rozdział 14", {
    wiersze: Array.from({ length: 8 }, (_, i) => wyd(i + 1, "t. II, rozdz. 14", "Zdarzenie w rozdziale.", XIV)),
    fragmentyMiejsca: () => { wywolania++; return Promise.resolve([]); },
  });
  assertEquals(wywolania, 0);
  assertEquals(krok.gotowa!.split("\n").filter((w) => /^\d+\./.test(w)).length, 6);
  assertStringIncludes(krok.gotowa!, "6. **t. II, rozdz. 14**");
});

Deno.test("karty wskazują właściwy tom, a miejsce bez kotwicy jest osobnym tekstem", async () => {
  const przypadki = [
    ["chlopi", "Podaj plan wydarzeń Chłopów", "cz. II, rozdz. 3", "https://wolnelektury.pl/katalog/lektura/chlopi-czesc-pierwsza-jesien/", "https://wolnelektury.pl/katalog/lektura/reymont-chlopi-zima/", "Chłopi"],
    ["chlopi", "Podaj plan wydarzeń Chłopów", "cz. III, rozdz. 1", "https://wolnelektury.pl/katalog/lektura/chlopi-czesc-pierwsza-jesien/", "https://wolnelektury.pl/katalog/lektura/chlopi-czesc-trzecia-wiosna/", "Chłopi"],
    ["chlopi", "Podaj plan wydarzeń Chłopów", "cz. IV, rozdz. 1", "https://wolnelektury.pl/katalog/lektura/chlopi-czesc-pierwsza-jesien/", "https://wolnelektury.pl/katalog/lektura/chlopi-czesc-czwarta-lato/", "Chłopi"],
    ["zbrodnia-i-kara", "Podaj plan wydarzeń Zbrodni i kary", "cz. V, rozdz. 2", "https://pl.wikisource.org/wiki/Zbrodnia_i_kara_(Dostojewski,_1928)/Tom_I/całość", "https://pl.wikisource.org/wiki/Zbrodnia_i_kara_(Dostojewski,_1928)/Tom_II/całość", "Zbrodnia i kara"],
    ["inny-swiat", "Podaj plan wydarzeń Innego świata", "cz. II, Głód", "https://zpe.gov.pl/a/prezentacja-multimedialna/DOPFL0ddG", "https://zpe.gov.pl/a/prezentacja-multimedialna/DOPFL0ddG", "Inny świat · źródło opracowania"],
  ];
  for (const [utwor, pytanie, miejsce, url, oczekiwany, link] of przypadki) {
    const { krok } = await czat(pytanie, { wiersze: [wiersz("wydarzenie", 1, miejsce, { miejsce, opis: "Wydarzenie." }, url, utwor)] });
    const z = krok.materialy.find((m) => m.id === "W1")?.zrodlo;
    assert(z);
    assertEquals(z.url, oczekiwany);
    assertEquals(opisKartyZrodla(z), { link, miejsce });
    assertEquals(opisKartyZrodla({ ...z, sekcja: miejsce }), { link, miejsce });
  }
  for (const [utwor, tytul, url] of [
    ["zemsta", "Zemsty", "https://wolnelektury.pl/katalog/lektura/zemsta.html#s33"],
    ["makbet", "Makbeta", "https://wolnelektury.pl/katalog/lektura/makbet.html#s26"],
  ]) {
    const miejsce = utwor === "zemsta" ? "akt IV, sc. 5" : "akt V, sc. 1";
    const { krok } = await czat(`Podaj plan wydarzeń ${tytul}`, { wiersze: [wiersz("wydarzenie", 1, miejsce, { miejsce, opis: "Wydarzenie." }, url, utwor)] });
    const z = krok.materialy.find((m) => m.id === "W1")?.zrodlo;
    assert(z);
    assertEquals(z.url, url);
    assertEquals(opisKartyZrodla(z).miejsce, undefined);
    assertStringIncludes(opisKartyZrodla(z).link, miejsce);
  }
});

Deno.test("karta zachowuje osobny odsyłacz do każdej sceny albo części", async () => {
  const wl = "https://wolnelektury.pl/katalog/lektura/";
  const cases = [
    ["makbet", "Podaj plan wydarzeń Makbeta", "akt II, sc. 1; akt V, sc. 5",
      ["akt II, sc. 1", "akt V, sc. 5"], ["akt II, sc. 1", "akt V, sc. 5"],
      [wl + "makbet.html#s10", wl + "makbet.html#s30"]],
    ["chlopi", "Podaj plan wydarzeń Chłopów", "Zima XIII; Wiosna XI",
      ["Zima XIII", "Wiosna XI"], ["cz. 2, rozdz. 13", "cz. 3, rozdz. 11"],
      [wl + "reymont-chlopi-zima.html#s13", wl + "chlopi-czesc-trzecia-wiosna.html#s11"]],
  ] as const;
  for (const [utwor, pytanie, miejsce, napisy, klucze, url] of cases) {
    const { krok } = await czat(pytanie, {
      wiersze: [wiersz("wydarzenie", 1, miejsce, { miejsce, opis: "Postać przeżywa dwa ważne wydarzenia." }, wl + utwor + "/", utwor)],
      kotwice: (p) => {
        assertEquals(p, { p_utwor: utwor, p_miejsca: [...klucze] });
        return Promise.resolve(klucze.map((miejsce, i) => ({ miejsce, url: url[i] })));
      },
    });
    assertStringIncludes(krok.gotowa!, miejsce);
    const odp = przez(krok.materialy, krok.gotowa!);
    const meta = odczytajOdpowiedzPestki(JSON.parse(JSON.stringify(metadaneCzatu(odp.wynik, odp.zrodla, false))));
    assertEquals(meta?.zrodla[0]?.url, url[0]);
    assertEquals(meta?.zrodla[0]?.miejsce, napisy[0]);
    assertEquals(meta?.zrodla[0]?.miejsca, napisy.map((miejsce, i) => ({ miejsce, url: url[i] })));
  }

  const { krok } = await czat("Podaj plan wydarzeń Makbeta", {
    wiersze: [wiersz("wydarzenie", 1, "akt II, sc. 1; akt V, sc. 5",
      { miejsce: "akt II, sc. 1; akt V, sc. 5", opis: "Postać przeżywa dwa wydarzenia." }, wl + "makbet.html#s10", "makbet")],
    kotwice: () => Promise.resolve([]),
  });
  assertEquals(krok.materialy.find((m) => m.id === "W1")?.zrodlo?.miejsca?.map((m) => m.url), [wl + "makbet.html#s10", wl + "makbet.html"]);
});

Deno.test("karty Chłopów rozwijają listy, a zakresy prowadzą do pierwszego rozdziału", async () => {
  const url = "https://wolnelektury.pl/katalog/lektura/chlopi-czesc-pierwsza-jesien.html";
  for (const lista of ["8 i 10", "8, 10"]) {
    const miejsce = `cz. I, rozdz. ${lista}`;
    const miejsca = ["cz. I, rozdz. 8", "cz. I, rozdz. 10"];
    const { krok } = await czat("Podaj plan wydarzeń Chłopów", {
      wiersze: [wiersz("wydarzenie", 1, miejsce, { miejsce, opis: "Opis wydarzenia." }, url + "#s8", "chlopi")],
      kotwice: (p) => {
        assertEquals(p.p_miejsca, miejsca);
        return Promise.resolve(miejsca.map((miejsce, i) => ({ miejsce, url: url + (i ? "#s10" : "#s8") })));
      },
    });
    const [karta] = przez(krok.materialy, krok.gotowa!).zrodla;
    assertEquals(karta.url, url + "#s8");
    assertEquals(karta.miejsca, [{ miejsce: miejsca[0], url: url + "#s8" }, { miejsce: miejsca[1], url: url + "#s10" }]);
  }
  for (const nr of [2, 4]) {
    const miejsce = `cz. I, rozdz. ${nr}–5`;
    const cel = `${url}#s${nr}`;
    const { krok } = await czat("Podaj plan wydarzeń Chłopów", {
      wiersze: [wiersz("wydarzenie", 1, miejsce, { miejsce, opis: "Opis wydarzenia." }, cel, "chlopi")],
    });
    const [karta] = przez(krok.materialy, krok.gotowa!).zrodla;
    assertEquals([karta.miejsca, karta.url], [undefined, cel]);
    assertEquals(opisKartyZrodla(karta), { link: `Chłopi · ${miejsce}, od początku ${nr}`, miejsce: undefined });
  }
});

Deno.test("odpowiedź o Innym świecie raz wyjaśnia dostępność tekstu i zwraca jedną kartę dla strony", async () => {
  const url = "https://zpe.gov.pl/a/prezentacja-multimedialna/DOPFL0ddG";
  const { krok } = await czat("Podaj plan wydarzeń Innego świata", {
    wiersze: [
      wiersz("wydarzenie", 1, "cz. I, Praca", {
        miejsce: "cz. I, Praca", opis: "Więźniowie pracują przy wyrębie lasu.",
      }, url, "inny-swiat"),
      wiersz("wydarzenie", 2, "cz. II, Głód", {
        miejsce: "cz. II, Głód", opis: "Narrator opisuje niedożywienie więźniów.",
      }, url, "inny-swiat"),
    ],
  });
  const p = krok.procesor!;
  const tekst = p.dodaj(krok.gotowa!) + p.zakoncz();
  const wstep = "Sedno nie ma tekstu tego utworu i opiera się na opracowaniu.";
  assert(tekst.startsWith(wstep + "\n\n"));
  assertEquals(tekst.split(wstep).length, 2);
  assertEquals(tekst.match(/\[\[zrodlo:1\]\]/g)?.length, 2);
  assertEquals(p.zrodla().map((z) => [z.rodzaj, z.url, z.miejsce]), [["opracowanie", url, undefined]]);
});

Deno.test("epilog Innego świata ma stronę opisującą epilog, a karta zostaje przy wspartym zdaniu", async () => {
  const { dane } = (await wczytajPlikiLektur()).find((p) => p.nazwa === "inny-swiat")!;
  const wiersze = wierszeElementow(dane as PlikLektury);
  const stareCwiczenia = "https://zpe.gov.pl/watek/LPFHDLRM4G/318/a/cwiczenia/D6ESU6QNP";
  const epilog = "https://zpe.gov.pl/a/przeczytaj/DYOHC1uNy";
  assertEquals(wiersze.find((w) => w.rodzaj === "wydarzenie" && w.nr === 22)?.zrodlo_url, stareCwiczenia);
  const { krok } = await czat("Jak kończy się Inny świat?", {
    wiersze: wiersze.filter((w) => w.rodzaj === "wydarzenie").reverse().slice(0, 5),
    sekcje: [{
      ...sekcjaRow("streszczenie", "Narrator podaje rozmówcy rękę.", "inny-swiat"),
      zrodlo_url: "https://zpe.gov.pl/a/sprawdz-sie/Dly3K3ja7", zrodlo_rodzaj: "opracowanie",
    }],
  });
  const zgodne = "Rozmówca chce usłyszeć, że narrator rozumie jego decyzję, ale narrator pozostaje milczący.";
  assertEquals(krok.materialy.find((m) => m.id === "W22")?.zrodlo?.url, epilog);
  assertEquals(krok.materialy.find((m) => m.id === "W20")?.zrodlo, undefined);
  const p = krok.procesor!;
  const tekst = p.dodaj(zgodne + " [W22] Narrator podaje rozmówcy rękę [W22][S:streszczenie] [[zrodlo:1]].") + p.zakoncz();
  assertStringIncludes(tekst, zgodne + " [[zrodlo:1]] Narrator podaje rozmówcy rękę.");
  assertEquals(p.zrodla().map((z) => [z.url, z.twierdzenie]), [[epilog, "[1] " + zgodne]]);
});

async function elementyLalki() {
  const { dane } = (await wczytajPlikiLektur()).find((p) => p.nazwa === "lalka")!;
  return wierszeElementow(dane as PlikLektury);
}

Deno.test("samotność i jej synonimy dają scenę, miejsce i odsyłacz do źródła rozprawki", async () => {
  const wiersze = await elementyLalki();
  for (const temat of ["samotności", "wyobcowaniu", "osamotnieniu"]) {
    const { krok, wywolania } = await czat(`Pomóż mi z argumentem do rozprawki o ${temat}, z Lalki`, {
      szukajElementow: (p) => Promise.resolve(wiersze.filter((w) => p.p_rodzaje.includes(w.rodzaj) &&
        (p.p_kolejnosc || (w.rodzaj === "motyw" && p.p_pytanie.includes("samotność") && w.nr === 7)))),
    });
    assertStringIncludes(wywolania.elementy[0].p_pytanie, "wyobcowanie");
    assertStringIncludes(system(krok), "[M7] samotność i rozpacz");
    assertStringIncludes(system(krok), "[W32] t. II, rozdz. 14");
    assertStringIncludes(system(krok), "1–2 konkretnych scenach");
    const { wynik, zrodla } = przez(krok.materialy, "Załamanie Wokulskiego widać w Skierniewicach (t. II, rozdz. 14) [M7][W32].");
    assertEquals(zrodla[0].url, XIV);
    assert(!wynik.includes(ETYKIETA_OGOLNA));
    assertEquals(Object.keys(metadaneCzatu(wynik, zrodla, false)).sort(), ["akcje", "zrodla"]);
  }
});

Deno.test("zakończenie Lalki pobiera ostatnie wydarzenia i streszczenie", async () => {
  const wiersze = await elementyLalki();
  const { krok, wywolania } = await czat("Jak kończy się Lalka?", {
    szukajElementow: (p) => Promise.resolve(
      p.p_od_konca ? wiersze.filter((w) => w.rodzaj === "wydarzenie").toReversed().slice(0, p.p_limit) : [],
    ),
    sekcje: [sekcjaRow("streszczenie", "Los Wokulskiego pozostaje otwarty.")],
  });
  assertEquals(wywolania.elementy[0].p_od_konca, true);
  assertEquals(krok.materialy.map((m) => m.id), ["K", "W34", "W35", "W36", "W37", "W38", "S:streszczenie"]);
  assertStringIncludes(system(krok), "Rzecki umiera");
  const { wynik, zrodla } = przez(krok.materialy, "Pod koniec powieści umiera Rzecki [W38]. Los Wokulskiego pozostaje otwarty [S:streszczenie].");
  assert(!wynik.includes(ETYKIETA_OGOLNA));
  assertEquals(zrodla.map((z) => z.id), ["W38", "S:streszczenie"]);
});

Deno.test("zakończenie Hamleta dostaje materiał i polecenie w kolejności fabuły", async () => {
  const { dane } = (await wczytajPlikiLektur()).find((p) => p.nazwa === "hamlet")!;
  const wydarzenia = wierszeElementow(dane as PlikLektury).filter((w) => w.rodzaj === "wydarzenie").slice(-5);
  const { krok } = await czat("Jak kończy się Hamlet?", {
    szukajElementow: (p) => Promise.resolve(p.p_od_konca ? wydarzenia.toReversed() : []),
  });
  assertEquals(krok.materialy.filter((m) => m.rodzaj === "wydarzenie").map((m) => m.id), wydarzenia.map((w) => `W${w.nr}`));
  assertStringIncludes(system(krok), "od najwcześniejszego z nich do ostatniego");
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
  assertEquals(p.dodaj("Tak, Wokulski był w Paryżu i rozmawiał tam z Geistem.\n"), "");
  assertEquals(p.zakoncz(), `Tak, Wokulski był w Paryżu i rozmawiał tam z Geistem. ${ETYKIETA_OGOLNA}`);
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
