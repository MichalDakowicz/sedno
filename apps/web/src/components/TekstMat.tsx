// Tekst ze wzorami \( … \) i wzory blokowe. KaTeX dociąga się leniwie przy
// pierwszym wzorze; do tego czasu widać surowy zapis wzoru.
import { lazy, Suspense } from "react";

const TekstLeniwy = lazy(() => import("./Wzory").then((m) => ({ default: m.TekstZeWzorami })));
const WzorLeniwy = lazy(() => import("./Wzory").then((m) => ({ default: m.Wzor })));

export const maWzory = (tekst: string) => tekst.includes("\\(");

export function TekstMat({ tekst }: { tekst: string }) {
  if (!maWzory(tekst)) return <>{tekst}</>;
  return (
    <Suspense fallback={tekst.replace(/\\\((.*?)\\\)/gs, "$1")}>
      <TekstLeniwy tekst={tekst} />
    </Suspense>
  );
}

export function WzorMat({ tex, blok }: { tex: string; blok?: boolean }) {
  return (
    <Suspense fallback={<code>{tex}</code>}>
      <WzorLeniwy tex={tex} blok={blok} />
    </Suspense>
  );
}
