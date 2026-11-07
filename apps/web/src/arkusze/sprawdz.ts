// Sprawdzanie bez AI. Zadania zamknięte: litera z klucza. Otwarte: zgodność
// z listami z zasad oceniania CKE. Listy są przykładowe („akceptowane są
// wszystkie odpowiedzi merytorycznie poprawne”), więc odpowiedź spoza list
// nie jest błędna, tylko do samodzielnej oceny z kluczem przed oczami.
import type { Arkusz, Pytanie } from "./typy";

export type Werdykt = "dobrze" | "zle" | "pusto" | "do-oceny";

export type Odpowiedzi = Record<string, string>;
export type Samoocena = Record<string, boolean>;

export function normalizuj(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/^["'\s]+|["'.,!?;:\s]+$/g, "")
    .trim();
}

export function werdykt(p: Pytanie, odpowiedz: string | undefined): Werdykt {
  const o = (odpowiedz ?? "").trim();
  if (!o) return "pusto";
  if (p.typ === "zamkniete") return o === p.poprawna ? "dobrze" : "zle";
  if (p.typ === "wypowiedz") return "do-oceny";
  const n = normalizuj(o);
  const zgodne = (lista?: string[]) => lista?.some((x) => normalizuj(x) === n) ?? false;
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
  const wynik: Wynik = { zdobyte: 0, mozliwe: 0, doOceny: 0, wypowiedzi: 0 };
  for (const z of arkusz.zadania) {
    for (const p of z.pytania) {
      if (p.typ === "wypowiedz") {
        wynik.wypowiedzi += p.punkty;
        continue;
      }
      wynik.mozliwe += p.punkty;
      const w = werdykt(p, odpowiedzi[p.nr]);
      if (w === "dobrze") wynik.zdobyte += p.punkty;
      if (w === "do-oceny") {
        if (samoocena[p.nr] === undefined) wynik.doOceny++;
        else if (samoocena[p.nr]) wynik.zdobyte += p.punkty;
      }
    }
  }
  return wynik;
}
