// Pliki danych CKE jako tabele. Pliki do arkusza kalkulacyjnego i bazy danych mają kolumny
// rozdzielone tabulatorem i zwykle wiersz nagłówka; pliki do programów to zwykły tekst.

export type Tabela = {
  nazwa: string; // nazwa tabeli SQL: plik bez .txt
  plik: string;
  kolumny: string[]; // nazwy kolumn SQL (z nagłówka albo pole1, pole2… jak w imporcie Accessa)
  naglowek: string[]; // nagłówek z pliku do podglądu
  liczbowe: boolean[];
  wiersze: string[][];
};

const LICZBA = /^-?\d+(?:[.,]\d+)?$/;

export const czyTabelaryczny = (tresc: string) => tresc.split("\n", 1)[0].includes("\t");

const wiersze = (tresc: string) =>
  tresc
    .replace(/\r/g, "")
    .split("\n")
    .filter((w) => w.trim());

/** Podgląd dowolnego pliku: tabulatory dają kolumny, inaczej każdy wiersz to jedna komórka. */
export function tabela(plik: string, tresc: string): Tabela {
  const linie = wiersze(tresc).map((w) => (w.includes("\t") ? w.split("\t") : [w]));
  const pierwszy = linie[0] ?? [];
  // Nagłówek: w pierwszym wierszu nie ma liczb, a w kolejnych są (albo plik ma same teksty i nazwy z podkreśleniem).
  const naglowek = pierwszy.length > 1 && pierwszy.every((k) => !LICZBA.test(k.trim())) && (linie.slice(1, 50).some((w) => w.some((k) => LICZBA.test(k.trim()))) || pierwszy.some((k) => k.includes("_")));
  const dane = naglowek ? linie.slice(1) : linie;
  const szer = Math.max(pierwszy.length, ...dane.slice(0, 50).map((w) => w.length));
  const nazwy = Array.from({ length: szer }, (_, i) => (naglowek ? nazwaKolumny(pierwszy[i] ?? "") : "") || `pole${i + 1}`);
  // Powtórzona nazwa po oczyszczeniu dostaje numer.
  const kolumny = nazwy.map((n, i) => (nazwy.indexOf(n) === i ? n : `${n}_${i + 1}`));
  const liczbowe = kolumny.map((_, i) => dane.length > 0 && dane.every((w) => !w[i]?.trim() || LICZBA.test(w[i].trim())));
  return { nazwa: plik.replace(/\.txt$/i, "").replace(/\W/g, "_"), plik, kolumny, naglowek: naglowek ? pierwszy : kolumny, liczbowe, wiersze: dane };
}

// „masa [kg]” → masa_kg, „zawartość [%]” → zawartosc
function nazwaKolumny(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Liczba z pliku jako liczba SQL: przecinek dziesiętny (Excel po polsku) na kropkę. */
export const liczba = (s: string) => Number(s.trim().replace(",", "."));
