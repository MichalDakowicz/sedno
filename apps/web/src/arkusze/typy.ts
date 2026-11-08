// Format danych z services/arkusze (importuj.js).

export type Poziom = "podstawowy" | "rozszerzony" | "dwujezyczny";
export type Przedmiot = "angielski" | "matematyka";

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

// Teksty matematyki mają wzory LaTeX w \( … \) (renderuje je KaTeX).
// strona: numer strony w PDF arkusza (importy sprzed podziału na strony go nie mają).
export type Blok = { strona?: number } & (
  | { typ: "akapit" | "naglowek" | "zrodlo"; tekst: string; polecenie?: boolean }
  | { typ: "wzor"; tex: string } // wzór w osobnej linii
  | { typ: "rysunek"; obraz: Obraz } // figura wycięta z arkusza PDF
  | { typ: "tabelaTresci"; wiersze: string[][] } // tabela danych w treści zadania
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
};

export type Arkusz = Omit<ArkuszWpis, "zadan" | "pytan" | "ostrzezen"> & {
  data?: string;
  nagranie?: string;
  pdf?: { arkusz: string | null; zasady: string | null };
  ostrzezenia: string[];
  zadania: Zadanie[];
};

export const nazwaPrzedmiotu: Record<Przedmiot, string> = {
  angielski: "Język angielski",
  matematyka: "Matematyka",
};

export const nazwaPoziomu: Record<Poziom, string> = {
  podstawowy: "Poziom podstawowy",
  rozszerzony: "Poziom rozszerzony",
  dwujezyczny: "Poziom dwujęzyczny",
};
