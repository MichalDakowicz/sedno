// Narzędzia warsztatu informatyki, osadzane w panelu przy zadaniu: pliki do pobrania, Python,
// SQL, skoroszyt i podgląd danych.
import { lazy, Suspense, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, ExternalLink, Minus, Play, Square } from "lucide-react";
import { pythonGotowy, uruchom, zatrzymaj, type Zdarzenie } from "./python";
import type { BazaZadania, WynikSql } from "./sql";
import { czyTabelaryczny, tabela, type Tabela } from "./tabele";
import { zgodneZKluczem } from "./klucz";
import { Widoczny } from "./Widoczny";
import { CeleWstawiania, zaznaczenia } from "./materialy";
import { Przenoszenie, wariantyDla, type Wariant } from "./Przenoszenie";
import type { Warsztat as Zapis } from "../arkusze/postep";
import styles from "./Warsztat.module.css";

const EdytorKodu = lazy(() => import("./EdytorKodu"));

// Wyniki podpunktów z klucza CKE, z którymi porównujemy wyjście programu albo zapytania.
export type Klucz = { nr: string; oczekiwane: string[] }[];

export type Tryb = NonNullable<Zapis["tryb"]>;
export const NAZWY: Record<Tryb, string> = { python: "Python", sql: "SQL", arkusz: "Arkusz (Excel)", dane: "Dane" };

export function poczatekPythona(nazwy: string[]) {
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

export function poczatekSql(tabelaryczne: string[]) {
  const nazwy = tabelaryczne.map((n) => n.replace(/\.txt$/i, ""));
  return `-- Tabele: ${nazwy.join(", ")}\nSELECT *\nFROM ${nazwy[0]}\nLIMIT 10;\n`;
}

export function pobierz(nazwa: string, tresc: string) {
  const url = URL.createObjectURL(new Blob([tresc], { type: "text/plain;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nazwa });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Pliki({ pliki, zip }: { pliki: Record<string, string>; zip?: string }) {
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

// Przeniesienie do odpowiedzi jest opcjonalne i świadome: wybór podpunktu, podgląd, ochrona istniejącej treści.
// Do podpunktu z zapytaniem albo algorytmem idzie kod z edytora (zaznaczony albo cały), nie wynik.
export type KodDoWstawienia = { tekst: string; jezyk: "python" | "sql"; zaznaczony: boolean };

export function Wstaw({ tekst, kod, doWstawienia, onWstaw }: { tekst: string; kod?: KodDoWstawienia; doWstawienia: string[]; onWstaw: (nr: string, tekst: string) => void }) {
  const [otwarte, setOtwarte] = useState(false);
  const [wstawione, setWstawione] = useState<string | null>(null);
  const celeKontekstu = useContext(CeleWstawiania);
  const warianty: Wariant[] = [
    ...(tekst.trim() ? [{ id: "wynik", etykieta: "Wynik", tekst: tekst.trim(), rodzaj: "wynik" as const }] : []),
    ...(kod?.tekst.trim() ? [{ id: "kod", etykieta: kod.zaznaczony ? "Zaznaczony kod" : "Kod z edytora", tekst: kod.tekst.replace(/\s+$/, ""), rodzaj: "kod" as const, jezyk: kod.jezyk }] : []),
  ];
  const cele = doWstawienia
    .map((nr) => celeKontekstu?.find((c) => c.nr === nr) ?? { nr, rodzaj: "inne" as const, odpowiedz: "" })
    .filter((c) => wariantyDla(c, warianty).length > 0);
  if (!cele.length) return null;
  if (!otwarte)
    return (
      <div className={styles.wstaw}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOtwarte(true)}>
          Przenieś do odpowiedzi…
        </button>
        {wstawione && <span className="small muted">Wstawione do {wstawione}</span>}
      </div>
    );
  return (
    <Przenoszenie
      cele={cele}
      warianty={warianty}
      onWstaw={(nr, t) => {
        onWstaw(nr, t);
        setWstawione(nr);
      }}
      onZamknij={() => setOtwarte(false)}
    />
  );
}

export type Przebieg = { stan: "ladowanie" | "dziala" | "koniec"; wyjscie: { tekst: string; blad: boolean }[]; ms?: number; utworzone: Record<string, string> };

// Przebieg i wyniki trzyma rodzic, żeby po schowaniu panelu i zmianie zadania były na miejscu.
export type Ustaw<T> = (u: T | ((p: T) => T)) => void;

export function Python({ pliki, kod, onKod, doWstawienia, onWstaw, klucz, przebieg, setPrzebieg }: { pliki: Record<string, string>; kod: string; onKod: (k: string) => void; doWstawienia: string[]; onWstaw: (nr: string, tekst: string) => void; klucz: Klucz; przebieg: Przebieg | null; setPrzebieg: Ustaw<Przebieg | null> }) {
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
  // Jeden wątek na stronę: przejście do innego zadania albo wyjście z arkusza kończy działający program.
  const dzialaRef = useRef(dziala);
  dzialaRef.current = dziala;
  useEffect(
    () => () => {
      zatrzymaj();
      if (dzialaRef.current) setPrzebieg((p) => p && { ...p, stan: "koniec", wyjscie: [...p.wyjscie, { tekst: "Zatrzymano.\n", blad: true }] });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Ctrl+Enter podaje kod prosto z edytora (zapis do postępu idzie z opóźnieniem).
  const start = (zEdytora?: unknown) => {
    if (dziala) return;
    setSekundy(0);
    setPrzebieg({ stan: pythonGotowy() ? "dziala" : "ladowanie", wyjscie: [], utworzone: {} });
    uruchom(typeof zEdytora === "string" ? zEdytora : kodRef.current, pliki, (z: Zdarzenie) =>
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
  const [zaznaczony, setZaznaczony] = useState("");
  const naZaznaczenie = (t: string) => {
    zaznaczenia.python = t;
    setZaznaczony(t);
  };
  useEffect(() => () => void (zaznaczenia.python = ""), []);
  return (
    <div className={styles.narzedzie}>
      <Widoczny wysokosc={342}>
      <Suspense fallback={<div className={styles.edytor} aria-busy="true" />}>
        <EdytorKodu wartosc={kod} jezyk="python" pliki={pliki} onZmiana={onKod} onUruchom={start} onZaznaczenie={naZaznaczenie} etykieta="Kod w Pythonie" />
      </Suspense>
      </Widoczny>
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
      {przebieg?.stan === "koniec" && <ZgodnoscZKluczem wyjscie={[stdout, ...Object.values(przebieg.utworzone)].join("\n")} klucz={klucz} />}
      {(przebieg?.stan === "koniec" || kod.trim()) && (
        <Wstaw tekst={przebieg?.stan === "koniec" ? stdout : ""} kod={{ tekst: zaznaczony.trim() ? zaznaczony : kod, jezyk: "python", zaznaczony: !!zaznaczony.trim() }} doWstawienia={doWstawienia} onWstaw={onWstaw} />
      )}
    </div>
  );
}

export function Sql({ pliki, kod, onKod, doWstawienia, onWstaw, klucz, wyniki, setWyniki }: { pliki: Record<string, string>; kod: string; onKod: (k: string) => void; doWstawienia: string[]; onWstaw: (nr: string, tekst: string) => void; klucz: Klucz; wyniki: WynikSql[] | null; setWyniki: Ustaw<WynikSql[] | null> }) {
  const [baza, setBaza] = useState<BazaZadania | null>(null);
  const [blad, setBlad] = useState<string | null>(null);
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
  const start = (zEdytora?: unknown) => baza && setWyniki(baza.zapytaj(typeof zEdytora === "string" ? zEdytora : kodRef.current));
  const ostatni = wyniki?.at(-1);
  const tekstWyniku = ostatni && "wiersze" in ostatni ? ostatni.wiersze.map((w) => w.map((k) => k ?? "").join(" ")).join("\n") : "";
  const [zaznaczony, setZaznaczony] = useState("");
  const naZaznaczenie = (t: string) => {
    zaznaczenia.sql = t;
    setZaznaczony(t);
  };
  useEffect(() => () => void (zaznaczenia.sql = ""), []);

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
      <Widoczny wysokosc={342}>
      <Suspense fallback={<div className={styles.edytor} aria-busy="true" />}>
        <EdytorKodu wartosc={kod} jezyk="sql" schemat={schemat} onZmiana={onKod} onUruchom={start} onZaznaczenie={naZaznaczenie} etykieta="Zapytanie SQL" />
      </Suspense>
      </Widoczny>
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
      {wyniki && <ZgodnoscZKluczem wyjscie={tekstWyniku} klucz={klucz} />}
      <Wstaw tekst={tekstWyniku} kod={{ tekst: zaznaczony.trim() ? zaznaczony : kod, jezyk: "sql", zaznaczony: !!zaznaczony.trim() }} doWstawienia={doWstawienia} onWstaw={onWstaw} />
    </div>
  );
}

// Sprawdzarka: który podpunkt ma w wyjściu wynik zgodny z kluczem CKE. Pokazuje tylko zgodność,
// nie sam wynik, żeby nie zdradzać odpowiedzi.
export function ZgodnoscZKluczem({ wyjscie, klucz }: { wyjscie: string; klucz: Klucz }) {
  if (!klucz.length || !wyjscie.trim()) return null;
  const zgodne = klucz.map((k) => ({ nr: k.nr, ok: zgodneZKluczem(wyjscie, k.oczekiwane) }));
  return (
    <div className={styles.klucz} aria-label="Zgodność z kluczem CKE">
      <span className="small muted">Klucz CKE</span>
      {zgodne.map((z) => (
        <span key={z.nr} className={styles.kluczPozycja} data-ok={z.ok || undefined} title={z.ok ? "Wynik zgodny z kluczem CKE" : "Nie ma tu wyniku zgodnego z kluczem (na pełnym pliku danych)"}>
          {z.ok ? <Check size={14} aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />} {z.nr}
        </span>
      ))}
      {!zgodne.some((z) => z.ok) && <span className="small muted">Klucz dotyczy pełnego pliku danych, nie przykładowego.</span>}
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

export function Dane({ pliki }: { pliki: Record<string, string> }) {
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
