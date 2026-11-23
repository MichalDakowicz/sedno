import { napisPestki, obiektPestki, zrodloPestki, type ZrodloPestki } from "../_shared/pestka-odpowiedz.ts";
import { KATALOG_LEKTUR, type Utwor } from "./katalog-lektur.ts";

export const bezAkcentow = (t: string) => t.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/\p{M}/gu, "");

export const SEKCJE = {
  streszczenie: "Krótkie streszczenie",
  wydarzenia: "Plan wydarzeń",
  geneza: "Geneza",
  bohaterowie: "Bohaterowie i relacje",
  motywy: "Motywy",
  konteksty: "Konteksty",
};

export type Sekcja = keyof typeof SEKCJE;
export type Material = { zrodlo: ZrodloPestki; tekst: string; sekcja?: Sekcja };
export type CelLektury = { tytul: string; fakt: string; cytat?: string; fragment?: string; potwierdzCytat?: boolean };
export type SzukajBaza = (p: { p_przedmiot: string; p_utwor: string | null; p_sekcja: Sekcja | null; p_pytanie: string }) => Promise<unknown>;

const zapisTytulu = (tekst: string) => bezAkcentow(tekst).replace(/[^a-z0-9*]+/g, " ").trim();
const wzorzecAliasu = (alias: string) => zapisTytulu(alias).replaceAll("*", "[a-z]*").replaceAll(" ", "\\W+");
const wzorzecAliasow = (aliasy: readonly string[]) => aliasy.length
  ? new RegExp(`\\b(?:${aliasy.map(wzorzecAliasu).sort((a, b) => b.length - a.length).join("|")})\\b`, "g")
  : undefined;

const wyszukiwalne = KATALOG_LEKTUR.map((utwor) => {
  const { cykl } = utwor;
  const nazwaCyklu = cykl && `(?:${cykl.nazwy.map(wzorzecAliasu).join("|")})`;
  const numer = "(?:iv|iii|ii|i|[1-4])";
  return {
    utwor,
    tytuly: wzorzecAliasow(cykl ? utwor.tytuly ?? [] : [utwor.tytul, ...utwor.tytuly ?? []]),
    wskazowki: wzorzecAliasow(utwor.wskazowki ?? []),
    autor: wzorzecAliasow(utwor.autor ? [utwor.autor.split(" ").at(-1)! + "*"] : []),
    czesci: cykl && new RegExp(
      `\\b(?:${nazwaCyklu}\\W+(?:(?:cz|czesc\\w*)\\W+)?(${numer})|(${numer})\\W+czesc\\w*\\W+${nazwaCyklu}|czesc\\w*\\W+(${numer})\\W+${nazwaCyklu})\\b`, "g",
    ),
  };
});

export function utworPytania(tekst: string, kanoniczny = false): Utwor | undefined {
  const pytanie = bezAkcentow(tekst);
  const cytowane = [...pytanie.matchAll(/[„«“"]([^”»"„]+)[”»“"]/g)].map((m) => zapisTytulu(m[1]));
  const kontekst = maKontekstLiteracki(pytanie);
  const trafienia = wyszukiwalne.flatMap(({ utwor, tytuly, wskazowki, autor, czesci }) => {
    const czesciWymienione = czesci ? [...pytanie.matchAll(czesci)] : [];
    if (czesciWymienione.length) {
      if (!czesciWymienione.every((m) => utwor.cykl?.numery.includes(m[1] ?? m[2] ?? m[3]))) return [];
      return czesciWymienione.map((m) => ({ utwor, ranga: 2, od: m.index, do: m.index + m[0].length }));
    }
    const nazwy = tytuly ? [...pytanie.matchAll(tytuly)] : [];
    const jawne = nazwy.filter((m) => !utwor.niejednoznaczny || kontekst ||
      (autor && [...pytanie.matchAll(autor)].length > 0) || cytowane.includes(zapisTytulu(m[0])) ||
      (kanoniczny && zapisTytulu(m[0]) === zapisTytulu(pytanie)));
    if (jawne.length) return jawne.map((m) => ({ utwor, ranga: 2, od: m.index, do: m.index + m[0].length }));
    return wskazowki && [...pytanie.matchAll(wskazowki)].length
      ? [{ utwor, ranga: 1, od: 0, do: 0 }] : [];
  });
  const jawne = trafienia.filter((t) => t.ranga === 2 && !trafienia.some((inne) =>
    inne.ranga === 2 && inne.od <= t.od && inne.do >= t.do && inne.do - inne.od > t.do - t.od));
  const kandydaci = jawne.length ? jawne : trafienia;
  const pasujace = new Set(kandydaci.filter(({ utwor }) =>
    !trafienia.some((t) => t.utwor.nadrzedna === utwor.id)).map((t) => t.utwor));
  return pasujace.size === 1 ? pasujace.values().next().value : undefined;
}

export function nierozpoznanaCzesc(tekst: string): Utwor | undefined {
  const zapis = bezAkcentow(tekst);
  return wyszukiwalne.find(({ czesci }) => czesci && [...zapis.matchAll(czesci)].length)?.utwor;
}

export const prosiOCytat = (pytanie: string) => /cytat|cytuj|zacytuj|doslown|brzmia? slowa|dokladne slowa/.test(bezAkcentow(pytanie));
export const chceZweryfikowac = (pytanie: string) =>
  /^(?:czy\b|sprawdz|zweryfikuj)|potwierdz|zrodlo (?:na to|dla twierdzenia)/.test(bezAkcentow(pytanie));
const STRESZCZENIE = /stres(?:zcz|c)|o czym (?:jest|opowiada)|fabul|co to za (?:utwor|ksiazka|powiesc|komedia|dramat)|opowiedz (?:mi )?o /;
const maKontekstLiteracki = (pytanie: string) =>
  /stres(?:zcz|c)|fabul|lektur|powies|komedi|dramat|bohater|motyw|tytul|rozdzial|wypracowan|rozpraw|plan wydarzen|utwor|opowiadani|\bw (?:akcie|scenie)\b/.test(pytanie);

export const pytaOLekture = (pytanie: string) =>
  /\b(?:stres(?:zcz|c)|plan wydarzen|fabul|lektur|czesc|rozdzial|akt|utwor|powies|dramat)\w*/.test(bezAkcentow(pytanie));

export function czyWyszukacLekture(pytanie: string, przedmiot?: string, utwor = utworPytania(pytanie)): boolean {
  if (utwor) return true;
  return (prosiOCytat(pytanie) && (przedmiot === "polski" || maKontekstLiteracki(bezAkcentow(pytanie)))) ||
    (chceZweryfikowac(pytanie) && maKontekstLiteracki(bezAkcentow(pytanie)));
}

export function sekcjaPytania(pytanie: string): Sekcja | null {
  const zapis = bezAkcentow(pytanie);
  if (/plan wydarzen|(?:przebieg|kolejnosc) (?:fabuly|wydarzen)/.test(zapis)) return "wydarzenia";
  if (STRESZCZENIE.test(zapis)) return "streszczenie";
  if (/genez|kiedy .{0,18}(wydan|powsta|napisan)|skad .{0,15}tytul/.test(zapis)) return "geneza";
  if (/kontekst|epok/.test(zapis)) return "konteksty";
  if (/motyw|symbol|tematyk|interpretac|zinterpretuj|argument|rozpraw/.test(zapis)) return "motywy";
  if (/kim (?:jest|byl|byla)|bohater|jak(?:ie|a) relac|charakteryz/.test(zapis)) return "bohaterowie";
  if (/szczegolow|przebieg|kolejnosc|wydarzeni/.test(zapis) && !chceZweryfikowac(pytanie)) return "wydarzenia";
  return null;
}

export async function szukajOpracowania(szukaj: SzukajBaza, pytanie: string, utwor: Utwor, sekcja: Sekcja | null): Promise<Material[]> {
  const raw = await szukaj({ p_przedmiot: "polski", p_utwor: utwor.id, p_sekcja: sekcja, p_pytanie: pytanie });
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((w) => {
    if (w?.utwor !== utwor.id || !Object.hasOwn(SEKCJE, w.sekcja)) return [];
    const typSekcji = w.sekcja as Sekcja;
    const zrodlo = zrodloPestki({
      url: w.zrodlo_url, tytul: utwor.tytul,
      rodzaj: w.zrodlo_rodzaj, sekcja: `Opracowanie Sedno · ${SEKCJE[typSekcji]}`,
      idSekcji: `${utwor.id}/${typSekcji}`,
    });
    const tekst = napisPestki(w.tekst, 7000);
    return zrodlo && tekst ? [{ zrodlo, tekst, sekcja: typSekcji }] : [];
  });
}

export function fragmentyPlanu(material: Material): Material[] {
  if (material.sekcja !== "wydarzenia") return [];
  return material.tekst.split(/\r?\n/).flatMap((wiersz) => {
    const punkt = /^\d+\. \[([^\]]+)\](?:\((https:\/\/wolnelektury\.pl\/[^\s)]+)\))? (.+)$/.exec(wiersz);
    if (!punkt) return [];
    const [, miejsce, url, tekst] = punkt;
    return [{ ...material, tekst, zrodlo: { ...material.zrodlo, miejsce, ...(url && { url }) } }];
  });
}

const slug = (tytul: string) => bezAkcentow(tytul).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const bialeznaki = (t: string) => t.normalize("NFC").replace(/\s+/gu, " ").trim();

async function pobierz(url: URL, fetcher: typeof fetch, signal: AbortSignal, headers?: HeadersInit) {
  try {
    const res = await fetcher(url, { redirect: "error", signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]), headers });
    if (res.ok) return res;
  } catch {
    // Brak dostępu do źródła nie jest rozstrzygnięciem.
  }
}

function wlAdres(raw: unknown, wzorzec: RegExp): URL | undefined {
  try {
    if (typeof raw !== "string") return;
    const url = new URL(raw.replace(/^http:/, "https:"));
    if (url.origin === "https://wolnelektury.pl" && wzorzec.test(url.pathname) && !url.search && !url.hash) return url;
  } catch {
    return;
  }
}

async function wydanieWl(identyfikator: string, fetcher: typeof fetch, signal: AbortSignal) {
  if (typeof identyfikator !== "string" || !/^[a-z0-9-]{1,140}$/.test(identyfikator)) return {};
  const res = await pobierz(new URL(`https://wolnelektury.pl/api/books/${identyfikator}/`), fetcher, signal);
  return obiektPestki(await res?.json().catch(() => null));
}

export async function poczatekImprowizacji(utwor: Utwor | undefined, pytanie: string, fetcher: typeof fetch, signal: AbortSignal): Promise<Material | undefined> {
  if (utwor?.id !== "dziady-iii" || !utwor.wl || !/\bpoczatek\b/.test(bezAkcentow(pytanie)) ||
    !/\bimprowizac\w*\b/.test(bezAkcentow(pytanie))) return;
  const w = await wydanieWl(utwor.wl, fetcher, signal);
  const txt = wlAdres(w.txt, /^\/media\/book\/txt\/[a-z0-9-]+\.txt$/);
  if (!txt) return;
  const tresc = await (await pobierz(txt, fetcher, signal))?.text().catch(() => "");
  if (!tresc || tresc.length > 2_000_000) return;
  const poczatek = /^SCENA II\. IMPROWIZACJA\s*\n\s*KONRAD\s*\n\s*([^\n]+)/m.exec(tresc)?.[1].trim();
  if (!poczatek) return;
  const miejsce = "Część III, akt I, scena II — Wielka Improwizacja";
  const url = `https://wolnelektury.pl/katalog/lektura/${utwor.wl}.html#s6`;
  return { tekst: poczatek, zrodlo: { url, tytul: utwor.tytul, rodzaj: "utwór", miejsce } };
}

function najlepszeFragmenty(tekst: string, fakt: string): string {
  const terminy = [...new Set(bezAkcentow(fakt).match(/[a-z0-9]{5,}/g)?.map((w) => w.slice(0, 5)) ?? [])];
  const pomin = new Set(["gdzie", "jaki", "kiedy", "ktory", "spraw", "powie", "lektur"]);
  return tekst.split(/\n\s*\n/).flatMap((akapit, i, wszystkie) => {
    const slowa = new Set(bezAkcentow(akapit).match(/[a-z0-9]{5,}/g)?.map((w) => w.slice(0, 5)) ?? []);
    const trafienia = terminy.filter((w) => !pomin.has(w) && slowa.has(w)).length;
    return trafienia >= 2 ? [{ trafienia, tekst: wszystkie.slice(Math.max(0, i - 1), i + 2).join("\n\n").trim().slice(0, 1600) }] : [];
  }).sort((a, b) => b.trafienia - a.trafienia).slice(0, 2).map((w) => w.tekst).join("\n[…]\n");
}

export async function szukajWTresciUtworu(cel: CelLektury, fetcher: typeof fetch, signal: AbortSignal): Promise<Material[]> {
  const utwor = utworPytania(cel.tytul, true);
  if (utwor && !utwor.wl) return [];
  const nazwa = utwor?.wl ?? slug(cel.tytul);
  const glowna = await wydanieWl(nazwa, fetcher, signal);
  const tytul = napisPestki(glowna.title, 240);
  if (!tytul || (!utwor && slug(tytul) !== nazwa && !slug(tytul).startsWith(`${nazwa}-`))) return [];
  const dzieci = Array.isArray(glowna.children) ? glowna.children.slice(0, 5) : [];
  const wydania = glowna.txt ? [glowna] : await Promise.all(dzieci.map((d) => wydanieWl(d?.slug, fetcher, signal)));
  const wyniki = await Promise.all(wydania.map(async (w): Promise<Material | undefined> => {
    const txt = wlAdres(w.txt, /^\/media\/book\/txt\/[a-z0-9-]+\.txt$/);
    const url = wlAdres(w.url, /^\/katalog\/lektura\/[a-z0-9-]+\/?$/);
    const zrodlo = zrodloPestki({ url: url?.href, tytul: w.title, rodzaj: "utwór" });
    if (!txt || !zrodlo) return;
    const res = await pobierz(txt, fetcher, signal);
    const surowy = await res?.text().catch(() => "");
    if (!surowy || surowy.length > 2_000_000) return;
    const tresc = surowy.split(/\n\s*(?:-----|Ten utwór jest w domenie publicznej)/)[0];
    const cytat = cel.cytat && bialeznaki(cel.cytat);
    const znormalizowana = bialeznaki(tresc);
    const pozycja = cytat ? znormalizowana.indexOf(cytat) : -1;
    const tekst = cytat && pozycja >= 0
      ? znormalizowana.slice(Math.max(0, pozycja - 380), pozycja + cytat.length + 380)
      : najlepszeFragmenty(tresc, cel.fakt);
    if (tekst) return { zrodlo, tekst };
  }));
  return wyniki.filter((w): w is Material => !!w).slice(0, 3);
}

export async function szukajWSieci(cel: CelLektury, klucz: string, fetcher: typeof fetch, signal: AbortSignal): Promise<Material[]> {
  if (!klucz || cel.cytat || cel.potwierdzCytat) return [];
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.search = new URLSearchParams({
    q: `"${cel.tytul.replace(/["“”]/g, "")}" ${cel.fakt} (site:zpe.gov.pl OR site:culture.pl)`,
    search_lang: "pl", country: "PL", count: "5", text_decorations: "false",
  }).toString();
  const res = await pobierz(url, fetcher, signal, { "X-Subscription-Token": klucz, Accept: "application/json" });
  const dane = obiektPestki(await res?.json().catch(() => null));
  const { results } = obiektPestki(dane.web);
  if (!Array.isArray(results)) return [];
  return results.slice(0, 5).flatMap((r) => {
    const zrodlo = zrodloPestki({ url: r?.url, tytul: r?.title, rodzaj: "opracowanie" });
    if (!zrodlo || !["zpe.gov.pl", "culture.pl"].includes(new URL(zrodlo.url).hostname)) return [];
    const tekst = napisPestki(r.description, 1300);
    return tekst ? [{ zrodlo, tekst }] : [];
  });
}

export function zawieraCytat(tekst: string, cytat: string): boolean {
  const frag = bialeznaki(cytat);
  if (frag.length < 8) return false;
  const doslownie = frag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${doslownie}(?![\\p{L}\\p{N}])`, "u").test(bialeznaki(tekst));
}
