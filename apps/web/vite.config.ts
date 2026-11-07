import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Arkusze CKE nie trafiają do builda: aplikacja pobiera je z Supabase po zalogowaniu (npm run wgraj).
export default defineConfig({
  plugins: [react()],
  // Jeden plik .env w katalogu głównym repo dla aplikacji i skryptów.
  envDir: resolve(__dirname, "../.."),
  server: { port: 5173 },
});
