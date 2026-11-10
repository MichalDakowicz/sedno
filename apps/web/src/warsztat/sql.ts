// Baza SQLite w przeglądarce (sql.js) z tabelami z plików danych zadania. Odpowiada bazie,
// którą uczeń na egzaminie importuje do Accessa albo MySQL; zapytania pisze w SQL.
import initSqlJs, { type Database } from "sql.js";
import wasm from "sql.js/dist/sql-wasm.wasm?url";
import { czyTabelaryczny, liczba, tabela, type Tabela } from "./tabele";

let silnik: ReturnType<typeof initSqlJs> | null = null;

export type WynikSql = { kolumny: string[]; wiersze: (string | number | null)[][] } | { blad: string } | { zmiany: number };

export type BazaZadania = { tabele: Tabela[]; zapytaj: (sql: string) => WynikSql[] };

export async function bazaZadania(pliki: Record<string, string>): Promise<BazaZadania> {
  silnik ??= initSqlJs({ locateFile: () => wasm });
  const SQL = await silnik;
  const db = new SQL.Database();
  funkcjeAccessa(db);
  const tabele = Object.entries(pliki)
    .filter(([, tresc]) => czyTabelaryczny(tresc))
    .map(([plik, tresc]) => tabela(plik, tresc));
  for (const t of tabele) {
    // Kolumna z „27,8” to real, inaczej SQLite zapisze „6,0” jako 6 i podzieli całkowicie (27 * 6 / 100 = 1),
    // a w Accessie to „Liczba podwójna” i dzielenie zwykłe.
    db.run(`create table "${t.nazwa}" (${t.kolumny.map((k, i) => `"${k}" ${t.ulamkowe[i] ? "real" : t.liczbowe[i] ? "integer" : "text"}`).join(", ")})`);
    const wstaw = db.prepare(`insert into "${t.nazwa}" values (${t.kolumny.map(() => "?").join(", ")})`);
    db.run("begin");
    for (const w of t.wiersze) wstaw.run(t.kolumny.map((_, i) => (w[i] === undefined || w[i] === "" ? null : t.liczbowe[i] ? liczba(w[i]) : w[i])));
    db.run("commit");
    wstaw.free();
  }
  return {
    tabele,
    zapytaj: (sql) => {
      try {
        const wyniki = db.exec(sql);
        if (wyniki.length) return wyniki.map((w) => ({ kolumny: w.columns, wiersze: w.values as (string | number | null)[][] }));
        return [{ zmiany: db.getRowsModified() }];
      } catch (e) {
        return [{ blad: e instanceof Error ? e.message : String(e) }];
      }
    },
  };
}

// Funkcje z Accessa i MySQL, których SQLite nie ma, a które pojawiają się w rozwiązaniach CKE.
// Daty w plikach są w formacie rrrr-mm-dd.
function funkcjeAccessa(db: Database) {
  const czesc = (od: number, ile: number) => (d: unknown) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d) ? Number(d.slice(od, od + ile)) : null);
  for (const nazwa of ["year", "rok"]) db.create_function(nazwa, czesc(0, 4));
  for (const nazwa of ["month", "miesiac"]) db.create_function(nazwa, czesc(5, 2));
  for (const nazwa of ["day", "dzien"]) db.create_function(nazwa, czesc(8, 2));
  db.create_function("left", (s: unknown, n: unknown) => (s == null ? null : String(s).slice(0, Number(n))));
  db.create_function("right", (s: unknown, n: unknown) => (s == null ? null : String(s).slice(-Number(n))));
  db.create_function("mid", (s: unknown, od: unknown, n: unknown) => (s == null ? null : String(s).substr(Number(od) - 1, n == null ? undefined : Number(n))));
  db.create_function("len", (s: unknown) => (s == null ? null : String(s).length));
}
