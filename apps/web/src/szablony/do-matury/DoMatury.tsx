import { Link } from "react-router-dom";
import { Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

const DNI = [
  { d: "Pn", co: "Szybka runda · słuchanie", min: 10, gotowe: true },
  { d: "Wt", co: "Napraw błąd · czasy", min: 15, gotowe: true },
  { d: "Śr", co: "Odpoczynek", min: 0 },
  { d: "Cz", co: "Krok po kroku · rozprawka", min: 30 },
  { d: "Pt", co: "Szybka runda · funkcje", min: 10 },
  { d: "So", co: "Arkusz próbny", min: 120 },
  { d: "Nd", co: "Powtórki", min: 15 },
];

export function DoMatury() {
  return (
    <Strona
      slug="do-matury"
      jakDziala={[
        "Odliczanie do pierwszego egzaminu ucznia (daty z harmonogramu CKE, do weryfikacji co roku).",
        "Gdzie jest teraz i gdzie chce być: prognozowany wynik z mapy umiejętności względem celu z profilu.",
        "Plan tygodnia z czasu, jaki uczeń zadeklarował, i z najsłabszych umiejętności o największej wadze. Dni można przesuwać.",
        "Zmiana priorytetów rozmową z Pestką („w tym tygodniu mam mniej czasu”). Pestka przelicza plan i zapisuje to w profilu.",
      ]}
    >
      <section className={s.siatka3}>
        <div className={s.kolumna}>
          <ZNumerem n={1}>
            <span className="label">Do matury</span>
          </ZNumerem>
          <span className={s.duzaLiczba}>170 dni</span>
          <span className="muted small">Angielski, 5 maja 2027 (do weryfikacji)</span>
        </div>
        <div className={s.kolumna}>
          <ZNumerem n={2}>
            <span className="label">Prognoza</span>
          </ZNumerem>
          <span className={s.duzaLiczba}>58%</span>
          <span className="muted small">Cel z profilu: 75%</span>
        </div>
        <div className={s.kolumna}>
          <span className="label">Ten tydzień</span>
          <span className={s.duzaLiczba}>25/200</span>
          <span className="muted small">minut zrobionych</span>
        </div>
      </section>

      <section className={s.sekcja}>
        <ZNumerem n={3}>
          <h2 className="h2">Plan tygodnia</h2>
        </ZNumerem>
        <ul className={s.wiersze}>
          {DNI.map((d) => (
            <li key={d.d} className={`${s.wiersz} ${s.wiersz3}`}>
              <span className="label">{d.d}</span>
              <span className={d.gotowe ? "muted" : ""}>{d.co}</span>
              <span className={`small ${d.gotowe ? s.ok : "muted"}`}>{d.gotowe ? "zrobione" : d.min ? `${d.min} min` : "–"}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className={s.akcje}>
        <Link to={adres("nauka")} className="btn btn-primary">
          Dzisiejsza sesja
        </Link>
        <ZNumerem n={4}>
          <span className="btn btn-secondary">Zmień plan z Pestką</span>
        </ZNumerem>
      </div>
    </Strona>
  );
}
