// Karta omawiania jednego błędu. Pestka „wypluwa” ją pod zadaniem z błędem: zaczyna od pytania
// naprowadzającego, prowadzi rozmowę i na prośbę daje zadanie podobne, żeby sprawdzić, czy uczeń
// zrozumiał. Karta leży w treści strony, więc nie zasłania zadania ani na komputerze, ani na telefonie.
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Lightbulb, LoaderCircle, X } from "lucide-react";
import { aiErrorText, AiError, streamAi, type AiMessage } from "../ai";
import { bezEmoji } from "../pestka";
import { poziomAI, promptOmowienia, zrobPrzyklad, type DoOmowienia, type Przyklad } from "../arkusze/omowienie";
import type { Postep } from "../arkusze/postep";
import type { Arkusz } from "../arkusze/typy";
import { Markdown } from "./Markdown";
import { TutorAvatar } from "./TutorAvatar";
import chat from "./TutorChat.module.css";
import styles from "./OmowienieBledow.module.css";

export type Wiadomosc = { od: "tutor" | "uczen"; tekst: string };
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
  onZapiszRozmowe,
  onZamknij,
  wlot,
}: {
  arkusz: Arkusz;
  postep: Postep;
  d: DoOmowienia;
  numer: number;
  wszystkich: number;
  onDalej: () => void;
  onWynikPrzykladu: (zadanie: number, wynik: "dobrze" | "zle") => void;
  onZapiszRozmowe: (zadanie: number, rozmowa: Wiadomosc[]) => void;
  onZamknij: () => void;
  /** Miejsce Pestki przed rozklejeniem: stąd jej kopia wlatuje w avatar karty. */
  wlot?: DOMRect | null;
}) {
  // Wcześniejsza rozmowa o tym zadaniu wraca z postępu arkusza (synchronizowanego z kontem).
  const zapisana = postep.rozmowyOmowien?.[d.zadanie.nr];
  const [rozmowa, setRozmowa] = useState<Wiadomosc[]>(zapisana ?? []);
  const [mysli, setMysli] = useState(false);
  const [przyklad, setPrzyklad] = useState<StanPrzykladu | null>(null);
  const [szkic, setSzkic] = useState("");
  const listaRef = useRef<HTMLDivElement>(null);
  const nr = d.zadanie.nr;
  const ostatni = numer === wszystkich;

  const kartaRef = useRef<HTMLElement>(null);
  const avatarRef = useRef<HTMLSpanElement>(null);

  // Rozklejenie: kopia Pestki leci z miejsca, gdzie siedziała, do avatara karty, na starcie
  // rozciąga się jak odrywana kropla. Cel czytamy co klatkę, bo karta w tym czasie się przewija.
  useLayoutEffect(() => {
    const cel = avatarRef.current;
    if (!wlot || !cel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const klon = cel.cloneNode(true) as HTMLElement;
    Object.assign(klon.style, { position: "fixed", left: "0", top: "0", margin: "0", zIndex: "60", pointerEvents: "none", transformOrigin: "0 0" });
    document.body.appendChild(klon);
    cel.style.opacity = "0";
    const t0 = performance.now();
    const CZAS = 720;
    let klatka = 0;
    const krok = (t: number) => {
      const p = Math.min(1, (t - t0) / CZAS);
      const e = 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2; // wyjście z lekkim przestrzeleniem
      const r = cel.getBoundingClientRect();
      const s = wlot.width / r.width + (1 - wlot.width / r.width) * Math.min(1, p * 1.4);
      const ciag = Math.sin(Math.PI * Math.min(1, p * 2.5));
      klon.style.transform = `translate(${wlot.left + (r.left - wlot.left) * e}px, ${wlot.top + (r.top - wlot.top) * e}px) scale(${s * (1 + 0.22 * ciag)}, ${s * (1 - 0.14 * ciag)})`;
      if (p < 1) klatka = requestAnimationFrame(krok);
      else {
        klon.remove();
        cel.style.opacity = "";
      }
    };
    klatka = requestAnimationFrame(krok);
    return () => {
      cancelAnimationFrame(klatka);
      klon.remove();
      cel.style.opacity = "";
    };
  }, []);

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

  // Zapis do postępu, gdy Pestka skończy odpowiadać (nie przy każdym kawałku strumienia).
  useEffect(() => {
    if (!mysli && rozmowa.length && rozmowa !== zapisana) onZapiszRozmowe(nr, rozmowa);
  }, [mysli, rozmowa]);

  // Nowe zadanie zaczyna Pestka; do omówionego wcześniej wracamy w miejscu, gdzie rozmowa się skończyła.
  useEffect(() => {
    if (!zapisana?.length) void zapytaj([]);
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
        <span ref={avatarRef} className={styles.avatarMiejsce}>
          <TutorAvatar size={40} state={mysli || przyklad?.stan === "laduje" ? "thinking" : "idle"} className={styles.avatar} />
        </span>
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

        {/* Przygotowanie przykładu trwa kilka sekund (model układa zadanie i je sprawdza), więc widać, że coś się dzieje. */}
        {przyklad?.stan === "laduje" && (
          <div className={styles.laduje} role="status">
            <span className={chat.typing} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>Przygotowuję zadanie podobne i sprawdzam, czy ma jedną dobrą odpowiedź…</span>
          </div>
        )}
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
            {przyklad?.stan === "laduje" ? (
              <>
                <LoaderCircle size={16} aria-hidden="true" className={styles.kolko} /> Przygotowuję…
              </>
            ) : (
              <>
                <Lightbulb size={16} aria-hidden="true" /> {przyklad ? "Inny przykład" : "Daj przykład"}
              </>
            )}
          </button>
        )}
        <button type="button" className="btn btn-primary btn-sm" onClick={ostatni ? onZamknij : onDalej}>
          {ostatni ? "Zakończ" : "Następny błąd"} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
