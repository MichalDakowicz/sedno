// Gotowość do matury na pulpicie: jeden wiersz na przedmiot z małym pierścieniem gotowości i jednym zdaniem.
// Angielski liczy gotowość z mapy umiejętności (nauka/gotowosc.ts) (ogród jest na mapie); inne
// przedmioty pokazują średnią z arkuszy (bez arkuszy: jedno zdanie). Wiersz prowadzi do mapy przedmiotu, a przedmiot
// bez mapy do jego arkuszy. Pod wierszami jeden link do powtórek na dziś, gdy jakieś czekają.
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Gotowosc } from "../../components/Gotowosc";
import { SubjectIcon } from "../../components/icons";
import { Pierscien } from "../../components/wykresy";
import { celPrzedmiotu, useUczenie } from "../../konto/profilUcznia";
import { nazwaPoziomu, przedmiot } from "../../konto/przedmioty";
import type { Podsumowanie } from "../../konto/wyniki";
import { adresMapy, adresPowtorek } from "../../nauka/adresy";
import { useZapytanie } from "../../nauka/stan";
import { zapytania } from "../../nauka/zapytania";
import { odmianaPowtorek, unikalnePowtorki } from "./czasPowtorek";
import styles from "../Dashboard.module.css";
import w from "./Widgety.module.css";

function WierszAngielskiego({ s }: { s: Podsumowanie }) {
  const poziom = s.przedmiot.poziom;
  const u = useUczenie();
  const mapa = useZapytanie(zapytania.mapa(poziom));
  const plan = useZapytanie(zapytania.plan(poziom));
  const pr = przedmiot("angielski")!;
  const umiejetnosci = mapa.dane?.skills ?? [];
  const naglowek = <>{pr.nazwa} <span className={w.poziomWiersza}>poziom {nazwaPoziomu[poziom]}</span></>;
  return (
    <li className={w.gotowoscWiersz}>
      <Link to={adresMapy(poziom)} className={w.gotowoscLink}>
        {umiejetnosci.length ? (
          <Gotowosc maly umiejetnosci={umiejetnosci} cel={celPrzedmiotu(u, "angielski")} prognoza={plan.dane?.forecast.score} naglowek={naglowek} />
        ) : (
          // Miejsce pierścienia zajęte od razu, więc wiersz nie skacze, gdy dojdzie mapa.
          <span className={`${w.gotowoscZastepczy} ${w.gotowoscZastepczyAng}`}><SubjectIcon subject={pr} size="lg" /><span className="h3">{naglowek}</span></span>
        )}
        <ChevronRight size={20} aria-hidden="true" className={w.gotowoscStrzalka} />
      </Link>
    </li>
  );
}

function WierszPrzedmiotu({ s }: { s: Podsumowanie }) {
  const u = useUczenie();
  const pr = przedmiot(s.przedmiot.id)!;
  const cel = celPrzedmiotu(u, pr.id);
  const zdanie = s.srednia !== null
    ? `Średnia z ${s.wyniki.length} ${s.wyniki.length === 1 ? "arkusza" : "arkuszy"}${cel !== null ? (s.srednia / 100 >= cel ? ", cel osiągnięty." : `, do celu ${Math.round(cel * 100 - s.srednia)} pkt proc.`) : "."}`
    : s.arkusze.length ? "Pierwszy arkusz pokaże, ile już masz." : "Arkuszy z tego poziomu jeszcze nie ma.";
  return (
    <li className={w.gotowoscWiersz}>
      <Link to={`/arkusze?przedmiot=${pr.id}&poziom=${s.przedmiot.poziom}`} className={w.gotowoscLink}>
        <span className={w.gotowoscZastepczy}>
          {s.srednia !== null
            ? <Pierscien wartosc={s.srednia / 100} prog={0.3} cel={cel} rozmiar={56} opis={`${pr.nazwa}: średnia z arkuszy ${s.srednia}%.`} />
            : <SubjectIcon subject={pr} size="lg" />}
          <span className={w.gotowoscTekst}>
            <span className="h3">{pr.nazwa} <span className={w.poziomWiersza}>poziom {nazwaPoziomu[s.przedmiot.poziom]}</span></span>
            <span className="small muted">{zdanie}</span>
          </span>
        </span>
        <ChevronRight size={20} aria-hidden="true" className={w.gotowoscStrzalka} />
      </Link>
    </li>
  );
}

function PowtorkiNaDzis({ poziom }: { poziom: Podsumowanie["przedmiot"]["poziom"] }) {
  const powtorki = useZapytanie(zapytania.powtorki(poziom));
  // Miejsce na link, zanim dojdą powtórki: znika tylko, gdy żadnych nie ma.
  if (powtorki.stan === "ladowanie") return <span className={w.linkPowtorekZastepczy} aria-hidden="true" />;
  const ile = powtorki.dane ? unikalnePowtorki([...(powtorki.dane.today ? [powtorki.dane.today] : []), ...powtorki.dane.queue]).length : 0;
  if (!ile) return null;
  return (
    <Link to={adresPowtorek(poziom)} className={`link ${w.linkPowtorek}`}>
      {ile} {odmianaPowtorek(ile)} na dziś <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );
}

export function GotowoscPrzedmiotow({ zakres }: { zakres: Podsumowanie[] }) {
  if (!zakres.length) return null;
  const angielski = zakres.find((s) => s.przedmiot.id === "angielski");
  return (
    <section className={styles.section} aria-labelledby="gotowosc-title">
      <h2 id="gotowosc-title" className="h2">Gotowość do matury</h2>
      <ul className={`wiersze ${w.gotowoscLista}`}>
        {zakres.map((s) => s.przedmiot.id === "angielski"
          ? <WierszAngielskiego key={`angielski-${s.przedmiot.poziom}`} s={s} />
          : <WierszPrzedmiotu key={`${s.przedmiot.id}-${s.przedmiot.poziom}`} s={s} />)}
      </ul>
      {angielski && <PowtorkiNaDzis poziom={angielski.przedmiot.poziom} />}
    </section>
  );
}
