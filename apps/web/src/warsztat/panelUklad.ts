import { useCallback, useEffect, useState } from "react";

// Ułożenie panelu z materiałami: strona, szerokość i to, czy zostaje miejsce na panel obok zadania.
export type Strona = "lewa" | "prawa";

const KLUCZ = "sedno.warsztat.panel";
/** Poniżej tej szerokości okna panel nie mieści się obok treści i zajmuje cały ekran. */
export const PROG_WASKIEGO = 900;
export const MIN_PANELU = 340;
/** Tyle miejsca zostaje zadaniu i polom odpowiedzi. */
const MIN_TRESCI = 380;

type Zapis = { strona?: Strona; szerokosc?: number };

function wczytaj(): Zapis {
  try {
    const z = JSON.parse(localStorage.getItem(KLUCZ) ?? "{}");
    return {
      strona: z.strona === "lewa" || z.strona === "prawa" ? z.strona : undefined,
      szerokosc: typeof z.szerokosc === "number" && Number.isFinite(z.szerokosc) ? z.szerokosc : undefined,
    };
  } catch {
    return {};
  }
}

function zapisz(z: Zapis) {
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(z));
  } catch {
    // Bez zapisu panel działa dalej, tylko nie pamięta ustawień.
  }
}

export function useUklad() {
  const [zapis, setZapis] = useState<Zapis>(wczytaj);
  const [okno, setOkno] = useState(() => window.innerWidth);
  useEffect(() => {
    const zmien = () => setOkno(window.innerWidth);
    window.addEventListener("resize", zmien);
    return () => window.removeEventListener("resize", zmien);
  }, []);

  const waski = okno < PROG_WASKIEGO;
  const max = Math.max(MIN_PANELU, okno - MIN_TRESCI);
  const szerokosc = Math.min(max, Math.max(MIN_PANELU, zapis.szerokosc ?? Math.round(okno / 3)));
  const strona = zapis.strona ?? "prawa";

  const ustawStrone = useCallback((s: Strona) => {
    setZapis((z) => {
      const n = { ...z, strona: s };
      zapisz(n);
      return n;
    });
  }, []);
  const ustawSzerokosc = useCallback(
    (px: number) => {
      const w = Math.round(Math.min(max, Math.max(MIN_PANELU, px)));
      setZapis((z) => {
        const n = { ...z, szerokosc: w };
        zapisz(n);
        return n;
      });
    },
    [max],
  );

  return { strona, szerokosc, min: MIN_PANELU, max, waski, ustawStrone, ustawSzerokosc };
}

export type Uklad = ReturnType<typeof useUklad>;
