// Format danych z services/arkusze (importuj.js).

export type Poziom = "podstawowy" | "rozszerzony" | "dwujezyczny";

export type ArkuszWpis = {
  id: string;
  przedmiot: string;
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

export type Blok =
  | { typ: "akapit" | "naglowek" | "zrodlo"; tekst: string }
  | { typ: "opcje"; opcje: Opcja[] }
  | { typ: "pytanie"; nr: string }
  | { typ: "pytania" | "tabela"; nr: string[] };

type PytanieBaza = { nr: string; tresc: string; punkty: number; wTekscie?: boolean };

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
};

export type Wypowiedz = PytanieBaza & { typ: "wypowiedz"; poczatek?: string };

export type Pytanie = PytanieZamkniete | PytanieOtwarte | Wypowiedz;

export type Zadanie = {
  nr: number;
  punkty: number;
  sluchanie: boolean;
  polecenie: string[];
  bloki: Blok[];
  pytania: Pytanie[];
};

export type Arkusz = Omit<ArkuszWpis, "zadan" | "pytan" | "ostrzezen"> & {
  data?: string;
  nagranie?: string;
  ostrzezenia: string[];
  zadania: Zadanie[];
};

export const nazwaPoziomu: Record<Poziom, string> = {
  podstawowy: "Poziom podstawowy",
  rozszerzony: "Poziom rozszerzony",
  dwujezyczny: "Poziom dwujęzyczny",
};
