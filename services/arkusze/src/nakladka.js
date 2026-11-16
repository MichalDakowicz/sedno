// Nakładka dla aplikacji: same liczby z data/arkusze, bez treści CKE. Numery stron PDF przy
// zadaniach i blokach oraz czasy fragmentów nagrań (od–do) trafiają do
// apps/web/src/arkusze/nakladka.json, a aplikacja nakłada je na arkusz pobrany z bazy.
// Dzięki temu strony i „Posłuchaj fragmentu” działają, zanim arkusze zostaną wgrane ponownie.
// Teksty fragmentów (transkrypcje nagrań CKE) zostają poza repozytorium.
// Użycie: npm run nakladka (po importuj albo dopasuj.py)
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { KATALOG_ARKUSZY, KORZEN } from "./sciezki.js";

// Typ bloku jedną literą: po tym aplikacja sprawdza, że bloki w bazie są te same co tutaj.
export const LITERA = { akapit: "a", naglowek: "n", zrodlo: "z", wzor: "w", rysunek: "r", tabelaTresci: "t", kadr: "k", opcje: "o", pytanie: "p", pytania: "P", tabela: "T", kod: "c" };

const wynik = {};
for (const plik of (await readdir(KATALOG_ARKUSZY)).sort()) {
  if (!plik.endsWith(".json") || plik === "index.json") continue;
  const a = JSON.parse(await readFile(join(KATALOG_ARKUSZY, plik), "utf8"));
  const zadania = {};
  const fragmenty = {};
  for (const z of a.zadania) {
    if (z.strona) zadania[z.nr] = [z.strona, z.bloki.map((b) => b.strona ?? 0), z.bloki.map((b) => LITERA[b.typ] ?? "?").join("")];
    for (const p of z.pytania) if (p.fragment) fragmenty[p.nr] = [p.fragment.od, p.fragment.do];
  }
  wynik[a.id] = { z: zadania, ...(Object.keys(fragmenty).length ? { f: fragmenty } : {}) };
}
const cel = join(KORZEN, "apps", "web", "src", "arkusze", "nakladka.json");
await writeFile(cel, JSON.stringify(wynik));
const zFragmentami = Object.values(wynik).filter((x) => x.f).length;
console.log(`Nakładka: ${Object.keys(wynik).length} arkuszy, ${zFragmentami} z fragmentami nagrań → ${cel}`);
