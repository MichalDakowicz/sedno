// Przenoszenie z warsztatu do odpowiedzi: uczeń wybiera podpunkt i to, co wstawić, widzi podgląd i dopiero
// wtedy wstawia. Nic nie trafia do odpowiedzi samo, a istniejąca treść jest dopisywana albo zastępowana
// tylko na wyraźny wybór.
import { useId, useState } from "react";
import type { Cel, RodzajOdpowiedzi } from "./materialy";
import styles from "./Warsztat.module.css";

export type Wariant = { id: string; etykieta: string; tekst: string; rodzaj: "wynik" | "kod"; jezyk?: "python" | "sql" };

const NAZWA_RODZAJU: Record<RodzajOdpowiedzi, string> = { wynik: "wynik", kod: "algorytm", sql: "zapytanie SQL", wykres: "wykres", inne: "" };

const WYJASNIENIE: Record<RodzajOdpowiedzi, string> = {
  wynik: "Tu oceniany jest wynik. Wstaw tylko to, o co pyta podpunkt, np. jedną wartość albo kilka wierszy.",
  kod: "Tu oceniany jest algorytm (może być pseudokod). Wstawiony kod możesz potem poprawić w polu odpowiedzi.",
  sql: "Tu odpowiedzią jest zapytanie SQL, a nie jego wynik.",
  wykres: "Wykresu nie sprawdzamy automatycznie: po sprawdzeniu arkusza oceniasz go sam. Wstaw tu tylko zestawienie liczb, a wykres zrób w arkuszu.",
  inne: "Wstaw tylko to, o co pyta podpunkt.",
};

/** Co z warsztatu pasuje do podpunktu: wynik do wyniku, kod do algorytmu i zapytania. */
export function wariantyDla(cel: Cel, wszystkie: Wariant[]): Wariant[] {
  return wszystkie.filter((w) => {
    if (cel.rodzaj === "inne") return true;
    if (cel.rodzaj === "kod") return w.rodzaj === "kod" && w.jezyk !== "sql";
    if (cel.rodzaj === "sql") return w.rodzaj === "kod" && w.jezyk === "sql";
    return w.rodzaj === "wynik";
  });
}

export function polaczOdpowiedz(istniejaca: string, tekst: string, tryb: "dopisz" | "zastap") {
  return istniejaca.trim() && tryb === "dopisz" ? `${istniejaca.trimEnd()}\n\n${tekst}` : tekst;
}

export function Przenoszenie({ cele, warianty, onWstaw, onZamknij }: { cele: Cel[]; warianty: Wariant[]; onWstaw: (nr: string, tekst: string) => void; onZamknij: () => void }) {
  const [nr, setNr] = useState(cele[0].nr);
  const [wybrany, setWybrany] = useState<string | null>(null);
  const [tryb, setTryb] = useState<"dopisz" | "zastap">("dopisz");
  const grupa = useId();
  const cel = cele.find((c) => c.nr === nr) ?? cele[0];
  const dostepne = wariantyDla(cel, warianty);
  const wariant = dostepne.find((w) => w.id === wybrany) ?? dostepne[0];
  if (!wariant) return null;
  const jest = cel.odpowiedz.trim().length > 0;

  return (
    <div className={styles.przenies}>
      {cele.length > 1 && (
        <div className={styles.przeniesWiersz} role="radiogroup" aria-label="Podpunkt, do którego wstawiasz">
          <span className="small muted">Do podpunktu</span>
          {cele.map((c) => (
            <button key={c.nr} type="button" role="radio" aria-checked={c.nr === cel.nr} className={styles.opcja} data-wybrana={c.nr === cel.nr || undefined} onClick={() => setNr(c.nr)}>
              {c.nr}
              {NAZWA_RODZAJU[c.rodzaj] && <span className="muted"> {NAZWA_RODZAJU[c.rodzaj]}</span>}
            </button>
          ))}
        </div>
      )}
      {dostepne.length > 1 && (
        <div className={styles.przeniesWiersz} role="radiogroup" aria-label="Co wstawić">
          <span className="small muted">Co wstawić</span>
          {dostepne.map((w) => (
            <button key={w.id} type="button" role="radio" aria-checked={w.id === wariant.id} className={styles.opcja} data-wybrana={w.id === wariant.id || undefined} onClick={() => setWybrany(w.id)}>
              {w.etykieta}
            </button>
          ))}
        </div>
      )}
      <span className="small muted">Podgląd: {wariant.etykieta.toLowerCase()} trafi do {cel.nr}</span>
      <pre className={styles.podglad} tabIndex={0} aria-label="Podgląd wstawianego tekstu">
        {wariant.tekst}
      </pre>
      <p className="small muted">{WYJASNIENIE[cel.rodzaj]}</p>
      {jest && (
        <fieldset className={styles.przeniesWiersz}>
          <legend className="small muted">W {cel.nr} jest już odpowiedź</legend>
          {(["dopisz", "zastap"] as const).map((t) => (
            <label key={t} className="small">
              <input type="radio" name={`${grupa}-tryb`} checked={tryb === t} onChange={() => setTryb(t)} /> {t === "dopisz" ? "Dopisz pod spodem" : "Zastąp"}
            </label>
          ))}
        </fieldset>
      )}
      <div className={styles.przeniesWiersz}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            onWstaw(cel.nr, polaczOdpowiedz(cel.odpowiedz, wariant.tekst, tryb));
            onZamknij();
          }}
        >
          {jest && tryb === "zastap" ? `Zastąp odpowiedź ${cel.nr}` : `Wstaw do ${cel.nr}`}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onZamknij}>
          Anuluj
        </button>
      </div>
    </div>
  );
}
