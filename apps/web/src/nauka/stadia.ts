// Stadia kiełkującej pestki na mapie umiejętności. Progi w jednym miejscu, żeby dało się je przestroić: dziś opanowanie
// z samych rund zatrzymuje się ok. 67% (wzór w bazie do poprawy), więc progi są niżej, niż byłyby przy pełnej skali,
// a wszystkie cztery stadia są osiągalne.
export type Stadium = "pestka" | "kielek" | "roslina" | "drzewko";

export const PROGI_STADIOW = { kielek: 0.25, roslina: 0.45, drzewko: 0.6 } as const;

export const KOLEJNOSC_STADIOW: Stadium[] = ["pestka", "kielek", "roslina", "drzewko"];

export const NAZWA_STADIUM: Record<Stadium, string> = {
  pestka: "pestka",
  kielek: "kiełek",
  roslina: "roślina z liśćmi",
  drzewko: "drzewko z owocem",
};

/** Stadium z wyświetlanego opanowania (0–1); brak oceny to pestka. */
export function stadium(opanowanie: number | null | undefined): Stadium {
  if (opanowanie == null || opanowanie < PROGI_STADIOW.kielek) return "pestka";
  if (opanowanie < PROGI_STADIOW.roslina) return "kielek";
  if (opanowanie < PROGI_STADIOW.drzewko) return "roslina";
  return "drzewko";
}

export const wyzszeStadium = (a: Stadium, b: Stadium) => KOLEJNOSC_STADIOW.indexOf(b) > KOLEJNOSC_STADIOW.indexOf(a);
