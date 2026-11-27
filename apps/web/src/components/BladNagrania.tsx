import { useEffect, useRef, useState, type RefObject } from "react";

const LIMIT_MS = 10_000;

// Nagrania idą wprost z cke.gov.pl. Zawieszony serwer nie wywołuje „error”, więc oprócz niego liczymy
// 10 s od startu (albo od przerwy w trakcie), po których nie dotarły dane. „stalled” pomijamy: zdarza
// się też przy zdrowym odtwarzaniu.
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
      if (!limit && !a.paused && a.readyState < 3) limit = window.setTimeout(() => setBlad(true), LIMIT_MS);
    };
    // Dane płyną, ale wciąż za mało do grania: liczymy od nowa, żeby późniejsze zawieszenie też dało komunikat.
    const naPostep = () => {
      wyczysc();
      czekaj();
    };
    const naGra = () => {
      wyczysc();
      setBlad(false);
    };
    const naBlad = () => {
      wyczysc();
      setBlad(true);
    };
    // „Wczytaj jeszcze raz” woła load(): nowe ładowanie liczy czas od nowa, jak przy pierwszym wejściu.
    const naStart = () => {
      if (!limit && a.preload !== "none" && a.readyState < 1) limit = window.setTimeout(() => setBlad(true), LIMIT_MS);
    };
    // Z preload metadata nagranie rusza ładować od razu, więc zawieszony serwer zgłaszamy bez klikania „Odtwórz”.
    if (a.preload !== "none" && a.readyState < 1) limit = window.setTimeout(() => setBlad(true), LIMIT_MS);
    const zdarzenia: [string, () => void][] = [
      ["play", czekaj], ["waiting", czekaj], ["loadstart", naStart],
      ["loadedmetadata", wyczysc], ["progress", naPostep], ["loadeddata", naPostep], ["timeupdate", wyczysc], ["canplay", wyczysc], ["pause", wyczysc], ["ended", wyczysc],
      ["playing", naGra],
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

// Pusty obszar status zostaje w drzewie cały czas, bo czytniki ekranu nie zapowiadają elementu wstawionego już z tekstem.
export function KomunikatBladuNagrania({ blad, ponow }: { blad: boolean; ponow: () => void }) {
  return (
    <div role="status">
      {blad && (
        <p className="small muted">
          Strona CKE nie oddała nagrania. Spróbuj za chwilę.{" "}
          <button type="button" className="link small" onClick={ponow}>Wczytaj jeszcze raz</button>
        </p>
      )}
    </div>
  );
}

/** Pełne nagranie CKE w arkuszu zadań: zwykły odtwarzacz z komunikatem, gdy CKE nie oddaje pliku. */
export function AudioCke({ src, className, etykieta }: { src: string; className?: string; etykieta: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const { blad, ponow } = useBladNagrania(audio);
  return (
    <>
      <audio ref={audio} className={className} controls preload="none" src={src} aria-label={etykieta} />
      <KomunikatBladuNagrania blad={blad} ponow={ponow} />
    </>
  );
}
