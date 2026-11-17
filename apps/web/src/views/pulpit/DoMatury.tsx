import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useProfil } from "../../auth";
import { CELE, useUczenie } from "../../konto/profilUcznia";
import { przedmiot } from "../../konto/przedmioty";
import { dniDo, egzaminyUcznia, nazwaEgzaminu, odmianaDni, opisDaty } from "../../konto/terminy";
import type { KontekstPulpitu } from "./widgety";
import styles from "../Dashboard.module.css";

export function DoMatury({ aktywny, maPrzedmioty }: KontekstPulpitu) {
  const profil = useProfil();
  const u = useUczenie();
  if (!maPrzedmioty) return null;
  const e = egzaminyUcznia(profil?.subjects ?? [], aktywny)[0];
  if (!e) return null;
  const dni = dniDo(e.data);
  const cel = CELE.find((c) => c.id === u.cele?.[e.przedmiotId]);
  return (
    <section className={`${styles.section} wejscie`} aria-labelledby="matura-title">
      <div className={styles.sectionHead}>
        <h2 id="matura-title" className="h2">
          Do matury
        </h2>
        <Link to="/do-matury" className="link">
          Szczegóły <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <p className={styles.stat}>
        {dni}
        <span> {odmianaDni(dni)}</span>
        <span className={styles.statOpis}>
          {e.znana ? `${nazwaEgzaminu(e)}, ${opisDaty(e.data)} (do weryfikacji)` : `${nazwaEgzaminu(e)}, początek sesji majowej 2027`}
        </span>
      </p>
      {cel ? (
        <p className="muted small">
          Cel z przedmiotu {przedmiot(e.przedmiotId)?.nazwa.toLowerCase()}: {cel.nazwa}
        </p>
      ) : (
        <Link to="/profil-ucznia" className="link" style={{ justifySelf: "start" }}>
          Ustaw cel w profilu
        </Link>
      )}
    </section>
  );
}
