// Wyniki konta z arkuszy: z nich pulpit liczy, co polecić i jak idzie w każdym przedmiocie.
import { useEffect, useState } from "react";
import { useListaArkuszy } from "../arkusze/dane";
import type { Postep } from "../arkusze/postep";
import { porownajArkusze, type ArkuszWpis, type Poziom } from "../arkusze/typy";
import { liczOdpowiedzi } from "../arkusze/sprawdz";
import { currentUserId } from "../auth";
import { supabase } from "../supabase";
import type { MojPrzedmiot } from "./przedmioty";

export type Wiersz = { sheet_id: string; data: Postep; updated_at: string };

export type ZaczetyArkusz = { arkusz: ArkuszWpis; odpowiedzi: number; kiedy: string };
export type Wynik = { arkusz: ArkuszWpis; zdobyte: number; mozliwe: number; kiedy: string };

export type Podsumowanie = {
  przedmiot: MojPrzedmiot;
  arkusze: ArkuszWpis[]; // dostępne w Sedno dla przedmiotu i poziomu, od najnowszego
  innePoziomy: Poziom[]; // poziomy tego przedmiotu z arkuszami, gdy na wybranym ich brak
  wyniki: Wynik[]; // sprawdzone, od najnowszego
  zaczete: ZaczetyArkusz[]; // z odpowiedziami, niesprawdzone, od ostatnio ruszanego
  srednia: number | null; // procent
};

export type Propozycja =
  | { rodzaj: "dokoncz"; przedmiot: MojPrzedmiot; zaczety: ZaczetyArkusz }
  | { rodzaj: "nowy"; przedmiot: MojPrzedmiot; arkusz: ArkuszWpis; ostatni: Wynik | null }
  /** inne: poziomy tego przedmiotu, na których arkusze już są. */
  | { rodzaj: "brak-arkuszy"; przedmiot: MojPrzedmiot; inne: Poziom[] }
  | { rodzaj: "wszystko"; przedmiot: MojPrzedmiot; ostatni: Wynik | null };

// Ostatnio pobrane wiersze konta: powrót na pulpit pokazuje je od razu, a świeże dochodzą w tle.
// Pobieranie w locie jest wspólne (rozgrzewanie z menu, pulpit, „Twój tydzień”), więc do bazy idzie raz.
let zapamietane: { user: string; wiersze: Wiersz[] } | null = null;
let wLocie: { user: string; obietnica: Promise<Wiersz[] | null> } | null = null;

function pobierzWiersze(user: string): Promise<Wiersz[] | null> {
  if (wLocie?.user === user) return wLocie.obietnica;
  const obietnica: Promise<Wiersz[] | null> = Promise.resolve(
    supabase.from("sheet_progress").select("sheet_id, data, updated_at").eq("user_id", user),
  ).then(({ data, error }) => {
    if (wLocie?.obietnica === obietnica) wLocie = null;
    // Błąd odświeżenia nie zabiera danych z pamięci.
    if (error) return zapamietane?.user === user ? zapamietane.wiersze : [];
    const nowe = (data ?? []) as Wiersz[];
    zapamietane = { user, wiersze: nowe };
    return nowe;
  });
  wLocie = { user, obietnica };
  return obietnica;
}

/** Rozgrzewanie: wiersze konta w tle, jeśli nie ma ich jeszcze w pamięci. */
export function rozgrzejPostepyKonta() {
  const user = currentUserId();
  if (user && zapamietane?.user !== user) void pobierzWiersze(user);
}

export function usePostepyKonta(): Wiersz[] | null {
  const [wiersze, setWiersze] = useState<Wiersz[] | null>(() => {
    const user = currentUserId();
    return user && zapamietane?.user === user ? zapamietane.wiersze : null;
  });
  useEffect(() => {
    const user = currentUserId();
    if (!user) return;
    let live = true;
    void pobierzWiersze(user).then((nowe) => {
      if (live && nowe) setWiersze(nowe);
    });
    return () => {
      live = false;
    };
  }, []);
  return wiersze;
}

export function podsumuj(przedmiot: MojPrzedmiot, lista: ArkuszWpis[], wiersze: Wiersz[]): Podsumowanie {
  // Polecenie dnia bierze pierwszy nieruszony: formuła 2023 i termin główny przed starszymi, dodatkowymi i próbnymi.
  const arkusze = lista.filter((a) => a.przedmiot === przedmiot.id && a.poziom === przedmiot.poziom).sort(porownajArkusze);
  const innePoziomy = arkusze.length ? [] : [...new Set(lista.filter((a) => a.przedmiot === przedmiot.id).map((a) => a.poziom))];
  const wgId = new Map(arkusze.map((a) => [a.id, a]));
  const wyniki: Wynik[] = [];
  const zaczete: ZaczetyArkusz[] = [];
  for (const w of wiersze) {
    const arkusz = wgId.get(w.sheet_id);
    if (!arkusz) continue;
    // Wynik bez punktów do zdobycia (same wypowiedzi pisemne) nie wchodzi do średniej ani procentów.
    if (w.data.wynik && w.data.wynik.mozliwe > 0) wyniki.push({ arkusz, ...w.data.wynik });
    else {
      const odpowiedzi = liczOdpowiedzi(w.data.odpowiedzi);
      if (odpowiedzi > 0) zaczete.push({ arkusz, odpowiedzi, kiedy: w.updated_at });
    }
  }
  wyniki.sort((a, b) => b.kiedy.localeCompare(a.kiedy));
  zaczete.sort((a, b) => b.kiedy.localeCompare(a.kiedy));
  const srednia = wyniki.length ? Math.round((wyniki.reduce((s, w) => s + w.zdobyte / w.mozliwe, 0) / wyniki.length) * 100) : null;
  return { przedmiot, arkusze, innePoziomy, wyniki, zaczete, srednia };
}

/** Co polecić w przedmiocie: dokończyć zaczęty arkusz, a jeśli nie ma, najnowszy jeszcze nieruszony. */
export function propozycja(p: Podsumowanie, wiersze: Wiersz[]): Propozycja {
  if (p.zaczete[0]) return { rodzaj: "dokoncz", przedmiot: p.przedmiot, zaczety: p.zaczete[0] };
  if (!p.arkusze.length) return { rodzaj: "brak-arkuszy", przedmiot: p.przedmiot, inne: p.innePoziomy };
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
