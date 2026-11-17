import type { ComponentType } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Nauka } from "./nauka/Nauka";
import { NaprawBlad } from "./napraw-blad/NaprawBlad";
import { UczenUczy } from "./uczen-uczy/UczenUczy";
import { KrokPoKroku } from "./krok-po-kroku/KrokPoKroku";
import { Sokratejski } from "./sokratejski/Sokratejski";
import { SzybkaRunda } from "./szybka-runda/SzybkaRunda";
import { Wizualizacje } from "./wizualizacje/Wizualizacje";
import { Rozbior } from "./rozbior/Rozbior";
import { Umiejetnosci } from "./umiejetnosci/Umiejetnosci";
import { Powtorki } from "./powtorki/Powtorki";
import { MapaWiedzy } from "./mapa-wiedzy/MapaWiedzy";
import { DoMatury } from "./do-matury/DoMatury";
import { Zdjecie } from "./zdjecie/Zdjecie";
import { Wyszukiwanie } from "./wyszukiwanie/Wyszukiwanie";
import { UkladPulpitu } from "./uklad-pulpitu/UkladPulpitu";

export { Nauka, Umiejetnosci, Powtorki };
export { Spis } from "./Spis";

const WIDOKI: Record<string, ComponentType> = {
  nauka: Nauka,
  "napraw-blad": NaprawBlad,
  "uczen-uczy": UczenUczy,
  "krok-po-kroku": KrokPoKroku,
  sokratejski: Sokratejski,
  "szybka-runda": SzybkaRunda,
  wizualizacje: Wizualizacje,
  rozbior: Rozbior,
  umiejetnosci: Umiejetnosci,
  powtorki: Powtorki,
  "mapa-wiedzy": MapaWiedzy,
  "do-matury": DoMatury,
  zdjecie: Zdjecie,
  wyszukiwanie: Wyszukiwanie,
  "uklad-pulpitu": UkladPulpitu,
};

export function SzablonWidok() {
  const { slug = "" } = useParams();
  const Widok = WIDOKI[slug];
  return Widok ? <Widok /> : <Navigate to="/szablony" replace />;
}
