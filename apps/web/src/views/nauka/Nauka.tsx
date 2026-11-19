import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Camera, ChevronRight, CircleHelp, Eye, FileText, PenLine, GraduationCap, MessagesSquare, Network, RotateCcw, Timer } from "lucide-react";
import { TutorAvatar } from "../../components/TutorAvatar";
import type { Poziom } from "../../arkusze/typy";
import { useProfil } from "../../auth";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Ladowanie } from "../../components/Ladowanie";
import { useTutor } from "../../components/TutorContext";
import { SubjectIcon } from "../../components/icons";
import { nazwaPoziomu, przedmiot, type PrzedmiotId } from "../../konto/przedmioty";
import { Pigulki } from "../../components/Pigulki";
import { Ogrod } from "../../components/Ogrod";
import { adresRundy, adresStartu } from "../../nauka/adresy";
import { naukaApi, nazwaFormatuNauki, type OtwartaSesjaNauki, type Umiejetnosc } from "../../nauka/api";
import { coDzisBezRund, MINUTY_RUNDY, usePolecenieDnia, type Sposob } from "../../nauka/dzis";
import { useOtwarteRundy, usePoziomNauki, useZapytanie } from "../../nauka/stan";
import { zapytania } from "../../nauka/zapytania";
import { adresWizualizacji } from "../../nauka/wizualizacje";
import { BladNauki, dataNauki, formatRundy, WyborPoziomuNauki } from "./NaukaPowtorki";
import s from "./NaukaPowtorki.module.css";

/** Wybrany przedmiot Nauki: z adresu (?przedmiot), inaczej ostatni wybrany (pamięć przeglądarki), inaczej angielski. */
const KLUCZ_PRZEDMIOTU = "sedno.nauka.przedmiot";
function zapamietanyPrzedmiot(): string | null {
  try { return localStorage.getItem(KLUCZ_PRZEDMIOTU); } catch { return null; }
}

export function Nauka() {
  const [poziom, ustawPoziom] = usePoziomNauki();
  const [params, ustawParams] = useSearchParams();
  const profil = useProfil();
  const { aiGotowe } = useTutor();
  const moje = [...new Set((profil?.subjects ?? []).map((p) => p.id))];
  const zAdresu = params.get("przedmiot");
  const wybranyPrzedmiot: PrzedmiotId = [zAdresu, zapamietanyPrzedmiot(), "angielski", moje[0]].find((id): id is PrzedmiotId => !!id && moje.includes(id as PrzedmiotId)) ?? "angielski";
  const angielski = wybranyPrzedmiot === "angielski";
  const mapa = useZapytanie(angielski ? zapytania.mapa(poziom) : null);
  const umiejetnosci = mapa.dane?.skills ?? [];
  const wybrana = umiejetnosci.find((u) => u.skill_id === params.get("umiejetnosc"));
  // Polecenie dla umiejętności wybranej z ogrodu; bez wyboru polecenie dnia z mapy (nauka_polec).
  const polecenie = useZapytanie(angielski && mapa.stan === "gotowe" && wybrana ? zapytania.polecenieUmiejetnosci(poziom, wybrana.skill_id) : null);
  const polecenieDnia = usePolecenieDnia(poziom, angielski);
  const ostatnie = useOtwarteRundy(angielski);
  const { hash } = useLocation();
  const naglowek = useRef<HTMLHeadingElement>(null);
  const naglowekPolecenia = useRef<HTMLHeadingElement>(null);
  const naglowekOstatnio = useRef<HTMLHeadingElement>(null);
  const [usuwane, ustawUsuwane] = useState<string | null>(null);
  const [bladUsuwania, ustawBladUsuwania] = useState("");
  const [zmiana, ustawZmiane] = useState(false);
  // Fokus przenosimy tylko po wejściu z parametrem (np. z mapy), nie przy zwykłym otwarciu strony.
  const fokusPolecenia = useRef(params.get("umiejetnosc") !== null);
  const fokusOstatnio = useRef(hash === "#ostatnio");
  const sesje = (ostatnie.dane?.sesje ?? []).slice(0, 3);
  const kilkaPoziomow = new Set(sesje.map((sesja) => sesja.level)).size > 1;

  const umiejetnosc = wybrana ?? umiejetnosci.find((u) => u.skill_id === polecenieDnia.dane?.skill_id) ?? umiejetnosci[0];
  const dane = wybrana ? polecenie.dane : polecenieDnia.dane;
  const powtorz = dane?.repeat_id ?? undefined;
  const format = powtorz ? "szybka-runda" : formatRundy(dane?.format);
  const minuty = dane && dane.minutes > 0 ? dane.minutes : MINUTY_RUNDY;
  const czekaNaPolecenie = angielski && (mapa.stan === "ladowanie" || (wybrana ? polecenie.stan === "ladowanie" : polecenieDnia.stan === "ladowanie"));

  useEffect(() => {
    if (!fokusPolecenia.current || czekaNaPolecenie) return;
    fokusPolecenia.current = false;
    (naglowekPolecenia.current ?? naglowek.current)?.focus();
  }, [czekaNaPolecenie]);

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
    }, { replace: true });
  }

  function ustawPrzedmiot(id: PrzedmiotId) {
    try { localStorage.setItem(KLUCZ_PRZEDMIOTU, id); } catch { /* wybór działa do odświeżenia */ }
    ustawParams((aktualne) => {
      const nowe = new URLSearchParams(aktualne);
      nowe.set("przedmiot", id);
      nowe.delete("umiejetnosc");
      return nowe;
    }, { replace: true });
  }

  const bezRund = coDzisBezRund[wybranyPrzedmiot];
  const akcjaBezRund = bezRund && (bezRund.akcja.do === "/tutor" && aiGotowe === false ? { do: "/profil#ai", etykieta: "Połącz Pestkę w profilu" } : bezRund.akcja);
  const maArkusze = wybranyPrzedmiot !== "polski";

  // Trzy równorzędne drogi obok głównej akcji.
  const drogi: { id: string; to?: string; nazwa: string; opis: string; ikona: ReactNode; temat?: boolean }[] = [
    { id: "temat", nazwa: "Zapytaj Pestkę o temat", opis: "Wpisz, czego nie rozumiesz.", ikona: <MessagesSquare size={20} aria-hidden="true" />, temat: true },
    ...(angielski ? [{ id: "pisanie", to: `/nauka/pisanie?poziom=${poziom}`, nazwa: "Napisz wypowiedź", opis: "Krok po kroku, z uwagami Pestki.", ikona: <PenLine size={20} aria-hidden="true" /> }] : []),
    ...(maArkusze ? [{ id: "arkusz", to: `/arkusze?przedmiot=${wybranyPrzedmiot}`, nazwa: "Rozwiąż arkusz", opis: "Cała matura CKE z kluczem.", ikona: <FileText size={20} aria-hidden="true" /> }] : []),
  ];

  const wiecej: { id: Sposob; to: string; nazwa: string; kiedy: string; ikona: ReactNode }[] = [
    ...(angielski && aiGotowe !== false ? [{ id: "sokratejski" as const, to: `/nauka/sokratejski?poziom=${poziom}${umiejetnosc ? `&umiejetnosc=${umiejetnosc.skill_id}` : ""}`, nazwa: "Rozmowa z pytaniami", kiedy: "Chcesz zrozumieć, nie tylko trafić.", ikona: <CircleHelp size={18} aria-hidden="true" /> }] : []),
    ...(wybranyPrzedmiot === "matematyka" || wybranyPrzedmiot === "informatyka" ? [{ id: "zdjecie" as const, to: "/nauka/zdjecie", nazwa: "Zdjęcie z kartki", kiedy: "Rozwiązujesz na papierze i chcesz omówienia.", ikona: <Camera size={18} aria-hidden="true" /> }] : []),
    { id: "uczen-uczy", to: "/nauka/uczen-uczy", nazwa: "Naucz Kolegę", kiedy: "Chcesz sprawdzić, czy naprawdę rozumiesz zasadę.", ikona: <GraduationCap size={18} aria-hidden="true" /> },
    ...(wybranyPrzedmiot !== "polski" ? [{ id: "wizualizacje" as const, to: adresWizualizacji(wybranyPrzedmiot === "matematyka" ? "parabola" : wybranyPrzedmiot === "informatyka" ? "wyszukiwanie-binarne" : "tekst-parafraza"), nazwa: "Zobacz na modelu", kiedy: "Chcesz zobaczyć, jak to działa, zanim zaczniesz ćwiczyć.", ikona: <Eye size={18} aria-hidden="true" /> }] : []),
    { id: "mapa-wiedzy", to: `/nauka/mapa-wiedzy?przedmiot=${wybranyPrzedmiot}`, nazwa: "Mapa wiedzy", kiedy: "Zbierasz pojęcia i chcesz zobaczyć, co je łączy.", ikona: <Network size={18} aria-hidden="true" /> },
  ];

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony tytul="Nauka" tytulRef={naglowek} />

      {moje.length > 1 && (
        <Pigulki aria-label="Przedmiot">
          {moje.map((id) => {
            const p = przedmiot(id)!;
            return (
              <button key={id} type="button" className="pigulka" aria-pressed={id === wybranyPrzedmiot} onClick={() => ustawPrzedmiot(id)}>
                <SubjectIcon subject={p} size="sm" /> {p.nazwa}
              </button>
            );
          })}
        </Pigulki>
      )}

      {angielski ? (
        <article className={s.karta} aria-labelledby="nauka-polecenie">
          <span className="kicker"><TutorAvatar size={22} /> {wybrana ? "Twój wybór" : "Polecam"}</span>
          {mapa.stan === "blad" ? (
            <BladNauki komunikat="Nie udało się wczytać umiejętności." ponow={mapa.ponow} />
          ) : czekaNaPolecenie || !umiejetnosc ? (
            <Ladowanie ksztalt="tekst" ile={2} etykieta="Dobieram rundę" />
          ) : (
            <>
              <h2 id="nauka-polecenie" className="h1" tabIndex={-1} ref={naglowekPolecenia}>{umiejetnosc.name}</h2>
              <p className="muted">
                {powtorz ? "Powtórka błędnego zadania" : `${nazwaFormatuNauki[format]} · 5 zadań · ok. ${minuty} min`}
              </p>
              {dane?.reason && !wybrana && !powtorz && <p>{dane.reason}</p>}
              <div className={s.akcje}>
                <Link to={adresStartu(poziom, umiejetnosc.skill_id, format, powtorz)} className={`btn btn-primary ${s.przycisk}`} data-tutor-about={dane?.reason}>
                  {powtorz ? <><RotateCcw size={18} aria-hidden="true" /> Powtórz zadanie</> : <><Timer size={18} aria-hidden="true" /> Zacznij rundę · {minuty} min</>}
                </Link>
                <button type="button" className="link" aria-expanded={zmiana} aria-controls="wybor-umiejetnosci" onClick={() => ustawZmiane((z) => !z)}>
                  {zmiana ? "Gotowe" : "Zmień umiejętność"}
                </button>
              </div>
              {zmiana && (
                <div id="wybor-umiejetnosci" className={s.wyborOgrod}>
                  <Ogrod maly umiejetnosci={umiejetnosci} poziom={poziom} wybrana={umiejetnosc.skill_id}
                    tuDzis={polecenieDnia.dane?.skill_id ?? null} etykieta="Wybierz umiejętność z ogrodu"
                    onWybierz={(u) => { ustawUmiejetnosc(u.skill_id); ustawZmiane(false); }} />
                  <WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} />
                </div>
              )}
            </>
          )}
        </article>
      ) : bezRund && akcjaBezRund ? (
        <article className={s.karta} aria-labelledby="nauka-polecenie">
          <span className="kicker"><TutorAvatar size={22} /> Polecam</span>
          <h2 id="nauka-polecenie" className="h1">{przedmiot(wybranyPrzedmiot)!.nazwa}</h2>
          <p className="muted">{bezRund.tekst}</p>
          <div className={s.akcje}>
            <Link to={akcjaBezRund.do} className={`btn btn-primary ${s.przycisk}`}>{akcjaBezRund.etykieta}</Link>
          </div>
        </article>
      ) : null}

      <ul className={s.drogi} aria-label="Inne drogi">
        {drogi.map((d) => (
          <li key={d.id} className={s.droga}>
            {d.temat ? (
              <WolnyTemat key={`${wybranyPrzedmiot}-${poziom}`} przedmiotId={wybranyPrzedmiot} poziom={poziom} umiejetnosci={umiejetnosci} ikona={d.ikona} nazwa={d.nazwa} />
            ) : (
              <Link to={d.to!} className={s.drogaLink}>
                <span className={s.ikona}>{d.ikona}</span>
                <span className="h3">{d.nazwa}</span>
                <span className="small muted">{d.opis}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>

      <details className={`${s.sekcja} ${s.wiecej}`}>
        <summary><ChevronRight size={18} aria-hidden="true" /> <span className="h3">Więcej sposobów</span></summary>
        <ul className={`wiersze ${s.sposoby}`}>
          {wiecej.map((x) => (
            <li key={x.id}>
              <Link to={x.to} className="wiersz">
                <span className={`wiersz-ikona ${s.ikona}`}>{x.ikona}</span>
                <span className="wiersz-tresc">
                  <span className="h3">{x.nazwa}</span>
                  <span className="wiersz-opis">{x.kiedy}</span>
                </span>
                <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </details>

      {angielski && ostatnie.stan === "gotowe" && sesje.length > 0 && (
        <section className={s.sekcja} aria-labelledby="ostatnio">
          <h2 className="h2" id="ostatnio" tabIndex={-1} ref={naglowekOstatnio}>Dokończ</h2>
          <ul className={s.wiersze}>
            {sesje.map((sesja) => {
              const nazwa = sesja.skill_id ? ostatnie.dane?.nazwy.get(sesja.skill_id) : undefined;
              const nazwaFormatu = nazwaFormatuNauki[sesja.format];
              return (
                <li key={sesja.id} className={s.wierszRundy}>
                  <WierszFormat
                    to={adresRundy(sesja.id)}
                    nazwa={nazwa ?? nazwaFormatu}
                    opis={[nazwa && nazwaFormatu, kilkaPoziomow && nazwaPoziomu[sesja.level], dataNauki(sesja.updated_at)].filter(Boolean).join(" · ")}
                    ikona={<Timer size={18} aria-hidden="true" />}
                    akcja="Wznów"
                  />
                  <button
                    type="button"
                    className={`link ${s.usun}`}
                    disabled={usuwane !== null}
                    onClick={() => void odrzuc(sesja)}
                    aria-label={`Usuń rundę: ${nazwa ?? nazwaFormatu}`}
                  >
                    {usuwane === sesja.id ? "Usuwanie…" : "Usuń"}
                  </button>
                </li>
              );
            })}
          </ul>
          {bladUsuwania && <p role="alert" className={s.blad}>{bladUsuwania}</p>}
        </section>
      )}
      {angielski && ostatnie.stan === "blad" && <BladNauki komunikat="Nie udało się wczytać niedokończonych rund." ponow={ostatnie.ponow} />}
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

function WolnyTemat({ przedmiotId, poziom, umiejetnosci, ikona, nazwa }: { przedmiotId: PrzedmiotId; poziom: Poziom; umiejetnosci: Umiejetnosc[]; ikona: ReactNode; nazwa: string }) {
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
      // Dopasowanie tematu do umiejętności jest tylko dla angielskiego (mapa umiejętności).
      const dopasowanie = przedmiotId === "angielski" ? await naukaApi.temat(tekst, poziom, ctrl.signal).catch(() => null) : null;
      if (ctrl.signal.aborted) return;
      const { aiGotowe, state, zapytajWNowej } = aktualnyTutor.current;
      if (!aiGotowe || state !== "idle") {
        ustawKomunikat("Pestka jest teraz zajęta. Spróbuj za chwilę.");
        return;
      }
      const umiejetnosc = umiejetnosci.find((u) => u.skill_id === dopasowanie?.umiejetnosc);
      const kontekst = umiejetnosc ? ` Umiejętność: ${umiejetnosc.name}.` : "";
      const wstep = przedmiotId === "angielski" ? `angielski (poziom ${nazwaPoziomu[poziom]})` : przedmiot(przedmiotId)!.nazwa.toLowerCase();
      zapytajWNowej(`Chcę poćwiczyć ${wstep}.${kontekst} Temat: ${tekst}`);
      navigate("/tutor");
    } finally {
      trwajace.current = null;
      if (!ctrl.signal.aborted) ustawWysylam(false);
    }
  }

  return (
    <form className={s.formularz} onSubmit={(event) => void zapytaj(event)} aria-labelledby="wolny-temat" aria-busy={wysylam}>
      <span className={s.ikona}>{ikona}</span>
      <h2 className="h3" id="wolny-temat">{nazwa}</h2>
      {tutor.aiGotowe === false ? (
        <Link to="/profil#ai" className="link">Połącz Pestkę w profilu, żeby ją zapytać</Link>
      ) : (
        <>
          <label className={s.pole}>
            <span className="visually-hidden">Czego chcesz się nauczyć?</span>
            <input
              type="text"
              className="input"
              placeholder={przedmiotId === "angielski" ? "Np. mowa zależna" : przedmiotId === "matematyka" ? "Np. ciągi geometryczne" : przedmiotId === "informatyka" ? "Np. rekurencja" : "Np. plan rozprawki"}
              value={temat}
              onChange={(event) => ustawTemat(event.target.value)}
              maxLength={280}
              required
              disabled={wysylam}
            />
          </label>
          <button type="submit" className={`btn btn-secondary btn-sm ${s.przycisk}`} disabled={!tutor.aiGotowe || tutor.state !== "idle" || !temat.trim() || wysylam}>
            <MessagesSquare size={18} aria-hidden="true" />
            {wysylam ? "Dobieram temat…" : "Zapytaj"}
          </button>
        </>
      )}
      {tutor.aiGotowe === undefined && <span role="status" className="visually-hidden">Sprawdzam dostęp do Pestki…</span>}
      {tutor.aiGotowe && tutor.state !== "idle" && !wysylam && !komunikat && <p className="small muted">Pestka odpowiada w innej rozmowie.</p>}
      {komunikat && <p role="alert" className="small">{komunikat}</p>}
    </form>
  );
}
