import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { type Poziom } from "../../arkusze/typy";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Ladowanie } from "../../components/Ladowanie";
import { przedmiot, type PrzedmiotId } from "../../konto/przedmioty";
import { useProfil } from "../../auth";
import { klasaPrzedmiotu, PasekPrzedmiotow } from "../../components/PasekPrzedmiotow";
import { SubjectIcon } from "../../components/icons";
import { maMapeZArkuszy } from "../../nauka/mapaPrzedmiotow";
import { adresMapyPrzedmiotu, MapaPrzedmiotu } from "./MapaPrzedmiotu";
import { adresMapy, adresNauki, adresStartu } from "../../nauka/adresy";
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
import { NAZWA_STADIUM, stadium, doNastepnegoStadium } from "../../nauka/stadia";
import { adresWizualizacji, modelDlaUmiejetnosci } from "../../nauka/wizualizacje";
import { Gotowosc } from "../../components/Gotowosc";
import { OBSZARY_NAUKI } from "../../nauka/gotowosc";
import { Ogrod } from "../../components/Ogrod";
import { rozgrzej } from "../../nauka/rozgrzewanie";
import { celPrzedmiotu, useUczenie } from "../../konto/profilUcznia";
import { MINUTY_RUNDY, useDzisAngielski } from "../../nauka/dzis";
import s from "./Umiejetnosci.module.css";
import { MAPA_WIEDZY_WLACZONA } from "../../nauka/wiedza";

// Dawny przełącznik kodów wymagań CKE zapisywał się w przeglądarce; sprzątamy po nim.
try { localStorage.removeItem("sedno.mapa.kody"); } catch { /* bez dostępu do pamięci nie ma czego sprzątać */ }

const OBSZARY = OBSZARY_NAUKI;

const dataProby = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeZone: "Europe/Warsaw" });

function PanelUmiejetnosci({ poziom, umiejetnosc: u }: { poziom: Poziom; umiejetnosc: Umiejetnosc }) {
  const naglowek = useRef<HTMLHeadingElement>(null);
  const proby = useZapytanie(zapytania.dowody(poziom, u.skill_id));
  const maBledyJezykowe = proby.dane?.some((d) => d.score < 1 && d.error_type === "jezyk-i-forma");
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
            {/* Pod liczbą jedno zdanie: ile do następnego stadium rośliny. Pamięć tylko, gdy już ucieka. */}
            <span className={s.podpisLiczby}>
              {doNastepnegoStadium(u.score) ?? "opanowane"}
              {u.retention !== null && u.retention < 0.8 && <> · <span data-tutor-about="To mój szacunek, ile z tej umiejętności zostało ci w pamięci. Maleje z czasem od ostatniego ćwiczenia.">czas na powtórkę</span></>}
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
      {MAPA_WIEDZY_WLACZONA && <Link to={`/nauka/mapa-wiedzy?przedmiot=angielski&umiejetnosc=${u.skill_id}`} className="link small">Notatki o tej umiejętności <ArrowRight size={15} aria-hidden="true" /></Link>}
      <section className={s.blok} aria-labelledby="umiejetnosc-proby">
        {proby.stan === "ladowanie" && <Ladowanie ile={3} etykieta="Wczytuję próby" />}
        {proby.stan === "blad" && <Blad tekst="Nie udało się wczytać prób." ponow={proby.ponow} />}
        {/* Kropki „Ostatnie próby” wyżej wystarczą; pełnej listy prób tu nie wypisujemy. */}
        {proby.stan === "gotowe" && !proby.dane?.length && <div id="umiejetnosc-proby"><StanPestki rozmiar="maly" tekst={wybierz(glos.puste.proby, 0)} /></div>}
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
      <span className="label">Ostatnie {ostatnie.length === 1 ? "próba" : "próby"}</span>
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
  const profil = useProfil();
  const moje = [...new Set((profil?.subjects ?? []).map((p) => p.id))] as PrzedmiotId[];
  const zAdresu = przedmiot(parametry.get("przedmiot") ?? "")?.id;
  const wybranyPrzedmiot: PrzedmiotId = zAdresu ?? (moje.includes("angielski") || !moje.length ? "angielski" : moje[0]!);
  const angielski = wybranyPrzedmiot === "angielski";
  // Pozostałe przedmioty: poziom z profilu (mapa liczy arkusze tego poziomu).
  const poziomPrzedmiotu = (profil?.subjects.find((p) => p.id === wybranyPrzedmiot)?.poziom ?? null) as Poziom | null;
  const mapa = useZapytanie(angielski ? zapytania.mapa(poziom) : null);
  const plan = useZapytanie(angielski ? zapytania.plan(poziom) : null);
  // „Tu dziś” to ta sama propozycja co na pulpicie i w Nauce, nie osobne polecenie mapy.
  const dzis = useDzisAngielski(poziom).dzis;
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
      <NaglowekStrony etykieta={przedmiot(wybranyPrzedmiot)?.nazwa ?? "Język angielski"} tytul="Mapa umiejętności" />
      {/* Każdy przedmiot z profilu ma mapę: angielski z rund, pozostałe z działów i sprawdzonych arkuszy. */}
      {moje.length > 1 && (
        <PasekPrzedmiotow etykieta="Przedmiot" zalezy={wybranyPrzedmiot}>
          {moje.map((p) => (
            <Link key={p} to={p === "angielski" ? adresMapy(poziom) : adresMapyPrzedmiotu(p)} className={klasaPrzedmiotu(p === wybranyPrzedmiot)} data-aktywny={p === wybranyPrzedmiot} aria-current={p === wybranyPrzedmiot ? "page" : undefined}>
              <SubjectIcon subject={przedmiot(p)!} size="sm" /> {przedmiot(p)!.nazwa}
            </Link>
          ))}
        </PasekPrzedmiotow>
      )}
      {angielski && <div className={s.filtry}><WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} /></div>}
      {!angielski && maMapeZArkuszy(wybranyPrzedmiot) && <MapaPrzedmiotu przedmiot={wybranyPrzedmiot} poziom={poziomPrzedmiotu} id={parametry.get("umiejetnosc")} />}
      {!angielski && !maMapeZArkuszy(wybranyPrzedmiot) && (
        <StanPestki tekst={wybierz(glos.puste.mapaDzialow, 0)} akcja={{ etykieta: "Zobacz arkusze", do: `/arkusze?przedmiot=${wybranyPrzedmiot}` }} />
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
              <Ogrod cel={celPrzedmiotu(uczenie, "angielski")} umiejetnosci={umiejetnosci} poziom={poziom} adres={(u) => adresMapy(poziom, u.skill_id)} wybrana={id}
                onZapowiedz={(u) => rozgrzej(zapytania.dowody(poziom, u.skill_id))}
                tuDzis={dzis?.skill_id ?? null} etykieta={`Ogród umiejętności, poziom ${poziom}`} />
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
