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

const BEZ_PONOWIENIA = new Set(["no_provider", "bad_credential", "image_not_supported", "not_signed_in", "bad_base_url"]);

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

// Dymek staje po tej stronie Pestki, gdzie nie zasłoni pracy ucznia ani rysunku zadania: z prawej albo z lewej.
// Gdy obok brak miejsca (telefon), dokuje się przy górnej albo dolnej krawędzi płótna na całą szerokość, z limitem
// wysokości, zamiast wisieć na środku rysunku. Wysokość szacujemy z długości tekstu.
function miejsceDymka(stan: StanWidoku, x: number, y: number, elementy: readonly ExcalidrawElement[], znaki: number): {
  strona: string; odDolu: string; miejsce: number; dok?: DokDymka;
} {
  const z = stan.zoom.value;
  const przeszkody = elementy.map((e) => {
    const [x1, y1, x2, y2] = getCommonBounds([e]);
    return { x: (x1 + stan.scrollX) * z, y: (y1 + stan.scrollY) * z, w: (x2 - x1) * z, h: (y2 - y1) * z };
  });
  const zPrawej = stan.width - x - AWATAR - ODSTEP_DYMKA - MARGINES;
  const zLewej = x - ODSTEP_DYMKA - MARGINES;
  const szeroko = stan.width - 2 * ODSTEP_DYMKA;
  const boki = [
    { strona: "", miejsce: zPrawej, lewo: () => x + AWATAR + ODSTEP_DYMKA },
    { strona: styles.dymekZLewej, miejsce: zLewej, lewo: (w: number) => x - ODSTEP_DYMKA - w },
  ].filter((o) => o.miejsce >= 200);
  if (!boki.length) {
    const h = Math.min(stan.height * 0.4, 40 + Math.ceil((znaki * 8) / Math.max(120, szeroko - 40)) * 22);
    const pestka = { x, y, w: AWATAR, h: AWATAR };
    const kolizja = (gora: number) => [...przeszkody, pestka].reduce((suma, p) => suma +
      Math.max(0, Math.min(ODSTEP_DYMKA + szeroko, p.x + p.w) - Math.max(ODSTEP_DYMKA, p.x)) * Math.max(0, Math.min(gora + h, p.y + p.h) - Math.max(gora, p.y)), 0);
    const dol = kolizja(stan.height - ODSTEP_DYMKA - h);
    const gora = kolizja(ODSTEP_DYMKA);
    // Przy remisie dalej od Pestki: ona zostaje przy pracy ucznia, dymek po drugiej stronie płótna.
    const naDole = dol < gora || (dol === gora && y < stan.height / 2);
    return { strona: "", odDolu: "", miejsce: szeroko, dok: naDole ? "dol" : "gora" };
  }
  let najlepsza = { strona: "", odDolu: "", miejsce: zPrawej, kolizja: Infinity };
  for (const o of boki) {
    const w = Math.min(300, o.miejsce);
    const h = 40 + Math.ceil((znaki * 8) / Math.max(120, w - 40)) * 22;
    for (const odDolu of y > stan.height / 2 ? [true, false] : [false, true]) {
      const gora = odDolu ? y + AWATAR + 4 - h : y - 4;
      const dymek = { x: o.lewo(w), y: gora, w, h };
      const kolizja = przeszkody.reduce((suma, p) => suma +
        Math.max(0, Math.min(dymek.x + w, p.x + p.w) - Math.max(dymek.x, p.x)) * Math.max(0, Math.min(dymek.y + h, p.y + p.h) - Math.max(dymek.y, p.y)), 0)
        + (gora < 0 || gora + h > stan.height ? w * h : 0);
      if (kolizja < najlepsza.kolizja) najlepsza = { strona: o.strona, odDolu: odDolu ? styles.dymekOdDolu : "", miejsce: o.miejsce, kolizja };
    }
  }
  return najlepsza;
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
    if (faza === "pole") pole.current?.focus({ preventScroll: true });
  }, [faza]);
  const stan = api.current?.getAppState();
  const { x, y } = stan ? polozenie(stan, punkt) : { x: MARGINES, y: MARGINES };
  const { strona, odDolu, miejsce, dok } = stan
    ? miejsceDymka(stan, x, y, api.current?.getSceneElements() ?? [], dymek ? dlugoscDymka(dymek) : 40)
    : { strona: "", odDolu: "", miejsce: 300, dok: undefined };
  // Zwinięty dymek w doku pokazuje dwie pierwsze linie; nowa odpowiedź rozwija go z powrotem.
  const [zwiniety, setZwiniety] = useState(false);
  useEffect(() => setZwiniety(false), [dymek?.blad, dymek?.odczyt, dymek?.pokaz]);
  const klasaDymka = dok
    ? [styles.pestkaDymek, styles.dymekDok, dok === "dol" && styles.dymekDokDol, zwiniety && styles.dymekZwiniety].filter(Boolean).join(" ")
    : [styles.pestkaDymek, strona, odDolu].join(" ");
  const stylDymka = dok ? undefined : { ["--miejsce" as string]: miejsce + "px" };
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
    <form className={klasaDymka} style={stylDymka} onSubmit={wyslij}>
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
