// Python (Pyodide) w osobnym wątku: pętla bez końca nie zawiesza strony, a „Zatrzymaj” po prostu
// kończy wątek. Pyodide (ok. 14 MB) ładuje się z naszego serwera (vite.config.ts) przy pierwszym uruchomieniu
// i zostaje w cache przeglądarki.

const PYODIDE = new URL("/pyodide/", self.location.origin).href;

type Pyodide = {
  FS: {
    mkdirTree: (p: string) => void;
    writeFile: (p: string, d: string) => void;
    readFile: (p: string, o: { encoding: "utf8" }) => string;
    readdir: (p: string) => string[];
    chdir: (p: string) => void;
    stat: (p: string) => { size: number; mode: number };
    isFile: (mode: number) => boolean;
  };
  setStdout: (o: { batched: (s: string) => void }) => void;
  setStderr: (o: { batched: (s: string) => void }) => void;
  setStdin: (o: { stdin: () => string | null }) => void;
  loadPackagesFromImports: (kod: string) => Promise<unknown>;
  runPythonAsync: (kod: string, o?: { globals?: unknown }) => Promise<unknown>;
  globals: { get: (n: string) => () => unknown };
};

export type DoWatku = { kod: string; pliki: Record<string, string> };
export type ZWatku = { typ: "gotowy" } | { typ: "wyjscie" | "blad"; tekst: string } | { typ: "koniec"; ms: number; utworzone: Record<string, string> };

// Projekt ma typy DOM, a nie WebWorker; wątek potrzebuje tylko tych dwóch rzeczy.
const watek = self as unknown as { postMessage: (w: ZWatku) => void; onmessage: ((e: MessageEvent<DoWatku>) => void) | null };
const wyslij = (w: ZWatku) => watek.postMessage(w);

let pyodide: Promise<Pyodide> | null = null;
let przebieg = 0;

function zaladuj() {
  pyodide ??= (async () => {
    const { loadPyodide } = (await import(/* @vite-ignore */ `${PYODIDE}pyodide.mjs`)) as { loadPyodide: (o: { indexURL: string }) => Promise<Pyodide> };
    const py = await loadPyodide({ indexURL: PYODIDE });
    py.setStdout({ batched: (tekst) => wyslij({ typ: "wyjscie", tekst: tekst + "\n" }) });
    py.setStderr({ batched: (tekst) => wyslij({ typ: "blad", tekst: tekst + "\n" }) });
    // Na egzaminie dane są w plikach; input() kończy się od razu zamiast czekać na klawiaturę.
    py.setStdin({ stdin: () => null });
    wyslij({ typ: "gotowy" });
    return py;
  })();
  return pyodide;
}

watek.onmessage = async (e) => {
  const { kod, pliki } = e.data;
  const start = performance.now();
  try {
    const py = await zaladuj();
    // Każde uruchomienie w czystym katalogu z plikami danych, jak katalog z danymi na egzaminie.
    const katalog = `/home/pyodide/uruchomienie${++przebieg}`;
    py.FS.mkdirTree(katalog);
    for (const [nazwa, tresc] of Object.entries(pliki)) py.FS.writeFile(`${katalog}/${nazwa}`, tresc);
    py.FS.chdir(katalog);
    await py.loadPackagesFromImports(kod);
    await py.runPythonAsync(kod, { globals: py.globals.get("dict")() });
    wyslij({ typ: "koniec", ms: performance.now() - start, utworzone: utworzone(py, katalog, pliki) });
  } catch (err) {
    wyslij({ typ: "blad", tekst: opisBledu(err) });
    wyslij({ typ: "koniec", ms: performance.now() - start, utworzone: {} });
  }
};

// Pliki zapisane przez program (np. wyniki2.txt), żeby uczeń zobaczył, co w nich jest.
function utworzone(py: Pyodide, katalog: string, pliki: Record<string, string>) {
  const wynik: Record<string, string> = {};
  for (const nazwa of py.FS.readdir(katalog)) {
    if (nazwa === "." || nazwa === ".." || nazwa in pliki) continue;
    const sciezka = `${katalog}/${nazwa}`;
    const { mode, size } = py.FS.stat(sciezka);
    if (!py.FS.isFile(mode)) continue;
    wynik[nazwa] = size > 200_000 ? "(plik większy niż 200 kB, nie pokazuję)" : py.FS.readFile(sciezka, { encoding: "utf8" });
  }
  return wynik;
}

// Traceback z Pyodide zaczyna się od ramek samego Pyodide; uczeń potrzebuje tylko swoich linii.
function opisBledu(err: unknown): string {
  const tekst = err instanceof Error ? err.message : String(err);
  const linie = tekst.split("\n");
  const od = linie.findIndex((l) => l.includes('File "<exec>"'));
  return (od > 0 ? ["Traceback (most recent call last):", ...linie.slice(od)] : linie).join("\n").trim() + "\n";
}
