const MAKS_PDF = 6 * 1024 * 1024;
const WAZNOSC = 60 * 60_000;
const dokumenty = new Map<string, { doKiedy: number; strony: Promise<string[]> }>();

function adresCke(raw: string) {
  try {
    const url = new URL(raw);
    const oficjalny = ["cke.gov.pl", "www.cke.gov.pl"].includes(url.hostname);
    return url.protocol === "https:" && oficjalny && !url.username && !url.password && !url.port &&
      !url.search && !url.hash && url.pathname.startsWith("/images/_EGZAMIN_MATURALNY_OD_2023/") &&
      url.pathname.endsWith("-zasady.pdf") ? url.href : null;
  } catch {
    return null;
  }
}

async function danePdf(url: string) {
  const odpowiedz = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(9_000) });
  if (!odpowiedz.ok || !odpowiedz.body || Number(odpowiedz.headers.get("Content-Length")) > MAKS_PDF) {
    await odpowiedz.body?.cancel();
    throw new Error("rubric_pdf_unavailable");
  }
  const reader = odpowiedz.body.getReader();
  const czesci: Uint8Array[] = [];
  let rozmiar = 0;
  for (;;) {
    const wynik = await reader.read();
    if (wynik.done) break;
    rozmiar += wynik.value.byteLength;
    if (rozmiar > MAKS_PDF) {
      await reader.cancel();
      throw new Error("rubric_pdf_too_large");
    }
    czesci.push(wynik.value);
  }
  const dane = new Uint8Array(rozmiar);
  let pozycja = 0;
  for (const czesc of czesci) {
    dane.set(czesc, pozycja);
    pozycja += czesc.byteLength;
  }
  if (new TextDecoder().decode(dane.subarray(0, 5)) !== "%PDF-") throw new Error("rubric_pdf_invalid");
  return dane;
}

async function odczytajStrony(url: string) {
  const data = await danePdf(url);
  const { getDocument } = await import("npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs");
  const ladowanie = getDocument({ data, disableFontFace: true, useSystemFonts: false, isEvalSupported: false });
  try {
    const dokument = await ladowanie.promise;
    if (dokument.numPages > 100) throw new Error("rubric_pdf_too_long");
    const strony: string[] = [];
    for (let nr = 1; nr <= dokument.numPages; nr++) {
      const strona = await dokument.getPage(nr);
      const tresc = await strona.getTextContent();
      strony.push(tresc.items.map((w) => "str" in w ? w.str + (w.hasEOL ? "\n" : " ") : "").join("")
        .replace(/^.*(?:Egzamin maturalny z\s+matematyki|Strona\s+\d+\s+z\s+\d+|Zasady oceniania rozwiązań zadań).*$/gm, "")
        .replace(/[ \t]+/g, " "));
      strona.cleanup();
    }
    return strony;
  } finally {
    await ladowanie.destroy();
  }
}

function stronyDokumentu(url: string) {
  const zapis = dokumenty.get(url);
  if (zapis && zapis.doKiedy > Date.now()) return zapis.strony;
  for (const [klucz, wpis] of dokumenty) {
    if (wpis.doKiedy <= Date.now() || dokumenty.size >= 4) dokumenty.delete(klucz);
  }
  const strony = odczytajStrony(url).catch((blad: unknown) => {
    dokumenty.delete(url);
    throw blad;
  });
  dokumenty.set(url, { doKiedy: Date.now() + WAZNOSC, strony });
  return strony;
}

export function wytnijRubryke(tresc: string, numer: string, punkty: number) {
  const naglowki = [...tresc.matchAll(/\bZadanie\s+((?:\d\s*){1,3}(?:\.\s*(?:\d\s*){1,2})?)\.\s*\(\s*0\s*[–−-]\s*(\d+)\s*\)/gi)];
  const i = naglowki.findIndex((w) => w[1].replace(/\s/g, "") === numer && Number(w[2]) === punkty);
  if (i < 0) return null;
  const poczatek = naglowki[i].index + naglowki[i][0].length;
  const sekcja = tresc.slice(poczatek, naglowki[i + 1]?.index)
    .split(/(?:^|\n)\s*Ocena\s+prac\s+osób\s+ze\s+stwierdzoną\s+dyskalkulią\s*(?:\n|$)/i)[0];
  const rubryka = sekcja.match(/\bZasa\s*dy\s+ocen\s*ia\s*nia\b([\s\S]*)/i)?.[1]?.trim();
  if (!rubryka) return null;
  const [zasady, ...przyklady] = rubryka.split(/(?:^|\n)\s*(?:Przykładowe\s+(?:pełne\s+)?rozwiązani[ae]|Rozwiązanie)\s*(?:\n|$)/i);
  // Nie przekazujemy urwanej punktacji. Próg dla zera zamyka sekcję oceniania.
  if (!new RegExp(String.raw`\b${punkty}\s*punkt(?:y|ów)?\b|\b${punkty}\s*pkt\b`, "i").test(zasady) ||
    !/\b0\s*(?:pkt|punktów)\b/i.test(zasady) || zasady.length > 13_000) return null;
  return { zasady: zasady.trim(), rozwiazanie: przyklady.join("\n").trim().slice(0, 4500) || null };
}

export async function rubrykaCke(raw: string | null, numer: string, punkty: number, strona: number | null) {
  const url = raw && adresCke(raw);
  if (!url) return null;
  try {
    const strony = await stronyDokumentu(url);
    const wycinek = strona && strona <= strony.length ? strony.slice(Math.max(0, strona - 2), strona + 4).join("\n") : "";
    const sekcja = wytnijRubryke(wycinek, numer, punkty) ?? wytnijRubryke(strony.join("\n"), numer, punkty);
    return sekcja && { ...sekcja, pdf: url, strona };
  } catch (e) {
    console.warn("nauka-ocena: rubryka CKE niedostępna", e instanceof Error ? e.name : "Error");
    return null;
  }
}
