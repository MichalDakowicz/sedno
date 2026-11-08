import { useEffect, useRef, useState, type FormEvent } from "react";
import { TutorAvatar } from "./TutorAvatar";
import { Markdown } from "./Markdown";
import { useTutor } from "./TutorContext";
import styles from "./TutorChat.module.css";

const kiedy = (iso: string) => {
  const dni = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return dni <= 0 ? "dziś" : dni === 1 ? "wczoraj" : `${dni} dni temu`;
};

export function TutorChat() {
  const { messages, state, send, suggestions, rozmowy, biezacaRozmowa, nowaRozmowa, otworzRozmowe } = useTutor();
  const [draft, setDraft] = useState("");
  const [lista, setLista] = useState(false);
  const wczesniejsze = rozmowy.filter((r) => r.id !== biezacaRozmowa);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, state]);

  function submit(e: FormEvent) {
    e.preventDefault();
    send(draft);
    setDraft("");
  }

  return (
    <div className={styles.chat}>
      <div className={styles.rozmowyPasek}>
        <button type="button" className={styles.rozmowyPrzycisk} onClick={() => setLista((l) => !l)} disabled={!wczesniejsze.length} aria-expanded={lista}>
          {lista ? "Wróć do rozmowy" : `Wcześniejsze rozmowy${wczesniejsze.length ? ` (${wczesniejsze.length})` : ""}`}
        </button>
        {messages.some((m) => m.from === "student") && (
          <button
            type="button"
            className={styles.rozmowyPrzycisk}
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
              <Markdown className={styles.tutorText}>{m.text}</Markdown>
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
        <div className={styles.suggestions}>
          {suggestions.map((s) => (
            <button key={s} type="button" className={styles.chip} onClick={() => send(s)} disabled={state === "thinking"}>
              {s}
            </button>
          ))}
        </div>
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
          <button type="submit" className="btn btn-primary" disabled={!draft.trim() || state === "thinking"} aria-label="Wyślij">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
