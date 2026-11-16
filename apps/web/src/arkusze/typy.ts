// Format danych z services/arkusze (importuj.js).

export type Poziom = "podstawowy" | "rozszerzony" | "dwujezyczny";
export type Przedmiot = "angielski" | "matematyka" | "informatyka";

export type ArkuszWpis = {
  id: string;
  przedmiot: Przedmiot;
  formula?: "2015" | "2023";
  poziom: Poziom;
  rok: number;
  sesja: string;
  symbol: string;
  czas?: number;
  punkty: number;
  zadan: number;
  pytan: number;
  ostrzezen: number;
};

export type Opcja = { litera: string; tresc: string };

// Wycinek arkusza CKE jako PNG. src to data URL osadzony przy imporcie (arkusz
// przychodzi z bazy jako jeden JSON), wymiary w punktach PDF.
export type Obraz = { src: string; szer: number; wys: number };

// Starsze importy miały ścieżkę względem data/arkusze zamiast data URL.
export const adresObrazu = (src: string) => (src.startsWith("data:") ? src : `/dane/arkusze/${src}`);

// Krój fragmentu akapitu (informatyka): pogrubienie, kursywa, kod, wykładnik, indeks dolny.
export type Kroj = "b" | "i" | "m" | "sup" | "sub";

// Teksty matematyki mają wzory LaTeX w \( … \) (renderuje je KaTeX).
// strona: numer strony w PDF arkusza (importy sprzed podziału na strony go nie mają).
export type Blok = { strona?: number } & (
  // formaty (informatyka): zakresy [od, do) tekstu pogrubione (b), kursywą (i) albo krojem kodu (m).
  | { typ: "akapit" | "naglowek" | "zrodlo"; tekst: string; polecenie?: boolean; formaty?: [number, number, Kroj][] }
  | { typ: "kod"; tekst: string } // informatyka: pseudokod albo przykład danych, z wcięciami
  | { typ: "wzor"; tex: string } // wzór w osobnej linii
  | { typ: "rysunek"; obraz: Obraz } // figura wycięta z arkusza PDF
  // Tabela danych w treści zadania. Informatyka: naglowek (liczba wierszy nagłówka), zakresy (colspan
  // komórek), obrazy (komórki jako wycinki) i pytanie: puste komórki albo kolumny P / F to odpowiedź na nie.
  | { typ: "tabelaTresci"; wiersze: string[][]; naglowek?: number; zakresy?: number[][]; obrazy?: { r: number; c: number; obraz: Obraz }[]; pytanie?: string }
  // Matematyka: zadanie jako obraz, gdy treści nie dało się wziąć z formy DOCX;
  // tekst zostaje jako opis alternatywny.
  | { typ: "kadr"; obraz: Obraz; tekst: string }
  | { typ: "opcje"; opcje: Opcja[] }
  | { typ: "pytanie"; nr: string }
  | { typ: "pytania" | "tabela"; nr: string[] }
);

// Kawałek nagrania, w którym pada odpowiedź na pytanie ze słuchania (sekundy od początku pliku).
export type CzescNagrania = { od: number; do: number; tekst: string };

type PytanieBaza = {
  nr: string;
  tresc: string;
  punkty: number;
  wTekscie?: boolean;
  fragment?: CzescNagrania; // dopasowany skryptem services/arkusze/nagrania
  zasadyStrona?: number; // strona zadania w PDF zasad oceniania (schemat punktowania)
  // Informatyka: zasady oceniania i rozwiązanie z klucza jako tekst (pseudokod z wcięciami).
  zasady?: string;
  rozwiazanie?: string;
};

export type PytanieZamkniete = PytanieBaza & {
  typ: "zamkniete";
  opcje?: Opcja[];
  litery: string[];
  poprawna: string;
};

export type PytanieOtwarte = PytanieBaza & {
  typ: "otwarte";
  oczekiwane?: string[];
  akceptowane?: string[];
  odrzucone?: string[];
  opis?: string;
  kod?: boolean; // odpowiedź to kod z liter i cyfr (PF, A2), a nie tekst
  wynik?: boolean; // wynik zadania praktycznego (informatyka): porównanie bez spacji, jednostek i formatu liczb
  tabela?: boolean; // odpowiedź w komórkach tabeli (informatyka): wiersze sprawdzane z wierszami klucza
};

export type Wypowiedz = PytanieBaza & { typ: "wypowiedz"; poczatek?: string };

export type Pytanie = PytanieZamkniete | PytanieOtwarte | Wypowiedz;

export type Zadanie = {
  nr: number;
  punkty: number;
  strona?: number; // strona PDF, na której zaczyna się zadanie
  sluchanie: boolean;
  polecenie: string[];
  bloki: Blok[];
  pytania: Pytanie[];
  // Figura z treści (wykres, oś, bryła), którą uczeń dorysowuje w brudnopisie.
  rysunek?: Obraz;
  tytul?: string; // informatyka: „Zadanie 3. Dron”
  pliki?: string[]; // informatyka: pliki danych z zipa CKE, o których mówi treść
  program?: boolean; // treść każe napisać program albo algorytm
  sql?: boolean; // treść mówi o zapytaniu SQL
};

export type Arkusz = Omit<ArkuszWpis, "zadan" | "pytan" | "ostrzezen"> & {
  data?: string;
  nagranie?: string;
  pdf?: { arkusz: string | null; zasady: string | null };
  // Informatyka: zip z danymi na stronie CKE i jego pliki tekstowe (nazwa → treść).
  dane?: { zip: string; pliki: Record<string, string> };
  ostrzezenia: string[];
  zadania: Zadanie[];
};

export const nazwaPrzedmiotu: Record<Przedmiot, string> = {
  angielski: "Język angielski",
  matematyka: "Matematyka",
  informatyka: "Informatyka",
};

export const nazwaPoziomu: Record<Poziom, string> = {
  podstawowy: "Poziom podstawowy",
  rozszerzony: "Poziom rozszerzony",
  dwujezyczny: "Poziom dwujęzyczny",
};
