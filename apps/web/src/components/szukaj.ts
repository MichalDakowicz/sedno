// Dopasowanie dla wyszukiwania: bez wielkości liter i polskich znaków, z tolerancją jednej literówki w słowie.

export type RodzajWyniku = "akcja" | "arkusz" | "rozmowa";

export type Wynik = {
  id: string;
  rodzaj: RodzajWyniku;
  tytul: string;
  opis?: string;
  /** Tekst, w którym szukamy (tytuł, opis, słowa kluczowe). */
  szukaj: string;
  sciezka: string;
  rozmowaId?: string;
  /** Lekka premia w kolejności wyników (np. arkusz z przedmiotu konta). */
  premia?: number;
};

const OSOBNE: Record<string, string> = { ł: "l", ø: "o", đ: "d", ß: "ss", æ: "ae" };

export function normalizuj(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/[łøđßæ]/g, (z) => OSOBNE[z])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const slowa = (tekst: string) => normalizuj(tekst).split(/[^a-z0-9]+/).filter(Boolean);

/** Odległość Damerau–Levenshteina (zamiana sąsiednich liter to jedna zmiana). */
function odleglosc(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const koszt = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + koszt);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Ocena jednego słowa zapytania względem słów tekstu: 0 brak, wyżej lepiej. */
function ocenSlowo(q: string, slowaTekstu: string[]): number {
  let najlepsza = 0;
  for (const w of slowaTekstu) {
    if (w === q) return 4;
    if (w.startsWith(q)) najlepsza = Math.max(najlepsza, 3);
    else if (q.length >= 3 && w.includes(q)) najlepsza = Math.max(najlepsza, 2);
    // Literówka: tylko dla słów, nie liczb, i od 4 liter, żeby krótkie słowa nie łapały wszystkiego.
    else if (q.length >= 4 && !/^\d+$/.test(q) && najlepsza < 1) {
      if (odleglosc(q, w) <= 1 || odleglosc(q, w.slice(0, q.length)) <= 1) najlepsza = 1;
    }
  }
  return najlepsza;
}

/** Wszystkie słowa zapytania muszą coś trafić. Zwraca ocenę (0 = nie pasuje; puste zapytanie pasuje do wszystkiego). */
export function dopasuj(zapytanie: string, tekst: string): number {
  const wszystkie = slowa(zapytanie);
  // Jednoliterowe spójniki („z”, „w”, „i”) nie blokują dopasowania, gdy są inne słowa.
  const dluzsze = wszystkie.filter((q) => q.length > 1);
  const qs = dluzsze.length ? dluzsze : wszystkie;
  if (qs.length === 0) return 1;
  const ws = slowa(tekst);
  let suma = 0;
  for (const q of qs) {
    const o = ocenSlowo(q, ws);
    if (o === 0) return 0;
    suma += o;
  }
  return suma;
}

export function szukaj(zapytanie: string, wyniki: Wynik[]): Wynik[] {
  return wyniki
    .map((w, i) => ({ w, i, o: dopasuj(zapytanie, `${w.tytul} ${w.opis ?? ""} ${w.szukaj}`) }))
    .filter((x) => x.o > 0)
    .sort((a, b) => b.o + (b.w.premia ?? 0) - (a.o + (a.w.premia ?? 0)) || a.i - b.i)
    .map((x) => x.w);
}

const OSTATNIE = "sedno.szukaj.ostatnie";
const LIMIT_OSTATNICH = 5;

export function wczytajOstatnie(): string[] {
  try {
    const z = JSON.parse(localStorage.getItem(OSTATNIE) ?? "[]");
    return Array.isArray(z) ? z.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function zapamietajOstatnie(id: string) {
  try {
    const lista = [id, ...wczytajOstatnie().filter((x) => x !== id)].slice(0, LIMIT_OSTATNICH);
    localStorage.setItem(OSTATNIE, JSON.stringify(lista));
  } catch {
    // zablokowany storage: ostatnie po prostu się nie zapamiętają
  }
}
