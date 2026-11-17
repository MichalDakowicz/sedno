import { exportToBlob } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { AiError } from "../ai";
import { currentUserId } from "../auth";
import { supabase } from "../supabase";

export type Punkt = [number, number];
export type Ksztalt =
  | { typ: "odcinek" | "strzalka" | "prostokat" | "elipsa"; punkty: [Punkt, Punkt] }
  | { typ: "trojkat"; punkty: [Punkt, Punkt, Punkt] };

export type DopisekPestki = { typ: "obliczenia" | "tekst" | "kod"; tekst: string };

export type OznaczenieBryly = "a" | "b" | "h" | "r" | "przekatnaPodstawy" | "przekatnaBryly" | "przeciwprostokatna" | "tworzaca";
export type BrylaPestki = {
  typ: "szescian" | "prostopadloscian" | "graniastoslup-trojkatny" | "ostroslup-czworokatny" | "walec" | "stozek" | "kula";
  wymiary: [number, number, number] | null;
  oznaczenia: Partial<Record<OznaczenieBryly, string>>;
};
export const DOMYSLNY_OBROT_BRYLY = 35;

export type OdpowiedzPestki = {
  odczyt: string | null;
  wskazowka: string;
  ksztalty: Ksztalt[];
  dopiski: DopisekPestki[];
  bryla: BrylaPestki | null;
  obrotBryly?: number;
  pominietoElementy?: boolean;
};

async function obrazTablicy(api: ExcalidrawImperativeAPI, signal: AbortSignal) {
  const elements = api.getSceneElements();
  if (!elements.length) return undefined;
  let obraz: Blob;
  try {
    obraz = await exportToBlob({
      elements,
      files: api.getFiles(),
      appState: { exportBackground: true, viewBackgroundColor: "#ffffff", exportWithDarkMode: false, exportEmbedScene: false, exportScale: 1 },
      maxWidthOrHeight: 1600,
      mimeType: "image/jpeg",
      quality: 0.9,
    });
  } catch {
    throw new AiError("bad_snapshot", 400);
  }
  signal.throwIfAborted();
  if (!obraz.size || obraz.size > 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(obraz.type)) {
    throw new AiError("bad_snapshot", 400);
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const wynik = typeof reader.result === "string" ? reader.result.split(",", 2)[1] : undefined;
      if (wynik) resolve(wynik);
      else reject(new AiError("bad_snapshot", 400));
    };
    reader.onerror = () => reject(new AiError("bad_snapshot", 400));
    reader.readAsDataURL(obraz);
  });
  return { mime: obraz.type, base64 };
}

export async function omowTablice(api: ExcalidrawImperativeAPI, user: string, polecenie: string, pytanie: string, signal: AbortSignal) {
  const obraz = await obrazTablicy(api, signal);
  if (!obraz && !pytanie) throw new AiError("empty_board", 400);
  signal.throwIfAborted();
  if (currentUserId() !== user) throw new AiError("not_signed_in", 401);
  const { data, error } = await supabase.functions.invoke<OdpowiedzPestki>("nauka-ai", {
    body: { action: "omow-brudnopis", polecenie, pytanie: pytanie || undefined, obraz },
    signal,
    timeout: 65_000,
  });
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    throw new AiError(typeof body?.error === "string" ? body.error : "server_error", error.context.status);
  }
  if (error || !data || typeof data.wskazowka !== "string" || !Array.isArray(data.ksztalty)) {
    throw new AiError("server_error", 500);
  }
  return { ...data, dopiski: Array.isArray(data.dopiski) ? data.dopiski : [], bryla: data.bryla ?? null };
}
