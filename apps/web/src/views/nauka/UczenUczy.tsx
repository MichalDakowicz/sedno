import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Check, ChevronRight, Circle, CircleHelp, RefreshCw, Send, X } from "lucide-react";
import { TutorAvatar } from "../../components/TutorAvatar";
import c from "../../components/TutorChat.module.css";
import { AiError, aiErrorText, useAiReady } from "../../ai";
import { supabase } from "../../supabase";
import styles from "./UczenUczy.module.css";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { SubjectIcon } from "../../components/icons";
import { klasaPrzedmiotu, PasekPrzedmiotow } from "../../components/PasekPrzedmiotow";
import { currentUserId, useProfil } from "../../auth";
import { opisPamieci, useSkrotUcznia } from "../../konto/pamiecUcznia";
import { opisArkuszyKonta } from "../../konto/wyniki";
import { przedmiot, type PrzedmiotId } from "../../konto/przedmioty";

// pelny: temat wygenerowany przez Pestkę. Runda odsyła go w całości, a serwer sprawdza go jeszcze raz.
type Pelny = { przedmiot: PrzedmiotId; jezyk: "pl" | "en"; tytul: string; polecenie: string; przyklad: string; "reguła": string; kryteria: { blad: string; regula: string; przyklad: string } };
type Scenariusz = { id: string; przedmiot: PrzedmiotId; jezyk: "pl" | "en"; tytul: string; polecenie: string; przyklad: string; podpowiedz: string; kryteria: string[]; pelny?: Pelny };
type Status = "dobrze" | "do-poprawy" | "do-zrobienia" | "niepewne";
type Ocena = { kolega: string; statusy: Record<string, Status>; zakoncz: boolean; omowienie: string | null };
type Tura = { odpowiedz: string; ocena: Ocena };
type Zadanie =
  | { action: "uczen-uczy-scenariusze" }
  | { action: "uczen-uczy-tematy-ai"; przedmiot: PrzedmiotId; poziom?: string; kontekst?: string; wczesniej: string[] }
  | { action: "uczen-uczy"; scenariusz: string | Pelny; wypowiedzi: string[] };

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

// Ten sam klucz co w Nauce: temat otwiera się dla przedmiotu, który uczeń ma tam wybrany.
const KLUCZ_PRZEDMIOTU = "sedno.nauka.przedmiot";
function zapamietanyPrzedmiot(): string | null {
  try { return localStorage.getItem(KLUCZ_PRZEDMIOTU); } catch { return null; }
}

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
  if (blad.code === "no_provider") return "Pestka jest chwilowo niedostępna. Spróbuj za chwilę.";
  if (blad.code === "bad_model_response") return "Ocena Sędziego nie dotarła w poprawnej formie. Spróbuj ponownie.";
  return aiErrorText(blad.code);
}

// Tematy od Pestki leżą w pamięci przeglądarki na dany dzień i przedmiot, więc nie powstają przy każdym wejściu.
const KLUCZ_TEMATOW = "sedno.uczenUczy.tematy";
const dzienWarszawa = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" });

function zapamietaneTematy(user: string, klucz: string): Pelny[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(KLUCZ_TEMATOW) ?? "null") as { kto?: string; wpisy?: Record<string, Pelny[]> } | null;
    const t = v?.kto === user ? v.wpisy?.[klucz] : null;
    return Array.isArray(t) && t.length ? t : null;
  } catch { return null; }
}

function zapiszTematy(user: string, klucz: string, tematy: Pelny[]) {
  try {
    // Zostają tylko wpisy z dzisiaj.
    const dzien = klucz.slice(0, 10);
    const v = JSON.parse(localStorage.getItem(KLUCZ_TEMATOW) ?? "null") as { kto?: string; wpisy?: Record<string, Pelny[]> } | null;
    const stare = v?.kto === user ? Object.entries(v.wpisy ?? {}).filter(([k]) => k.startsWith(dzien)) : [];
    localStorage.setItem(KLUCZ_TEMATOW, JSON.stringify({ kto: user, wpisy: { ...Object.fromEntries(stare), [klucz]: tematy } }));
  } catch { /* tematy działają do odświeżenia strony */ }
}

const doScenariusza = (p: Pelny, i: number): Scenariusz => ({
  id: "ai:" + i + ":" + p.tytul, przedmiot: p.przedmiot, jezyk: p.jezyk, tytul: p.tytul, polecenie: p.polecenie, przyklad: p.przyklad,
  podpowiedz: "", kryteria: Object.keys(p.kryteria), pelny: p,
});

// Tematy układa Pestka: bez danych ucznia też (wtedy wybiera najczęstsze błędy maturalne). Dopóki trwa generowanie, stan to „laduje”.
// Po błędzie hook próbuje jeszcze raz; gdy nic nie przyjdzie albo AI nie jest skonfigurowane, stan to „zapas” i ekran pokazuje stałe tematy.
type StanTematow = "laduje" | "gotowe" | "zapas";

function useTematyAi(przedmiotId: PrzedmiotId | undefined, poziom: string | undefined) {
  const user = currentUserId();
  const aiGotowe = useAiReady(user);
  // Fakty o uczniu liczą się chwilę po wejściu: czekamy na nie krótko, a bez nich (nowe konto, brak sieci) i tak generujemy.
  const skrot = useSkrotUcznia();
  const [bezCzekania, ustawBezCzekania] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => ustawBezCzekania(true), 4000);
    return () => clearTimeout(t);
  }, []);
  const [wynik, ustawWynik] = useState<{ klucz: string; tematy: Pelny[]; stan: StanTematow }>({ klucz: "", tematy: [], stan: "laduje" });
  const [odswiez, ustawOdswiez] = useState(0);
  const klucz = przedmiotId ? dzienWarszawa.format(new Date()) + ":" + przedmiotId : "";
  const kontekst = [opisPamieci(), opisArkuszyKonta() && "Arkusze ucznia:\n" + opisArkuszyKonta()].filter(Boolean).join("\n").slice(0, 2400);
  const niedostepne = aiGotowe === false;
  const czeka = !user || !przedmiotId || aiGotowe === undefined || (skrot === null && !bezCzekania);

  useEffect(() => {
    if (!user || !przedmiotId) return;
    if (niedostepne) {
      ustawWynik({ klucz, tematy: [], stan: "zapas" });
      return;
    }
    if (czeka) return;
    const zapis = odswiez === 0 ? zapamietaneTematy(user, klucz) : null;
    if (zapis) {
      ustawWynik({ klucz, tematy: zapis, stan: "gotowe" });
      return;
    }
    const controller = new AbortController();
    const poprzednie = zapamietaneTematy(user, klucz) ?? [];
    ustawWynik((w) => ({ klucz, tematy: w.klucz === klucz ? w.tematy : [], stan: "laduje" }));
    const wczesniej = odswiez === 0 ? [] : poprzednie.map((t) => t.tytul).slice(0, 12);
    const pytanie = () => wywolaj<{ scenariusze: Pelny[] }>({
      action: "uczen-uczy-tematy-ai", przedmiot: przedmiotId, poziom, wczesniej, ...(kontekst ? { kontekst } : {}),
    }, controller.signal).then((w) => {
      if (!Array.isArray(w.scenariusze) || !w.scenariusze.length) throw new AiError("bad_model_response", 424);
      return w.scenariusze;
    });
    void (async () => {
      for (let proba = 0; proba < 2; proba++) {
        try {
          const tematy = await pytanie();
          if (controller.signal.aborted) return;
          zapiszTematy(user, klucz, tematy);
          ustawWynik({ klucz, tematy, stan: "gotowe" });
          return;
        } catch {
          if (controller.signal.aborted) return;
        }
      }
      // Bez komunikatu o błędzie: ekran pokazuje stałe tematy i „Spróbuj jeszcze raz”.
      ustawWynik({ klucz, tematy: [], stan: "zapas" });
    })();
    return () => controller.abort();
    // kontekst celowo nie odświeża tematów w ciągu dnia: liczy się wpis z pamięci albo „Nowe tematy”
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, klucz, odswiez, poziom, czeka, niedostepne]);

  const aktualne = wynik.klucz === klucz ? wynik : { tematy: [] as Pelny[], stan: "laduje" as StanTematow };
  return { tematy: aktualne.tematy, stan: aktualne.stan, odswiez: () => ustawOdswiez((n) => n + 1) };
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
        scenariusz: scenariusz.pelny ?? scenariusz.id,
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
            <li className={c.tutorRow}>
              <span className={styles.awatarKolegi} aria-hidden="true">K</span>
              <p className={c.tutorText} lang={scenariusz.jezyk}><span className="visually-hidden">Kolega: </span>{scenariusz.przyklad}</p>
            </li>
            {tury.map(({ odpowiedz, ocena: wynik }, i) => (
              <Fragment key={i}>
                <li className={c.studentText}><span className="visually-hidden">Ty: </span>{odpowiedz}</li>
                <li className={c.tutorRow}>
                  <span className={styles.awatarKolegi} aria-hidden="true">K</span>
                  <p className={c.tutorText}><span className="visually-hidden">Kolega: </span>{wynik.kolega}</p>
                </li>
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
              <label htmlFor="uczen-odpowiedz">Co powiesz Koledze?</label>
              <textarea
                id="uczen-odpowiedz"
                placeholder={scenariusz.podpowiedz}
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
                {czeka && <p role="status" className="small muted">Pestka sprawdza odpowiedź…</p>}
              </div>
            </form>
          )}
        </section>
        <aside className={`obok-karty ${styles.sedzia}`} aria-labelledby="uczen-sedzia">
          <h3 className={`h3 ${styles.pestkaPatrzy}`} id="uczen-sedzia">
            <TutorAvatar size={32} state={czeka ? "thinking" : "idle"} />
            Pestka patrzy
          </h3>
          <ul className={styles.kryteria} aria-live="polite">
            {scenariusz.kryteria.map((id) => {
              const status = ocena?.statusy[id] ?? "do-zrobienia";
              return (
                <li key={id}>
                  <span>{KRYTERIA[id] ?? id}</span>
                  <span className={styles.znak} data-status={status} title={STATUS[status]}>
                    {status === "dobrze" ? <Check size={18} aria-hidden="true" /> : status === "do-poprawy" ? <X size={18} aria-hidden="true" />
                      : status === "niepewne" ? <CircleHelp size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
                    <span className="visually-hidden">{STATUS[status]}</span>
                  </span>
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
  const [params, ustawParams] = useSearchParams();
  const profil = useProfil();

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

  // Przedmioty ucznia, które mają tematy. Bez dopasowania (np. biologia) pokazujemy wszystkie, żeby nie było pusto.
  const zTematami = [...new Set((scenariusze ?? []).map((s) => s.przedmiot))];
  const moje = [...new Set((profil?.subjects ?? []).map((p) => p.id))].filter((id) => zTematami.includes(id));
  const dostepne = moje.length ? moje : zTematami;
  const wybrany = [params.get("przedmiot"), zapamietanyPrzedmiot(), dostepne[0]].find((id): id is PrzedmiotId => !!id && dostepne.includes(id as PrzedmiotId)) ?? dostepne[0];
  const tematy = (scenariusze ?? []).filter((s) => s.przedmiot === wybrany);
  const poziomPrzedmiotu = profil?.subjects.find((p) => p.id === wybrany)?.poziom;
  const ai = useTematyAi(scenariusze ? wybrany : undefined, poziomPrzedmiotu);
  const podpowiedz = tematy[0]?.podpowiedz ?? "";
  const odPestki = ai.tematy.map((p, i) => ({ ...doScenariusza(p, i), podpowiedz }));
  // Stałe tematy są tylko zapasem, gdy Pestka nie dała tematów.
  const widoczne = ai.stan === "zapas" ? tematy : odPestki;
  const laduje = ai.stan === "laduje";

  function ustawPrzedmiot(id: PrzedmiotId) {
    try { localStorage.setItem(KLUCZ_PRZEDMIOTU, id); } catch { /* wybór działa do odświeżenia */ }
    ustawParams({ przedmiot: id }, { replace: true });
  }

  function wroc() {
    ustawScenariusz(null);
    requestAnimationFrame(() => lista.current?.focus());
  }

  return (
    <main className={`container ${styles.strona}`}>
      <NaglowekStrony wstecz={{ do: "/nauka", nazwa: "Nauka" }} tytul="Naucz Kolegę" lead="Kolega się pomylił. Znajdź błąd i wytłumacz mu, jak jest naprawdę." />
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
            <>
              {dostepne.length > 1 && (
                <PasekPrzedmiotow etykieta="Przedmiot" zalezy={wybrany}>
                  {dostepne.map((id) => {
                    const p = przedmiot(id)!;
                    return (
                      <button key={id} type="button" className={klasaPrzedmiotu(id === wybrany)} data-aktywny={id === wybrany} aria-pressed={id === wybrany} onClick={() => ustawPrzedmiot(id)}>
                        <SubjectIcon subject={p} size="sm" /> {p.nazwa}
                      </button>
                    );
                  })}
                </PasekPrzedmiotow>
              )}
              {laduje && !odPestki.length ? (
                <>
                  <p role="status" className="muted">Pestka dobiera tematy pod ciebie…</p>
                  <ul className={styles.tematy} aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <li key={i}><span className={styles.szkielet} /></li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <ul className={styles.tematy} aria-busy={laduje}>
                    {widoczne.map((s) => (
                      <li key={s.id}>
                        <button type="button" onClick={() => ustawScenariusz(s)}>
                          {s.tytul}<ChevronRight size={18} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.akcje}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={ai.odswiez} disabled={laduje}>
                      <RefreshCw size={15} aria-hidden="true" /> {ai.stan === "zapas" ? "Spróbuj jeszcze raz" : "Nowe tematy"}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : <p className="muted">Brak dostępnych tematów.</p>}
        </section>
      )}
    </main>
  );
}
