import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUp, PanelLeft, Search, SquarePen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useProfil } from "../auth";
import { PRZEDMIOTY, type PrzedmiotId } from "../konto/przedmioty";
import { ZapiszWMapie } from "./ZapiszWMapie";
import { TutorAvatar } from "./TutorAvatar";
import { OdpowiedzPestki } from "./OdpowiedzPestki";
import { useTutor } from "./TutorContext";
import styles from "./TutorChat.module.css";
import { MAPA_WIEDZY_WLACZONA } from "../nauka/wiedza";
import { OTWORZ_SZUKAJ } from "./Wyszukiwanie";

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

/**
 * Przedmiot z adresu: segment ścieżki (/przedmiot/polski), wartość parametru (?przedmiot=polski) albo początek
 * id arkusza (/arkusze/polski-podstawowy-2024-…). Samo wystąpienie napisu w adresie nie wystarcza.
 */
export function przedmiotZAdresu(pathname: string, search: string): PrzedmiotId | undefined {
  const czesci = [...pathname.split("/"), ...new URLSearchParams(search).values()];
  return PRZEDMIOTY.find((p) => czesci.some((c) => c === p.id || c.startsWith(`${p.id}-`)))?.id;
}

// Przedmiot notatki z rozmowy: ten, przy którym uczeń jest (adres strony), inaczej pierwszy z profilu.
function usePrzedmiotRozmowy(): PrzedmiotId | null {
  const { pathname, search } = useLocation();
  const profil = useProfil();
  return przedmiotZAdresu(pathname, search) ?? profil?.subjects?.[0]?.id ?? null;
}

const WASKI = "(max-width: 1023.98px)";
const KLUCZ_PANELU = "sedno.czat.panel-zwiniety";

/** Poniżej 1024 px panel rozmów jest szufladą nad wątkiem, od 1024 px stałą kolumną. */
function useWaski() {
  const [waski, ustaw] = useState(() => window.matchMedia(WASKI).matches);
  useEffect(() => {
    const m = window.matchMedia(WASKI);
    const zmiana = () => ustaw(m.matches);
    zmiana();
    m.addEventListener("change", zmiana);
    return () => m.removeEventListener("change", zmiana);
  }, []);
  return waski;
}

function zwiniety(): boolean {
  try {
    return localStorage.getItem(KLUCZ_PANELU) === "1";
  } catch {
    return false;
  }
}

export function TutorChat({ pelny = false, poWyslaniu, zamknijPelny }: {
  pelny?: boolean;
  poWyslaniu?: () => void;
  zamknijPelny?: () => void;
}) {
  const {
    messages, state, send, wykonajAkcje, ponow, cofnijPriorytet, suggestions, rozmowy, biezacaRozmowa,
    nowaRozmowa, otworzRozmowe, aiGotowe, tematRozmowy, szkicWiadomosci, ustawSzkicWiadomosci,
  } = useTutor();
  const przedmiotNotatki = usePrzedmiotRozmowy();
  const [lista, setLista] = useState(false);
  const waski = useWaski();
  const [zwinieta, ustawZwinieta] = useState(zwiniety);
  const panelOtwarty = waski ? lista : !zwinieta;
  const panelRef = useRef<HTMLElement>(null);
  const listaId = useId();
  const poleId = useId();
  const widoczneRozmowy = pelny ? rozmowy : rozmowy.filter((r) => r.id !== biezacaRozmowa);
  const jestPytanie = messages.some((m) => m.from === "student");
  // Odpowiedź wpada do rozmowy, w której padło pytanie, więc w trakcie niej nie przełączamy rozmów.
  const zajeta = state !== "idle";
  const powod = zajeta ? "Pestka jeszcze odpowiada" : undefined;
  const listRef = useRef<HTMLDivElement>(null);
  const naglowekRef = useRef<HTMLHeadingElement>(null);
  const historiaRef = useRef<HTMLButtonElement>(null);
  const sledziKoniec = useRef(true);

  useEffect(() => {
    if (pelny) naglowekRef.current?.focus({ preventScroll: true });
  }, [pelny]);

  // Szuflada na wąskim ekranie: fokus wchodzi do panelu, a po zamknięciu wraca na przycisk historii (zamknijHistorie).
  const bylaOtwarta = useRef(false);
  useEffect(() => {
    if (pelny && waski && lista) panelRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus({ preventScroll: true });
    // Po zamknięciu szuflady, już bez inert na wątku, fokus wraca na przycisk historii.
    else if (pelny && waski && bylaOtwarta.current) historiaRef.current?.focus({ preventScroll: true });
    bylaOtwarta.current = lista;
  }, [pelny, waski, lista]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el?.clientHeight && sledziKoniec.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, state, lista]);

  function rozpocznijOdpowiedz() {
    sledziKoniec.current = true;
    poWyslaniu?.();
  }

  function zamknijHistorie() {
    setLista(false);
  }

  function przelaczPanel() {
    if (waski) {
      if (lista) zamknijHistorie();
      else setLista(true);
      return;
    }
    ustawZwinieta((z) => {
      try {
        localStorage.setItem(KLUCZ_PANELU, z ? "0" : "1");
      } catch {
        // zwinięcie zostaje do końca wizyty
      }
      return !z;
    });
  }

  function zacznijNowa() {
    sledziKoniec.current = true;
    nowaRozmowa();
    zamknijHistorie();
  }

  function wyslij(tekst: string) {
    if (!tekst.trim() || zajeta || aiGotowe === false) return;
    rozpocznijOdpowiedz();
    send(tekst, przedmiotNotatki ?? undefined);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (zajeta || aiGotowe === false || !szkicWiadomosci.trim()) return;
    wyslij(szkicWiadomosci);
    ustawSzkicWiadomosci("");
  }

  const historia = (
    <ul className={styles.rozmowyLista}>
      {widoczneRozmowy.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            disabled={zajeta}
            title={powod}
            aria-current={r.id === biezacaRozmowa ? "true" : undefined}
            onClick={() => {
              sledziKoniec.current = true;
              otworzRozmowe(r.id);
              zamknijHistorie();
            }}
          >
            <span>{r.tytul}</span>
            <span className="small muted">{kiedy(r.kiedy)}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  const nowa = (
    <button type="button" className={styles.nowaRozmowa} onClick={zacznijNowa} disabled={zajeta} title={powod}>
      <SquarePen size={18} aria-hidden="true" />
      <span>Nowa rozmowa</span>
    </button>
  );
  // Gdy szuflada jest otwarta, wątek pod nią nie przyjmuje fokusu.
  const blokada = waski && lista ? { inert: "" } : {};
  const puste = pelny && !jestPytanie && !tematRozmowy;
  const niedostepna = puste && aiGotowe === false;
  const powitanie = puste && aiGotowe !== false;
  const podpowiedzi = !!suggestions.length && (
    <div className={styles.suggestions}>
      {suggestions.map((s) => (
        <button key={s} type="button" className={styles.chip} onClick={() => wyslij(s)} disabled={zajeta}>
          {s}
        </button>
      ))}
    </div>
  );

  return (
    <div className={styles.chat} data-pelny={pelny || undefined} data-historia={lista || undefined} data-zwinieta={zwinieta || undefined}>
      {pelny ? (
        <>
          <aside
            ref={panelRef}
            className={styles.historiaPanel}
            id={listaId}
            aria-label="Historia rozmów"
            onKeyDown={(e) => { if (waski && lista && e.key === "Escape") zamknijHistorie(); }}
          >
            <div className={styles.panelGora}>
              <button type="button" className={styles.wroc} onClick={zamknijPelny} title="Wróć do Sedno">
                <ArrowLeft size={18} aria-hidden="true" />
                <span>Wróć</span>
              </button>
              <button type="button" className={styles.ikona} onClick={przelaczPanel} aria-label={panelOtwarty ? "Zwiń historię rozmów" : "Pokaż historię rozmów"} aria-controls={listaId} aria-expanded={panelOtwarty}>
                <PanelLeft size={20} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.panelNowa}>{nowa}</div>
            <h2 className={styles.historiaTytul}>Rozmowy</h2>
            {widoczneRozmowy.length ? historia : <p className={styles.historiaPusta}>Tu pojawią się twoje zapisane rozmowy.</p>}
          </aside>
          <div className={styles.zaslona} onClick={zamknijHistorie} aria-hidden="true" />
          <header className={styles.pelnyNaglowek} {...blokada}>
            <button
              ref={historiaRef}
              type="button"
              className={`${styles.ikona} ${styles.wPasku}`}
              aria-label="Historia rozmów"
              aria-controls={listaId}
              aria-expanded={panelOtwarty}
              onClick={przelaczPanel}
            >
              <PanelLeft size={20} aria-hidden="true" />
            </button>
            <button type="button" className={`${styles.ikona} ${styles.wPasku}`} onClick={zamknijPelny} aria-label="Wróć do Sedno" title="Wróć do Sedno">
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <TutorAvatar size={32} state={state} />
            <div className={styles.pelnyTytul}>
              <h1 ref={naglowekRef} tabIndex={-1}>Pestka</h1>
              {tematRozmowy && <p>{tematRozmowy}</p>}
            </div>
            <button
              type="button"
              className={styles.ikona}
              onClick={() => window.dispatchEvent(new Event(OTWORZ_SZUKAJ))}
              aria-label="Szukaj"
              aria-keyshortcuts="Control+K Meta+K"
              title="Szukaj (Ctrl+K)"
            >
              <Search size={20} aria-hidden="true" />
            </button>
            <button type="button" className={`${styles.ikona} ${styles.wPasku}`} onClick={zacznijNowa} disabled={zajeta} title={powod ?? "Nowa rozmowa"} aria-label="Nowa rozmowa">
              <SquarePen size={20} aria-hidden="true" />
            </button>
          </header>
        </>
      ) : (
        <div className={styles.rozmowyPasek}>
          <button ref={historiaRef} type="button" className={styles.rozmowyPrzycisk} onClick={() => setLista((l) => !l)} disabled={lista ? false : !widoczneRozmowy.length || zajeta} title={lista ? undefined : powod} aria-expanded={lista}>
            {lista ? "Wróć do rozmowy" : `Wcześniejsze rozmowy${widoczneRozmowy.length ? ` (${widoczneRozmowy.length})` : ""}`}
          </button>
          {jestPytanie && (
            <button
              type="button"
              className={styles.rozmowyPrzycisk}
              disabled={zajeta}
              title={powod}
              onClick={zacznijNowa}
            >
              Nowa rozmowa
            </button>
          )}
        </div>
      )}
      {!pelny && lista ? historia : (
        <div
          className={styles.list}
          ref={listRef}
          aria-label="Wiadomości"
          role="log"
          tabIndex={pelny ? 0 : undefined}
          {...blokada}
          onScroll={(e) => {
            const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
            sledziKoniec.current = scrollHeight - scrollTop - clientHeight <= 64;
          }}
        >
          <div className={styles.wiadomosci}>
            {niedostepna ? (
              <div className={styles.powitanie}>
                <TutorAvatar size={96} state="zmartwienie" />
                <h2 className={styles.powitanieTytul}>Pestka jest chwilowo niedostępna</h2>
                <p className="lead">Spróbuj za chwilę.</p>
              </div>
            ) : powitanie ? (
              <div className={styles.powitanie}>
                <TutorAvatar size={96} />
                <h2 className={styles.powitanieTytul}>W czym mogę pomóc?</h2>
                <p className="lead">Zadaj pytanie, wklej zadanie albo pokaż swoją próbę.</p>
                {podpowiedzi}
              </div>
            ) : messages.map((m, i) =>
              m.from === "tutor" ? (
                <div key={m.id} className={styles.tutorRow}>
                  <TutorAvatar size={pelny ? 32 : 28} />
                  <div>
                    <OdpowiedzPestki tekst={m.text} dane={m.pestka} zajeta={zajeta}
                      wykonaj={(akcja) => {
                        rozpocznijOdpowiedz();
                        wykonajAkcje(akcja, m.id, przedmiotNotatki ?? undefined);
                      }} />
                    {m.zapisane?.map((p) => (
                      <p key={p.id} className={styles.zapisano}>
                        {p.cofniete ? (
                          <>Cofnięto zapis: {p.tekst}.</>
                        ) : (
                          <>
                            Dodałam do <Link to="/profil-ucznia">twoich priorytetów</Link>: {p.tekst}.{" "}
                            <button type="button" className={styles.cofnij} onClick={() => cofnijPriorytet(m.id, p.id)}>
                              Cofnij
                            </button>
                          </>
                        )}
                      </p>
                    ))}
                    {m.blad && i === messages.length - 1 && state === "idle" && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                        rozpocznijOdpowiedz();
                        ponow();
                      }}>
                        Spróbuj ponownie
                      </button>
                    )}
                    {m.wsparcie && <WsparcieNota />}
                    {/* Notatka tylko z odpowiedzi na pytanie ucznia, skończonej (nie z powitania ani w trakcie pisania). */}
                    {MAPA_WIEDZY_WLACZONA && przedmiotNotatki && aiGotowe !== false && i > 0 && m.text.length > 60 && !(i === messages.length - 1 && state !== "idle") && (
                      <ZapiszWMapie kompakt przedmiot={przedmiotNotatki} tekst={m.text} zrodlo={{ source: "chat", source_ref: biezacaRozmowa }} />
                    )}
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
                <TutorAvatar size={pelny ? 32 : 28} state="thinking" />
                <span className={styles.pisze} role="status" aria-label="Pestka pisze">
                  <i />
                  <i />
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.composer} {...blokada}>
        {aiGotowe === false ? (
          !niedostepna && (
            <p className="small muted">
              Pestka jest chwilowo niedostępna. Spróbuj za chwilę.
            </p>
          )
        ) : !pelny && podpowiedzi}
        <form className={styles.form} onSubmit={submit}>
          <label htmlFor={poleId} className="visually-hidden">
            Wiadomość do Pestki
          </label>
          {pelny ? (
            <textarea
              id={poleId}
              className={`input ${styles.pole}`}
              placeholder="Napisz do Pestki…"
              value={szkicWiadomosci}
              onChange={(e) => ustawSzkicWiadomosci(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }}
              disabled={aiGotowe === false}
              rows={2}
            />
          ) : (
            <input
              id={poleId}
              className="input"
              placeholder="Napisz do Pestki…"
              value={szkicWiadomosci}
              onChange={(e) => ustawSzkicWiadomosci(e.target.value)}
              disabled={aiGotowe === false}
              autoComplete="off"
            />
          )}
          <button type="submit" className="btn btn-primary" disabled={!szkicWiadomosci.trim() || zajeta || aiGotowe === false} aria-label="Wyślij">
            <ArrowUp size={20} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
