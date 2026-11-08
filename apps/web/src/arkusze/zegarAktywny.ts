// Który arkusz idzie teraz na czas. Dzięki temu zegar zostaje w górnym pasku także poza arkuszem
// i jednym kliknięciem wraca się do niego, dopóki uczeń sam nie wyłączy zegara albo nie sprawdzi arkusza.
// Sam czas siedzi w postępie arkusza (Postep.czas); tu tylko wskazanie, który to arkusz.
import { useEffect, useState } from "react";

export type AktywnyZegar = { id: string; limitMin: number };

const KLUCZ = "sedno.zegar-arkusza";
const ZDARZENIE = "sedno-zegar-arkusza";

function wczytaj(): AktywnyZegar | null {
  try {
    const z = localStorage.getItem(KLUCZ);
    return z ? (JSON.parse(z) as AktywnyZegar) : null;
  } catch {
    return null;
  }
}

export function ustawAktywnyZegar(z: AktywnyZegar | null) {
  try {
    if (z) localStorage.setItem(KLUCZ, JSON.stringify(z));
    else localStorage.removeItem(KLUCZ);
  } catch {
    // zablokowany storage: zegar zostaje tylko w arkuszu
  }
  window.dispatchEvent(new Event(ZDARZENIE));
}

export function useAktywnyZegar(): AktywnyZegar | null {
  const [z, setZ] = useState(wczytaj);
  useEffect(() => {
    const odswiez = () => setZ(wczytaj());
    window.addEventListener(ZDARZENIE, odswiez);
    window.addEventListener("storage", odswiez);
    return () => {
      window.removeEventListener(ZDARZENIE, odswiez);
      window.removeEventListener("storage", odswiez);
    };
  }, []);
  return z;
}
