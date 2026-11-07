// Wyniki konta z arkuszy: z nich pulpit liczy, co polecić i jak idzie w każdym przedmiocie.
import { useEffect, useState } from "react";
import { useListaArkuszy } from "../arkusze/dane";
import type { Postep } from "../arkusze/postep";
import type { ArkuszWpis } from "../arkusze/typy";
import { currentUserId } from "../auth";
import { supabase } from "../supabase";
import type { MojPrzedmiot } from "./przedmioty";

type Wiersz = { sheet_id: string; data: Postep; updated_at: string };

export type ZaczetyArkusz = { arkusz: ArkuszWpis; odpowiedzi: number; kiedy: string };
export type Wynik = { arkusz: ArkuszWpis; zdobyte: number; mozliwe: number; kiedy: string };

export type Podsumowanie = {
  przedmiot: MojPrzedmiot;
  arkusze: ArkuszWpis[]; // dostępne w Sedno dla przedmiotu i poziomu, od najnowszego
  wyniki: Wynik[]; // sprawdzone, od najnowszego
  zaczete: ZaczetyArkusz[]; // z odpowiedziami, niesprawdzone, od ostatnio ruszanego
  srednia: number | null; // procent
};

export type Propozycja =
  | { rodzaj: "dokoncz"; przedmiot: MojPrzedmiot; zaczety: ZaczetyArkusz }
  | { rodzaj: "nowy"; przedmiot: MojPrzedmiot; arkusz: ArkuszWpis; ostatni: Wynik | null }
  | { rodzaj: "brak-arkuszy"; przedmiot: MojPrzedmiot }
  | { rodzaj: "wszystko"; przedmiot: MojPrzedmiot; ostatni: Wynik | null };

export function usePostepyKonta(): Wiersz[] | null {
  const [wiersze, setWiersze] = useState<Wiersz[] | null>(null);
  useEffect(() => {
    const user = currentUserId();
    if (!user) return;
    let live = true;
    supabase
      .from("sheet_progress")
      .select("sheet_id, data, updated_at")
      .eq("user_id", user)
      .then(({ data }) => live && setWiersze((data ?? []) as Wiersz[]));
    return () => {
      live = false;
    };
  }, []);
  return wiersze;
}

export function podsumuj(przedmiot: MojPrzedmiot, lista: ArkuszWpis[], wiersze: Wiersz[]): Podsumowanie {
  const arkusze = lista.filter((a) => a.przedmiot === przedmiot.id && a.poziom === przedmiot.poziom);
  const wgId = new Map(arkusze.map((a) => [a.id, a]));
  const wyniki: Wynik[] = [];
  const zaczete: ZaczetyArkusz[] = [];
  for (const w of wiersze) {
    const arkusz = wgId.get(w.sheet_id);
    if (!arkusz) continue;
    if (w.data.wynik) wyniki.push({ arkusz, ...w.data.wynik });
    else {
      const odpowiedzi = Object.keys(w.data.odpowiedzi ?? {}).length;
      if (odpowiedzi > 0) zaczete.push({ arkusz, odpowiedzi, kiedy: w.updated_at });
    }
  }
  wyniki.sort((a, b) => b.kiedy.localeCompare(a.kiedy));
  zaczete.sort((a, b) => b.kiedy.localeCompare(a.kiedy));
  const srednia = wyniki.length ? Math.round((wyniki.reduce((s, w) => s + w.zdobyte / w.mozliwe, 0) / wyniki.length) * 100) : null;
  return { przedmiot, arkusze, wyniki, zaczete, srednia };
}

/** Co polecić w przedmiocie: dokończyć zaczęty arkusz, a jeśli nie ma, najnowszy jeszcze nieruszony. */
export function propozycja(p: Podsumowanie, wiersze: Wiersz[]): Propozycja {
  if (p.zaczete[0]) return { rodzaj: "dokoncz", przedmiot: p.przedmiot, zaczety: p.zaczete[0] };
  if (!p.arkusze.length) return { rodzaj: "brak-arkuszy", przedmiot: p.przedmiot };
  const ruszone = new Set(wiersze.map((w) => w.sheet_id));
  const nowy = p.arkusze.find((a) => !ruszone.has(a.id));
  const ostatni = p.wyniki[0] ?? null;
  return nowy ? { rodzaj: "nowy", przedmiot: p.przedmiot, arkusz: nowy, ostatni } : { rodzaj: "wszystko", przedmiot: p.przedmiot, ostatni };
}

/** Wszystko naraz dla widoków: null, dopóki dane się wczytują. */
export function useWynikiKonta(przedmioty: MojPrzedmiot[]): { podsumowania: Podsumowanie[]; wiersze: Wiersz[] } | null {
  const { dane: lista, blad } = useListaArkuszy();
  const wiersze = usePostepyKonta();
  if (!wiersze || (!lista && !blad)) return null;
  return { podsumowania: przedmioty.map((p) => podsumuj(p, lista ?? [], wiersze)), wiersze };
}
