// Zrzut tekstu PDF do pliku .txt obok (podgląd przy pisaniu parsera).
// Segmenty linii rozdziela " | ", przed linią jest x pierwszego segmentu.
import { writeFile } from "node:fs/promises";
import { tekstPdf } from "./tekst.js";

for (const plik of process.argv.slice(2)) {
  const strony = await tekstPdf(plik);
  const tekst = strony
    .map((s, i) => `=== strona ${i + 1}\n` + s.map((l) => `${String(Math.round(l.y)).padStart(3)} ` + l.seg.map((g) => `@${Math.round(g.x)} ${g.s}`).join(" | ")).join("\n"))
    .join("\n");
  await writeFile(plik.replace(/\.pdf$/, ".pdfjs.txt"), tekst);
}
