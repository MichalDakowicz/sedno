// Wyniki zapytań nauki z poprzednich wejść (useZapytanieNauki): przy powrocie na stronę widać je od razu,
// a świeże dane dochodzą w tle. Klucz zawiera id konta, a po wylogowaniu pamięć znika.
// To samo zapytanie w locie (rozgrzewanie z menu i widok, dwa widgety pulpitu) idzie do bazy raz: wszyscy czekają
// na jedną obietnicę.
import { supabase } from "../supabase";

export const pamiecNauki = new Map<string, unknown>();
const wLocie = new Map<string, Promise<unknown>>();
// Zapytanie wysłane przed unieważnieniem nie może wpisać do pamięci danych sprzed zmiany.
let pokolenie = 0;

/** Zmiana w nauce (odpowiedź, nowa albo usunięta runda): zapamiętane mapy, powtórki i listy są nieaktualne. */
export function uniewaznijNauke() {
  pamiecNauki.clear();
  wLocie.clear();
  pokolenie++;
}

/**
 * Pobiera dane pod kluczem (z id konta) albo dołącza do pobierania, które już trwa. Obietnica nie zależy od tego,
 * kto pierwszy o nią poprosił, więc odejście z widoku jej nie przerywa; odbiorca sam ignoruje spóźniony wynik.
 */
export function pobierzWspolnie<T>(klucz: string, pobierz: (signal: AbortSignal) => Promise<T>, zapamietaj = true): Promise<T> {
  const trwa = wLocie.get(klucz);
  if (trwa) return trwa as Promise<T>;
  const start = pokolenie;
  const obietnica: Promise<T> = pobierz(new AbortController().signal)
    .then((dane) => {
      if (zapamietaj && start === pokolenie) pamiecNauki.set(klucz, dane);
      return dane;
    })
    .finally(() => {
      if (wLocie.get(klucz) === obietnica) wLocie.delete(klucz);
    });
  wLocie.set(klucz, obietnica);
  return obietnica;
}

/** Czy dane pod kluczem są w pamięci albo właśnie się pobierają (rozgrzewanie wtedy nic nie robi). */
export const jestAlboLeci = (klucz: string) => pamiecNauki.has(klucz) || wLocie.has(klucz);

supabase.auth.onAuthStateChange((zdarzenie) => {
  if (zdarzenie === "SIGNED_OUT") uniewaznijNauke();
});
