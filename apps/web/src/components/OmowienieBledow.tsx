// Panel omawiania błędów: Pestka przechodzi z uczniem po zadaniach z błędem, jedno po drugim.
// Przewija do zadania i je podświetla, zaczyna od pytania naprowadzającego, a na prośbę daje
// zadanie podobne, żeby sprawdzić, czy uczeń zrozumiał.
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
  lista,
  onWynikPrzykladu,
  onZamknij,
}: {
  arkusz: Arkusz;
  postep: Postep;
  lista: DoOmowienia[];
  onWynikPrzykladu: (zadanie: number, wynik: "dobrze" | "zle") => void;
  onZamknij: () => void;
}) {
  const [ktory, setKtory] = useState(0);
  const [rozmowy, setRozmowy] = useState<Record<number, Wiadomosc[]>>({});
  const [mysli, setMysli] = useState(false);
  const [przyklady, setPrzyklady] = useState<Record<number, StanPrzykladu>>({});
  const [szkic, setSzkic] = useState("");
  const listaRef = useRef<HTMLDivElement>(null);
  const d = lista[ktory]!;
  const nr = d.zadanie.nr;
  const rozmowa = rozmowy[nr] ?? [];
  const przyklad = przyklady[nr];

  // Przewiń do zadania i podświetl je, póki trwa jego omawianie.
  useEffect(() => {
    const el = document.getElementById(`zadanie-${nr}`);
    el?.setAttribute("data-omawiane", "true");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    const pisz = (t: string) => setRozmowy((r) => ({ ...r, [nr]: [...historia, { od: "tutor", tekst: t }] }));
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
  }

  // Pierwsze zadanie z listy i każde kolejne zaczyna Pestka.
  useEffect(() => {
    if (!rozmowy[nr]) void zapytaj([]);
  }, [nr]);

  function wyslij(e: FormEvent) {
    e.preventDefault();
    const t = szkic.trim();
    if (!t || mysli) return;
    setSzkic("");
    void zapytaj([...rozmowa, { od: "uczen", tekst: t }]);
  }

  async function dajPrzyklad() {
    setPrzyklady((p) => ({ ...p, [nr]: { stan: "laduje" } }));
    const zadanie = await zrobPrzyklad(arkusz, d, postep).catch(() => null);
    setPrzyklady((p) => ({ ...p, [nr]: zadanie ? { stan: "gotowy", zadanie } : { stan: "brak" } }));
  }

  function wybierz(litera: string) {
    if (przyklad?.stan !== "gotowy" || przyklad.wybrana) return;
    setPrzyklady((p) => ({ ...p, [nr]: { ...przyklad, wybrana: litera } }));
    onWynikPrzykladu(nr, litera === przyklad.zadanie.poprawna ? "dobrze" : "zle");
  }

  const ostatni = ktory === lista.length - 1;

  return (
    <aside className={styles.panel} aria-label="Omawianie błędów z Pestką">
      <header className={styles.head}>
        <span className="label">
          {d.wypracowanie ? "Wypracowanie" : "Błąd"} {ktory + 1} z {lista.length} · zadanie {nr}.
        </span>
        <button type="button" className={styles.zamknij} onClick={onZamknij} aria-label="Zakończ omawianie">
          <X size={18} />
        </button>
      </header>

      <div className={`${chat.list} ${styles.lista}`} ref={listaRef} aria-live="polite">
        {rozmowa.map((m, i) =>
          m.od === "tutor" ? (
            <div key={i} className={chat.tutorRow}>
              <TutorAvatar size={28} />
              <Markdown className={chat.tutorText}>{m.tekst}</Markdown>
            </div>
          ) : (
            <p key={i} className={chat.studentText}>
              {m.tekst}
            </p>
          ),
        )}
        {mysli && !rozmowa.at(-1)?.tekst && (
          <div className={chat.tutorRow}>
            <TutorAvatar size={28} state="thinking" />
            <span className={chat.typing} aria-label="Pestka pisze">
              <i />
              <i />
              <i />
            </span>
          </div>
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
        <label htmlFor="omowienie-input" className="visually-hidden">
          Odpowiedź dla Pestki
        </label>
        <input
          id="omowienie-input"
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
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => (ostatni ? onZamknij() : setKtory(ktory + 1))}>
          {ostatni ? "Zakończ" : "Następny"} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
