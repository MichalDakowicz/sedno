import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { adresNauki } from "../../nauka/adresy";
import { usePoziomNauki } from "../../nauka/stan";
import type { KontekstPulpitu } from "./widgety";
import styles from "../Dashboard.module.css";

export function WybierzTemat({ zakres, aktywny }: KontekstPulpitu) {
  const [poziom] = usePoziomNauki();
  const angielski = (!aktywny || aktywny === "angielski") && zakres.some((s) => s.przedmiot.id === "angielski");
  if (!angielski) return null;
  return (
    <section className={`${styles.section} wejscie`} aria-labelledby="temat-widget">
      <div className={styles.sectionHead}>
        <h2 id="temat-widget" className="h2">Wybierz temat</h2>
      </div>
      <p className="muted">Wskaż umiejętność lub temat, także taki, który już znasz, np. przed sprawdzianem.</p>
      <div>
        <Link to={adresNauki(poziom)} className="link">
          Wybierz umiejętność <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
