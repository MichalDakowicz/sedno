// „Potem” pod kartą dnia: dwa, trzy następne kroki z jednego planu (zaczęta runda, powtórki, polecenie Pestki),
// w tym samym stylu wierszy. Zastępuje osobne „Do powtórki”, „Dokończ” i link do powtórek, żeby na pytanie
// „co mam teraz robić” była jedna odpowiedź, a nie cztery listy z tymi samymi umiejętnościami.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, RotateCcw, Sparkles, Timer } from "lucide-react";
import type { Poziom } from "../../arkusze/typy";
import { adresRundy, adresStartu } from "../../nauka/adresy";
import { MINUTY_RUNDY, useDzisAngielski, usePolecenieDnia, type PropozycjaDnia } from "../../nauka/dzis";
import { useOtwarteRundy } from "../../nauka/stan";
import { useKolejkaPowtorek } from "./Powtorki";
import s from "./PlanDnia.module.css";

type Krok = { id: string; nazwa: string; opis: string; ikona: ReactNode } & ({ do: string } | { onClick: () => void });

export function PlanDnia({ poziom, maly = false }: { poziom: Poziom; maly?: boolean }) {
  // Ta sama propozycja co na karcie nad planem: jej kroku nie powtarzamy w „Potem”.
  const dzis: PropozycjaDnia | null = useDzisAngielski(poziom).dzis;
  const rundy = useOtwarteRundy(true);
  const powtorki = useKolejkaPowtorek(poziom);
  const polecenie = usePolecenieDnia(poziom);
  const kroki: Krok[] = [];

  // Najnowsza zaczęta runda, której nie ma już na karcie (ta sama umiejętność albo ta sama runda).
  const otwarta = rundy.dane?.sesje.find((x) => x.skill_id !== dzis?.skill_id && dzis?.akcja.do !== adresRundy(x.id));
  if (otwarta) {
    const nazwa = (otwarta.skill_id && rundy.dane?.nazwy.get(otwarta.skill_id)) || "Zaczęta runda";
    kroki.push({ id: "runda", nazwa: `Dokończ: ${nazwa}`, opis: "Wróć do pytania, na którym przerwano.", ikona: <Timer size={18} aria-hidden="true" />, do: adresRundy(otwarta.id) });
  }
  if (powtorki.ile > 0 && dzis?.rodzaj !== "powtorka")
    kroki.push({ id: "powtorki", nazwa: "Powtórz to, co ucieka", opis: `${powtorki.ile} do powtórki na dziś, po kolei.`, ikona: <RotateCcw size={18} aria-hidden="true" />, onClick: powtorki.zacznij });
  const p = polecenie.dane;
  if (p && p.skill_id !== dzis?.skill_id && p.skill_id !== otwarta?.skill_id)
    kroki.push({ id: "nowa", nazwa: `Nowa runda: ${p.nazwa}`, opis: `${MINUTY_RUNDY} min, ćwiczenie na teraz.`, ikona: <Sparkles size={18} aria-hidden="true" />, do: adresStartu(poziom, p.skill_id, p.format, p.repeat_id ?? undefined) });

  if (!kroki.length) return null;
  const tresc = (k: Krok) => (
    <>
      <span className={`wiersz-ikona ${s.ikona}`}>{k.ikona}</span>
      <span className="wiersz-tresc">
        <span className="h3">{k.nazwa}</span>
        <span className="wiersz-opis">{k.opis}</span>
      </span>
      <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
    </>
  );
  return (
    <section className={maly ? s.maly : s.plan} aria-labelledby="plan-potem">
      <h2 className={maly ? "label" : "h2"} id="plan-potem">Potem</h2>
      <ul className="wiersze">
        {kroki.slice(0, 3).map((k) => (
          <li key={k.id}>
            {"do" in k
              ? <Link to={k.do} className="wiersz">{tresc(k)}</Link>
              : <button type="button" className={`wiersz ${s.przycisk}`} onClick={k.onClick}>{tresc(k)}</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
