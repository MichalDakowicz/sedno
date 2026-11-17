export function unormujTekst(s: string) {
  return s.normalize("NFKC").toLowerCase().replace(/[’‘´]/g, "'").replace(/\s+/g, " ").trim();
}

// Porównujemy wartości dokładnie, także poza zakresem bezpiecznych liczb JS.
export function ulamek(s: string): [bigint, bigint] | null {
  const zapis = s.normalize("NFKC").trim().replace(/[−–]/g, "-").replace(/⁄/g, "/")
    .replace(/^\\\((.*)\\\)$/s, "$1").replace(/^\$([^$]+)\$$/, "$1").trim()
    .replace(/^(?:x(?:_?\d+)?|[as](?:_?\d+)?|p(?:\(a\))?|nwd)\s*=\s*/i, "")
    .replace(/\\(?:d|t)?frac\s*\{([+-]?\d+)\}\s*\{([+-]?\d+)\}/, "$1/$2");
  const odejmijProcent = zapis.endsWith("%");
  const liczba = odejmijProcent ? zapis.slice(0, -1).trim() : zapis;
  const dzielenie = liczba.match(/^([+-]?\d{1,30})\s*\/\s*([+-]?\d{1,30})$/);
  if (dzielenie) {
    const [a, b] = [BigInt(dzielenie[1]), BigInt(dzielenie[2])];
    return b ? [a, b * (odejmijProcent ? 100n : 1n)] : null;
  }
  const dziesietny = liczba.match(/^([+-]?)(\d{0,30})(?:[.,](\d{1,15}))?$/);
  if (!dziesietny || !(dziesietny[2] || dziesietny[3])) return null;
  return [
    BigInt((dziesietny[2] || "0") + (dziesietny[3] || "")) * (dziesietny[1] === "-" ? -1n : 1n),
    10n ** BigInt(dziesietny[3]?.length ?? 0) * (odejmijProcent ? 100n : 1n),
  ];
}

export function rownaLiczba(a: string, b: string): boolean | null {
  const x = ulamek(a);
  const y = ulamek(b);
  return x && y ? x[0] * y[1] === y[0] * x[1] : null;
}

function polaWiersza(s: string) {
  return s.trim().replace(/^[a-z]\)\s*/i, "")
    .replace(/\s+(kg|zł|razy|m3|m³)\s*$/i, "")
    .split(/\s*;\s*|\t+|\s+/).filter(Boolean);
}

// Zachowuje kolejność i granice liczb. "1 23" i "12 3" są różnymi wynikami.
export function zgodnyWynik(a: string, b: string) {
  const linie = (s: string) => s.split(/\r?\n/).map(polaWiersza).filter((p) => p.length);
  const lewy = linie(a);
  const prawy = linie(b);
  return lewy.length === prawy.length && lewy.every((l, i) =>
    l.length === prawy[i].length && l.every((p, j) =>
      rownaLiczba(p, prawy[i][j]) ?? unormujTekst(p) === unormujTekst(prawy[i][j])
    )
  );
}
