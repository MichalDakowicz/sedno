import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, useParams } from "react-router-dom";
import { ArrowRight, ChevronRight, LayoutGrid, Plus } from "lucide-react";
import { isTourDone, useTutor, type Hint } from "../components/TutorContext";
import { SubjectIcon } from "../components/icons";
import { WyborPrzedmiotow } from "../components/WyborPrzedmiotow";
import { saveSubjects, useProfil, useSession, imieZNazwy } from "../auth";
import { useAiReady } from "../ai";
import { dniDoMatury, nazwaPoziomu, opisPoziomow, przedmiot, zgrupuj, type MojPrzedmiot } from "../konto/przedmioty";
import { dniDo, egzaminyUcznia, najblizszy, odmianaDni } from "../konto/terminy";
import { useUstawienia } from "../konto/ustawienia";
import { propozycja, useWynikiKonta, type Podsumowanie } from "../konto/wyniki";
import { WSZYSTKIE, useUklad } from "../konto/ukladPulpitu";
import { Plywak } from "../components/Plywak";
import { Ladowanie } from "../components/Ladowanie";
import { Dzis } from "./pulpit/Dzis";
import { useDiagnoza, useTrybDiagnozy, zaproszenieDoDiagnozy } from "../nauka/diagnoza";
import { adresDiagnozy } from "../nauka/adresy";
import { usePoziomNauki } from "../nauka/stan";
import { widget, type KontekstPulpitu } from "./pulpit/widgety";
import { Wynikowy, procent, tytul } from "./pulpit/wspolne";
import { GotowoscPrzedmiotow } from "./pulpit/GotowoscPrzedmiotow";
import { useProfilOdczytany, useUczenie } from "../konto/profilUcznia";
import styles from "./Dashboard.module.css";

function SubjectBar({ moje: wpisy, active }: { moje: MojPrzedmiot[]; active?: string }) {
  const moje = zgrupuj(wpisy);
  return (
    <nav
      className={styles.subjectBar}
      aria-label="Przedmioty"
      data-tutor="subjects"
      data-tutor-about="Tu wybierasz przedmiot. „Wszystkie” to pulpit ogólny, a przedmiot zawęża pulpit tylko do jego danych."
    >
      <Plywak zalezy={`${active ?? "wszystkie"}-${moje.length}`} />
      <NavLink to="/" end data-aktywny={!active} className={({ isActive }) => `${styles.chip} ${isActive ? styles.chipActive : ""}`}>
        <span className={styles.chipIcon}>
          <LayoutGrid size={14} aria-hidden="true" />
        </span>
        Wszystkie
      </NavLink>
      {moje.map((m) => {
        const p = przedmiot(m.id)!;
        return (
          <NavLink key={m.id} to={`/przedmiot/${m.id}`} data-aktywny={active === m.id} className={`${styles.chip} ${active === m.id ? styles.chipActive : ""}`}>
            <SubjectIcon subject={p} size="sm" />
            {p.nazwa}
          </NavLink>
        );
      })}
      <Link to="/profil#przedmioty" className={`${styles.chip} ${styles.chipAdd}`}>
        <Plus size={16} aria-hidden="true" />
        {moje.length ? "Zmień przedmioty" : "Dodaj przedmiot"}
      </Link>
    </nav>
  );
}

function BezPrzedmiotow() {
  const [wybor, setWybor] = useState<MojPrzedmiot[]>([]);
  const [zapis, setZapis] = useState(false);
  return (
    <section className={styles.section} aria-labelledby="choose-title" style={{ justifyItems: "start" }}>
      <h2 id="choose-title" className="h2">
        Które przedmioty zdajesz?
      </h2>
      <WyborPrzedmiotow value={wybor} onChange={setWybor} />
      <button
        type="button"
        className="btn btn-primary"
        disabled={!wybor.length || zapis}
        onClick={async () => {
          setZapis(true);
          await saveSubjects(wybor);
          setZapis(false);
        }}
      >
        Zapisz przedmioty
      </button>
    </section>
  );
}

export function Dashboard() {
  const { id } = useParams();
  const session = useSession();
  const profil = useProfil();
  const ai = useAiReady(session ? session.user.id : null) === true;
  const moje = profil?.subjects ?? [];
  const aktywny = zgrupuj(moje).find((m) => m.id === id);
  const egzaminy = egzaminyUcznia(moje);
  const nastepny = najblizszy(egzaminy);
  const dniHero = nastepny ? dniDo(nastepny.data) : egzaminy.length ? null : dniDoMatury();
  const dane = useWynikiKonta(moje);
  // Dane z pamięci (powrót na pulpit) są od razu na miejscu: bez animacji wejścia, która udawałaby wczytywanie.
  const wejscie = useRef(dane ? "" : "wejscie").current;
  const { showHints, startTour } = useTutor();
  const { pestkaSama } = useUstawienia();
  const klucz = aktywny?.id ?? WSZYSTKIE;
  const uklad = useUklad(klucz);
  const diagnozaLokalna = useDiagnoza();
  const uczenie = useUczenie();
  const profilOdczytany = useProfilOdczytany();
  const [poziomNauki] = usePoziomNauki();
  const angielski = moje.some((m) => m.id === "angielski") && (!aktywny || aktywny.id === "angielski");
  const diagnoza = useTrybDiagnozy(poziomNauki, angielski);
  const zaproszenie = angielski
    ? zaproszenieDoDiagnozy(diagnoza.tryb === "baza" ? diagnoza.stan : diagnoza.tryb === "przegladarka" ? null : undefined, diagnozaLokalna)
    : null;

  const zakres = dane ? (aktywny ? dane.podsumowania.filter((p) => p.przedmiot.id === aktywny.id) : dane.podsumowania) : [];
  const propozycje = dane ? zakres.map((p) => propozycja(p, dane.wiersze)) : [];
  // Na pulpicie ogólnym: najpierw dokończenie, potem nowy arkusz, na końcu cokolwiek.
  const co = propozycje.find((x) => x.rodzaj === "dokoncz") ?? propozycje.find((x) => x.rodzaj === "nowy") ?? propozycje[0];

  // Przy pierwszym wejściu Pestka prowadzi przewodnik, potem zwykła wskazówka do propozycji.
  useEffect(() => {
    if (!co) return;
    const hints: Hint[] = [{ target: "today-cta", text: "To moja propozycja ćwiczenia na dziś." }];
    const t = window.setTimeout(() => (isTourDone() ? showHints(`dash-${id ?? "all"}`, hints) : pestkaSama && startTour()), 900);
    return () => window.clearTimeout(t);
  }, [id, !!co]);

  if (id && profil && !aktywny) return <Navigate to="/" replace />;

  // Widgety w zapisanej kolejności, bez wyłączonych. Pierwszy może stanąć obok „Dziś warto”, reszta idzie pod sekcjami przedmiotów.
  const wlaczone = uklad.filter((p) => p.wl).flatMap((p) => widget(p.id) ?? []);
  const obok = co && wlaczone[0]?.obok ? wlaczone[0] : undefined;
  const reszta = wlaczone.slice(obok ? 1 : 0);
  const kontekst: KontekstPulpitu = { zakres, co, aktywny: aktywny?.id, ai, maPrzedmioty: moje.length > 0, obok: false };

  const imie = imieZNazwy(profil?.display_name);
  const p = aktywny ? przedmiot(aktywny.id)! : null;

  return (
    <main className={`container ${styles.page}`}>
      <SubjectBar moje={moje} active={aktywny?.id} />

      <section className={styles.hero}>
        <h1 className="display">
          {p && aktywny ? (
            <>
              <span className={styles.line} data-tutor="hero">
                {p.nazwa}
              </span>
              <span className={`accent ${styles.line}`}>Poziom {opisPoziomow(aktywny.poziomy)}.</span>
            </>
          ) : (
            <>
              <span className={styles.line} data-tutor="hero">
                Cześć{imie ? `, ${imie}` : ""}.
              </span>
              <span className={`accent ${styles.line}`}>{dniHero === null ? "Wszystkie egzaminy za tobą." : `Do matury ok. ${dniHero} ${odmianaDni(dniHero)}.`}</span>
            </>
          )}
        </h1>
        {/* Diagnoza na start (nauka/diagnoza.ts): zaproszenie, póki nie skończona ani pominięta; po przerwie „Dokończ”. */}
        {/* Quiz celów, dopóki nie zrobiony ani pominięty; potem zaproszenie do diagnozy. */}
        {!uczenie.quiz && profilOdczytany && moje.length > 0 ? (
          <Link to="/cele" className="link">
            Ustaw swój cel na maturę <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : zaproszenie && (
          <Link to={adresDiagnozy(poziomNauki)} className="link">
            {zaproszenie === "dokoncz" ? "Dokończ diagnozę" : zaproszenie === "wyniki" ? "Zobacz pierwsze wyniki" : "Sprawdźmy, od czego zacząć"} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </section>

      {profil && !moje.length && <BezPrzedmiotow />}

      {!dane && <Ladowanie ksztalt="pulpit" ile={3} etykieta="Wczytuję twoje arkusze i wyniki" />}

      {dane && co && (
        <section className={`${styles.top} ${obok || moje.length > 0 ? "" : styles.topSam} ${wejscie}`}>
          <Dzis {...kontekst} />
          {obok ? (
            <div className={styles.side}>
              <obok.Komponent {...kontekst} obok />
            </div>
          ) : moje.length > 0 && <GotowoscPrzedmiotow zakres={zakres} />}
        </section>
      )}

      {dane && moje.length > 0 && (obok || !co) && <GotowoscPrzedmiotow zakres={zakres} />}

      {dane && aktywny && zakres.map((s) => <ArkuszePrzedmiotu key={s.przedmiot.poziom} podsumowanie={s} zPoziomem={zakres.length > 1} wejscie={wejscie} />)}

      {dane && reszta.map((w) => <w.Komponent key={w.id} {...kontekst} />)}

    </main>
  );
}

function ArkuszePrzedmiotu({ podsumowanie: s, zPoziomem, wejscie }: { podsumowanie: Podsumowanie; zPoziomem: boolean; wejscie: string }) {
  const tytulId = `sheets-title-${s.przedmiot.poziom}`;
  return (
    <section className={`${styles.section} ${wejscie}`} aria-labelledby={tytulId}>
      <div className={styles.sectionHead}>
        <h2 id={tytulId} className="h2">
          Twoje arkusze{zPoziomem ? `, poziom ${nazwaPoziomu[s.przedmiot.poziom]}` : ""}
        </h2>
        <Link to="/arkusze" className="link">
          Wszystkie arkusze <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {s.wyniki.length || s.zaczete.length ? (
        <ul className={`wiersze ${styles.listaWynikow}`}>
          {s.zaczete.map((z) => (
            <li key={z.arkusz.id}>
              <Link to={`/arkusze/${z.arkusz.id}`} className="wiersz">
                <span className="wiersz-tresc">
                  <span className="wiersz-nazwa">{tytul(z.arkusz)}</span>
                  <span className="wiersz-opis">{z.odpowiedzi} z {z.arkusz.pytan} odpowiedzi</span>
                </span>
                <span className="wiersz-wartosc muted">w trakcie</span>
                <span className="wiersz-akcja"><ChevronRight size={20} aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
          {s.wyniki.map((w) => (
            <li key={w.arkusz.id}>
              <Link to={`/arkusze/${w.arkusz.id}`} className="wiersz">
                <span className="wiersz-tresc">
                  <span className="wiersz-nazwa">{tytul(w.arkusz)}</span>
                  <span className="wiersz-opis">{w.zdobyte}/{w.mozliwe} pkt</span>
                </span>
                <span className="wiersz-wartosc">
                  <span className="wiersz-pasek">
                    <Wynikowy value={procent(w)} />
                    <span>{procent(w)}%</span>
                  </span>
                </span>
                <span className="wiersz-akcja"><ChevronRight size={20} aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.pusty}>
          <p className="muted">Nie masz jeszcze rozwiązanych arkuszy z tego przedmiotu.</p>
          {s.arkusze[0] && (
            <Link to={`/arkusze/${s.arkusze[0].id}`} className="btn btn-secondary btn-sm">
              Rozwiąż pierwszy arkusz
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
