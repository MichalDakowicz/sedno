import type { BrylaPestki, OznaczenieBryly, Punkt } from "./brudnopisPestkaApi";

type Punkt3D = [number, number, number];
type Linia3D = { punkty: Punkt3D[]; ukryta?: boolean };
type Wymiar = { od: Punkt3D; do: Punkt3D; pomocniczy?: boolean };
type Bryla = { linie: Linia3D[]; wymiary: Partial<Record<OznaczenieBryly, Wymiar>> };

export const NAZWY_BRYL: Record<BrylaPestki["typ"], string> = {
  szescian: "Sześcian", prostopadloscian: "Prostopadłościan",
  "graniastoslup-trojkatny": "Graniastosłup trójkątny",
  "ostroslup-czworokatny": "Ostrosłup czworokątny",
  walec: "Walec", stozek: "Stożek", kula: "Kula",
};

const PODNIESIENIE = Math.PI / 7;
const EKRAN = { szerokosc: 240, wysokosc: 154, marginesX: 52, marginesY: 24 };
export const WIDOK_BRYLY = [EKRAN.szerokosc, EKRAN.wysokosc] as const;

export function maOsObrotu(typ: BrylaPestki["typ"]): typ is "walec" | "stozek" | "kula" {
  return typ === "walec" || typ === "stozek" || typ === "kula";
}

function roznica(a: Punkt3D, b: Punkt3D): Punkt3D {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function iloczyn(a: Punkt3D, b: Punkt3D) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function wieloscian(typ: BrylaPestki["typ"], [a, b, h]: Punkt3D, kamera: Punkt3D): Bryla {
  const trojkat = typ === "graniastoslup-trojkatny";
  const ostroslup = typ === "ostroslup-czworokatny";
  const podstawa: Punkt3D[] = [[0, 0, 0], [a, 0, 0], [a, b, 0], [0, b, 0]];
  if (trojkat) podstawa.splice(2, 1);
  const n = podstawa.length;
  const gore: Punkt3D[] = ostroslup ? [[a / 2, b / 2, h]] : podstawa.map(([x, y]) => [x, y, h]);
  const punkty = [...podstawa, ...gore];
  // Wierzchołki ścian są ułożone tak, żeby iloczyn wektorowy wskazywał na zewnątrz.
  const sciany = [podstawa.map((_, i) => n - 1 - i)];
  if (!ostroslup) sciany.push(gore.map((_, i) => n + i));
  podstawa.forEach((_, i) => {
    const j = (i + 1) % n;
    sciany.push(ostroslup ? [i, j, n] : [i, j, n + j, n + i]);
  });
  const krawedzie = new Map<string, Linia3D>();
  for (const sciana of sciany) {
    const [p, q, r] = sciana.map((i) => punkty[i]);
    const [ux, uy, uz] = roznica(q, p);
    const [vx, vy, vz] = roznica(r, p);
    const widoczna = iloczyn([uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], kamera) >= -1e-8;
    sciana.forEach((i, k) => {
      const j = sciana[(k + 1) % sciana.length];
      const klucz = i < j ? i + "-" + j : j + "-" + i;
      if (widoczna || !krawedzie.has(klucz)) krawedzie.set(klucz, { punkty: [punkty[i], punkty[j]], ukryta: !widoczna });
    });
  }
  const wymiary: Bryla["wymiary"] = {
    a: trojkat ? { od: podstawa[0], do: podstawa[1] } : { od: podstawa[3], do: podstawa[2] },
    b: { od: podstawa[trojkat ? 0 : 1], do: podstawa[2] },
    h: ostroslup ? { od: [a / 2, b / 2, 0], do: gore[0], pomocniczy: true } : { od: podstawa[2], do: gore[2] },
  };
  if (trojkat) wymiary.przeciwprostokatna = { od: podstawa[1], do: podstawa[2] };
  else wymiary.przekatnaPodstawy = { od: podstawa[0], do: podstawa[2], pomocniczy: true };
  if (!trojkat && !ostroslup) wymiary.przekatnaBryly = { od: podstawa[0], do: gore[2], pomocniczy: true };
  return { linie: [...krawedzie.values()], wymiary };
}

function okraglaBryla(typ: "walec" | "stozek" | "kula", [a, , h]: Punkt3D, azymut: number, podniesienie: number, ekran: [Punkt3D, Punkt3D]): Bryla {
  const r = a / 2;
  const katStycznej = Math.acos(typ === "stozek" ? Math.max(-1, -r * Math.tan(podniesienie) / h) : 0);
  const [od, doKat] = [azymut - katStycznej, azymut + katStycznej];
  const punkt = (kat: number, z: number): Punkt3D => [r * Math.cos(kat), r * Math.sin(kat), z];
  const luk = (start: number, koniec: number, z: number, ukryta = false): Linia3D => {
    const kroki = Math.max(3, Math.ceil((koniec - start) * 8));
    return { punkty: Array.from({ length: kroki + 1 }, (_, i) => punkt(start + (koniec - start) * i / kroki, z)), ukryta };
  };
  const linie = [luk(od, doKat, 0)];
  if (katStycznej < Math.PI) linie.unshift(luk(doKat, od + 2 * Math.PI, 0, true));
  const wymiary: Bryla["wymiary"] = { r: { od: [0, 0, 0], do: punkt(azymut, 0), pomocniczy: true } };
  if (typ === "kula") {
    const [prawo, dol] = ekran;
    const punkty = Array.from({ length: 53 }, (_, i): Punkt3D => {
      const kat = i * 2 * Math.PI / 52;
      const u = r * Math.cos(kat);
      const v = r * Math.sin(kat);
      return [u * prawo[0] + v * dol[0], u * prawo[1] + v * dol[1], u * prawo[2] + v * dol[2]];
    });
    linie.push({ punkty });
    wymiary.r = { od: [0, 0, 0], do: punkty[0], pomocniczy: true };
  } else {
    const wierzcholek: Punkt3D = [0, 0, h];
    wymiary.h = { od: [0, 0, 0], do: wierzcholek, pomocniczy: true };
    if (typ === "walec") linie.push(luk(0, 2 * Math.PI, h));
    if (katStycznej < Math.PI) {
      for (const kat of [od, doKat]) {
        linie.push({ punkty: [punkt(kat, 0), typ === "walec" ? punkt(kat, h) : wierzcholek] });
      }
    }
    if (typ === "stozek") wymiary.tworzaca = katStycznej < Math.PI
      ? { od: punkt(doKat, 0), do: wierzcholek }
      : { od: punkt(azymut, 0), do: wierzcholek, pomocniczy: true };
  }
  return { linie, wymiary };
}

export function rzutBryly(bryla: BrylaPestki, obrot: number, rozmiar = 1) {
  const { typ, oznaczenia } = bryla;
  const domyslne = typ === "ostroslup-czworokatny" ? [1, 1, 0.9] : [1, 0.75, 0.9];
  const liczby = typ === "szescian" || typ === "kula" ? [1, 1, 1] : bryla.wymiary ?? domyslne;
  const najdluzszy = Math.max(...liczby);
  const wymiary = liczby.map((w) => Math.max(0.12, w / najdluzszy)) as Punkt3D;
  const obrotowa = maOsObrotu(typ);
  const kat = obrotowa ? 0 : obrot * Math.PI / 180;
  const podniesienie = obrotowa ? obrot * Math.PI / 180 : PODNIESIENIE;
  const [x, y, s, c] = [Math.cos(kat), Math.sin(kat), Math.sin(podniesienie), Math.cos(podniesienie)];
  const prawo: Punkt3D = [-y, x, 0];
  const dol: Punkt3D = [x * s, y * s, -c];
  const rzut = (p: Punkt3D): Punkt => [iloczyn(p, prawo), iloczyn(p, dol)];
  const figura = obrotowa
    ? okraglaBryla(typ, wymiary, kat, podniesienie, [prawo, dol])
    : wieloscian(typ, wymiary, [x * c, y * c, s]);

  const pts = figura.linie.flatMap(({ punkty }) => punkty.map(rzut));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const srodekX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const srodekY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const skala = Math.min(
    (EKRAN.szerokosc - 2 * EKRAN.marginesX) / (Math.max(...xs) - Math.min(...xs)),
    (EKRAN.wysokosc - 2 * EKRAN.marginesY) / (Math.max(...ys) - Math.min(...ys)),
  );
  const naEkranie = (p: Punkt3D): Punkt => {
    const [u, v] = rzut(p);
    return [(EKRAN.szerokosc / 2 + (u - srodekX) * skala) * rozmiar, (EKRAN.wysokosc / 2 + (v - srodekY) * skala) * rozmiar];
  };
  const linie = figura.linie
    .map(({ punkty, ukryta }) => ({ punkty: punkty.map(naEkranie), ukryta: Boolean(ukryta) }))
    .sort((a, b) => Number(b.ukryta) - Number(a.ukryta));
  const etykiety = Object.entries(oznaczenia).flatMap(([klucz, tekst]) => {
    const wymiar = figura.wymiary[klucz as OznaczenieBryly];
    if (!wymiar || !tekst) return [];
    const [a, b] = [naEkranie(wymiar.od), naEkranie(wymiar.do)];
    if (wymiar.pomocniczy) linie.push({ punkty: [a, b], ukryta: true });
    const srodek: Punkt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const [dx, dy] = [srodek[0] - EKRAN.szerokosc * rozmiar / 2, srodek[1] - EKRAN.wysokosc * rozmiar / 2];
    const [nx, ny] = [a[1] - b[1], b[0] - a[0]];
    const strona = nx * dx + ny * dy >= 0 ? 1 : -1;
    const dlugosc = Math.hypot(nx, ny);
    const [u, v] = dlugosc > 1 ? [strona * nx / dlugosc, strona * ny / dlugosc] : [0.7, -0.7];
    const odstep = 9 + Math.min(tekst.length * 2.1, 28) * Math.abs(u);
    const punkt: Punkt = [srodek[0] + odstep * u * rozmiar, srodek[1] + odstep * v * rozmiar];
    return [{ tekst, punkt }];
  });
  return { linie, etykiety };
}
