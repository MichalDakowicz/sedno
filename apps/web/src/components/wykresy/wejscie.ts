// Wykres dochodzi do wartości, gdy pierwszy raz wjedzie w ekran (a nie przy montowaniu poza ekranem).
// Jeden IntersectionObserver na wykres, odpinany po pierwszym wejściu; bez ruchu i na stronie już obejrzanej
// wartość stoi od razu.
import { useEffect, useRef, useState } from "react";
import { bezWejscia } from "../../ruch";

export function useWejscie<T extends Element>() {
  const ref = useRef<T>(null);
  const [weszlo, ustaw] = useState(() => typeof window !== "undefined" && bezWejscia());
  useEffect(() => {
    const el = ref.current;
    if (weszlo || !el) return;
    if (!("IntersectionObserver" in window)) return ustaw(true);
    const io = new IntersectionObserver((wpisy) => {
      if (!wpisy.some((w) => w.isIntersecting)) return;
      io.disconnect();
      // Klatka później: przeglądarka zdąży narysować stan zerowy, więc przejście ma od czego ruszyć.
      requestAnimationFrame(() => ustaw(true));
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [weszlo]);
  return [ref, weszlo] as const;
}

export const ogranicz = (v: number) => Math.min(1, Math.max(0, v));
export const procent = (v: number) => `${Math.round(ogranicz(v) * 100)}%`;
