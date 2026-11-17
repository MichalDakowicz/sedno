import type { Poziom } from "../../arkusze/typy";
import { SubjectIcon } from "../../components/icons";
import { nazwaPoziomu } from "../../konto/przedmioty";
import { poziomyNauki } from "../../nauka/stan";
import s from "./NaukaPowtorki.module.css";

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

export function WyborPoziomuNauki({ poziom, ustawPoziom }: { poziom: Poziom; ustawPoziom: (poziom: Poziom) => void }) {
  return (
    <label className={s.pole}>
      <span className="small muted">Poziom matury</span>
      <select value={poziom} onChange={(e) => ustawPoziom(e.target.value as Poziom)}>
        {poziomyNauki.map((p) => <option key={p} value={p}>{nazwaPoziomu[p]}</option>)}
      </select>
    </label>
  );
}

export function BladNauki({ komunikat, ponow }: { komunikat: string; ponow: () => void }) {
  return (
    <div className={s.stan}>
      <p role="alert" className={s.blad}>{komunikat}</p>
      <button type="button" className="btn btn-ghost" onClick={ponow}>Spróbuj ponownie</button>
    </div>
  );
}

export function dataNauki(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : nazwaDaty.format(data);
}

export function formatRundy(format: string | null | undefined) {
  return format === "napraw-blad" ? "napraw-blad" : "szybka-runda";
}
