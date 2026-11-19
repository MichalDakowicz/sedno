import { useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import type { Poziom } from "../../arkusze/typy";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Ladowanie } from "../../components/Ladowanie";
import { adresNauki, adresStartu } from "../../nauka/adresy";
import { naukaApi } from "../../nauka/api";
import { usePoziomNauki, useZapytanie } from "../../nauka/stan";
import { zapytania } from "../../nauka/zapytania";
import { BladNauki, formatRundy, procentNauki, WyborPoziomuNauki } from "./NaukaPowtorki";
import { powtorkiNaDni, unikalnePowtorki } from "../pulpit/czasPowtorek";
import { zacznijKolejke } from "../../nauka/kolejka";
import { StanPestki } from "../../components/StanPestki";
import { glos, wybierz } from "../../pestka/glos";
import s from "./Powtorki.module.css";

type Powtorka = Awaited<ReturnType<typeof naukaApi.powtorki>>["queue"][number];

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
        <section aria-label="Powtórki według umiejętności">
          <ul className={`wiersze ${s.wiersze}`}>
            {grupy.map((grupa) => <GrupaPowtorek key={grupa[0]!.skill_id} poziom={poziom} zadania={grupa} />)}
          </ul>
        </section>
      )}
    </main>
  );
}

const zadan = (n: number) => (n === 1 ? "zadanie" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "zadania" : "zadań");

/** Jedna umiejętność, jeden wiersz: co czeka (błędne zadania albo zanikająca pamięć) i od razu przycisk powtórki.
 *  Przycisk startuje kolejkę powtórek tej umiejętności, tak jak „Powtórz wszystkie” dla całej listy. */
function GrupaPowtorek({ poziom, zadania }: { poziom: Poziom; zadania: Powtorka[] }) {
  const navigate = useNavigate();
  const [pierwsze] = zadania;
  if (!pierwsze) return null;
  const bledy = zadania.filter((p) => p.mistake).length;
  const opis = [bledy > 0 && `${bledy} ${zadan(bledy)} z błędem`, bledy < zadania.length && "wylatuje z pamięci"].filter(Boolean).join(", ");
  function powtorz() {
    const adres = zacznijKolejke(zadania.map((p) => adresCwiczenia(poziom, p)));
    if (adres) navigate(adres);
  }
  return (
    <li className={`wiersz ${s.grupa}`}>
      <div className="wiersz-tresc">
        <h3 className="h3">{pierwsze.name}</h3>
        <p className="wiersz-opis">{opis}</p>
      </div>
      <div className="wiersz-wartosc">{pierwsze.retention !== null && <Pamiec retencja={pierwsze.retention} />}</div>
      <div className="wiersz-akcja">
        <button type="button" className="btn btn-ghost btn-sm" onClick={powtorz}>
          <RotateCcw size={15} aria-hidden="true" />
          Powtórz
        </button>
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
