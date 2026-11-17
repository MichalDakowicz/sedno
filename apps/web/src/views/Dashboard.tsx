import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, useParams } from "react-router-dom";
import { ArrowRight, ChevronRight, LayoutGrid, Plus } from "lucide-react";
import { isTourDone, useTutor, type Hint } from "../components/TutorContext";
import { SubjectIcon } from "../components/icons";
import { WyborPrzedmiotow } from "../components/WyborPrzedmiotow";
import { saveSubjects, useProfil, useSession } from "../auth";
import { useAiReady } from "../ai";
import { dniDoMatury, nazwaPoziomu, opisPoziomow, przedmiot, zgrupuj, type MojPrzedmiot } from "../konto/przedmioty";
import { dniDo, egzaminyUcznia } from "../konto/terminy";
import { propozycja, useWynikiKonta, type Podsumowanie } from "../konto/wyniki";
import { WSZYSTKIE, useUklad } from "../konto/ukladPulpitu";
import { Plywak } from "../components/Plywak";
import { Ladowanie } from "../components/Ladowanie";
import { Wejscia } from "../szablony/Wejscia";
import { Dzis } from "./pulpit/Dzis";
import { widget, type KontekstPulpitu } from "./pulpit/widgety";
import { Wynikowy, procent, tytul } from "./pulpit/wspolne";
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
      <p className="muted">Pulpit, propozycje i Pestka dopasują się do nich. Zmienisz je w profilu.</p>
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
  const pierwszy = egzaminyUcznia(moje)[0];
  const dane = useWynikiKonta(moje);
  const { showHints, startTour } = useTutor();
  const klucz = aktywny?.id ?? WSZYSTKIE;
  const uklad = useUklad(klucz);

  const zakres = dane ? (aktywny ? dane.podsumowania.filter((p) => p.przedmiot.id === aktywny.id) : dane.podsumowania) : [];
  const propozycje = dane ? zakres.map((p) => propozycja(p, dane.wiersze)) : [];
  // Na pulpicie ogólnym: najpierw dokończenie, potem nowy arkusz, na końcu cokolwiek.
  const co = propozycje.find((x) => x.rodzaj === "dokoncz") ?? propozycje.find((x) => x.rodzaj === "nowy") ?? propozycje[0];

  // Przy pierwszym wejściu Pestka prowadzi przewodnik, potem zwykła wskazówka do propozycji.
  useEffect(() => {
    if (!co) return;
    const hints: Hint[] = [{ target: "today-cta", text: "To polecam na dziś. Wybrałam to z twoich arkuszy." }];
    const t = window.setTimeout(() => (isTourDone() ? showHints(`dash-${id ?? "all"}`, hints) : startTour()), 900);
    return () => window.clearTimeout(t);
  }, [id, !!co]);

  if (id && profil && !aktywny) return <Navigate to="/" replace />;

  // Widgety w zapisanej kolejności, bez wyłączonych. Pierwszy może stanąć obok „Dziś warto”, reszta idzie pod sekcjami przedmiotów.
  const wlaczone = uklad.filter((p) => p.wl).flatMap((p) => widget(p.id) ?? []);
  const obok = co && wlaczone[0]?.obok ? wlaczone[0] : undefined;
  const reszta = wlaczone.slice(obok ? 1 : 0);
  const kontekst: KontekstPulpitu = { zakres, co, aktywny: aktywny?.id, ai, maPrzedmioty: moje.length > 0, obok: false };

  const imie = profil?.display_name?.split(" ")[0];
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
              <span className={`accent ${styles.line}`}>Do matury ok. {pierwszy ? dniDo(pierwszy.data) : dniDoMatury()} dni.</span>
            </>
          )}
        </h1>
        <p className="muted">Sesja majowa 2027. Dokładne daty egzaminów poda harmonogram CKE.</p>
      </section>

      {profil && !moje.length && <BezPrzedmiotow />}

      {!dane && <Ladowanie ksztalt="pulpit" ile={3} etykieta="Wczytuję twoje arkusze i wyniki" />}

      {dane && co && (
        <section className={`${styles.top} ${obok ? "" : styles.topSam} wejscie`}>
          <Dzis {...kontekst} />
          {obok && (
            <div className={styles.side}>
              <obok.Komponent {...kontekst} obok />
            </div>
          )}
        </section>
      )}

      {dane && aktywny && zakres.map((s) => <ArkuszePrzedmiotu key={s.przedmiot.poziom} podsumowanie={s} zPoziomem={zakres.length > 1} />)}

      {dane && !aktywny && moje.length > 0 && (
        <section className={`${styles.section} wejscie`} aria-labelledby="subjects-title">
          <div className={styles.sectionHead}>
            <h2 id="subjects-title" className="h2">
              Twoje przedmioty
            </h2>
          </div>
          <ul className={styles.rows}>
            {dane.podsumowania.map((s) => {
              const pr = przedmiot(s.przedmiot.id)!;
              return (
                <li key={`${pr.id}-${s.przedmiot.poziom}`}>
                  <Link to={`/przedmiot/${pr.id}`} className={styles.subjectRow}>
                    <SubjectIcon subject={pr} size="lg" />
                    <span className={styles.subjectName}>
                      <span className="h3">{pr.nazwa}</span>
                      <span className="muted small">poziom {nazwaPoziomu[s.przedmiot.poziom]}</span>
                    </span>
                    <span className={styles.subjectMastery}>
                      {s.srednia !== null ? (
                        <>
                          <Wynikowy value={s.srednia} />
                          <span className={styles.pct}>{s.srednia}%</span>
                        </>
                      ) : (
                        <span className="muted small">bez wyniku</span>
                      )}
                    </span>
                    <span className={styles.note}>
                      {s.arkusze.length ? `${s.wyniki.length} z ${s.arkusze.length} arkuszy sprawdzonych` : "arkusze w drodze"}
                    </span>
                    <ChevronRight size={20} className={styles.chevron} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {dane && reszta.map((w) => <w.Komponent key={w.id} {...kontekst} />)}

      <Link to={aktywny ? `/uklad-pulpitu?przedmiot=${aktywny.id}` : "/uklad-pulpitu"} className={styles.ukladLink}>
        <span className={styles.ukladTytul}>Układ pulpitu</span>
        <span className="muted small">Wybór i kolejność widgetów na pulpicie.</span>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>

      <Wejscia tytul="W przygotowaniu" slugi={["nauka", "powtorki", "mapa-wiedzy"]} />
    </main>
  );
}

function ArkuszePrzedmiotu({ podsumowanie: s, zPoziomem }: { podsumowanie: Podsumowanie; zPoziomem: boolean }) {
  const tytulId = `sheets-title-${s.przedmiot.poziom}`;
  return (
    <section className={`${styles.section} wejscie`} aria-labelledby={tytulId}>
      <div className={styles.sectionHead}>
        <h2 id={tytulId} className="h2">
          Twoje arkusze{zPoziomem ? `, poziom ${nazwaPoziomu[s.przedmiot.poziom]}` : ""}
        </h2>
        <Link to="/arkusze" className="link">
          Wszystkie arkusze <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {s.wyniki.length || s.zaczete.length ? (
        <ul className={styles.rows}>
          {s.zaczete.map((z) => (
            <li key={z.arkusz.id}>
              <Link to={`/arkusze/${z.arkusz.id}`} className={styles.skill}>
                <span className={styles.skillName}>{tytul(z.arkusz)}</span>
                <span className="muted small">w trakcie</span>
                <span className={styles.pct} />
                <span className={styles.note}>
                  {z.odpowiedzi} z {z.arkusz.pytan} odpowiedzi
                </span>
              </Link>
            </li>
          ))}
          {s.wyniki.map((w) => (
            <li key={w.arkusz.id}>
              <Link to={`/arkusze/${w.arkusz.id}`} className={styles.skill}>
                <span className={styles.skillName}>{tytul(w.arkusz)}</span>
                <Wynikowy value={procent(w)} />
                <span className={styles.pct}>{procent(w)}%</span>
                <span className={styles.note}>
                  {w.zdobyte}/{w.mozliwe} pkt
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nie masz jeszcze rozwiązanych arkuszy z tego przedmiotu.</p>
      )}
    </section>
  );
}
