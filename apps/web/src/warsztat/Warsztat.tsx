// Warsztat pod zadaniem z informatyki: to, co na egzaminie robi się na komputerze.
// Python (program), SQL (baza danych jak w Accessie), podgląd danych (jak w arkuszu
// kalkulacyjnym) i pliki z zipa CKE do pobrania, gdy uczeń woli własny Excel czy Access.
import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import type { Warsztat as Zapis } from "../arkusze/postep";
import type { Zadanie } from "../arkusze/typy";
import { czyTabelaryczny } from "./tabele";
import { Dane, NAZWY, Pliki, poczatekPythona, poczatekSql, Python, Skoroszyt, Sql, type Klucz, type Tryb } from "./Narzedzia";
import styles from "./Warsztat.module.css";

type Props = {
  zadanie: Zadanie;
  pliki: Record<string, string>; // wszystkie pliki arkusza
  zip?: string;
  zapis?: Zapis;
  onZapis: (z: Zapis) => void;
  // Pytania, do których można wstawić wynik (otwarte, jeszcze niesprawdzone).
  doWstawienia: string[];
  onWstaw: (nr: string, tekst: string) => void;
};

export function Warsztat({ zadanie, pliki: wszystkie, zip, zapis, onZapis, doWstawienia, onWstaw }: Props) {
  const pliki = useMemo(() => Object.fromEntries((zadanie.pliki ?? []).map((n) => [n, wszystkie[n]] as const)), [zadanie.pliki, wszystkie]);
  const nazwy = Object.keys(pliki);
  const tabelaryczne = nazwy.filter((n) => czyTabelaryczny(pliki[n]));
  const plikiTabel = useMemo(() => Object.fromEntries(Object.entries(pliki).filter(([, t]) => czyTabelaryczny(t))), [pliki]);
  const tryby: Tryb[] = ["python", ...(tabelaryczne.length ? (["sql", "arkusz"] as const) : []), ...(nazwy.length ? (["dane"] as const) : [])];
  // Zadanie z plikami z tabulatorami bez programu i SQL w treści to zadanie z arkusza kalkulacyjnego.
  const domyslny: Tryb = zadanie.program ? "python" : zadanie.sql && tabelaryczne.length ? "sql" : tabelaryczne.length ? "arkusz" : "python";
  const tryb = zapis?.tryb && tryby.includes(zapis.tryb) ? zapis.tryb : domyslny;
  // Bez plików i bez programu w treści (np. zadanie z rekurencją do prześledzenia) warsztat jest zwinięty.
  const [otwarty, setOtwarty] = useState(() => !!zapis || nazwy.length > 0 || !!zadanie.program);
  const zmien = (z: Partial<Zapis>) => onZapis({ ...zapis, tryb, ...z });
  const klucz: Klucz = zadanie.pytania.flatMap((p) => (p.typ === "otwarte" && p.wynik && p.oczekiwane?.length ? [{ nr: p.nr, oczekiwane: p.oczekiwane }] : []));

  if (!otwarty)
    return (
      <section className={styles.warsztat}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOtwarty(true)}>
          <Play size={15} aria-hidden="true" /> Sprawdź coś w Pythonie
        </button>
      </section>
    );

  return (
    <section className={styles.warsztat} aria-label={`Warsztat do zadania ${zadanie.nr}`}>
      <header className={styles.glowa}>
        <h3 className="h3">Na komputerze</h3>
        {tryby.length > 1 && (
          <div className={styles.karty} role="tablist" aria-label="Narzędzie">
            {tryby.map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tryb === t} className={styles.karta} onClick={() => zmien({ tryb: t })}>
                {NAZWY[t]}
              </button>
            ))}
          </div>
        )}
      </header>

      {nazwy.length > 0 && <Pliki pliki={pliki} zip={zip} />}

      {tryb === "python" && <Python pliki={pliki} kod={zapis?.python ?? poczatekPythona(nazwy)} onKod={(python) => zmien({ python })} doWstawienia={doWstawienia} onWstaw={onWstaw} klucz={klucz} />}
      {tryb === "sql" && <Sql pliki={pliki} kod={zapis?.sql ?? poczatekSql(tabelaryczne)} onKod={(sql) => zmien({ sql })} doWstawienia={doWstawienia} onWstaw={onWstaw} klucz={klucz} />}
      {tryb === "arkusz" && (
        <Skoroszyt
          pliki={plikiTabel}
          operacje={zapis?.arkusz}
          onOperacje={(arkusz) => zmien({ arkusz })}
          doWstawienia={doWstawienia}
          onWstaw={onWstaw}
          klucz={klucz}
        />
      )}
      {tryb === "dane" && <Dane pliki={pliki} />}
    </section>
  );
}
