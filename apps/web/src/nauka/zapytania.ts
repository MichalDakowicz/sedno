// Rejestr zapytań nauki: jeden klucz i jedna funkcja pobierająca dla każdego rodzaju danych. Widoki biorą je stąd
// (useZapytanie), więc te same dane mają ten sam klucz w pamięci, a rozgrzewanie (nauka/rozgrzewanie.ts) pobiera
// dokładnie to, czego potem użyje widok.
import type { Poziom } from "../arkusze/typy";
import { naukaApi } from "./api";

export type Zapytanie<T> = { klucz: string; pobierz: (signal: AbortSignal) => Promise<T> };

const poziomy: readonly Poziom[] = ["podstawowy", "rozszerzony", "dwujezyczny"];

export const zapytania = {
  mapa: (poziom: Poziom): Zapytanie<Awaited<ReturnType<typeof naukaApi.mapa>>> => ({
    klucz: `nauka:mapa:${poziom}`,
    pobierz: (signal) => naukaApi.mapa(poziom, signal),
  }),
  powtorki: (poziom: Poziom): Zapytanie<Awaited<ReturnType<typeof naukaApi.powtorki>>> => ({
    klucz: `nauka:powtorki:${poziom}`,
    pobierz: (signal) => naukaApi.powtorki(poziom, signal),
  }),
  plan: (poziom: Poziom): Zapytanie<Awaited<ReturnType<typeof naukaApi.plan>>> => ({
    klucz: `nauka:plan:${poziom}`,
    pobierz: (signal) => naukaApi.plan(poziom, signal),
  }),
  /** Historia opanowania z 90 dni: linia w panelu umiejętności i zmiana w tygodniu na pulpicie. */
  historia: (poziom: Poziom): Zapytanie<Awaited<ReturnType<typeof naukaApi.historia>>> => ({
    klucz: `nauka:historia:${poziom}`,
    pobierz: (signal) => naukaApi.historia(poziom, 90, signal),
  }),
  aktywnosc: (): Zapytanie<Awaited<ReturnType<typeof naukaApi.aktywnosc>>> => ({
    klucz: "nauka:aktywnosc",
    pobierz: (signal) => naukaApi.aktywnosc(28, signal),
  }),
  diagnoza: (poziom: Poziom): Zapytanie<Awaited<ReturnType<typeof naukaApi.diagnoza>>> => ({
    klucz: `nauka:diagnoza:${poziom}`,
    pobierz: (signal) => naukaApi.diagnoza(poziom, signal),
  }),
  dowody: (poziom: Poziom, umiejetnosc: string): Zapytanie<Awaited<ReturnType<typeof naukaApi.dowody>>> => ({
    klucz: `nauka:dowody:${poziom}:${umiejetnosc}`,
    pobierz: (signal) => naukaApi.dowody(umiejetnosc, poziom, signal),
  }),
  /** Polecenie z mapy (nauka_polec) z nazwą umiejętności: karta dnia i sposoby nauki. */
  polecenie: (poziom: Poziom) => ({
    klucz: `nauka:polecenie:${poziom}`,
    pobierz: async (signal: AbortSignal) => {
      const [propozycja, katalog] = await Promise.all([naukaApi.polec(poziom, undefined, signal), naukaApi.katalog(poziom, signal)]);
      const umiejetnosc = katalog.skills.find((u) => u.id === propozycja?.skill_id);
      return propozycja && umiejetnosc ? { ...propozycja, nazwa: umiejetnosc.name } : null;
    },
  }),
  /** Polecenie dla jednej umiejętności („Chcę coś innego” w Nauce). */
  polecenieUmiejetnosci: (poziom: Poziom, umiejetnosc: string): Zapytanie<Awaited<ReturnType<typeof naukaApi.polec>>> => ({
    klucz: `nauka:polec:${poziom}:${umiejetnosc}`,
    pobierz: (signal) => naukaApi.polec(poziom, umiejetnosc, signal),
  }),
  // Limit otwartych rund dotyczy całego konta, więc lista obejmuje wszystkie poziomy angielskiego i nie zależy od wybranego.
  otwarteRundy: () => ({
    klucz: "nauka:ostatnie:wszystkie",
    pobierz: async (signal: AbortSignal) => {
      const listy = await Promise.all(poziomy.map((p) => naukaApi.ostatnie(p, signal)));
      // Nowa baza nie zwraca diagnozy w nauka_ostatnie; filtr chroni listę, gdyby kiedyś się w niej znalazła.
      const sesje = listy.flat().filter((s) => s.format !== "diagnoza").sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      const naPoziomach = [...new Set(sesje.map((s) => s.level))];
      const katalogi = await Promise.all(naPoziomach.map((p) => naukaApi.katalog(p, signal).catch(() => null)));
      const nazwy = new Map(katalogi.flatMap((k) => (k?.skills ?? []).map((u) => [u.id, u.name] as const)));
      return { sesje, nazwy };
    },
  }),
};
