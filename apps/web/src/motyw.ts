// Motyw aplikacji idzie za ustawieniem systemu (tokens.css). Ten plik jest dla bibliotek, które muszą znać
// motyw w JS (Excalidraw, Monaco, Chart.js): nie czytają zmiennych CSS same.
import { useSyncExternalStore } from "react";

const zapytanie = "(prefers-color-scheme: dark)";

export const czyCiemny = () => window.matchMedia(zapytanie).matches;

/** Wywołuje `fn` przy każdej zmianie motywu systemu; zwraca funkcję odpinającą nasłuch. */
export function naZmianeMotywu(fn: (ciemny: boolean) => void) {
  const mq = window.matchMedia(zapytanie);
  const nasluch = () => fn(mq.matches);
  mq.addEventListener("change", nasluch);
  return () => mq.removeEventListener("change", nasluch);
}

export const useCiemny = () => useSyncExternalStore((zmiana) => naZmianeMotywu(zmiana), czyCiemny);
