// Stan wczytywania bez migania: przy szybkim wczytaniu nic się nie pokazuje, a szkielet o kształcie
// treści pojawia się dopiero po chwili. Miejsce na szkielet jest zajęte od razu, więc ani szkielet, ani treść
// po nim nie przesuwają reszty strony. Czytnik ekranu od razu dostaje komunikat.
import { useEffect, useState, type CSSProperties } from "react";
import { TutorAvatar } from "./TutorAvatar";
import { glos, wybierz } from "../pestka/glos";
import styles from "./Ladowanie.module.css";

// Po tylu ms nad szkieletem siada Pestka, która „myśli”, z jednym zdaniem: długie czekanie nie jest szare.
const DLUGO = 1000;

type Ksztalt = "wiersze" | "tekst" | "pulpit" | "blok";

// Wysokość szkieletu z Ladowanie.module.css (wiersz 64 px, odstęp 12 px, karta 300 px, linia 16 px).
function wysokosc(ksztalt: Ksztalt, ile: number) {
  if (ksztalt === "blok") return 300;
  if (ksztalt === "wiersze") return ile * 64 + (ile - 1) * 12;
  if (ksztalt === "tekst") return 52 + ile * 28;
  return 300 + 72 + ile * 76;
}

/**
 * wysokosc: zmierzona wysokość docelowej treści, gdy kształt z `ile` jej nie oddaje (karta dnia, wykres w widgecie);
 * para [szeroki ekran, telefon poniżej 640 px], bo na telefonie ta sama treść jest zwykle wyższa.
 */
export function Ladowanie({ ksztalt = "wiersze", ile = 4, etykieta, opoznienie = 350, wysokosc: naSztywno }: { ksztalt?: Ksztalt; ile?: number; etykieta: string; opoznienie?: number; wysokosc?: number | [number, number] }) {
  const [szeroki, telefon] = Array.isArray(naSztywno) ? naSztywno : [naSztywno, naSztywno];
  const zmierzona = szeroki !== undefined ? ({ "--wys-szkieletu": `${szeroki}px`, "--wys-szkieletu-tel": `${telefon}px` } as CSSProperties) : { minHeight: wysokosc(ksztalt, ile) };
  const [widac, setWidac] = useState(false);
  const [dlugo, setDlugo] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setWidac(true), opoznienie);
    const d = window.setTimeout(() => setDlugo(true), Math.max(DLUGO, opoznienie));
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(d);
    };
  }, [opoznienie]);

  return (
    <div className={styles.wrap} data-ksztalt={ksztalt} data-zmierzona={szeroki !== undefined || undefined} style={zmierzona} role="status" aria-busy="true">
      <span className="visually-hidden">{etykieta}…</span>
      {dlugo && (
        <span className={styles.pestka} aria-hidden="true">
          <TutorAvatar size={32} state="thinking" />
          {wybierz(glos.ladowanie, etykieta.length)}
        </span>
      )}
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
