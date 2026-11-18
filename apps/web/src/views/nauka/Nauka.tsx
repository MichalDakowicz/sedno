import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronRight, FileText, GraduationCap, MessagesSquare, Sparkles, Timer, Wrench } from "lucide-react";
import type { Poziom } from "../../arkusze/typy";
import { useProfil } from "../../auth";
import { KartaDnia } from "../../components/KartaDnia";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Ladowanie } from "../../components/Ladowanie";
import { useTutor } from "../../components/TutorContext";
import { SubjectIcon } from "../../components/icons";
import { nazwaPoziomu, przedmiot } from "../../konto/przedmioty";
import { adresMapy, adresRundy, adresStartu } from "../../nauka/adresy";
import { naukaApi, nazwaFormatuNauki, type OtwartaSesjaNauki, type Umiejetnosc } from "../../nauka/api";
import { coDzisBezRund, polecanySposob, useDzisAngielski, usePolecenieDnia, type Sposob } from "../../nauka/dzis";
import { useOtwarteRundy, usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import { OPIS_OPANOWANIA } from "./Opanowanie";
import { BladNauki, dataNauki, formatRundy, procentNauki, WyborPoziomuNauki } from "./NaukaPowtorki";
import { ZakladkiNauki } from "./ZakladkiNauki";
import s from "./NaukaPowtorki.module.css";

// Te same nazwy obszarów co na mapie umiejętności (Umiejetnosci.tsx).
const NAZWY_OBSZAROW: Record<string, string> = {
  "słuchanie": "Rozumienie ze słuchu",
  czytanie: "Rozumienie tekstów pisanych",
  "środki językowe": "Środki językowe",
  pisanie: "Wypowiedź pisemna",
};

export function Nauka() {
  const [poziom, ustawPoziom] = usePoziomNauki();
  const [params, ustawParams] = useSearchParams();
  const profil = useProfil();
  const { aiGotowe } = useTutor();
  const mapa = useZapytanieNauki(`nauka:mapa:${poziom}`, (signal) => naukaApi.mapa(poziom, signal));
  const umiejetnosci = mapa.dane?.skills ?? [];
  const wybrana = umiejetnosci.find((u) => u.skill_id === params.get("umiejetnosc"));
  // Polecenie dla umiejętności wybranej w „Chcę coś innego”; propozycję dnia liczy nauka/dzis.ts.
  const polecenie = useZapytanieNauki(
    mapa.stan === "gotowe" && wybrana ? `nauka:polec:${poziom}:${wybrana.skill_id}` : null,
    (signal) => naukaApi.polec(poziom, wybrana?.skill_id, signal),
  );
  const polecenieDnia = usePolecenieDnia(poziom);
  const dzis = useDzisAngielski(poziom);
  const podsumowanie = dzis.podsumowanie;
  const ostatnie = useOtwarteRundy(poziom);
  const { hash } = useLocation();
  const naglowek = useRef<HTMLHeadingElement>(null);
  const naglowekPolecenia = useRef<HTMLHeadingElement>(null);
  const naglowekOstatnio = useRef<HTMLHeadingElement>(null);
  const [usuwane, ustawUsuwane] = useState<string | null>(null);
  const [bladUsuwania, ustawBladUsuwania] = useState("");
  // Fokus przenosimy tylko po wejściu z parametrem (np. „Ćwicz”), nie przy zwykłym otwarciu strony.
  const fokusPolecenia = useRef(params.get("umiejetnosc") !== null);
  const fokusOstatnio = useRef(hash === "#ostatnio");
  const powtorz = polecenie.dane?.repeat_id ?? undefined;
  const format = powtorz ? "szybka-runda" : formatRundy(polecenie.dane?.format);
  const sesje = ostatnie.dane?.sesje ?? [];
  const kilkaPoziomow = new Set(sesje.map((sesja) => sesja.level)).size > 1;
  const polecenieGotowe = mapa.stan !== "ladowanie" && polecenie.stan !== "ladowanie";

  // Umiejętność do sposobów nauki: wybrana, inaczej ta z polecenia dnia.
  const doSposobow = wybrana ?? umiejetnosci.find((u) => u.skill_id === polecenieDnia.dane?.skill_id) ?? umiejetnosci[0];
  const doNaprawy = [doSposobow, ...umiejetnosci].find((u) => u?.formats.includes("napraw-blad"));
  const polecany = polecanySposob(!!podsumowanie?.wyniki.length, polecenieDnia.dane?.format);
  const bezRund = (profil?.subjects ?? []).map((p) => p.id).filter((id, i, all) => all.indexOf(id) === i && coDzisBezRund[id]);

  useEffect(() => {
    if (!fokusPolecenia.current || !polecenieGotowe) return;
    fokusPolecenia.current = false;
    (naglowekPolecenia.current ?? naglowek.current)?.focus();
  }, [polecenieGotowe, polecenie.stan]);

  useEffect(() => {
    if (!fokusOstatnio.current || ostatnie.stan === "ladowanie") return;
    fokusOstatnio.current = false;
    naglowekOstatnio.current?.scrollIntoView();
    naglowekOstatnio.current?.focus();
  }, [ostatnie.stan]);

  async function odrzuc(sesja: OtwartaSesjaNauki) {
    ustawUsuwane(sesja.id);
    ustawBladUsuwania("");
    try {
      await naukaApi.usun(sesja.id);
      ostatnie.ponow();
      naglowekOstatnio.current?.focus();
    } catch (e) {
      ustawBladUsuwania(e instanceof Error ? e.message : "Nie udało się usunąć rundy.");
    } finally {
      ustawUsuwane(null);
    }
  }

  function ustawUmiejetnosc(id: string) {
    ustawParams((aktualne) => {
      const nowe = new URLSearchParams(aktualne);
      if (id) nowe.set("umiejetnosc", id);
      else nowe.delete("umiejetnosc");
      return nowe;
    });
  }

  const sposoby: { id: Sposob; to: string; nazwa: string; kiedy: string; ikona: ReactNode }[] = [
    ...(doSposobow ? [{ id: "szybka-runda" as const, to: adresStartu(poziom, doSposobow.skill_id), nazwa: "Szybka runda", kiedy: "Masz 5 minut.", ikona: <Timer size={18} aria-hidden="true" /> }] : []),
    ...(doNaprawy ? [{ id: "napraw-blad" as const, to: adresStartu(poziom, doNaprawy.skill_id, "napraw-blad"), nazwa: "Napraw błąd", kiedy: "Mylisz formy i chcesz wiedzieć dlaczego.", ikona: <Wrench size={18} aria-hidden="true" /> }] : []),
    { id: "arkusze", to: "/arkusze?przedmiot=angielski", nazwa: "Arkusze CKE", kiedy: "Przed maturą próbną albo gdy masz dwie godziny.", ikona: <FileText size={18} aria-hidden="true" /> },
    { id: "uczen-uczy", to: "/nauka/uczen-uczy", nazwa: "Uczeń uczy AI", kiedy: "Chcesz sprawdzić, czy naprawdę rozumiesz zasadę.", ikona: <GraduationCap size={18} aria-hidden="true" /> },
    ...(aiGotowe === true ? [{ id: "rozmowa" as const, to: "/tutor", nazwa: "Rozmowa z Pestką", kiedy: "Coś jest niejasne i potrzebne jest wyjaśnienie.", ikona: <MessagesSquare size={18} aria-hidden="true" /> }] : []),
  ];

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony etykieta="Język angielski" tytul="Nauka" tytulRef={naglowek} lead="Krótkie rundy przed maturą.">
        <ZakladkiNauki />
      </NaglowekStrony>

      <div className={s.para}>
        {dzis.stan === "ladowanie" ? (
          <Ladowanie ksztalt="blok" etykieta="Dobieram ćwiczenie na dziś" />
        ) : dzis.dzis ? (
          <KartaDnia dzis={dzis.dzis} />
        ) : (
          <div className={s.stan}>
            <p className="muted">Na tym poziomie nie ma jeszcze gotowej rundy.</p>
            <Link to="/arkusze?przedmiot=angielski" className={`btn btn-secondary ${s.przycisk}`}>Rozwiąż arkusz</Link>
          </div>
        )}
        <WolnyTemat key={poziom} poziom={poziom} umiejetnosci={umiejetnosci} />
      </div>

      <section className={s.sekcja} aria-labelledby="sposoby-nauki">
        <h2 className="h2" id="sposoby-nauki">Sposoby nauki</h2>
        <ul className={`wiersze ${s.sposoby}`}>
          {sposoby.map((x) => (
            <li key={x.id}>
              <Link to={x.to} className="wiersz">
                <span className={`wiersz-ikona ${s.ikona}`}>{x.ikona}</span>
                <span className="wiersz-tresc">
                  <span className="h3">{x.nazwa}</span>
                  <span className="wiersz-opis">{x.kiedy}</span>
                </span>
                <span className="wiersz-wartosc">
                  {x.id === polecany.sposob && (
                    <span className="kicker" data-tutor-about={polecany.powod}>
                      <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" /> Polecam
                    </span>
                  )}
                </span>
                <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {bezRund.length > 0 && (
        <section className={s.sekcja} aria-labelledby="inne-przedmioty">
          <h2 className="h2" id="inne-przedmioty">Inne przedmioty</h2>
          <ul className="wiersze">
            {bezRund.map((id) => {
              const p = przedmiot(id)!;
              const co = coDzisBezRund[id]!;
              const akcja = co.akcja.do === "/tutor" && aiGotowe === false ? { do: "/profil#ai", etykieta: "Podepnij AI w profilu" } : co.akcja;
              return (
                <li key={id}>
                  <Link to={akcja.do} className="wiersz" aria-label={`${p.nazwa}: ${akcja.etykieta}`}>
                    <span className="wiersz-ikona"><SubjectIcon subject={p} size="lg" /></span>
                    <span className="wiersz-tresc">
                      <span className="h3">{p.nazwa}</span>
                      <span className="wiersz-opis">{co.tekst}</span>
                    </span>
                    <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className={s.sekcja} aria-labelledby="cos-innego-tytul" id="cos-innego">
        <h2 className="h2" id="cos-innego-tytul">Chcę coś innego</h2>
        <div className={s.pola}>
          <WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} />
          <label className={s.pole}>
            <span className="small muted">Umiejętność</span>
            <select className="select" value={wybrana?.skill_id ?? ""} onChange={(e) => ustawUmiejetnosc(e.target.value)} disabled={mapa.stan !== "gotowe"}>
              <option value="">Wybierz umiejętność</option>
              {[...new Set(umiejetnosci.map((u) => u.area))].map((obszar) => (
                <optgroup key={obszar} label={NAZWY_OBSZAROW[obszar] ?? obszar}>
                  {umiejetnosci.filter((u) => u.area === obszar).map((u) => <option key={u.skill_id} value={u.skill_id}>{u.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        {mapa.stan === "blad" && <BladNauki komunikat="Nie udało się wczytać umiejętności." ponow={mapa.ponow} />}
        {wybrana && (
          <>
            <div className={s.opanowanieWybranej}>
              <p className="small muted" data-tutor-about={OPIS_OPANOWANIA}>
                Opanowanie: {wybrana.score === null ? "za mało danych" : procentNauki.format(wybrana.score)}
              </p>
              <Link to={adresMapy(poziom, wybrana.skill_id)} className="link small">Zobacz na mapie <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
            {polecenie.stan === "blad" ? (
              <BladNauki komunikat="Nie udało się dobrać ćwiczenia." ponow={polecenie.ponow} />
            ) : polecenie.stan === "ladowanie" ? (
              <Ladowanie ksztalt="blok" etykieta="Dobieram ćwiczenie" />
            ) : polecenie.dane ? (
              <article className={s.karta} aria-labelledby="nauka-polecenie">
                <span className="kicker"><Sparkles size={14} strokeWidth={2.2} aria-hidden="true" /> Polecam</span>
                <h3 id="nauka-polecenie" className="h1" tabIndex={-1} ref={naglowekPolecenia}>{powtorz ? "Powtórz zadanie" : nazwaFormatuNauki[format]}</h3>
                <p className="h3">{wybrana.name}</p>
                <p className="muted">{polecenie.dane.reason}</p>
                <Link to={adresStartu(poziom, wybrana.skill_id, format, powtorz)} className={`btn btn-primary ${s.przycisk}`}>
                  {polecenie.dane.minutes > 0 ? `Zacznij · ${polecenie.dane.minutes} min` : "Zacznij"}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </article>
            ) : (
              <div className={s.stan}>
                <p className="muted">Dla tej umiejętności nie ma jeszcze gotowej rundy.</p>
                <button type="button" className={`btn btn-secondary ${s.przycisk}`} onClick={() => ustawUmiejetnosc("")}>Wybierz inną</button>
              </div>
            )}
          </>
        )}
      </section>

      <section className={s.sekcja} aria-labelledby="ostatnio">
        <h2 className="h2" id="ostatnio" tabIndex={-1} ref={naglowekOstatnio}>Ostatnio</h2>
        {ostatnie.stan === "ladowanie" && <Ladowanie ile={2} etykieta="Wczytuję niedokończone ćwiczenia" />}
        {ostatnie.stan === "blad" && <BladNauki komunikat="Nie udało się wczytać ostatnich ćwiczeń." ponow={ostatnie.ponow} />}
        {ostatnie.stan === "gotowe" && (
          sesje.length ? (
            <ul className={s.wiersze}>
              {sesje.map((sesja) => {
                const nazwa = ostatnie.dane?.nazwy.get(sesja.skill_id);
                const format = nazwaFormatuNauki[sesja.format];
                return (
                  <li key={sesja.id} className={s.wierszRundy}>
                    <WierszFormat
                      to={adresRundy(sesja.id)}
                      nazwa={nazwa ?? format}
                      opis={[nazwa && format, kilkaPoziomow && nazwaPoziomu[sesja.level], dataNauki(sesja.updated_at)].filter(Boolean).join(" · ")}
                      ikona={<Timer size={18} aria-hidden="true" />}
                      akcja="Wznów"
                    />
                    <button
                      type="button"
                      className={`link ${s.usun}`}
                      disabled={usuwane !== null}
                      onClick={() => void odrzuc(sesja)}
                      aria-label={`Usuń rundę: ${nazwa ?? format}`}
                    >
                      {usuwane === sesja.id ? "Usuwanie…" : "Usuń"}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={s.stan}>
              <p className="muted">Nie masz niedokończonych ćwiczeń.</p>
              {doSposobow && <Link to={adresStartu(poziom, doSposobow.skill_id)} className={`btn btn-secondary ${s.przycisk}`}>Zacznij szybką rundę</Link>}
            </div>
          )
        )}
        {bladUsuwania && <p role="alert" className={s.blad}>{bladUsuwania}</p>}
      </section>
    </main>
  );
}

function WierszFormat({ to, nazwa, opis, ikona, akcja }: { to: string; nazwa: string; opis: string; ikona: ReactNode; akcja?: string }) {
  const wiersz = (
    <Link to={to} className={akcja ? `${s.wiersz} ${s.wierszWznow}` : s.wiersz}>
      <span className={s.ikona}>{ikona}</span>
      <span className={s.wierszGlowny}>
        <span className="h3">{nazwa}</span>
        <span className="muted small">{opis}</span>
      </span>
      <span className={s.wierszBoczny}>
        {akcja ? <span className="link">{akcja}</span> : <ChevronRight size={18} aria-hidden="true" />}
      </span>
    </Link>
  );
  return akcja ? wiersz : <li>{wiersz}</li>;
}

function WolnyTemat({ poziom, umiejetnosci }: { poziom: Poziom; umiejetnosci: Umiejetnosc[] }) {
  const tutor = useTutor();
  const aktualnyTutor = useRef(tutor);
  aktualnyTutor.current = tutor;
  const navigate = useNavigate();
  const [temat, ustawTemat] = useState("");
  const [wysylam, ustawWysylam] = useState(false);
  const [komunikat, ustawKomunikat] = useState("");
  const trwajace = useRef<AbortController | null>(null);
  useEffect(() => () => trwajace.current?.abort(), []);

  async function zapytaj(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tekst = temat.trim();
    if (!tekst || trwajace.current || !tutor.aiGotowe || tutor.state !== "idle") return;
    const ctrl = new AbortController();
    trwajace.current = ctrl;
    ustawWysylam(true);
    ustawKomunikat("");

    try {
      const dopasowanie = await naukaApi.temat(tekst, poziom, ctrl.signal).catch(() => null);
      if (ctrl.signal.aborted) return;
      const { aiGotowe, state, zapytajWNowej } = aktualnyTutor.current;
      if (!aiGotowe || state !== "idle") {
        ustawKomunikat("Pestka jest teraz zajęta. Spróbuj za chwilę.");
        return;
      }
      const umiejetnosc = umiejetnosci.find((u) => u.skill_id === dopasowanie?.umiejetnosc);
      const kontekst = umiejetnosc ? ` Umiejętność: ${umiejetnosc.name}.` : "";
      zapytajWNowej(`Chcę poćwiczyć angielski (poziom ${nazwaPoziomu[poziom]}).${kontekst} Temat: ${tekst}`);
      navigate("/tutor");
    } finally {
      trwajace.current = null;
      if (!ctrl.signal.aborted) ustawWysylam(false);
    }
  }

  return (
    <form className={s.formularz} onSubmit={(event) => void zapytaj(event)} aria-labelledby="wolny-temat" aria-busy={wysylam}>
      <h2 className="h2" id="wolny-temat">Wolny temat</h2>
      {tutor.aiGotowe === false ? (
        <Link to="/profil#ai" className="link">Podepnij AI, żeby zapytać Pestkę</Link>
      ) : (
        <>
          <label className={s.pole}>
            <span className="small muted">Czego chcesz się nauczyć?</span>
            <input
              type="text"
              className="input"
              placeholder="Np. mowa zależna"
              value={temat}
              onChange={(event) => ustawTemat(event.target.value)}
              maxLength={280}
              required
              disabled={wysylam}
            />
          </label>
          <button type="submit" className={`btn btn-secondary ${s.przycisk}`} disabled={!tutor.aiGotowe || tutor.state !== "idle" || !temat.trim() || wysylam}>
            <MessagesSquare size={18} aria-hidden="true" />
            {wysylam ? "Dobieram temat…" : "Zapytaj Pestkę"}
          </button>
        </>
      )}
      {tutor.aiGotowe === undefined && <span role="status" className="small muted">Sprawdzam dostęp do Pestki…</span>}
      {tutor.aiGotowe && tutor.state !== "idle" && !wysylam && !komunikat && <p className="small muted">Pestka odpowiada w innej rozmowie.</p>}
      {komunikat && <p role="alert" className="small">{komunikat}</p>}
    </form>
  );
}
