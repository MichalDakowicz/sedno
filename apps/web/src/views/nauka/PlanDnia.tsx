// „Potem” pod kartą dnia: dwa do czterech następnych kroków z jednego planu. Kroki i powody wybiera Pestka
// (nauka/wyborPestki.ts); bez jej planu zaczęta runda, powtórki i polecenie z mapy, jak wcześniej. W tym samym stylu wierszy. Zastępuje osobne „Do powtórki”, „Dokończ” i link do powtórek, żeby na pytanie
// „co mam teraz robić” była jedna odpowiedź, a nie cztery listy z tymi samymi umiejętnościami.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, FileText, GraduationCap, MessagesSquare, RotateCcw, Sparkles, Timer } from "lucide-react";
import type { Poziom } from "../../arkusze/typy";
import { adresRundy, adresStartu } from "../../nauka/adresy";
import { MINUTY_RUNDY, useCoAngielski, usePolecenieDnia, type PropozycjaDnia, type WejscieDnia } from "../../nauka/dzis";
import { usePlanDnia } from "../../nauka/wyborPestki";
import { useOtwarteRundy } from "../../nauka/stan";
import { useKolejkaPowtorek } from "./Powtorki";
import { KartaDnia } from "../../components/KartaDnia";
import { useProfil } from "../../auth";
import type { PrzedmiotId } from "../../konto/przedmioty";
import { propozycja, useWynikiKonta } from "../../konto/wyniki";
import s from "./PlanDnia.module.css";

type Krok = { id: string; nazwa: string; opis: string; ikona: ReactNode } & ({ do: string } | { onClick: () => void });

const IKONY = { runda: Timer, arkusz: FileText, rozmowa: MessagesSquare, czapka: GraduationCap };

/**
 * pulpit: te same dane co karta „Dziś warto” na pulpicie albo w Nauce przy innym przedmiocie (wtedy plan jest wspólny);
 * bez niego plan angielskiego na danym poziomie, jak karta w Nauce.
 */
export function PlanDnia({ poziom, maly = false, pulpit }: { poziom: Poziom; maly?: boolean; pulpit?: WejscieDnia }) {
  const coAngielski = useCoAngielski(poziom);
  const we: WejscieDnia = pulpit ?? { co: coAngielski, angielski: true, zakres: "angielski" };
  // Ta sama propozycja co na karcie nad planem: jej kroku nie powtarzamy w „Potem”.
  const plan = usePlanDnia(we);
  const dzis: PropozycjaDnia | null = plan.dzis;
  const rundy = useOtwarteRundy(we.angielski);
  const powtorki = useKolejkaPowtorek(poziom, we.angielski);
  const polecenie = usePolecenieDnia(poziom, we.angielski);
  const kroki: Krok[] = [];

  if (plan.potem) {
    // Plan od Pestki: jej kolejność i powody; „Powtórz to, co ucieka” dalej startuje kolejkę i ma „Odłóż”.
    for (const k of plan.potem) {
      const Ikona = k.id === "powtorki" ? RotateCcw : IKONY[k.ikona];
      const ikona = <Ikona size={18} aria-hidden="true" />;
      kroki.push(k.id === "powtorki" && powtorki.ile > 0 ? { id: k.id, nazwa: k.nazwa, opis: k.opis, ikona, onClick: powtorki.zacznij } : { id: k.id, nazwa: k.nazwa, opis: k.opis, ikona, do: k.do });
    }
  } else if (we.angielski) {
    kroki.push(...krokiZRegul());
  }

  function krokiZRegul(): Krok[] {
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
    return kroki;
  }

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
    <section className={maly ? s.maly : s.plan} aria-labelledby="plan-potem" data-tutor={maly ? undefined : "potem"}>
      <h2 className={maly ? "label" : "h2"} id="plan-potem">Potem</h2>
      <ul className="wiersze">
        {kroki.slice(0, plan.potem ? 4 : 3).map((k) => (
          <li key={k.id} className={k.id === "powtorki" && powtorki.odloz ? s.zOdlozeniem : undefined}>
            {"do" in k
              ? <Link to={k.do} className="wiersz">{tresc(k)}</Link>
              : <button type="button" className={`wiersz ${s.przycisk}`} onClick={k.onClick}>{tresc(k)}</button>}
            {k.id === "powtorki" && powtorki.odloz && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void powtorki.odloz?.wykonaj()}>Odłóż {powtorki.odloz.nazwa}</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Nauka przy przedmiocie bez rund: karta dnia i „Potem” z planu Pestki dla tego przedmiotu, jak na pulpicie przedmiotu.
 * zapas: karta z coDzisBezRund, gdy planu nie ma (np. bez Pestki i bez arkuszy).
 */
/**
 * Ścieżki (bez query i hasha), które plan dnia już pokazuje: karta „Dziś warto” i „Potem”. „Inne sposoby” ich nie powtarzają.
 * Porównanie po ścieżce, więc „Dokończ arkusz” (/arkusze/…) nie ukrywa „Rozwiąż arkusz” (/arkusze).
 */
export function useZajeteSciezki(przedmiot: PrzedmiotId, poziom: Poziom): Set<string> {
  const profil = useProfil();
  const wyniki = useWynikiKonta(profil?.subjects ?? []);
  const coAngielski = useCoAngielski(poziom);
  const propozycje = wyniki ? wyniki.podsumowania.filter((p) => p.przedmiot.id === przedmiot).map((p) => propozycja(p, wyniki.wiersze)) : [];
  const co = propozycje.find((x) => x.rodzaj === "dokoncz") ?? propozycje.find((x) => x.rodzaj === "nowy") ?? propozycje[0];
  const we: WejscieDnia = przedmiot === "angielski" ? { co: coAngielski, angielski: true, zakres: "angielski" } : { co, angielski: false, zakres: przedmiot };
  const plan = usePlanDnia(we);
  const adresy = [plan.dzis?.akcja.do, ...(plan.potem ?? []).map((k) => k.do)];
  return new Set(adresy.flatMap((a) => (a ? [a.split(/[?#]/)[0]!] : [])));
}

export function DzisPrzedmiotu({ przedmiot, poziom, zapas, className }: { przedmiot: PrzedmiotId; poziom: Poziom; zapas: PropozycjaDnia; className?: string }) {
  const profil = useProfil();
  const wyniki = useWynikiKonta(profil?.subjects ?? []);
  const propozycje = wyniki ? wyniki.podsumowania.filter((p) => p.przedmiot.id === przedmiot).map((p) => propozycja(p, wyniki.wiersze)) : [];
  const co = propozycje.find((x) => x.rodzaj === "dokoncz") ?? propozycje.find((x) => x.rodzaj === "nowy") ?? propozycje[0];
  const we: WejscieDnia = { co, angielski: false, zakres: przedmiot };
  const { dzis } = usePlanDnia(we);
  return (
    <>
      <div className={className}>
        <KartaDnia dzis={dzis ?? zapas} />
      </div>
      <PlanDnia poziom={poziom} pulpit={we} />
    </>
  );
}
