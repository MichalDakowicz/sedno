// Rysowanie na figurze z arkusza: pióro, linia, gumka, cofnij i ponów, wyczyść, pełny ekran z przybliżeniem.
// Zamiast Excalidraw (brudnopis ładuje kilka MB i ma jedną scenę na zadanie) mała warstwa SVG nad obrazem:
// zdarzenia wskaźnika (mysz, dotyk, rysik), kreski jako wektory w punktach figury, więc skalują się z obrazem.
import { Eraser, Hand, Maximize2, Minimize2, Minus, Pencil, Redo2, Trash2, Undo2, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { adresObrazu, type Obraz } from "../arkusze/typy";
import { GRUBOSC_KRESKI, KOLORY_KRESEK, MAKS_ZNAKOW_RYSUNKU, odlegloscOdKreski, sciezkaKreski, uprosc, zapiszRysunek, type Kreska, type KolorKreski } from "../arkusze/rysunek";
import styles from "./RysunekNaFigurze.module.css";

type Narzedzie = "pioro" | "linia" | "gumka" | "reka";
const NARZEDZIA: { id: Narzedzie; nazwa: string; ikona: LucideIcon; dotyk?: boolean }[] = [
  { id: "pioro", nazwa: "Pióro", ikona: Pencil },
  { id: "linia", nazwa: "Linia prosta", ikona: Minus },
  { id: "gumka", nazwa: "Gumka", ikona: Eraser },
  // Rysunek zabiera dotyk, więc na telefonie jest tryb, w którym palec znów przewija stronę.
  { id: "reka", nazwa: "Przewijaj stronę", ikona: Hand, dotyk: true },
];
const ZOOMY = [1, 1.5, 2, 3];
const GUMKA_PT = 4; // promień gumki w punktach figury
const WYCOFANIA = 60;

const Kreski = memo(function Kreski({ kreski }: { kreski: Kreska[] }) {
  return (
    <>
      {kreski.map((k, i) => (
        <path key={i} d={sciezkaKreski(k.p)} stroke={KOLORY_KRESEK.find((c) => c.id === k.k)?.wartosc} strokeWidth={k.g} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </>
  );
});

export function RysunekNaFigurze({
  obraz,
  kreski,
  onZmiana,
  tylkoOdczyt,
  etykieta,
}: {
  obraz: Obraz;
  kreski: Kreska[];
  onZmiana?: (k: Kreska[]) => void;
  tylkoOdczyt?: boolean;
  /** Opis dla czytnika ekranu, np. „Zadanie 9.1”. */
  etykieta: string;
}) {
  const [narzedzie, setNarzedzie] = useState<Narzedzie>("pioro");
  const [kolor, setKolor] = useState<KolorKreski>("c");
  const [biezaca, setBiezaca] = useState<Kreska | null>(null);
  const [gumkowane, setGumkowane] = useState<Kreska[] | null>(null);
  const [wstecz, setWstecz] = useState<Kreska[][]>([]);
  const [naprzod, setNaprzod] = useState<Kreska[][]>([]);
  const [pelny, setPelny] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [zaDuzy, setZaDuzy] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const przyciskPelnego = useRef<HTMLButtonElement>(null);
  const aktywna = useRef<{ id: number; punkty: number[]; start: [number, number] } | null>(null);
  const gumkowaneRef = useRef<Kreska[] | null>(null);
  const kreskiTeraz = useRef(kreski);
  kreskiTeraz.current = kreski;
  const adres = useMemo(() => adresObrazu(obraz.src), [obraz.src]);

  useEffect(() => {
    if (!pelny) return;
    const stary = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const klawisz = (e: KeyboardEvent) => e.key === "Escape" && setPelny(false);
    window.addEventListener("keydown", klawisz);
    return () => {
      document.body.style.overflow = stary;
      window.removeEventListener("keydown", klawisz);
      przyciskPelnego.current?.focus({ preventScroll: true });
    };
  }, [pelny]);

  const zatwierdz = (nowe: Kreska[]) => {
    if (nowe.length && zapiszRysunek(nowe).length > MAKS_ZNAKOW_RYSUNKU) {
      setZaDuzy(true);
      return;
    }
    setZaDuzy(false);
    // Stan sprzed zmiany czytamy tu, nie w updaterze: ref zmienia się w renderze, a StrictMode wywołuje updater dwa razy.
    const przed = kreskiTeraz.current;
    setWstecz((w) => [...w.slice(-(WYCOFANIA - 1)), przed]);
    setNaprzod([]);
    onZmiana?.(nowe);
  };
  const cofnij = () => {
    const poprzedni = wstecz.at(-1);
    if (!poprzedni) return;
    setWstecz(wstecz.slice(0, -1));
    setNaprzod([...naprzod, kreski]);
    setZaDuzy(false);
    onZmiana?.(poprzedni);
  };
  const ponow = () => {
    const nastepny = naprzod.at(-1);
    if (!nastepny) return;
    setNaprzod(naprzod.slice(0, -1));
    setWstecz([...wstecz, kreski]);
    onZmiana?.(nastepny);
  };

  const punkt = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = svg.current!.getBoundingClientRect();
    return [((e.clientX - r.left) * obraz.szer) / r.width, ((e.clientY - r.top) * obraz.wys) / r.height];
  };
  // Wynik gumkowania leży też w refie, bo szybkie puszczenie może przyjść przed ponownym renderem.
  const wytnij = (x: number, y: number) => {
    const baza = gumkowaneRef.current ?? kreskiTeraz.current;
    const zostaje = baza.filter((k) => odlegloscOdKreski(k, x, y) > GUMKA_PT + k.g / 2);
    if (zostaje.length === baza.length) return;
    gumkowaneRef.current = zostaje;
    setGumkowane(zostaje);
  };

  const wcisniety = (e: React.PointerEvent<SVGSVGElement>) => {
    if (tylkoOdczyt || narzedzie === "reka" || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = punkt(e);
    aktywna.current = { id: e.pointerId, punkty: [x, y], start: [x, y] };
    if (narzedzie === "gumka") wytnij(x, y);
    else setBiezaca({ k: kolor, g: GRUBOSC_KRESKI, p: [x, y] });
  };
  const ruch = (e: React.PointerEvent<SVGSVGElement>) => {
    const a = aktywna.current;
    if (!a || a.id !== e.pointerId) return;
    // Lista scalonych zdarzeń bywa pusta (Safari, zdarzenia syntetyczne), wtedy bierzemy samo zdarzenie.
    const scalone = e.nativeEvent.getCoalescedEvents?.();
    for (const zd of scalone?.length ? scalone : [e.nativeEvent]) {
      const [x, y] = punkt(zd);
      if (narzedzie === "gumka") wytnij(x, y);
      else if (narzedzie === "linia") a.punkty = [...a.start, x, y];
      else if (Math.hypot(x - a.punkty.at(-2)!, y - a.punkty.at(-1)!) >= 0.3) a.punkty.push(x, y);
    }
    if (narzedzie !== "gumka") setBiezaca({ k: kolor, g: GRUBOSC_KRESKI, p: [...a.punkty] });
  };
  const puszczony = (e: React.PointerEvent<SVGSVGElement>) => {
    const a = aktywna.current;
    if (!a || a.id !== e.pointerId) return;
    aktywna.current = null;
    if (narzedzie === "gumka") {
      if (gumkowaneRef.current) zatwierdz(gumkowaneRef.current);
      gumkowaneRef.current = null;
      setGumkowane(null);
      return;
    }
    setBiezaca(null);
    if (e.type === "pointercancel") return;
    zatwierdz([...kreski, { k: kolor, g: GRUBOSC_KRESKI, p: narzedzie === "linia" ? a.punkty.map((v) => Math.round(v * 10) / 10) : uprosc(a.punkty) }]);
  };

  const klawisze = (e: React.KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.target instanceof HTMLTextAreaElement) return;
    const z = e.key.toLowerCase() === "z";
    if (z && !e.shiftKey) cofnij();
    else if (z || e.key.toLowerCase() === "y") ponow();
    else return;
    e.preventDefault();
  };

  const plansza = (
    <div className={styles.przewijak} data-pelny={pelny || undefined}>
      <div className={styles.plansza} style={{ ["--szer" as string]: obraz.szer, width: pelny && zoom ? `${ZOOMY[zoom] * 100}%` : undefined }}>
        <img src={adres} alt="" draggable={false} />
        <svg
          ref={svg}
          viewBox={`0 0 ${obraz.szer} ${obraz.wys}`}
          role="img"
          aria-label={`Rysunek ucznia na figurze, ${etykieta}${kreski.length ? `: ${kreski.length} kresek` : ""}`}
          data-narzedzie={tylkoOdczyt ? undefined : narzedzie}
          onPointerDown={wcisniety}
          onPointerMove={ruch}
          onPointerUp={puszczony}
          onPointerCancel={puszczony}
        >
          <Kreski kreski={gumkowane ?? kreski} />
          {biezaca && <Kreski kreski={[biezaca]} />}
        </svg>
      </div>
    </div>
  );

  if (tylkoOdczyt) return plansza;

  const przycisk = (n: (typeof NARZEDZIA)[number]) => (
    <button
      key={n.id}
      type="button"
      className={`${styles.narz} ${n.dotyk ? styles.dotyk : ""}`}
      aria-pressed={narzedzie === n.id}
      aria-label={n.nazwa}
      title={n.nazwa}
      onClick={() => setNarzedzie(n.id)}
    >
      <n.ikona size={18} aria-hidden="true" />
    </button>
  );

  return (
    <div className={pelny ? styles.pelny : styles.pole} style={{ ["--szer" as string]: obraz.szer }} role={pelny ? "dialog" : undefined} aria-modal={pelny || undefined} aria-label={pelny ? `Rysunek: ${etykieta}` : undefined} onKeyDown={klawisze}>
      <div className={styles.pasek} role="toolbar" aria-label="Narzędzia rysowania">
        <div className={styles.grupa}>{NARZEDZIA.map(przycisk)}</div>
        <div className={styles.grupa} role="group" aria-label="Kolor kreski">
          {KOLORY_KRESEK.map((k) => (
            <button key={k.id} type="button" className={styles.kolor} aria-pressed={kolor === k.id} aria-label={k.nazwa} title={k.nazwa} onClick={() => setKolor(k.id)}>
              <span style={{ background: k.wartosc }} />
            </button>
          ))}
        </div>
        <div className={`${styles.grupa} ${styles.akcje}`}>
          <button type="button" className={styles.narz} aria-label="Cofnij" title="Cofnij (Ctrl+Z)" disabled={!wstecz.length} onClick={cofnij}>
            <Undo2 size={18} aria-hidden="true" />
          </button>
          <button type="button" className={styles.narz} aria-label="Ponów" title="Ponów (Ctrl+Shift+Z)" disabled={!naprzod.length} onClick={ponow}>
            <Redo2 size={18} aria-hidden="true" />
          </button>
          <button type="button" className={styles.narz} aria-label="Wyczyść rysunek" title="Wyczyść rysunek" disabled={!kreski.length} onClick={() => zatwierdz([])}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
          {pelny && (
            <>
              <button type="button" className={styles.narz} aria-label="Oddal" title="Oddal" disabled={zoom === 0} onClick={() => setZoom(zoom - 1)}>
                <ZoomOut size={18} aria-hidden="true" />
              </button>
              <button type="button" className={styles.narz} aria-label="Przybliż" title="Przybliż" disabled={zoom === ZOOMY.length - 1} onClick={() => setZoom(zoom + 1)}>
                <ZoomIn size={18} aria-hidden="true" />
              </button>
            </>
          )}
          <button ref={przyciskPelnego} type="button" className={styles.narz} aria-label={pelny ? "Zamknij pełny ekran" : "Rysuj na pełnym ekranie"} title={pelny ? "Zamknij pełny ekran (Esc)" : "Pełny ekran"} onClick={() => setPelny(!pelny)}>
            {pelny ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {plansza}
      {zaDuzy && (
        <p className={`small ${styles.blad}`} role="status">
          Rysunek jest za duży. Cofnij ostatnie kreski albo wyczyść i zacznij od nowa.
        </p>
      )}
    </div>
  );
}
