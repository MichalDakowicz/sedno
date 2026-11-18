import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { TutorAvatar } from "./TutorAvatar";
import { Markdown } from "./Markdown";
import { useTutor } from "./TutorContext";
import styles from "./TutorChat.module.css";

const kiedy = (iso: string) => {
  const dni = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return dni <= 0 ? "dziś" : dni === 1 ? "wczoraj" : `${dni} dni temu`;
};

/** Stała informacja o wsparciu pod odpowiedzią na trudną wiadomość ucznia (niezależna od modelu). */
export function WsparcieNota() {
  return (
    <p className={styles.wsparcie} role="note">
      Jeśli coś cię martwi, porozmawiaj z kimś, komu ufasz: z rodzicem lub opiekunem, wychowawcą, pedagogiem albo psychologiem szkolnym. Możesz też zadzwonić pod bezpłatny, całodobowy Telefon Zaufania dla Dzieci i Młodzieży: <a href="tel:116111">116 111</a>.
    </p>
  );
}

export function TutorChat() {
  const { messages, state, send, cofnijPriorytet, suggestions, rozmowy, biezacaRozmowa, nowaRozmowa, otworzRozmowe, aiGotowe } = useTutor();
  const [draft, setDraft] = useState("");
  const [lista, setLista] = useState(false);
  const wczesniejsze = rozmowy.filter((r) => r.id !== biezacaRozmowa);
  // Odpowiedź wpada do rozmowy, w której padło pytanie, więc w trakcie niej nie przełączamy rozmów.
  const zajeta = state !== "idle";
  const powod = zajeta ? "Pestka jeszcze odpowiada" : undefined;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, state]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (state !== "idle") return;
    send(draft);
    setDraft("");
  }

  return (
    <div className={styles.chat}>
      <div className={styles.rozmowyPasek}>
        <button type="button" className={styles.rozmowyPrzycisk} onClick={() => setLista((l) => !l)} disabled={lista ? false : !wczesniejsze.length || zajeta} title={lista ? undefined : powod} aria-expanded={lista}>
          {lista ? "Wróć do rozmowy" : `Wcześniejsze rozmowy${wczesniejsze.length ? ` (${wczesniejsze.length})` : ""}`}
        </button>
        {messages.some((m) => m.from === "student") && (
          <button
            type="button"
            className={styles.rozmowyPrzycisk}
            disabled={zajeta}
            title={powod}
            onClick={() => {
              nowaRozmowa();
              setLista(false);
            }}
          >
            Nowa rozmowa
          </button>
        )}
      </div>
      {lista ? (
        <ul className={styles.rozmowyLista}>
          {wczesniejsze.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                disabled={zajeta}
                title={powod}
                onClick={() => {
                  otworzRozmowe(r.id);
                  setLista(false);
                }}
              >
                <span>{r.tytul}</span>
                <span className="small muted">{kiedy(r.kiedy)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
      <div className={styles.list} ref={listRef} aria-live="polite">
        {messages.map((m) =>
          m.from === "tutor" ? (
            <div key={m.id} className={styles.tutorRow}>
              <TutorAvatar size={28} />
              <div>
                <Markdown className={styles.tutorText}>{m.text}</Markdown>
                {m.zapisane?.map((p) => (
                  <p key={p.id} className={styles.zapisano}>
                    {p.cofniete ? (
                      <>Cofnięto zapis: {p.tekst}.</>
                    ) : (
                      <>
                        Zapisałam w profilu: {p.tekst}. <Link to="/profil-ucznia">Zobacz profil</Link>
                        {" · "}
                        <button type="button" className={styles.cofnij} onClick={() => cofnijPriorytet(m.id, p.id)}>
                          Cofnij
                        </button>
                      </>
                    )}
                  </p>
                ))}
                {m.wsparcie && <WsparcieNota />}
                {m.pelna && (
                  <p className={styles.zapisano}>
                    Lista priorytetów jest pełna. <Link to="/profil-ucznia">Usuń któryś w profilu</Link>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p key={m.id} className={styles.studentText}>
              {m.text}
            </p>
          ),
        )}
        {state === "thinking" && (
          <div className={styles.tutorRow}>
            <TutorAvatar size={28} state="thinking" />
            <span className={styles.typing} aria-label="Pestka pisze">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>
      )}

      <div className={styles.composer}>
        {/* Bez AI Pestka jest obok (przewodnik, dymki), ale rozmawiać nie może: zamiast podpowiedzi pytań link do profilu. */}
        {aiGotowe === false ? (
          <p className="small muted">
            Rozmowa z Pestką potrzebuje AI na koncie. <Link to="/profil#ai" className="link">Podepnij AI w profilu</Link>
          </p>
        ) : (
        <div className={styles.suggestions}>
          {suggestions.map((s) => (
            <button key={s} type="button" className={styles.chip} onClick={() => send(s)} disabled={state !== "idle"}>
              {s}
            </button>
          ))}
        </div>
        )}
        <form className={styles.form} onSubmit={submit}>
          <label htmlFor="tutor-input" className="visually-hidden">
            Wiadomość do Pestki
          </label>
          <input
            id="tutor-input"
            className="input"
            placeholder="Odpowiedz własnymi słowami…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={!draft.trim() || state !== "idle"} aria-label="Wyślij">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
