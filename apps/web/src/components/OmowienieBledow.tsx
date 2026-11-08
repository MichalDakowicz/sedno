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
import { werdykt } from "../arkusze/sprawdz";
import { FragmentNagrania } from "./FragmentNagrania";
import { Markdown } from "./Markdown";
import { TutorAvatar } from "./TutorAvatar";
import chat from "./TutorChat.module.css";
import styles from "./OmowienieBledow.module.css";

export type Wiadomosc = { od: "tutor" | "uczen"; tekst: string };

// Wejście Pestki do karty odgrywa się raz: karta pokazana ponownie (np. po zmianie strony arkusza
// i powrocie) ma Pestkę już na miejscu, zamiast powtarzać lot.
const zuzyteWejscia = new Set<number>();

/** Skąd Pestka wskakuje do karty: z miejsca podziału (pierwszy błąd) albo z góry (null, kolejne błędy). */
export type Wejscie = { z: DOMRect | null; id: number };
type StanPrzykladu = { stan: "laduje" } | { stan: "brak" } | { stan: "gotowy"; zadanie: Przyklad; wybrana?: string };

// Pierwsza wiadomość ucznia nie jest pokazywana: tylko uruchamia omówienie.
const START = "Omówmy to zadanie.";

// cubic-bezier(0.45, 0, 0.25, 1), czyli krzywa ruchu Pestki w przewodniku (TutorGuide .moving).
function krzywaPrzewodnika(p: number): number {
  const [x1, y1, x2, y2] = [0.45, 0, 0.25, 1];
  const bez = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, x1, x2) < p) lo = mid;
    else hi = mid;
  }
  return bez((lo + hi) / 2, y1, y2);
}

// Klatki podskoku z TutorGuide (@keyframes hop): 12% przysiad, 50% szczyt łuku, 86% lądowanie.
const KLATKI_HOP = [
  { t: 0, y: 0, sx: 1, sy: 1 },
  { t: 0.12, y: 0, sx: 1.12, sy: 0.84 },
  { t: 0.5, y: -64, sx: 0.94, sy: 1.08 },
  { t: 0.86, y: 0, sx: 1.14, sy: 0.84 },
  { t: 1, y: 0, sx: 1, sy: 1 },
];

function skokHop(p: number): { y: number; sx: number; sy: number } {
  const q = krzywaPrzewodnika(p);
  const i = Math.max(0, KLATKI_HOP.findIndex((k) => k.t >= q) - 1);
  const a = KLATKI_HOP[i];
  const b = KLATKI_HOP[Math.min(i + 1, KLATKI_HOP.length - 1)];
  const u = b.t === a.t ? 1 : (q - a.t) / (b.t - a.t);
  const g = (1 - Math.cos(Math.PI * u)) / 2; // łagodnie między klatkami
  return { y: a.y + (b.y - a.y) * g, sx: a.sx + (b.sx - a.sx) * g, sy: a.sy + (b.sy - a.sy) * g };
}

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
  wejscie,
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
  wejscie?: Wejscie | null;
}) {
  // Wcześniejsza rozmowa o tym zadaniu wraca z postępu arkusza (synchronizowanego z kontem).
  const zapisana = postep.rozmowyOmowien?.[d.zadanie.nr];
  const [rozmowa, setRozmowa] = useState<Wiadomosc[]>(zapisana ?? []);
  const [mysli, setMysli] = useState(false);
  const [przyklad, setPrzyklad] = useState<StanPrzykladu | null>(null);
  const [szkic, setSzkic] = useState("");
  const listaRef = useRef<HTMLDivElement>(null);
  const nr = d.zadanie.nr;
  const fragmentyBledow = d.zadanie.pytania.filter((p) => p.fragment && werdykt(p, postep.odpowiedzi[p.nr]) !== "dobrze");
  const ostatni = numer === wszystkich;

  const kartaRef = useRef<HTMLElement>(null);
  const avatarRef = useRef<HTMLSpanElement>(null);

  // Wlot do karty tym samym skokiem co w przewodniku (TutorGuide: ruch 0,7 s po krzywej
  // cubic-bezier(0.45, 0, 0.25, 1) i podskok hop: przysiad, łuk, lądowanie ze spłaszczeniem),
  // bez przestrzelenia celu. Cel czytamy co klatkę, bo karta w tym czasie się przewija.
  useLayoutEffect(() => {
    const cel = avatarRef.current;
    if (!wejscie || !cel || zuzyteWejscia.has(wejscie.id) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Przy kolejnych błędach Pestka wskakuje z góry, znad miejsca, gdzie będzie siedzieć.
    const r0 = cel.getBoundingClientRect();
    const wlot = wejscie.z ?? new DOMRect(r0.left, Math.max(8, r0.top - 160), r0.width, r0.height);
    const klon = cel.cloneNode(true) as HTMLElement;
    Object.assign(klon.style, { position: "fixed", left: "0", top: "0", margin: "0", zIndex: "60", pointerEvents: "none", transformOrigin: "50% 100%" });
    document.body.appendChild(klon);
    cel.style.opacity = "0";
    const t0 = performance.now();
    const CZAS = 700;
    let klatka = 0;
    const krok = (t: number) => {
      const p = Math.min(1, (t - t0) / CZAS);
      const q = krzywaPrzewodnika(p);
      const r = cel.getBoundingClientRect();
      // Pozycja liczona od środka dołu (stąd się przysiada i tu się ląduje).
      const x = wlot.left + wlot.width / 2 + (r.left + r.width / 2 - (wlot.left + wlot.width / 2)) * q;
      const y = wlot.bottom + (r.bottom - wlot.bottom) * q + skokHop(p).y;
      const s = wlot.width / r.width + (1 - wlot.width / r.width) * q;
      const { sx, sy } = skokHop(p);
      klon.style.transform = `translate(${x - r.width / 2}px, ${y - r.height}px) scale(${s * sx}, ${s * sy})`;
      if (p < 1) klatka = requestAnimationFrame(krok);
      else {
        // Zużyty dopiero po wylądowaniu: React w trybie deweloperskim montuje efekt dwa razy.
        zuzyteWejscia.add(wejscie.id);
        klon.remove();
        cel.style.opacity = "";
      }
    };
    krok(t0);
    klatka = requestAnimationFrame(krok);
    return () => {
      cancelAnimationFrame(klatka);
      klon.remove();
      cel.style.opacity = "";
    };
  }, []);

  // Podświetl zadanie i przewiń tak, żeby karta była cała widoczna, a nad nią koniec zadania.
  // Odejście: Pestka podskakuje w górę i znika, a karta chowa się razem z nią; potem następny
  // błąd (albo koniec omawiania).
  const [odchodzi, setOdchodzi] = useState(false);
  function odejdz(potem: () => void) {
    const cel = avatarRef.current;
    const karta = kartaRef.current;
    if (odchodzi) return;
    if (!cel || !karta || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return potem();
    setOdchodzi(true);
    const r = cel.getBoundingClientRect();
    const klon = cel.cloneNode(true) as HTMLElement;
    Object.assign(klon.style, { position: "fixed", left: `${r.left}px`, top: `${r.top}px`, margin: "0", zIndex: "60", pointerEvents: "none", transformOrigin: "50% 100%" });
    document.body.appendChild(klon);
    cel.style.opacity = "0";
    klon.animate(
      [
        { transform: "translateY(0) scale(1, 1)", opacity: 1 },
        { transform: "translateY(0) scale(1.12, 0.84)", opacity: 1, offset: 0.18 },
        { transform: "translateY(-64px) scale(0.94, 1.08)", opacity: 1, offset: 0.6 },
        { transform: "translateY(-110px) scale(0.6, 0.6)", opacity: 0 },
      ],
      { duration: 520, easing: "cubic-bezier(0.45, 0, 0.25, 1)", fill: "forwards" },
    );
    karta.animate([{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(12px)" }], { duration: 360, delay: 140, easing: "ease-in", fill: "forwards" });
    window.setTimeout(() => {
      klon.remove();
      potem();
    }, 540);
  }

  useEffect(() => {
    const el = document.getElementById(`zadanie-${nr}`);
    el?.setAttribute("data-omawiane", "true");
    kartaRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    return () => el?.removeAttribute("data-omawiane");
  }, [nr]);

  // Podczas strumienia lista jedzie za tekstem bez wygładzania (płynne przewijanie przy każdym
  // kawałku odpowiedzi się zacinało); po odpowiedzi przewija się płynnie.
  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: mysli ? "auto" : "smooth" });
  }, [rozmowa, mysli, przyklad]);

  // Pestka myśli, póki czeka na odpowiedź, a mówi (ruszają się usta), gdy tekst już płynie.
  const pisze = mysli && rozmowa.at(-1)?.od === "tutor" && !!rozmowa.at(-1)?.tekst;
  const stanPestki = pisze ? "talking" : mysli || przyklad?.stan === "laduje" ? "thinking" : "idle";

  async function zapytaj(historia: Wiadomosc[]) {
    // Wiadomość ucznia widać od razu, a nie dopiero z pierwszym kawałkiem odpowiedzi Pestki.
    setRozmowa(historia);
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
          <TutorAvatar size={40} state={stanPestki} className={styles.avatar} />
        </span>
        <span className="label">
          {d.wypracowanie ? "Wypracowanie" : "Błąd"} {numer} z {wszystkich} · zadanie {nr}.
        </span>
        <button type="button" className={styles.zamknij} onClick={onZamknij} aria-label="Zakończ omawianie">
          <X size={18} />
        </button>
      </header>

      <div className={`${chat.list} ${styles.lista}`} ref={listaRef} aria-live="polite">
        {/* Zadanie ze słuchania: fragmenty nagrania przy błędnych pytaniach, żeby odsłuchać, rozmawiając z Pestką. */}
        {arkusz.nagranie && fragmentyBledow.length > 0 && (
          <div className={styles.nagrania}>
            {fragmentyBledow.map((p) => (
              <FragmentNagrania key={p.nr} src={arkusz.nagranie!} fragment={p.fragment!} podpis={`${p.nr}.`} />
            ))}
          </div>
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
        {mysli && (rozmowa.at(-1)?.od !== "tutor" || !rozmowa.at(-1)?.tekst) && (
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
        <button type="button" className="btn btn-primary btn-sm" onClick={() => odejdz(ostatni ? onZamknij : onDalej)} disabled={odchodzi}>
          {ostatni ? "Zakończ" : "Następny błąd"} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
