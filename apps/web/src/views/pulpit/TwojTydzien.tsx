// „Twój tydzień”: dni z nauką jako kropki, seria i najbliższe dni z planu (nauka_plan). Prognoza jest w widgecie „Do matury”. Dni z nauką liczymy z danych, które
// już są: próby z nauka_dowody (rundy i zadania CKE angielskiego, do 100 ostatnich na umiejętność) i daty zapisu
// postępu arkuszy (sheet_progress.updated_at, każdy przedmiot). Baza nie ma osobnego dziennika aktywności.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Ladowanie } from "../../components/Ladowanie";
import { Kropki } from "../../components/wykresy";
import { Liczba } from "../../ruch";
import { usePostepyKonta } from "../../konto/wyniki";
import { adresStartu } from "../../nauka/adresy";
import { naukaApi, nazwaFormatuNauki, type PlanNauki } from "../../nauka/api";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import type { KontekstPulpitu } from "./widgety";
import styles from "../Dashboard.module.css";
import w from "./Widgety.module.css";

const DNI = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const DNI_PELNE = ["poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela"];
const dzienWarszawa = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" });
const nazwaDnia = new Intl.DateTimeFormat("pl-PL", { weekday: "long", timeZone: "UTC" });

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

export function TwojTydzien({ zakres, aktywny }: KontekstPulpitu) {
  const [poziom] = usePoziomNauki();
  const angielski = (!aktywny || aktywny === "angielski") && zakres.some((s) => s.przedmiot.id === "angielski");
  const plan = useZapytanieNauki(angielski ? `nauka:plan:${poziom}` : null, (signal) => naukaApi.plan(poziom, signal));
  const proby = useZapytanieNauki(angielski ? `nauka:dni:${poziom}` : null, async (signal) => {
    const mapa = await naukaApi.mapa(poziom, signal);
    const cwiczone = mapa.skills.filter((u) => u.evidence_count > 0);
    const listy = await Promise.all(cwiczone.map((u) => naukaApi.dowody(u.skill_id, poziom, signal)));
    return listy.flat().map((d) => d.happened_at);
  });
  const arkusze = usePostepyKonta();
  const [edycja, ustawEdycje] = useState(false);

  const dzis = dzien(new Date());
  const dni = useMemo(() => new Set([...(proby.dane ?? []), ...(arkusze ?? []).map((a) => a.updated_at)].map(dzien)), [proby.dane, arkusze]);
  if (!angielski) return null;

  const { tydzien, zNauka, seria } = tydzienNauki(dni, dzis);
  const p = plan.dane;
  const nastepne = (p?.activities ?? []).filter((a) => a.date >= dzis).slice(0, 3);

  return (
    <section className={`${styles.section} wejscie`} aria-labelledby="tydzien-widget">
      <div className={styles.sectionHead}>
        <h2 id="tydzien-widget" className="h2">Twój tydzień</h2>
        {p && (
          <button type="button" className={`link ${w.przyciskLink}`} aria-expanded={edycja} onClick={() => ustawEdycje((e) => !e)}>
            {edycja ? "Gotowe" : "Dni nauki"}
          </button>
        )}
      </div>

      {(plan.stan === "ladowanie" || proby.stan === "ladowanie") && <Ladowanie ile={2} etykieta="Wczytuję tydzień" />}
      {plan.stan === "blad" && (
        <div className={w.blad}>
          <p role="alert">Nie udało się wczytać planu tygodnia.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={plan.ponow}>Spróbuj ponownie</button>
        </div>
      )}

      {p && proby.stan !== "ladowanie" && (
        <>
          {edycja && <DniNauki plan={p} poziom={poziom} zapisano={plan.ponow} />}
          <p className={styles.stat}>
            <Liczba wartosc={zNauka} />
            <span> / 7</span>
            <span className={styles.statOpis}>{zNauka === 1 ? "dzień" : "dni"} z nauką w tym tygodniu{seria >= 2 ? ` · seria ${seria} ${odmianaDni(seria)} z rzędu` : ""}</span>
          </p>
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
          {proby.stan === "blad" && (
            <div className={w.blad}>
              <p role="alert" className="small">Nie udało się policzyć dni z rund.</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={proby.ponow}>Spróbuj ponownie</button>
            </div>
          )}
          {nastepne.length > 0 ? (
            <ul className="wiersze">
              {nastepne.map((a, i) => (
                <li key={`${a.date}-${i}`}>
                  <Link to={adresStartu(p.level, a.skill_id, a.format)} className="wiersz">
                    <span className="wiersz-tresc">
                      <span className="h3">{a.name}</span>
                      <span className="wiersz-opis">{opisDnia(a.date, dzis)} · {nazwaFormatuNauki[a.format]} · {a.minutes} min</span>
                    </span>
                    <span className="wiersz-akcja"><ChevronRight size={20} aria-hidden="true" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">W tym tygodniu nie ma już dni nauki w planie.</p>
          )}
        </>
      )}
    </section>
  );
}

function opisDnia(data: string, dzis: string) {
  if (data === dzis) return "Dziś";
  if (data === przesun(dzis, 1)) return "Jutro";
  const nazwa = nazwaDnia.format(new Date(`${data}T12:00:00Z`));
  return nazwa.charAt(0).toUpperCase() + nazwa.slice(1);
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
            {d}
          </button>
        ))}
      </div>
      {blad && <p role="alert" className="small">{blad}</p>}
    </div>
  );
}
