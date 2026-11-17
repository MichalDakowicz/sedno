// Wgrywa arkusze z data/arkusze do tabeli public.sheets w Supabase Sedno (przez ssh i psql).
// Arkusze nie leżą na hostingu: aplikacja pobiera je z bazy, a RLS wpuszcza tylko zalogowanych.
// Użycie: npm run wgraj  (po npm run importuj; host ssh w SEDNO_SSH, domyślnie michu@192.168.100.6)
// Staging: SEDNO_DB=sb-sedno-dev-db npm run wgraj. Prefiks (npm run wgraj -- informatyka) wgrywa tylko
// pasujące arkusze i nie usuwa pozostałych z bazy.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KATALOG_ARKUSZY } from "./sciezki.js";

const host = process.env.SEDNO_SSH ?? "michu@192.168.100.6";
const kontener = process.env.SEDNO_DB ?? "sb-sedno-db";
const tylko = process.argv[2];
const lista = JSON.parse(readFileSync(join(KATALOG_ARKUSZY, "index.json"), "utf8"));
const ID = /^[a-z0-9._-]{1,120}$/;
if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(kontener)) throw new Error("Nieprawidłowa nazwa kontenera SEDNO_DB.");
if (!Array.isArray(lista) || !lista.length || lista.some((w) => typeof w?.id !== "string" || !ID.test(w.id) || w.id === "." || w.id === "..")) {
  throw new Error("Indeks arkuszy jest pusty lub zawiera nieprawidłowe identyfikatory.");
}
if (new Set(lista.map((w) => w.id)).size !== lista.length) throw new Error("Indeks arkuszy zawiera powtórzone identyfikatory.");
let liczba = 0;

// Dollar-quoting z losowym znacznikiem: JSON trafia do SQL bez ręcznego escapowania.
const tag = `$j${randomBytes(6).toString("hex")}$`;
const lit = (s) => {
  if (s.includes(tag)) throw new Error("znacznik w danych, uruchom ponownie");
  return `${tag}${s}${tag}`;
};

let sql = "begin;\n";
lista.forEach((wpis, i) => {
  if (tylko && !wpis.id.startsWith(tylko)) return;
  const dane = readFileSync(join(KATALOG_ARKUSZY, `${wpis.id}.json`), "utf8");
  const arkusz = JSON.parse(dane);
  if (arkusz?.id !== wpis.id || !Array.isArray(arkusz.zadania) || !arkusz.zadania.length) {
    throw new Error(`Nieprawidłowy plik arkusza ${wpis.id}.`);
  }
  liczba++;
  sql +=
    `insert into public.sheets (id, position, entry, data) values (${lit(wpis.id)}, ${i}, ${lit(JSON.stringify(wpis))}::jsonb, ${lit(dane)}::jsonb)\n` +
    "on conflict (id) do update set position = excluded.position, entry = excluded.entry, data = excluded.data, updated_at = now();\n";
});
if (!liczba) throw new Error(`Brak arkuszy z prefiksem ${tylko}.`);
if (!tylko) sql += `delete from public.sheets where id <> all (array[${lista.map((w) => lit(w.id)).join(", ")}]::text[]);\n`;
sql += "commit;\n";

const wynik = spawnSync("ssh", ["--", host, `docker exec -i ${kontener} psql -U postgres -q -v ON_ERROR_STOP=1`], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
if (wynik.error) throw wynik.error;
if (wynik.status !== 0) process.exit(wynik.status ?? 1);
console.log(`Wgrano ${liczba} arkuszy do ${kontener}.`);
