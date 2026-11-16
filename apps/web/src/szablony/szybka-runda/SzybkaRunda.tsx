import { Link } from "react-router-dom";
import { Pasek, Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

const OPCJE = ["A. She's apologising for being late.", "B. She's asking for directions.", "C. She's complaining about the traffic.", "D. She's cancelling the meeting."];

export function SzybkaRunda() {
  return (
    <Strona
      slug="szybka-runda"
      jakDziala={[
        "Runda trwa 3–5 minut. Zegar jest informacyjny: po czasie runda się nie urywa, tylko kończy po bieżącym zadaniu.",
        "Postęp: 5–8 krótkich wariantów jednej umiejętności (nigdy te same pytania, warianty z silnika ćwiczeń).",
        "Odpowiedź sprawdzana od razu: kolor i jedno zdanie wyjaśnienia, bez przechodzenia na osobny ekran.",
        "Seria: kilka dobrych z rzędu skraca rundę; błąd dokłada wariant tego samego typu.",
        "Koniec: krótki rozbiór i zmiana poziomu umiejętności. Rundę uruchamiają Powtórki albo Nauka.",
      ]}
    >
      <section className={s.sekcja}>
        <div className={s.sekcjaGlowa}>
          <ZNumerem n={1}>
            <span className={s.duzaLiczba}>2:41</span>
          </ZNumerem>
          <ZNumerem n={4}>
            <span className="muted small">3 dobre z rzędu</span>
          </ZNumerem>
        </div>
        <ZNumerem n={2}>
          <span className="label">Zadanie 4 z 6</span>
        </ZNumerem>
        <Pasek pct={58} />
      </section>

      <section style={{ display: "grid", gap: 20, maxWidth: 720 }}>
        <p className="h3">Posłuchaj. Co robi kobieta?</p>
        <span className={s.pole}>▶ Nagranie · 0:12</span>
        <ul className={s.wiersze}>
          {OPCJE.map((o, i) => (
            <li key={o} className={s.wiersz}>
              <span className={i === 0 ? s.ok : ""}>{o}</span>
              {i === 0 && (
                <ZNumerem n={3}>
                  <span className={`small ${s.ok}`}>dobrze</span>
                </ZNumerem>
              )}
            </li>
          ))}
        </ul>
        <p className="muted small">„Sorry I'm late” w pierwszym zdaniu: intencja to przeprosiny, korek jest tylko powodem.</p>
        <div className={s.akcje}>
          <span className="btn btn-secondary">Następne</span>
          <ZNumerem n={5}>
            <Link to={adres("rozbior")} className="link">
              Zakończ rundę
            </Link>
          </ZNumerem>
        </div>
      </section>
    </Strona>
  );
}
