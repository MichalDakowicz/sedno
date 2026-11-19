import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Camera, ChevronRight, CircleHelp, FileText, PenLine, GraduationCap, MessagesSquare, Network, RotateCcw, Timer } from "lucide-react";
import { TutorAvatar } from "../../components/TutorAvatar";
import type { Poziom } from "../../arkusze/typy";
import { useProfil } from "../../auth";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Ladowanie } from "../../components/Ladowanie";
import { useTutor } from "../../components/TutorContext";
import { SubjectIcon } from "../../components/icons";
import { nazwaPoziomu, przedmiot, type PrzedmiotId } from "../../konto/przedmioty";
import { klasaPrzedmiotu, PasekPrzedmiotow } from "../../components/PasekPrzedmiotow";
import { Ogrod } from "../../components/Ogrod";
import { adresRundy, adresStartu } from "../../nauka/adresy";
import { naukaApi, nazwaFormatuNauki, type OtwartaSesjaNauki } from "../../nauka/api";
import { coDzisBezRund, MINUTY_RUNDY, useDzisAngielski, usePolecenieDnia } from "../../nauka/dzis";
import { KartaDnia } from "../../components/KartaDnia";
import { SekcjaPowtorek } from "./Powtorki";
import { useOtwarteRundy, usePoziomNauki, useZapytanie } from "../../nauka/stan";
import { zapytania } from "../../nauka/zapytania";
import { BladNauki, dataNauki, formatRundy, WyborPoziomuNauki } from "./NaukaPowtorki";
import s from "./NaukaPowtorki.module.css";
import { MAPA_WIEDZY_WLACZONA } from "../../nauka/wiedza";

/** Wybrany przedmiot Nauki: z adresu (?przedmiot), inaczej ostatni wybrany (pamięć przeglądarki), inaczej angielski. */
const KLUCZ_PRZEDMIOTU = "sedno.nauka.przedmiot";
function zapamietanyPrzedmiot(): string | null {
  try { return localStorage.getItem(KLUCZ_PRZEDMIOTU); } catch { return null; }
}

export function Nauka() {
  // Adres #powtorki (pulpit, dawna zakładka Powtórki): przewiń do sekcji, gdy już stoi na stronie.
  const { hash: kotwica } = useLocation();
  useEffect(() => {
    if (kotwica !== "#powtorki") return;
    const t = window.setTimeout(() => document.getElementById("powtorki")?.scrollIntoView({ block: "start", behavior: "smooth" }), 300);
    return () => window.clearTimeout(t);
  }, [kotwica]);
  const [poziom, ustawPoziom] = usePoziomNauki();
  const [params, ustawParams] = useSearchParams();
  const profil = useProfil();
  const { aiGotowe } = useTutor();
  const moje = [...new Set((profil?.subjects ?? []).map((p) => p.id))];
  const zAdresu = params.get("przedmiot");
  const wybranyPrzedmiot: PrzedmiotId = [zAdresu, zapamietanyPrzedmiot(), "angielski", moje[0]].find((id): id is PrzedmiotId => !!id && moje.includes(id as PrzedmiotId)) ?? "angielski";
  const angielski = wybranyPrzedmiot === "angielski";
  const mapa = useZapytanie(angielski ? zapytania.mapa(poziom) : null);
  const umiejetnosci = mapa.dane?.skills ?? [];
  const wybrana = umiejetnosci.find((u) => u.skill_id === params.get("umiejetnosc"));
  // Polecenie dla umiejętności wybranej z ogrodu; bez wyboru polecenie dnia z mapy (nauka_polec).
  const polecenie = useZapytanie(angielski && mapa.stan === "gotowe" && wybrana ? zapytania.polecenieUmiejetnosci(poziom, wybrana.skill_id) : null);
  const polecenieDnia = usePolecenieDnia(poziom, angielski);
  // Bez własnego wyboru Nauka pokazuje tę samą propozycję co pulpit, żeby dwie karty nie mówiły czegoś innego.
  const dzien = useDzisAngielski(poziom);
  const ostatnie = useOtwarteRundy(angielski);
  const { hash } = useLocation();
  const naglowek = useRef<HTMLHeadingElement>(null);
  const naglowekPolecenia = useRef<HTMLHeadingElement>(null);
  const naglowekOstatnio = useRef<HTMLHeadingElement>(null);
  const [usuwane, ustawUsuwane] = useState<string | null>(null);
  const [bladUsuwania, ustawBladUsuwania] = useState("");
  const [zmiana, ustawZmiane] = useState(false);
  // Fokus przenosimy tylko po wejściu z parametrem (np. z mapy), nie przy zwykłym otwarciu strony.
  const fokusPolecenia = useRef(params.get("umiejetnosc") !== null);
  const fokusOstatnio = useRef(hash === "#ostatnio");
  const sesje = (ostatnie.dane?.sesje ?? []).slice(0, 3);
  const kilkaPoziomow = new Set(sesje.map((sesja) => sesja.level)).size > 1;

  const umiejetnosc = wybrana ?? umiejetnosci.find((u) => u.skill_id === polecenieDnia.dane?.skill_id) ?? umiejetnosci[0];
  const dane = wybrana ? polecenie.dane : polecenieDnia.dane;
  const powtorz = dane?.repeat_id ?? undefined;
  const format = powtorz ? "szybka-runda" : formatRundy(dane?.format);
  const minuty = dane && dane.minutes > 0 ? dane.minutes : MINUTY_RUNDY;
  const czekaNaPolecenie = angielski && (mapa.stan === "ladowanie" || (wybrana ? polecenie.stan === "ladowanie" : polecenieDnia.stan === "ladowanie"));

  useEffect(() => {
    if (!fokusPolecenia.current || czekaNaPolecenie) return;
    fokusPolecenia.current = false;
    (naglowekPolecenia.current ?? naglowek.current)?.focus();
  }, [czekaNaPolecenie]);

  useEffect(() => {
    if (!fokusOstatnio.current || ostatnie.stan === "ladowanie") return;
    fokusOstatnio.current = false;
    naglowekOstatnio.current?.scrollIntoView();
    naglowekOstatnio.current?.focus();
  }, [ostatnie.stan]);

  async function odrzuc(sesja: OtwartaSesjaNauki) {
    ustawUsuwane(sesja.id);
    ustawBladUsuwania("");
    try {
      await naukaApi.usun(sesja.id);
      ostatnie.ponow();
      naglowekOstatnio.current?.focus();
    } catch (e) {
      ustawBladUsuwania(e instanceof Error ? e.message : "Nie udało się usunąć rundy.");
    } finally {
      ustawUsuwane(null);
    }
  }

  function ustawUmiejetnosc(id: string) {
    ustawParams((aktualne) => {
      const nowe = new URLSearchParams(aktualne);
      if (id) nowe.set("umiejetnosc", id);
      else nowe.delete("umiejetnosc");
      return nowe;
    }, { replace: true });
  }

  function ustawPrzedmiot(id: PrzedmiotId) {
    try { localStorage.setItem(KLUCZ_PRZEDMIOTU, id); } catch { /* wybór działa do odświeżenia */ }
    ustawParams((aktualne) => {
      const nowe = new URLSearchParams(aktualne);
      nowe.set("przedmiot", id);
      nowe.delete("umiejetnosc");
      return nowe;
    }, { replace: true });
  }

  const bezRund = coDzisBezRund[wybranyPrzedmiot];
  const akcjaBezRund = bezRund?.akcja;
  const maArkusze = wybranyPrzedmiot !== "polski";

  // Wszystkie inne sposoby nauki w jednej liście wierszy, każdy z jednym zdaniem „kiedy”: bez kafli, pól i zwijania.
  const sposoby: { id: string; to: string; nazwa: string; kiedy: string; ikona: ReactNode }[] = [
    ...(aiGotowe !== false ? [{ id: "temat", to: "/tutor", nazwa: "Zapytaj Pestkę", kiedy: "Nie rozumiesz tematu i chcesz go omówić.", ikona: <MessagesSquare size={18} aria-hidden="true" /> }] : []),
    ...(maArkusze ? [{ id: "arkusz", to: `/arkusze?przedmiot=${wybranyPrzedmiot}`, nazwa: "Rozwiąż arkusz", kiedy: "Chcesz sprawdzić się na całej maturze.", ikona: <FileText size={18} aria-hidden="true" /> }] : []),
    ...(angielski ? [{ id: "pisanie", to: `/nauka/pisanie?poziom=${poziom}`, nazwa: "Napisz wypowiedź", kiedy: "Ćwiczysz pisanie krok po kroku, z uwagami Pestki.", ikona: <PenLine size={18} aria-hidden="true" /> }] : []),
    ...(angielski && aiGotowe !== false ? [{ id: "sokratejski", to: `/nauka/sokratejski?poziom=${poziom}${umiejetnosc ? `&umiejetnosc=${umiejetnosc.skill_id}` : ""}`, nazwa: "Rozmowa z pytaniami", kiedy: "Chcesz zrozumieć, nie tylko trafić.", ikona: <CircleHelp size={18} aria-hidden="true" /> }] : []),
    ...(wybranyPrzedmiot === "matematyka" || wybranyPrzedmiot === "informatyka" ? [{ id: "zdjecie", to: "/nauka/zdjecie", nazwa: "Zdjęcie z kartki", kiedy: "Rozwiązujesz na papierze i chcesz omówienia.", ikona: <Camera size={18} aria-hidden="true" /> }] : []),
    { id: "uczen-uczy", to: "/nauka/uczen-uczy", nazwa: "Naucz Kolegę", kiedy: "Chcesz sprawdzić, czy naprawdę rozumiesz zasadę.", ikona: <GraduationCap size={18} aria-hidden="true" /> },
    ...(MAPA_WIEDZY_WLACZONA ? [{ id: "mapa-wiedzy", to: `/nauka/mapa-wiedzy?przedmiot=${wybranyPrzedmiot}`, nazwa: "Mapa wiedzy", kiedy: "Zbierasz pojęcia i chcesz zobaczyć, co je łączy.", ikona: <Network size={18} aria-hidden="true" /> }] : []),
  ];

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony tytul="Nauka" tytulRef={naglowek} />

      {moje.length > 1 && (
        <PasekPrzedmiotow etykieta="Przedmiot" zalezy={wybranyPrzedmiot}>
          {moje.map((id) => {
            const p = przedmiot(id)!;
            return (
              <button key={id} type="button" className={klasaPrzedmiotu(id === wybranyPrzedmiot)} data-aktywny={id === wybranyPrzedmiot} aria-pressed={id === wybranyPrzedmiot} onClick={() => ustawPrzedmiot(id)}>
                <SubjectIcon subject={p} size="sm" /> {p.nazwa}
              </button>
            );
          })}
        </PasekPrzedmiotow>
      )}

      {angielski && !wybrana && !zmiana && dzien.stan === "ladowanie" ? (
        <Ladowanie ksztalt="blok" etykieta="Dobieram ćwiczenie na dziś" />
      ) : angielski && !wybrana && !zmiana && dzien.dzis ? (
        <div className={s.dzis}>
          <KartaDnia dzis={dzien.dzis} />
          <button type="button" className="btn btn-ghost" onClick={() => ustawZmiane(true)}>Wybierz inną umiejętność</button>
        </div>
      ) : angielski ? (
        <article className={s.karta} aria-labelledby="nauka-polecenie">
          <span className="kicker"><TutorAvatar size={22} /> {wybrana ? "Twój wybór" : "Wybierz umiejętność"}</span>
          {mapa.stan === "blad" ? (
            <BladNauki komunikat="Nie udało się wczytać umiejętności." ponow={mapa.ponow} />
          ) : czekaNaPolecenie || !umiejetnosc ? (
            <Ladowanie ksztalt="tekst" ile={2} wysokosc={[150, 216]} etykieta="Dobieram rundę" />
          ) : (
            <>
              <h2 id="nauka-polecenie" className="h1" tabIndex={-1} ref={naglowekPolecenia}>{umiejetnosc.name}</h2>
              <p className="muted">
                {powtorz ? "Powtórka błędnego zadania" : `${nazwaFormatuNauki[format]} · 5 zadań · ok. ${minuty} min`}
              </p>
              {dane?.reason && !wybrana && !powtorz && <p>{dane.reason}</p>}
              <div className={s.akcje}>
                <Link to={adresStartu(poziom, umiejetnosc.skill_id, format, powtorz)} className={`btn btn-primary ${s.przycisk}`} data-tutor-about={dane?.reason}>
                  {powtorz ? <><RotateCcw size={18} aria-hidden="true" /> Powtórz zadanie</> : <><Timer size={18} aria-hidden="true" /> Zacznij rundę · {minuty} min</>}
                </Link>
                <button type="button" className="btn btn-ghost" aria-expanded={zmiana} aria-controls="wybor-umiejetnosci" onClick={() => ustawZmiane((z) => !z)}>
                  {zmiana ? "Gotowe" : "Zmień umiejętność"}
                </button>
              </div>
              {zmiana && (
                <div id="wybor-umiejetnosci" className={s.wyborOgrod}>
                  <Ogrod maly umiejetnosci={umiejetnosci} poziom={poziom} wybrana={umiejetnosc.skill_id}
                    tuDzis={polecenieDnia.dane?.skill_id ?? null} etykieta="Wybierz umiejętność z ogrodu"
                    onWybierz={(u) => { ustawUmiejetnosc(u.skill_id); ustawZmiane(false); }} />
                  <WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} />
                </div>
              )}
            </>
          )}
        </article>
      ) : bezRund && akcjaBezRund ? (
        // Przedmioty bez rund dostają tę samą kartę co angielski i pulpit, żeby zakładki nie różniły się wyglądem.
        <div className={s.dzis}>
          <KartaDnia dzis={{ rodzaj: "polecenie", przedmiot: wybranyPrzedmiot, tytul: akcjaBezRund.etykieta, powod: bezRund.tekst, akcja: { do: akcjaBezRund.do, etykieta: "Zacznij" }, minuty: null, ikona: akcjaBezRund.do === "/tutor" ? "rozmowa" : "runda" }} />
        </div>
      ) : null}

      {/* Powtórki zaraz pod kartą dnia: to też odpowiedź na „co teraz ćwiczyć” (dawniej osobna zakładka). */}
      <SekcjaPowtorek przedmiot={wybranyPrzedmiot} poziom={(profil?.subjects.find((p) => p.id === wybranyPrzedmiot)?.poziom ?? null) as Poziom | null} />


      {angielski && ostatnie.stan === "gotowe" && sesje.length > 0 && (
        <section className={s.sekcja} aria-labelledby="ostatnio">
          <h2 className="h2" id="ostatnio" tabIndex={-1} ref={naglowekOstatnio}>Dokończ</h2>
          <ul className={s.wiersze}>
            {sesje.map((sesja) => {
              const nazwa = sesja.skill_id ? ostatnie.dane?.nazwy.get(sesja.skill_id) : undefined;
              const nazwaFormatu = nazwaFormatuNauki[sesja.format];
              return (
                <li key={sesja.id} className={s.wierszRundy}>
                  <WierszFormat
                    to={adresRundy(sesja.id)}
                    nazwa={nazwa ?? nazwaFormatu}
                    opis={[nazwa && nazwaFormatu, kilkaPoziomow && nazwaPoziomu[sesja.level], dataNauki(sesja.updated_at)].filter(Boolean).join(" · ")}
                    ikona={<Timer size={18} aria-hidden="true" />}
                    akcja="Wznów"
                  />
                  <button
                    type="button"
                    className={`link ${s.usun}`}
                    disabled={usuwane !== null}
                    onClick={() => void odrzuc(sesja)}
                    aria-label={`Usuń rundę: ${nazwa ?? nazwaFormatu}`}
                  >
                    {usuwane === sesja.id ? "Usuwanie…" : "Usuń"}
                  </button>
                </li>
              );
            })}
          </ul>
          {bladUsuwania && <p role="alert" className={s.blad}>{bladUsuwania}</p>}
        </section>
      )}
      {angielski && ostatnie.stan === "blad" && <BladNauki komunikat="Nie udało się wczytać niedokończonych rund." ponow={ostatnie.ponow} />}

      <section className={s.sekcja} aria-labelledby="inne-sposoby">
        <h2 className="h2" id="inne-sposoby">Inne sposoby</h2>
        <ul className={`wiersze ${s.sposoby}`}>
          {sposoby.map((x) => (
            <li key={x.id}>
              <Link to={x.to} className="wiersz">
                <span className={`wiersz-ikona ${s.ikona}`}>{x.ikona}</span>
                <span className="wiersz-tresc">
                  <span className="h3">{x.nazwa}</span>
                  <span className="wiersz-opis">{x.kiedy}</span>
                </span>
                <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function WierszFormat({ to, nazwa, opis, ikona, akcja }: { to: string; nazwa: string; opis: string; ikona: ReactNode; akcja?: string }) {
  const wiersz = (
    <Link to={to} className={akcja ? `${s.wiersz} ${s.wierszWznow}` : s.wiersz}>
      <span className={s.ikona}>{ikona}</span>
      <span className={s.wierszGlowny}>
        <span className="h3">{nazwa}</span>
        <span className="muted small">{opis}</span>
      </span>
      <span className={s.wierszBoczny}>
        {akcja ? <span className="link">{akcja}</span> : <ChevronRight size={18} aria-hidden="true" />}
      </span>
    </Link>
  );
  return akcja ? wiersz : <li>{wiersz}</li>;
}

