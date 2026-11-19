import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { nazwaZadaniaCke, nazwaZadaniaRundy, type Poziom } from "../../arkusze/typy";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Ladowanie } from "../../components/Ladowanie";
import { przedmiot } from "../../konto/przedmioty";
import { coDzisBezRund } from "../../nauka/dzis";
import { adresMapy, adresNauki, adresRozbioru, adresStartu } from "../../nauka/adresy";
import { type DowodNauki, type Umiejetnosc } from "../../nauka/api";
import { usePoziomNauki, useZapytanie } from "../../nauka/stan";
import { zapytania } from "../../nauka/zapytania";
import { WyborPoziomuNauki } from "./NaukaPowtorki";
import { Opanowanie, OPIS_OPANOWANIA } from "./Opanowanie";
import { Kropki, Linia } from "../../components/wykresy";
import { liniaOpanowania, wniosekLinii } from "../../nauka/historia";
import { Liczba } from "../../ruch";
import { Kielek } from "../../components/Kielek";
import { StanPestki } from "../../components/StanPestki";
import { glos, wybierz } from "../../pestka/glos";
import { NAZWA_STADIUM, stadium } from "../../nauka/stadia";
import { useSesjaDiagnozy } from "../../nauka/diagnoza";
import { adresWizualizacji, modelDlaUmiejetnosci } from "../../nauka/wizualizacje";
import { Gotowosc } from "../../components/Gotowosc";
import { OBSZARY_NAUKI } from "../../nauka/gotowosc";
import { Ogrod } from "../../components/Ogrod";
import { rozgrzej } from "../../nauka/rozgrzewanie";
import { celPrzedmiotu, useUczenie } from "../../konto/profilUcznia";
import { MINUTY_RUNDY, usePolecenieDnia } from "../../nauka/dzis";
import s from "./Umiejetnosci.module.css";

// Dawny przełącznik kodów wymagań CKE zapisywał się w przeglądarce; sprzątamy po nim.
try { localStorage.removeItem("sedno.mapa.kody"); } catch { /* bez dostępu do pamięci nie ma czego sprzątać */ }

const OBSZARY = OBSZARY_NAUKI;

const dataProby = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeZone: "Europe/Warsaw" });

function Dowod({ dowod: d, diagnoza }: { dowod: DowodNauki; diagnoza: string | null }) {
  const numerZadania = d.question.split(".")[0];
  const adres = d.session_id
    ? adresRozbioru(d.session_id)
    : d.sheet_id && `/arkusze/${encodeURIComponent(d.sheet_id)}#zadanie-${numerZadania}`;
  const nazwa = d.session_id
    ? nazwaZadaniaRundy(d.happened_at, d.question, d.session_id === diagnoza ? "Diagnoza" : undefined)
    : nazwaZadaniaCke(d.sheet_id ?? "", d.question);
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
  const proby = useZapytanie(zapytania.dowody(poziom, u.skill_id));
  const maBledyJezykowe = proby.dane?.some((d) => d.score < 1 && d.error_type === "jezyk-i-forma");
  const diagnoza = useSesjaDiagnozy(poziom);
  // Historia opanowania (nauka_historia): bez funkcji w bazie albo przy ocenie z jednego dnia linii nie ma.
  const historia = useZapytanie(zapytania.historia(poziom));
  const punkty = historia.dane?.skills.find((h) => h.skill_id === u.skill_id)?.points;
  const linia = u.score !== null && punkty && historia.dane ? liniaOpanowania(punkty, historia.dane.to) : null;

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
        {linia && (
          <div className={s.ostatnie}>
            <span className="label">{wniosekLinii(linia)}</span>
            <Linia punkty={linia.wartosci} podpisOstatniego={`${Math.round(linia.wartosci.at(-1)! * 100)}%`}
              opis={`${wniosekLinii(linia)}. Opanowanie teraz ${Math.round(linia.wartosci.at(-1)! * 100)}%.`} />
          </div>
        )}
        {proby.stan === "gotowe" && !!proby.dane?.length && <OstatnieProby proby={proby.dane} />}
      </div>
      <Link to={adresStartu(poziom, u.skill_id, u.formats.includes("szybka-runda") || !u.formats.length ? "szybka-runda" : u.formats[0])} className={`btn btn-primary ${s.przycisk}`}>
        Zacznij rundę · {MINUTY_RUNDY} min <ArrowRight size={16} aria-hidden="true" />
      </Link>
      {modelDlaUmiejetnosci(u.skill_id) && (
        <Link to={adresWizualizacji(modelDlaUmiejetnosci(u.skill_id)!)} className="link small">Zobacz na modelu <ArrowRight size={15} aria-hidden="true" /></Link>
      )}
      <Link to={`/nauka/mapa-wiedzy?przedmiot=angielski&umiejetnosc=${u.skill_id}`} className="link small">Notatki o tej umiejętności <ArrowRight size={15} aria-hidden="true" /></Link>
      <section className={s.blok} aria-labelledby="umiejetnosc-proby">
        {proby.stan === "ladowanie" && <Ladowanie ile={3} etykieta="Wczytuję próby" />}
        {proby.stan === "blad" && <Blad tekst="Nie udało się wczytać prób." ponow={proby.ponow} />}
        {proby.stan === "gotowe" && (proby.dane?.length ? (
          <details className={s.rozwijane}>
            <summary id="umiejetnosc-proby"><ChevronRight size={16} aria-hidden="true" /> Wszystkie próby ({proby.dane.length})</summary>
            <ul className="wiersze">
              {proby.dane.map((d) => <Dowod key={`${d.source_id}:${d.session_id ?? d.sheet_id}:${d.question}`} dowod={d} diagnoza={diagnoza} />)}
            </ul>
          </details>
        ) : <div id="umiejetnosc-proby"><StanPestki rozmiar="maly" tekst={wybierz(glos.puste.proby, 0)} /></div>)}
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
  const mapa = useZapytanie(angielski ? zapytania.mapa(poziom) : null);
  const plan = useZapytanie(angielski ? zapytania.plan(poziom) : null);
  const polecenie = usePolecenieDnia(poziom, angielski);
  const uczenie = useUczenie();
  const umiejetnosci = mapa.dane?.skills;
  const id = parametry.get("umiejetnosc");
  const wybrana = umiejetnosci?.find((u) => u.skill_id === id);
  const ostatniPanel = useRef<string | null>(null);
  useEffect(() => {
    if (wybrana) ostatniPanel.current = wybrana.skill_id;
    else if (ostatniPanel.current && !id && mapa.stan === "gotowe") {
      // Fokus wraca na roślinę w ogrodzie albo na wiersz listy (telefon), zależnie od tego, co widać.
      const roslina = document.getElementById(`roslina-${ostatniPanel.current}`);
      (roslina?.offsetParent ? roslina : document.getElementById(`umiejetnosc-${ostatniPanel.current}`))?.focus();
      ostatniPanel.current = null;
    }
  }, [wybrana, id, mapa.stan]);

  return (
    <main className={`container ${s.strona}`} data-panel={!!wybrana}>
      <NaglowekStrony etykieta="Język angielski" tytul="Mapa umiejętności" />
      {/* Mapę ma tylko angielski, więc nie ma pigułek przedmiotów prowadzących do pustej strony. Stary link
          z ?przedmiot= dostaje jedno zdanie i to, co w tym przedmiocie da się zrobić zamiast mapy. */}
      {angielski && <div className={s.filtry}><WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} /></div>}
      {!angielski && innyPrzedmiot && (
        <div className={s.blok}>
          <p className="muted">Mapa umiejętności jest na razie tylko dla angielskiego.</p>
          <Link to={innyPrzedmiot.akcja.do} className={`btn btn-secondary ${s.przycisk}`}>{innyPrzedmiot.akcja.etykieta}</Link>
        </div>
      )}
      {mapa.stan === "ladowanie" && <Ladowanie wysokosc={[514, 1440]} etykieta="Wczytuję mapę umiejętności" />}
      {mapa.stan === "blad" && <Blad tekst="Nie udało się wczytać mapy umiejętności." ponow={mapa.ponow} />}
      {angielski && umiejetnosci && (
        <div className={s.uklad} data-panel={!!wybrana}>
          <div className={s.grupy}>
            {id && !wybrana && <p role="status">Tej umiejętności nie ma w mapie.</p>}
            <Gotowosc umiejetnosci={umiejetnosci} cel={celPrzedmiotu(uczenie, "angielski")} prognoza={plan.dane?.forecast.score}>
              {umiejetnosci.every((u) => u.score === null) && (
                <Link to={adresNauki(poziom)} className={`btn btn-primary ${s.przycisk}`}>Zacznij pierwszą rundę</Link>
              )}
            </Gotowosc>
            <div className={s.ogrod}>
              <Ogrod umiejetnosci={umiejetnosci} poziom={poziom} adres={(u) => adresMapy(poziom, u.skill_id)} wybrana={id}
                onZapowiedz={(u) => rozgrzej(zapytania.dowody(poziom, u.skill_id))}
                tuDzis={polecenie.dane?.skill_id ?? null} etykieta={`Ogród umiejętności, poziom ${poziom}`} />
            </div>
            <div className={s.lista}>
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
          </div>
          {wybrana && <PanelUmiejetnosci poziom={poziom} umiejetnosc={wybrana} />}
        </div>
      )}
    </main>
  );
}
