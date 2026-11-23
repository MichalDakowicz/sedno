import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

const PROG_ZNAKOW = 700;
const PROG_WIERSZY = 9;

export function gdziePatrzy(sciezka: string, temat: string | null) {
  if (temat) return `przy: ${temat}`;
  if (sciezka === "/") return "przy pulpicie";
  return MIEJSCA.find(([poczatek]) => sciezka.startsWith(poczatek))?.[1] ?? "obok ciebie";
}

// Wysuwany panel rozmowy z Pestką. Otwiera się kliknięciem w wędrującego avatara albo z jego dymka.
export function TutorDock() {
  const { isOpen, close, messages, state, tematRozmowy } = useTutor();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const panel = useRef<HTMLDialogElement>(null);
  const zamknij = useRef<HTMLButtonElement>(null);
  const przedPytaniem = useRef<number | null>(null);
  const przechodziDoCzatu = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      przedPytaniem.current = null;
      return;
    }
    const ostatnia = messages.at(-1);
    if (przedPytaniem.current === null) return;
    if (
      ostatnia?.from === "tutor" && !ostatnia.blad && ostatnia.id > przedPytaniem.current &&
      (ostatnia.text.length >= PROG_ZNAKOW ||
        ostatnia.text.split("\n").filter((wiersz) => wiersz.trim()).length >= PROG_WIERSZY)
    ) {
      przedPytaniem.current = null;
      przechodziDoCzatu.current = true;
      close();
      navigate("/tutor");
    } else if (state === "idle") {
      przedPytaniem.current = null;
    }
  }, [isOpen, messages, state, close, navigate]);

  // Modalny panel zatrzymuje fokus w rozmowie. Początkowy fokus na zamknięciu nie uruchamia klawiatury telefonu.
  useEffect(() => {
    const dialog = panel.current;
    if (!isOpen || !dialog) return;
    przechodziDoCzatu.current = false;
    const wczesniej = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    zamknij.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      // Twarz Pestki wraca na ekran dopiero po zamknięciu panelu, więc fokus ustawiamy w następnej klatce.
      requestAnimationFrame(() => {
        if (dialog.open || przechodziDoCzatu.current) return;
        const cel = wczesniej?.isConnected && wczesniej.offsetParent ? wczesniej : document.querySelector<HTMLElement>("[data-pestka=przewodnik]");
        cel?.focus({ preventScroll: true });
      });
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <dialog
      ref={panel}
      className={styles.panel}
      aria-label="Pestka"
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const { left, right, top, bottom } = e.currentTarget.getBoundingClientRect();
        if (e.clientX < left || e.clientX > right || e.clientY < top || e.clientY > bottom) close();
      }}
    >
      <header className={styles.header}>
        <TutorAvatar size={40} state={state} />
        <div className={styles.headerText}>
          <p className={styles.title}>Pestka</p>
          <p className={styles.context}>{gdziePatrzy(pathname, tematRozmowy)}</p>
        </div>
        <Link to="/tutor" className={styles.iconBtn} onClick={(e) => {
          if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
          przechodziDoCzatu.current = true;
          close();
        }} aria-label="Otwórz na pełnym ekranie">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <button ref={zamknij} type="button" className={styles.iconBtn} onClick={close} aria-label="Zamknij">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      <TutorChat poWyslaniu={() => { przedPytaniem.current = messages.at(-1)?.id ?? -1; }} />
    </dialog>
  );
}
