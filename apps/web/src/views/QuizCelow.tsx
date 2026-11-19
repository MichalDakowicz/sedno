// Quiz celów z Pestką: jedno pytanie na ekran, duże odpowiedzi, pasek postępu. Przedmioty (gdy ich brak), cel w %
// dla każdego przedmiotu, mocne i słabe obszary angielskiego (te same co grządki ogrodu), czas dziennie i dni
// w tygodniu, na końcu podsumowanie Pestki i jeden następny krok (diagnoza albo pulpit). Zapis w profilu ucznia
// (profiles.learning przez konto/profilUcznia.ts, z kopią w przeglądarce). Ten sam quiz siedzi w onboardingu.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { TutorAvatar } from "../components/TutorAvatar";
import { WyborPrzedmiotow } from "../components/WyborPrzedmiotow";
import { saveSubjects, useProfil } from "../auth";
import { CZAS, OBSZARY_ANGIELSKIEGO, celPrzedmiotu, useUczenie, zmienUczenie, type Uczenie } from "../konto/profilUcznia";
import { przedmiot, zgrupuj, type MojPrzedmiot, type PrzedmiotId } from "../konto/przedmioty";
import { dniDo, egzaminyUcznia, najblizszy, odmianaDni, opisDaty } from "../konto/terminy";
import { adresDiagnozy } from "../nauka/adresy";
import { glos } from "../pestka/glos";
import s from "./QuizCelow.module.css";

type Krok = { id: string; pytanie: string; przedmiot?: PrzedmiotId };

const nazwaObszaru = (id: string) => OBSZARY_ANGIELSKIEGO.find((o) => o.id === id)?.nazwa.toLowerCase() ?? id;

/** Zdanie Pestki na koniec: cel, od czego zaczynamy i ile czasu. */
export function podsumowanieCelow(u: Uczenie, przedmioty: PrzedmiotId[]): string {
  const cele = przedmioty.flatMap((id) => {
    const c = celPrzedmiotu(u, id);
    return c !== null ? [`${przedmiot(id)!.nazwa.toLowerCase()} ${Math.round(c * 100)}%`] : [];
  });
  const czas = CZAS.find((c) => c.id === u.czas)?.nazwa;
  const czesci = [
    cele.length ? `Cel: ${cele.join(", ")}.` : "",
    u.slabe?.length ? `Zaczynamy od: ${u.slabe.map(nazwaObszaru).join(", ")}.` : "",
    czas ? `${czas} dziennie${u.dni ? `, ${u.dni} ${u.dni === 1 ? "dzień" : "dni"} w tygodniu` : ""}.` : "",
  ];
  return czesci.filter(Boolean).join(" ") || "Cele dopiszesz, kiedy zechcesz. Zacznijmy od krótkiej diagnozy.";
}

export function QuizCelow({ wOnboardingu = false, onKoniec }: { wOnboardingu?: boolean; onKoniec?: () => void }) {
  const profil = useProfil();
  const u = useUczenie();
  const navigate = useNavigate();
  const [wybor, setWybor] = useState<MojPrzedmiot[]>([]);
  const [krok, setKrok] = useState(0);
  const moje = zgrupuj(profil?.subjects ?? []).map((m) => m.id);
  const angielski = moje.includes("angielski");

  const kroki: Krok[] = [
    ...(!moje.length && !wOnboardingu ? [{ id: "przedmioty", pytanie: glos.quiz.przedmioty }] : []),
    ...moje.map((id) => ({ id: `cel-${id}`, pytanie: glos.quiz.cel, przedmiot: id })),
    ...(angielski ? [{ id: "mocne", pytanie: glos.quiz.mocne }, { id: "slabe", pytanie: glos.quiz.slabe }] : []),
    { id: "czas", pytanie: glos.quiz.czas },
    { id: "dni", pytanie: glos.quiz.dni },
    { id: "koniec", pytanie: glos.quiz.koniec },
  ];
  const biezacy = kroki[Math.min(krok, kroki.length - 1)]!;
  const dalej = () => setKrok((k) => Math.min(k + 1, kroki.length - 1));
  const zakoncz = (stan: "zrobiony" | "pominiety") => zmienUczenie((x) => ({ ...x, quiz: { stan, kiedy: new Date().toISOString() } }));

  function pomin() {
    zakoncz("pominiety");
    if (onKoniec) onKoniec();
    else navigate("/");
  }

  const przelaczObszar = (klucz: "mocne" | "slabe", id: string) =>
    zmienUczenie((x) => {
      const lista = x[klucz] ?? [];
      const nowa = lista.includes(id) ? lista.filter((o) => o !== id) : [...lista, id];
      const drugi = klucz === "mocne" ? "slabe" : "mocne";
      return { ...x, [klucz]: nowa.length ? nowa : undefined, [drugi]: (x[drugi] ?? []).filter((o) => o !== id) };
    });

  const egzamin = najblizszy(egzaminyUcznia(profil?.subjects ?? []));

  return (
    <section className={s.quiz} aria-labelledby="quiz-pytanie">
      <div className={s.gora}>
        <div className={s.pasek} role="progressbar" aria-label="Postęp quizu" aria-valuemin={1} aria-valuemax={kroki.length} aria-valuenow={krok + 1}>
          <span style={{ width: `${((krok + 1) / kroki.length) * 100}%` }} />
        </div>
        {biezacy.id !== "koniec" && <button type="button" className={s.pomin} onClick={pomin}>Pomiń quiz</button>}
      </div>

      <div className={s.pytanie} key={biezacy.id}>
        <TutorAvatar size={56} state={biezacy.id === "koniec" ? "radosc" : "talking"} />
        <div className={s.dymek}>
          {krok === 0 && biezacy.id !== "koniec" && <p className="muted small">{glos.quiz.wstep}</p>}
          <h1 id="quiz-pytanie" className="h1">
            {biezacy.pytanie}
            {biezacy.przedmiot && <span className={s.przedmiot}> {przedmiot(biezacy.przedmiot)!.nazwa}</span>}
          </h1>
        </div>
      </div>

      <div className={s.odpowiedzi}>
        {biezacy.id === "przedmioty" && (
          <>
            <WyborPrzedmiotow value={wybor} onChange={setWybor} />
            <button type="button" className="btn btn-primary" disabled={!wybor.length} onClick={async () => { if (await saveSubjects(wybor)) setKrok(0); }}>
              Dalej <ArrowRight size={18} aria-hidden="true" />
            </button>
          </>
        )}

        {biezacy.przedmiot && <SuwakCelu przedmiotId={biezacy.przedmiot} u={u} />}

        {(biezacy.id === "mocne" || biezacy.id === "slabe") && (
          <div className={s.kafle} role="group" aria-labelledby="quiz-pytanie">
            {OBSZARY_ANGIELSKIEGO.map((o) => (
              <button key={o.id} type="button" className={s.kafel} aria-pressed={!!u[biezacy.id as "mocne" | "slabe"]?.includes(o.id)} onClick={() => przelaczObszar(biezacy.id as "mocne" | "slabe", o.id)}>
                {o.nazwa}
              </button>
            ))}
          </div>
        )}

        {biezacy.id === "czas" && (
          <div className={s.kafle} role="radiogroup" aria-labelledby="quiz-pytanie">
            {CZAS.map((c) => (
              <button key={c.id} type="button" role="radio" className={s.kafel} aria-checked={u.czas === c.id}
                onClick={() => { zmienUczenie((x) => ({ ...x, czas: c.id })); dalej(); }}>
                {c.nazwa}
              </button>
            ))}
          </div>
        )}

        {biezacy.id === "dni" && (
          <div className={s.kafle} role="radiogroup" aria-labelledby="quiz-pytanie">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} type="button" role="radio" className={`${s.kafel} ${s.kafelMaly}`} aria-checked={u.dni === n}
                onClick={() => { zmienUczenie((x) => ({ ...x, dni: n })); dalej(); }}>
                {n}
              </button>
            ))}
          </div>
        )}

        {biezacy.id === "koniec" && (
          <div className={s.koniec}>
            <p className="h2">{podsumowanieCelow(u, moje)}</p>
            {egzamin && <p className="muted">Matura: {opisDaty(egzamin.data)}, za {dniDo(egzamin.data)} {odmianaDni(dniDo(egzamin.data))}.</p>}
            {onKoniec ? (
              <button type="button" className="btn btn-primary" onClick={() => { zakoncz("zrobiony"); onKoniec(); }}>
                Dalej <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : angielski ? (
              <Link to={adresDiagnozy()} className="btn btn-primary" onClick={() => zakoncz("zrobiony")}>
                Sprawdźmy, od czego zacząć <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ) : (
              <Link to="/" className="btn btn-primary" onClick={() => zakoncz("zrobiony")}>
                Przejdź do pulpitu <ArrowRight size={18} aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </div>

      <div className={s.nawigacja}>
        {krok > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setKrok((k) => Math.max(0, k - 1))}>
            <ArrowLeft size={16} aria-hidden="true" /> Wstecz
          </button>
        )}
        {biezacy.id !== "koniec" && biezacy.id !== "przedmioty" && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={dalej}>
            {biezacy.przedmiot || biezacy.id === "mocne" || biezacy.id === "slabe" ? "Dalej" : "Pomiń pytanie"} <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

/** Cel w procentach: suwak co 5 pkt proc. z kreską progu 30% i luźnymi znacznikami co 10 pkt. */
function SuwakCelu({ przedmiotId, u }: { przedmiotId: PrzedmiotId; u: Uczenie }) {
  const aktualny = Math.round((celPrzedmiotu(u, przedmiotId) ?? 0.6) * 100);
  const ustaw = (v: number) => zmienUczenie((x) => ({ ...x, celProcent: { ...x.celProcent, [przedmiotId]: v } }));
  return (
    <div className={s.suwak}>
      <p className={s.wartosc} aria-hidden="true">{aktualny}%</p>
      <input type="range" min={30} max={100} step={5} value={aktualny} onChange={(e) => ustaw(Number(e.target.value))}
        aria-label={`Cel z przedmiotu ${przedmiot(przedmiotId)!.nazwa}`} aria-valuetext={`${aktualny}%`} list={`znaczniki-${przedmiotId}`} />
      <datalist id={`znaczniki-${przedmiotId}`}>
        {[30, 40, 50, 60, 70, 80, 90, 100].map((v) => <option key={v} value={v} />)}
      </datalist>
      <div className={s.skala} aria-hidden="true">
        <span>30% · próg zdania</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/** Strona /cele: quiz poza onboardingiem (z pulpitu i z profilu ucznia). */
export function StronaQuizu() {
  return (
    <main className={`container czytanie ${s.strona}`}>
      <QuizCelow />
    </main>
  );
}
