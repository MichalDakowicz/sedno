import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTutor } from "./TutorContext";
import { poZmianieAdresu, poZmianieRozmiaru } from "./sterKsztaltu";
import s from "./Ksztalt.module.css";

// Warstwa kształtu nawigacji (sterowanie w sterKsztaltu.ts): tło paska i panelu z wklęsłymi rogami pod jednym cieniem,
// scena, która przy przejściu na pełny ekran rozlewa się na całą stronę, i zasłona pod panelem na węższym ekranie.
export function Ksztalt() {
  const { pathname } = useLocation();
  const { close } = useTutor();
  const pierwszy = useRef(true);

  useLayoutEffect(() => {
    poZmianieAdresu(pathname === "/tutor", pierwszy.current);
    pierwszy.current = false;
  }, [pathname]);

  useEffect(() => {
    window.addEventListener("resize", poZmianieRozmiaru);
    return () => window.removeEventListener("resize", poZmianieRozmiaru);
  }, []);

  return (
    <>
      <div className={s.zaslona} data-ksztalt="zaslona" onClick={close} aria-hidden="true" />
      <div className={s.scena} data-ksztalt="scena" aria-hidden="true" />
      <div className={s.warstwa} data-ksztalt="warstwa" aria-hidden="true">
        <div className={s.tlo} data-ksztalt="tlo-pasek" />
        <div className={s.wnek} data-ksztalt="w-gora" />
        <div className={s.tlo} data-ksztalt="tlo-bok" />
        <div className={s.wnek} data-ksztalt="w-styk" />
        <div className={s.wnek} data-ksztalt="w-dol" />
      </div>
    </>
  );
}
