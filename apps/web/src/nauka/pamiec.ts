// Wyniki zapytań nauki z poprzednich wejść (useZapytanieNauki): przy powrocie na stronę widać je od razu,
// a świeże dane dochodzą w tle. Klucz zawiera id konta, a po wylogowaniu pamięć znika.
import { supabase } from "../supabase";

export const pamiecNauki = new Map<string, unknown>();

/** Zmiana w nauce (odpowiedź, nowa albo usunięta runda): zapamiętane mapy, powtórki i listy są nieaktualne. */
export function uniewaznijNauke() {
  pamiecNauki.clear();
}

supabase.auth.onAuthStateChange((zdarzenie) => {
  if (zdarzenie === "SIGNED_OUT") pamiecNauki.clear();
});
