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
import { WSZYSTKIE_OBSZARY } from "../nauka/gotowosc";
import { KOLEJNOSC_STADIOW, NAZWA_STADIUM, stadium, type Stadium } from "../nauka/stadia";
import { Kielek } from "./Kielek";
import { PasekProgu } from "./wykresy";
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

/** Opanowanie obszaru (waga: punkty na maturze), nieocenione umiejętności jako zero, jak w gotowości; null, gdy żadna nie ma oceny. */
function opanowanieObszaru(lista: Umiejetnosc[]) {
  const oc = lista.filter((u) => u.score !== null);
  if (!oc.length) return null;
  const w = lista.reduce((s2, u) => s2 + (u.exam_points > 0 ? u.exam_points : 1), 0);
  return w ? oc.reduce((s2, u) => s2 + (u.exam_points > 0 ? u.exam_points : 1) * u.score!, 0) / w : null;
}

export function Ogrod({ umiejetnosci, poziom, adres, onWybierz, onZapowiedz, wybrana, tuDzis, maly = false, etykieta, cel = null }: {
  /** Cel ucznia (0–1): przy każdej grządce widać, ile do niego zostało. */
  cel?: number | null;
  umiejetnosci: Umiejetnosc[];
  poziom: Poziom;
  /** Link rośliny (np. panel na mapie); albo onWybierz, gdy roślina ma coś wybrać na miejscu. */
  adres?: (u: Umiejetnosc) => string;
  onWybierz?: (u: Umiejetnosc) => void;
  /** Najechanie, fokus albo dotknięcie rośliny: np. rozgrzanie danych panelu, zanim uczeń kliknie. */
  onZapowiedz?: (u: Umiejetnosc) => void;
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

  const grzadki = WSZYSTKIE_OBSZARY.map((o) => ({ ...o, lista: umiejetnosci.filter((u) => u.area === o.id) })).filter((g) => g.lista.length);

  return (
    <div className={s.ogrod} data-maly={maly || undefined} role="group" aria-label={etykieta}>
      {grzadki.map((g) => (
        <section key={g.id} className={s.grzadka} aria-label={g.nazwa} style={{ ["--ile" as string]: g.lista.length }}>
          {maly ? <h3 className={s.nazwaGrzadki}>{g.nazwa}</h3> : (() => {
            const o = opanowanieObszaru(g.lista);
            const zostalo = o !== null && cel !== null ? Math.round((cel - o) * 100) : null;
            return (
              <div className={s.obszar}>
                <h3 className={s.nazwaGrzadki}>{g.nazwa}</h3>
                <p className={s.stanObszaru}>
                  {o === null ? "mało danych" : <><strong>{Math.round(o * 100)}%</strong>{zostalo !== null && (zostalo > 0 ? ` · zostało ${zostalo} pkt proc.` : " · cel osiągnięty")}</>}
                </p>
                <PasekProgu wartosc={o ?? 0} cel={cel !== null ? { wartosc: cel, etykieta: "cel" } : undefined}
                  opis={`${g.nazwa}: ${o === null ? "mało danych" : `${Math.round(o * 100)}%`}`} />
              </div>
            );
          })()}
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
                onPointerEnter: onZapowiedz && (() => onZapowiedz(u)),
                onFocus: onZapowiedz && (() => onZapowiedz(u)),
                onTouchStart: onZapowiedz && (() => onZapowiedz(u)),
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
