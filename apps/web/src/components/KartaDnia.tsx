// Karta propozycji dnia (nauka/dzis.ts): ta sama na pulpicie, w Nauce i w Powtórkach.
import type { Ref } from "react";
import { Link } from "react-router-dom";
import { FileText, MessagesSquare, Timer } from "lucide-react";
import { przedmiot } from "../konto/przedmioty";
import type { PropozycjaDnia } from "../nauka/dzis";
import { SubjectIcon } from "./icons";
import { useTutor } from "./TutorContext";
import { TutorAvatar } from "./TutorAvatar";
import s from "./KartaDnia.module.css";

const IKONY = { runda: Timer, arkusz: FileText, rozmowa: MessagesSquare };

export function KartaDnia({ dzis, zPrzedmiotem = false, tytulRef }: { dzis: PropozycjaDnia; zPrzedmiotem?: boolean; tytulRef?: Ref<HTMLHeadingElement> }) {
  const { aiGotowe } = useTutor();
  const p = przedmiot(dzis.przedmiot)!;
  const Ikona = IKONY[dzis.ikona];
  // Rozmowa bez podpiętego AI nic by nie dała: jedyna akcja prowadzi wtedy do profilu.
  const akcja = dzis.akcja.do === "/tutor" && aiGotowe === false ? { do: "/profil#ai", etykieta: "Połącz Pestkę w profilu" } : dzis.akcja;
  return (
    <article className={s.karta} aria-labelledby="dzis-tytul" data-tutor-about="To moja propozycja na dziś. Najpierw dokończenie zaczętego, potem powtórka, potem ćwiczenie z mapy umiejętności, na końcu nowy arkusz.">
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
      <p className={s.powod}>{dzis.powod}</p>
      <div className={s.akcje}>
        <Link to={akcja.do} className="btn btn-primary" data-tutor="today-cta">
          <Ikona size={18} aria-hidden="true" />
          {akcja.etykieta}
          {dzis.minuty ? ` · ${dzis.minuty} min` : ""}
        </Link>
      </div>
    </article>
  );
}
