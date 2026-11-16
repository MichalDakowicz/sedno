import { Strona, ZNumerem } from "../Szablon";
import s from "../Szablon.module.css";

function Przelacznik({ tytul, opis, wl }: { tytul: string; opis: string; wl?: boolean }) {
  return (
    <li className={s.wiersz}>
      <span>
        {tytul}
        <br />
        <span className="muted small">{opis}</span>
      </span>
      <span className={`${s.przelacznik} ${wl ? s.przelacznikWl : ""}`} aria-hidden="true" />
    </li>
  );
}

export function Ustawienia() {
  return (
    <Strona
      slug="ustawienia"
      jakDziala={[
        "Wygląd: motyw (systemowy, jasny, ciemny) i rozmiar tekstu. Zmiana działa od razu, bez przycisku „Zapisz”.",
        "Dostępność: mniej ruchu, większy kontrast, czytanie treści na głos. Domyślnie z ustawień systemu.",
        "Pestka: czy podpowiada sama, czy tylko na wezwanie; ton (krótko lub szerzej). Konto AI zostaje w profilu.",
        "Powiadomienia o powtórkach i planie. Wszystko wyłączone, dopóki uczeń nie włączy.",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <h2 className="h2">Wygląd</h2>
        </ZNumerem>
        <div className={s.chipy}>
          <span className={`${s.chip} ${s.chipAktywny}`}>Jak system</span>
          <span className={s.chip}>Jasny</span>
          <span className={s.chip}>Ciemny</span>
        </div>
        <div className={s.chipy}>
          <span className={s.chip}>Tekst mniejszy</span>
          <span className={`${s.chip} ${s.chipAktywny}`}>Normalny</span>
          <span className={s.chip}>Większy</span>
        </div>
      </section>

      <section className={s.sekcja}>
        <ZNumerem n={2}>
          <h2 className="h2">Dostępność</h2>
        </ZNumerem>
        <ul className={s.wiersze}>
          <Przelacznik tytul="Mniej ruchu" opis="Bez animacji Pestki i przejść" />
          <Przelacznik tytul="Większy kontrast" opis="Ciemniejszy tekst pomocniczy i linie" />
          <Przelacznik tytul="Czytaj na głos" opis="Przycisk odsłuchu przy treści zadań" />
        </ul>
      </section>

      <section className={s.sekcja}>
        <ZNumerem n={3}>
          <h2 className="h2">Pestka</h2>
        </ZNumerem>
        <ul className={s.wiersze}>
          <Przelacznik tytul="Sama podpowiada" opis="Wskazówki przy elementach strony" wl />
          <Przelacznik tytul="Krótkie odpowiedzi" opis="Najwyżej kilka zdań naraz" wl />
        </ul>
      </section>

      <section className={s.sekcja}>
        <ZNumerem n={4}>
          <h2 className="h2">Powiadomienia</h2>
        </ZNumerem>
        <ul className={s.wiersze}>
          <Przelacznik tytul="Przypomnienie o powtórce" opis="Raz dziennie, o wybranej godzinie" />
          <Przelacznik tytul="Podsumowanie tygodnia" opis="W niedzielę wieczorem" />
        </ul>
      </section>
    </Strona>
  );
}
