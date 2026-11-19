// „Twój tydzień”: dni z nauką jako kropki, seria, minuty nauki w ostatnich tygodniach i najbliższe dni z planu
// (nauka_plan). Prognoza jest w widgecie „Do matury”. Dni, seria i minuty są z dziennika nauka_aktywnosc. Gdy baza
// go nie ma (przed migracją 0022), dni i serię liczymy jak dawniej z dat prób nauka_dowody (angielski, do 100 ostatnich
// na umiejętność) i zapisów postępu arkuszy (sheet_progress.updated_at, każdy przedmiot), a minut nie pokazujemy.
import { useMemo, useState } from "react";
import { Ladowanie } from "../../components/Ladowanie";
import { Kropki, Linia } from "../../components/wykresy";
import { dniAktywne, minutyTygodni, wniosekMinut } from "../../nauka/historia";
import { TutorAvatar } from "../../components/TutorAvatar";
import { usePostepyKonta } from "../../konto/wyniki";
import { minutyDziennie, useUczenie } from "../../konto/profilUcznia";
import { naukaApi, type PlanNauki } from "../../nauka/api";
import { usePoziomNauki, useZapytanieNauki, useZapytanie } from "../../nauka/stan";
import { zapytania } from "../../nauka/zapytania";
import type { KontekstPulpitu } from "./widgety";
import styles from "../Dashboard.module.css";
import w from "./Widgety.module.css";

const DNI = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const DNI_PELNE = ["poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela"];
const wielka = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const dzienWarszawa = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" });

/** Data YYYY-MM-DD w strefie Europe/Warsaw, w której baza liczy plan. */
const dzien = (d: Date | string) => dzienWarszawa.format(typeof d === "string" ? new Date(d) : d);
/** Przesunięcie daty YYYY-MM-DD o n dni (w UTC, bez wpływu stref i zmian czasu). */
function przesun(data: string, n: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const dzienTygodnia = (data: string) => (new Date(`${data}T12:00:00Z`).getUTCDay() + 6) % 7;

export function tydzienNauki(dni: Set<string>, dzis: string) {
  const poniedzialek = przesun(dzis, -dzienTygodnia(dzis));
  const tydzien = DNI.map((_, i) => przesun(poniedzialek, i));
  let seria = 0;
  // Seria trwa do końca dnia: bez nauki dziś liczymy od wczoraj.
  for (let d = dni.has(dzis) ? dzis : przesun(dzis, -1); dni.has(d); d = przesun(d, -1)) seria++;
  return { tydzien, zNauka: tydzien.filter((d) => dni.has(d)).length, seria };
}

const odmianaDni = (n: number) => (n === 1 ? "dzień" : "dni");

/** Serie, przy których Pestka świętuje; między nimi tylko się cieszy. */
const KAMIENIE_SERII = [3, 7, 14, 30, 50, 100];

export function TwojTydzien({ zakres, aktywny }: KontekstPulpitu) {
  const [poziom] = usePoziomNauki();
  const angielski = (!aktywny || aktywny === "angielski") && zakres.some((s) => s.przedmiot.id === "angielski");
  const plan = useZapytanie(angielski ? zapytania.plan(poziom) : null);
  const aktywnosc = useZapytanie(angielski ? zapytania.aktywnosc() : null);
  // Dawne liczenie z dat prób tylko wtedy, gdy baza nie ma dziennika (albo nie odpowiedziała).
  const zDowodow = angielski && (aktywnosc.stan === "blad" || (aktywnosc.stan === "gotowe" && !aktywnosc.dane));
  const proby = useZapytanieNauki(zDowodow ? `nauka:dni:${poziom}` : null, async (signal) => {
    const mapa = await naukaApi.mapa(poziom, signal);
    const cwiczone = mapa.skills.filter((u) => u.evidence_count > 0);
    const listy = await Promise.all(cwiczone.map((u) => naukaApi.dowody(u.skill_id, poziom, signal)));
    return listy.flat().map((d) => d.happened_at);
  });
  const arkusze = usePostepyKonta();
  const uczenie = useUczenie();
  const [edycja, ustawEdycje] = useState(false);

  const dzis = dzien(new Date());
  const dziennik = aktywnosc.dane;
  const dni = useMemo(
    () => dziennik ? dniAktywne(dziennik) : new Set([...(proby.dane ?? []), ...(arkusze ?? []).map((a) => a.updated_at)].map(dzien)),
    [dziennik, proby.dane, arkusze],
  );
  if (!angielski) return null;

  const policzone = tydzienNauki(dni, dzis);
  const { tydzien, zNauka } = policzone;
  const seria = dziennik ? dziennik.streak.current : policzone.seria;
  const minuty = dziennik ? minutyTygodni(dziennik) : null;
  const czeka = plan.stan === "ladowanie" || aktywnosc.stan === "ladowanie" || proby.stan === "ladowanie";
  const p = plan.dane;
  // Porównanie z deklaracją z quizu celów: dni w tygodniu i minuty dziennie.
  const minutyPlan = minutyDziennie(uczenie);
  const celDni = uczenie.dni ?? null;
  const zostalo = celDni !== null ? celDni - zNauka : null;
  const iDzis = tydzien.indexOf(dzis);
  const dzisWPlanie = !!p && iDzis >= 0 && p.weekdays.includes(iDzis + 1) && !dni.has(dzis);
  const najblizszy = p ? tydzien.findIndex((d, i) => d > dzis && p.weekdays.includes(i + 1)) : -1;
  const podsumowanie = [
    zostalo === null ? "" : zostalo <= 0 ? "Cel tygodnia zrobiony." : `Do celu ${zostalo === 1 ? "został 1 dzień" : `zostały ${zostalo} dni`}.`,
    zostalo !== null && zostalo > 0 ? (dzisWPlanie ? "Dziś jest dzień nauki w twoim planie." : najblizszy >= 0 ? `Najbliższy dzień w planie: ${DNI_PELNE[najblizszy]}.` : "") : "",
    minuty ? `W tym tygodniu ${minuty.teraz} min nauki${minutyPlan && celDni ? ` z ${minutyPlan * celDni} zaplanowanych` : ""}.` : "",
  ].filter(Boolean).join(" ");

  return (
    <section className={`${styles.section} wejscie`} aria-labelledby="tydzien-widget">
      <div className={styles.sectionHead}>
        <h2 id="tydzien-widget" className="h2">Twój tydzień</h2>
      </div>

      {czeka && <Ladowanie ile={4} wysokosc={[420, 470]} etykieta="Wczytuję tydzień" />}
      {plan.stan === "blad" && (
        <div className={w.blad}>
          <p role="alert">Nie udało się wczytać planu tygodnia.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={plan.ponow}>Spróbuj ponownie</button>
        </div>
      )}

      {p && !czeka && (
        <>
          {edycja && <DniNauki plan={p} poziom={poziom} zapisano={plan.ponow} />}
          {/* Co zrobić dziś, mówi karta „Dziś warto”. Tu tydzień względem celu: ile dni, seria, najbliższy dzień w planie. */}
          <div className={w.tydzienBlok}>
          <div className={w.tydzienGora}>
            <p className={w.tydzienZdanie}><strong>{zNauka}</strong> z {celDni ?? 7} dni nauki w tym tygodniu</p>
            {seria >= 2 && (
              <p className={w.seria}>
                <TutorAvatar size={32} state={KAMIENIE_SERII.includes(seria) ? "swieto" : "radosc"} />
                <span>seria <strong>{seria}</strong> {odmianaDni(seria)}</span>
              </p>
            )}
          </div>
          {celDni !== null && (
            <div className={w.celPasek} role="img" aria-label={`${Math.min(zNauka, celDni)} z ${celDni} dni celu`}>
              {Array.from({ length: celDni }, (_, i) => <span key={i} data-pelny={i < zNauka || undefined} />)}
            </div>
          )}
          <div className={w.dniTygodnia}>
          <Kropki rowno opis={`W tym tygodniu ${zNauka} z 7 dni z nauką, seria ${seria} ${odmianaDni(seria)}.`}
            kropki={tydzien.map((d, i) => {
              const nauka = dni.has(d);
              const zaplanowany = p.weekdays.includes(i + 1);
              return {
                podpis: DNI[i],
                biezaca: d === dzis,
                stan: nauka ? "pelna" : d >= dzis && zaplanowany ? "plan" : "pusta",
                tytul: `${DNI_PELNE[i]}: ${nauka ? "nauka" : zaplanowany ? "dzień nauki w planie" : "bez nauki"}`,
              };
            })} />
          </div>
          <p className={`small muted ${w.tydzienDol}`}>
            {podsumowanie && <span>{podsumowanie}</span>}
            <button type="button" className="link small" aria-expanded={edycja} onClick={() => ustawEdycje((e) => !e)}>
              {edycja ? "Gotowe" : "Zmień dni nauki"}
            </button>
          </p>
          </div>
          {minuty && (
            <div className={w.minuty}>
              <span className="label">{wniosekMinut(minuty)}</span>
              <Linia punkty={minuty.wartosci.map((m) => m / Math.max(...minuty.wartosci, 1))} wysokosc={48} podpisOstatniego={`${minuty.teraz} min`}
                opis={`${wniosekMinut(minuty)}. Minuty nauki w ostatnich ${minuty.wartosci.length} tygodniach: ${minuty.wartosci.join(", ")}.`} />
            </div>
          )}
          {proby.stan === "blad" && (
            <div className={w.blad}>
              <p role="alert" className="small">Nie udało się policzyć dni z rund.</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={proby.ponow}>Spróbuj ponownie</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}


function DniNauki({ plan, poziom, zapisano }: { plan: PlanNauki; poziom: PlanNauki["level"]; zapisano: () => void }) {
  const [dni, ustawDni] = useState(plan.weekdays);
  const [zapisuje, ustawZapisuje] = useState(false);
  const [blad, ustawBlad] = useState("");

  async function przelacz(n: number) {
    const nowe = dni.includes(n) ? dni.filter((d) => d !== n) : [...dni, n].sort();
    if (!nowe.length || zapisuje) return;
    const poprzednie = dni;
    ustawDni(nowe);
    ustawZapisuje(true);
    ustawBlad("");
    try {
      await naukaApi.dniPlanu(poziom, nowe);
      zapisano();
    } catch (e) {
      ustawDni(poprzednie);
      ustawBlad(e instanceof Error ? e.message : "Nie udało się zapisać dni.");
    } finally {
      ustawZapisuje(false);
    }
  }

  return (
    <div className={w.blad} role="group" aria-label="Dni nauki w planie" aria-busy={zapisuje}>
      <div className="pigulki">
        {DNI.map((d, i) => (
          <button key={d} type="button" className="pigulka" aria-pressed={dni.includes(i + 1)} aria-label={DNI_PELNE[i]}
            disabled={zapisuje || (dni.length === 1 && dni.includes(i + 1))} onClick={() => void przelacz(i + 1)}>
            <span className={w.dzienPelny} aria-hidden="true">{wielka(DNI_PELNE[i]!)}</span>
            <span className={w.dzienKrotki} aria-hidden="true">{d}</span>
          </button>
        ))}
      </div>
      {blad && <p role="alert" className="small">{blad}</p>}
    </div>
  );
}
