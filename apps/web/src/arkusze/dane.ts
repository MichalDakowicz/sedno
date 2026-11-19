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

// pamiec: wynik z wcześniejszego wejścia pokazujemy od razu, bez szkieletu i bez ponownego pobierania.
function useZapytanie<T>(klucz: string, pobierz: () => PromiseLike<{ data: T | null; error: { message: string } | null }>, pamiec?: Map<string, T>): Stan<T> {
  const zPamieci = (k: string): Stan<T> | null => {
    const dane = pamiec?.get(k);
    return dane ? { dane, blad: null, laduje: false } : null;
  };
  const [stan, setStan] = useState<Stan<T>>(() => zPamieci(klucz) ?? { dane: null, blad: null, laduje: true });
  useEffect(() => {
    const zapis = zPamieci(klucz);
    if (zapis) {
      setStan(zapis);
      return;
    }
    let aktualne = true;
    setStan({ dane: null, blad: null, laduje: true });
    pobierz().then(({ data, error }) => {
      if (!aktualne) return;
      if (error) setStan({ dane: null, blad: error.message, laduje: false });
      else if (data === null || (Array.isArray(data) && data.length === 0)) setStan({ dane: null, blad: "brak-danych", laduje: false });
      else {
        pamiec?.set(klucz, data);
        setStan({ dane: data, blad: null, laduje: false });
      }
    });
    return () => {
      aktualne = false;
    };
    // pobierz zależy tylko od klucza
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klucz]);
  return stan;
}

const listy = new Map<string, ArkuszWpis[]>();

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
        else if (data?.length) listy.set("lista", data.map((r) => r.entry as ArkuszWpis));
        return { data: data ? data.map((r) => r.entry as ArkuszWpis) : null, error };
      }),
  );
  return lista;
}

/** Rozgrzewanie: lista arkuszy w tle, zanim uczeń wejdzie na Arkusze albo pulpit. */
export const rozgrzejListeArkuszy = () => void pobierzListe();

export const useListaArkuszy = () => useZapytanie<ArkuszWpis[]>("lista", pobierzListe, listy);

// Treść arkusza się nie zmienia, więc w obrębie sesji pobieramy ją raz. Runda nauki otwiera ten sam arkusz
// przy każdym pytaniu, a bez pamięci każde pytanie czekało na cały arkusz od nowa.
const arkusze = new Map<string, Arkusz>();

/** Po wylogowaniu następne konto pobiera arkusze od nowa (dostęp sprawdza RLS). */
export function wyczyscArkusze() {
  arkusze.clear();
  listy.clear();
  lista = null;
  arkuszeWLocie.clear();
}

// Pobieranie treści arkusza w locie: wspólne dla rozgrzewania (najechanie na kartę w liście) i widoku.
const arkuszeWLocie = new Map<string, PromiseLike<{ data: Arkusz | null; error: { message: string } | null }>>();

function pobierzArkusz(id: string) {
  const trwa = arkuszeWLocie.get(id);
  if (trwa) return trwa;
  const obietnica = supabase
    .from("sheets")
    .select("data")
    .eq("id", id)
    .maybeSingle()
    .then(({ data, error }) => {
      arkuszeWLocie.delete(id);
      const arkusz = data ? zNakladka(data.data as Arkusz) : null;
      if (arkusz) arkusze.set(`arkusz:${id}`, arkusz);
      return { data: arkusz, error };
    });
  arkuszeWLocie.set(id, obietnica);
  return obietnica;
}

/** Rozgrzewanie: treść arkusza w tle, gdy uczeń najeżdża na jego kartę. */
export function rozgrzejArkusz(id: string) {
  if (!arkusze.has(`arkusz:${id}`)) void pobierzArkusz(id);
}

export const useArkusz = (id: string) => useZapytanie<Arkusz>(`arkusz:${id}`, () => pobierzArkusz(id), arkusze);
