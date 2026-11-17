// Dopasowanie dla wyszukiwania: bez wielkości liter i polskich znaków, z tolerancją jednej literówki w słowie.

export type RodzajWyniku = "akcja" | "arkusz" | "rozmowa";

export type Wynik = {
  id: string;
  rodzaj: RodzajWyniku;
  tytul: string;
  opis?: string;
  /** Znormalizowane słowa, w których szukamy (tytuł, opis, słowa kluczowe); liczone raz przy budowie indeksu. */
  slowa: string[];
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

/** Czy słowa różnią się najwyżej jedną zmianą: literą, wstawieniem, usunięciem albo zamianą sąsiednich liter. */
function odlegloscJeden(a: string, b: string): boolean {
  const dl = a.length - b.length;
  if (dl > 1 || dl < -1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true;
  if (dl === 0) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  return dl > 0 ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** Ocena jednego słowa zapytania względem słów tekstu: 0 brak, wyżej lepiej. */
function ocenSlowo(q: string, slowaTekstu: string[]): number {
  let najlepsza = 0;
  // Literówka: tylko dla słów, nie liczb, i od 4 liter, żeby krótkie słowa nie łapały wszystkiego.
  const literowka = q.length >= 4 && !/^\d+$/.test(q);
  for (const w of slowaTekstu) {
    if (w === q) return 4;
    if (w.startsWith(q)) najlepsza = Math.max(najlepsza, 3);
    else if (q.length >= 3 && w.includes(q)) najlepsza = Math.max(najlepsza, 2);
    else if (literowka && najlepsza < 1 && w.length >= q.length - 1) {
      if (odlegloscJeden(q, w) || (w.length > q.length && odlegloscJeden(q, w.slice(0, q.length)))) najlepsza = 1;
    }
  }
  return najlepsza;
}

/** Słowa zapytania do dopasowania. Jednoliterowe spójniki („z”, „w”, „i”) nie blokują, gdy są inne słowa. */
export function slowaZapytania(zapytanie: string): string[] {
  const wszystkie = slowa(zapytanie);
  const dluzsze = wszystkie.filter((q) => q.length > 1);
  return dluzsze.length ? dluzsze : wszystkie;
}

/** Słowa tekstu liczymy raz przy budowie indeksu. */
export const slowaTekstu = slowa;

/** Wszystkie słowa zapytania muszą coś trafić. Zwraca ocenę (0 = nie pasuje). */
function dopasuj(qs: string[], ws: string[]): number {
  let suma = 0;
  for (const q of qs) {
    const o = ocenSlowo(q, ws);
    if (o === 0) return 0;
    suma += o;
  }
  return suma;
}

export function szukaj(zapytanie: string, wyniki: Wynik[]): Wynik[] {
  const qs = slowaZapytania(zapytanie);
  if (qs.length === 0) return wyniki;
  return wyniki
    .map((w, i) => ({ w, i, o: dopasuj(qs, w.slowa) }))
    .filter((x) => x.o > 0)
    .sort((a, b) => b.o + (b.w.premia ?? 0) - (a.o + (a.w.premia ?? 0)) || a.i - b.i)
    .map((x) => x.w);
}

const OSTATNIE = "sedno.szukaj.ostatnie";
const LIMIT_OSTATNICH = 5;

/** Ostatnie należą do konta (jak rozmowy): zapis innego konta albo bez właściciela jest ignorowany. */
export function wczytajOstatnie(wlasciciel: string | null): string[] {
  try {
    const z = JSON.parse(localStorage.getItem(OSTATNIE) ?? "null");
    if (!wlasciciel || !z || z.owner !== wlasciciel || !Array.isArray(z.ids)) return [];
    return z.ids.filter((x: unknown): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function zapamietajOstatnie(wlasciciel: string | null, id: string) {
  if (!wlasciciel) return;
  try {
    const ids = [id, ...wczytajOstatnie(wlasciciel).filter((x) => x !== id)].slice(0, LIMIT_OSTATNICH);
    localStorage.setItem(OSTATNIE, JSON.stringify({ owner: wlasciciel, ids }));
  } catch {
    // zablokowany storage: ostatnie po prostu się nie zapamiętają
  }
}

export function wyczyscOstatnie() {
  try {
    localStorage.removeItem(OSTATNIE);
  } catch {
    // zablokowany storage: nic do sprzątania
  }
}
