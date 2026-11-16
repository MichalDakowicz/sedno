// Brudnopis informatyki: swobodne notatki i obliczenia przy zadaniu (w arkuszu CKE to miejsce
// na obliczenia przy zadaniach 1.1–1.3, 2.1 i 5). Nie jest odpowiedzią i nie podlega ocenie.
// Kalkulator tylko podpowiada: sugestia wyniku po „=” nie zmienia tekstu, dopóki uczeń jej
// świadomie nie przyjmie (klik, Tab albo Ctrl+Enter), a każde inne pisanie ją po prostu zastępuje.
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type SyntheticEvent } from "react";
import { Terminal } from "lucide-react";
import { sugestia } from "./kalkulator";
import type { Brudnopis as Szkicowany } from "../arkusze/postep";
import { Szkic } from "./Szkic";
import styles from "./Brudnopis.module.css";

export type Widok = "tekst" | "szkic";

type Props = {
  tekst: string;
  onTekst: (t: string) => void;
  // Przełącza na Pythona tego samego zadania; stan brudnopisu i wynik programu zostają.
  onPython: () => void;
  nr: number;
  widok: Widok;
  onWidok: (w: Widok) => void;
  szkic?: Szkicowany;
  onSzkic: (s: Szkicowany | null) => void;
};

export function Brudnopis({ tekst, onTekst, onPython, nr, widok, onWidok, szkic, onSzkic }: Props) {
  const pole = useRef<HTMLTextAreaElement>(null);
  const lustro = useRef<HTMLDivElement>(null);
  const [kursor, setKursor] = useState<number | null>(null); // null: pole bez fokusu albo zaznaczenie
  const [odrzucona, setOdrzucona] = useState<{ tekst: string; kursor: number } | null>(null);
  const [miejsce, setMiejsce] = useState<{ x: number; y: number } | null>(null);
  const [przewiniecie, setPrzewiniecie] = useState(0);

  const wynik = useMemo(() => (kursor === null ? null : sugestia(tekst, kursor)), [tekst, kursor]);
  // Esc ukrywa sugestię do następnej zmiany tekstu albo kursora.
  const widoczna = wynik !== null && !(odrzucona && odrzucona.tekst === tekst && odrzucona.kursor === kursor);

  const odczytaj = (e: SyntheticEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget;
    setKursor(t.selectionStart === t.selectionEnd ? t.selectionStart : null);
  };

  // Pozycja kursora z lustrzanej kopii tekstu o tych samych wymiarach co pole.
  useLayoutEffect(() => {
    const t = pole.current;
    const l = lustro.current;
    if (!widoczna || !t || !l || kursor === null) {
      setMiejsce(null);
      return;
    }
    l.style.width = `${t.clientWidth + 2}px`; // + ramka, bo lustro ma box-sizing: border-box
    l.textContent = tekst.slice(0, kursor);
    const znacznik = document.createElement("span");
    znacznik.textContent = "​";
    l.appendChild(znacznik);
    const wys = parseFloat(getComputedStyle(t).lineHeight) || 24;
    setMiejsce({ x: znacznik.offsetLeft, y: znacznik.offsetTop + wys - t.scrollTop });
  }, [widoczna, tekst, kursor, przewiniecie]);

  const wstaw = () => {
    const t = pole.current;
    if (!t || wynik === null) return;
    t.focus();
    // insertText zachowuje cofanie (Ctrl+Z); gdy przeglądarka go nie ma, wstawiamy ręcznie.
    if (!document.execCommand("insertText", false, ` ${wynik}`)) {
      const k = t.selectionStart;
      onTekst(`${tekst.slice(0, k)} ${wynik}${tekst.slice(k)}`);
    }
  };

  const klawisz = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!widoczna || e.nativeEvent.isComposing) return;
    const przyjmij = (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) || (e.key === "Enter" && (e.ctrlKey || e.metaKey));
    if (przyjmij) {
      e.preventDefault();
      wstaw();
    } else if (e.key === "Escape") {
      // defaultPrevented: Esc ukrywa tylko sugestię, a nie cały panel.
      e.preventDefault();
      setOdrzucona({ tekst, kursor: kursor ?? 0 });
    }
  };

  return (
    <div className={widok === "szkic" ? `${styles.brudnopis} ${styles.naSzkic}` : styles.brudnopis}>
      <p className={styles.nota}>
        <strong>Brudnopis nie jest odpowiedzią i nie podlega ocenie.</strong> Pisz lub rysuj tu obliczenia i notatki do zadania; zapisują się przy nim osobno od odpowiedzi.
      </p>
      <div className={styles.przelacznik} role="group" aria-label="Rodzaj brudnopisu">
        {(["tekst", "szkic"] as const).map((w) => (
          <button key={w} type="button" className={styles.opcja} aria-pressed={widok === w} onClick={() => onWidok(w)}>
            {w === "tekst" ? "Tekst" : "Szkic"}
          </button>
        ))}
      </div>
      {widok === "szkic" ? (
        <div className={styles.szkic}>
          <Szkic nr={nr} zapis={szkic} onZmiana={onSzkic} />
        </div>
      ) : (
      <>
      <div className={styles.pole}>
        <textarea
          ref={pole}
          className={styles.tekst}
          value={tekst}
          onChange={(e) => {
            onTekst(e.target.value);
            setOdrzucona(null);
            odczytaj(e);
          }}
          onSelect={odczytaj}
          onBlur={() => setKursor(null)}
          onScroll={() => setPrzewiniecie(pole.current?.scrollTop ?? 0)}
          onKeyDown={klawisz}
          aria-label="Brudnopis do zadania, nie jest odpowiedzią"
          placeholder={"Np. 2 + 3 * 4 =\nPo „=” pojawi się sugestia wyniku."}
          spellCheck={false}
          autoComplete="off"
        />
        <div ref={lustro} className={styles.lustro} aria-hidden="true" />
        {widoczna && miejsce && (
          <button
            type="button"
            className={styles.sugestia}
            style={{ left: Math.max(0, Math.min(miejsce.x, (pole.current?.clientWidth ?? 0) - 170)), top: miejsce.y }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={wstaw}
            aria-label={`Wstaw wynik ${wynik} po znaku równa się`}
          >
            <span>= {wynik}</span>
            <span className={styles.skrot} aria-hidden="true">Tab</span>
          </button>
        )}
        <span className="visually-hidden" role="status">
          {widoczna ? `Sugestia wyniku: ${wynik}. Tab lub Ctrl Enter wstawia, Escape ukrywa.` : ""}
        </span>
      </div>
      <div className={styles.dol}>
        <p className={styles.podpowiedz}>Sugestia wyniku po „=”: Tab, Ctrl+Enter lub klik wstawia, Esc ukrywa, pisz dalej, żeby zignorować. Obsługa: + − * / ^ i nawiasy.</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onPython}>
          <Terminal size={15} aria-hidden="true" /> Policz w Pythonie
        </button>
      </div>
      </>
      )}
    </div>
  );
}
