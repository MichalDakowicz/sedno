// Jedna propozycja dnia dla pulpitu, Nauki i Powtórek: wszystkie trzy miejsca pokazują to samo, z jednym czasem.
// Kolejność: niedokończona runda → diagnoza zakończona dziś (najsłabsza umiejętność) → niedokończony arkusz →
// powtórka na dziś → obszar zadeklarowany jako słaby, dopóki dane go nie potwierdzą ani nie obalą → polecenie z
// nauka_polec → nowy arkusz. Powód mówi o celu i czasie z quizu celów, gdy uczeń je podał.
// Rundy są tylko z angielskiego; inne przedmioty dostają propozycję z arkuszy (konto/wyniki.ts).
import { nazwaSesji, type ArkuszWpis, type Poziom } from "../arkusze/typy";
import { brakArkuszy, naPoziomie, nazwaPoziomu, przedmiot, type PrzedmiotId } from "../konto/przedmioty";
import { useProfil } from "../auth";
import { propozycja, useWynikiKonta, type Podsumowanie, type Propozycja } from "../konto/wyniki";
import { adresPowtorek, adresRundy, adresStartu } from "./adresy";
import { nazwaFormatuNauki, type Powtorka } from "./api";
import { useOtwarteRundy, usePoziomNauki, useZapytanie } from "./stan";
import { celPrzedmiotu, minutyDziennie, useUczenie } from "../konto/profilUcznia";

const dzienWarszawa = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" });
import { zapytania } from "./zapytania";

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
  /** Umiejętność z mapy, której dotyczy propozycja (znacznik „tu dziś” w ogrodzie). */
  skill_id?: string;
  /** Powtórka, którą pokazuje karta: Powtórki nie powtarzają jej na liście. */
  powtorka?: Powtorka;
};

const tytulArkusza = (a: ArkuszWpis) => nazwaSesji(a);
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
    tekst: "Prawdziwe arkusze CKE z polskiego, a wypracowanie piszesz krok po kroku z Pestką.",
    akcja: { do: "/arkusze?przedmiot=polski", etykieta: "Arkusze z polskiego" },
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
        : `Na dziś wybrałam najnowszy arkusz ${naPoziomie[co.przedmiot.poziom]}, bo nie mam jeszcze twojego wyniku z tego przedmiotu.`,
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
      powod: `Wszystkie arkusze ${naPoziomie[co.przedmiot.poziom]} w Sedno masz za sobą.${co.ostatni ? ` Ostatni: ${procent(co.ostatni)}%.` : ""}${zadania ? " Na dziś wybrałam zadania z nowymi danymi, bo arkusze się skończyły." : ""}`,
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
  return useZapytanie(wlaczone ? zapytania.polecenie(poziom) : null);
}

export type Sposob = "szybka-runda" | "napraw-blad" | "arkusze" | "uczen-uczy" | "rozmowa" | "zdjecie" | "sokratejski" | "pisanie" | "wizualizacje" | "mapa-wiedzy";

/**
 * Propozycja dnia. co: propozycja z arkuszy (pulpit), angielski: czy pytać o rundy, powtórki i polecenie.
 * Bez odpowiedzi z Nauki (błąd sieci) zostaje propozycja z arkuszy.
 */
export function useDzis({ co, angielski }: { co?: Propozycja; angielski: boolean }): { stan: "ladowanie" | "gotowe"; dzis: PropozycjaDnia | null } {
  const [poziom] = usePoziomNauki();
  const rundy = useOtwarteRundy(angielski);
  const powtorki = useZapytanie(angielski ? zapytania.powtorki(poziom) : null);
  const polecenie = usePolecenieDnia(poziom, angielski);
  const diagnoza = useZapytanie(angielski ? zapytania.diagnoza(poziom) : null);
  const mapa = useZapytanie(angielski ? zapytania.mapa(poziom) : null);
  const uczenie = useUczenie();
  const cel = celPrzedmiotu(uczenie, "angielski");
  const minutyDnia = minutyDziennie(uczenie);
  // Dopisek do powodu: cel i zadeklarowany czas (runda mieści się w minutach dziennie).
  const zCelem = (minuty: number) => [
    cel !== null ? `Do celu ${Math.round(cel * 100)}% liczy się każda runda.` : "",
    minutyDnia ? `${minuty} min mieści się w twoich ${minutyDnia} min dziennie.` : "",
  ].filter(Boolean).join(" ");
  // Zaczęta runda tej samej umiejętności: karta ją wznawia, zamiast zaczynać drugą obok (i dublować „Dokończ” w planie).
  const runda = (tytul: string, powod: string, skill: string, format?: Parameters<typeof adresStartu>[2], repeat?: string): PropozycjaDnia => {
    const zaczeta = repeat ? undefined : rundy.dane?.sesje.find((x) => x.skill_id === skill && x.level === poziom);
    return {
    rodzaj: "polecenie",
    przedmiot: "angielski",
    tytul,
    powod: [powod, zCelem(MINUTY_RUNDY)].filter(Boolean).join(" "),
    akcja: zaczeta ? { do: adresRundy(zaczeta.id), etykieta: "Wznów rundę" } : { do: adresStartu(poziom, skill, format, repeat), etykieta: "Zacznij rundę" },
    skill_id: skill,
    minuty: MINUTY_RUNDY,
    ikona: "runda",
    };
  };

  const zArk = co ? zArkuszy(co) : null;
  if (!angielski) return { stan: "gotowe", dzis: zArk };
  if ([rundy.stan, powtorki.stan, polecenie.stan, diagnoza.stan, mapa.stan].includes("ladowanie")) return { stan: "ladowanie", dzis: null };

  // 1. Niedokończone: runda albo arkusz, nowsze z nich.
  const otwarta = rundy.dane?.sesje[0];
  const arkuszZaczety = co?.rodzaj === "dokoncz" ? co.zaczety : null;
  if (otwarta && (!arkuszZaczety || otwarta.updated_at >= arkuszZaczety.kiedy)) {
    const runda = otwarta;
    const nazwa = (runda.skill_id && rundy.dane?.nazwy.get(runda.skill_id)) || nazwaFormatuNauki[runda.format];
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
  // 1a. Diagnoza skończona dziś: najsłabsza umiejętność z jej wyniku, zanim wróci arkusz.
  const sesjaDiagnozy = diagnoza.dane?.status === "gotowa" ? diagnoza.dane.session : null;
  if (sesjaDiagnozy && dzienWarszawa.format(new Date(sesjaDiagnozy.updated_at)) === dzienWarszawa.format(new Date())) {
    // Umiejętność ćwiczona już po diagnozie ma świeższy wynik niż diagnoza: nie wracamy do niej z tego powodu.
    const cwiczonaPo = (id: string) => {
      const kiedy = mapa.dane?.skills.find((m) => m.skill_id === id)?.last_practiced_at;
      return !!kiedy && kiedy > sesjaDiagnozy.updated_at;
    };
    const najslabsza = [...(sesjaDiagnozy.result?.umiejetnosci ?? [])].filter((u) => u.opanowanie != null && !cwiczonaPo(u.skill_id)).sort((a, b) => a.opanowanie! - b.opanowanie!)[0];
    if (najslabsza) return { stan: "gotowe", dzis: runda(najslabsza.name, `Na dziś wybrałam tę umiejętność, bo w diagnozie poszła najsłabiej (${najslabsza.poprawne} z ${najslabsza.wszystkich}).`, najslabsza.skill_id) };
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
        skill_id: dzis.skill_id,
        powtorka: dzis,
      },
    };
  }

  // 2a. Obszar zadeklarowany w quizie jako słaby: pierwszeństwo, dopóki jego umiejętności mają mało danych.
  const niepewne = (mapa.dane?.skills ?? []).filter((u) => uczenie.slabe?.includes(u.area) && (u.score === null || u.confidence < 0.5) && u.formats.includes("szybka-runda"));
  const zDeklaracji = [...niepewne].sort((a, b) => a.evidence_count - b.evidence_count)[0];
  if (zDeklaracji)
    return { stan: "gotowe", dzis: runda(zDeklaracji.name, `Na dziś wybrałam tę umiejętność, bo ten obszar wskazano jako słabszy, a ja mam za mało odpowiedzi, żeby to potwierdzić.`, zDeklaracji.skill_id) };

  // 3. Polecenie z mapy umiejętności.
  const p = polecenie.dane;
  if (p)
    return {
      stan: "gotowe",
      dzis: {
        rodzaj: "polecenie",
        przedmiot: "angielski",
        tytul: p.nazwa,
        powod: [`Na dziś wybrałam to ćwiczenie. ${p.reason}`, zCelem(p.minutes > 0 ? p.minutes : MINUTY_RUNDY)].filter(Boolean).join(" "),
        akcja: { do: adresStartu(poziom, p.skill_id, p.format, p.repeat_id ?? undefined), etykieta: p.repeat_id ? "Powtórz zadanie" : nazwaFormatuNauki[p.format] },
        minuty: p.minutes > 0 ? p.minutes : MINUTY_RUNDY,
        ikona: "runda",
        skill_id: p.skill_id,
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
