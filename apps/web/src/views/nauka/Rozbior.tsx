import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronRight, CircleAlert, CircleMinus, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { nazwaPoziomu, nazwaZadaniaCke } from "../../arkusze/typy";
import { useSession } from "../../auth";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Ladowanie } from "../../components/Ladowanie";
import { adresMapy, adresNauki, adresPowtorek, adresRundy, adresStartu } from "../../nauka/adresy";
import { naukaApi, nazwaFormatuNauki, type MapaNauki, type OdpowiedzNauki, type SesjaNauki } from "../../nauka/api";
import { nazwaOdpowiedzi, useSesjaRundy } from "./sesjaRundy";
import { PestkaMowi, wybierz } from "./PestkaRundy";
import { TrescRundy } from "./TrescRundy";
import s from "./SzybkaRunda.module.css";

const procent = new Intl.NumberFormat("pl-PL", { style: "percent", maximumFractionDigits: 0 });
const opanowanie = (wynik: number | null) => wynik == null ? "Mało danych" : procent.format(wynik);

// Jedno zdanie o zadaniu zamiast samego numeru: skąd jest (CKE) albo jego polecenie.
const opisZadania = (o: OdpowiedzNauki) => o.prompt.typ === "cke" ? nazwaZadaniaCke(o.prompt.sheet_id, o.prompt.question) : o.prompt.tresc;

function ProbaRozbioru({ odpowiedz }: { odpowiedz: OdpowiedzNauki }) {
  const [otwarta, setOtwarta] = useState(false);
  const { prompt } = odpowiedz;
  const pominiete = !odpowiedz.correct && !odpowiedz.answer.trim();
  const stan = odpowiedz.correct ? "Poprawne" : pominiete ? "Pominięte" : "Niepoprawne";
  return (
    <li>
      <details className={`${s.proba} ${s.rozwijane}`} onToggle={(e) => setOtwarta(e.currentTarget.open)}>
        <summary className={s.wierszProby}>
          <span className={s.ocena} data-correct={odpowiedz.correct} data-pominiete={pominiete || undefined}>
            {odpowiedz.correct ? <Check size={18} aria-hidden="true" /> : pominiete ? <CircleMinus size={18} aria-hidden="true" /> : <CircleAlert size={18} aria-hidden="true" />}
            <span className="visually-hidden">{stan}: </span>
          </span>
          <span className={s.opisProby}>{opisZadania(odpowiedz)}</span>
          <ChevronRight size={16} aria-hidden="true" />
        </summary>
        {otwarta && <div className={s.probaTresc}>
          {prompt.typ === "cke" && (
            <Link className="link" to={`/arkusze/${encodeURIComponent(prompt.sheet_id)}#zadanie-${prompt.task_nr}`}>Otwórz to zadanie w arkuszu</Link>
          )}
          <p><strong>Twoja odpowiedź</strong> · {nazwaOdpowiedzi(odpowiedz.answer, prompt)}</p>
          {!odpowiedz.correct && <p><strong>Poprawna odpowiedź</strong> · {odpowiedz.solutions.map((a) => nazwaOdpowiedzi(a, prompt)).join(" / ")}</p>}
          {prompt.typ !== "cke" && <p className="muted">{odpowiedz.explanation}</p>}
          {odpowiedz.hint_level > 0 && <p className="small muted">Użyte podpowiedzi: {odpowiedz.hint_level}</p>}
          <TrescRundy prompt={prompt} poOcenie />
        </div>}
      </details>
    </li>
  );
}

const nazwyBledow: Record<string, string> = { "jezyk-i-forma": "Błędy językowe i dotyczące formy" };

const odmianaZadan = (n: number) => n === 1 ? "zadanie" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "zadania" : "zadań";

const podsumowaniaPestki = {
  bezbledna: ["Bezbłędna runda. Tak się buduje pewność.", "Wszystko dobrze. Ta umiejętność idzie w górę."],
  dobra: ["Dobra runda. Zostało kilka rzeczy do dopracowania.", "Większość dobrze. Zerknij na to, co nie wyszło."],
  slaba: ["Ta umiejętność potrzebuje jeszcze kilku rund. Zacznij od zadań z błędem.", "Trudna runda. Przejrzyj błędy, a następna pójdzie lepiej."],
};

function Podsumowanie({ odpowiedzi }: { odpowiedzi: OdpowiedzNauki[] }) {
  const dobre = odpowiedzi.filter((a) => a.correct).length;
  const pominiete = odpowiedzi.filter((a) => !a.correct && !a.answer.trim()).length;
  const bledne = odpowiedzi.length - dobre - pominiete;
  const bledy = new Map<string, number>();
  for (const a of odpowiedzi) {
    if (!a.correct && a.answer.trim() && a.error_type && nazwyBledow[a.error_type]) bledy.set(a.error_type, (bledy.get(a.error_type) ?? 0) + 1);
  }
  const udzial = odpowiedzi.length ? dobre / odpowiedzi.length : 0;
  const lista = udzial === 1 ? podsumowaniaPestki.bezbledna : udzial >= 0.6 ? podsumowaniaPestki.dobra : podsumowaniaPestki.slaba;
  const zdania = [
    dobre ? `Dobrze poszło: ${dobre} ${odmianaZadan(dobre)}.` : "Tym razem żadne zadanie nie wyszło.",
    bledne ? `Do poprawy: ${bledne} ${odmianaZadan(bledne)}.` : "",
    pominiete ? `Pominięte: ${pominiete}.` : "",
  ].filter(Boolean);
  return (
    <section className={s.sekcja} aria-labelledby="podsumowanie-rundy">
      <h2 id="podsumowanie-rundy" className="h2">Co poszło dobrze, a co nie</h2>
      <p>{zdania.join(" ")}</p>
      {bledy.size > 0 && <ul className="small muted">
        {[...bledy].map(([typ, ile]) => <li key={typ}>{nazwyBledow[typ]}: {ile}</li>)}
      </ul>}
      <PestkaMowi tekst={wybierz(lista, odpowiedzi.length)} />
    </section>
  );
}

// Pasek rośnie (albo maleje) od wartości sprzed rundy do wartości po niej, żeby zmiana była widoczna.
function PasekOpanowania({ przed, po }: { przed: number | null; po: number | null }) {
  const [szerokosc, setSzerokosc] = useState(przed ?? 0);
  useEffect(() => {
    const t = window.setTimeout(() => setSzerokosc(po ?? 0), 150);
    return () => window.clearTimeout(t);
  }, [po]);
  return (
    <span className={s.pasekOpanowania} aria-hidden="true">
      {przed != null && <span className={s.pasekPrzed} style={{ width: `${przed * 100}%` }} />}
      <span className={s.pasekPo} style={{ width: `${szerokosc * 100}%` }} />
    </span>
  );
}

function RozbiorGotowy({ sesja }: { sesja: SesjaNauki & { result: NonNullable<SesjaNauki["result"]> } }) {
  const { level, result, skill_id, format } = sesja;
  const [mapa, setMapa] = useState<MapaNauki | null>(null);
  const naglowek = useRef<HTMLHeadingElement>(null);
  useEffect(() => { naglowek.current?.focus(); }, []);
  useEffect(() => {
    const kontroler = new AbortController();
    void naukaApi.mapa(level, kontroler.signal).then(
      (mapa) => { if (!kontroler.signal.aborted) setMapa(mapa); },
      () => {}, // Ocena rundy jest dostępna także bez etykiety z mapy.
    );
    return () => kontroler.abort();
  }, [level]);
  const umiejetnosc = mapa?.skills.find((m) => m.skill_id === skill_id);
  const nazwa = umiejetnosc?.name;
  const dalej = result.nastepny_krok;
  const nastepna = mapa?.skills.find((m) => m.skill_id === dalej?.skill_id)?.name;
  // Rozbiór liczy opanowanie bez zaniku, a mapa z zanikiem: wyjaśnienie tylko wtedy, gdy liczby się różnią.
  const naMapie = umiejetnosc?.score ?? null;
  const inneNaMapie = naMapie != null && result.opanowanie_po != null && Math.round(naMapie * 100) !== Math.round(result.opanowanie_po * 100);
  const zmiana = result.opanowanie_przed != null && result.opanowanie_po != null
    ? Math.round(result.opanowanie_po * 100) - Math.round(result.opanowanie_przed * 100)
    : null;
  return (
    <main className={`container czytanie ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: adresNauki(level, skill_id), nazwa: "Nauka" }} tytul="Rozbiór rundy" tytulRef={naglowek}>
        <p className="small muted">{nazwaFormatuNauki[format]} · {nazwaPoziomu[level]}{nazwa && ` · ${nazwa}`}</p>
      </NaglowekStrony>
      <section className={s.sekcja} aria-labelledby="wynik-rundy">
        <h2 id="wynik-rundy" className="h1">{result.wynik.poprawne} z {result.wynik.wszystkich} poprawnie</h2>
        <ul className={s.wierszeRozbioru}>{sesja.answers.map((a) => <ProbaRozbioru key={a.position} odpowiedz={a} />)}</ul>
      </section>
      <Podsumowanie odpowiedzi={sesja.answers} />
      <section className={s.sekcja} aria-labelledby="mapa-po-rundzie">
        <h2 className="h2" id="mapa-po-rundzie">Zmiana opanowania{nazwa && ` · ${nazwa}`}</h2>
        <PasekOpanowania przed={result.opanowanie_przed} po={result.opanowanie_po} />
        <dl className={s.mapaRozbioru}>
          <div><dt className="small muted">Przed rundą</dt><dd>{opanowanie(result.opanowanie_przed)}</dd></div>
          <div>
            <dt className="small muted">Po rundzie</dt>
            <dd>
              {opanowanie(result.opanowanie_po)}
              {zmiana ? <span className={s.zmiana} data-plus={zmiana > 0}> {zmiana > 0 ? "+" : "−"}{Math.abs(zmiana)} pkt</span> : null}
            </dd>
          </div>
        </dl>
        {inneNaMapie && <p className="small muted" data-tutor-about="Na mapie opanowanie powoli maleje, gdy długo nie ćwiczysz, a rozbiór pokazuje stan zaraz po rundzie.">Na mapie jest {opanowanie(naMapie)}.</p>}
        <div><Link to={adresMapy(level, skill_id)} className="link">Zobacz umiejętność na mapie</Link></div>
      </section>
      {dalej && (
        <section className={s.nastepnyKrok} aria-labelledby="dalej-po-rundzie">
          <span className="kicker"><Sparkles size={14} strokeWidth={2.2} aria-hidden="true" /> Dalej</span>
          <h2 id="dalej-po-rundzie" className="h2">{nastepna ?? "Następne ćwiczenie"}</h2>
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
    <main className={`container czytanie ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: "/nauka", nazwa: "Nauka" }} tytul="Rozbiór rundy" />
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
