// Odpowiedź rysunkiem na figurze z arkusza (zadania „narysuj”, „dorysuj”, „zaznacz na mapie”).
// Rysunek to kreski wektorowe we współrzędnych figury (punkty PDF), więc skalują się razem z obrazem
// i zajmują kilka KB. Leży w odpowiedziach jak reszta postępu: „<nr>:rysunek” (JSON), „<nr>:opis”
// (tekst ucznia), a odpowiedź pytania „<nr>” to znacznik z opisem, żeby licznik odpowiedzi, werdykt
// i omawianie błędów traktowały rysunek jak każdą inną odpowiedź.
import type { Obraz } from "./typy";

export type KolorKreski = "c" | "p" | "n" | "z";
// k: kolor, g: grubość w punktach figury, p: x1,y1,x2,y2,… w punktach figury (jedna cyfra po przecinku).
export type Kreska = { k: KolorKreski; g: number; p: number[] };

export const KOLORY_KRESEK: { id: KolorKreski; wartosc: string; nazwa: string }[] = [
  { id: "c", wartosc: "#1b232e", nazwa: "czarny" },
  { id: "p", wartosc: "#ff7448", nazwa: "pomarańczowy" },
  { id: "n", wartosc: "#2f55b4", nazwa: "niebieski" },
  { id: "z", wartosc: "#1f9d63", nazwa: "zielony" },
];
export const GRUBOSC_KRESKI = 1.6;
export const ZNACZNIK_RYSUNKU = "[rysunek]";
/** Powyżej tego rozmiaru JSON-a kolejne kreski nie są przyjmowane (jedna odpowiedź to kilka KB, zwykle poniżej 20). */
export const MAKS_ZNAKOW_RYSUNKU = 120_000;

export const kluczRysunku = (nr: string) => `${nr}:rysunek`;
export const kluczOpisu = (nr: string) => `${nr}:opis`;

const jestKolorem = (k: unknown): k is KolorKreski => KOLORY_KRESEK.some((x) => x.id === k);

export function czytajRysunek(zapis: string | undefined): Kreska[] {
  if (!zapis) return [];
  try {
    const dane: unknown = JSON.parse(zapis);
    const lista = dane && typeof dane === "object" && "k" in dane ? (dane as { k: unknown }).k : null;
    if (!Array.isArray(lista)) return [];
    return lista.flatMap((x): Kreska[] => {
      const { k, g, p } = (x ?? {}) as Partial<Kreska>;
      if (!jestKolorem(k) || typeof g !== "number" || !Array.isArray(p) || p.length < 2 || p.length % 2 || !p.every((n) => Number.isFinite(n))) return [];
      return [{ k, g, p }];
    });
  } catch {
    return [];
  }
}

export const zapiszRysunek = (kreski: Kreska[]) => (kreski.length ? JSON.stringify({ v: 1, k: kreski }) : "");

/** Klucze odpowiedzi do zapisania naraz: rysunek, opis i odpowiedź zbiorcza pytania. */
export function odpowiedziRysunku(nr: string, kreski: Kreska[], opis: string): Record<string, string> {
  const zapis = zapiszRysunek(kreski);
  const slowa = opis.trim();
  return {
    [kluczRysunku(nr)]: zapis,
    [kluczOpisu(nr)]: opis,
    [nr]: [zapis ? ZNACZNIK_RYSUNKU : "", slowa].filter(Boolean).join("\n"),
  };
}

/** Upraszcza kreskę (Ramer–Douglas–Peucker, tolerancja w punktach figury) i zaokrągla do 0,1. */
export function uprosc(p: number[], tolerancja = 0.35): number[] {
  const n = p.length / 2;
  if (n > 2) {
    const zostaw = new Uint8Array(n);
    zostaw[0] = zostaw[n - 1] = 1;
    const stos: [number, number][] = [[0, n - 1]];
    while (stos.length) {
      const [a, b] = stos.pop()!;
      let max = 0;
      let idx = -1;
      const dx = p[2 * b] - p[2 * a];
      const dy = p[2 * b + 1] - p[2 * a + 1];
      const dl = Math.hypot(dx, dy);
      for (let i = a + 1; i < b; i++) {
        const px = p[2 * i] - p[2 * a];
        const py = p[2 * i + 1] - p[2 * a + 1];
        const d = dl ? Math.abs(dx * py - dy * px) / dl : Math.hypot(px, py);
        if (d > max) {
          max = d;
          idx = i;
        }
      }
      if (idx >= 0 && max > tolerancja) {
        zostaw[idx] = 1;
        stos.push([a, idx], [idx, b]);
      }
    }
    p = p.filter((_, i) => zostaw[i >> 1]);
  }
  return p.map((v) => Math.round(v * 10) / 10);
}

/** Odległość punktu od odcinka kreski (do gumki), w punktach figury. */
export function odlegloscOdKreski(k: Kreska, x: number, y: number): number {
  const { p } = k;
  if (p.length === 2) return Math.hypot(x - p[0], y - p[1]);
  let min = Infinity;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const [ax, ay, bx, by] = [p[i], p[i + 1], p[i + 2], p[i + 3]];
    const dx = bx - ax;
    const dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))) : 0;
    min = Math.min(min, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return min;
}

/** Ścieżka SVG kreski; pojedynczy punkt to kropka (kreska zerowej długości z okrągłym końcem). */
export function sciezkaKreski(p: number[]): string {
  let d = `M${p[0]} ${p[1]}`;
  if (p.length === 2) return `${d}h0.01`;
  for (let i = 2; i < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`;
  return d;
}

export type PngRysunku = { mime: "image/png" | "image/jpeg"; base64: string; dataUrl: string };

const MAKS_BAJTOW_OBRAZU = 900 * 1024; // serwer przyjmuje do 1 MB po zdekodowaniu

function wczytajObraz(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, blad) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => blad(new Error("figure_load_failed"));
    img.src = src;
  });
}

const bajty = (dataUrl: string) => Math.floor(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);

/**
 * Figura z rysunkiem ucznia jako jeden obraz (białe tło) do sprawdzenia przez Pestkę.
 * PNG; gdy większy niż ~900 KB, najpierw zmniejszany, na końcu JPEG.
 */
export async function rysunekDoPng(obraz: Obraz, kreski: Kreska[], adres: string): Promise<PngRysunku> {
  const img = await wczytajObraz(adres);
  // Szerokość w pikselach: natywna (kadry mają 2 px na punkt), dłuższy bok najwyżej 1400.
  const naturalna = img.naturalWidth || obraz.szer * 2;
  let skala = Math.min(1, 1400 / Math.max(naturalna, (naturalna * obraz.wys) / obraz.szer));
  for (let proba = 0; ; proba++) {
    const szer = Math.max(1, Math.round(naturalna * skala));
    const wys = Math.max(1, Math.round((szer * obraz.wys) / obraz.szer));
    const plotno = document.createElement("canvas");
    plotno.width = szer;
    plotno.height = wys;
    const ctx = plotno.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, szer, wys);
    ctx.drawImage(img, 0, 0, szer, wys);
    const s = szer / obraz.szer;
    ctx.lineCap = ctx.lineJoin = "round";
    for (const k of kreski) {
      ctx.strokeStyle = KOLORY_KRESEK.find((c) => c.id === k.k)!.wartosc;
      ctx.lineWidth = k.g * s;
      ctx.stroke(new Path2D(sciezkaKreski(k.p.map((v) => v * s))));
    }
    const jpeg = proba >= 3;
    const dataUrl = plotno.toDataURL(jpeg ? "image/jpeg" : "image/png", 0.88);
    if (jpeg || bajty(dataUrl) <= MAKS_BAJTOW_OBRAZU) return { mime: jpeg ? "image/jpeg" : "image/png", base64: dataUrl.slice(dataUrl.indexOf(",") + 1), dataUrl };
    skala *= 0.75;
  }
}

/**
 * Ocena rysunków przez Pestkę (nauka-ai, akcja „ocen-rozwiazanie”) czeka na serwer: dziś ocenia on tylko
 * matematykę i informatykę. Do czasu wdrożenia zostaje samoocena z zasadami CKE; po wdrożeniu przełącz na true.
 */
export const OCENA_RYSUNKOW_AI = false;
