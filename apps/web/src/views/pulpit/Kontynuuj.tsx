import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Ladowanie } from "../../components/Ladowanie";
import { nazwaPoziomu } from "../../konto/przedmioty";
import { adresRundy } from "../../nauka/adresy";
import { nazwaFormatuNauki } from "../../nauka/api";
import { useOtwarteRundy, usePoziomNauki } from "../../nauka/stan";
import { dataNauki } from "../nauka/NaukaPowtorki";
import type { KontekstPulpitu } from "./widgety";
import styles from "../Dashboard.module.css";
import w from "./Widgety.module.css";

const POKAZANE = 3;

export function Kontynuuj({ zakres, aktywny }: KontekstPulpitu) {
  const angielski = (!aktywny || aktywny === "angielski") && zakres.some((s) => s.przedmiot.id === "angielski");
  return angielski ? <OtwarteRundy /> : null;
}

// Osobny komponent, żeby poza angielskim nie pobierać rund.
function OtwarteRundy() {
  const [poziom] = usePoziomNauki();
  const rundy = useOtwarteRundy(poziom);
  const sesje = rundy.dane?.sesje ?? [];
  const kilkaPoziomow = new Set(sesje.map((s) => s.level)).size > 1;
  return (
    <section className={`${styles.section} wejscie`} aria-labelledby="kontynuuj-widget">
      <div className={styles.sectionHead}>
        <h2 id="kontynuuj-widget" className="h2">Kontynuuj</h2>
      </div>
      {rundy.stan === "ladowanie" && <Ladowanie ile={2} etykieta="Wczytuję niedokończone ćwiczenia" />}
      {rundy.stan === "blad" && (
        <div className={w.blad}>
          <p role="alert">Nie udało się wczytać ostatnich ćwiczeń.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={rundy.ponow}>Spróbuj ponownie</button>
        </div>
      )}
      {rundy.stan === "gotowe" && (sesje.length ? (
        <>
          <ul className={w.wiersze}>
            {sesje.slice(0, POKAZANE).map((sesja) => {
              const nazwa = rundy.dane?.nazwy.get(sesja.skill_id);
              const format = nazwaFormatuNauki[sesja.format];
              const opis = [nazwa && format, kilkaPoziomow && nazwaPoziomu[sesja.level], dataNauki(sesja.updated_at)].filter(Boolean).join(" · ");
              return (
                <li key={sesja.id}>
                  <Link to={adresRundy(sesja.id)} className={w.wiersz}>
                    <span className={w.glowny}>
                      <span className="h3">{nazwa ?? format}</span>
                      {opis && <span className="small muted">{opis}</span>}
                    </span>
                    <span className={w.akcja}>Wznów</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className={w.stopka}>
            <Link to="/nauka#ostatnio" className="link">
              Wszystkie niedokończone <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </>
      ) : <p className="muted">Nie masz niedokończonych ćwiczeń.</p>)}
    </section>
  );
}
