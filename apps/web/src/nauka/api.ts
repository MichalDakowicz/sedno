import { AiError, aiErrorText } from "../ai";
import type { Poziom } from "../arkusze/typy";
import { functionsUrl, supabase } from "../supabase";
import { uniewaznijNauke } from "./pamiec";

export type FormatNauki = "szybka-runda" | "napraw-blad" | "sokratejski";

export const nazwaFormatuNauki: Record<FormatNauki, string> = {
  "szybka-runda": "Szybka runda",
  "napraw-blad": "Napraw błąd",
  sokratejski: "Mini-test",
};

export type Umiejetnosc = {
  skill_id: string;
  area: string;
  name: string;
  description: string;
  codes: string[];
  exam_points: number;
  evidence_count: number;
  last_practiced_at: string | null;
  score: number | null;
  confidence: number;
  retention: number | null;
  due_at: string | null;
  formats: FormatNauki[];
};

export type MapaNauki = { subject: "angielski"; level: Poziom; skills: Umiejetnosc[] };
type KatalogNauki = { skills: { id: string; name: string }[] };
export type DowodNauki = {
  source_id: string;
  sheet_id: string | null;
  session_id: string | null;
  question: string;
  score: number;
  happened_at: string;
  weight: number;
  hint_level: number | null;
  error_type: string | null;
};

export type PropozycjaNauki = { skill_id: string; format: FormatNauki; minutes: number; reason: string; repeat_id?: string | null };
export type Powtorka = {
  skill_id: string;
  name: string;
  due_at: string | null;
  last_practiced_at: string | null;
  retention: number | null;
  format: FormatNauki;
  mistake: null | Pick<DowodNauki, "sheet_id" | "session_id" | "question" | "error_type"> & {
    source_id?: string;
    happened_at?: string;
    repeat_id?: string | null;
  };
};
export type PowtorkiNauki = { level: Poziom; today: Powtorka | null; queue: Powtorka[] };
export type ZajecieWPlanie = { date: string; skill_id: string; name: string; minutes: number; format: FormatNauki };
export type PlanNauki = {
  level: Poziom;
  from: string;
  /** Dni nauki w tygodniu (ISO, 1 = poniedziałek). */
  weekdays: number[];
  available_minutes: number;
  goal: string | null;
  activities: ZajecieWPlanie[];
  /** Prognoza obiektywnie ocenianej części arkusza: score 0–1 albo null przy za małym pokryciu. */
  forecast: { score: number | null; coverage: number; sheet_count: number | null; scope: string };
};

export type PolecenieNauki =
  | {
    typ: "cke";
    sheet_id: string;
    task_nr: number;
    question: string;
    tresc?: string;
    litery: string[];
    nagranie?: string;
    fragment?: { od: number; do: number };
  }
  | {
    typ: "wybor" | "napraw-blad";
    tresc: string;
    tekst?: string;
    audioTekst?: string;
    audioJezyk?: string;
    opcje: { id: string; tekst: string }[];
    liczbaBledow?: number;
  }
  | { typ: "luka"; tresc: string; tekst: string };

export type PytanieNauki = {
  position: number;
  prompt: PolecenieNauki;
  hint_level: number;
  hints: string[];
  hint_count: number;
};
export type OdpowiedzNauki = {
  position: number;
  prompt: PolecenieNauki;
  answer: string;
  correct: boolean;
  solutions: string[];
  explanation: string;
  error_type: string | null;
  hint_level: number;
};
export type WynikNauki = {
  wynik: { poprawne: number; wszystkich: number };
  opanowanie_przed: number | null;
  opanowanie_po: number | null;
  nastepny_krok: PropozycjaNauki | null;
};
export type OtwartaSesjaNauki = {
  id: string;
  skill_id: string;
  level: Poziom;
  format: FormatNauki;
  streak: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  repeat_item?: string | null;
  target: number;
};
export type SesjaNauki = Omit<OtwartaSesjaNauki, "target"> & {
  limit: number;
  answers: OdpowiedzNauki[];
  question: PytanieNauki | null;
  result: WynikNauki | null;
};

const KOMUNIKATY: Record<string, string> = {
  not_signed_in: "Zaloguj się ponownie, aby kontynuować naukę.",
  session_not_found: "Ta sesja jest niedostępna na tym koncie.",
  question_changed: "Odpowiedź do tego zadania została już zapisana. Odśwież rundę.",
  too_many_open_sessions: "Masz już 10 rozpoczętych rund. Wznów albo usuń jedną z nich na liście „Ostatnio” w Nauce.",
  invalid_session: "Nie ma takiego ćwiczenia. Wróć do Nauki i wybierz umiejętność z listy.",
  invalid_level: "Nie ma takiego poziomu. Wróć do Nauki i wybierz poziom z listy.",
  skill_not_found: "Nie ma takiej umiejętności. Wróć do Nauki i wybierz ją z listy.",
  no_exercises_for_format: "Brakuje zadań do tego ćwiczenia na wybranym poziomie.",
  review_item_unavailable: "To zadanie nie jest już w kolejce. Odśwież Powtórki lub zacznij zwykłą rundę.",
  session_id_in_use: "Ta sesja jest już przypisana do innego ćwiczenia. Wróć do Nauki i zacznij ponownie.",
  invalid_weekdays: "Wybierz od jednego do siedmiu dni nauki.",
};

export class BladRpcNauki extends Error {
  constructor(message: string, readonly kod?: string) {
    super(message);
  }
}

// Te błędy powodują parametry w adresie, więc ponowienie tego samego żądania nic nie zmieni.
export const bledyBezPonowienia = ["invalid_session", "invalid_level", "skill_not_found", "review_item_unavailable"];

async function rpc<T>(name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const query = supabase.rpc(name, args);
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw new BladRpcNauki(KOMUNIKATY[error.message] ?? "Nie udało się połączyć z Nauką. Spróbuj ponownie.", error.message);
  return data as T;
}

type DopasowanieTematu = { umiejetnosc: string | null; format: "krok-po-kroku" | "sokratejski" | null };

// Po zapisie w nauce zapamiętane widoki (mapa, powtórki, „Ostatnio”) są nieaktualne.
const zmiana = <T,>(wynik: Promise<T>) => wynik.then((dane) => { uniewaznijNauke(); return dane; });

export const naukaApi = {
  katalog: (poziom: Poziom, signal?: AbortSignal) => rpc<KatalogNauki>("nauka_katalog", { p_level: poziom }, signal),
  mapa: (poziom: Poziom, signal?: AbortSignal) => rpc<MapaNauki>("nauka_mapa", { p_level: poziom }, signal),
  dowody: (skill: string, poziom: Poziom, signal?: AbortSignal) =>
    rpc<DowodNauki[]>("nauka_dowody", { p_skill: skill, p_level: poziom }, signal),
  polec: (poziom: Poziom, skill?: string, signal?: AbortSignal) =>
    rpc<PropozycjaNauki | null>("nauka_polec", { p_level: poziom, p_skill: skill ?? null }, signal),
  powtorki: (poziom: Poziom, signal?: AbortSignal) => rpc<PowtorkiNauki>("nauka_powtorki", { p_level: poziom }, signal),
  plan: (poziom: Poziom, signal?: AbortSignal) => rpc<PlanNauki>("nauka_plan", { p_level: poziom }, signal),
  dniPlanu: (poziom: Poziom, dni: number[] | null) => zmiana(rpc<PlanNauki>("nauka_plan_dni", { p_days: dni, p_level: poziom })),
  ostatnie: (poziom: Poziom, signal?: AbortSignal) => rpc<OtwartaSesjaNauki[]>("nauka_ostatnie", { p_level: poziom }, signal),
  sesja: (id: string, signal?: AbortSignal) => rpc<SesjaNauki | null>("nauka_sesja", { p_session: id }, signal),
  start: (id: string, skill: string, poziom: Poziom, format: FormatNauki = "szybka-runda", repeatId?: string) =>
    zmiana(rpc<SesjaNauki>("nauka_start", {
      p_session: id, p_skill: skill, p_format: format, p_level: poziom,
      ...(repeatId ? { p_item: repeatId } : {}),
    })),
  odpowiedz: (id: string, pozycja: number, odpowiedz: string) =>
    zmiana(rpc<SesjaNauki>("nauka_odpowiedz", { p_session: id, p_position: pozycja, p_answer: odpowiedz })),
  podpowiedz: (id: string, pozycja: number, krok: number) =>
    rpc<SesjaNauki>("nauka_podpowiedz", { p_session: id, p_position: pozycja, p_step: krok }),
  usun: (id: string) => zmiana(rpc<boolean>("nauka_usun", { p_session: id })),
  async temat(temat: string, poziom: Poziom, signal?: AbortSignal): Promise<DopasowanieTematu> {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error(aiErrorText("not_signed_in"));
    const res = await fetch(`${functionsUrl}/nauka-ai`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "dopasuj-temat", temat, poziom }),
      signal,
    }).catch((err: unknown) => {
      if (signal?.aborted) throw err;
      throw new Error("Nie udało się połączyć z Pestką. Spróbuj ponownie.");
    });
    const wynik = await res.json().catch(() => null);
    if (!res.ok) throw new AiError(wynik?.error ?? "server_error", res.status);
    return wynik as DopasowanieTematu;
  },
};
