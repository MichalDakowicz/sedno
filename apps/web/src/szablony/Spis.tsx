import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { GRUPY, SZABLONY, WDROZONE, adres, szablon } from "./lista";
import styles from "./Szablon.module.css";

// Ścieżka nauki od lewej do prawej. `prawdziwe` to widoki, które już działają w aplikacji.
const ETAPY: { nazwa: string; opis: string; szablony: string[]; prawdziwe?: { to: string; tytul: string }[] }[] = [
  {
    nazwa: "Start",
    opis: "Kim jest uczeń i ile ma czasu.",
    szablony: [],
    prawdziwe: [
      { to: "/do-matury", tytul: "Plan do matury" },
      { to: "/profil-ucznia", tytul: "Profil ucznia" },
      { to: "/", tytul: "Pulpit" },
    ],
  },
  { nazwa: "Wybór", opis: "Co dziś ćwiczyć i jak.", szablony: [], prawdziwe: [WDROZONE.nauka!] },
  {
    nazwa: "Ćwiczenie",
    opis: "Jeden z formatów albo arkusz.",
    szablony: ["napraw-blad", "krok-po-kroku", "sokratejski", "wizualizacje"],
    prawdziwe: [WDROZONE["szybka-runda"]!, WDROZONE["uczen-uczy"]!, { to: "/arkusze", tytul: "Arkusze CKE" }],
  },
  { nazwa: "Wynik", opis: "Co poszło i co dalej.", szablony: [], prawdziwe: [WDROZONE.rozbior!] },
  { nazwa: "Postęp", opis: "Mapa się aktualizuje.", szablony: ["mapa-wiedzy"], prawdziwe: [WDROZONE.umiejetnosci!] },
  { nazwa: "Powrót", opis: "Zanikające wraca do nauki.", szablony: [], prawdziwe: [WDROZONE.powtorki!] },
];

export function Spis() {
  return (
    <main className={`container ${styles.strona}`}>
      <header className={styles.glowa}>
        <span className={styles.znacznik}>
          <span>Szablony</span>
        </span>
        <h1 className="display">Widoki w przygotowaniu</h1>
        <p className="lead">
          Puste prototypy: sam układ i przebieg, bez logiki i danych. Każdy ma w repo plik README z opisem, po co jest i co trzeba zrobić.
        </p>
      </header>

      <section className={styles.sekcja} aria-labelledby="sciezka">
        <div className={styles.sekcjaGlowa}>
          <h2 id="sciezka" className="h2">
            Ścieżka nauki
          </h2>
          <span className="muted small">Po powtórkach uczeń wraca do wyboru.</span>
        </div>
        <ol className={styles.sciezka}>
          {ETAPY.map((e) => (
            <li key={e.nazwa} className={styles.etap}>
              <span className={`label ${styles.etapNazwa}`}>{e.nazwa}</span>
              <span className="muted small">{e.opis}</span>
              {e.szablony.map((sl) => (
                <Link key={sl} to={adres(sl)}>
                  {szablon(sl)!.tytul}
                </Link>
              ))}
              {e.prawdziwe?.map((p) => (
                <Link key={p.to} to={p.to}>
                  {p.tytul} <span className={styles.prawdziwy}>działa</span>
                </Link>
              ))}
            </li>
          ))}
        </ol>
      </section>

      {GRUPY.filter((g) => SZABLONY.some((s) => s.grupa === g)).map((g) => (
        <section key={g} className={styles.sekcja} aria-labelledby={`grupa-${g}`}>
          <h2 id={`grupa-${g}`} className="h2">
            {g}
          </h2>
          <ul className={styles.wiersze}>
            {SZABLONY.filter((s) => s.grupa === g).map((s) => (
              <li key={s.slug}>
                <Link to={adres(s.slug)} className={styles.spisWiersz}>
                  <span className={styles.spisTytul}>{s.tytul}</span>
                  <span className="muted small">{s.opis}</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
