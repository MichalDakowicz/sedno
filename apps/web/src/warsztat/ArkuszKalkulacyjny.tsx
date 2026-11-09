// Arkusz kalkulacyjny do zadań, które na maturze robi się w Excelu albo LibreOffice Calc.
// FortuneSheet (MIT): komórki, formuły (nazwy funkcji po angielsku: SUM, COUNTIF, AVERAGEIF,
// VLOOKUP, IF…), sortowanie, filtr. Każdy plik danych z tabulatorami to osobny arkusz.
// Zmiany ucznia zapisujemy jako operacje FortuneSheet (onOp), a po powrocie odtwarzamy je na
// świeżo wczytanych danych; samych danych CKE nie zapisujemy w postępie.
// Wykres z zaznaczenia (Chart.js) zastępuje kreator wykresów z Excela.
import { memo, useEffect, useRef, useState } from "react";
import { Workbook, type WorkbookInstance } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";
import type { Op, Sheet } from "@fortune-sheet/core";
import { BarChart3, Download } from "lucide-react";
import { Chart, registerables, type ChartType } from "chart.js";
import { liczba, tabela } from "./tabele";
import styles from "./Warsztat.module.css";

Chart.register(...registerables);

type Props = {
  pliki: Record<string, string>; // tylko pliki z tabulatorami
  operacje?: Op[];
  onOperacje: (ops: Op[]) => void;
  // Zaznaczone komórki jako tekst (wiersze, komórki spacją) do wstawienia albo porównania z kluczem.
  onZaznaczenie: (tekst: string) => void;
};

const LIMIT_OPERACJI = 3000;

function arkusze(pliki: Record<string, string>): Sheet[] {
  return Object.entries(pliki).map(([plik, tresc], i) => {
    const t = tabela(plik, tresc);
    const wiersze = [t.naglowek, ...t.wiersze];
    const celldata = wiersze.flatMap((w, r) =>
      w.map((k, c) => {
        const tekst = (k ?? "").trim();
        const jestLiczba = r > 0 && t.liczbowe[c] && tekst !== "";
        // Pasek statystyk FortuneSheet liczy parseFloat(m), więc „9,8” dałoby 9: tekst wyświetlany musi mieć kropkę.
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

function ArkuszKalkulacyjny({ pliki, operacje, onOperacje, onZaznaczenie }: Props) {
  const ref = useRef<WorkbookInstance>(null);
  const zwrotne = useRef({ onOperacje, onZaznaczenie });
  zwrotne.current = { onOperacje, onZaznaczenie };
  // Zapis operacji przerenderowuje cały arkusz maturalny, więc idzie po sekundzie spokoju i przy zamknięciu.
  const zapis = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wyslij = () => {
    clearTimeout(zapis.current);
    zapis.current = undefined;
    zwrotne.current.onOperacje(ops.current);
  };
  useEffect(
    () => () => {
      if (zapis.current) wyslij();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  // Dane wczytujemy raz: nowe dane w Workbook to nowe arkusze i utrata zaznaczenia oraz zmian.
  const [dane] = useState(() => arkusze(pliki));
  const ops = useRef<Op[]>(operacje ?? []);
  const odtworzone = useRef(false);
  const [wykres, setWykres] = useState<{ etykiety: string[]; serie: { nazwa: string; dane: number[] }[] } | null>(null);

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

  const zaznaczenie = () => {
    const api = ref.current;
    const zakres = api?.getSelection()?.[0];
    if (!api || !zakres) return null;
    const komorki = api.getCellsByRange({ row: zakres.row, column: zakres.column });
    return komorki.map((w) => w.map((k) => (k?.m ?? k?.v ?? "") as string | number));
  };

  const doWykresu = () => {
    const wartosci = zaznaczenie();
    if (!wartosci?.length) return;
    // Pierwszy wiersz z tekstem to nazwy serii, pierwsza kolumna z tekstem to kategorie (jak w Excelu).
    const czyLiczba = (x: string | number) => x !== "" && !Number.isNaN(Number(String(x).replace(",", ".")));
    const naglowekSerii = wartosci[0].slice(1).some((x) => x !== "" && !czyLiczba(x)) || (wartosci.length > 1 && !czyLiczba(wartosci[0][wartosci[0].length - 1]));
    const kategorie = wartosci.slice(naglowekSerii ? 1 : 0).every((w) => w.length > 1 && !czyLiczba(w[0]));
    const wiersze = wartosci.slice(naglowekSerii ? 1 : 0);
    const odKolumny = kategorie ? 1 : 0;
    const serie = (wartosci[0] ?? []).slice(odKolumny).map((_, j) => ({
      nazwa: naglowekSerii ? String(wartosci[0][j + odKolumny]) : `Seria ${j + 1}`,
      dane: wiersze.map((w) => Number(String(w[j + odKolumny]).replace(",", ".")) || 0),
    }));
    setWykres({ etykiety: wiersze.map((w, i) => (kategorie ? String(w[0]) : String(i + 1))), serie });
  };

  const wstaw = () => {
    const wartosci = zaznaczenie();
    if (wartosci) zwrotne.current.onZaznaczenie(wartosci.map((w) => w.join(" ").trim()).join("\n"));
  };

  return (
    <div className={styles.narzedzie}>
      <div className={styles.arkusz}>
        <Workbook
          ref={ref}
          data={dane}
          lang="en"
          showToolbar
          showFormulaBar
          showSheetTabs
          toolbarItems={["undo", "redo", "|", "format", "font-size", "|", "bold", "italic", "|", "sort", "filter", "|", "merge-cell", "border", "|", "formula-sum"]}
          onOp={(nowe) => {
            ops.current = [...ops.current, ...nowe].slice(-LIMIT_OPERACJI);
            clearTimeout(zapis.current);
            zapis.current = setTimeout(wyslij, 1000);
          }}
        />
      </div>
      <div className={styles.akcje}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={doWykresu}>
          <BarChart3 size={15} aria-hidden="true" /> Wykres z zaznaczenia
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={wstaw}>
          Wynik z zaznaczenia
        </button>
        <span className="small muted">Formuły po angielsku: SUM, COUNTIF, AVERAGEIF, SUMIF, IF, VLOOKUP, YEAR, MONTH…</span>
      </div>
      {wykres && <Wykres {...wykres} />}
    </div>
  );
}


// Arkusz nie reaguje na rerender strony: dane wczytuje raz, a funkcje zwrotne bierze z refa.
export default memo(ArkuszKalkulacyjny, () => true);

const TYPY: { id: string; nazwa: string; typ: ChartType; stos?: boolean; poziomy?: boolean }[] = [
  { id: "kolumnowy", nazwa: "Kolumnowy", typ: "bar" },
  { id: "skumulowany", nazwa: "Kolumnowy skumulowany", typ: "bar", stos: true },
  { id: "slupkowy", nazwa: "Słupkowy", typ: "bar", poziomy: true },
  { id: "liniowy", nazwa: "Liniowy", typ: "line" },
  { id: "punktowy", nazwa: "Punktowy", typ: "scatter" },
  { id: "kolowy", nazwa: "Kołowy", typ: "pie" },
];
const KOLORY = ["#ff7448", "#2f55b4", "#17804f", "#8a5a00", "#9b3fb5", "#c2410c", "#0e7490", "#6b7280"];

function Wykres({ etykiety, serie }: { etykiety: string[]; serie: { nazwa: string; dane: number[] }[] }) {
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
