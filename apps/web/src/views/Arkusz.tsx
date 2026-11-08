import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, FileText, Headphones, Pencil, RotateCcw, X } from "lucide-react";
import { useArkusz } from "../arkusze/dane";
import { pustyPostep, usePostep, type Brudnopis as ZapisBrudnopisu, type Postep } from "../arkusze/postep";
import { policz, policzPytania, punktyZSamooceny, werdykt, zakresSlow, type Werdykt } from "../arkusze/sprawdz";
import {
  nazwaPoziomu,
  adresObrazu,
  nazwaPrzedmiotu,
  type Arkusz as ArkuszDane,
  type Blok,
  type Obraz,
  type Opcja,
  type Pytanie,
  type PytanieOtwarte,
  type PytanieZamkniete,
  type Wypowiedz,
  type Zadanie,
} from "../arkusze/typy";
import { Brudnopis } from "../components/Brudnopis";
import { TekstMat, WzorMat } from "../components/TekstMat";
import { Nagranie } from "../components/Nagranie";
import { Wypracowanie, type Temat } from "../components/Wypracowanie";
import { Ladowanie } from "../components/Ladowanie";
import styles from "./Arkusz.module.css";

type Kontekst = {
  arkusz: ArkuszDane;
  postep: Postep;
  ustaw: (nr: string, wartosc: string) => void;
  ocen: (nr: string, ocena: boolean | number) => void;
  ustawBrudnopis: (zadanie: number, zapis: ZapisBrudnopisu | null) => void;
  pytania: Map<string, Pytanie>;
  wBloku: Set<string>; // pytania z własnym blokiem; w tekście zostaje tylko znacznik
  opcjeDla: (nr: string) => Opcja[] | undefined;
  sprawdzone: (nr: string) => boolean;
  otwartaLuka: string | null;
  setOtwartaLuka: (nr: string | null) => void;
};

const Ctx = createContext<Kontekst | null>(null);
const useCtx = () => useContext(Ctx)!;
const nrZadania = (nrPytania: string) => Number(nrPytania.split(".")[0]);

export function Arkusz() {
  const { id = "" } = useParams();
  const { dane, blad, laduje } = useArkusz(id);
  const [postep, zmien] = usePostep(id);
  const [otwartaLuka, setOtwartaLuka] = useState<string | null>(null);

  const sprawdzone = useCallback((nr: string) => postep.sprawdzony || postep.sprawdzoneZadania.includes(nrZadania(nr)), [postep]);

  const kontekst = useMemo<Kontekst | null>(() => {
    if (!dane) return null;
    const pytania = new Map<string, Pytanie>();
    const wBloku = new Set<string>();
    const opcjeZadan = new Map<number, Opcja[]>();
    for (const z of dane.zadania) {
      for (const p of z.pytania) pytania.set(p.nr, p);
      for (const b of z.bloki) {
        if (b.typ === "pytanie") wBloku.add(b.nr);
        if (b.typ === "pytania" || b.typ === "tabela") b.nr.forEach((n) => wBloku.add(n));
        if (b.typ === "opcje" && !opcjeZadan.has(z.nr)) opcjeZadan.set(z.nr, b.opcje);
      }
    }
    return {
      arkusz: dane,
      postep,
      pytania,
      wBloku,
      sprawdzone,
      otwartaLuka,
      setOtwartaLuka,
      opcjeDla: (nr) => {
        const p = pytania.get(nr);
        return p?.typ === "zamkniete" ? (p.opcje ?? opcjeZadan.get(nrZadania(nr))) : undefined;
      },
      ustaw: (nr, wartosc) =>
        zmien((p) => (p.sprawdzony || p.sprawdzoneZadania.includes(nrZadania(nr)) ? p : { ...p, odpowiedzi: { ...p.odpowiedzi, [nr]: wartosc } })),
      ocen: (nr, ocena) => zmien((p) => ({ ...p, samoocena: { ...p.samoocena, [nr]: ocena } })),
      // Brudnopis to pomoc, więc działa także po sprawdzeniu zadania.
      ustawBrudnopis: (zadanie, zapis) =>
        zmien((p) => {
          const brudnopisy = { ...p.brudnopisy };
          if (zapis) brudnopisy[zadanie] = zapis;
          else delete brudnopisy[zadanie];
          return { ...p, brudnopisy };
        }),
    };
  }, [dane, postep, zmien, sprawdzone, otwartaLuka]);

  // Lista zdań pod luką zamyka się kliknięciem obok albo klawiszem Escape.
  useEffect(() => {
    if (!otwartaLuka) return;
    const zamknij = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !(e.target as Element).closest("[data-luka]")) setOtwartaLuka(null);
    };
    document.addEventListener("keydown", zamknij);
    document.addEventListener("pointerdown", zamknij);
    return () => {
      document.removeEventListener("keydown", zamknij);
      document.removeEventListener("pointerdown", zamknij);
    };
  }, [otwartaLuka]);

  const wynik = dane ? policz(dane, postep.odpowiedzi, postep.samoocena) : null;
  // Zapisany wynik aktualizujemy, gdy uczeń ocenia odpowiedzi otwarte.
  const zdobyte = wynik?.zdobyte;
  useEffect(() => {
    if (zdobyte === undefined) return;
    zmien((p) => (p.sprawdzony && p.wynik && p.wynik.zdobyte !== zdobyte ? { ...p, wynik: { ...p.wynik, zdobyte } } : p));
  }, [zdobyte, zmien]);

  if (laduje)
    return (
      <main className={`container ${styles.page}`}>
        <Ladowanie ksztalt="tekst" ile={7} etykieta="Wczytuję arkusz" />
      </main>
    );
  if (blad || !dane || !kontekst || !wynik) {
    return (
      <main className={`container ${styles.page}`}>
        <h1 className="h1">Nie ma takiego arkusza</h1>
        <Link to="/arkusze" className="link">
          Wróć do listy
        </Link>
      </main>
    );
  }

  const sprawdzCaly = () => {
    zmien((p) => ({ ...p, sprawdzony: true, wynik: { zdobyte: wynik.zdobyte, mozliwe: wynik.mozliwe, kiedy: new Date().toISOString() } }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const odNowa = () => {
    zmien(() => pustyPostep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const sprawdzZadanie = (nr: number) => zmien((p) => ({ ...p, sprawdzoneZadania: [...new Set([...p.sprawdzoneZadania, nr])] }));
  // Poprawa zadania: odpowiedzi zostają, znika ocena i samoocena jego pytań.
  const poprawZadanie = (z: Zadanie) =>
    zmien((p) => {
      const samoocena = { ...p.samoocena };
      for (const q of z.pytania) delete samoocena[q.nr];
      const sprawdzoneZadania = p.sprawdzony ? dane.zadania.map((x) => x.nr) : p.sprawdzoneZadania;
      return { ...p, samoocena, sprawdzony: false, wynik: undefined, sprawdzoneZadania: sprawdzoneZadania.filter((n) => n !== z.nr) };
    });

  const odpowiedziane = [...kontekst.pytania.keys()].filter((nr) => postep.odpowiedzi[nr]?.trim()).length;

  return (
    <Ctx.Provider value={kontekst}>
      <main className={`container ${styles.page}`}>
        <Naglowek arkusz={dane} />

        {postep.sprawdzony && <Podsumowanie wynik={wynik} odNowa={odNowa} />}

        {dane.zadania.map((z) => (
          <ZadanieWidok key={z.nr} zadanie={z} onSprawdz={() => sprawdzZadanie(z.nr)} onPopraw={() => poprawZadanie(z)} />
        ))}

        <footer className={styles.footer}>
          {postep.sprawdzony ? (
            <button type="button" className="btn btn-ghost" onClick={odNowa}>
              <RotateCcw size={16} aria-hidden="true" /> Rozwiąż od nowa
            </button>
          ) : (
            <>
              <p className="muted small">
                Odpowiedzi: {odpowiedziane} z {kontekst.pytania.size}. Zapisują się na bieżąco w tej przeglądarce.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={sprawdzCaly}
                data-tutor-about="Po sprawdzeniu zobaczysz klucz przy każdym pytaniu. Odpowiedzi otwarte spoza listy CKE ocenisz sam, z kluczem przed oczami."
              >
                <Check size={18} aria-hidden="true" /> Sprawdź cały arkusz
              </button>
            </>
          )}
        </footer>
      </main>
    </Ctx.Provider>
  );
}

function Naglowek({ arkusz }: { arkusz: ArkuszDane }) {
  const maSluchanie = arkusz.zadania.some((z) => z.sluchanie);
  return (
    <header className={styles.head}>
      <Link to="/arkusze" className={`small muted ${styles.back}`}>
        <ArrowLeft size={16} aria-hidden="true" /> Arkusze
      </Link>
      <span className="label">
        {nazwaPrzedmiotu[arkusz.przedmiot] ?? arkusz.przedmiot} · {nazwaPoziomu[arkusz.poziom]} · formuła {arkusz.formula ?? "2023"} · {arkusz.symbol}
      </span>
      <h1 className="h1">
        Matura {arkusz.sesja} {arkusz.rok}
      </h1>
      <p className="muted">{[arkusz.data, arkusz.czas && `${arkusz.czas} minut`, `${arkusz.punkty} pkt`].filter(Boolean).join(" · ")}</p>
      {arkusz.przedmiot === "matematyka" && <p className="small muted">Brudnopis nie wpływa na wynik w zadaniach zamkniętych. Zapisuje się w postępie arkusza.</p>}
      {(arkusz.pdf?.arkusz || arkusz.pdf?.zasady) && (
        <div className={styles.pdfs}>
          {arkusz.pdf.arkusz && (
            <a className="btn btn-secondary btn-sm" href={arkusz.pdf.arkusz} target="_blank" rel="noreferrer">
              <FileText size={16} aria-hidden="true" /> Arkusz PDF
            </a>
          )}
          {arkusz.pdf.zasady && (
            <a className="btn btn-ghost btn-sm" href={arkusz.pdf.zasady} target="_blank" rel="noreferrer">
              <FileText size={16} aria-hidden="true" /> Zasady oceniania PDF
            </a>
          )}
        </div>
      )}
      {maSluchanie && arkusz.nagranie && <Nagranie src={arkusz.nagranie} />}
      <p className="small muted">Źródło: Centralna Komisja Egzaminacyjna, cke.gov.pl.</p>
    </header>
  );
}

function Podsumowanie({ wynik, odNowa }: { wynik: ReturnType<typeof policz>; odNowa: () => void }) {
  const procent = wynik.mozliwe ? Math.round((wynik.zdobyte / wynik.mozliwe) * 100) : 0;
  return (
    <section className={styles.summary} aria-live="polite">
      <span className="label">{wynik.wypowiedzi ? "Wynik bez wypowiedzi pisemnej" : "Wynik"}</span>
      <p className={styles.bigScore}>
        {wynik.zdobyte} <span className="muted">/ {wynik.mozliwe} pkt</span> <span className={styles.percent}>{procent}%</span>
      </p>
      <p className="muted">
        {wynik.doOceny > 0
          ? `${wynik.doOceny} ${wynik.doOceny === 1 ? "odpowiedź otwarta czeka" : "odpowiedzi otwarte czekają"} na twoją ocenę. Porównaj z kluczem albo schematem oceniania przy pytaniu.`
          : "Wszystkie odpowiedzi ocenione."}
        {wynik.wypowiedzi > 0 && ` Wypowiedź pisemna (${wynik.wypowiedzi} pkt) wymaga oceny według kryteriów, na razie bez punktów.`}
      </p>
      <button type="button" className="btn btn-ghost btn-sm" onClick={odNowa}>
        <RotateCcw size={16} aria-hidden="true" /> Rozwiąż od nowa
      </button>
    </section>
  );
}

function ZadanieWidok({ zadanie, onSprawdz, onPopraw }: { zadanie: Zadanie; onSprawdz: () => void; onPopraw: () => void }) {
  const { arkusz, postep, wBloku, sprawdzone, ustawBrudnopis } = useCtx();
  const pisemna = zadanie.pytania[0]?.typ === "wypowiedz";
  const gotowe = sprawdzone(`${zadanie.nr}.`);
  const wTekscie = zadanie.pytania.filter((p) => !wBloku.has(p.nr) && p.typ !== "wypowiedz");
  const wynik = policzPytania(zadanie.pytania, postep.odpowiedzi, postep.samoocena);
  const odpowiedziane = zadanie.pytania.filter((p) => postep.odpowiedzi[p.nr]?.trim()).length;

  // Wypowiedź pisemna: tematy do wyboru i elementy treści trafiają do edytora.
  const pisanie = useMemo(() => (pisemna ? rozbierzPolecenie(zadanie) : null), [pisemna, zadanie]);
  const bloki = pisanie ? zadanie.bloki.filter((b) => !pisanie.ukryte.has(b)) : zadanie.bloki;

  // Treść z odpowiedziami: na stronie i nad brudnopisem na pełnym ekranie.
  const tresc = (
    <>
      {zadanie.polecenie.map((p, i) => (
        <p key={i} className={styles.instruction}>
          {p}
        </p>
      ))}
      <div className={styles.content}>
        {grupujPrawdaFalsz(bloki, zadanie).map((b, i) =>
          Array.isArray(b) ? (
            <PrawdaFalsz key={i} pytania={b} />
          ) : b.typ === "pytanie" && pisanie ? (
            <WypowiedzWidok key={i} pytanie={zadanie.pytania[0] as Wypowiedz} pisanie={pisanie} />
          ) : (
            <BlokWidok key={i} blok={b} zadanie={zadanie.nr} />
          ),
        )}
      </div>
      {gotowe && wTekscie.length > 0 && (
        <div className={styles.keyList}>
          {wTekscie.map((p) => (
            <Informacja key={p.nr} pytanie={p} zNumerem />
          ))}
        </div>
      )}
    </>
  );

  return (
    <section className={styles.task} id={`zadanie-${zadanie.nr}`}>
      <header className={styles.taskHead}>
        <h2 className="h3">Zadanie {zadanie.nr}.</h2>
        <span className="small muted">{gotowe && !pisemna ? `${wynik.zdobyte} / ${zadanie.punkty} pkt` : `0–${zadanie.punkty} pkt`}</span>
        {zadanie.sluchanie && (
          <span className={`small ${styles.listen}`}>
            <Headphones size={14} aria-hidden="true" /> nagranie
          </span>
        )}
      </header>
      {tresc}
      {arkusz.przedmiot === "matematyka" && (
        <Brudnopis
          plik={`${arkusz.id}-${zadanie.nr}`}
          zadanie={zadanie.nr}
          rysunek={zadanie.rysunek}
          zapis={postep.brudnopisy?.[zadanie.nr]}
          onZmiana={(zapis) => ustawBrudnopis(zadanie.nr, zapis)}
          tresc={tresc}
        />
      )}
      {!pisemna && !postep.sprawdzony && (
        <div className={styles.taskActions}>
          {gotowe ? (
            <>
              <span className={styles.taskScore}>
                {wynik.zdobyte} / {wynik.mozliwe} pkt
                {wynik.doOceny > 0 && <span className="small muted"> · {wynik.doOceny} do twojej oceny</span>}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onPopraw}>
                <Pencil size={15} aria-hidden="true" /> Popraw odpowiedzi
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onSprawdz}
                disabled={!odpowiedziane}
                aria-describedby={odpowiedziane ? undefined : `zadanie-${zadanie.nr}-czeka`}
              >
                <Check size={16} aria-hidden="true" /> Sprawdź zadanie {zadanie.nr}.
              </button>
              {/* Wyszarzony przycisk sam nie mówi, czego brakuje. */}
              {!odpowiedziane && (
                <span id={`zadanie-${zadanie.nr}-czeka`} className="small muted">
                  Odpowiedz na co najmniej jedno pytanie, żeby sprawdzić.
                </span>
              )}
            </>
          )}
        </div>
      )}
      {!pisemna && postep.sprawdzony && (
        <div className={styles.taskActions}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onPopraw}>
            <Pencil size={15} aria-hidden="true" /> Popraw odpowiedzi w tym zadaniu
          </button>
        </div>
      )}
    </section>
  );
}

type Pisanie = { tematy: Temat[]; punkty: string[]; polecenie: string; zakres: [number, number] | null; ukryte: Set<Blok> };

// Z bloków zadania z wypowiedzią wyciąga tematy („1. …”, „2. …”) z ich
// punktami oraz punkty polecenia („• …”) i zakres długości.
function rozbierzPolecenie(z: Zadanie): Pisanie {
  const tematy: Temat[] = [];
  const punkty: string[] = [];
  const ukryte = new Set<Blok>();
  for (const b of z.bloki) {
    if (b.typ !== "akapit") continue;
    const t = b.tekst.match(/^(\d)\.\s+(.*)$/s);
    if (t) {
      tematy.push({ nr: Number(t[1]), tekst: t[2], punkty: [] });
      ukryte.add(b);
    } else if (/^•\s/.test(b.tekst)) {
      if (tematy.length) {
        tematy[tematy.length - 1].punkty.push(b.tekst.replace(/^•\s*/, ""));
        ukryte.add(b);
      } else punkty.push(b.tekst);
    }
  }
  const caly = [...z.polecenie, ...z.bloki.map((b) => ("tekst" in b ? b.tekst : ""))].join(" ");
  return { tematy: tematy.length > 1 ? tematy : [], punkty, polecenie: z.polecenie.join(" "), zakres: zakresSlow(caly), ukryte: tematy.length > 1 ? ukryte : new Set() };
}

function werdyktPytania(p: Pytanie, postep: Postep): Werdykt {
  const w = werdykt(p, postep.odpowiedzi[p.nr]);
  const ocena = postep.samoocena[p.nr];
  if (w !== "do-oceny" || ocena === undefined) return w;
  // Część punktów zostaje „do oceny”: ani w pełni dobrze, ani źle.
  const punkty = punktyZSamooceny(p, ocena);
  return punkty === p.punkty ? "dobrze" : punkty === 0 ? "zle" : "do-oceny";
}

function Kadr({ obraz, tekst }: { obraz: Obraz; tekst: string }) {
  // Kadry są renderowane w skali 2 px na punkt PDF; 1,5 px na punkt daje tekst
  // zbliżony wielkością do reszty strony, a na wąskim ekranie obraz się zwęża.
  return (
    <figure className={styles.kadr}>
      <img src={adresObrazu(obraz.src)} alt={tekst} width={Math.round(obraz.szer * 1.5)} height={Math.round(obraz.wys * 1.5)} loading="lazy" />
    </figure>
  );
}

function BlokWidok({ blok, zadanie }: { blok: Blok; zadanie: number }) {
  const { pytania } = useCtx();
  switch (blok.typ) {
    case "akapit":
      return (
        <div className={blok.polecenie ? `${styles.para} ${styles.command}` : styles.para}>
          <Tekst tekst={blok.tekst} />
        </div>
      );
    case "wzor":
      return <WzorMat tex={blok.tex} blok />;
    case "rysunek":
      return <Kadr obraz={blok.obraz} tekst="Rysunek do zadania" />;
    case "tabelaTresci":
      return (
        <div className={styles.dataTableWrap}>
          <table className={styles.dataTable}>
            <tbody>
              {blok.wiersze.map((w, i) => (
                <tr key={i}>
                  {w.map((k, j) =>
                    i === 0 ? (
                      <th key={j} scope="col">
                        <Tekst tekst={k} />
                      </th>
                    ) : (
                      <td key={j}>
                        <Tekst tekst={k} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "naglowek":
      return <h3 className={styles.textTitle}>{blok.tekst}</h3>;
    case "zrodlo":
      return <p className={`small muted ${styles.source}`}>{blok.tekst}</p>;
    case "kadr":
      return <Kadr obraz={blok.obraz} tekst={blok.tekst} />;
    case "opcje":
      return <OpcjeZadania opcje={blok.opcje} zadanie={zadanie} />;
    case "pytanie": {
      const p = pytania.get(blok.nr);
      return p ? <PytanieWidok pytanie={p} /> : null;
    }
    case "pytania":
      return (
        <div className={styles.columns}>
          {blok.nr.map((nr) => {
            const p = pytania.get(nr);
            return p ? <PytanieWidok key={nr} pytanie={p} /> : null;
          })}
        </div>
      );
    case "tabela":
      return (
        <div className={styles.table}>
          {blok.nr.map((nr) => {
            const p = pytania.get(nr);
            return p?.typ === "zamkniete" ? <WierszTabeli key={nr} pytanie={p} /> : null;
          })}
        </div>
      );
  }
}

// Opcje wspólne dla zadania (zdania A–F, teksty A–D). Opcje użyte już
// w lukach są przygaszone, żeby było widać, co zostało.
function OpcjeZadania({ opcje, zadanie }: { opcje: Opcja[]; zadanie: number }) {
  const { postep } = useCtx();
  const uzyte = new Set(Object.entries(postep.odpowiedzi).filter(([nr]) => nrZadania(nr) === zadanie).map(([, l]) => l));
  return (
    <dl className={styles.options}>
      {opcje.map((o) => (
        <div key={o.litera} data-uzyta={uzyte.has(o.litera) || undefined}>
          <dt>{o.litera}</dt>
          <dd>
            <Tekst tekst={o.tresc} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Tekst ze znacznikami luk {{3.1}}.
function Tekst({ tekst, wlasny }: { tekst: string; wlasny?: string }) {
  const { pytania, wBloku } = useCtx();
  const czesci = tekst.split(/\{\{(\d+\.\d+)\}\}/);
  return (
    <>
      {czesci.map((c, i) => {
        if (i % 2 === 0) return <TekstMat key={i} tekst={c} />;
        const p = pytania.get(c);
        // Pytanie z własnym blokiem odpowiada tam; w tekście zostaje sam znacznik.
        if (!p || (wBloku.has(c) && c !== wlasny))
          return (
            <span key={i} className={styles.gapMark}>
              {c}. _____
            </span>
          );
        if (p.typ === "zamkniete") return <LukaZdanie key={i} pytanie={p} />;
        if (p.typ === "otwarte") return <LukaTekst key={i} pytanie={p} bezNumeru={c === wlasny} />;
        return null;
      })}
    </>
  );
}

const czyPrawdaFalsz = (p?: Pytanie): p is PytanieZamkniete => p?.typ === "zamkniete" && p.litery.join("") === "TF";
// Nagłówek kolumn z tabeli w arkuszu („T F”) — w widoku zastępują go przełączniki.
const NAGLOWEK_PF = /^(T\s*F|P\s*F|True\s+False)$/i;

// Kolejne pytania prawda/fałsz łączymy w jedną kartę z wierszami.
function grupujPrawdaFalsz(bloki: Blok[], z: Zadanie): (Blok | PytanieZamkniete[])[] {
  const wynik: (Blok | PytanieZamkniete[])[] = [];
  for (const b of bloki) {
    if (b.typ === "akapit" && NAGLOWEK_PF.test(b.tekst.trim())) continue;
    const p = b.typ === "pytanie" ? z.pytania.find((q) => q.nr === b.nr) : undefined;
    if (czyPrawdaFalsz(p)) {
      const ost = wynik[wynik.length - 1];
      if (Array.isArray(ost)) ost.push(p);
      else wynik.push([p]);
    } else wynik.push(b);
  }
  return wynik;
}

const PF = [
  { litera: "T", nazwa: "True", ikona: Check },
  { litera: "F", nazwa: "False", ikona: X },
];

function PrawdaFalsz({ pytania }: { pytania: PytanieZamkniete[] }) {
  return (
    <div className={styles.tf} role="list">
      {pytania.map((p) => (
        <WierszPrawdaFalsz key={p.nr} pytanie={p} />
      ))}
    </div>
  );
}

function WierszPrawdaFalsz({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const wybrana = postep.odpowiedzi[p.nr] || undefined;
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  const w = gotowe ? werdykt(p, wybrana) : undefined;
  return (
    <div className={styles.tfRow} role="listitem" data-werdykt={w}>
      <p className={styles.tfStatement}>
        <span className={styles.qnr}>{p.nr}.</span>
        {p.tresc}
      </p>
      <div className={styles.tfSide}>
        <div ref={kontener} className={styles.tfToggle} role="radiogroup" aria-label={`Pytanie ${p.nr}: prawda czy fałsz`}>
          {ramka && <span className={styles.tfThumb} style={ramka} aria-hidden="true" />}
          {PF.map(({ litera, nazwa, ikona: Ikona }) => (
            <button
              key={litera}
              type="button"
              role="radio"
              data-litera={litera}
              aria-checked={wybrana === litera}
              className={styles.tfOption}
              data-stan={stanOpcji(p, litera, postep, gotowe)}
              disabled={gotowe}
              onClick={() => ustaw(p.nr, wybrana === litera ? "" : litera)}
            >
              <Ikona size={15} strokeWidth={2.4} aria-hidden="true" />
              {nazwa}
            </button>
          ))}
        </div>
        {gotowe && (
          <span className={styles.tfVerdict} data-werdykt={w}>
            {w === "dobrze" ? "Dobrze" : w === "pusto" ? "Brak" : "Źle"}
          </span>
        )}
      </div>
    </div>
  );
}

function PytanieWidok({ pytanie: p }: { pytanie: Pytanie }) {
  if (p.typ === "wypowiedz") return null;
  return (
    <div className={styles.question}>
      <div className={styles.stem}>
        <span className={styles.qnr}>{p.nr}.</span>
        {p.tresc && <Tekst tekst={p.tresc} wlasny={p.nr} />}
      </div>
      {p.typ === "zamkniete" && (p.opcje?.length ? <Opcje pytanie={p} /> : <Suwak pytanie={p} />)}
      {p.typ === "otwarte" && !p.tresc.includes(`{{${p.nr}}}`) && (
        <LukaTekst pytanie={p} blok placeholder={p.kod ? "kod odpowiedzi z liter i cyfr" : p.zasadyStrona ? "wynik albo krótka odpowiedź" : undefined} />
      )}
      <Informacja pytanie={p} />
    </div>
  );
}

function stanOpcji(p: PytanieZamkniete, litera: string, postep: Postep, sprawdzone: boolean) {
  const wybrana = postep.odpowiedzi[p.nr] === litera;
  if (!sprawdzone) return wybrana ? "wybrana" : undefined;
  // „trafiona”: wybrana i poprawna; „poprawna”: poprawna, ale uczeń jej nie wybrał.
  if (litera === p.poprawna) return wybrana ? "trafiona" : "poprawna";
  return wybrana ? "bledna" : undefined;
}

// Pozycja podświetlenia pod wybraną opcją, mierzona z DOM, żeby mogło
// płynnie przesuwać się między opcjami jak suwak.
function usePodswietlenie(wybrana: string | undefined) {
  const kontener = useRef<HTMLDivElement>(null);
  const [ramka, setRamka] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const zmierz = () => {
      const el = wybrana ? kontener.current?.querySelector<HTMLElement>(`[data-litera="${wybrana}"]`) : null;
      setRamka(el ? { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight } : null);
    };
    zmierz();
    const ro = new ResizeObserver(zmierz);
    if (kontener.current) ro.observe(kontener.current);
    return () => ro.disconnect();
  }, [wybrana]);
  return { kontener, ramka };
}

function Opcje({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const wybrana = postep.odpowiedzi[p.nr] || undefined;
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  return (
    <div ref={kontener} className={styles.choices} role="radiogroup" aria-label={`Pytanie ${p.nr}`}>
      {ramka && <span className={styles.highlight} style={ramka} aria-hidden="true" />}
      {p.opcje!.map((o) => (
        <button
          key={o.litera}
          type="button"
          role="radio"
          data-litera={o.litera}
          aria-checked={wybrana === o.litera}
          className={styles.choice}
          data-stan={stanOpcji(p, o.litera, postep, gotowe)}
          disabled={gotowe}
          onClick={() => ustaw(p.nr, wybrana === o.litera ? "" : o.litera)}
        >
          <span className={styles.letter}>{o.litera}</span>
          <span>
            <Tekst tekst={o.tresc} />
          </span>
        </button>
      ))}
    </div>
  );
}

// Same litery (dopasowanie): segmentowy suwak z przesuwanym wskaźnikiem.
function Suwak({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const wybrana = postep.odpowiedzi[p.nr] || undefined;
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  return (
    <div ref={kontener} className={styles.slider} role="radiogroup" aria-label={`Pytanie ${p.nr}`}>
      {ramka && <span className={styles.thumb} style={ramka} aria-hidden="true" />}
      {p.litery.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          data-litera={l}
          aria-checked={wybrana === l}
          className={styles.segment}
          data-stan={stanOpcji(p, l, postep, gotowe)}
          disabled={gotowe}
          onClick={() => ustaw(p.nr, wybrana === l ? "" : l)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function WierszTabeli({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { postep, sprawdzone } = useCtx();
  const w = werdykt(p, postep.odpowiedzi[p.nr]);
  return (
    <div className={styles.row}>
      <span className={styles.qnr}>{p.nr}.</span>
      <Suwak pytanie={p} />
      {sprawdzone(p.nr) && (
        <span className={styles.rowVerdict} data-werdykt={w}>
          {w === "dobrze" ? <Check size={16} aria-label="dobrze" /> : <X size={16} aria-label="źle" />}
          {w !== "dobrze" && <span className="small">poprawna: {p.poprawna}</span>}
        </span>
      )}
    </div>
  );
}

// Luka na brakujące zdanie: kliknięcie rozwija pod nią listę zdań, wybrane
// zdanie wchodzi w tekst. Bez treści opcji zostaje mały wybór liter.
function LukaZdanie({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { postep, ustaw, sprawdzone, opcjeDla, otwartaLuka, setOtwartaLuka } = useCtx();
  const opcje = opcjeDla(p.nr);
  const gotowe = sprawdzone(p.nr);
  const wybrana = postep.odpowiedzi[p.nr] || "";
  const otwarta = otwartaLuka === p.nr && !gotowe;
  const w = gotowe ? werdyktPytania(p, postep) : undefined;
  const tresc = opcje?.find((o) => o.litera === wybrana)?.tresc;
  // Które zdania są już wstawione w inne luki tego zadania.
  const zajete = new Map<string, string>();
  for (const [nr, l] of Object.entries(postep.odpowiedzi)) if (nr !== p.nr && nrZadania(nr) === nrZadania(p.nr) && l) zajete.set(l, nr);

  return (
    <span className={styles.sentenceGap} data-luka>
      <button
        type="button"
        className={styles.gapChip}
        data-wybrana={wybrana ? "" : undefined}
        data-werdykt={w}
        data-otwarta={otwarta || undefined}
        aria-expanded={otwarta}
        disabled={gotowe}
        onClick={() => setOtwartaLuka(otwarta ? null : p.nr)}
      >
        <span className={styles.gapNr}>{p.nr}.</span>
        {wybrana ? (
          <>
            <strong>{wybrana}</strong>
            {tresc && <span className={styles.gapText}>{tresc}</span>}
          </>
        ) : (
          <span className={styles.gapPrompt}>{opcje ? "wybierz zdanie" : "wybierz"}</span>
        )}
        {!gotowe && <ChevronDown size={14} aria-hidden="true" className={styles.gapChevron} />}
      </button>
      {otwarta && (
        <span className={styles.picker} role="listbox" aria-label={`Zdania do luki ${p.nr}`}>
          {(opcje ?? p.litery.map((l) => ({ litera: l, tresc: "" }))).map((o) => (
            <button
              key={o.litera}
              type="button"
              role="option"
              aria-selected={wybrana === o.litera}
              className={styles.pickerOption}
              data-zajeta={zajete.has(o.litera) || undefined}
              onClick={() => {
                ustaw(p.nr, o.litera);
                setOtwartaLuka(null);
              }}
            >
              <span className={styles.letter}>{o.litera}</span>
              <span>{o.tresc || `Litera ${o.litera}`}</span>
              {zajete.has(o.litera) && <span className={styles.badge}>w {zajete.get(o.litera)}</span>}
            </button>
          ))}
          {wybrana && (
            <button
              type="button"
              className={styles.pickerClear}
              onClick={() => {
                ustaw(p.nr, "");
                setOtwartaLuka(null);
              }}
            >
              Wyczyść lukę
            </button>
          )}
        </span>
      )}
    </span>
  );
}

function LukaTekst({ pytanie: p, blok, bezNumeru, placeholder }: { pytanie: PytanieOtwarte; blok?: boolean; bezNumeru?: boolean; placeholder?: string }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const w = gotowe ? werdyktPytania(p, postep) : undefined;
  const wartosc = postep.odpowiedzi[p.nr] ?? "";
  return (
    <span className={blok ? styles.blockGap : styles.inlineGap} data-werdykt={w}>
      {!blok && !bezNumeru && <span className={styles.gapNr}>{p.nr}.</span>}
      <input
        type="text"
        value={wartosc}
        size={Math.max(blok ? 30 : 12, wartosc.length + 2)}
        readOnly={gotowe}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(e) => ustaw(p.nr, e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder ? `Odpowiedź ${p.nr}` : `Luka ${p.nr}`}
      />
    </span>
  );
}

function WypowiedzWidok({ pytanie: p, pisanie }: { pytanie: Wypowiedz; pisanie: Pisanie }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const klucz = (pole: string) => `${p.nr}:${pole}`;
  const temat = Number(postep.odpowiedzi[klucz("temat")]) || null;
  const odhaczone = (postep.odpowiedzi[klucz("lista")] ?? "").split(",").filter(Boolean).map(Number);
  return (
    <div className={styles.essay}>
      <Wypracowanie
        tekst={postep.odpowiedzi[p.nr] ?? ""}
        poczatek={p.poczatek}
        tematy={pisanie.tematy}
        punkty={pisanie.punkty}
        polecenie={pisanie.polecenie}
        zakres={pisanie.zakres}
        temat={temat}
        odhaczone={odhaczone}
        tylkoOdczyt={sprawdzone(p.nr)}
        onTekst={(t) => ustaw(p.nr, t)}
        onTemat={(n) => ustaw(klucz("temat"), String(n))}
        onOdhacz={(i) => ustaw(klucz("lista"), (odhaczone.includes(i) ? odhaczone.filter((x) => x !== i) : [...odhaczone, i]).join(","))}
      />
      {sprawdzone(p.nr) && (
        <p className={`small ${styles.note}`}>
          Wypowiedź oceniasz na razie sam według kryteriów z polecenia (treść, spójność, zakres i poprawność środków językowych). Automatyczna ocena przyjdzie razem z AI.
        </p>
      )}
    </div>
  );
}

function opisSamooceny(p: Pytanie, ocena: boolean | number | undefined, zLista: boolean) {
  if (ocena === undefined) return zLista ? "Spoza listy CKE: oceń sam" : "Oceń sam według schematu CKE";
  if (p.punkty > 1) return `Przyznane przez ciebie: ${punktyZSamooceny(p, ocena)} z ${p.punkty} pkt`;
  return ocena ? "Zaliczona przez ciebie" : "Niezaliczona przez ciebie";
}

// Informacja zwrotna pod pytaniem po sprawdzeniu.
function Informacja({ pytanie: p, zNumerem }: { pytanie: Pytanie; zNumerem?: boolean }) {
  const { arkusz, postep, ocen, sprawdzone, opcjeDla } = useCtx();
  if (!sprawdzone(p.nr) || p.typ === "wypowiedz") return null;
  const surowy = werdykt(p, postep.odpowiedzi[p.nr]);
  const w = werdyktPytania(p, postep);
  const odp = postep.odpowiedzi[p.nr]?.trim();
  const nr: ReactNode = zNumerem ? <strong>{p.nr}. </strong> : null;
  const schemat = p.zasadyStrona && arkusz.pdf?.zasady ? `${arkusz.pdf.zasady}#page=${p.zasadyStrona}` : null;

  if (p.typ === "zamkniete") {
    const zdanie = opcjeDla(p.nr)?.find((o) => o.litera === p.poprawna)?.tresc;
    return (
      <div className={styles.feedback} data-werdykt={w}>
        <p className={styles.feedbackHead}>
          {nr}
          {w === "dobrze" ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
          {w === "dobrze" ? "Dobrze" : `${odp ? `Twoja: ${odp}. ` : "Brak odpowiedzi. "}Poprawna: ${p.poprawna}`}
        </p>
        {w !== "dobrze" && zdanie && !p.opcje?.length && <p className={`small muted ${styles.correctText}`}><Tekst tekst={zdanie} /></p>}
      </div>
    );
  }

  return (
    <div className={styles.feedback} data-werdykt={w}>
      <p className={styles.feedbackHead}>
        {nr}
        {w === "dobrze" ? <Check size={16} aria-hidden="true" /> : w === "zle" ? <X size={16} aria-hidden="true" /> : null}
        {surowy === "dobrze" && "Zgodne z kluczem CKE"}
        {surowy === "zle" && "Ta odpowiedź jest w kluczu jako niepoprawna"}
        {surowy === "pusto" && "Brak odpowiedzi"}
        {surowy === "do-oceny" && opisSamooceny(p, postep.samoocena[p.nr], !!(p.oczekiwane?.length || p.akceptowane?.length))}
      </p>
      {surowy !== "dobrze" && (
        <div className={styles.key}>
          {schemat && (
            <p>
              <a className="link" href={schemat} target="_blank" rel="noreferrer">
                Rozwiązanie i schemat oceniania CKE (strona {p.zasadyStrona})
              </a>
            </p>
          )}
          {p.oczekiwane?.length ? (
            <p>
              <span className="label">Oczekiwana</span> {p.oczekiwane.slice(0, 6).join(" / ")}
            </p>
          ) : p.akceptowane?.length ? (
            // Starsze klucze nie mają odpowiedzi oczekiwanej, tylko przykłady na 1 pkt.
            <p>
              <span className="label">Przykłady na 1 pkt</span> {p.akceptowane.slice(0, 4).join(" / ")}
            </p>
          ) : null}
          {p.opis && <p className="small muted">{p.opis}</p>}
          {p.akceptowane?.length ? (
            <details>
              <summary className="small">Inne akceptowane ({p.akceptowane.length})</summary>
              <p className="small muted">{p.akceptowane.join(" · ")}</p>
            </details>
          ) : null}
        </div>
      )}
      {surowy === "do-oceny" &&
        (p.punkty > 1 ? (
          // Zadanie wielopunktowe: uczeń przyznaje sobie punkty według schematu.
          <div className={styles.selfCheck} role="group" aria-label={`Twoje punkty za ${p.nr}`}>
            {Array.from({ length: p.punkty + 1 }, (_, n) => (
              <button key={n} type="button" className={`btn btn-sm ${n ? "btn-secondary" : "btn-ghost"}`} aria-pressed={postep.samoocena[p.nr] === n} onClick={() => ocen(p.nr, n)}>
                {n} pkt
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.selfCheck}>
            <button type="button" className="btn btn-sm btn-secondary" aria-pressed={postep.samoocena[p.nr] === true} onClick={() => ocen(p.nr, true)}>
              Zaliczam
            </button>
            <button type="button" className="btn btn-sm btn-ghost" aria-pressed={postep.samoocena[p.nr] === false} onClick={() => ocen(p.nr, false)}>
              Nie zaliczam
            </button>
          </div>
        ))}
    </div>
  );
}
