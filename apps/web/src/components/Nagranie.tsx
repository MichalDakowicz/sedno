import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play, RotateCcw, X } from "lucide-react";
import styles from "./Nagranie.module.css";

const czas = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "–:––");

// Odtwarzacz nagrania do zadań ze słuchu. Po starcie przypina się do dołu
// ekranu, żeby kontrolki były pod ręką przy przewijaniu do zadań. Odpina
// się po końcu nagrania albo krzyżykiem.
export function Nagranie({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [gra, setGra] = useState(false);
  const [przypiety, setPrzypiety] = useState(false);
  const [pozycja, setPozycja] = useState(0);
  const [dlugosc, setDlugosc] = useState(NaN);
  const [blad, setBlad] = useState(false);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const naCzas = () => setPozycja(a.currentTime);
    const naDlugosc = () => setDlugosc(a.duration);
    const naStart = () => {
      setGra(true);
      setPrzypiety(true);
    };
    const naPauze = () => setGra(false);
    const naKoniec = () => {
      setGra(false);
      setPrzypiety(false);
    };
    const naBlad = () => setBlad(true);
    a.addEventListener("timeupdate", naCzas);
    a.addEventListener("loadedmetadata", naDlugosc);
    a.addEventListener("play", naStart);
    a.addEventListener("pause", naPauze);
    a.addEventListener("ended", naKoniec);
    a.addEventListener("error", naBlad);
    return () => {
      a.removeEventListener("timeupdate", naCzas);
      a.removeEventListener("loadedmetadata", naDlugosc);
      a.removeEventListener("play", naStart);
      a.removeEventListener("pause", naPauze);
      a.removeEventListener("ended", naKoniec);
      a.removeEventListener("error", naBlad);
    };
  }, []);

  const przelacz = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => setBlad(true));
    else a.pause();
  };
  const cofnij = () => {
    if (audio.current) audio.current.currentTime = Math.max(0, audio.current.currentTime - 10);
  };
  const odepnij = () => {
    audio.current?.pause();
    setPrzypiety(false);
  };

  return (
    // Miejsce w nagłówku zostaje zajęte, żeby treść nie skakała po przypięciu.
    <div className={styles.slot} data-tutor-about="Nagranie do zadań ze słuchu, odtwarzane ze strony CKE. Po starcie przypina się na dole ekranu.">
      <div className={`${styles.player} ${przypiety ? styles.pinned : ""}`}>
        <span className={styles.icon}>
          <Headphones size={18} aria-hidden="true" />
        </span>
        <button type="button" className={styles.play} onClick={przelacz} aria-label={gra ? "Pauza" : "Odtwórz nagranie"}>
          {gra ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        <button type="button" className={styles.small} onClick={cofnij} aria-label="Cofnij o 10 sekund" title="Cofnij o 10 s">
          <RotateCcw size={16} aria-hidden="true" />
          <span>10</span>
        </button>
        <span className={styles.time}>{czas(pozycja)}</span>
        <input
          type="range"
          className={styles.seek}
          min={0}
          max={Number.isFinite(dlugosc) ? dlugosc : 0}
          step={1}
          value={pozycja}
          onChange={(e) => {
            if (audio.current) audio.current.currentTime = Number(e.target.value);
          }}
          aria-label="Pozycja nagrania"
          style={{ ["--postep" as string]: `${Number.isFinite(dlugosc) && dlugosc ? (pozycja / dlugosc) * 100 : 0}%` }}
        />
        <span className={styles.time}>{czas(dlugosc)}</span>
        {przypiety && (
          <button type="button" className={styles.small} onClick={odepnij} aria-label="Zatrzymaj i odepnij odtwarzacz">
            <X size={16} aria-hidden="true" />
          </button>
        )}
        <audio ref={audio} src={src} preload="metadata" />
      </div>
      {blad && <p className="small muted">Nie udało się wczytać nagrania ze strony CKE.</p>}
    </div>
  );
}
