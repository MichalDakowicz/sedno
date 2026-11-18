import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Ladowanie } from "../../components/Ladowanie";
import { nazwaPoziomu } from "../../konto/przedmioty";
import { adresMapy, adresNauki } from "../../nauka/adresy";
import { naukaApi } from "../../nauka/api";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import { Opanowanie } from "../nauka/Opanowanie";
import mapaStyl from "../nauka/Umiejetnosci.module.css";
import type { KontekstPulpitu } from "./widgety";
import styles from "../Dashboard.module.css";

export function MapaUmiejetnosci({ zakres, aktywny }: KontekstPulpitu) {
  const [poziom] = usePoziomNauki();
  const angielski = (!aktywny || aktywny === "angielski") && zakres.some((s) => s.przedmiot.id === "angielski");
  const mapa = useZapytanieNauki(angielski ? `mapa:${poziom}` : null, (signal) => naukaApi.mapa(poziom, signal));
  if (!angielski) return null;

  const umiejetnosci = mapa.dane?.skills.slice().sort((a, b) => (a.score ?? 2) - (b.score ?? 2) || b.exam_points - a.exam_points).slice(0, 4);
  return (
    <section className={`${styles.section} wejscie`} aria-labelledby="map-title">
      <div className={styles.sectionHead}>
        <h2 id="map-title" className="h2">Mapa umiejętności</h2>
      </div>
      <p className="muted small">Angielski · poziom {nazwaPoziomu[poziom]}</p>
      {mapa.stan === "ladowanie" && <Ladowanie ile={3} etykieta="Wczytuję umiejętności" />}
      {mapa.stan === "blad" && (
        <div className={mapaStyl.blok}>
          <p role="alert">Nie udało się wczytać umiejętności.</p>
          <button className={`btn btn-ghost btn-sm ${mapaStyl.przycisk}`} type="button" onClick={mapa.ponow}>Spróbuj ponownie</button>
        </div>
      )}
      {umiejetnosci && (
        <>
          <ul className="wiersze">
            {umiejetnosci.map((u) => (
              <li key={u.skill_id}>
                <Link to={adresMapy(poziom, u.skill_id)} className={`wiersz ${mapaStyl.wiersz}`}>
                  <span className={`wiersz-tresc ${mapaStyl.nazwa}`}>{u.name}</span>
                  <span className="wiersz-wartosc"><Opanowanie {...u} /></span>
                  <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
          {umiejetnosci.every((u) => u.score === null) && (
            <div className={mapaStyl.blok}>
              <p className="muted">Wyniki pojawią się po pierwszej rundzie.</p>
              <Link to={adresNauki(poziom)} className={`btn btn-secondary btn-sm ${mapaStyl.przycisk}`}>Zacznij szybką rundę</Link>
            </div>
          )}
        </>
      )}
      <Link to={adresMapy(poziom)} className={`link ${mapaStyl.przycisk}`}>
        Pełna mapa <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}
