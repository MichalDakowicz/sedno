import { StanPestki } from "../../components/StanPestki";
import type { Poziom } from "../../arkusze/typy";
import { SubjectIcon } from "../../components/icons";
import { nazwaPoziomu } from "../../konto/przedmioty";
import { poziomyNauki } from "../../nauka/stan";
import s from "./NaukaPowtorki.module.css";
import { Pigulki } from "../../components/Pigulki";

const nazwaDaty = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", timeZone: "Europe/Warsaw" });
export const procentNauki = new Intl.NumberFormat("pl-PL", { style: "percent" });

export function Angielski() {
  return (
    <span className={s.przedmiot}>
      <SubjectIcon subject={{ id: "angielski", tone: "yellow" }} size="sm" />
      Angielski
    </span>
  );
}

/** Poziom matury: pigułki zawsze widoczne, domyślnie zaznaczony poziom z profilu (Nauka, Powtórki, mapa). */
export function WyborPoziomuNauki({ poziom, ustawPoziom }: { poziom: Poziom; ustawPoziom: (poziom: Poziom) => void }) {
  return (
    <div className={s.pole} role="group" aria-labelledby="poziom-matury">
      <span id="poziom-matury" className="small muted">Poziom matury</span>
      <Pigulki>
        {poziomyNauki.map((p) => (
          <button key={p} type="button" className="pigulka" aria-pressed={p === poziom} onClick={() => ustawPoziom(p)}>
            {nazwaPoziomu[p]}
          </button>
        ))}
      </Pigulki>
    </div>
  );
}

export function BladNauki({ komunikat, ponow }: { komunikat: string; ponow: () => void }) {
  return <StanPestki emocja="zmartwienie" rola="alert" tekst={komunikat} akcja={{ etykieta: "Spróbuj ponownie", onClick: ponow }} />;
}

export function dataNauki(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : nazwaDaty.format(data);
}

export function formatRundy(format: string | null | undefined) {
  return format === "napraw-blad" ? "napraw-blad" : "szybka-runda";
}
