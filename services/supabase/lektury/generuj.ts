// Zamienia lektury/*.json na idempotentną migrację SQL (tabela private.lektury_elementy).
// Użycie: deno run -A services/supabase/lektury/generuj.ts [numer] [--nadpisz]
// Bez numeru: 0036. Migracja już wdrożona zostaje nietknięta: nowa treść dostaje kolejny numer,
// a --nadpisz pozwala przegenerować plik, który jeszcze nie trafił na serwer.
import { migracjaElementow, sprawdzPlikLektury, wczytajPlikiLektur, type PlikLektury } from "./format.ts";

const MIGRACJE = new URL("../migrations/", import.meta.url);
const ZNACZNIK_PLIKU = "-- Wygenerowano z services/supabase/lektury/*.json";

export async function wygenerowane(): Promise<string> {
  const pliki = await wczytajPlikiLektur();
  const bledy = pliki.flatMap(({ nazwa, dane }) => sprawdzPlikLektury(dane, nazwa));
  if (bledy.length) throw new Error(`Pliki lektur zawierają błędy:\n${bledy.join("\n")}`);
  return migracjaElementow(pliki.map((p) => p.dane as PlikLektury));
}

/** Nazwa najnowszej wygenerowanej migracji w repozytorium albo undefined. */
export async function ostatniaWygenerowana(): Promise<{ nazwa: string; tresc: string } | undefined> {
  const nazwy: string[] = [];
  for await (const w of Deno.readDir(MIGRACJE)) if (w.isFile && w.name.endsWith(".sql")) nazwy.push(w.name);
  for (const nazwa of nazwy.sort().reverse()) {
    const tresc = (await Deno.readTextFile(new URL(nazwa, MIGRACJE))).replaceAll("\r\n", "\n");
    if (tresc.startsWith(ZNACZNIK_PLIKU)) return { nazwa, tresc };
  }
}

if (import.meta.main) {
  const nadpisz = Deno.args.includes("--nadpisz");
  const numer = Deno.args.find((a) => /^\d{4}$/.test(a)) ?? "0036";
  const tresc = await wygenerowane();
  const nazwa = `${numer}_lektury_elementy.sql`;
  const cel = new URL(nazwa, MIGRACJE);
  const istnieje = await Deno.stat(cel).then(() => true, () => false);
  if (istnieje && !nadpisz) {
    if (await Deno.readTextFile(cel) === tresc) console.log(`${nazwa} jest aktualna.`);
    else throw new Error(`${nazwa} już istnieje i różni się od wyniku. Podaj nowy numer migracji albo użyj --nadpisz (tylko gdy plik nie trafił jeszcze na serwer).`);
  } else {
    await Deno.writeTextFile(cel, tresc);
    console.log(`Zapisano ${nazwa}.`);
  }
}
