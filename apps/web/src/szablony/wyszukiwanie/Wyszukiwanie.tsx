import { FileText, Search, Target, Zap } from "lucide-react";
import { Strona, ZNumerem } from "../Szablon";
import s from "../Szablon.module.css";

const WYNIKI = [
  { grupa: "Akcje", ikona: Zap, pozycje: ["Zacznij szybką rundę", "Dokończ arkusz maj 2025"] },
  { grupa: "Arkusze", ikona: FileText, pozycje: ["Angielski rozszerzony, maj 2024", "Angielski dwujęzyczny, maj 2024"] },
  { grupa: "Umiejętności", ikona: Target, pozycje: ["Mowa zależna", "Czasy przeszłe"] },
];

export function Wyszukiwanie() {
  return (
    <Strona
      slug="wyszukiwanie"
      jakDziala={[
        "Otwiera się z ikony lupy w pasku albo Ctrl+K. Jest oknem dialogowym nad bieżącą stroną.",
        "Wyniki w grupach: akcje, arkusze, umiejętności, rozmowy z Pestką. Bez wpisania pokazuje ostatnie i polecane.",
        "Strzałki wybierają, Enter otwiera, Escape zamyka. Pytanie pełnym zdaniem („jak liczyć deltę?”) przekazuje do Pestki.",
      ]}
    >
      <article className={s.karta} style={{ justifyItems: "stretch", maxWidth: 640 }}>
        <ZNumerem n={1}>
          <span className={s.pole} style={{ flex: 1 }}>
            <Search size={18} aria-hidden="true" />
            2024
          </span>
        </ZNumerem>
        <ZNumerem n={2}>
          <span className="label">Wyniki</span>
        </ZNumerem>
        {WYNIKI.map(({ grupa, ikona: Ikona, pozycje }) => (
          <div key={grupa} style={{ display: "grid", gap: 4 }}>
            <span className="label">{grupa}</span>
            <ul className={s.wiersze}>
              {pozycje.map((p, i) => (
                <li
                  key={p}
                  className={s.wiersz}
                  style={grupa === "Arkusze" && i === 0 ? { background: "var(--bg)", borderRadius: 12, paddingInline: 10 } : { paddingInline: 10 }}
                >
                  <span className={s.zNumerem}>
                    <Ikona size={16} aria-hidden="true" />
                    {p}
                  </span>
                  {grupa === "Arkusze" && i === 0 && <span className="muted small">Enter</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <ZNumerem n={3}>
          <span className="muted small">↑↓ wybierz · Enter otwórz · Esc zamknij · pytanie zadaj Pestce</span>
        </ZNumerem>
      </article>
    </Strona>
  );
}
