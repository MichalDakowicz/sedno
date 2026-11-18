import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { nazwaPoziomu } from "../../arkusze/typy";
import { useSession } from "../../auth";
import { Ladowanie } from "../../components/Ladowanie";
import { adresMapy, adresNauki, adresPowtorek, adresRundy, adresStartu } from "../../nauka/adresy";
import { naukaApi, nazwaFormatuNauki, type MapaNauki, type OdpowiedzNauki, type SesjaNauki } from "../../nauka/api";
import { nazwaOdpowiedzi, useSesjaRundy } from "./sesjaRundy";
import { TrescRundy } from "./TrescRundy";
import s from "./SzybkaRunda.module.css";

const procent = new Intl.NumberFormat("pl-PL", { style: "percent", maximumFractionDigits: 0 });
const opanowanie = (wynik: number | null) => wynik == null ? "Mało danych" : procent.format(wynik);

function ProbaRozbioru({ odpowiedz }: { odpowiedz: OdpowiedzNauki }) {
  const [otwarta, setOtwarta] = useState(false);
  const { prompt } = odpowiedz;
  return (
    <li>
      <details className={s.proba} onToggle={(e) => setOtwarta(e.currentTarget.open)}>
        <summary>
          <span>Zadanie {odpowiedz.position}</span>
          <span className={`small ${s.ocena}`} data-correct={odpowiedz.correct}>
            {odpowiedz.correct ? <Check size={16} aria-hidden="true" /> : <CircleAlert size={16} aria-hidden="true" />}
            {odpowiedz.correct ? "Poprawne" : odpowiedz.answer.trim() ? "Niepoprawne" : "Pominięte"}
          </span>
        </summary>
        {otwarta && <div className={s.probaTresc}>
          {prompt.typ === "cke" ? (
            <Link className="link" to={`/arkusze/${encodeURIComponent(prompt.sheet_id)}#zadanie-${prompt.task_nr}`}>Zadanie CKE {prompt.question} w arkuszu</Link>
          ) : <p>{prompt.tresc}</p>}
          <p><strong>Twoja odpowiedź</strong> · {nazwaOdpowiedzi(odpowiedz.answer, prompt)}</p>
          {!odpowiedz.correct && <p><strong>Poprawna odpowiedź</strong> · {odpowiedz.solutions.map((a) => nazwaOdpowiedzi(a, prompt)).join(" / ")}</p>}
          <p className="muted">{odpowiedz.explanation}</p>
          {odpowiedz.hint_level > 0 && <p className="small muted">Użyte podpowiedzi: {odpowiedz.hint_level}</p>}
          <TrescRundy prompt={prompt} poOcenie />
        </div>}
      </details>
    </li>
  );
}

const nazwyBledow: Record<string, string> = { "jezyk-i-forma": "Błędy językowe i dotyczące formy" };

function Podsumowanie({ odpowiedzi }: { odpowiedzi: OdpowiedzNauki[] }) {
  const dobre = odpowiedzi.filter((a) => a.correct).length;
  const pominiete = odpowiedzi.filter((a) => !a.correct && !a.answer.trim()).length;
  const bledne = odpowiedzi.length - dobre - pominiete;
  const bledy = new Map<string, number>();
  for (const a of odpowiedzi) {
    if (!a.correct && a.answer.trim() && a.error_type && nazwyBledow[a.error_type]) bledy.set(a.error_type, (bledy.get(a.error_type) ?? 0) + 1);
  }
  return (
    <section className={s.sekcja} aria-labelledby="podsumowanie-rundy">
      <h2 id="podsumowanie-rundy" className="h2">Co poszło dobrze, a co nie</h2>
      <p>Poprawne: {dobre} · Do poprawy: {bledne} · Pominięte: {pominiete}</p>
      {bledy.size > 0 && <ul className="small muted">
        {[...bledy].map(([typ, ile]) => <li key={typ}>{nazwyBledow[typ]}: {ile}</li>)}
      </ul>}
    </section>
  );
}

function RozbiorGotowy({ sesja }: { sesja: SesjaNauki & { result: NonNullable<SesjaNauki["result"]> } }) {
  const { level, result, skill_id, format } = sesja;
  const [mapa, setMapa] = useState<MapaNauki | null>(null);
  useEffect(() => {
    const kontroler = new AbortController();
    void naukaApi.mapa(level, kontroler.signal).then(
      (mapa) => { if (!kontroler.signal.aborted) setMapa(mapa); },
      () => {}, // Ocena rundy jest dostępna także bez etykiety z mapy.
    );
    return () => kontroler.abort();
  }, [level]);
  const nazwa = mapa?.skills.find((m) => m.skill_id === skill_id)?.name;
  const dalej = result.nastepny_krok;
  const nastepna = mapa?.skills.find((m) => m.skill_id === dalej?.skill_id)?.name;
  return (
    <main className={`container ${s.strona}`}>
      <header className={s.glowa}>
        <Link to={adresNauki(level, skill_id)} className={`link small ${s.wroc}`}><ArrowLeft size={15} aria-hidden="true" /> Nauka</Link>
        <h1 className="display">Rozbiór rundy</h1>
        <p className="small muted">{nazwaFormatuNauki[format]} · {nazwaPoziomu[level]}{nazwa && ` · ${nazwa}`}</p>
      </header>
      <section className={s.sekcja} aria-labelledby="wynik-rundy">
        <h2 id="wynik-rundy" className="h1">{result.wynik.poprawne} z {result.wynik.wszystkich} poprawnie</h2>
        <ul className={s.wierszeRozbioru}>{sesja.answers.map((a) => <ProbaRozbioru key={a.position} odpowiedz={a} />)}</ul>
      </section>
      <Podsumowanie odpowiedzi={sesja.answers} />
      <section className={s.sekcja} aria-labelledby="mapa-po-rundzie">
        <h2 className="h2" id="mapa-po-rundzie">Zmiana opanowania{nazwa && ` · ${nazwa}`}</h2>
        <dl className={s.mapaRozbioru}>
          <div><dt className="small muted">Przed rundą</dt><dd>{opanowanie(result.opanowanie_przed)}</dd></div>
          <div><dt className="small muted">Po rundzie</dt><dd>{opanowanie(result.opanowanie_po)}</dd></div>
        </dl>
        <p className="small muted">Na mapie opanowanie maleje, gdy długo nie ćwiczysz.</p>
        <div><Link to={adresMapy(level, skill_id)} className="link">Zobacz umiejętność na mapie</Link></div>
      </section>
      {dalej && (
        <section className={s.nastepnyKrok} aria-labelledby="dalej-po-rundzie">
          <h2 id="dalej-po-rundzie" className="h2">Dalej{nastepna && ` · ${nastepna}`}</h2>
          <p>{dalej.reason}</p>
          <div className={s.akcje}>
            <Link className="btn btn-primary" to={adresStartu(level, dalej.skill_id, dalej.format, dalej.repeat_id ?? undefined)}>
              {nazwaFormatuNauki[dalej.format]} · {dalej.minutes} min <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="btn btn-ghost" to={adresPowtorek(level)}>Zobacz powtórki</Link>
          </div>
        </section>
      )}
    </main>
  );
}

function RozbiorSesji({ id }: { id: string }) {
  const [stan, ponow] = useSesjaRundy(id);
  if (stan.status === "gotowa" && stan.sesja.result) return <RozbiorGotowy sesja={{ ...stan.sesja, result: stan.sesja.result }} />;
  return (
    <main className={`container ${s.strona}`}>
      <header className={s.glowa}>
        <Link to="/nauka" className={`link small ${s.wroc}`}><ArrowLeft size={15} aria-hidden="true" /> Nauka</Link>
        <h1 className="display">Rozbiór rundy</h1>
      </header>
      {stan.status === "laduje" ? <Ladowanie etykieta="Wczytywanie rozbioru" /> : (
        <section className={s.sekcja}>
          {stan.status === "brak" && <p role="alert">Nie udało się znaleźć tej rundy na Twoim koncie.</p>}
          {stan.status === "blad" && <>
            <p role="alert">Nie udało się wczytać rozbioru.</p>
            <div><button type="button" className="btn btn-ghost" onClick={ponow}>Spróbuj ponownie</button></div>
          </>}
          {stan.status === "gotowa" && <>
            <p>Runda wciąż trwa. Rozbiór znajdziesz tu po zakończeniu.</p>
            <div><Link to={adresRundy(id)} className="btn btn-primary">Wróć do rundy</Link></div>
          </>}
        </section>
      )}
    </main>
  );
}

export function Rozbior() {
  const { id } = useParams();
  const session = useSession();
  return session && id ? <RozbiorSesji key={`${session.user.id}:${id}`} id={id} /> : null;
}
