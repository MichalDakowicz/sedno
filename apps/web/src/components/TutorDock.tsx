import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { TutorAvatar } from "./TutorAvatar";
import { TutorChat } from "./TutorChat";
import { useTutor } from "./TutorContext";
import styles from "./TutorDock.module.css";

// Podpis w doku mówi, na co Pestka patrzy razem z uczniem: zadanie z rozmowy, a bez niego strona.
const MIEJSCA: [string, string][] = [
  ["/nauka/runda", "przy rundzie"],
  ["/nauka/rozbior", "przy rozbiorze rundy"],
  ["/nauka", "przy nauce"],
  ["/arkusze/", "przy arkuszu"],
  ["/arkusze", "przy liście arkuszy"],
  ["/umiejetnosci", "przy mapie umiejętności"],
  ["/powtorki", "przy powtórkach"],
  ["/do-matury", "przy odliczaniu do matury"],
  ["/profil", "przy profilu"],
  ["/ustawienia", "przy ustawieniach"],
  ["/przedmiot/", "przy pulpicie"],
];

export function gdziePatrzy(sciezka: string, temat: string | null) {
  if (temat) return `przy: ${temat}`;
  if (sciezka === "/") return "przy pulpicie";
  return MIEJSCA.find(([poczatek]) => sciezka.startsWith(poczatek))?.[1] ?? "obok ciebie";
}

// Wysuwany panel rozmowy z Pestką. Otwiera się kliknięciem w wędrującego avatara albo z jego dymka.
export function TutorDock() {
  const { isOpen, close, state, tematRozmowy } = useTutor();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <>
      {isOpen && (
        <>
          <div className={styles.scrim} onClick={close} aria-hidden="true" />
          <aside className={styles.panel} aria-label="Pestka">
            <header className={styles.header}>
              <TutorAvatar size={40} state={state} />
              <div className={styles.headerText}>
                <p className={styles.title}>Pestka</p>
                <p className={styles.context}>{gdziePatrzy(pathname, tematRozmowy)}</p>
              </div>
              <Link to="/tutor" className={styles.iconBtn} onClick={close} aria-label="Otwórz na pełnym ekranie">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <button type="button" className={styles.iconBtn} onClick={close} aria-label="Zamknij">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </header>
            <TutorChat />
          </aside>
        </>
      )}
    </>
  );
}
