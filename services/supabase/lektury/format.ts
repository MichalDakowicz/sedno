// Format plików lektury (services/supabase/lektury/<id>.json): walidacja i rozłożenie na wiersze tabeli
// private.lektury_elementy. Opis formatu jest w README.md w tym katalogu.
import { KATALOG_LEKTUR, type Utwor } from "../functions/ai/katalog-lektur.ts";

export type Wydarzenie = { nr: number; miejsce: string; kto: string[]; gdzie: string; opis: string };
export type Postac = { imie: string; odmiany: string[]; rola: string; relacje: string; miejsca: string[] };
export type Motyw = { motyw: string; przyklad: string; miejsce: string; cytat?: string };
export type UtworZbioru = { tytul: string; miejsce?: string; opis: string };
export type Zrodlo = { url: string; rodzaj: "utwór" | "opracowanie"; co: string };
export type PlikLektury = {
  id: string; wydarzenia: Wydarzenie[]; postacie: Postac[]; motywy: Motyw[]; utwory?: UtworZbioru[];
  zrodla: Zrodlo[]; do_weryfikacji: string[];
};
export type WierszElementu = {
  utwor: string; rodzaj: "wydarzenie" | "postac" | "motyw" | "utwor" | "zrodlo" | "weryfikacja";
  nr: number; miejsce: string; tekst: string; dane: unknown; zrodlo_url: string | null;
};

// Znacznik ograniczający literał SQL w generowanej migracji; nie może wystąpić w danych.
export const ZNACZNIK_SQL = "$lektury$";
export const MAX_SLOW_CYTATU = 15;

// Utwory z Wolnych Lektur są w domenie publicznej (loader tekstów dodatkowo sprawdza stopkę tekstu),
// więc tylko dla nich wolno cytować w opracowaniu.
export const czyDomena = (u: Utwor) => !!u.wl;
export const utworKatalogu = (id: string) => KATALOG_LEKTUR.find((u) => u.id === id);

const KLUCZE = {
  glowne: ["id", "wydarzenia", "postacie", "motywy", "utwory", "zrodla", "do_weryfikacji"],
  wydarzenie: ["nr", "miejsce", "kto", "gdzie", "opis"],
  postac: ["imie", "odmiany", "rola", "relacje", "miejsca"],
  motyw: ["motyw", "przyklad", "miejsce", "cytat"],
  utwor: ["tytul", "miejsce", "opis"],
  zrodlo: ["url", "rodzaj", "co"],
};

const obiekt = (x: unknown): Record<string, unknown> | undefined =>
  x && typeof x === "object" && !Array.isArray(x) ? x as Record<string, unknown> : undefined;
const tekst = (x: unknown, max: number): x is string => typeof x === "string" && x.trim().length > 0 && x.length <= max;
const listaTekstow = (x: unknown, max: number, minDlugosc = 1): x is string[] =>
  Array.isArray(x) && x.length >= minDlugosc && x.every((t) => tekst(t, max));

function nieznaneKlucze(o: Record<string, unknown>, dozwolone: string[], gdzie: string, bledy: string[]) {
  for (const k of Object.keys(o)) if (!dozwolone.includes(k)) bledy.push(`${gdzie}: nieznane pole „${k}”.`);
}

/** Zwraca listę błędów; pusta lista oznacza poprawny plik. `nazwa` to nazwa pliku bez rozszerzenia. */
export function sprawdzPlikLektury(raw: unknown, nazwa: string): string[] {
  const bledy: string[] = [];
  const p = obiekt(raw);
  if (!p) return [`${nazwa}: plik nie jest obiektem JSON.`];
  nieznaneKlucze(p, KLUCZE.glowne, nazwa, bledy);
  if (p.id !== nazwa) bledy.push(`${nazwa}: pole id („${String(p.id)}”) musi być równe nazwie pliku.`);
  const utwor = typeof p.id === "string" ? utworKatalogu(p.id) : undefined;
  if (!utwor) bledy.push(`${nazwa}: id nie istnieje w katalogu lektur.`);
  const domena = !!utwor && czyDomena(utwor);

  const sekcja = (klucz: "wydarzenia" | "postacie" | "motywy") => {
    if (!Array.isArray(p[klucz])) bledy.push(`${nazwa}: brak tablicy „${klucz}” (może być pusta).`);
    return Array.isArray(p[klucz]) ? p[klucz] as unknown[] : [];
  };

  let poprzedniNr = 0;
  sekcja("wydarzenia").forEach((raw, i) => {
    const g = `${nazwa}.wydarzenia[${i}]`;
    const w = obiekt(raw);
    if (!w) return void bledy.push(`${g}: nie jest obiektem.`);
    nieznaneKlucze(w, KLUCZE.wydarzenie, g, bledy);
    if (!Number.isInteger(w.nr) || (w.nr as number) < 1) bledy.push(`${g}: nr musi być liczbą całkowitą od 1.`);
    else if ((w.nr as number) <= poprzedniNr) bledy.push(`${g}: nr (${w.nr}) musi rosnąć ściśle względem poprzedniego.`);
    else poprzedniNr = w.nr as number;
    if (!tekst(w.miejsce, 120)) bledy.push(`${g}: miejsce jest puste albo za długie (max 120 znaków).`);
    if (!listaTekstow(w.kto, 80)) bledy.push(`${g}: kto to niepusta lista imion lub nazw postaci.`);
    if (typeof w.gdzie !== "string" || w.gdzie.length > 200) bledy.push(`${g}: gdzie to tekst do 200 znaków.`);
    if (!tekst(w.opis, 500)) bledy.push(`${g}: opis jest pusty albo dłuższy niż 500 znaków.`);
  });

  const imiona = new Set<string>();
  sekcja("postacie").forEach((raw, i) => {
    const g = `${nazwa}.postacie[${i}]`;
    const o = obiekt(raw);
    if (!o) return void bledy.push(`${g}: nie jest obiektem.`);
    nieznaneKlucze(o, KLUCZE.postac, g, bledy);
    if (!tekst(o.imie, 80)) bledy.push(`${g}: imie jest puste albo za długie.`);
    else if (imiona.has(o.imie)) bledy.push(`${g}: powtórzone imię „${o.imie}”.`);
    else imiona.add(o.imie);
    if (!listaTekstow(o.odmiany, 60)) bledy.push(`${g}: odmiany to niepusta lista form (mianownik, dopełniacz, …).`);
    if (!tekst(o.rola, 500)) bledy.push(`${g}: rola jest pusta albo za długa.`);
    if (!tekst(o.relacje, 600)) bledy.push(`${g}: relacje są puste albo za długie.`);
    if (!listaTekstow(o.miejsca, 120)) bledy.push(`${g}: miejsca to niepusta lista lokalizacji w utworze.`);
  });

  sekcja("motywy").forEach((raw, i) => {
    const g = `${nazwa}.motywy[${i}]`;
    const m = obiekt(raw);
    if (!m) return void bledy.push(`${g}: nie jest obiektem.`);
    nieznaneKlucze(m, KLUCZE.motyw, g, bledy);
    if (!tekst(m.motyw, 120)) bledy.push(`${g}: motyw jest pusty albo za długi.`);
    if (!tekst(m.przyklad, 600)) bledy.push(`${g}: przyklad jest pusty albo za długi.`);
    if (!tekst(m.miejsce, 120)) bledy.push(`${g}: miejsce jest puste albo za długie.`);
    if (m.cytat !== undefined) {
      if (!tekst(m.cytat, 200)) bledy.push(`${g}: cytat jest pusty albo za długi.`);
      else if (m.cytat.trim().split(/\s+/).length > MAX_SLOW_CYTATU) bledy.push(`${g}: cytat ma więcej niż ${MAX_SLOW_CYTATU} słów.`);
      if (!domena) bledy.push(`${g}: cytat jest dozwolony tylko dla utworów z domeny publicznej (wpis w katalogu bez pola wl).`);
    }
  });

  if (p.utwory !== undefined) {
    if (!Array.isArray(p.utwory)) bledy.push(`${nazwa}: utwory musi być tablicą.`);
    else p.utwory.forEach((raw, i) => {
      const g = `${nazwa}.utwory[${i}]`;
      const u = obiekt(raw);
      if (!u) return void bledy.push(`${g}: nie jest obiektem.`);
      nieznaneKlucze(u, KLUCZE.utwor, g, bledy);
      if (!tekst(u.tytul, 160)) bledy.push(`${g}: tytul jest pusty albo za długi.`);
      if (u.miejsce !== undefined && !tekst(u.miejsce, 120)) bledy.push(`${g}: miejsce jest puste albo za długie.`);
      if (!tekst(u.opis, 600)) bledy.push(`${g}: opis jest pusty albo za długi.`);
    });
  }

  if (!Array.isArray(p.zrodla) || !p.zrodla.length) bledy.push(`${nazwa}: zrodla musi zawierać co najmniej jeden wpis.`);
  else p.zrodla.forEach((raw, i) => {
    const g = `${nazwa}.zrodla[${i}]`;
    const z = obiekt(raw);
    if (!z) return void bledy.push(`${g}: nie jest obiektem.`);
    nieznaneKlucze(z, KLUCZE.zrodlo, g, bledy);
    if (typeof z.url !== "string" || !/^https:\/\/[^\s]+$/.test(z.url) || z.url.length > 1000) bledy.push(`${g}: url musi być adresem https.`);
    if (z.rodzaj !== "utwór" && z.rodzaj !== "opracowanie") bledy.push(`${g}: rodzaj to „utwór” albo „opracowanie”.`);
    if (!tekst(z.co, 300)) bledy.push(`${g}: co jest puste albo za długie.`);
  });

  if (!Array.isArray(p.do_weryfikacji) || !p.do_weryfikacji.every((t) => tekst(t, 400))) {
    bledy.push(`${nazwa}: do_weryfikacji to lista tekstów (może być pusta).`);
  }
  if (!bledy.length && JSON.stringify(p).includes(ZNACZNIK_SQL)) bledy.push(`${nazwa}: dane zawierają zastrzeżony znacznik ${ZNACZNIK_SQL}.`);
  return bledy;
}

/** Rozkłada poprawny plik na wiersze private.lektury_elementy. */
export function wierszeElementow(p: PlikLektury): WierszElementu[] {
  const domyslny = (p.zrodla.find((z) => z.rodzaj === "utwór") ?? p.zrodla[0])?.url ?? null;
  const wiersz = (rodzaj: WierszElementu["rodzaj"], nr: number, miejsce: string, opis: string, dane: unknown, url = domyslny): WierszElementu =>
    ({ utwor: p.id, rodzaj, nr, miejsce, tekst: opis.slice(0, 4000), dane, zrodlo_url: url });
  return [
    ...p.wydarzenia.map((w) => wiersz("wydarzenie", w.nr, w.miejsce, `${w.miejsce}. ${w.kto.join(", ")}. ${w.gdzie}. ${w.opis}`, w)),
    ...p.postacie.map((o, i) => wiersz("postac", i + 1, o.miejsca[0], `${o.imie}. ${o.odmiany.join(", ")}. ${o.rola} ${o.relacje} ${o.miejsca.join("; ")}`, o)),
    ...p.motywy.map((m, i) => wiersz("motyw", i + 1, m.miejsce, `${m.motyw}. ${m.przyklad} ${m.miejsce}. ${m.cytat ?? ""}`, m)),
    ...(p.utwory ?? []).map((u, i) => wiersz("utwor", i + 1, u.miejsce ?? "", `${u.tytul}. ${u.opis}`, u)),
    ...p.zrodla.map((z, i) => wiersz("zrodlo", i + 1, "", z.co, z, z.url)),
    ...p.do_weryfikacji.map((t, i) => wiersz("weryfikacja", i + 1, "", t, { tekst: t })),
  ];
}

const lit = (s: string) => `${ZNACZNIK_SQL}${s}${ZNACZNIK_SQL}`;

/** Idempotentna migracja: dla każdego utworu usuwa jego elementy i wstawia je od nowa. */
export function migracjaElementow(pliki: PlikLektury[]): string {
  const naglowek = [
    "-- Wygenerowano z services/supabase/lektury/*.json przez lektury/generuj.ts. Nie edytuj ręcznie.",
    "-- Migracja jest idempotentna: dla każdego utworu usuwa jego elementy i wstawia je od nowa.",
  ];
  const bloki = [...pliki].sort((a, b) => a.id.localeCompare(b.id)).map((p) => {
    const wiersze = wierszeElementow(p).map((w) =>
      `  (${lit(w.utwor)}, ${lit(w.rodzaj)}, ${w.nr}, ${lit(w.miejsce)}, ${lit(w.tekst)}, ${lit(JSON.stringify(w.dane))}::jsonb, ${w.zrodlo_url ? lit(w.zrodlo_url) : "null"})`);
    return [
      `-- ${p.id}`,
      `delete from private.lektury_elementy where utwor = ${lit(p.id)};`,
      "insert into private.lektury_elementy (utwor, rodzaj, nr, miejsce, tekst, dane, zrodlo_url) values",
      `${wiersze.join(",\n")};`,
    ].join("\n");
  });
  return [...naglowek, "", ...bloki.flatMap((b) => [b, ""])].join("\n");
}

export async function wczytajPlikiLektur(katalog = new URL("./", import.meta.url)): Promise<{ nazwa: string; dane: unknown }[]> {
  const wynik: { nazwa: string; dane: unknown }[] = [];
  for await (const wpis of Deno.readDir(katalog)) {
    if (!wpis.isFile || !wpis.name.endsWith(".json")) continue;
    const nazwa = wpis.name.slice(0, -5);
    wynik.push({ nazwa, dane: JSON.parse(await Deno.readTextFile(new URL(wpis.name, katalog))) });
  }
  return wynik.sort((a, b) => a.nazwa.localeCompare(b.nazwa));
}
