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

const DOPELNIACZ: Record<Exclude<Stadium, "pestka">, string> = { kielek: "kiełka", roslina: "rośliny", drzewko: "drzewka" };

/** Ile brakuje do następnego stadium, np. „do kiełka brakuje 6%”; null przy drzewku albo bez oceny. */
export function doNastepnegoStadium(opanowanie: number | null | undefined): string | null {
  if (opanowanie == null) return null;
  const st = stadium(opanowanie);
  if (st === "drzewko") return null;
  const nastepne = KOLEJNOSC_STADIOW[KOLEJNOSC_STADIOW.indexOf(st) + 1] as Exclude<Stadium, "pestka">;
  const brakuje = Math.max(1, Math.ceil((PROGI_STADIOW[nastepne] - opanowanie) * 100));
  return `do ${DOPELNIACZ[nastepne]} brakuje ${brakuje}%`;
}
