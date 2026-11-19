// Klient funkcji nauka-ai: jedno typowane wywołanie na akcję i jeden zestaw komunikatów błędów dla wszystkich widoków.
// Kontrakt: services/supabase/nauka-ai.md i warianty-i-ocena.md. Limity serwera: 30 wywołań modelu na minutę
// (wspólne z rozmową), 24 warianty i 12 ocen na minutę, więc widoki wołają tylko na wyraźne działanie ucznia.
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Poziom } from "../arkusze/typy";
import { supabase } from "../supabase";

export class BladPestki extends Error {
  constructor(readonly kod: string, readonly status: number) {
    super(kod);
  }
}

// Chwilowy błąd modelu ponawiamy raz sami, zanim uczeń zobaczy komunikat. Akcje z zapisem (ocena) mają id próby,
// więc drugie wywołanie nie tworzy duplikatu.
const CHWILOWE = new Set(["provider_failed", "bad_model_response"]);

async function wywolaj<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  try {
    return await wywolajRaz<T>(body, signal);
  } catch (e) {
    if (!(e instanceof BladPestki) || !CHWILOWE.has(e.kod) || signal?.aborted) throw e;
    await new Promise((r) => setTimeout(r, 1500));
    if (signal?.aborted) throw new DOMException("Przerwane", "AbortError");
    return wywolajRaz<T>(body, signal);
  }
}

async function wywolajRaz<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("nauka-ai", { body, signal, timeout: 65_000 });
  if (error instanceof FunctionsHttpError) {
    const odpowiedz = error.context as Response;
    const tresc = await odpowiedz.json().catch(() => null);
    throw new BladPestki(typeof tresc?.error === "string" ? tresc.error : "server_error", odpowiedz.status);
  }
  if (signal?.aborted) throw new DOMException("Przerwane", "AbortError");
  if (error || data === null || typeof data !== "object") throw new BladPestki(error ? "network_error" : "server_error", 0);
  return data;
}

/** Odpowiedź serwera bez oczekiwanego kształtu traktujemy jak zły wynik modelu: da się ją ponowić. */
function sprawdz<T>(wynik: T, ok: (w: T) => boolean): T {
  if (!ok(wynik)) throw new BladPestki("bad_model_response", 424);
  return wynik;
}

export type Komunikat = {
  tekst: string;
  /** Ponowienie tego samego żądania ma sens (sieć, limit, chwilowy błąd modelu). */
  ponow: boolean;
  /** Bez zmiany konfiguracji w profilu nic się nie zmieni. */
  konfiguracja: boolean;
};

const KOMUNIKATY: Record<string, Omit<Komunikat, "tekst"> & { tekst: string }> = {
  network_error: { tekst: "Nie udało się połączyć z Pestką. Sprawdź internet i spróbuj ponownie.", ponow: true, konfiguracja: false },
  rate_limited: { tekst: "Za dużo zapytań naraz. Odczekaj minutę i spróbuj ponownie.", ponow: true, konfiguracja: false },
  no_provider: { tekst: "Pestka jest chwilowo niedostępna. Spróbuj za chwilę.", ponow: true, konfiguracja: false },
  bad_credential: { tekst: "Pestka jest chwilowo niedostępna. Spróbuj za chwilę.", ponow: true, konfiguracja: false },
  provider_failed: { tekst: "Model nie odpowiedział. Spróbuj ponownie za chwilę.", ponow: true, konfiguracja: false },
  bad_model_response: { tekst: "Odpowiedź Pestki przyszła niepełna. Spróbuj ponownie.", ponow: true, konfiguracja: false },
  image_not_supported: { tekst: "Pestka nie może teraz przeczytać zdjęcia. Opisz zadanie słowami.", ponow: false, konfiguracja: true },
  bad_image: { tekst: "Tego zdjęcia nie da się wysłać. Wybierz plik JPG, PNG albo WebP.", ponow: false, konfiguracja: false },
  not_signed_in: { tekst: "Zaloguj się ponownie, aby kontynuować.", ponow: false, konfiguracja: false },
  grading_in_progress: { tekst: "Ta odpowiedź jest właśnie sprawdzana. Spróbuj ponownie za chwilę.", ponow: true, konfiguracja: false },
  attempt_id_in_use: { tekst: "Ta próba ma już inną odpowiedź. Wyślij ją jeszcze raz.", ponow: true, konfiguracja: false },
  variant_not_found: { tekst: "Nie ma już tego zadania. Weź następne.", ponow: false, konfiguracja: false },
  variant_pool_exhausted: { tekst: "Skończyły się nowe zadania tego typu. Wybierz inny typ zadania.", ponow: false, konfiguracja: false },
  unknown_template: { tekst: "Nie ma takiego typu zadania. Wybierz go z listy.", ponow: false, konfiguracja: false },
  notes_not_found: { tekst: "Którejś notatki już nie ma. Odśwież listę.", ponow: false, konfiguracja: false },
  notes_changed: { tekst: "Notatki zmieniły się w międzyczasie. Odśwież listę i spróbuj ponownie.", ponow: true, konfiguracja: false },
  knowledge_edge_limit: { tekst: "Mapa ma już najwięcej połączeń, ile się da. Usuń kilka, zanim dodasz nowe.", ponow: false, konfiguracja: false },
  question_not_found: { tekst: "Nie ma takiego zadania w arkuszu.", ponow: false, konfiguracja: false },
  unsupported_question: { tekst: "Tego zadania Pestka nie oceni. Porównaj odpowiedź z kluczem.", ponow: false, konfiguracja: false },
};

/** Krótki komunikat dla ucznia zamiast kodu błędu. Błędy wejścia (4xx bez osobnego kodu) nie mają ponowienia. */
export function komunikatPestki(blad: unknown): Komunikat {
  if (!(blad instanceof BladPestki)) return KOMUNIKATY.network_error!;
  const znany = KOMUNIKATY[blad.kod];
  if (znany) return znany;
  if (blad.status >= 400 && blad.status < 500) return { tekst: "Pestka nie przyjęła tych danych. Popraw je i spróbuj ponownie.", ponow: false, konfiguracja: false };
  return { tekst: "Coś poszło nie tak po stronie Sedna. Spróbuj ponownie.", ponow: true, konfiguracja: false };
}

export const czyPrzerwane = (blad: unknown) => blad instanceof DOMException && blad.name === "AbortError";

// Warianty zadań i ocena rozwiązań (warianty-i-ocena.md).

export type PrzedmiotWariantu = "matematyka" | "informatyka" | "angielski";
export type SzablonWariantu = { id: string; przedmiot: PrzedmiotWariantu; poziomy: Poziom[]; nazwa: string };
export type FormaZadania = "liczba" | "tekst" | "lista" | "pola" | "sql";
export type ZadanieWariantu = { polecenie: string; forma: FormaZadania; punkty: number; dane?: unknown; pola?: string[] };
export type Wariant = { id: string; szablon: string; przedmiot: PrzedmiotWariantu; zadanie: ZadanieWariantu };
export type OdpowiedzWariantu = { tekst?: string; kod?: string; pola?: Record<string, string> };
export type Kryterium = { opis: string; punkty: number; maksPunktow: number };
export type OcenaRozwiazania = {
  proba: string;
  status: "ocenione" | "do-weryfikacji";
  metoda: "klucz" | "testy" | "rubryka" | "brak";
  punkty: number | null;
  maksPunktow: number;
  opis: string;
  kryteria?: Kryterium[];
  zasady?: { pdf: string; strona: number | null };
};

// Odczyt zdjęcia i omówienie (nauka-ai.md).

export type ObrazDoWyslania = { mime: "image/jpeg" | "image/png" | "image/webp"; base64: string };
export type OdczytZdjecia = { tekst: string; watpliwosci: string[] };
export type OmowienieOdczytu = { uwaga: string; pytanie: string };

// Rozmowa sokratejska i pisanie krok po kroku.

export type WpisRozmowy = { od: "pestka" | "uczen"; tekst: string };
export type PytanieSokratejskie = { pytanie: string | null; zakoncz: boolean };
export type EtapPisania = "plan" | "wstep" | "rozwiniecie" | "zakonczenie" | "przeglad";
export type StatusKryterium = "dobrze" | "do-poprawy" | "do-zrobienia" | "niepewne";
export type UwagiDoSzkicu = { etap: EtapPisania; slowa: number; akapity: number; statusy: Record<string, StatusKryterium>; pytanie: string | null };

// Mapa wiedzy i wizualizacje.

export type KrawedzWiedzy = { first_id: string; second_id: string; label: string; status: "proposed" | "accepted" };
export type ModelWizualizacji = Record<string, unknown> & { id: string; nazwa?: string; przedmiot?: string };

const tekst = (w: unknown): w is string => typeof w === "string";

export const naukaAi = {
  katalogWariantow: (przedmiot?: PrzedmiotWariantu, signal?: AbortSignal) =>
    wywolaj<{ szablony: SzablonWariantu[] }>({ action: "warianty-katalog", ...(przedmiot ? { przedmiot } : {}) }, signal)
      .then((w) => sprawdz(w, (x) => Array.isArray(x.szablony)).szablony),
  wariant: (id: string, szablon: string, signal?: AbortSignal) =>
    wywolaj<Wariant>({ action: "wariant-zadania", id, szablon }, signal)
      .then((w) => sprawdz(w, (x) => x.id === id && tekst(x.zadanie?.polecenie) && tekst(x.zadanie?.forma))),
  ocenWariant: (proba: string, wariant: string, odpowiedz: OdpowiedzWariantu, signal?: AbortSignal) =>
    wywolaj<OcenaRozwiazania>({ action: "ocen-rozwiazanie", proba, wariant, odpowiedz }, signal)
      .then((w) => sprawdz(w, (x) => (x.status === "ocenione" || x.status === "do-weryfikacji") && tekst(x.opis))),
  odczytajZdjecie: (obraz: ObrazDoWyslania, signal?: AbortSignal) =>
    wywolaj<OdczytZdjecia>({ action: "odczytaj-zdjecie", obraz }, signal)
      .then((w) => sprawdz(w, (x) => tekst(x.tekst) && Array.isArray(x.watpliwosci))),
  omowOdczyt: (polecenie: string, odczyt: string, signal?: AbortSignal) =>
    wywolaj<OmowienieOdczytu>({ action: "omow-odczyt", polecenie, odczyt }, signal)
      .then((w) => sprawdz(w, (x) => tekst(x.uwaga) && tekst(x.pytanie))),
  sokratejski: (umiejetnosc: string, poziom: Poziom, historia: WpisRozmowy[], signal?: AbortSignal) =>
    wywolaj<PytanieSokratejskie>({ action: "sokratejski", umiejetnosc, poziom, historia }, signal)
      .then((w) => sprawdz(w, (x) => typeof x.zakoncz === "boolean" && (x.zakoncz || tekst(x.pytanie)))),
  krokPoKroku: (etap: EtapPisania, poziom: Poziom, polecenie: string, szkic: string, signal?: AbortSignal) =>
    wywolaj<UwagiDoSzkicu>({ action: "krok-po-kroku", etap, poziom, polecenie, tekst: szkic }, signal)
      .then((w) => sprawdz(w, (x) => x.etap === etap && typeof x.statusy === "object" && x.statusy !== null)),
  polaczeniaWiedzy: (notatki: string[], signal?: AbortSignal) =>
    wywolaj<{ krawedzie: KrawedzWiedzy[] }>({ action: "mapa-wiedzy-polaczenia", notatki }, signal)
      .then((w) => sprawdz(w, (x) => Array.isArray(x.krawedzie)).krawedzie),
  wizualizacje: (przedmiot?: string, signal?: AbortSignal) =>
    wywolaj<{ modele: ModelWizualizacji[] }>({ action: "wizualizacje", ...(przedmiot ? { przedmiot } : {}) }, signal)
      .then((w) => sprawdz(w, (x) => Array.isArray(x.modele)).modele),
  wizualizacja: <T extends object>(id: string, parametry: Record<string, unknown>, signal?: AbortSignal) =>
    wywolaj<T>({ action: "wizualizacja", id, ...parametry }, signal),
};

/** Liczy słowa i akapity tak samo jak serwer w krok-po-kroku (akapity oddziela pusta linia). */
export function policzTekst(szkic: string) {
  const t = szkic.trim();
  return {
    slowa: t ? t.split(/\s+/u).filter((slowo) => /[\p{L}\p{N}]/u.test(slowo)).length : 0,
    akapity: t ? t.split(/\r?\n[\t ]*\r?\n/u).filter((akapit) => akapit.trim()).length : 0,
  };
}
