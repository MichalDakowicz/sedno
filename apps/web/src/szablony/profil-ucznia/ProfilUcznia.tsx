import { Link } from "react-router-dom";
import { Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

function Wybor({ pytanie, opcje, wybrana }: { pytanie: string; opcje: string[]; wybrana: number }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <span>{pytanie}</span>
      <div className={s.chipy}>
        {opcje.map((o, i) => (
          <span key={o} className={`${s.chip} ${i === wybrana ? s.chipAktywny : ""}`}>
            {o}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProfilUcznia() {
  return (
    <Strona
      slug="profil-ucznia"
      jakDziala={[
        "Jak się uczysz: kilka pytań przy pierwszym wejściu (motywacja, tempo, co zniechęca). Każde można pominąć i zmienić później.",
        "Czas i cel: ile minut dziennie, jaki wynik. Z tego powstaje plan do matury.",
        "Priorytety ucznia (np. „najpierw słuchanie”). Pestka dopisuje je też sama z rozmowy, za każdym razem z informacją.",
        "Co Sedno wie z danych: tempo i mocne/słabe strony liczone z arkuszy. Tylko do odczytu, z możliwością usunięcia.",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <h2 className="h2">Jak się uczysz</h2>
        </ZNumerem>
        <Wybor pytanie="Co cię najbardziej motywuje?" opcje={["Wynik na maturze", "Postęp z tygodnia na tydzień", "Zrozumienie tematu"]} wybrana={0} />
        <Wybor pytanie="Jak wolisz zaczynać?" opcje={["Od razu zadania", "Najpierw krótkie wyjaśnienie"]} wybrana={0} />
        <Wybor pytanie="Co cię zniechęca?" opcje={["Długie teksty", "Dużo błędów naraz", "Presja czasu"]} wybrana={1} />
      </section>

      <section className={s.sekcja}>
        <ZNumerem n={2}>
          <h2 className="h2">Czas i cel</h2>
        </ZNumerem>
        <Wybor pytanie="Ile czasu dziennie?" opcje={["10 min", "20 min", "45 min", "Więcej"]} wybrana={1} />
        <Wybor pytanie="Cel z angielskiego" opcje={["Zdać", "60%", "75%", "90%+"]} wybrana={2} />
      </section>

      <section className={s.sekcja}>
        <ZNumerem n={3}>
          <h2 className="h2">Priorytety</h2>
        </ZNumerem>
        <ul className={s.wiersze}>
          <li className={s.wiersz}>
            <span>Najpierw słuchanie</span>
            <span className="muted small">dodane przez ciebie</span>
          </li>
          <li className={s.wiersz}>
            <span>W weekendy dłuższe sesje</span>
            <span className="muted small">Pestka, z rozmowy 12 lis</span>
          </li>
        </ul>
      </section>

      <section className={s.sekcja}>
        <ZNumerem n={4}>
          <h2 className="h2">Co wiemy z twoich wyników</h2>
        </ZNumerem>
        <ul className={s.wiersze}>
          <li className={s.wiersz}>
            <span>Słuchanie robisz średnio 20% szybciej niż limit</span>
            <span className="link">Usuń</span>
          </li>
          <li className={s.wiersz}>
            <span>Najwięcej punktów tracisz na intencji mówiącego</span>
            <span className="link">Usuń</span>
          </li>
        </ul>
        <Link to={adres("do-matury")} className="btn btn-primary" style={{ justifySelf: "start" }}>
          Zobacz plan do matury
        </Link>
      </section>
    </Strona>
  );
}
