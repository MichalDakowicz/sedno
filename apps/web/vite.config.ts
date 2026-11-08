import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
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
// pod /pyodide/. Dodatkowych bibliotek (numpy itd.) nie wozimy, matura ich nie wymaga.
const PYODIDE = dirname(createRequire(import.meta.url).resolve("pyodide/package.json"));
const PLIKI_PYODIDE: Record<string, string> = {
  "pyodide.mjs": "text/javascript",
  "pyodide.asm.js": "text/javascript",
  "pyodide.asm.wasm": "application/wasm",
  "python_stdlib.zip": "application/zip",
  "pyodide-lock.json": "application/json",
};

function pyodideLokalnie(): Plugin {
  return {
    name: "sedno-pyodide",
    configureServer(server) {
      server.middlewares.use("/pyodide", (req, res, next) => {
        const plik = decodeURIComponent((req.url ?? "/").split("?")[0]).replace(/^\//, "");
        const typ = PLIKI_PYODIDE[plik];
        if (!typ) return next();
        res.setHeader("Content-Type", typ);
        res.end(readFileSync(join(PYODIDE, plik)));
      });
    },
    writeBundle(options) {
      if (!options.dir) return;
      mkdirSync(join(options.dir, "pyodide"), { recursive: true });
      for (const plik of Object.keys(PLIKI_PYODIDE)) cpSync(join(PYODIDE, plik), join(options.dir, "pyodide", plik));
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
