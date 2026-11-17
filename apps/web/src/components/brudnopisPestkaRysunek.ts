import { CaptureUpdateAction, convertToExcalidrawElements, FONT_FAMILY, getCommonBounds, sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { rzutBryly } from "./brudnopisBryla";
import { DOMYSLNY_OBROT_BRYLY, type OdpowiedzPestki, type Punkt } from "./brudnopisPestkaApi";

type Szkielet = NonNullable<Parameters<typeof convertToExcalidrawElements>[0]>[number];
type PunktLinii = Extract<ExcalidrawElement, { type: "arrow" | "line" }>["points"][number];
const RYSUNEK = { strokeColor: "#2f55b4", strokeWidth: 2, roughness: 0 };
const ROZMIAR = 300;
const ZAPAS_TEKSTU = 8;

function czcionka(fontFamily: number, fontSize: number) {
  const rodzina = fontFamily === FONT_FAMILY.Cascadia ? "Cascadia, monospace" : "Excalifont, sans-serif";
  return fontSize + "px " + rodzina;
}

function dopasujTekst(e: ExcalidrawElement, ctx: CanvasRenderingContext2D | null) {
  if (e.type !== "text") return e;
  if (ctx) ctx.font = czcionka(e.fontFamily, e.fontSize);
  const linie = e.text.replace(/\t/g, "        ").split("\n");
  const szerokosci = linie.map((linia) => {
    const metryka = ctx?.measureText(linia);
    const zapasNaKod = e.fontFamily === FONT_FAMILY.Cascadia ? Array.from(linia).length * e.fontSize * 0.62 : 0;
    return Math.max(metryka?.width ?? 0, metryka?.actualBoundingBoxRight ?? 0, zapasNaKod);
  });
  // Bufor tekstu w Excalidraw odcina glify wystające poza zmierzoną szerokość.
  return { ...e, width: Math.max(e.width, ...szerokosci) + ZAPAS_TEKSTU };
}

function odcinek(punkty: Punkt[], type: "line" | "arrow" = "line", ukryta = false): Szkielet {
  const [[x, y]] = punkty;
  const xs = punkty.map((p) => p[0]);
  const ys = punkty.map((p) => p[1]);
  return {
    ...RYSUNEK, type, x, y, width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys),
    points: punkty.map(([px, py]) => [px - x, py - y] as PunktLinii),
    strokeStyle: ukryta ? "dashed" : "solid",
  };
}

export function przygotujZapisPestki(api: ExcalidrawImperativeAPI, { dopiski, ksztalty, bryla, obrotBryly }: OdpowiedzPestki) {
  const scena = api.getSceneElements();
  const [x0, y0] = scena.length ? (() => {
    const [, y1, x2] = getCommonBounds(scena);
    return [x2 + 64, y1];
  })() : [0, 0];
  const grupa = crypto.randomUUID();
  const styl = { strokeColor: RYSUNEK.strokeColor, groupIds: [grupa] };
  const pomiar = document.createElement("canvas").getContext("2d");
  let y = y0;
  const teksty = [{ typ: "tekst", tekst: "Pestka" } as const, ...dopiski].map((dopisek, indeks) => {
    const fontSize = indeks === 0 ? 15 : dopisek.typ === "kod" ? 17 : 20;
    const element = convertToExcalidrawElements([{
      ...styl, type: "text", x: x0, y, text: dopisek.tekst, fontSize,
      fontFamily: dopisek.typ === "kod" ? FONT_FAMILY.Cascadia : FONT_FAMILY.Excalifont,
    }])[0]!;
    y += element.height + 16;
    return dopasujTekst(element, pomiar);
  });
  const przesun = ([x, lokalneY]: Punkt): Punkt => [x0 + x * ROZMIAR, y + lokalneY * ROZMIAR];
  const figury = ksztalty.flatMap((ksztalt): Szkielet[] => {
    if (ksztalt.typ === "trojkat") {
      const [a, b, c] = ksztalt.punkty.map(przesun);
      return [odcinek([a, b]), odcinek([b, c]), odcinek([c, a])];
    }
    const [a, b] = ksztalt.punkty.map(przesun);
    if (ksztalt.typ === "odcinek" || ksztalt.typ === "strzalka") {
      return [odcinek([a, b], ksztalt.typ === "strzalka" ? "arrow" : "line")];
    }
    return [{
      ...RYSUNEK, type: ksztalt.typ === "prostokat" ? "rectangle" : "ellipse",
      x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]),
      width: Math.abs(a[0] - b[0]), height: Math.abs(a[1] - b[1]),
    }];
  });
  const elementy = [...teksty, ...convertToExcalidrawElements(figury.map((e) => ({ ...e, ...styl })))];
  if (!bryla) return elementy;

  const rzut = rzutBryly(bryla, obrotBryly ?? DOMYSLNY_OBROT_BRYLY, 1.6);
  const goraBryly = y + (figury.length ? ROZMIAR + 24 : 0);
  const linie = rzut.linie.map(({ punkty, ukryta }) => ({
    ...odcinek(punkty.map(([px, py]) => [x0 + px, goraBryly + py]), "line", ukryta), ...styl,
  }));
  const etykiety = rzut.etykiety.map(({ punkt: [px, py], tekst }) => ({
    ...styl, type: "text" as const, x: x0 + px, y: goraBryly + py, text: tekst, fontSize: 16, fontFamily: FONT_FAMILY.Excalifont,
  }));
  return [
    ...elementy,
    ...convertToExcalidrawElements(linie),
    ...convertToExcalidrawElements(etykiety).map((e) => {
      const napis = dopasujTekst(e, pomiar);
      return { ...napis, x: e.x - (napis.width - ZAPAS_TEKSTU) / 2, y: e.y - e.height / 2 };
    }),
  ];
}

export function zapiszDopiskiPestki(api: ExcalidrawImperativeAPI, nowe: readonly ExcalidrawElement[]) {
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), ...nowe],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

function pisz(ctx: CanvasRenderingContext2D, e: Extract<ExcalidrawElement, { type: "text" }>, znaki: string[], postep: number) {
  ctx.font = czcionka(e.fontFamily, e.fontSize);
  ctx.textBaseline = "top";
  const linie = znaki.slice(0, Math.ceil(znaki.length * postep)).join("").replace(/\t/g, "        ").split("\n");
  const odstep = e.fontSize * e.lineHeight;
  linie.forEach((linia, i) => ctx.fillText(linia, e.x, e.y + odstep * i));
  if (postep < 1) {
    const x = e.x + ctx.measureText(linie.at(-1) ?? "").width + 3;
    ctx.fillRect(x, e.y + odstep * (linie.length - 1) + 2, 2, e.fontSize);
  }
}

function rysuj(ctx: CanvasRenderingContext2D, e: ExcalidrawElement, postep: number) {
  const { x, y, width, height } = e;
  ctx.lineWidth = e.strokeWidth;
  ctx.setLineDash(e.strokeStyle === "dashed" ? [7, 5] : []);
  ctx.beginPath();
  if (e.type === "ellipse") {
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * postep);
  } else if (e.type === "rectangle") {
    const dlugosc = 2 * (width + height);
    if (postep < 1) ctx.setLineDash([dlugosc * postep, dlugosc]);
    ctx.rect(x, y, width, height);
  } else if (e.type === "line" || e.type === "arrow") {
    const segmenty = e.points.slice(1).map(([px, py], i) => Math.hypot(px - e.points[i][0], py - e.points[i][1]));
    let pozostalo = segmenty.reduce((suma, dlugosc) => suma + dlugosc, 0) * postep;
    ctx.moveTo(x, y);
    segmenty.some((dlugosc, i) => {
      if (dlugosc <= 0) return false;
      const [ax, ay] = e.points[i];
      const [bx, by] = e.points[i + 1];
      const czesc = Math.min(1, pozostalo / dlugosc);
      ctx.lineTo(x + ax + (bx - ax) * czesc, y + ay + (by - ay) * czesc);
      pozostalo -= dlugosc;
      return pozostalo <= 0;
    });
    if (e.type === "arrow" && postep > 0.8) {
      const [dx, dy] = e.points.at(-1) ?? [0, 0];
      const koniecX = x + dx * postep;
      const koniecY = y + dy * postep;
      const kat = Math.atan2(dy, dx);
      const grot = Math.min(14, Math.hypot(dx, dy) / 3) * (postep - 0.8) / 0.2;
      ctx.moveTo(koniecX - grot * Math.cos(kat - 0.44), koniecY - grot * Math.sin(kat - 0.44));
      ctx.lineTo(koniecX, koniecY);
      ctx.lineTo(koniecX - grot * Math.cos(kat + 0.44), koniecY - grot * Math.sin(kat + 0.44));
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

export function pokazZapisPestki(
  canvas: HTMLCanvasElement, api: ExcalidrawImperativeAPI, nowe: readonly ExcalidrawElement[], signal: AbortSignal,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || signal.aborted) return Promise.resolve();
  let lacznie = 0;
  const kroki = nowe.map((element) => {
    const znaki = element.type === "text" ? Array.from(element.text) : [];
    const czas = Math.min(900, 160 + znaki.length * 9);
    const krok = { element, znaki, od: lacznie, czas };
    lacznie += czas;
    return krok;
  });
  const czasAnimacji = Math.min(lacznie, 2900);

  // Nakładka pokazuje ruch, a Excalidraw dostaje gotowy zapis raz, razem z historią cofania.
  return new Promise<void>((resolve) => {
    let klatka = 0;
    let poczatek: number | undefined;
    const zakoncz = () => {
      cancelAnimationFrame(klatka);
      signal.removeEventListener("abort", zakoncz);
      ctx.resetTransform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      resolve();
    };
    const maluj = (teraz: number) => {
      poczatek ??= teraz;
      const t = (teraz - poczatek) / czasAnimacji;
      if (t >= 1) return zakoncz();
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.resetTransform();
      ctx.clearRect(0, 0, w, h);
      const stan = api.getAppState();
      const { x, y } = sceneCoordsToViewportCoords({ sceneX: 0, sceneY: 0 }, stan);
      const zoom = stan.zoom.value * dpr;
      ctx.setTransform(zoom, 0, 0, zoom, (x - rect.left) * dpr, (y - rect.top) * dpr);
      ctx.strokeStyle = ctx.fillStyle = stan.theme === "dark" ? "#86a6f8" : RYSUNEK.strokeColor;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const { element, znaki, od, czas } of kroki) {
        const postep = Math.min(1, (t * lacznie - od) / czas);
        if (postep <= 0) break;
        if (element.type === "text") pisz(ctx, element, znaki, postep);
        else rysuj(ctx, element, postep);
      }
      klatka = requestAnimationFrame(maluj);
    };
    signal.addEventListener("abort", zakoncz, { once: true });
    klatka = requestAnimationFrame(maluj);
  });
}
