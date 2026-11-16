// Uruchamianie Pythona z wątku python.worker.ts. Jeden wątek na stronę: Pyodide ładuje się raz,
// a „Zatrzymaj” kończy wątek i następne uruchomienie ładuje go od nowa.
import type { DoWatku, ZWatku } from "./python.worker";

let watek: Worker | null = null;
let gotowy = false;

export type Zdarzenie = ZWatku;

function nowyWatek() {
  gotowy = false;
  return new Worker(new URL("./python.worker.ts", import.meta.url), { type: "module" });
}

/** Uruchamia kod; zdarzenia (wyjście, błędy, koniec) idą do onZdarzenie. */
export function uruchom(kod: string, pliki: Record<string, string>, onZdarzenie: (z: Zdarzenie) => void) {
  watek ??= nowyWatek();
  const w = watek;
  w.onmessage = (e: MessageEvent<ZWatku>) => {
    if (e.data.typ === "gotowy") gotowy = true;
    onZdarzenie(e.data);
  };
  w.onerror = (e) => {
    onZdarzenie({ typ: "blad", tekst: `Nie udało się uruchomić Pythona (${e.message || "brak połączenia?"}).\n` });
    onZdarzenie({ typ: "koniec", ms: 0, utworzone: {} });
    zatrzymaj();
  };
  w.postMessage({ kod, pliki } satisfies DoWatku);
}

export function zatrzymaj() {
  watek?.terminate();
  watek = null;
  gotowy = false;
}

/** Czy Python jest już załadowany (pierwsze uruchomienie trwa kilka sekund dłużej). */
export const pythonGotowy = () => gotowy;
