import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const KORZEN = fileURLToPath(new URL("../../../", import.meta.url));
// Pobrane PDF-y CKE i wynikowe JSON-y leżą poza repozytorium (data/ jest w .gitignore).
export const KATALOG_CKE = join(KORZEN, "data", "cke");
export const KATALOG_ARKUSZY = join(KORZEN, "data", "arkusze");
