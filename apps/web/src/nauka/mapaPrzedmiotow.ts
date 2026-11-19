// Mapa umiejętności i powtórki dla przedmiotów bez rund (polski, matematyka, informatyka). Umiejętności to szablon
// działów matury; wynik działu liczymy ze sprawdzonych zadań w arkuszach, przypisanych do działu po słowach z treści.
// Bez sprawdzonych zadań mapa jest szablonem „do przerobienia” (wszystko „mało danych”).
import type { Arkusz, ArkuszWpis, Poziom, Zadanie } from "../arkusze/typy";
import { trescArkusza, useListaArkuszy } from "../arkusze/dane";
import { policzPytania } from "../arkusze/sprawdz";
import type { PrzedmiotId } from "../konto/przedmioty";
import { usePostepyKonta, type Wiersz } from "../konto/wyniki";
import { useZapytanieNauki } from "./stan";
import type { Umiejetnosc } from "./api";

export type Obszar = { id: string; nazwa: string };
type Szablon = { id: string; obszar: string; nazwa: string; opis: string; slowa?: RegExp; pasuje?: (z: Zadanie) => boolean };

export const OBSZARY_PRZEDMIOTOW: Partial<Record<PrzedmiotId, Obszar[]>> = {
  matematyka: [
    { id: "algebra", nazwa: "Liczby i algebra" },
    { id: "funkcje", nazwa: "Funkcje i ciągi" },
    { id: "geometria", nazwa: "Geometria" },
    { id: "rachunek", nazwa: "Statystyka i prawdopodobieństwo" },
  ],
  informatyka: [
    { id: "algorytmy", nazwa: "Algorytmy i programowanie" },
    { id: "dane", nazwa: "Dane" },
    { id: "teoria", nazwa: "Teoria" },
  ],
  polski: [
    { id: "test", nazwa: "Test" },
    { id: "lektury", nazwa: "Lektury" },
    { id: "pisanie-pl", nazwa: "Wypracowanie" },
  ],
};

// Kolejność ma znaczenie: zadanie trafia do pierwszego działu, którego słowa pasują (węższe działy najpierw).
const SZABLONY: Partial<Record<PrzedmiotId, Szablon[]>> = {
  matematyka: [
    { id: "stereometria", obszar: "geometria", nazwa: "Stereometria", opis: "Bryły: graniastosłupy, ostrosłupy, bryły obrotowe, objętość i pole.", slowa: /graniastosłup|ostrosłup|walec|stożek|kul[aię]\b|sześcian|prostopadłościan|bryły|bryła/ },
    { id: "trygonometria", obszar: "geometria", nazwa: "Trygonometria", opis: "Sinus, cosinus, tangens i ich związki.", slowa: /sinus|cosinus|tangens|\bsin\b|\bcos\b|\btg\b|trygonometr/ },
    { id: "analityczna", obszar: "geometria", nazwa: "Geometria analityczna", opis: "Punkty, proste i okręgi w układzie współrzędnych.", slowa: /układzie współrzędnych|współrzędn|prosta o równaniu|prostej o równaniu|środek odcinka/ },
    { id: "ciagi", obszar: "funkcje", nazwa: "Ciągi", opis: "Ciągi arytmetyczne i geometryczne, wzór ogólny, suma wyrazów.", slowa: /ciąg|arytmetyczn|geometryczn/ },
    { id: "prawdopodobienstwo", obszar: "rachunek", nazwa: "Prawdopodobieństwo", opis: "Zdarzenia losowe i ich prawdopodobieństwo.", slowa: /prawdopodobie|losujemy|losowo|rzucamy|kostk|monet/ },
    { id: "statystyka", obszar: "rachunek", nazwa: "Statystyka", opis: "Średnia, mediana, dominanta, odchylenie.", slowa: /średni|median|dominant|odchyleni|statysty/ },
    { id: "kombinatoryka", obszar: "rachunek", nazwa: "Kombinatoryka", opis: "Zliczanie: ile jest liczb, układów, wyborów.", slowa: /ile jest|ile można|kombinator|wszystkich liczb|cyfr/ },
    { id: "funkcje", obszar: "funkcje", nazwa: "Funkcje", opis: "Własności i wykresy funkcji: liniowej, kwadratowej, wykładniczej.", slowa: /funkcj|wykres|miejsc[ea] zerow|dziedzin|zbiór wartości|parabol|wierzchoł/ },
    { id: "rownania", obszar: "algebra", nazwa: "Równania i nierówności", opis: "Równania, nierówności i ich układy.", slowa: /równani|nierównoś|układ/ },
    { id: "planimetria", obszar: "geometria", nazwa: "Planimetria", opis: "Trójkąty, czworokąty, okręgi i kąty na płaszczyźnie.", slowa: /trójkąt|czworokąt|okręg|koł[ao]|kąt|trapez|romb|równoległobok|wielokąt|prostokąt|kwadrat/ },
    { id: "wyrazenia", obszar: "algebra", nazwa: "Wyrażenia algebraiczne", opis: "Przekształcanie wyrażeń, wzory skróconego mnożenia.", slowa: /wyrażeni|skróconego mnożenia|przekształ|rozkład/ },
    { id: "liczby", obszar: "algebra", nazwa: "Liczby i potęgi", opis: "Potęgi, pierwiastki, logarytmy, procenty, przedziały.", slowa: /potęg|pierwiast|logarytm|procent|przedział|wartoś[cć] bezwzględn|liczb/ },
  ],
  informatyka: [
    { id: "programowanie", obszar: "algorytmy", nazwa: "Programowanie", opis: "Programy, które przetwarzają pliki z danymi.", pasuje: (z) => !!z.program },
    { id: "sql", obszar: "dane", nazwa: "Bazy danych i SQL", opis: "Zapytania do bazy: wybieranie, łączenie, grupowanie.", pasuje: (z) => !!z.sql, slowa: /\bsql\b|zapytani|baz[aiy] danych/ },
    { id: "arkusz", obszar: "dane", nazwa: "Arkusz kalkulacyjny", opis: "Formuły, filtrowanie i wykresy na danych.", slowa: /arkusz[a-z]* kalkulacyjn|wykres/ },
    { id: "systemy", obszar: "teoria", nazwa: "Systemy liczbowe i logika", opis: "Zapis dwójkowy i inne systemy, operacje logiczne.", slowa: /dwójkow|binarn|ósemkow|szesnastkow|system(ie)? liczbow|\bbit/ },
    { id: "analiza", obszar: "algorytmy", nazwa: "Analiza algorytmów", opis: "Czytanie algorytmu, śledzenie działania, złożoność.", slowa: /algorytm|złożonoś|rekurencj|pseudokod|specyfikacj/ },
    { id: "prawda-falsz", obszar: "teoria", nazwa: "Zadania prawda/fałsz", opis: "Zamknięte pytania z wiedzy ogólnej.", pasuje: (z) => z.pytania.length > 0 && z.pytania.every((q) => q.typ === "zamkniete") },
  ],
  polski: [
    { id: "jezyk", obszar: "test", nazwa: "Język polski w użyciu", opis: "Teksty o języku: znaczenie wyrazów, styl, poprawność.", slowa: /język|słow|wyraz|frazeolog|styl/ },
    { id: "historycznoliteracki", obszar: "test", nazwa: "Test historycznoliteracki", opis: "Epoki, utwory i konteksty literackie." },
    { id: "lektury", obszar: "lektury", nazwa: "Lektury obowiązkowe", opis: "Treść, bohaterowie i problemy lektur." },
    { id: "wypracowanie", obszar: "pisanie-pl", nazwa: "Teza i argumenty", opis: "Stanowisko, argumenty i przykłady z lektur.", pasuje: (z) => z.pytania.some((q) => q.typ === "wypowiedz") },
    { id: "kompozycja", obszar: "pisanie-pl", nazwa: "Kompozycja i poprawność", opis: "Układ wypracowania, styl, poprawność językowa." },
  ],
};

export const maMapeZArkuszy = (p: PrzedmiotId) => !!SZABLONY[p];

function trescZadania(z: Zadanie): string {
  return [...z.polecenie, ...z.bloki.map((b) => ("tekst" in b ? b.tekst : ""))].join(" ").toLowerCase();
}

export function dzialZadania(przedmiot: PrzedmiotId, z: Zadanie): string | null {
  const tekst = trescZadania(z);
  return SZABLONY[przedmiot]?.find((s) => s.pasuje?.(z) || (s.slowa && s.slowa.test(tekst)))?.id ?? null;
}

export type BladArkusza = { arkusz: ArkuszWpis; zadanie: number; tytul: string; dzial: string | null; zdobyte: number; mozliwe: number; kiedy: string };
export type MapaZArkuszy = { umiejetnosci: Umiejetnosc[]; bledy: BladArkusza[] };

/** Szablon bez danych: każda umiejętność „mało danych”. */
export function szablonMapy(przedmiot: PrzedmiotId): Umiejetnosc[] {
  return (SZABLONY[przedmiot] ?? []).map((s) => ({
    skill_id: s.id, area: s.obszar, name: s.nazwa, description: s.opis, codes: [], exam_points: 1,
    evidence_count: 0, last_practiced_at: null, score: null, confidence: 0, retention: null, due_at: null, formats: [],
  }));
}

/** Wyniki działów ze sprawdzonych zadań (cały arkusz sprawdzony albo pojedyncze zadania) i lista zadań z błędem. */
export async function policzMapeZArkuszy(przedmiot: PrzedmiotId, wiersze: Wiersz[], lista: ArkuszWpis[]): Promise<MapaZArkuszy> {
  const wgId = new Map(lista.map((a) => [a.id, a]));
  const umiejetnosci = szablonMapy(przedmiot);
  const wgDzialu = new Map(umiejetnosci.map((u) => [u.skill_id, { zdobyte: 0, mozliwe: 0, ile: 0, kiedy: null as string | null, u }]));
  const bledy: BladArkusza[] = [];
  const tresci = await Promise.all(wiersze.map((w) => trescArkusza(w.sheet_id).catch(() => null)));
  wiersze.forEach((w, i) => {
    const a: Arkusz | null = tresci[i] ?? null;
    const wpis = wgId.get(w.sheet_id);
    if (!a || !wpis) return;
    const sprawdzone = new Set(w.data.sprawdzony ? a.zadania.map((z) => z.nr) : (w.data.sprawdzoneZadania ?? []));
    for (const z of a.zadania) {
      if (!sprawdzone.has(z.nr) || !z.pytania.some((q) => w.data.odpowiedzi[q.nr]?.trim())) continue;
      const wynik = policzPytania(z.pytania, w.data.odpowiedzi, w.data.samoocena);
      if (!wynik.mozliwe) continue;
      const dzial = dzialZadania(przedmiot, z);
      const d = dzial ? wgDzialu.get(dzial) : undefined;
      if (d) {
        d.zdobyte += wynik.zdobyte;
        d.mozliwe += wynik.mozliwe;
        d.ile += 1;
        if (!d.kiedy || w.updated_at > d.kiedy) d.kiedy = w.updated_at;
      }
      // Zadanie omówione z Pestką i zrozumiane (zadanie podobne dobrze) nie wraca do powtórek.
      if (wynik.zdobyte < wynik.mozliwe && w.data.omowione?.[z.nr] !== "dobrze")
        bledy.push({ arkusz: wpis, zadanie: z.nr, tytul: z.tytul ?? `Zadanie ${z.nr}`, dzial, zdobyte: wynik.zdobyte, mozliwe: wynik.mozliwe, kiedy: w.updated_at });
    }
  });
  for (const d of wgDzialu.values()) {
    if (!d.mozliwe) continue;
    d.u.score = d.zdobyte / d.mozliwe;
    d.u.evidence_count = d.ile;
    d.u.confidence = Math.min(1, d.ile / 5);
    d.u.last_practiced_at = d.kiedy;
  }
  bledy.sort((x, y) => y.kiedy.localeCompare(x.kiedy) || x.zadanie - y.zadanie);
  return { umiejetnosci, bledy };
}

export const kluczMapyZArkuszy = (przedmiot: PrzedmiotId, poziom: Poziom | null, wiersze: Wiersz[]) =>
  `mapa-arkuszy:${przedmiot}:${poziom ?? "-"}:${wiersze.map((w) => `${w.sheet_id}@${w.updated_at}`).join(",")}`;

/** Mapa przedmiotu ze sprawdzonych arkuszy na danym poziomie; null przedmiotu: nic nie pobiera. */
export function useMapaZArkuszy(przedmiot: PrzedmiotId | null, poziom: Poziom | null) {
  const lista = useListaArkuszy().dane;
  const wiersze = usePostepyKonta();
  const moje = przedmiot && lista && wiersze
    ? wiersze.filter((w) => {
        const a = lista.find((x) => x.id === w.sheet_id);
        return !!a && (a.przedmiot ?? "angielski") === przedmiot && (!poziom || a.poziom === poziom)
          && (w.data.sprawdzony || (w.data.sprawdzoneZadania?.length ?? 0) > 0);
      })
    : null;
  return useZapytanieNauki(moje && przedmiot && lista ? kluczMapyZArkuszy(przedmiot, poziom, moje) : null,
    () => policzMapeZArkuszy(przedmiot!, moje!, lista!));
}
