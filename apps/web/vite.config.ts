import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join, normalize, resolve } from "node:path";

// Arkusze CKE po imporcie (npm run importuj) leżą w data/arkusze poza repo.
// W dev serwujemy je pod /dane/arkusze, przy buildzie kopiujemy do dist.
const KATALOG_ARKUSZY = resolve(__dirname, "../../data/arkusze");

function arkuszeCke(): Plugin {
  return {
    name: "sedno-arkusze",
    configureServer(server) {
      server.middlewares.use("/dane/arkusze", (req, res, next) => {
        const plik = normalize(join(KATALOG_ARKUSZY, decodeURIComponent((req.url ?? "/").split("?")[0])));
        if (!plik.startsWith(KATALOG_ARKUSZY) || !plik.endsWith(".json") || !existsSync(plik)) return next();
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(readFileSync(plik));
      });
    },
    writeBundle(options) {
      if (existsSync(KATALOG_ARKUSZY) && options.dir) cpSync(KATALOG_ARKUSZY, join(options.dir, "dane/arkusze"), { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), arkuszeCke()],
  server: { port: 5173 },
});
