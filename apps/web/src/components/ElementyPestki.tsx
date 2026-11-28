// Interaktywne elementy w odpowiedzi Pestki (quiz, przyciski do ekranów aplikacji, kroki, fiszki, wykresy).
// Dane zatwierdza services/supabase/functions/_shared/pestka-ui.ts; tu tylko je rysujemy. Elementy rozdziela
// linia, bez kart (DESIGN.md), a kafle quizu wyglądają jak w szybkiej rundzie.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
import type { ElementUi } from "../../../../services/supabase/functions/_shared/pestka-ui";
import { Markdown } from "./Markdown";
import { Linia } from "./wykresy";
import styles from "./ElementyPestki.module.css";

type Quiz = Extract<ElementUi, { typ: "quiz" }>;

const LITERY = ["A", "B", "C", "D"];

function QuizUi({ q }: { q: Quiz }) {
  const [wybor, ustawWybor] = useState<number | null>(null);
  const gotowe = wybor !== null;
  const stan = (i: number) => (!gotowe ? undefined : i === wybor ? (i === q.poprawna ? "trafiona" : "bledna") : i === q.poprawna ? "poprawna" : undefined);
  return (
    <div className={styles.quiz}>
      <Markdown className={styles.pytanie}>{q.pytanie}</Markdown>
      <div className={styles.kafle} role="radiogroup" aria-label="Odpowiedzi">
        {q.opcje.map((o, i) => (
          <label key={i} className={styles.kafel} data-stan={stan(i)}>
            <input type="radio" name="quiz" className={styles.radio} checked={wybor === i} disabled={gotowe} onChange={() => ustawWybor(i)} />
            <span className={styles.litera}>{LITERY[i]}</span>
            <span className={styles.tekstKafla}><Markdown>{o}</Markdown></span>
            {gotowe && (i === q.poprawna || i === wybor) && (
              <span className={styles.znak} aria-hidden="true">{i === q.poprawna ? <Check size={18} /> : <X size={18} />}</span>
            )}
          </label>
        ))}
      </div>
      {gotowe && (
        <div className={styles.wyjasnienie} role="status">
          <p className={styles.werdykt}>{wybor === q.poprawna ? "Dobrze." : `Nie tym razem. Poprawna: ${LITERY[q.poprawna]}.`}</p>
          <Markdown>{q.wyjasnienie}</Markdown>
        </div>
      )}
    </div>
  );
}

function AkcjeUi({ przyciski }: { przyciski: { etykieta: string; cel: string }[] }) {
  return (
    <div className={styles.akcje}>
      {przyciski.map((p, i) => (
        <Link key={i} to={p.cel} className={styles.przycisk}>
          {p.etykieta} <ArrowRight size={15} aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}

function KrokiUi({ tytul, kroki }: { tytul?: string; kroki: string[] }) {
  const [ile, ustawIle] = useState(1);
  return (
    <div className={styles.kroki}>
      {tytul && <Markdown className={styles.tytul}>{tytul}</Markdown>}
      <ol className={styles.listaKrokow}>
        {kroki.slice(0, ile).map((k, i) => (
          <li key={i} className={styles.krok}>
            <span className={styles.numer}>{i + 1}</span>
            <Markdown>{k}</Markdown>
          </li>
        ))}
      </ol>
      {ile < kroki.length ? (
        <button type="button" className={styles.przycisk} onClick={() => ustawIle((n) => n + 1)}>
          Pokaż następny krok <span className={styles.licznik}>{ile} z {kroki.length}</span>
        </button>
      ) : (
        <p className="small muted">To wszystkie kroki.</p>
      )}
    </div>
  );
}

function FiszkiUi({ karty }: { karty: { przod: string; tyl: string }[] }) {
  const [i, ustawI] = useState(0);
  const [odwrocona, ustawOdwrocona] = useState(false);
  const idz = (d: number) => {
    ustawI((x) => (x + d + karty.length) % karty.length);
    ustawOdwrocona(false);
  };
  const k = karty[i]!;
  return (
    <div className={styles.fiszki}>
      <button type="button" className={styles.fiszka} data-odwrocona={odwrocona || undefined} onClick={() => ustawOdwrocona((o) => !o)} aria-live="polite">
        <span className={styles.strona}>{odwrocona ? "Odpowiedź" : "Pytanie"}</span>
        <Markdown>{odwrocona ? k.tyl : k.przod}</Markdown>
        {!odwrocona && <span className="small muted">Dotknij, żeby odwrócić</span>}
      </button>
      <div className={styles.fiszkiNawigacja}>
        <button type="button" className={styles.przycisk} onClick={() => idz(-1)}>Wstecz</button>
        <span className={styles.licznik}>{i + 1} z {karty.length}</span>
        <button type="button" className={styles.przycisk} onClick={() => idz(1)}>Dalej</button>
      </div>
    </div>
  );
}

function WykresUi({ w }: { w: Extract<ElementUi, { typ: "wykres" }> }) {
  const jednostka = w.jednostka ?? "";
  // Procenty liczymy od 100, inne wartości od największej, żeby słupki były czytelne.
  const skala = jednostka === "%" ? 100 : Math.max(...w.dane.map((d) => d.wartosc), 1);
  const pokaz = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1).replace(".", ",")}${jednostka ? (jednostka === "%" ? "%" : ` ${jednostka}`) : ""}`;
  const opis = `${w.tytul ?? "Wykres"}: ${w.dane.map((d) => `${d.etykieta} ${pokaz(d.wartosc)}`).join(", ")}`;
  return (
    <figure className={styles.wykres}>
      {w.tytul && <figcaption className={styles.tytul}>{w.tytul}</figcaption>}
      {w.rodzaj === "linia" ? (
        <>
          <Linia punkty={w.dane.map((d) => d.wartosc / skala)} podpisOstatniego={pokaz(w.dane.at(-1)!.wartosc)} opis={opis} wysokosc={96} />
          <div className={styles.osX} aria-hidden="true">
            <span>{w.dane[0]!.etykieta}</span>
            <span>{w.dane.at(-1)!.etykieta}</span>
          </div>
        </>
      ) : (
        <ul className={styles.slupki} aria-label={opis}>
          {w.dane.map((d, i) => (
            <li key={i} className={styles.slupek}>
              <span className={styles.etykieta}>{d.etykieta}</span>
              <span className={styles.tor}><span className={styles.wartosc} style={{ width: `${Math.min(100, (d.wartosc / skala) * 100)}%` }} /></span>
              <span className={styles.liczba}>{pokaz(d.wartosc)}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

export function ElementyPestki({ elementy }: { elementy: ElementUi[] }) {
  if (!elementy.length) return null;
  return (
    <div className={styles.elementy}>
      {elementy.map((e, i) => (
        <section key={i} className={styles.element}>
          {e.typ === "quiz" && <QuizUi q={e} />}
          {e.typ === "akcje" && <AkcjeUi przyciski={e.przyciski} />}
          {e.typ === "kroki" && <KrokiUi tytul={e.tytul} kroki={e.kroki} />}
          {e.typ === "fiszki" && <FiszkiUi karty={e.karty} />}
          {e.typ === "wykres" && <WykresUi w={e} />}
        </section>
      ))}
    </div>
  );
}
