// Jedna propozycja dnia dla pulpitu, Nauki i Powtórek: wszystkie trzy miejsca pokazują to samo, z jednym czasem.
// Kolejność: niedokończona runda albo arkusz (nowsze z nich) → powtórka na dziś → polecenie z nauka_polec → nowy arkusz.
// Rundy są tylko z angielskiego; inne przedmioty dostają propozycję z arkuszy (konto/wyniki.ts).
import type { ArkuszWpis, Poziom } from "../arkusze/typy";
import { brakArkuszy, naPoziomie, nazwaPoziomu, przedmiot, type PrzedmiotId } from "../konto/przedmioty";
import { useProfil } from "../auth";
import { propozycja, useWynikiKonta, type Podsumowanie, type Propozycja } from "../konto/wyniki";
import { adresPowtorek, adresRundy, adresStartu } from "./adresy";
import { naukaApi, nazwaFormatuNauki, type Powtorka } from "./api";
import { useOtwarteRundy, usePoziomNauki, useZapytanieNauki } from "./stan";

// Każda rekomendacja z nauka_polec i nauka_powtorki ma w SQL stałe 5 minut na jedną krótką rundę.
export const MINUTY_RUNDY = 5;

export type PropozycjaDnia = {
  rodzaj: "runda" | "arkusz" | "powtorka" | "polecenie" | "nowy-arkusz" | "wszystko" | "brak-arkuszy";
  przedmiot: PrzedmiotId;
  tytul: string;
  /** Dlaczego to, jednym albo dwoma zdaniami. */
  powod: string;
  akcja: { do: string; etykieta: string };
  /** Szacowany czas w minutach (null: nie wiadomo, np. rozmowa z Pestką). */
  minuty: number | null;
  ikona: "runda" | "arkusz" | "rozmowa";
  /** Powtórka, którą pokazuje karta: Powtórki nie powtarzają jej na liście. */
  powtorka?: Powtorka;
};

const tytulArkusza = (a: ArkuszWpis) => `Matura ${a.sesja} ${a.rok}`;
const procent = (w: { zdobyte: number; mozliwe: number }) => (w.mozliwe > 0 ? Math.round((w.zdobyte / w.mozliwe) * 100) : 0);

/** Co da się dziś zrobić w przedmiocie bez rund angielskiego (Nauka, pulpit przedmiotu). */
export const coDzisBezRund: Partial<Record<PrzedmiotId, { tekst: string; akcja: { do: string; etykieta: string } }>> = {
  matematyka: {
    tekst: "Zadania z nowymi danymi, sprawdzane od razu. Przy arkuszach jest tablica z Pestką.",
    akcja: { do: "/nauka/zadania?przedmiot=matematyka", etykieta: "Zadania z matematyki" },
  },
  informatyka: {
    tekst: "Algorytmy i SQL z nowymi danymi, sprawdzane od razu. Arkusze mają warsztat z Pythonem i SQL.",
    akcja: { do: "/nauka/zadania?przedmiot=informatyka", etykieta: "Zadania z informatyki" },
  },
  polski: {
    tekst: "Arkuszy i rund z polskiego jeszcze nie ma. Możesz z Pestką omówić lekturę albo plan wypracowania.",
    akcja: { do: "/tutor", etykieta: "Porozmawiaj z Pestką" },
  },
};

/** Propozycja z samych arkuszy (bez rund): dla przedmiotów innych niż angielski i gdy rundy nie odpowiadają. */
export function zArkuszy(co: Propozycja): PropozycjaDnia {
  const id = co.przedmiot.id;
  const poziom = nazwaPoziomu[co.przedmiot.poziom];
  if (co.rodzaj === "dokoncz") {
    const z = co.zaczety;
    return {
      rodzaj: "arkusz",
      przedmiot: id,
      tytul: "Dokończ arkusz",
      powod: `Na dziś wybrałam dokończenie: ${tytulArkusza(z.arkusz)}, poziom ${poziom}, bo masz już ${z.odpowiedzi} z ${z.arkusz.pytan} odpowiedzi. Wynik pokażę po sprawdzeniu.`,
      akcja: { do: `/arkusze/${z.arkusz.id}`, etykieta: "Wróć do arkusza" },
      minuty: null,
      ikona: "arkusz",
    };
  }
  if (co.rodzaj === "nowy")
    return {
      rodzaj: "nowy-arkusz",
      przedmiot: id,
      tytul: tytulArkusza(co.arkusz),
      powod: co.ostatni
        ? `Na dziś wybrałam ten arkusz, bo ostatni wynik to ${procent(co.ostatni)}% (${tytulArkusza(co.ostatni.arkusz).toLowerCase()}), a kolejny pokaże, czy to stały poziom.`
        : `Na dziś wybrałam najnowszy arkusz na poziomie ${poziom}, bo nie mam jeszcze twojego wyniku z tego przedmiotu.`,
      akcja: { do: `/arkusze/${co.arkusz.id}`, etykieta: "Rozwiąż arkusz" },
      minuty: co.arkusz.czas ?? null,
      ikona: "arkusz",
    };
  // Po wszystkich arkuszach matematyki i informatyki zostają zadania z nowymi danymi.
  const zadania = id === "matematyka" || id === "informatyka" ? coDzisBezRund[id]!.akcja : null;
  if (co.rodzaj === "wszystko")
    return {
      rodzaj: "wszystko",
      przedmiot: id,
      tytul: "Wszystkie arkusze rozwiązane",
      powod: `Wszystkie arkusze na poziomie ${poziom} w Sedno masz za sobą.${co.ostatni ? ` Ostatni: ${procent(co.ostatni)}%.` : ""}${zadania ? " Na dziś wybrałam zadania z nowymi danymi, bo arkusze się skończyły." : ""}`,
      akcja: zadania ?? { do: "/arkusze", etykieta: "Przejrzyj arkusze" },
      minuty: null,
      ikona: "arkusz",
    };
  const bezRund = coDzisBezRund[id];
  return {
    rodzaj: "brak-arkuszy",
    przedmiot: id,
    tytul: `${przedmiot(id)!.nazwa}, poziom ${poziom}`,
    powod: co.inne.length ? brakArkuszy(id, co.przedmiot.poziom, co.inne) : id === "polski" && bezRund ? bezRund.tekst : brakArkuszy(id, co.przedmiot.poziom, []),
    akcja: co.inne.length
      ? { do: `/arkusze?przedmiot=${id}&poziom=${co.inne[0]}`, etykieta: `Arkusze ${naPoziomie[co.inne[0]!]}` }
      : bezRund?.akcja ?? { do: "/tutor", etykieta: "Porozmawiaj z Pestką" },
    minuty: null,
    ikona: co.inne.length ? "arkusz" : "rozmowa",
  };
}

/** Polecenie z mapy umiejętności (nauka_polec) z nazwą umiejętności; wspólne dla karty dnia i sposobów nauki w Nauce. */
export function usePolecenieDnia(poziom: Poziom, wlaczone = true) {
  return useZapytanieNauki(wlaczone ? `dzis-${poziom}` : null, async (signal) => {
    const [propozycja, katalog] = await Promise.all([naukaApi.polec(poziom, undefined, signal), naukaApi.katalog(poziom, signal)]);
    const umiejetnosc = katalog.skills.find((u) => u.id === propozycja?.skill_id);
    return propozycja && umiejetnosc ? { ...propozycja, nazwa: umiejetnosc.name } : null;
  });
}

export type Sposob = "szybka-runda" | "napraw-blad" | "arkusze" | "uczen-uczy" | "rozmowa" | "zdjecie" | "sokratejski" | "pisanie";

/**
 * Sposób nauki, który Pestka poleca temu uczniowi: arkusz, gdy nie ma jeszcze wyniku z angielskiego (pokaże poziom),
 * napraw błąd, gdy tak wypada z mapy, inaczej szybka runda. powod idzie do Pestki (prawy przycisk).
 */
export function polecanySposob(maWynikArkusza: boolean, formatPolecenia: string | undefined): { sposob: Sposob; powod: string } {
  if (!maWynikArkusza) return { sposob: "arkusze", powod: "Nie masz jeszcze wyniku z arkusza. Jeden arkusz pokaże mi, od czego zacząć." };
  if (formatPolecenia === "napraw-blad") return { sposob: "napraw-blad", powod: "Na mapie widzę błędy w formach. Poprawianie zdań pomoże je zrozumieć." };
  return { sposob: "szybka-runda", powod: "Krótkie rundy codziennie dają najwięcej na mapie umiejętności." };
}

/**
 * Propozycja dnia. co: propozycja z arkuszy (pulpit), angielski: czy pytać o rundy, powtórki i polecenie.
 * Bez odpowiedzi z Nauki (błąd sieci) zostaje propozycja z arkuszy.
 */
export function useDzis({ co, angielski }: { co?: Propozycja; angielski: boolean }): { stan: "ladowanie" | "gotowe"; dzis: PropozycjaDnia | null } {
  const [poziom] = usePoziomNauki();
  const rundy = useOtwarteRundy(poziom, angielski);
  const powtorki = useZapytanieNauki(angielski ? `nauka:powtorki:${poziom}` : null, (signal) => naukaApi.powtorki(poziom, signal));
  const polecenie = usePolecenieDnia(poziom, angielski);

  const zArk = co ? zArkuszy(co) : null;
  if (!angielski) return { stan: "gotowe", dzis: zArk };
  if ([rundy.stan, powtorki.stan, polecenie.stan].includes("ladowanie")) return { stan: "ladowanie", dzis: null };

  // 1. Niedokończone: runda albo arkusz, nowsze z nich.
  const runda = rundy.dane?.sesje[0];
  const arkuszZaczety = co?.rodzaj === "dokoncz" ? co.zaczety : null;
  if (runda && (!arkuszZaczety || runda.updated_at >= arkuszZaczety.kiedy)) {
    const nazwa = rundy.dane?.nazwy.get(runda.skill_id) ?? nazwaFormatuNauki[runda.format];
    return {
      stan: "gotowe",
      dzis: {
        rodzaj: "runda",
        przedmiot: "angielski",
        tytul: nazwa,
        powod: `Na dziś wybrałam dokończenie rundy (${nazwaFormatuNauki[runda.format].toLowerCase()}), bo lepiej skończyć zaczęte, zanim zaczniesz coś nowego.`,
        akcja: { do: adresRundy(runda.id), etykieta: "Wznów rundę" },
        minuty: MINUTY_RUNDY,
        ikona: "runda",
      },
    };
  }
  if (arkuszZaczety && zArk) return { stan: "gotowe", dzis: zArk };

  // 2. Powtórka na dziś.
  const dzis = powtorki.dane?.today;
  if (dzis) {
    const powtorz = dzis.mistake?.repeat_id ?? undefined;
    return {
      stan: "gotowe",
      dzis: {
        rodzaj: "powtorka",
        przedmiot: "angielski",
        tytul: dzis.name,
        powod: dzis.mistake ? "Na dziś wybrałam powtórkę zadania, bo ostatnio sprawiło trudność. Jedna krótka runda wystarczy." : "Na dziś wybrałam tę umiejętność, bo zaczyna wylatywać z pamięci.",
        akcja: { do: adresStartu(poziom, dzis.skill_id, powtorz ? "szybka-runda" : dzis.format === "napraw-blad" ? "napraw-blad" : "szybka-runda", powtorz), etykieta: powtorz ? "Powtórz zadanie" : "Zacznij powtórkę" },
        minuty: MINUTY_RUNDY,
        ikona: "runda",
        powtorka: dzis,
      },
    };
  }

  // 3. Polecenie z mapy umiejętności.
  const p = polecenie.dane;
  if (p)
    return {
      stan: "gotowe",
      dzis: {
        rodzaj: "polecenie",
        przedmiot: "angielski",
        tytul: p.nazwa,
        powod: `Na dziś wybrałam to ćwiczenie. ${p.reason}`,
        akcja: { do: adresStartu(poziom, p.skill_id, p.format, p.repeat_id ?? undefined), etykieta: nazwaFormatuNauki[p.format] },
        minuty: p.minutes > 0 ? p.minutes : MINUTY_RUNDY,
        ikona: "runda",
      },
    };

  // 4. Nowy arkusz (albo to, co zostało z arkuszy).
  return { stan: "gotowe", dzis: zArk ?? (powtorki.dane?.queue.length ? { rodzaj: "powtorka", przedmiot: "angielski", tytul: "Powtórki", powod: "Na dziś wybrałam powtórki, bo na liście czekają zadania z ostatnich ćwiczeń.", akcja: { do: adresPowtorek(poziom), etykieta: "Otwórz powtórki" }, minuty: MINUTY_RUNDY, ikona: "runda" } : null) };
}

/** Propozycja dnia w Nauce i w Powtórkach: rundy i arkusze angielskiego na wybranym poziomie, jak na pulpicie angielskiego. */
export function useDzisAngielski(poziom: Poziom): { stan: "ladowanie" | "gotowe"; dzis: PropozycjaDnia | null; podsumowanie?: Podsumowanie } {
  const profil = useProfil();
  const wyniki = useWynikiKonta(profil?.subjects ?? []);
  const angielskie = wyniki?.podsumowania.filter((p) => p.przedmiot.id === "angielski") ?? [];
  const podsumowanie = angielskie.find((p) => p.przedmiot.poziom === poziom) ?? angielskie[0];
  const co = podsumowanie && wyniki ? propozycja(podsumowanie, wyniki.wiersze) : undefined;
  return { ...useDzis({ co, angielski: true }), podsumowanie };
}
