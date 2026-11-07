import { createContext, Fragment, useContext, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Headphones, RotateCcw, X } from "lucide-react";
import { useArkusz } from "../arkusze/dane";
import { usePostep, type Postep } from "../arkusze/postep";
import { policz, werdykt, type Werdykt } from "../arkusze/sprawdz";
import { nazwaPoziomu, type Arkusz as ArkuszDane, type Blok, type Pytanie, type PytanieOtwarte, type PytanieZamkniete, type Zadanie } from "../arkusze/typy";
import styles from "./Arkusz.module.css";

type Kontekst = {
  postep: Postep;
  ustaw: (nr: string, wartosc: string) => void;
  ocen: (nr: string, zaliczone: boolean) => void;
  pytania: Map<string, Pytanie>;
  wBloku: Set<string>; // pytania z własnym blokiem; w tekście zostaje tylko znacznik
};

const Ctx = createContext<Kontekst | null>(null);
const useCtx = () => useContext(Ctx)!;

export function Arkusz() {
  const { id = "" } = useParams();
  const { dane, blad, laduje } = useArkusz(id);
  const [postep, zmien] = usePostep(id);

  const kontekst = useMemo<Kontekst | null>(() => {
    if (!dane) return null;
    const pytania = new Map<string, Pytanie>();
    const wBloku = new Set<string>();
    for (const z of dane.zadania) {
      for (const p of z.pytania) pytania.set(p.nr, p);
      for (const b of z.bloki) {
        if (b.typ === "pytanie") wBloku.add(b.nr);
        if (b.typ === "pytania" || b.typ === "tabela") b.nr.forEach((n) => wBloku.add(n));
      }
    }
    return {
      postep,
      pytania,
      wBloku,
      ustaw: (nr, wartosc) => zmien((p) => (p.sprawdzony ? p : { ...p, odpowiedzi: { ...p.odpowiedzi, [nr]: wartosc } })),
      ocen: (nr, zaliczone) => zmien((p) => ({ ...p, samoocena: { ...p.samoocena, [nr]: zaliczone } })),
    };
  }, [dane, postep, zmien]);

  const wynik = dane ? policz(dane, postep.odpowiedzi, postep.samoocena) : null;
  // Zapisany wynik aktualizujemy, gdy uczeń ocenia odpowiedzi otwarte.
  const zdobyte = wynik?.zdobyte;
  useEffect(() => {
    if (zdobyte === undefined) return;
    zmien((p) => (p.sprawdzony && p.wynik && p.wynik.zdobyte !== zdobyte ? { ...p, wynik: { ...p.wynik, zdobyte } } : p));
  }, [zdobyte, zmien]);

  if (laduje) return <main className={`container ${styles.page}`}><p className="muted">Wczytuję arkusz…</p></main>;
  if (blad || !dane || !kontekst || !wynik) {
    return (
      <main className={`container ${styles.page}`}>
        <h1 className="h1">Nie ma takiego arkusza</h1>
        <Link to="/arkusze" className="link">Wróć do listy</Link>
      </main>
    );
  }

  const sprawdz = () => {
    zmien((p) => ({ ...p, sprawdzony: true, wynik: { zdobyte: wynik.zdobyte, mozliwe: wynik.mozliwe, kiedy: new Date().toISOString() } }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const odNowa = () => {
    zmien(() => ({ odpowiedzi: {}, samoocena: {}, sprawdzony: false }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const odpowiedziane = Object.values(postep.odpowiedzi).filter((v) => v.trim()).length;
  const wszystkie = kontekst.pytania.size;

  return (
    <Ctx.Provider value={kontekst}>
      <main className={`container ${styles.page}`}>
        <Naglowek arkusz={dane} />

        {postep.sprawdzony && <Podsumowanie wynik={wynik} odNowa={odNowa} />}

        {dane.zadania.map((z) => (
          <ZadanieWidok key={z.nr} zadanie={z} />
        ))}

        <footer className={styles.footer}>
          {postep.sprawdzony ? (
            <button type="button" className="btn btn-ghost" onClick={odNowa}>
              <RotateCcw size={16} aria-hidden="true" /> Rozwiąż od nowa
            </button>
          ) : (
            <>
              <p className="muted small">
                Odpowiedzi: {odpowiedziane} z {wszystkie}. Zapisują się na bieżąco w tej przeglądarce.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={sprawdz}
                data-tutor-about="Po sprawdzeniu zobaczysz klucz przy każdym pytaniu. Odpowiedzi otwarte spoza listy CKE ocenisz sam, z kluczem przed oczami."
              >
                <Check size={18} aria-hidden="true" /> Sprawdź arkusz
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
        Język angielski · {nazwaPoziomu[arkusz.poziom]} · {arkusz.symbol}
      </span>
      <h1 className="h1">
        Matura {arkusz.sesja} {arkusz.rok}
      </h1>
      <p className="muted">
        {[arkusz.data, arkusz.czas && `${arkusz.czas} minut`, `${arkusz.punkty} pkt`].filter(Boolean).join(" · ")}
      </p>
      {maSluchanie && arkusz.nagranie && (
        <div className={styles.audio} data-tutor-about="Nagranie do zadań ze słuchu, odtwarzane ze strony CKE. Na maturze każdy tekst słyszysz dwa razy.">
          <Headphones size={18} aria-hidden="true" />
          <audio controls preload="none" src={arkusz.nagranie}>
            Twoja przeglądarka nie odtwarza nagrań.
          </audio>
        </div>
      )}
      <p className="small muted">Źródło: Centralna Komisja Egzaminacyjna, cke.gov.pl.</p>
    </header>
  );
}

function Podsumowanie({ wynik, odNowa }: { wynik: ReturnType<typeof policz>; odNowa: () => void }) {
  const procent = wynik.mozliwe ? Math.round((wynik.zdobyte / wynik.mozliwe) * 100) : 0;
  return (
    <section className={styles.summary} aria-live="polite">
      <span className="label">Wynik bez wypowiedzi pisemnej</span>
      <p className={styles.bigScore}>
        {wynik.zdobyte} <span className="muted">/ {wynik.mozliwe} pkt</span> <span className={styles.percent}>{procent}%</span>
      </p>
      <p className="muted">
        {wynik.doOceny > 0
          ? `${wynik.doOceny} ${wynik.doOceny === 1 ? "odpowiedź otwarta czeka" : "odpowiedzi otwarte czekają"} na twoją ocenę: są poprawne inaczej, niż przewiduje lista CKE, albo całkiem źle. Porównaj z kluczem przy pytaniu.`
          : "Wszystkie odpowiedzi ocenione."}{" "}
        Wypowiedź pisemna ({wynik.wypowiedzi} pkt) wymaga oceny według kryteriów, na razie bez punktów.
      </p>
      <button type="button" className="btn btn-ghost btn-sm" onClick={odNowa}>
        <RotateCcw size={16} aria-hidden="true" /> Rozwiąż od nowa
      </button>
    </section>
  );
}

function ZadanieWidok({ zadanie }: { zadanie: Zadanie }) {
  const { postep, wBloku } = useCtx();
  const wTekscie = zadanie.pytania.filter((p) => !wBloku.has(p.nr) && p.typ !== "wypowiedz");
  const zdobyte = zadanie.pytania.reduce((s, p) => s + (werdyktPytania(p, postep) === "dobrze" ? p.punkty : 0), 0);

  return (
    <section className={styles.task} id={`zadanie-${zadanie.nr}`}>
      <header className={styles.taskHead}>
        <h2 className="h3">Zadanie {zadanie.nr}.</h2>
        <span className="small muted">
          {postep.sprawdzony && zadanie.pytania[0]?.typ !== "wypowiedz" ? `${zdobyte} / ` : "0–"}
          {zadanie.punkty} pkt
        </span>
        {zadanie.sluchanie && (
          <span className={`small ${styles.listen}`}>
            <Headphones size={14} aria-hidden="true" /> nagranie
          </span>
        )}
      </header>
      {zadanie.polecenie.map((p, i) => (
        <p key={i} className={styles.instruction}>
          {p}
        </p>
      ))}
      <div className={styles.content}>
        {zadanie.bloki.map((b, i) => (
          <BlokWidok key={i} blok={b} />
        ))}
      </div>
      {postep.sprawdzony && wTekscie.length > 0 && (
        <div className={styles.keyList}>
          {wTekscie.map((p) => (
            <Informacja key={p.nr} pytanie={p} zNumerem />
          ))}
        </div>
      )}
    </section>
  );
}

function werdyktPytania(p: Pytanie, postep: Postep): Werdykt {
  const w = werdykt(p, postep.odpowiedzi[p.nr]);
  if (w === "do-oceny" && postep.samoocena[p.nr] !== undefined) return postep.samoocena[p.nr] ? "dobrze" : "zle";
  return w;
}

function BlokWidok({ blok }: { blok: Blok }) {
  const { pytania } = useCtx();
  switch (blok.typ) {
    case "akapit":
      return (
        <p className={styles.para}>
          <Tekst tekst={blok.tekst} />
        </p>
      );
    case "naglowek":
      return <h3 className={styles.textTitle}>{blok.tekst}</h3>;
    case "zrodlo":
      return <p className={`small muted ${styles.source}`}>{blok.tekst}</p>;
    case "opcje":
      return (
        <dl className={styles.options}>
          {blok.opcje.map((o) => (
            <div key={o.litera}>
              <dt>{o.litera}</dt>
              <dd>{o.tresc}</dd>
            </div>
          ))}
        </dl>
      );
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
            return p?.typ === "zamkniete" ? <Litery key={nr} pytanie={p} zNumerem /> : null;
          })}
        </div>
      );
  }
}

// Tekst ze znacznikami luk {{3.1}}.
function Tekst({ tekst, wlasny }: { tekst: string; wlasny?: string }) {
  const { pytania, wBloku } = useCtx();
  const czesci = tekst.split(/\{\{(\d+\.\d+)\}\}/);
  return (
    <>
      {czesci.map((c, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{c}</Fragment>;
        const p = pytania.get(c);
        // Pytanie z własnym blokiem odpowiada tam; w tekście zostaje sam znacznik.
        if (!p || (wBloku.has(c) && c !== wlasny)) return <span key={i} className={styles.gapMark}>{c}. _____</span>;
        if (p.typ === "zamkniete") return <LukaLitera key={i} pytanie={p} />;
        if (p.typ === "otwarte") return <LukaTekst key={i} pytanie={p} bezNumeru={c === wlasny} />;
        return null;
      })}
    </>
  );
}

function PytanieWidok({ pytanie: p }: { pytanie: Pytanie }) {
  if (p.typ === "wypowiedz") return <WypowiedzWidok pytanie={p} />;
  const tresc = p.tresc ? (
    <div className={styles.stem}>
      <Tekst tekst={p.tresc} wlasny={p.nr} />
    </div>
  ) : null;
  return (
    <div className={styles.question}>
      <span className={styles.qnr}>{p.nr}.</span>
      <div className={styles.qbody}>
        {tresc}
        {p.typ === "zamkniete" && (p.opcje?.length ? <Opcje pytanie={p} /> : <Litery pytanie={p} />)}
        {p.typ === "otwarte" && !p.tresc.includes(`{{${p.nr}}}`) && <LukaTekst pytanie={p} blok />}
        <Informacja pytanie={p} />
      </div>
    </div>
  );
}

function stanOpcji(p: PytanieZamkniete, litera: string, postep: Postep) {
  const wybrana = postep.odpowiedzi[p.nr] === litera;
  if (!postep.sprawdzony) return wybrana ? "wybrana" : undefined;
  // „trafiona”: wybrana i poprawna; „poprawna”: poprawna, ale uczeń jej nie wybrał.
  if (litera === p.poprawna) return wybrana ? "trafiona" : "poprawna";
  return wybrana ? "bledna" : undefined;
}

function Opcje({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { postep, ustaw } = useCtx();
  return (
    <div className={styles.choices} role="radiogroup" aria-label={`Pytanie ${p.nr}`}>
      {p.opcje!.map((o) => (
        <button
          key={o.litera}
          type="button"
          role="radio"
          aria-checked={postep.odpowiedzi[p.nr] === o.litera}
          className={styles.choice}
          data-stan={stanOpcji(p, o.litera, postep)}
          disabled={postep.sprawdzony}
          onClick={() => ustaw(p.nr, postep.odpowiedzi[p.nr] === o.litera ? "" : o.litera)}
        >
          <span className={styles.letter}>{o.litera}</span>
          <span>{o.tresc}</span>
        </button>
      ))}
    </div>
  );
}

function Litery({ pytanie: p, zNumerem }: { pytanie: PytanieZamkniete; zNumerem?: boolean }) {
  const { postep, ustaw } = useCtx();
  return (
    <div className={styles.letters} role="radiogroup" aria-label={`Pytanie ${p.nr}`}>
      {zNumerem && <span className={styles.qnr}>{p.nr}.</span>}
      {p.litery.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={postep.odpowiedzi[p.nr] === l}
          className={styles.letterBtn}
          data-stan={stanOpcji(p, l, postep)}
          disabled={postep.sprawdzony}
          onClick={() => ustaw(p.nr, postep.odpowiedzi[p.nr] === l ? "" : l)}
        >
          {l}
        </button>
      ))}
      {zNumerem && postep.sprawdzony && (
        <span className={styles.rowVerdict} data-werdykt={werdykt(p, postep.odpowiedzi[p.nr])}>
          {werdykt(p, postep.odpowiedzi[p.nr]) === "dobrze" ? <Check size={16} aria-label="dobrze" /> : <X size={16} aria-label="źle" />}
        </span>
      )}
    </div>
  );
}

function LukaLitera({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { postep, ustaw } = useCtx();
  const w = postep.sprawdzony ? werdyktPytania(p, postep) : undefined;
  return (
    <span className={styles.inlineGap} data-werdykt={w}>
      <span className={styles.gapNr}>{p.nr}.</span>
      <select value={postep.odpowiedzi[p.nr] ?? ""} disabled={postep.sprawdzony} onChange={(e) => ustaw(p.nr, e.target.value)} aria-label={`Luka ${p.nr}`}>
        <option value="">…</option>
        {p.litery.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </span>
  );
}

function LukaTekst({ pytanie: p, blok, bezNumeru }: { pytanie: PytanieOtwarte; blok?: boolean; bezNumeru?: boolean }) {
  const { postep, ustaw } = useCtx();
  const w = postep.sprawdzony ? werdyktPytania(p, postep) : undefined;
  const wartosc = postep.odpowiedzi[p.nr] ?? "";
  return (
    <span className={blok ? styles.blockGap : styles.inlineGap} data-werdykt={w}>
      {!blok && !bezNumeru && <span className={styles.gapNr}>{p.nr}.</span>}
      <input
        type="text"
        value={wartosc}
        size={Math.max(blok ? 30 : 12, wartosc.length + 2)}
        readOnly={postep.sprawdzony}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(e) => ustaw(p.nr, e.target.value)}
        aria-label={`Luka ${p.nr}`}
      />
    </span>
  );
}

function WypowiedzWidok({ pytanie: p }: { pytanie: Pytanie & { typ: "wypowiedz" } }) {
  const { postep, ustaw } = useCtx();
  const tekst = postep.odpowiedzi[p.nr] ?? "";
  const slowa = tekst.trim() ? tekst.trim().split(/\s+/).length : 0;
  return (
    <div className={styles.essay}>
      {p.poczatek && <p className={styles.essayStart}>{p.poczatek}</p>}
      <textarea
        value={tekst}
        rows={14}
        readOnly={postep.sprawdzony}
        onChange={(e) => ustaw(p.nr, e.target.value)}
        aria-label="Twoja wypowiedź"
        placeholder="Napisz swoją wypowiedź po angielsku…"
      />
      <span className="small muted">Słowa: {slowa}</span>
      {postep.sprawdzony && (
        <p className={`small ${styles.note}`}>
          Wypowiedź oceniasz na razie sam według kryteriów z polecenia (treść, spójność, zakres i poprawność środków językowych). Automatyczna ocena przyjdzie razem z AI.
        </p>
      )}
    </div>
  );
}

// Informacja zwrotna pod pytaniem po sprawdzeniu.
function Informacja({ pytanie: p, zNumerem }: { pytanie: Pytanie; zNumerem?: boolean }) {
  const { postep, ocen } = useCtx();
  if (!postep.sprawdzony || p.typ === "wypowiedz") return null;
  const surowy = werdykt(p, postep.odpowiedzi[p.nr]);
  const w = werdyktPytania(p, postep);
  const odp = postep.odpowiedzi[p.nr]?.trim();
  const nr = zNumerem ? <strong>{p.nr}. </strong> : null;

  if (p.typ === "zamkniete") {
    return (
      <p className={styles.feedback} data-werdykt={w}>
        {nr}
        {w === "dobrze" ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
        {w === "dobrze" ? "Dobrze" : `${odp ? `Twoja: ${odp}. ` : "Brak odpowiedzi. "}Poprawna: ${p.poprawna}`}
      </p>
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
        {surowy === "do-oceny" && (postep.samoocena[p.nr] === undefined ? "Spoza listy CKE: oceń sam" : postep.samoocena[p.nr] ? "Zaliczona przez ciebie" : "Niezaliczona przez ciebie")}
      </p>
      {surowy !== "dobrze" && (
        <div className={styles.key}>
          {p.oczekiwane?.length ? (
            <p>
              <span className="label">Oczekiwana</span> {p.oczekiwane.slice(0, 6).join(" / ")}
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
      {surowy === "do-oceny" && (
        <div className={styles.selfCheck}>
          <button type="button" className="btn btn-sm btn-secondary" aria-pressed={postep.samoocena[p.nr] === true} onClick={() => ocen(p.nr, true)}>
            Zaliczam
          </button>
          <button type="button" className="btn btn-sm btn-ghost" aria-pressed={postep.samoocena[p.nr] === false} onClick={() => ocen(p.nr, false)}>
            Nie zaliczam
          </button>
        </div>
      )}
    </div>
  );
}

