// Profil ucznia: jak się uczy, ile ma czasu, cel z każdego przedmiotu i priorytety (profiles.learning).
// Wszystko dobrowolne i do zmiany. Kopia w localStorage działa od razu, konto wygrywa po zalogowaniu,
// a flaga niezapisanych zmian z id konta chroni świeżą zmianę przed starą wartością z konta (konto/kontoSync.ts).
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { utworzMagazyn } from "./kontoSync";
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

/** Cel jako ułamek wyniku, do kreski celu na pasku prognozy; „Zdać” to próg 30%. */
export const celJakoUlamek = (id: string | undefined): number | null =>
  id === "zdac" ? 0.3 : id === "60" ? 0.6 : id === "75" ? 0.75 : id === "90" ? 0.9 : null;

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
  /** Cel w procentach z quizu celów (10–100); ma pierwszeństwo przed dawnym wyborem z CELE. */
  celProcent?: Partial<Record<PrzedmiotId, number>>;
  /** Obszary (id grządek ogrodu: „słuchanie”, „czytanie”, „środki językowe”, „pisanie”), w których uczeń czuje się mocny i słaby. */
  mocne?: string[];
  slabe?: string[];
  /** Dni nauki w tygodniu (1–7). */
  dni?: number;
  /** Quiz celów: zrobiony albo pominięty (data ISO); bez tego pulpit zaprasza do quizu. */
  quiz?: { stan: "zrobiony" | "pominiety"; kiedy: string };
  /** Notatka Pestki o uczniu z podpisem skrótu, z którego powstała (konto/pamiecUcznia.ts). */
  pamiec?: { notatka: string; podpis: string; kiedy: string };
};

/** Obszary matury z angielskiego: te same id i nazwy w ogrodzie, w quizie celów i w kontekście Pestki. */
export const OBSZARY_ANGIELSKIEGO: Opcja[] = [
  { id: "słuchanie", nazwa: "Słuchanie" },
  { id: "czytanie", nazwa: "Czytanie" },
  { id: "środki językowe", nazwa: "Środki językowe" },
  { id: "pisanie", nazwa: "Pisanie" },
];

/** Cel z przedmiotu jako ułamek (0–1): procent z quizu, a bez niego dawny wybór z CELE; null bez celu. */
export function celPrzedmiotu(u: Uczenie, id: PrzedmiotId): number | null {
  const procent = u.celProcent?.[id];
  if (typeof procent === "number") return procent / 100;
  return celJakoUlamek(u.cele?.[id]);
}

/** Zadeklarowane minuty nauki dziennie (null bez odpowiedzi; „Więcej” liczymy jako 60). */
export function minutyDziennie(u: Uczenie): number | null {
  if (!u.czas) return null;
  return u.czas === "wiecej" ? 60 : Number(u.czas);
}

export const MAX_PRIORYTETOW = 15;
export const MAX_DLUGOSC = 120;
const MAX_USUNIETYCH = 30;

const KLUCZ = "sedno.profilUcznia";

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
  if (o.celProcent && typeof o.celProcent === "object") {
    const cele: Partial<Record<PrzedmiotId, number>> = {};
    for (const p of PRZEDMIOTY) {
      const c = (o.celProcent as Record<string, unknown>)[p.id];
      if (typeof c === "number" && c >= 10 && c <= 100) cele[p.id] = Math.round(c);
    }
    if (Object.keys(cele).length) w.celProcent = cele;
  }
  for (const k of ["mocne", "slabe"] as const) {
    const lista = o[k];
    if (Array.isArray(lista)) {
      const obszary = lista.filter((x): x is string => wOpcjach(OBSZARY_ANGIELSKIEGO, x));
      if (obszary.length) w[k] = [...new Set(obszary)];
    }
  }
  if (typeof o.dni === "number" && o.dni >= 1 && o.dni <= 7) w.dni = Math.round(o.dni);
  const q = o.quiz as Uczenie["quiz"] | undefined;
  if (q && (q.stan === "zrobiony" || q.stan === "pominiety") && typeof q.kiedy === "string") w.quiz = { stan: q.stan, kiedy: q.kiedy.slice(0, 40) };
  const pm = o.pamiec as Uczenie["pamiec"] | undefined;
  // Limit długości trzyma profil w 8 kB kolumny learning (migracja 0007).
  if (pm && typeof pm.notatka === "string" && pm.notatka.trim() && typeof pm.podpis === "string" && typeof pm.kiedy === "string")
    w.pamiec = { notatka: pm.notatka.slice(0, 700), podpis: pm.podpis.slice(0, 20), kiedy: pm.kiedy.slice(0, 40) };
  if (Array.isArray(o.usuniete)) {
    const u = o.usuniete
      .filter((x): x is string => typeof x === "string")
      .slice(-MAX_USUNIETYCH)
      .map((x) => x.slice(0, 80));
    if (u.length) w.usuniete = u;
  }
  return w;
}

const magazyn = utworzMagazyn<Uczenie>({
  klucz: KLUCZ,
  kolumna: "learning",
  domyslne: {},
  zWire: poprawne,
  doWire: (u) => ({ ...u }),
});

export const uczenie = () => magazyn.biezace();
export const useUczenie = (): Uczenie => magazyn.useStan();
/** true, gdy ostatni zapis profilu na konto się nie udał. */
export const useBladProfilu = () => magazyn.useBlad();
/** true po pierwszym odczycie profilu z konta. */
export const useProfilOdczytany = () => magazyn.useOdczytano();
export const zmienUczenie = (f: (u: Uczenie) => Uczenie) => magazyn.zmien(f);
/** Wysyła zaległe zmiany na konto, np. przed wylogowaniem. */
export const splukajProfil = () => magazyn.flush();
/** Wołane raz przy starcie aplikacji. */
export const uruchomProfilUcznia = () => magazyn.uruchom();

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

export const listaPelna = () => (uczenie().priorytety?.length ?? 0) >= MAX_PRIORYTETOW;

/** Id nowego priorytetu albo null, gdy tekst pusty, już jest na liście albo lista jest pełna. */
export function dodajPriorytet(tekst: string, zrodlo: "uczen" | "pestka"): string | null {
  const t = tekst.trim().replace(/\s+/g, " ").slice(0, MAX_DLUGOSC);
  const lista = uczenie().priorytety ?? [];
  if (!t || lista.length >= MAX_PRIORYTETOW || lista.some((p) => p.tekst.toLowerCase() === t.toLowerCase())) return null;
  const p: Priorytet = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, tekst: t, zrodlo, kiedy: new Date().toISOString() };
  zmienUczenie((u) => ({ ...u, priorytety: [...(u.priorytety ?? []), p] }));
  return p.id;
}

export function usunPriorytet(id: string) {
  zmienUczenie((u) => ({ ...u, priorytety: (u.priorytety ?? []).filter((p) => p.id !== id) }));
}

export function usunWniosek(id: string) {
  zmienUczenie((u) => ({ ...u, usuniete: [...(u.usuniete ?? []).filter((x) => x !== id), id] }));
}

/** Zostawia tylko ukryte wnioski, które nadal istnieją (reszta niczego już nie ukrywa). */
export function przytnijUsuniete(istniejace: Set<string>) {
  const u = uczenie().usuniete ?? [];
  const zostaja = u.filter((id) => istniejace.has(id));
  if (zostaja.length !== u.length) zmienUczenie((x) => ({ ...x, usuniete: zostaja.length ? zostaja : undefined }));
}

const nazwa = (lista: Opcja[], id?: string) => lista.find((o) => o.id === id)?.nazwa;

/** Preferencje ucznia do kontekstu rozmowy z Pestką: priorytety, czas, cele, mocne i słabe strony. Pusty tekst, gdy nic nie ma. */
export function opisProfilu(): string {
  const u = uczenie();
  const czesci: string[] = [];
  if (u.priorytety?.length) czesci.push(`- priorytety: ${u.priorytety.map((p) => `„${p.tekst}”`).join("; ")}`);
  const czas = nazwa(CZAS, u.czas);
  if (czas) czesci.push(`- czas na naukę dziennie: ${czas.toLowerCase()}${u.dni ? `, ${u.dni} dni w tygodniu` : ""}`);
  const nazwyObszarow = (lista?: string[]) => (lista ?? []).map((id) => nazwa(OBSZARY_ANGIELSKIEGO, id)?.toLowerCase()).filter(Boolean).join(", ");
  if (u.mocne?.length) czesci.push(`- angielski, czuje się mocno: ${nazwyObszarow(u.mocne)}`);
  if (u.slabe?.length) czesci.push(`- angielski, czuje się słabo: ${nazwyObszarow(u.slabe)}`);
  const cele = PRZEDMIOTY.flatMap((p) => {
    const procent = u.celProcent?.[p.id];
    const c = procent ? `${procent}%` : nazwa(CELE, u.cele?.[p.id]);
    return c ? [`${p.nazwa.toLowerCase()}: ${c}`] : [];
  });
  if (cele.length) czesci.push(`- cele: ${cele.join(", ")}`);
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

/** Jedno zapytanie o brakujące arkusze; rzuca przy błędzie. */
async function pobierzArkusze(ids: string[]): Promise<void> {
  const brak = ids.filter((id) => !cacheArkuszy.has(id));
  if (!brak.length) return;
  const { data, error } = await supabase.from("sheets").select("id, data").in("id", brak);
  if (error) throw new Error(error.message);
  for (const w of data ?? []) cacheArkuszy.set(w.id as string, w.data as Arkusz);
}

export type StanWnioskow = { stan: "laduje" } | { stan: "blad" } | { stan: "gotowe"; przedmioty: WnioskiPrzedmiotu[] };

/** Pobiera treść sprawdzonych arkuszy (tylko przedmiotów z co najmniej 2 wynikami) i liczy wnioski. */
export function useWnioski(podsumowania: Podsumowanie[] | null, wiersze: { sheet_id: string; data: Postep }[] | null): StanWnioskow {
  const [stan, setStan] = useState<StanWnioskow>({ stan: "laduje" });
  const klucz = podsumowania ? podsumowania.map((p) => `${p.przedmiot.id}-${p.przedmiot.poziom}:${p.wyniki.map((w) => w.arkusz.id).join(",")}`).join("|") : null;
  useEffect(() => {
    setStan({ stan: "laduje" });
    if (!podsumowania || !wiersze) return;
    let live = true;
    void (async () => {
      try {
        const doLiczenia = podsumowania.filter((p) => p.wyniki.length >= 2);
        await pobierzArkusze([...new Set(doLiczenia.flatMap((p) => p.wyniki.map((w) => w.arkusz.id)))]);
        const przedmioty: WnioskiPrzedmiotu[] = [];
        for (const p of doLiczenia) {
          const komplet: { arkusz: Arkusz; postep: Postep }[] = [];
          for (const w of p.wyniki) {
            const wiersz = wiersze.find((x) => x.sheet_id === w.arkusz.id);
            const arkusz = cacheArkuszy.get(w.arkusz.id);
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
      } catch {
        if (live) setStan({ stan: "blad" });
      }
    })();
    return () => {
      live = false;
    };
    // klucz opisuje, od czego zależy wynik
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klucz, !!wiersze]);
  return stan;
}
