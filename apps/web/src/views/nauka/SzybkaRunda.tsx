import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Lightbulb } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSession } from "../../auth";
import { nazwaPoziomu, type Poziom } from "../../arkusze/typy";
import { Ladowanie } from "../../components/Ladowanie";
import { adresNauki, adresPowtorek, adresRozbioru, adresRundy } from "../../nauka/adresy";
import { naukaApi, nazwaFormatuNauki, type FormatNauki, type OdpowiedzNauki, type PytanieNauki, type SesjaNauki } from "../../nauka/api";
import { usePoziomNauki } from "../../nauka/stan";
import { TrescRundy } from "./TrescRundy";
import { czyBladBezPonowienia, czyZaDuzoSesji, komunikatRundy, nazwaOdpowiedzi, odczytajRunde, useSesjaRundy, UUID_SESJI, zapiszRunde } from "./sesjaRundy";
import s from "./SzybkaRunda.module.css";

type Start = { poziom: Poziom; umiejetnosc: string; format: FormatNauki; powtorz?: string };
const starty = new Map<string, Promise<SesjaNauki>>();

function zacznij(user: string, id: string, dane: Start): Promise<SesjaNauki> {
  const klucz = `${user}:${id}`;
  const otwarta = starty.get(klucz);
  if (otwarta) return otwarta;
  const wynik = naukaApi.start(id, dane.umiejetnosc, dane.poziom, dane.format, dane.powtorz);
  const zakoncz = () => { starty.delete(klucz); };
  starty.set(klucz, wynik);
  void wynik.then(zakoncz, zakoncz);
  return wynik;
}

function NaglowekRundy({ tytul, adres = "/nauka", children }: { tytul: string; adres?: string; children?: ReactNode }) {
  return (
    <header className={s.glowa}>
      <Link to={adres} className={`small link ${s.wroc}`}><ArrowLeft size={15} aria-hidden="true" /> Nauka</Link>
      <h1 className="display">{tytul}</h1>
      {children}
    </header>
  );
}

function NowaRunda({ user, poziom, umiejetnosc, format, powtorz }: Start & { user: string }) {
  const nawiguj = useNavigate();
  const { key } = useLocation();
  const proba = useRef<{ klucz: string; id: string } | null>(null);
  const [blad, setBlad] = useState<string | null>(null);
  const [rodzajBledu, setRodzajBledu] = useState<"ponowienie" | "bez-ponowienia" | "za-duzo">("ponowienie");
  const [liczbaProb, setLiczbaProb] = useState(0);
  const klucz = `sedno.nauka.start:${JSON.stringify([user, key, poziom, umiejetnosc, format, powtorz])}`;

  useEffect(() => {
    const zapisany = odczytajRunde<string>(klucz);
    if (proba.current?.klucz !== klucz) {
      proba.current = { klucz, id: typeof zapisany === "string" && UUID_SESJI.test(zapisany) ? zapisany : crypto.randomUUID() };
    }
    const id = proba.current.id;
    let aktualna = true;
    // UUID powstaje przed żądaniem i pozostaje ten sam po błędzie lub odświeżeniu.
    zapiszRunde(klucz, id);
    setBlad(null);
    // Zacznij od niedokończonej rundy z tą samą umiejętnością, formatem i poziomem zamiast zakładać kolejną.
    const otworz = async () => {
      if (!powtorz) {
        const otwarte = await naukaApi.ostatnie(poziom).catch(() => []);
        const istniejaca = otwarte.find((o) => o.skill_id === umiejetnosc && o.format === format && o.level === poziom);
        if (istniejaca) return istniejaca.id;
      }
      return (await zacznij(user, id, { poziom, umiejetnosc, format, powtorz })).id;
    };
    void otworz().then(
      (sesjaId) => {
        if (!aktualna) return;
        zapiszRunde(klucz, null);
        nawiguj(adresRundy(sesjaId), { replace: true });
      },
      (e: unknown) => {
        if (!aktualna) return;
        setBlad(komunikatRundy(e, "Nie udało się rozpocząć rundy. Możesz ponowić tę samą próbę."));
        setRodzajBledu(czyBladBezPonowienia(e) ? "bez-ponowienia" : czyZaDuzoSesji(e) ? "za-duzo" : "ponowienie");
      },
    );
    return () => { aktualna = false; };
  }, [format, klucz, liczbaProb, nawiguj, poziom, powtorz, umiejetnosc, user]);

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekRundy tytul={nazwaFormatuNauki[format]} adres={adresNauki(poziom, umiejetnosc)} />
      {blad ? (
        <section className={s.sekcja}>
          <p role="alert">{blad}</p>
          <div className={s.akcje}>
            {rodzajBledu === "ponowienie" && <button type="button" className="btn btn-primary" onClick={() => setLiczbaProb((n) => n + 1)}>Spróbuj ponownie</button>}
            {rodzajBledu === "za-duzo" && <Link to={`${adresNauki(poziom)}#ostatnio`} className="btn btn-primary">Przejdź do ostatnich ćwiczeń</Link>}
            {rodzajBledu === "bez-ponowienia" && <Link to={adresNauki(poziom)} className="btn btn-primary">Wróć do Nauki</Link>}
            {powtorz && <Link to={adresPowtorek(poziom)} className="btn btn-ghost">Wróć do powtórek</Link>}
          </div>
        </section>
      ) : <Ladowanie ksztalt="tekst" etykieta="Rozpoczynanie rundy" />}
    </main>
  );
}

type Szkic = { pozycja: number; tekst: string; wyslany: boolean };

function odczytajSzkic(klucz: string): Szkic | null {
  const zapis = odczytajRunde<Szkic>(klucz);
  return zapis && Number.isInteger(zapis.pozycja) && typeof zapis.tekst === "string"
    && typeof zapis.wyslany === "boolean" && zapis.tekst.length <= 1000 ? zapis : null;
}

function ZegarRundy({ poczatek, koniec }: { poczatek: string; koniec: string | null }) {
  const [teraz, setTeraz] = useState(Date.now);
  useEffect(() => {
    if (koniec) return;
    const t = window.setInterval(() => setTeraz(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [koniec]);
  const od = Date.parse(poczatek);
  const doo = koniec ? Date.parse(koniec) : teraz;
  const s = Math.max(0, Math.floor((doo - od) / 1000));
  if (!Number.isFinite(s)) return null;
  const minuty = Math.floor(s / 60);
  return <span className="muted small" title="Czas orientacyjny" aria-label={`Czas rundy: ${minuty} min ${s % 60} s`}>{minuty}:{String(s % 60).padStart(2, "0")}</span>;
}

function PytanieRundy({
  pytanie, tekst, zmien, odpowiedz, podpowiedz, oczekuje, zapisWTrakcie, ustalFokus,
}: {
  pytanie: PytanieNauki;
  tekst: string;
  zmien: (wartosc: string) => void;
  odpowiedz: (wartosc: string) => void;
  podpowiedz: () => void;
  oczekuje: boolean;
  zapisWTrakcie: boolean;
  ustalFokus: boolean;
}) {
  const naglowek = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const prompt = pytanie.prompt;
  const tytul = prompt.typ === "cke" ? `Zadanie CKE ${prompt.question}` : prompt.tresc;
  useEffect(() => {
    if (ustalFokus) naglowek.current?.focus();
  }, [ustalFokus]);

  const wyslij = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (tekst.trim()) odpowiedz(tekst);
  };

  return (
    <section className={s.sekcja} aria-labelledby={id}>
      <h2 id={id} className="h2" tabIndex={-1} ref={naglowek}>{tytul}</h2>
      <form className={s.formularz} onSubmit={wyslij}>
        <TrescRundy prompt={prompt} pole={(opcje) => (
          <>
            <fieldset className={s.pola} disabled={oczekuje || zapisWTrakcie}>
              <legend className={opcje ? "visually-hidden" : "small"}>{opcje ? "Wybierz jedną odpowiedź" : "Twoja odpowiedź"}</legend>
              {opcje ? opcje.map((opcja) => (
                <label key={opcja.id} className={s.opcja}>
                  <input type="radio" name={id} value={opcja.id} checked={tekst === opcja.id} onChange={() => zmien(opcja.id)} />
                  <span>
                    <strong>{opcja.id}.</strong>
                    {opcja.tekst && <span> {opcja.tekst}</span>}
                  </span>
                </label>
              )) : (
                <input className="input" maxLength={1000} aria-label="Twoja odpowiedź" value={tekst}
                  onChange={(e) => zmien(e.currentTarget.value)} autoComplete="off" spellCheck={false} lang="en" />
              )}
            </fieldset>
            <div className={s.akcje}>
              {zapisWTrakcie ? (
                <button type="button" className="btn btn-primary" disabled={oczekuje} onClick={() => odpowiedz(tekst)}>
                  {oczekuje ? "Zapisywanie…" : "Ponów zapis odpowiedzi"}
                </button>
              ) : (
                <>
                  <button type="submit" className="btn btn-primary" disabled={oczekuje || !tekst.trim()}>Sprawdź</button>
                  <button type="button" className="btn btn-ghost" disabled={oczekuje} onClick={() => odpowiedz("")}>Pomiń</button>
                </>
              )}
              {pytanie.hint_count > 0 && !zapisWTrakcie && (
                <button type="button" className="btn btn-ghost" disabled={oczekuje || pytanie.hint_level >= pytanie.hint_count} onClick={podpowiedz}>
                  <Lightbulb size={17} aria-hidden="true" /> Podpowiedź
                </button>
              )}
            </div>
          </>
        )} />
      </form>
      {!!pytanie.hints?.length && (
        <div className={s.podpowiedzi} role="status">
          {pytanie.hints.map((tekst, i) => <p key={i} className="small"><strong>Podpowiedź {i + 1}.</strong> {tekst}</p>)}
        </div>
      )}
    </section>
  );
}

function OcenaRundy({ odpowiedz, id, skonczona, dalej }: {
  odpowiedz: OdpowiedzNauki; id: string; skonczona: boolean; dalej: () => void;
}) {
  const [szczegoly, setSzczegoly] = useState(false);
  const tytul = useRef<HTMLHeadingElement>(null);
  useEffect(() => { tytul.current?.focus(); }, []);
  const prompt = odpowiedz.prompt;
  return (
    <section className={s.sekcja}>
      <h2 className={`h2 ${s.ocena}`} ref={tytul} tabIndex={-1} data-correct={odpowiedz.correct}>
        {odpowiedz.correct ? <Check size={24} aria-hidden="true" /> : <CircleAlert size={24} aria-hidden="true" />}
        {odpowiedz.correct ? "Dobra odpowiedź" : odpowiedz.answer.trim() ? "Tym razem nie" : "Pominięte zadanie"}
      </h2>
      {prompt.typ !== "cke" && <p className={s.pytanieCke}>{prompt.tresc}</p>}
      <p><strong>Twoja odpowiedź</strong> · {nazwaOdpowiedzi(odpowiedz.answer, prompt)}</p>
      {!odpowiedz.correct && <p><strong>Poprawna odpowiedź</strong> · {odpowiedz.solutions.map((a) => nazwaOdpowiedzi(a, prompt)).join(" / ")}</p>}
      <p className="muted">{odpowiedz.explanation}</p>
      <details className={s.pelneNagranie} onToggle={(e) => setSzczegoly(e.currentTarget.open)}>
        <summary>Treść zadania</summary>
        {szczegoly && <div className={s.probaTresc}><TrescRundy prompt={prompt} poOcenie /></div>}
      </details>
      <div className={s.akcje}>
        {skonczona ? (
          <Link className="btn btn-primary" to={adresRozbioru(id)}>Zobacz rozbiór <ArrowRight size={17} aria-hidden="true" /></Link>
        ) : <button type="button" className="btn btn-primary" onClick={dalej}>Następne zadanie <ArrowRight size={17} aria-hidden="true" /></button>}
      </div>
    </section>
  );
}

function OtwartaRunda({ start, user, ponow }: { start: SesjaNauki; user: string; ponow: () => void }) {
  const klucz = `sedno.nauka.odpowiedz:${user}:${start.id}`;
  const [sesja, setSesja] = useState(start);
  const [szkic, setSzkic] = useState(() => odczytajSzkic(klucz));
  const [ocenaPoz, setOcenaPoz] = useState<number | null>(() => {
    const zapis = odczytajSzkic(klucz);
    return zapis?.wyslany && start.answers.some((a) => a.position === zapis.pozycja) ? zapis.pozycja : null;
  });
  const [oczekuje, setOczekuje] = useState(false);
  const [blad, setBlad] = useState<string | null>(null);
  const [ustalFokus, setUstalFokus] = useState(false);
  const zapisuje = useRef(false);
  const aktualna = useRef(false);
  const pytanie = sesja.question;
  const ocena = sesja.answers.find((a) => a.position === ocenaPoz);
  const wPytaniu = szkic?.pozycja === pytanie?.position ? szkic : null;

  useEffect(() => {
    aktualna.current = true;
    return () => { aktualna.current = false; };
  }, []);

  useEffect(() => {
    if (ocena && szkic?.pozycja === ocena.position) zapiszRunde(klucz, null);
  }, [klucz, ocena, szkic]);

  function zachowaj(nowy: Szkic | null) {
    setSzkic(nowy);
    zapiszRunde(klucz, nowy);
  }

  function pokazOcene(zapis: SesjaNauki, pozycja: number) {
    if (!aktualna.current) return;
    setSesja(zapis);
    setOcenaPoz(pozycja);
    zachowaj(null);
  }

  async function odpowiedz(tekst: string) {
    if (!pytanie || zapisuje.current) return;
    const pozycja = pytanie.position;
    zapisuje.current = true;
    setOczekuje(true);
    setBlad(null);
    zachowaj({ pozycja, tekst, wyslany: true });
    try {
      pokazOcene(await naukaApi.odpowiedz(sesja.id, pozycja, tekst), pozycja);
    } catch (e) {
      if (!aktualna.current) return;
      // Odpowiedź może dotrzeć do bazy, mimo że klient nie dostał potwierdzenia.
      const zapisana = await naukaApi.sesja(sesja.id).catch(() => null);
      if (zapisana?.answers.some((a) => a.position === pozycja)) pokazOcene(zapisana, pozycja);
      else if (aktualna.current) setBlad(komunikatRundy(e, "Nie udało się potwierdzić zapisu. Odpowiedź czeka na ponowienie."));
    } finally {
      if (aktualna.current) setOczekuje(false);
      zapisuje.current = false;
    }
  }

  async function podpowiedz() {
    if (!pytanie || zapisuje.current) return;
    zapisuje.current = true;
    setOczekuje(true);
    setBlad(null);
    try {
      const stan = await naukaApi.podpowiedz(sesja.id, pytanie.position, pytanie.hint_level + 1);
      if (aktualna.current) setSesja(stan);
    } catch (e) {
      if (aktualna.current) setBlad(komunikatRundy(e, "Nie udało się pobrać podpowiedzi. Spróbuj ponownie."));
    } finally {
      if (aktualna.current) setOczekuje(false);
      zapisuje.current = false;
    }
  }

  if (!ocena && !pytanie && sesja.result) return <Navigate replace to={adresRozbioru(sesja.id)} />;

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekRundy tytul={nazwaFormatuNauki[sesja.format]} adres={adresNauki(sesja.level, sesja.skill_id)}>
        <p className="small muted">Język angielski · {nazwaPoziomu[sesja.level]}</p>
      </NaglowekRundy>
      <section className={s.postep} aria-label="Postęp rundy">
        <div className={s.wierszPostepu}>
          <span className="label">Zadanie {ocena?.position ?? pytanie?.position ?? sesja.limit} z {sesja.limit}</span>
          <div className={s.czasy}>
            {sesja.streak >= 2 && <span className="small muted">Dobre z rzędu: {sesja.streak}</span>}
            {sesja.format === "szybka-runda" && <ZegarRundy poczatek={sesja.created_at} koniec={sesja.completed_at} />}
          </div>
        </div>
        <progress aria-label="Sprawdzone zadania" value={sesja.answers.length} max={sesja.limit} />
      </section>
      {blad && <div className={s.komunikat}>
        <p className={s.blad} role="alert">{blad}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={ponow}>Wczytaj stan rundy</button>
      </div>}
      {ocena ? (
        <OcenaRundy key={ocena.position} odpowiedz={ocena} id={sesja.id} skonczona={!!sesja.result}
          dalej={() => { zachowaj(null); setUstalFokus(true); setOcenaPoz(null); }} />
      ) : pytanie ? (
        <PytanieRundy key={pytanie.position} pytanie={pytanie} tekst={wPytaniu?.tekst ?? ""}
          zmien={(tekst) => zachowaj({ tekst, pozycja: pytanie.position, wyslany: false })}
          odpowiedz={(tekst) => void odpowiedz(tekst)} podpowiedz={() => void podpowiedz()}
          oczekuje={oczekuje} zapisWTrakcie={!!wPytaniu?.wyslany} ustalFokus={ustalFokus} />
      ) : <p role="alert">Brakuje zadania do rozwiązania.</p>}
    </main>
  );
}

function OdczytanaRunda({ id, user }: { id: string; user: string }) {
  const [stan, ponow] = useSesjaRundy(id);
  if (stan.status === "gotowa") return <OtwartaRunda start={stan.sesja} user={user} ponow={ponow} />;
  return (
    <main className={`container ${s.strona}`}>
      <NaglowekRundy tytul="Runda nauki" />
      {stan.status === "laduje" ? <Ladowanie ksztalt="tekst" etykieta="Wczytywanie rundy" /> : (
        <div className={s.komunikat}>
          <p role="alert">{stan.status === "brak" ? "Nie udało się znaleźć tej rundy na Twoim koncie." : "Nie udało się wczytać rundy."}</p>
          {stan.status === "blad" && <button type="button" className="btn btn-ghost" onClick={ponow}>Spróbuj ponownie</button>}
        </div>
      )}
    </main>
  );
}

export function SzybkaRunda() {
  const session = useSession();
  const { id } = useParams();
  const [params] = useSearchParams();
  const [poziom] = usePoziomNauki();
  if (!session) return null;
  const user = session.user.id;
  const umiejetnosc = params.get("umiejetnosc");
  const formatParam = params.get("format");
  const format = formatParam === "napraw-blad" || formatParam === "sokratejski" ? formatParam : "szybka-runda";
  const powtorz = params.get("powtorz") || undefined;
  if (id) return <OdczytanaRunda key={`${user}:${id}`} user={user} id={id} />;
  if (umiejetnosc) return <NowaRunda user={user} poziom={poziom} umiejetnosc={umiejetnosc} format={format} powtorz={powtorz} />;
  return (
    <main className={`container ${s.strona}`}>
      <NaglowekRundy tytul="Szybka runda" />
      <p><Link to={adresNauki(poziom)} className="btn btn-primary">Wybierz umiejętność</Link></p>
    </main>
  );
}
