// Podgląd wyniku parsera arkusza w konsoli.
import { tekstPdf } from "./tekst.js";
import { parsujArkusz } from "./arkusz.js";

const zadania = parsujArkusz(await tekstPdf(process.argv[2]));
const tylko = process.argv[3] ? Number(process.argv[3]) : null;
for (const z of zadania) {
  if (tylko && z.nr !== tylko) continue;
  console.log(`\n## Zadanie ${z.nr} (${z.punkty} pkt)${z.sluchanie ? " [słuchanie]" : ""}`);
  console.log("POLECENIE:", z.polecenie.join(" / "));
  for (const b of z.bloki) {
    if (b.typ === "opcje") console.log(`  [opcje] ${b.opcje.map((o) => o.litera + ". " + o.tresc.slice(0, 50)).join(" | ")}`);
    else if (b.nr) console.log(`  [${b.typ}] ${[].concat(b.nr).join(", ")}`);
    else console.log(`  [${b.typ}] ${b.tekst.slice(0, 110)}`);
  }
  for (const q of z.pytania) console.log(`  > ${q.nr}${q.typ ? " " + q.typ : ""}: ${(q.tresc || "").slice(0, 90)}${q.opcje ? "  {" + q.opcje.map((o) => o.litera + ":" + o.tresc.slice(0, 25)).join("; ") + "}" : ""}${q.poczatek ? " START: " + q.poczatek : ""}`);
}
