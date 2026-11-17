// Rejestr widgetów pulpitu. Nowy widget to jeden wpis tutaj (plus komponent): kolejność wpisów jest domyślną
// kolejnością na pulpicie i w ustawieniach, a pola `nauka` i `egzamin` mówią, czy gotowy układ go włącza.
// Widgetów, których aplikacja jeszcze nie ma („Powtórki”, „Wybierz temat”, „Do matury”), tu nie ma.
import type { ComponentType } from "react";
import type { Podsumowanie, Propozycja } from "../../konto/wyniki";
import type { PrzedmiotId } from "../../konto/przedmioty";
import { Dzis } from "./Dzis";
import { MapaUmiejetnosci } from "./MapaUmiejetnosci";
import { WynikiZArkuszy } from "./WynikiZArkuszy";

/** Dane, które pulpit przekazuje widgetom. */
export type KontekstPulpitu = {
  /** Podsumowania z zakresu wybranego przedmiotu (albo wszystkich). */
  zakres: Podsumowanie[];
  /** Rekomendacja na dziś; brak, gdy nie ma z czego jej zrobić. */
  co?: Propozycja;
  aktywny?: PrzedmiotId;
  ai: boolean;
  maPrzedmioty: boolean;
  /** Widget stoi w kolumnie obok „Dziś warto”, a nie w osobnym wierszu. */
  obok: boolean;
};

export type Widget = {
  id: string;
  nazwa: string;
  opis: string;
  /** Stały widget jest zawsze na górze i nie da się go wyłączyć ani przesunąć. */
  staly?: boolean;
  /** Gdy jest pierwszym włączonym widgetem, staje w kolumnie obok „Dziś warto”. */
  obok?: boolean;
  /** Włączony w gotowym układzie „Nauka” / „Egzamin”. */
  nauka: boolean;
  egzamin: boolean;
  Komponent: ComponentType<KontekstPulpitu>;
};

export const WIDGETY: Widget[] = [
  { id: "dzis", nazwa: "Dziś warto", opis: "Rekomendacja na dziś", staly: true, nauka: true, egzamin: true, Komponent: Dzis },
  { id: "wyniki", nazwa: "Wyniki z arkuszy", opis: "Średnia i ostatnie arkusze", obok: true, nauka: true, egzamin: true, Komponent: WynikiZArkuszy },
  { id: "mapa", nazwa: "Mapa umiejętności", opis: "Najsłabsze umiejętności przedmiotu", nauka: true, egzamin: false, Komponent: MapaUmiejetnosci },
];

export const widget = (id: string) => WIDGETY.find((w) => w.id === id);
