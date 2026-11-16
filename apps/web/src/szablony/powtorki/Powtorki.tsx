import { Link } from "react-router-dom";
import { Pasek, Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

export function Powtorki() {
  return (
    <Strona
      slug="powtorki"
      jakDziala={[
        "Jedna polecana powtórka na dziś: zanikająca umiejętność z największą wagą na maturze. Start uruchamia szybką rundę.",
        "Zanikające: opanowanie spada z czasem bez ćwiczenia (model zanikania). Pokazujemy, ile dni od ostatniego ćwiczenia.",
        "Błędy do przećwiczenia: konkretne pomyłki z arkuszy i formatów. Każdy prowadzi do „Napraw błąd” na podobnym materiale.",
        "Zrobione dziś znikają z listy; po tygodniu wracają, jeśli opanowanie znów spadnie.",
      ]}
    >
      <article className={s.karta}>
        <ZNumerem n={1}>
          <span className="label" style={{ color: "var(--primary-text)" }}>
            Na dziś · 4 min
          </span>
        </ZNumerem>
        <h2 className="h1">Szczegółowe informacje w słuchaniu</h2>
        <p className="muted">Nie ćwiczone od 12 dni, a to 9% punktów na maturze.</p>
        <Link to={adres("szybka-runda")} className="btn btn-primary">
          Zacznij rundę
        </Link>
      </article>

      <section className={s.sekcja}>
        <ZNumerem n={2}>
          <h2 className="h2">Zanikające</h2>
        </ZNumerem>
        <ul className={s.wiersze}>
          {[
            ["Główna myśl tekstu", 72, "8 dni"],
            ["Środki językowe: słowotwórstwo", 54, "15 dni"],
            ["Funkcja kwadratowa", 47, "21 dni"],
          ].map(([n, pct, dni]) => (
            <li key={n as string}>
              <Link to={adres("szybka-runda")} className={`${s.wiersz} ${s.wiersz3}`}>
                <span>{n}</span>
                <Pasek pct={pct as number} />
                <span className="muted small">{dni} temu</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.sekcja}>
        <ZNumerem n={3}>
          <h2 className="h2">Błędy do przećwiczenia</h2>
        </ZNumerem>
        <ul className={s.wiersze}>
          {[
            ["„have went” zamiast „went”", "Arkusz maj 2025 · zad. 7"],
            ["Odpowiedź dosłowna zamiast intencji", "Szybka runda · 13 lis"],
          ].map(([b, skad]) => (
            <li key={b}>
              <Link to={adres("napraw-blad")} className={s.wiersz}>
                <span>
                  {b}
                  <br />
                  <span className="muted small">{skad}</span>
                </span>
                <span className="link">Napraw</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.sekcja}>
        <ZNumerem n={4}>
          <span className="muted">Zrobione dziś: 1. Wrócą, gdy opanowanie znów spadnie.</span>
        </ZNumerem>
      </section>
    </Strona>
  );
}
