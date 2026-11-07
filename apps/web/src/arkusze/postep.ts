// Postęp w arkuszu: pamięć przeglądarki jako szybka kopia, konto w Supabase jako źródło prawdy.
// Bez sieci albo przed zalogowaniem wszystko działa lokalnie, a zapis dogania konto później.
import { useCallback, useEffect, useState } from "react";
import { currentUserId } from "../auth";
import { supabase } from "../supabase";
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

function zapiszLokalnie(id: string, p: Postep) {
  try {
    localStorage.setItem(klucz(id), JSON.stringify(p));
  } catch {
    // brak miejsca albo zablokowany storage: postęp zostaje tylko w pamięci
  }
}

const oczekujace = new Map<string, ReturnType<typeof setTimeout>>();

// Zapis na konto z opóźnieniem, żeby nie wysyłać każdej zmiany osobno.
function zapiszNaKonto(id: string, p: Postep) {
  const user = currentUserId();
  if (!user) return;
  clearTimeout(oczekujace.get(id));
  oczekujace.set(
    id,
    setTimeout(() => {
      oczekujace.delete(id);
      // Zapytanie Supabase rusza dopiero po then/await.
      void supabase.from("sheet_progress").upsert({ user_id: user, sheet_id: id, data: p }).then();
    }, 800),
  );
}

/** Ściąga cały postęp konta do pamięci przeglądarki. */
export async function pobierzPostepy(user: string): Promise<void> {
  const { data, error } = await supabase.from("sheet_progress").select("sheet_id, data").eq("user_id", user);
  if (error || !data) return;
  for (const row of data) zapiszLokalnie(row.sheet_id, { ...pusty, ...(row.data as Postep) });
}

export function usePostep(id: string) {
  const [postep, setPostep] = useState<Postep>(() => wczytajPostep(id));

  useEffect(() => {
    setPostep(wczytajPostep(id));
    const user = currentUserId();
    if (!user) return;
    let live = true;
    supabase
      .from("sheet_progress")
      .select("data")
      .eq("user_id", user)
      .eq("sheet_id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!live || !data) return;
        const zKonta = { ...pusty, ...(data.data as Postep) };
        zapiszLokalnie(id, zKonta);
        setPostep(zKonta);
      });
    return () => {
      live = false;
    };
  }, [id]);

  const zmien = useCallback(
    (f: (p: Postep) => Postep) =>
      setPostep((stary) => {
        const nowy = f(stary);
        zapiszLokalnie(id, nowy);
        zapiszNaKonto(id, nowy);
        return nowy;
      }),
    [id],
  );

  return [postep, zmien] as const;
}
