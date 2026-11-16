import { Link } from "react-router-dom";
import { Pasek, Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

const OBSZARY = [
  {
    nazwa: "Rozumienie ze słuchu",
    umiejetnosci: [
      { n: "Główna myśl", pct: 72, kod: "II.2" },
      { n: "Intencja mówiącego", pct: 38, kod: "II.3" },
      { n: "Szczegółowe informacje", pct: 61, kod: "II.5" },
    ],
  },
  {
    nazwa: "Wypowiedź pisemna",
    umiejetnosci: [
      { n: "Realizacja polecenia", pct: 40, kod: "V.1" },
      { n: "Spójność i logika", pct: 55, kod: "V.10" },
      { n: "Zakres środków językowych", pct: 0, kod: "V.12" },
    ],
  },
];

export function Umiejetnosci() {
  return (
    <Strona
      slug="umiejetnosci"
      jakDziala={[
        "Przedmiot i przełącznik widoku: lista albo siatka. Domyślnie przedmiot z pulpitu.",
        "Obszary z podstawy programowej, w nich umiejętności zrozumiałe dla ucznia. Kod wymagania CKE jest w drugim planie.",
        "Pasek to opanowanie z dowodów (arkusze, formaty). Szary znak „mało danych”, gdy dowodów jest za mało, zamiast zgadywania.",
        "Kliknięcie umiejętności otwiera panel: skąd ocena (lista dowodów), typowe błędy i przycisk „Ćwicz” do Nauki.",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <div className={s.chipy}>
            <span className={`${s.chip} ${s.chipAktywny}`}>Angielski</span>
            <span className={s.chip}>Matematyka</span>
            <span className={s.chip}>Informatyka</span>
          </div>
        </ZNumerem>
      </section>

      <div className={s.boczna}>
        <div style={{ display: "grid", gap: 40 }}>
          {OBSZARY.map((o, i) => (
            <section key={o.nazwa} style={{ display: "grid", gap: 12 }}>
              {i === 0 ? (
                <ZNumerem n={2}>
                  <h2 className="h3">{o.nazwa}</h2>
                </ZNumerem>
              ) : (
                <h2 className="h3">{o.nazwa}</h2>
              )}
              <ul className={s.wiersze}>
                {o.umiejetnosci.map((u) => (
                  <li key={u.n} className={`${s.wiersz} ${s.wiersz3}`}>
                    <span>{u.n}</span>
                    {u.pct ? <Pasek pct={u.pct} /> : <span className="muted small">mało danych</span>}
                    <span className="muted small">
                      {u.pct ? `${u.pct}%` : "–"} · {u.kod}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <ZNumerem n={3}>
            <span className="muted small">Pasek z dowodów; „mało danych” zamiast zgadywania.</span>
          </ZNumerem>
        </div>

        <aside className={s.karta}>
          <ZNumerem n={4}>
            <span className="label">Intencja mówiącego · 38%</span>
          </ZNumerem>
          <p className="muted small">Z 7 zadań w 3 arkuszach i 1 rundy „Napraw błąd”.</p>
          <ul className={s.wiersze} style={{ width: "100%" }}>
            <li className={s.wiersz}>
              <span className="small">Arkusz maj 2025, zad. 2.3</span>
              <span className={`small ${s.zle}`}>źle</span>
            </li>
            <li className={s.wiersz}>
              <span className="small">Napraw błąd, 14 lis</span>
              <span className={`small ${s.ok}`}>dobrze</span>
            </li>
          </ul>
          <p className="small">Typowy błąd: wybierasz to, co padło dosłownie.</p>
          <Link to={adres("nauka")} className="btn btn-primary btn-sm">
            Ćwicz
          </Link>
        </aside>
      </div>
    </Strona>
  );
}
