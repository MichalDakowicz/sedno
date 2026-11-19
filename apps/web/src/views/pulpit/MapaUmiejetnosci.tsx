// Mapa w skrócie jako „ogród” Pestki: cztery obszary matury, w każdym rośliny jego umiejętności w stadiach
// z opanowania (nauka/stadia.ts), i jedno zdanie wniosku. Szczegóły i procenty są na pełnej mapie.
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Kielek } from "../../components/Kielek";
import { Ladowanie } from "../../components/Ladowanie";
import { nazwaPoziomu } from "../../konto/przedmioty";
import { adresMapy, adresNauki } from "../../nauka/adresy";
import { naukaApi, type Umiejetnosc } from "../../nauka/api";
import { KOLEJNOSC_STADIOW, NAZWA_STADIUM, stadium } from "../../nauka/stadia";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import mapaStyl from "../nauka/Umiejetnosci.module.css";
import type { KontekstPulpitu } from "./widgety";
import styles from "../Dashboard.module.css";
import w from "./Widgety.module.css";

const OBSZARY = [
  { id: "słuchanie", nazwa: "Słuchanie" },
  { id: "czytanie", nazwa: "Czytanie" },
  { id: "środki językowe", nazwa: "Środki językowe" },
  { id: "pisanie", nazwa: "Pisanie" },
];

const poziomStadium = (u: Umiejetnosc) => KOLEJNOSC_STADIOW.indexOf(stadium(u.score));

/** Jedno zdanie: gdzie rośnie najlepiej i gdzie czekają same pestki. */
function wniosek(umiejetnosci: Umiejetnosc[]) {
  const grupy = OBSZARY.map((o) => ({ ...o, lista: umiejetnosci.filter((u) => u.area === o.id) })).filter((g) => g.lista.length);
  const srednia = (g: (typeof grupy)[number]) => g.lista.reduce((s, u) => s + poziomStadium(u), 0) / g.lista.length;
  const najlepszy = [...grupy].sort((a, b) => srednia(b) - srednia(a))[0];
  const pestki = grupy.filter((g) => g.lista.every((u) => poziomStadium(u) === 0));
  if (!najlepszy || srednia(najlepszy) === 0) return "Na razie same pestki. Pierwsza runda zasadzi pierwszy kiełek.";
  const reszta = pestki.length ? ` ${pestki.map((g) => g.nazwa).join(", ")}: jeszcze same pestki.` : "";
  return `Najlepiej rośnie ${najlepszy.nazwa.toLowerCase()}.${reszta}`;
}

export function MapaUmiejetnosci({ zakres, aktywny }: KontekstPulpitu) {
  const [poziom] = usePoziomNauki();
  const angielski = (!aktywny || aktywny === "angielski") && zakres.some((s) => s.przedmiot.id === "angielski");
  const mapa = useZapytanieNauki(angielski ? `mapa:${poziom}` : null, (signal) => naukaApi.mapa(poziom, signal));
  if (!angielski) return null;

  const umiejetnosci = mapa.dane?.skills;
  return (
    <section className={`${styles.section} wejscie`} aria-labelledby="map-title">
      <div className={styles.sectionHead}>
        <h2 id="map-title" className="h2">Mapa umiejętności</h2>
        <Link to={adresMapy(poziom)} className="link">
          Pełna mapa <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {mapa.stan === "ladowanie" && <Ladowanie ile={2} etykieta="Wczytuję umiejętności" />}
      {mapa.stan === "blad" && (
        <div className={mapaStyl.blok}>
          <p role="alert">Nie udało się wczytać umiejętności.</p>
          <button className={`btn btn-ghost btn-sm ${mapaStyl.przycisk}`} type="button" onClick={mapa.ponow}>Spróbuj ponownie</button>
        </div>
      )}
      {umiejetnosci && (
        <>
          <p>{wniosek(umiejetnosci)}</p>
          <ul className={w.ogrod} aria-label={`Angielski, poziom ${nazwaPoziomu[poziom]}`}>
            {OBSZARY.map((o) => {
              const lista = umiejetnosci.filter((u) => u.area === o.id);
              if (!lista.length) return null;
              const opis = lista.map((u) => `${u.name}: ${NAZWA_STADIUM[stadium(u.score)]}`).join("; ");
              return (
                <li key={o.id}>
                  <Link to={adresMapy(poziom, [...lista].sort((a, b) => poziomStadium(a) - poziomStadium(b))[0]!.skill_id)} className={w.grzadka}>
                    <span className={w.rosliny} role="img" aria-label={`${o.nazwa}. ${opis}.`}>
                      {lista.map((u) => <Kielek key={u.skill_id} stadium={stadium(u.score)} rozmiar={40} />)}
                    </span>
                    <span className="small">{o.nazwa}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {umiejetnosci.every((u) => u.score === null) && (
            <Link to={adresNauki(poziom)} className={`btn btn-secondary btn-sm ${mapaStyl.przycisk}`}>Zacznij szybką rundę</Link>
          )}
        </>
      )}
    </section>
  );
}
