import type { ComponentType } from "react";
import { Navigate, useParams } from "react-router-dom";
import { NaprawBlad } from "./napraw-blad/NaprawBlad";
import { KrokPoKroku } from "./krok-po-kroku/KrokPoKroku";
import { Wizualizacje } from "./wizualizacje/Wizualizacje";
import { MapaWiedzy } from "./mapa-wiedzy/MapaWiedzy";
import { WDROZONE } from "./lista";

export { Spis } from "./Spis";

const WIDOKI: Record<string, ComponentType> = {
  "napraw-blad": NaprawBlad,
  "krok-po-kroku": KrokPoKroku,
  wizualizacje: Wizualizacje,
  "mapa-wiedzy": MapaWiedzy,
};

export function SzablonWidok() {
  const { slug = "" } = useParams();
  const Widok = WIDOKI[slug];
  return Widok ? <Widok /> : <Navigate to={WDROZONE[slug]?.to ?? "/szablony"} replace />;
}
