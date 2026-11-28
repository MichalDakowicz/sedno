// Elementy interaktywne w odpowiedzi Pestki (generatywny interfejs). Model pisze zwykły tekst i, gdy to pomaga,
// blok ```sedno-ui z JSON-em. Aplikacja zatwierdza go tym schematem: wszystko spoza niego (nieznany typ,
// obcy adres, zbyt długi tekst) odpada, a odpowiedź zostaje zwykłym tekstem. Plik jest wspólny dla aplikacji
// i testów serwera, więc nie ma w nim zależności od przeglądarki.

export type ElementUi =
  | { typ: "quiz"; pytanie: string; opcje: string[]; poprawna: number; wyjasnienie: string }
  | { typ: "akcje"; przyciski: { etykieta: string; cel: string }[] }
  | { typ: "kroki"; tytul?: string; kroki: string[] }
  | { typ: "fiszki"; karty: { przod: string; tyl: string }[] }
  | { typ: "wykres"; rodzaj: "slupki" | "linia"; tytul?: string; jednostka?: string; dane: { etykieta: string; wartosc: number }[] };

export const MAKS_ELEMENTOW = 2;

const OTWARCIE = /```sedno-ui[ \t]*\r?\n/;
const BLOK = /```sedno-ui[ \t]*\r?\n([\s\S]*?)```/g;

const napis = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.length <= max ? t : null;
};
const lista = <T>(v: unknown, min: number, max: number, czytaj: (x: unknown) => T | null): T[] | null => {
  if (!Array.isArray(v) || v.length < min || v.length > max) return null;
  const wynik = v.map(czytaj);
  return wynik.every((x) => x !== null) ? (wynik as T[]) : null;
};
const obiekt = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

const UMIEJETNOSC = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const ID_ARKUSZA = /^[a-z0-9][a-z0-9-]{2,99}$/;
const STRONY = new Set(["/umiejetnosci", "/nauka", "/nauka/wypracowanie", "/nauka/mapa-wiedzy", "/nauka/diagnoza", "/nauka/uczen-uczy", "/powtorki", "/arkusze", "/do-matury"]);

/** Zwraca adres wewnątrz aplikacji albo null; przyjmuje tylko znane trasy (bez adresów zewnętrznych). */
export function celWewnetrzny(cel: unknown): string | null {
  if (typeof cel !== "string" || cel.length > 200 || !cel.startsWith("/") || cel.startsWith("//")) return null;
  const [bezHasha, hash = null, ...reszta] = cel.split("#");
  if (reszta.length) return null;
  const [sciezka, zapytanie = null, ...inne] = bezHasha!.split("?");
  if (inne.length) return null;
  const parametry = new URLSearchParams(zapytanie ?? "");
  const klucze = [...parametry.keys()];

  if (STRONY.has(sciezka!)) return !zapytanie && !hash ? sciezka! : null;
  if (sciezka === "/nauka/runda") {
    // Runda startuje z umiejętności (poziom bierze z ustawień ucznia), więc bez identyfikatora adres nic nie robi.
    const umiejetnosc = parametry.get("umiejetnosc");
    const ok = !hash && klucze.length === 1 && umiejetnosc !== null && UMIEJETNOSC.test(umiejetnosc);
    return ok ? cel : null;
  }
  const arkusz = /^\/arkusze\/([^/]+)$/.exec(sciezka!);
  if (arkusz && ID_ARKUSZA.test(arkusz[1]!)) {
    // Zadanie w arkuszu albo omówienie błędów sprawdzonego arkusza.
    const ok = klucze.every((k) => k === "omow") && (parametry.get("omow") === null || parametry.get("omow") === "1") &&
      (hash === null || /^zadanie-\d{1,3}$/.test(hash));
    return ok ? cel : null;
  }
  return null;
}

function quiz(d: Record<string, unknown>): ElementUi | null {
  const pytanie = napis(d.pytanie, 300);
  const opcje = lista(d.opcje, 2, 4, (o) => napis(o, 200));
  const wyjasnienie = napis(d.wyjasnienie, 500);
  const poprawna = typeof d.poprawna === "string" ? "ABCD".indexOf(d.poprawna) : typeof d.poprawna === "number" ? d.poprawna : -1;
  if (!pytanie || !opcje || !wyjasnienie || !Number.isInteger(poprawna) || poprawna < 0 || poprawna >= opcje.length) return null;
  return { typ: "quiz", pytanie, opcje, poprawna, wyjasnienie };
}

function akcje(d: Record<string, unknown>): ElementUi | null {
  const przyciski = lista(d.przyciski, 1, 3, (p) => {
    const o = obiekt(p);
    const etykieta = napis(o?.etykieta, 40);
    const cel = celWewnetrzny(o?.cel);
    return etykieta && cel ? { etykieta, cel } : null;
  });
  return przyciski ? { typ: "akcje", przyciski } : null;
}

function kroki(d: Record<string, unknown>): ElementUi | null {
  const kroki_ = lista(d.kroki, 2, 8, (k) => napis(k, 300));
  const tytul = d.tytul === undefined ? undefined : napis(d.tytul, 80);
  if (!kroki_ || tytul === null) return null;
  return { typ: "kroki", ...(tytul && { tytul }), kroki: kroki_ };
}

function fiszki(d: Record<string, unknown>): ElementUi | null {
  const karty = lista(d.karty, 2, 8, (k) => {
    const o = obiekt(k);
    const przod = napis(o?.przod, 120);
    const tyl = napis(o?.tyl, 300);
    return przod && tyl ? { przod, tyl } : null;
  });
  return karty ? { typ: "fiszki", karty } : null;
}

function wykres(d: Record<string, unknown>): ElementUi | null {
  if (d.rodzaj !== "slupki" && d.rodzaj !== "linia") return null;
  const dane = lista(d.dane, 2, 12, (p) => {
    const o = obiekt(p);
    const etykieta = napis(o?.etykieta, 24);
    return etykieta && typeof o?.wartosc === "number" && Number.isFinite(o.wartosc) && o.wartosc >= 0 && o.wartosc <= 1e6
      ? { etykieta, wartosc: o.wartosc } : null;
  });
  const tytul = d.tytul === undefined ? undefined : napis(d.tytul, 80);
  const jednostka = d.jednostka === undefined ? undefined : napis(d.jednostka, 8);
  if (!dane || tytul === null || jednostka === null) return null;
  return { typ: "wykres", rodzaj: d.rodzaj, ...(tytul && { tytul }), ...(jednostka && { jednostka }), dane };
}

const CZYTAJ: Record<string, (d: Record<string, unknown>) => ElementUi | null> = { quiz, akcje, kroki, fiszki, wykres };

/** Pojedynczy element z JSON-a modelu; null, gdy nie spełnia schematu. */
export function odczytajElementUi(raw: unknown): ElementUi | null {
  const o = obiekt(raw);
  return o && typeof o.typ === "string" && Object.hasOwn(CZYTAJ, o.typ) ? CZYTAJ[o.typ]!(o) : null;
}

/**
 * Rozdziela odpowiedź na tekst bez bloków sedno-ui i zatwierdzone elementy (najwyżej MAKS_ELEMENTOW).
 * Niedokończony blok na końcu strumienia znika z tekstu, nieprawidłowy blok też (bez elementu).
 */
export function rozdzielUi(odpowiedz: string): { tekst: string; elementy: ElementUi[] } {
  const elementy: ElementUi[] = [];
  let tekst = odpowiedz.replace(BLOK, (_, json: string) => {
    try {
      const dane: unknown = JSON.parse(json);
      const elementyModelu = obiekt(dane)?.elementy;
      const lista_ = Array.isArray(dane) ? dane : Array.isArray(elementyModelu) ? elementyModelu : [dane];
      for (const e of lista_) {
        const el = odczytajElementUi(e);
        if (el && elementy.length < MAKS_ELEMENTOW) elementy.push(el);
      }
    } catch { /* nieprawidłowy JSON: zostaje sam tekst */ }
    return "";
  });
  const otwarty = OTWARCIE.exec(tekst);
  if (otwarty) tekst = tekst.slice(0, otwarty.index);
  else tekst = tekst.replace(/```s(?:e(?:d(?:n(?:o(?:-(?:ui?)?)?)?)?)?)?[ \t]*$/, "");
  return { tekst: tekst.replace(/\n{3,}/g, "\n\n").trimEnd(), elementy };
}
