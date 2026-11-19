// Ikony aplikacji z tego samego rysunku Pestki co public/pestka.svg, bez zewnętrznych narzędzi: prosty rasteryzator
// (wielokąt z krzywych, elipsy, kreska uśmiechu, nadpróbkowanie 4×4) i koder PNG na zlib z Node.
// Uruchomienie z katalogu apps/web: node scripts/ikony.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const CIALO = "M32 4c13.5 0 24 8.6 26.6 21.4 2.4 11.9-2 24-12.6 30.2C38.8 59.8 25.2 59.8 18 55.6 7.4 49.4 3 37.3 5.4 25.4 8 12.6 18.5 4 32 4Z";
const KREM = [0xff, 0xf9, 0xf6];

/** Ścieżka SVG (M, C, c, Z) jako wielokąt. */
function wielokat(d) {
  const tokeny = d.match(/[MCcZ]|-?\d*\.?\d+/g);
  const pkt = [];
  let i = 0, x = 0, y = 0, cmd = "";
  const liczba = () => Number(tokeny[i++]);
  while (i < tokeny.length) {
    if (/[MCcZ]/.test(tokeny[i])) cmd = tokeny[i++];
    if (cmd === "Z") break;
    if (cmd === "M") { x = liczba(); y = liczba(); pkt.push([x, y]); continue; }
    const wzgl = cmd === "c";
    const [x1, y1, x2, y2, x3, y3] = Array.from({ length: 6 }, liczba).map((v, k) => (wzgl ? v + (k % 2 ? y : x) : v));
    for (let t = 1; t <= 24; t++) {
      const u = t / 24, a = (1 - u) ** 3, b = 3 * u * (1 - u) ** 2, c = 3 * u * u * (1 - u), e = u ** 3;
      pkt.push([a * x + b * x1 + c * x2 + e * x3, a * y + b * y1 + c * y2 + e * y3]);
    }
    x = x3; y = y3;
  }
  return pkt;
}

const ksztalt = wielokat(CIALO);
const wSrodku = (px, py) => {
  let w = false;
  for (let i = 0, j = ksztalt.length - 1; i < ksztalt.length; j = i++) {
    const [xi, yi] = ksztalt[i], [xj, yj] = ksztalt[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) w = !w;
  }
  return w;
};
const elipsa = (px, py, cx, cy, rx, ry, kat = 0) => {
  const r = (kat * Math.PI) / 180, dx = px - cx, dy = py - cy;
  const u = dx * Math.cos(r) + dy * Math.sin(r), v = -dx * Math.sin(r) + dy * Math.cos(r);
  return (u / rx) ** 2 + (v / ry) ** 2 <= 1;
};
// Uśmiech: krzywa M27 40.5 c2.8 2.6 7.2 2.6 10 0, grubość 2.4.
const usmiech = Array.from({ length: 33 }, (_, t) => {
  const u = t / 32, a = (1 - u) ** 3, b = 3 * u * (1 - u) ** 2, c = 3 * u * u * (1 - u), e = u ** 3;
  return [a * 27 + b * 29.8 + c * 34.2 + e * 37, a * 40.5 + b * 43.1 + c * 43.1 + e * 40.5];
});
const naUsmiechu = (px, py) => usmiech.some(([x, y]) => (px - x) ** 2 + (py - y) ** 2 <= 1.2 ** 2);

const GRADIENT = [[0, [0xff, 0x8a, 0x3d]], [0.55, [0xff, 0x74, 0x48]], [1, [0xff, 0x5e, 0x3a]]];
function kolorCiala(px, py) {
  const t = Math.min(1, Math.max(0, (px + py) / 128));
  const k = t <= 0.55 ? 0 : 1;
  const [t0, c0] = GRADIENT[k], [t1, c1] = GRADIENT[k + 1];
  const f = (t - t0) / (t1 - t0);
  return c0.map((v, i) => v + (c1[i] - v) * f);
}
const nalóż = (dol, kolor, alfa) => [...dol.slice(0, 3).map((v, i) => v + (kolor[i] - v) * alfa), dol[3] + (1 - dol[3]) * alfa];

/** Kolor (RGBA 0–255, alfa 0–1) punktu rysunku w układzie 0–64. */
function probka(px, py, tlo) {
  let c = tlo ? [...tlo, 1] : [0, 0, 0, 0];
  if (!wSrodku(px, py)) return c;
  c = nalóż(c, kolorCiala(px, py), 1);
  if (elipsa(px, py, 22, 16, 7, 4, -24)) c = nalóż(c, [255, 255, 255], 0.22);
  if (elipsa(px, py, 16.5, 38, 4, 4) || elipsa(px, py, 47.5, 38, 4, 4)) c = nalóż(c, [0xff, 0xc8, 0xb7], 0.7);
  if (elipsa(px, py, 24, 30, 3.4, 4.6) || elipsa(px, py, 40, 30, 3.4, 4.6) || naUsmiechu(px, py)) c = nalóż(c, [0x0f, 0x15, 0x1d], 1);
  return c;
}

function rysuj(rozmiar, { tlo = null, skala = 1 } = {}) {
  const dane = Buffer.alloc(rozmiar * (rozmiar * 4 + 1));
  const S = 4;
  for (let y = 0; y < rozmiar; y++) {
    dane[y * (rozmiar * 4 + 1)] = 0;
    for (let x = 0; x < rozmiar; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        // Rysunek 64×64 wyśrodkowany i zmniejszony do `skala` wielkości ikony.
        const px = (((x + (sx + 0.5) / S) / rozmiar - 0.5) / skala + 0.5) * 64;
        const py = (((y + (sy + 0.5) / S) / rozmiar - 0.5) / skala + 0.5) * 64;
        const [cr, cg, cb, ca] = probka(px, py, tlo);
        r += cr * ca; g += cg * ca; b += cb * ca; a += ca;
      }
      const o = y * (rozmiar * 4 + 1) + 1 + x * 4;
      dane[o] = a ? Math.round(r / a) : 0;
      dane[o + 1] = a ? Math.round(g / a) : 0;
      dane[o + 2] = a ? Math.round(b / a) : 0;
      dane[o + 3] = Math.round((a / (S * S)) * 255);
    }
  }
  return png(rozmiar, dane);
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function kawalek(typ, dane) {
  const dl = Buffer.alloc(4); dl.writeUInt32BE(dane.length);
  const td = Buffer.concat([Buffer.from(typ), dane]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td));
  return Buffer.concat([dl, td, c]);
}
function png(rozmiar, surowe) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(rozmiar, 0); ihdr.writeUInt32BE(rozmiar, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), kawalek("IHDR", ihdr), kawalek("IDAT", deflateSync(surowe, { level: 9 })), kawalek("IEND", Buffer.alloc(0))]);
}

writeFileSync("public/ikona-192.png", rysuj(192, { skala: 0.94 }));
writeFileSync("public/ikona-512.png", rysuj(512, { skala: 0.94 }));
// Maskowalna: system przycina do koła albo zaokrąglonego kwadratu, więc rysunek mieści się w środkowych 80%.
writeFileSync("public/ikona-maskowalna-512.png", rysuj(512, { tlo: KREM, skala: 0.66 }));
// Apple nie przyjmuje przezroczystości: kremowe tło jak w aplikacji.
writeFileSync("public/apple-touch-icon.png", rysuj(180, { tlo: KREM, skala: 0.78 }));
console.log("ikony gotowe");
