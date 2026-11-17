import { Link } from "react-router-dom";
import { ArrowRight, LayoutList } from "lucide-react";
import { adres, szablon } from "./lista";
import styles from "./Szablon.module.css";

// Wejścia do pustych prototypów z działających widoków (pulpit i profil; gotowe widoki, np. Ustawienia, są stąd usuwane), żeby całą ścieżkę dało się przeklikać.
export function Wejscia({ tytul, slugi }: { tytul: string; slugi: string[] }) {
  return (
    <section className={styles.sekcja} aria-label={tytul}>
      <div className={styles.sekcjaGlowa}>
        <h2 className="h3">{tytul}</h2>
        <Link to="/szablony" className="link">
          <LayoutList size={16} aria-hidden="true" />
          Ścieżka nauki i wszystkie szablony
        </Link>
      </div>
      <ul className={styles.wiersze}>
        {slugi.map((sl) => {
          const s = szablon(sl)!;
          return (
            <li key={sl}>
              <Link to={adres(sl)} className={styles.spisWiersz}>
                <span className={styles.spisTytul}>{s.tytul}</span>
                <span className="muted small">{s.opis}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
