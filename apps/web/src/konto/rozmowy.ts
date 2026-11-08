// Rozmowy z Pestką w zwykłym czacie: bieżąca przeżywa odświeżenie strony, a wcześniejsze da się
// otworzyć i ciągnąć dalej (model dostaje całą historię). Na razie w pamięci przeglądarki;
// rozmowy przy arkuszach (omawianie błędów) siedzą w postępie arkusza, który synchronizuje się z kontem.

export type WiadomoscRozmowy = { from: "tutor" | "student"; text: string };
export type Rozmowa = { id: string; tytul: string; kiedy: string; wiadomosci: WiadomoscRozmowy[] };

const KLUCZ = "sedno.pestka.rozmowy";
const BIEZACA = "sedno.pestka.biezaca";
const LIMIT = 20;

export function wczytajRozmowy(): Rozmowa[] {
  try {
    const z = localStorage.getItem(KLUCZ);
    return z ? (JSON.parse(z) as Rozmowa[]) : [];
  } catch {
    return [];
  }
}

export function idBiezacej(): string | null {
  try {
    return localStorage.getItem(BIEZACA);
  } catch {
    return null;
  }
}

export function ustawBiezaca(id: string) {
  try {
    localStorage.setItem(BIEZACA, id);
  } catch {
    // zablokowany storage: rozmowa zostaje tylko w pamięci
  }
}

/** Tytuł z pierwszego pytania ucznia, skrócony do kilku słów. */
export function tytul(wiadomosci: WiadomoscRozmowy[]): string | null {
  const pierwsze = wiadomosci.find((m) => m.from === "student")?.text.replace(/\s+/g, " ").trim();
  if (!pierwsze) return null;
  return pierwsze.length > 48 ? `${pierwsze.slice(0, 46).replace(/\s+\S*$/, "")}…` : pierwsze;
}

/** Zapisuje rozmowę, gdy uczeń już coś napisał; najnowsze na początku, najwyżej LIMIT. */
export function zapiszRozmowe(id: string, wiadomosci: WiadomoscRozmowy[]): Rozmowa[] {
  const t = tytul(wiadomosci);
  const reszta = wczytajRozmowy().filter((r) => r.id !== id);
  const lista = t ? [{ id, tytul: t, kiedy: new Date().toISOString(), wiadomosci }, ...reszta].slice(0, LIMIT) : reszta;
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(lista));
  } catch {
    // brak miejsca: zostaje poprzedni zapis
  }
  return lista;
}

export const noweId = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
