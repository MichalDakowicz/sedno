const RZYMSKIE: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };

export function rzymskie(s: string): number | undefined {
  if (!/^[IVXLC]+$/.test(s)) return;
  let suma = 0;
  for (let i = 0; i < s.length; i++) {
    const v = RZYMSKIE[s[i]], nastepna = RZYMSKIE[s[i + 1]] ?? 0;
    suma += v < nastepna ? -v : v;
  }
  return suma;
}
