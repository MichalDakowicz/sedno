import { mkdir, writeFile, access, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { KATALOG_CKE } from "./sciezki.js";
import { klasyfikuj } from "./pliki.js";
import { ascii, identyfikator, MIESIACE } from "./sesje.js";

const CKE = "https://cke.gov.pl";
const FORMULY = ["2023", "2015"];
const CZESCI = [undefined, "Część 1", "Część 2"];
const katalog = new Map();
const adresyPlikow = new Map();

async function pobierz(url) {
  for (let proba = 1; ; proba++) {
    try {
      const odp = await fetch(url, { signal: AbortSignal.timeout(45_000) });
      if (odp.ok || odp.status < 500 && odp.status !== 429 || proba === 3) return odp;
    } catch (e) {
      if (proba === 3) throw e;
    }
    await new Promise((koniec) => setTimeout(koniec, proba * 500));
  }
}

async function linki(url) {
  const odp = await pobierz(url);
  if (!odp.ok) throw new Error(String(odp.status));
  const html = await odp.text();
  return [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>(.*?)<\/a>/gis)].flatMap(([, href, etykieta]) => {
    if (!/^(?:https?:|\/|[^#:/]+\/)/i.test(href)) return [];
    const adres = new URL(href.replace(/&amp;|&#038;/g, "&"), url);
    if (!["cke.gov.pl", "www.cke.gov.pl"].includes(adres.hostname) || !/^https?:$/.test(adres.protocol) || adres.hash) return [];
    adres.protocol = "https:";
    return [{ url: adres.href, etykieta: etykieta.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() }];
  });
}

function dodaj(plik, wynik) {
  const { przedmiot, formula, rok, poziom, termin, sesja, czesc, typ } = wynik;
  const metadane = { przedmiot, formula, rok, poziom, termin, sesja };
  const id = identyfikator(metadane);
  if (!katalog.has(id)) katalog.set(id, { metadane, zeszyty: new Map() });
  const { zeszyty } = katalog.get(id);
  if (!zeszyty.has(czesc)) zeszyty.set(czesc, {});
  const wpis = zeszyty.get(czesc);
  (wpis[typ] ??= new Map()).set(plik.url, plik);
}

const strony = new Map();
for (const formula of FORMULY) {
  const baza = CKE + "/egzamin-maturalny/egzamin-maturalny-w-formule-" + formula + "/";
  for (const dzial of ["arkusze/", "materialy-dodatkowe/", "archiwum/"]) {
    for (const l of await linki(baza + dzial)) {
      if (!l.url.startsWith(baza)) continue;
      const miesiac = MIESIACE.findIndex((m) => l.etykieta.toLowerCase().includes(m)) + 1;
      const rok = Number(l.etykieta.match(/\b20\d{2}\b/)?.[0]);
      if (/^20\d{2}$/.test(l.etykieta)) strony.set(l.url, { formula, rok });
      else if (miesiac && rok && (/^(?:arkusze diagnostyczne|próbny egzamin|(?:egzamin maturalny.*)?test diagnostyczny)/i.test(l.etykieta)
        || /\/arkusze-pokazowe-marzec-2022\/$/.test(l.url))) {
        strony.set(l.url, { formula, rok, miesiac, termin: "probny" });
      } else if (formula === "2015" && l.url.endsWith("probny-egzamin-maturalny-2021/")) {
        strony.set(l.url, { formula, rok: 2021, miesiac: 3, termin: "probny" });
      } else if (formula === "2015" && /\/probny-egzamin-maturalny-2020\/?$/.test(l.url)) {
        strony.set(l.url, { formula, rok: 2020, miesiac: 4, termin: "probny" });
      } else if (formula === "2015" && l.url === baza + "materialy-dodatkowe/probny-egzamin/") {
        const nazwy = { "jezyk-polski": "polski", "jezyk-angielski": "angielski", "jezyk-lacinski": "lacina",
          matematyka: "matematyka", informatyka: "informatyka", biologia: "biologia", chemia: "chemia",
          fizyka: "fizyka", geografia: "geografia", historia: "historia", filozofia: "filozofia", "wiedza-o-spoleczenstwie": "wos" };
        for (const pod of await linki(l.url)) {
          if (!pod.url.startsWith(l.url) || pod.url.includes("/historia-muzyki") || pod.url.includes("/historia-sztuki")) continue;
          const przedmiot = Object.entries(nazwy).find(([n]) => pod.url.startsWith(l.url + n + "-"))?.[1];
          if (przedmiot) strony.set(pod.url, { formula, przedmiot, rok: 2014, miesiac: 12, termin: "probny" });
        }
      }
    }
  }
}

const odwiedzone = new Set();
const brakiStron = [];
while ([...strony.keys()].some((url) => !odwiedzone.has(url))) {
  const paczka = [...strony].filter(([url]) => !odwiedzone.has(url));
  const wyniki = await Promise.allSettled(paczka.map(([url]) => linki(url)));
  for (const [i, [url, strona]] of paczka.entries()) {
    odwiedzone.add(url);
    const wynik = wyniki[i];
    if (wynik.status === "rejected") {
      brakiStron.push(url + " (" + wynik.reason.message + ")");
      continue;
    }
    let ile = 0;
    for (const l of wynik.value) {
      const sciezka = new URL(l.url).pathname;
      if (!/\.(pdf|docx|zip|mp3)$/i.test(sciezka)) {
        const nazwa = ascii(l.etykieta);
        const termin = /(?:termin|sesja) dodatkow|^arkusze.*\b(?:czerwiec|lipiec)\b/.test(nazwa) ? "dodatkowy"
          : /(?:termin|sesja) poprawkow|^arkusze.*\b(?:sierpien|wrzesien)\b/.test(nazwa) ? "poprawkowy" : null;
        if (termin && sciezka.includes("/arkusze/") && !strony.has(l.url)) {
          const miesiac = termin === "dodatkowy" ? (strona.rok === 2020 ? 7 : 6) : (strona.rok === 2020 ? 9 : 8);
          strony.set(l.url, { ...strona, termin, miesiac });
        }
        continue;
      }
      let nazwa;
      try {
        nazwa = decodeURIComponent(sciezka.split("/").at(-1));
      } catch {
        continue;
      }
      if (/[<>:"/\\|?*\x00-\x1f]/.test(nazwa)) continue;
      const k = klasyfikuj(nazwa, strona, l.etykieta);
      if (!k || strona.rok && strona.rok !== k.rok) continue;
      dodaj({ url: l.url, nazwa }, k);
      ile++;
    }
    console.log("formuła " + strona.formula + ", " + strona.rok + (strona.termin ? " " + strona.termin : "") + ": " + ile + " pasujących linków · " + url);
  }
}

function sciezkaPliku(rok, { nazwa, url }) {
  const klucz = rok + "/" + nazwa;
  const poprzedni = adresyPlikow.get(klucz.toLowerCase());
  if (!poprzedni) adresyPlikow.set(klucz.toLowerCase(), url);
  if (!poprzedni || poprzedni === url) return klucz;
  const skrot = createHash("sha256").update(url).digest("hex").slice(0, 12);
  return rok + "/" + skrot + "/" + nazwa;
}

const lista = [];
const zlecenia = [];
for (const { metadane, zeszyty } of katalog.values()) {
  const czesci = [...zeszyty.keys()].filter(Boolean).sort();
  const wspolne = zeszyty.get(undefined) ?? {};
  for (const numer of czesci.length ? czesci : [undefined]) {
    const zeszyt = zeszyty.get(numer) ?? {};
    const czesc = CZESCI[numer];
    const w = { ...metadane, ...(czesc && { czesc }) };
    lista.push(w);
    for (const [typ, pliki] of Object.entries({ ...wspolne, ...zeszyt })) {
      if (typ === "dane" && numer === 1) continue;
      const kandydaci = [...pliki.values()];
      if (typ === "nagranie") w.nagranie = kandydaci[0].url;
      else zlecenia.push({ w, typ, pliki: kandydaci.map((p) => ({ ...p, plik: sciezkaPliku(w.rok, p) })) });
    }
  }
}

const pobrania = new Map();
async function zapisz({ plik, url }, typ) {
  if (!pobrania.has(plik)) pobrania.set(plik, (async () => {
    const cel = join(KATALOG_CKE, plik);
    if (await access(cel).then(() => true, () => false)) return;
    const odp = await pobierz(url);
    if (!odp.ok) throw new Error(String(odp.status));
    const bajty = Buffer.from(await odp.arrayBuffer());
    if (!(typ === "tresc" || typ === "dane" ? bajty.subarray(0, 2).equals(Buffer.from("PK")) : bajty.subarray(0, 5).equals(Buffer.from("%PDF-")))) {
      throw new Error("treść pliku niezgodna z rozszerzeniem");
    }
    await mkdir(join(KATALOG_CKE, ...plik.split("/").slice(0, -1)), { recursive: true });
    const tymczasowy = cel + "." + process.pid + ".tmp";
    try {
      await writeFile(tymczasowy, bajty);
      await rename(tymczasowy, cel);
    } finally {
      await unlink(tymczasowy).catch(() => {});
    }
  })());
  return pobrania.get(plik);
}

let nastepne = 0;
const brakiPobran = [];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (nastepne < zlecenia.length) {
    const { w, typ, pliki } = zlecenia[nastepne++];
    for (const p of pliki) {
      try {
        await zapisz(p, typ);
        w[typ] = { plik: p.plik, url: p.url };
        break;
      } catch (e) {
        brakiPobran.push(p.url + " (" + e.message + ")");
      }
    }
  }
}));

lista.sort((a, b) => a.przedmiot.localeCompare(b.przedmiot) || b.rok - a.rok || b.formula.localeCompare(a.formula)
  || a.poziom.localeCompare(b.poziom) || a.termin.localeCompare(b.termin) || (a.czesc ?? "").localeCompare(b.czesc ?? ""));
if (!lista.some((w) => w.arkusz)) throw new Error("CKE nie zwróciła żadnych arkuszy.");
const raport = { strony: brakiStron, pliki: brakiPobran, wpisy: [], terminy: [] };
for (const formula of FORMULY) {
  for (const termin of ["dodatkowy", "poprawkowy"]) {
    if (!lista.some((w) => w.formula === formula && w.termin === termin)) {
      raport.terminy.push(formula + ", termin " + termin + ": brak linków do arkuszy w sprawdzonych wykazach CKE");
    }
  }
}
for (const w of lista) {
  const oczekiwane = ["arkusz", "zasady"];
  if (w.przedmiot === "angielski") oczekiwane.push("nagranie");
  if (w.przedmiot === "informatyka" && w.czesc !== CZESCI[1]) oczekiwane.push("dane");
  const braki = oczekiwane.filter((typ) => !w[typ]);
  if (braki.length) raport.wpisy.push(identyfikator(w) + ": brak " + braki.join(", "));
}
const plik = join(KATALOG_CKE, "katalog.json");
await writeFile(plik + "." + process.pid + ".tmp", JSON.stringify(lista, null, 1));
await rename(plik + "." + process.pid + ".tmp", plik);
await writeFile(join(KATALOG_CKE, "braki.json"), JSON.stringify(raport, null, 1));
console.log("Katalog: " + lista.length + " wpisów");
for (const b of Object.values(raport).flat()) console.log("  ! " + b);
if (raport.strony.length) process.exitCode = 1;
