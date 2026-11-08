// Podpowiedzi do Pythona jak w VS Code: Jedi (ten sam silnik, którego używa rozszerzenie Pythona
// w wielu edytorach) w Pyodide, w osobnym wątku. Uzupełnianie nazw zmiennych, funkcji, metod
// i nazw plików z danymi, podpowiedź parametrów funkcji, opis pod kursorem i błędy składni.
// Wątek uruchamiania programu (python.worker.ts) jest osobny: „Zatrzymaj” kończy tamten, a podpowiedzi zostają.

const PYODIDE = new URL("/pyodide/", self.location.origin).href;

type Pyodide = {
  FS: { mkdirTree: (p: string) => void; writeFile: (p: string, d: string) => void; readdir: (p: string) => string[]; unlink: (p: string) => void };
  loadPackage: (p: string[]) => Promise<unknown>;
  runPython: (kod: string) => unknown;
  globals: { get: (n: string) => (...a: unknown[]) => string };
};

export type Zapytanie =
  | { id: number; typ: "pliki"; pliki: Record<string, string> }
  | { id: number; typ: "uzupelnij" | "sygnatura" | "opis" | "bledy"; kod: string; linia: number; kolumna: number };

export type Podpowiedz = { nazwa: string; rodzaj: string; opis: string; dok: string };
export type Sygnatura = { etykieta: string; parametry: string[]; aktywny: number; dok: string };
export type BladSkladni = { linia: number; kolumna: number; doLinii: number; doKolumny: number; tekst: string };
export type Odpowiedz = { id: number; wynik: unknown };

const KATALOG = "/home/pyodide/warsztat";

// Funkcje po stronie Pythona zwracają JSON, żeby nie przenosić obiektów Pyodide między światami.
const PY = `
import jedi, json
jedi.settings.case_insensitive_completion = False
SCIEZKA = "${KATALOG}/program.py"

def _skrypt(kod):
    return jedi.Script(kod, path=SCIEZKA)

def uzupelnij(kod, linia, kolumna):
    wynik = []
    for i, c in enumerate(_skrypt(kod).complete(linia, kolumna)[:150]):
        dok = ""
        if i < 25:
            try:
                dok = c.docstring(raw=False)[:600]
            except Exception:
                pass
        wynik.append({"nazwa": c.name, "rodzaj": c.type, "opis": c.description or "", "dok": dok})
    return json.dumps(wynik)

def sygnatura(kod, linia, kolumna):
    wynik = []
    for s in _skrypt(kod).get_signatures(linia, kolumna):
        try:
            dok = s.docstring(raw=True)[:600]
        except Exception:
            dok = ""
        wynik.append({"etykieta": s.to_string(), "parametry": [p.to_string() for p in s.params], "aktywny": s.index if s.index is not None else -1, "dok": dok})
    return json.dumps(wynik)

def opis(kod, linia, kolumna):
    teksty = []
    for n in _skrypt(kod).help(linia, kolumna)[:1]:
        naglowek = n.description or n.name
        try:
            dok = n.docstring()[:1200]
        except Exception:
            dok = ""
        teksty.append({"naglowek": naglowek, "dok": dok})
    return json.dumps(teksty)

def bledy(kod, linia, kolumna):
    wynik = []
    for e in _skrypt(kod).get_syntax_errors()[:20]:
        wynik.append({"linia": e.line, "kolumna": e.column, "doLinii": e.until_line, "doKolumny": e.until_column, "tekst": e.get_message()})
    return json.dumps(wynik)
`;

const watek = self as unknown as { postMessage: (w: Odpowiedz) => void; onmessage: ((e: MessageEvent<Zapytanie>) => void) | null };

let py: Promise<Pyodide> | null = null;
let pliki: string[] = [];

function zaladuj() {
  py ??= (async () => {
    const { loadPyodide } = (await import(/* @vite-ignore */ `${PYODIDE}pyodide.mjs`)) as { loadPyodide: (o: { indexURL: string }) => Promise<Pyodide> };
    const p = await loadPyodide({ indexURL: PYODIDE });
    await p.loadPackage(["jedi"]);
    p.FS.mkdirTree(KATALOG);
    p.runPython(PY);
    return p;
  })();
  return py;
}

// Kolejka: jedno zapytanie naraz, a zapytania tego samego typu czekające w kolejce zastępuje najnowsze
// (przy szybkim pisaniu liczy się tylko ostatnia pozycja kursora).
let zajety = false;
const kolejka: Zapytanie[] = [];

async function obsluz() {
  if (zajety) return;
  zajety = true;
  while (kolejka.length) {
    const z = kolejka.shift()!;
    let wynik: unknown = null;
    try {
      const p = await zaladuj();
      if (z.typ === "pliki") {
        // Pliki z danymi obok „programu”, żeby Jedi podpowiadał je w open("…").
        for (const n of pliki) p.FS.unlink(`${KATALOG}/${n}`);
        pliki = Object.keys(z.pliki);
        for (const [n, tresc] of Object.entries(z.pliki)) p.FS.writeFile(`${KATALOG}/${n}`, tresc);
      } else {
        wynik = JSON.parse(p.globals.get(z.typ)(z.kod, z.linia, z.kolumna));
      }
    } catch {
      wynik = null;
    }
    watek.postMessage({ id: z.id, wynik });
  }
  zajety = false;
}

watek.onmessage = (e) => {
  const z = e.data;
  if (z.typ !== "pliki") {
    const stare = kolejka.findIndex((x) => x.typ === z.typ);
    if (stare >= 0) {
      watek.postMessage({ id: kolejka[stare].id, wynik: null });
      kolejka.splice(stare, 1);
    }
  }
  kolejka.push(z);
  void obsluz();
};
