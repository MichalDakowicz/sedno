import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { ChevronRight, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { AiError, aiErrorText } from "../../ai";
import { supabase } from "../../supabase";
import styles from "./UczenUczy.module.css";
import { NaglowekStrony } from "../../components/NaglowekStrony";

type Scenariusz = { id: string; tytul: string; polecenie: string; przyklad: string; kryteria: string[] };
type Status = "dobrze" | "do-poprawy" | "do-zrobienia" | "niepewne";
type Ocena = { kolega: string; statusy: Record<string, Status>; zakoncz: boolean; omowienie: string | null };
type Tura = { odpowiedz: string; ocena: Ocena };
type Zadanie =
  | { action: "uczen-uczy-scenariusze" }
  | { action: "uczen-uczy"; scenariusz: string; wypowiedzi: string[] };

const KRYTERIA: Record<string, string> = {
  blad: "Wskazanie błędu",
  regula: "Uzasadnienie poprawki",
  przyklad: "Poprawny przykład",
};
const STATUS: Record<Status, string> = {
  dobrze: "Spełnione",
  "do-poprawy": "Do poprawy",
  "do-zrobienia": "Czeka",
  niepewne: "Do doprecyzowania",
};

async function wywolaj<T>(body: Zadanie, signal: AbortSignal): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("nauka-ai", { body, signal });
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    const payload = await response.json().catch(() => null);
    const code = typeof payload?.error === "string" ? payload.error : "server_error";
    throw new AiError(code, response.status);
  }
  if (error || !data) throw new AiError("network_error", 0);
  return data;
}

function komunikat(blad: unknown): string {
  if (!(blad instanceof AiError)) return "Wystąpił błąd. Spróbuj ponownie.";
  if (blad.code === "network_error") return "Nie udało się połączyć z Sednem. Spróbuj ponownie.";
  if (blad.code === "no_provider") return "Połącz w profilu dostawcę dla zadań ważnych, żeby Sędzia mógł sprawdzić odpowiedź.";
  if (blad.code === "bad_model_response") return "Ocena Sędziego nie dotarła w poprawnej formie. Spróbuj ponownie.";
  return aiErrorText(blad.code);
}

function Runda({ scenariusz, wroc }: { scenariusz: Scenariusz; wroc: () => void }) {
  const [tury, ustawTury] = useState<Tura[]>([]);
  const [tekst, ustawTekst] = useState("");
  const [czeka, ustawCzeka] = useState(false);
  const [blad, ustawBlad] = useState<{ tekst: string; konfiguracja: boolean } | null>(null);
  const zadanie = useRef<AbortController | null>(null);
  const naglowek = useRef<HTMLHeadingElement>(null);
  const podsumowanie = useRef<HTMLHeadingElement>(null);
  const lista = useRef<HTMLOListElement>(null);
  const ocena = tury.at(-1)?.ocena;
  const zakonczona = ocena?.zakoncz === true;

  useEffect(() => {
    naglowek.current?.focus({ preventScroll: true });
    return () => zadanie.current?.abort();
  }, []);

  useEffect(() => {
    if (lista.current) lista.current.scrollTop = lista.current.scrollHeight;
  }, [tury.length]);

  useEffect(() => {
    if (zakonczona) podsumowanie.current?.focus();
  }, [zakonczona]);

  async function wyslij(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const odpowiedz = tekst.trim();
    if (!odpowiedz || zadanie.current || zakonczona) return;

    const controller = new AbortController();
    zadanie.current = controller;
    ustawCzeka(true);
    ustawBlad(null);
    try {
      const wynik = await wywolaj<Ocena>({
        action: "uczen-uczy",
        scenariusz: scenariusz.id,
        wypowiedzi: [...tury.map((tura) => tura.odpowiedz), odpowiedz],
      }, controller.signal);
      if (typeof wynik.kolega !== "string" || typeof wynik.zakoncz !== "boolean" ||
        (wynik.omowienie !== null && typeof wynik.omowienie !== "string") ||
        scenariusz.kryteria.some((id) => !Object.hasOwn(STATUS, wynik.statusy?.[id] ?? ""))) {
        throw new AiError("bad_model_response", 424);
      }
      if (!controller.signal.aborted) {
        ustawTury([...tury, { odpowiedz, ocena: wynik }]);
        ustawTekst("");
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        ustawBlad({ tekst: komunikat(e), konfiguracja: e instanceof AiError && e.code === "no_provider" });
      }
    } finally {
      if (zadanie.current === controller) {
        zadanie.current = null;
        if (!controller.signal.aborted) ustawCzeka(false);
      }
    }
  }

  function skrot(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <>
      <section className={styles.sekcja} aria-labelledby="uczen-temat">
        <h2 className="h2" id="uczen-temat" ref={naglowek} tabIndex={-1}>{scenariusz.tytul}</h2>
        <p className="muted">{scenariusz.polecenie}</p>
      </section>
      <div className={styles.uklad}>
        <section className={styles.rozmowa} aria-label="Rozmowa">
          <ol ref={lista} className={styles.wiadomosci} role="log" aria-label="Rozmowa z Kolegą">
            <li className={styles.kolega}>
              <strong>Kolega</strong>
              <p lang="en">{scenariusz.przyklad}</p>
            </li>
            {tury.map(({ odpowiedz, ocena: wynik }, i) => (
              <Fragment key={i}>
                <li className={styles.uczen}><strong>Ty</strong><p>{odpowiedz}</p></li>
                <li className={styles.kolega}><strong>Kolega</strong><p>{wynik.kolega}</p></li>
              </Fragment>
            ))}
          </ol>
          {zakonczona ? (
            <section className={styles.kompozytor} aria-labelledby="uczen-wynik">
              <h3 className="h3" id="uczen-wynik" ref={podsumowanie} tabIndex={-1}>Podsumowanie rundy</h3>
              {ocena?.omowienie && <p>{ocena.omowienie}</p>}
            </section>
          ) : (
            <form className={styles.kompozytor} onSubmit={wyslij}>
              <label htmlFor="uczen-odpowiedz">Jak poprawisz przykład i dlaczego?</label>
              <textarea
                id="uczen-odpowiedz"
                value={tekst}
                onChange={(e) => {
                  ustawTekst(e.target.value);
                  if (blad) ustawBlad(null);
                }}
                onKeyDown={skrot}
                readOnly={czeka}
                rows={4}
                maxLength={1500}
              />
              {blad && (
                <div className={styles.blad} role="alert">
                  <p>{blad.tekst}</p>
                  {blad.konfiguracja && <Link to="/profil#ai" className={styles.link}>Ustaw dostawcę w profilu</Link>}
                </div>
              )}
              <div className={styles.akcje}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={czeka || !tekst.trim()}
                  aria-keyshortcuts="Control+Enter Meta+Enter"
                >
                  <Send size={17} aria-hidden="true" />
                  {blad ? "Ponów wysłanie" : "Wyślij"}
                </button>
                {czeka && <p role="status" className="small muted">Sędzia sprawdza odpowiedź…</p>}
              </div>
            </form>
          )}
        </section>
        <aside className={`obok-karty ${styles.sedzia}`} aria-labelledby="uczen-sedzia">
          <h3 className="h3" id="uczen-sedzia">Sędzia sprawdza</h3>
          <ul className={styles.kryteria} aria-live="polite">
            {scenariusz.kryteria.map((id) => {
              const status = ocena?.statusy[id] ?? "do-zrobienia";
              return (
                <li key={id}>
                  <span>{KRYTERIA[id] ?? id}</span>
                  <span className="small" data-status={status}>{STATUS[status]}</span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
      <div className={styles.akcje}>
        <button type="button" className="btn btn-ghost" onClick={wroc} disabled={czeka}>
          {zakonczona || !tury.length ? "Wybierz temat" : "Wróć do tematów"}
        </button>
      </div>
    </>
  );
}

export function UczenUczy() {
  const [scenariusze, ustawScenariusze] = useState<Scenariusz[] | null>(null);
  const [scenariusz, ustawScenariusz] = useState<Scenariusz | null>(null);
  const [blad, ustawBlad] = useState<string | null>(null);
  const [proba, ustawProbe] = useState(0);
  const lista = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void wywolaj<{ scenariusze: Scenariusz[] }>({ action: "uczen-uczy-scenariusze" }, controller.signal)
      .then((wynik) => {
        if (!Array.isArray(wynik.scenariusze)) throw new AiError("server_error", 502);
        if (!controller.signal.aborted) ustawScenariusze(wynik.scenariusze);
      })
      .catch((e) => {
        if (!controller.signal.aborted) ustawBlad(komunikat(e));
      });
    return () => controller.abort();
  }, [proba]);

  function wroc() {
    ustawScenariusz(null);
    requestAnimationFrame(() => lista.current?.focus());
  }

  return (
    <main className={`container ${styles.strona}`}>
      <NaglowekStrony wstecz={{ do: "/nauka", nazwa: "Nauka" }} tytul="Naucz Kolegę" lead="Popraw przykład Kolegi i wyjaśnij mu, dlaczego zmiana działa." />
      {scenariusz ? (
        <Runda scenariusz={scenariusz} wroc={wroc} />
      ) : (
        <section className={styles.sekcja} aria-labelledby="uczen-tematy">
          <h2 className="h2" id="uczen-tematy" ref={lista} tabIndex={-1}>Wybierz temat</h2>
          {blad ? (
            <div className={styles.blad}>
              <p role="alert">{blad}</p>
              <button type="button" className="btn btn-ghost" onClick={() => {
                ustawBlad(null);
                ustawProbe((p) => p + 1);
              }}>Odśwież tematy</button>
            </div>
          ) : !scenariusze ? (
            <p role="status" className="muted">Pobieranie tematów…</p>
          ) : scenariusze.length ? (
            <ul className={styles.tematy}>
              {scenariusze.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => ustawScenariusz(s)}>
                    {s.tytul}<ChevronRight size={18} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Brak dostępnych tematów.</p>}
        </section>
      )}
    </main>
  );
}
