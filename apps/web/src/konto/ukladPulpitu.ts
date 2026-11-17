// Układ pulpitu: które widgety są włączone i w jakiej kolejności, osobno dla „Wszystkie” i każdego przedmiotu
// (profiles.dashboard). Synchronizacja z kontem (kopia lokalna, konto po zalogowaniu, zapisy) jest we wspólnym konto/kontoSync.ts.
import { useMemo } from "react";
import { WIDGETY_DANE } from "../views/pulpit/widgetyDane";
import { gotowy as gotowyCzysty, nazwaUkladu as nazwaCzysta, kolejnosc, normalizuj, przelacz, przesun, przesunDo, type GotowyUklad, type Pozycja } from "../views/pulpit/ukladCzysty";
import { utworzMagazyn } from "./kontoSync";
import { PRZEDMIOTY } from "./przedmioty";

export const WSZYSTKIE = "wszystkie";

export type { GotowyUklad, Pozycja };
export type Uklad = GotowyUklad | "wlasny";

/** Co leży na koncie: nazwa gotowego układu (nowe widgety dochodzą wtedy same) albo własna lista. */
type Zapis = Partial<Record<string, "egzamin" | Pozycja[]>>;

/** Widgety do ułożenia, w domyślnej kolejności. Stałe („Dziś warto”) są zawsze na górze i nie należą do listy. */
const RUCHOME = WIDGETY_DANE.filter((w) => !w.staly);

const MAX_POZYCJI = 20;
const KLUCZE = new Set<string>([WSZYSTKIE, ...PRZEDMIOTY.map((p) => p.id)]);

export const gotowy = (nazwa: GotowyUklad) => gotowyCzysty(RUCHOME, nazwa);
export const nazwaUkladu = (lista: Pozycja[]): Uklad => nazwaCzysta(lista, RUCHOME);
const rozwin = (z: Zapis[string]) => normalizuj(z, RUCHOME);

/** Przyjmuje tylko znane klucze, widgety i kształty (dane z konta albo z dysku mogą być stare lub uszkodzone). */
function poprawne(v: unknown): Zapis {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const wynik: Zapis = {};
  for (const [klucz, w] of Object.entries(v)) {
    if (!KLUCZE.has(klucz)) continue;
    if (w === "egzamin") {
      wynik[klucz] = w;
    } else if (Array.isArray(w)) {
      const lista = w
        .filter((p): p is Pozycja => !!p && typeof p.id === "string" && typeof p.wl === "boolean" && RUCHOME.some((r) => r.id === p.id))
        .slice(0, MAX_POZYCJI)
        .map((p) => ({ id: p.id, wl: p.wl }));
      if (lista.length) wynik[klucz] = lista;
    }
  }
  return wynik;
}

const magazyn = utworzMagazyn<Zapis>({
  klucz: "sedno.ukladPulpitu",
  kolumna: "dashboard",
  domyslne: {},
  zWire: poprawne,
  doWire: (z) => ({ ...z }),
});

/** Układ (lista widgetów w kolejności) wskazanego przedmiotu albo „wszystkie”; zmienia się razem z zapisem. */
export function useUklad(klucz: string): Pozycja[] {
  const z = magazyn.useStan();
  return useMemo(() => rozwin(z[klucz]), [z, klucz]);
}

/** true, gdy ostatni zapis układu na konto się nie udał. */
export const useBladUkladu = () => magazyn.useBlad();

/** Wysyła zaległe zmiany na konto, np. przed wylogowaniem. */
export const splukajUklad = () => magazyn.flush();

/** Wołane raz przy starcie aplikacji: pulpit ma od razu zapisany lokalnie układ, zanim odpowie sieć. */
export const uruchomUkladPulpitu = () => magazyn.uruchom();

/** Ustawia układ jednego przedmiotu. Lista równa gotowemu układowi zapisuje się jako jego nazwa, a „Nauka” jako brak klucza. */
function ustaw(klucz: string, lista: Pozycja[]) {
  if (!KLUCZE.has(klucz)) return;
  const nazwa = nazwaUkladu(lista);
  magazyn.zmien((z) => {
    const nowe: Zapis = { ...z };
    if (nazwa === "nauka") delete nowe[klucz];
    else nowe[klucz] = nazwa === "egzamin" ? "egzamin" : lista;
    return nowe;
  });
}

const biezacy = (klucz: string) => rozwin(magazyn.biezace()[klucz]);

/** Wybór gotowego układu ustawia listę od nowa. */
export const ustawGotowy = (klucz: string, nazwa: GotowyUklad) => ustaw(klucz, gotowy(nazwa));

/** „Przywróć domyślny”: układ „Nauka”. */
export const przywrocUklad = (klucz: string) => ustawGotowy(klucz, "nauka");

export const przelaczWidget = (klucz: string, id: string) => ustaw(klucz, przelacz(biezacy(klucz), id));

/** Przesuwa widget o `delta` miejsc (−1 w górę, +1 w dół). */
export const przesunWidgetO = (klucz: string, id: string, delta: number) => ustaw(klucz, przesun(biezacy(klucz), id, delta));

/** Przesuwa widget na miejsce o danym indeksie na liście ruchomych widgetów (bez stałych). */
export const przesunWidget = (klucz: string, id: string, doIndeksu: number) => ustaw(klucz, przesunDo(biezacy(klucz), id, doIndeksu));

/** Zapisuje kolejność widgetów po przeciągnięciu (jeden zapis na upuszczenie). */
export const ustawKolejnosc = (klucz: string, ids: string[]) => ustaw(klucz, kolejnosc(biezacy(klucz), ids));
