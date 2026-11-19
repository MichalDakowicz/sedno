import { Link } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import type { Poziom } from "../../arkusze/typy";
import { KartaDnia } from "../../components/KartaDnia";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { useDzisAngielski } from "../../nauka/dzis";
import { ZakladkiNauki } from "./ZakladkiNauki";
import { Ladowanie } from "../../components/Ladowanie";
import { adresMapy, adresNauki, adresRozbioru, adresStartu } from "../../nauka/adresy";
import { naukaApi } from "../../nauka/api";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import { BladNauki, dataNauki, formatRundy, procentNauki, WyborPoziomuNauki } from "./NaukaPowtorki";
import { etykietaZrodla, kluczPowtorki, unikalnePowtorki } from "../pulpit/czasPowtorek";
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
  if (p.mistake) return "Ćwicz podobne";
  return "Zacznij rundę";
}

export function Powtorki() {
  const [poziom, ustawPoziom] = usePoziomNauki();
  const powtorki = useZapytanieNauki(`nauka:powtorki:${poziom}`, (signal) => naukaApi.powtorki(poziom, signal));
  // Karta na górze to propozycja dnia, ta sama co na pulpicie i w Nauce; powtórka z karty nie wraca na liście.
  const dzien = useDzisAngielski(poziom);
  const naKarcie = dzien.dzis?.powtorka;
  const wszystkie = unikalnePowtorki([...(powtorki.dane?.today ? [powtorki.dane.today] : []), ...(powtorki.dane?.queue ?? [])]);
  const pozostale = wszystkie.filter((p) => !naKarcie || kluczPowtorki(p) !== kluczPowtorki(naKarcie));
  const zanikajace = pozostale.filter((p) => !p.mistake);
  const bledy = grupujBledy(pozostale.filter((p) => p.mistake));

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony etykieta="Język angielski" tytul="Nauka" lead="Trudne zadania i dawno ćwiczone umiejętności.">
        <ZakladkiNauki />
      </NaglowekStrony>

      {dzien.stan === "ladowanie" ? <Ladowanie ksztalt="blok" etykieta="Dobieram ćwiczenie na dziś" /> : dzien.dzis && <KartaDnia dzis={dzien.dzis} />}

      <div className={s.sekcja}>
        <div className={s.polePoziom}>
          <WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} />
        </div>
      </div>

      {(powtorki.stan === "ladowanie" || powtorki.stan === "pominiete") && <Ladowanie ksztalt="pulpit" ile={2} etykieta="Wczytuję powtórki" />}
      {powtorki.stan === "blad" && <BladNauki komunikat="Nie udało się wczytać powtórek." ponow={powtorki.ponow} />}
      {powtorki.stan === "gotowe" && !wszystkie.length && (
        <section className={s.sekcja} aria-labelledby="powtorki-puste">
          <h2 className="h2" id="powtorki-puste">Nie ma teraz powtórek</h2>
          <p className="muted">Kolejne propozycje pojawią się po sprawdzeniu zadań maturalnych lub zakończeniu ćwiczeń.</p>
          <div className={s.akcje}>
            <Link to={adresNauki(poziom)} className={`btn btn-secondary ${s.przycisk}`}>Przejdź do nauki</Link>
          </div>
        </section>
      )}



      {bledy.length > 0 && (
        <section className={s.sekcja} aria-labelledby="bledy-powtorki">
          <h2 className="h2" id="bledy-powtorki">Błędy do przećwiczenia</h2>
          <ul className={`wiersze ${s.wiersze}`}>
            {bledy.map((grupa) => <GrupaBledow key={grupa[0].skill_id} poziom={poziom} zadania={grupa} />)}
          </ul>
        </section>
      )}

      {zanikajace.length > 0 && (
        <section className={s.sekcja} aria-labelledby="zanikajace-umiejetnosci">
          <h2 className="h2" id="zanikajace-umiejetnosci">Do odświeżenia</h2>
          <ul className={`wiersze ${s.wiersze}`}>
            {zanikajace.map((p) => <WierszPowtorki key={kluczPowtorki(p)} poziom={poziom} powtorka={p} />)}
          </ul>
        </section>
      )}
    </main>
  );
}

function GrupaBledow({ poziom, zadania }: { poziom: Poziom; zadania: Powtorka[] }) {
  const [pierwsze] = zadania;
  return (
    <li className={s.grupa}>
      <div className={s.grupaGlowa}>
        <h3 className="h3">{pierwsze.name}</h3>
        <OstatnieCwiczenie powtorka={pierwsze} />
        <Link className={`link small ${s.mapa}`} to={adresMapy(poziom, pierwsze.skill_id)}>Zobacz na mapie</Link>
      </div>
      <ul className={s.zadania}>
        {zadania.map((p) => (
          <li key={kluczPowtorki(p)} className={s.zadanie}>
            <div className={`small ${s.zadanieOpis}`}>
              {p.mistake?.sheet_id || p.mistake?.session_id ? <ZrodloPowtorki powtorka={p} /> : "Zadanie do powtórzenia"}
            </div>
            <Link to={adresCwiczenia(poziom, p)} className={`link small ${s.cwicz}`}>
              <RotateCcw size={15} aria-hidden="true" />
              {etykietaCwiczenia(p)}
            </Link>
          </li>
        ))}
      </ul>
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
  return (
    <span className={s.retencja} data-tutor-about={OPIS_PAMIECI}>
      <span className="muted" aria-hidden="true">Pamiętasz ok.</span>
      <span className="wiersz-pasek">
        <progress aria-label={`Pamiętasz ok. ${procentNauki.format(retencja)}`} value={retencja} max={1} />
        <span aria-hidden="true">{procentNauki.format(retencja)}</span>
      </span>
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
  const blad = powtorka.mistake;
  if (!blad) return null;
  if (blad.sheet_id) {
    const numer = blad.question?.match(/^\d+/)?.[0];
    const etykieta = etykietaZrodla(blad);
    return <Link className="link" to={`/arkusze/${encodeURIComponent(blad.sheet_id)}${numer ? `#zadanie-${numer}` : ""}`}>{etykieta}</Link>;
  }
  if (blad.session_id) {
    const etykieta = etykietaZrodla(blad);
    return <Link className="link" to={adresRozbioru(blad.session_id)}>{etykieta}</Link>;
  }
  return null;
}
