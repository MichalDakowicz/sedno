// Materiały Sedno o jednym rozpoznanym utworze: karta, sekcje opracowania, elementy (wydarzenia, postacie,
// motywy), fragmenty tekstu. Każdy materiał ma krótki identyfikator, który model wpisuje w odpowiedź;
// serwer zamienia identyfikatory na źródła (odpowiedz-lektury.ts). Wyszukiwanie zawsze dotyczy jednego utworu.
import { napisPestki, obiektPestki, zrodloPestki, type TypZrodla, type ZrodloPestki } from "../_shared/pestka-odpowiedz.ts";
import type { Utwor } from "./katalog-lektur.ts";
import { bezAkcentow, normalizuj, SEKCJE, type Sekcja, type TypPytania } from "./lektury.ts";
import { adresTomu, miejscaWZapytaniu, pasujeMiejsce, TOMY_WL, zapisMiejsca } from "./miejsca-lektur.ts";

export type Material = {
  /** W12 wydarzenie, P3 postać, M5 motyw, U2 utwór zbioru, F1 fragment tekstu, S:geneza sekcja, K karta. */
  id: string;
  rodzaj: TypZrodla;
  tekst: string;
  zrodlo?: ZrodloPestki;
  miejsce?: string;
  sekcja?: Sekcja;
};

export type SzukajBaza = (p: { p_przedmiot: string; p_utwor: string | null; p_sekcja: Sekcja | null; p_pytanie: string }) => Promise<unknown>;
export type SzukajElementy = (p: {
  p_utwor: string; p_rodzaje: string[]; p_pytanie: string; p_limit: number; p_kolejnosc: boolean; p_od_konca: boolean;
}) => Promise<unknown>;
export type SzukajFragmenty = (p: { p_utwor: string; p_pytanie: string; p_fraza: string | null; p_limit: number; p_poczatek: boolean }) => Promise<unknown>;
export type SzukajFragmentyMiejsca = (p: { p_utwor: string; p_miejsce: string; p_limit: number }) => Promise<unknown>;
export type DostepLektur = { baza: SzukajBaza; elementy?: SzukajElementy; fragmenty?: SzukajFragmenty; fragmentyMiejsca?: SzukajFragmentyMiejsca };

export type Zebrane = { materialy: Material[]; uwagi: string[]; maWydarzenia: boolean };

/** Budżet kontekstu: około 6 tys. tokenów materiału. */
export const LIMIT_ZNAKOW = 18_000;
const LIMIT_SEKCJI = 2500;
const LIMIT_FRAGMENTU = 1400;

const przytnij = (tekst: string, limit: number) =>
  tekst.length <= limit ? tekst : `${tekst.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;

const adresTekstu = (utwor: Utwor) => utwor.wl ? `https://wolnelektury.pl/katalog/lektura/${utwor.wl}/` : undefined;
const rodzajAdresu = (url: string | undefined): ZrodloPestki["rodzaj"] =>
  url && /^https:\/\/(?:wolnelektury\.pl|pl\.wikisource\.org)\//.test(url) ? "utwór" : "opracowanie";
const stronaBezKotwicy = (url: string) => url.split(/[?#]/)[0].replace(/(?:\.html|\/)$/, "");

function zrodloMaterialu(utwor: Utwor, id: string, rodzaj: TypZrodla, url: string | undefined, miejsce?: string, sekcja?: string): ZrodloPestki | undefined {
  const tom = miejsce && adresTomu(utwor.id, miejsce);
  const adres = tom && (!url || stronaBezKotwicy(url) !== stronaBezKotwicy(tom)) ? tom : url ?? adresTekstu(utwor);
  const typAdresu = rodzajAdresu(adres);
  const z = zrodloPestki({
    url: adres, tytul: utwor.tytul, rodzaj: typAdresu,
    sekcja: sekcja ?? (typAdresu === "utwór" && adres?.includes("#") ? miejsce : undefined),
    miejsce, idSekcji: `${utwor.id}/${id.toLowerCase().replace(":", "-")}`,
  });
  return z && { ...z, id, typ: rodzaj };
}

export function kartaLektury(utwor: Utwor): Material {
  const tekst = [
    `Karta lektury: „${utwor.tytul}”, autor: ${utwor.autor}, epoka: ${utwor.epoka}, poziom: ${utwor.poziom}.`,
    `Wymagane części: ${utwor.czesci}`,
    utwor.wl ? "Utwór w domenie publicznej, pełny tekst na Wolnych Lekturach." : "Brak pełnego tekstu w Sedno (prawa autorskie).",
    utwor.do_weryfikacji && `Do weryfikacji: ${utwor.do_weryfikacji}`,
  ].filter(Boolean).join(" ");
  const url = adresTekstu(utwor);
  const zrodlo = url ? zrodloPestki({ url, tytul: utwor.tytul, rodzaj: "utwór", sekcja: "Karta lektury Sedno", idSekcji: `${utwor.id}/k` }) : undefined;
  return { id: "K", rodzaj: "karta", tekst, ...(zrodlo && { zrodlo: { ...zrodlo, id: "K", typ: "karta" as const } }) };
}

const lista = (x: unknown, limit = 8): string => Array.isArray(x) ? x.filter((t) => typeof t === "string").slice(0, limit).join(", ") : "";

function tekstElementu(rodzaj: string, d: Record<string, unknown>): string {
  const t = (k: string, n = 700) => napisPestki(d[k], n);
  if (rodzaj === "wydarzenie") {
    const kto = lista(d.kto), gdzie = t("gdzie", 200);
    return `${t("miejsce", 120)}: ${t("opis", 600)}${kto || gdzie ? ` (${[kto && `kto: ${kto}`, gdzie && `gdzie: ${gdzie}`].filter(Boolean).join("; ")})` : ""}`;
  }
  if (rodzaj === "postac") return `${t("imie", 100)}. ${t("rola")} Relacje: ${t("relacje")} Pojawia się: ${lista(d.miejsca, 12)}.`;
  if (rodzaj === "motyw") return `${t("motyw", 160)}: ${t("przyklad")} (${t("miejsce", 120)})${t("cytat", 200) ? ` Cytat: „${t("cytat", 200)}”` : ""}`;
  return `${t("tytul", 200)}${t("miejsce", 120) ? ` (${t("miejsce", 120)})` : ""}: ${t("opis")}`;
}

const PREFIKS: Record<string, [string, TypZrodla]> = {
  wydarzenie: ["W", "wydarzenie"], postac: ["P", "postac"], motyw: ["M", "motyw"], utwor: ["U", "utwor"],
};

function elementy(raw: unknown, utwor: Utwor): Material[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((w): Material[] => {
    const wiersz = obiektPestki(w);
    const [prefiks, rodzaj] = PREFIKS[String(wiersz.rodzaj)] ?? [];
    const nr = wiersz.nr;
    if (wiersz.utwor !== utwor.id || !prefiks || typeof nr !== "number" || !Number.isInteger(nr) || nr < 1 || nr > 9999) return [];
    const dane = obiektPestki(wiersz.dane);
    const tekst = tekstElementu(String(wiersz.rodzaj), dane).trim();
    if (!tekst) return [];
    const id = `${prefiks}${nr}`;
    const miejsce = napisPestki(wiersz.miejsce, 240) || undefined;
    const url = typeof wiersz.zrodlo_url === "string" ? wiersz.zrodlo_url : undefined;
    const zrodlo = zrodloMaterialu(utwor, id, rodzaj, url, miejsce);
    return [{ id, rodzaj, tekst, miejsce, ...(zrodlo && { zrodlo }) }];
  });
}

async function sekcjeOpracowania(d: DostepLektur, pytanie: string, utwor: Utwor, sekcja: Sekcja | null): Promise<Material[]> {
  const raw = await d.baza({ p_przedmiot: "polski", p_utwor: utwor.id, p_sekcja: sekcja, p_pytanie: pytanie });
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((w): Material[] => {
    if (w?.utwor !== utwor.id || !Object.hasOwn(SEKCJE, w.sekcja)) return [];
    const typ = w.sekcja as Sekcja;
    const tekst = przytnij(napisPestki(w.tekst, 7000), LIMIT_SEKCJI);
    if (!tekst) return [];
    const id = `S:${typ}`;
    const url = typeof w.zrodlo_url === "string" ? w.zrodlo_url : undefined;
    const z = zrodloPestki({
      url, tytul: utwor.tytul, rodzaj: w.zrodlo_rodzaj, sekcja: `Opracowanie Sedno · ${SEKCJE[typ]}`, idSekcji: `${utwor.id}/s-${typ}`,
    });
    return [{ id, rodzaj: "sekcja", sekcja: typ, tekst, ...(z && { zrodlo: { ...z, id, typ: "sekcja" as const } }) }];
  });
}

/** Plan z notatki Sedno (numerowane punkty „[miejsce](url) opis”) jako wydarzenia, gdy utwór nie ma elementów. */
export function wydarzeniaZNotatki(sekcja: Material, utwor: Utwor): Material[] {
  return sekcja.tekst.split(/\r?\n/).flatMap((wiersz): Material[] => {
    const m = /^(\d+)\. \[([^\]]+)\](?:\((https:\/\/wolnelektury\.pl\/[^\s)#]+)(?:#[^\s)]*)?\))? (.+)$/.exec(wiersz);
    if (!m) return [];
    const id = `W${Number(m[1])}`;
    const zrodlo = zrodloMaterialu(utwor, id, "wydarzenie", m[3], m[2]);
    return [{ id, rodzaj: "wydarzenie", miejsce: m[2], tekst: `${m[2]}: ${m[4]}`, ...(zrodlo && { zrodlo }) }];
  });
}

/** Tekst i mapa indeksów: znormalizowany ciąg (litery i cyfry) z pozycjami w oryginale. */
function zMapa(tekst: string): { norm: string; mapa: number[] } {
  let norm = "";
  const mapa: number[] = [];
  let spacja = true;
  for (let i = 0; i < tekst.length; i++) {
    const c = bezAkcentow(tekst[i]);
    if (/^[a-z0-9]$/.test(c)) {
      norm += c;
      mapa.push(i);
      spacja = false;
    } else if (!spacja) {
      norm += " ";
      mapa.push(i);
      spacja = true;
    }
  }
  return { norm, mapa };
}

/** Wycinek fragmentu wokół frazy albo najtrafniejszego akapitu; na prośbę o początek zaczyna od początku. */
export function okno(tekst: string, pytanie: string, fraza: string | null, poczatek: boolean, limit = LIMIT_FRAGMENTU): string {
  if (tekst.length <= limit) return tekst;
  // Początek wycinka: najbliższy początek wiersza w pobliżu, a gdy go nie ma, początek słowa.
  const od = (i: number) => {
    const nl = tekst.lastIndexOf("\n", i);
    if (nl >= 0 && i - nl <= 300) return nl + 1;
    const sp = tekst.indexOf(" ", i);
    return sp >= 0 && sp - i < 40 ? sp + 1 : i;
  };
  const wytnij = (start: number) => przytnij(tekst.slice(start, start + limit + 200), limit).trim();
  if (poczatek) return wytnij(0);
  const { norm, mapa } = zMapa(tekst);
  const szukana = fraza && normalizuj(fraza);
  const pozycja = szukana && szukana.length >= 8 ? norm.indexOf(szukana) : -1;
  if (pozycja >= 0) return wytnij(od(Math.max(0, (mapa[pozycja] ?? 0) - 300)));
  const terminy = [...new Set(normalizuj(pytanie).split(" ").filter((w) => w.length >= 5).map((w) => w.slice(0, 5)))];
  if (!terminy.length) return wytnij(0);
  let najlepszy = { start: 0, wynik: -1 };
  for (const akapit of tekst.matchAll(/[^\n]+(?:\n(?!\n)[^\n]+)*/g)) {
    const slowa = new Set(normalizuj(akapit[0]).split(" ").map((w) => w.slice(0, 5)));
    const wynik = terminy.filter((t) => slowa.has(t)).length;
    if (wynik > najlepszy.wynik) najlepszy = { start: akapit.index ?? 0, wynik };
  }
  return wytnij(najlepszy.start);
}

export const frazaZPytania = (pytanie: string): string | null =>
  /[„"«“]([^”"»„]{8,300})[”"»“]/.exec(pytanie)?.[1].trim() ?? null;

const PROSI_O_POCZATEK = /\b(?:poczat\w*|na poczatku|otwiera\w*|pierwsz\w+ (?:wers|zdani|slow))/;

function fragmenty(raw: unknown, utwor: Utwor, pytanie: string, fraza: string | null, doPlanu = false): Material[] {
  if (!Array.isArray(raw)) return [];
  const poczatek = PROSI_O_POCZATEK.test(bezAkcentow(pytanie));
  return raw.flatMap((w, i): Material[] => {
    const wiersz = obiektPestki(w);
    if (wiersz.utwor !== utwor.id) return [];
    const tresc = napisPestki(wiersz.tekst, 12000);
    const tekst = doPlanu ? przytnij(tresc, 2200) : okno(tresc, pytanie, wiersz.trafienie === "fraza" ? fraza : null, poczatek);
    const miejsce = napisPestki(wiersz.miejsce, 200);
    const tytulCzesci = napisPestki(wiersz.tytul_czesci, 120);
    const opis = [miejsce, tytulCzesci && `(${tytulCzesci})`].filter(Boolean).join(" ");
    if (!tekst) return [];
    // Numer w utworze pozostaje ten sam, gdy fragment wraca w innym wyniku wyszukiwania.
    const nr = typeof wiersz.nr === "number" && Number.isInteger(wiersz.nr) && wiersz.nr >= 1 ? wiersz.nr : i + 1;
    const id = `F${nr}`;
    const zrodlo = zrodloMaterialu(utwor, id, "fragment", typeof wiersz.zrodlo_url === "string" ? wiersz.zrodlo_url : undefined, opis || undefined);
    return [{ id, rodzaj: "fragment", tekst, miejsce, ...(zrodlo && { zrodlo }) }];
  });
}

const pewnie = async <T>(p: Promise<T> | undefined, domyslne: T): Promise<T> => {
  try {
    return (await p) ?? domyslne;
  } catch {
    // Brak dostępu do indeksu nie blokuje odpowiedzi; model dostaje wtedy tylko kartę i zasadę etykiety.
    return domyslne;
  }
};

export function materialyWBudzecie(materialy: Material[]): Material[] {
  let suma = 0;
  const uzyte = new Set<string>();
  return materialy.filter((m) => {
    if (uzyte.has(m.id) || suma + m.tekst.length > LIMIT_ZNAKOW) return false;
    uzyte.add(m.id);
    suma += m.tekst.length;
    return true;
  });
}

const SYNONIMY_MOTYWOW = [
  ["samotność", "wyobcowanie", "osamotnienie", "odosobnienie", "izolacja"],
];

function pytanieOMotyw(pytanie: string): string {
  const slowa = normalizuj(pytanie).split(" ");
  return SYNONIMY_MOTYWOW.find((grupa) => grupa.some((haslo) =>
    slowa.some((slowo) => slowo.startsWith(normalizuj(haslo).slice(0, 5)))))?.join(" ") ?? pytanie;
}

/** Zbiera materiały o utworze zależnie od typu pytania. Karta jest zawsze pierwsza. */
export async function zbierzMaterialy(
  d: DostepLektur, pytanie: string, utwor: Utwor, typ: TypPytania, opcje: { fraza?: string | null; dlugie?: boolean } = {},
): Promise<Zebrane> {
  const el = (rodzaje: string[], limit: number, wybierz: { kolejnosc?: boolean; odKonca?: boolean; szukane?: string } = {}) =>
    pewnie(d.elementy?.({
      p_utwor: utwor.id, p_rodzaje: rodzaje, p_pytanie: wybierz.szukane ?? pytanie, p_limit: limit,
      p_kolejnosc: wybierz.kolejnosc ?? false, p_od_konca: wybierz.odKonca ?? false,
    }), []).then((r) => elementy(r, utwor));
  const sekcje = (sekcja: Sekcja | null) => pewnie(sekcjeOpracowania(d, pytanie, utwor, sekcja), [] as Material[]);
  const fra = (limit: number) => {
    const fraza = opcje.fraza ?? frazaZPytania(pytanie);
    const p_poczatek = PROSI_O_POCZATEK.test(bezAkcentow(pytanie));
    return pewnie(d.fragmenty?.({ p_utwor: utwor.id, p_pytanie: pytanie, p_fraza: fraza, p_limit: limit, p_poczatek }), []).then((r) => fragmenty(r, utwor, pytanie, fraza));
  };
  const uwagi = el(["weryfikacja"], 5, { kolejnosc: true }).then((w) => w.map((m) => m.tekst));
  const naj = (m: Material[], ...sekcje: Sekcja[]) => m.filter((x) => x.sekcja && sekcje.includes(x.sekcja));

  let glowne: Material[] = [];
  switch (typ) {
    case "plan": {
      glowne = await el(["wydarzenie"], 60, { kolejnosc: true });
      if (!glowne.length) glowne = (await sekcje("wydarzenia")).flatMap((s) => s.sekcja === "wydarzenia" ? wydarzeniaZNotatki(s, utwor) : []);
      const miejsca = miejscaWZapytaniu(pytanie);
      if (!miejsca.length) break;
      glowne = glowne.filter((m) => pasujeMiejsce(m.miejsce ?? "", miejsca));
      const rozdzial = miejsca.some((m) => m.rodzaj === "rozdz");
      const scena = miejsca.some((m) => m.rodzaj === "sc");
      const niejasnyTom = rozdzial && !!TOMY_WL[utwor.id] && !miejsca.some((m) => m.rodzaj === "t" || m.rodzaj === "cz");
      if (glowne.length < 3 && utwor.wl && (rozdzial || scena) && !niejasnyTom) {
        const dane = await pewnie(d.fragmentyMiejsca?.({ p_utwor: utwor.id, p_miejsce: zapisMiejsca(miejsca), p_limit: 7 }), []);
        const wycinki = fragmenty(dane, utwor, pytanie, null, true).filter((m) => pasujeMiejsce(m.miejsce ?? "", miejsca));
        if (wycinki.length) glowne = wycinki;
      }
      break;
    }
    case "streszczenie": {
      const [w, s] = await Promise.all([el(["wydarzenie"], opcje.dlugie ? 60 : 25, { kolejnosc: true }), sekcje("streszczenie")]);
      glowne = [...naj(s, "streszczenie"), ...w, ...naj(s, "bohaterowie"), ...(w.length ? [] : naj(s, "wydarzenia"))];
      break;
    }
    case "zakonczenie": {
      const [w, s] = await Promise.all([el(["wydarzenie"], 5, { odKonca: true }), sekcje("streszczenie")]);
      const plan = w.length ? w.toReversed() : naj(s, "wydarzenia").flatMap((m) => wydarzeniaZNotatki(m, utwor)).slice(-5);
      glowne = [...plan, ...naj(s, "streszczenie"), ...(plan.length ? [] : naj(s, "wydarzenia"))];
      break;
    }
    case "postac": {
      const [p, s] = await Promise.all([el(["postac"], 4), sekcje("bohaterowie")]);
      glowne = [...(p.length ? p : await el(["postac"], 8, { kolejnosc: true })), ...naj(s, "bohaterowie", "streszczenie").slice(0, 2)];
      break;
    }
    case "motywy": {
      const [m, w, s] = await Promise.all([el(["motyw"], 8, { szukane: pytanieOMotyw(pytanie) }), el(["wydarzenie"], 5), sekcje("motywy")]);
      const miejsca = new Set(m.flatMap((motyw) => motyw.zrodlo?.miejsce ?? []));
      const powiazane = [...miejsca].some((miejsce) => !w.some((e) => e.zrodlo?.miejsce === miejsce))
        ? (await el(["wydarzenie"], 60, { kolejnosc: true })).filter((e) => e.zrodlo?.miejsce && miejsca.has(e.zrodlo.miejsce))
        : [];
      glowne = [...(m.length ? m : await el(["motyw"], 8, { kolejnosc: true })), ...powiazane, ...w, ...naj(s, "motywy", "wydarzenia")];
      break;
    }
    case "cytat": {
      const [f, e] = await Promise.all([fra(2), el(["motyw", "wydarzenie"], 4)]);
      glowne = [...f, ...e];
      break;
    }
    case "geneza":
    case "konteksty": {
      glowne = naj(await sekcje(typ), typ).concat(await sekcje(typ === "geneza" ? "konteksty" : "geneza").then((s) => s.slice(0, 1)));
      break;
    }
    default: {
      const [e, s, f] = await Promise.all([el(["wydarzenie", "postac", "motyw", "utwor"], 8), sekcje(null), utwor.wl ? fra(2) : Promise.resolve([] as Material[])]);
      // Baza zwraca sekcje według trafności. Fabuła i bohaterowie są potrzebni także poniżej pierwszej trójki.
      glowne = [...s.filter((x, i) => i < 3 || x.sekcja === "wydarzenia" || x.sekcja === "bohaterowie"), ...e, ...f];
    }
  }
  const maWydarzenia = glowne.some((m) => m.rodzaj === "wydarzenie");
  // Notatka z planem bywa przybliżona; gdy utwór ma wydarzenia z lokalizacją, ona nie wchodzi do kontekstu.
  const bezNotatkiPlanu = maWydarzenia && typ === "streszczenie" ? glowne.filter((m) => m.sekcja !== "wydarzenia") : glowne;
  const materialy = materialyWBudzecie([kartaLektury(utwor), ...bezNotatkiPlanu]);
  return { materialy, uwagi: await uwagi, maWydarzenia };
}

/** Materiały w postaci tekstu dla modelu: „[W12] treść”. */
export function materialyDlaModelu(materialy: Material[]): string {
  return materialy.map((m) => `[${m.id}] ${m.rodzaj === "fragment" ? `${m.zrodlo?.miejsce ?? m.miejsce ?? "fragment tekstu"}\n${m.tekst}` : m.tekst}`).join("\n");
}
