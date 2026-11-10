// Postęp w arkuszu: pamięć przeglądarki jako szybka kopia, konto w Supabase jako źródło prawdy.
// Bez sieci albo przed zalogowaniem wszystko działa lokalnie, a zapis dogania konto później.
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { currentUserId } from "../auth";
import { supabase } from "../supabase";
import type { Odpowiedzi, Samoocena } from "./sprawdz";

// Szkic ucznia w Excalidraw przy jednym zadaniu. Elementy sceny w formacie
// Excalidraw (JSON), bez plików: rysunek bazowy aplikacja dokleja z arkusza
// przy otwarciu, a własnych obrazków brudnopis nie przyjmuje. Zwykłe dane,
// więc synchronizują się razem z resztą postępu.
export type Brudnopis = { elementy: readonly unknown[]; zmieniony: string };

// Warsztat przy zadaniu z informatyki: kod w Pythonie, zapytanie SQL i otwarta karta.
// arkusz: zmiany w arkuszu kalkulacyjnym jako operacje FortuneSheet (dane CKE wczytujemy za każdym razem).
// brudnopis: swobodne notatki i obliczenia, poza odpowiedziami i oceną.
export type Warsztat = { tryb?: "python" | "sql" | "arkusz" | "dane" | "brudnopis"; python?: string; sql?: string; arkusz?: unknown[]; brudnopis?: string };

// Zegar rozwiązywania na czas. start: chwila wznowienia (ms) albo null przy pauzie; zuzyte: czas sprzed
// ostatniego wznowienia; ogloszone: momenty, o których Pestka już powiedziała.
export type Czas = { start: number | null; zuzyte: number; ogloszone?: string[] };

export type Postep = {
  odpowiedzi: Odpowiedzi;
  samoocena: Samoocena;
  sprawdzony: boolean; // cały arkusz
  sprawdzoneZadania: number[]; // pojedyncze zadania sprawdzone przed końcem
  wynik?: { zdobyte: number; mozliwe: number; kiedy: string };
  brudnopisy?: Record<string, Brudnopis>; // klucz: numer zadania
  czas?: Czas;
  // Wynik zadania podobnego z omawiania błędów: zrozumiane albo do powtórki. Klucz: numer zadania.
  omowione?: Record<number, "dobrze" | "zle">;
  // Rozmowy z Pestką z omawiania błędów, żeby po powrocie do zadania były na miejscu. Klucz: numer zadania.
  rozmowyOmowien?: Record<number, { od: "tutor" | "uczen"; tekst: string }[]>;
  warsztat?: Record<number, Warsztat>; // klucz: numer zadania
  czasZadan?: Record<number, number>; // ms myślenia nad zadaniem, klucz: numer zadania (arkusze/czasZadan.ts)
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

// Stan ostatniego zapisu postępu, żeby narzędzia (np. skoroszyt) uczciwie pokazały, czy zmiany są już bezpieczne.
// „lokalnie” to zapis tylko w tej przeglądarce (bez konta), „blad” to nieudany zapis.
export type StanZapisu = "zapisywanie" | "zapisano" | "lokalnie" | "blad";
let stanZapisu: StanZapisu = "zapisano";
const sluchaczeStanu = new Set<() => void>();
function ustawStan(s: StanZapisu) {
  if (s === stanZapisu) return;
  stanZapisu = s;
  sluchaczeStanu.forEach((f) => f());
}
export function useStanZapisu(): StanZapisu {
  return useSyncExternalStore(
    (f) => {
      sluchaczeStanu.add(f);
      return () => void sluchaczeStanu.delete(f);
    },
    () => stanZapisu,
  );
}

function zapiszLokalnie(id: string, p: Postep): boolean {
  try {
    localStorage.setItem(klucz(id), JSON.stringify(p));
    return true;
  } catch {
    // brak miejsca albo zablokowany storage: postęp zostaje tylko w pamięci
    return false;
  }
}

const oczekujace = new Map<string, ReturnType<typeof setTimeout>>();

// Zapis na konto z opóźnieniem, żeby nie wysyłać każdej zmiany osobno.
function zapiszNaKonto(id: string, p: Postep) {
  const user = currentUserId();
  if (!user) return;
  ustawStan("zapisywanie");
  clearTimeout(oczekujace.get(id));
  oczekujace.set(
    id,
    setTimeout(() => {
      oczekujace.delete(id);
      // Zapytanie Supabase rusza dopiero po then/await.
      void supabase
        .from("sheet_progress")
        .upsert({ user_id: user, sheet_id: id, data: p })
        .then(
          ({ error }) => {
            // Czeka już nowszy zapis: stan zmieni dopiero on.
            if (!oczekujace.has(id)) ustawStan(error ? "blad" : "zapisano");
          },
          () => ustawStan("blad"),
        );
    }, 800),
  );
}

/** Ściąga cały postęp konta do pamięci przeglądarki. */
export async function pobierzPostepy(user: string): Promise<void> {
  const { data, error } = await supabase.from("sheet_progress").select("sheet_id, data").eq("user_id", user);
  if (error || !data) return;
  for (const row of data) zapiszLokalnie(row.sheet_id, { ...pusty, ...(row.data as Postep) });
}

// Wspólny stan postępu w pamięci: kilka miejsc naraz (arkusz i zegar w pasku) widzi ten sam postęp
// i każda zmiana trafia do wszystkich.
const pamiec = new Map<string, Postep>();
const sluchacze = new Map<string, Set<(p: Postep) => void>>();
// Numer zmiany na arkusz: odpowiedź z konta, która przyszła po lokalnej zmianie, jest już nieaktualna
// (zapis na konto idzie z opóźnieniem), więc jej nie bierzemy. Konto czytamy raz na arkusz w sesji.
const wersje = new Map<string, number>();
const pobrane = new Set<string>();

function ustaw(id: string, p: Postep) {
  pamiec.set(id, p);
  sluchacze.get(id)?.forEach((f) => f(p));
}

export function usePostep(id: string) {
  const [postep, setPostep] = useState<Postep>(() => pamiec.get(id) ?? wczytajPostep(id));

  useEffect(() => {
    if (!pamiec.has(id)) pamiec.set(id, wczytajPostep(id));
    setPostep(pamiec.get(id)!);
    const lista = sluchacze.get(id) ?? new Set();
    sluchacze.set(id, lista);
    lista.add(setPostep);
    const user = currentUserId();
    let live = true;
    const wersja = wersje.get(id) ?? 0;
    if (user && !pobrane.has(id))
      supabase
        .from("sheet_progress")
        .select("data")
        .eq("user_id", user)
        .eq("sheet_id", id)
        .maybeSingle()
        .then(({ data }) => {
          pobrane.add(id);
          if (!live || !data || (wersje.get(id) ?? 0) !== wersja) return;
          const zKonta = { ...pusty, ...(data.data as Postep) };
          zapiszLokalnie(id, zKonta);
          ustaw(id, zKonta);
        });
    return () => {
      live = false;
      lista.delete(setPostep);
    };
  }, [id]);

  const zmien = useCallback(
    (f: (p: Postep) => Postep) => {
      const nowy = f(pamiec.get(id) ?? wczytajPostep(id));
      wersje.set(id, (wersje.get(id) ?? 0) + 1);
      const lokalnie = zapiszLokalnie(id, nowy);
      zapiszNaKonto(id, nowy);
      if (!currentUserId()) ustawStan(lokalnie ? "lokalnie" : "blad");
      ustaw(id, nowy);
    },
    [id],
  );

  return [postep, zmien] as const;
}
