// Obróbka odpowiedzi modelu o lekturze po stronie serwera: identyfikatory materiałów → źródła,
// etykieta „z ogólnej wiedzy” przy wszystkim, co nie ma oparcia w materiałach Sedno, kontrola cytatów,
// blokada zapisu priorytetu bez prośby ucznia.
import type { ZrodloPestki } from "../_shared/pestka-odpowiedz.ts";
import { normalizuj } from "./lektury.ts";
import type { Material } from "./material-lektury.ts";
import { miejscaWZapytaniu, miejsceWydania, pasujeMiejsce, rozbijMiejsca } from "./miejsca-lektur.ts";

export const ETYKIETA_OGOLNA = "(z ogólnej wiedzy, sprawdź w tekście)";
export const BRAK_MATERIALU = "Sedno nie ma materiału, który rozstrzyga to pytanie. Sprawdź w tekście utworu (Wolne Lektury) albo zapytaj inaczej.";
export const POMINIETO = "Pominięto fragment odpowiedzi, którego nie da się potwierdzić w materiałach Sedno. Sprawdź go w tekście.";

const GRUPA_ID = /\[\s*((?:(?:[WPMUF]\d{1,4}|S:[a-z]+|K|OW)\s*[,;]?\s*)+)\]/g;
const TOKEN = /[WPMUF]\d{1,4}|S:[a-z]+|K|OW/g;
const POCZATEK_ID = new RegExp(`^(?:${GRUPA_ID.source}[ \\t\\n]*)+`);
const ZDANIA = new Intl.Segmenter("pl", { granularity: "sentence" });
const ODSYLACZ = /\[\[\s*zrodlo\s*:\s*[1-9]\d*\s*\]\]|\[[1-9]\d*\]/g;

export const maOdsylacz = (tekst: string): boolean => tekst.search(ODSYLACZ) >= 0 ||
  [...tekst.matchAll(GRUPA_ID)].some((m) => m[1].match(TOKEN)?.some((id) => id !== "OW"));
export const bezOdsylaczy = (tekst: string): string => tekst
  .replace(ODSYLACZ, "").replace(GRUPA_ID, "").replace(/[ \t]+(?=[.,;:!?…])/g, "").replace(/[ \t]+$/gm, "").trim();

const NAGLOWEK = /^\s{0,3}#{1,6}(?:\s|$)/;
const PODKRESLENIE = /^\s{0,3}(?:=+|-+)\s*$/;
const PUNKT = /^\s*(?:[-+*]|\d{1,9}[.)])(?:[ \t]+|$)/;
const BLOK_CYTATU = /^\s*>/;
const CYTAT = /„[^”]*”|“[^”]*”|«[^»]*»|"[^"]*"/g;
const CUDZYSLOW: Record<string, string> = { "„": "”", "“": "”", "«": "»", '"': '"' };
const AKCJA = /^\[\[akcja:(?:krok|przyklad|sprawdz)\]\]$/;
const ZNACZNIK_PRIORYTETU = /\[\[\s*priorytet\s*:[^\]]*\]\]/gi;
// Model potrafi napisać, że dopisał priorytet, choć o to nie proszono.
const OBIETNICA_PRIORYTETU = /\b(?:dodał|dopisał|zapisał|ustawił)(?:am|em|o)\b[^.!?\n]{0,80}\bpriorytet|\bdo (?:twoich|Twoich) priorytet/i;
// Zdanie, w którym Pestka uczciwie mówi o braku materiału, nie wymaga etykiety.
const PRZYZNANIE_BRAKU = /\bSedno\b[^.\n]{0,60}\b(?:nie ma|brak|ma tylko)|\bnie ma (?:tego |tej |go )?w (?:materiałach|opracowaniu)|z ogólnej wiedzy|\bnie wiem\b|\bnie jestem pewn/i;
const POLECENIE = /^(?:(?:teraz|na koniec|najpierw|potem|prosze|mozesz|jesli chcesz) )*(?:sprobuj|napisz|zastanow sie|przypomnij sobie|dopisz|wybierz|podaj|wypisz|porownaj|przeczytaj|sprawdz|wskaz|uzasadnij|zapisz|zacytuj|wyjasnij|omow|uzupelnij|rozwaz|zrob|powiedz|zaproponuj|zacznij|zobacz|opisz|odpowiedz|znajdz|zwroc uwage)\b/;
const ELEMENTY = new Set<Material["rodzaj"]>(["wydarzenie", "postac", "motyw", "utwor"]);
const POMIJANE_SLOWA = new Set(
  "albo bardzo bohater bohaterka czesc dlaczego dlatego dzieki gdzie jest jestes jeszcze jednak kazdy kiedy ktore ktora ktory ktorym lektura miejsce natomiast omawia opis opisuje oraz potem powiesc prawda przed przez przy przyklad raz razem rozdz rozdzial scena takze tego teraz tylko tutaj utwor wedlug wydarzenie wlasnie wtedy zostal zatem swoje swoja swoje swoich temat dzieje chodzi stanowi pojawia osoba imie relacje poznajemy nastepnie".split(" "),
);

export type OpcjeProcesora = { pytanie: string; zapisPriorytetu: boolean };

const slowa = (t: string) => t.split(/\s+/).filter(Boolean).length;
const przytnij = (t: string, n: number) => t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, "");

const CYTAT_DO_SPRAWDZENIA = new RegExp(`„([^”]{18,400})”(?:[ \\t]*${GRUPA_ID.source})*`, "g");

function koniecCudzyslowu(wiersz: string, zamkniecie: string): string {
  for (const { 0: znak } of wiersz.matchAll(/(?<!\\)[„“”«»"]/g)) {
    if (zamkniecie) { if (znak === zamkniecie) zamkniecie = ""; }
    else zamkniecie = CUDZYSLOW[znak] ?? "";
  }
  return zamkniecie;
}

function zdaniaZOdsylaczami(tekst: string): string[] {
  // Zachowaj pozycje znaków przy skrótach, łamaniu wiersza i w obrębie cytatu.
  const maska = tekst.replace(/\n/g, " ").replace(/^(\s*\d+)\.(?= )|\b(t|rozdz|cz|ks|sc|w)\.(?=\s|\d)/g, "$1$2_")
    .replace(CYTAT, (cytat) => cytat.replace(/[.!?…]/g, "_"));
  const zdania: string[] = [];
  for (const { index, segment } of ZDANIA.segment(maska)) {
    let zdanie = tekst.slice(index, index + segment.length);
    const odsylacze = POCZATEK_ID.exec(zdanie)?.[0];
    if (odsylacze && zdania.length) {
      zdania[zdania.length - 1] += odsylacze;
      zdanie = zdanie.slice(odsylacze.length);
    }
    if (zdanie) zdania.push(zdanie);
  }
  return zdania;
}

function rdzenie(tekst: string): Set<string> {
  return new Set(normalizuj(tekst).split(" ").filter((s) =>
    /^[a-z]{4,}$/.test(s) && !POMIJANE_SLOWA.has(s)).map((s) => s.slice(0, 5)));
}

function elementWspieraZdanie(m: Material, zdanie: string): boolean {
  const slowaZrodla = rdzenie([m.tekst, ...(m.nazwyPostaci ?? [])].join(" "));
  const nazwyZrodla = [...slowaZrodla, ...rdzenie(m.zrodlo?.tytul ?? "")];
  for (const [, nazwa] of zdanie.matchAll(/\b(?:z|ze)\s+(\p{Lu}[\p{L}]{3,})/gu)) {
    const poczatek = normalizuj(nazwa).slice(0, 4);
    if (!nazwyZrodla.some((s) => s.startsWith(poczatek))) return false;
  }
  const szukane = miejscaWZapytaniu(zdanie);
  if (szukane.length) {
    const miejsca = m.miejsca ?? rozbijMiejsca(m.miejsce ?? m.zrodlo?.miejsce ?? m.tekst.split(": ")[0]);
    const utwor = m.zrodlo?.idSekcji?.split("/")[0] ?? "";
    if (!miejsca.some((miejsce) => pasujeMiejsce(miejsceWydania(utwor, miejsce), szukane))) return false;
    if (m.zrodlo?.rodzaj === "utwór") return true;
  }
  const slowaZdania = rdzenie(zdanie);
  const wspolne = [...slowaZdania].filter((s) => slowaZrodla.has(s)).length;
  return wspolne >= Math.max(2, Math.ceil(slowaZdania.size / 4));
}

export class ProcesorOdpowiedzi {
  private bufor = "";
  private wiersze: string[] = [];
  private zamkniecie = "";
  private wyemitowano = 0;
  private ostatniaPusta = true;
  private pominieto = false;
  private readonly zrodlaOdp: { klucz: string; zrodlo: ZrodloPestki; wiersze: string[] }[] = [];
  private readonly mapa: Map<string, Material>;
  private readonly wzorzec: string;

  constructor(materialy: Material[], private readonly opcje: OpcjeProcesora) {
    this.mapa = new Map(materialy.map((m) => [m.id, m]));
    this.wzorzec = normalizuj([...materialy.map((m) => m.tekst), opcje.pytanie].join(" \n "));
  }

  /** Źródła cytowane w wyemitowanej odpowiedzi; indeks + 1 to numer w znaczniku [[zrodlo:N]]. */
  zrodla(): ZrodloPestki[] {
    return this.zrodlaOdp.map(({ zrodlo, wiersze }, i) => ({ ...zrodlo, twierdzenie: `[${i + 1}] ${wiersze.join(" · ")}`.slice(0, 500) }));
  }

  dodaj(delta: string): string {
    this.bufor += delta;
    const czesci = this.bufor.split("\n");
    this.bufor = czesci.pop() ?? "";
    return czesci.map((linia) => this.linia(linia)).join("");
  }

  zakoncz(): string {
    let wynik = this.bufor ? this.linia(this.bufor) : "";
    wynik += this.blok();
    this.bufor = "";
    if (!this.wyemitowano) wynik += `${BRAK_MATERIALU}\n`;
    else if (this.pominieto) wynik += `\n${POMINIETO}\n`;
    return wynik.replace(/\n+$/, "");
  }

  private emituj(tekst: string): string {
    this.wyemitowano++;
    this.ostatniaPusta = false;
    return `${tekst}\n`;
  }

  private linia(surowa: string): string {
    const linia = surowa.trimEnd();
    if (this.zamkniecie) return this.dopisz(linia);
    if (!linia.trim()) {
      const wynik = this.blok();
      if (this.ostatniaPusta) return wynik;
      this.ostatniaPusta = true;
      return wynik + "\n";
    }
    if (AKCJA.test(linia.trim())) return this.blok() + this.emituj(linia.trim());
    const bezPriorytetu = this.opcje.zapisPriorytetu ? linia : linia.replace(ZNACZNIK_PRIORYTETU, "").trimEnd();
    if (!bezPriorytetu.trim()) return "";
    if (!this.opcje.zapisPriorytetu && OBIETNICA_PRIORYTETU.test(bezPriorytetu)) return "";

    if (PODKRESLENIE.test(bezPriorytetu) && this.wiersze.length && !PUNKT.test(this.wiersze[0]) && !BLOK_CYTATU.test(this.wiersze[0])) {
      this.wiersze.push(bezPriorytetu);
      return this.blok(true);
    }
    if (NAGLOWEK.test(bezPriorytetu)) {
      const poprzedni = this.blok();
      this.wiersze.push(bezPriorytetu);
      return poprzedni + this.blok(true);
    }
    const nowy = PUNKT.test(bezPriorytetu) || (this.wiersze.length > 0 &&
      BLOK_CYTATU.test(bezPriorytetu) !== BLOK_CYTATU.test(this.wiersze[0]) &&
      !!bezOdsylaczy(bezPriorytetu));
    return (nowy ? this.blok() : "") + this.dopisz(bezPriorytetu);
  }

  private dopisz(linia: string): string {
    this.wiersze.push(linia);
    this.zamkniecie = koniecCudzyslowu(linia, this.zamkniecie);
    return "";
  }

  private blok(naglowek = false): string {
    if (!this.wiersze.length) return "";
    let surowy = this.wiersze.join("\n").replaceAll(ETYKIETA_OGOLNA, "").replace(CYTAT, (cytat) => {
      const odsylacze = cytat.match(GRUPA_ID);
      return odsylacze ? cytat.replace(GRUPA_ID, "").replace(/[ \t]+(?=[”»"]$)/, "") + " " + odsylacze.join("") : cytat;
    });
    const cytat = BLOK_CYTATU.test(this.wiersze[0]) || !!this.zamkniecie;
    this.wiersze = [];
    this.zamkniecie = "";
    // Dłuższy cytat musi być w materiale. Usuwamy go razem z jego odsyłaczami.
    let usunietoCytat = false;
    surowy = surowy.replace(CYTAT_DO_SPRAWDZENIA, (zapis, cytat: string) => {
      if (slowa(cytat) < 4 || this.wzorzec.includes(normalizuj(cytat))) return zapis;
      this.pominieto = usunietoCytat = true;
      return "";
    });
    if (usunietoCytat) surowy = surowy.split("\n").filter((w) => w.trim()).join("\n");
    let maId = false;
    const tekst = zdaniaZOdsylaczami(surowy).map((zdanie) => zdanie.replace(GRUPA_ID, (_, grupa: string) => {
      return (grupa.match(TOKEN) ?? []).map((id) => {
        const m = this.mapa.get(id);
        if (!m || (ELEMENTY.has(m.rodzaj) && !elementWspieraZdanie(m, bezOdsylaczy(zdanie)))) return "";
        maId = true;
        const numer = m.zrodlo && this.zarejestruj(m, zdanie);
        return numer ? `[[zrodlo:${numer}]]` : "";
      }).join("");
    })).join("");

    const wyczyszczony = tekst
      .replace(/\[(\d+)\](?:[ \t]*\[\1\])*[ \t]*(?=\[\[zrodlo:\1\]\])/g, "")
      .replace(/\[\[zrodlo:(\d+)\]\](?:[ \t]*(?:\[\[zrodlo:\1\]\]|\[\1\]))+/g, "[[zrodlo:$1]]")
      .replace(/(\[\d+\])(?:[ \t]*\1)+/g, "$1")
      .replace(/[ \t]+([.,;:!?…])/g, "$1").replace(/[ \t]+$/gm, "").trimEnd();
    const bezZnacznikow = wyczyszczony.replace(/\[\[[^\]]*\]\]/g, "").trim();
    const sameCytaty = !bezZnacznikow.replace(CYTAT, "").replace(PUNKT, "").replace(/[\s.,;:!?"…*]+/g, "");
    const poleceniaLubPytania = zdaniaZOdsylaczami(bezZnacznikow).every((s) =>
      s.trimEnd().endsWith("?") || POLECENIE.test(normalizuj(s.replace(PUNKT, ""))));
    const zwolniony = naglowek || cytat || sameCytaty || /^(?:\*\*.+\*\*|__.+__)$/.test(bezZnacznikow) ||
      /:$/.test(bezZnacznikow) || poleceniaLubPytania || PRZYZNANIE_BRAKU.test(bezZnacznikow);
    const dopisek = !maId && !zwolniony ? ` ${ETYKIETA_OGOLNA}` : "";
    return wyczyszczony.replace(PUNKT, "").trim() ? this.emituj(`${wyczyszczony}${dopisek}`) : "";
  }

  /** Numer źródła w odpowiedzi (od 1); to samo miejsce w utworze ma jeden numer. */
  private zarejestruj(m: Material, linia: string): number {
    const z = m.zrodlo!;
    const miejsca = z.miejsca?.map((m) => `${m.miejsce}|${m.url}`).join("|") ?? z.miejsce ?? z.sekcja ?? "";
    const klucz = `${m.rodzaj === "karta" ? "k" : ""}|${z.url}|${miejsca}`;
    const opis = linia.replace(GRUPA_ID, "").replaceAll(ETYKIETA_OGOLNA, "").replace(/\[\[[^\]]*\]\]/g, "")
      .replace(/\s+/g, " ").replace(/\s+([.,;:!?…])/g, "$1").trim();
    let zapis = this.zrodlaOdp.find((x) => x.klucz === klucz);
    if (!zapis) {
      const cytat = [...linia.matchAll(/„([^”]{8,380})”/g)].map((x) => x[1]).find((c) => normalizuj(m.tekst).includes(normalizuj(c)));
      zapis = { klucz, zrodlo: { ...z, dowod: dowodDla(m, cytat) }, wiersze: [] };
      this.zrodlaOdp.push(zapis);
    }
    if (opis && !zapis.wiersze.includes(opis)) zapis.wiersze.push(przytnij(opis, 240));
    return this.zrodlaOdp.indexOf(zapis) + 1;
  }
}

const dowodDla = (m: Material, cytat?: string) => cytat ?? przytnij(m.tekst.replace(/\s+/g, " ").trim(), 400);

/**
 * Filtr strumienia dla zwykłego czatu: zapis priorytetu tylko na wyraźną prośbę ucznia.
 * Zdania są wysyłane po całości, żeby wyciąć też obietnicę „dodałam do twoich priorytetów”.
 */
export class FiltrCzatu {
  private bufor = "";
  constructor(private readonly zapisPriorytetu: boolean) {}

  private przetworz(tekst: string): string {
    if (this.zapisPriorytetu) return tekst;
    return tekst.split(/(?<=[.!?…\n])/).filter((zdanie) => !OBIETNICA_PRIORYTETU.test(zdanie))
      .join("").replace(ZNACZNIK_PRIORYTETU, "");
  }

  dodaj(delta: string): string {
    if (this.zapisPriorytetu) return delta;
    this.bufor += delta;
    // Zatrzymujemy końcówkę po ostatnim końcu zdania oraz każdy niedomknięty znacznik.
    let granica = Math.max(this.bufor.lastIndexOf("\n") + 1, ...[...this.bufor.matchAll(/[.!?…](?=\s)/g)].map((m) => m.index! + 1));
    const otwarty = this.bufor.lastIndexOf("[[") > this.bufor.lastIndexOf("]]") ? this.bufor.lastIndexOf("[[")
      : this.bufor.endsWith("[") ? this.bufor.length - 1 : -1;
    if (otwarty >= 0) granica = Math.min(granica, otwarty);
    if (granica <= 0) return "";
    const gotowe = this.bufor.slice(0, granica);
    this.bufor = this.bufor.slice(granica);
    return this.przetworz(gotowe);
  }

  zakoncz(): string {
    const reszta = this.bufor;
    this.bufor = "";
    return this.zapisPriorytetu ? reszta : this.przetworz(reszta).replace(/\[\[[^\]]*$/, "");
  }
}
