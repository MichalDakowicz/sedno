// Pestka zamiast szarego stanu: twarz w emocji pasującej do sytuacji, jedno zdanie z glos.ts i najwyżej jedno działanie.
// Wspólne dla pustych stanów, błędów sieci, strony nieznanego adresu i dłuższego wczytywania. Twarz jest ozdobą,
// zdanie czyta czytnik ekranu; komponent nie zabiera fokusu.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { TutorAvatar, type AvatarState } from "./TutorAvatar";
import s from "./StanPestki.module.css";

type Akcja = { etykieta: string; do: string } | { etykieta: string; onClick: () => void };

export function StanPestki({ emocja = "idle", tekst, akcja, rola, rozmiar = "zwykly", children }: {
  emocja?: AvatarState;
  tekst: string;
  akcja?: Akcja;
  /** alert dla błędu, status dla wczytywania; pusty stan bez roli. */
  rola?: "alert" | "status";
  rozmiar?: "maly" | "zwykly" | "duzy";
  children?: ReactNode;
}) {
  const twarz = rozmiar === "duzy" ? 96 : rozmiar === "maly" ? 32 : 48;
  return (
    <div className={s.stan} data-rozmiar={rozmiar}>
      <TutorAvatar size={twarz} state={emocja} />
      <div className={s.tresc}>
        <p className={s.tekst} role={rola}>{tekst}</p>
        {children}
        {akcja && ("do" in akcja ? (
          <Link to={akcja.do} className="btn btn-secondary btn-sm">{akcja.etykieta}</Link>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" onClick={akcja.onClick}>{akcja.etykieta}</button>
        ))}
      </div>
    </div>
  );
}
