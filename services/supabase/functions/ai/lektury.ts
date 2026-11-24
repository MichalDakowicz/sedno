// Rozpoznawanie lektury w pytaniu ucznia i typu pytania. Wyszukiwanie materiałów jest w material-lektury.ts.
import { KATALOG_LEKTUR, type Utwor } from "./katalog-lektur.ts";

export const bezAkcentow = (t: string) => t.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/\p{M}/gu, "");

/** Same litery i cyfry bez polskich znaków, rozdzielone spacją; do porównań niewrażliwych na interpunkcję. */
export const normalizuj = (t: string) => bezAkcentow(t).replace(/[^a-z0-9]+/g, " ").trim();

export const SEKCJE = {
  streszczenie: "Krótkie streszczenie",
  wydarzenia: "Plan wydarzeń",
  geneza: "Geneza",
  bohaterowie: "Bohaterowie i relacje",
  motywy: "Motywy",
  konteksty: "Konteksty",
};

export type Sekcja = keyof typeof SEKCJE;

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

/**
 * Kontekst literacki: wyraźne ramy pytania o lekturę (lektura, streszczenie, rozdział, „w powieści”, motyw…).
 * Słowo z tytułu samo (np. „wesele kuzynki”, „siostra ma lalkę”) go nie tworzy. Luźne „dramat” czy „bohater”
 * też nie: „to dramat” albo „bohater dnia” nie pytają o lekturę.
 */
const KONTEKST_LITERACKI = new RegExp([
  "\\blektur\\w*", "\\bstres(?:zcz|c)\\w*", "\\bfabul\\w*", "plan wydarzen", "\\bwypracowan\\w*", "\\brozpraw\\w*", "\\bmotyw\\w*",
  "\\binterpretac\\w*", "\\bzinterpretuj\\w*", "\\bcharakteryst\\w*", "\\bcharakteryz\\w*",
  "\\b(?:w|we|z|ze|o|do|na) (?:ksiazce|powiesci|dramacie|komedii|tragedii|utworze|noweli|opowiadaniu|poemacie|epopei|balladzie|wierszu|sztuce)\\b",
  "\\b(?:rozdzial|rozdziale|akt|akcie|scena|scenie|tom|tomie|ksiega|ksiedze|czesc|czesci)\\w* (?:[ivx]+|\\d+)\\b",
  "\\bo czym (?:jest|opowiada|traktuje)\\b", "\\bco sie dzieje w\\b", "\\bjak (?:sie )?konczy\\b", "\\bkto napisal\\b", "\\bkto jest autorem\\b",
  "\\bbohater\\w* (?:lektury|powiesci|utworu|dramatu|ksiazki|komedii|noweli)\\b",
  "\\b(?:powiesc|ksiazk|lektur|dramat|komedi)\\w* (?:pt|zatytulowan)\\w*",
].join("|"));
const ZAKONCZENIE = /\b(?:jak (?:\w+ ){0,3}konczy(?:\s+sie)?|zakonczeni\w*|final(?:u|em|e|ami|ach)?)\b/;
const maKontekstLiteracki = (pytanie: string) => KONTEKST_LITERACKI.test(pytanie) || ZAKONCZENIE.test(pytanie);

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

/** Wymieniona część cyklu (np. Dziady cz. IV), której nie ma w katalogu. */
export function nierozpoznanaCzesc(tekst: string): Utwor | undefined {
  const zapis = bezAkcentow(tekst);
  return wyszukiwalne.find(({ czesci }) => czesci && [...zapis.matchAll(czesci)].length)?.utwor;
}

export const prosiOCytat = (pytanie: string) => /cytat|cytuj|zacytuj|doslown|brzmia? slowa|dokladne slowa/.test(bezAkcentow(pytanie));
export const chceZweryfikowac = (pytanie: string) =>
  /^(?:czy\b|sprawdz|zweryfikuj)|potwierdz|zrodlo (?:na to|dla twierdzenia)/.test(bezAkcentow(pytanie));
const STRESZCZENIE = /stres(?:zcz|c)|o czym (?:jest|opowiada)|fabul|co to za (?:utwor|ksiazka|powiesc|komedia|dramat)|opowiedz (?:mi )?o /;
export function nazwaPostaciWPytaniu(pytanie: string): string {
  return /\b(?:kim (?:jest|byl|byla)|kto to|(?:opisz|scharakteryzuj|przedstaw) (?:postac|bohatera|bohaterke))\s+([^?!.:\n]+)/
    .exec(bezAkcentow(pytanie))?.[1].split(/\s+(?:w|we|z|ze)\s+/)[0].trim() ?? "";
}

export const nawiazujeDoLektury = (pytanie: string) =>
  /\b(?:rozdzial\w*|tom(?:u|ie|y|ow|em)?|akt(?:u|y|ow|em|ach)?(?!\s+notarialn)|scen\w*|bohater\w*|cytat\w*|(?:za)?cytuj\w*|plan wydarzen|stres(?:zcz|c)\w*|lektur\w*)\b/
    .test(bezAkcentow(pytanie)) || !!nazwaPostaciWPytaniu(pytanie) || pytaOLekture(pytanie) || ZAKONCZENIE.test(bezAkcentow(pytanie));

/** Pytanie wprost o lekturę, bez wskazanego utworu (np. „streść lekturę”, „plan wydarzeń”, „co jest w rozdziale 3”). */
export const pytaOLekture = (pytanie: string) =>
  /\b(?:stres(?:zcz|c)|plan wydarzen|fabul|lektur)\w*|\b(?:rozdzial|akt|scen|tom|ksieg)\w* (?:[ivx]+|\d+)\b/.test(bezAkcentow(pytanie));

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

export type TypPytania = "plan" | "streszczenie" | "zakonczenie" | "postac" | "motywy" | "cytat" | "geneza" | "konteksty" | "szczegol";

/** Typ pytania o lekturę decyduje, jakie materiały pobieramy (patrz material-lektury.ts). */
export function typPytania(pytanie: string): TypPytania {
  const zapis = bezAkcentow(pytanie);
  if (prosiOCytat(pytanie) || /\b(?:w|we) ktor\w+ (?:\w+ ){0,3}(?:rozdzial|scen|akt|ksieg|tom)\w*|\bgdzie (?:\w+ ){0,4}(?:pada|jest mowa|wystepuje)\b/.test(zapis)) return "cytat";
  if (/plan wydarzen|(?:przebieg|kolejnosc) (?:fabuly|wydarzen)|wydarzenia po kolei/.test(zapis)) return "plan";
  if (ZAKONCZENIE.test(zapis)) return "zakonczenie";
  if (STRESZCZENIE.test(zapis)) return "streszczenie";
  if (/genez|kiedy .{0,18}(wydan|powsta|napisan)|skad .{0,15}tytul/.test(zapis)) return "geneza";
  if (/kontekst|epok/.test(zapis)) return "konteksty";
  if (/motyw|symbol|tematyk|interpretac|zinterpretuj|argument|rozpraw|wypracowan|\bteza\b/.test(zapis)) return "motywy";
  if (/\bkim (?:jest|byl|byla|sa|byli)\b|\bkto to\b|charakteryz|bohater|jak(?:ie|a) relac|postac/.test(zapis)) return "postac";
  return "szczegol";
}

export function zawieraCytat(tekst: string, cytat: string): boolean {
  const frag = cytat.normalize("NFC").replace(/\s+/gu, " ").trim();
  if (frag.length < 8) return false;
  const doslownie = frag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${doslownie}(?![\\p{L}\\p{N}])`, "u").test(tekst.normalize("NFC").replace(/\s+/gu, " ").trim());
}
