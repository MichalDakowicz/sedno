import { Link } from "react-router-dom";
import { Camera } from "lucide-react";
import { Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

export function Zdjecie() {
  return (
    <Strona
      slug="zdjecie"
      jakDziala={[
        "Uczeń wybiera zadanie (z arkusza albo opisuje własne) i robi zdjęcie kartki albo wrzuca plik.",
        "Podgląd z kadrowaniem. Zdjęcie nie wychodzi poza konto ucznia; bez twarzy i danych osobowych na kadrze.",
        "OCR i model czytają rozwiązanie. Uczeń widzi, co zostało odczytane, i poprawia błędy odczytu, zanim Pestka oceni.",
        "Omówienie jak przy błędach z arkusza: krok po kroku, gdzie jest błąd i dlaczego. Bez gotowego rozwiązania od razu.",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <span className="label">Zadanie</span>
        </ZNumerem>
        <span className={s.pole}>Matura podstawowa maj 2025 · zadanie 28</span>
      </section>

      <div className={s.siatka2}>
        <section style={{ display: "grid", gap: 12 }}>
          <ZNumerem n={2}>
            <span className="label">Zdjęcie</span>
          </ZNumerem>
          <div className={s.obszar}>
            <span style={{ display: "grid", gap: 10, justifyItems: "center" }}>
              <Camera size={28} aria-hidden="true" />
              Zrób zdjęcie albo upuść plik
            </span>
          </div>
        </section>
        <section style={{ display: "grid", gap: 12 }}>
          <ZNumerem n={3}>
            <span className="label">Odczytane</span>
          </ZNumerem>
          <ul className={s.wiersze}>
            <li className={s.wiersz}>
              <span>Δ = 36 − 20 = 16</span>
              <span className="link">Popraw</span>
            </li>
            <li className={s.wiersz}>
              <span>x₁ = (6 − 4) / 2 = 1</span>
              <span className="link">Popraw</span>
            </li>
            <li className={s.wiersz}>
              <span className={s.zaznaczenie}>x₂ = (6 + 4) / 2 = 4</span>
              <span className="link">Popraw</span>
            </li>
          </ul>
          <span className="btn btn-secondary btn-sm" style={{ justifySelf: "start" }}>
            Odczyt się zgadza
          </span>
        </section>
      </div>

      <article className={s.karta}>
        <ZNumerem n={4}>
          <span className="label" style={{ color: "var(--primary-text)" }}>
            Pestka
          </span>
        </ZNumerem>
        <p>Delta i pierwszy pierwiastek dobrze. Sprawdź jeszcze raz dzielenie w ostatniej linijce: ile to 10 / 2?</p>
        <Link to={adres("rozbior")} className="btn btn-primary btn-sm">
          Zakończ omówienie
        </Link>
      </article>
    </Strona>
  );
}
