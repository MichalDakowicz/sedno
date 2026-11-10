// Arkusz kalkulacyjny do zadań, które na maturze robi się w Excelu albo LibreOffice Calc.
// FortuneSheet (MIT): komórki, formuły (nazwy funkcji po angielsku: SUM, COUNTIF, AVERAGEIF,
// VLOOKUP, IF…), sortowanie, filtr. Każdy plik danych z tabulatorami to osobny arkusz.
// Zmiany ucznia zapisujemy jako operacje FortuneSheet (onOp), a po powrocie odtwarzamy je na
// świeżo wczytanych danych; samych danych CKE nie zapisujemy w postępie.
// Wynik i wykres z zaznaczenia to osobne widoki obok siatki (Skoroszyt.tsx); ten plik tylko zgłasza zaznaczenie.
import { memo, useEffect, useRef, useState } from "react";
import { Workbook, type WorkbookInstance } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";
import type { Op, Sheet } from "@fortune-sheet/core";
import { Download } from "lucide-react";
import { Chart, registerables, type ChartType } from "chart.js";
import { liczba, tabela } from "./tabele";
import { polskieEtykiety } from "./polski";
import styles from "./Warsztat.module.css";

Chart.register(...registerables);
polskieEtykiety();

// Zaznaczony zakres: wartości jako tekst do wstawienia (liczby z przecinkiem), same liczby do statystyk.
export type Zaznaczenie = { zakres: string; wiersze: number; kolumny: number; wartosci: (string | number)[][]; liczby: number[] };

type Props = {
  pliki: Record<string, string>; // tylko pliki z tabulatorami
  operacje?: Op[];
  onOperacje: (ops: Op[]) => void;
  // Zmiana czeka na zapis (onOperacje idzie po sekundzie spokoju).
  onZmiana?: () => void;
  // Aktualne zaznaczenie (null, gdy nic nie zaznaczono).
  onZaznaczenie: (z: Zaznaczenie | null) => void;
};

const LIMIT_OPERACJI = 3000;

const kol = (n: number) => {
  let s = "";
  for (let i = n + 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

export const polskaLiczba = (x: number) => String(Number(x.toPrecision(12))).replace(".", ",");

function arkusze(pliki: Record<string, string>): Sheet[] {
  return Object.entries(pliki).map(([plik, tresc], i) => {
    const t = tabela(plik, tresc);
    const wiersze = [t.naglowek, ...t.wiersze];
    const celldata = wiersze.flatMap((w, r) =>
      w.map((k, c) => {
        const tekst = (k ?? "").trim();
        const jestLiczba = r > 0 && t.liczbowe[c] && tekst !== "";
        // Komórka liczbowa ma v liczbą (formuły i sortowanie), a m z kropką: wbudowany pasek statystyk FortuneSheet
        // liczy parseFloat(m). Zaznaczenie pokazujemy własnym paskiem z v i przecinkiem (Skoroszyt.tsx).
        return { r, c, v: jestLiczba ? { v: liczba(tekst), m: String(liczba(tekst)), ct: { fa: "General", t: "n" } } : { v: tekst, m: tekst, ct: { fa: "@", t: "s" } } };
      }),
    );
    return {
      name: plik.replace(/\.txt$/i, ""),
      id: `arkusz-${i}`,
      order: i,
      celldata,
      row: Math.max(wiersze.length + 50, 100),
      column: Math.max(t.naglowek.length + 10, 26),
      // Nagłówek zamrożony jak po „Zablokuj okienka” w Excelu.
      frozen: { type: "row" },
      config: {},
    } as Sheet;
  });
}

function ArkuszKalkulacyjny({ pliki, operacje, onOperacje, onZmiana, onZaznaczenie }: Props) {
  const ref = useRef<WorkbookInstance>(null);
  const obudowa = useRef<HTMLDivElement>(null);
  const zwrotne = useRef({ onOperacje, onZmiana, onZaznaczenie });
  zwrotne.current = { onOperacje, onZmiana, onZaznaczenie };
  // Zapis operacji przerenderowuje cały arkusz maturalny, więc idzie po sekundzie spokoju i przy zamknięciu.
  const zapis = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wyslij = () => {
    clearTimeout(zapis.current);
    zapis.current = undefined;
    zwrotne.current.onOperacje(ops.current);
  };
  const odczyt = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(odczyt.current);
      if (zapis.current) wyslij();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  // Dane wczytujemy raz: nowe dane w Workbook to nowe arkusze i utrata zaznaczenia oraz zmian.
  const [dane] = useState(() => arkusze(pliki));
  const ops = useRef<Op[]>(operacje ?? []);
  const odtworzone = useRef(false);

  // Po pierwszym renderze odtwarzamy zapisane zmiany ucznia.
  useEffect(() => {
    if (odtworzone.current || !ref.current) return;
    odtworzone.current = true;
    if (ops.current.length) {
      try {
        ref.current.applyOp(ops.current);
      } catch {
        // Operacje z innej wersji danych: zaczynamy od czystego arkusza.
        ops.current = [];
        zwrotne.current.onOperacje([]);
      }
    }
  });

  // Siatka liczy rozmiar tylko przy zdarzeniu resize okna, a panel zmienia szerokość i wysokość bez niego
  // (uchwyt, pełny ekran, zmiana okna): każdą zmianę kontenera zamieniamy na takie zdarzenie.
  useEffect(() => {
    const el = obudowa.current;
    if (!el) return;
    let klatka = 0;
    const obserwator = new ResizeObserver(() => {
      cancelAnimationFrame(klatka);
      klatka = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    });
    obserwator.observe(el);
    return () => {
      cancelAnimationFrame(klatka);
      obserwator.disconnect();
    };
  }, []);

  // Zaznaczenie odczytujemy z krótkim opóźnieniem: przeciąganie myszą zmienia je w każdej klatce.
  const odczytaj = () => {
    clearTimeout(odczyt.current);
    odczyt.current = setTimeout(() => {
      const api = ref.current;
      const zakres = api?.getSelection()?.[0];
      if (!api || !zakres) return zwrotne.current.onZaznaczenie(null);
      const komorki = api.getCellsByRange({ row: zakres.row, column: zakres.column });
      const liczby: number[] = [];
      const wartosci = komorki.map((w) =>
        w.map((k) => {
          if (typeof k?.v === "number") {
            liczby.push(k.v);
            return polskaLiczba(k.v);
          }
          return (k?.m ?? k?.v ?? "") as string | number;
        }),
      );
      const [r1, r2] = zakres.row;
      const [c1, c2] = zakres.column;
      const od = `${kol(c1)}${r1 + 1}`;
      zwrotne.current.onZaznaczenie({ zakres: r1 === r2 && c1 === c2 ? od : `${od}:${kol(c2)}${r2 + 1}`, wiersze: r2 - r1 + 1, kolumny: c2 - c1 + 1, wartosci, liczby });
    }, 120);
  };

  return (
    <div ref={obudowa} className={styles.arkuszObudowa}>
      <Workbook
        ref={ref}
        data={dane}
        lang="en"
        showToolbar
        showFormulaBar
        showSheetTabs
        toolbarItems={["undo", "redo", "|", "format", "font-size", "|", "bold", "italic", "|", "sort", "filter", "|", "merge-cell", "border", "|", "formula-sum"]}
        hooks={{ afterSelectionChange: odczytaj }}
        onOp={(nowe) => {
          ops.current = [...ops.current, ...nowe].slice(-LIMIT_OPERACJI);
          clearTimeout(zapis.current);
          zapis.current = setTimeout(wyslij, 1000);
          zwrotne.current.onZmiana?.();
          // Wynik formuły albo sortowania zmienia to, co jest zaznaczone.
          odczytaj();
        }}
      />
    </div>
  );
}

// Arkusz nie reaguje na rerender strony: dane wczytuje raz, a funkcje zwrotne bierze z refa.
export default memo(ArkuszKalkulacyjny, () => true);

export type DaneWykresu = { etykiety: string[]; serie: { nazwa: string; dane: number[] }[] };

// Pierwszy wiersz z tekstem to nazwy serii, pierwsza kolumna z tekstem to kategorie (jak w Excelu).
export function daneWykresu(wartosci: (string | number)[][]): DaneWykresu | null {
  if (!wartosci.length) return null;
  const czyLiczba = (x: string | number) => x !== "" && !Number.isNaN(Number(String(x).replace(",", ".")));
  const naglowekSerii = wartosci[0].slice(1).some((x) => x !== "" && !czyLiczba(x)) || (wartosci.length > 1 && !czyLiczba(wartosci[0][wartosci[0].length - 1]));
  const wiersze = wartosci.slice(naglowekSerii ? 1 : 0);
  const kategorie = wiersze.every((w) => w.length > 1 && !czyLiczba(w[0]));
  const odKolumny = kategorie ? 1 : 0;
  const serie = (wartosci[0] ?? []).slice(odKolumny).map((_, j) => ({
    nazwa: naglowekSerii ? String(wartosci[0][j + odKolumny]) : `Seria ${j + 1}`,
    dane: wiersze.map((w) => Number(String(w[j + odKolumny]).replace(",", ".")) || 0),
  }));
  if (!serie.length || !wiersze.length) return null;
  return { etykiety: wiersze.map((w, i) => (kategorie ? String(w[0]) : String(i + 1))), serie };
}

const TYPY: { id: string; nazwa: string; typ: ChartType; stos?: boolean; poziomy?: boolean }[] = [
  { id: "kolumnowy", nazwa: "Kolumnowy", typ: "bar" },
  { id: "skumulowany", nazwa: "Kolumnowy skumulowany", typ: "bar", stos: true },
  { id: "slupkowy", nazwa: "Słupkowy", typ: "bar", poziomy: true },
  { id: "liniowy", nazwa: "Liniowy", typ: "line" },
  { id: "punktowy", nazwa: "Punktowy", typ: "scatter" },
  { id: "kolowy", nazwa: "Kołowy", typ: "pie" },
];
const KOLORY = ["#ff7448", "#2f55b4", "#17804f", "#8a5a00", "#9b3fb5", "#c2410c", "#0e7490", "#6b7280"];

export function Wykres({ etykiety, serie }: DaneWykresu) {
  const plotno = useRef<HTMLCanvasElement>(null);
  const [typ, setTyp] = useState("kolumnowy");
  const [tytul, setTytul] = useState("");
  const [osX, setOsX] = useState("");
  const [osY, setOsY] = useState("");
  const wykres = useRef<Chart | null>(null);

  useEffect(() => {
    const t = TYPY.find((x) => x.id === typ)!;
    wykres.current?.destroy();
    const kolowy = t.typ === "pie";
    wykres.current = new Chart(plotno.current!, {
      type: t.typ,
      data: {
        labels: etykiety,
        datasets: (kolowy ? serie.slice(0, 1) : serie).map((s, i) => ({
          label: s.nazwa,
          data: t.typ === "scatter" ? s.dane.map((y, j) => ({ x: Number(etykiety[j]) || j + 1, y })) : s.dane,
          backgroundColor: kolowy ? etykiety.map((_, j) => KOLORY[j % KOLORY.length]) : KOLORY[i % KOLORY.length],
          borderColor: KOLORY[i % KOLORY.length],
        })),
      },
      options: {
        indexAxis: t.poziomy ? "y" : "x",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { title: { display: !!tytul, text: tytul }, legend: { display: serie.length > 1 || kolowy } },
        scales: kolowy
          ? {}
          : {
              x: { stacked: !!t.stos, title: { display: !!osX, text: osX } },
              y: { stacked: !!t.stos, title: { display: !!osY, text: osY } },
            },
      },
    });
    return () => wykres.current?.destroy();
  }, [typ, tytul, osX, osY, etykiety, serie]);

  const pobierz = () => {
    const a = Object.assign(document.createElement("a"), { href: plotno.current!.toDataURL("image/png"), download: "wykres.png" });
    a.click();
  };

  return (
    <div className={styles.wykres}>
      <div className={styles.karty} role="tablist" aria-label="Rodzaj wykresu">
        {TYPY.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={typ === t.id} className={styles.karta} onClick={() => setTyp(t.id)}>
            {t.nazwa}
          </button>
        ))}
      </div>
      <div className={styles.opisyWykresu}>
        <input value={tytul} onChange={(e) => setTytul(e.target.value)} placeholder="Tytuł wykresu" aria-label="Tytuł wykresu" />
        <input value={osX} onChange={(e) => setOsX(e.target.value)} placeholder="Opis osi X" aria-label="Opis osi X" />
        <input value={osY} onChange={(e) => setOsY(e.target.value)} placeholder="Opis osi Y" aria-label="Opis osi Y" />
      </div>
      <div className={styles.plotno}>
        <canvas ref={plotno} />
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={pobierz}>
        <Download size={15} aria-hidden="true" /> Pobierz wykres (PNG)
      </button>
    </div>
  );
}
