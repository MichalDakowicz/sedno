// Zgodność z egzaminem (informatyka): co w poleceniu CKE trzeba oddać (plik wyników, kod, wykres,
// realizacja komputerowa), a co z tego da się oddać w Sedno i co Sedno sprawdza. Wszystko wynika z treści
// bloków i z klucza, bez zmian w imporcie. Ten sam tekst CKE zostaje nietknięty; tu powstają tylko wskazówki.
import { rodzajPytania } from "../warsztat/materialy";
import type { Blok, Pytanie, PytanieOtwarte, Zadanie } from "./typy";

export type Forma = "komorki" | "pf" | "luki" | "wynik" | "kod" | "sql" | "wykres" | "inne";

export type StanOdpowiedzi = {
  forma: Forma;
  ile: number; // wypełnionych części odpowiedzi (komórek, luk, wierszy P / F); 0 albo 1 dla jednego pola
  z: number;
  pelna: boolean;
  pusta: boolean;
  // true: odpowiedź porównujemy z kluczem CKE; false: uczeń ocenia ją sam według klucza po sprawdzeniu.
  sprawdza: boolean;
};

const tekstBloku = (b: Blok) => ("tekst" in b ? b.tekst : "");

/** Akapity, w których CKE każe zapisać odpowiedzi w pliku. */
export const ZAPIS_W_PLIKU = /(?:zapisz|zapisać)[^.]{0,80}\bw pliku\b|\bpliku\s+(?:tekstowym\s+)?wyniki\d*(?:_\d+)?\.txt/i;
const WYKRES = /\b(?:utwórz|sporządź|narysuj)\b[^.]{0,60}\bwykres/i;
const PROGRAM = /\bnapisz program|\bprogram(?:u|y|ów)?\b[^.]{0,40}\b(?:znajdzie|da|wyznaczy|wypisze)|\bprogram\(-y\)/i;
const NARZEDZIA = /dostępnych narzędzi informatycznych/i;

export function nazwaPlikuWynikow(tekst: string): string | undefined {
  return tekst.match(/\b(wyniki\d*(?:_\d+)?\.txt)/i)?.[1];
}

export type RodzajWskazowki = "plik" | "plikProgram" | "wykres" | "program";

/** Wskazówka Sedno pod oryginalnym akapitem polecenia (akapitu nie zmieniamy). */
export function wskazowkaPodAkapitem(b: Blok): RodzajWskazowki | null {
  if (b.typ !== "akapit") return null;
  const t = b.tekst;
  if (WYKRES.test(t)) return "wykres";
  if (ZAPIS_W_PLIKU.test(t)) return PROGRAM.test(t) ? "plikProgram" : "plik";
  if (PROGRAM.test(t) && !/zapisz w pseudokodzie/i.test(t)) return "program";
  return null;
}

/** Co zadanie każe oddać na egzaminie. */
export function czegoZadanie(z: Zadanie) {
  const teksty = z.bloki.map(tekstBloku).join(" ");
  return {
    plikWynikow: ZAPIS_W_PLIKU.test(teksty) ? (nazwaPlikuWynikow(teksty) ?? true) : false,
    wykres: WYKRES.test(teksty),
    program: !!z.program || PROGRAM.test(teksty),
    realizacja: NARZEDZIA.test(teksty),
  };
}

// Tekst polecenia podpunktu: akapity między poprzednim pytaniem (albo nagłówkiem) a jego znacznikiem.
function trescPodpunktu(z: Zadanie, p: Pytanie): string {
  const i = z.bloki.findIndex((b) => (b.typ === "pytanie" ? b.nr === p.nr : (b.typ === "pytania" || b.typ === "tabela") && b.nr.includes(p.nr)));
  if (i < 0) return "";
  let od = i;
  while (od > 0 && z.bloki[od - 1].typ !== "pytanie" && z.bloki[od - 1].typ !== "naglowek") od--;
  return z.bloki.slice(od, i).map(tekstBloku).join(" ");
}

function formaPytania(z: Zadanie, p: PytanieOtwarte, wTabeli: Blok | undefined, zLuk: boolean): Forma {
  if (wTabeli) return p.kod ? "pf" : "komorki";
  if (zLuk) return "luki";
  if (WYKRES.test(trescPodpunktu(z, p))) return "wykres";
  if (p.wynik) return "wynik";
  const tresc = trescPodpunktu(z, p);
  // rodzajPytania zgaduje kod z samego klucza (zadanie z programem i rozwiązaniem), więc dla odpowiedzi
  // będącej wynikiem programu potrzebujemy potwierdzenia w poleceniu podpunktu.
  const r = rodzajPytania(p, z);
  if (r === "sql" || /zapytani|\bSQL\b/i.test(tresc)) return "sql";
  if (/algorytm|pseudokod|(?:napisz|zapisz)\s+funkcj/i.test(tresc)) return "kod";
  return "wynik";
}

/** Puste komórki tabeli z odpowiedzią i wiersze z przełącznikiem P / F. */
function liczbaCzesciTabeli(b: Extract<Blok, { typ: "tabelaTresci" }>, pf: boolean): number {
  const naglowek = b.naglowek ?? 1;
  if (pf) return b.wiersze.filter((w) => w.includes("P") && w.includes("F")).length;
  return b.wiersze.slice(naglowek).reduce((n, w) => n + w.filter((k) => !k).length, 0);
}

/**
 * Stan odpowiedzi na podpunkt. `ileLuk`: z ilu luk składa się odpowiedź (z kontekstu arkusza),
 * `odpowiedzi`: zapisane odpowiedzi ucznia (w tym „<nr>:tabela” z komórkami tabeli).
 */
export function stanOdpowiedzi(z: Zadanie, p: Pytanie, odpowiedzi: Record<string, string>, ileLuk?: number): StanOdpowiedzi {
  const odp = odpowiedzi[p.nr] ?? "";
  const niepusta = !!odp.trim();
  if (p.typ !== "otwarte") return { forma: "inne", ile: niepusta ? 1 : 0, z: 1, pelna: niepusta, pusta: !niepusta, sprawdza: p.typ === "zamkniete" };
  const tabela = z.bloki.find((b): b is Extract<Blok, { typ: "tabelaTresci" }> => b.typ === "tabelaTresci" && b.pytanie === p.nr);
  const forma = formaPytania(z, p, tabela, !!ileLuk && ileLuk > 1);
  // Klucz do porównania: wynik z listą odpowiedzi, kod P / F, albo wiersze tabeli z rozwiązaniem CKE.
  const sprawdza = (!!p.oczekiwane?.length && forma !== "kod" && forma !== "sql" && forma !== "wykres") || (forma === "komorki" && !!p.rozwiazanie);
  let ile = niepusta ? 1 : 0;
  let wszystkich = 1;
  if (tabela) {
    wszystkich = Math.max(1, liczbaCzesciTabeli(tabela, forma === "pf"));
    if (forma === "pf") ile = [...odp].filter((c) => c === "P" || c === "F").length;
    else {
      try {
        ile = Object.values(JSON.parse(odpowiedzi[`${p.nr}:tabela`] || "{}") as Record<string, string>).filter((v) => String(v).trim()).length;
      } catch {
        ile = niepusta ? 1 : 0;
      }
    }
  } else if (forma === "luki" && ileLuk) {
    wszystkich = ileLuk;
    ile = odp.split("\n").slice(0, ileLuk).filter((c) => c.trim()).length;
  }
  ile = Math.min(ile, wszystkich);
  return { forma, ile, z: wszystkich, pelna: ile >= wszystkich, pusta: ile === 0, sprawdza };
}

export const OPIS_FORMY: Record<Forma, { miejsce: string; format: string }> = {
  komorki: { miejsce: "Puste komórki tabeli powyżej", format: "wpisz wartość w każdą komórkę" },
  pf: { miejsce: "Przełączniki P / F w tabeli powyżej", format: "wybierz P albo F w każdym wierszu" },
  luki: { miejsce: "Luki w zdaniu powyżej", format: "wpisz odpowiedź w każdą lukę" },
  wynik: { miejsce: "Pole tekstowe poniżej", format: "wynik tekstem, kilka wierszy jeśli trzeba; numeru zadania nie dopisujesz" },
  kod: { miejsce: "Pole na kod poniżej", format: "algorytm w pseudokodzie albo kod programu" },
  sql: { miejsce: "Pole na kod poniżej", format: "zapytanie SQL" },
  wykres: { miejsce: "Pole tekstowe poniżej", format: "zestawienie, na którym oparty jest wykres (wiersze z wartościami); sam wykres zostaje poza Sedno" },
  inne: { miejsce: "Pole poniżej", format: "krótka odpowiedź" },
};

/** Co liczy się jako wypełnione. */
export function opisWypelnienia(s: StanOdpowiedzi): string {
  if (s.z > 1) return `Odpowiedź w spisie liczy się od pierwszej wpisanej części; pełna, gdy uzupełnisz wszystkie (${s.z}).`;
  return "Liczy się jako wypełnione, gdy pole nie jest puste.";
}

/** Kto ocenia po sprawdzeniu arkusza. */
export function opisOceny(s: StanOdpowiedzi): string {
  if (s.sprawdza) return "Sedno porówna z kluczem CKE.";
  if (s.forma === "kod" || s.forma === "sql") return "Kodu Sedno nie sprawdza: po sprawdzeniu porównasz go z rozwiązaniem CKE i ocenisz sam.";
  if (s.forma === "wykres") return "Wykresu Sedno nie ocenia: po sprawdzeniu porównasz zestawienie z kluczem CKE i ocenisz sam.";
  return "Brak klucza do porównania: po sprawdzeniu ocenisz sam według rozwiązania CKE.";
}

export const WSKAZOWKI: Record<RodzajWskazowki, { tytul: string; tekst: string }> = {
  plik: {
    tytul: "W Sedno",
    tekst: "Pliku wyników nie tworzysz ani nie wysyłasz. Wpisz każdą odpowiedź w pole pod odpowiednim poleceniem (numeru zadania nie dopisujesz). Sedno sprawdza wpisany wynik z kluczem CKE, a samego pliku nie ocenia. Na egzaminie plik trzeba oddać.",
  },
  plikProgram: {
    tytul: "W Sedno",
    tekst: "Program uruchamiasz w panelu materiałów do zadania; kod jest roboczy i nie jest oceniany. Pliku wyników nie tworzysz ani nie wysyłasz: wpisz każdą odpowiedź w pole pod odpowiednim poleceniem (numeru zadania nie dopisujesz). Sedno sprawdza wpisany wynik z kluczem CKE. Na egzaminie oddajesz plik wyników i pliki z kodem.",
  },
  wykres: {
    tytul: "W Sedno",
    tekst: "Wykresu tu nie rysujesz i nie jest on oceniany. Wpisz w polu pod poleceniem zestawienie, z którego powstałby wykres, a po sprawdzeniu porównasz je z kluczem CKE. Na egzaminie wykres trzeba oddać w pliku.",
  },
  program: {
    tytul: "W Sedno",
    tekst: "Program uruchamiasz w panelu materiałów do zadania; kod jest roboczy i nie jest oceniany. Oceniamy wynik, który wpiszesz w pole pod poleceniem. Na egzaminie oddajesz też plik z kodem.",
  },
};
