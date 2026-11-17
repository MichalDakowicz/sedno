import { Link } from "react-router-dom";
import { ArrowRight, Network } from "lucide-react";
import type { KontekstPulpitu } from "./widgety";
import styles from "../Dashboard.module.css";

export function MapaUmiejetnosci({ maPrzedmioty }: KontekstPulpitu) {
  if (!maPrzedmioty) return null;
  return (
    <section className={`${styles.section} wejscie`} aria-labelledby="map-title">
      <div className={styles.sectionHead}>
        <h2 id="map-title" className="h2">
          Mapa umiejętności
        </h2>
      </div>
      <p className="muted">
        <Network size={16} aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 6 }} />
        Opanowanie poszczególnych umiejętności policzymy z twoich odpowiedzi w arkuszach. Na razie widzisz wyniki całych arkuszy.
      </p>
      <Link to="/umiejetnosci" className="link" style={{ justifySelf: "start" }}>
        Zobacz szablon mapy <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}
