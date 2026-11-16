import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize, resolve } from "node:path";

// Fonty Excalidraw (brudnopis) z własnego serwera zamiast z CDN esm.sh:
// bez zapytań do obcych serwerów z przeglądarki ucznia. Ścieżkę ustawia
// window.EXCALIDRAW_ASSET_PATH w components/Brudnopis.tsx.
const FONTY_EXCALIDRAW = join(dirname(createRequire(import.meta.url).resolve("@excalidraw/excalidraw")), "fonts");
const TYPY_FONTOW: Record<string, string> = { ".woff2": "font/woff2", ".ttf": "font/ttf" };

function fontyExcalidraw(): Plugin {
  return {
    name: "sedno-fonty-excalidraw",
    configureServer(server) {
      server.middlewares.use("/excalidraw/fonts", (req, res, next) => {
        const plik = normalize(join(FONTY_EXCALIDRAW, decodeURIComponent((req.url ?? "/").split("?")[0])));
        const typ = TYPY_FONTOW[extname(plik)];
        if (!plik.startsWith(FONTY_EXCALIDRAW) || !typ || !existsSync(plik)) return next();
        res.setHeader("Content-Type", typ);
        res.end(readFileSync(plik));
      });
    },
    writeBundle(options) {
      // Xiaolai to fonty CJK (kilkanaście MB), polski tekst ich nie potrzebuje.
      if (options.dir) cpSync(FONTY_EXCALIDRAW, join(options.dir, "excalidraw/fonts"), { recursive: true, filter: (p) => !p.includes("Xiaolai") });
    },
  };
}

// Python w przeglądarce (warsztat informatyki) też z własnego serwera: rdzeń Pyodide z paczki npm
// pod /pyodide/. Z bibliotek wozimy tylko jedi i parso (podpowiedzi w edytorze jak w VS Code); paczka
// npm ich nie ma, więc przy pierwszym dev/buildzie pobieramy je z CDN Pyodide i sprawdzamy sumą
// SHA-256 z pyodide-lock.json. Uczeń dostaje je już z naszego serwera.
const PYODIDE = dirname(createRequire(import.meta.url).resolve("pyodide/package.json"));
const PLIKI_PYODIDE: Record<string, string> = {
  "pyodide.mjs": "text/javascript",
  "pyodide.asm.js": "text/javascript",
  "pyodide.asm.wasm": "application/wasm",
  "python_stdlib.zip": "application/zip",
  "pyodide-lock.json": "application/json",
};
const PAKIETY_PYODIDE = ["jedi", "parso"];
const CACHE_PAKIETOW = join(PYODIDE, "..", ".cache", "sedno-pyodide");

async function pakietyPyodide(): Promise<Record<string, string>> {
  const lock = JSON.parse(readFileSync(join(PYODIDE, "pyodide-lock.json"), "utf8"));
  const wersja = JSON.parse(readFileSync(join(PYODIDE, "package.json"), "utf8")).version;
  mkdirSync(CACHE_PAKIETOW, { recursive: true });
  const pliki: Record<string, string> = {};
  for (const nazwa of PAKIETY_PYODIDE) {
    const { file_name: plik, sha256 } = lock.packages[nazwa];
    const cel = join(CACHE_PAKIETOW, plik);
    if (!existsSync(cel)) {
      const odp = await fetch(`https://cdn.jsdelivr.net/pyodide/v${wersja}/full/${plik}`);
      if (!odp.ok) throw new Error(`Nie udało się pobrać ${plik}: ${odp.status}`);
      const dane = Buffer.from(await odp.arrayBuffer());
      if (createHash("sha256").update(dane).digest("hex") !== sha256) throw new Error(`Zła suma SHA-256 pliku ${plik}`);
      writeFileSync(cel, dane);
    }
    pliki[plik] = cel;
  }
  return pliki;
}

function pyodideLokalnie(): Plugin {
  let pakiety: Promise<Record<string, string>> | null = null;
  return {
    name: "sedno-pyodide",
    buildStart() {
      pakiety ??= pakietyPyodide();
    },
    configureServer(server) {
      pakiety ??= pakietyPyodide();
      server.middlewares.use("/pyodide", (req, res, next) => {
        const plik = decodeURIComponent((req.url ?? "/").split("?")[0]).replace(/^\//, "");
        const typ = PLIKI_PYODIDE[plik];
        if (typ) {
          res.setHeader("Content-Type", typ);
          return res.end(readFileSync(join(PYODIDE, plik)));
        }
        pakiety!.then((p) => {
          if (!p[plik]) return next();
          res.setHeader("Content-Type", "application/zip");
          res.end(readFileSync(p[plik]));
        }, next);
      });
    },
    async writeBundle(options) {
      if (!options.dir) return;
      mkdirSync(join(options.dir, "pyodide"), { recursive: true });
      for (const plik of Object.keys(PLIKI_PYODIDE)) cpSync(join(PYODIDE, plik), join(options.dir, "pyodide", plik));
      for (const [plik, zrodlo] of Object.entries(await pakietyPyodide())) cpSync(zrodlo, join(options.dir, "pyodide", plik));
    },
  };
}

// Arkusze CKE nie trafiają do builda: aplikacja pobiera je z Supabase po zalogowaniu (npm run wgraj).
export default defineConfig({
  plugins: [react(), fontyExcalidraw(), pyodideLokalnie()],
  // Wątek Pythona ładuje Pyodide dynamicznym importem, więc jest modułem ES.
  worker: { format: "es" },
  // Jeden plik .env w katalogu głównym repo dla aplikacji i skryptów.
  envDir: resolve(__dirname, "../.."),
  server: { port: 5173 },
});
