// Tekst ze wzorami \( … \) i wzory blokowe. KaTeX dociąga się leniwie przy
// pierwszym wzorze; do tego czasu widać wzór uproszczony do zwykłego tekstu
// (ułamek „a/b”, „·” zamiast \cdot), a wzór blokowy ma zarezerwowane miejsce.
import { lazy, Suspense } from "react";
import styles from "./Wzory.module.css";

const modul = () => import("./Wzory");
const TekstLeniwy = lazy(() => modul().then((m) => ({ default: m.TekstZeWzorami })));
const WzorLeniwy = lazy(() => modul().then((m) => ({ default: m.Wzor })));

export const maWzory = (tekst: string) => tekst.includes("\\(");

/** Zaczyna pobierać KaTeX, zanim pierwszy wzór trafi na ekran (np. po wczytaniu arkusza ze wzorami). */
export const rozgrzejWzory = () => void modul();

const SYMBOLE: Record<string, string> = {
  cdot: "·", times: "×", div: ":", leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠", pm: "±", infty: "∞",
  alpha: "α", beta: "β", gamma: "γ", pi: "π", in: "∈", to: "→", ldots: "…", dots: "…", circ: "°", sqrt: "√",
};

// Czytelny zapis wzoru bez KaTeX: tylko na chwilę ładowania, więc wystarczą najczęstsze polecenia.
export function wzorTekstem(tex: string) {
  let t = tex.replace(/\\(displaystyle|left|right|big|Big|mathrm|text|mathbf|operatorname)\b/g, "");
  for (let i = 0; i < 4 && /\\frac/.test(t); i++) t = t.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
  t = t.replace(/\(([^()\s]{1,3})\)\//g, "$1/").replace(/\/\(([^()\s]{1,3})\)/g, "/$1");
  t = t.replace(/\\([a-zA-Z]+)/g, (_, n: string) => SYMBOLE[n] ?? "").replace(/\\[,;!: ]/g, " ");
  return t.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}

export function TekstMat({ tekst }: { tekst: string }) {
  if (!maWzory(tekst)) return <>{tekst}</>;
  return (
    <Suspense fallback={tekst.replace(/\\\((.*?)\\\)/gs, (_, w: string) => wzorTekstem(w))}>
      <TekstLeniwy tekst={tekst} />
    </Suspense>
  );
}

// Wzór blokowy przed załadowaniem KaTeX: puste miejsce mniej więcej tej wysokości, którą zajmie
// (wiersze klamry i ułamki), żeby treść pod nim nie skakała. Czytnik ekranu dostaje zapis tekstem.
function ZastepczyBlok({ tex }: { tex: string }) {
  const wiersze = Math.max(1, (tex.match(/\\\\/g)?.length ?? 0) + 1);
  const wysokosc = wiersze * (/\\frac/.test(tex) ? 2.6 : 1.6) + 0.5;
  return <span className={styles.zastepczy} style={{ minHeight: `${wysokosc}em` }} aria-label={wzorTekstem(tex)} role="img" />;
}

export function WzorMat({ tex, blok }: { tex: string; blok?: boolean }) {
  return (
    <Suspense fallback={blok ? <ZastepczyBlok tex={tex} /> : <span>{wzorTekstem(tex)}</span>}>
      <WzorLeniwy tex={tex} blok={blok} />
    </Suspense>
  );
}
