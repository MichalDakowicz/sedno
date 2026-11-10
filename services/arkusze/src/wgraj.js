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
  sql +=
    `insert into public.sheets (id, position, entry, data) values (${lit(wpis.id)}, ${i}, ${lit(JSON.stringify(wpis))}::jsonb, ${lit(dane)}::jsonb)\n` +
    "on conflict (id) do update set position = excluded.position, entry = excluded.entry, data = excluded.data, updated_at = now();\n";
});
if (!tylko) sql += `delete from public.sheets where id <> all (array[${lista.map((w) => lit(w.id)).join(", ")}]::text[]);\n`;
sql += "commit;\n";

const wynik = spawnSync("ssh", [host, `docker exec -i ${kontener} psql -U postgres -q -v ON_ERROR_STOP=1`], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
if (wynik.status !== 0) process.exit(wynik.status ?? 1);
console.log(`Wgrano ${tylko ? lista.filter((w) => w.id.startsWith(tylko)).length : lista.length} arkuszy do ${kontener}.`);
