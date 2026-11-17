// Profil ucznia: jak się uczy, czas i cel, priorytety oraz wnioski z wyników. Każda odpowiedź jest dobrowolna,
// zmienia się od razu, a wybrana ponownie znika. Dane na koncie: konto/profilUcznia.ts.
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useProfil } from "../auth";
import { CELE, CZAS, MAX_DLUGOSC, MAX_PRIORYTETOW, PYTANIA, dodajPriorytet, usunPriorytet, usunWniosek, ustawCel, ustawOdpowiedz, useUczenie, useWnioski, type Opcja } from "../konto/profilUcznia";
import { PRZEDMIOTY, zgrupuj, type PrzedmiotId } from "../konto/przedmioty";
import { useWynikiKonta } from "../konto/wyniki";
import s from "./ProfilUcznia.module.css";

function Wybor({ pytanie, opcje, wybrana, onZmiana }: { pytanie: string; opcje: Opcja[]; wybrana?: string; onZmiana: (id: string) => void }) {
  return (
    <div className={s.pytanie} role="group" aria-label={pytanie}>
      <span>{pytanie}</span>
      <div className={s.chipy}>
        {opcje.map((o) => (
          <button key={o.id} type="button" aria-pressed={o.id === wybrana} className={`${s.chip} ${o.id === wybrana ? s.chipAktywny : ""}`} onClick={() => onZmiana(o.id)}>
            {o.nazwa}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Trzy pytania o sposób nauki: w profilu i w onboardingu. */
export function PytaniaOSposobie() {
  const u = useUczenie();
  return (
    <>
      {PYTANIA.map((p) => (
        <Wybor key={p.klucz} pytanie={p.pytanie} opcje={p.opcje} wybrana={u[p.klucz]} onZmiana={(id) => ustawOdpowiedz(p.klucz, id)} />
      ))}
    </>
  );
}

/** Czas dziennie i cel z każdego przedmiotu konta: w profilu i w onboardingu. */
export function CzasICel({ przedmioty }: { przedmioty: PrzedmiotId[] }) {
  const u = useUczenie();
  return (
    <>
      <Wybor pytanie="Ile czasu dziennie?" opcje={CZAS} wybrana={u.czas} onZmiana={(id) => ustawOdpowiedz("czas", id)} />
      {przedmioty.map((id) => (
        <Wybor key={id} pytanie={`Cel z przedmiotu: ${PRZEDMIOTY.find((p) => p.id === id)!.nazwa.toLowerCase()}`} opcje={CELE} wybrana={u.cele?.[id]} onZmiana={(c) => ustawCel(id, c)} />
      ))}
    </>
  );
}

const kiedy = (iso: string) => new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short" }).replace(".", "");

export function ProfilUcznia() {
  const profil = useProfil();
  const u = useUczenie();
  const [szkic, setSzkic] = useState("");
  const moje = profil?.subjects ?? [];
  const wyniki = useWynikiKonta(moje);
  const wnioski = useWnioski(wyniki?.podsumowania ?? null, wyniki?.wiersze ?? null);
  const priorytety = u.priorytety ?? [];
  const ukryte = new Set(u.usuniete ?? []);

  function dodaj(e: FormEvent) {
    e.preventDefault();
    if (dodajPriorytet(szkic, "uczen")) setSzkic("");
  }

  const grupy = wnioski.stan === "gotowe" ? wnioski.przedmioty.map((p) => ({ ...p, wnioski: p.wnioski.filter((w) => !ukryte.has(w.id)) })).filter((p) => p.wnioski.length) : [];

  return (
    <main className={`container ${s.strona}`}>
      <header className={s.glowa}>
        <span className="label">Profil</span>
        <h1 className="display">Profil ucznia</h1>
        <p className="muted">Wszystkie odpowiedzi są dobrowolne. Możesz je zmienić albo usunąć, a wybraną odpowiedź wyczyścisz, klikając ją jeszcze raz.</p>
      </header>

      <section className={s.sekcja} aria-labelledby="pu-jak">
        <h2 id="pu-jak" className="h2">
          Jak się uczysz
        </h2>
        <PytaniaOSposobie />
      </section>

      <section className={s.sekcja} aria-labelledby="pu-czas">
        <h2 id="pu-czas" className="h2">
          Czas i cel
        </h2>
        <CzasICel przedmioty={zgrupuj(moje).map((m) => m.id)} />
      </section>

      <section className={s.sekcja} aria-labelledby="pu-priorytety">
        <h2 id="pu-priorytety" className="h2">
          Priorytety
        </h2>
        {priorytety.length > 0 && (
          <ul className={s.wiersze}>
            {priorytety.map((p) => (
              <li key={p.id} className={s.wiersz}>
                <span className={s.wierszTekst}>
                  <span>{p.tekst}</span>
                  <span className="muted small">{p.zrodlo === "uczen" ? "dodane przez ciebie" : `Pestka, z rozmowy ${kiedy(p.kiedy)}`}</span>
                </span>
                <button type="button" className={`link ${s.usun}`} onClick={() => usunPriorytet(p.id)} aria-label={`Usuń priorytet: ${p.tekst}`}>
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
        {priorytety.length < MAX_PRIORYTETOW ? (
          <form className={s.dodaj} onSubmit={dodaj}>
            <label htmlFor="pu-nowy" className="visually-hidden">
              Nowy priorytet
            </label>
            <input id="pu-nowy" className="input" placeholder="Np. najpierw słuchanie" maxLength={MAX_DLUGOSC} value={szkic} onChange={(e) => setSzkic(e.target.value)} autoComplete="off" />
            <button type="submit" className="btn btn-secondary" disabled={!szkic.trim()}>
              Dodaj
            </button>
          </form>
        ) : (
          <p className="muted small">Lista jest pełna. Usuń któryś priorytet, żeby dodać nowy.</p>
        )}
        <p className="muted small">Pestka może dopisać priorytet sama, gdy powiesz o nim w rozmowie. Zawsze dostaniesz o tym informację.</p>
      </section>

      <section className={s.sekcja} aria-labelledby="pu-wnioski">
        <h2 id="pu-wnioski" className="h2">
          Co wiemy z twoich wyników
        </h2>
        {wnioski.stan === "laduje" ? (
          <p className="muted">Liczę wnioski z twoich arkuszy…</p>
        ) : grupy.length === 0 ? (
          <p className="muted">Pojawią się po dwóch sprawdzonych arkuszach z jednego przedmiotu. Liczę je tylko z twoich wyników, a ty decydujesz, co zostaje.</p>
        ) : (
          grupy.map((g) => (
            <div key={`${g.przedmiotId}-${g.poziom}`} className={s.grupaWnioskow}>
              <span className="label">
                {g.nazwa} ({g.poziom}) · z {g.arkuszy} arkuszy
              </span>
              <ul className={s.wiersze}>
                {g.wnioski.map((w) => (
                  <li key={w.id} className={s.wiersz}>
                    <span>{w.tekst}</span>
                    <button type="button" className={`link ${s.usun}`} onClick={() => usunWniosek(w.id)} aria-label={`Usuń wniosek: ${w.tekst}`}>
                      Usuń
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        <Link to="/do-matury" className={`btn btn-primary ${s.przycisk}`}>
          Zobacz plan do matury
        </Link>
      </section>
    </main>
  );
}
