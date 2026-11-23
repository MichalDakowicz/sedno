const SYMBOL_MAT = /[\u{1d400}-\u{1d7ff}=+−×·√∑∫≥≤±→^]/u;
const ZWYKLE_SLOWO = /\p{L}{4,}/u;

function liniaWzoru(l) {
  return !ZWYKLE_SLOWO.test(l.t.tekst.replace(/\b(?:lim|cos|sin|log|tg|ctg)\b/g, ""))
    && !/^[\s.…_–-]+$/.test(l.t.tekst);
}

// Licznik, mianownik albo granica operatora mają osobne linie w warstwie tekstu.
// Odróżnia je od akapitu mały odstęp pionowy i nakładające się obwiednie znaków.
export function wzoryWielowierszowe(linie) {
  const grupy = [];
  for (const l of linie) {
    if (!liniaWzoru(l)) continue;
    const prawa = Math.max(...l.czesci.map((c) => c.x + c.w));
    const poprzednia = grupy.at(-1);
    const odstep = poprzednia ? poprzednia.linie.at(-1).y - l.y : Infinity;
    const margines = odstep <= 10 ? 55 : 5;
    if (odstep > 0 && odstep <= 12.4 && l.x < poprzednia.prawa + margines && prawa > poprzednia.lewa - margines) {
      poprzednia.linie.push(l);
      poprzednia.lewa = Math.min(poprzednia.lewa, l.x);
      poprzednia.prawa = Math.max(poprzednia.prawa, prawa);
    } else grupy.push({ linie: [l], lewa: l.x, prawa });
  }
  return grupy.filter(({ linie }) => linie.length >= 2 && linie.some((l) => SYMBOL_MAT.test(l.czesci.map((c) => c.s).join(""))));
}
