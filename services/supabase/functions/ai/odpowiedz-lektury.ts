// Obróbka odpowiedzi modelu o lekturze po stronie serwera: identyfikatory materiałów → źródła,
// etykieta „z ogólnej wiedzy” przy wszystkim, co nie ma oparcia w materiałach Sedno, kontrola cytatów,
// blokada zapisu priorytetu bez prośby ucznia.
import type { ZrodloPestki } from "../_shared/pestka-odpowiedz.ts";
import { normalizuj } from "./lektury.ts";
import type { Material } from "./material-lektury.ts";

export const ETYKIETA_OGOLNA = "(z ogólnej wiedzy, sprawdź w tekście)";
export const BRAK_MATERIALU = "Sedno nie ma materiału, który rozstrzyga to pytanie. Sprawdź w tekście utworu (Wolne Lektury) albo zapytaj inaczej.";
export const POMINIETO = "Pominięto fragment odpowiedzi, którego nie da się potwierdzić w materiałach Sedno. Sprawdź go w tekście.";

const GRUPA_ID = /\[\s*((?:(?:[WPMUF]\d{1,4}|S:[a-z]+|K|OW)\s*[,;]?\s*)+)\]/g;
const TOKEN = /[WPMUF]\d{1,4}|S:[a-z]+|K|OW/g;
const AKCJA = /^\[\[akcja:(?:krok|przyklad|sprawdz)\]\]$/;
const ZNACZNIK_PRIORYTETU = /\[\[\s*priorytet\s*:[^\]]*\]\]/gi;
// Model potrafi napisać, że dopisał priorytet, choć o to nie proszono.
const OBIETNICA_PRIORYTETU = /\b(?:dodał|dopisał|zapisał|ustawił)(?:am|em|o)\b[^.!?\n]{0,80}\bpriorytet|\bdo (?:twoich|Twoich) priorytet/i;
// Zdanie, w którym Pestka uczciwie mówi o braku materiału, nie wymaga etykiety.
const PRZYZNANIE_BRAKU = /\bSedno\b[^.\n]{0,60}\b(?:nie ma|brak)|\bnie ma (?:tego |tej |go )?w (?:materiałach|opracowaniu)|z ogólnej wiedzy|\bnie wiem\b|\bnie jestem pewn/i;

export type OpcjeProcesora = { pytanie: string; zapisPriorytetu: boolean };

const slowa = (t: string) => t.split(/\s+/).filter(Boolean).length;
const przytnij = (t: string, n: number) => t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, "");

/** Cytaty w cudzysłowie „…” (min. 4 słowa i 18 znaków) muszą występować w materiałach albo w pytaniu ucznia. */
function cytatyNiepotwierdzone(linia: string, wzorzec: string): boolean {
  return [...linia.matchAll(/„([^”]{18,400})”/g)].some((m) => slowa(m[1]) >= 4 && !wzorzec.includes(normalizuj(m[1])));
}

export class ProcesorOdpowiedzi {
  private bufor = "";
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
    if (!linia.trim()) {
      if (this.ostatniaPusta) return "";
      this.ostatniaPusta = true;
      return "\n";
    }
    if (AKCJA.test(linia.trim())) return this.emituj(linia.trim());
    const bezPriorytetu = this.opcje.zapisPriorytetu ? linia : linia.replace(ZNACZNIK_PRIORYTETU, "").trimEnd();
    if (!bezPriorytetu.trim()) return "";
    if (!this.opcje.zapisPriorytetu && OBIETNICA_PRIORYTETU.test(bezPriorytetu)) return "";

    let ogolna = false;
    const trafione: Material[] = [];
    const tekstBezId = bezPriorytetu.replace(GRUPA_ID, (grupa) => {
      for (const id of grupa.match(TOKEN) ?? []) {
        if (id === "OW") ogolna = true;
        else {
          const m = this.mapa.get(id);
          if (m && !trafione.includes(m)) trafione.push(m);
        }
      }
      return "\u0000";
    });
    if (cytatyNiepotwierdzone(bezPriorytetu, this.wzorzec)) {
      this.pominieto = true;
      return "";
    }
    // Znaczniki wstawiamy w miejsce grup identyfikatorów, nieznane identyfikatory znikają.
    let i = 0;
    const grupy = [...bezPriorytetu.matchAll(GRUPA_ID)];
    const tekst = tekstBezId.replace(/\u0000/g, () => {
      const g = grupy[i++];
      return (g?.[1].match(TOKEN) ?? []).map((id) => {
        const m = this.mapa.get(id);
        const numer = m?.zrodlo && this.zarejestruj(m, bezPriorytetu);
        return numer ? `[[zrodlo:${numer}]]` : "";
      }).join("");
    }).replace(/[ \t]{2,}/g, " ").replace(/[ \t]+([.,;:!?…])/g, "$1").replace(/[ \t]+(?=\[\[zrodlo)/g, " ").trimEnd();

    const bezZnacznikow = tekst.replace(/\[\[[^\]]*\]\]/g, "").trim();
    const zwolniona = /[:?]$/.test(bezZnacznikow) || /^#{1,6}\s/.test(bezZnacznikow) || slowa(bezZnacznikow.replace(/^[-*\d.\s]+/, "")) < 5 ||
      PRZYZNANIE_BRAKU.test(bezZnacznikow);
    const dopisek = (!trafione.length || ogolna) && !zwolniona ? ` ${ETYKIETA_OGOLNA}` : "";
    return this.emituj(`${tekst}${dopisek}`);
  }

  /** Numer źródła w odpowiedzi (od 1); to samo miejsce w utworze ma jeden numer. */
  private zarejestruj(m: Material, linia: string): number {
    const z = m.zrodlo!;
    const klucz = `${m.rodzaj === "karta" ? "k" : ""}|${z.url}|${z.miejsce ?? z.sekcja ?? ""}`;
    const opis = linia.replace(GRUPA_ID, "").replace(/\[\[[^\]]*\]\]/g, "").replace(/\s+/g, " ").replace(/\s+([.,;:!?…])/g, "$1").trim();
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
