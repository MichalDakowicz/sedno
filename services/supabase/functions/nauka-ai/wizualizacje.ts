const MODELE = [
  {
    id: "parabola",
    przedmiot: "matematyka",
    nazwa: "Wykres funkcji kwadratowej",
    parametry: {
      a: { min: -3, max: 3, krok: 0.1, wartosc: 1 },
      p: { min: -6, max: 6, krok: 0.5, wartosc: 2 },
      q: { min: -6, max: 6, krok: 0.5, wartosc: -1 },
    },
    pytania: ["Co zmienia znak parametru a?", "Jak p i q wpływają na położenie wierzchołka?"],
  },
  {
    id: "wyszukiwanie-binarne",
    przedmiot: "informatyka",
    nazwa: "Wyszukiwanie binarne krok po kroku",
    tablica: [2, 5, 8, 13, 21, 25, 32, 49],
    szukana: 25,
    pytania: ["Którą część tablicy możesz odrzucić po pierwszym porównaniu?", "Co zwróci algorytm, jeśli liczby nie ma?"],
  },
  {
    id: "tekst-parafraza",
    przedmiot: "angielski",
    nazwa: "Tekst i parafraza",
    umiejetnosc: "czytanie-szczegoly",
    pytania: ["Który fragment zawiera tę samą informację ujętą innymi słowami?"],
  },
] as const;

const TEKST = {
  fragmenty: [
    { id: "a", tekst: "The Saturday repair café usually meets in the market hall." },
    { id: "b", tekst: "While the roof is being fixed, the volunteers will use a room at the library." },
    { id: "c", tekst: "Bring one broken item and arrive before noon." },
  ],
  parafraza: "The group has temporarily moved its meetings to another venue.",
};

type Obiekt = Record<string, unknown>;

export function katalogWizualizacji(przedmiot: unknown) {
  if (przedmiot === undefined) return MODELE;
  return MODELE.filter((m) => m.przedmiot === przedmiot);
}

function parametr(wartosc: unknown, meta: { min: number; max: number; wartosc: number }) {
  if (wartosc === undefined) return meta.wartosc;
  return typeof wartosc === "number" && Number.isFinite(wartosc) &&
    wartosc >= meta.min && wartosc <= meta.max ? wartosc : null;
}

function parabola(body: Obiekt) {
  const meta = MODELE[0].parametry;
  const a = parametr(body.a, meta.a);
  const p = parametr(body.p, meta.p);
  const q = parametr(body.q, meta.q);
  if (a === null || p === null || q === null) return null;

  const punkty = Array.from({ length: 49 }, (_, n) => {
    const x = -6 + n * 0.25;
    const y = a * (x - p) ** 2 + q;
    return { x, y };
  });
  const ksztalt = a === 0 ? "stala" : "parabola";
  const wierzcholek = a === 0 ? null : { x: p, y: q };
  const opis = a === 0 ? `Wykres funkcji stałej y = ${q}.` :
    `Parabola o wierzchołku (${p}, ${q}), z ramionami skierowanymi ${a > 0 ? "w górę" : "w dół"}.`;
  return { id: "parabola", a, p, q, wierzcholek, ksztalt, punkty, opis };
}

function poprawnaLiczba(wartosc: unknown): wartosc is number {
  return typeof wartosc === "number" && Number.isInteger(wartosc) && Math.abs(wartosc) <= 9999;
}

function wyszukiwanieBinarne(body: Obiekt) {
  const meta = MODELE[1];
  const tablica = body.tablica === undefined ? meta.tablica : body.tablica;
  const szukana = body.szukana === undefined ? meta.szukana : body.szukana;
  if (!Array.isArray(tablica) || tablica.length < 1 || tablica.length > 25 ||
    !tablica.every(poprawnaLiczba) || !poprawnaLiczba(szukana) ||
    tablica.some((liczba, i) => i > 0 && liczba < tablica[i - 1])) return null;

  const kroki = [];
  let lewy = 0;
  let prawy = tablica.length - 1;
  let indeks: number | null = null;
  while (lewy <= prawy) {
    const srodek = Math.floor((lewy + prawy) / 2);
    const wartosc = tablica[srodek];
    const wynik = wartosc === szukana ? "znaleziono" : wartosc < szukana ? "szukaj-po-prawej" : "szukaj-po-lewej";
    kroki.push({ lewy, prawy, srodek, wartosc, wynik, opis: `Zakres od pozycji ${lewy + 1} do ${prawy + 1}. Na pozycji ${srodek + 1} jest ${wartosc}.` });
    if (wynik === "znaleziono") {
      indeks = srodek;
      break;
    }
    if (wynik === "szukaj-po-prawej") lewy = srodek + 1;
    else prawy = srodek - 1;
  }
  return { id: "wyszukiwanie-binarne", tablica, szukana, kroki, indeks };
}

function parafraza(body: Obiekt) {
  if (body.fragment === undefined) return { id: "tekst-parafraza", ...TEKST };
  if (!TEKST.fragmenty.some((f) => f.id === body.fragment)) return null;
  return {
    id: "tekst-parafraza", ...TEKST,
    zgodny: body.fragment === "b",
    objasnienie: "Zdanie o naprawie dachu mówi, że wolontariusze przez pewien czas będą spotykać się w bibliotece.",
  };
}

export function stanWizualizacji(body: Obiekt) {
  switch (body.id) {
    case "parabola":
      return parabola(body);
    case "wyszukiwanie-binarne":
      return wyszukiwanieBinarne(body);
    case "tekst-parafraza":
      return parafraza(body);
    default:
      return null;
  }
}
