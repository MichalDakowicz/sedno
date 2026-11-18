// Omawianie błędów z Pestką: które zadania omówić, jak opisać je modelowi i jak zrobić
// zadanie podobne do sprawdzenia, czy uczeń zrozumiał.
import { askAi, type AiMessage, type Tier } from "../ai";
import { promptPestki } from "../pestka";
import type { Postep } from "./postep";
import { liczSlowa, policzPytania, werdykt, zakresSlow } from "./sprawdz";
import { nazwaPrzedmiotu, type Arkusz, type Pytanie, type Zadanie } from "./typy";

export type DoOmowienia = { zadanie: Zadanie; wypracowanie: boolean };

/** Zadania z odpowiedzią i bez kompletu punktów oraz napisane wypracowania. Puste zadania pomijamy. */
export function doOmowienia(a: Arkusz, p: Postep): DoOmowienia[] {
  return a.zadania.flatMap((z): DoOmowienia[] => {
    const odpowiedziane = z.pytania.filter((q) => p.odpowiedzi[q.nr]?.trim());
    if (!odpowiedziane.length) return [];
    if (z.pytania.some((q) => q.typ === "wypowiedz")) return [{ zadanie: z, wypracowanie: true }];
    const w = policzPytania(z.pytania, p.odpowiedzi, p.samoocena);
    return w.zdobyte < w.mozliwe ? [{ zadanie: z, wypracowanie: false }] : [];
  });
}

/** Luna (zadania lekkie) wystarcza do zadań każdego przedmiotu; sol (ważne) tylko do wypracowań. */
export const poziomAI = (d: DoOmowienia): Tier => (d.wypracowanie ? "wazne" : "lekkie");

const tex = (t: string) => t.replace(/\\\((.+?)\\\)/g, (_, w: string) => `$${w}$`);

function ocena(q: Pytanie, odp: string | undefined): string {
  const w = werdykt(q, odp);
  return w === "dobrze" ? "dobrze" : w === "zle" ? "źle" : w === "pusto" ? "brak odpowiedzi" : "do oceny według zasad";
}

/** Zakres długości z polecenia, liczony z tego samego tekstu co zakres przy polu pisania. */
function zakresZadania(z: Zadanie): [number, number] | null {
  return zakresSlow([...z.polecenie, ...z.bloki.map((b) => ("tekst" in b ? b.tekst : ""))].join(" "));
}

function opisPytania(q: Pytanie, odp: string | undefined, z: Zadanie): string {
  const linie = [`Pytanie ${q.nr} (${q.punkty} pkt): ${tex(q.tresc)}`];
  if (q.typ === "wypowiedz") {
    if (q.poczatek) linie.push(`Początek podany w arkuszu (nie wlicza się do limitu słów):\n${q.poczatek}`);
    linie.push(`Tekst ucznia:\n${odp ?? ""}`);
    const zakres = zakresZadania(z);
    linie.push(`Liczba słów ucznia (policzona przez aplikację, bez początku): ${liczSlowa(odp ?? "")}${zakres ? `; wymagane: ${zakres[0]}–${zakres[1]}` : ""}.`);
    return linie.join("\n");
  }
  if (q.typ === "zamkniete") q.opcje?.forEach((o) => linie.push(`${o.litera}. ${tex(o.tresc)}`));
  linie.push(`Odpowiedź ucznia: ${odp?.trim() || "(brak)"}`);
  if (q.typ === "zamkniete") linie.push(`Poprawna odpowiedź (klucz CKE): ${q.poprawna}`);
  else {
    if (q.oczekiwane?.length) linie.push(`Poprawne odpowiedzi (klucz CKE): ${q.oczekiwane.join("; ")}`);
    if (q.akceptowane?.length) linie.push(`Też akceptowane: ${q.akceptowane.join("; ")}`);
    if (q.opis) linie.push(`Zasady oceniania: ${q.opis}`);
  }
  linie.push(`Ocena: ${ocena(q, odp)}`);
  return linie.join("\n");
}

/** Treść zadania z odpowiedziami ucznia i kluczem, tekstem dla modelu. */
export function tekstZadania(z: Zadanie, p: Postep): string {
  const pytania = new Map(z.pytania.map((q) => [q.nr, q]));
  const uzyte = new Set<string>();
  const linie: string[] = [`Zadanie ${z.nr}. (${z.punkty} pkt)`];
  for (const b of z.bloki) {
    if (b.typ === "akapit" || b.typ === "naglowek" || b.typ === "zrodlo") linie.push(tex(b.tekst));
    else if (b.typ === "wzor") linie.push(`$$${b.tex}$$`);
    else if (b.typ === "tabelaTresci") linie.push(b.wiersze.map((w) => w.join(" | ")).join("\n"));
    else if (b.typ === "kadr") linie.push(tex(b.tekst));
    else if (b.typ === "kod") linie.push(["```", b.tekst, "```"].join("\n"));
    else if (b.typ === "rysunek") linie.push("[W zadaniu jest rysunek, którego nie widzisz. Nie zgaduj jego szczegółów.]");
    else if (b.typ === "opcje") linie.push(b.opcje.map((o) => `${o.litera}. ${tex(o.tresc)}`).join("\n"));
    else if (b.typ === "pytanie" || b.typ === "pytania" || b.typ === "tabela")
      for (const nr of b.typ === "pytanie" ? [b.nr] : b.nr) {
        const q = pytania.get(nr);
        if (!q) continue;
        linie.push(opisPytania(q, p.odpowiedzi[nr], z));
        uzyte.add(nr);
      }
  }
  for (const q of z.pytania) if (!uzyte.has(q.nr)) linie.push(opisPytania(q, p.odpowiedzi[q.nr], z));
  return linie.join("\n\n");
}

/** Prompt systemowy rozmowy o jednym zadaniu. */
export function promptOmowienia(a: Arkusz, d: DoOmowienia, p: Postep, krotko?: boolean): string {
  const przedmiot = `${nazwaPrzedmiotu[a.przedmiot] ?? a.przedmiot}, poziom ${a.poziom}`;
  const zasady = d.wypracowanie
    ? [
        "Omawiasz z uczniem jego wypracowanie z tego arkusza.",
        "Zacznij od jednej mocnej strony tekstu, potem wskaż jedną, najważniejszą rzecz do poprawy i zapytaj, jak by ją poprawił.",
        "Nie przepisuj wypracowania za ucznia. Cytuj krótkie fragmenty, gdy pokazujesz błąd.",
        "Nie oceniaj długości na oko: opieraj się na podanej liczbie słów i wspominaj o długości tylko wtedy, gdy wypada poza wymaganym zakresem.",
      ]
    : [
        "Omawiasz z uczniem jego błąd w tym zadaniu z arkusza. Znasz jego odpowiedź i klucz CKE; klucz jest pewny, nie podważaj go.",
        "Na start krótko nazwij, co uczeń zaznaczył lub napisał, i zadaj jedno pytanie, które naprowadzi go na błąd. Nie podawaj od razu poprawnej odpowiedzi.",
        "Gdy uczeń dojdzie do rozwiązania albo dwa razy utknie, wyjaśnij krótko, dlaczego poprawna odpowiedź jest poprawna, a jego nie.",
      ];
  return [promptPestki({ przedmiot, krotko, zadanie: tekstZadania(d.zadanie, p) }), ...zasady].join("\n");
}

export type Przyklad = { tresc: string; opcje: Record<string, string>; poprawna: string; wyjasnienie: string };

function json<T>(tekst: string): T | null {
  const m = tekst.match(/\{[\s\S]*\}/);
  try {
    return m ? (JSON.parse(m[0]) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Zadanie zamknięte podobne do omawianego. Model je tworzy, a drugie zapytanie rozwiązuje je
 * niezależnie: pokazujemy tylko takie, przy którym obie odpowiedzi się zgadzają.
 */
export async function zrobPrzyklad(a: Arkusz, d: DoOmowienia, p: Postep): Promise<Przyklad | null> {
  const przedmiot = nazwaPrzedmiotu[a.przedmiot] ?? a.przedmiot;
  for (let proba = 0; proba < 2; proba++) {
    const tworz: AiMessage[] = [
      {
        role: "system",
        content:
          `Tworzysz krótkie zadanie zamknięte z przedmiotu ${przedmiot} (matura, poziom ${a.poziom}) sprawdzające tę samą umiejętność co zadanie poniżej, z innymi danymi. ` +
          'Odpowiadasz wyłącznie JSON-em: {"tresc": "...", "opcje": {"A": "...", "B": "...", "C": "...", "D": "..."}, "poprawna": "A", "wyjasnienie": "1–2 zdania"}. ' +
          "Dokładnie jedna odpowiedź ma być poprawna. Wzory w LaTeX-u w $...$. Pisz po polsku, chyba że to zadanie z języka angielskiego.",
      },
      { role: "user", content: tekstZadania(d.zadanie, p) },
    ];
    const zad = json<Przyklad>((await askAi({ tier: "lekkie", task: "omowienie-przyklad", messages: tworz })).text);
    if (!zad?.tresc || !zad.opcje?.[zad.poprawna]) continue;
    const opcje = Object.entries(zad.opcje)
      .map(([l, t]) => `${l}. ${t}`)
      .join("\n");
    const rozwiaz: AiMessage[] = [
      { role: "system", content: 'Rozwiąż zadanie. Odpowiadasz wyłącznie JSON-em: {"odpowiedz": "litera"}.' },
      { role: "user", content: `${zad.tresc}\n${opcje}` },
    ];
    const r = json<{ odpowiedz: string }>((await askAi({ tier: "lekkie", task: "omowienie-sprawdzenie", messages: rozwiaz })).text);
    if (r?.odpowiedz?.trim().toUpperCase() === zad.poprawna.trim().toUpperCase()) return zad;
  }
  return null;
}

// Linie z kluczem i oceną z opisu pytania (opisPytania): przed sprawdzeniem nie mogą trafić do modelu.
const KLUCZ = /^(Poprawna odpowiedź|Poprawne odpowiedzi|Też akceptowane|Zasady oceniania|Ocena:)/;

/** Zadanie jako kontekst rozmowy z Pestką. Przed sprawdzeniem bez klucza, żeby nie zdradziła odpowiedzi. */
export function kontekstZadania(z: Zadanie, p: Pick<Postep, "odpowiedzi" | "samoocena">, sprawdzone: boolean): string {
  const tekst = tekstZadania(z, { sprawdzony: sprawdzone, sprawdzoneZadania: [], ...p });
  if (sprawdzone) return tekst;
  const bez = tekst.split("\n").filter((l) => !KLUCZ.test(l)).join("\n");
  return `${bez}\n\nUczeń jeszcze nie sprawdził tego zadania. Nie podawaj poprawnej odpowiedzi ani nie mów, czy jego odpowiedź jest dobra: naprowadzaj pytaniami.`;
}
