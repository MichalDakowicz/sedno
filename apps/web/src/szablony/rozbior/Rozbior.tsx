import { Link } from "react-router-dom";
import { Pasek, Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

export function Rozbior() {
  return (
    <Strona
      slug="rozbior"
      jakDziala={[
        "Wynik sesji jednym zdaniem i liczbą. Wspólny ekran dla wszystkich formatów; różni się tylko środek.",
        "Co poszło i co nie, w kategoriach z rubryki (sześć typów błędu). Każdy wiersz rozwija się do konkretnego miejsca w pracy.",
        "Zmiana na mapie umiejętności: przed i po. Dowód z formatu ma wagę zależną od użytej pomocy.",
        "Jeden polecany następny krok (karta) i alternatywy. Błędy trafiają do powtórek.",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <span className="label">Napraw błąd · 12 min</span>
        </ZNumerem>
        <p className="h1">
          2 z 3 błędów poprawione. <span className="muted">Jeden przeoczony.</span>
        </p>
      </section>

      <div className={s.siatka2}>
        <section className={s.kolumna}>
          <ZNumerem n={2}>
            <h2 className="h3">Co poszło</h2>
          </ZNumerem>
          <ul className={s.wiersze} style={{ width: "100%" }}>
            <li className={s.wiersz}>
              <span>Gramatyka: czasy przeszłe</span>
              <span className={`small ${s.ok}`}>2 z 2</span>
            </li>
            <li className={s.wiersz}>
              <span>Treść niezgodna z poleceniem</span>
              <span className={`small ${s.zle}`}>0 z 1</span>
            </li>
            <li className={s.wiersz}>
              <span>Fałszywe trafienia</span>
              <span className="muted small">1</span>
            </li>
          </ul>
        </section>
        <section className={s.kolumna}>
          <ZNumerem n={3}>
            <h2 className="h3">Mapa umiejętności</h2>
          </ZNumerem>
          <div style={{ display: "grid", gap: 6, width: "100%" }}>
            <span className="small">Czasy przeszłe · 52% → 61%</span>
            <Pasek pct={61} />
          </div>
          <div style={{ display: "grid", gap: 6, width: "100%" }}>
            <span className="small">Realizacja polecenia · 40% → 38%</span>
            <Pasek pct={38} />
          </div>
          <Link to={adres("umiejetnosci")} className="link">
            Cała mapa
          </Link>
        </section>
      </div>

      <article className={s.karta}>
        <ZNumerem n={4}>
          <span className="label" style={{ color: "var(--primary-text)" }}>
            Dalej
          </span>
        </ZNumerem>
        <h2 className="h2">Przeoczona treść: wytłumacz to Koledze</h2>
        <p className="muted">Uczysz się szybciej, gdy musisz komuś wyjaśnić, czego wymaga polecenie.</p>
        <div className={s.akcje}>
          <Link to={adres("uczen-uczy")} className="btn btn-primary">
            Zacznij · 10 min
          </Link>
          <Link to={adres("powtorki")} className="btn btn-ghost">
            Zostaw na powtórkę
          </Link>
        </div>
      </article>
    </Strona>
  );
}
