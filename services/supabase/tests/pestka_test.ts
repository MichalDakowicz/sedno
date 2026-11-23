import { assert, assertEquals } from "jsr:@std/assert";
import { odczytajOdpowiedzPestki, zatwierdzPowierzchnie } from "../functions/_shared/pestka-odpowiedz.ts";
import { metadaneCzatu, odpowiedzWeryfikacji, przygotujCzat, weryfikuj } from "../functions/ai/pestka.ts";
import { zawieraCytat } from "../functions/ai/lektury.ts";

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
const bezSieci = () => { throw new Error("Nieoczekiwane wywołanie sieci"); };
const dostep = {
  baza: () => Promise.resolve([]), brave: "", fetcher: bezSieci,
  signal: AbortSignal.timeout(10_000), zapytaj: async () => cel,
};

Deno.test("bezpośrednie pytania z matematyki, informatyki i angielskiego nie wywołują wyszukiwania", async () => {
  for (const content of ["Co to jest pochodna?", "Co oznacza GROUP BY?", "Kiedy używam Past Simple?"]) {
    const krok = await przygotujCzat([{ role: "user", content }], { tryb: "czat" }, { ...dostep, baza: bezSieci, zapytaj: bezSieci });
    assertEquals(krok.materialy, []);
    assertEquals(krok.messages.at(-1)?.content, content);
  }
});

Deno.test("pytanie o Wokulskiego pobiera sekcję bohaterów Lalki i pokazuje wyłącznie użyte źródło", async () => {
  const krok = await przygotujCzat([{ role: "user", content: "Kim jest Wokulski?" }], { tryb: "czat" }, {
    ...dostep,
    baza: (p) => {
      assertEquals(p, { p_przedmiot: "polski", p_utwor: "lalka", p_sekcja: "bohaterowie", p_pytanie: "Kim jest Wokulski?" });
      return Promise.resolve([{ ...rekord, utwor: "lalka", sekcja: "bohaterowie", tekst: "Wokulski jest kupcem.",
        zrodlo_url: "https://wolnelektury.pl/katalog/lektura/lalka/" }]);
    },
  });
  const dane = metadaneCzatu("Wokulski jest kupcem. [[zrodlo:1]][[zrodlo:8]]\n[[akcja:sprawdz]]", krok.materialy, false);
  assertEquals(dane.akcje, ["zrodlo"]);
  assertEquals(dane.zrodla[0]?.sekcja, "Opracowanie Sedno · Bohaterowie i relacje");
  assertEquals(dane.zrodla[0]?.twierdzenie, "[1] Wokulski jest kupcem.");
});

Deno.test("akapit jest oceniany w obrębie wskazanego utworu, a karta przechodzi walidację po serializacji", async () => {
  let wywolania = 0;
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
  const podmieniony = { ...dane, a2ui: { ...dane.a2ui as object, dodatkowaAkcja: "download" } };
  assertEquals(zatwierdzPowierzchnie(podmieniony), undefined);
});

Deno.test("brak dowodu i niedostępna sieć dają stan Niepotwierdzone", async () => {
  let wywolania = 0;
  const wynik = await weryfikuj(fragment, "", {
    ...dostep, baza: () => Promise.resolve([rekord]),
    zapytaj: () => Promise.resolve(wywolania++ === 0 ? cel : werdykt.replace(dowod, "Rejent porzuca mur")),
    fetcher: () => Promise.resolve(new Response(null, { status: 503 })),
  });
  assertEquals(wynik.sprawdzenie.status, "Niepotwierdzone");
  assertEquals(wynik.zrodla, []);
});

Deno.test("cytat musi występować dosłownie, z tolerancją odstępów", () => {
  assert(zawieraCytat("Niech się dzieje\n wola nieba,", "Niech się dzieje wola nieba"));
  assert(!zawieraCytat("Niech się dzieje wola nieba", "Niech sie dzieje wola nieba"));
  assert(!zawieraCytat("Niech się dzieje wola nieba", "Niech się dzieje wola nieb"));
});
