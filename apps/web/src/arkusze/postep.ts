// Postęp w arkuszu trzymany lokalnie w przeglądarce, dopóki nie ma backendu.
import { useCallback, useEffect, useState } from "react";
import type { Odpowiedzi, Samoocena } from "./sprawdz";

export type Postep = {
  odpowiedzi: Odpowiedzi;
  samoocena: Samoocena;
  sprawdzony: boolean; // cały arkusz
  sprawdzoneZadania: number[]; // pojedyncze zadania sprawdzone przed końcem
  wynik?: { zdobyte: number; mozliwe: number; kiedy: string };
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
