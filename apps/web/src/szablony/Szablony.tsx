import type { ComponentType } from "react";
import { Navigate, useParams } from "react-router-dom";
import { NaprawBlad } from "./napraw-blad/NaprawBlad";
import { WDROZONE } from "./lista";

export { Spis } from "./Spis";

const WIDOKI: Record<string, ComponentType> = {
  "napraw-blad": NaprawBlad,
};

export function SzablonWidok() {
  const { slug = "" } = useParams();
  const Widok = WIDOKI[slug];
  return Widok ? <Widok /> : <Navigate to={WDROZONE[slug]?.to ?? "/szablony"} replace />;
}
