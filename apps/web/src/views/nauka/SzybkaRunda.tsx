import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check, CircleAlert, Lightbulb, MessageCircle } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSession } from "../../auth";
import { nazwaPoziomu, nazwaZadaniaCke, type Poziom } from "../../arkusze/typy";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Ladowanie } from "../../components/Ladowanie";
import { Kropki, type Kropka } from "../../components/wykresy";
import { useTutor } from "../../components/TutorContext";
import { adresDiagnozy, adresNauki, adresPowtorek, adresRozbioru, adresRundy } from "../../nauka/adresy";
import { biezacaWKolejce } from "../../nauka/kolejka";
import { zapytania } from "../../nauka/zapytania";
import { useZapytanie } from "../../nauka/stan";
import { naukaApi, nazwaFormatuNauki, type FormatNauki, type OdpowiedzNauki, type PytanieNauki, type SesjaNauki } from "../../nauka/api";
import { usePoziomNauki } from "../../nauka/stan";
import { KafleOdpowiedzi, TrescRundy } from "./TrescRundy";
import { KontekstRundy, PestkaMowi } from "./PestkaRundy";
import { glos, wybierz } from "../../pestka/glos";
import { WyjasnienieRundy } from "./WyjasnienieRundy";
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

function NaglowekRundy({ tytul, adres = "/nauka", nazwa = "Nauka", children }: { tytul: string; adres?: string; nazwa?: string; children?: ReactNode }) {
  return <NaglowekStrony wstecz={{ do: adres, nazwa }} tytul={tytul}>{children}</NaglowekStrony>;
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
      const otwarte = await naukaApi.ostatnie(poziom).catch(() => []);
      const istniejaca = otwarte.find((o) => o.skill_id === umiejetnosc && o.format === format && o.level === poziom && (o.repeat_item ?? undefined) === powtorz);
      if (istniejaca) return istniejaca.id;
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
    <main className={`container czytanie ${s.strona}`}>
      <NaglowekRundy tytul={nazwaFormatuNauki[format]} adres={adresNauki(poziom, umiejetnosc)} />
      {blad ? (
        <section className={s.sekcja}>
          <p role="alert">{blad}</p>
          <div className={s.akcje}>
            {rodzajBledu === "ponowienie" && <button type="button" className="btn btn-primary" onClick={() => setLiczbaProb((n) => n + 1)}>Spróbuj ponownie</button>}
            {rodzajBledu === "za-duzo" && <Link to={`${adresNauki(poziom)}#ostatnio`} className="btn btn-primary">Przejdź do ostatnich ćwiczeń</Link>}
            {rodzajBledu === "bez-ponowienia" && !powtorz && <Link to={adresNauki(poziom)} className="btn btn-primary">Wróć do Nauki</Link>}
            {powtorz && <Link to={adresPowtorek(poziom)} className={rodzajBledu === "bez-ponowienia" ? "btn btn-primary" : "btn btn-ghost"}>Wróć do powtórek</Link>}
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

// Początek zegara rundy: liczy od chwili, gdy pierwsze zadanie jest na ekranie, a nie od założenia rundy,
// bo wczytywanie pierwszego zadania trwało, zanim uczeń cokolwiek zobaczył. Runda wznowiona później liczy od założenia.
const startyZegara = new Map<string, number>();

function ZegarRundy({ poczatek, koniec }: { poczatek: number | null; koniec: string | null }) {
  const [teraz, setTeraz] = useState(Date.now);
  useEffect(() => {
    if (koniec || poczatek === null) return;
    setTeraz(Date.now());
    const t = window.setInterval(() => setTeraz(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [koniec, poczatek]);
  if (poczatek === null) return null;
  const doo = koniec ? Date.parse(koniec) : teraz;
  const s = Math.max(0, Math.floor((doo - poczatek) / 1000));
  if (!Number.isFinite(s)) return null;
  const minuty = Math.floor(s / 60);
  return <span className="muted small" title="Czas orientacyjny" aria-label={`Czas rundy: ${minuty} min ${s % 60} s`}>{minuty}:{String(s % 60).padStart(2, "0")}</span>;
}

const tytulPytania = (prompt: PytanieNauki["prompt"]) => prompt.typ === "cke" ? nazwaZadaniaCke(prompt.sheet_id, prompt.question) : prompt.tresc;

function PytanieRundy({
  pytanie, tekst, zmien, odpowiedz, podpowiedz, oczekuje, zapisWTrakcie, ustalFokus, onGotowe,
}: {
  pytanie: PytanieNauki;
  tekst: string;
  zmien: (wartosc: string) => void;
  odpowiedz: (wartosc: string) => void;
  podpowiedz: () => void;
  oczekuje: boolean;
  zapisWTrakcie: boolean;
  ustalFokus: boolean;
  onGotowe: () => void;
}) {
  const naglowek = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const prompt = pytanie.prompt;
  useEffect(() => {
    if (ustalFokus) naglowek.current?.focus();
  }, [ustalFokus]);

  const wyslij = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (tekst.trim()) odpowiedz(tekst);
  };

  return (
    <section className={`${s.sekcja} ${s.pytanieWejscie}`} aria-labelledby={id} data-tutor="pytanie-rundy">
      <h2 id={id} className="h2" tabIndex={-1} ref={naglowek}>{tytulPytania(prompt)}</h2>
      <form className={s.formularz} onSubmit={wyslij}>
        <TrescRundy prompt={prompt} onGotowe={onGotowe} pole={(opcje) => (
          <>
            <fieldset className={s.pola} disabled={oczekuje || zapisWTrakcie}>
              <legend className={opcje ? "visually-hidden" : "small"}>{opcje ? "Wybierz jedną odpowiedź" : "Twoja odpowiedź"}</legend>
              {opcje ? <KafleOdpowiedzi opcje={opcje} nazwa={id} wybrana={tekst} zmien={zmien} /> : (
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
      <div className={pytanie.hints?.length ? s.podpowiedzi : undefined} role="status">
        {pytanie.hints?.map((tekst, i) => <p key={i} className="small"><strong>Podpowiedź {i + 1}.</strong> {tekst}</p>)}
      </div>
    </section>
  );
}

type Reakcja = { seria: number; zleZRzedu: number; dolozone: boolean; skrocona: boolean; diagnoza: boolean };

function tekstReakcji(o: OdpowiedzNauki, r: Reakcja, wyjasnienie: boolean): string {
  const n = o.position;
  const pominiete = !o.correct && !o.answer.trim();
  const glowny = o.correct
    ? r.skrocona ? wybierz(glos.skrocona, n)
    : r.seria >= 3 ? wybierz(glos.seria, n).replace("{n}", String(r.seria)) : wybierz(glos.dobrze, n)
    : r.zleZRzedu >= 3 ? wybierz(r.diagnoza ? glos.blad.zwolnijDiagnoza : glos.blad.zwolnij, n)
      : pominiete ? wybierz(glos.blad.pominiete, n)
        : wybierz(wyjasnienie ? glos.blad.zle : glos.blad.bezWyjasnienia, n);
  return r.dolozone ? `${glowny} ${wybierz(glos.blad.dokladam, n)}` : glowny;
}

function OcenaRundy({ odpowiedz, sesja, skonczona, koniec, dalej, reakcja }: {
  odpowiedz: OdpowiedzNauki; sesja: string; skonczona: boolean; koniec: { do: string; etykieta: string }; dalej: () => void; reakcja: Reakcja;
}) {
  const { aiGotowe } = useTutor();
  const [wyjasnij, setWyjasnij] = useState(false);
  const tytul = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => { tytul.current?.focus(); }, []);
  const prompt = odpowiedz.prompt;
  const cke = prompt.typ === "cke" ? prompt : null;
  const kafle = prompt.typ !== "luka";
  const zle = !odpowiedz.correct;
  const przyciskWyjasnienia = cke && !wyjasnij && aiGotowe !== false && (
    <button type="button" className="btn btn-secondary btn-sm" disabled={!aiGotowe} onClick={() => setWyjasnij(true)}>
      <MessageCircle size={16} aria-hidden="true" /> Wyjaśnij z Pestką
    </button>
  );
  const bezAi = null;
  return (
    // Ten sam układ co pytanie (tytuł, treść, kafle w tym samym miejscu), więc kafle nie skaczą, tylko zmieniają stan;
    // werdykt z Pestką dochodzi pod nimi.
    <section className={s.sekcja} data-tutor="werdykt">
      <h2 className="h2">{tytulPytania(prompt)}</h2>
      <div className={s.formularz}>
        <TrescRundy prompt={prompt} poOcenie pole={(opcje) => (
          <div className={s.pola}>
            {kafle && opcje ? (
              <KafleOdpowiedzi opcje={opcje} nazwa={id} wybrana={odpowiedz.answer} poprawne={odpowiedz.solutions} />
            ) : (
              <>
                <p><strong>Twoja odpowiedź</strong> · {nazwaOdpowiedzi(odpowiedz.answer, prompt)}</p>
                {zle && <p><strong>Poprawna odpowiedź</strong> · {odpowiedz.solutions.map((a) => nazwaOdpowiedzi(a, prompt)).join(" / ")}</p>}
              </>
            )}
          </div>
        )} />
      </div>
      <div className={`${s.werdykt} ${s.werdyktWejscie}`}>
        <h3 className={`h2 ${s.ocena}`} ref={tytul} tabIndex={-1} data-correct={odpowiedz.correct}>
          {odpowiedz.correct ? <Check size={24} aria-hidden="true" /> : <CircleAlert size={24} aria-hidden="true" />}
          {odpowiedz.correct ? "Dobra odpowiedź" : odpowiedz.answer.trim() ? "Tym razem nie" : "Pominięte zadanie"}
        </h3>
        <PestkaMowi tekst={tekstReakcji(odpowiedz, reakcja, !!cke)} emocja={odpowiedz.correct ? "radosc" : reakcja.zleZRzedu >= 2 ? "zmartwienie" : undefined}>
          {zle && (przyciskWyjasnienia || bezAi)}
        </PestkaMowi>
      </div>
      {/* Przy CKE wyjaśnienie z bazy tylko powtarza klucz, który widać na kaflach; zamiast niego jest rozmowa z Pestką. */}
      {!cke && <p className={`muted ${s.werdyktWejscie}`}>{odpowiedz.explanation}</p>}
      {cke && wyjasnij && <WyjasnienieRundy odpowiedz={odpowiedz} prompt={cke} sesja={sesja} onZamknij={() => setWyjasnij(false)} />}
      <div className={`${s.akcje} ${s.werdyktWejscie}`}>
        {skonczona ? (
          <Link className="btn btn-primary" to={koniec.do}>{koniec.etykieta} <ArrowRight size={17} aria-hidden="true" /></Link>
        ) : <button type="button" className="btn btn-primary" onClick={dalej}>Następne zadanie <ArrowRight size={17} aria-hidden="true" /></button>}
        {!zle && przyciskWyjasnienia}
      </div>
      {!zle && bezAi}
    </section>
  );
}

// Werdykt ogłasza nagłówek z fokusem, więc tu zostaje reszta oceny.
function opisOceny(o: OdpowiedzNauki): string {
  const poprawna = o.correct ? "" : `Poprawna odpowiedź: ${o.solutions.map((a) => nazwaOdpowiedzi(a, o.prompt)).join(" / ")}. `;
  return `${poprawna}${o.prompt.typ === "cke" ? "" : o.explanation}`;
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
  // Pierwsze zadanie też dostaje fokus, bo do rundy wchodzi się nawigacją.
  const [ustalFokus, setUstalFokus] = useState(true);
  const [startZegara, setStartZegara] = useState(() => startyZegara.get(start.id)
    // Wznowiona po dłuższej przerwie runda liczy czas od nowa: zegar od wczoraj (np. 75:33) tylko mylił.
    ?? (start.answers.length && Date.now() - Date.parse(start.created_at) < 2 * 3600_000 ? Date.parse(start.created_at) : null));
  const mapaRundy = useZapytanie(zapytania.mapa(start.level));
  // Runda wydłuża się po błędzie: Pestka mówi o tym przy werdykcie, zamiast zmieniać licznik bez słowa.
  const [dolozone, setDolozone] = useState<number | null>(null);
  // Cztery dobre z rzędu skracają rundę: też mówimy o tym przy werdykcie.
  const [skrocona, setSkrocona] = useState<number | null>(null);
  const zapisuje = useRef(false);
  const aktualna = useRef(false);
  const pytanie = sesja.question;
  const ocena = sesja.answers.find((a) => a.position === ocenaPoz);
  const wPytaniu = szkic?.pozycja === pytanie?.position ? szkic : null;

  useEffect(() => {
    aktualna.current = true;
    return () => { aktualna.current = false; };
  }, []);

  function naEkranie() {
    if (startyZegara.has(sesja.id)) return;
    const zalozona = Date.parse(sesja.created_at);
    // Zegar od założenia rundy tylko, gdy uczeń jest w jej trakcie; nowa albo wznowiona po przerwie (ponad 2 h)
    // liczy od teraz, żeby nie pokazywać czasu od wczoraj.
    const wTrakcie = sesja.answers.length > 0 && Date.now() - zalozona < 2 * 3600_000;
    const poczatek = wTrakcie ? zalozona : Date.now();
    startyZegara.set(sesja.id, poczatek);
    setStartZegara(poczatek);
  }

  function zachowaj(nowy: Szkic | null) {
    setSzkic(nowy);
    zapiszRunde(klucz, nowy);
  }

  function pokazOcene(zapis: SesjaNauki, pozycja: number) {
    if (!aktualna.current) return;
    setDolozone(zapis.limit > sesja.limit ? pozycja : null);
    setSkrocona(zapis.limit < sesja.limit ? pozycja : null);
    setSesja(zapis);
    setOcenaPoz(pozycja);
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

  // Diagnoza kończy się wynikiem na umiejętność na swojej stronie, a nie rozbiorem jednej umiejętności.
  const diagnoza = sesja.format === "diagnoza";
  const koniec = diagnoza
    ? { do: adresDiagnozy(sesja.level), etykieta: "Zobacz wyniki" }
    : { do: adresRozbioru(sesja.id), etykieta: "Zobacz rozbiór" };
  if (!ocena && !pytanie && sesja.result) return <Navigate replace to={koniec.do} />;

  const poprzednie = ocena ? sesja.answers.filter((a) => a.position <= ocena.position).sort((a, b) => a.position - b.position) : [];
  const zleZRzedu = poprzednie.length - 1 - poprzednie.map((a) => a.correct).lastIndexOf(true);
  const biezace = ocena?.prompt ?? pytanie?.prompt;
  const pozycja = ocena?.position ?? pytanie?.position;
  // W kolejce „Powtórz wszystkie” nagłówek mówi, która to powtórka, a licznik niżej: które zadanie w niej.
  const wKolejce = diagnoza ? null : biezacaWKolejce();
  // Tytułem jest umiejętność, którą uczeń wybrał na karcie, a nie sam rodzaj ćwiczenia.
  const nazwaUmiejetnosci = mapaRundy.dane?.skills.find((u) => u.skill_id === sesja.skill_id)?.name;

  return (
    <main className={`container czytanie ${s.strona}`}>
      <NaglowekRundy tytul={wKolejce ? `Powtórka ${wKolejce.numer} z ${wKolejce.razem}` : diagnoza ? nazwaFormatuNauki[sesja.format] : nazwaUmiejetnosci ?? nazwaFormatuNauki[sesja.format]} adres={diagnoza ? adresDiagnozy(sesja.level) : adresNauki(sesja.level, sesja.skill_id ?? undefined)} nazwa={diagnoza ? "Diagnoza" : undefined}>
        <p className="small muted">{[!diagnoza && (wKolejce || nazwaUmiejetnosci) && nazwaFormatuNauki[sesja.format], "Język angielski", nazwaPoziomu[sesja.level]].filter(Boolean).join(" · ")}</p>
      </NaglowekRundy>
      <section className={s.postep} aria-label="Postęp rundy">
        <div className={s.wierszPostepu}>
          <span className="label">Zadanie {pozycja ?? sesja.limit} z {sesja.limit}</span>
          <div className={s.czasy}>
            {sesja.streak >= 2 && <span className="small muted">Dobre z rzędu: {sesja.streak}</span>}
            {(sesja.format === "szybka-runda" || diagnoza) && <ZegarRundy poczatek={startZegara} koniec={sesja.completed_at} />}
          </div>
        </div>
        <PostepRundy odpowiedzi={sesja.answers} limit={sesja.limit} biezaca={pozycja} />
      </section>
      {blad && <div className={s.komunikat}>
        <p className={s.blad} role="alert">{blad}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={ponow}>Wczytaj stan rundy</button>
      </div>}
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{ocena ? opisOceny(ocena) : ""}</div>
      {biezace && pozycja !== undefined && (
        <KontekstRundy prompt={biezace} klucz={`runda:${sesja.id}:${pozycja}`} odpowiedz={ocena?.answer ?? wPytaniu?.tekst ?? ""} ocena={ocena} />
      )}
      {ocena ? (
        <OcenaRundy key={ocena.position} odpowiedz={ocena} sesja={sesja.id} skonczona={!!sesja.result} koniec={koniec}
          reakcja={{ seria: sesja.streak, zleZRzedu, dolozone: dolozone === ocena.position, skrocona: skrocona === ocena.position, diagnoza }}
          dalej={() => { zachowaj(null); setUstalFokus(true); setOcenaPoz(null); }} />
      ) : pytanie ? (
        <PytanieRundy key={pytanie.position} pytanie={pytanie} tekst={wPytaniu?.tekst ?? ""}
          zmien={(tekst) => zachowaj({ tekst, pozycja: pytanie.position, wyslany: false })}
          odpowiedz={(tekst) => void odpowiedz(tekst)} podpowiedz={() => void podpowiedz()}
          oczekuje={oczekuje} zapisWTrakcie={!!wPytaniu?.wyslany} ustalFokus={ustalFokus} onGotowe={naEkranie} />
      ) : <p role="alert">Brakuje zadania do rozwiązania.</p>}
    </main>
  );
}

/** Kropki zadań rundy: zielona dobrze, czerwona źle, z kreską pominięte, pusta jeszcze przed tobą. */
function PostepRundy({ odpowiedzi, limit, biezaca }: { odpowiedzi: OdpowiedzNauki[]; limit: number; biezaca?: number }) {
  const poPozycji = new Map(odpowiedzi.map((a) => [a.position, a]));
  const kropki: Kropka[] = Array.from({ length: limit }, (_, i) => {
    const a = poPozycji.get(i + 1);
    const stan = !a ? "pusta" : a.correct ? "dobrze" : a.answer.trim() ? "zle" : "pominiete";
    return { stan, biezaca: i + 1 === biezaca && !a };
  });
  const dobre = odpowiedzi.filter((a) => a.correct).length;
  return <Kropki kropki={kropki} opis={`Sprawdzone ${odpowiedzi.length} z ${limit} zadań, dobrze ${dobre}.`} />;
}

function OdczytanaRunda({ id, user }: { id: string; user: string }) {
  const [stan, ponow] = useSesjaRundy(id);
  if (stan.status === "gotowa") return <OtwartaRunda start={stan.sesja} user={user} ponow={ponow} />;
  return (
    <main className={`container czytanie ${s.strona}`}>
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
    <main className={`container czytanie ${s.strona}`}>
      <NaglowekRundy tytul="Szybka runda" />
      <p><Link to={adresNauki(poziom)} className="btn btn-primary">Wybierz umiejętność</Link></p>
    </main>
  );
}
