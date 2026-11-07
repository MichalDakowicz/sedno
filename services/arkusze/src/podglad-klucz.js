// Podgląd wyniku parsera klucza w konsoli.
import { tekstPdf } from "./tekst.js";
import { parsujKlucz } from "./klucz.js";
import { porownajNr } from "./arkusz.js";

const klucz = parsujKlucz(await tekstPdf(process.argv[2]));
for (const q of Object.values(klucz).sort((a, b) => porownajNr(a.nr, b.nr))) {
  if (q.litera) console.log(`${q.nr}: ${q.litera}`);
  else console.log(`${q.nr}: OCZ=${JSON.stringify(q.oczekiwane?.slice(0, 4))} AKC(${q.akceptowane?.length ?? 0})=${JSON.stringify(q.akceptowane?.slice(0, 5))} ODR(${q.odrzucone?.length ?? 0})=${JSON.stringify(q.odrzucone?.slice(0, 3))}${q.opis ? "\n     OPIS: " + q.opis.slice(0, 120) : ""}`);
}
