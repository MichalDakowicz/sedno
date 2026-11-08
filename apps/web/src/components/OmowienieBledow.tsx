// Karta omawiania jednego błędu. Pestka „wypluwa” ją pod zadaniem z błędem: zaczyna od pytania
// naprowadzającego, prowadzi rozmowę i na prośbę daje zadanie podobne, żeby sprawdzić, czy uczeń
// zrozumiał. Karta leży w treści strony, więc nie zasłania zadania ani na komputerze, ani na telefonie.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Lightbulb, X } from "lucide-react";
import { aiErrorText, AiError, streamAi, type AiMessage } from "../ai";
import { bezEmoji } from "../pestka";
import { poziomAI, promptOmowienia, zrobPrzyklad, type DoOmowienia, type Przyklad } from "../arkusze/omowienie";
import type { Postep } from "../arkusze/postep";
import type { Arkusz } from "../arkusze/typy";
import { Markdown } from "./Markdown";
import { TutorAvatar } from "./TutorAvatar";
import chat from "./TutorChat.module.css";
import styles from "./OmowienieBledow.module.css";

type Wiadomosc = { od: "tutor" | "uczen"; tekst: string };
type StanPrzykladu = { stan: "laduje" } | { stan: "brak" } | { stan: "gotowy"; zadanie: Przyklad; wybrana?: string };

// Pierwsza wiadomość ucznia nie jest pokazywana: tylko uruchamia omówienie.
const START = "Omówmy to zadanie.";

export function OmowienieBledow({
  arkusz,
  postep,
  d,
  numer,
  wszystkich,
  onDalej,
  onWynikPrzykladu,
  onZamknij,
}: {
  arkusz: Arkusz;
  postep: Postep;
  d: DoOmowienia;
  numer: number;
  wszystkich: number;
  onDalej: () => void;
  onWynikPrzykladu: (zadanie: number, wynik: "dobrze" | "zle") => void;
  onZamknij: () => void;
}) {
  const [rozmowa, setRozmowa] = useState<Wiadomosc[]>([]);
  const [mysli, setMysli] = useState(false);
  const [przyklad, setPrzyklad] = useState<StanPrzykladu | null>(null);
  const [szkic, setSzkic] = useState("");
  const listaRef = useRef<HTMLDivElement>(null);
  const nr = d.zadanie.nr;
  const ostatni = numer === wszystkich;

  const kartaRef = useRef<HTMLElement>(null);

  // Podświetl zadanie i przewiń tak, żeby karta była cała widoczna, a nad nią koniec zadania.
  useEffect(() => {
    const el = document.getElementById(`zadanie-${nr}`);
    el?.setAttribute("data-omawiane", "true");
    kartaRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    return () => el?.removeAttribute("data-omawiane");
  }, [nr]);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [rozmowa, mysli, przyklad]);

  async function zapytaj(historia: Wiadomosc[]) {
    setMysli(true);
    const wiadomosci: AiMessage[] = [
      { role: "system", content: promptOmowienia(arkusz, d, postep) },
      { role: "user", content: START },
      ...historia.map((m): AiMessage => ({ role: m.od === "tutor" ? "assistant" : "user", content: m.tekst })),
    ];
    let tekst = "";
    const pisz = (t: string) => setRozmowa([...historia, { od: "tutor", tekst: t }]);
    try {
      await streamAi({ tier: poziomAI(d), task: d.wypracowanie ? "omowienie-wypracowania" : "omowienie-bledu", messages: wiadomosci }, (delta) => {
        tekst += delta;
        pisz(bezEmoji(tekst));
      });
      if (!tekst.trim()) pisz("Zamyśliłam się i nic nie napisałam. Napisz coś, a spróbuję jeszcze raz.");
    } catch (e) {
      pisz(aiErrorText(e instanceof AiError ? e.code : "server_error"));
    }
    setMysli(false);
    // Karta urosła o odpowiedź: dociągnij widok, żeby pole odpowiedzi nie uciekło pod ekran.
    kartaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Każde zadanie zaczyna Pestka.
  useEffect(() => {
    void zapytaj([]);
  }, []);

  function wyslij(e: FormEvent) {
    e.preventDefault();
    const t = szkic.trim();
    if (!t || mysli) return;
    setSzkic("");
    void zapytaj([...rozmowa, { od: "uczen", tekst: t }]);
  }

  async function dajPrzyklad() {
    setPrzyklad({ stan: "laduje" });
    const zadanie = await zrobPrzyklad(arkusz, d, postep).catch(() => null);
    setPrzyklad(zadanie ? { stan: "gotowy", zadanie } : { stan: "brak" });
  }

  function wybierz(litera: string) {
    if (przyklad?.stan !== "gotowy" || przyklad.wybrana) return;
    setPrzyklad({ ...przyklad, wybrana: litera });
    onWynikPrzykladu(nr, litera === przyklad.zadanie.poprawna ? "dobrze" : "zle");
  }

  return (
    <section ref={kartaRef} className={styles.karta} aria-label={`Omawianie zadania ${nr} z Pestką`} data-tutor="omowienie">
      <header className={styles.head}>
        <TutorAvatar size={40} state={mysli ? "thinking" : "idle"} className={styles.avatar} />
        <span className="label">
          {d.wypracowanie ? "Wypracowanie" : "Błąd"} {numer} z {wszystkich} · zadanie {nr}.
        </span>
        <button type="button" className={styles.zamknij} onClick={onZamknij} aria-label="Zakończ omawianie">
          <X size={18} />
        </button>
      </header>

      <div className={`${chat.list} ${styles.lista}`} ref={listaRef} aria-live="polite">
        {numer === 1 && (
          <p className={styles.zapowiedz}>
            Omówimy {wszystkich === 1 ? "jedno zadanie" : wszystkich < 5 ? `${wszystkich} zadania` : `${wszystkich} zadań`}. Przy każdym najpierw
            zapytam, potem wyjaśnię, a na koniec możesz poprosić o przykład do sprawdzenia.
          </p>
        )}
        {rozmowa.map((m, i) =>
          m.od === "tutor" ? (
            <Markdown key={i} className={chat.tutorText}>
              {m.tekst}
            </Markdown>
          ) : (
            <p key={i} className={chat.studentText}>
              {m.tekst}
            </p>
          ),
        )}
        {mysli && !rozmowa.at(-1)?.tekst && (
          <span className={chat.typing} aria-label="Pestka pisze">
            <i />
            <i />
            <i />
          </span>
        )}

        {przyklad?.stan === "laduje" && <p className="small muted">Przygotowuję zadanie podobne i sprawdzam, czy ma jedną dobrą odpowiedź…</p>}
        {przyklad?.stan === "brak" && <p className="small muted">Nie udało się przygotować pewnego zadania podobnego. Spróbuj jeszcze raz albo przejdź dalej.</p>}
        {przyklad?.stan === "gotowy" && (
          <div className={styles.przyklad}>
            <span className="label">Sprawdź się</span>
            <Markdown>{przyklad.zadanie.tresc}</Markdown>
            <div className={styles.opcje}>
              {Object.entries(przyklad.zadanie.opcje).map(([l, t]) => {
                const stan = !przyklad.wybrana ? undefined : l === przyklad.zadanie.poprawna ? "dobra" : l === przyklad.wybrana ? "zla" : undefined;
                return (
                  <button key={l} type="button" className={styles.opcja} data-stan={stan} disabled={!!przyklad.wybrana} onClick={() => wybierz(l)}>
                    <span className={styles.litera}>{l}</span>
                    <Markdown>{t}</Markdown>
                  </button>
                );
              })}
            </div>
            {przyklad.wybrana && (
              <Markdown className={styles.wyjasnienie}>
                {`**${przyklad.wybrana === przyklad.zadanie.poprawna ? "Dobrze." : `Poprawna to ${przyklad.zadanie.poprawna}.`}** ${przyklad.zadanie.wyjasnienie}`}
              </Markdown>
            )}
          </div>
        )}
      </div>

      <form className={styles.form} onSubmit={wyslij}>
        <label htmlFor={`omowienie-${nr}`} className="visually-hidden">
          Odpowiedź dla Pestki
        </label>
        <input
          id={`omowienie-${nr}`}
          className="input"
          value={szkic}
          onChange={(e) => setSzkic(e.target.value)}
          placeholder="Odpowiedz Pestce…"
          autoComplete="off"
        />
      </form>

      <div className={styles.akcje}>
        {!d.wypracowanie && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void dajPrzyklad()} disabled={przyklad?.stan === "laduje" || mysli}>
            <Lightbulb size={16} aria-hidden="true" /> {przyklad ? "Inny przykład" : "Daj przykład"}
          </button>
        )}
        <button type="button" className="btn btn-soft btn-sm" onClick={ostatni ? onZamknij : onDalej}>
          {ostatni ? "Zakończ" : "Następny błąd"} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
