import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useProfil, useSession } from "../auth";
import type { Poziom } from "../arkusze/typy";
import { pamiecNauki as pamiec, pobierzWspolnie } from "./pamiec";
import { zapytania, type Zapytanie } from "./zapytania";

export const poziomyNauki: readonly Poziom[] = ["podstawowy", "rozszerzony", "dwujezyczny"];
export const czyPoziomNauki = (wartosc: unknown): wartosc is Poziom => poziomyNauki.some((poziom) => poziom === wartosc);

export function usePoziomNauki() {
  const profil = useProfil();
  const [params, setParams] = useSearchParams();
  const wybrany = params.get("poziom");
  const zKonta = profil?.subjects.find((p) => p.id === "angielski")?.poziom;
  const poziom: Poziom = czyPoziomNauki(wybrany) ? wybrany : zKonta ?? "podstawowy";
  const ustawPoziom = (nowy: Poziom) => {
    const nastepne = new URLSearchParams(params);
    nastepne.set("poziom", nowy);
    setParams(nastepne, { replace: true });
  };
  return [poziom, ustawPoziom] as const;
}

/**
 * Stale-while-revalidate: dane z pamięci od razu, świeże z bazy w tle; to samo zapytanie w locie idzie do bazy raz.
 * W wyniku zPamieci: pierwsze dane na ekranie przyszły z pamięci, więc widok nie odgrywa animacji wejścia.
 * Opcja zPamieci: false dla danych, które widok bierze tylko raz na start (np. stan rundy), bo nieaktualna kopia
 * zostałaby na ekranie także po dojściu świeżej.
 */
export function useZapytanieNauki<T>(klucz: string | null, pobierz: (signal: AbortSignal) => Promise<T>, { zPamieci = true } = {}) {
  const sesja = useSession();
  const kluczKonta = klucz !== null && sesja ? `${sesja.user.id}:${klucz}` : null;
  const pobierzRef = useRef(pobierz);
  const [proba, ustawProbe] = useState(0);
  const [wynik, ustawWynik] = useState<{
    klucz: string;
    proba: number;
    dane: T | null;
    blad: string | null;
  } | null>(null);

  useEffect(() => {
    pobierzRef.current = pobierz;
  }, [pobierz]);

  useEffect(() => {
    if (kluczKonta === null) return;
    let aktualne = true;
    void pobierzWspolnie(kluczKonta, pobierzRef.current, zPamieci).then(
      (dane) => {
        if (aktualne) ustawWynik({ klucz: kluczKonta, proba, dane, blad: null });
      },
      (blad: unknown) => {
        if (!aktualne) return;
        // Błąd odświeżenia nie zabiera dobrych danych z pamięci: zostają na ekranie.
        if (zPamieci && pamiec.has(kluczKonta)) {
          ustawWynik({ klucz: kluczKonta, proba, dane: pamiec.get(kluczKonta) as T, blad: null });
          return;
        }
        ustawWynik({
          klucz: kluczKonta, proba, dane: null,
          blad: blad instanceof Error ? blad.message : "Nie udało się pobrać danych.",
        });
      },
    );
    return () => {
      aktualne = false;
    };
  }, [kluczKonta, proba, zPamieci]);

  const aktualny = wynik?.klucz === kluczKonta && wynik.proba === proba ? wynik : null;
  const zapamietany = !aktualny && zPamieci && kluczKonta !== null && pamiec.has(kluczKonta)
    ? { dane: pamiec.get(kluczKonta) as T, blad: null }
    : null;
  const biezacy = aktualny ?? zapamietany;
  // Czy przy pierwszym renderze z tym kluczem dane już były w pamięci (wtedy widok pomija animację wejścia).
  const naStart = useRef<{ klucz: string | null; zPamieci: boolean } | null>(null);
  if (naStart.current?.klucz !== kluczKonta) naStart.current = { klucz: kluczKonta, zPamieci: !!zapamietany };
  const stan = kluczKonta === null ? "pominiete" : !biezacy ? "ladowanie" : biezacy.blad ? "blad" : "gotowe";
  return {
    stan,
    dane: biezacy?.dane ?? null,
    blad: biezacy?.blad ?? null,
    zPamieci: naStart.current.zPamieci,
    ponow: () => ustawProbe((n) => n + 1),
  } as const;
}

const pominiete = () => Promise.reject(new Error("pominięte"));

/** Zapytanie z rejestru (nauka/zapytania.ts); null: nie pobieraj. */
export function useZapytanie<T>(z: Zapytanie<T> | null, opcje?: { zPamieci?: boolean }) {
  return useZapytanieNauki<T>(z?.klucz ?? null, z?.pobierz ?? pominiete, opcje);
}

export function useOtwarteRundy(wlaczone = true) {
  return useZapytanie(wlaczone ? zapytania.otwarteRundy() : null);
}
