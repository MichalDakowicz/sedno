// Ciężkie narzędzia warsztatu (Monaco, arkusz kalkulacyjny) żyją tylko w pobliżu ekranu. Arkusz
// z informatyki to kilkanaście zadań na jednej stronie; wszystkie edytory i arkusze naraz
// zamulały przewijanie. Poza ekranem zostaje pusty blok tej samej wysokości, a stan narzędzia
// i tak siedzi w postępie (kod, operacje arkusza), więc po powrocie wraca.
import { useEffect, useRef, useState, type ReactNode } from "react";

export function Widoczny({ children, wysokosc, margines = "400px 0px" }: { children: ReactNode; wysokosc: number; margines?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [widoczny, setWidoczny] = useState(false);
  const ostatniaWysokosc = useRef(wysokosc);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obserwator = new IntersectionObserver(
      ([wpis]) => {
        if (!wpis.isIntersecting) ostatniaWysokosc.current = el.offsetHeight || ostatniaWysokosc.current;
        setWidoczny(wpis.isIntersecting);
      },
      { rootMargin: margines },
    );
    obserwator.observe(el);
    return () => obserwator.disconnect();
  }, [margines]);

  return (
    <div ref={ref} style={widoczny ? undefined : { minHeight: ostatniaWysokosc.current }}>
      {widoczny ? children : null}
    </div>
  );
}
