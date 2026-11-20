// Mapa umiejętności przedmiotu bez rund (polski, matematyka, informatyka): te same klocki co mapa angielskiego
// (gotowość, ogród, działy w wierszach, panel działu), a dane z działów liczone ze sprawdzonych arkuszy.
// Bez arkuszy to szablon działów do przerobienia.
import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronRight, MessagesSquare } from "lucide-react";
import type { Poziom } from "../../arkusze/typy";
import { Gotowosc } from "../../components/Gotowosc";
import { Kielek } from "../../components/Kielek";
import { Ogrod } from "../../components/Ogrod";
import { useTutor } from "../../components/TutorContext";
import { celPrzedmiotu, useUczenie } from "../../konto/profilUcznia";
import { przedmiot as opisPrzedmiotu, type PrzedmiotId } from "../../konto/przedmioty";
import type { Umiejetnosc } from "../../nauka/api";
import { WSZYSTKIE_OBSZARY } from "../../nauka/gotowosc";
import { szablonMapy, useMapaZArkuszy, type BladArkusza } from "../../nauka/mapaPrzedmiotow";
import { doNastepnegoStadium, NAZWA_STADIUM, stadium } from "../../nauka/stadia";
import { Liczba } from "../../ruch";
import { Opanowanie } from "./Opanowanie";
import s from "./Umiejetnosci.module.css";

export const adresMapyPrzedmiotu = (p: PrzedmiotId, skill?: string) => `/umiejetnosci?przedmiot=${p}${skill ? `&umiejetnosc=${skill}` : ""}`;
export const nazwaBledu = (b: BladArkusza) => `Matura ${b.arkusz.sesja} ${b.arkusz.rok} · ${b.tytul}`;
export const adresBledu = (b: BladArkusza) => `/arkusze/${encodeURIComponent(b.arkusz.id)}#zadanie-${b.zadanie}`;
const zadan = (n: number) => (n === 1 ? "zadanie" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "zadania" : "zadań");

export function MapaPrzedmiotu({ przedmiot, poziom, id }: { przedmiot: PrzedmiotId; poziom: Poziom | null; id: string | null }) {
  const mapa = useMapaZArkuszy(przedmiot, poziom);
  const uczenie = useUczenie();
  // Szablon od razu, wyniki z arkuszy, gdy się policzą: mapa nie czeka pusta na pobranie arkuszy.
  const umiejetnosci = mapa.dane?.umiejetnosci ?? szablonMapy(przedmiot);
  const bledy = mapa.dane?.bledy ?? [];
  const wybrana = umiejetnosci.find((u) => u.skill_id === id);
  const maArkusze = przedmiot !== "polski";
  const cel = celPrzedmiotu(uczenie, przedmiot);
  const nazwa = opisPrzedmiotu(przedmiot)?.nazwa ?? przedmiot;

  return (
    <div className={s.uklad} data-panel={!!wybrana}>
      <div className={s.grupy}>
        {id && !wybrana && <p role="status">Tego działu nie ma w mapie.</p>}
        <Gotowosc umiejetnosci={umiejetnosci} cel={cel}
          bezDanych={maArkusze ? "Za mało danych, żeby ją policzyć. Pierwszy sprawdzony arkusz da pierwszy wynik." : "Za mało danych, żeby ją policzyć."}>
          {maArkusze && umiejetnosci.every((u) => u.score === null) && (
            <Link to={`/arkusze?przedmiot=${przedmiot}`} className={`btn btn-primary ${s.przycisk}`}>Rozwiąż pierwszy arkusz</Link>
          )}
        </Gotowosc>
        <div className={s.ogrod}>
          <Ogrod cel={cel} umiejetnosci={umiejetnosci} poziom={poziom ?? "podstawowy"} adres={(u) => adresMapyPrzedmiotu(przedmiot, u.skill_id)} wybrana={id}
            etykieta={`Ogród działów: ${nazwa}`} />
        </div>
        <div className={s.lista}>
          {WSZYSTKIE_OBSZARY.map(({ id: obszar, nazwa: nazwaObszaru }, i) => {
            const wObszarze = umiejetnosci.filter((u) => u.area === obszar);
            return wObszarze.length > 0 && (
              <section className={s.blok} aria-labelledby={`dzial-${i}`} key={obszar}>
                <h2 className="h2" id={`dzial-${i}`}>{nazwaObszaru}</h2>
                <ul className="wiersze">
                  {wObszarze.map((u) => (
                    <li key={u.skill_id}>
                      <Link id={`umiejetnosc-${u.skill_id}`} to={adresMapyPrzedmiotu(przedmiot, u.skill_id)} className={`wiersz ${s.wiersz}`} aria-current={u.skill_id === id ? "true" : undefined}>
                        <span className={`wiersz-ikona ${s.ikona}`}><Kielek stadium={stadium(u.score)} rozmiar={32} /></span>
                        <span className={`wiersz-tresc ${s.nazwa}`}>{u.name}<span className="visually-hidden">, {NAZWA_STADIUM[stadium(u.score)]}</span></span>
                        <span className="wiersz-wartosc"><Opanowanie {...u} /></span>
                        <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
      {wybrana && <PanelDzialu przedmiot={przedmiot} u={wybrana} bledy={bledy.filter((b) => b.dzial === wybrana.skill_id)} maArkusze={maArkusze} />}
    </div>
  );
}

function PanelDzialu({ przedmiot, u, bledy, maArkusze }: { przedmiot: PrzedmiotId; u: Umiejetnosc; bledy: BladArkusza[]; maArkusze: boolean }) {
  const naglowek = useRef<HTMLHeadingElement>(null);
  const { aiGotowe, zapytajWNowej } = useTutor();
  const navigate = useNavigate();
  const nazwa = opisPrzedmiotu(przedmiot)?.nazwa.toLowerCase() ?? przedmiot;
  useEffect(() => naglowek.current?.focus(), [u.skill_id]);

  function zapytaj() {
    zapytajWNowej(`Chcę poćwiczyć dział „${u.name}” z matury (${nazwa}). Zacznij od jednego krótkiego zadania.`);
    navigate("/tutor");
  }

  return (
    <aside className={s.panel} aria-labelledby="dzial-tytul">
      <Link to={adresMapyPrzedmiotu(przedmiot)} className={s.wroc}><ArrowLeft size={16} aria-hidden="true" /> Wszystkie działy</Link>
      <div className={s.blok}>
        <h2 id="dzial-tytul" className="h2" tabIndex={-1} ref={naglowek}>{u.name}</h2>
        <p>{u.description}</p>
      </div>
      <div className={s.blok}>
        {u.score === null ? (
          <p className="muted">{maArkusze ? "Jeszcze bez wyniku. Sprawdzone zadania z tego działu w arkuszach dadzą pierwszy." : "Jeszcze bez wyniku."}</p>
        ) : (
          <div className={s.zKielkiem}>
            <Kielek stadium={stadium(u.score)} rozmiar={88} animuj opis={`Stadium: ${NAZWA_STADIUM[stadium(u.score)]}`} />
            <p className={s.duza}>
              <Liczba wartosc={Math.round(u.score * 100)} /><span className={s.jednostka}>%</span>
              <span className={s.podpisLiczby}>{doNastepnegoStadium(u.score) ?? "opanowane"} · {u.evidence_count} {zadan(u.evidence_count)} z arkuszy</span>
            </p>
          </div>
        )}
      </div>
      <div className={s.akcje}>
        {maArkusze && (
          <Link to={bledy[0] ? adresBledu(bledy[0]) : `/arkusze?przedmiot=${przedmiot}`} className={`btn btn-primary ${s.przycisk}`}>
            {bledy[0] ? "Popraw zadanie z błędem" : "Rozwiąż arkusz"} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
        {aiGotowe !== false && (
          <button type="button" className={`btn ${maArkusze ? "btn-ghost" : "btn-primary"} ${s.przycisk}`} onClick={zapytaj}>
            <MessagesSquare size={16} aria-hidden="true" /> Poćwicz z Pestką
          </button>
        )}
      </div>
      {bledy.length > 0 && (
        <section className={s.blok} aria-labelledby="dzial-bledy">
          <h3 className="h3" id="dzial-bledy">Do poprawy</h3>
          <ul className="wiersze">
            {bledy.map((b) => (
              <li key={`${b.arkusz.id}:${b.zadanie}`}>
                <Link to={adresBledu(b)} className="wiersz">
                  <span className="wiersz-tresc"><span className="h3">{nazwaBledu(b)}</span></span>
                  <span className="wiersz-wartosc small muted">{b.zdobyte} / {b.mozliwe} pkt</span>
                  <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
