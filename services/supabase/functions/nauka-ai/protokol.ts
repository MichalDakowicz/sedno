import type { ImagePart } from "../_shared/llm.ts";

const MAX_OBRAZ = 1024 * 1024;
const MAX_BASE64 = Math.ceil(MAX_OBRAZ / 3) * 4;
export const MAX_BODY = MAX_BASE64 + 12_288;
export const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;

export type Obiekt = Record<string, unknown>;
export type Zapytaj = (
  task: string, tier: "wazne" | "lekkie", instrukcja: string, dane: Obiekt, limit?: number, obraz?: ImagePart,
) => Promise<Obiekt>;

export class BladApi extends Error {
  constructor(readonly status: number, readonly kod: string) {
    super(kod);
  }
}

export function obiekt(wartosc: unknown): Obiekt | null {
  return wartosc !== null && typeof wartosc === "object" && !Array.isArray(wartosc) ? wartosc as Obiekt : null;
}

export function tekst(wartosc: unknown, max: number): string | null {
  if (typeof wartosc !== "string" || wartosc.length > max) return null;
  return wartosc.trim() || null;
}

export function wybierz<T extends string>(wartosc: unknown, dozwolone: readonly T[]): T | null {
  return dozwolone.find((wartoscDozwolona) => wartoscDozwolona === wartosc) ?? null;
}

export function obrazWiadomosci(raw: unknown): ImagePart | null {
  const dane = obiekt(raw);
  const mime = wybierz(dane?.mime, ["image/jpeg", "image/png", "image/webp"] as const);
  const base64 = dane?.base64;
  if (!mime || typeof base64 !== "string" || !base64.length || base64.length > MAX_BASE64 ||
    base64.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(base64)) return null;
  let ciag: string;
  try {
    ciag = atob(base64);
  } catch {
    return null;
  }
  if (ciag.length > MAX_OBRAZ) return null;
  const pasuje = mime === "image/png" ? ciag.startsWith("\x89PNG\r\n\x1a\n") :
    mime === "image/jpeg" ? ciag.startsWith("\xff\xd8\xff") :
    ciag.startsWith("RIFF") && ciag.slice(8, 12) === "WEBP";
  return pasuje ? { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } } : null;
}
