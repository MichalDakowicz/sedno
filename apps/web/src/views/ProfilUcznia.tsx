// Profil ucznia: jak się uczy, czas i cel, priorytety oraz wnioski z wyników. Każda odpowiedź jest dobrowolna,
// zmienia się od razu, a wybrana ponownie znika. Dane na koncie: konto/profilUcznia.ts.
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useProfil } from "../auth";
import { MAX_DLUGOSC, MAX_PRIORYTETOW, PYTANIA, dodajPriorytet, przytnijUsuniete, useBladProfilu, useProfilOdczytany, usunPriorytet, usunWniosek, ustawOdpowiedz, useUczenie, useWnioski, type Opcja } from "../konto/profilUcznia";
import { zgrupuj } from "../konto/przedmioty";
import { useWynikiKonta } from "../konto/wyniki";
import { useListaArkuszy } from "../arkusze/dane";
import { podsumowanieCelow } from "./QuizCelow";
import s from "./ProfilUcznia.module.css";
import { NaglowekStrony } from "../components/NaglowekStrony";
import { Pigulki } from "../components/Pigulki";
import { Liczba } from "../ruch";

function Wybor({ pytanie, opcje, wybrana, onZmiana }: { pytanie: string; opcje: Opcja[]; wybrana?: string; onZmiana: (id: string) => void }) {
  return (
    <div className={s.pytanie} role="group" aria-label={pytanie} data-tutor-about="Wybraną odpowiedź wyczyścisz, klikając ją jeszcze raz.">
      <span>{pytanie}</span>
      <Pigulki>
        {opcje.map((o) => (
          <button key={o.id} type="button" aria-pressed={o.id === wybrana} className="pigulka" onClick={() => onZmiana(o.id)}>
            {o.nazwa}
          </button>
        ))}
      </Pigulki>
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


const LIMIT_LICZNIKA = 100;

const kiedy = (iso: string) => new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short" }).replace(".", "");

const PORY = [
  { od: 5, do: 12, nazwa: "rano" },
  { od: 12, do: 17, nazwa: "po południu" },
  { od: 17, do: 22, nazwa: "wieczorem" },
  { od: 22, do: 29, nazwa: "w nocy" },
];
const godzinaWarszawa = new Intl.DateTimeFormat("pl-PL", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Warsaw" });

/** Wnioski jako kilka liczb: ile arkuszy, średni wynik i pora nauki (z dat zapisu postępu arkuszy). */
function LiczbyUcznia({ wyniki }: { wyniki: NonNullable<ReturnType<typeof useWynikiKonta>> }) {
  const lista = wyniki.podsumowania.flatMap((p) => p.wyniki);
  if (!lista.length) return null;
  const srednia = Math.round(lista.reduce((s, w) => s + (w.mozliwe ? w.zdobyte / w.mozliwe : 0), 0) / lista.length * 100);
  const godziny = wyniki.wiersze.map((w) => Number(godzinaWarszawa.format(new Date(w.updated_at))));
  const liczPory = PORY.map((p) => ({ ...p, ile: godziny.filter((g) => (g < 5 ? g + 24 : g) >= p.od && (g < 5 ? g + 24 : g) < p.do).length }));
  const pora = godziny.length >= 3 ? liczPory.reduce((a, b) => (b.ile > a.ile ? b : a)) : null;
  return (
    <dl className={s.liczby}>
      <div>
        <dt>sprawdzone arkusze</dt>
        <dd><Liczba wartosc={lista.length} /></dd>
      </div>
      <div>
        <dt>średni wynik</dt>
        <dd><Liczba wartosc={srednia} />%</dd>
      </div>
      {pora && pora.ile > 0 && (
        <div>
          <dt>najczęściej uczysz się</dt>
          <dd className={s.slowo}>{pora.nazwa}</dd>
        </div>
      )}
    </dl>
  );
}

export function ProfilUcznia() {
  const profil = useProfil();
  const u = useUczenie();
  const [szkic, setSzkic] = useState("");
  const [powtorka, setPowtorka] = useState(false);
  const moje = profil?.subjects ?? [];
  const wyniki = useWynikiKonta(moje);
  const bladZapisu = useBladProfilu();
  const odczytany = useProfilOdczytany();
  const listaBlad = useListaArkuszy().blad;
  const wnioski = useWnioski(wyniki?.podsumowania ?? null, wyniki?.wiersze ?? null);
  const priorytety = u.priorytety ?? [];
  const ukryte = new Set(u.usuniete ?? []);

  function dodaj(e: FormEvent) {
    e.preventDefault();
    const t = szkic.trim().replace(/\s+/g, " ").toLowerCase();
    if (priorytety.some((p) => p.tekst.toLowerCase() === t)) return setPowtorka(true);
    if (dodajPriorytet(szkic, "uczen")) setSzkic("");
  }

  const zNajmniejDwoma = !!wyniki?.podsumowania.some((p) => p.wyniki.length >= 2);
  // Ukryte wnioski, których już nie ma, przestają zajmować miejsce (tylko gdy policzyliśmy wszystko).
  useEffect(() => {
    // Dopiero po odczycie konta: wcześniej lokalna kopia mogłaby nadpisać nowsze dane z konta.
    if (wnioski.stan !== "gotowe" || listaBlad || !odczytany) return;
    przytnijUsuniete(new Set(wnioski.przedmioty.flatMap((p) => p.wnioski.map((w) => w.id))));
  }, [wnioski, listaBlad, odczytany]);

  const grupy = wnioski.stan === "gotowe" ? wnioski.przedmioty.map((p) => ({ ...p, wnioski: p.wnioski.filter((w) => !ukryte.has(w.id)) })).filter((p) => p.wnioski.length) : [];

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: "/profil", nazwa: "Profil" }} tytul="Profil ucznia" />

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
        <p className="muted">{podsumowanieCelow(u, zgrupuj(moje).map((m) => m.id))}</p>
        <Link to="/cele" className="btn btn-secondary" style={{ justifySelf: "start" }}>Quiz celów z Pestką</Link>
      </section>

      <section className={s.sekcja} aria-labelledby="pu-priorytety">
        <h2 id="pu-priorytety" className="h2" data-tutor-about="Mogę dopisać priorytet sama, gdy powiesz o nim w rozmowie. Zawsze dam ci o tym znać.">
          Priorytety
        </h2>
        {priorytety.length > 0 && (
          <ul className={`wiersze ${s.wiersze}`}>
            {priorytety.map((p) => (
              <li key={p.id} className="wiersz">
                <span className="wiersz-tresc">
                  <span>{p.tekst}</span>
                  <span className="wiersz-opis">{p.zrodlo === "uczen" ? "dodane przez ciebie" : `Pestka, z rozmowy ${kiedy(p.kiedy)}`}</span>
                </span>
                <span className="wiersz-akcja">
                  <button type="button" className={`link ${s.usun}`} onClick={() => usunPriorytet(p.id)} aria-label={`Usuń priorytet: ${p.tekst}`}>
                    Usuń
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {priorytety.length < MAX_PRIORYTETOW ? (
          <form className={s.dodaj} onSubmit={dodaj}>
            <label htmlFor="pu-nowy" className="visually-hidden">
              Nowy priorytet
            </label>
            <input id="pu-nowy" className="input" placeholder="Np. najpierw słuchanie" maxLength={MAX_DLUGOSC} value={szkic} onChange={(e) => {
                setSzkic(e.target.value);
                setPowtorka(false);
              }} autoComplete="off" />
            <button type="submit" className="btn btn-secondary" disabled={!szkic.trim()}>
              Dodaj
            </button>
          </form>
        ) : (
          <p className="muted small">Lista jest pełna. Usuń któryś priorytet, żeby dodać nowy.</p>
        )}
        <p className="muted small" aria-live="polite">
          {powtorka ? "Ten priorytet już jest na liście." : szkic.length >= LIMIT_LICZNIKA ? `${szkic.length}/${MAX_DLUGOSC} znaków` : ""}
        </p>
      </section>

      <section className={s.sekcja} aria-labelledby="pu-wnioski">
        <h2 id="pu-wnioski" className="h2">
          Co wiemy z twoich wyników
        </h2>
        {wyniki && <LiczbyUcznia wyniki={wyniki} />}
        {wnioski.stan === "laduje" ? (
          <p className="muted">Liczę wnioski z twoich arkuszy…</p>
        ) : wnioski.stan === "blad" || (listaBlad && listaBlad !== "brak-danych") ? (
          <p className="muted" role="alert">
            Nie udało się policzyć wniosków.
          </p>
        ) : grupy.length === 0 ? (
          <p className="muted">
            {zNajmniejDwoma
              ? "Na razie nie widać wyraźnych różnic. Wnioski pojawią się, gdy wyniki zaczną się różnić albo zapiszą się czasy zadań."
              : "Pojawią się po dwóch sprawdzonych arkuszach z jednego przedmiotu. Liczę je tylko z twoich wyników, a ty decydujesz, co zostaje."}
          </p>
        ) : (
          grupy.map((g) => (
            <div key={`${g.przedmiotId}-${g.poziom}`} className={s.grupaWnioskow}>
              <span className="label">
                {g.nazwa} ({g.poziom}) · z {g.arkuszy} arkuszy
              </span>
              <ul className={`wiersze ${s.wiersze}`}>
                {g.wnioski.map((w) => (
                  <li key={w.id} className="wiersz">
                    <span className="wiersz-tresc">{w.tekst}</span>
                    <span className="wiersz-akcja">
                      <button type="button" className={`link ${s.usun}`} onClick={() => usunWniosek(w.id)} aria-label={`Usuń wniosek: ${w.tekst}`}>
                        Usuń
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        {bladZapisu && <p className="muted small">Nie zapisano na koncie. Spróbuję ponownie.</p>}
        <Link to="/do-matury" className={`btn btn-primary ${s.przycisk}`}>
          Zobacz plan do matury
        </Link>
      </section>
    </main>
  );
}
