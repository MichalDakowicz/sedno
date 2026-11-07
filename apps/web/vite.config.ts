import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync, readFileSync } from "node:fs";
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

// Arkusze CKE nie trafiają do builda: aplikacja pobiera je z Supabase po zalogowaniu (npm run wgraj).
export default defineConfig({
  plugins: [react(), fontyExcalidraw()],
  // Jeden plik .env w katalogu głównym repo dla aplikacji i skryptów.
  envDir: resolve(__dirname, "../.."),
  server: { port: 5173 },
});
