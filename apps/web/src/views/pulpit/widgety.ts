// Rejestr widgetów pulpitu: dane z widgetyDane.ts połączone z komponentami.
import type { ComponentType } from "react";
import type { Podsumowanie, Propozycja } from "../../konto/wyniki";
import type { PrzedmiotId } from "../../konto/przedmioty";
import { WIDGETY_DANE, type WidgetDane } from "./widgetyDane";
import { Dzis } from "./Dzis";
import { DoMatury } from "./DoMatury";
import { MapaUmiejetnosci } from "./MapaUmiejetnosci";
import { WynikiZArkuszy } from "./WynikiZArkuszy";
import { PowtorkiWidget } from "./PowtorkiWidget";
import { Kontynuuj } from "./Kontynuuj";
import { WybierzTemat } from "./WybierzTemat";
import { TwojTydzien } from "./TwojTydzien";

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

export type Widget = WidgetDane & { Komponent: ComponentType<KontekstPulpitu> };

/** Komponenty po id widgetu; nowy widget to wpis w widgetyDane.ts i jeden tutaj. */
const KOMPONENTY: Record<string, ComponentType<KontekstPulpitu>> = {
  dzis: Dzis,
  wyniki: WynikiZArkuszy,
  tydzien: TwojTydzien,
  powtorki: PowtorkiWidget,
  kontynuuj: Kontynuuj,
  temat: WybierzTemat,
  matura: DoMatury,
  mapa: MapaUmiejetnosci,
};

export const WIDGETY: Widget[] = WIDGETY_DANE.map((d) => ({ ...d, Komponent: KOMPONENTY[d.id]! }));

export const widget = (id: string) => WIDGETY.find((w) => w.id === id);
