// Sprawdzanie bez AI. Zadania zamknięte: litera z klucza. Otwarte: zgodność
// z listami z zasad oceniania CKE. Listy są przykładowe („akceptowane są
// wszystkie odpowiedzi merytorycznie poprawne”), więc odpowiedź spoza list
// nie jest błędna, tylko do samodzielnej oceny z kluczem przed oczami.
import type { Arkusz, Pytanie } from "./typy";

export type Werdykt = "dobrze" | "zle" | "pusto" | "do-oceny";

export type Odpowiedzi = Record<string, string>;
// true/false: zaliczone albo nie; liczba: punkty przyznane przez ucznia
// za zadanie wielopunktowe (matematyka, ocena według schematu CKE).
export type Samoocena = Record<string, boolean | number>;

export function punktyZSamooceny(p: Pytanie, ocena: boolean | number): number {
  return typeof ocena === "number" ? Math.max(0, Math.min(p.punkty, ocena)) : ocena ? p.punkty : 0;
}

export function normalizuj(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/^["'\s]+|["'.,!?;:\s]+$/g, "")
    .trim();
}

// Wynik zadania praktycznego z informatyki: program wypisuje „41498.2”, klucz ma „41498,2 kg”,
// a odpowiedzi w kilku wierszach różnią się odstępami i etykietami „a)”. Porównujemy więc same
// znaki bez odstępów, jednostek, etykiet podpunktów i zer na końcu części ułamkowej.
export function normalizujWynik(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|\s)[a-h]\)\s/g, " ")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/(^|\s)(kg|zł|razy|m3)(?=\s|$)/g, " ")
    .replace(/[\s,;:"'„”]/g, "")
    .replace(/(\.\d*?)0+(?!\d)/g, "$1")
    .replace(/\.(?!\d)/g, "");
}

export function werdykt(p: Pytanie, odpowiedz: string | undefined): Werdykt {
  const o = (odpowiedz ?? "").trim();
  if (!o) return "pusto";
  if (p.typ === "zamkniete") return o === p.poprawna ? "dobrze" : "zle";
  if (p.typ === "wypowiedz") return "do-oceny";
  // Tabela (informatyka): każdy wiersz odpowiedzi musi być którymś wierszem rozwiązania z klucza.
  // Klucz bywa rozbity na linie inaczej niż tabela, więc przy braku zgodności decyduje uczeń.
  if (p.tabela && p.rozwiazanie) {
    const klucz = new Set(p.rozwiazanie.split("\n").map(normalizujWynik).filter(Boolean));
    const wiersze = o.split("\n").map(normalizujWynik).filter(Boolean);
    return wiersze.length && wiersze.every((w) => klucz.has(w)) ? "dobrze" : "do-oceny";
  }
  const n = p.wynik ? normalizujWynik(o) : normalizuj(o);
  const zgodne = (lista?: string[]) => lista?.some((x) => (p.wynik ? normalizujWynik(x) : normalizuj(x)) === n) ?? false;
  // Akceptowane wygrywają z odrzuconymi: na listach odrzuconych bywa ta sama
  // odpowiedź z inną pisownią wielkich liter (np. „i had to go”).
  if (zgodne(p.oczekiwane) || zgodne(p.akceptowane)) return "dobrze";
  if (zgodne(p.odrzucone)) return "zle";
  return "do-oceny";
}

export type Wynik = {
  zdobyte: number;
  mozliwe: number;
  doOceny: number; // pytania czekające na samoocenę
  wypowiedzi: number; // punkty za wypowiedzi pisemne, liczone osobno
};

export function policz(arkusz: Arkusz, odpowiedzi: Odpowiedzi, samoocena: Samoocena): Wynik {
  return policzPytania(arkusz.zadania.flatMap((z) => z.pytania), odpowiedzi, samoocena);
}

export function policzPytania(pytania: Pytanie[], odpowiedzi: Odpowiedzi, samoocena: Samoocena): Wynik {
  const wynik: Wynik = { zdobyte: 0, mozliwe: 0, doOceny: 0, wypowiedzi: 0 };
  for (const p of pytania) {
    if (p.typ === "wypowiedz") {
      wynik.wypowiedzi += p.punkty;
      continue;
    }
    wynik.mozliwe += p.punkty;
    const w = werdykt(p, odpowiedzi[p.nr]);
    if (w === "dobrze") wynik.zdobyte += p.punkty;
    if (w === "do-oceny") {
      if (samoocena[p.nr] === undefined) wynik.doOceny++;
      else wynik.zdobyte += punktyZSamooceny(p, samoocena[p.nr]);
    }
  }
  return wynik;
}

// Zakres długości wypowiedzi z polecenia, np. „od 100 do 150 wyrazów”,
// „between 300 and 350 words”.
export function zakresSlow(tekst: string): [number, number] | null {
  const m = tekst.match(/od (\d+) do (\d+) (?:wyrazów|słów)|between (\d+) and (\d+) words|(\d+)\s*[–-]\s*(\d+) (?:wyrazów|words)/i);
  if (!m) return null;
  const [a, b] = m.slice(1).filter(Boolean).map(Number);
  return [a, b];
}

export function liczSlowa(tekst: string): number {
  return tekst.trim() ? tekst.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0;
}
