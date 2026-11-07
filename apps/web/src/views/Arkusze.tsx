import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Clock, Headphones } from "lucide-react";
import { useListaArkuszy } from "../arkusze/dane";
import { wczytajPostep } from "../arkusze/postep";
import type { Poziom } from "../arkusze/typy";
import styles from "./Arkusze.module.css";

const POZIOMY: Poziom[] = ["podstawowy", "rozszerzony", "dwujezyczny"];

export function Arkusze() {
  const { dane, blad, laduje } = useListaArkuszy();
  const [poziom, setPoziom] = useState<Poziom>("podstawowy");

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.head}>
        <span className="label">Język angielski · formuła 2023</span>
        <h1 className="display">Arkusze</h1>
        <p className="lead">Arkusze maturalne CKE do rozwiązania w przeglądarce. Zadania zamknięte sprawdzam od razu z kluczem, otwarte porównuję z zasadami oceniania.</p>
      </header>

      <nav className={styles.levels} aria-label="Poziom">
        {POZIOMY.map((p) => (
          <button key={p} type="button" className={`${styles.level} ${poziom === p ? styles.levelActive : ""}`} onClick={() => setPoziom(p)} aria-pressed={poziom === p}>
            {{ podstawowy: "Podstawowy", rozszerzony: "Rozszerzony", dwujezyczny: "Dwujęzyczny" }[p]}
          </button>
        ))}
      </nav>

      {laduje && <p className="muted">Wczytuję listę…</p>}
      {blad && <BrakDanych blad={blad} />}

      {dane && (
        <ul className={styles.list}>
          {dane
            .filter((a) => a.poziom === poziom)
            .map((a) => {
              const postep = wczytajPostep(a.id);
              const zaczety = Object.keys(postep.odpowiedzi).length > 0;
              return (
                <li key={a.id}>
                  <Link to={`/arkusze/${a.id}`} className={styles.row}>
                    <span className={styles.year}>{a.rok}</span>
                    <span className={styles.info}>
                      <span className={styles.title}>
                        Matura {a.sesja} {a.rok}
                      </span>
                      <span className={`small muted ${styles.meta}`}>
                        <span>{a.symbol}</span>
                        {a.czas && (
                          <span>
                            <Clock size={13} aria-hidden="true" /> {a.czas} min
                          </span>
                        )}
                        <span>
                          <Headphones size={13} aria-hidden="true" /> z nagraniem
                        </span>
                        <span>{a.punkty} pkt</span>
                      </span>
                    </span>
                    <span className={styles.status}>
                      {postep.wynik ? (
                        <span className={styles.score}>
                          {Math.round((postep.wynik.zdobyte / postep.wynik.mozliwe) * 100)}%
                        </span>
                      ) : zaczety ? (
                        <span className="small muted">w trakcie</span>
                      ) : null}
                      <ChevronRight size={18} aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
        </ul>
      )}
    </main>
  );
}

function BrakDanych({ blad }: { blad: string }) {
  return (
    <section className={styles.empty}>
      <h2 className="h3">{blad === "brak-danych" ? "Nie ma jeszcze zaimportowanych arkuszy" : "Nie udało się wczytać arkuszy"}</h2>
      <p className="muted">
        Arkusze CKE nie są częścią repozytorium. Pobierz je i przetwórz z katalogu głównego projektu, a potem odśwież stronę:
      </p>
      <pre className={styles.code}>npm run pobierz{"\n"}npm run importuj</pre>
      {blad !== "brak-danych" && <p className="small muted">Szczegóły: {blad}</p>}
    </section>
  );
}
