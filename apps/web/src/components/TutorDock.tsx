import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TutorAvatar } from "./TutorAvatar";
import { TutorChat } from "./TutorChat";
import { useTutor } from "./TutorContext";
import { doPelnego, otworzPanel, PANEL_OBOK_OD, zamknijPanel } from "./sterKsztaltu";
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

// Panel rozmowy z Pestką wylewany z nava (sterKsztaltu.ts). Otwiera się kliknięciem w wędrującego avatara albo z jego dymka.
// Na szerokim ekranie stoi obok strony, która dalej działa; na węższym ją przykrywa i reszta jest nieaktywna.
export function TutorDock() {
  const { isOpen, close, messages, state, tematRozmowy } = useTutor();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [pokazany, setPokazany] = useState(isOpen);
  const panel = useRef<HTMLElement>(null);
  const zamknij = useRef<HTMLButtonElement>(null);
  const przedPytaniem = useRef<number | null>(null);
  const przechodziDoCzatu = useRef(false);

  const naPelnyEkran = useCallback(() => {
    przechodziDoCzatu.current = true;
    void doPelnego(() => {
      close();
      navigate("/tutor");
    });
  }, [close, navigate]);

  useEffect(() => {
    if (isOpen) setPokazany(true);
  }, [isOpen]);

  // Panel znika z drzewa dopiero, gdy wsiąknie z powrotem w nav.
  useLayoutEffect(() => {
    if (!pokazany) return;
    if (isOpen) {
      void otworzPanel();
      return;
    }
    let aktualne = true;
    void zamknijPanel().then(() => {
      if (aktualne) setPokazany(false);
    });
    return () => {
      aktualne = false;
    };
  }, [isOpen, pokazany]);

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
      naPelnyEkran();
    } else if (state === "idle") {
      przedPytaniem.current = null;
    }
  }, [isOpen, messages, state, naPelnyEkran]);

  // Fokus na zamknięciu (nie uruchamia klawiatury telefonu). Gdy panel przykrywa stronę, reszta poza kształtem
  // nawigacji jest nieaktywna, więc fokus nie ucieka pod zasłonę.
  useEffect(() => {
    const el = panel.current;
    if (!isOpen || !pokazany || !el) return;
    przechodziDoCzatu.current = false;
    const wczesniej = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    zamknij.current?.focus({ preventScroll: true });
    const zablokowane: HTMLElement[] = [];
    if (window.innerWidth < PANEL_OBOK_OD) {
      for (const brat of el.parentElement?.children ?? []) {
        if (brat === el || !(brat instanceof HTMLElement) || brat.dataset.ksztalt || brat.inert) continue;
        if (brat.querySelector('[data-ksztalt="nav"]')) continue;
        brat.inert = true;
        zablokowane.push(brat);
      }
    }
    return () => {
      zablokowane.forEach((b) => (b.inert = false));
      // Twarz Pestki wraca na ekran dopiero po zamknięciu panelu, więc fokus ustawiamy w następnej klatce.
      requestAnimationFrame(() => {
        if (przechodziDoCzatu.current) return;
        const cel = wczesniej?.isConnected && wczesniej.offsetParent ? wczesniej : document.querySelector<HTMLElement>("[data-pestka=przewodnik]");
        cel?.focus({ preventScroll: true });
      });
    };
  }, [isOpen, pokazany]);

  if (!pokazany) return null;
  return (
    <section
      ref={panel}
      className={styles.panel}
      data-ksztalt="panel"
      role="dialog"
      aria-label="Pestka"
      aria-modal={window.innerWidth < PANEL_OBOK_OD || undefined}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation();
        close();
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
          e.preventDefault();
          naPelnyEkran();
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
    </section>
  );
}
