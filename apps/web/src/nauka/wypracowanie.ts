// Ćwiczenie wypracowania z polskiego (matura, poziom podstawowy, formuła 2023): temat od Pestki, plan, pisanie, ocena.
// Wszystko przez bramkę AI z klienta (ai.ts); szkic leży w pamięci przeglądarki, jeden na konto.
import { AiError, askAi, streamAi, type AiMessage } from "../ai";
import { json } from "../arkusze/omowienie";
import { liczSlowa } from "../arkusze/sprawdz";
import { BladPestki } from "./ai";
import type { Utwor } from "../../../../services/supabase/functions/ai/katalog-lektur";

export type Etap = "temat" | "plan" | "pisanie" | "ocena";
export type Temat = { tekst: string; lektury: string[] };
export type Plan = { lektura: string; stanowisko: string; argumenty: string[]; konteksty: string };
export type StatusPlanu = "dobrze" | "do-poprawy" | "do-zrobienia" | "niepewne";
export type UwagiDoPlanu = { statusy: Record<string, StatusPlanu>; uwaga: string; pytanie: string };
export type WierszOceny = { id: string; punkty: number; komentarz: string };
export type Poprawka = { akapit: number; tekst: string };
export type Ocena = { kryteria: WierszOceny[]; poprawki: Poprawka[]; podsumowanie: string; slowa: number };
export type Szkic = {
  etap: Etap;
  temat: Temat | null;
  plan: Plan;
  tekst: string;
  uwagiPlanu: UwagiDoPlanu | null;
  ocena: Ocena | null;
  /** Tekst, który Pestka oceniła; po zmianie ocena jest nieaktualna. */
  ocenionyTekst: string;
  /** Zawężenie tematu: epoka albo jedna lektura (pusto: dowolnie). */
  wybor: { epoka: string; lektura: string };
  /** Ostatnie tematy, żeby Pestka ich nie powtarzała. */
  byly: string[];
};

export const MIN_SLOW = 300;
export const pustyPlan = (lektura = ""): Plan => ({ lektura, stanowisko: "", argumenty: ["", ""], konteksty: "" });
const pustySzkic = (): Szkic => ({ etap: "temat", temat: null, plan: pustyPlan(), tekst: "", uwagiPlanu: null, ocena: null, ocenionyTekst: "", wybor: { epoka: "", lektura: "" }, byly: [] });

// Tematy z arkuszy CKE (maj 2024, poziom podstawowy) na wypadek, gdy Pestka jest niedostępna.
const TEMATY_ZAPASOWE = ["Bunt i jego konsekwencje dla człowieka.", "Jak relacja z drugą osobą kształtuje człowieka?"];
export const tematZapasowy = (byly: string[]): Temat => ({ tekst: TEMATY_ZAPASOWE.find((t) => !byly.includes(t)) ?? TEMATY_ZAPASOWE[0]!, lektury: [] });

// Szkic z pierwszej wersji ekranu (sam tekst pod stałym tematem) przechodzi do nowej z tym samym tematem.
const STARY_TEMAT = "Jak wybory bohatera wpływają na jego relacje z innymi?";

export function wczytajSzkic(user: string): Szkic {
  try {
    const zapis = localStorage.getItem(`sedno.wypracowanie-polski.v2:${user}`);
    if (zapis) {
      const s = JSON.parse(zapis) as Partial<Szkic>;
      const plan = { ...pustyPlan(), ...s.plan };
      if (!Array.isArray(plan.argumenty) || plan.argumenty.length < 2) plan.argumenty = ["", ""];
      return { ...pustySzkic(), ...s, plan, wybor: { ...pustySzkic().wybor, ...s.wybor }, byly: Array.isArray(s.byly) ? s.byly : [] };
    }
    const stary = localStorage.getItem(`sedno.wypracowanie-polski:${user}`);
    if (stary?.trim()) return { ...pustySzkic(), etap: "pisanie", temat: { tekst: STARY_TEMAT, lektury: [] }, tekst: stary };
  } catch {
    // Uszkodzony zapis albo brak dostępu do pamięci: zaczynamy od nowa.
  }
  return pustySzkic();
}

export function zapiszSzkic(user: string, s: Szkic) {
  try {
    localStorage.setItem(`sedno.wypracowanie-polski.v2:${user}`, JSON.stringify(s));
  } catch {
    // Brak miejsca lub dostępu do pamięci przeglądarki.
  }
}

// Katalog lektur z bramki (ten sam plik co na serwerze), ładowany dopiero na tym ekranie.
export type Lektura = Pick<Utwor, "id" | "tytul" | "autor"> & { epoka: string };

export const EPOKI = [
  "Starożytność", "Średniowiecze", "Renesans", "Barok", "Oświecenie", "Romantyzm", "Pozytywizm", "Młoda Polska",
  "Dwudziestolecie międzywojenne", "Wojna i okupacja", "Literatura powojenna", "Po 1989 roku",
] as const;

// Epoki w katalogu są opisowe („renesans i wczesny barok”); do wyboru sprowadzamy je do szkolnego podziału.
function epokaSzkolna(opis: string): string {
  const e = opis.toLowerCase();
  const reguly: [RegExp, string][] = [
    [/starożyt|antyk/, "Starożytność"], [/średniow/, "Średniowiecze"], [/renesans/, "Renesans"], [/barok/, "Barok"],
    [/oświec/, "Oświecenie"], [/romantyzm/, "Romantyzm"], [/pozytywizm|realizm xix/, "Pozytywizm"], [/młoda polska/, "Młoda Polska"],
    [/dwudziestolecie|modernizm/, "Dwudziestolecie międzywojenne"], [/wojn|okupac/, "Wojna i okupacja"], [/po 1989/, "Po 1989 roku"],
  ];
  return reguly.find(([r]) => r.test(e))?.[1] ?? "Literatura powojenna";
}

let katalog: Promise<Lektura[]> | null = null;
/** Lektury obowiązkowe z poziomu podstawowego (te, do których można odwołać się w wypracowaniu). */
export function wczytajLektury(): Promise<Lektura[]> {
  katalog ??= import("../../../../services/supabase/functions/ai/katalog-lektur").then(({ KATALOG_LEKTUR }) =>
    KATALOG_LEKTUR.filter((u) => u.poziom === "podstawowy" && u.zakres !== "do_weryfikacji")
      .map((u) => ({ id: u.id, tytul: u.tytul, autor: u.autor, epoka: epokaSzkolna(u.epoka) })))
    .catch((e) => {
      katalog = null;
      throw e;
    });
  return katalog;
}

export const nazwaLektury = (l: Lektura) => (l.autor.startsWith("Autor") ? l.tytul : `${l.tytul} (${l.autor})`);

// Błąd bramki w kształcie, który rozumie BladPestki (komunikat i ponowienie jak na innych ekranach nauki).
const naBlad = (e: unknown) => (e instanceof AiError ? new BladPestki(e.code, e.status) : e);
const bezGwiazdek = (s: string) => s.replace(/\*\*|__/g, "").trim();

export async function generujTemat(lektury: Lektura[], opcje: { epoka?: string; lektura?: string; byly: string[] }): Promise<Temat> {
  const wybrana = lektury.find((l) => l.id === opcje.lektura);
  const pula = wybrana ? [wybrana] : opcje.epoka ? lektury.filter((l) => l.epoka === opcje.epoka) : lektury;
  const lista = pula.map((l) => `${l.id}: ${l.tytul}, ${l.autor} (${l.epoka})`).join("\n");
  // Bez losowego punktu wyjścia model przy tym samym prompcie daje w kółko ten sam temat.
  const iskra = wybrana ? [] : [...pula].sort(() => Math.random() - 0.5).slice(0, 2).map((l) => l.tytul);
  const messages: AiMessage[] = [
    {
      role: "system",
      content: [
        "Układasz temat wypracowania na maturę z języka polskiego, poziom podstawowy, formuła 2023 (CKE).",
        "Temat to krótki problem ogólnoludzki: pytanie albo równoważnik zdania, 4–12 słów, bez nazw utworów i bohaterów.",
        "Wzór stylu: „Bunt i jego konsekwencje dla człowieka.”, „Jak relacja z drugą osobą kształtuje człowieka?”, „Czy warto poświęcić się dla innych?”.",
        "Temat ma dać się dobrze rozwinąć na podstawie lektur z listy poniżej (lektura obowiązkowa + inny utwór + konteksty).",
        wybrana ? `Uczeń chce pisać o lekturze: ${wybrana.tytul}. Temat musi do niej pasować, a jej id stoi pierwsze w polu lektury.` : "",
        iskra.length ? `Punkt wyjścia: problem, który dobrze widać w utworach ${iskra.join(" i ")} (temat nadal ogólny, bez tytułów).` : "",
        opcje.byly.length ? `Nie powtarzaj tych tematów ani ich problemu: ${opcje.byly.slice(-8).join(" | ")}` : "",
        'Odpowiadasz wyłącznie JSON-em: {"temat": "...", "lektury": ["id", "id"]}. W lektury 2–3 id z listy, które najlepiej pasują do tematu.',
        "Lista lektur obowiązkowych (id: tytuł):",
        lista,
      ].filter(Boolean).join("\n"),
    },
    { role: "user", content: "Podaj nowy temat." },
  ];
  let wynik;
  try {
    wynik = await askAi({ tier: "wazne", task: "wypracowanie-temat", temperature: 1, maxTokens: 300, messages });
  } catch (e) {
    throw naBlad(e);
  }
  const t = json<{ temat?: unknown; lektury?: unknown }>(wynik.text);
  const tekst = typeof t?.temat === "string" ? bezGwiazdek(t.temat) : "";
  if (!tekst || tekst.length > 200) throw new BladPestki("bad_model_response", 424);
  const znane = new Set(lektury.map((l) => l.id));
  const ids = (Array.isArray(t?.lektury) ? t.lektury : []).filter((x): x is string => typeof x === "string" && znane.has(x));
  if (wybrana && !ids.includes(wybrana.id)) ids.unshift(wybrana.id);
  return { tekst, lektury: [...new Set(ids)].slice(0, 3) };
}

/** Kryteria planu: te same klucze dostaje model. */
export const KRYTERIA_PLANU: Record<string, string> = {
  stanowisko: "Stanowisko odpowiada na temat",
  lektura: "Argument z lektury obowiązkowej",
  drugi: "Argument z innego utworu",
  konteksty: "Konteksty",
};

function opisPlanu(temat: string, plan: Plan, lektura?: Lektura) {
  return [
    `Temat: ${temat}`,
    `Lektura obowiązkowa: ${lektura ? nazwaLektury(lektura) : "(nie wybrano)"}`,
    `Stanowisko: ${plan.stanowisko.trim() || "(puste)"}`,
    ...plan.argumenty.map((a, i) => `Argument ${i + 1}: ${a.trim() || "(pusty)"}`),
    `Konteksty: ${plan.konteksty.trim() || "(puste)"}`,
  ].join("\n");
}

export async function sprawdzPlan(temat: string, plan: Plan, lektura: Lektura | undefined, signal?: AbortSignal): Promise<UwagiDoPlanu> {
  const messages: AiMessage[] = [
    {
      role: "system",
      content: [
        "Jesteś Pestką, tutorką do matury z polskiego; mówisz o sobie w rodzaju żeńskim, do ucznia bez form męskich i żeńskich.",
        "Uczeń planuje wypracowanie (matura, poziom podstawowy). Oceniasz plan. Nie piszesz wypracowania, tezy ani gotowych argumentów.",
        "Kryteria (klucz: co sprawdzasz):",
        "stanowisko: stanowisko odpowiada wprost na problem z tematu, nie jest ogólnikiem;",
        "lektura: argument oparty na konkretnej scenie lub postaci z lektury obowiązkowej, funkcjonalny wobec tematu (streszczenie to nie argument); błąd rzeczowy w lekturze to „do-poprawy”, bo w wypracowaniu kosztuje punkty albo całą pracę;",
        "drugi: drugi argument z innego utworu literackiego (może być wiersz), też powiązany z tematem;",
        "konteksty: najlepiej dwa konteksty (np. historyczny, filozoficzny, biblijny, biograficzny), związane z argumentami.",
        "Status: dobrze, do-poprawy, do-zrobienia (puste) albo niepewne (nie umiesz ocenić).",
        'Odpowiadasz wyłącznie JSON-em: {"statusy": {"stanowisko": "...", "lektura": "...", "drugi": "...", "konteksty": "..."}, "uwaga": "jedno zdanie: co w planie jest mocne", "pytanie": "jedno pytanie naprowadzające do najsłabszego punktu"}.',
      ].join("\n"),
    },
    { role: "user", content: opisPlanu(temat, plan, lektura) },
  ];
  let wynik;
  try {
    wynik = await askAi({ tier: "wazne", task: "wypracowanie-plan", maxTokens: 600, messages });
  } catch (e) {
    throw naBlad(e);
  }
  if (signal?.aborted) throw new DOMException("Przerwane", "AbortError");
  const u = json<Partial<UwagiDoPlanu>>(wynik.text);
  const dozwolone = new Set<StatusPlanu>(["dobrze", "do-poprawy", "do-zrobienia", "niepewne"]);
  const statusy = Object.fromEntries(Object.keys(KRYTERIA_PLANU).map((k) => {
    const s = u?.statusy?.[k];
    return [k, s && dozwolone.has(s) ? s : "niepewne"];
  })) as Record<string, StatusPlanu>;
  if (!u || typeof u.pytanie !== "string") throw new BladPestki("bad_model_response", 424);
  return { statusy, uwaga: typeof u.uwaga === "string" ? bezGwiazdek(u.uwaga) : "", pytanie: bezGwiazdek(u.pytanie) };
}

// Kryteria i punkty z „Zasad oceniania rozwiązań zadań”, arkusz 2 (wypracowanie), poziom podstawowy, CKE, maj 2024 (razem 35 pkt).
// Krótkie nazwy kryteriów są nasze; opisy w prompcie streszczają progi z dokumentu, nie cytują go. Progi interpunkcji
// są przybliżone (przyjęte jak w ortografii, nie sprawdzone w dokumencie).
export const KRYTERIA_OCENY: { id: string; nazwa: string; max: number }[] = [
  { id: "formalne", nazwa: "Warunki formalne", max: 1 },
  { id: "klik", nazwa: "Kompetencje literackie i kulturowe", max: 16 },
  { id: "struktura", nazwa: "Struktura wypowiedzi", max: 3 },
  { id: "spojnosc", nazwa: "Spójność", max: 3 },
  { id: "styl", nazwa: "Styl", max: 1 },
  { id: "jezyk", nazwa: "Zakres i poprawność języka", max: 7 },
  { id: "ortografia", nazwa: "Ortografia", max: 2 },
  { id: "interpunkcja", nazwa: "Interpunkcja", max: 2 },
];
export const MAX_PUNKTOW = KRYTERIA_OCENY.reduce((s, k) => s + k.max, 0);

const ZASADY_OCENY = `Kryteria (klucz, maksimum, skrót zasad CKE):
formalne, 1: brak błędu kardynalnego ORAZ odwołanie do lektury obowiązkowej ORAZ praca przynajmniej częściowo dotyczy problemu z tematu ORAZ jest przynajmniej częściowo argumentacyjna. Plan albo punkty zamiast tekstu: 0. Gdy 0, wszystkie inne kryteria też 0.
klik, 16: funkcjonalność dwóch utworów (lektura obowiązkowa + inny utwór): oba w pełni funkcjonalnie 13–16, jeden w pełni i drugi częściowo 9–12, oba częściowo albo jeden w pełni a drugi niefunkcjonalnie 5–8, tylko jeden częściowo 1–4, żaden 0. W przedziale decyduje poziom argumentacji (bogata, zadowalająca, powierzchowna), funkcjonalne użycie kontekstów (najwyżej przy dwóch) i erudycja. Za każdy błąd rzeczowy minus 1 pkt. Streszczenie to nie argument. Gdy klik = 0, kompozycja i język też 0.
struktura, 3: elementy treści zorganizowane problemowo (nie tylko według kolejnych utworów) i poprawny podział: wstęp, część zasadnicza, zakończenie oraz akapity. Organizacja tylko formalna albo częściowo problemowa: najwyżej 2.
spojnosc, 3: do 2 zaburzeń logiki lub uporządkowania 3, 3–5 zaburzeń 2, 6–8 albo wstęp lub zakończenie niespójne z resztą 1, więcej 0.
styl, 1: styl stosowny do odmiany pisanej i sytuacji.
jezyk, 7: zakres środków (szeroki, zadowalający, wąski) i liczba błędów językowych; szeroki z najwyżej 5 błędami 7, zadowalający z najwyżej 5 błędami 6, każdy kolejny próg błędów (6–8, 9–11, 12–14…) minus 1.
ortografia, 2: najwyżej 1 błąd 2, 2–4 błędy 1, 5 i więcej 0.
interpunkcja, 2: oceniasz według liczby błędów interpunkcyjnych, progi jak w ortografii (brak cudzysłowu w tytule utworu to błąd).
Praca poniżej ${MIN_SLOW} wyrazów: oceniasz tylko formalne i klik, reszta 0.`;

/** Każda linia odpowiedzi to jeden wpis; część gotowych linii pokazujemy, zanim model skończy. */
export function czytajOcene(tekst: string, slowa: number, koniec: boolean): Ocena {
  const linie = tekst.split("\n");
  if (!koniec) linie.pop();
  const kryteria: WierszOceny[] = [];
  const poprawki: Poprawka[] = [];
  let podsumowanie = "";
  for (const surowa of linie) {
    const [typ, ...reszta] = bezGwiazdek(surowa).split("|").map((x) => x.trim());
    if (typ === "K" && reszta.length >= 2) {
      const def = KRYTERIA_OCENY.find((k) => k.id === reszta[0]);
      const punkty = Number(reszta[1]);
      if (def && Number.isFinite(punkty) && !kryteria.some((k) => k.id === def.id)) {
        kryteria.push({ id: def.id, punkty: Math.max(0, Math.min(def.max, Math.round(punkty))), komentarz: reszta.slice(2).join(" | ") });
      }
    } else if (typ === "P" && reszta.length >= 2 && poprawki.length < 3) {
      poprawki.push({ akapit: Math.max(0, Number.parseInt(reszta[0]!, 10) || 0), tekst: reszta.slice(1).join(" | ") });
    } else if (typ === "S" && reszta.length) {
      podsumowanie = reszta.join(" | ");
    }
  }
  return { kryteria, poprawki, podsumowanie, slowa };
}

export const akapity = (tekst: string) => tekst.split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean);

export async function ocenWypracowanie(
  temat: string, plan: Plan, lektura: Lektura | undefined, tekst: string, onOcena: (o: Ocena) => void, signal?: AbortSignal,
): Promise<Ocena> {
  const slowa = liczSlowa(tekst);
  const numerowane = akapity(tekst).map((a, i) => `[${i + 1}] ${a}`).join("\n\n");
  const messages: AiMessage[] = [
    {
      role: "system",
      content: [
        "Jesteś Pestką, tutorką do matury z polskiego; mówisz o sobie w rodzaju żeńskim, do ucznia w drugiej osobie bez form męskich i żeńskich.",
        "Oceniasz wypracowanie jak egzaminator CKE (matura, poziom podstawowy, formuła 2023): uczciwie, według tego, co w pracy jest, nie tego, co mogłoby być.",
        "Wymagania tematu: lektura obowiązkowa, inny utwór literacki, wybrane konteksty, co najmniej 300 wyrazów, wypowiedź argumentacyjna.",
        ZASADY_OCENY,
        "Format odpowiedzi: same linie, bez markdownu i bez innego tekstu.",
        "Najpierw osiem linii kryteriów w podanej kolejności: K|klucz|punkty|jedno krótkie zdanie uzasadnienia.",
        "Gdy kryterium ma 0 tylko dlatego, że wyzerowało je inne kryterium albo praca jest za krótka, zostaw uzasadnienie puste (K|klucz|0|), bez powtarzania powodu.",
        "Potem 2–3 linie poprawek, od najważniejszej: P|numer akapitu (0 = cała praca)|konkretnie, co zmienić i jak, z krótkim cytatem z pracy, gdy pomaga; bez pisania akapitu za ucznia.",
        "Na końcu jedna linia: S|jedno–dwa zdania od Pestki: co już działa i od czego zacząć poprawę.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [opisPlanu(temat, plan, lektura), `Liczba wyrazów (policzona): ${slowa}`, "Wypracowanie, akapity numerowane:", numerowane || "(puste)"].join("\n\n"),
    },
  ];
  let calosc = "";
  try {
    const odp = await streamAi({ tier: "wazne", task: "omowienie-wypracowania-polski", messages }, (d) => {
      calosc += d;
      onOcena(czytajOcene(calosc, slowa, false));
    }, signal);
    calosc = odp.text || calosc;
  } catch (e) {
    throw naBlad(e);
  }
  const ocena = czytajOcene(calosc, slowa, true);
  if (ocena.kryteria.length < KRYTERIA_OCENY.length - 2) throw new BladPestki("bad_model_response", 424);
  return ocena;
}

export const sumaPunktow = (o: Ocena) => o.kryteria.reduce((s, k) => s + k.punkty, 0);
