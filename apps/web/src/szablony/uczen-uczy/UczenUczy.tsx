import { Link } from "react-router-dom";
import { Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

export function UczenUczy() {
  return (
    <Strona
      slug="uczen-uczy"
      jakDziala={[
        "Zadanie rundy: pojęcie do wytłumaczenia i persona Kolegi (np. „pilny, ale myli czasy”). Uczeń widzi, z czym Kolega ma problem.",
        "Rozmowa: Kolega dopytuje i popełnia typowe błędy, które uczeń ma wyłapać. Kolega nigdy nie podaje poprawnej odpowiedzi sam.",
        "Pole odpowiedzi ucznia. Zakaz wklejania gotowców: Sędzia ocenia, czy wyjaśnienie jest własne i poprawne.",
        "Lista kontrolna Sędziego: elementy dobrego wyjaśnienia odhaczane na żywo (bez punktów w trakcie).",
        "Koniec rundy: Kolega dostaje mini-test. Jego wynik to dowód, że wyjaśnienie zadziałało. Potem ekran rozbioru.",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <span className="label">Wytłumacz Koledze</span>
        </ZNumerem>
        <h2 className="h2">Kiedy używamy present perfect, a kiedy past simple?</h2>
        <p className="muted">Kolega: Bartek, pilny, ale wszystko, co było, wrzuca do present perfect.</p>
      </section>

      <div className={s.boczna}>
        <article className={s.karta} style={{ justifyItems: "stretch" }}>
          <ZNumerem n={2}>
            <span className="label">Rozmowa</span>
          </ZNumerem>
          <div className={s.rozmowa}>
            <p className={s.dymek}>
              <span className={s.ktoMowi}>Bartek</span>
              Czyli „I have been to London last year” jest dobrze? Przecież to doświadczenie.
            </p>
            <p className={`${s.dymek} ${s.dymekUczen}`}>
              <span className={s.ktoMowi}>Ty</span>
              Nie, bo jest „last year”. Gdy mówisz, kiedy dokładnie, to past simple.
            </p>
            <p className={s.dymek}>
              <span className={s.ktoMowi}>Bartek</span>A „I have seen him today”?
            </p>
          </div>
          <ZNumerem n={3}>
            <span className={s.pole} style={{ flex: 1 }}>
              Wytłumacz Bartkowi…
            </span>
          </ZNumerem>
        </article>

        <aside className={s.kolumna}>
          <ZNumerem n={4}>
            <span className="label">Sędzia sprawdza</span>
          </ZNumerem>
          <ul className={s.wiersze} style={{ width: "100%" }}>
            <li className={s.wiersz}>
              <span>Określony czas w przeszłości</span>
              <span className={`small ${s.ok}`}>jest</span>
            </li>
            <li className={s.wiersz}>
              <span>Okres, który trwa (today, this week)</span>
              <span className="muted small">czeka</span>
            </li>
            <li className={s.wiersz}>
              <span>Przykład z życia</span>
              <span className="muted small">czeka</span>
            </li>
          </ul>
        </aside>
      </div>

      <div className={s.akcje}>
        <ZNumerem n={5}>
          <Link to={adres("rozbior")} className="btn btn-primary">
            Sprawdź Bartka
          </Link>
        </ZNumerem>
      </div>
    </Strona>
  );
}
