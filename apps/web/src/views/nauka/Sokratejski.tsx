// Rozmowa sokratejska: Pestka pyta o jedną umiejętność z mapy angielskiego, do siedmiu wymian (akcja sokratejski),
// a na końcu proponuje mini-test tej umiejętności. Model zwraca tylko kolejne pytania, więc podsumowanie składa
// aplikacja: liczba odpowiedzi i jedna propozycja rundy. Rozmowa trzyma się w pamięci karty do jej zamknięcia.
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronRight, Send } from "lucide-react";
import { useSession } from "../../auth";
import { nazwaPoziomu } from "../../arkusze/typy";
import { BladPestki, BrakPestki } from "../../components/BladPestki";
import { Ladowanie } from "../../components/Ladowanie";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { TutorAvatar } from "../../components/TutorAvatar";
import { useKontekstPestki, useTutor } from "../../components/TutorContext";
import { adresStartu } from "../../nauka/adresy";
import { czyPrzerwane, naukaAi, type WpisRozmowy } from "../../nauka/ai";
import { naukaApi, nazwaFormatuNauki, type Umiejetnosc } from "../../nauka/api";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import { odczytajRunde, zapiszRunde } from "./sesjaRundy";
import c from "../../components/TutorChat.module.css";
import s from "./SzybkaRunda.module.css";
import z from "./Sokratejski.module.css";

const WYMIANY = 7;

export function Sokratejski() {
  const [poziom] = usePoziomNauki();
  const [params] = useSearchParams();
  const session = useSession();
  const { aiGotowe } = useTutor();
  const mapa = useZapytanieNauki(`nauka:mapa:${poziom}`, (signal) => naukaApi.mapa(poziom, signal));
  const id = params.get("umiejetnosc");
  const wybrana = mapa.dane?.skills.find((u) => u.skill_id === id);

  return (
    <main className={`container czytanie ${s.strona}`}>
      <NaglowekStrony wstecz={wybrana ? { do: `/nauka/sokratejski?poziom=${poziom}`, nazwa: "Rozmowa z pytaniami" } : { do: "/nauka", nazwa: "Nauka" }}
        tytul={wybrana?.name ?? "Rozmowa z pytaniami"} lead={wybrana ? undefined : "Pestka pyta, ty tłumaczysz. Siedem pytań, potem mini-test."}>
        {wybrana && <p className="small muted">Język angielski · {nazwaPoziomu[poziom]}</p>}
      </NaglowekStrony>
      {aiGotowe === false ? (
        <BrakPestki tekst="Pytania zadaje Pestka, a na tym koncie nie ma jeszcze modelu." />
      ) : mapa.stan === "ladowanie" ? (
        <Ladowanie ile={5} etykieta="Wczytuję umiejętności" />
      ) : mapa.stan === "blad" ? (
        <BladPestki blad={null} ponow={mapa.ponow} />
      ) : wybrana && session ? (
        <Rozmowa key={`${session.user.id}:${poziom}:${wybrana.skill_id}`} user={session.user.id} umiejetnosc={wybrana} poziom={poziom} />
      ) : (
        <section className={`${s.sekcja} ${z.bezLinii}`} aria-labelledby="sokratejski-temat">
          <h2 className="h2" id="sokratejski-temat">O czym rozmawiamy?</h2>
          <ul className="wiersze">
            {(mapa.dane?.skills ?? []).filter((u) => u.skill_id !== "pisanie").map((u) => (
              <li key={u.skill_id}>
                <Link to={`/nauka/sokratejski?poziom=${poziom}&umiejetnosc=${u.skill_id}`} className="wiersz">
                  <span className="wiersz-tresc"><span className="h3">{u.name}</span></span>
                  <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

type Zapis = { historia: WpisRozmowy[]; koniec: boolean };

function Rozmowa({ user, umiejetnosc, poziom }: { user: string; umiejetnosc: Umiejetnosc; poziom: ReturnType<typeof usePoziomNauki>[0] }) {
  const klucz = `sedno.sokratejski:${user}:${poziom}:${umiejetnosc.skill_id}`;
  const [zapis, ustawZapis] = useState<Zapis>(() => {
    const z = odczytajRunde<Zapis>(klucz);
    return z && Array.isArray(z.historia) ? z : { historia: [], koniec: false };
  });
  const [tekst, ustawTekst] = useState("");
  const [czeka, ustawCzeka] = useState(false);
  const [blad, ustawBlad] = useState<unknown>(null);
  const trwa = useRef<AbortController | null>(null);
  const lista = useRef<HTMLOListElement>(null);
  const pole = useRef<HTMLTextAreaElement>(null);
  const podsumowanie = useRef<HTMLHeadingElement>(null);
  const { historia, koniec } = zapis;
  const odpowiedzi = historia.filter((w) => w.od === "uczen").length;
  // Historia kończy się pytaniem Pestki, gdy czekamy na ucznia; parzysta długość znaczy, że pytanie jeszcze nie przyszło.
  const czekaNaPytanie = !koniec && historia.length % 2 === 0;

  function zachowaj(nowy: Zapis) {
    ustawZapis(nowy);
    zapiszRunde(klucz, nowy);
  }

  async function zapytaj(dotad: WpisRozmowy[]) {
    if (trwa.current) return;
    const ctrl = new AbortController();
    trwa.current = ctrl;
    ustawCzeka(true);
    ustawBlad(null);
    try {
      const w = await naukaAi.sokratejski(umiejetnosc.skill_id, poziom, dotad, ctrl.signal);
      if (ctrl.signal.aborted) return;
      zachowaj(w.zakoncz || !w.pytanie ? { historia: dotad, koniec: true } : { historia: [...dotad, { od: "pestka", tekst: w.pytanie }], koniec: false });
    } catch (e) {
      if (!ctrl.signal.aborted && !czyPrzerwane(e)) ustawBlad(e);
    } finally {
      if (trwa.current === ctrl) trwa.current = null;
      if (!ctrl.signal.aborted) ustawCzeka(false);
    }
  }

  // Pierwsze pytanie (albo ponowienie po odświeżeniu, gdy odpowiedź ucznia czekała na kolejne pytanie).
  useEffect(() => {
    if (czekaNaPytanie && !trwa.current) void zapytaj(historia);
    return () => {
      trwa.current?.abort();
      trwa.current = null;
    };
    // Tylko przy wejściu: dalsze pytania wysyła wyslij().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lista.current) lista.current.scrollTop = lista.current.scrollHeight;
    if (!koniec && !czekaNaPytanie && historia.length) pole.current?.focus({ preventScroll: true });
  }, [historia.length, koniec, czekaNaPytanie]);

  useEffect(() => {
    if (koniec) podsumowanie.current?.focus();
  }, [koniec]);

  useKontekstPestki({
    klucz: `sokratejski:${umiejetnosc.skill_id}`,
    tytul: `rozmowa o: ${umiejetnosc.name}`,
    opis: [`Rozmowa sokratejska o umiejętności z matury z angielskiego: ${umiejetnosc.name}.`,
      ...historia.map((w) => `${w.od === "pestka" ? "Pestka" : "Uczeń"}: ${w.tekst}`),
      "Prowadź pytaniami, nie podawaj gotowej reguły."].join("\n"),
  });

  function wyslij(e?: FormEvent) {
    e?.preventDefault();
    const odp = tekst.trim();
    if (!odp || czeka || koniec || czekaNaPytanie) return;
    const nowa: WpisRozmowy[] = [...historia, { od: "uczen", tekst: odp.slice(0, 1000) }];
    zachowaj({ historia: nowa, koniec: false });
    ustawTekst("");
    void zapytaj(nowa);
  }

  function skrot(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      wyslij();
    }
  }

  function zakoncz() {
    trwa.current?.abort();
    trwa.current = null;
    ustawCzeka(false);
    zachowaj({ historia, koniec: true });
  }

  function odNowa() {
    zachowaj({ historia: [], koniec: false });
    void zapytaj([]);
  }

  const format = umiejetnosc.formats.includes("sokratejski") ? "sokratejski" : "szybka-runda";

  return (
    <>
      <div className={`karta ${z.okno}`}>
        <div className={z.pasek}>
          <span className="label">{koniec ? "Koniec rozmowy" : `Pytanie ${Math.min(odpowiedzi + 1, WYMIANY)} z ${WYMIANY}`}</span>
          {!koniec && odpowiedzi > 0 && <button type="button" className="link small" onClick={zakoncz}>Zakończ</button>}
        </div>
        <ol ref={lista} className={`${c.list} ${z.lista}`} role="log" aria-label="Rozmowa z Pestką" aria-live="polite">
          {historia.map((w, i) => w.od === "pestka" ? (
            <li key={i} className={c.tutorRow}>
              <TutorAvatar size={28} />
              <p className={c.tutorText}><span className="visually-hidden">Pestka: </span>{w.tekst}</p>
            </li>
          ) : (
            <li key={i} className={c.studentText}><span className="visually-hidden">Ty: </span>{w.tekst}</li>
          ))}
          {czeka && (
            <li className={c.tutorRow}>
              <TutorAvatar size={28} state="thinking" />
              <span className={c.typing} aria-label="Pestka pisze"><i /><i /><i /></span>
            </li>
          )}
        </ol>
        {!koniec && (
          <form className={z.kompozytor} onSubmit={wyslij}>
            <label htmlFor="sokratejski-odpowiedz" className="visually-hidden">Twoja odpowiedź</label>
            <textarea id="sokratejski-odpowiedz" ref={pole} value={tekst} rows={2} maxLength={1000} readOnly={czeka}
              placeholder={czekaNaPytanie ? "Pestka układa pytanie…" : "Twoja odpowiedź"} onKeyDown={skrot}
              onChange={(e) => ustawTekst(e.currentTarget.value)} />
            <button type="submit" className="btn btn-primary" disabled={czeka || czekaNaPytanie || !tekst.trim()} aria-label="Wyślij" aria-keyshortcuts="Enter">
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        )}
        {blad !== null && <div className={z.blad}><BladPestki blad={blad} ponow={() => void zapytaj(historia)} /></div>}
      </div>

      {koniec && (
        <section className={s.sekcja} aria-labelledby="sokratejski-koniec">
          <h2 className="h2" id="sokratejski-koniec" tabIndex={-1} ref={podsumowanie}>Podsumowanie</h2>
          <p>{odpowiedzi === 0 ? "Rozmowa skończyła się bez odpowiedzi." : `Odpowiedzi: ${odpowiedzi} z ${WYMIANY}. Teraz sprawdź się bez pomocy.`}</p>
          <div className={s.akcje}>
            <Link to={adresStartu(poziom, umiejetnosc.skill_id, format)} className="btn btn-primary">
              {nazwaFormatuNauki[format]} · 5 min <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <button type="button" className="btn btn-ghost" onClick={odNowa}>Nowa rozmowa</button>
          </div>
        </section>
      )}
    </>
  );
}
