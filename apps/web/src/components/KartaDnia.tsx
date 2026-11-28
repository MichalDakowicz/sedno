// Karta propozycji dnia (nauka/dzis.ts): ta sama na pulpicie, w Nauce i w Powtórkach.
import type { ReactNode, Ref } from "react";
import { Link } from "react-router-dom";
import { FileText, MessagesSquare, Timer } from "lucide-react";
import { przedmiot } from "../konto/przedmioty";
import type { PropozycjaDnia } from "../nauka/dzis";
import { SubjectIcon } from "./icons";
import { TutorAvatar } from "./TutorAvatar";
import s from "./KartaDnia.module.css";

const IKONY = { runda: Timer, arkusz: FileText, rozmowa: MessagesSquare };

/** poboczna: przycisk obok głównego (np. „Wybierz inną umiejętność”); children: treść pod przyciskami w tej samej karcie. */
export function KartaDnia({ dzis, zPrzedmiotem = false, tytulRef, poboczna, children }: { dzis: PropozycjaDnia; zPrzedmiotem?: boolean; tytulRef?: Ref<HTMLHeadingElement>; poboczna?: ReactNode; children?: ReactNode }) {
  const p = przedmiot(dzis.przedmiot)!;
  const Ikona = IKONY[dzis.ikona];
  const akcja = dzis.akcja;
  return (
    <article className={s.karta} aria-labelledby="dzis-tytul" data-tutor="dzis" data-tutor-about="To moja propozycja na dziś. Najpierw dokończenie zaczętego, potem powtórka, potem ćwiczenie z mapy umiejętności, na końcu nowy arkusz.">
      <div className={s.glowa}>
        <span className="kicker">
          <TutorAvatar size={22} /> Dziś warto
        </span>
        {zPrzedmiotem && (
          <Link to={`/przedmiot/${p.id}`} className={s.tag}>
            <SubjectIcon subject={p} size="sm" />
            {p.nazwa}
          </Link>
        )}
      </div>
      <h2 id="dzis-tytul" className="h1" tabIndex={tytulRef ? -1 : undefined} ref={tytulRef}>
        {dzis.tytul}
      </h2>
      <p className={s.powod} data-tutor="dzis-powod">{dzis.powod}</p>
      <div className={s.akcje}>
        <Link to={akcja.do} className="btn btn-primary" data-tutor="today-cta">
          <Ikona size={18} aria-hidden="true" />
          {akcja.etykieta}
          {dzis.minuty ? ` · ${dzis.minuty} min` : ""}
        </Link>
        {poboczna}
      </div>
      {children}
    </article>
  );
}
