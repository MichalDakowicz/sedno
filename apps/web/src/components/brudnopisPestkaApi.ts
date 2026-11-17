import { CaptureUpdateAction, convertToExcalidrawElements, exportToBlob, getCommonBounds } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { AiError } from "../ai";
import { currentUserId } from "../auth";
import { supabase } from "../supabase";

type Punkt = [number, number];
type Ksztalt =
  | { typ: "odcinek" | "strzalka" | "prostokat" | "elipsa"; punkty: [Punkt, Punkt] }
  | { typ: "trojkat"; punkty: [Punkt, Punkt, Punkt] };

type OdpowiedzPestki = {
  odczyt: string | null;
  wskazowka: string;
  ksztalty: Ksztalt[];
};

type Szkielet = NonNullable<Parameters<typeof convertToExcalidrawElements>[0]>[number];
type PunktLinii = Extract<ExcalidrawElement, { type: "arrow" | "line" }>["points"][number];
const STYL = { strokeColor: "#2f55b4", strokeWidth: 2, roughness: 0 };
const ROZMIAR = 300;

function odcinek(a: Punkt, b: Punkt, type: "line" | "arrow" = "line"): Szkielet {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  return {
    ...STYL,
    type,
    x: a[0],
    y: a[1],
    width: Math.abs(dx),
    height: Math.abs(dy),
    points: [[0, 0] as PunktLinii, [dx, dy] as PunktLinii],
  };
}

export function wstawRysunekPestki(api: ExcalidrawImperativeAPI, ksztalty: OdpowiedzPestki["ksztalty"]) {
  if (!ksztalty.length) return;
  const scena = api.getSceneElements();
  const [x0, y0] = scena.length ? (() => {
    const [, y1, x2] = getCommonBounds(scena);
    return [x2 + 64, y1];
  })() : [0, 0];
  const przesun = ([x, y]: Punkt): Punkt => [x0 + x * ROZMIAR, y0 + y * ROZMIAR];
  const szkielety: Szkielet[] = ksztalty.flatMap((ksztalt): Szkielet[] => {
    if (ksztalt.typ === "trojkat") {
      const [a, b, c] = ksztalt.punkty.map(przesun);
      return [odcinek(a, b), odcinek(b, c), odcinek(c, a)];
    }
    const [a, b] = ksztalt.punkty.map(przesun);
    if (ksztalt.typ === "odcinek" || ksztalt.typ === "strzalka") {
      return [odcinek(a, b, ksztalt.typ === "strzalka" ? "arrow" : "line")];
    }
    return [{
      ...STYL,
      type: ksztalt.typ === "prostokat" ? "rectangle" : "ellipse",
      x: Math.min(a[0], b[0]),
      y: Math.min(a[1], b[1]),
      width: Math.abs(a[0] - b[0]),
      height: Math.abs(a[1] - b[1]),
    }];
  });
  // Wszystkie elementy propozycji trafiają do historii składu w jednym kroku.
  const grupa = crypto.randomUUID();
  const nowe = convertToExcalidrawElements(szkielety.map((e) => ({ ...e, groupIds: [grupa] })));
  api.setActiveTool({ type: "selection" });
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), ...nowe],
    appState: {
      selectedElementIds: Object.fromEntries(nowe.map((e) => [e.id, true])),
      selectedGroupIds: { [grupa]: true },
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  api.scrollToContent(nowe, { fitToViewport: true, viewportZoomFactor: 0.8, maxZoom: 1 });
}

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
  return data;
}
