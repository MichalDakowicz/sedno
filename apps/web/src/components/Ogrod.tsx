// Ogród umiejętności: każda umiejętność to roślina (Kielek) w stadium z opanowania, pogrupowana w grządki według
// obszaru matury na wspólnej linii ziemi. Pod rośliną krótka nazwa i procent (bez oceny: „mało danych”, bledsza
// pestka). Do powtórki: roślina przywiędła z kropką. Jedna roślina może mieć znacznik „tu dziś” (polecenie Pestki).
// Roślina rośnie (animuj) tylko wtedy, gdy jej stadium jest wyższe niż przy ostatniej wizycie (pamięć w przeglądarce).
// maly: miniatura na pulpicie i w wyborze umiejętności (bez podpisów pod roślinami).
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { currentUserId } from "../auth";
import type { Poziom } from "../arkusze/typy";
import type { Umiejetnosc } from "../nauka/api";
import { OBSZARY_NAUKI } from "../nauka/gotowosc";
import { KOLEJNOSC_STADIOW, NAZWA_STADIUM, stadium, type Stadium } from "../nauka/stadia";
import { Kielek } from "./Kielek";
import s from "./Ogrod.module.css";

const kluczPamieci = (poziom: Poziom) => `sedno.ogrod.${currentUserId() ?? "anonim"}.${poziom}`;

function czytajStadia(poziom: Poziom): Record<string, Stadium> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(kluczPamieci(poziom)) ?? "null");
    return v && typeof v === "object" ? (v as Record<string, Stadium>) : {};
  } catch {
    return {};
  }
}

export const doPowtorki = (u: Umiejetnosc) => !!u.due_at && Date.parse(u.due_at) <= Date.now();

/** Opis rośliny dla czytnika ekranu i podpowiedzi: nazwa, opanowanie, stadium, powtórka, polecenie. */
export function opisRosliny(u: Umiejetnosc, tuDzis: boolean) {
  const ocena = u.score === null ? "mało danych" : `${Math.round(u.score * 100)}% opanowania`;
  return `${u.name}: ${ocena}, ${NAZWA_STADIUM[stadium(u.score)]}${doPowtorki(u) ? ", do powtórki" : ""}${tuDzis ? ", polecam dziś" : ""}`;
}

export function Ogrod({ umiejetnosci, poziom, adres, onWybierz, wybrana, tuDzis, maly = false, etykieta }: {
  umiejetnosci: Umiejetnosc[];
  poziom: Poziom;
  /** Link rośliny (np. panel na mapie); albo onWybierz, gdy roślina ma coś wybrać na miejscu. */
  adres?: (u: Umiejetnosc) => string;
  onWybierz?: (u: Umiejetnosc) => void;
  wybrana?: string | null;
  tuDzis?: string | null;
  maly?: boolean;
  etykieta: string;
}) {
  // Stadia z ostatniej wizyty czytamy raz na montowanie; zapis po renderze, więc wzrost gra raz.
  const poprzednie = useMemo(() => czytajStadia(poziom), [poziom]);
  useEffect(() => {
    if (maly) return;
    try {
      localStorage.setItem(kluczPamieci(poziom), JSON.stringify(Object.fromEntries(umiejetnosci.map((u) => [u.skill_id, stadium(u.score)]))));
    } catch {
      // bez pamięci przeglądarki roślina po prostu nie rośnie na oczach
    }
  }, [umiejetnosci, poziom, maly]);

  const grzadki = OBSZARY_NAUKI.map((o) => ({ ...o, lista: umiejetnosci.filter((u) => u.area === o.id) })).filter((g) => g.lista.length);

  return (
    <div className={s.ogrod} data-maly={maly || undefined} role="group" aria-label={etykieta}>
      {grzadki.map((g) => (
        <section key={g.id} className={s.grzadka} aria-label={g.nazwa}>
          <h3 className={s.nazwaGrzadki}>{g.nazwa}</h3>
          <ul className={s.rosliny}>
            {g.lista.map((u) => {
              const st = stadium(u.score);
              const przed = poprzednie[u.skill_id];
              const rosnie = !maly && !!przed && KOLEJNOSC_STADIOW.indexOf(st) > KOLEJNOSC_STADIOW.indexOf(przed);
              const dzis = u.skill_id === tuDzis;
              const tresc = (
                <>
                  {dzis && <span className={s.tuDzis} aria-hidden="true">tu dziś</span>}
                  <span className={s.roslina} data-brak={u.score === null || undefined} data-powtorka={doPowtorki(u) || undefined}>
                    <Kielek stadium={st} rozmiar={maly ? 36 : 72} animuj={rosnie} />
                    {doPowtorki(u) && <span className={s.kropka} aria-hidden="true" />}
                  </span>
                  {!maly && (
                    <span className={s.podpis} aria-hidden="true">
                      <span className={s.nazwa}>{u.name}</span>
                      <span className={s.procent}>{u.score === null ? "mało danych" : `${Math.round(u.score * 100)}%`}</span>
                    </span>
                  )}
                </>
              );
              const wspolne = {
                className: s.cel,
                "aria-label": opisRosliny(u, dzis),
                title: maly ? opisRosliny(u, dzis) : undefined,
                "data-dzis": dzis || undefined,
              };
              return (
                <li key={u.skill_id}>
                  {onWybierz ? (
                    <button type="button" {...wspolne} aria-pressed={u.skill_id === wybrana} onClick={() => onWybierz(u)}>{tresc}</button>
                  ) : (
                    <Link to={adres!(u)} {...wspolne} id={maly ? undefined : `roslina-${u.skill_id}`} aria-current={u.skill_id === wybrana ? "true" : undefined}>{tresc}</Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
