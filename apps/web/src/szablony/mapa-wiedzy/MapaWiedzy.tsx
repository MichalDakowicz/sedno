import { Link } from "react-router-dom";
import { Kreski, Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

const WEZLY = [
  { id: "a", x: 150, y: 110, t: "Funkcja kwadratowa", glowny: true },
  { id: "b", x: 60, y: 40, t: "Miejsca zerowe" },
  { id: "c", x: 280, y: 50, t: "Wierzchołek" },
  { id: "d", x: 300, y: 180, t: "Oś symetrii" },
  { id: "e", x: 50, y: 190, t: "Delta" },
];
const KRAWEDZIE = [
  ["a", "b"],
  ["a", "c"],
  ["c", "d"],
  ["b", "e"],
  ["e", "a"],
];

export function MapaWiedzy() {
  const w = (id: string) => WEZLY.find((n) => n.id === id)!;
  return (
    <Strona
      slug="mapa-wiedzy"
      jakDziala={[
        "Wyszukiwarka i filtr przedmiotu. Mapa jest prywatna: tylko uczeń i Pestka ją widzą.",
        "Węzły to notatki ucznia (pojęcia, wzory, przykłady). Połączenia proponuje AI, uczeń je zatwierdza albo usuwa.",
        "Panel węzła: notatka własnymi słowami, połączenia, skąd się wzięła (rozmowa, arkusz). Edycja tylko przez ucznia.",
        "„Zapytaj Pestkę o to” otwiera rozmowę sokratejską z kontekstem węzła i jego sąsiadów.",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <span className={s.pole} style={{ minWidth: 280 }}>
            Szukaj w notatkach…
          </span>
        </ZNumerem>
      </section>

      <div className={s.boczna}>
        <div style={{ display: "grid", gap: 12 }}>
          <ZNumerem n={2}>
            <span className="label">Matematyka · 5 notatek</span>
          </ZNumerem>
          <svg viewBox="0 0 360 230" style={{ width: "100%", maxWidth: 560, background: "var(--surface)", borderRadius: "var(--r-md)" }} role="img" aria-label="Przykładowa mapa pojęć">
            {KRAWEDZIE.map(([a, b], i) => (
              <line
                key={a + b}
                x1={w(a).x}
                y1={w(a).y}
                x2={w(b).x}
                y2={w(b).y}
                stroke={i === 4 ? "var(--primary)" : "var(--line)"}
                strokeWidth="2"
                strokeDasharray={i === 4 ? "5 5" : undefined}
              />
            ))}
            {WEZLY.map((n) => (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r={n.glowny ? 9 : 6} fill={n.glowny ? "var(--primary)" : "var(--fg)"} />
                <text x={n.x} y={n.y - 14} textAnchor="middle" fontSize="12" fill="var(--fg)">
                  {n.t}
                </text>
              </g>
            ))}
          </svg>
          <span className="muted small">Linia przerywana: połączenie zaproponowane przez AI, czeka na zatwierdzenie.</span>
        </div>

        <aside className={s.kolumna}>
          <ZNumerem n={3}>
            <span className="label">Funkcja kwadratowa</span>
          </ZNumerem>
          <Kreski szer={[100, 90, 70]} />
          <span className="muted small">Z rozmowy z Pestką, 14 lis</span>
          <ZNumerem n={4}>
            <Link to={adres("sokratejski")} className="btn btn-secondary btn-sm">
              Zapytaj Pestkę o to
            </Link>
          </ZNumerem>
        </aside>
      </div>
    </Strona>
  );
}
