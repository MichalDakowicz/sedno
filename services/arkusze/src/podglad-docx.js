// Podgląd parsera DOCX (matematyka): bloki fragmentów i kontrola wzorów przez KaTeX.
// Użycie: node src/podglad-docx.js <plik.docx> [numery,zadań]
import katex from "katex";
import { czytajDocx, fragmentyDocx } from "./docx.js";
const fr = fragmentyDocx(await czytajDocx(process.argv[2]));
const tylko = process.argv[3];
let bledy = 0, wzorow = 0;
const sprawdz = (tex, gdzie) => {
  wzorow++;
  try { katex.renderToString(tex, { throwOnError: true, strict: "ignore" }); } catch (e) { bledy++; console.log(`  !! ${gdzie}: ${e.message.slice(0, 120)}\n     ${tex}`); }
};
for (const f of fr) {
  for (const b of f.bloki) {
    const teksty = b.typ === "wzor" ? [`\\(${b.tex}\\)`] : b.typ === "tabelaTresci" ? b.wiersze.flat() : [b.tekst ?? b.tresc ?? ""];
    for (const t of teksty) for (const m of t.matchAll(/\\\((.*?)\\\)/g)) sprawdz(m[1], f.nr);
  }
  if (tylko && !tylko.split(",").includes(f.nr)) continue;
  console.log(`\n## ${f.nr} (${f.punkty} pkt)${f.obiekty ? " OLE:" + f.obiekty : ""}`);
  for (const b of f.bloki) console.log("  ", b.typ, b.typ === "wzor" ? b.tex : b.typ === "opcja" ? `${b.litera}: ${b.tresc}` : b.typ === "tabelaTresci" ? JSON.stringify(b.wiersze) : (b.tekst ?? ""));
}
console.log(`\n${fr.length} fragmentów, ${wzorow} wzorów, ${bledy} błędów KaTeX`);
