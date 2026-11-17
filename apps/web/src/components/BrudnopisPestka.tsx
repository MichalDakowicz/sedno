import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { AiError, aiErrorText } from "../ai";
import { useSession } from "../auth";
import { omowTablice, wstawRysunekPestki } from "./brudnopisPestkaApi";
import { TekstMat } from "./TekstMat";
import { TutorAvatar } from "./TutorAvatar";
import styles from "./Brudnopis.module.css";

type Props = {
  id: string;
  api: RefObject<ExcalidrawImperativeAPI | null>;
  polecenie: string;
  onZamknij: () => void;
};
type Stan =
  | { typ: "pusty" }
  | { typ: "czyta" }
  | { typ: "blad"; kod: string }
  | { typ: "odpowiedz"; dane: Awaited<ReturnType<typeof omowTablice>> };

function komunikat(kod: string) {
  if (kod === "empty_board") return "Dodaj coś na płótnie albo wpisz pytanie.";
  if (kod === "board_loading") return "Brudnopis się wczytuje. Spróbuj za chwilę.";
  if (kod === "bad_snapshot" || kod === "bad_image" || kod === "too_large") return "Nie udało się przygotować obrazu szkicu. Spróbuj ponownie.";
  if (kod === "image_not_supported") return "Model dla ważnych zadań nie przyjmuje obrazów. Wybierz w profilu model z obsługą zdjęć.";
  if (kod === "bad_model_response") return "Pestka przesłała nieczytelną odpowiedź. Spróbuj zapytać o jeden konkretny krok.";
  return aiErrorText(kod);
}

export function BrudnopisPestka({ id, api, polecenie, onZamknij }: Props) {
  const session = useSession();
  const konto = session ? session.user.id : null;
  const tytul = useId();
  const polePytania = useRef<HTMLInputElement>(null);
  const zapytanie = useRef<AbortController | null>(null);
  const [pytanie, setPytanie] = useState("");
  const [stan, setStan] = useState<Stan>({ typ: "pusty" });
  const zajeta = stan.typ === "czyta";

  useEffect(() => {
    setPytanie("");
    setStan({ typ: "pusty" });
    polePytania.current?.focus();
    return () => {
      zapytanie.current?.abort();
      zapytanie.current = null;
    };
  }, [konto]);

  async function zapytaj(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (zapytanie.current) return;
    if (!konto || !api.current || api.current.getAppState().isLoading) {
      setStan({ typ: "blad", kod: konto ? "board_loading" : "not_signed_in" });
      return;
    }
    const c = new AbortController();
    zapytanie.current = c;
    setStan({ typ: "czyta" });
    try {
      const dane = await omowTablice(api.current, konto, polecenie, pytanie.trim(), c.signal);
      if (!c.signal.aborted) setStan({ typ: "odpowiedz", dane });
    } catch (e) {
      if (!c.signal.aborted) setStan({ typ: "blad", kod: e instanceof AiError ? e.code : "server_error" });
    } finally {
      if (zapytanie.current === c) zapytanie.current = null;
    }
  }

  return (
    <section
      id={id}
      className={styles.pestkaPanel}
      aria-labelledby={tytul}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onZamknij();
        }
      }}
    >
      <header className={styles.pestkaNaglowek}>
        <TutorAvatar size={30} state={zajeta ? "thinking" : "idle"} />
        <h3 id={tytul} className="h3">Pestka w brudnopisie</h3>
        <button type="button" className={styles.tool} aria-label="Zamknij panel Pestki" onClick={onZamknij}>
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <form className={styles.pestkaForm} onSubmit={zapytaj}>
        <label>
          <span className="small">Pytanie do Pestki (opcjonalnie)</span>
          <input ref={polePytania} value={pytanie} maxLength={500} onChange={(e) => setPytanie(e.currentTarget.value)} placeholder="Gdzie jest błąd? Narysujesz trójkąt?" />
        </label>
        <p className="small muted">Pestka otrzyma obraz obecnego szkicu.</p>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!konto || zajeta}>
          {zajeta ? "Pestka analizuje…" : "Zapytaj Pestkę"}
        </button>
      </form>
      <div aria-live="polite">
        {stan.typ === "blad" && (
          <>
            <p className="small" role="alert">{komunikat(stan.kod)}</p>
            {(stan.kod === "no_provider" || stan.kod === "bad_credential" || stan.kod === "image_not_supported" || stan.kod === "provider_failed") && (
              <Link className="small" to="/profil">Sprawdź dostawcę AI w profilu</Link>
            )}
          </>
        )}
        {stan.typ === "odpowiedz" && (
          <div className={styles.pestkaWynik}>
            {stan.dane.odczyt && <p className="small muted">Odczyt szkicu<br /><TekstMat tekst={stan.dane.odczyt} /></p>}
            <p><TekstMat tekst={stan.dane.wskazowka} /></p>
            {stan.dane.ksztalty.length > 0 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                if (!api.current) return;
                wstawRysunekPestki(api.current, stan.dane.ksztalty);
                onZamknij();
              }}>
                Dodaj rysunek obok szkicu
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
