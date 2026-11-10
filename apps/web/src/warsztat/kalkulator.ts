// Kalkulator do brudnopisu. Własny parser rekurencyjny zamiast eval: wejście to dowolny tekst
// ucznia, więc nic z niego nie może trafić do wykonania. Obsługuje liczby (przecinek i kropka
// jako separator dziesiętny), + - * / ^, nawiasy i minus jednoargumentowy. Wszystko inne
// (litery, funkcje, niedomknięte nawiasy, dzielenie przez zero) daje null, czyli brak sugestii.

const MAKS_DLUGOSC = 200;
const MAKS_GLEBOKOSC = 40;

class Blad extends Error {}

/** Wartość wyrażenia albo null, gdy jest niepełne, nieobsługiwane lub nie ma wyniku. */
export function policz(tekst: string): number | null {
  if (tekst.length > MAKS_DLUGOSC) return null;
  const s = tekst.replace(/−/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/ /g, " ");
  let i = 0;
  let glebokosc = 0;

  const spacje = () => {
    while (s[i] === " " || s[i] === "\t") i++;
  };
  const znak = (z: string) => {
    spacje();
    if (s[i] === z) {
      i++;
      return true;
    }
    return false;
  };

  const liczba = (): number => {
    spacje();
    const m = /^(\d+([.,]\d+)?|[.,]\d+)/.exec(s.slice(i));
    if (!m) throw new Blad();
    i += m[0].length;
    return Number(m[0].replace(",", "."));
  };

  const atom = (): number => {
    spacje();
    if (s[i] === "(") {
      if (++glebokosc > MAKS_GLEBOKOSC) throw new Blad();
      i++;
      const w = suma();
      if (!znak(")")) throw new Blad();
      glebokosc--;
      return w;
    }
    return liczba();
  };

  // Potęga wiąże mocniej niż minus przed nią (-2^2 = -4) i łączy się w prawo (2^3^2 = 2^9).
  const potega = (): number => {
    const podstawa = atom();
    if (znak("^")) return Math.pow(podstawa, jednoargumentowy());
    return podstawa;
  };

  const jednoargumentowy = (): number => {
    if (++glebokosc > MAKS_GLEBOKOSC) throw new Blad();
    let w: number;
    if (znak("-")) w = -jednoargumentowy();
    else if (znak("+")) w = jednoargumentowy();
    else w = potega();
    glebokosc--;
    return w;
  };

  const iloczyn = (): number => {
    let w = jednoargumentowy();
    for (;;) {
      if (znak("*")) w *= jednoargumentowy();
      else if (znak("/")) {
        const d = jednoargumentowy();
        if (d === 0) throw new Blad();
        w /= d;
      } else return w;
    }
  };

  function suma(): number {
    let w = iloczyn();
    for (;;) {
      if (znak("+")) w += iloczyn();
      else if (znak("-")) w -= iloczyn();
      else return w;
    }
  }

  try {
    const w = suma();
    spacje();
    if (i !== s.length || !Number.isFinite(w)) return null;
    return w;
  } catch {
    return null;
  }
}

/** Wynik po polsku: przecinek, bez błędów zmiennoprzecinkowych (0,1+0,2 to 0,3). Null dla liczb poza czytelnym zakresem. */
export function formatuj(w: number): string | null {
  const a = Math.abs(w);
  if (a >= 1e15 || (a !== 0 && a < 1e-9)) return null;
  return String(Number(w.toPrecision(12))).replace(".", ",");
}

const maOperator = (t: string) => /[-+*/^×÷·−]/.test(t.replace(/^\s*[-+−]/, ""));

/**
 * Sugestia dla kursora stojącego tuż po „=”: bierze wyrażenie z tej linii przed „=” (po
 * ewentualnym wcześniejszym „=”) i próbuje od najdłuższego fragmentu, żeby etykieta typu
 * „1.2) ” albo „a: ” przed wyrażeniem nie przeszkadzała. Pojedyncza liczba nie dostaje
 * sugestii, bo nie ma czego liczyć.
 */
export function sugestia(tekst: string, kursor: number): string | null {
  const linia = tekst.slice(tekst.lastIndexOf("\n", kursor - 1) + 1, kursor);
  if (!linia.endsWith("=")) return null;
  const caly = linia.slice(0, -1);
  const reszta = caly.slice(caly.lastIndexOf("=") + 1);
  const starty = [0];
  for (let k = 0; k < reszta.length; k++) if (/[\s:;]/.test(reszta[k])) starty.push(k + 1);
  for (const p of starty) {
    const kandydat = reszta.slice(p).trim();
    if (!kandydat || !maOperator(kandydat)) continue;
    const w = policz(kandydat);
    if (w !== null) return formatuj(w);
  }
  return null;
}
