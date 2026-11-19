import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { nazwaZadaniaCke, nazwaZadaniaRundy, type Poziom } from "../../arkusze/typy";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Ladowanie } from "../../components/Ladowanie";
import { przedmiot } from "../../konto/przedmioty";
import { coDzisBezRund } from "../../nauka/dzis";
import { adresMapy, adresNauki, adresRozbioru } from "../../nauka/adresy";
import { naukaApi, type DowodNauki, type Umiejetnosc } from "../../nauka/api";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import { WyborPoziomuNauki } from "./NaukaPowtorki";
import { Opanowanie, OPIS_OPANOWANIA } from "./Opanowanie";
import { Kropki } from "../../components/wykresy";
import { Liczba } from "../../ruch";
import { Kielek } from "../../components/Kielek";
import { NAZWA_STADIUM, stadium } from "../../nauka/stadia";

import s from "./Umiejetnosci.module.css";

// Dawny przełącznik kodów wymagań CKE zapisywał się w przeglądarce; sprzątamy po nim.
try { localStorage.removeItem("sedno.mapa.kody"); } catch { /* bez dostępu do pamięci nie ma czego sprzątać */ }

const OBSZARY = [
  { id: "słuchanie", nazwa: "Rozumienie ze słuchu" },
  { id: "czytanie", nazwa: "Rozumienie tekstów pisanych" },
  { id: "środki językowe", nazwa: "Środki językowe" },
  { id: "pisanie", nazwa: "Wypowiedź pisemna" },
];

const dataProby = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeZone: "Europe/Warsaw" });

function Dowod({ dowod: d }: { dowod: DowodNauki }) {
  const numerZadania = d.question.split(".")[0];
  const adres = d.session_id
    ? adresRozbioru(d.session_id)
    : d.sheet_id && `/arkusze/${encodeURIComponent(d.sheet_id)}#zadanie-${numerZadania}`;
  const nazwa = d.session_id ? nazwaZadaniaRundy(d.happened_at, d.question) : nazwaZadaniaCke(d.sheet_id ?? "", d.question);
  const wynik = d.score >= 1 ? "Dobrze" : d.score <= 0 ? "Błąd" : `${Math.round(d.score * 100)}%`;
  return (
    <li className={s.dowod}>
      <span className={s.nazwa}>
        {adres ? <Link to={adres}>{nazwa}</Link> : <span>{nazwa}</span>}
        <span className="muted small">
          <time dateTime={d.happened_at}>{dataProby.format(new Date(d.happened_at))}</time>
          {!!d.hint_level && ` · użyte podpowiedzi: ${d.hint_level}`}
        </span>
      </span>
      <span className={`small ${d.score >= 1 ? s.dobrze : d.score <= 0 ? s.zle : "muted"}`}>{wynik}</span>
    </li>
  );
}

function PanelUmiejetnosci({ poziom, umiejetnosc: u }: { poziom: Poziom; umiejetnosc: Umiejetnosc }) {
  const naglowek = useRef<HTMLHeadingElement>(null);
  const proby = useZapytanieNauki(`dowody:${poziom}:${u.skill_id}`, (signal) => naukaApi.dowody(u.skill_id, poziom, signal));
  const maBledyJezykowe = proby.dane?.some((d) => d.score < 1 && d.error_type === "jezyk-i-forma");

  useEffect(() => {
    naglowek.current?.focus();
  }, [u.skill_id]);

  return (
    <aside className={s.panel} aria-labelledby="umiejetnosc-tytul">
      <Link to={adresMapy(poziom)} className={s.wroc}><ArrowLeft size={16} aria-hidden="true" /> Wszystkie umiejętności</Link>
      <div className={s.blok}>
        <h2 id="umiejetnosc-tytul" className="h2" tabIndex={-1} ref={naglowek}>{u.name}</h2>
        <p>{u.description}</p>
      </div>
      <div className={s.blok}>
        {u.score === null ? (
          <p className="muted">Za mało odpowiedzi, żebym oceniła tę umiejętność. Jedna runda wystarczy.</p>
        ) : (
          <div className={s.zKielkiem}>
          <Kielek stadium={stadium(u.score)} rozmiar={88} animuj opis={`Stadium: ${NAZWA_STADIUM[stadium(u.score)]}`} />
          <p className={s.duza} data-tutor-about={OPIS_OPANOWANIA}>
            <Liczba wartosc={Math.round(u.score * 100)} /><span className={s.jednostka}>%</span>
            <span className={s.podpisLiczby}>
              opanowania z {u.evidence_count} {u.evidence_count === 1 ? "próby" : "prób"}
              {u.retention !== null && <> · <span data-tutor-about="To mój szacunek, ile z tej umiejętności zostało ci w pamięci. Maleje z czasem od ostatniego ćwiczenia.">pamiętasz ok. {Math.round(u.retention * 100)}%</span></>}
            </span>
          </p>
          </div>
        )}
        {proby.stan === "gotowe" && !!proby.dane?.length && <OstatnieProby proby={proby.dane} />}
      </div>
      <Link to={adresNauki(poziom, u.skill_id)} className={`btn btn-primary ${s.przycisk}`}>Ćwicz <ArrowRight size={16} aria-hidden="true" /></Link>
      <section className={s.blok} aria-labelledby="umiejetnosc-proby">
        {proby.stan === "ladowanie" && <Ladowanie ile={3} etykieta="Wczytuję próby" />}
        {proby.stan === "blad" && <Blad tekst="Nie udało się wczytać prób." ponow={proby.ponow} />}
        {proby.stan === "gotowe" && (proby.dane?.length ? (
          <details className={s.rozwijane}>
            <summary id="umiejetnosc-proby"><ChevronRight size={16} aria-hidden="true" /> Wszystkie próby ({proby.dane.length})</summary>
            <ul className="wiersze">
              {proby.dane.map((d) => <Dowod key={`${d.source_id}:${d.session_id ?? d.sheet_id}:${d.question}`} dowod={d} />)}
            </ul>
          </details>
        ) : <p className="muted" id="umiejetnosc-proby">Sprawdź zadania w arkuszu albo ukończ rundę, żeby zobaczyć tu pierwsze próby.</p>)}
        {maBledyJezykowe && <p className="small muted">W ostatnich próbach pojawiły się błędy językowe i dotyczące formy.</p>}
      </section>
    </aside>
  );
}

const OSTATNIE = 10;

/** Ostatnie próby od najstarszej do najnowszej: kropka zielona dobrze, czerwona źle, z kreską częściowo. */
function OstatnieProby({ proby }: { proby: DowodNauki[] }) {
  const ostatnie = [...proby].sort((a, b) => a.happened_at.localeCompare(b.happened_at)).slice(-OSTATNIE);
  const dobre = ostatnie.filter((d) => d.score >= 1).length;
  return (
    <div className={s.ostatnie}>
      <span className="label">Ostatnie {ostatnie.length === 1 ? "próba" : "próby"}: {dobre} z {ostatnie.length} dobrze</span>
      <Kropki rozmiar="male" opis={`Ostatnie ${ostatnie.length} prób: ${dobre} dobrze.`}
        kropki={ostatnie.map((d) => ({ stan: d.score >= 1 ? "dobrze" : d.score <= 0 ? "zle" : "pominiete", tytul: dataProby.format(new Date(d.happened_at)) }))} />
    </div>
  );
}

function Blad({ tekst, ponow }: { tekst: string; ponow: () => void }) {
  return (
    <div className={s.blok}>
      <p role="alert">{tekst}</p>
      <button type="button" className={`btn btn-ghost btn-sm ${s.przycisk}`} onClick={ponow}>Spróbuj ponownie</button>
    </div>
  );
}

export function Umiejetnosci() {
  const [parametry] = useSearchParams();
  const [poziom, ustawPoziom] = usePoziomNauki();
  const wybranyPrzedmiot = przedmiot(parametry.get("przedmiot") ?? "angielski")?.id ?? "angielski";
  const angielski = wybranyPrzedmiot === "angielski";
  const innyPrzedmiot = angielski ? null : coDzisBezRund[wybranyPrzedmiot] ?? { akcja: { do: adresMapy(poziom), etykieta: "Mapa angielskiego" } };
  const mapa = useZapytanieNauki(angielski ? `mapa:${poziom}` : null, (signal) => naukaApi.mapa(poziom, signal));
  const umiejetnosci = mapa.dane?.skills;
  const id = parametry.get("umiejetnosc");
  const wybrana = umiejetnosci?.find((u) => u.skill_id === id);
  const ostatniPanel = useRef<string | null>(null);
  useEffect(() => {
    if (wybrana) ostatniPanel.current = wybrana.skill_id;
    else if (ostatniPanel.current && !id && mapa.stan === "gotowe") {
      document.getElementById(`umiejetnosc-${ostatniPanel.current}`)?.focus();
      ostatniPanel.current = null;
    }
  }, [wybrana, id, mapa.stan]);

  return (
    <main className={`container ${s.strona}`} data-panel={!!wybrana}>
      <NaglowekStrony etykieta="Język angielski" tytul="Mapa umiejętności" lead="Jak radzisz sobie z wymaganiami matury." />
      {/* Mapę ma tylko angielski, więc nie ma pigułek przedmiotów prowadzących do pustej strony. Stary link
          z ?przedmiot= dostaje jedno zdanie i to, co w tym przedmiocie da się zrobić zamiast mapy. */}
      {angielski && <div className={s.filtry}><WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} /></div>}
      {!angielski && innyPrzedmiot && (
        <div className={s.blok}>
          <p className="muted">Mapa umiejętności jest na razie tylko dla angielskiego.</p>
          <Link to={innyPrzedmiot.akcja.do} className={`btn btn-secondary ${s.przycisk}`}>{innyPrzedmiot.akcja.etykieta}</Link>
        </div>
      )}
      {mapa.stan === "ladowanie" && <Ladowanie etykieta="Wczytuję mapę umiejętności" />}
      {mapa.stan === "blad" && <Blad tekst="Nie udało się wczytać mapy umiejętności." ponow={mapa.ponow} />}
      {angielski && umiejetnosci && (
        <div className={s.uklad} data-panel={!!wybrana}>
          <div className={s.grupy}>
            {id && !wybrana && <p role="status">Tej umiejętności nie ma w mapie.</p>}
            {umiejetnosci.every((u) => u.score === null) && (
              <div className={s.blok}>
                <p className="muted">Procenty pojawią się po pierwszej rundzie.</p>
                <Link to={adresNauki(poziom)} className={`btn btn-secondary btn-sm ${s.przycisk}`}>Zacznij szybką rundę</Link>
              </div>
            )}
            {OBSZARY.map(({ id: obszar, nazwa }, i) => {
              const wObszarze = umiejetnosci.filter((u) => u.area === obszar);
              return wObszarze.length > 0 && (
                <section className={s.blok} aria-labelledby={`obszar-${i}`} key={obszar}>
                  <h2 className="h2" id={`obszar-${i}`}>{nazwa}</h2>
                  <ul className="wiersze">
                    {wObszarze.map((u) => (
                      <li key={u.skill_id}>
                        <Link id={`umiejetnosc-${u.skill_id}`} to={adresMapy(poziom, u.skill_id)} className={`wiersz ${s.wiersz}`} aria-current={u.skill_id === id ? "true" : undefined}>
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
          {wybrana && <PanelUmiejetnosci poziom={poziom} umiejetnosc={wybrana} />}
        </div>
      )}
    </main>
  );
}
