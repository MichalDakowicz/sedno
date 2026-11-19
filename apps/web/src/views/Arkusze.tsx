import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useListaArkuszy } from "../arkusze/dane";
import { wczytajPostep } from "../arkusze/postep";
import type { ArkuszWpis, Poziom, Przedmiot } from "../arkusze/typy";
import { useProfil } from "../auth";
import { brakArkuszy } from "../konto/przedmioty";
import { NaglowekStrony } from "../components/NaglowekStrony";
import { Ladowanie } from "../components/Ladowanie";
import { Pierscien } from "../components/wykresy";
import styles from "./Arkusze.module.css";

const PRZEDMIOTY: { id: Przedmiot; nazwa: string; opis: string; lead: string }[] = [
  {
    id: "angielski",
    nazwa: "Angielski",
    opis: "Język angielski · matura od 2015",
    lead: "Arkusze maturalne CKE do rozwiązania w przeglądarce.",
  },
  {
    id: "matematyka",
    nazwa: "Matematyka",
    opis: "Matematyka · poziom podstawowy · matura od 2023",
    lead: "Arkusze maturalne CKE z brudnopisem przy każdym zadaniu.",
  },
  {
    id: "informatyka",
    nazwa: "Informatyka",
    opis: "Informatyka · poziom rozszerzony · matura od 2023",
    lead: "Arkusze maturalne CKE z plikami danych, Pythonem i SQL.",
  },
];
const POZIOMY: Poziom[] = ["podstawowy", "rozszerzony", "dwujezyczny"];
const NAZWY: Record<Poziom, string> = { podstawowy: "Podstawowy", rozszerzony: "Rozszerzony", dwujezyczny: "Dwujęzyczny" };

const FORMULY = [
  { id: "2023", nazwa: "Formuła 2023", opis: "Obecna matura." },
  { id: "2015", nazwa: "Formuła 2015", opis: "Starsza matura, dobra do ćwiczeń." },
];

export function Arkusze() {
  const { dane, blad, laduje } = useListaArkuszy();
  const profil = useProfil();
  // Domyślnie przedmiot i poziom, które konto zdaje (pierwszy z listy, jeśli zdaje kilka).
  const poziomKonta = (p: Przedmiot) => profil?.subjects.find((s) => s.id === p)?.poziom as Poziom | undefined;
  // ?przedmiot=…&poziom=… (z pulpitu i Nauki) otwiera od razu właściwą zakładkę.
  const [parametry] = useSearchParams();
  const zAdresu = PRZEDMIOTY.find((p) => p.id === parametry.get("przedmiot"))?.id;
  const poziomZAdresu = POZIOMY.find((p) => p === parametry.get("poziom"));
  const [przedmiot, setPrzedmiot] = useState<Przedmiot>(() => zAdresu ?? PRZEDMIOTY.find((p) => poziomKonta(p.id))?.id ?? "angielski");
  const [wybranyPoziom, setPoziom] = useState<Poziom>(() => poziomZAdresu ?? poziomKonta(przedmiot) ?? "podstawowy");
  const opis = PRZEDMIOTY.find((p) => p.id === przedmiot)!;
  const zPrzedmiotu = dane?.filter((a) => (a.przedmiot ?? "angielski") === przedmiot);
  // Poziomy, dla których są arkusze (matematyka na razie tylko podstawowa).
  const poziomy = POZIOMY.filter((p) => !zPrzedmiotu || zPrzedmiotu.some((a) => a.poziom === p));
  const poziom = poziomy.includes(wybranyPoziom) ? wybranyPoziom : (poziomy[0] ?? "podstawowy");
  // Poziom z profilu, którego arkuszy jeszcze nie ma, i przedmioty z profilu bez żadnych arkuszy: mówimy to wprost.
  const brakPoziomu = zPrzedmiotu && poziomKonta(przedmiot) && !poziomy.includes(poziomKonta(przedmiot)!) ? poziomKonta(przedmiot)! : null;
  const bezArkuszy = (profil?.subjects ?? []).filter((s) => !PRZEDMIOTY.some((p) => p.id === s.id)).map((s) => s.id);

  return (
    <main className={`container ${styles.page}`}>
      <NaglowekStrony etykieta={opis.opis} tytul="Arkusze" lead={opis.lead} />

      <nav className={styles.levels} aria-label="Przedmiot">
        {PRZEDMIOTY.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.level}
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
          {poziomy.map((p) => (
            <button key={p} type="button" className={styles.level} onClick={() => setPoziom(p)} aria-pressed={poziom === p}>
              {NAZWY[p]}
              {zPrzedmiotu && <span className={styles.levelCount}>{zPrzedmiotu.filter((a) => a.poziom === p).length}</span>}
            </button>
          ))}
        </nav>
      )}

      {(brakPoziomu || bezArkuszy.length > 0) && (
        <div className={styles.braki}>
          {brakPoziomu && <p className="muted">{brakArkuszy(przedmiot, brakPoziomu, poziomy)}</p>}
          {[...new Set(bezArkuszy)].map((id) => (
            <p key={id} className="muted">{brakArkuszy(id, null, [])}</p>
          ))}
        </div>
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
  const proc = postep.wynik && postep.wynik.mozliwe > 0 ? Math.round((postep.wynik.zdobyte / postep.wynik.mozliwe) * 100) : null;
  return (
    <li>
      <Link to={`/arkusze/${a.id}`} className={styles.card} title={a.symbol}>
        <span className="kicker">{a.sesja}</span>
        <span className={styles.year}>{a.rok}</span>
        <span className={styles.status}>
          {proc !== null ? <Pierscien wartosc={proc / 100} prog={a.poziom === "podstawowy" ? 0.3 : undefined} rozmiar={48} opis={`Wynik ${proc}%`} /> : zaczety ? <span className="small muted">w trakcie</span> : <span className="small muted">nierozwiązany</span>}
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
  const pliki = arkusze.some((a) => a.przedmiot === "informatyka");
  return [czas, punkty, nagranie ? "z nagraniem" : null, pliki ? "z plikami danych" : null].filter((x): x is string => !!x);
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
