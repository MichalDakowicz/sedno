import { KartaDnia } from "../../components/KartaDnia";
import { Ladowanie } from "../../components/Ladowanie";
import { useDzis, type WejscieDnia } from "../../nauka/dzis";
import type { KontekstPulpitu } from "./widgety";

/** Dane planu dnia na pulpicie: karta i „Potem” biorą te same, więc pokazują jeden plan. */
export const wejsciePulpitu = ({ co, aktywny, zakres }: Pick<KontekstPulpitu, "co" | "aktywny" | "zakres">): WejscieDnia => ({
  co,
  angielski: aktywny ? aktywny === "angielski" : zakres.some((s) => s.przedmiot.id === "angielski"),
  zakres: aktywny ?? null,
});

// Propozycja dnia na pulpicie: ta sama co w Nauce i w Powtórkach (nauka/dzis.ts, wybór Pestki w nauka/wyborPestki.ts).
export function Dzis(kontekst: KontekstPulpitu) {
  const { stan, dzis } = useDzis(wejsciePulpitu(kontekst));
  const { aktywny } = kontekst;
  if (stan === "ladowanie") return <Ladowanie ksztalt="blok" wysokosc={[324, 388]} etykieta="Dobieram ćwiczenie na dziś" />;
  return dzis ? <KartaDnia dzis={dzis} zPrzedmiotem={!aktywny} /> : null;
}
