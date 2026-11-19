// Czytnik obiektu JSON pisanego przez model po kawałku. Z niepełnego tekstu wyciąga to, co już da się
// pokazać: przyrost wybranych pól tekstowych i kolejne zamknięte elementy wybranych tablic na najwyższym
// poziomie obiektu. Pełny wynik i tak przychodzi na końcu, po sprawdzeniu całej odpowiedzi.

export type Zdarzenie =
  | { pole: string; rodzaj: "tekst"; przyrost: string }
  | { pole: string; rodzaj: "element"; wartosc: unknown };

const MAX_TEKST = 20_000;

function bialy(znak: string | undefined) {
  return znak === " " || znak === "\n" || znak === "\r" || znak === "\t";
}

/** Koniec napisu zaczętego w `od` (indeks za cudzysłowem zamykającym) albo -1, gdy jeszcze otwarty. */
function koniecNapisu(s: string, od: number): number {
  for (let i = od + 1; i < s.length; i++) {
    if (s[i] === "\\") i++;
    else if (s[i] === '"') return i + 1;
  }
  return -1;
}

/** Koniec wartości JSON od `od` albo -1, gdy wartość nie jest jeszcze domknięta. */
function koniecWartosci(s: string, od: number): number {
  const znak = s[od];
  if (znak === '"') return koniecNapisu(s, od);
  if (znak === "{" || znak === "[") {
    let glebokosc = 0;
    for (let i = od; i < s.length; i++) {
      const c = s[i];
      if (c === '"') {
        const k = koniecNapisu(s, i);
        if (k < 0) return -1;
        i = k - 1;
      } else if (c === "{" || c === "[") glebokosc++;
      else if (c === "}" || c === "]") {
        glebokosc--;
        if (glebokosc === 0) return i + 1;
      }
    }
    return -1;
  }
  // Liczba albo literał: domknięty dopiero, gdy po nim stoi separator (inaczej może jeszcze rosnąć).
  for (let i = od; i < s.length; i++) {
    if (s[i] === "," || s[i] === "}" || s[i] === "]" || bialy(s[i])) return i;
  }
  return -1;
}

/** Odczytana dotąd część napisu od cudzysłowu w `od`. Ucina przed niepełną sekwencją ucieczki. */
function poczatekNapisu(s: string, od: number): string | null {
  let i = od + 1;
  let ciecie = i;
  while (i < s.length) {
    const c = s[i];
    if (c === '"') break;
    if (c === "\\") {
      const potrzeba = s[i + 1] === "u" ? 6 : 2;
      if (i + potrzeba > s.length) break;
      i += potrzeba;
    } else i++;
    ciecie = i;
  }
  try {
    return JSON.parse('"' + s.slice(od + 1, ciecie) + '"');
  } catch {
    return null;
  }
}

export class CzytnikObiektu {
  private bufor = "";
  private wyslanyTekst = new Map<string, number>();
  private wyslaneElementy = new Map<string, number>();
  private readonly tekstowe: readonly string[];
  private readonly tablice: readonly string[];

  constructor(tekstowe: readonly string[], tablice: readonly string[]) {
    this.tekstowe = tekstowe;
    this.tablice = tablice;
  }

  dopisz(przyrost: string): Zdarzenie[] {
    if (this.bufor.length > MAX_TEKST) return [];
    this.bufor += przyrost;
    return this.skanuj();
  }

  private skanuj(): Zdarzenie[] {
    const s = this.bufor;
    const wynik: Zdarzenie[] = [];
    let i = 0;
    const pomin = () => {
      while (bialy(s[i])) i++;
    };
    pomin();
    // Niektórzy dostawcy otaczają JSON blokiem Markdown.
    if (s.startsWith("```", i)) {
      const nl = s.indexOf("\n", i);
      if (nl < 0) return wynik;
      i = nl + 1;
      pomin();
    }
    if (s[i] !== "{") return wynik;
    i++;
    for (;;) {
      pomin();
      if (s[i] === ",") {
        i++;
        pomin();
      }
      if (s[i] !== '"') return wynik;
      const koniecKlucza = koniecNapisu(s, i);
      if (koniecKlucza < 0) return wynik;
      let klucz: string;
      try {
        klucz = JSON.parse(s.slice(i, koniecKlucza));
      } catch {
        return wynik;
      }
      i = koniecKlucza;
      pomin();
      if (s[i] !== ":") return wynik;
      i++;
      pomin();
      if (i >= s.length) return wynik;

      if (this.tekstowe.includes(klucz) && s[i] === '"') {
        const dotad = poczatekNapisu(s, i);
        const wyslane = this.wyslanyTekst.get(klucz) ?? 0;
        if (dotad !== null && dotad.length > wyslane) {
          wynik.push({ pole: klucz, rodzaj: "tekst", przyrost: dotad.slice(wyslane) });
          this.wyslanyTekst.set(klucz, dotad.length);
        }
        const k = koniecNapisu(s, i);
        if (k < 0) return wynik;
        i = k;
      } else if (this.tablice.includes(klucz) && s[i] === "[") {
        i++;
        let indeks = 0;
        for (;;) {
          pomin();
          if (s[i] === ",") {
            i++;
            pomin();
          }
          if (i >= s.length) return wynik;
          if (s[i] === "]") {
            i++;
            break;
          }
          const k = koniecWartosci(s, i);
          if (k < 0) return wynik;
          if (indeks >= (this.wyslaneElementy.get(klucz) ?? 0)) {
            try {
              wynik.push({ pole: klucz, rodzaj: "element", wartosc: JSON.parse(s.slice(i, k)) });
            } catch {
              // Uszkodzony element pomijamy. Pełny wynik na końcu i tak go odrzuci.
            }
            this.wyslaneElementy.set(klucz, indeks + 1);
          }
          indeks++;
          i = k;
        }
      } else {
        const k = koniecWartosci(s, i);
        if (k < 0) return wynik;
        i = k;
      }
    }
  }
}
