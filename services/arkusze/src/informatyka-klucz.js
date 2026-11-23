// Klucz próbnej matury z 2014 r. ma osobne kolumny na podpunkt i jego punktację.
export function kluczInformatykiZTabeli(strony) {
  const klucz = {};
  for (const [i, linie] of strony.entries()) {
    if (i === 0) continue;
    let akt;
    let przed = [];
    for (const l of linie) {
      if (l.y < 55) break;
      const numer = l.seg.find((g) => g.x > 104 && g.x < 166 && /^\d+\.\d+\.$/.test(g.s))?.s.slice(0, -1);
      const punkty = l.seg.find((g) => g.x > 421 && g.x < 482 && /^\d{1,2}$/.test(g.s))?.s;
      const odpowiedz = l.seg.filter((g) => g.x > 147 && g.x < 420).map((g) => g.s).join(" ");
      if (numer && punkty) {
        akt = klucz[numer] = { strona: i + 1, punkty: Number(punkty), linie: przed };
        przed = [];
      }
      if (!odpowiedz || /Oczekiwana odpowiedź/.test(odpowiedz)) continue;
      if (!numer && /^Za (?:podanie|prawidłow|poprawn)/i.test(odpowiedz) && akt?.linie.length) akt = undefined;
      if (akt) akt.linie.push(odpowiedz);
      else przed.push(odpowiedz);
    }
  }
  for (const k of Object.values(klucz)) {
    const rozwiazanie = k.linie.findIndex((l) => /^Przykładowe rozwiązanie|^Odpowiedź[: ]/i.test(l));
    const kod = k.linie.map((l) => l.match(/prawidłowej odpowiedzi\s+([PF]{2,})\b/i)?.[1]).find(Boolean);
    k.zasady = (rozwiazanie < 0 ? k.linie : k.linie.slice(0, rozwiazanie)).join("\n");
    k.rozwiazanie = kod ?? (rozwiazanie < 0 ? "" : k.linie.slice(rozwiazanie).join("\n"));
    delete k.linie;
  }
  return klucz;
}
