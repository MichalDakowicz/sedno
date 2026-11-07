import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, useParams } from "react-router-dom";
import { ArrowRight, ChevronRight, FileText, LayoutGrid, MessagesSquare, Network, Plus, Sparkles, Target, type LucideIcon } from "lucide-react";
import { useTutor, isTourDone, type Hint } from "../components/TutorContext";
import { SubjectIcon } from "../components/icons";
import { WyborPrzedmiotow } from "../components/WyborPrzedmiotow";
import { saveSubjects, useProfil, useSession } from "../auth";
import { useAiReady } from "../ai";
import { dniDoMatury, nazwaPoziomu, przedmiot, type MojPrzedmiot } from "../konto/przedmioty";
import { propozycja, useWynikiKonta, type Podsumowanie, type Propozycja, type Wynik } from "../konto/wyniki";
import type { ArkuszWpis } from "../arkusze/typy";
import { Plywak } from "../components/Plywak";
import { Ladowanie } from "../components/Ladowanie";
import styles from "./Dashboard.module.css";

function Kicker({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className={styles.kicker}>
      <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
      {children}
    </span>
  );
}

const tytul = (a: ArkuszWpis) => `Matura ${a.sesja} ${a.rok}`;
const procent = (w: Wynik) => Math.round((w.zdobyte / w.mozliwe) * 100);

function SubjectBar({ moje, active }: { moje: MojPrzedmiot[]; active?: string }) {
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

function Wynikowy({ value }: { value: number }) {
  const level = value < 50 ? "low" : value < 75 ? "mid" : "high";
  return (
    <span className={styles.bar} aria-hidden="true">
      <span style={{ width: `${value}%` }} data-level={level} />
    </span>
  );
}

function Today({ co, showSubject, ai }: { co: Propozycja; showSubject: boolean; ai: boolean }) {
  const { open: openTutor } = useTutor();
  const p = przedmiot(co.przedmiot.id)!;
  const poziom = nazwaPoziomu[co.przedmiot.poziom];

  let naglowek: string;
  let powod: string;
  let akcja: ReactNode;
  if (co.rodzaj === "dokoncz") {
    naglowek = "Dokończ arkusz";
    powod = `${tytul(co.zaczety.arkusz)}, poziom ${poziom}. Masz już ${co.zaczety.odpowiedzi} odpowiedzi z ${co.zaczety.arkusz.pytan}, wynik zobaczysz po sprawdzeniu.`;
    akcja = (
      <Link to={`/arkusze/${co.zaczety.arkusz.id}`} className="btn btn-primary" data-tutor="today-cta">
        <FileText size={18} aria-hidden="true" />
        Wróć do arkusza
      </Link>
    );
  } else if (co.rodzaj === "nowy") {
    naglowek = tytul(co.arkusz);
    powod = co.ostatni
      ? `Ostatni wynik: ${procent(co.ostatni)}% (${tytul(co.ostatni.arkusz).toLowerCase()}). Kolejny arkusz pokaże, czy to stały poziom.`
      : `Nie masz jeszcze wyniku z tego przedmiotu. Najnowszy arkusz na poziomie ${poziom} pokaże, od czego zacząć.`;
    akcja = (
      <Link to={`/arkusze/${co.arkusz.id}`} className="btn btn-primary" data-tutor="today-cta">
        <FileText size={18} aria-hidden="true" />
        Rozwiąż arkusz{co.arkusz.czas ? ` · ${co.arkusz.czas} min` : ""}
      </Link>
    );
  } else if (co.rodzaj === "wszystko") {
    naglowek = "Wszystkie arkusze rozwiązane";
    powod = `Masz wyniki ze wszystkich arkuszy na poziomie ${poziom}, które są w Sedno.${co.ostatni ? ` Ostatni: ${procent(co.ostatni)}%.` : ""}`;
    akcja = (
      <Link to="/arkusze" className="btn btn-primary" data-tutor="today-cta">
        <FileText size={18} aria-hidden="true" />
        Przejrzyj arkusze
      </Link>
    );
  } else {
    naglowek = `${p.nazwa}: arkusze w drodze`;
    powod = `W Sedno nie ma jeszcze arkuszy z tego przedmiotu na poziomie ${poziom}. Dodajemy je po kolei.`;
    akcja = ai ? (
      <button type="button" className="btn btn-primary" data-tutor="today-cta" onClick={openTutor}>
        <MessagesSquare size={18} aria-hidden="true" />
        Porozmawiaj z Pestką
      </button>
    ) : (
      <Link to="/arkusze" className="btn btn-primary" data-tutor="today-cta">
        <FileText size={18} aria-hidden="true" />
        Zobacz dostępne arkusze
      </Link>
    );
  }

  return (
    // Jedyna karta na pulpicie: propozycja to główne działanie, więc dostaje wyróżnienie.
    <article className={styles.today} aria-labelledby="today-title" data-tutor-about="To propozycja na dziś. Wybieram ją z twoich arkuszy: najpierw dokończenie zaczętego, potem najnowszy nierozwiązany.">
      <div className={styles.todayHead}>
        <Kicker icon={Sparkles}>Dziś warto</Kicker>
        {showSubject && (
          <Link to={`/przedmiot/${p.id}`} className={styles.tag}>
            <SubjectIcon subject={p} size="sm" />
            {p.nazwa}
          </Link>
        )}
      </div>
      <h2 id="today-title" className="h1">
        {naglowek}
      </h2>
      <p className={styles.reason}>{powod}</p>
      <div className={styles.actions}>{akcja}</div>
    </article>
  );
}

function Wyniki({ podsumowania }: { podsumowania: Podsumowanie[] }) {
  const wszystkie = podsumowania.flatMap((p) => p.wyniki).sort((a, b) => b.kiedy.localeCompare(a.kiedy));
  const ostatni = wszystkie[0];
  const srednia = wszystkie.length ? Math.round(wszystkie.reduce((s, w) => s + procent(w), 0) / wszystkie.length) : null;
  return (
    <div className={styles.block} data-tutor="results" data-tutor-about="Średnia z arkuszy, które sprawdziłeś w Sedno. Z nich wybieram, co polecić.">
      <Kicker icon={Target}>Wyniki</Kicker>
      {srednia === null ? (
        <>
          <p className="h2">Jeszcze bez wyniku</p>
          <p className="muted">Pierwszy sprawdzony arkusz pokaże, gdzie jesteś.</p>
        </>
      ) : (
        <>
          <p className={styles.stat}>
            {srednia}
            <span>%</span>
          </p>
          <p className="muted small">
            średnio z {wszystkie.length} {wszystkie.length === 1 ? "arkusza" : "arkuszy"}
            {ostatni && ` · ostatni ${procent(ostatni)}%`}
          </p>
        </>
      )}
      <Link to="/arkusze" className="link">
        Arkusze i egzamin <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
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
  const aktywny = moje.find((m) => m.id === id);
  const dane = useWynikiKonta(moje);
  const { showHints, startTour } = useTutor();

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
              <span className={`accent ${styles.line}`}>Poziom {nazwaPoziomu[aktywny.poziom]}.</span>
            </>
          ) : (
            <>
              <span className={styles.line} data-tutor="hero">
                Cześć{imie ? `, ${imie}` : ""}.
              </span>
              <span className={`accent ${styles.line}`}>Do matury ok. {dniDoMatury()} dni.</span>
            </>
          )}
        </h1>
        <p className="muted">Sesja majowa 2027. Dokładne daty egzaminów poda harmonogram CKE.</p>
      </section>

      {profil && !moje.length && <BezPrzedmiotow />}

      {!dane && <Ladowanie ksztalt="pulpit" ile={3} etykieta="Wczytuję twoje arkusze i wyniki" />}

      {dane && co && (
        <section className={`${styles.top} wejscie`}>
          <Today co={co} showSubject={!aktywny} ai={ai} />
          <div className={styles.side}>
            <Wyniki podsumowania={zakres} />
          </div>
        </section>
      )}

      {dane && aktywny && zakres[0] && <ArkuszePrzedmiotu podsumowanie={zakres[0]} />}

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
                <li key={pr.id}>
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

      {dane && moje.length > 0 && (
        <section className={`${styles.section} wejscie`} aria-labelledby="map-title">
          <div className={styles.sectionHead}>
            <h2 id="map-title" className="h2">
              Mapa umiejętności
            </h2>
          </div>
          <p className="muted">
            <Network size={16} aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 6 }} />
            Opanowanie poszczególnych umiejętności policzymy z twoich odpowiedzi w arkuszach. Na razie widzisz wyniki całych arkuszy.
          </p>
        </section>
      )}
    </main>
  );
}

function ArkuszePrzedmiotu({ podsumowanie: s }: { podsumowanie: Podsumowanie }) {
  return (
    <section className={`${styles.section} wejscie`} aria-labelledby="sheets-title">
      <div className={styles.sectionHead}>
        <h2 id="sheets-title" className="h2">
          Twoje arkusze
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
