// Warsztat pod zadaniem z informatyki: to, co na egzaminie robi się na komputerze.
// Python (program), SQL (baza danych jak w Accessie), podgląd danych (jak w arkuszu
// kalkulacyjnym) i pliki z zipa CKE do pobrania, gdy uczeń woli własny Excel czy Access.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Download, ExternalLink, Play, Square } from "lucide-react";
import type { Warsztat as Zapis } from "../arkusze/postep";
import type { Zadanie } from "../arkusze/typy";
import { pythonGotowy, uruchom, zatrzymaj, type Zdarzenie } from "./python";
import type { BazaZadania, WynikSql } from "./sql";
import { czyTabelaryczny, tabela, type Tabela } from "./tabele";
import styles from "./Warsztat.module.css";

const EdytorKodu = lazy(() => import("./EdytorKodu"));

type Tryb = NonNullable<Zapis["tryb"]>;
const NAZWY: Record<Tryb, string> = { python: "Python", sql: "SQL", dane: "Dane" };

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
  const tryby: Tryb[] = ["python", ...(tabelaryczne.length ? (["sql"] as const) : []), ...(nazwy.length ? (["dane"] as const) : [])];
  const domyslny: Tryb = zadanie.program ? "python" : zadanie.sql && tabelaryczne.length ? "sql" : tabelaryczne.length ? "dane" : "python";
  const tryb = zapis?.tryb && tryby.includes(zapis.tryb) ? zapis.tryb : domyslny;
  // Bez plików i bez programu w treści (np. zadanie z rekurencją do prześledzenia) warsztat jest zwinięty.
  const [otwarty, setOtwarty] = useState(() => !!zapis || nazwy.length > 0 || !!zadanie.program);
  const zmien = (z: Partial<Zapis>) => onZapis({ ...zapis, tryb, ...z });

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

      {tryb === "python" && <Python pliki={pliki} kod={zapis?.python ?? poczatekPythona(nazwy)} onKod={(python) => zmien({ python })} doWstawienia={doWstawienia} onWstaw={onWstaw} />}
      {tryb === "sql" && <Sql pliki={pliki} kod={zapis?.sql ?? poczatekSql(tabelaryczne)} onKod={(sql) => zmien({ sql })} doWstawienia={doWstawienia} onWstaw={onWstaw} />}
      {tryb === "dane" && <Dane pliki={pliki} />}
    </section>
  );
}

function poczatekPythona(nazwy: string[]) {
  if (!nazwy.length) return "# Sprawdź tu swój algorytm na przykładach z treści zadania.\n\n";
  const przyklad = nazwy.find((n) => n.includes("przyklad")) ?? nazwy[0];
  return [
    `# Pliki z danymi leżą obok programu: ${nazwy.join(", ")}`,
    przyklad.includes("przyklad") ? "# Najpierw sprawdź program na pliku przykładowym, potem zmień nazwę pliku." : null,
    `with open("${przyklad}") as plik:`,
    "    wiersze = [w.strip() for w in plik]",
    "",
    "print(len(wiersze))",
    "",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

function poczatekSql(tabelaryczne: string[]) {
  const nazwy = tabelaryczne.map((n) => n.replace(/\.txt$/i, ""));
  return `-- Tabele: ${nazwy.join(", ")}\nSELECT *\nFROM ${nazwy[0]}\nLIMIT 10;\n`;
}

function pobierz(nazwa: string, tresc: string) {
  const url = URL.createObjectURL(new Blob([tresc], { type: "text/plain;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nazwa });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Pliki({ pliki, zip }: { pliki: Record<string, string>; zip?: string }) {
  return (
    <div className={styles.pliki}>
      <span className="small muted">Pliki danych</span>
      {Object.entries(pliki).map(([nazwa, tresc]) => (
        <button key={nazwa} type="button" className={styles.plik} onClick={() => pobierz(nazwa, tresc)} title={`Pobierz ${nazwa}`}>
          <Download size={14} aria-hidden="true" /> {nazwa}
        </button>
      ))}
      {zip && (
        <a className={`small link ${styles.zip}`} href={zip} target="_blank" rel="noreferrer">
          Wszystkie pliki z CKE (zip) <ExternalLink size={13} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function Wstaw({ tekst, doWstawienia, onWstaw }: { tekst: string; doWstawienia: string[]; onWstaw: (nr: string, tekst: string) => void }) {
  const [wstawione, setWstawione] = useState<string | null>(null);
  if (!tekst.trim() || !doWstawienia.length) return null;
  return (
    <div className={styles.wstaw}>
      <span className="small muted">{wstawione ? `Wstawione do ${wstawione}` : "Wstaw wynik do odpowiedzi"}</span>
      {doWstawienia.map((nr) => (
        <button
          key={nr}
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            onWstaw(nr, tekst.trim());
            setWstawione(nr);
          }}
        >
          {nr}
        </button>
      ))}
    </div>
  );
}

type Przebieg = { stan: "ladowanie" | "dziala" | "koniec"; wyjscie: { tekst: string; blad: boolean }[]; ms?: number; utworzone: Record<string, string> };

function Python({ pliki, kod, onKod, doWstawienia, onWstaw }: { pliki: Record<string, string>; kod: string; onKod: (k: string) => void; doWstawienia: string[]; onWstaw: (nr: string, tekst: string) => void }) {
  const [przebieg, setPrzebieg] = useState<Przebieg | null>(null);
  const kodRef = useRef(kod);
  kodRef.current = kod;
  const [sekundy, setSekundy] = useState(0);
  const dziala = przebieg?.stan === "ladowanie" || przebieg?.stan === "dziala";

  useEffect(() => {
    if (!dziala) return;
    const start = Date.now();
    const t = setInterval(() => setSekundy(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(t);
  }, [dziala]);
  // Wątek należy do strony; wyjście z arkusza go kończy.
  useEffect(() => () => zatrzymaj(), []);

  const start = () => {
    if (dziala) return;
    setSekundy(0);
    setPrzebieg({ stan: pythonGotowy() ? "dziala" : "ladowanie", wyjscie: [], utworzone: {} });
    uruchom(kodRef.current, pliki, (z: Zdarzenie) =>
      setPrzebieg((p) => {
        if (!p) return p;
        if (z.typ === "gotowy") return { ...p, stan: "dziala" };
        if (z.typ === "koniec") return { ...p, stan: "koniec", ms: z.ms, utworzone: z.utworzone };
        // Duże wyjście (np. wypisany cały plik) przycinamy, żeby strona nie zwolniła.
        const wyjscie = [...p.wyjscie, { tekst: z.tekst, blad: z.typ === "blad" }];
        return { ...p, wyjscie: wyjscie.length > 2000 ? wyjscie.slice(-2000) : wyjscie };
      }),
    );
  };
  const stop = () => {
    zatrzymaj();
    setPrzebieg((p) => p && { ...p, stan: "koniec", wyjscie: [...p.wyjscie, { tekst: "Zatrzymano.\n", blad: true }] });
  };

  const stdout = przebieg?.wyjscie.filter((w) => !w.blad).map((w) => w.tekst).join("") ?? "";
  return (
    <div className={styles.narzedzie}>
      <Suspense fallback={<div className={styles.edytor} aria-busy="true" />}>
        <EdytorKodu wartosc={kod} jezyk="python" onZmiana={onKod} onUruchom={start} etykieta="Kod w Pythonie" />
      </Suspense>
      <div className={styles.akcje}>
        {dziala ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={stop}>
            <Square size={14} aria-hidden="true" /> Zatrzymaj
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={start}>
            <Play size={15} aria-hidden="true" /> Uruchom
          </button>
        )}
        <span className="small muted" aria-live="polite">
          {przebieg?.stan === "ladowanie" && `Ładuję Pythona, za pierwszym razem trwa to kilka sekund… ${sekundy} s`}
          {przebieg?.stan === "dziala" && `Działa… ${sekundy} s`}
          {przebieg?.stan === "koniec" && przebieg.ms !== undefined && `Gotowe w ${(przebieg.ms / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} s`}
          {!przebieg && "Ctrl+Enter uruchamia program"}
        </span>
      </div>
      {przebieg && (przebieg.wyjscie.length > 0 || przebieg.stan === "koniec") && (
        <pre className={styles.wyjscie} aria-label="Wynik programu">
          {przebieg.wyjscie.length ? przebieg.wyjscie.map((w, i) => (w.blad ? <span key={i} className={styles.blad}>{w.tekst}</span> : w.tekst)) : <span className="muted">(program nic nie wypisał)</span>}
        </pre>
      )}
      {Object.entries(przebieg?.utworzone ?? {}).map(([nazwa, tresc]) => (
        <details key={nazwa} className={styles.utworzony} open>
          <summary className="small">
            Plik {nazwa}{" "}
            <button type="button" className="link small" onClick={() => pobierz(nazwa, tresc)}>
              pobierz
            </button>
          </summary>
          <pre className={styles.wyjscie}>{tresc}</pre>
          <Wstaw tekst={tresc} doWstawienia={doWstawienia} onWstaw={onWstaw} />
        </details>
      ))}
      {przebieg?.stan === "koniec" && <Wstaw tekst={stdout} doWstawienia={doWstawienia} onWstaw={onWstaw} />}
    </div>
  );
}

function Sql({ pliki, kod, onKod, doWstawienia, onWstaw }: { pliki: Record<string, string>; kod: string; onKod: (k: string) => void; doWstawienia: string[]; onWstaw: (nr: string, tekst: string) => void }) {
  const [baza, setBaza] = useState<BazaZadania | null>(null);
  const [blad, setBlad] = useState<string | null>(null);
  const [wyniki, setWyniki] = useState<WynikSql[] | null>(null);
  const kodRef = useRef(kod);
  kodRef.current = kod;

  useEffect(() => {
    let aktualne = true;
    import("./sql")
      .then(({ bazaZadania }) => bazaZadania(pliki))
      .then((b) => aktualne && setBaza(b))
      .catch((e) => aktualne && setBlad(e instanceof Error ? e.message : String(e)));
    return () => {
      aktualne = false;
    };
  }, [pliki]);

  const schemat = useMemo(() => (baza ? Object.fromEntries(baza.tabele.map((t) => [t.nazwa, t.kolumny])) : undefined), [baza]);
  const start = () => baza && setWyniki(baza.zapytaj(kodRef.current));
  const ostatni = wyniki?.at(-1);
  const tekstWyniku = ostatni && "wiersze" in ostatni ? ostatni.wiersze.map((w) => w.map((k) => k ?? "").join(" ")).join("\n") : "";

  return (
    <div className={styles.narzedzie}>
      {baza && (
        <dl className={styles.schemat}>
          {baza.tabele.map((t) => (
            <div key={t.nazwa}>
              <dt>{t.nazwa}</dt>
              <dd>{t.kolumny.join(", ")}</dd>
            </div>
          ))}
        </dl>
      )}
      <Suspense fallback={<div className={styles.edytor} aria-busy="true" />}>
        <EdytorKodu wartosc={kod} jezyk="sql" schemat={schemat} onZmiana={onKod} onUruchom={start} etykieta="Zapytanie SQL" />
      </Suspense>
      <div className={styles.akcje}>
        <button type="button" className="btn btn-primary btn-sm" onClick={start} disabled={!baza}>
          <Play size={15} aria-hidden="true" /> Wykonaj
        </button>
        <span className="small muted">{blad ? `Nie udało się przygotować bazy: ${blad}` : !baza ? "Przygotowuję tabele z plików…" : "SQLite; działają też YEAR(), MONTH(), DAY() jak w Accessie i MySQL"}</span>
      </div>
      {wyniki?.map((w, i) =>
        "blad" in w ? (
          <pre key={i} className={`${styles.wyjscie} ${styles.blad}`}>
            {w.blad}
          </pre>
        ) : "zmiany" in w ? (
          <p key={i} className="small muted">
            Zapytanie wykonane, zmienione wiersze: {w.zmiany}
          </p>
        ) : (
          <WynikTabela key={i} kolumny={w.kolumny} wiersze={w.wiersze} />
        ),
      )}
      <Wstaw tekst={tekstWyniku} doWstawienia={doWstawienia} onWstaw={onWstaw} />
    </div>
  );
}

const POKAZ = 200;

function WynikTabela({ kolumny, wiersze, liczbowe }: { kolumny: string[]; wiersze: (string | number | null)[][]; liczbowe?: boolean[] }) {
  return (
    <div className={styles.tabelaWrap}>
      <table className={styles.tabela}>
        <thead>
          <tr>
            {kolumny.map((k, i) => (
              <th key={i} scope="col">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {wiersze.slice(0, POKAZ).map((w, i) => (
            <tr key={i}>
              {w.map((k, j) => (
                <td key={j} data-liczba={(liczbowe ? liczbowe[j] : typeof k === "number") || undefined}>
                  {k === null ? <span className="muted">—</span> : String(k)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted">{wiersze.length > POKAZ ? `Pierwsze ${POKAZ} z ${wiersze.length} wierszy` : `Wierszy: ${wiersze.length}`}</p>
    </div>
  );
}

function Dane({ pliki }: { pliki: Record<string, string> }) {
  const nazwy = Object.keys(pliki);
  const [wybrany, setWybrany] = useState(nazwy[0]);
  const [sort, setSort] = useState<{ kol: number; rosnaco: boolean } | null>(null);
  const t: Tabela = useMemo(() => tabela(wybrany, pliki[wybrany] ?? ""), [wybrany, pliki]);
  const wiersze = useMemo(() => {
    if (!sort) return t.wiersze;
    const { kol, rosnaco } = sort;
    const liczbowa = t.liczbowe[kol];
    return [...t.wiersze].sort((a, b) => {
      const r = liczbowa ? Number((a[kol] ?? "").replace(",", ".")) - Number((b[kol] ?? "").replace(",", ".")) : (a[kol] ?? "").localeCompare(b[kol] ?? "", "pl");
      return rosnaco ? r : -r;
    });
  }, [t, sort]);

  return (
    <div className={styles.narzedzie}>
      {nazwy.length > 1 && (
        <div className={styles.karty} role="tablist" aria-label="Plik">
          {nazwy.map((n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={wybrany === n}
              className={styles.karta}
              onClick={() => {
                setWybrany(n);
                setSort(null);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      <div className={styles.tabelaWrap}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              {t.naglowek.map((k, i) => (
                <th key={i} scope="col" aria-sort={sort?.kol === i ? (sort.rosnaco ? "ascending" : "descending") : undefined}>
                  <button type="button" onClick={() => setSort((s) => ({ kol: i, rosnaco: s?.kol === i ? !s.rosnaco : true }))}>
                    {k}
                    {sort?.kol === i ? (sort.rosnaco ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wiersze.slice(0, POKAZ).map((w, i) => (
              <tr key={i}>
                {t.naglowek.map((_, j) => (
                  <td key={j} data-liczba={t.liczbowe[j] || undefined}>
                    {w[j] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">{wiersze.length > POKAZ ? `Pierwsze ${POKAZ} z ${wiersze.length} wierszy. Kliknij nagłówek, żeby posortować.` : `Wierszy: ${wiersze.length}. Kliknij nagłówek, żeby posortować.`}</p>
      </div>
      {czyTabelaryczny(pliki[wybrany] ?? "") && (
        <p className="small muted">
          W Excelu: Dane → Z pliku tekstowego/CSV, separator tabulator. W Accessie: Dane zewnętrzne → Plik tekstowy, z rozdzielaczami (tabulator){t.naglowek !== t.kolumny ? ", pierwszy wiersz zawiera nazwy pól" : ""}.
        </p>
      )}
    </div>
  );
}
