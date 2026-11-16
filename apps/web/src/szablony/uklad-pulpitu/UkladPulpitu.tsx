import { Link } from "react-router-dom";
import { GripVertical } from "lucide-react";
import { Strona, ZNumerem } from "../Szablon";
import s from "../Szablon.module.css";

const WIDGETY = [
  { n: "Dziś warto", opis: "Rekomendacja na dziś", wl: true, stale: true },
  { n: "Wyniki z arkuszy", opis: "Średnia i ostatnie arkusze", wl: true },
  { n: "Powtórki", opis: "Zanikające umiejętności", wl: true },
  { n: "Do matury", opis: "Odliczanie i plan tygodnia", wl: false },
  { n: "Mapa umiejętności", opis: "Najsłabsze umiejętności przedmiotu", wl: true },
  { n: "Wybierz temat", opis: "Wolny temat i mapa wiedzy", wl: false },
];

export function UkladPulpitu() {
  return (
    <Strona
      slug="uklad-pulpitu"
      jakDziala={[
        "Gotowe układy: „Nauka” (dużo propozycji) i „Egzamin” (arkusze i odliczanie). Wybór układu ustawia listę niżej.",
        "Lista widgetów: włącz lub wyłącz, przeciągnij za uchwyt, żeby zmienić kolejność. „Dziś warto” zostaje zawsze na górze.",
        "Zmiany widać od razu na pulpicie; „Przywróć domyślny” cofa wszystko. Układ jest wspólny dla przedmiotów (decyzja otwarta).",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <span className="label">Układ</span>
        </ZNumerem>
        <div className={s.chipy}>
          <span className={`${s.chip} ${s.chipAktywny}`}>Nauka</span>
          <span className={s.chip}>Egzamin</span>
          <span className={s.chip}>Własny</span>
        </div>
      </section>

      <section className={s.sekcja}>
        <ZNumerem n={2}>
          <h2 className="h2">Widgety</h2>
        </ZNumerem>
        <ul className={s.wiersze}>
          {WIDGETY.map((w) => (
            <li key={w.n} className={s.wiersz}>
              <span className={s.zNumerem}>
                <GripVertical size={18} aria-hidden="true" style={{ color: w.stale ? "var(--line)" : "var(--subtle)" }} />
                <span>
                  {w.n}
                  <br />
                  <span className="muted small">{w.stale ? "zawsze na górze" : w.opis}</span>
                </span>
              </span>
              <span className={`${s.przelacznik} ${w.wl ? s.przelacznikWl : ""}`} aria-hidden="true" />
            </li>
          ))}
        </ul>
      </section>

      <div className={s.akcje}>
        <ZNumerem n={3}>
          <Link to="/" className="btn btn-primary">
            Zobacz pulpit
          </Link>
        </ZNumerem>
        <span className="btn btn-ghost">Przywróć domyślny</span>
      </div>
    </Strona>
  );
}
