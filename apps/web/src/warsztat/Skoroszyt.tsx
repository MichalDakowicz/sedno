// Skoroszyt: arkusz kalkulacyjny jako zakładka panelu, z wynikiem i wykresem z zaznaczenia obok siatki.
// FortuneSheet podpina klawiaturę, schowek i mysz na całym dokumencie, więc zamontowany przy schowanym
// panelu albo na innej zakładce przejmowałby pisanie w innych polach. Montujemy go tylko, gdy panel jest
// otwarty na tej zakładce; po powrocie zmiany odtwarzamy z zapisanych operacji (stan zostaje, tracimy tylko
// zaznaczenie i przewinięcie).
import { lazy, Suspense, useRef, useState } from "react";
import { BarChart3, Check, CircleAlert, Loader2, MousePointerSquareDashed } from "lucide-react";
import { useStanZapisu, type StanZapisu } from "../arkusze/postep";
import { Wstaw, ZgodnoscZKluczem, type Klucz } from "./Narzedzia";
import type { DaneWykresu, Zaznaczenie } from "./ArkuszKalkulacyjny";
import styles from "./Warsztat.module.css";

const ArkuszKalkulacyjny = lazy(() => import("./ArkuszKalkulacyjny"));
const Wykres = lazy(() => import("./ArkuszKalkulacyjny").then((m) => ({ default: m.Wykres })));

type Props = {
  nr: number;
  pliki: Record<string, string>;
  operacje?: unknown[];
  onOperacje: (o: unknown[]) => void;
  doWstawienia: string[];
  onWstaw: (nr: string, tekst: string) => void;
  klucz: Klucz;
  // Panel jest otwarty (a nie tylko zamontowany): tylko wtedy siatka żyje.
  aktywny: boolean;
  // Panel na całym ekranie: wynik z zaznaczenia przechodzi do kolumny obok siatki.
  pelny?: boolean;
};

const STAN: Record<StanZapisu, { tekst: string; opis: string }> = {
  zapisywanie: { tekst: "Zapisuję…", opis: "Zmiany są już w tej przeglądarce, trwa zapis w postępie konta." },
  zapisano: { tekst: "Zapisano", opis: "Zmiany są zapisane w tej przeglądarce i w postępie konta." },
  lokalnie: { tekst: "Zapisano w tej przeglądarce", opis: "Nie jesteś zalogowany: zmiany są tylko w tej przeglądarce." },
  blad: { tekst: "Nie udało się zapisać", opis: "Zapis się nie udał (brak sieci albo miejsca w przeglądarce). Zmiany są tylko w otwartej karcie, nie zamykaj jej." },
};

export function Skoroszyt({ nr, pliki, operacje, onOperacje, doWstawienia, onWstaw, klucz, aktywny, pelny }: Props) {
  const [zaznaczenie, setZaznaczenie] = useState<Zaznaczenie | null>(null);
  const [oczekuje, setOczekuje] = useState(false);
  const stanKonta = useStanZapisu();
  // Siatka zna tylko wartości z chwili montowania (memo), więc funkcje zwrotne idą przez ref.
  const zwrotne = useRef(onOperacje);
  zwrotne.current = onOperacje;
  const ostatnie = useRef<unknown[] | undefined>(operacje);
  ostatnie.current = operacje;

  const stan: StanZapisu = oczekuje ? "zapisywanie" : stanKonta;
  const ikona = stan === "zapisano" || stan === "lokalnie" ? <Check size={14} aria-hidden="true" /> : stan === "blad" ? <CircleAlert size={14} aria-hidden="true" /> : <Loader2 size={14} className={styles.kreci} aria-hidden="true" />;
  const nazwy = Object.keys(pliki);

  return (
    <div className={styles.skoroszyt} data-pelny={pelny || undefined}>
      <div className={styles.skoroszytInfo}>
        <div className={styles.skoroszytNazwa}>
          <strong>Skoroszyt do zadania {nr}</strong>
          <span className={styles.zapis} data-stan={stan} role="status" title={STAN[stan].opis}>
            {ikona} {STAN[stan].tekst}
          </span>
        </div>
        <p className="small muted">
          Dane: <span className={styles.nazwyPlikow}>{nazwy.join(", ")}</span> (każdy plik to osobny arkusz). Zmiany zapisują się w tej przeglądarce i w postępie konta, po powrocie wrócisz do tej samej wersji.
        </p>
      </div>
      <div className={styles.skoroszytSiatka}>
        {aktywny ? (
          <Suspense fallback={<div className={styles.arkuszObudowa} aria-busy="true" />}>
            <ArkuszKalkulacyjny
              pliki={pliki}
              operacje={(ostatnie.current ?? []) as never}
              onOperacje={(o) => {
                setOczekuje(false);
                zwrotne.current(o);
              }}
              onZmiana={() => setOczekuje(true)}
              onZaznaczenie={setZaznaczenie}
            />
          </Suspense>
        ) : null}
      </div>
      <Wynik zaznaczenie={aktywny ? zaznaczenie : null} doWstawienia={doWstawienia} onWstaw={onWstaw} klucz={klucz} />
    </div>
  );
}

const PODGLAD_WIERSZY = 6;
const PODGLAD_ZNAKOW = 90;
const liczba = (x: number) => x.toLocaleString("pl-PL", { maximumFractionDigits: 6 });

function Wynik({ zaznaczenie, doWstawienia, onWstaw, klucz }: { zaznaczenie: Zaznaczenie | null; doWstawienia: string[]; onWstaw: (nr: string, tekst: string) => void; klucz: Klucz }) {
  const [karta, setKarta] = useState<"wynik" | "wykres">("wynik");
  const [wykres, setWykres] = useState<{ dane: DaneWykresu; zakres: string } | null>(null);
  const [bladWykresu, setBladWykresu] = useState(false);

  const utworz = async () => {
    if (!zaznaczenie) return;
    const { daneWykresu } = await import("./ArkuszKalkulacyjny");
    const dane = daneWykresu(zaznaczenie.wartosci);
    setBladWykresu(!dane);
    if (dane) setWykres({ dane, zakres: zaznaczenie.zakres });
  };

  const tekst = zaznaczenie ? zaznaczenie.wartosci.map((w) => w.join(" ").trim()).join("\n") : "";
  const l = zaznaczenie?.liczby ?? [];
  const suma = l.reduce((a, b) => a + b, 0);
  const wiersze = zaznaczenie?.wartosci ?? [];
  const podglad = wiersze.slice(0, PODGLAD_WIERSZY).map((w) => {
    const t = w.join("  ");
    return t.length > PODGLAD_ZNAKOW ? `${t.slice(0, PODGLAD_ZNAKOW)}…` : t;
  });

  return (
    <div className={styles.wynik}>
      <div className={styles.karty} role="tablist" aria-label="Wynik z zaznaczenia">
        <button type="button" role="tab" aria-selected={karta === "wynik"} className={styles.karta} onClick={() => setKarta("wynik")}>
          Wynik
        </button>
        <button type="button" role="tab" aria-selected={karta === "wykres"} className={styles.karta} onClick={() => setKarta("wykres")}>
          <BarChart3 size={14} aria-hidden="true" /> Wykres
        </button>
      </div>

      {!zaznaczenie && (
        <p className={`small muted ${styles.wskazowka}`}>
          <MousePointerSquareDashed size={16} aria-hidden="true" />
          <span>
            Zaznacz dane w siatce: przeciągnij myszą od pierwszej do ostatniej komórki albo kliknij literę kolumny. {karta === "wykres" ? "Do wykresu zaznacz też nagłówki kolumn (nazwy serii)." : "Zaznaczone wartości wstawisz do odpowiedzi."}
          </span>
        </p>
      )}

      {zaznaczenie && karta === "wynik" && (
        <>
          <p className={styles.zakres}>
            <strong>{zaznaczenie.zakres}</strong>
            <span className="small muted">
              {" "}
              · {zaznaczenie.wiersze} × {zaznaczenie.kolumny} komórek
            </span>
          </p>
          {l.length > 0 && (
            <dl className={styles.statystyki} aria-label="Statystyki zaznaczenia">
              {[
                ["Liczba", l.length],
                ["Suma", suma],
                ["Średnia", suma / l.length],
                ["Min", Math.min(...l)],
                ["Max", Math.max(...l)],
              ].map(([n, v]) => (
                <div key={n}>
                  <dt>{n}</dt>
                  <dd>{typeof v === "number" ? liczba(v) : v}</dd>
                </div>
              ))}
            </dl>
          )}
          <pre className={styles.podglad} aria-label="Podgląd zaznaczenia">
            {podglad.join("\n") || "(puste komórki)"}
            {wiersze.length > PODGLAD_WIERSZY && `\n… i jeszcze ${wiersze.length - PODGLAD_WIERSZY} wierszy`}
          </pre>
          <ZgodnoscZKluczem wyjscie={tekst} klucz={klucz} />
          <Wstaw tekst={tekst} doWstawienia={doWstawienia} onWstaw={onWstaw} />
        </>
      )}

      {karta === "wykres" && (
        <>
          <div className={styles.akcje}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={utworz} disabled={!zaznaczenie}>
              <BarChart3 size={15} aria-hidden="true" /> Wykres z zaznaczenia{zaznaczenie ? ` (${zaznaczenie.zakres})` : ""}
            </button>
            {bladWykresu && <span className="small muted">W zaznaczeniu nie ma liczb do wykresu.</span>}
          </div>
          {wykres && (
            <>
              <p className="small muted">Wykres z zakresu {wykres.zakres}. Nie wstawia się do odpowiedzi: pobierz go jako obraz.</p>
              <Suspense fallback={<div aria-busy="true" />}>
                <Wykres {...wykres.dane} />
              </Suspense>
            </>
          )}
        </>
      )}
    </div>
  );
}
