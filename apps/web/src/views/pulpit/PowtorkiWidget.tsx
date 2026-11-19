import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Ladowanie } from "../../components/Ladowanie";
import { adresNauki, adresPowtorek } from "../../nauka/adresy";
import { naukaApi } from "../../nauka/api";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import { useSesjaDiagnozy } from "../../nauka/diagnoza";
import { procentNauki } from "../nauka/NaukaPowtorki";
import { etykietaZrodla, kluczPowtorki, odmianaPowtorek, powtorkiNaDni, unikalnePowtorki } from "./czasPowtorek";
import { Liczba } from "../../ruch";
import { StanPestki } from "../../components/StanPestki";
import { glos, wybierz } from "../../pestka/glos";
import type { KontekstPulpitu } from "./widgety";
import styles from "../Dashboard.module.css";
import w from "./Widgety.module.css";

const POKAZANE = 3;

export function PowtorkiWidget({ zakres, aktywny }: KontekstPulpitu) {
  const [poziom] = usePoziomNauki();
  const angielski = (!aktywny || aktywny === "angielski") && zakres.some((s) => s.przedmiot.id === "angielski");
  const powtorki = useZapytanieNauki(angielski ? `nauka:powtorki:${poziom}` : null, (signal) => naukaApi.powtorki(poziom, signal));
  const diagnoza = useSesjaDiagnozy(poziom, angielski);
  if (!angielski) return null;

  const kolejka = unikalnePowtorki(powtorki.dane ? [...(powtorki.dane.today ? [powtorki.dane.today] : []), ...powtorki.dane.queue] : []);
  return (
    <section className={`${styles.section} wejscie`} aria-labelledby="powtorki-widget">
      <div className={styles.sectionHead}>
        <h2 id="powtorki-widget" className="h2">Powtórki</h2>
      </div>
      {powtorki.stan === "ladowanie" && <Ladowanie ile={2} etykieta="Wczytuję powtórki" />}
      {powtorki.stan === "blad" && (
        <div className={w.blad}>
          <p role="alert">Nie udało się wczytać powtórek.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={powtorki.ponow}>Spróbuj ponownie</button>
        </div>
      )}
      {powtorki.stan === "gotowe" && (kolejka.length ? (
        <>
          <NaDzis kolejka={kolejka} />
          <ul className="wiersze">
            {kolejka.slice(0, POKAZANE).map((p) => (
              <li key={kluczPowtorki(p)}>
                <Link to={adresPowtorek(poziom)} className="wiersz">
                  <span className="wiersz-tresc">
                    <span className="h3">{p.name}</span>
                    {p.mistake && (
                      <span className="wiersz-opis">{etykietaZrodla(p.mistake, diagnoza)}</span>
                    )}
                    <span className="wiersz-opis">
                      {p.mistake ? "Wróć do zadania, które sprawiło trudność." : "Czas przypomnieć sobie tę umiejętność."}
                      {p.retention !== null && ` Pamiętasz ok. ${procentNauki.format(p.retention)}.`}
                    </span>
                  </span>
                  <span className="wiersz-akcja"><ChevronRight size={20} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
          <div className={w.stopka}>
            <Link to={adresPowtorek(poziom)} className="link">
              Wszystkie powtórki <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </>
      ) : (
        <>
          <StanPestki emocja="radosc" rozmiar="maly" tekst={wybierz(glos.puste.powtorki, 1)} akcja={{ etykieta: "Przejdź do nauki", do: adresNauki(poziom) }} />
        </>
      ))}
    </section>
  );
}

/** Liczba na dziś jako wniosek sekcji; siedem dni jest na stronie Powtórek. */
function NaDzis({ kolejka }: { kolejka: Parameters<typeof powtorkiNaDni>[0] }) {
  const [dzis, ...dalej] = powtorkiNaDni(kolejka);
  const wTygodniu = dalej.reduce((s, d) => s + d.liczba, 0);
  return (
    <p className={styles.stat}>
      <Liczba wartosc={dzis!.liczba} />
      <span className={styles.statOpis}>
        {odmianaPowtorek(dzis!.liczba)} na dziś
        {wTygodniu > 0 && ` · w kolejnych dniach ${wTygodniu}`}
      </span>
    </p>
  );
}
