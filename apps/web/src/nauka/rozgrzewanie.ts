// Rozgrzewanie: dane głównych ekranów pobierane w tle, zanim uczeń na nie wejdzie. Zaraz po wejściu do aplikacji
// (w wolnej chwili po pierwszym renderze) wszystkie pozycje menu, a przy najechaniu, fokusie albo dotknięciu
// linku jeszcze raz ta trasa (gdy czegoś brakuje). Klucze i funkcje są te same co w widokach (nauka/zapytania.ts),
// a zapytanie w locie jest wspólne, więc widok po wejściu dołącza do trwającego pobierania zamiast wysyłać nowe.
import { useEffect } from "react";
import type { Poziom } from "../arkusze/typy";
import { rozgrzejListeArkuszy } from "../arkusze/dane";
import { currentUserId, useProfil } from "../auth";
import { rozgrzejPostepyKonta } from "../konto/wyniki";
import { jestAlboLeci, pobierzWspolnie } from "./pamiec";
import { zapytania, type Zapytanie } from "./zapytania";

export function rozgrzej(z: Zapytanie<unknown>) {
  const user = currentUserId();
  if (!user) return;
  const klucz = `${user}:${z.klucz}`;
  if (jestAlboLeci(klucz)) return;
  // Błąd rozgrzewania nic nie psuje: widok spróbuje sam i pokaże błąd po swojemu.
  pobierzWspolnie(klucz, z.pobierz).catch(() => {});
}

const arkusze = () => {
  rozgrzejListeArkuszy();
  rozgrzejPostepyKonta();
};

/** Co potrzebuje każda pozycja menu; p: poziom angielskiego z profilu, null bez angielskiego. */
const TRASY: Record<string, (p: Poziom | null) => void> = {
  "/": (p) => {
    arkusze();
    if (!p) return;
    [zapytania.otwarteRundy(), zapytania.powtorki(p), zapytania.polecenie(p), zapytania.diagnoza(p)].forEach(rozgrzej);
    [zapytania.mapa(p), zapytania.historia(p), zapytania.plan(p), zapytania.aktywnosc()].forEach(rozgrzej);
  },
  "/nauka": (p) => {
    arkusze();
    if (p) [zapytania.mapa(p), zapytania.polecenie(p), zapytania.otwarteRundy(), zapytania.powtorki(p)].forEach(rozgrzej);
  },
  "/arkusze": arkusze,
  "/umiejetnosci": (p) => {
    if (p) [zapytania.mapa(p), zapytania.historia(p), zapytania.polecenie(p), zapytania.plan(p)].forEach(rozgrzej);
  },
  "/powtorki": (p) => {
    arkusze();
    if (p) [zapytania.powtorki(p), zapytania.mapa(p), zapytania.diagnoza(p), zapytania.otwarteRundy(), zapytania.polecenie(p)].forEach(rozgrzej);
  },
};

let poziomKonta: Poziom | null = null;

/** Rozgrzewa trasę z menu albo linku (ścieżka bez zapytania); nieznana ścieżka nic nie robi. */
export function rozgrzejTrase(sciezka: string) {
  const sama = sciezka.split(/[?#]/)[0]!;
  const trasa = TRASY[sama.startsWith("/przedmiot/") ? "/" : sama];
  trasa?.(poziomKonta);
}

/** Propsy linku, który rozgrzewa swoją trasę przy najechaniu, fokusie i dotknięciu. */
export const rozgrzewajLink = (do_: string) => {
  const f = () => rozgrzejTrase(do_);
  return { onPointerEnter: f, onFocus: f, onTouchStart: f };
};

/** W AppLayout: po zalogowaniu, w wolnej chwili po pierwszym renderze, rozgrzewa wszystkie pozycje menu. */
export function useRozgrzewanie() {
  const profil = useProfil();
  const poziom = profil === undefined ? undefined : profil?.subjects.find((s) => s.id === "angielski")?.poziom ?? null;
  useEffect(() => {
    if (poziom === undefined) return;
    poziomKonta = poziom;
    const wszystko = () => Object.values(TRASY).forEach((t) => t(poziom));
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(wszystko, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(wszystko, 200);
    return () => window.clearTimeout(t);
  }, [poziom]);
}
