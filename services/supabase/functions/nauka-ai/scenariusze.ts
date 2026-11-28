// Scenariusze rundy „Naucz Kolegę” poza stałą listą SCENARIUSZE: tematy generowane przez model pod ucznia.
// Wynik modelu i scenariusz odesłany przez klienta przechodzą ten sam, ścisły walidator: znane pola, ograniczone
// długości, komplet kryteriów i przedmiot zgodny z rundą. Wszystko inne jest odrzucane, bo scenariusz trafia do
// promptu Sędziego (reguła i kryteria) i do ekranu ucznia (tytuł, polecenie, przykład).
import { RUNDY_PRZEDMIOTOW, type PrzedmiotRundy } from "./formaty.ts";

export type Scenariusz = {
  przedmiot: PrzedmiotRundy;
  jezyk: "pl" | "en";
  tytul: string;
  polecenie: string;
  przyklad: string;
  reguła: string;
  kryteria: { blad: string; regula: string; przyklad: string };
};

/** Górne granice długości pól (znaki); dolna to jeden znak po przycięciu. Prompt prosi o krótsze pola (80/300/500/700/200), a walidator zostawia zapas, żeby drobne przekroczenie nie odrzucało całego tematu. */
export const LIMITY_SCENARIUSZA = { tytul: 100, polecenie: 400, przyklad: 700, reguła: 900, kryterium: 280 } as const;
/** Kontekst ucznia z aplikacji (pamięć, fakty, ostatnie błędy, arkusze): opisPamieci() mieści się w ok. 3500 znakach, reszta to lista arkuszy. */
export const MAKS_KONTEKSTU = 4000;

/** Kontekst z żądania: brak pola to pusty tekst, a nie-tekst albo za długi tekst to null. */
export function odczytajKontekst(raw: unknown): string | null {
  if (raw === undefined) return "";
  return typeof raw === "string" && raw.length <= MAKS_KONTEKSTU && ![...raw].some(zakazanyZnak) ? raw.trim() : null;
}

export const MAKS_TEMATOW = 4;
export const MIN_TEMATOW = 2;

const POLA = new Set(["przedmiot", "jezyk", "tytul", "polecenie", "przyklad", "reguła", "kryteria"]);
const KRYTERIA = ["blad", "regula", "przyklad"] as const;

const obiekt = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null);

// Znaki sterujące (poza tabulatorem i nową linią) oraz separatory wierszy Unicode U+2028 i U+2029.
function zakazanyZnak(c: string) {
  const k = c.codePointAt(0)!;
  return (k < 32 && k !== 9 && k !== 10 && k !== 13) || k === 0x2028 || k === 0x2029;
}

function napis(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\r\n?/g, "\n").trim();
  return t && t.length <= max && ![...t].some(zakazanyZnak) ? t : null;
}

/** Przedmiot zgodny z rundą, język zgodny z przedmiotem (angielski po angielsku, reszta po polsku). */
export function odczytajScenariusz(raw: unknown, przedmiot?: PrzedmiotRundy): Scenariusz | null {
  const o = obiekt(raw);
  if (!o || Object.keys(o).some((k) => !POLA.has(k))) return null;
  if (typeof o.przedmiot !== "string" || !Object.hasOwn(RUNDY_PRZEDMIOTOW, o.przedmiot)) return null;
  const p = o.przedmiot as PrzedmiotRundy;
  if (przedmiot && p !== przedmiot) return null;
  if (o.jezyk !== (p === "angielski" ? "en" : "pl")) return null;
  const k = obiekt(o.kryteria);
  if (!k || Object.keys(k).length !== KRYTERIA.length || KRYTERIA.some((id) => !Object.hasOwn(k, id))) return null;
  const tytul = napis(o.tytul, LIMITY_SCENARIUSZA.tytul);
  const polecenie = napis(o.polecenie, LIMITY_SCENARIUSZA.polecenie);
  const przyklad = napis(o.przyklad, LIMITY_SCENARIUSZA.przyklad);
  const regula = napis(o["reguła"], LIMITY_SCENARIUSZA.reguła);
  const blad = napis(k.blad, LIMITY_SCENARIUSZA.kryterium);
  const regulaKryt = napis(k.regula, LIMITY_SCENARIUSZA.kryterium);
  const przykladKryt = napis(k.przyklad, LIMITY_SCENARIUSZA.kryterium);
  if (!tytul || !polecenie || !przyklad || !regula || !blad || !regulaKryt || !przykladKryt) return null;
  return {
    przedmiot: p, jezyk: p === "angielski" ? "en" : "pl", tytul, polecenie, przyklad, reguła: regula,
    kryteria: { blad, regula: regulaKryt, przyklad: przykladKryt },
  };
}

/** Prawidłowe scenariusze z odpowiedzi modelu (najwyżej MAKS_TEMATOW, bez powtórzonych tytułów); złe odpadają pojedynczo. */
export function odczytajTematy(raw: unknown, przedmiot: PrzedmiotRundy): Scenariusz[] {
  if (!Array.isArray(raw)) return [];
  const wynik: Scenariusz[] = [];
  for (const x of raw) {
    // Model dostał przedmiot z żądania, więc przedmiot i język ustalamy sami, a obce pola (np. id) pomijamy.
    const o = obiekt(x);
    // Modele często zapisują klucz bez polskiego znaku („regula”).
    const s = o && odczytajScenariusz({
      ...(o["reguła"] === undefined && o.regula !== undefined ? { "reguła": o.regula } : {}),
      ...Object.fromEntries(Object.entries(o).filter(([k]) => POLA.has(k))),
      przedmiot, jezyk: przedmiot === "angielski" ? "en" : "pl",
    }, przedmiot);
    if (s && !wynik.some((w) => w.tytul.toLowerCase() === s.tytul.toLowerCase())) wynik.push(s);
    if (wynik.length === MAKS_TEMATOW) break;
  }
  return wynik;
}
