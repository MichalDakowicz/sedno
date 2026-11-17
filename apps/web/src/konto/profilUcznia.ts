// Profil ucznia: jak się uczy, ile ma czasu, cel z każdego przedmiotu i priorytety (profiles.learning).
// Wszystko dobrowolne i do zmiany. Kopia w localStorage działa od razu, konto wygrywa po zalogowaniu,
// a znacznik „niezapisane” chroni świeżą zmianę przed starą wartością z konta (jak w konto/ustawienia.ts).
import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "../supabase";
import type { Arkusz } from "../arkusze/typy";
import { norma } from "../arkusze/czasZadan";
import type { Postep } from "../arkusze/postep";
import { policzPytania } from "../arkusze/sprawdz";
import type { Podsumowanie } from "./wyniki";
import { PRZEDMIOTY, przedmiot, type PrzedmiotId } from "./przedmioty";

export type Opcja = { id: string; nazwa: string };
export type KluczPytania = "motywacja" | "start" | "zniecheca";
export type Pytanie = { klucz: KluczPytania; pytanie: string; opcje: Opcja[] };

export const PYTANIA: Pytanie[] = [
  {
    klucz: "motywacja",
    pytanie: "Co cię najbardziej motywuje?",
    opcje: [
      { id: "wynik", nazwa: "Wynik na maturze" },
      { id: "postep", nazwa: "Postęp z tygodnia na tydzień" },
      { id: "zrozumienie", nazwa: "Zrozumienie tematu" },
    ],
  },
  {
    klucz: "start",
    pytanie: "Jak wolisz zaczynać?",
    opcje: [
      { id: "zadania", nazwa: "Od razu zadania" },
      { id: "wyjasnienie", nazwa: "Najpierw krótkie wyjaśnienie" },
    ],
  },
  {
    klucz: "zniecheca",
    pytanie: "Co cię zniechęca?",
    opcje: [
      { id: "teksty", nazwa: "Długie teksty" },
      { id: "bledy", nazwa: "Dużo błędów naraz" },
      { id: "czas", nazwa: "Presja czasu" },
    ],
  },
];

export const CZAS: Opcja[] = [
  { id: "10", nazwa: "10 min" },
  { id: "20", nazwa: "20 min" },
  { id: "45", nazwa: "45 min" },
  { id: "wiecej", nazwa: "Więcej" },
];

export const CELE: Opcja[] = [
  { id: "zdac", nazwa: "Zdać" },
  { id: "60", nazwa: "60%" },
  { id: "75", nazwa: "75%" },
  { id: "90", nazwa: "90%+" },
];

export type Priorytet = { id: string; tekst: string; zrodlo: "uczen" | "pestka"; kiedy: string };

export type Uczenie = {
  motywacja?: string;
  start?: string;
  zniecheca?: string;
  czas?: string;
  cele?: Partial<Record<PrzedmiotId, string>>;
  priorytety?: Priorytet[];
  /** Id wniosków, które uczeń usunął: nie pokazujemy ich ponownie. */
  usuniete?: string[];
};

export const MAX_PRIORYTETOW = 15;
export const MAX_DLUGOSC = 120;
const MAX_USUNIETYCH = 60;

const KLUCZ = "sedno.profilUcznia";
const NIEZAPISANE = "sedno.profilUcznia.niezapisane";

const wOpcjach = (lista: Opcja[], v: unknown): v is string => typeof v === "string" && lista.some((o) => o.id === v);

/** Przyjmuje tylko znane klucze i wartości (dane z konta albo z dysku mogą być stare lub uszkodzone). */
function poprawne(v: unknown): Uczenie {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const w: Uczenie = {};
  for (const p of PYTANIA) if (wOpcjach(p.opcje, o[p.klucz])) w[p.klucz] = o[p.klucz] as string;
  if (wOpcjach(CZAS, o.czas)) w.czas = o.czas;
  if (o.cele && typeof o.cele === "object") {
    const cele: Partial<Record<PrzedmiotId, string>> = {};
    for (const p of PRZEDMIOTY) {
      const c = (o.cele as Record<string, unknown>)[p.id];
      if (wOpcjach(CELE, c)) cele[p.id] = c;
    }
    if (Object.keys(cele).length) w.cele = cele;
  }
  if (Array.isArray(o.priorytety)) {
    const lista = o.priorytety
      .filter((x): x is Priorytet => {
        const p = x as Priorytet | null;
        return !!p && typeof p.id === "string" && typeof p.tekst === "string" && !!p.tekst.trim() && (p.zrodlo === "uczen" || p.zrodlo === "pestka") && typeof p.kiedy === "string";
      })
      .slice(0, MAX_PRIORYTETOW)
      .map((p) => ({ id: p.id.slice(0, 40), tekst: p.tekst.slice(0, MAX_DLUGOSC), zrodlo: p.zrodlo, kiedy: p.kiedy.slice(0, 40) }));
    if (lista.length) w.priorytety = lista;
  }
  if (Array.isArray(o.usuniete)) {
    const u = o.usuniete
      .filter((x): x is string => typeof x === "string")
      .slice(-MAX_USUNIETYCH)
      .map((x) => x.slice(0, 80));
    if (u.length) w.usuniete = u;
  }
  return w;
}

function wczytajLokalne(): Uczenie {
  try {
    const t = localStorage.getItem(KLUCZ);
    if (t) return poprawne(JSON.parse(t));
  } catch {
    // zablokowany storage albo uszkodzony zapis: pusty profil
  }
  return {};
}

function zapiszLokalne(u: Uczenie) {
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(u));
  } catch {
    // zostaje wartość w pamięci
  }
}

const niezapisane = () => {
  try {
    return localStorage.getItem(NIEZAPISANE) === "1";
  } catch {
    return false;
  }
};
function oznaczNiezapisane(tak: boolean) {
  try {
    if (tak) localStorage.setItem(NIEZAPISANE, "1");
    else localStorage.removeItem(NIEZAPISANE);
  } catch {
    // brak storage
  }
}

let biezace: Uczenie = {};
const sluchacze = new Set<() => void>();
const ustawBiezace = (u: Uczenie) => {
  biezace = u;
  sluchacze.forEach((l) => l());
};

export const uczenie = () => biezace;

export function useUczenie(): Uczenie {
  return useSyncExternalStore(
    (l) => {
      sluchacze.add(l);
      return () => void sluchacze.delete(l);
    },
    uczenie,
  );
}

let wersja = 0;
let idKonta: string | null = null;
let kolejka: number | undefined;

// Zapisy idą jeden po drugim, żeby starszy nie wylądował na koncie po nowszym.
let lancuch: Promise<unknown> = Promise.resolve();

function zapiszNaKoncie(u: Uczenie, id: string) {
  const ta = wersja;
  const wartosc = u;
  lancuch = lancuch.then(async () => {
    const { error } = await supabase.from("profiles").update({ learning: wartosc }).eq("id", id);
    if (!error && ta === wersja) oznaczNiezapisane(false);
  }).catch(() => undefined);
  return lancuch;
}

/** Zmiana od razu na ekranie i lokalnie, na koncie po krótkiej chwili. */
export function zmienUczenie(f: (u: Uczenie) => Uczenie) {
  const nowe = poprawne(f(biezace));
  zapiszLokalne(nowe);
  wersja++;
  oznaczNiezapisane(true);
  ustawBiezace(nowe);
  const id = idKonta;
  if (!id) return;
  window.clearTimeout(kolejka);
  kolejka = window.setTimeout(() => {
    kolejka = undefined;
    void zapiszNaKoncie(biezace, id);
  }, 500);
}

function wyslijOczekujace() {
  if (kolejka === undefined || !idKonta) return;
  window.clearTimeout(kolejka);
  kolejka = undefined;
  void zapiszNaKoncie(biezace, idKonta);
}

let ostatniePobranie = 0;

// Konto czytamy przy pierwszej sesji, po zmianie konta i (nie częściej niż co minutę) po powrocie do karty,
// nie przy każdym zdarzeniu logowania. Odpowiedź starsza niż zmiana lokalna nigdy jej nie nadpisuje.
async function zKonta(id: string) {
  idKonta = id;
  ostatniePobranie = Date.now();
  const ta = wersja;
  const bylaNiezapisana = niezapisane();
  const { data, error } = await supabase.from("profiles").select("learning").eq("id", id).maybeSingle();
  if (error || idKonta !== id) return;
  const zapisane = poprawne(data?.learning);
  if (ta !== wersja || bylaNiezapisana || Object.keys(zapisane).length === 0) {
    if (ta !== wersja || bylaNiezapisana || Object.keys(biezace).length > 0) void zapiszNaKoncie(biezace, id);
    return;
  }
  zapiszLokalne(zapisane);
  ustawBiezace(zapisane);
}

let uruchomione = false;

/** Wołane raz przy starcie aplikacji. */
export function uruchomProfilUcznia() {
  if (uruchomione) return;
  uruchomione = true;
  ustawBiezace(wczytajLokalne());
  window.addEventListener("pagehide", wyslijOczekujace);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") wyslijOczekujace();
    else if (idKonta && Date.now() - ostatniePobranie > 60_000) void zKonta(idKonta);
  });
  supabase.auth.onAuthStateChange((zdarzenie, sesja) => {
    if (sesja) {
      // Zdarzenia z tą samą sesją (odświeżenie tokenu, powrót do karty) nie czytają konta jeszcze raz.
      if (sesja.user.id === idKonta) return;
      const id = sesja.user.id;
      idKonta = id;
      // Poza callbackiem: zapytania do Supabase w środku onAuthStateChange mogą się zakleszczyć.
      window.setTimeout(() => void zKonta(id), 0);
    } else if (zdarzenie === "SIGNED_OUT") {
      idKonta = null;
      window.clearTimeout(kolejka);
      kolejka = undefined;
      oznaczNiezapisane(false);
      try {
        localStorage.removeItem(KLUCZ);
      } catch {
        // nic do sprzątania
      }
      ustawBiezace({});
    }
  });
}

/** Wybrana ponownie odpowiedź znika: wszystko jest dobrowolne i zmienialne. */
export function ustawOdpowiedz(klucz: KluczPytania | "czas", id: string) {
  zmienUczenie((u) => {
    const n = { ...u };
    if (n[klucz] === id) delete n[klucz];
    else n[klucz] = id;
    return n;
  });
}

export function ustawCel(przedmiotId: PrzedmiotId, id: string) {
  zmienUczenie((u) => {
    const cele = { ...u.cele };
    if (cele[przedmiotId] === id) delete cele[przedmiotId];
    else cele[przedmiotId] = id;
    return { ...u, cele };
  });
}

/** Zwraca false, gdy tekst pusty, już jest na liście albo lista jest pełna. */
export function dodajPriorytet(tekst: string, zrodlo: "uczen" | "pestka"): boolean {
  const t = tekst.trim().replace(/\s+/g, " ").slice(0, MAX_DLUGOSC);
  const lista = biezace.priorytety ?? [];
  if (!t || lista.length >= MAX_PRIORYTETOW || lista.some((p) => p.tekst.toLowerCase() === t.toLowerCase())) return false;
  const p: Priorytet = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, tekst: t, zrodlo, kiedy: new Date().toISOString() };
  zmienUczenie((u) => ({ ...u, priorytety: [...(u.priorytety ?? []), p] }));
  return true;
}

export function usunPriorytet(id: string) {
  zmienUczenie((u) => ({ ...u, priorytety: (u.priorytety ?? []).filter((p) => p.id !== id) }));
}

export function usunWniosek(id: string) {
  zmienUczenie((u) => ({ ...u, usuniete: [...(u.usuniete ?? []).filter((x) => x !== id), id] }));
}

const nazwa = (lista: Opcja[], id?: string) => lista.find((o) => o.id === id)?.nazwa;

/** Zapisane odpowiedzi do kontekstu rozmowy z Pestką: priorytety, czas dziennie i cele. Pusty tekst, gdy nic nie ma. */
export function opisProfilu(): string {
  const u = biezace;
  const czesci: string[] = [];
  if (u.priorytety?.length) czesci.push(`Priorytety ucznia (już zapisane w profilu): ${u.priorytety.map((p) => `„${p.tekst}”`).join("; ")}.`);
  const czas = nazwa(CZAS, u.czas);
  if (czas) czesci.push(`Czas na naukę dziennie: ${czas.toLowerCase()}.`);
  const cele = PRZEDMIOTY.flatMap((p) => {
    const c = nazwa(CELE, u.cele?.[p.id]);
    return c ? [`${p.nazwa.toLowerCase()}: ${c}`] : [];
  });
  if (cele.length) czesci.push(`Cele ucznia: ${cele.join(", ")}.`);
  return czesci.join("\n");
}

// ---- Wnioski z wyników ----

export type Wniosek = { id: string; tekst: string };
export type WnioskiPrzedmiotu = { przedmiotId: PrzedmiotId; nazwa: string; poziom: string; arkuszy: number; wnioski: Wniosek[] };

type Sekcja = { id: string; nazwa: string; robisz: string; zadanie: (z: Arkusz["zadania"][number]) => boolean };

// Arkusze nie mają działów, więc dzielimy tylko tam, gdzie dane na to pozwalają: angielski na słuchanie i resztę.
function sekcjePrzedmiotu(id: PrzedmiotId): Sekcja[] {
  if (id === "angielski")
    return [
      { id: "sluchanie", nazwa: "słuchanie", robisz: "Słuchanie robisz", zadanie: (z) => z.sluchanie },
      { id: "reszta", nazwa: "pozostałe zadania", robisz: "Pozostałe zadania robisz", zadanie: (z) => !z.sluchanie },
    ];
  return [{ id: "calosc", nazwa: "cały arkusz", robisz: "Arkusze robisz", zadanie: () => true }];
}

const procent = (x: number) => Math.round(x * 100);

/** Wnioski z jednego przedmiotu: tempo względem limitu w każdej sekcji oraz najsłabsza i najmocniejsza sekcja wg punktów. */
export function policzWnioski(przedmiotId: PrzedmiotId, poziom: string, arkusze: { arkusz: Arkusz; postep: Postep }[]): Wniosek[] {
  const sekcje = sekcjePrzedmiotu(przedmiotId);
  const klucz = `${przedmiotId}-${poziom}`;
  const wynik: Wniosek[] = [];
  const punkty = new Map<string, { z: number; m: number }>();
  for (const s of sekcje) {
    let czas = 0;
    let limit = 0;
    let arkuszyZCzasem = 0;
    let z = 0;
    let m = 0;
    for (const { arkusz, postep } of arkusze) {
      let jest = false;
      for (const zad of arkusz.zadania.filter(s.zadanie)) {
        const w = policzPytania(zad.pytania, postep.odpowiedzi, postep.samoocena);
        z += w.zdobyte;
        m += w.mozliwe;
        const ms = postep.czasZadan?.[zad.nr] ?? 0;
        const n = norma(arkusz, zad);
        if (ms > 0 && n) {
          czas += ms;
          limit += n;
          jest = true;
        }
      }
      if (jest) arkuszyZCzasem++;
    }
    punkty.set(s.id, { z, m });
    if (arkuszyZCzasem >= 2 && limit > 0) {
      const r = czas / limit;
      const roznica = Math.abs(procent(r) - 100);
      const tekst =
        roznica < 10
          ? `${s.robisz} mniej więcej w czasie limitu`
          : r < 1
            ? `${s.robisz} średnio ${roznica}% szybciej niż limit`
            : `${s.robisz} średnio ${roznica}% wolniej niż limit`;
      wynik.push({ id: `${klucz}:tempo:${s.id}`, tekst });
    }
  }
  const zPunktami = sekcje.flatMap((s) => {
    const d = punkty.get(s.id)!;
    return d.m > 0 ? [{ s, p: d.z / d.m }] : [];
  });
  if (zPunktami.length >= 2) {
    const posortowane = [...zPunktami].sort((a, b) => a.p - b.p);
    const slaba = posortowane[0]!;
    const mocna = posortowane[posortowane.length - 1]!;
    if (mocna.p - slaba.p >= 0.1) {
      wynik.push({ id: `${klucz}:slaba`, tekst: `Najwięcej punktów tracisz w sekcji: ${slaba.s.nazwa} (${procent(slaba.p)}% punktów)` });
      wynik.push({ id: `${klucz}:mocna`, tekst: `Najlepiej idzie ci: ${mocna.s.nazwa} (${procent(mocna.p)}% punktów)` });
    }
  }
  return wynik;
}

const cacheArkuszy = new Map<string, Arkusz>();

async function pobierzArkusz(id: string): Promise<Arkusz | null> {
  const z = cacheArkuszy.get(id);
  if (z) return z;
  const { data, error } = await supabase.from("sheets").select("data").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const a = data.data as Arkusz;
  cacheArkuszy.set(id, a);
  return a;
}

export type StanWnioskow = { stan: "laduje" } | { stan: "gotowe"; przedmioty: WnioskiPrzedmiotu[] };

/** Pobiera treść sprawdzonych arkuszy (tylko przedmiotów z co najmniej 2 wynikami) i liczy wnioski. */
export function useWnioski(podsumowania: Podsumowanie[] | null, wiersze: { sheet_id: string; data: Postep }[] | null): StanWnioskow {
  const [stan, setStan] = useState<StanWnioskow>({ stan: "laduje" });
  const klucz = podsumowania ? podsumowania.map((p) => `${p.przedmiot.id}-${p.przedmiot.poziom}:${p.wyniki.map((w) => w.arkusz.id).join(",")}`).join("|") : null;
  useEffect(() => {
    if (!podsumowania || !wiersze) return;
    let live = true;
    void (async () => {
      const przedmioty: WnioskiPrzedmiotu[] = [];
      for (const p of podsumowania) {
        if (p.wyniki.length < 2) continue;
        const komplet: { arkusz: Arkusz; postep: Postep }[] = [];
        for (const w of p.wyniki) {
          const wiersz = wiersze.find((x) => x.sheet_id === w.arkusz.id);
          const arkusz = wiersz ? await pobierzArkusz(w.arkusz.id) : null;
          if (wiersz && arkusz) komplet.push({ arkusz, postep: wiersz.data });
        }
        if (komplet.length < 2) continue;
        przedmioty.push({
          przedmiotId: p.przedmiot.id,
          nazwa: przedmiot(p.przedmiot.id)!.nazwa,
          poziom: p.przedmiot.poziom,
          arkuszy: komplet.length,
          wnioski: policzWnioski(p.przedmiot.id, p.przedmiot.poziom, komplet),
        });
      }
      if (live) setStan({ stan: "gotowe", przedmioty });
    })();
    return () => {
      live = false;
    };
    // klucz opisuje, od czego zależy wynik
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klucz, !!wiersze]);
  return stan;
}
