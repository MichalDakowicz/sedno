import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronRight, CircleAlert, CircleMinus } from "lucide-react";
import { trwa, useDiagnoza, useTrybDiagnozy } from "../../nauka/diagnoza";
import { Link, useParams } from "react-router-dom";
import { nazwaPoziomu, nazwaZadaniaCke } from "../../arkusze/typy";
import { useSession } from "../../auth";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Ladowanie } from "../../components/Ladowanie";
import { adresMapy, adresNauki, adresRundy, adresStartu } from "../../nauka/adresy";
import { nazwaFormatuNauki, type OdpowiedzNauki, type SesjaNauki } from "../../nauka/api";
import { nazwaOdpowiedzi, useSesjaRundy } from "./sesjaRundy";
import { PestkaMowi } from "./PestkaRundy";
import { glos, wybierz } from "../../pestka/glos";
import { TutorAvatar, type AvatarState } from "../../components/TutorAvatar";
import { TrescRundy } from "./TrescRundy";
import { WynikDiagnozy } from "./WynikDiagnozy";
import { Kropki, PasekProgu } from "../../components/wykresy";
import { Kielek } from "../../components/Kielek";
import { NAZWA_STADIUM, stadium, wyzszeStadium, doNastepnegoStadium } from "../../nauka/stadia";
import { useZapytanie } from "../../nauka/stan";
import { zapytania } from "../../nauka/zapytania";
import { koniecKolejki, nastepnaWKolejce, porzucKolejke, zdejmijZKolejki } from "../../nauka/kolejka";
import { policzGotowosc } from "../../nauka/gotowosc";
import { useDzisAngielski } from "../../nauka/dzis";
import { celPrzedmiotu, useUczenie } from "../../konto/profilUcznia";
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

/** Tytuł sekcji to wniosek: o ile zmieniło się opanowanie, a nie nazwa wykresu. */
function tytulZmiany(przed: number | null, po: number | null, zmiana: number | null) {
  if (po == null) return "Za mało odpowiedzi, żeby ocenić opanowanie";
  if (przed == null) return `Pierwsza ocena: ${procent.format(po)}`;
  if (!zmiana) return "Opanowanie bez zmian";
  return zmiana > 0 ? `Opanowanie w górę o ${zmiana} pkt proc.` : `Opanowanie w dół o ${-zmiana} pkt proc.`;
}

const nazwyBledow: Record<string, string> = { "jezyk-i-forma": "Błędy językowe i dotyczące formy" };


/** Jedno zdanie Pestki o rundzie: na tej samej zasadzie co reakcje przy werdykcie (gotowe teksty, bez AI). */
function zdaniePestki(odpowiedzi: OdpowiedzNauki[]) {
  const dobre = odpowiedzi.filter((a) => a.correct).length;
  const udzial = odpowiedzi.length ? dobre / odpowiedzi.length : 0;
  const lista = udzial === 1 ? glos.rozbior.bezbledna : udzial >= 0.6 ? glos.rozbior.dobra : glos.rozbior.slaba;
  return wybierz(lista, odpowiedzi.length);
}

const KLUCZ_PIERWSZEJ = "sedno.pestka.pierwszaBezbledna";

/** Pierwsza bezbłędna runda to święto (raz na przeglądarkę), kolejna albo runda z postępem to duma. */
function emocjaRozbioru(sesja: string, odpowiedzi: OdpowiedzNauki[], zmiana: number | null): AvatarState | undefined {
  const bezbledna = odpowiedzi.length > 0 && odpowiedzi.every((a) => a.correct);
  if (bezbledna) {
    try {
      const pierwsza = localStorage.getItem(KLUCZ_PIERWSZEJ);
      if (!pierwsza) localStorage.setItem(KLUCZ_PIERWSZEJ, sesja);
      if (!pierwsza || pierwsza === sesja) return "swieto";
    } catch {
      // bez pamięci przeglądarki zostaje duma
    }
    return "duma";
  }
  return zmiana && zmiana > 0 ? "duma" : undefined;
}

/** Pestka na mapie: gdy runda przesunęła stadium, widać starą roślinę i nową, która rośnie. */
function StadiumRundy({ przed, po }: { przed: number | null; po: number | null }) {
  if (po == null) return null;
  const a = stadium(przed);
  const b = stadium(po);
  const urosla = przed != null && wyzszeStadium(a, b);
  return (
    <div className={s.stadium}>
      {urosla && (
        <>
          <Kielek stadium={a} rozmiar={48} />
          <span className="muted" aria-hidden="true">→</span>
        </>
      )}
      <Kielek stadium={b} rozmiar={64} animuj={urosla} />
      <p className="small muted">
        {urosla ? `Urosła na mapie: ${NAZWA_STADIUM[a]} → ${NAZWA_STADIUM[b]}.` : `Na mapie: ${NAZWA_STADIUM[b]}.`}
        {doNastepnegoStadium(po) && ` ${doNastepnegoStadium(po)!.charAt(0).toUpperCase()}${doNastepnegoStadium(po)!.slice(1)}`}
      </p>
    </div>
  );
}

function KropkiOdpowiedzi({ odpowiedzi }: { odpowiedzi: OdpowiedzNauki[] }) {
  const dobre = odpowiedzi.filter((a) => a.correct).length;
  const pominiete = odpowiedzi.filter((a) => !a.correct && !a.answer.trim()).length;
  return (
    <Kropki
      opis={`Dobrze ${dobre}, źle ${odpowiedzi.length - dobre - pominiete}${pominiete ? `, pominięte ${pominiete}` : ""}.`}
      kropki={odpowiedzi.map((a) => ({ stan: a.correct ? "dobrze" : a.answer.trim() ? "zle" : "pominiete", tytul: opisZadania(a) }))}
    />
  );
}

function BledyRundy({ odpowiedzi }: { odpowiedzi: OdpowiedzNauki[] }) {
  const bledy = new Map<string, number>();
  for (const a of odpowiedzi) {
    if (!a.correct && a.answer.trim() && a.error_type && nazwyBledow[a.error_type]) bledy.set(a.error_type, (bledy.get(a.error_type) ?? 0) + 1);
  }
  if (!bledy.size) return null;
  return <ul className="small muted">{[...bledy].map(([typ, ile]) => <li key={typ}>{nazwyBledow[typ]}: {ile}</li>)}</ul>;
}

type SesjaZWynikiem = SesjaNauki & { result: NonNullable<SesjaNauki["result"]> };

/** Rozbiór sesji diagnozy (wejście z Powtórek albo z prób na mapie): wynik na każdą umiejętność zamiast przed → po. */
function RozbiorDiagnozy({ sesja }: { sesja: SesjaZWynikiem }) {
  const { level, result } = sesja;
  const naglowek = useRef<HTMLHeadingElement>(null);
  const [zadania, setZadania] = useState(false);
  useEffect(() => { naglowek.current?.focus(); }, []);
  return (
    <main className={`container czytanie ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: adresNauki(level), nazwa: "Nauka" }} tytul="Wyniki diagnozy" tytulRef={naglowek}>
        <p className="small muted">{nazwaFormatuNauki.diagnoza} · {nazwaPoziomu[level]}</p>
      </NaglowekStrony>
      <WynikDiagnozy poziom={level} wynik={result} odpowiedzi={sesja.answers} sesja={sesja.id} />
      <details className={s.rozwijane} onToggle={(e) => setZadania(e.currentTarget.open)}>
        <summary><ChevronRight size={16} aria-hidden="true" /> Zadania diagnozy</summary>
        {zadania && <ul className={s.wierszeRozbioru}>{sesja.answers.map((a) => <ProbaRozbioru key={a.position} odpowiedz={a} />)}</ul>}
      </details>
      <div className={s.akcje}>
        <Link className="btn btn-primary" to={adresMapy(level)}>Zobacz ogród umiejętności <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </main>
  );
}

function RozbiorGotowy({ sesja }: { sesja: SesjaZWynikiem }) {
  const { level, skill_id, format } = sesja;
  const result = { ...sesja.result, opanowanie_przed: sesja.result.opanowanie_przed ?? null, opanowanie_po: sesja.result.opanowanie_po ?? null };
  const skill = skill_id ?? undefined;
  // Mapa ze wspólnej pamięci (po rundzie świeża, bo odpowiedzi ją unieważniają); ocena rundy działa i bez niej.
  const mapa = useZapytanie(zapytania.mapa(level)).dane;
  const naglowek = useRef<HTMLHeadingElement>(null);
  const [zadania, setZadania] = useState(false);
  const uczenie = useUczenie();
  // Kolejka „Powtórz wszystkie”: następna powtórka jest jedyną główną akcją, dopóki kolejka się nie skończy.
  const [kolejka] = useState(nastepnaWKolejce);
  const [koniecPowtorek] = useState(koniecKolejki);
  useEffect(() => { if (koniecPowtorek) porzucKolejke(); }, [koniecPowtorek]);
  useEffect(() => { naglowek.current?.focus(); }, []);
  const gotowosc = mapa ? policzGotowosc(mapa.skills) : null;
  const cel = celPrzedmiotu(uczenie, "angielski");
  const umiejetnosc = mapa?.skills.find((m) => m.skill_id === skill_id);
  const nazwa = umiejetnosc?.name;
  const dalej = result.nastepny_krok;
  const nastepna = mapa?.skills.find((m) => m.skill_id === dalej?.skill_id)?.name;
  // „Dalej” to ta sama propozycja co na pulpicie i w ogrodzie (po rundzie już przeliczona), żeby uczeń nie dostał
  // dwóch odpowiedzi na „co teraz”. Polecenie serwera z wyniku rundy zostaje na wypadek, gdyby propozycji nie było.
  const dzisA = useDzisAngielski(level);
  const polecenie = dzisA.stan !== "gotowe" ? null : dzisA.dzis ?? (dalej ? {
    tytul: nastepna ?? "Następne ćwiczenie",
    powod: `Dalej wybrałam to ćwiczenie. ${dalej.reason}`,
    akcja: { do: adresStartu(level, dalej.skill_id, dalej.format, dalej.repeat_id ?? undefined), etykieta: nazwaFormatuNauki[dalej.format] },
    minuty: dalej.minutes as number | null,
  } : null);
  // Dawna diagnoza (rundy po kolei, stan w przeglądarce) prowadzi do kolejnego obszaru; przy nowej bazie jej nie ma.
  const lokalna = useDiagnoza();
  const trybDiagnozy = useTrybDiagnozy(level);
  const dalejWDiagnozie = trwa(lokalna) && trybDiagnozy.tryb === "przegladarka";
  // Rozbiór liczy opanowanie bez zaniku, a mapa z zanikiem: wyjaśnienie tylko wtedy, gdy liczby się różnią.
  const naMapie = umiejetnosc?.score ?? null;
  const inneNaMapie = naMapie != null && result.opanowanie_po != null && Math.round(naMapie * 100) !== Math.round(result.opanowanie_po * 100);
  const zmiana = result.opanowanie_przed != null && result.opanowanie_po != null
    ? Math.round(result.opanowanie_po * 100) - Math.round(result.opanowanie_przed * 100)
    : null;
  return (
    <main className={`container czytanie ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: adresNauki(level, skill), nazwa: "Nauka" }} tytul="Rozbiór rundy" tytulRef={naglowek}>
        <p className="small muted">{nazwaFormatuNauki[format]} · {nazwaPoziomu[level]}{nazwa && ` · ${nazwa}`}</p>
      </NaglowekStrony>
      <section className={s.sekcja} aria-labelledby="wynik-rundy">
        <h2 id="wynik-rundy" className="h1">{result.wynik.poprawne} z {result.wynik.wszystkich} poprawnie</h2>
        <KropkiOdpowiedzi odpowiedzi={sesja.answers} />
        <PestkaMowi tekst={zdaniePestki(sesja.answers)} emocja={emocjaRozbioru(sesja.id, sesja.answers, zmiana)} />
        <details className={s.rozwijane} onToggle={(e) => setZadania(e.currentTarget.open)}>
          <summary><ChevronRight size={16} aria-hidden="true" /> Zadania tej rundy</summary>
          {zadania && (
            <>
              <ul className={s.wierszeRozbioru}>{sesja.answers.map((a) => <ProbaRozbioru key={a.position} odpowiedz={a} />)}</ul>
              <BledyRundy odpowiedzi={sesja.answers} />
            </>
          )}
        </details>
      </section>
      <section className={s.sekcja} aria-labelledby="mapa-po-rundzie">
        <h2 className="h2" id="mapa-po-rundzie">{tytulZmiany(result.opanowanie_przed, result.opanowanie_po, zmiana)}</h2>
        <StadiumRundy przed={result.opanowanie_przed} po={result.opanowanie_po} />
        {result.opanowanie_po != null && (
          <PasekProgu gruby wartosc={result.opanowanie_po} przed={result.opanowanie_przed}
            opis={`Opanowanie${nazwa ? ` umiejętności ${nazwa}` : ""}: przed rundą ${opanowanie(result.opanowanie_przed)}, po rundzie ${opanowanie(result.opanowanie_po)}.`} />
        )}
        <p className="small muted">
          {nazwa ? `${nazwa} · ` : ""}przed rundą {opanowanie(result.opanowanie_przed)}, po rundzie {opanowanie(result.opanowanie_po)}
          {inneNaMapie && <span data-tutor-about="Na mapie opanowanie powoli maleje, gdy długo nie ćwiczysz, a rozbiór pokazuje stan zaraz po rundzie."> · na mapie {opanowanie(naMapie)}</span>}
        </p>
        {gotowosc && (
          <p className="small">
            Gotowość z angielskiego: {procent.format(gotowosc.wartosc)}{cel !== null && (gotowosc.wartosc >= cel ? ", cel osiągnięty." : `, do celu ${Math.round(cel * 100)}% brakuje ${Math.round((cel - gotowosc.wartosc) * 100)} pkt proc.`)}
          </p>
        )}
        <div><Link to={adresMapy(level, skill)} className="link">Zobacz roślinę w ogrodzie</Link></div>
      </section>
      {/* W trakcie diagnozy następnym krokiem jest kolejny obszar, nie polecenie z mapy. */}
      {koniecPowtorek ? (
        <section className={s.nastepnyKrok} aria-labelledby="dalej-po-rundzie">
          <span className="kicker"><TutorAvatar size={22} state="duma" /> Dalej</span>
          <h2 id="dalej-po-rundzie" className="h2">{koniecPowtorek > 1 ? `Powtórki zrobione: ${koniecPowtorek} z ${koniecPowtorek}` : "Powtórka zrobiona"}</h2>
          <p>{wybierz(glos.rozbior.koniecPowtorek, koniecPowtorek)}</p>
          <div className={s.akcje}>
            <Link className="btn btn-primary" to={adresMapy(level)}>Zobacz ogród <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </section>
      ) : kolejka ? (
        <section className={s.nastepnyKrok} aria-labelledby="dalej-po-rundzie">
          <span className="kicker"><TutorAvatar size={22} /> Dalej</span>
          <h2 id="dalej-po-rundzie" className="h2">Następna powtórka · {kolejka.numer} z {kolejka.razem}</h2>
          <div className={s.akcje}>
            <Link className="btn btn-primary" to={kolejka.adres} onClick={zdejmijZKolejki}>Następna powtórka <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </section>
      ) : dalejWDiagnozie ? (
        <div className={s.akcje}>
          <Link className="btn btn-primary" to="/nauka/diagnoza">Dalej w diagnozie <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      ) : polecenie && (
        <section className={s.nastepnyKrok} aria-labelledby="dalej-po-rundzie">
          <span className="kicker"><TutorAvatar size={22} /> Dalej</span>
          <h2 id="dalej-po-rundzie" className="h2">{polecenie.tytul}</h2>
          <p>{polecenie.powod}</p>
          <div className={s.akcje}>
            <Link className="btn btn-primary" to={polecenie.akcja.do}>
              {polecenie.akcja.etykieta}{polecenie.minuty ? ` · ${polecenie.minuty} min` : ""} <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

function RozbiorSesji({ id }: { id: string }) {
  const [stan, ponow] = useSesjaRundy(id);
  if (stan.status === "gotowa" && stan.sesja.result) {
    const sesja = { ...stan.sesja, result: stan.sesja.result };
    return sesja.format === "diagnoza" ? <RozbiorDiagnozy sesja={sesja} /> : <RozbiorGotowy sesja={sesja} />;
  }
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
