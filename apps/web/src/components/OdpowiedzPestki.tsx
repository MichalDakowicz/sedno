import { useId, useState } from "react";
import {
  AKCJE, odczytajOdpowiedzPestki, opisKartyZrodla, zatwierdzPowierzchnie, type AkcjaPestki,
} from "../../../../services/supabase/functions/_shared/pestka-odpowiedz";
import { Markdown } from "./Markdown";
import styles from "./TutorChat.module.css";

export function OdpowiedzPestki({ tekst, dane, zajeta, wykonaj }: {
  tekst: string;
  dane: unknown;
  zajeta: boolean;
  wykonaj: (akcja: Exclude<AkcjaPestki, "zrodlo">) => void;
}) {
  const [otwarte, ustawOtwarte] = useState(false);
  const id = useId();
  const odpowiedz = odczytajOdpowiedzPestki(dane);
  const karta = odpowiedz && zatwierdzPowierzchnie(odpowiedz);
  const przyciskZrodla = (
    <button type="button" className={styles.chip} aria-expanded={otwarte} aria-controls={id} onClick={() => ustawOtwarte((o) => !o)}>
      {otwarte ? "Ukryj źródło" : AKCJE.zrodlo}
    </button>
  );

  return (
    <>
      {karta ? (
        <section className={styles.kartaLektury} aria-label="Sprawdzenie odwołania do lektury">
          {karta.createSurface.components.map((element) => {
            if (element.component === "Text" && element.id !== "pokaz-napis") {
              return element.id === "status"
                ? <p key={element.id}><strong>{element.text}</strong></p>
                : <p key={element.id}>{element.text}</p>;
            }
            return element.component === "Button" ? <div key={element.id}>{przyciskZrodla}</div> : null;
          })}
        </section>
      ) : <Markdown className={styles.tutorText}>{tekst}</Markdown>}
      {!!odpowiedz?.akcje.length && (
        <div className={styles.akcje}>
          {odpowiedz.akcje.map((akcja) => akcja === "zrodlo"
            ? (!karta && <span key={akcja}>{przyciskZrodla}</span>)
            : <button key={akcja} type="button" className={styles.chip} disabled={zajeta} onClick={() => wykonaj(akcja)}>{AKCJE[akcja]}</button>)}
        </div>
      )}
      {/* Źródła pokazuje przycisk „Pokaż źródło”; zawsze widoczna lista sprawiała, że przycisk nic nie zmieniał. */}
      {otwarte && !!odpowiedz?.zrodla.length && (
        <ul className={styles.zrodla} id={id}>
          {odpowiedz.zrodla.map((z, i) => {
            const cele = z.miejsca?.map((m) => ({ ...z, ...m, sekcja: m.miejsce })) ?? [z];
            return (
              <li key={i}>
                {z.twierdzenie && <p>{z.twierdzenie}</p>}
                {z.dowod && <p>„{z.dowod}”</p>}
                {cele.map((cel, j) => {
                  const opis = opisKartyZrodla(cel);
                  return (
                    <div key={j}>
                      <a href={cel.url} target="_blank" rel="noreferrer">
                        {j === 0 && z.twierdzenie?.match(/^\[\d+\]/)?.[0]} {opis.link}
                      </a>{" "}
                      {opis.miejsce && <span className="muted">· {opis.miejsce}</span>}
                    </div>
                  );
                })}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
