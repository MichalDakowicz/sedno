import { Link } from "react-router-dom";
import { Activity, Bug, Lightbulb, ListChecks, MessageCircle, Timer } from "lucide-react";
import { Kreski, Pasek, Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

const FORMATY = [
  { slug: "napraw-blad", nazwa: "Napraw błąd", czas: "10–15 min", ikona: Bug, kiedy: "Gdy umiesz, ale robisz błędy" },
  { slug: "uczen-uczy", nazwa: "Wytłumacz Koledze", czas: "8–12 min", ikona: MessageCircle, kiedy: "Gdy chcesz sprawdzić zrozumienie" },
  { slug: "krok-po-kroku", nazwa: "Krok po kroku", czas: "20–40 min", ikona: ListChecks, kiedy: "Dłuższa odpowiedź, wypracowanie" },
  { slug: "sokratejski", nazwa: "Rozmowa z Pestką", czas: "5–15 min", ikona: Lightbulb, kiedy: "Gdy czegoś nie rozumiesz" },
  { slug: "szybka-runda", nazwa: "Szybka runda", czas: "3–5 min", ikona: Timer, kiedy: "Na rozgrzewkę i powtórkę" },
  { slug: "wizualizacje", nazwa: "Zobacz, jak działa", czas: "5 min", ikona: Activity, kiedy: "Pojęcie, które trzeba zobaczyć" },
];

export function Nauka() {
  return (
    <Strona
      slug="nauka"
      jakDziala={[
        "Na górze przedmiot i umiejętność, którą Sedno proponuje (ta sama, co „Dziś warto” na pulpicie). Uczeń może ją zmienić.",
        "Rekomendowany format: dobrany do poziomu opanowania i rodzaju umiejętności. Jedyna karta na stronie.",
        "Pozostałe formaty jako wiersze z czasem i krótkim „kiedy”. Kliknięcie od razu startuje sesję.",
        "Wolny temat: uczeń wpisuje, czego chce się nauczyć, a Pestka dobiera umiejętność i format.",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <span className="label">Ćwiczysz</span>
        </ZNumerem>
        <div className={s.chipy}>
          <span className={`${s.chip} ${s.chipAktywny}`}>Angielski</span>
          <span className={s.chip}>Matematyka</span>
          <span className={s.chip}>Informatyka</span>
        </div>
        <div className={s.wiersz} style={{ borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <span className="h3">Rozumienie ze słuchu: intencja mówiącego</span>
            <Pasek pct={38} />
          </div>
          <span className="link">Zmień</span>
        </div>
      </section>

      <div className={s.boczna}>
        <article className={s.karta}>
          <ZNumerem n={2}>
            <span className="label" style={{ color: "var(--primary-text)" }}>
              Polecam
            </span>
          </ZNumerem>
          <h2 className="h1">Napraw błąd</h2>
          <p className="muted">Masz 38% w tej umiejętności i ostatnio myliłeś intencję z dosłowną treścią. Znajdź trzy takie pomyłki w cudzej pracy.</p>
          <div className={s.akcje}>
            <Link to={adres("napraw-blad")} className="btn btn-primary">
              Zacznij · 12 min
            </Link>
          </div>
        </article>
        <div className={s.kolumna}>
          <ZNumerem n={4}>
            <span className="label">Wolny temat</span>
          </ZNumerem>
          <p className="muted small">Napisz, czego chcesz się nauczyć.</p>
          <span className={s.pole}>np. „mowa zależna w czasie przeszłym”</span>
        </div>
      </div>

      <section className={s.sekcja}>
        <ZNumerem n={3}>
          <h2 className="h2">Inne formaty</h2>
        </ZNumerem>
        <ul className={s.wiersze}>
          {FORMATY.map(({ slug, nazwa, czas, ikona: Ikona, kiedy }) => (
            <li key={slug}>
              <Link to={adres(slug)} className={s.spisWiersz}>
                <span className={s.zNumerem}>
                  <span className={s.ikonaTlo}>
                    <Ikona size={18} aria-hidden="true" />
                  </span>
                  <span className={s.spisTytul}>{nazwa}</span>
                </span>
                <span className="muted small">
                  {kiedy} · {czas}
                </span>
                <span aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={s.sekcja}>
        <h2 className="h3">Ostatnio</h2>
        <Kreski szer={[60, 44]} />
      </section>
    </Strona>
  );
}
