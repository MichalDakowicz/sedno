import { KartaDnia } from "../../components/KartaDnia";
import { Ladowanie } from "../../components/Ladowanie";
import { useDzis } from "../../nauka/dzis";
import type { KontekstPulpitu } from "./widgety";

// Propozycja dnia na pulpicie: ta sama co w Nauce i w Powtórkach (nauka/dzis.ts).
export function Dzis({ co, aktywny, zakres }: KontekstPulpitu) {
  const angielski = aktywny ? aktywny === "angielski" : zakres.some((s) => s.przedmiot.id === "angielski");
  const { stan, dzis } = useDzis({ co, angielski });
  if (stan === "ladowanie") return <Ladowanie ksztalt="blok" etykieta="Dobieram ćwiczenie na dziś" />;
  return dzis ? <KartaDnia dzis={dzis} zPrzedmiotem={!aktywny} /> : null;
}
