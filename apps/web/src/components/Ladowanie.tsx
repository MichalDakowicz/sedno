// Stan wczytywania bez migania: przy szybkim wczytaniu nic się nie pokazuje, a szkielet o kształcie
// treści pojawia się dopiero po chwili. Czytnik ekranu od razu dostaje komunikat.
import { useEffect, useState } from "react";
import styles from "./Ladowanie.module.css";

type Ksztalt = "wiersze" | "tekst" | "pulpit" | "blok";

export function Ladowanie({ ksztalt = "wiersze", ile = 4, etykieta, opoznienie = 350 }: { ksztalt?: Ksztalt; ile?: number; etykieta: string; opoznienie?: number }) {
  const [widac, setWidac] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setWidac(true), opoznienie);
    return () => window.clearTimeout(t);
  }, [opoznienie]);

  return (
    <div className={styles.wrap} role="status" aria-busy="true">
      <span className="visually-hidden">{etykieta}…</span>
      {widac && (
        <div className={styles.szkielet} aria-hidden="true">
          {ksztalt === "pulpit" && (
            <>
              <span className={styles.karta} />
              <span className={styles.naglowek} />
              {Array.from({ length: ile }, (_, i) => (
                <span key={i} className={styles.wiersz} />
              ))}
            </>
          )}
          {ksztalt === "wiersze" &&
            Array.from({ length: ile }, (_, i) => (
              <span key={i} className={styles.wiersz} />
            ))}
          {ksztalt === "tekst" && (
            <>
              <span className={styles.tytul} />
              {Array.from({ length: ile }, (_, i) => (
                <span key={i} className={styles.linia} style={{ width: `${92 - ((i * 17) % 35)}%` }} />
              ))}
            </>
          )}
          {ksztalt === "blok" && <span className={styles.karta} />}
        </div>
      )}
    </div>
  );
}
