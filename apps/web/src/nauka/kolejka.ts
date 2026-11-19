// Kolejka powtórek („Powtórz wszystkie”): adresy kolejnych powtórek w sessionStorage. Przycisk startuje pierwszą,
// a rozbiór każdej rundy proponuje następną jako jedyną główną akcję, dopóki kolejka się nie skończy.
const KLUCZ = "sedno.kolejkaPowtorek";

type Kolejka = { adresy: string[]; razem: number };

function czytaj(): Kolejka | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KLUCZ) ?? "null") as Kolejka | null;
    return v && Array.isArray(v.adresy) && typeof v.razem === "number" ? v : null;
  } catch {
    return null;
  }
}

function zapisz(k: Kolejka | null) {
  try {
    if (k && k.adresy.length) sessionStorage.setItem(KLUCZ, JSON.stringify(k));
    else sessionStorage.removeItem(KLUCZ);
  } catch {
    // bez sessionStorage kolejka kończy się na pierwszej powtórce
  }
}

/** Zapisuje kolejkę i zwraca adres pierwszej powtórki (reszta czeka na rozbiór). */
export function zacznijKolejke(adresy: string[]): string | null {
  const [pierwszy, ...reszta] = adresy;
  if (!pierwszy) return null;
  zapisz({ adresy: reszta, razem: adresy.length });
  return pierwszy;
}

/** Następna powtórka z kolejki bez zdejmowania (do pokazania w rozbiorze): adres i numer „n z razem”. */
export function nastepnaWKolejce(): { adres: string; numer: number; razem: number } | null {
  const k = czytaj();
  if (!k?.adresy.length) return null;
  return { adres: k.adresy[0]!, numer: k.razem - k.adresy.length + 1, razem: k.razem };
}

/** Zdejmuje następną powtórkę (kliknięcie „Następna powtórka”). */
export function zdejmijZKolejki() {
  const k = czytaj();
  if (k) zapisz({ ...k, adresy: k.adresy.slice(1) });
}

export const porzucKolejke = () => zapisz(null);
