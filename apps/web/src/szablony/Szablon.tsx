import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutList } from "lucide-react";
import { adres, szablon } from "./lista";
import styles from "./Szablon.module.css";

type Props = {
  slug: string;
  children: ReactNode;
  /** Kroki objaśniające numery na stronie, w kolejności. */
  jakDziala: string[];
};

// Rama każdego szablonu: nagłówek z listy, treść, objaśnienie numerów i dalsze kroki w ścieżce nauki.
export function Strona({ slug, children, jakDziala }: Props) {
  const sz = szablon(slug);
  if (!sz) return null;
  return (
    <main className={`container ${styles.strona}`}>
      <header className={styles.glowa}>
        <span className={styles.znacznik}>
          <span>Szablon</span>
          <span className="label">{sz.grupa}</span>
        </span>
        <h1 className="display">{sz.tytul}</h1>
        <p className="lead">{sz.opis}</p>
      </header>

      {children}

      <section className={styles.jakDziala} aria-labelledby="jak-dziala">
        <h2 id="jak-dziala" className="h3">
          Jak to działa
        </h2>
        <ol>
          {jakDziala.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ol>
        <p className="muted small">
          Wejście w aplikacji: {sz.wejscie}. Opis i lista zadań: <code>apps/web/src/szablony/{slug}/README.md</code>.
        </p>
      </section>

      <nav className={styles.sekcja} aria-label="Dalej w ścieżce nauki">
        <div className={styles.sekcjaGlowa}>
          <h2 className="h3">Dalej w ścieżce</h2>
          <Link to="/szablony" className="link">
            <LayoutList size={16} aria-hidden="true" />
            Wszystkie szablony
          </Link>
        </div>
        {sz.dalej.length ? (
          <ul className={styles.wiersze}>
            {sz.dalej.map((d) => {
              const n = szablon(d)!;
              return (
                <li key={d}>
                  <Link to={adres(d)} className={styles.spisWiersz}>
                    <span className={styles.spisTytul}>{n.tytul}</span>
                    <span className="muted small">{n.opis}</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">To narzędzie poboczne, nie prowadzi dalej. Wróć na <Link to="/" className="link">pulpit</Link>.</p>
        )}
      </nav>
    </main>
  );
}

export function Nr({ n }: { n: number }) {
  return (
    <span className={styles.nr} aria-label={`krok ${n}`}>
      {n}
    </span>
  );
}

/** Nagłówek z numerem objaśnionym w „Jak to działa”. */
export function ZNumerem({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className={styles.zNumerem}>
      <Nr n={n} />
      {children}
    </span>
  );
}

/** Szare kreski w miejscu treści, która przyjdzie z danych. */
export function Kreski({ szer = [100, 92, 64] }: { szer?: number[] }) {
  return (
    <span className={styles.kreski} aria-hidden="true">
      {szer.map((w, i) => (
        <span key={i} className={styles.kreska} style={{ width: `${w}%` }} />
      ))}
    </span>
  );
}

export function Pasek({ pct }: { pct: number }) {
  const poziom = pct < 40 ? "niski" : pct < 70 ? "sredni" : "wysoki";
  return (
    <span className={styles.pasek} aria-hidden="true">
      <span style={{ width: `${pct}%` }} data-poziom={poziom} />
    </span>
  );
}
