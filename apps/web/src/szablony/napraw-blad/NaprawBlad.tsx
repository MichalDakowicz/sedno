import { Link } from "react-router-dom";
import { Pasek, Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

const TYPY = ["Gramatyka", "Słownictwo", "Treść niezgodna z poleceniem", "Spójność", "Styl", "Interpunkcja"];

export function NaprawBlad() {
  return (
    <Strona
      slug="napraw-blad"
      jakDziala={[
        "Pasek postępu rundy: ile błędów jest w pracy i ile już znalezionych. Liczba błędów jest jawna.",
        "Praca do poprawy (wygenerowana i zweryfikowana przed pokazaniem). Uczeń zaznacza fragment tekstu przeciągnięciem.",
        "Po zaznaczeniu wybiera typ błędu z sześciu i wpisuje poprawkę. AI klasyfikuje poprawkę, kod liczy punkty.",
        "Lista znalezionych z oceną każdej poprawki. Fałszywe trafienia też tu są, z wyjaśnieniem.",
        "„Podpowiedz” schodzi po drabinie podpowiedzi: akapit → zdanie → typ błędu. Każdy szczebel obniża dowód opanowania.",
        "„Oddaj” kończy rundę i przenosi na ekran rozbioru.",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <span className="label">Znalezione 1 z 3</span>
        </ZNumerem>
        <Pasek pct={33} />
      </section>

      <div className={s.boczna}>
        <section style={{ display: "grid", gap: 16 }}>
          <ZNumerem n={2}>
            <h2 className="h3">E-mail do kolegi o wyjeździe</h2>
          </ZNumerem>
          <div style={{ display: "grid", gap: 14, fontSize: 18, lineHeight: 1.75, maxWidth: "62ch" }}>
            <p>
              Hi Tom, I wanted to tell you about my trip to Scotland. We <span className={s.zaznaczenie}>have went</span> there in July and stayed for two
              weeks in a small village near the coast.
            </p>
            <p>
              The weather was terrible but people were very friendly. Every evening we were eating fish and chips, which I think is overrated, if
              I'm honest. The best part was hiking in the mountains.
            </p>
            <p>Write back soon and tell me about your holidays!</p>
          </div>
        </section>

        <aside className={s.karta} aria-label="Zaznaczony fragment">
          <ZNumerem n={3}>
            <span className="label">Zaznaczone: „have went”</span>
          </ZNumerem>
          <div className={s.chipy}>
            {TYPY.map((t, i) => (
              <span key={t} className={`${s.chip} ${i === 0 ? s.chipAktywny : ""}`}>
                {t}
              </span>
            ))}
          </div>
          <span className={s.pole}>Poprawka: went</span>
          <div className={s.akcje}>
            <span className="btn btn-primary btn-sm">Zapisz</span>
            <span className="btn btn-ghost btn-sm">Anuluj</span>
          </div>
        </aside>
      </div>

      <section className={s.sekcja}>
        <ZNumerem n={4}>
          <h2 className="h3">Twoje poprawki</h2>
        </ZNumerem>
        <ul className={s.wiersze}>
          <li className={s.wiersz}>
            <span>
              „have went” → „went” <span className="muted small">· gramatyka</span>
            </span>
            <span className={`small ${s.ok}`}>trafione</span>
          </li>
          <li className={s.wiersz}>
            <span className="muted">Kolejne pojawią się tutaj</span>
            <span />
          </li>
        </ul>
      </section>

      <div className={s.akcje}>
        <ZNumerem n={5}>
          <span className="btn btn-ghost">Podpowiedz</span>
        </ZNumerem>
        <ZNumerem n={6}>
          <Link to={adres("rozbior")} className="btn btn-primary">
            Oddaj
          </Link>
        </ZNumerem>
      </div>
    </Strona>
  );
}
