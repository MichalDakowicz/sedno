// W starszych kluczach zamknięte zadania matematyczne są w jednym wierszu tabeli.
export function odpowiedziZTabeli(strony) {
  const klucz = {};
  for (const [i, linie] of strony.entries()) {
    for (const [j, l] of linie.entries()) {
      const odp = l.s.match(/^(?:Odp\.|Odpowiedź)\s+((?:[A-H]\s*){3,})$/)?.[1].match(/[A-H]/g);
      if (!odp) continue;
      const numery = linie.slice(Math.max(0, j - 4), j).reverse()
        .map((w) => w.s.replace(/^(?:Numer zadania|Nr zad\.?)\s*/, "").match(/^(?:\d{1,2}\.?\s*)+$/)?.[0].match(/\d+/g))
        .find((n) => n?.length === odp.length);
      if (!numery || !numery.every((n, k) => k === 0 || Number(n) === Number(numery[k - 1]) + 1)) continue;
      numery.forEach((nr, k) => (klucz[nr] = { strona: i + 1, punkty: 1, rozwiazanie: odp[k] }));
    }
  }
  return klucz;
}
