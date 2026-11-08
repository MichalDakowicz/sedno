// Brudnopis przy zadaniu: szkic w Excalidraw, opcjonalnie na rysunku z treści.
// To pomoc, nie forma odpowiedzi: zadania zamknięte zostają zamknięte.
import { createContext, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { PenLine } from "lucide-react";
import type { Brudnopis as Zapis } from "../arkusze/postep";
import type { Obraz } from "../arkusze/typy";
import { Ladowanie } from "./Ladowanie";
import styles from "./Brudnopis.module.css";

// Fonty Excalidraw serwujemy sami (vite.config.ts), zamiast pobierać je z CDN.
declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string;
  }
}
window.EXCALIDRAW_ASSET_PATH = "/excalidraw/";

const Edytor = lazy(() => import("./BrudnopisEdytor"));

// Otwarty brudnopis i pełny ekran przetrwają odświeżenie strony (w obrębie karty przeglądarki).
type Tryb = "zamkniety" | "otwarty" | "pelny";
const kluczTrybu = (plik: string) => `sedno.brudnopis.${plik}`;

function wczytajTryb(plik: string): Tryb {
  try {
    const t = sessionStorage.getItem(kluczTrybu(plik));
    return t === "otwarty" || t === "pelny" ? t : "zamkniety";
  } catch {
    return "zamkniety";
  }
}

function zapiszTryb(plik: string, tryb: Tryb) {
  try {
    if (tryb === "zamkniety") sessionStorage.removeItem(kluczTrybu(plik));
    else sessionStorage.setItem(kluczTrybu(plik), tryb);
  } catch {
    // zablokowany storage: po odświeżeniu brudnopis będzie zamknięty
  }
}

// Przejście na pełnym ekranie do brudnopisu innego zadania: ten otwiera się na pełnym
// ekranie, a dotychczasowy zamyka (szkic zostaje zapisany).
const ZDARZENIE_PELNY = "sedno:brudnopis-pelny";
export const otworzNaPelnymEkranie = (plik: string) => window.dispatchEvent(new CustomEvent(ZDARZENIE_PELNY, { detail: plik }));

// Treść nad płótnem na pełnym ekranie mówi, czy pokazać dodatkowe rysunki (wykresy opcji
// A–F): są potrzebne tylko w podpunkcie, którego dotyczą.
export const PokazDodatkoweRysunki = createContext<(pokaz: boolean) => void>(() => {});

type Props = {
  plik: string;
  zadanie: number;
  rysunek?: Obraz;
  zapis?: Zapis;
  onZmiana: (zapis: Zapis | null) => void;
  /** Treść zadania z odpowiedziami: na pełnym ekranie stoi nad płótnem. */
  tresc?: ReactNode;
  duzyRysunek?: boolean;
  dodatkoweRysunki?: Obraz[];
  opcjeZWycinka?: Obraz;
};

export function Brudnopis({ plik, zadanie, rysunek, zapis, onZmiana, tresc, duzyRysunek, dodatkoweRysunki, opcjeZWycinka }: Props) {
  const [tryb, setTryb] = useState<Tryb>(() => wczytajTryb(plik));
  const [pokazDodatkowe, setPokazDodatkowe] = useState(true);
  const otwarty = tryb !== "zamkniety";
  const pelny = tryb === "pelny";
  useEffect(() => zapiszTryb(plik, tryb), [plik, tryb]);
  useEffect(() => {
    const naPrzejscie = (e: Event) => {
      const cel = (e as CustomEvent<string>).detail;
      if (cel === plik) {
        setTryb("pelny");
        // Pod spodem strona przewija się do tego zadania, żeby po wyjściu być przy nim.
        document.getElementById(`zadanie-${zadanie}`)?.scrollIntoView({ block: "start" });
      } else setTryb((t) => (t === "pelny" ? "zamkniety" : t));
    };
    window.addEventListener(ZDARZENIE_PELNY, naPrzejscie);
    return () => window.removeEventListener(ZDARZENIE_PELNY, naPrzejscie);
  }, [plik, zadanie]);
  const elementow = zapis?.elementy.length ?? 0;

  // Pełny ekran: strona pod spodem się nie przewija, Escape wraca do zadania.
  useEffect(() => {
    if (!pelny) return;
    const naKlawisz = (e: KeyboardEvent) => e.key === "Escape" && setTryb("otwarty");
    const przewijanie = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", naKlawisz);
    return () => {
      document.documentElement.style.overflow = przewijanie;
      document.removeEventListener("keydown", naKlawisz);
    };
  }, [pelny]);

  if (!otwarty)
    return (
      <div className={styles.closed}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setTryb("otwarty")}
          data-tutor-about="Brudnopis to miejsce na obliczenia i szkice. W zadaniach zamkniętych nie wpływa na wynik, ale zapisuje się razem z odpowiedziami."
        >
          <PenLine size={16} aria-hidden="true" /> {rysunek ? "Brudnopis z rysunkiem" : "Brudnopis"}
        </button>
        {elementow > 0 && <span className="small muted">szkic zapisany</span>}
      </div>
    );

  return (
    <section
      className={pelny ? styles.fullscreen : styles.panel}
      aria-label={`Brudnopis do zadania ${zadanie}`}
      role={pelny ? "dialog" : undefined}
      aria-modal={pelny || undefined}
    >
      {/* Przy zmianie trybu edytor zostaje ten sam, więc szkic i historia cofania nie giną. */}
      {pelny && tresc && (
        <PokazDodatkoweRysunki.Provider value={setPokazDodatkowe}>
          <div className={styles.task}>{tresc}</div>
        </PokazDodatkoweRysunki.Provider>
      )}
      <Suspense fallback={<Ladowanie ksztalt="blok" etykieta="Wczytuję brudnopis" />}>
        <Edytor
          plik={plik}
          rysunek={rysunek}
          elementy={zapis?.elementy}
          onZapisz={(elementy) => onZmiana(elementy ? { elementy, zmieniony: new Date().toISOString() } : null)}
          pelny={pelny}
          duzyRysunek={duzyRysunek}
          dodatkoweRysunki={dodatkoweRysunki}
          opcjeZWycinka={opcjeZWycinka}
          // Poza pełnym ekranem płótno obejmuje całe zadanie, więc widać wszystkie rysunki.
          pokazDodatkowe={!pelny || pokazDodatkowe}
          onPelny={() => setTryb((t) => (t === "pelny" ? "otwarty" : "pelny"))}
          onZamknij={() => setTryb("zamkniety")}
        />
      </Suspense>
    </section>
  );
}
