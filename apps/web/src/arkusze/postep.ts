// Postęp w arkuszu trzymany lokalnie w przeglądarce, dopóki nie ma backendu.
import { useCallback, useEffect, useState } from "react";
import type { Odpowiedzi, Samoocena } from "./sprawdz";

// Szkic ucznia w Excalidraw przy jednym zadaniu. Elementy sceny w formacie
// Excalidraw (JSON), bez plików: rysunek bazowy aplikacja dokleja z arkusza
// przy otwarciu, a własnych obrazków brudnopis nie przyjmuje. Zwykłe dane,
// więc synchronizują się razem z resztą postępu.
export type Brudnopis = { elementy: readonly unknown[]; zmieniony: string };

export type Postep = {
  odpowiedzi: Odpowiedzi;
  samoocena: Samoocena;
  sprawdzony: boolean; // cały arkusz
  sprawdzoneZadania: number[]; // pojedyncze zadania sprawdzone przed końcem
  wynik?: { zdobyte: number; mozliwe: number; kiedy: string };
  brudnopisy?: Record<string, Brudnopis>; // klucz: numer zadania
};

export const pustyPostep: Postep = { odpowiedzi: {}, samoocena: {}, sprawdzony: false, sprawdzoneZadania: [] };
const pusty = pustyPostep;
const klucz = (id: string) => `sedno.arkusz.${id}`;

export function wczytajPostep(id: string): Postep {
  try {
    const zapis = localStorage.getItem(klucz(id));
    return zapis ? { ...pusty, ...JSON.parse(zapis) } : pusty;
  } catch {
    return pusty;
  }
}

function zapisz(id: string, p: Postep) {
  try {
    localStorage.setItem(klucz(id), JSON.stringify(p));
  } catch {
    // brak miejsca albo zablokowany storage: postęp zostaje tylko w pamięci
  }
}

export function usePostep(id: string) {
  const [postep, setPostep] = useState<Postep>(() => wczytajPostep(id));

  useEffect(() => setPostep(wczytajPostep(id)), [id]);

  const zmien = useCallback(
    (f: (p: Postep) => Postep) =>
      setPostep((stary) => {
        const nowy = f(stary);
        zapisz(id, nowy);
        return nowy;
      }),
    [id],
  );

  return [postep, zmien] as const;
}
