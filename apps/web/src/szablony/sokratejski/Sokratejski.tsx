import { Link } from "react-router-dom";
import { Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

const DRABINA = ["Pytanie naprowadzające", "Wskazanie miejsca", "Podobny przykład", "Pierwszy krok", "Pełne rozwiązanie"];

export function Sokratejski() {
  return (
    <Strona
      slug="sokratejski"
      jakDziala={[
        "Cel rozmowy: jedna umiejętność z mapy. Pestka zna poziom ucznia i jego typowe błędy.",
        "Pestka pyta zamiast wykładać. Każda odpowiedź ucznia jest oceniana, a następne pytanie dobierane do niej.",
        "Drabina podpowiedzi: uczeń sam prosi o kolejny szczebel. Pozycja na drabinie obniża wagę dowodu opanowania.",
        "Po 5–8 wymianach mini-test (2–3 zadania bez pomocy). Wynik idzie do mapy, potem ekran rozbioru.",
        "Ważne pojęcia z rozmowy Pestka proponuje zapisać w mapie wiedzy.",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <span className="label">Cel rozmowy</span>
        </ZNumerem>
        <h2 className="h2">Funkcja kwadratowa: wierzchołek paraboli</h2>
      </section>

      <div className={s.boczna}>
        <article className={s.karta} style={{ justifyItems: "stretch" }}>
          <ZNumerem n={2}>
            <span className="label">Pestka</span>
          </ZNumerem>
          <div className={s.rozmowa}>
            <p className={s.dymek}>
              <span className={s.ktoMowi}>Pestka</span>
              Masz f(x) = x² − 6x + 5. Gdzie parabola przecina oś x?
            </p>
            <p className={`${s.dymek} ${s.dymekUczen}`}>
              <span className={s.ktoMowi}>Ty</span>W 1 i 5.
            </p>
            <p className={s.dymek}>
              <span className={s.ktoMowi}>Pestka</span>
              Dobrze. Parabola jest symetryczna. Co to mówi o x wierzchołka?
            </p>
          </div>
          <span className={s.pole}>Twoja odpowiedź…</span>
        </article>

        <aside className={s.kolumna}>
          <ZNumerem n={3}>
            <span className="label">Drabina podpowiedzi</span>
          </ZNumerem>
          <ul className={s.wiersze} style={{ width: "100%" }}>
            {DRABINA.map((d, i) => (
              <li key={d} className={s.wiersz}>
                <span className={i === 0 ? "" : "muted"}>{d}</span>
                <span className="muted small">{i === 0 ? "użyta" : `${i + 1}`}</span>
              </li>
            ))}
          </ul>
          <span className="btn btn-ghost btn-sm">Następna podpowiedź</span>
        </aside>
      </div>

      <section className={s.siatka2}>
        <div className={s.kolumna}>
          <ZNumerem n={4}>
            <span className="label">Na koniec</span>
          </ZNumerem>
          <p className="muted">Mini-test: 3 zadania, bez podpowiedzi.</p>
          <Link to={adres("rozbior")} className="btn btn-primary btn-sm">
            Przejdź do testu
          </Link>
        </div>
        <div className={s.kolumna}>
          <ZNumerem n={5}>
            <span className="label">Zapisz w mapie wiedzy</span>
          </ZNumerem>
          <p className="muted">„Oś symetrii paraboli przechodzi przez środek między miejscami zerowymi.”</p>
          <Link to={adres("mapa-wiedzy")} className="link">
            Dodaj do mapy
          </Link>
        </div>
      </section>
    </Strona>
  );
}
