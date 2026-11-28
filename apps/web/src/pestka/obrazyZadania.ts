// Rysunki zadania z arkusza (fotografie, mapy, wykresy) jako obrazy dla Pestki: bez nich model odpowiada
// tylko na podstawie tekstu zadania. Obrazy leżą w danych arkusza jako data URL, więc czytamy je z sekcji zadania.
import type { AiContentPart } from "../ai";

const MAKS_OBRAZOW = 4;
const MAKS_BOK = 1600;
const MIN_BOK = 60;
// Limit serwera na jeden obraz to ~1,1 MB binarnie; zostawiamy zapas.
const MAKS_ZNAKOW = 1_300_000;

function wczytaj(src: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
}

/** Zmniejsza obraz do MAKS_BOK i zapisuje jako JPEG (białe tło), a przy zbyt dużym wyniku obniża jakość. */
async function przygotuj(src: string): Promise<string | null> {
  const img = await wczytaj(src);
  if (!img || Math.min(img.naturalWidth, img.naturalHeight) < MIN_BOK) return null;
  const skala = Math.min(1, MAKS_BOK / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * skala);
  canvas.height = Math.round(img.naturalHeight * skala);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const jakosc of [0.88, 0.7, 0.5]) {
    const url = canvas.toDataURL("image/jpeg", jakosc);
    if (url.length <= MAKS_ZNAKOW) return url;
  }
  return null;
}

/** Rysunki z sekcji zadania (bez powtórzeń, najwyżej cztery), gotowe do wysłania jako części wiadomości. */
export async function obrazyZadania(sekcja: HTMLElement): Promise<AiContentPart[]> {
  const zrodla = [...new Set([...sekcja.querySelectorAll<HTMLImageElement>("figure img")].map((i) => i.currentSrc || i.src).filter((s) => s.startsWith("data:image/") || s.startsWith("blob:") || s.includes("/dane/arkusze/")))];
  const wynik: AiContentPart[] = [];
  for (const src of zrodla.slice(0, MAKS_OBRAZOW)) {
    const url = await przygotuj(src).catch(() => null);
    if (url) wynik.push({ type: "image_url", image_url: { url } });
  }
  return wynik;
}
