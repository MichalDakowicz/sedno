// Pole na odpowiedź z zapisem matematycznym (MathLive): uczeń wpisuje przedziały,
// ułamki czy pierwiastki jak na kartce, bez znajomości LaTeX-a. Wartość to LaTeX,
// więc po sprawdzeniu odpowiedź renderuje się tym samym KaTeX-em co treść zadania.
// MathLive waży kilkaset kB, dlatego ładujemy go dopiero przy pierwszym polu.
import { createElement, useEffect, useRef, useState } from "react";
import styles from "./PoleMatematyczne.module.css";

type MathField = HTMLElement & { value: string; readOnly: boolean; placeholder: string };

let ladowanie: Promise<void> | null = null;
function zaladuj() {
  ladowanie ??= Promise.all([import("mathlive"), import("mathlive/fonts.css")]).then(([m]) => {
    // Fonty dokłada import CSS (Vite je serwuje), dźwięków klawiszy nie chcemy.
    m.MathfieldElement.fontsDirectory = null;
    m.MathfieldElement.soundsDirectory = null;
    m.MathfieldElement.locale = "pl";
  });
  return ladowanie;
}

type Props = {
  wartosc: string;
  onZmiana: (latex: string) => void;
  tylkoOdczyt?: boolean;
  etykieta: string;
  /** Na całą szerokość, jak pole odpowiedzi pod pytaniem. */
  szerokie?: boolean;
};

export function PoleMatematyczne({ wartosc, onZmiana, tylkoOdczyt, etykieta, szerokie }: Props) {
  const pole = useRef<MathField | null>(null);
  const [gotowe, setGotowe] = useState(false);
  const zmiana = useRef(onZmiana);
  zmiana.current = onZmiana;

  useEffect(() => {
    let zywe = true;
    zaladuj().then(() => zywe && setGotowe(true));
    return () => {
      zywe = false;
    };
  }, []);

  useEffect(() => {
    const el = pole.current;
    if (!gotowe || !el) return;
    const naWpis = () => zmiana.current(el.value);
    el.addEventListener("input", naWpis);
    return () => el.removeEventListener("input", naWpis);
  }, [gotowe]);

  // Wartość z zewnątrz (np. wczytany postęp) wpisujemy tylko, gdy się różni,
  // żeby nie przesuwać kursora podczas pisania.
  useEffect(() => {
    const el = pole.current;
    if (gotowe && el && el.value !== wartosc) el.value = wartosc;
  }, [gotowe, wartosc]);

  useEffect(() => {
    if (gotowe && pole.current) pole.current.readOnly = !!tylkoOdczyt;
  }, [gotowe, tylkoOdczyt]);

  const klasa = szerokie ? `${styles.pole} ${styles.szerokie}` : styles.pole;
  if (!gotowe) return <span className={`${klasa} ${styles.czeka}`} aria-hidden="true" />;
  return createElement("math-field", {
    // React 18 nie przekazuje className do własnych elementów, więc klasę dajemy w ref.
    ref: (el: MathField | null) => {
      pole.current = el;
      el?.classList.add(...klasa.split(" "));
    },
    "aria-label": etykieta,
    "math-virtual-keyboard-policy": "auto",
    "smart-fence": "on",
  });
}
