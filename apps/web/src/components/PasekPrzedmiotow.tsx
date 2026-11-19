// Wspólny pasek przedmiotów (pulpit, Nauka, mapa umiejętności, Powtórki): te same pigułki i ta sama animacja
// zaznaczenia, żeby przełączanie przedmiotu wyglądało wszędzie tak samo.
import type { ReactNode } from "react";
import { Plywak } from "./Plywak";
import s from "./PasekPrzedmiotow.module.css";

export function PasekPrzedmiotow({ etykieta, zalezy, children, ...reszta }: { etykieta: string; zalezy?: unknown; children: ReactNode } & Record<`data-${string}`, string>) {
  return (
    <nav className={s.subjectBar} aria-label={etykieta} {...reszta}>
      <Plywak zalezy={zalezy} />
      {children}
    </nav>
  );
}

/** Klasa pigułki przedmiotu; aktywna dostaje też data-aktywny, po którym ustawia się Plywak. */
export const klasaPrzedmiotu = (aktywny: boolean) => `${s.chip} ${aktywny ? s.chipActive : ""}`;
export const klasyPaska = s;
