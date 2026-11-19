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

/** podpis: numer pytania przed przyciskiem (np. w karcie omawiania, gdzie fragmentów jest kilka). */
export function FragmentNagrania({ src, fragment, podpis }: { src: string; fragment: CzescNagrania; podpis?: string }) {
  // „Zatrzymaj” dopiero, gdy dźwięk naprawdę idzie; wcześniej plik z CKE może się jeszcze wczytywać.
  const [stan, setStan] = useState<"stoi" | "laduje" | "gra">("stoi");
  const [blad, setBlad] = useState(false);
  const gra = stan !== "stoi";
  // Ile fragmentu już zagrało (0–1): pasek pod przyciskiem pokazuje, że nagranie idzie i ile zostało.
  const [postep, setPostep] = useState(0);
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
      a.removeEventListener("playing", naStart);
      a.removeEventListener("error", naBlad);
      window.clearTimeout(limit);
      if (zatrzymajGrajacy === stop) zatrzymajGrajacy = null;
      zatrzymajMoj.current = null;
      setStan("stoi");
    };
    const naStart = () => {
      window.clearTimeout(limit);
      setStan("gra");
    };
    const naBlad = () => {
      stop();
      setBlad(true);
    };
    // Gdy strona CKE nie odpowiada, przeglądarka potrafi czekać bez końca: po 15 s mówimy to wprost.
    const limit = window.setTimeout(naBlad, 15_000);
    const naCzas = () => {
      setPostep(Math.min(1, Math.max(0, (a.currentTime - fragment.od) / Math.max(1, fragment.do - fragment.od))));
      if (a.currentTime >= fragment.do) stop();
    };
    a.addEventListener("timeupdate", naCzas);
    a.addEventListener("playing", naStart);
    a.addEventListener("error", naBlad);
    a.currentTime = fragment.od;
    zatrzymajGrajacy = stop;
    zatrzymajMoj.current = stop;
    setPostep(0);
    setBlad(false);
    setStan("laduje");
    void a.play().catch(naBlad);
  }

  return (
    <div className={styles.fragment}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={przelacz} aria-pressed={gra}>
        {gra ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        {podpis && <strong>{podpis}</strong>}
        {stan === "gra" ? "Zatrzymaj" : stan === "laduje" ? "Wczytuję…" : podpis ? "Posłuchaj" : "Posłuchaj fragmentu"}
        <span className={styles.czas}>
          {sekundy(fragment.od)}–{sekundy(fragment.do)}
        </span>
      </button>
      {blad && <p className="small muted">Strona CKE nie oddała nagrania. Spróbuj za chwilę.</p>}
      {(stan === "gra" || postep > 0) && (
        <span className={styles.pasek} role="progressbar" aria-label="Odtworzona część fragmentu" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(postep * 100)}>
          <span style={{ width: `${postep * 100}%` }} />
        </span>
      )}
      {fragment.tekst && <blockquote className={styles.tekst}>{fragment.tekst}</blockquote>}
    </div>
  );
}
