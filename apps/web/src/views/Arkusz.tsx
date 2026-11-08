import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Headphones, Pencil, RotateCcw, Timer, X } from "lucide-react";
import { useArkusz } from "../arkusze/dane";
import { pustyPostep, usePostep, type Brudnopis as ZapisBrudnopisu, type Czas, type Postep } from "../arkusze/postep";
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
import { Brudnopis, otworzNaPelnymEkranie, PokazDodatkoweRysunki } from "../components/Brudnopis";
import { TekstMat, WzorMat } from "../components/TekstMat";
import { Nagranie } from "../components/Nagranie";
import { Wypracowanie, type Temat } from "../components/Wypracowanie";
import { Ladowanie } from "../components/Ladowanie";
import { PoleMatematyczne } from "../components/PoleMatematyczne";
import { uplynelo, zapisCzasu, zatrzymaj, Zegar } from "../components/Zegar";
import { dodajCzas, minuty, norma, odmierz, opisTempa, tempo, zacznijOdmierzac } from "../arkusze/czasZadan";
import styles from "./Arkusz.module.css";

type Kontekst = {
  arkusz: ArkuszDane;
  postep: Postep;
  ustaw: (nr: string, wartosc: string) => void;
  ocen: (nr: string, ocena: boolean | number) => void;
  ustawBrudnopis: (zadanie: number, zapis: ZapisBrudnopisu | null) => void;
  pytania: Map<string, Pytanie>;
  luki: Map<Blok, Luka>; // zdania z luką na część odpowiedzi otwartej
  kadryTekst: Map<Blok, Blok[]>; // wycinki z luką jako tekst (tylko pełny ekran)
  lukiKadrow: Map<Blok, Luka>;
  obliczenia: Set<string>; // pytania, na które odpowiedzią jest rozwiązanie na płótnie
  kody: Map<string, WyborKodu>; // odpowiedzi kodem „A albo B oraz 1.–3.” jako wybór
  ukryteKodem: Set<Blok>; // bloki, które pokazują KodZWyborem i PrawdaFalszKod
  pf: Map<string, StwierdzeniaPF>; // odpowiedzi kodem P/F jako przełączniki przy zdaniach
  dwie: Map<string, WyborDwoch>; // „zapisz dwie odpowiedzi spośród A–F” jako wybór
  tabele: Map<string, TabelaDopasowania>; // „Uzupełnij tabelę” literami A–F
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
  useEffect(zacznijOdmierzac, [id]);
  // W trybie na czas długa cisza to też praca nad arkuszem, nie przerwa.
  const ciszaTezLiczy = !!postep.czas?.start;

  const kontekst = useMemo<Kontekst | null>(() => {
    if (!dane) return null;
    const pytania = new Map<string, Pytanie>();
    const wBloku = new Set<string>();
    const opcjeZadan = new Map<number, Opcja[]>();
    const luki = new Map<Blok, Luka>();
    const kadryTekst = new Map<Blok, Blok[]>();
    const lukiKadrow = new Map<Blok, Luka>();
    const obliczenia = new Set<string>();
    const kody = new Map<string, WyborKodu>();
    const ukryteKodem = new Set<Blok>();
    const pf = new Map<string, StwierdzeniaPF>();
    const dwie = new Map<string, WyborDwoch>();
    const tabele = new Map<string, TabelaDopasowania>();
    for (const z of dane.zadania) {
      for (const p of z.pytania) pytania.set(p.nr, p);
      (lukiZadania(z) ?? pojedynczeLuki(z)).forEach((l, b) => luki.set(b, l));
      pytaniaZObliczeniami(z).forEach((nr) => obliczenia.add(nr));
      tabeleDopasowania(z).forEach((t, nr) => tabele.set(nr, t));
      wyboryDwoch(z).forEach((w, nr) => {
        dwie.set(nr, w);
        w.ukryte.forEach((b) => ukryteKodem.add(b));
      });
      stwierdzeniaPF(z).forEach((w, nr) => {
        pf.set(nr, w);
        w.ukryte.forEach((b) => ukryteKodem.add(b));
      });
      kodyZWyborem(z).forEach((w, nr) => {
        kody.set(nr, w);
        w.ukryte.forEach((b) => ukryteKodem.add(b));
      });
      z.bloki.forEach((b, i) => {
        const k = kadrZLuka(b, z.bloki[i + 1], z);
        if (!k) return;
        kadryTekst.set(b, k.bloki);
        lukiKadrow.set(...k.luka);
      });
      for (const b of z.bloki) {
        if (b.typ === "pytanie") wBloku.add(b.nr);
        if (b.typ === "pytania" || b.typ === "tabela") b.nr.forEach((n) => wBloku.add(n));
        if (b.typ === "opcje" && !opcjeZadan.has(z.nr)) opcjeZadan.set(z.nr, b.opcje);
      }
    }
    return {
      arkusz: dane,
      luki,
      kadryTekst,
      lukiKadrow,
      obliczenia,
      kody,
      ukryteKodem,
      pf,
      dwie,
      tabele,
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
      ustaw: (nr, wartosc) => {
        const ms = odmierz(ciszaTezLiczy);
        zmien((p) =>
          p.sprawdzony || p.sprawdzoneZadania.includes(nrZadania(nr)) ? p : dodajCzas({ ...p, odpowiedzi: { ...p.odpowiedzi, [nr]: wartosc } }, nrZadania(nr), ms),
        );
      },
      ocen: (nr, ocena) => zmien((p) => ({ ...p, samoocena: { ...p.samoocena, [nr]: ocena } })),
      // Brudnopis to pomoc, więc działa także po sprawdzeniu zadania.
      ustawBrudnopis: (zadanie, zapis) => {
        const ms = odmierz(ciszaTezLiczy);
        zmien((p) => {
          const brudnopisy = { ...p.brudnopisy };
          if (zapis) brudnopisy[zadanie] = zapis;
          else delete brudnopisy[zadanie];
          // Rysowanie po sprawdzeniu to już nie rozwiązywanie, więc nie dolicza czasu.
          const liczy = !p.sprawdzony && !p.sprawdzoneZadania.includes(Number(zadanie));
          if (!liczy) return { ...p, brudnopisy };
          // Przy „Zapisz obliczenia” odpowiedzią jest szkic: jest szkic, jest odpowiedź do oceny.
          const odpowiedzi = { ...p.odpowiedzi };
          for (const nr of obliczenia) if (nrZadania(nr) === Number(zadanie)) odpowiedzi[nr] = zapis ? ODPOWIEDZ_NA_PLOTNIE : "";
          return dodajCzas({ ...p, brudnopisy, odpowiedzi }, Number(zadanie), ms);
        });
      },
    };
  }, [dane, postep, zmien, sprawdzone, otwartaLuka, ciszaTezLiczy]);

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

  usePrzewiniecie(id, !!dane);

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
    zmien((p) => ({
      ...p,
      sprawdzony: true,
      wynik: { zdobyte: wynik.zdobyte, mozliwe: wynik.mozliwe, kiedy: new Date().toISOString() },
      czas: p.czas && zatrzymaj(p.czas),
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const odNowa = () => {
    zmien(() => pustyPostep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const sprawdzZadanie = (nr: number) => {
    const ms = odmierz(ciszaTezLiczy);
    zmien((p) => dodajCzas({ ...p, sprawdzoneZadania: [...new Set([...p.sprawdzoneZadania, nr])] }, nr, ms));
  };
  // Poprawa zadania: odpowiedzi zostają, znika ocena i samoocena jego pytań.
  const poprawZadanie = (z: Zadanie) =>
    zmien((p) => {
      const samoocena = { ...p.samoocena };
      for (const q of z.pytania) delete samoocena[q.nr];
      const sprawdzoneZadania = p.sprawdzony ? dane.zadania.map((x) => x.nr) : p.sprawdzoneZadania;
      return { ...p, samoocena, sprawdzony: false, wynik: undefined, sprawdzoneZadania: sprawdzoneZadania.filter((n) => n !== z.nr) };
    });

  const ustawCzas = (c: Czas | undefined) => zmien((p) => ({ ...p, czas: c }));
  const naCzas = () => ustawCzas({ start: Date.now(), zuzyte: 0 });

  const odpowiedziane = [...kontekst.pytania.keys()].filter((nr) => postep.odpowiedzi[nr]?.trim()).length;

  return (
    <Ctx.Provider value={kontekst}>
      <main className={`container ${styles.page}`}>
        <Naglowek arkusz={dane} onNaCzas={dane.czas && !postep.czas && !postep.sprawdzony ? naCzas : undefined} />

        {postep.sprawdzony && <Podsumowanie wynik={wynik} odNowa={odNowa} czas={postep.czas} limitMin={dane.czas} arkusz={dane} postep={postep} />}
        {postep.czas && !postep.sprawdzony && dane.czas && <Zegar arkusz={dane.id} limitMin={dane.czas} czas={postep.czas} onZmien={ustawCzas} />}

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

// Przewinięcie arkusza przetrwa odświeżenie strony (w obrębie karty przeglądarki).
// Zapisujemy zadanie u góry ekranu i przesunięcie względem niego, a nie same piksele:
// treść nad nim dochodzi asynchronicznie (wzory, obrazki, brudnopisy) i zmienia wysokość.
// Powrót ponawiamy przez kilka sekund, chyba że uczeń sam zacznie przewijać.
type Miejsce = { zadanie: string; przesuniecie: number };

function usePrzewiniecie(id: string, gotowe: boolean) {
  useEffect(() => {
    if (!gotowe) return;
    const klucz = `sedno.przewiniecie.${id}`;
    const zadania = () => [...document.querySelectorAll<HTMLElement>('section[id^="zadanie-"]')];
    const gora = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;

    let miejsce: Miejsce | null = null;
    try {
      const zapis = JSON.parse(sessionStorage.getItem(klucz) ?? "null");
      if (typeof zapis?.zadanie === "string" && typeof zapis.przesuniecie === "number") miejsce = zapis;
    } catch {
      // zablokowany storage albo stary zapis: zaczynamy od góry
    }
    const poprzednie = history.scrollRestoration;
    history.scrollRestoration = "manual";

    let wraca = !!miejsce;
    let klatka = 0;
    let proby = 0;
    const wroc = () => {
      const el = miejsce && document.getElementById(miejsce.zadanie);
      if (!el || !miejsce) {
        wraca = false;
        return;
      }
      const cel = Math.max(0, gora(el) + miejsce.przesuniecie);
      if (Math.abs(window.scrollY - cel) > 1) window.scrollTo(0, cel);
      // Ok. 5 s: tyle zwykle dochodzą wzory i obrazki.
      if (proby++ < 300) klatka = requestAnimationFrame(wroc);
      else wraca = false;
    };
    if (wraca) wroc();
    const przerwij = () => {
      wraca = false;
      cancelAnimationFrame(klatka);
    };

    let timer = 0;
    const naPrzewiniecie = () => {
      if (wraca) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const lista = zadania();
        // Pierwsze zadanie zaczynające się na ekranie: zmiany wysokości nad nim nie przesuną widoku.
        const u = lista.find((el) => el.getBoundingClientRect().top >= 0) ?? lista[lista.length - 1];
        if (!u) return;
        const zapis: Miejsce = { zadanie: u.id, przesuniecie: Math.round(window.scrollY - gora(u)) };
        try {
          sessionStorage.setItem(klucz, JSON.stringify(zapis));
        } catch {
          // brak miejsca albo zablokowany storage
        }
      }, 150);
    };
    const wejscia = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    wejscia.forEach((w) => window.addEventListener(w, przerwij, { passive: true }));
    window.addEventListener("scroll", naPrzewiniecie, { passive: true });
    return () => {
      przerwij();
      window.clearTimeout(timer);
      wejscia.forEach((w) => window.removeEventListener(w, przerwij));
      window.removeEventListener("scroll", naPrzewiniecie);
      history.scrollRestoration = poprzednie;
    };
  }, [id, gotowe]);
}

function Naglowek({ arkusz, onNaCzas }: { arkusz: ArkuszDane; onNaCzas?: () => void }) {
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
      {(arkusz.pdf?.arkusz || arkusz.pdf?.zasady || onNaCzas) && (
        <div className={styles.pdfs}>
          {onNaCzas && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onNaCzas}>
              <Timer size={16} aria-hidden="true" /> Rozwiąż na czas
            </button>
          )}
          {arkusz.pdf?.arkusz && (
            <a className="btn btn-secondary btn-sm" href={arkusz.pdf?.arkusz} target="_blank" rel="noreferrer">
              <FileText size={16} aria-hidden="true" /> Arkusz PDF
            </a>
          )}
          {arkusz.pdf?.zasady && (
            <a className="btn btn-ghost btn-sm" href={arkusz.pdf?.zasady} target="_blank" rel="noreferrer">
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

function Podsumowanie({
  wynik,
  odNowa,
  czas,
  limitMin,
  arkusz,
  postep,
}: {
  wynik: ReturnType<typeof policz>;
  odNowa: () => void;
  czas?: Czas;
  limitMin?: number;
  arkusz: ArkuszDane;
  postep: Postep;
}) {
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
      {czas && (
        <p className="muted">
          Czas: {zapisCzasu(uplynelo(czas))}
          {limitMin ? ` z ${limitMin} minut${uplynelo(czas) > limitMin * 60_000 ? ", po czasie" : ""}.` : "."}
        </p>
      )}
      <TempoZadan arkusz={arkusz} postep={postep} />
      <button type="button" className="btn btn-ghost btn-sm" onClick={odNowa}>
        <RotateCcw size={16} aria-hidden="true" /> Rozwiąż od nowa
      </button>
    </section>
  );
}

/** Zadania, przy których czas razem z wynikiem coś mówi: długo i źle, długo i dobrze, szybko i źle. */
function TempoZadan({ arkusz, postep }: { arkusz: ArkuszDane; postep: Postep }) {
  const czasy = postep.czasZadan ?? {};
  if (!Object.keys(czasy).length) return null;
  const wiersze = arkusz.zadania.flatMap((z) => {
    const ms = czasy[z.nr];
    if (!ms) return [];
    const w = policzPytania(z.pytania, postep.odpowiedzi, postep.samoocena);
    const t = tempo(ms, norma(arkusz, z), w.mozliwe ? w.zdobyte / w.mozliwe : null);
    return t && t !== "w-normie" ? [{ z, ms, t, n: norma(arkusz, z)! }] : [];
  });
  return (
    <div className={styles.tempo}>
      <span className="label">Czas przy zadaniach</span>
      {wiersze.length ? (
        <ul>
          {wiersze.slice(0, 5).map(({ z, ms, t, n }) => (
            <li key={z.nr}>
              <a href={`#zadanie-${z.nr}`}>Zadanie {z.nr}.</a>
              <span>
                {minuty(ms)} <span className="muted">(norma ok. {minuty(n)})</span>
              </span>
              <span className="muted">{opisTempa[t]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Tempo w normie przy wszystkich zadaniach, przy których był mierzony czas.</p>
      )}
      <p className="small muted">Czas liczymy od poprzedniej czynności w arkuszu, bez chwil poza kartą. Norma to czas arkusza proporcjonalnie do punktów.</p>
    </div>
  );
}

function ZadanieWidok({ zadanie, onSprawdz, onPopraw }: { zadanie: Zadanie; onSprawdz: () => void; onPopraw: () => void }) {
  const { arkusz, postep, wBloku, sprawdzone, ustawBrudnopis, luki, tabele } = useCtx();
  const pisemna = zadanie.pytania[0]?.typ === "wypowiedz";
  const gotowe = sprawdzone(`${zadanie.nr}.`);
  const wTekscie = zadanie.pytania.filter((p) => !wBloku.has(p.nr) && p.typ !== "wypowiedz");
  const wynik = policzPytania(zadanie.pytania, postep.odpowiedzi, postep.samoocena);
  const odpowiedziane = zadanie.pytania.filter((p) => postep.odpowiedzi[p.nr]?.trim()).length;

  // Wypowiedź pisemna: tematy do wyboru i elementy treści trafiają do edytora.
  const pisanie = useMemo(() => (pisemna ? rozbierzPolecenie(zadanie) : null), [pisemna, zadanie]);
  const { ukryteKodem } = useCtx();
  const bloki = (pisanie ? zadanie.bloki.filter((b) => !pisanie.ukryte.has(b)) : zadanie.bloki).filter((b) => !ukryteKodem.has(b));

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
        <span className="small muted">
          {gotowe && !pisemna ? `${wynik.zdobyte} / ${zadanie.punkty} pkt` : `0–${zadanie.punkty} pkt`}
          {gotowe && postep.czasZadan?.[zadanie.nr] ? ` · ${minuty(postep.czasZadan[zadanie.nr]!)}` : ""}
        </span>
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
          dodatkoweRysunki={zadanie.pytania.flatMap((p) => tabele.get(p.nr)?.kadry ?? []).flatMap((k) => (k.typ === "kadr" ? [k.obraz] : []))}
          zapis={postep.brudnopisy?.[zadanie.nr]}
          onZmiana={(zapis) => ustawBrudnopis(zadanie.nr, zapis)}
          tresc={
            <Kompakt.Provider value={true}>
              <TrescKompakt zadanie={zadanie} bloki={bloki} />
            </Kompakt.Provider>
          }
          duzyRysunek={[...luki.values()].some((l) => l.ile > 1 && zadanie.pytania.includes(l.pytanie))}
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

// Treść zadania nad brudnopisem na pełnym ekranie: cała szerokość, gęściej.
// Zadanie z jednym pytaniem: numer i treść po lewej, odpowiedzi po prawej.
function TrescKompakt({ zadanie, bloki: wszystkie }: { zadanie: Zadanie; bloki: Blok[] }) {
  const { arkusz, sprawdzone, wBloku, luki, kadryTekst, lukiKadrow, obliczenia, pf, tabele } = useCtx();
  const plik = `${arkusz.id}-${zadanie.nr}`;
  // Odpowiedzi w lukach zdań: bez kolumny odpowiedzi, po prawej staje rysunek.
  const zLukami = [...luki.values()].some((l) => l.ile > 1 && zadanie.pytania.includes(l.pytanie));
  const i = arkusz.zadania.findIndex((z) => z.nr === zadanie.nr);
  const [poprzednie, nastepne] = [arkusz.zadania[i - 1], arkusz.zadania[i + 1]];
  // Rysunek zadania i tak leży na płótnie brudnopisu: nie powtarzamy go, a wycinek
  // strony z opcjami na rysunku albo z luką zastępujemy jego tekstem.
  const naRysunku = !!zadanie.rysunek && zadanie.pytania.length === 1 && zadanie.pytania[0].typ === "zamkniete" && !zadanie.pytania[0].opcje?.length;
  const pierwszyNaglowek = wszystkie.findIndex((b) => b.typ === "naglowek");
  // Tabela przyporządkowania: wykresy opcji są na płótnie, nad nim zostaje tekst polecenia.
  const kadryTabel = new Map<Blok, Blok[]>();
  for (const p of zadanie.pytania) {
    const t = tabele.get(p.nr);
    t?.kadry.forEach((k, i) => kadryTabel.set(k, i === 0 ? naAkapity(t.wstep) : []));
  }
  const calosc = (zadanie.rysunek ? wszystkie.filter((b) => b.typ !== "rysunek") : wszystkie).flatMap((b) =>
    kadryTabel.has(b)
      ? kadryTabel.get(b)!
      : b.typ === "kadr" && naRysunku
      ? (kadrJakoTekst(b.tekst) ?? [b])
      : b.typ === "kadr" && zadanie.rysunek && pierwszyNaglowek > 0 && wszystkie.indexOf(b) < pierwszyNaglowek
        ? (wstepBezRysunku(b.tekst) ?? [b])
        : (kadryTekst.get(b) ?? [b]),
  );
  const podzial = zLukami ? null : podzielNaPodpunkty(calosc);
  const [podpunkt, setPodpunkt] = useState(() => (podzial ? startowyPodpunkt(plik, podzial.podpunkty.length) : 0));
  useEffect(() => {
    try {
      sessionStorage.setItem(kluczPodpunktu(plik), String(podpunkt));
    } catch {
      // zablokowany storage: po odświeżeniu pierwszy podpunkt
    }
  }, [plik, podpunkt]);
  const ilePodpunktow = podzial?.podpunkty.length ?? 1;
  const aktywny = podzial ? podzial.podpunkty[Math.min(podpunkt, ilePodpunktow - 1)] : null;
  // Nagłówek podpunktu („Zadanie 12.1 (0–2 pkt)”) zastępuje numer w nagłówku widoku.
  const bloki = podzial && aktywny ? [...podzial.wstep, ...aktywny.filter((b) => b.typ !== "naglowek")] : calosc;
  const numer = (aktywny && numerPodpunktu(aktywny)) ?? String(zadanie.nr);
  // Wykresy opcji A–F na płótnie tylko przy podpunkcie z tabelą przyporządkowania.
  const ustawDodatkowe = useContext(PokazDodatkoweRysunki);
  const zTabela = !aktywny || aktywny.some((b) => b.typ === "pytanie" && tabele.has(b.nr));
  useEffect(() => ustawDodatkowe(zTabela), [ustawDodatkowe, zTabela]);

  const wstecz = () => {
    if (podzial && podpunkt > 0) return setPodpunkt(podpunkt - 1);
    if (!poprzednie) return;
    wejscieOdKonca = true;
    otworzNaPelnymEkranie(`${arkusz.id}-${poprzednie.nr}`);
  };
  const dalej = () => {
    if (podzial && podpunkt < ilePodpunktow - 1) return setPodpunkt(podpunkt + 1);
    if (nastepne) otworzNaPelnymEkranie(`${arkusz.id}-${nastepne.nr}`);
  };
  const jestWstecz = (podzial && podpunkt > 0) || !!poprzednie;
  const jestDalej = (podzial && podpunkt < ilePodpunktow - 1) || !!nastepne;

  const pytaniaBloki = bloki.filter(czyPytanie);
  // Odpowiedź w luce tekstu (wycinek zamieniony na tekst) nie potrzebuje prawej kolumny.
  // Rozwiązanie na płótnie i stwierdzenia P/F zostają w głównej kolumnie, bez prawej.
  const naPlotnie = pytaniaBloki.length === 1 && pytaniaBloki[0].typ === "pytanie" && (obliczenia.has(pytaniaBloki[0].nr) || pf.has(pytaniaBloki[0].nr));
  const obok = pytaniaBloki.length === 1 && !zLukami && !naPlotnie && !bloki.some((b) => lukiKadrow.has(b));
  const gotowe = sprawdzone(`${zadanie.nr}.`);
  const wTekscie = zadanie.pytania.filter((p) => !wBloku.has(p.nr) && p.typ !== "wypowiedz");
  const polecenie = zadanie.polecenie.map((p, i) => (
    <p key={i} className={styles.instruction}>
      {p}
    </p>
  ));
  const klucz = gotowe && wTekscie.length > 0 && (
    <div className={styles.keyList}>
      {wTekscie.map((p) => (
        <Informacja key={p.nr} pytanie={p} zNumerem />
      ))}
    </div>
  );
  const tresc = (
    <div className={styles.kompakt}>
      <div className={styles.glowa}>
        <button
          type="button"
          className={`btn btn-ghost btn-sm ${styles.przejscie}`}
          disabled={!jestWstecz}
          onClick={wstecz}
          aria-label="Poprzednie zadanie"
          title="Poprzednie zadanie"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <h2 className="h3">Zadanie {numer}.</h2>
        <button
          type="button"
          className={`btn btn-ghost btn-sm ${styles.przejscie}`}
          disabled={!jestDalej}
          onClick={dalej}
          aria-label="Następne zadanie"
          title="Następne zadanie"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        {podzial && (
          <span className="small muted">
            podpunkt {podpunkt + 1} z {ilePodpunktow}
          </span>
        )}
      </div>
      {polecenie}
      <div className={obok || zLukami || podzial ? styles.content : `${styles.content} ${styles.szpalty}`}>
        <BlokiKompakt elementy={grupujPrawdaFalsz(obok ? bloki.filter((b) => b !== pytaniaBloki[0]) : bloki, zadanie)} zadanie={zadanie.nr} />
      </div>
      {klucz}
    </div>
  );
  return <NumerWidoku.Provider value={numer}>{uklad()}</NumerWidoku.Provider>;

  function uklad() {
  if (zLukami && zadanie.rysunek)
    return (
      <div className={styles.obok}>
        {tresc}
        <div className={`${styles.kompakt} ${styles.odpowiedzi}`}>
          <Kadr obraz={zadanie.rysunek} tekst="Rysunek do zadania" />
        </div>
      </div>
    );
  if (!obok) return tresc;
  // Odpowiedzi w prawej kolumnie: nie spychają płótna w dół. Litery do opcji
  // z rysunku stoją jedna pod drugą, jak opcje na rysunku.
  return (
    <div className={naRysunku ? `${styles.obok} ${styles.pionowo}` : styles.obok}>
      {tresc}
      <div className={`${styles.kompakt} ${styles.odpowiedzi}`}>
        <BlokWidok blok={pytaniaBloki[0]} zadanie={zadanie.nr} />
      </div>
    </div>
  );
  }
}

// Pytanie otwarte z poleceniem „Zapisz obliczenia.” (albo rozumowanie, dowód) oceniane według
// schematu: odpowiedzią jest rozwiązanie na płótnie brudnopisu, bez pola na wynik.
const POLECENIE_OBLICZEN = /Zapisz obliczenia|Zapisz rozumowanie|Zapisz rozwiązanie|Przeprowadź dowód/i;
const ODPOWIEDZ_NA_PLOTNIE = "rozwiązanie w brudnopisie";

function pytaniaZObliczeniami(z: Zadanie): string[] {
  const wynik: string[] = [];
  let polecenia = z.polecenie.join(" ");
  for (const b of z.bloki) {
    if (b.typ === "akapit" || b.typ === "kadr") polecenia += " " + b.tekst;
    if (b.typ !== "pytanie") continue;
    const p = z.pytania.find((q) => q.nr === b.nr);
    if (p?.typ === "otwarte" && !p.tresc && !p.kod && !p.oczekiwane?.length && !p.akceptowane?.length && POLECENIE_OBLICZEN.test(polecenia)) wynik.push(p.nr);
    polecenia = "";
  }
  return wynik;
}

// Zadanie otwarte z kilkoma zdaniami do uzupełnienia („1. Dziedziną funkcji f jest
// przedział …… .”): klucz CKE ma jedno pytanie za kilka punktów, ale uczeń wpisuje
// osobną odpowiedź w każdą lukę. Części trzymamy w jednej odpowiedzi, linia po linii.
type Luka = { pytanie: PytanieOtwarte; czesc: number; ile: number };
const ZNACZNIK_LUKI = /…{2,}|\.{4,}/;

function lukiZadania(z: Zadanie): Map<Blok, Luka> | null {
  const [p] = z.pytania;
  if (z.pytania.length !== 1 || p.typ !== "otwarte" || p.tresc) return null;
  const zdania = z.bloki.filter((b) => b.typ === "akapit" && !b.polecenie && ZNACZNIK_LUKI.test(b.tekst));
  if (zdania.length < 2) return null;
  return new Map(zdania.map((b, czesc) => [b, { pytanie: p, czesc, ile: zdania.length }]));
}

// Pytanie otwarte z jednym zdaniem do dokończenia („Zbiorem … jest przedział …… .”):
// odpowiedź wpisuje się w lukę tego zdania, bez osobnego pola pod nim.
function pojedynczeLuki(z: Zadanie): Map<Blok, Luka> {
  const wynik = new Map<Blok, Luka>();
  let sekcja: Blok[] = [];
  for (const b of z.bloki) {
    if (b.typ !== "pytanie") {
      sekcja.push(b);
      continue;
    }
    const p = z.pytania.find((q) => q.nr === b.nr);
    const zLuka = sekcja.filter((x) => x.typ === "akapit" && !x.polecenie && ZNACZNIK_LUKI.test(x.tekst));
    const obliczenia = POLECENIE_OBLICZEN.test(sekcja.map((x) => ("tekst" in x ? x.tekst : "")).join(" "));
    if (p?.typ === "otwarte" && !p.tresc && !p.kod && !obliczenia && zLuka.length === 1) wynik.set(zLuka[0], { pytanie: p, czesc: 0, ile: 1 });
    sekcja = [];
  }
  return wynik;
}

const czesciOdpowiedzi = (odpowiedz: string | undefined, ile: number) => {
  const czesci = (odpowiedz ?? "").split("\n");
  return Array.from({ length: ile }, (_, i) => czesci[i] ?? "");
};

function ZdanieZLuka({ tekst, luka }: { tekst: string; luka: Luka }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const { pytanie: p, czesc, ile } = luka;
  const czesci = czesciOdpowiedzi(postep.odpowiedzi[p.nr], ile);
  const m = tekst.match(ZNACZNIK_LUKI)!;
  const [przed, po] = [tekst.slice(0, m.index), tekst.slice(m.index! + m[0].length)];
  return (
    <div className={`${styles.para} ${styles.zdanieLuka}`}>
      <Tekst tekst={przed} />
      {ile === 1 && (p.oczekiwane?.length || p.akceptowane?.length) ? (
        // Odpowiedź porównywana z kluczem jako tekst: zwykłe pole w luce.
        <LukaTekst pytanie={p} bezNumeru />
      ) : (
      <PoleMatematyczne
        wartosc={czesci[czesc]}
        tylkoOdczyt={sprawdzone(p.nr)}
        etykieta={`Odpowiedź ${p.nr}, zdanie ${czesc + 1}`}
        onZmiana={(latex) => {
          const nowe = czesciOdpowiedzi(postep.odpowiedzi[p.nr], ile);
          nowe[czesc] = latex.replace(/\n/g, " ");
          // Puste części na końcu nie liczą się jako odpowiedź.
          ustaw(p.nr, nowe.join("\n").replace(/\n+$/, ""));
        }}
      />
      )}
      <Tekst tekst={po} />
    </div>
  );
}

// Zadanie z podpunktami (12.1, 12.2, 12.3): na pełnym ekranie każdy podpunkt to osobny
// krok ze wspólnym wstępem, a strzałki przechodzą 12.1 → 12.2 → 12.3 → 13. Płótno
// zostaje jedno na całe zadanie. Podpunkt to bloki od nagłówka do jego pytania.
const czyPytanie = (b: Blok) => b.typ === "pytanie" || b.typ === "pytania" || b.typ === "tabela";

function podzielNaPodpunkty(bloki: Blok[]): { wstep: Blok[]; podpunkty: Blok[][] } | null {
  const pierwszy = bloki.findIndex((b) => b.typ === "naglowek");
  if (pierwszy < 0) return null;
  const podpunkty: Blok[][] = [];
  let biezacy: Blok[] = [];
  for (const b of bloki.slice(pierwszy)) {
    // Po pytaniu kolejny blok (nagłówek albo wycinek bez nagłówka) zaczyna nowy podpunkt.
    if (biezacy.some(czyPytanie) && !czyPytanie(b)) {
      podpunkty.push(biezacy);
      biezacy = [];
    }
    biezacy.push(b);
  }
  if (biezacy.length) podpunkty.push(biezacy);
  return podpunkty.length >= 2 && podpunkty.every((pp) => pp.some(czyPytanie)) ? { wstep: bloki.slice(0, pierwszy), podpunkty } : null;
}

// Numer podpunktu z jego pytania („12.1”), do nagłówka zamiast „Zadanie 12.1 (0–2 pkt)”.
function numerPodpunktu(bloki: Blok[]): string | null {
  const b = bloki.find(czyPytanie);
  if (!b) return null;
  return b.typ === "pytanie" ? b.nr : b.typ === "pytania" || b.typ === "tabela" ? (b.nr[0] ?? null) : null;
}

// Który podpunkt pokazać po wejściu: zapamiętany w karcie przeglądarki albo, przy
// cofaniu się strzałką z następnego zadania, ostatni.
let wejscieOdKonca = false;
const kluczPodpunktu = (plik: string) => `sedno.podpunkt.${plik}`;

function startowyPodpunkt(plik: string, ile: number): number {
  if (wejscieOdKonca) {
    wejscieOdKonca = false;
    return ile - 1;
  }
  try {
    const n = Number(sessionStorage.getItem(kluczPodpunktu(plik)));
    return Number.isInteger(n) && n >= 0 && n < ile ? n : 0;
  } catch {
    return 0;
  }
}

// Wycinek strony z luką do pytania otwartego („Suma 𝑥1 + 𝑥2 jest równa ……… .”): na pełnym
// ekranie jako tekst z polem w luce, z nagłówkiem podpunktu, którego w tekście wycinka nie ma.
function kadrZLuka(kadr: Blok, nastepny: Blok | undefined, z: Zadanie): { bloki: Blok[]; luka: [Blok, Luka] } | null {
  if (kadr.typ !== "kadr" || nastepny?.typ !== "pytanie" || !ZNACZNIK_LUKI.test(kadr.tekst)) return null;
  const p = z.pytania.find((q) => q.nr === nastepny.nr);
  if (p?.typ !== "otwarte" || p.tresc) return null;
  const akapity = naAkapity(kadr.tekst);
  const zLuka = akapity.find((a) => a.typ === "akapit" && ZNACZNIK_LUKI.test(a.tekst));
  if (!zLuka) return null;
  const naglowek: Blok[] = p.nr.includes(".") ? [{ typ: "naglowek", tekst: `Zadanie ${p.nr} (0–${p.punkty} pkt)` }] : [];
  return { bloki: [...naglowek, ...akapity], luka: [zLuka, { pytanie: p, czesc: 0, ile: 1 }] };
}

// Pełny ekran brudnopisu: gęstszy układ i zamiana wycinków na tekst tam, gdzie się da.
const Kompakt = createContext(false);
// Numer w nagłówku pełnego ekranu: pytanie o tym samym numerze go nie powtarza.
const NumerWidoku = createContext<string | null>(null);

// Tekst wycinka strony (z PDF) bez etykiet opcji, które są na rysunku: „Dana jest
// nierówność 3 − 2(1 − 2𝑥) ≥ 2𝑥 − 17 Na którym rysunku… A. 0 1 3 𝑥 B. …”.
// Nowe zdanie po wzorze zaczyna akapit, a polecenia („Wybierz…”) są pogrubione jak w arkuszu.
const POLECENIA = /^(Wybierz|Zapisz|Uzupełnij|Wpisz|Oblicz|Rozwiąż|Wykaż|Podaj|Zaznacz|Oceń)(?=\s)/;

function kadrJakoTekst(tekst: string): Blok[] | null {
  const opcje = tekst.search(/\sA\.\s[\s\S]*\sB\.\s[\s\S]*\sC\.\s[\s\S]*\sD\.\s/);
  if (opcje < 0) return null;
  const tresc = tekst.slice(0, opcje).trim();
  return tresc ? naAkapity(tresc) : null;
}

function naAkapity(tresc: string): Blok[] {
  return tresc
    .split(/(?<=[.?!])\s+|(?<=[\d)\]\u{1D400}-\u{1D7FF}])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż])/u)
    .filter(Boolean)
    .map((zdanie): Blok => ({ typ: "akapit", tekst: zdanie, polecenie: POLECENIA.test(zdanie) }));
}

// Krótki wzór między akapitami („Liczba … jest równa”) w gęstym widoku idzie w jednej linii z tekstem.
// Ułamki i potęgi zostają w stylu wystawionym (\displaystyle), żeby w linii nie maleły.
const WZOR_W_LINII = 160;
const doLinii = (b: Blok | PytanieZamkniete[]) =>
  !Array.isArray(b) && ((b.typ === "akapit" && !b.polecenie) || (b.typ === "wzor" && b.tex.length <= WZOR_W_LINII));

const czyZdanieNumerowane = (b: Blok | PytanieZamkniete[]) => !Array.isArray(b) && b.typ === "akapit" && !b.polecenie && /^\d+\.\s/.test(b.tekst);

function BlokiKompakt({ elementy, zadanie }: { elementy: (Blok | PytanieZamkniete[])[]; zadanie: number }) {
  const { luki, lukiKadrow } = useCtx();
  const wynik: ReactNode[] = [];
  for (let i = 0; i < elementy.length; ) {
    const b = elementy[i];
    // Zdania do uzupełnienia („1. Dziedziną funkcji … jest przedział …… .”) w dwóch kolumnach.
    let n = i;
    while (n < elementy.length && czyZdanieNumerowane(elementy[n])) n++;
    if (n - i >= 2) {
      wynik.push(
        <ol key={i} className={styles.zdania}>
          {(elementy.slice(i, n) as Blok[]).map((c, k) => (
            <li key={k} className={styles.para}>
              {c.typ === "akapit" && ((l) => (l ? <ZdanieZLuka tekst={c.tekst} luka={l} /> : <Tekst tekst={c.tekst} />))(luki.get(c) ?? lukiKadrow.get(c))}
            </li>
          ))}
        </ol>,
      );
      i = n;
      continue;
    }
    let j = i;
    while (j < elementy.length && doLinii(elementy[j])) j++;
    const ciag = elementy.slice(i, j) as Blok[];
    if (ciag.some((c) => c.typ === "wzor")) {
      wynik.push(
        <div key={i} className={styles.para}>
          {ciag.map((c, k) => (
            <span key={k}>
              {k > 0 && " "}
              {c.typ === "wzor" ? <WzorMat tex={`\\displaystyle ${c.tex}`} /> : c.typ === "akapit" ? <Tekst tekst={c.tekst} /> : null}
            </span>
          ))}
        </div>,
      );
      i = j;
      continue;
    }
    wynik.push(Array.isArray(b) ? <PrawdaFalsz key={i} pytania={b} /> : <BlokWidok key={i} blok={b} zadanie={zadanie} />);
    i++;
  }
  return <>{wynik}</>;
}

function BlokWidok({ blok, zadanie }: { blok: Blok; zadanie: number }) {
  const { pytania, luki, lukiKadrow } = useCtx();
  const kompakt = useContext(Kompakt);
  switch (blok.typ) {
    case "akapit": {
      const luka = luki.get(blok) ?? (kompakt ? lukiKadrow.get(blok) : undefined);
      if (luka) return <ZdanieZLuka tekst={blok.tekst} luka={luka} />;
    }
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
      // Na pełnym ekranie wąska, wysoka tabela (Ocena | Liczba uczniów, 6 wierszy) idzie
      // w poprzek: nagłówki w pierwszej kolumnie, wartości obok, więc zajmuje dwa wiersze.
      if (kompakt && blok.wiersze[0]?.length <= 3 && blok.wiersze.length > 3)
        return (
          <div className={styles.dataTableWrap}>
            <table className={styles.dataTable}>
              <tbody>
                {blok.wiersze[0].map((naglowek, j) => (
                  <tr key={j}>
                    <th scope="row">
                      <Tekst tekst={naglowek} />
                    </th>
                    {blok.wiersze.slice(1).map((w, i) => (
                      <td key={i}>
                        <Tekst tekst={w[j] ?? ""} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
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
  const { luki, lukiKadrow, obliczenia, kody, pf, dwie, tabele } = useCtx();
  const kompakt = useContext(Kompakt);
  const numerWidoku = useContext(NumerWidoku);
  if (p.typ === "wypowiedz") return null;
  const zNumerem = p.nr.includes(".") && p.nr !== numerWidoku;
  // Odpowiedź w lukach zdań (ZdanieZLuka): tu zostaje tylko informacja po sprawdzeniu.
  const wLukach = new Set([...luki.values(), ...(kompakt ? lukiKadrow.values() : [])].map((l) => l.pytanie.nr));
  return (
    <div className={styles.question}>
      {/* Numer bez podpunktu to numer zadania, który stoi już w nagłówku. */}
      {(zNumerem || p.tresc) && (
        <div className={styles.stem}>
          {zNumerem && <span className={styles.qnr}>{p.nr}.</span>}
          {p.tresc && <Tekst tekst={p.tresc} wlasny={p.nr} />}
        </div>
      )}
      {p.typ === "zamkniete" && (p.opcje?.length ? <Opcje pytanie={p} /> : <Suwak pytanie={p} />)}
      {p.typ === "otwarte" && kody.has(p.nr) && <KodZWyborem pytanie={p} wybor={kody.get(p.nr)!} />}
      {p.typ === "otwarte" && pf.has(p.nr) && <PrawdaFalszKod pytanie={p} stwierdzenia={pf.get(p.nr)!} />}
      {p.typ === "otwarte" && dwie.has(p.nr) && <WyborKilku pytanie={p} wybor={dwie.get(p.nr)!} />}
      {p.typ === "otwarte" && tabele.has(p.nr) && <TabelaDopasowaniaWidok pytanie={p} tabela={tabele.get(p.nr)!} />}
      {obliczenia.has(p.nr) && <p className="small muted">Obliczenia zapisz w brudnopisie. Po sprawdzeniu ocenisz je według schematu CKE.</p>}
      {p.typ === "otwarte" && !p.tresc.includes(`{{${p.nr}}}`) && !wLukach.has(p.nr) && !obliczenia.has(p.nr) && !kody.has(p.nr) && !pf.has(p.nr) && !dwie.has(p.nr) && !tabele.has(p.nr) && (
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

// Ile opcji zmieści się w rzędzie w gęstym widoku (pełny ekran brudnopisu), po długości
// najdłuższej. Wzory liczymy bez poleceń LaTeX-a, bo na ekranie zajmują mniej.
function kolumnyOpcji(opcje: Opcja[]): 1 | 2 | 4 {
  const dlugosc = Math.max(...opcje.map((o) => o.tresc.replace(/\\[a-zA-Z]+/g, "").replace(/[{}\\()^_$\s]/g, "").length));
  return dlugosc <= 18 ? 4 : dlugosc <= 48 ? 2 : 1;
}

// Wstęp zadania jako wycinek strony z tym samym rysunkiem, który leży na płótnie: na pełnym
// ekranie zostaje sam tekst. Tekst z PDF kończy się podpisami osi („𝑦 10 9 8 … −6”),
// więc ucinamy go na ostatnim zdaniu przed ciągiem liczb.
function wstepBezRysunku(tekst: string): Blok[] | null {
  const osie = tekst.search(/(?:\s+(?:[−-]?\d+(?:[−-]\d+)*|[𝑥𝑦]|[A-F]\.)){6,}/u);
  if (osie < 0) return null;
  const koniec = Math.max(tekst.lastIndexOf(".", osie), tekst.lastIndexOf("?", osie), tekst.lastIndexOf("!", osie));
  return koniec > 0 ? naAkapity(tekst.slice(0, koniec + 1)) : null;
}

// Tabela przyporządkowania („Fragment wykresu funkcji 𝑦 = 𝑔(𝑥) przedstawiono na rysunku …”,
// klucz np. „AE”): każdy wiersz ma przełącznik liter A–F, a kod składa się z liter
// w kolejności wierszy. Wiersze to powtórzenia tego samego początku zdania po poleceniu.
type TabelaDopasowania = { wstep: string; wiersze: string[]; litery: string[]; kadry: Blok[] };

function tabeleDopasowania(z: Zadanie): Map<string, TabelaDopasowania> {
  const wynik = new Map<string, TabelaDopasowania>();
  let sekcja: Blok[] = [];
  for (const b of z.bloki) {
    if (b.typ !== "pytanie") {
      sekcja.push(b);
      continue;
    }
    const p = z.pytania.find((q) => q.nr === b.nr);
    const klucz = p?.typ === "otwarte" && p.kod ? p.oczekiwane?.[0] : undefined;
    const kadr = sekcja.find((x): x is Blok & { typ: "kadr"; tekst: string } => x.typ === "kadr" && /Uzupełnij tabelę/.test(x.tekst));
    const zakres = kadr?.tekst.match(/literami ([A-Z])[–-]([A-Z])\./);
    if (klucz && /^[A-Z]{2,}$/.test(klucz) && kadr && zakres) {
      const poPoleceniu = kadr.tekst.slice(kadr.tekst.indexOf(zakres[0]) + zakres[0].length);
      const tresc = poPoleceniu.slice(0, poPoleceniu.search(/\s[A-Z]\.\s/)).trim();
      const poczatek = tresc.split(/\s+/).slice(0, 3).join(" ");
      const wiersze = tresc
        .split(poczatek)
        .filter((w) => w.trim())
        .map((w) => `${poczatek}${w}`.trim());
      const litery = Array.from({ length: zakres[2].charCodeAt(0) - zakres[1].charCodeAt(0) + 1 }, (_, i) => String.fromCharCode(zakres[1].charCodeAt(0) + i));
      // Wycinki z wykresami opcji (A–F) idą na płótno; wstęp to tekst wycinka przed wierszami tabeli.
      const kadry = sekcja.filter((x) => x.typ === "kadr" && (x === kadr || /(^|\s)[A-Z]\.\s/.test(x.tekst)));
      const wstep = kadr.tekst.slice(0, kadr.tekst.indexOf(poczatek)).trim();
      if (wiersze.length === klucz.length) wynik.set(p!.nr, { wstep, wiersze, litery, kadry });
    }
    sekcja = [];
  }
  return wynik;
}

function PrzelacznikLiter({ litery, wybrana, poprawna, gotowe, onWybor, etykieta }: { litery: string[]; wybrana?: string; poprawna?: string; gotowe: boolean; onWybor: (w: string) => void; etykieta: string }) {
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  return (
    <div ref={kontener} className={styles.slider} role="radiogroup" aria-label={etykieta}>
      {ramka && <span className={styles.thumb} style={ramka} aria-hidden="true" />}
      {litery.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          data-litera={l}
          aria-checked={wybrana === l}
          className={styles.segment}
          data-stan={stanCzesci(wybrana, poprawna, l, gotowe)}
          disabled={gotowe}
          onClick={() => onWybor(wybrana === l ? "" : l)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function TabelaDopasowaniaWidok({ pytanie: p, tabela }: { pytanie: PytanieOtwarte; tabela: TabelaDopasowania }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const robocze = postep.odpowiedzi[`${p.nr}.wybor`] ?? postep.odpowiedzi[p.nr] ?? "";
  const wybory = tabela.wiersze.map((_, i) => (tabela.litery.includes(robocze[i]) ? robocze[i] : undefined));
  const klucz = p.oczekiwane?.[0] ?? "";
  const wybierz = (i: number, w: string) => {
    const nowe = wybory.map((x, j) => (j === i ? w || undefined : x));
    ustaw(`${p.nr}.wybor`, nowe.map((x) => x ?? "_").join(""));
    ustaw(p.nr, nowe.every(Boolean) ? nowe.join("") : "");
  };
  return (
    <div className={styles.pfWiersze}>
      {tabela.wiersze.map((w, i) => (
        <div key={i} className={styles.pfWiersz}>
          <p className={styles.para}>{w}</p>
          <PrzelacznikLiter litery={tabela.litery} wybrana={wybory[i]} poprawna={klucz[i]} gotowe={gotowe} etykieta={w} onWybor={(l) => wybierz(i, l)} />
        </div>
      ))}
    </div>
  );
}

// Odpowiedź kodem „Zapisz dwie właściwe odpowiedzi spośród oznaczonych literami A–F” (klucz
// np. „CE”): wszystkie opcje w jednej liście, wybór dwóch, a zdanie „…… oraz ……” wypełnia
// się wybranymi literami. Kod (litery w kolejności alfabetu) trafia do odpowiedzi dopiero
// przy dwóch wyborach; wybór w trakcie leży pod kluczem „11.wybor”.
type WyborDwoch = { zdanie: string; opcje: Opcja[]; ile: number; ukryte: Set<Blok> };
const OPCJA_W_AKAPICIE = /^([A-Z])\.\s+([\s\S]+)$/;

function wyboryDwoch(z: Zadanie): Map<string, WyborDwoch> {
  const wynik = new Map<string, WyborDwoch>();
  let sekcja: Blok[] = [];
  for (const b of z.bloki) {
    if (b.typ !== "pytanie") {
      sekcja.push(b);
      continue;
    }
    const p = z.pytania.find((q) => q.nr === b.nr);
    const klucz = p?.typ === "otwarte" && p.kod ? p.oczekiwane?.[0] : undefined;
    const opcje = sekcja.find((x) => x.typ === "opcje");
    const zdanie = sekcja.find((x) => x.typ === "akapit" && !x.polecenie && ZNACZNIK_LUKI.test(x.tekst));
    if (klucz && /^[A-Z]{2,}$/.test(klucz) && !/^[PF]+$/.test(klucz) && opcje?.typ === "opcje" && zdanie?.typ === "akapit") {
      const wAkapitach = sekcja.filter((x) => x.typ === "akapit" && !x.polecenie && OPCJA_W_AKAPICIE.test(x.tekst));
      const dodatkowe = wAkapitach.map((x) => {
        const [, litera, tresc] = (x as { tekst: string }).tekst.match(OPCJA_W_AKAPICIE)!;
        return { litera, tresc };
      });
      wynik.set(p!.nr, {
        zdanie: zdanie.tekst,
        opcje: [...opcje.opcje, ...dodatkowe].sort((a, c) => a.litera.localeCompare(c.litera)),
        ile: klucz.length,
        ukryte: new Set<Blok>([opcje, zdanie, ...wAkapitach]),
      });
    }
    sekcja = [];
  }
  return wynik;
}

function WyborKilku({ pytanie: p, wybor }: { pytanie: PytanieOtwarte; wybor: WyborDwoch }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const wybrane = [...(postep.odpowiedzi[`${p.nr}.wybor`] ?? postep.odpowiedzi[p.nr] ?? "")].filter((l) => wybor.opcje.some((o) => o.litera === l));
  const klucz = p.oczekiwane?.[0] ?? "";
  const przelacz = (l: string) => {
    // Trzeci wybór zastępuje najstarszy, żeby nie trzeba było najpierw odznaczać.
    const nowe = wybrane.includes(l) ? wybrane.filter((x) => x !== l) : [...wybrane, l].slice(-wybor.ile);
    ustaw(`${p.nr}.wybor`, nowe.join(""));
    ustaw(p.nr, nowe.length === wybor.ile ? [...nowe].sort().join("") : "");
  };
  const posortowane = [...wybrane].sort();
  let n = 0;
  const czesci = wybor.zdanie.split(/(…{2,}|\.{4,})/);
  return (
    <div className={styles.wieleWybor}>
      <p className={styles.para}>
        {czesci.map((c, i) =>
          i % 2 ? (
            <span key={i} className={styles.lukaLitera}>
              {posortowane[n++] ?? "……"}
            </span>
          ) : (
            <Tekst key={i} tekst={c} />
          ),
        )}
      </p>
      <div className={styles.choices} data-kolumny="2" role="group" aria-label={`Pytanie ${p.nr}: wybierz ${wybor.ile}`}>
        {wybor.opcje.map((o) => {
          const wybrana = wybrane.includes(o.litera);
          const stan = gotowe ? (klucz.includes(o.litera) ? (wybrana ? "trafiona" : "poprawna") : wybrana ? "bledna" : undefined) : wybrana ? "wybrana" : undefined;
          return (
            <button key={o.litera} type="button" role="checkbox" aria-checked={wybrana} className={styles.choice} data-stan={stan} disabled={gotowe} onClick={() => przelacz(o.litera)}>
              <span className={styles.letter}>{o.litera}</span>
              <span>
                <Tekst tekst={o.tresc} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Odpowiedź kodem P/F („Oceń prawdziwość stwierdzeń 1. i 2.”, klucz np. „PF”): każde
// stwierdzenie to wiersz z przełącznikiem P | F, jak tabela w arkuszu CKE. Gotowy kod
// trafia do odpowiedzi dopiero po wyborze przy wszystkich zdaniach; wybór w trakcie
// leży pod osobnym kluczem („5.pf”), którego ocena nie widzi.
type StwierdzeniaPF = { zdania: Blok[][]; ukryte: Set<Blok> };

function stwierdzeniaPF(z: Zadanie): Map<string, StwierdzeniaPF> {
  const wynik = new Map<string, StwierdzeniaPF>();
  let sekcja: Blok[] = [];
  for (const b of z.bloki) {
    if (b.typ !== "pytanie") {
      sekcja.push(b);
      continue;
    }
    const p = z.pytania.find((q) => q.nr === b.nr);
    const klucz = p?.typ === "otwarte" && p.kod ? p.oczekiwane?.[0] : undefined;
    if (klucz && /^[PF]+$/.test(klucz)) {
      // Zdanie zaczyna akapit „1. …”, a kolejne akapity bez numeru (wzór w osobnej linii) go dopełniają.
      const zdania: Blok[][] = [];
      for (const x of sekcja) {
        if (x.typ !== "akapit" || x.polecenie) continue;
        if (/^\d+\.\s/.test(x.tekst)) zdania.push([x]);
        else if (zdania.length) zdania[zdania.length - 1].push(x);
      }
      if (zdania.length === klucz.length) wynik.set(p!.nr, { zdania, ukryte: new Set(zdania.flat()) });
    }
    sekcja = [];
  }
  return wynik;
}

function PrzelacznikPF({ wybrana, poprawna, gotowe, onWybor, etykieta }: { wybrana?: string; poprawna?: string; gotowe: boolean; onWybor: (w: string) => void; etykieta: string }) {
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  return (
    <div ref={kontener} className={styles.slider} role="radiogroup" aria-label={etykieta}>
      {ramka && <span className={styles.thumb} style={ramka} aria-hidden="true" />}
      {["P", "F"].map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          data-litera={l}
          aria-checked={wybrana === l}
          aria-label={l === "P" ? "Prawda" : "Fałsz"}
          className={styles.segment}
          data-stan={stanCzesci(wybrana, poprawna, l, gotowe)}
          disabled={gotowe}
          onClick={() => onWybor(wybrana === l ? "" : l)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function PrawdaFalszKod({ pytanie: p, stwierdzenia }: { pytanie: PytanieOtwarte; stwierdzenia: StwierdzeniaPF }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const robocze = postep.odpowiedzi[`${p.nr}.pf`] ?? postep.odpowiedzi[p.nr] ?? "";
  const wybory = stwierdzenia.zdania.map((_, i) => (robocze[i] === "P" || robocze[i] === "F" ? robocze[i] : undefined));
  const klucz = p.oczekiwane?.[0] ?? "";
  const wybierz = (i: number, w: string) => {
    const nowe = wybory.map((x, j) => (j === i ? w || undefined : x));
    ustaw(`${p.nr}.pf`, nowe.map((x) => x ?? "_").join(""));
    ustaw(p.nr, nowe.every(Boolean) ? nowe.join("") : "");
  };
  return (
    <div className={styles.pfWiersze}>
      {stwierdzenia.zdania.map((zdanie, i) => (
        <div key={i} className={styles.pfWiersz}>
          <div className={styles.para}>
            {zdanie.map((b, k) => (
              <span key={k}>
                {k > 0 && " "}
                {b.typ === "akapit" && <Tekst tekst={b.tekst} />}
              </span>
            ))}
          </div>
          <PrzelacznikPF wybrana={wybory[i]} poprawna={klucz[i]} gotowe={gotowe} etykieta={`Stwierdzenie ${i + 1}: prawda czy fałsz`} onWybor={(w) => wybierz(i, w)} />
        </div>
      ))}
    </div>
  );
}

// Odpowiedź kodem „A albo B oraz 1., 2. albo 3.” („Ten ciąg jest … oraz …”): zamiast wpisywać
// „B2”, uczeń wybiera w dwóch grupach, a zapis zostaje kodem, więc sprawdzanie z kluczem działa.
type WyborKodu = { przed: string; miedzy: string; litery: Opcja[]; cyfry: Opcja[]; ukryte: Set<Blok> };
const NUMEROWANA = /^(\d)\.\s+([\s\S]+)$/;

function kodyZWyborem(z: Zadanie): Map<string, WyborKodu> {
  const wynik = new Map<string, WyborKodu>();
  let sekcja: Blok[] = [];
  for (const b of z.bloki) {
    if (b.typ !== "pytanie") {
      sekcja.push(b);
      continue;
    }
    const p = z.pytania.find((q) => q.nr === b.nr);
    const opcje = sekcja.find((x) => x.typ === "opcje");
    if (p?.typ === "otwarte" && p.kod && p.oczekiwane?.every((k) => /^[A-Z]\d$/.test(k)) && opcje?.typ === "opcje") {
      const numerowane = sekcja.filter((x): x is Blok & { typ: "akapit"; tekst: string; polecenie?: boolean } => x.typ === "akapit" && !x.polecenie && NUMEROWANA.test(x.tekst));
      // Krótkie kawałki zdania: „Ten ciąg jest” przed pierwszą grupą, „oraz” przed drugą.
      const kawalki = sekcja.filter((x): x is Blok & { typ: "akapit"; tekst: string; polecenie?: boolean } => x.typ === "akapit" && !x.polecenie && !NUMEROWANA.test(x.tekst) && x.tekst.length <= 80);
      const zdanie = kawalki.slice(-2);
      if (numerowane.length >= 2)
        wynik.set(p.nr, {
          przed: zdanie.length === 2 ? zdanie[0].tekst : "",
          miedzy: zdanie.length === 2 ? zdanie[1].tekst : (zdanie[0]?.tekst ?? "oraz"),
          litery: opcje.opcje,
          cyfry: numerowane.map((x) => {
            const [, nr, tresc] = x.tekst.match(NUMEROWANA)!;
            return { litera: nr, tresc };
          }),
          ukryte: new Set<Blok>([opcje, ...numerowane, ...zdanie]),
        });
    }
    sekcja = [];
  }
  return wynik;
}

function stanCzesci(wybrana: string | undefined, poprawna: string | undefined, wartosc: string, gotowe: boolean) {
  if (!gotowe) return wybrana === wartosc ? "wybrana" : undefined;
  if (wartosc === poprawna) return wybrana === wartosc ? "trafiona" : "poprawna";
  return wybrana === wartosc ? "bledna" : undefined;
}

function GrupaKodu({ opcje, wybrana, poprawna, gotowe, onWybor, etykieta }: { opcje: Opcja[]; wybrana?: string; poprawna?: string; gotowe: boolean; onWybor: (w: string) => void; etykieta: string }) {
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  return (
    <div ref={kontener} className={styles.choices} role="radiogroup" aria-label={etykieta}>
      {ramka && <span className={styles.highlight} style={ramka} aria-hidden="true" />}
      {opcje.map((o) => (
        <button
          key={o.litera}
          type="button"
          role="radio"
          data-litera={o.litera}
          aria-checked={wybrana === o.litera}
          className={styles.choice}
          data-stan={stanCzesci(wybrana, poprawna, o.litera, gotowe)}
          disabled={gotowe}
          onClick={() => onWybor(wybrana === o.litera ? "" : o.litera)}
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

function KodZWyborem({ pytanie: p, wybor }: { pytanie: PytanieOtwarte; wybor: WyborKodu }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const kod = postep.odpowiedzi[p.nr] ?? "";
  const litera = kod.match(/^[A-Z]/)?.[0];
  const cyfra = kod.match(/\d+$/)?.[0];
  const klucz = p.oczekiwane?.[0] ?? "";
  return (
    // Jak w arkuszu CKE: jeden wiersz tabeli „Ten ciąg jest | A / B | oraz | 1. / 2. / 3.”.
    <div className={styles.kodWybor}>
      <p className={styles.kodTekst}>
        <Tekst tekst={wybor.przed} />
      </p>
      <div>
        <GrupaKodu opcje={wybor.litery} wybrana={litera} poprawna={klucz[0]} gotowe={gotowe} etykieta={`Pytanie ${p.nr}, pierwsza część`} onWybor={(l) => ustaw(p.nr, `${l}${cyfra ?? ""}`)} />
      </div>
      <p className={styles.kodTekst}>
        <Tekst tekst={wybor.miedzy} />
      </p>
      <div>
        <GrupaKodu opcje={wybor.cyfry} wybrana={cyfra} poprawna={klucz.slice(1)} gotowe={gotowe} etykieta={`Pytanie ${p.nr}, druga część`} onWybor={(c) => ustaw(p.nr, `${litera ?? ""}${c}`)} />
      </div>
    </div>
  );
}

function Opcje({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const wybrana = postep.odpowiedzi[p.nr] || undefined;
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  return (
    <div ref={kontener} className={styles.choices} data-kolumny={kolumnyOpcji(p.opcje!)} role="radiogroup" aria-label={`Pytanie ${p.nr}`}>
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
  const { arkusz, postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const w = gotowe ? werdyktPytania(p, postep) : undefined;
  const wartosc = postep.odpowiedzi[p.nr] ?? "";
  // Matematyka oceniana według schematu (bez listy odpowiedzi do porównania): pole z zapisem
  // matematycznym. Przy kluczu z listą zostaje zwykły tekst, bo porównujemy go z kluczem.
  if (blok && arkusz.przedmiot === "matematyka" && !p.kod && !p.oczekiwane?.length && !p.akceptowane?.length)
    return (
      <span className={styles.blockGap} data-werdykt={w}>
        <PoleMatematyczne wartosc={wartosc} onZmiana={(latex) => ustaw(p.nr, latex)} tylkoOdczyt={gotowe} etykieta={`Odpowiedź ${p.nr}`} szerokie />
      </span>
    );
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
