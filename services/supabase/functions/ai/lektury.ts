import { napisPestki, obiektPestki, zrodloPestki, type ZrodloPestki } from "../_shared/pestka-odpowiedz.ts";

export const bezAkcentow = (t: string) => t.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/\p{M}/gu, "");

const UTWORY = [
  { id: "lalka", tytul: "Lalka", autor: "Bolesław Prus", wl: "lalka", nazwy: /\b(?:lal(?:k[aie]|ce)|wokuls\w*|rzeck\w*|ochock\w*|zaslaw\w*|izabel[aie]? leck\w*)\b/ },
  { id: "zemsta", tytul: "Zemsta", autor: "Aleksander Fredro", wl: "zemsta", nazwy: /\b(?:czesni\w*|raptusiewicz\w*|papkin\w*|milczek|milczka|podstolin\w*|zemst[aye]|zemscie)\b/ },
  { id: "dziady-iii", tytul: "Dziady, część III", autor: "Adam Mickiewicz", wl: "dziady-dziady-poema-dziady-czesc-iii", nazwy: /\b(?:dziad(?:y|ow|ach|om)\b.{0,24}\b(?:iii|3)\b|(?:iii|3)\b.{0,24}\bdziad\w*|rollison\w*|nowosilcow\w*|wielk\w* improwizac\w*|widzeni\w* ksiedza piotra|salon\w* warszawsk\w*)/ },
];

const SEKCJE = {
  streszczenie: "Krótkie streszczenie",
  wydarzenia: "Szczegółowy przebieg wydarzeń",
  geneza: "Geneza",
  bohaterowie: "Bohaterowie i relacje",
  motywy: "Motywy",
  konteksty: "Konteksty",
};

export type Utwor = typeof UTWORY[number];
export type Sekcja = keyof typeof SEKCJE;
export type Material = { zrodlo: ZrodloPestki; tekst: string; sekcja?: Sekcja };
export type CelLektury = { tytul: string; fakt: string; cytat?: string; fragment?: string; potwierdzCytat?: boolean };
export type SzukajBaza = (p: { p_przedmiot: string; p_utwor: string | null; p_sekcja: Sekcja | null; p_pytanie: string }) => Promise<unknown>;

export function utworPytania(tekst: string): Utwor | undefined {
  const pytanie = bezAkcentow(tekst);
  const pasujace = UTWORY.filter((u) => u.nazwy.test(pytanie));
  // Część II i IV mają odrębnych bohaterów i fabułę.
  if (pasujace[0]?.id === "dziady-iii" && /\bdziad\w*.{0,20}(?:\bii\b|\biv\b|\b[24]\b)/.test(pytanie)) return;
  return pasujace.length === 1 ? pasujace[0] : undefined;
}

export const prosiOCytat = (pytanie: string) => /cytat|cytuj|zacytuj|doslown|brzmia? slowa|dokladne slowa/.test(bezAkcentow(pytanie));
export const chceZweryfikowac = (pytanie: string) =>
  /^(?:czy (?:to|w|na pewno|naprawde)|sprawdz|zweryfikuj)|potwierdz|zrodlo (?:na to|dla twierdzenia)/.test(bezAkcentow(pytanie));
const STRESZCZENIE = /stres(?:zcz|c)|o czym (?:jest|opowiada)|fabul|co to za (?:utwor|ksiazka|powiesc|komedia|dramat)|opowiedz (?:mi )?o /;
const maKontekstLiteracki = (pytanie: string) =>
  STRESZCZENIE.test(pytanie) || /lektur|powies|komedi|dramat|bohat|motyw|tytul|mickiewicz|fredr|prusa|[„“»"]/.test(pytanie);

export function czyWyszukacLekture(pytanie: string, przedmiot?: string): boolean {
  const utwor = utworPytania(pytanie);
  const zapis = bezAkcentow(pytanie);
  if (!utwor) return maKontekstLiteracki(zapis) && (prosiOCytat(pytanie) || chceZweryfikowac(pytanie));
  if (utwor.id === "zemsta" && !/czesni|papkin|milcz|raptus|podstolin|\b(?:w|z|ze|o) zem(?:st[ayei]|scie)/.test(zapis)) {
    return przedmiot === "polski" || maKontekstLiteracki(zapis);
  }
  return true;
}

export function sekcjaPytania(pytanie: string): Sekcja | null {
  const zapis = bezAkcentow(pytanie);
  if (/genez|kiedy .{0,18}(wydan|powsta|napisan)|skad .{0,15}tytul/.test(zapis)) return "geneza";
  if (/kontekst|epok/.test(zapis)) return "konteksty";
  if (/motyw|symbol|tematyk/.test(zapis)) return "motywy";
  if (/kim (?:jest|byl|byla)|bohater|jak(?:ie|a) relac|charakteryz/.test(zapis)) return "bohaterowie";
  if (/szczegolow|przebieg|kolejnosc|wydarzeni/.test(zapis) && !chceZweryfikowac(pytanie)) return "wydarzenia";
  if (STRESZCZENIE.test(zapis)) return "streszczenie";
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
    });
    const tekst = napisPestki(w.tekst, 7000);
    return zrodlo && tekst ? [{ zrodlo, tekst, sekcja: typSekcji }] : [];
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
  const utwor = utworPytania(cel.tytul);
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
