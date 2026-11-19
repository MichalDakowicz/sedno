// Stadia kiełkującej pestki na mapie umiejętności. Progi w jednym miejscu, żeby dało się je przestroić.
// Model w bazie (migracja 0020) zaczyna od 50%, a bezbłędne rundy po pięć zadań dają kolejno ok. 68, 79, 86, 90, 93%.
// Przy stałej skuteczności ocena dochodzi mniej więcej do niej (trochę niżej, bo błąd w łatwym zadaniu waży więcej).
// Kiełek: pierwsza dobra runda albo ok. 60% dobrych odpowiedzi. Roślina: dwie bezbłędne rundy albo ok. 80%.
// Drzewko: trzy, cztery bezbłędne rundy albo stale ok. 90%; zanik z czasem zabiera je po kilku dniach bez ćwiczeń.
export type Stadium = "pestka" | "kielek" | "roslina" | "drzewko";

export const PROGI_STADIOW = { kielek: 0.55, roslina: 0.75, drzewko: 0.85 } as const;

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
