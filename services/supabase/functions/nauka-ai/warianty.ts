import { rownaLiczba, ulamek, unormujTekst } from "./odpowiedzi.ts";

export const PRZEDMIOTY_WARIANTOW = ["matematyka", "informatyka", "angielski"] as const;
type Przedmiot = typeof PRZEDMIOTY_WARIANTOW[number];
type Poziom = "podstawowy" | "rozszerzony" | "dwujezyczny";
type Wydatek = { dzial: string; rok: number; kwota: number };

export type KluczWariantu =
  | { typ: "liczba" | "tekst"; wartosc: string }
  | { typ: "korzenie"; wartosci: string[] }
  | { typ: "pola"; wartosci: Record<string, string> }
  | { typ: "sql-sumy"; rok: number; proby: Wydatek[][] };

type Wariant = {
  zadanie: { polecenie: string; forma: "liczba" | "tekst" | "lista" | "pola" | "sql"; dane?: unknown; pola?: string[]; punkty: number };
  klucz: KluczWariantu;
};

type Szablon = {
  przedmiot: Przedmiot;
  poziomy: readonly Poziom[];
  nazwa: string;
  generuj: () => Wariant;
};

const PODSTAWOWY = ["podstawowy", "rozszerzony"] as const;
const INFORMATYKA = ["rozszerzony"] as const;
const ANGIELSKI = ["podstawowy", "rozszerzony", "dwujezyczny"] as const;

function losuj(a: number, b: number) {
  return a + crypto.getRandomValues(new Uint32Array(1))[0] % (b + 1 - a);
}

function wybierz<T>(opcje: readonly T[]): T {
  return opcje[losuj(0, opcje.length - 1)];
}

function plus(n: number) {
  return n < 0 ? "− " + Math.abs(n) : "+ " + n;
}

function liczba(polecenie: string, wynik: number | string, dane?: unknown): Wariant {
  return { zadanie: { polecenie, forma: "liczba", punkty: 1, dane }, klucz: { typ: "liczba", wartosc: String(wynik) } };
}

function pola(polecenie: string, wartosci: Record<string, number>, dane?: unknown): Wariant {
  const klucz = Object.fromEntries(Object.entries(wartosci).map(([pole, wartosc]) => [pole, String(wartosc)]));
  return {
    zadanie: { polecenie, forma: "pola", pola: Object.keys(wartosci), punkty: Object.keys(wartosci).length, dane },
    klucz: { typ: "pola", wartosci: klucz },
  };
}

function nwd(a: number, b: number) {
  while (b > 0) [a, b] = [b, a % b];
  return a;
}

function wydatki(rok: number, dzialy: readonly string[], wiersze: number) {
  return Array.from({ length: wiersze }, (_, i): Wydatek => ({
    dzial: dzialy[i % dzialy.length], rok: i < dzialy.length ? rok : wybierz([rok - 1, rok, rok + 1]),
    kwota: losuj(1, 230),
  }));
}

const IMIONA = ["Amelia", "Alex", "Ben", "Chloe", "Daniel", "Ella", "Finn", "Isabel", "James", "Leah", "Maya", "Oliver", "Priya", "Sofia", "Tom", "Zoe"];
const CZAS = ["yesterday", "last Friday", "two weeks ago", "last night", "on Monday morning", "last summer", "three days ago", "last weekend"];
const PAST = [
  ["buy", "bought", "a gift"], ["write", "wrote", "a letter"], ["find", "found", "an old photo"],
  ["take", "took", "the train"], ["make", "made", "a cake"], ["see", "saw", "a fox"], ["read", "read", "a short story"],
  ["send", "sent", "a postcard"], ["lose", "lost", "a USB drive"], ["meet", "met", "an old friend"],
];
const PASSIVE = [
  ["the parcel", "deliver", "delivered", false], ["the orders", "deliver", "delivered", true],
  ["the painting", "sell", "sold", false], ["the books", "sell", "sold", true],
  ["the letters", "write", "written", true], ["the invitation", "send", "sent", false],
  ["the bridge", "repair", "repaired", false], ["the laptops", "repair", "repaired", true],
  ["the keys", "find", "found", true], ["the gate", "close", "closed", false],
] as const;
const WARUNKI = [
  ["leave early", "get there on time"], ["take the bus", "save money"], ["study hard", "be ready for the test"],
  ["turn left", "see the station"], ["order online", "get a discount"], ["wait here", "meet the guide"],
  ["start early", "finish before lunch"], ["bring some water", "feel better"], ["follow the map", "find the museum"],
];

function angielski(zdanie: string, oczekiwane: string): Wariant {
  return {
    zadanie: { polecenie: "Uzupełnij lukę czasownikiem z nawiasu w odpowiedniej formie.", forma: "tekst", punkty: 1, dane: { zdanie } },
    klucz: { typ: "tekst", wartosc: oczekiwane },
  };
}

export const SZABLONY = {
  "rownanie-liniowe": {
    przedmiot: "matematyka", poziomy: PODSTAWOWY, nazwa: "Równanie liniowe",
    generuj() {
      const [a, przesuniecie, x] = [losuj(2, 19), wybierz([-1, 1]) * losuj(1, 30), losuj(-35, 35)];
      const b = a * (x + przesuniecie);
      return liczba("Rozwiąż równanie " + a + "(x " + plus(przesuniecie) + ") = " + b + ".", x);
    },
  },
  "rownanie-kwadratowe": {
    przedmiot: "matematyka", poziomy: PODSTAWOWY, nazwa: "Dwa pierwiastki równania kwadratowego",
    generuj(): Wariant {
      const [x, y, a] = [losuj(-28, 10), losuj(11, 42), losuj(1, 6)];
      const wzor = (a === 1 ? "" : a) + "x² " + plus(-a * (x + y)) + "x " + plus(a * x * y);
      return {
        zadanie: { polecenie: "Podaj oba pierwiastki równania " + wzor + " = 0. Oddziel je średnikiem.", forma: "lista", punkty: 1 },
        klucz: { typ: "korzenie", wartosci: [String(x), String(y)] },
      };
    },
  },
  "ciag-arytmetyczny": {
    przedmiot: "matematyka", poziomy: PODSTAWOWY, nazwa: "Wyraz i suma ciągu arytmetycznego",
    generuj() {
      const [a, r, n] = [losuj(-55, 55), wybierz([-1, 1]) * losuj(1, 15), losuj(5, 35)];
      const wyrazy = Array.from({ length: n }, (_, i) => a + i * r);
      return pola("Pierwszy wyraz ciągu arytmetycznego to " + a + ", a różnica to " + r +
        ". Oblicz wyraz numer " + n + " i sumę pierwszych " + n + " wyrazów.",
      { wyraz: wyrazy[n - 1], suma: wyrazy.reduce((suma, x) => suma + x, 0) });
    },
  },
  "losowanie-bez-zwrotu": {
    przedmiot: "matematyka", poziomy: PODSTAWOWY, nazwa: "Prawdopodobieństwo bez zwracania",
    generuj() {
      const [c, n] = [losuj(3, 38), losuj(3, 45)];
      const licznik = c * (c - 1);
      const mianownik = (c + n) * (c + n - 1);
      const dzielnik = nwd(licznik, mianownik);
      return liczba("W worku jest " + c + " czerwonych i " + n + " niebieskich kul. Losujesz kolejno dwie kule bez zwracania. " +
        "Oblicz prawdopodobieństwo wylosowania dwóch czerwonych kul.", (licznik / dzielnik) + "/" + (mianownik / dzielnik));
    },
  },
  "algorytm-nwd": {
    przedmiot: "informatyka", poziomy: INFORMATYKA, nazwa: "Algorytm Euklidesa",
    generuj() {
      const [a, b, mnoznik] = [losuj(25, 150), losuj(4, 24), losuj(2, 12)];
      const liczby = [a * mnoznik, b * mnoznik];
      return liczba("Podaj wynik algorytmu Euklidesa dla a = " + liczby[0] + " i b = " + liczby[1] + ".",
        nwd(liczby[0], liczby[1]), { a: liczby[0], b: liczby[1] });
    },
  },
  "tablica-podzielne": {
    przedmiot: "informatyka", poziomy: INFORMATYKA, nazwa: "Zliczanie i sumowanie elementów tablicy",
    generuj() {
      const dzielnik = losuj(3, 12);
      const liczby = Array.from({ length: losuj(8, 16) }, () => losuj(-40, 90));
      const pasujace = liczby.filter((x) => x % dzielnik === 0);
      return pola("Dla tablicy z danych podaj liczbę oraz sumę elementów podzielnych przez " + dzielnik + ".",
        { ile: pasujace.length, suma: pasujace.reduce((suma, x) => suma + x, 0) }, { liczby, dzielnik });
    },
  },
  "sql-sumy": {
    przedmiot: "informatyka", poziomy: INFORMATYKA, nazwa: "SQL · filtrowanie i sumy w grupach",
    generuj(): Wariant {
      const rok = losuj(2017, 2035);
      const dzialy = wybierz([["IT", "HR", "OPS"], ["A", "B", "C"], ["LOG", "OPS", "RND"]]);
      const dane = wydatki(rok, dzialy, 12);
      return {
        zadanie: {
          polecenie: "Napisz jedno zapytanie SELECT do tabeli wydatki. Zwróć dzial oraz sumę kwota dla roku " + rok +
            " w każdym dziale. Posortuj rosnąco po dzial. Kolumny to dzial (tekst), rok i kwota (liczby całkowite).",
          forma: "sql", punkty: 2, dane: { wydatki: dane },
        },
        klucz: { typ: "sql-sumy", rok, proby: [dane, wydatki(rok, ["IT", "LOG", "RND", "HR"], 18), wydatki(rok, ["C", "A"], 8)] },
      };
    },
  },
  "past-simple": {
    przedmiot: "angielski", poziomy: ANGIELSKI, nazwa: "Past Simple · nieregularne czasowniki",
    generuj() {
      const [bezokolicznik, czasownik, dopelnienie] = wybierz(PAST);
      return angielski(wybierz(IMIONA) + " ___ (" + bezokolicznik + ") " + dopelnienie + " " + wybierz(CZAS) + ".", czasownik);
    },
  },
  "past-passive": {
    przedmiot: "angielski", poziomy: ANGIELSKI, nazwa: "Strona bierna w Past Simple",
    generuj() {
      const [podmiot, bezokolicznik, imieslow, mnoga] = wybierz(PASSIVE);
      return angielski(podmiot[0].toUpperCase() + podmiot.slice(1) + " ___ (" + bezokolicznik + ") " + wybierz(CZAS) +
        " by " + wybierz(IMIONA) + ".", (mnoga ? "were " : "was ") + imieslow);
    },
  },
  "first-conditional": {
    przedmiot: "angielski", poziomy: ANGIELSKI, nazwa: "Pierwszy okres warunkowy",
    generuj() {
      const [czynnosc, skutek] = wybierz(WARUNKI);
      const [czasownik, ...reszta] = czynnosc.split(" ");
      const osoba = wybierz(["we", "they", "you", "I"]);
      const kiedy = wybierz(["", " tomorrow", " this week", " today"]);
      return angielski("If " + osoba + " ___ (" + czasownik + ") " + reszta.join(" ") + kiedy + ", " + osoba + " will " + skutek + ".", czasownik);
    },
  },
} satisfies Record<string, Szablon>;

export type SzablonId = keyof typeof SZABLONY;

export function katalogWariantow(przedmiot?: Przedmiot) {
  return Object.entries(SZABLONY).flatMap(([id, { przedmiot: p, poziomy, nazwa }]) =>
    !przedmiot || p === przedmiot ? [{ id, przedmiot: p, poziomy, nazwa }] : []
  );
}

type Kryterium = { opis: string; punkty: number; maksPunktow: number };
export type OcenaWariantu = { kryteria: Kryterium[]; opis: string } | null;
export type OdpowiedzWariantu = { tekst: string | null; kod: string | null; pola: Record<string, string> | null };

function kryterium(opis: string, dobrze: boolean): Kryterium {
  return { opis, punkty: dobrze ? 1 : 0, maksPunktow: 1 };
}

function sumy(dane: Wydatek[], rok: number | null, agregat: "sum" | "count", kolumna: "kwota" | "rok" | "*") {
  const wynik = new Map<string, number>();
  for (const row of dane) {
    if (rok !== null && row.rok !== rok) continue;
    const mnoznik = agregat === "count" ? 1 : kolumna === "rok" ? row.rok : row.kwota;
    wynik.set(row.dzial, (wynik.get(row.dzial) ?? 0) + mnoznik);
  }
  return [...wynik].sort(([a], [b]) => a < b ? -1 : 1);
}

function ocenSql(klucz: Extract<KluczWariantu, { typ: "sql-sumy" }>, kod: string) {
  // Zamknięty podzbiór SELECT-a. Dane są w pamięci, a zapytanie ucznia nigdy nie trafia do bazy Sedna.
  const select = kod.trim().match(/^select\s+dzial\s*,\s*(sum|count)\s*\(\s*(kwota|rok|\*)\s*\)(?:\s+(?:as\s+)?(?!from\b)[a-z][a-z_0-9]*)?\s+from\s+wydatki(?:\s+where\s+rok\s*=\s*(\d{4}))?\s+group\s+by\s+dzial(?:\s+order\s+by\s+(dzial|1)(?:\s+(asc|desc))?)?\s*;?$/i);
  if (!select) return null;
  const agregat = select[1].toLowerCase() as "sum" | "count";
  const kolumna = select[2].toLowerCase() as "kwota" | "rok" | "*";
  if (agregat === "sum" && kolumna === "*") return null;
  const rok = select[3] ? Number(select[3]) : null;
  const zgodnaAgregacja = klucz.proby.every((dane) =>
    JSON.stringify(sumy(dane, rok, agregat, kolumna)) === JSON.stringify(sumy(dane, klucz.rok, "sum", "kwota"))
  );
  const porzadek = Boolean(select[4] && select[5]?.toLowerCase() !== "desc");
  return [
    kryterium("Filtrowanie roku, grupowanie i suma", zgodnaAgregacja),
    kryterium("Rosnąca kolejność działów", porzadek),
  ];
}

export function ocenWariant(klucz: KluczWariantu, odpowiedz: OdpowiedzWariantu): OcenaWariantu {
  const { tekst, kod } = odpowiedz;
  let kryteria: Kryterium[];
  switch (klucz.typ) {
    case "liczba": {
      const zgodna = tekst && rownaLiczba(tekst, klucz.wartosc);
      if (typeof zgodna !== "boolean") return null;
      kryteria = [kryterium("Wartość liczbowa", zgodna)];
      break;
    }
    case "tekst":
      if (!tekst) return null;
      kryteria = [kryterium("Forma gramatyczna", unormujTekst(tekst) === unormujTekst(klucz.wartosc))];
      break;
    case "korzenie": {
      const wpisane = tekst?.trim().replace(/^[{\[]|[}\]]$/g, "").split(/\s*[;\n]\s*|,\s+/);
      if (!wpisane || wpisane.length !== 2 || wpisane.some((s) => !ulamek(s))) return null;
      const [x, y] = wpisane;
      const [a, b] = klucz.wartosci;
      const zgodne = Boolean((rownaLiczba(x, a) && rownaLiczba(y, b)) || (rownaLiczba(x, b) && rownaLiczba(y, a)));
      kryteria = [kryterium("Oba pierwiastki równania", zgodne)];
      break;
    }
    case "pola": {
      const odpowiedzi = odpowiedz.pola;
      if (!odpowiedzi || Object.keys(odpowiedzi).some((p) => !Object.hasOwn(klucz.wartosci, p))) return null;
      if (Object.values(odpowiedzi).some((w) => !ulamek(w))) return null;
      kryteria = Object.entries(klucz.wartosci).map(([p, w]) => kryterium(p, Boolean(rownaLiczba(odpowiedzi[p] ?? "", w))));
      break;
    }
    case "sql-sumy": {
      const ocenione = kod ? ocenSql(klucz, kod) : null;
      if (!ocenione) return null;
      kryteria = ocenione;
      break;
    }
  }
  const poprawne = kryteria.every((k) => k.punkty === k.maksPunktow);
  return { kryteria, opis: poprawne ? "Rozwiązanie jest poprawne." : "Sprawdź kryteria, przy których brakuje punktów." };
}
