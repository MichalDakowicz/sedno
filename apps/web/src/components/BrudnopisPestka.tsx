import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { getCommonBounds, sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { aiErrorText } from "../ai";
import { maOsObrotu, NAZWY_BRYL, rzutBryly, WIDOK_BRYLY } from "./brudnopisBryla";
import { DOMYSLNY_OBROT_BRYLY, type BrylaPestki, type OdpowiedzPestki, type Punkt } from "./brudnopisPestkaApi";
import { wzoryDoWyswietlenia } from "./brudnopisPestkaWzory";
import { TekstMat } from "./TekstMat";
import { TutorAvatar } from "./TutorAvatar";
import styles from "./Brudnopis.module.css";

export function komunikatPestki(kod: string) {
  if (kod === "empty_board") return "Dodaj coś na płótnie albo wpisz pytanie.";
  if (kod === "board_loading") return "Brudnopis się wczytuje. Spróbuj za chwilę.";
  if (kod === "bad_snapshot" || kod === "bad_image" || kod === "too_large") return "Nie udało się przygotować obrazu szkicu. Spróbuj ponownie.";
  if (kod === "image_not_supported") return "Pestka nie może teraz przeczytać tablicy. Wpisz pytanie słowami.";
  if (kod === "bad_model_response") return "Przesłałam nieczytelną odpowiedź. Zapytaj mnie o jeden konkretny krok.";
  return aiErrorText(kod);
}

const BEZ_PONOWIENIA = new Set(["no_provider", "bad_credential", "image_not_supported", "not_signed_in", "bad_base_url", "daily_limit"]);

export type FazaPestki = "pole" | "mysli" | "pisze" | "dymek" | "kiwa";
export type DymekPestki = {
  tekst?: string;
  odczyt?: string | null;
  blad?: string;
  uwaga?: string;
  ponow?: () => void;
  pokaz?: () => void;
  zetrzyj?: () => void;
};

const AWATAR = 40;
const MARGINES = 4;
const ODSTEP_DYMKA = 8;

type StanWidoku = Pick<AppState, "scrollX" | "scrollY" | "zoom" | "width" | "height" | "offsetLeft" | "offsetTop">;

function polozenie(stan: StanWidoku, [sceneX, sceneY]: Punkt) {
  const { x, y } = sceneCoordsToViewportCoords({ sceneX, sceneY }, stan as AppState);
  return {
    x: Math.min(Math.max(MARGINES, x - stan.offsetLeft), stan.width - AWATAR - MARGINES),
    y: Math.min(Math.max(MARGINES, y - stan.offsetTop), stan.height - AWATAR - MARGINES),
  };
}

const dlugoscDymka = (d: DymekPestki) =>
  (d.tekst?.length ?? 0) + (d.odczyt?.length ?? 0) + (d.uwaga?.length ?? 0) + (d.blad ? 90 : 0) + (d.ponow || d.pokaz || d.zetrzyj ? 60 : 0);

type DokDymka = "gora" | "dol";
type Rozmiar = { w: number; h: number; dok: boolean };
type Miejsce = { strona: string; odDolu: string; przesuniecie: number | null; miejsce: number; dok?: DokDymka };

// Dymek staje tam, gdzie najmniej zasłania pracę ucznia i rysunek zadania. Kandydaci: z prawej i z lewej Pestki,
// przesunięci w pionie wzdłuż niej (dymek zawsze jej dotyka), oraz dok przy górnej albo dolnej krawędzi płótna na całą
// szerokość. Wysokość bierzemy z pomiaru dymka (wzory i przyciski robią go wyższym niż sam tekst), a przed pierwszym
// pomiarem szacujemy ją z długości tekstu.
function miejsceDymka(stan: StanWidoku, x: number, y: number, elementy: readonly ExcalidrawElement[], znaki: number, rozmiar: Rozmiar | null): Miejsce {
  const z = stan.zoom.value;
  const przeszkody = elementy.map((e) => {
    const [x1, y1, x2, y2] = getCommonBounds([e]);
    return { x: (x1 + stan.scrollX) * z, y: (y1 + stan.scrollY) * z, w: (x2 - x1) * z, h: (y2 - y1) * z };
  });
  type Prostokat = { x: number; y: number; w: number; h: number };
  const zakrywa = (d: Prostokat, lista: Prostokat[]) => lista.reduce((suma, p) =>
    suma + Math.max(0, Math.min(d.x + d.w, p.x + p.w) - Math.max(d.x, p.x)) * Math.max(0, Math.min(d.y + d.h, p.y + p.h) - Math.max(d.y, p.y)), 0);
  const poza = (d: Prostokat) => (d.y < 0 || d.y + d.h > stan.height ? d.w * d.h : 0);
  const szacuj = (w: number) => 40 + Math.ceil((znaki * 8) / Math.max(120, w - 40)) * 22;

  const zPrawej = stan.width - x - AWATAR - ODSTEP_DYMKA - MARGINES;
  const zLewej = x - ODSTEP_DYMKA - MARGINES;
  const szeroko = stan.width - 2 * ODSTEP_DYMKA;

  // Dok: Pestka też jest przeszkodą, bo zostaje przy pracy ucznia.
  const hDok = Math.min(stan.height * 0.4, rozmiar?.dok ? rozmiar.h : szacuj(szeroko));
  const zPestka = [...przeszkody, { x, y, w: AWATAR, h: AWATAR }];
  const doki = (["dol", "gora"] as const).map((dok) => {
    const gora = dok === "dol" ? stan.height - ODSTEP_DYMKA - hDok : ODSTEP_DYMKA;
    return { dok, kolizja: zakrywa({ x: ODSTEP_DYMKA, y: gora, w: szeroko, h: hDok }, zPestka) };
  });
  // Przy remisie dalej od Pestki: ona zostaje przy pracy ucznia, dymek po drugiej stronie płótna.
  const dok = [...doki].sort((p, q) => p.kolizja - q.kolizja || (y < stan.height / 2 ? (p.dok === "dol" ? -1 : 1) : (p.dok === "gora" ? -1 : 1)))[0]!;
  const doDoku = (): Miejsce => ({ strona: "", odDolu: "", przesuniecie: null, miejsce: szeroko, dok: dok.dok });

  const boki = [
    { strona: "", miejsce: zPrawej, lewo: () => x + AWATAR + ODSTEP_DYMKA },
    { strona: styles.dymekZLewej, miejsce: zLewej, lewo: (w: number) => x - ODSTEP_DYMKA - w },
  ].filter((o) => o.miejsce >= 200);
  if (!boki.length) return doDoku();

  let najlepsza: Miejsce & { kolizja: number } = { strona: "", odDolu: "", przesuniecie: -4, miejsce: zPrawej, kolizja: Infinity };
  for (const o of boki) {
    const w = Math.min(300, o.miejsce);
    const h = rozmiar && !rozmiar.dok ? rozmiar.h : szacuj(w);
    // Od „górą równo z Pestką” do „dołem równo z Pestką”, w kilku krokach.
    const od = -4;
    const doo = AWATAR + 4 - h;
    for (let i = 0; i <= 8; i++) {
      const przesuniecie = Math.round(od + ((doo - od) * i) / 8);
      const d = { x: o.lewo(w), y: y + przesuniecie, w, h };
      // Drobna kara za odejście od wyrównania do góry rozstrzyga remisy na korzyść zwykłego ułożenia.
      const kolizja = zakrywa(d, przeszkody) + poza(d) + Math.abs(przesuniecie - od) * 0.01;
      if (kolizja < najlepsza.kolizja)
        najlepsza = { strona: o.strona, odDolu: i === 8 ? styles.dymekOdDolu : "", przesuniecie, miejsce: o.miejsce, kolizja };
    }
  }
  // Obok Pestki wszędzie coś zasłania, a przy krawędzi wyraźnie mniej: dymek idzie do doku.
  if (najlepsza.kolizja >= 1 && dok.kolizja < najlepsza.kolizja / 2) return doDoku();
  const { kolizja: _, ...miejsce } = najlepsza;
  return miejsce;
}

/** Pestka na tablicy: awatar przy pracy ucznia, pole pytania albo dymek obok niej. Położenie w scenie, więc idzie z widokiem. */
export function PestkaNaTablicy({ api, faza, punkt, skok, dymek, onPytanie, onZamknij }: {
  api: RefObject<ExcalidrawImperativeAPI | null>;
  faza: FazaPestki;
  punkt: Punkt;
  skok: number;
  dymek?: DymekPestki;
  onPytanie: (pytanie: string) => void;
  onZamknij: () => void;
}) {
  const korzen = useRef<HTMLDivElement>(null);
  const [pytanie, setPytanie] = useState("");
  const idPola = useId();
  const pole = useRef<HTMLInputElement>(null);
  // Pole otwiera uczeń, więc dostaje fokus, ale bez przewijania strony (autoFocus przewijał ją do płótna).
  useEffect(() => {
    if (faza === "pole") {
      pole.current?.focus({ preventScroll: true });
      // Na telefonie pole bywa pod dolną krawędzią ekranu: bez przewinięcia kliknięcie wyglądało jak brak reakcji.
      pole.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [faza]);
  const stan = api.current?.getAppState();
  const { x, y } = stan ? polozenie(stan, punkt) : { x: MARGINES, y: MARGINES };
  // Zmierzona wielkość dymka (pole albo odpowiedź) wraca do wyboru miejsca przy następnym renderze.
  const dymekRef = useRef<HTMLElement | null>(null);
  const [rozmiar, setRozmiar] = useState<Rozmiar | null>(null);
  const { strona, odDolu, przesuniecie, miejsce, dok } = stan
    ? miejsceDymka(stan, x, y, api.current?.getSceneElements() ?? [], dymek ? dlugoscDymka(dymek) : 40, rozmiar)
    : { strona: "", odDolu: "", przesuniecie: null, miejsce: 300, dok: undefined };
  const wDoku = !!dok;
  useLayoutEffect(() => {
    const el = dymekRef.current;
    if (!el) return;
    const zmierz = () => {
      const r = el.getBoundingClientRect();
      setRozmiar((p) => (p && p.dok === wDoku && Math.abs(p.h - r.height) < 4 && Math.abs(p.w - r.width) < 4 ? p : { w: r.width, h: r.height, dok: wDoku }));
    };
    zmierz();
    const ro = new ResizeObserver(zmierz);
    ro.observe(el);
    return () => ro.disconnect();
  }, [faza, wDoku, !!dymek]);
  // Zwinięty dymek w doku pokazuje dwie pierwsze linie; nowa odpowiedź rozwija go z powrotem.
  const [zwiniety, setZwiniety] = useState(false);
  useEffect(() => setZwiniety(false), [dymek?.blad, dymek?.odczyt, dymek?.pokaz]);
  const klasaDymka = dok
    ? [styles.pestkaDymek, styles.dymekDok, dok === "dol" && styles.dymekDokDol, zwiniety && styles.dymekZwiniety].filter(Boolean).join(" ")
    : [styles.pestkaDymek, strona, odDolu].join(" ");
  const stylDymka = dok ? undefined : { ["--miejsce" as string]: miejsce + "px", ...(przesuniecie !== null ? { top: przesuniecie + "px", bottom: "auto" } : {}) };
  const naEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onZamknij();
    }
  };

  // Przeskok do nowego miejsca idzie płynnie; przesuwanie widoku przez ucznia przesuwa Pestkę bez opóźnienia.
  useLayoutEffect(() => {
    const el = korzen.current;
    if (!el) return;
    el.style.transition = "";
    el.style.transform = `translate(${x}px, ${y}px)`;
  }, [x, y]);
  useEffect(() => {
    const a = api.current;
    const el = korzen.current;
    if (!a || !el) return;
    let ostatni = "";
    return a.onChange((_, s) => {
      const p = polozenie(s, punkt);
      const transform = `translate(${p.x}px, ${p.y}px)`;
      if (transform === ostatni) return;
      ostatni = transform;
      el.style.transition = "none";
      el.style.transform = transform;
    });
  }, [api, punkt]);

  function wyslij(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onPytanie(pytanie.trim());
    setPytanie("");
  }

  // W trakcie myślenia (i pisania figur ze strumienia) dymek może już mieć początek wskazówki: wtedy Pestka mówi.
  const pisanaWskazowka = (faza === "mysli" || faza === "pisze") && !!dymek?.tekst;
  const stanAwatara = pisanaWskazowka || faza === "pisze" ? "talking" : faza === "mysli" ? "thinking" : "idle";
  const pole_ = faza === "pole" && (
    <form ref={(el) => void (dymekRef.current = el)} className={klasaDymka} style={stylDymka} onSubmit={wyslij}>
      <label htmlFor={idPola} className="visually-hidden">Pytanie do Pestki</label>
      <input
        id={idPola}
        className={`input ${styles.pestkaPole}`}
        value={pytanie}
        maxLength={500}
        ref={pole}
        autoComplete="off"
        enterKeyHint="send"
        placeholder="Zapytaj albo Enter: spójrz na szkic"
        onChange={(e) => setPytanie(e.currentTarget.value)}
      />
    </form>
  );
  const dymek_ = (faza === "dymek" || pisanaWskazowka) && dymek && (
    <div
      ref={(el) => void (dymekRef.current = el)}
      className={klasaDymka}
      style={stylDymka}
      // Tekst w trakcie pisania nie trafia do czytnika po każdym słowie: ogłasza go dopiero gotowy dymek.
      role={pisanaWskazowka ? undefined : dymek.blad ? "alert" : "status"}
      aria-busy={pisanaWskazowka || undefined}
    >
      {dok && (
        <button type="button" className={`${styles.dymekZamknij} ${styles.dymekZwin}`} aria-expanded={!zwiniety}
          aria-label={zwiniety ? "Rozwiń dymek Pestki" : "Zwiń dymek Pestki"} onClick={() => setZwiniety((z) => !z)}>
          {zwiniety ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronUp size={16} aria-hidden="true" />}
        </button>
      )}
      <button type="button" className={styles.dymekZamknij} aria-label="Zamknij dymek Pestki" onClick={onZamknij}>
        <X size={16} aria-hidden="true" />
      </button>
      {dymek.odczyt && <p className="small muted">Widzę: <TekstMat tekst={wzoryDoWyswietlenia(dymek.odczyt)} /></p>}
      {dymek.tekst && <p><TekstMat tekst={wzoryDoWyswietlenia(dymek.tekst)} /></p>}
      {dymek.blad && <p>{komunikatPestki(dymek.blad)}</p>}
      {dymek.uwaga && <p className="small muted">{dymek.uwaga}</p>}
      {(dymek.ponow || dymek.pokaz || dymek.zetrzyj) && (
        <div className={styles.dymekAkcje}>
          {dymek.pokaz && <button type="button" className="btn btn-secondary btn-sm" onClick={dymek.pokaz}>Pokaż</button>}
          {dymek.ponow && dymek.blad && !BEZ_PONOWIENIA.has(dymek.blad) && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={dymek.ponow}>Spróbuj ponownie</button>
          )}
          {dymek.zetrzyj && <button type="button" className="btn btn-ghost btn-sm" onClick={dymek.zetrzyj}>Zetrzyj</button>}
        </div>
      )}
    </div>
  );

  return (
    <>
    <div ref={korzen} className={styles.pestkaNaTablicy} onKeyDown={naEscape}>
      <span key={skok} className={[styles.pestkaPostac, skok > 0 && styles.pestkaSkok, faza === "kiwa" && styles.pestkaKiwa].filter(Boolean).join(" ")}>
        <TutorAvatar size={AWATAR} state={stanAwatara} />
      </span>
      {faza === "mysli" && <span className="visually-hidden" role="status">Pestka patrzy na szkic</span>}
      {!dok && pole_}
      {!dok && dymek_}
    </div>
    {/* W doku dymek nie idzie za Pestką (stoi przy krawędzi płótna), więc leży obok, a nie w przesuwanym korzeniu. */}
    {dok && (pole_ || dymek_) && <div className={styles.dokTablicy} onKeyDown={naEscape}>{pole_}{dymek_}</div>}
    </>
  );
}

export type WpisHistorii = { id: number; pytanie: string; prowadzenie?: boolean; dane?: OdpowiedzPestki; blad?: string };

function PodgladBryly({ bryla, onNarysuj }: { bryla: BrylaPestki; onNarysuj: (obrot: number) => void }) {
  const [obrot, setObrot] = useState(DOMYSLNY_OBROT_BRYLY);
  const rzut = rzutBryly(bryla, obrot);
  const nazwa = NAZWY_BRYL[bryla.typ];
  const zmienNachylenie = maOsObrotu(bryla.typ);
  return (
    <div className={styles.pestkaBryla}>
      <svg viewBox={"0 0 " + WIDOK_BRYLY.join(" ")} role="img" aria-label={nazwa}>
        {rzut.linie.map(({ punkty, ukryta }, i) => (
          <polyline key={i} points={punkty.map(([x, y]) => x.toFixed(2) + "," + y.toFixed(2)).join(" ")}
            fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeDasharray={ukryta ? "4 4" : undefined} />
        ))}
        {rzut.etykiety.map(({ punkt: [x, y], tekst }, i) => (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="currentColor" fontSize={10}>{tekst}</text>
        ))}
      </svg>
      <label className="small">
        {zmienNachylenie ? "Nachylenie widoku" : "Obrót bryły"}
        <input type="range" min={zmienNachylenie ? 5 : 0} max={zmienNachylenie ? 75 : 360} step={5}
          value={obrot} onChange={(e) => setObrot(e.currentTarget.valueAsNumber)} />
      </label>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNarysuj(obrot)}>Narysuj w tym obrocie</button>
    </div>
  );
}

/** Historia rozmowy z Pestką w tym brudnopisie: wszystko, co powiedziała i zapisała, do przeczytania jeszcze raz. */
export function HistoriaPestki({ id, wpisy, onZetrzyj, onBryla, onZamknij }: {
  id: string;
  wpisy: WpisHistorii[];
  onZetrzyj: () => void;
  onBryla: (dane: OdpowiedzPestki, obrot: number) => void;
  onZamknij: () => void;
}) {
  const tytul = useId();
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
        <TutorAvatar size={30} />
        <h3 id={tytul} className="h3">Rozmowa z Pestką</h3>
        <button type="button" className={styles.tool} aria-label="Zamknij rozmowę z Pestką" onClick={onZamknij}>
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <ol className={styles.pestkaHistoria}>
        {wpisy.map((w) => (
          <li key={w.id}>
            <p className="small muted">{w.prowadzenie ? "Krok po kroku" : w.pytanie ? "Ty: " + w.pytanie : "Spójrz na szkic"}</p>
            {w.blad && <p>{komunikatPestki(w.blad)}</p>}
            {w.dane?.odczyt && <p className="small muted">Widzę: <TekstMat tekst={wzoryDoWyswietlenia(w.dane.odczyt)} /></p>}
            {w.dane && <p><TekstMat tekst={wzoryDoWyswietlenia(w.dane.wskazowka)} /></p>}
            {w.dane?.dopiski.map((d, i) => d.typ === "kod"
              ? <pre key={i} className={styles.pestkaKod}>{d.tekst}</pre>
              : <p key={i} className={styles.pestkaObliczenia}><TekstMat tekst={wzoryDoWyswietlenia(d.tekst, d.typ === "obliczenia")} /></p>)}
            {w.dane?.pominietoElementy && <p className="small muted">Część zapisu ma błędny format. Poproś mnie o osobny rysunek lub dopisek.</p>}
            {w.dane?.bryla && <PodgladBryly bryla={w.dane.bryla} onNarysuj={(obrot) => onBryla(w.dane!, obrot)} />}
          </li>
        ))}
      </ol>
      <div className={styles.pestkaTryb}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onZetrzyj}>Zetrzyj dopiski Pestki</button>
      </div>
    </section>
  );
}
