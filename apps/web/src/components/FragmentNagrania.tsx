// Fragment nagrania przy sprawdzonym pytaniu ze słuchania: odtwarza tylko ten kawałek, w którym
// pada odpowiedź (od sekundy do sekundy), a pod przyciskiem pokazuje jego tekst. Fragmenty
// dopasowuje skrypt services/arkusze/nagrania (Whisper i model językowy).
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { CzescNagrania } from "../arkusze/typy";
import styles from "./FragmentNagrania.module.css";

// Jeden odtwarzacz na całą stronę: nowy fragment zatrzymuje poprzedni.
let wspolny: HTMLAudioElement | null = null;
let zatrzymajGrajacy: (() => void) | null = null;

const sekundy = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function FragmentNagrania({ src, fragment }: { src: string; fragment: CzescNagrania }) {
  const [gra, setGra] = useState(false);
  const zatrzymajMoj = useRef<(() => void) | null>(null);
  useEffect(() => () => zatrzymajMoj.current?.(), []);

  function przelacz() {
    if (zatrzymajMoj.current) return zatrzymajMoj.current();
    zatrzymajGrajacy?.();
    // Główny odtwarzacz arkusza milknie, żeby nie grały dwa nagrania naraz.
    document.querySelectorAll("audio").forEach((x) => x.pause());
    wspolny ??= new Audio();
    const a = wspolny;
    if (a.src !== src) a.src = src;
    const stop = () => {
      a.pause();
      a.removeEventListener("timeupdate", naCzas);
      if (zatrzymajGrajacy === stop) zatrzymajGrajacy = null;
      zatrzymajMoj.current = null;
      setGra(false);
    };
    const naCzas = () => {
      if (a.currentTime >= fragment.do) stop();
    };
    a.addEventListener("timeupdate", naCzas);
    a.currentTime = fragment.od;
    zatrzymajGrajacy = stop;
    zatrzymajMoj.current = stop;
    setGra(true);
    void a.play().catch(stop);
  }

  return (
    <div className={styles.fragment}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={przelacz} aria-pressed={gra}>
        {gra ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        {gra ? "Zatrzymaj" : "Posłuchaj fragmentu"}
        <span className={styles.czas}>
          {sekundy(fragment.od)}–{sekundy(fragment.do)}
        </span>
      </button>
      {fragment.tekst && <blockquote className={styles.tekst}>{fragment.tekst}</blockquote>}
    </div>
  );
}
