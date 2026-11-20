import { useEffect, useRef, useState, type RefObject } from "react";

const LIMIT_MS = 10_000;

// Nagrania idą wprost z cke.gov.pl. Zawieszony serwer nie wywołuje „error”, więc oprócz niego liczymy
// 10 s od startu (albo od zawieszenia w trakcie), po których nie dotarły dane.
export function useBladNagrania(audio: RefObject<HTMLAudioElement | null>) {
  const [blad, setBlad] = useState(false);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    let limit = 0;
    const wyczysc = () => {
      window.clearTimeout(limit);
      limit = 0;
    };
    const czekaj = () => {
      if (!limit && !a.paused) limit = window.setTimeout(() => setBlad(true), LIMIT_MS);
    };
    const naBlad = () => {
      wyczysc();
      setBlad(true);
    };
    const zdarzenia: [string, () => void][] = [
      ["play", czekaj], ["waiting", czekaj], ["stalled", czekaj],
      ["canplay", wyczysc], ["playing", wyczysc], ["loadeddata", wyczysc], ["pause", wyczysc], ["ended", wyczysc],
      ["error", naBlad],
    ];
    zdarzenia.forEach(([z, f]) => a.addEventListener(z, f));
    return () => {
      wyczysc();
      zdarzenia.forEach(([z, f]) => a.removeEventListener(z, f));
    };
  }, [audio]);

  const ponow = () => {
    setBlad(false);
    audio.current?.load();
  };
  return { blad, setBlad, ponow };
}

export function KomunikatBladuNagrania({ ponow }: { ponow: () => void }) {
  return (
    <p className="small muted" role="status">
      Strona CKE nie oddała nagrania. Spróbuj za chwilę.{" "}
      <button type="button" className="link small" onClick={ponow}>Wczytaj jeszcze raz</button>
    </p>
  );
}

/** Pełne nagranie CKE w arkuszu zadań: zwykły odtwarzacz z komunikatem, gdy CKE nie oddaje pliku. */
export function AudioCke({ src, className, etykieta }: { src: string; className?: string; etykieta: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const { blad, ponow } = useBladNagrania(audio);
  return (
    <>
      <audio ref={audio} className={className} controls preload="none" src={src} aria-label={etykieta} />
      {blad && <KomunikatBladuNagrania ponow={ponow} />}
    </>
  );
}
