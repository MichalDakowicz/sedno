// Ruch w JS: jedno miejsce, które wie, czy ruszać („Mniej ruchu”), sprężyna dla wartości liczonych w klatkach
// i licznik, który dochodzi do wartości. Czasy i sprężyna te same co --ruch-* w tokens.css (motion w @sedno/ui).
// Pętla klatek działa tylko wtedy, gdy coś się rusza: po dojściu do celu nie zostaje żaden requestAnimationFrame.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "@sedno/ui";

export const CZAS = { szybki: motion.fast, zwykly: motion.normal, wolny: motion.slow } as const;

const zapytanieRuchu = "(prefers-reduced-motion: reduce)";

/** „Mniej ruchu”: wybór z Ustawień (data-mniej-ruchu na <html>), a bez niego ustawienie systemu. CSS czyta to samo w global.css. */
export function mniejRuchu() {
  const wybor = document.documentElement.dataset.mniejRuchu;
  return wybor ? wybor === "tak" : window.matchMedia(zapytanieRuchu).matches;
}

function subskrybujRuch(zmiana: () => void) {
  const mq = window.matchMedia(zapytanieRuchu);
  mq.addEventListener("change", zmiana);
  const obserwator = new MutationObserver(zmiana);
  obserwator.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mniej-ruchu"] });
  return () => {
    mq.removeEventListener("change", zmiana);
    obserwator.disconnect();
  };
}

export const useMniejRuchu = () => useSyncExternalStore(subskrybujRuch, mniejRuchu);

type Sprezyna = {
  od: number;
  do: number;
  /** Prędkość początkowa w jednostkach na sekundę (np. z rzutu przy przeciąganiu). */
  predkosc?: number;
  sztywnosc?: number;
  tlumienie?: number;
  naKlatke: (wartosc: number) => void;
  naKoniec?: () => void;
};

/**
 * Sprężyna tłumiona (masa 1), krok półniejawny Eulera w stałych odcinkach 1/120 s, więc wynik nie zależy od
 * częstotliwości ekranu. Kończy się, gdy prawie stoi w celu. Zwraca funkcję zatrzymującą. Bez ruchu skacze od razu do celu.
 */
export function sprezyna({ od, do: cel, predkosc = 0, sztywnosc = motion.spring.stiffness, tlumienie = motion.spring.damping, naKlatke, naKoniec }: Sprezyna) {
  if (mniejRuchu() || (od === cel && predkosc === 0)) {
    naKlatke(cel);
    naKoniec?.();
    return () => {};
  }
  const KROK = 1 / 120;
  const skala = Math.max(1, Math.abs(cel - od));
  let x = od;
  let v = predkosc;
  let ostatnio = performance.now();
  let zapas = 0;
  let klatka = requestAnimationFrame(function tik(teraz) {
    // Karta w tle wstrzymuje klatki: po powrocie nie nadrabiamy sekund symulacji.
    zapas += Math.min(0.064, (teraz - ostatnio) / 1000);
    ostatnio = teraz;
    while (zapas >= KROK) {
      v += (-sztywnosc * (x - cel) - tlumienie * v) * KROK;
      x += v * KROK;
      zapas -= KROK;
    }
    if (Math.abs(x - cel) < skala * 0.001 && Math.abs(v) < skala * 0.01) {
      naKlatke(cel);
      naKoniec?.();
      return;
    }
    naKlatke(x);
    klatka = requestAnimationFrame(tik);
  });
  return () => cancelAnimationFrame(klatka);
}

/** Zwykła krzywa ruchu (--ruch-krzywa) jako funkcja 0..1 → 0..1. */
export function krzywa(t: number) {
  const [x1, y1, x2, y2] = motion.easing;
  // Odwrotność x(s) metodą Newtona, potem y(s): to samo co cubic-bezier w CSS.
  const bez = (s: number, a: number, b: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  let s = t;
  for (let i = 0; i < 6; i++) {
    const dx = (bez(s + 1e-4, x1, x2) - bez(s, x1, x2)) / 1e-4;
    if (!dx) break;
    s = Math.min(1, Math.max(0, s - (bez(s, x1, x2) - t) / dx));
  }
  return bez(s, y1, y2);
}

/**
 * Liczba, która dochodzi do wartości (procent opanowania, wynik, licznik). Przy pierwszym renderze startuje od `od`
 * (domyślnie 0), potem od poprzedniej wartości. Zmienia stan co klatkę tylko w trakcie ruchu, więc trzymaj ją
 * w małym komponencie (np. Liczba niżej), żeby nie przerysowywać całej sekcji.
 */
export function useLiczba(cel: number, { od = 0, czas = CZAS.wolny }: { od?: number; czas?: number } = {}) {
  const bezRuchu = useMniejRuchu();
  const [wartosc, ustaw] = useState(() => (bezRuchu ? cel : od));
  const biezaca = useRef(wartosc);
  useEffect(() => {
    if (bezRuchu || !Number.isFinite(cel)) {
      biezaca.current = cel;
      ustaw(cel);
      return;
    }
    const start = biezaca.current;
    if (start === cel) return;
    const t0 = performance.now();
    let klatka = requestAnimationFrame(function tik(teraz) {
      const u = Math.min(1, (teraz - t0) / czas);
      const v = start + (cel - start) * krzywa(u);
      biezaca.current = v;
      ustaw(v);
      if (u < 1) klatka = requestAnimationFrame(tik);
    });
    return () => cancelAnimationFrame(klatka);
  }, [cel, czas, bezRuchu]);
  return wartosc;
}

/** Liczba w tekście, która dochodzi do wartości. format dostaje wartość pośrednią (np. zaokrąglenie). */
export function Liczba({ wartosc, format = (v) => String(Math.round(v)), od }: { wartosc: number; format?: (v: number) => string; od?: number }) {
  const v = useLiczba(wartosc, { od });
  // Czytnik ekranu dostaje od razu wartość końcową, a nie kolejne klatki.
  return (
    <>
      <span aria-hidden="true">{format(v)}</span>
      <span className="visually-hidden">{format(wartosc)}</span>
    </>
  );
}
