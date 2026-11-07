// Arkusze leżą w Supabase (tabela sheets), widoczne tylko dla zalogowanych. Wgrywa je `npm run wgraj`.
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { Arkusz, ArkuszWpis } from "./typy";

type Stan<T> = { dane: T | null; blad: string | null; laduje: boolean };

function useZapytanie<T>(klucz: string, pobierz: () => PromiseLike<{ data: T | null; error: { message: string } | null }>): Stan<T> {
  const [stan, setStan] = useState<Stan<T>>({ dane: null, blad: null, laduje: true });
  useEffect(() => {
    let aktualne = true;
    setStan({ dane: null, blad: null, laduje: true });
    pobierz().then(({ data, error }) => {
      if (!aktualne) return;
      if (error) setStan({ dane: null, blad: error.message, laduje: false });
      else if (data === null || (Array.isArray(data) && data.length === 0)) setStan({ dane: null, blad: "brak-danych", laduje: false });
      else setStan({ dane: data, blad: null, laduje: false });
    });
    return () => {
      aktualne = false;
    };
    // pobierz zależy tylko od klucza
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klucz]);
  return stan;
}

// Lista arkuszy rzadko się zmienia, więc w obrębie sesji pobieramy ją raz.
let lista: Promise<{ data: ArkuszWpis[] | null; error: { message: string } | null }> | null = null;

function pobierzListe() {
  lista ??= Promise.resolve(
    supabase
      .from("sheets")
      .select("entry")
      .order("position")
      .then(({ data, error }) => {
        if (error) lista = null;
        return { data: data ? data.map((r) => r.entry as ArkuszWpis) : null, error };
      }),
  );
  return lista;
}

export const useListaArkuszy = () => useZapytanie<ArkuszWpis[]>("lista", pobierzListe);

export const useArkusz = (id: string) =>
  useZapytanie<Arkusz>(`arkusz:${id}`, () =>
    supabase
      .from("sheets")
      .select("data")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => ({ data: data ? (data.data as Arkusz) : null, error })),
  );
