import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTutor } from "./TutorContext";
import { poZmianieAdresu, poZmianieRozmiaru } from "./sterKsztaltu";
import s from "./Ksztalt.module.css";

// Zasłona pod panelem Pestki na węższym ekranie (sterowanie w sterKsztaltu.ts) i miejsce na panel na szerokim.
export function Ksztalt() {
  const { pathname } = useLocation();
  const { close } = useTutor();

  useLayoutEffect(() => {
    poZmianieAdresu(pathname === "/tutor");
  }, [pathname]);

  useEffect(() => {
    window.addEventListener("resize", poZmianieRozmiaru);
    return () => window.removeEventListener("resize", poZmianieRozmiaru);
  }, []);

  return <div className={s.zaslona} data-ksztalt="zaslona" onClick={close} aria-hidden="true" />;
}
