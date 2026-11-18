import { Link } from "react-router-dom";
import { ArrowRight, RotateCcw, Timer } from "lucide-react";
import type { Poziom } from "../../arkusze/typy";
import { Ladowanie } from "../../components/Ladowanie";
import { adresMapy, adresNauki, adresRozbioru, adresStartu } from "../../nauka/adresy";
import { naukaApi } from "../../nauka/api";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import { Angielski, BladNauki, dataNauki, formatRundy, procentNauki, WyborPoziomuNauki } from "./NaukaPowtorki";
import s from "./Powtorki.module.css";

type Powtorka = Awaited<ReturnType<typeof naukaApi.powtorki>>["queue"][number];
const odOstatniego = new Intl.RelativeTimeFormat("pl-PL");

function kluczPowtorki(p: Powtorka) {
  const m = p.mistake;
  if (!m) return p.skill_id;
  return `${p.skill_id}:${m.source_id ?? m.sheet_id ?? m.session_id ?? ""}:${m.question ?? ""}`;
}

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
  const dzis = powtorki.dane?.today;
  const wykorzystane = new Set(dzis ? [kluczPowtorki(dzis)] : []);
  const pozostale = (powtorki.dane?.queue ?? []).filter((p) => {
    const klucz = kluczPowtorki(p);
    if (wykorzystane.has(klucz)) return false;
    wykorzystane.add(klucz);
    return true;
  });
  const zanikajace = pozostale.filter((p) => !p.mistake);
  const bledy = grupujBledy(pozostale.filter((p) => p.mistake));

  return (
    <main className={`container ${s.strona}`}>
      <header className={s.glowa}>
        <Angielski />
        <h1 className="display">Powtórki</h1>
        <p className="lead">Wróć do zadań, które sprawiły trudność, i odśwież dawno ćwiczone umiejętności.</p>
      </header>

      <div className={s.sekcja}>
        <div className={s.polePoziom}>
          <WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} />
        </div>
      </div>

      {powtorki.stan === "ladowanie" && <Ladowanie ksztalt="pulpit" ile={2} etykieta="Wczytuję powtórki" />}
      {powtorki.stan === "blad" && <BladNauki komunikat="Nie udało się wczytać powtórek." ponow={powtorki.ponow} />}
      {powtorki.stan === "gotowe" && !dzis && !pozostale.length && (
        <section className={s.sekcja} aria-labelledby="powtorki-puste">
          <h2 className="h2" id="powtorki-puste">Nie ma teraz powtórek</h2>
          <p className="muted">Kolejne propozycje pojawią się po sprawdzeniu zadań maturalnych lub zakończeniu ćwiczeń.</p>
          <div className={s.akcje}>
            <Link to={adresNauki(poziom)} className={`btn btn-secondary ${s.przycisk}`}>Przejdź do nauki</Link>
          </div>
        </section>
      )}

      {dzis && (
        <article className={s.karta} aria-labelledby="powtorka-dzis">
          <span className={`label ${s.nadtytul}`}><Timer size={16} aria-hidden="true" /> Na dziś</span>
          <h2 id="powtorka-dzis" className="h1">{dzis.name}</h2>
          <p className="muted">
            {dzis.mistake ? "Wróć do zadania, które sprawiło trudność." : "Czas przypomnieć sobie tę umiejętność."}
          </p>
          <OstatnieCwiczenie powtorka={dzis} />
          <div className={s.akcje}>
            <Link to={adresCwiczenia(poziom, dzis)} className={`btn btn-primary ${s.przycisk}`}>
              {etykietaCwiczenia(dzis)}<ArrowRight size={18} aria-hidden="true" />
            </Link>
            <ZrodloPowtorki powtorka={dzis} />
            <Link className="link" to={adresMapy(poziom, dzis.skill_id)}>Zobacz na mapie</Link>
          </div>
        </article>
      )}

      {bledy.length > 0 && (
        <section className={s.sekcja} aria-labelledby="bledy-powtorki">
          <h2 className="h2" id="bledy-powtorki">Błędy do przećwiczenia</h2>
          <ul className={s.wiersze}>
            {bledy.map((grupa) => <GrupaBledow key={grupa[0].skill_id} poziom={poziom} zadania={grupa} />)}
          </ul>
        </section>
      )}

      {zanikajace.length > 0 && (
        <section className={s.sekcja} aria-labelledby="zanikajace-umiejetnosci">
          <h2 className="h2" id="zanikajace-umiejetnosci">Do odświeżenia</h2>
          <ul className={s.wiersze}>
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
            <Link to={adresCwiczenia(poziom, p)} className={`btn btn-ghost ${s.przycisk}`}>
              <RotateCcw size={16} aria-hidden="true" />
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
    <li className={`${s.wiersz}`}>
      <div className={s.wierszGlowny}>
        <h3 className="h3">{powtorka.name}</h3>
        <OstatnieCwiczenie powtorka={powtorka} />
        <div className={`small ${s.akcje}`}>
          <ZrodloPowtorki powtorka={powtorka} />
          <Link className="link" to={adresMapy(poziom, powtorka.skill_id)}>Zobacz na mapie</Link>
        </div>
      </div>
      <div className={s.wierszBoczny}>
        <Link to={adresCwiczenia(poziom, powtorka)} className={`btn btn-ghost ${s.przycisk}`}>
          <RotateCcw size={16} aria-hidden="true" />
          {etykietaCwiczenia(powtorka)}
        </Link>
      </div>
    </li>
  );
}

function OstatnieCwiczenie({ powtorka }: { powtorka: Powtorka }) {
  const ostatnio = dataNauki(powtorka.last_practiced_at);
  const retencja = powtorka.retention;
  if (!ostatnio && retencja === null) return null;
  const dni = powtorka.last_practiced_at ? Math.floor((Date.now() - Date.parse(powtorka.last_practiced_at)) / 86_400_000) : 0;
  return (
    <div className={`small muted ${s.wierszGlowny}`}>
      {ostatnio && powtorka.last_practiced_at && (
        <time dateTime={powtorka.last_practiced_at} title={ostatnio}>
          {dni < 1 ? "Ćwiczone w ciągu ostatniej doby" : `Ostatnie ćwiczenie ${odOstatniego.format(-dni, "day")}`}
        </time>
      )}
      {retencja !== null && (
        <span className={s.retencja} data-tutor-about="Ten szacunek uwzględnia, ile czasu minęło od ostatniego ćwiczenia.">
          <progress aria-label="Szacowana retencja" value={retencja} max={1} />
          <span aria-hidden="true">Szacowana retencja · {procentNauki.format(retencja)}</span>
        </span>
      )}
    </div>
  );
}

function ZrodloPowtorki({ powtorka }: { powtorka: Powtorka }) {
  const blad = powtorka.mistake;
  if (!blad) return null;
  if (blad.sheet_id) {
    const numer = blad.question?.match(/^\d+/)?.[0];
    const rok = blad.sheet_id.match(/-(20\d{2})-/)?.[1];
    const etykieta = [rok ? `Arkusz CKE ${rok}` : "Arkusz CKE", blad.question ? `zad. ${blad.question}` : null].filter(Boolean).join(" · ");
    return <Link className="link" to={`/arkusze/${encodeURIComponent(blad.sheet_id)}${numer ? `#zadanie-${numer}` : ""}`}>{etykieta}</Link>;
  }
  if (blad.session_id) {
    const etykieta = blad.question ? `Poprzednie ćwiczenie · zad. ${blad.question}` : "Wynik poprzedniego ćwiczenia";
    return <Link className="link" to={adresRozbioru(blad.session_id)}>{etykieta}</Link>;
  }
  return null;
}
