import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useListaArkuszy } from "../arkusze/dane";
import { wczytajPostep } from "../arkusze/postep";
import type { ArkuszWpis, Poziom, Przedmiot } from "../arkusze/typy";
import { useProfil } from "../auth";
import { Ladowanie } from "../components/Ladowanie";
import { Plywak } from "../components/Plywak";
import styles from "./Arkusze.module.css";

const PRZEDMIOTY: { id: Przedmiot; nazwa: string; opis: string; lead: string }[] = [
  {
    id: "angielski",
    nazwa: "Angielski",
    opis: "Język angielski · matura od 2015",
    lead: "Arkusze maturalne CKE do rozwiązania w przeglądarce. Zadania zamknięte sprawdzam od razu z kluczem, otwarte porównuję z zasadami oceniania.",
  },
  {
    id: "matematyka",
    nazwa: "Matematyka",
    opis: "Matematyka · poziom podstawowy · matura od 2023",
    lead: "Zadania wyglądają jak w arkuszu CKE. Przy każdym masz brudnopis do obliczeń i szkiców, a przy zadaniach z rysunkiem możesz rysować po figurze.",
  },
];
const POZIOMY: Poziom[] = ["podstawowy", "rozszerzony", "dwujezyczny"];
const NAZWY: Record<Poziom, string> = { podstawowy: "Podstawowy", rozszerzony: "Rozszerzony", dwujezyczny: "Dwujęzyczny" };

const FORMULY = [
  { id: "2023", nazwa: "Formuła 2023", opis: "Obecna matura, od 2023 roku. Taki egzamin napiszesz." },
  { id: "2015", nazwa: "Formuła 2015", opis: "Matura z lat 2015–2023. Inny układ zadań i mniej punktów, ale dobra do ćwiczeń." },
];

export function Arkusze() {
  const { dane, blad, laduje } = useListaArkuszy();
  const profil = useProfil();
  // Domyślnie przedmiot i poziom, które konto zdaje (angielski, jeśli zdaje oba).
  const poziomKonta = (p: Przedmiot) => profil?.subjects.find((s) => s.id === p)?.poziom as Poziom | undefined;
  const [przedmiot, setPrzedmiot] = useState<Przedmiot>(() => (!poziomKonta("angielski") && poziomKonta("matematyka") ? "matematyka" : "angielski"));
  const [wybranyPoziom, setPoziom] = useState<Poziom>(() => poziomKonta(przedmiot) ?? "podstawowy");
  const opis = PRZEDMIOTY.find((p) => p.id === przedmiot)!;
  const zPrzedmiotu = dane?.filter((a) => (a.przedmiot ?? "angielski") === przedmiot);
  // Poziomy, dla których są arkusze (matematyka na razie tylko podstawowa).
  const poziomy = POZIOMY.filter((p) => !zPrzedmiotu || zPrzedmiotu.some((a) => a.poziom === p));
  const poziom = poziomy.includes(wybranyPoziom) ? wybranyPoziom : (poziomy[0] ?? "podstawowy");

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.head}>
        <span className="label">{opis.opis}</span>
        <h1 className="display">Arkusze</h1>
        <p className="lead">{opis.lead}</p>
      </header>

      <nav className={styles.levels} aria-label="Przedmiot">
        <Plywak zalezy={przedmiot} />
        {PRZEDMIOTY.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.level} ${przedmiot === p.id ? styles.levelActive : ""}`}
            onClick={() => {
              setPrzedmiot(p.id);
              setPoziom(poziomKonta(p.id) ?? "podstawowy");
            }}
            aria-pressed={przedmiot === p.id}
          >
            {p.nazwa}
          </button>
        ))}
      </nav>

      {poziomy.length > 1 && (
        <nav className={styles.levels} aria-label="Poziom">
          <Plywak zalezy={`${przedmiot}-${poziom}-${poziomy.length}`} />
          {poziomy.map((p) => (
            <button key={p} type="button" className={`${styles.level} ${poziom === p ? styles.levelActive : ""}`} onClick={() => setPoziom(p)} aria-pressed={poziom === p}>
              {NAZWY[p]}
              {zPrzedmiotu && <span className={styles.levelCount}>{zPrzedmiotu.filter((a) => a.poziom === p).length}</span>}
            </button>
          ))}
        </nav>
      )}

      {laduje && <Ladowanie ksztalt="wiersze" ile={5} etykieta="Wczytuję listę arkuszy" />}
      {blad && <BrakDanych blad={blad} />}

      {zPrzedmiotu &&
        FORMULY.map((f) => {
          const arkusze = zPrzedmiotu.filter((a) => a.poziom === poziom && (a.formula ?? "2023") === f.id);
          if (!arkusze.length) return null;
          return (
            <section key={f.id} className={`${styles.group} wejscie`}>
              <header className={styles.groupHead}>
                <h2 className="h3">{f.nazwa}</h2>
                <p className="small muted">{f.opis}</p>
                <p className="small muted">{opisGrupy(arkusze).join(" · ")}</p>
              </header>
              <ul className={styles.list}>
                {arkusze.map((a) => (
                  <Karta key={a.id} arkusz={a} />
                ))}
              </ul>
            </section>
          );
        })}
    </main>
  );
}

function Karta({ arkusz: a }: { arkusz: ArkuszWpis }) {
  const postep = wczytajPostep(a.id);
  const zaczety = Object.keys(postep.odpowiedzi).length > 0;
  const proc = postep.wynik ? Math.round((postep.wynik.zdobyte / postep.wynik.mozliwe) * 100) : null;
  return (
    <li>
      <Link to={`/arkusze/${a.id}`} className={styles.card} title={a.symbol}>
        <span className={styles.year}>{a.rok}</span>
        <span className={`small muted ${styles.session}`}>{a.sesja}</span>
        <span className={styles.status}>
          {proc !== null ? <span className={styles.score}>{proc}%</span> : zaczety ? <span className="small muted">w trakcie</span> : <span className="small muted">nierozwiązany</span>}
        </span>
        <span className={`btn btn-ghost ${styles.action}`}>
          {proc !== null ? "Zobacz wynik" : zaczety ? "Kontynuuj" : "Rozwiąż"}
          <ChevronRight size={16} aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

// Wspólne dane arkuszy z grupy (czas, punkty, nagranie) idą do nagłówka zamiast na każdą kartę.
function opisGrupy(arkusze: ArkuszWpis[]): string[] {
  const zakres = (w: number[], jednostka: string) => {
    if (!w.length) return null;
    const min = Math.min(...w);
    const max = Math.max(...w);
    return min === max ? `${min} ${jednostka}` : `${min}–${max} ${jednostka}`;
  };
  const czas = zakres(arkusze.flatMap((a) => (a.czas ? [a.czas] : [])), "min");
  const punkty = zakres(arkusze.map((a) => a.punkty), "pkt");
  const nagranie = arkusze.some((a) => a.przedmiot === "angielski");
  return [czas, punkty, nagranie ? "z nagraniem" : null].filter((x): x is string => !!x);
}

function BrakDanych({ blad }: { blad: string }) {
  return (
    <section className={styles.empty}>
      <h2 className="h3">{blad === "brak-danych" ? "Nie ma jeszcze zaimportowanych arkuszy" : "Nie udało się wczytać arkuszy"}</h2>
      <p className="muted">Arkusze CKE nie są częścią repozytorium. Pobierz je, przetwórz i wgraj do bazy z katalogu głównego projektu, a potem odśwież stronę:</p>
      <pre className={styles.code}>npm run pobierz{"\n"}npm run importuj</pre>
      {blad !== "brak-danych" && <p className="small muted">Szczegóły: {blad}</p>}
    </section>
  );
}
