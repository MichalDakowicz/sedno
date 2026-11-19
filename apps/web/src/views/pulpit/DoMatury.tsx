// „Do matury”: dni do pierwszego egzaminu i prognoza z arkuszy angielskiego (pole forecast z nauka_plan) na pasku
// z progiem 30% i kreską celu z profilu ucznia. Prognoza jest tylko dla angielskiego, bo tylko on ma plan nauki.
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useProfil } from "../../auth";
import { PasekProgu } from "../../components/wykresy";
import { CELE, celJakoUlamek, useUczenie } from "../../konto/profilUcznia";
import { przedmiot } from "../../konto/przedmioty";
import { dniDo, egzaminyUcznia, najblizszy, nazwaEgzaminu, odmianaDni, opisDaty } from "../../konto/terminy";
import { naukaApi } from "../../nauka/api";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import { Liczba } from "../../ruch";
import type { KontekstPulpitu } from "./widgety";
import styles from "../Dashboard.module.css";

const PROG = 0.3;

export function DoMatury({ zakres, aktywny, maPrzedmioty }: KontekstPulpitu) {
  const profil = useProfil();
  const u = useUczenie();
  const angielski = (!aktywny || aktywny === "angielski") && zakres.some((s) => s.przedmiot.id === "angielski");
  if (!maPrzedmioty) return null;
  const wszystkie = egzaminyUcznia(profil?.subjects ?? [], aktywny);
  if (!wszystkie.length) return null;
  const e = najblizszy(wszystkie);
  const dni = e ? dniDo(e.data) : 0;
  const cel = e && CELE.find((c) => c.id === u.cele?.[e.przedmiotId]);
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
      {!e ? (
        <p className="muted">Wszystkie egzaminy za tobą.</p>
      ) : (
        <p className={styles.stat}>
          <Liczba wartosc={dni} />
          <span> {odmianaDni(dni)}</span>
          <span className={styles.statOpis}>
            {e.znana ? `${nazwaEgzaminu(e)}, ${opisDaty(e.data)}` : `${nazwaEgzaminu(e)}, termin poda CKE`}
          </span>
        </p>
      )}
      {angielski && <PrognozaAngielskiego />}
      {!e ? null : cel ? (
        !angielski && <p className="muted small">Cel z przedmiotu {przedmiot(e.przedmiotId)?.nazwa.toLowerCase()}: {cel.nazwa}</p>
      ) : (
        <Link to="/profil-ucznia" className="link" style={{ justifySelf: "start" }}>
          Ustaw cel w profilu
        </Link>
      )}
    </section>
  );
}

/** Prognoza z arkuszy angielskiego na pasku z progiem 30% i kreską celu z profilu (pulpit i strona „Do matury”). */
export function PrognozaAngielskiego() {
  const u = useUczenie();
  const [poziom] = usePoziomNauki();
  const plan = useZapytanieNauki(`nauka:plan:${poziom}`, (signal) => naukaApi.plan(poziom, signal));
  const prognoza = plan.dane?.forecast.score ?? null;
  const celAng = celJakoUlamek(u.cele?.angielski);
  if (plan.stan !== "gotowe") return null;
  return (
    prognoza === null ? (
      <p className={`muted small ${styles.prognoza}`} data-tutor-about="Prognozę liczę z arkuszy z angielskiego z ostatnich 180 dni: średnia z zadań sprawdzanych kluczem, ważona punktami umiejętności na maturze.">
        Prognozę z angielskiego pokażę po dwóch sprawdzonych arkuszach.
        <Link to="/arkusze?przedmiot=angielski" className="link">Rozwiąż arkusz <ArrowRight size={14} aria-hidden="true" /></Link>
      </p>
    ) : (
      <div className={styles.prognoza} data-tutor-about="Prognozę liczę z arkuszy z angielskiego z ostatnich 180 dni: średnia z zadań sprawdzanych kluczem, ważona punktami umiejętności na maturze. Krótkie rundy jej nie zmieniają.">
        <p>
          Angielski z arkuszy: <strong>{Math.round(prognoza * 100)}%</strong>
          {celAng !== null && (prognoza >= celAng ? ", cel osiągnięty." : `, do celu ${Math.round((celAng - prognoza) * 100)} pkt proc.`)}
        </p>
        <PasekProgu
          wartosc={prognoza}
          prog={{ wartosc: PROG, etykieta: "próg 30%" }}
          cel={celAng !== null && celAng !== PROG ? { wartosc: celAng, etykieta: `cel ${Math.round(celAng * 100)}%` } : undefined}
          opis={`Prognoza z angielskiego ${Math.round(prognoza * 100)}%, próg zdania 30%${celAng !== null ? `, cel ${Math.round(celAng * 100)}%` : ""}.`}
        />
      </div>
    )
  );
}
