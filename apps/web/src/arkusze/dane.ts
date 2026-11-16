// Arkusze leżą w Supabase (tabela sheets), widoczne tylko dla zalogowanych. Wgrywa je `npm run wgraj`.
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { Arkusz, ArkuszWpis, Blok } from "./typy";
import nakladka from "./nakladka.json";

// Nakładka (npm run nakladka): numery stron PDF i czasy fragmentów nagrań, same liczby bez treści
// CKE. Uzupełnia arkusz z bazy, dopóki ten nie zostanie wgrany ponownie z nowym importem.
type Nakladka = Record<string, { z: Record<string, [number, number[], string]>; f?: Record<string, [number, number]> }>;
const LITERA: Record<Blok["typ"], string> = { akapit: "a", naglowek: "n", zrodlo: "z", wzor: "w", rysunek: "r", tabelaTresci: "t", kadr: "k", opcje: "o", pytanie: "p", pytania: "P", tabela: "T", kod: "c" };

export function zNakladka(a: Arkusz): Arkusz {
  const n = (nakladka as unknown as Nakladka)[a.id];
  if (!n) return a;
  const zadania = a.zadania.map((z) => {
    let wynik = z;
    const w = n.z[z.nr];
    // Strony tylko przy zgodnych blokach (ta sama liczba i typy); inaczej arkusz zostaje jedną stroną.
    if (w && !z.strona && z.bloki.length === w[1].length && z.bloki.map((b) => LITERA[b.typ] ?? "?").join("") === w[2]) {
      wynik = { ...z, strona: w[0], bloki: z.bloki.map((b, i) => ({ ...b, strona: w[1][i] || undefined })) };
    }
    const f = n.f;
    if (f) wynik = { ...wynik, pytania: wynik.pytania.map((p) => (!p.fragment && f[p.nr] ? { ...p, fragment: { od: f[p.nr][0], do: f[p.nr][1], tekst: "" } } : p)) };
    return wynik;
  });
  return { ...a, zadania };
}

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
      .then(({ data, error }) => ({ data: data ? zNakladka(data.data as Arkusz) : null, error })),
  );
