import { useEffect, useState } from "react";
import type { Arkusz, ArkuszWpis } from "./typy";

type Stan<T> = { dane: T | null; blad: string | null; laduje: boolean };

function useJson<T>(url: string): Stan<T> {
  const [stan, setStan] = useState<Stan<T>>({ dane: null, blad: null, laduje: true });
  useEffect(() => {
    let aktualne = true;
    setStan({ dane: null, blad: null, laduje: true });
    fetch(url)
      .then((odp) => {
        if (!odp.ok) throw new Error(odp.status === 404 ? "brak-danych" : `HTTP ${odp.status}`);
        return odp.json() as Promise<T>;
      })
      .then((dane) => aktualne && setStan({ dane, blad: null, laduje: false }))
      // Vite w dev zwraca index.html dla nieznanych ścieżek, stąd błąd parsowania = brak danych.
      .catch((e: Error) => aktualne && setStan({ dane: null, blad: e instanceof SyntaxError ? "brak-danych" : e.message, laduje: false }));
    return () => {
      aktualne = false;
    };
  }, [url]);
  return stan;
}

export const useListaArkuszy = () => useJson<ArkuszWpis[]>("/dane/arkusze/index.json");
export const useArkusz = (id: string) => useJson<Arkusz>(`/dane/arkusze/${encodeURIComponent(id)}.json`);
