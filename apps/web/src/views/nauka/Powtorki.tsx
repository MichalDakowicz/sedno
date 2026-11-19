import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, RotateCcw } from "lucide-react";
import type { Poziom } from "../../arkusze/typy";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Ladowanie } from "../../components/Ladowanie";
import { adresMapy, adresNauki, adresRozbioru, adresStartu } from "../../nauka/adresy";
import { naukaApi } from "../../nauka/api";
import { usePoziomNauki, useZapytanie } from "../../nauka/stan";
import { zapytania } from "../../nauka/zapytania";
import { useSesjaDiagnozy } from "../../nauka/diagnoza";
import { BladNauki, dataNauki, formatRundy, procentNauki, WyborPoziomuNauki } from "./NaukaPowtorki";
import { etykietaZrodla, kluczPowtorki, powtorkiNaDni, unikalnePowtorki } from "../pulpit/czasPowtorek";
import { zacznijKolejke } from "../../nauka/kolejka";
import { StanPestki } from "../../components/StanPestki";
import { glos, wybierz } from "../../pestka/glos";
import s from "./Powtorki.module.css";

type Powtorka = Awaited<ReturnType<typeof naukaApi.powtorki>>["queue"][number];
const odOstatniego = new Intl.RelativeTimeFormat("pl-PL");

// Kolejka z serwera ma błędy jednej umiejętności obok siebie, od najnowszego. Grupa zachowuje tę kolejność.
function grupujBledy(kolejka: Powtorka[]) {
  const grupy = new Map<string, Powtorka[]>();
  for (const p of kolejka) grupy.set(p.skill_id, [...(grupy.get(p.skill_id) ?? []), p]);
  return [...grupy.values()];
}

function adresCwiczenia(poziom: Poziom, p: Powtorka) {
  const powtorz = p.mistake?.repeat_id;
  return adresStartu(poziom, p.skill_id, powtorz ? "szybka-runda" : formatRundy(p.format), powtorz ?? undefined);
}

function etykietaCwiczenia(p: Powtorka) {
  if (p.mistake?.repeat_id) return "Powtórz zadanie";
  if (p.mistake) return "Powtórz podobne";
  return "Zacznij rundę";
}

export function Powtorki() {
  const [poziom, ustawPoziom] = usePoziomNauki();
  const navigate = useNavigate();
  const powtorki = useZapytanie(zapytania.powtorki(poziom));
  const wszystkie = unikalnePowtorki([...(powtorki.dane?.today ? [powtorki.dane.today] : []), ...(powtorki.dane?.queue ?? [])]);
  const dni = powtorkiNaDni(wszystkie);
  const naDzis = dni[0]?.liczba ?? 0;
  const jutro = dni[1]?.liczba ?? 0;
  const wTygodniu = dni.slice(1).reduce((suma, d) => suma + d.liczba, 0);
  // Błędy przed zanikającymi umiejętnościami, w grupach po umiejętności (kolejność z serwera).
  const grupy = grupujBledy([...wszystkie.filter((x) => x.mistake), ...wszystkie.filter((x) => !x.mistake)]);
  const doZrobienia = wszystkie.slice(0, naDzis || wszystkie.length);

  function powtorzWszystkie() {
    const pierwszy = zacznijKolejke(doZrobienia.map((x) => adresCwiczenia(poziom, x)));
    if (pierwszy) navigate(pierwszy);
  }

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony etykieta="Język angielski" tytul="Powtórki" />
      <WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} />

      {(powtorki.stan === "ladowanie" || powtorki.stan === "pominiete") && <Ladowanie ile={8} wysokosc={[900, 880]} etykieta="Wczytuję powtórki" />}
      {powtorki.stan === "blad" && <BladNauki komunikat="Nie udało się wczytać powtórek." ponow={powtorki.ponow} />}
      {powtorki.stan === "gotowe" && !wszystkie.length && (
        <section className={s.glowa} aria-labelledby="powtorki-puste">
          <h2 className="h1" id="powtorki-puste">Nic nie ucieka</h2>
          <StanPestki emocja="radosc" tekst={wybierz(glos.puste.powtorki, 0)} akcja={{ etykieta: "Zacznij nową rundę", do: adresNauki(poziom) }} />
        </section>
      )}

      {powtorki.stan === "gotowe" && wszystkie.length > 0 && (
        <section className={s.glowa} aria-labelledby="powtorki-dzis">
          <h2 className="h1" id="powtorki-dzis">
            {naDzis ? `${naDzis} do powtórki dziś` : "Dziś nic nie ucieka"}
          </h2>
          {(jutro > 0 || wTygodniu > 0) && (
            <p className="muted">{[jutro > 0 && `Jutro: ${jutro}`, wTygodniu > 0 && `w tym tygodniu: ${wTygodniu}`].filter(Boolean).join(", ")}.</p>
          )}
          <button type="button" className={`btn btn-primary ${s.przycisk}`} onClick={powtorzWszystkie}>
            <RotateCcw size={18} aria-hidden="true" />
            {doZrobienia.length > 1 ? `Powtórz wszystkie · ${doZrobienia.length}` : "Powtórz"}
          </button>
        </section>
      )}

      {grupy.length > 0 && (
        <section className={s.sekcja} aria-label="Powtórki według umiejętności">
          <ul className={s.grupy}>
            {grupy.map((grupa) => <GrupaPowtorek key={grupa[0]!.skill_id} poziom={poziom} zadania={grupa} />)}
          </ul>
        </section>
      )}
    </main>
  );
}

/** Umiejętność z liczbą powtórek, zwinięta; po rozwinięciu zadania z linkiem do źródła i jedną akcją każde. */
function GrupaPowtorek({ poziom, zadania }: { poziom: Poziom; zadania: Powtorka[] }) {
  const [pierwsze] = zadania;
  if (!pierwsze) return null;
  return (
    <li>
      <details className={s.grupa}>
        <summary className={s.grupaGlowa}>
          <ChevronRight size={18} aria-hidden="true" className={s.strzalka} />
          <span className="h3">{pierwsze.name}</span>
          <span className={s.ile}>{zadania.length}</span>
        </summary>
        <ul className={`wiersze ${s.wiersze}`}>
          {zadania.map((p) => <WierszPowtorki key={kluczPowtorki(p)} poziom={poziom} powtorka={p} />)}
        </ul>
        <Link className={`link small ${s.mapa}`} to={adresMapy(poziom, pierwsze.skill_id)}>Zobacz na mapie</Link>
      </details>
    </li>
  );
}

function WierszPowtorki({ poziom, powtorka }: { poziom: Poziom; powtorka: Powtorka }) {
  return (
    <li className="wiersz">
      <div className="wiersz-tresc">
        <h3 className="h3">{powtorka.name}</h3>
        <OstatnieCwiczenie powtorka={powtorka} bezPamieci />
        <div className={`small ${s.akcje}`}>
          <ZrodloPowtorki powtorka={powtorka} />
          <Link className="link" to={adresMapy(poziom, powtorka.skill_id)}>Zobacz na mapie</Link>
        </div>
      </div>
      <div className="wiersz-wartosc">{powtorka.retention !== null && <Pamiec retencja={powtorka.retention} />}</div>
      <div className="wiersz-akcja">
        <Link to={adresCwiczenia(poziom, powtorka)} className={`link small ${s.cwicz}`}>
          <RotateCcw size={15} aria-hidden="true" />
          {etykietaCwiczenia(powtorka)}
        </Link>
      </div>
    </li>
  );
}

const OPIS_PAMIECI = "To mój szacunek, ile z tej umiejętności zostało ci w pamięci. Maleje z czasem od ostatniego ćwiczenia, a powtórka go odświeża.";

function Pamiec({ retencja }: { retencja: number }) {
  // Ten sam pasek co opanowanie na mapie (tor 6 px, procent w stałej kolumnie), podpis nad nim od tej samej krawędzi.
  return (
    <span className={`wiersz-pasek ${s.retencja}`} data-tutor-about={OPIS_PAMIECI}>
      <span className={s.retencjaPodpis} aria-hidden="true">Pamiętasz ok.</span>
      <span className={s.retencjaTor} aria-hidden="true">
        <span style={{ width: `${Math.round(Math.min(1, Math.max(0, retencja)) * 100)}%` }} />
      </span>
      <span><span className="visually-hidden">Pamiętasz ok. </span>{procentNauki.format(retencja)}</span>
    </span>
  );
}

function OstatnieCwiczenie({ powtorka, bezPamieci }: { powtorka: Powtorka; bezPamieci?: boolean }) {
  const ostatnio = dataNauki(powtorka.last_practiced_at);
  const retencja = bezPamieci ? null : powtorka.retention;
  if (!ostatnio && retencja === null) return null;
  const dni = powtorka.last_practiced_at ? Math.floor((Date.now() - Date.parse(powtorka.last_practiced_at)) / 86_400_000) : 0;
  return (
    <div className={`small muted ${s.wierszGlowny}`}>
      {ostatnio && powtorka.last_practiced_at && (
        <time dateTime={powtorka.last_practiced_at} title={ostatnio}>
          {dni < 1 ? "Ćwiczone w ciągu ostatniej doby" : `Ostatnie ćwiczenie ${odOstatniego.format(-dni, "day")}`}
        </time>
      )}
      {retencja !== null && <Pamiec retencja={retencja} />}
    </div>
  );
}

function ZrodloPowtorki({ powtorka }: { powtorka: Powtorka }) {
  const [poziom] = usePoziomNauki();
  const diagnoza = useSesjaDiagnozy(poziom);
  const blad = powtorka.mistake;
  if (!blad) return null;
  if (blad.sheet_id) {
    const numer = blad.question?.match(/^\d+/)?.[0];
    const etykieta = etykietaZrodla(blad);
    return <Link className="link" to={`/arkusze/${encodeURIComponent(blad.sheet_id)}${numer ? `#zadanie-${numer}` : ""}`}>{etykieta}</Link>;
  }
  if (blad.session_id) {
    const etykieta = etykietaZrodla(blad, diagnoza);
    return <Link className="link" to={adresRozbioru(blad.session_id)}>{etykieta}</Link>;
  }
  return null;
}

