// Diagnoza na start (nauka/diagnoza.ts). Przy nowej bazie: jedna krótka sesja z zadaniami z każdej umiejętności,
// rozwiązywana w widoku rundy, a tu start, powrót i wynik na umiejętność. Przy bazie bez funkcji diagnozy: dawne
// rundy po jednej z każdego obszaru. Można pominąć i wrócić z pulpitu.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronRight, Circle } from "lucide-react";
import { useSession } from "../../auth";
import type { Poziom } from "../../arkusze/typy";
import { KartaDnia } from "../../components/KartaDnia";
import { Ladowanie } from "../../components/Ladowanie";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Kropki } from "../../components/wykresy";
import { adresMapy, adresRundy, adresStartu } from "../../nauka/adresy";
import { BladRpcNauki, naukaApi, type StanDiagnozyBazy } from "../../nauka/api";
import { krokiDiagnozy, useDiagnoza, useTrybDiagnozy, zmienDiagnoze } from "../../nauka/diagnoza";
import { useDzisAngielski } from "../../nauka/dzis";
import { usePoziomNauki, useZapytanie } from "../../nauka/stan";
import { zapytania } from "../../nauka/zapytania";
import { BladNauki, WyborPoziomuNauki } from "./NaukaPowtorki";
import { Opanowanie } from "./Opanowanie";
import { odczytajRunde, UUID_SESJI, zapiszRunde } from "./sesjaRundy";
import { WynikDiagnozy } from "./WynikDiagnozy";
import s from "./NaukaPowtorki.module.css";

export function Diagnoza() {
  const lokalna = useDiagnoza();
  const [wybranyPoziom, ustawPoziom] = usePoziomNauki();
  // Dawna diagnoza po starcie zostaje przy swoim poziomie, żeby kroki i wyniki dotyczyły jednego poziomu.
  const poziomLokalny = lokalna.od !== null && lokalna.poziom ? lokalna.poziom : wybranyPoziom;
  const tryb = useTrybDiagnozy(wybranyPoziom);

  if (tryb.tryb === "przegladarka") return <DiagnozaWPrzegladarce poziom={poziomLokalny} ustawPoziom={ustawPoziom} />;
  if (tryb.tryb === "baza") return <DiagnozaWBazie poziom={wybranyPoziom} ustawPoziom={ustawPoziom} stan={tryb.stan} ponow={tryb.ponow} />;
  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: "/nauka", nazwa: "Nauka" }} tytul="Od czego zacząć" />
      {tryb.tryb === "blad" ? <BladNauki komunikat="Nie udało się wczytać diagnozy." ponow={tryb.ponow} /> : <Ladowanie etykieta="Wczytuję diagnozę" />}
    </main>
  );
}

function DiagnozaWBazie({ poziom, ustawPoziom, stan, ponow }: {
  poziom: Poziom;
  ustawPoziom: (p: Poziom) => void;
  stan: StanDiagnozyBazy;
  ponow: () => void;
}) {
  const sesja = stan.session;
  const wynik = stan.status === "gotowa" ? sesja?.result ?? null : null;
  const trwa = stan.status === "trwa" && sesja ? sesja : null;
  const nawiguj = useNavigate();
  const konto = useSession();
  const user = konto ? konto.user.id : "anonim";
  const tytul = useRef<HTMLHeadingElement>(null);
  const [zajety, ustawZajety] = useState(false);
  const [blad, ustawBlad] = useState<{ tekst: string; bezZadan?: boolean } | null>(null);
  const dzien = useDzisAngielski(poziom);
  const kluczProby = `sedno.nauka.diagnoza:${user}:${poziom}`;

  // Podsumowanie widać raz: potem pulpit nie zaprasza już do wyników.
  const oznaczona = useRef(false);
  useEffect(() => {
    if (!wynik || stan.seen_at || oznaczona.current) return;
    oznaczona.current = true;
    tytul.current?.focus();
    void naukaApi.oznaczDiagnoze("obejrzana", poziom).catch(() => {});
  }, [wynik, stan.seen_at, poziom]);

  async function zacznij() {
    if (zajety) return;
    // UUID powstaje przed żądaniem i zostaje ten sam przy ponowieniu po błędzie.
    const zapisany = odczytajRunde<string>(kluczProby);
    const id = typeof zapisany === "string" && UUID_SESJI.test(zapisany) ? zapisany : crypto.randomUUID();
    zapiszRunde(kluczProby, id);
    ustawZajety(true);
    ustawBlad(null);
    try {
      const nowy = await naukaApi.zacznijDiagnoze(id, poziom);
      zapiszRunde(kluczProby, null);
      if (nowy.session) nawiguj(adresRundy(nowy.session.id));
      else ponow();
    } catch (e) {
      const kod = e instanceof BladRpcNauki ? e.kod : undefined;
      if (kod === "diagnosis_in_progress") {
        zapiszRunde(kluczProby, null);
        ponow();
      } else if (kod === "no_exercises_for_format") {
        ustawBlad({ tekst: "Na tym poziomie nie ma jeszcze zadań do diagnozy.", bezZadan: true });
      } else {
        ustawBlad({ tekst: e instanceof Error ? e.message : "Nie udało się zacząć diagnozy." });
      }
    } finally {
      ustawZajety(false);
    }
  }

  async function oznacz(status: "pominieta" | "od-nowa") {
    if (zajety) return;
    ustawZajety(true);
    ustawBlad(null);
    try {
      await naukaApi.oznaczDiagnoze(status, poziom);
      if (status === "pominieta") nawiguj("/");
      else ponow();
    } catch (e) {
      ustawBlad({ tekst: e instanceof Error ? e.message : "Nie udało się zapisać zmiany." });
    } finally {
      ustawZajety(false);
    }
  }

  if (wynik && sesja) {
    return (
      <main className={`container ${s.strona}`}>
        <NaglowekStrony wstecz={{ do: "/nauka", nazwa: "Nauka" }} tytul="Pierwsze wyniki" tytulRef={tytul} lead="Tak wygląda start na mapie umiejętności." />
        <WynikDiagnozy poziom={poziom} wynik={wynik} odpowiedzi={sesja.answers} sesja={sesja.id} />
        {dzien.stan === "ladowanie" ? <Ladowanie ksztalt="blok" etykieta="Dobieram ćwiczenie na dziś" /> : dzien.dzis && <KartaDnia dzis={dzien.dzis} />}
        <div className={s.akcje}>
          <Link to={adresMapy(poziom)} className="link">Cała mapa umiejętności <ArrowRight size={14} aria-hidden="true" /></Link>
          <button type="button" className="btn btn-ghost btn-sm" disabled={zajety} onClick={() => void oznacz("od-nowa")}>Diagnoza od nowa</button>
        </div>
        {blad && <p role="alert">{blad.tekst}</p>}
      </main>
    );
  }

  const zrobione = trwa?.answers.length ?? 0;
  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: "/nauka", nazwa: "Nauka" }} tytul="Od czego zacząć" tytulRef={tytul}
        lead={trwa ? "Zadania czekają tam, gdzie skończyła się poprzednia część." : "Kilkanaście krótkich zadań z każdego obszaru, ok. 10 minut."} />

      {!trwa && (
        <div className={s.sekcja}>
          <WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} />
        </div>
      )}

      {trwa && (
        <section className={s.sekcja} aria-labelledby="postep-diagnozy">
          <h2 className="h2" id="postep-diagnozy">Zadania: {zrobione} z {trwa.limit}</h2>
          <Kropki
            opis={`Zrobione ${zrobione} z ${trwa.limit} zadań.`}
            kropki={Array.from({ length: trwa.limit }, (_, i) => {
              const a = trwa.answers.find((o) => o.position === i + 1);
              return { stan: !a ? "pusta" : a.correct ? "dobrze" : a.answer.trim() ? "zle" : "pominiete", biezaca: !a && i === zrobione };
            })}
          />
        </section>
      )}

      {blad && (
        <div className={s.stan}>
          <p role="alert">{blad.tekst}</p>
          {blad.bezZadan && <Link to="/arkusze?przedmiot=angielski" className={`btn btn-secondary ${s.przycisk}`}>Rozwiąż arkusz</Link>}
        </div>
      )}

      {!blad?.bezZadan && (
        <div className={s.akcje}>
          {trwa ? (
            <Link to={adresRundy(trwa.id)} className={`btn btn-primary ${s.przycisk}`}>Dalej <ArrowRight size={18} aria-hidden="true" /></Link>
          ) : (
            <button type="button" className={`btn btn-primary ${s.przycisk}`} disabled={zajety} onClick={() => void zacznij()}>
              {zajety ? "Przygotowuję zadania…" : blad ? "Spróbuj ponownie" : "Zacznij"} {!zajety && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          )}
          {stan.status !== "pominieta" && <button type="button" className="btn btn-ghost" disabled={zajety} onClick={() => void oznacz("pominieta")}>Pomiń</button>}
        </div>
      )}
    </main>
  );
}

/** Dawna diagnoza: po jednej szybkiej rundzie z każdego obszaru, stan w przeglądarce. */
function DiagnozaWPrzegladarce({ poziom, ustawPoziom }: { poziom: Poziom; ustawPoziom: (p: Poziom) => void }) {
  const stan = useDiagnoza();
  const mapa = useZapytanie(zapytania.mapa(poziom));
  const kroki = mapa.dane ? krokiDiagnozy(mapa.dane.skills, stan) : [];
  const nastepny = kroki.find((k) => !k.zrobiony);
  const gotowe = stan.od !== null && kroki.length > 0 && !nastepny;
  const dzien = useDzisAngielski(poziom);
  const nawiguj = useNavigate();
  const tytul = useRef<HTMLHeadingElement>(null);

  // Wszystkie kroki zrobione: podsumowanie widać raz, potem pulpit nie proponuje już diagnozy.
  useEffect(() => {
    if (gotowe && !stan.koniec) {
      zmienDiagnoze({ koniec: true });
      tytul.current?.focus();
    }
  }, [gotowe, stan.koniec]);

  function zacznij() {
    if (!nastepny) return;
    if (stan.od === null) zmienDiagnoze({ od: Date.now(), poziom, kroki: kroki.map((k) => k.umiejetnosc.skill_id), pominieta: false, koniec: false });
    nawiguj(adresStartu(poziom, nastepny.umiejetnosc.skill_id));
  }

  function pomin() {
    zmienDiagnoze({ pominieta: true });
    nawiguj("/");
  }

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: "/nauka", nazwa: "Nauka" }} tytul={gotowe ? "Pierwsze wyniki" : "Od czego zacząć"} tytulRef={tytul} lead={gotowe ? "Tak wygląda start na mapie umiejętności." : "Po jednej krótkiej rundzie z każdego obszaru."} />

      {stan.od === null && (
        <div className={s.sekcja}>
          <WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} />
        </div>
      )}

      {mapa.stan === "ladowanie" && <Ladowanie etykieta="Wczytuję umiejętności" />}
      {mapa.stan === "blad" && <BladNauki komunikat="Nie udało się wczytać umiejętności." ponow={mapa.ponow} />}

      {kroki.length > 0 && (
        <section className={s.sekcja} aria-labelledby="kroki-diagnozy">
          <h2 className="h2" id="kroki-diagnozy">{gotowe ? "Obszary" : `Rundy: ${kroki.filter((k) => k.zrobiony).length} z ${kroki.length}`}</h2>
          <ol className={`wiersze ${s.kroki}`}>
            {kroki.map((k) => (
              <li key={k.obszar.id}>
                <Link to={adresMapy(poziom, k.umiejetnosc.skill_id)} className="wiersz">
                  <span className={`wiersz-ikona ${s.ikona}`} data-zrobiony={k.zrobiony || undefined}>
                    {k.zrobiony ? <Check size={18} aria-label="Zrobione" /> : <Circle size={14} aria-label={k === nastepny ? "Teraz" : "Czeka"} />}
                  </span>
                  <span className="wiersz-tresc">
                    <span className="h3">{k.obszar.nazwa}</span>
                    <span className="wiersz-opis">{k.umiejetnosc.name}</span>
                  </span>
                  <span className="wiersz-wartosc">
                    {k.zrobiony ? <Opanowanie {...k.umiejetnosc} /> : <span className="muted">{k === nastepny ? "teraz" : "czeka"}</span>}
                  </span>
                  <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!gotowe && nastepny && (
        <div className={s.akcje}>
          <button type="button" className={`btn btn-primary ${s.przycisk}`} onClick={zacznij}>
            {stan.od === null ? "Zacznij" : `Dalej: ${nastepny.obszar.nazwa}`} <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-ghost" onClick={pomin}>Pomiń</button>
        </div>
      )}

      {gotowe && (
        <>
          {dzien.stan === "ladowanie" ? <Ladowanie ksztalt="blok" etykieta="Dobieram ćwiczenie na dziś" /> : dzien.dzis && <KartaDnia dzis={dzien.dzis} />}
          <div className={s.akcje}>
            <Link to={adresMapy(poziom)} className="link">Cała mapa umiejętności <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
        </>
      )}
      {mapa.stan === "gotowe" && !kroki.length && (
        <div className={s.stan}>
          <p className="muted">Na tym poziomie nie ma jeszcze rund do diagnozy.</p>
          <Link to="/arkusze?przedmiot=angielski" className={`btn btn-secondary ${s.przycisk}`}>Rozwiąż arkusz</Link>
        </div>
      )}
    </main>
  );
}
