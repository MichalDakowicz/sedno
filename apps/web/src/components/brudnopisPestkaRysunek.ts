import { CaptureUpdateAction, convertToExcalidrawElements, FONT_FAMILY, getCommonBounds, newElementWith, sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, NonDeleted } from "@excalidraw/excalidraw/element/types";
import { rzutBryly } from "./brudnopisBryla";
import { bezZapisowPestki, DOMYSLNY_OBROT_BRYLY, type OdpowiedzPestki, type Punkt } from "./brudnopisPestkaApi";
import { czcionkaTekstu, liniaBazowa, szerokoscTekstu, wierszWzoru, type Napis } from "./brudnopisPestkaWzory";

type Szkielet = NonNullable<Parameters<typeof convertToExcalidrawElements>[0]>[number];
type PunktLinii = Extract<ExcalidrawElement, { type: "arrow" | "line" }>["points"][number];
type Tekst = Extract<ExcalidrawElement, { type: "text" }>;
type Prostokat = { x: number; y: number; w: number; h: number };
const RYSUNEK = { strokeColor: "#2f55b4", strokeWidth: 2, roughness: 0 };
export const BLAD = "#c93546";
const ROZMIAR = 300;
const ZAPAS_TEKSTU = 8;
// Miejsce na awatar Pestki po lewej stronie zapisu i odstęp od cudzych kresek, w pikselach ekranu.
const MIEJSCE_NA_PESTKE = 52;
const ODSTEP_OD_PRACY = 20;

function dopasujTekst(e: ExcalidrawElement) {
  if (e.type !== "text") return e;
  const szerokosci = e.text.replace(/\t/g, "        ").split("\n").map((linia) => {
    const zapasNaKod = e.fontFamily === FONT_FAMILY.Cascadia ? Array.from(linia).length * e.fontSize * 0.62 : 0;
    return Math.max(szerokoscTekstu(linia, e.fontFamily, e.fontSize), zapasNaKod);
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

const granice = (e: ExcalidrawElement): Prostokat => {
  const [x1, y1, x2, y2] = getCommonBounds([e]);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
};
const nachodza = (a: Prostokat, b: Prostokat, zapas: number) =>
  a.x < b.x + b.w + zapas && a.x + a.w + zapas > b.x && a.y < b.y + b.h + zapas && a.y + a.h + zapas > b.y;

export function widokTablicy(stan: Pick<AppState, "scrollX" | "scrollY" | "width" | "height" | "zoom">): Prostokat {
  return { x: -stan.scrollX, y: -stan.scrollY, w: stan.width / stan.zoom.value, h: stan.height / stan.zoom.value };
}

/** Ostatnio zmieniona kreska ucznia: przy niej Pestka myśli i obok niej pisze. */
export function ostatniaKreska(elementy: readonly NonDeleted<ExcalidrawElement>[], czyBazowy: (id: string) => boolean) {
  return bezZapisowPestki(elementy).filter((e) => !czyBazowy(e.id)).reduce<ExcalidrawElement | undefined>(
    (ostatni, e) => (!ostatni || e.updated > ostatni.updated ? e : ostatni), undefined,
  );
}

// Wolne miejsce w widoku na blok w×h: nie nachodzi na żaden element (praca ucznia, rysunek zadania, wcześniejsze
// dopiski), a z wolnych wybieramy najbliższe ostatniej kreski, z prawej albo pod nią, jak pisze się dalej.
function wolneMiejsce(przeszkody: Prostokat[], w: number, h: number, widok: Prostokat, kolo: Prostokat | undefined, zoom: number) {
  const zapas = ODSTEP_OD_PRACY / zoom;
  const krok = Math.max(12, 20 / zoom);
  const margines = 12 / zoom;
  const cele: Punkt[] = kolo
    ? [[kolo.x + kolo.w + zapas, kolo.y], [kolo.x, kolo.y + kolo.h + zapas]]
    : [[widok.x + widok.w * 0.1, widok.y + widok.h * 0.1]];
  let najlepsze: { x: number; y: number; odleglosc: number } | null = null;
  for (let y = widok.y + margines; y + h <= widok.y + widok.h - margines; y += krok) {
    for (let x = widok.x + margines; x + w <= widok.x + widok.w - margines; x += krok) {
      const odleglosc = Math.min(...cele.map(([cx, cy]) => Math.hypot(x - cx, y - cy)));
      if (najlepsze && odleglosc >= najlepsze.odleglosc) continue;
      const miejsce = { x, y, w, h };
      if (przeszkody.some((p) => nachodza(miejsce, p, zapas))) continue;
      najlepsze = { x, y, odleglosc };
    }
  }
  return najlepsze;
}

export type ZapisPestki = { elementy: ExcalidrawElement[]; pozaWidokiem: boolean };

function tekst(styl: object, n: Napis): ExcalidrawElement {
  return dopasujTekst(convertToExcalidrawElements([{ ...styl, type: "text", x: n.x, y: n.y, text: n.tekst, fontSize: n.fontSize, fontFamily: n.fontFamily }])[0]!);
}

export function przygotujZapisPestki(api: ExcalidrawImperativeAPI, dane: OdpowiedzPestki, czyBazowy: (id: string) => boolean): ZapisPestki {
  const { dopiski, ksztalty, bryla, obrotBryly, obszarBledu } = dane;
  const grupa = crypto.randomUUID();
  const styl = { strokeColor: RYSUNEK.strokeColor, groupIds: [grupa], customData: { pestka: true } };
  const ramka = obszarBledu ? convertToExcalidrawElements([{
    ...styl, ...obszarBledu, type: "rectangle", strokeColor: BLAD, strokeWidth: 2.5, roughness: 0,
  }]) : [];
  if (!dopiski.length && !ksztalty.length && !bryla) return { elementy: ramka, pozaWidokiem: false };

  // Najpierw układ od (0, 0), potem przesunięcie całego bloku w wolne miejsce.
  const tresc: ExcalidrawElement[] = [tekst(styl, { tekst: "Pestka", fontFamily: FONT_FAMILY.Excalifont, fontSize: 15, x: 0, y: 0 })];
  let y = 15 * 1.25 + 16;
  for (const dopisek of dopiski) {
    if (dopisek.typ === "kod") {
      const e = tekst(styl, { tekst: dopisek.tekst, fontFamily: FONT_FAMILY.Cascadia, fontSize: 17, x: 0, y });
      tresc.push(e);
      y += e.height + 16;
      continue;
    }
    for (const linia of dopisek.tekst.split("\n")) {
      const wiersz = wierszWzoru(linia, 0, y, 20, dopisek.typ === "obliczenia");
      const czesci = [
        ...convertToExcalidrawElements(wiersz.kreski.map((k) => ({ ...odcinek(k), ...styl }))).map((element) => ({ x: element.x, element })),
        ...wiersz.napisy.filter((n) => n.tekst.trim()).map((n) => ({ x: n.x, element: tekst(styl, n) })),
      ];
      // Elementy prawie w tym samym miejscu zostają w kolejności z układu: kreska przed liczbą pod nią, licznik przed mianownikiem.
      tresc.push(...czesci.sort((a, b) => (Math.abs(a.x - b.x) < 12 ? 0 : a.x - b.x)).map((c) => c.element));
      y += wiersz.wys + 4;
    }
    y += 12;
  }
  const przesun = ([x, lokalneY]: Punkt): Punkt => [x * ROZMIAR, y + lokalneY * ROZMIAR];
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
  tresc.push(...convertToExcalidrawElements(figury.map((e) => ({ ...e, ...styl }))));
  if (bryla) {
    const rzut = rzutBryly(bryla, obrotBryly ?? DOMYSLNY_OBROT_BRYLY, 1.6);
    const goraBryly = y + (figury.length ? ROZMIAR + 24 : 0);
    const linie = rzut.linie.map(({ punkty, ukryta }) => ({
      ...odcinek(punkty.map(([px, py]) => [px, goraBryly + py]), "line", ukryta), ...styl,
    }));
    const etykiety = rzut.etykiety.map(({ punkt: [px, py], tekst }) => ({
      ...styl, type: "text" as const, x: px, y: goraBryly + py, text: tekst, fontSize: 16, fontFamily: FONT_FAMILY.Excalifont,
    }));
    tresc.push(
      ...convertToExcalidrawElements(linie),
      ...convertToExcalidrawElements(etykiety).map((e) => {
        const napis = dopasujTekst(e);
        return { ...napis, x: e.x - (napis.width - ZAPAS_TEKSTU) / 2, y: e.y - e.height / 2 };
      }),
    );
  }

  const stan = api.getAppState();
  const zoom = stan.zoom.value;
  const scena = api.getSceneElements();
  const [bx1, by1, bx2, by2] = getCommonBounds(tresc);
  const gutter = MIEJSCE_NA_PESTKE / zoom;
  const w = bx2 - bx1 + gutter;
  const h = by2 - by1;
  const widok = widokTablicy(stan);
  const kreska = ostatniaKreska(scena, czyBazowy);
  const wolne = wolneMiejsce(scena.map(granice), w, h, widok, kreska && granice(kreska), zoom);
  let x0: number;
  let y0: number;
  if (wolne) {
    [x0, y0] = [wolne.x + gutter, wolne.y];
  } else {
    // W widoku nie ma miejsca: piszemy obok całej pracy, a dymek proponuje „Pokaż” zamiast ruszać widok.
    const [, y1, x2] = scena.length ? getCommonBounds(scena) : [0, 0, -64, 0];
    [x0, y0] = [x2 + 64 + gutter, kreska ? granice(kreska).y : y1];
  }
  const dx = x0 - bx1;
  const dy = y0 - by1;
  const blok = { x: x0 - gutter, y: y0, w, h };
  const pozaWidokiem = !(blok.x >= widok.x && blok.y >= widok.y && blok.x + w <= widok.x + widok.w && blok.y + h <= widok.y + widok.h);
  return { elementy: [...ramka, ...tresc.map((e) => ({ ...e, x: e.x + dx, y: e.y + dy }))], pozaWidokiem };
}

export function zapiszDopiskiPestki(api: ExcalidrawImperativeAPI, nowe: readonly ExcalidrawElement[]) {
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), ...nowe],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

/** Ściera wszystkie dopiski Pestki jednym krokiem cofania. Zwraca, czy było co ścierać. */
export function zetrzyjDopiskiPestki(api: ExcalidrawImperativeAPI) {
  const scena = api.getSceneElements();
  const ucznia = new Set(bezZapisowPestki(scena).map((e) => e.id));
  const pestki = new Set(scena.filter((e) => !ucznia.has(e.id)).map((e) => e.id));
  if (!pestki.size) return false;
  api.updateScene({
    elements: api.getSceneElementsIncludingDeleted().map((e) => (pestki.has(e.id) ? newElementWith(e, { isDeleted: true }) : e)),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return true;
}

function pisz(ctx: CanvasRenderingContext2D, e: Tekst, znaki: string[], postep: number) {
  ctx.font = czcionkaTekstu(e.fontFamily, e.fontSize);
  ctx.textBaseline = "alphabetic";
  const linie = znaki.slice(0, Math.ceil(znaki.length * postep)).join("").replace(/\t/g, "        ").split("\n");
  const odstep = e.fontSize * e.lineHeight;
  const baza = e.y + liniaBazowa(e.fontFamily, e.fontSize, e.lineHeight);
  linie.forEach((linia, i) => ctx.fillText(linia, e.x, baza + odstep * i));
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

// Tempo pisma: litera ok. 1/20 s, kreska jak ruch ręki; długi zapis przyspiesza, żeby nie trwał dłużej niż ok. 6 s.
const CZAS_ZNAKU = 48;
const NAJDLUZEJ = 6000;

export function pokazZapisPestki(
  canvas: HTMLCanvasElement, api: ExcalidrawImperativeAPI, nowe: readonly ExcalidrawElement[], signal: AbortSignal,
  naKrok?: (element: ExcalidrawElement) => void,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || signal.aborted) return Promise.resolve();
  let lacznie = 0;
  const kroki = nowe.map((element) => {
    const znaki = element.type === "text" ? Array.from(element.text) : [];
    const czas = element.type === "text" ? 60 + znaki.length * CZAS_ZNAKU : Math.min(700, 160 + (element.width + element.height) * 0.9);
    const krok = { element, znaki, od: lacznie, czas };
    lacznie += czas;
    return krok;
  });
  const czasAnimacji = Math.min(lacznie, NAJDLUZEJ);

  // Nakładka pokazuje ruch, a Excalidraw dostaje gotowy zapis raz, razem z historią cofania.
  return new Promise<void>((resolve) => {
    let klatka = 0;
    let poczatek: number | undefined;
    let biezacy = -1;
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
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const [i, { element, znaki, od, czas }] of kroki.entries()) {
        const postep = Math.min(1, (t * lacznie - od) / czas);
        if (postep <= 0) break;
        if (i > biezacy) {
          biezacy = i;
          naKrok?.(element);
        }
        ctx.strokeStyle = ctx.fillStyle = stan.theme === "light" ? element.strokeColor : element.strokeColor === BLAD ? "#ff8695" : "#86a6f8";
        if (element.type === "text") pisz(ctx, element, znaki, postep);
        else rysuj(ctx, element, postep);
      }
      klatka = requestAnimationFrame(maluj);
    };
    signal.addEventListener("abort", zakoncz, { once: true });
    klatka = requestAnimationFrame(maluj);
  });
}
