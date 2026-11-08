// Weryfikacja programu jak w sprawdzarce: czy wyjście (ekran i zapisane pliki) zawiera wynik
// podpunktu z klucza CKE. Porównanie jak przy sprawdzaniu odpowiedzi (normalizujWynik: bez
// odstępów, jednostek i formatu liczb), ale po całych wierszach, żeby „40” nie pasowało do „1405”.
import { normalizujWynik } from "../arkusze/sprawdz";

// Etykieta podpunktu na początku wiersza („3.1 40”, „3.1. 40”, „Zadanie 3.1: 40”).
const ETYKIETA = /^\s*(zadanie\s*)?\d+(\.\d+)?\.?\s*[:)\-–]?\s*/i;

export function zgodneZKluczem(wyjscie: string, oczekiwane: string[]): boolean {
  const linie = wyjscie.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  for (const wzor of oczekiwane) {
    const cel = normalizujWynik(wzor);
    if (!cel) continue;
    const ile = wzor.split("\n").filter((l) => l.trim()).length;
    for (let i = 0; i + ile <= linie.length; i++) {
      const okno = linie.slice(i, i + ile);
      const bezEtykiety = [okno[0].replace(ETYKIETA, ""), ...okno.slice(1)];
      if (normalizujWynik(okno.join("\n")) === cel || normalizujWynik(bezEtykiety.join("\n")) === cel) return true;
    }
  }
  return false;
}
