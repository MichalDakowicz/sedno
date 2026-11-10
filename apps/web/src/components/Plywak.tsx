// Szklana pigułka pod aktywną zakładką. Przy zmianie zakładki najpierw rozciąga się w stronę nowej,
// potem dociąga drugą krawędź, więc wygląda, jakby przelewała się między przyciskami.
// Kładziemy ją jako pierwsze dziecko kontenera z position: relative; aktywny element ma
// data-aktywny="true" albo aria-pressed="true".
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./Plywak.module.css";

type Pozycja = { left: number; right: number; top: number; height: number };

const AKTYWNY = '[data-aktywny="true"], [aria-pressed="true"]';

/** jako="li" w liście (<ul>), żeby HTML był poprawny; wtedy kontenerem jest lista. */
export function Plywak({ zalezy, jako = "span" }: { zalezy: unknown; jako?: "span" | "li" }) {
  const ref = useRef<HTMLElement>(null);
  const [poz, setPoz] = useState<Pozycja | null>(null);
  const [kierunek, setKierunek] = useState<"prawo" | "lewo">("prawo");
  const [gotowy, setGotowy] = useState(false);
  const ostatni = useRef<Pozycja | null>(null);

  const zmierz = useCallback(() => {
    const kontener = ref.current?.parentElement;
    const el = kontener?.querySelector<HTMLElement>(AKTYWNY);
    if (!kontener || !el || !el.offsetWidth) return setPoz(null);
    // offsetLeft liczy się od kontenera (ma position: relative), więc przewijany pasek też się zgadza.
    let left = 0;
    let top = 0;
    for (let n: HTMLElement | null = el; n && n !== kontener; n = n.offsetParent as HTMLElement | null) {
      left += n.offsetLeft;
      top += n.offsetTop;
    }
    const nowa = { left, right: kontener.scrollWidth - left - el.offsetWidth, top, height: el.offsetHeight };
    const stara = ostatni.current;
    if (stara && (stara.left !== nowa.left || stara.right !== nowa.right)) setKierunek(nowa.left > stara.left ? "prawo" : "lewo");
    ostatni.current = nowa;
    setPoz(nowa);
  }, []);

  useLayoutEffect(zmierz, [zalezy, zmierz]);

  useEffect(() => {
    const kontener = ref.current?.parentElement;
    if (!kontener) return;
    const ro = new ResizeObserver(zmierz);
    // Same przyciski zmieniają szerokość (np. licznik pojawia się po wczytaniu danych), kontener nie.
    const obserwuj = () => {
      ro.disconnect();
      ro.observe(kontener);
      for (const dziecko of Array.from(kontener.children)) ro.observe(dziecko);
    };
    obserwuj();
    const mo = new MutationObserver(() => {
      obserwuj();
      zmierz();
    });
    mo.observe(kontener, { childList: true, subtree: true, characterData: true });
    void document.fonts?.ready.then(zmierz);
    // Animacja dopiero po pierwszym ustawieniu, żeby pigułka nie wjeżdżała przy wejściu na stronę.
    const t = window.setTimeout(() => setGotowy(true), 50);
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.clearTimeout(t);
    };
  }, [zmierz]);

  const Tag = jako;
  return (
    <Tag
      ref={ref as React.Ref<never>}
      aria-hidden="true"
      role={jako === "li" ? "presentation" : undefined}
      className={`${styles.plywak} ${gotowy ? styles[kierunek] : ""} ${poz ? "" : styles.ukryty}`}
      style={poz ? { left: poz.left, right: poz.right, top: poz.top, height: poz.height } : undefined}
    />
  );
}
