import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useProfil, useSession } from "../auth";
import type { Poziom } from "../arkusze/typy";

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

export function useZapytanieNauki<T>(klucz: string | null, pobierz: (signal: AbortSignal) => Promise<T>) {
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
    const kontroler = new AbortController();
    void pobierzRef.current(kontroler.signal).then(
      (dane) => {
        if (!kontroler.signal.aborted) ustawWynik({ klucz: kluczKonta, proba, dane, blad: null });
      },
      (blad: unknown) => {
        if (!kontroler.signal.aborted) ustawWynik({
          klucz: kluczKonta, proba, dane: null,
          blad: blad instanceof Error ? blad.message : "Nie udało się pobrać danych.",
        });
      },
    );
    return () => kontroler.abort();
  }, [kluczKonta, proba]);

  const aktualny = wynik?.klucz === kluczKonta && wynik.proba === proba ? wynik : null;
  const stan = kluczKonta === null ? "pominiete" : !aktualny ? "ladowanie" : aktualny.blad ? "blad" : "gotowe";
  return { stan, dane: aktualny?.dane ?? null, blad: aktualny?.blad ?? null, ponow: () => ustawProbe((n) => n + 1) } as const;
}
