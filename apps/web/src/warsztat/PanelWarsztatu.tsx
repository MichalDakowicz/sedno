// Chowany panel z narzędziami do zadania z informatyki (Python, SQL, skoroszyt, dane). Stoi obok
// treści, więc zadanie i pola odpowiedzi zostają widoczne; na wąskim ekranie zajmuje całą szerokość
// z przyciskiem powrotu do zadania. Zostaje zamontowany po schowaniu, żeby nie gubić pracy.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { ArrowLeft, Maximize2, Minimize2, PanelLeft, PanelRight, X } from "lucide-react";
import type { Warsztat as Zapis } from "../arkusze/postep";
import type { Zadanie } from "../arkusze/typy";
import { Dane, NAZWY, Pliki, poczatekPythona, poczatekSql, Python, Sql, type Przebieg, type Tryb, type Ustaw } from "./Narzedzia";
import { useMaterialy } from "./materialy";
import { Skoroszyt } from "./Skoroszyt";
import type { Uklad } from "./panelUklad";
import type { WynikSql } from "./sql";
import styles from "./Panel.module.css";

type Props = {
  zadanie: Zadanie;
  pliki: Record<string, string>; // wszystkie pliki arkusza
  zip?: string;
  zapis?: Zapis;
  onZapis: (z: Zapis) => void;
  // Pytania, do których można wstawić wynik (otwarte, jeszcze niesprawdzone).
  doWstawienia: string[];
  onWstaw: (nr: string, tekst: string) => void;
  uklad: Uklad;
  otwarty: boolean;
  onSchowaj: () => void;
  // Przycisk, który otworzył panel; wraca na niego fokus po schowaniu.
  przycisk: RefObject<HTMLElement | null>;
};

export function PanelWarsztatu({ zadanie, pliki: wszystkie, zip, zapis, onZapis, doWstawienia, onWstaw, uklad, otwarty, onSchowaj, przycisk }: Props) {
  const { pliki, nazwy, tabelaryczne, plikiTabel, tryby, tryb, klucz } = useMaterialy(zadanie, wszystkie, zapis);
  // Skoroszyt trzyma funkcje zwrotne z chwili zamontowania, więc zapis składamy z najnowszego stanu, nie z domknięcia.
  const najnowszy = useRef({ zapis, tryb, onZapis });
  najnowszy.current = { zapis, tryb, onZapis };
  const zmien = (z: Partial<Zapis>) => najnowszy.current.onZapis({ ...najnowszy.current.zapis, tryb: najnowszy.current.tryb, ...z });
  const [pelny, setPelny] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const nr = zadanie.nr;

  // Przebiegi programów i wyniki zapytań per zadanie: po schowaniu i zmianie zadania wracają na miejsce.
  const [przebiegi, setPrzebiegi] = useState<Record<number, Przebieg | null>>({});
  const [wyniki, setWyniki] = useState<Record<number, WynikSql[] | null>>({});
  const setPrzebieg: Ustaw<Przebieg | null> = (u) => setPrzebiegi((m) => ({ ...m, [nr]: typeof u === "function" ? u(m[nr] ?? null) : u }));
  const setWynik: Ustaw<WynikSql[] | null> = (u) => setWyniki((m) => ({ ...m, [nr]: typeof u === "function" ? u(m[nr] ?? null) : u }));

  // Fokus: do panelu po otwarciu (albo zmianie zadania), na przycisk po schowaniu.
  // Panel montuje się już otwarty, więc na wysunięcie czeka dwie klatki: najpierw zamknięty, potem wjeżdża.
  const [wysuniety, setWysuniety] = useState(false);
  useEffect(() => {
    if (!otwarty) {
      setWysuniety(false);
      return;
    }
    let drugi = 0;
    const pierwszy = requestAnimationFrame(() => {
      drugi = requestAnimationFrame(() => setWysuniety(true));
    });
    return () => {
      cancelAnimationFrame(pierwszy);
      cancelAnimationFrame(drugi);
    };
  }, [otwarty]);

  const bylOtwarty = useRef(false);
  useEffect(() => {
    if (otwarty && wysuniety) panel.current?.focus({ preventScroll: true });
    else if (!otwarty && bylOtwarty.current) przycisk.current?.focus();
    bylOtwarty.current = otwarty;
  }, [otwarty, wysuniety, nr, przycisk]);

  // Pełny ekran dotyczy tylko skoroszytu: znika po schowaniu panelu i zmianie zakładki.
  const naPelnym = pelny && otwarty && tryb === "arkusz";
  const klawisz = (e: KeyboardEvent) => {
    // Escape w oknie dialogowym albo w podpowiedziach edytora należy do nich; na pełnym ekranie wraca do panelu.
    if (e.key === "Escape" && !e.defaultPrevented && panel.current?.contains(e.target as Node) && !(e.target as Element).closest("[role=dialog]")) {
      if (naPelnym) setPelny(false);
      else onSchowaj();
    }
  };

  const waski = uklad.waski;
  return (
    <section
      ref={panel}
      className={styles.panel}
      data-strona={uklad.strona}
      data-waski={waski || undefined}
      data-pelny={naPelnym || undefined}
      data-otwarty={(otwarty && wysuniety) || undefined}
      tabIndex={-1}
      aria-label={`Materiały do zadania ${nr}`}
      style={waski || naPelnym ? undefined : { width: uklad.szerokosc }}
      onKeyDown={klawisz}
    >
      {!waski && !naPelnym && <Uchwyt uklad={uklad} />}
      <header className={styles.glowa}>
        <div className={styles.gora}>
          {waski && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onSchowaj}>
              <ArrowLeft size={15} aria-hidden="true" /> Wróć do zadania
            </button>
          )}
          <h2 className={`h3 ${styles.tytul}`}>
            Zadanie {nr}.<span className={styles.narzedzieNazwa}> {NAZWY[tryb]}</span>
          </h2>
          <div className={styles.przyciski}>
            {tryb === "arkusz" && (
              <button
                type="button"
                className={styles.ikona}
                onClick={() => setPelny(!naPelnym)}
                aria-label={naPelnym ? "Zmniejsz skoroszyt do panelu" : "Powiększ skoroszyt na cały ekran"}
                aria-pressed={naPelnym}
                title={naPelnym ? "Wróć do panelu (Esc)" : "Na cały ekran"}
              >
                {naPelnym ? <Minimize2 size={17} aria-hidden="true" /> : <Maximize2 size={17} aria-hidden="true" />}
              </button>
            )}
            {!waski && (
              <>
              <button
                type="button"
                className={styles.ikona}
                onClick={() => uklad.ustawStrone(uklad.strona === "prawa" ? "lewa" : "prawa")}
                aria-label={uklad.strona === "prawa" ? "Przenieś panel na lewą stronę" : "Przenieś panel na prawą stronę"}
                title={uklad.strona === "prawa" ? "Na lewą stronę" : "Na prawą stronę"}
              >
                {uklad.strona === "prawa" ? <PanelLeft size={17} aria-hidden="true" /> : <PanelRight size={17} aria-hidden="true" />}
              </button>
              <button type="button" className={styles.ikona} onClick={onSchowaj} aria-label="Schowaj panel" title="Schowaj (Esc)">
                <X size={17} aria-hidden="true" />
              </button>
              </>
            )}
          </div>
        </div>
        {tryby.length > 1 && (
          <div className={styles.karty} role="tablist" aria-label="Narzędzie">
            {tryby.map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tryb === t} className={styles.karta} onClick={() => zmien({ tryb: t })}>
                {NAZWY[t as Tryb]}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className={styles.tresc} data-tryb={tryb}>
        {nazwy.length > 0 && tryb !== "arkusz" && <Pliki pliki={pliki} zip={zip} />}
        {tryb === "python" && (
          <Python
            key={`${nr}-python`}
            pliki={pliki}
            kod={zapis?.python ?? poczatekPythona(nazwy)}
            onKod={(python) => zmien({ python })}
            doWstawienia={doWstawienia}
            onWstaw={onWstaw}
            klucz={klucz}
            przebieg={przebiegi[nr] ?? null}
            setPrzebieg={setPrzebieg}
          />
        )}
        {tryb === "sql" && (
          <Sql
            key={`${nr}-sql`}
            pliki={pliki}
            kod={zapis?.sql ?? poczatekSql(tabelaryczne)}
            onKod={(sql) => zmien({ sql })}
            doWstawienia={doWstawienia}
            onWstaw={onWstaw}
            klucz={klucz}
            wyniki={wyniki[nr] ?? null}
            setWyniki={setWynik}
          />
        )}
        {tryb === "arkusz" && (
          <Skoroszyt key={`${nr}-arkusz`} nr={nr} pliki={plikiTabel} operacje={zapis?.arkusz} onOperacje={(arkusz) => zmien({ arkusz })} doWstawienia={doWstawienia} onWstaw={onWstaw} klucz={klucz} aktywny={otwarty} pelny={naPelnym} />
        )}
        {tryb === "dane" && <Dane key={`${nr}-dane`} pliki={pliki} />}
      </div>
    </section>
  );
}

// Uchwyt do zmiany szerokości, na krawędzi od strony treści. Strzałka przesuwa krawędź w swoją stronę.
function Uchwyt({ uklad }: { uklad: Uklad }) {
  const { strona, szerokosc, min, max, ustawSzerokosc } = uklad;
  const start = useRef<{ x: number; w: number } | null>(null);
  // Panel po prawej rośnie, gdy krawędź jedzie w lewo.
  const znak = strona === "prawa" ? -1 : 1;

  const klawisz = (e: KeyboardEvent<HTMLDivElement>) => {
    const krok = e.shiftKey ? 80 : 24;
    if (e.key === "ArrowLeft") ustawSzerokosc(szerokosc - znak * krok);
    else if (e.key === "ArrowRight") ustawSzerokosc(szerokosc + znak * krok);
    else if (e.key === "Home") ustawSzerokosc(min);
    else if (e.key === "End") ustawSzerokosc(max);
    else return;
    e.preventDefault();
  };

  return (
    <div
      className={styles.uchwyt}
      role="separator"
      aria-orientation="vertical"
      aria-label="Szerokość panelu"
      aria-valuenow={szerokosc}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onKeyDown={klawisz}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, w: szerokosc };
      }}
      onPointerMove={(e: PointerEvent<HTMLDivElement>) => {
        if (start.current) ustawSzerokosc(start.current.w + znak * (e.clientX - start.current.x));
      }}
      onPointerUp={() => (start.current = null)}
      onPointerCancel={() => (start.current = null)}
      onDoubleClick={() => ustawSzerokosc(Math.round(window.innerWidth / 3))}
    />
  );
}
