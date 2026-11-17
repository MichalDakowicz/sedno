// Terminy pisemnych egzaminów maturalnych, sesja główna, maj 2027.
// Źródło: komunikat dyrektora CKE z 20 sierpnia 2026, za wydarzenia.interia.pl; do weryfikacji w BIP CKE.
// Godzin nie znamy, więc ich nie pokazujemy. Dla informatyki (jak dla biologii, WOS-u, chemii, geografii, historii
// i fizyki) komunikat nie podaje poziomu, więc data obowiązuje dla poziomu, który ma aplikacja. Brak daty dla
// przedmiotu lub poziomu: wracamy do POCZATEK_MATURY.
import type { Poziom } from "../arkusze/typy";
import { POCZATEK_MATURY, nazwaPoziomu, przedmiot, zgrupuj, type MojPrzedmiot, type PrzedmiotId } from "./przedmioty";

export const TERMINY: Partial<Record<PrzedmiotId, Partial<Record<Poziom, string>>>> = {
  polski: { podstawowy: "2027-05-04", rozszerzony: "2027-05-20" },
  matematyka: { podstawowy: "2027-05-05", rozszerzony: "2027-05-11" },
  angielski: { podstawowy: "2027-05-06", rozszerzony: "2027-05-07", dwujezyczny: "2027-05-07" },
  informatyka: { rozszerzony: "2027-05-17" },
};

export type Egzamin = {
  przedmiotId: PrzedmiotId;
  poziom: Poziom;
  /** ISO, np. 2027-05-04 */
  data: string;
  /** false: brak daty w TERMINY, data to tylko początek sesji. */
  znana: boolean;
};

export function egzamin(przedmiotId: PrzedmiotId, poziom: Poziom): Egzamin {
  const data = TERMINY[przedmiotId]?.[poziom];
  return { przedmiotId, poziom, data: data ?? POCZATEK_MATURY, znana: !!data };
}

/** Egzaminy ucznia od najwcześniejszego; opcjonalnie tylko z jednego przedmiotu. */
export function egzaminyUcznia(moje: MojPrzedmiot[], tylko?: PrzedmiotId): Egzamin[] {
  return zgrupuj(moje)
    .filter((m) => !tylko || m.id === tylko)
    .flatMap((m) => m.poziomy.map((l) => egzamin(m.id, l)))
    .sort((a, b) => a.data.localeCompare(b.data));
}

const dzien = (iso: string) => {
  const [r, m, d] = iso.split("-").map(Number);
  return new Date(r!, m! - 1, d!);
};

/** Dni do daty (pełne dni kalendarzowe); ujemne po egzaminie. */
export function dniDo(iso: string): number {
  const dzis = new Date();
  const poczatek = new Date(dzis.getFullYear(), dzis.getMonth(), dzis.getDate());
  return Math.round((dzien(iso).getTime() - poczatek.getTime()) / 86_400_000);
}

export const minal = (e: Egzamin) => dniDo(e.data) < 0;

/** Pierwszy egzamin, który jeszcze się nie odbył (lista musi być posortowana). */
export const najblizszy = (lista: Egzamin[]) => lista.find((e) => !minal(e));

/** „4 maja 2027” */
export const opisDaty = (iso: string) => dzien(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

export const odmianaDni = (n: number) => (n === 1 ? "dzień" : "dni");

/** „Polski, podstawowy” */
export const nazwaEgzaminu = (e: Egzamin) => `${przedmiot(e.przedmiotId)!.nazwa}, ${nazwaPoziomu[e.poziom]}`;
