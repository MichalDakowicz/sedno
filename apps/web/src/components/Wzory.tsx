// Wzory LaTeX przez KaTeX. Moduł ładowany leniwie (TekstMat.tsx), bo KaTeX
// z fontami potrzebny jest tylko w arkuszach z matematyki.
import katex from "katex";
import "katex/dist/katex.min.css";
import { Fragment } from "react";
import styles from "./Wzory.module.css";

// Wynik KaTeX to HTML z escapowaną treścią; bez opcji „trust” nie przepuszcza
// linków ani dowolnych atrybutów, więc można go wstawić wprost.
function html(tex: string, blok: boolean) {
  // Ułamki w linii KaTeX zmniejsza; w arkuszu CKE (także w opcjach) są pełnej wielkości.
  const pelny = !blok && /\\frac/.test(tex) ? `\\displaystyle ${tex}` : tex;
  return katex.renderToString(pelny, { displayMode: blok, throwOnError: false, strict: "ignore", output: "htmlAndMathml" });
}

export function Wzor({ tex, blok }: { tex: string; blok?: boolean }) {
  return <span className={blok ? styles.blok : styles.inline} dangerouslySetInnerHTML={{ __html: html(tex, !!blok) }} />;
}

export function TekstZeWzorami({ tekst }: { tekst: string }) {
  const czesci = tekst.split(/\\\((.*?)\\\)/s);
  return (
    <>
      {czesci.map((c, i) => (i % 2 ? <Wzor key={i} tex={c} /> : <Fragment key={i}>{c}</Fragment>))}
    </>
  );
}
