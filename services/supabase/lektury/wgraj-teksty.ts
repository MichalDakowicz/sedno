// Ładuje pełne teksty utworów z domeny publicznej (Wolne Lektury) do private.lektury_fragmenty przez ssh i psql.
// Tekstów nie ma w repozytorium: skrypt pobiera je z API Wolnych Lektur i dzieli według struktury (teksty.ts).
//
// Użycie (z katalogu głównego repozytorium):
//   npm run lektury:teksty -- [prefiks-id] [--sucho]
//   SEDNO_DB=sb-sedno-dev-db npm run lektury:teksty        # staging
// Prefiks (np. "lalka", "dziady") ogranicza listę utworów. --sucho tylko pobiera i liczy, niczego nie wysyła.
// Host ssh w SEDNO_SSH (domyślnie michu@192.168.100.6), kontener bazy w SEDNO_DB (domyślnie sb-sedno-db).
import { KATALOG_LEKTUR } from "../functions/ai/katalog-lektur.ts";
import { TOMY_WL } from "../functions/ai/miejsca-lektur.ts";
import { czyDomena } from "./format.ts";
import { type Fragment, kotwiceZHtml, podzielTekst, wytnijTresc } from "./teksty.ts";

const WL = "https://wolnelektury.pl";
const MAX_TXT = 6_000_000;
const MAX_HTML = 12_000_000;
const SLUG = /^[a-z0-9-]{1,140}$/;

async function pobierz(url: string, limit: number): Promise<string | undefined> {
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(60_000) }).catch(() => undefined);
  if (!res?.ok) return;
  const tekst = await res.text();
  return tekst.length <= limit ? tekst : undefined;
}

async function api(slug: string): Promise<Record<string, unknown> | undefined> {
  if (!SLUG.test(slug)) return;
  const tekst = await pobierz(`${WL}/api/books/${slug}/`, 2_000_000);
  try {
    const dane = JSON.parse(tekst ?? "null");
    return dane && typeof dane === "object" ? dane as Record<string, unknown> : undefined;
  } catch {
    return;
  }
}

/** Wszystkie tomy utworu: sam utwór albo jego dzieci (np. Lalka, tom pierwszy i drugi). */
async function ksiazki(slug: string): Promise<{ slug: string; txt: string }[]> {
  const glowna = await api(slug);
  if (!glowna) return [];
  const txtGlownej = typeof glowna.txt === "string" ? glowna.txt : "";
  if (txtGlownej) return [{ slug, txt: txtGlownej }];
  const dzieci = Array.isArray(glowna.children) ? glowna.children.slice(0, 25) : [];
  const wynik: { slug: string; txt: string }[] = [];
  for (const d of dzieci) {
    const dziecko = typeof (d as { slug?: unknown })?.slug === "string" ? await api((d as { slug: string }).slug) : undefined;
    if (dziecko && typeof dziecko.txt === "string" && dziecko.txt) wynik.push({ slug: (d as { slug: string }).slug, txt: dziecko.txt });
  }
  const kolejnosc = TOMY_WL[slug];
  return kolejnosc ? wynik.sort((a, b) => kolejnosc.indexOf(a.slug) - kolejnosc.indexOf(b.slug)) : wynik;
}

export async function fragmentyUtworu(slug: string): Promise<{ fragmenty: Fragment[]; powod?: string }> {
  const tomy = await ksiazki(slug);
  if (!tomy.length) return { fragmenty: [], powod: "brak tekstu w API Wolnych Lektur" };
  const fragmenty: Fragment[] = [];
  for (const [i, tom] of tomy.entries()) {
    if (!/^https:\/\/wolnelektury\.pl\/media\/book\/txt\/[a-z0-9-]+\.txt$/.test(tom.txt)) return { fragmenty: [], powod: "nieoczekiwany adres pliku tekstowego" };
    const surowy = await pobierz(tom.txt, MAX_TXT);
    const tresc = surowy && wytnijTresc(surowy);
    if (!tresc) return { fragmenty: [], powod: "tekst nie jest oznaczony jako domena publiczna albo jest za duży" };
    const html = await pobierz(`${WL}/katalog/lektura/${tom.slug}.html`, MAX_HTML);
    const znanyNumer = TOMY_WL[slug]?.indexOf(tom.slug) ?? -1;
    const numer = rzymskiZLiczby((znanyNumer < 0 ? i : znanyNumer) + 1);
    fragmenty.push(...podzielTekst(tresc, {
      stronaHtml: `${WL}/katalog/lektura/${tom.slug}.html`,
      kotwice: html ? kotwiceZHtml(html) : undefined,
      odNr: fragmenty.length + 1,
      tom: (tomy.length > 1 || znanyNumer >= 0) && slug !== "chlopi" ? `t. ${numer}` : undefined,
      czesc: slug === "chlopi" ? `cz. ${numer}` : undefined,
      rozdzialyRzymskie: slug === "chlopi",
    }));
    await new Promise((r) => setTimeout(r, 300));
  }
  return { fragmenty };
}

const rzymskiZLiczby = (n: number) => ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n] ?? String(n);

function sqlDlaUtworu(utwor: string, fragmenty: Fragment[], znacznik: string): string {
  const lit = (s: string) => {
    if (s.includes(znacznik)) throw new Error("Znacznik literału w danych, uruchom ponownie.");
    return `${znacznik}${s}${znacznik}`;
  };
  const wiersze = fragmenty.map((f) =>
    `(${lit(utwor)}, ${f.nr}, ${f.czesc}, ${lit(f.miejsce)}, ${lit(f.tytulCzesci)}, ${lit(f.tekst)}, ${f.slowa}, ${lit(f.url)})`);
  const partie: string[] = [];
  for (let i = 0; i < wiersze.length; i += 100) {
    partie.push(`insert into private.lektury_fragmenty (utwor, nr, czesc, miejsce, tytul_czesci, tekst, slowa, zrodlo_url) values\n${wiersze.slice(i, i + 100).join(",\n")};`);
  }
  return [`delete from private.lektury_fragmenty where utwor = ${lit(utwor)};`, ...partie].join("\n");
}

if (import.meta.main) {
  const sucho = Deno.args.includes("--sucho");
  const prefiks = Deno.args.find((a) => !a.startsWith("--"));
  const host = Deno.env.get("SEDNO_SSH") ?? "michu@192.168.100.6";
  const kontener = Deno.env.get("SEDNO_DB") ?? "sb-sedno-db";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(kontener)) throw new Error("Nieprawidłowa nazwa kontenera SEDNO_DB.");
  if (!/^[A-Za-z0-9_.@-]+$/.test(host)) throw new Error("Nieprawidłowy host SEDNO_SSH.");
  const utwory = KATALOG_LEKTUR.filter((u) => u.wl && czyDomena(u) && (!prefiks || u.id.startsWith(prefiks)));
  if (!utwory.length) throw new Error(`Brak utworów z Wolnych Lektur dla prefiksu „${prefiks ?? ""}”.`);

  const znacznik = `$t${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}$`;
  let sql = "begin;\n";
  let wgrane = 0;
  for (const u of utwory) {
    const { fragmenty, powod } = await fragmentyUtworu(u.wl!);
    if (!fragmenty.length) {
      console.warn(`POMINIĘTO ${u.id}: ${powod}.`);
      continue;
    }
    const slowa = fragmenty.reduce((s, f) => s + f.slowa, 0);
    console.log(`${u.id}: ${fragmenty.length} fragmentów, ${slowa} słów, ${new Set(fragmenty.map((f) => f.miejsce)).size} miejsc.`);
    sql += `${sqlDlaUtworu(u.id, fragmenty, znacznik)}\n`;
    wgrane++;
  }
  sql += "commit;\n";
  if (!wgrane) throw new Error("Nie pobrano żadnego tekstu.");
  if (sucho) {
    console.log(`Tryb --sucho: ${wgrane} utworów, ${(sql.length / 1e6).toFixed(1)} MB SQL, nic nie wysłano.`);
  } else {
    const proces = new Deno.Command("ssh", {
      args: ["--", host, `docker exec -i ${kontener} psql -U postgres -q -v ON_ERROR_STOP=1`],
      stdin: "piped", stdout: "inherit", stderr: "inherit",
    }).spawn();
    const pisarz = proces.stdin.getWriter();
    await pisarz.write(new TextEncoder().encode(sql));
    await pisarz.close();
    const { code } = await proces.status;
    if (code !== 0) Deno.exit(code);
    console.log(`Wgrano teksty ${wgrane} utworów do ${kontener}.`);
  }
}
