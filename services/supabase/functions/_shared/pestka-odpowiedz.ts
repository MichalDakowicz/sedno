export const AKCJE = {
  krok: "Pokaż następny krok",
  przyklad: "Daj podobny przykład",
  sprawdz: "Sprawdź moją próbę",
  zrodlo: "Pokaż źródło",
} as const;

export type AkcjaPestki = keyof typeof AKCJE;
export const TYPY_ZRODLA = ["karta", "sekcja", "wydarzenie", "postac", "motyw", "utwor", "fragment"] as const;
export type TypZrodla = typeof TYPY_ZRODLA[number];
export type ZrodloPestki = {
  url: string;
  tytul: string;
  rodzaj: "utwór" | "opracowanie";
  sekcja?: string;
  idSekcji?: string;
  miejsce?: string;
  twierdzenie?: string;
  dowod?: string;
  /** Identyfikator materiału Sedno, z którego pochodzi odpowiedź, np. W12, P3, M5, F1, S:geneza, K. */
  id?: string;
  /** Rodzaj materiału: karta lektury, sekcja opracowania, wydarzenie, postać, motyw, utwór zbioru lub fragment tekstu. */
  typ?: TypZrodla;
};
export type SprawdzenieLektury = {
  status: "Potwierdzone" | "Sprzeczne ze źródłem" | "Niepotwierdzone";
  fragment?: string;
  fakt: string;
  podstawa: string;
  teza: string;
  krok: string;
};
export type OdpowiedzPestki = {
  zrodla: ZrodloPestki[];
  akcje: AkcjaPestki[];
  sprawdzenie?: SprawdzenieLektury;
  a2ui?: unknown;
};

export function opisKartyZrodla(z: ZrodloPestki): { link: string; miejsce?: string } {
  const trafiaWMiejsce = z.rodzaj === "utwór" && !!z.miejsce && z.sekcja === z.miejsce &&
    /#[^#]+$/.test(z.url) && !/\d\s*[–—-]\s*\d/.test(z.miejsce);
  const sekcja = trafiaWMiejsce || z.sekcja !== z.miejsce ? z.sekcja : undefined;
  const link = [z.tytul, z.rodzaj === "opracowanie" && "źródło opracowania", sekcja].filter(Boolean).join(" · ");
  return { link, miejsce: trafiaWMiejsce ? undefined : z.miejsce };
}

export function obiektPestki(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

export function napisPestki(raw: unknown, limit: number): string {
  return typeof raw === "string" && raw.length <= limit ? raw.trim() : "";
}

export function zrodloPestki(raw: unknown): ZrodloPestki | undefined {
  const dane = obiektPestki(raw);
  const url = napisPestki(dane.url, 1000);
  const tytul = napisPestki(dane.tytul, 240);
  if (!tytul || (dane.rodzaj !== "utwór" && dane.rodzaj !== "opracowanie")) return;
  try {
    const adres = new URL(url);
    if (adres.protocol !== "https:" || adres.username || adres.password) return;
  } catch {
    return;
  }
  const sekcja = napisPestki(dane.sekcja, 200);
  const idSekcji = napisPestki(dane.idSekcji, 160);
  const miejsce = napisPestki(dane.miejsce, 240);
  const twierdzenie = napisPestki(dane.twierdzenie, 500);
  const dowod = napisPestki(dane.dowod, 400);
  const id = napisPestki(dane.id, 12);
  const typ = TYPY_ZRODLA.find((t) => t === dane.typ);
  return {
    url, tytul, rodzaj: dane.rodzaj, ...(sekcja && { sekcja }),
    ...(/^[a-z0-9-]+\/[a-z0-9-]+$/.test(idSekcji) && { idSekcji }),
    ...(miejsce && { miejsce }), ...(twierdzenie && { twierdzenie }), ...(dowod && { dowod }),
    ...(/^(?:[WPMUF]\d{1,4}|S:[a-z]+|K)$/.test(id) && { id }), ...(typ && { typ }),
  };
}

export function sprawdzeniePestki(raw: unknown): SprawdzenieLektury | undefined {
  const s = obiektPestki(raw);
  const { status } = s;
  if (status !== "Potwierdzone" && status !== "Sprzeczne ze źródłem" && status !== "Niepotwierdzone") return;
  const fragment = napisPestki(s.fragment, 500);
  const fakt = napisPestki(s.fakt, 500);
  const podstawa = napisPestki(s.podstawa, 1000);
  const teza = napisPestki(s.teza, 800);
  const krok = napisPestki(s.krok, 600);
  if (fakt && podstawa && teza && krok) return { status, ...(fragment && { fragment }), fakt, podstawa, teza, krok };
}

export function odczytajOdpowiedzPestki(raw: unknown): OdpowiedzPestki | undefined {
  const dane = obiektPestki(raw);
  if (!Array.isArray(dane.zrodla) || !Array.isArray(dane.akcje)) return;
  const zrodla = dane.zrodla.map(zrodloPestki).filter((z): z is ZrodloPestki => !!z);
  const akcje = [...new Set(dane.akcje.slice(0, 4).filter((a): a is AkcjaPestki =>
    typeof a === "string" && Object.hasOwn(AKCJE, a) && (a !== "zrodlo" || zrodla.length > 0)))];
  const sprawdzenie = sprawdzeniePestki(dane.sprawdzenie);
  return { zrodla, akcje, ...(sprawdzenie && { sprawdzenie }), ...(dane.a2ui ? { a2ui: dane.a2ui } : {}) };
}

// A2UI 1.0, zamknięty podzbiór katalogu podstawowego używany przez edytor.
export function powierzchniaLektury(s: SprawdzenieLektury, pokazZrodlo: boolean) {
  const wiersze = [
    ["status", s.status],
    ...(s.fragment ? [["fragment", `Fragment pracy: „${s.fragment}”`]] : []),
    ["fakt", `Sprawdzony fakt: ${s.fakt}`],
    ["podstawa", `Podstawa: ${s.podstawa}`],
    ["teza", `Związek z tezą: ${s.teza}`],
    ["krok", `Następny krok: ${s.krok}`],
  ].map(([id, text]) => ({ id, component: "Text" as const, text }));
  return {
    version: "1.0",
    createSurface: {
      surfaceId: "sprawdzenie-lektury",
      catalogId: "https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json",
      components: [
        { id: "root", component: "Card" as const, child: "tresc" },
        { id: "tresc", component: "Column" as const, children: [...wiersze.map((w) => w.id), ...(pokazZrodlo ? ["pokaz"] : [])] },
        ...wiersze,
        ...(pokazZrodlo ? [
          { id: "pokaz", component: "Button" as const, child: "pokaz-napis", action: { event: { name: "zrodlo" } } },
          { id: "pokaz-napis", component: "Text" as const, text: AKCJE.zrodlo },
        ] : []),
      ],
    },
  };
}

function uporzadkowane(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw.map(uporzadkowane);
  if (raw && typeof raw === "object") {
    return Object.fromEntries(Object.entries(raw).sort(([a], [b]) => a.localeCompare(b))
      .map(([klucz, wartosc]) => [klucz, uporzadkowane(wartosc)]));
  }
  return raw;
}

export function zatwierdzPowierzchnie(odpowiedz: OdpowiedzPestki) {
  if (!odpowiedz.sprawdzenie || !odpowiedz.a2ui) return;
  const wzorzec = powierzchniaLektury(odpowiedz.sprawdzenie, odpowiedz.akcje.includes("zrodlo"));
  try {
    const json = JSON.stringify(odpowiedz.a2ui);
    if (json.length > 12_000) return;
    if (JSON.stringify(uporzadkowane(odpowiedz.a2ui)) === JSON.stringify(uporzadkowane(wzorzec))) return wzorzec;
  } catch {
    return;
  }
}
