import { Link } from "react-router-dom";
import { Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

// Parabola y = a(x − 2)² − 1 dla a = 1, w układzie 0..300 × 0..200.
const punkty = Array.from({ length: 41 }, (_, i) => {
  const x = -1 + i * 0.15;
  const y = (x - 2) ** 2 - 1;
  return `${40 + (x + 1) * 40},${160 - y * 20}`;
}).join(" ");

export function Wizualizacje() {
  return (
    <Strona
      slug="wizualizacje"
      jakDziala={[
        "Wybór modelu dla przedmiotu: wykres z suwakami (matematyka), algorytm krok po kroku (informatyka), tekst z zaznaczaniem (języki).",
        "Obszar modelu. Zmiana parametru od razu przerysowuje wykres; bez sprawdzania i bez punktów.",
        "Suwaki parametrów. Pestka może zadać pytanie typu „co się stanie, gdy a < 0?”, uczeń sprawdza suwakiem.",
        "Obserwacje: krótkie wnioski, które uczeń potwierdza. Po nich propozycja szybkiej rundy z tego pojęcia.",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <div className={s.chipy}>
            <span className={`${s.chip} ${s.chipAktywny}`}>Wykres funkcji</span>
            <span className={s.chip}>Algorytm krok po kroku</span>
            <span className={s.chip}>Tekst i parafraza</span>
          </div>
        </ZNumerem>
      </section>

      <div className={s.boczna}>
        <div style={{ display: "grid", gap: 12 }}>
          <ZNumerem n={2}>
            <span className="label">y = a(x − p)² + q</span>
          </ZNumerem>
          <svg viewBox="0 0 300 200" style={{ width: "100%", maxWidth: 560, background: "var(--surface)", borderRadius: "var(--r-md)" }} role="img" aria-label="Parabola z wierzchołkiem w punkcie (2, −1)">
            <line x1="0" y1="160" x2="300" y2="160" stroke="var(--line)" strokeWidth="1.5" />
            <line x1="80" y1="0" x2="80" y2="200" stroke="var(--line)" strokeWidth="1.5" />
            <polyline points={punkty} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="160" cy="180" r="5" fill="var(--fg)" />
          </svg>
        </div>
        <aside className={s.kolumna}>
          <ZNumerem n={3}>
            <span className="label">Parametry</span>
          </ZNumerem>
          {[
            ["a", "1", 60],
            ["p", "2", 70],
            ["q", "−1", 40],
          ].map(([n, w, pct]) => (
            <label key={n} style={{ display: "grid", gap: 6, width: "100%" }}>
              <span className="small">
                {n} = {w}
              </span>
              <input type="range" defaultValue={pct} disabled style={{ width: "100%", accentColor: "var(--primary)" }} />
            </label>
          ))}
        </aside>
      </div>

      <section className={s.sekcja}>
        <ZNumerem n={4}>
          <h2 className="h3">Co zauważasz</h2>
        </ZNumerem>
        <ul className={s.wiersze}>
          <li className={s.wiersz}>
            <span>Zmiana p przesuwa wykres w poziomie.</span>
            <span className={`small ${s.ok}`}>potwierdzone</span>
          </li>
          <li className={s.wiersz}>
            <span>Gdy a &lt; 0, ramiona idą w dół.</span>
            <span className="muted small">sprawdź suwakiem</span>
          </li>
        </ul>
        <Link to={adres("szybka-runda")} className="btn btn-secondary" style={{ justifySelf: "start" }}>
          Przećwicz w szybkiej rundzie
        </Link>
      </section>
    </Strona>
  );
}
