import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Maximize2, Minimize2 } from "lucide-react";
import { liczSlowa } from "../arkusze/sprawdz";
import styles from "./Wypracowanie.module.css";

export type Temat = { nr: number; tekst: string; punkty: string[] };

type Props = {
  tekst: string;
  poczatek?: string;
  tematy: Temat[]; // dwa tematy do wyboru (rozszerzenie, dwujęzyczny) albo pusto
  punkty: string[]; // elementy treści z polecenia, gdy temat jest jeden
  polecenie?: string; // pokazywane w trybie skupienia, gdy nie ma tematów do wyboru
  zakres: [number, number] | null;
  temat: number | null;
  odhaczone: number[];
  tylkoOdczyt: boolean;
  onTekst: (t: string) => void;
  onTemat: (nr: number) => void;
  onOdhacz: (i: number) => void;
};

// Edytor wypowiedzi pisemnej: wybór tematu, lista elementów treści do
// odhaczenia, licznik słów względem zakresu z polecenia i tryb skupienia.
export function Wypracowanie(props: Props) {
  const { tekst, poczatek, tematy, zakres, temat, odhaczone, tylkoOdczyt } = props;
  const pole = useRef<HTMLTextAreaElement>(null);
  const [skupienie, setSkupienie] = useState(false);
  const [zapisano, setZapisano] = useState(false);

  // Pole rośnie razem z tekstem, zamiast przewijać się w środku.
  useLayoutEffect(() => {
    const p = pole.current;
    if (!p) return;
    p.style.height = "auto";
    p.style.height = `${p.scrollHeight + 2}px`;
  }, [tekst, skupienie]);

  useEffect(() => {
    if (!tekst) return;
    setZapisano(false);
    const t = window.setTimeout(() => setZapisano(true), 600);
    return () => window.clearTimeout(t);
  }, [tekst]);

  useEffect(() => {
    if (!skupienie) return;
    const naKlawisz = (e: KeyboardEvent) => e.key === "Escape" && setSkupienie(false);
    document.addEventListener("keydown", naKlawisz);
    document.body.style.overflow = "hidden";
    pole.current?.focus();
    return () => {
      document.removeEventListener("keydown", naKlawisz);
      document.body.style.overflow = "";
    };
  }, [skupienie]);

  const slowa = liczSlowa(tekst);
  const akapity = tekst.split(/\n\s*\n/).filter((a) => a.trim()).length;
  const wybrany = tematy.find((t) => t.nr === temat);
  const lista = tematy.length ? (wybrany?.punkty ?? []) : props.punkty;

  return (
    <div className={styles.wrap}>
      {tematy.length > 1 && (
        <fieldset className={styles.topics} disabled={tylkoOdczyt}>
          <legend className="label">Wybierz temat</legend>
          {tematy.map((t) => (
            <label key={t.nr} className={styles.topic} data-wybrany={temat === t.nr || undefined}>
              <input type="radio" name="temat" checked={temat === t.nr} onChange={() => props.onTemat(t.nr)} />
              <span className={styles.topicNr}>{t.nr}</span>
              <span className={styles.topicText}>
                {t.tekst}
                {t.punkty.length > 0 && (
                  <span className={styles.topicPoints}>
                    {t.punkty.map((p) => (
                      <span key={p}>{p}</span>
                    ))}
                  </span>
                )}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <div className={`${styles.editor} ${skupienie ? styles.focus : ""}`}>
        <div className={styles.sheet}>
          <div className={styles.toolbar}>
            <span className={styles.toolbarTitle}>{wybrany ? `Temat ${wybrany.nr}` : "Twoja wypowiedź"}</span>
            <span className={`small ${styles.saved}`} aria-live="polite">
              {tekst && zapisano && (
                <>
                  <Check size={14} aria-hidden="true" /> zapisano
                </>
              )}
            </span>
            <button type="button" className={styles.tool} onClick={() => setSkupienie((s) => !s)} aria-pressed={skupienie}>
              {skupienie ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
              {skupienie ? "Zamknij" : "Tryb skupienia"}
            </button>
          </div>

          {skupienie && <Polecenie wybrany={wybrany} tematy={tematy} polecenie={props.polecenie} />}

          <div className={styles.body}>
            {poczatek && (
              <p className={styles.start} title="Początek podany w arkuszu, nie wlicza się do limitu słów">
                {poczatek}
              </p>
            )}
            <textarea
              ref={pole}
              className={styles.area}
              value={tekst}
              readOnly={tylkoOdczyt}
              onChange={(e) => props.onTekst(e.target.value)}
              lang="en"
              spellCheck
              aria-label="Twoja wypowiedź"
              placeholder={poczatek ? "Pisz dalej po angielsku…" : "Zacznij pisać po angielsku. Akapity oddzielaj pustą linią."}
            />
          </div>

          <Licznik slowa={slowa} zakres={zakres} akapity={akapity} />
        </div>

        {lista.length > 0 && (
          <aside className={styles.checklist} aria-label="Elementy treści">
            <div className={styles.checkHead}>
              <span className={styles.checkTitle}>Elementy treści</span>
              <span className={styles.checkCount} data-komplet={odhaczone.length >= lista.length || undefined}>
                {odhaczone.filter((i) => i < lista.length).length} z {lista.length}
              </span>
            </div>
            <p className={styles.checkHint}>Odhacz punkt, gdy jest już w tekście. Za pominięty tracisz punkty za treść.</p>
            <ol className={styles.checkList}>
              {lista.map((p, i) => {
                const zrobione = odhaczone.includes(i);
                return (
                  <li key={i}>
                    <label className={styles.check} data-odhaczony={zrobione || undefined}>
                      <input type="checkbox" className="visually-hidden" checked={zrobione} disabled={tylkoOdczyt} onChange={() => props.onOdhacz(i)} />
                      <span className={styles.checkMark} aria-hidden="true">
                        {zrobione ? <Check size={14} strokeWidth={3} /> : i + 1}
                      </span>
                      <span className={styles.checkText}>{wielka(p.replace(/^•\s*/, "").replace(/\.$/, ""))}</span>
                    </label>
                  </li>
                );
              })}
            </ol>
          </aside>
        )}
      </div>
    </div>
  );
}

const wielka = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// W trybie skupienia nad tekstem stoi to, o czym się pisze: wybrany temat
// z jego punktami albo polecenie (gdy temat jest jeden).
function Polecenie({ wybrany, tematy, polecenie }: { wybrany?: Temat; tematy: Temat[]; polecenie?: string }) {
  if (tematy.length > 1 && !wybrany) {
    return (
      <div className={styles.brief}>
        <span className={styles.briefLabel}>Temat</span>
        <p className="muted">Nie wybrano tematu. Zamknij tryb skupienia i wybierz jeden z {tematy.length} tematów nad edytorem.</p>
      </div>
    );
  }
  if (!wybrany && !polecenie) return null;
  return (
    <div className={styles.brief}>
      <span className={styles.briefLabel}>{wybrany ? `Temat ${wybrany.nr}` : "Polecenie"}</span>
      <p>{wybrany ? wybrany.tekst : polecenie}</p>
      {wybrany && wybrany.punkty.length > 0 && (
        <ul>
          {wybrany.punkty.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Licznik({ slowa, zakres, akapity }: { slowa: number; zakres: [number, number] | null; akapity: number }) {
  const [min, max] = zakres ?? [0, 0];
  const skala = zakres ? max * 1.25 : 1;
  const stan = !zakres ? "brak" : slowa < min ? "malo" : slowa <= max ? "ok" : "duzo";
  const opis = !zakres
    ? null
    : stan === "malo"
      ? `jeszcze ${min - slowa} do minimum`
      : stan === "ok"
        ? "długość w normie"
        : `${slowa - max} ponad zalecaną długość`;
  return (
    <div className={styles.counter} data-stan={stan}>
      <span className={styles.count}>
        <strong>{slowa}</strong> {zakres ? `/ ${min}–${max} słów` : "słów"}
      </span>
      {zakres && (
        <span className={styles.meter} aria-hidden="true">
          <span className={styles.range} style={{ left: `${(min / skala) * 100}%`, width: `${((max - min) / skala) * 100}%` }} />
          <span className={styles.fill} style={{ width: `${Math.min(slowa / skala, 1) * 100}%` }} />
        </span>
      )}
      {opis && <span className={`small ${styles.status}`}>{opis}</span>}
      <span className="small muted">akapity: {akapity}</span>
    </div>
  );
}
