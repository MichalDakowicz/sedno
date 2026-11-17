import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronRight, FileText, GraduationCap, MessagesSquare, Sparkles, Timer, Wrench } from "lucide-react";
import type { Poziom } from "../../arkusze/typy";
import { Ladowanie } from "../../components/Ladowanie";
import { useTutor } from "../../components/TutorContext";
import { nazwaPoziomu } from "../../konto/przedmioty";
import { adresMapy, adresRundy, adresStartu } from "../../nauka/adresy";
import { naukaApi, nazwaFormatuNauki, type Umiejetnosc } from "../../nauka/api";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import { Angielski, BladNauki, dataNauki, formatRundy, procentNauki, WyborPoziomuNauki } from "./NaukaPowtorki";
import s from "./NaukaPowtorki.module.css";

export function Nauka() {
  const [poziom, ustawPoziom] = usePoziomNauki();
  const [params, ustawParams] = useSearchParams();
  const { aiGotowe } = useTutor();
  const mapa = useZapytanieNauki(`nauka:mapa:${poziom}`, (signal) => naukaApi.mapa(poziom, signal));
  const umiejetnosci = mapa.dane?.skills ?? [];
  const wybranyId = params.get("umiejetnosc");
  const wybrana = umiejetnosci.find((u) => u.skill_id === wybranyId);
  const polecenie = useZapytanieNauki(
    !wybranyId || mapa.stan === "gotowe" ? `nauka:polec:${poziom}:${wybrana?.skill_id ?? ""}` : null,
    (signal) => naukaApi.polec(poziom, wybrana?.skill_id, signal),
  );
  const ostatnie = useZapytanieNauki(`nauka:ostatnie:${poziom}`, (signal) => naukaApi.ostatnie(poziom, signal));
  const umiejetnosc = wybrana ?? umiejetnosci.find((u) => u.skill_id === polecenie.dane?.skill_id);
  const powtorz = polecenie.dane?.repeat_id ?? undefined;
  const format = powtorz ? "szybka-runda" : formatRundy(polecenie.dane?.format);
  const sesje = (ostatnie.dane ?? []).filter((sesja) => sesja.format === "szybka-runda" || sesja.format === "napraw-blad");
  const ladujeCwiczenie = mapa.stan === "ladowanie" || (mapa.stan === "gotowe" && polecenie.stan === "ladowanie");
  const ladujeOstatnie = ostatnie.stan === "ladowanie" || (sesje.length > 0 && mapa.stan === "ladowanie");
  const [etap, ustawEtap] = useState<"pierwszy" | "pokazany" | "odswiezany">("pierwszy");
  const pierwszeLadowanie = etap === "pierwszy" && ladujeCwiczenie;
  const wejsciePoOdswiezeniu = etap === "odswiezany" ? " wejscie" : "";

  useEffect(() => {
    ustawEtap((aktualny) => {
      if (aktualny === "pierwszy" && !ladujeCwiczenie) return "pokazany";
      if (aktualny === "pokazany" && ladujeCwiczenie) return "odswiezany";
      return aktualny;
    });
  }, [ladujeCwiczenie]);

  function ustawUmiejetnosc(id: string) {
    ustawParams((aktualne) => {
      const nowe = new URLSearchParams(aktualne);
      if (id) nowe.set("umiejetnosc", id);
      else nowe.delete("umiejetnosc");
      return nowe;
    });
  }

  const tresc = pierwszeLadowanie ? (
    <Ladowanie ksztalt="pulpit" ile={3} etykieta="Wczytuję stronę Nauka" />
  ) : (
    <div className={`${s.tresc} wejscie`}>
      <section className={s.sekcja} aria-label="Wybór ćwiczenia">
        <div className={s.pola}>
          <WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} />
          <label className={s.pole}>
            <span className="small muted">Umiejętność</span>
            <select value={wybrana?.skill_id ?? ""} onChange={(e) => ustawUmiejetnosc(e.target.value)} disabled={mapa.stan !== "gotowe"}>
              <option value="">Dobierz dla mnie</option>
              {[...new Set(umiejetnosci.map((u) => u.area))].map((obszar) => (
                <optgroup key={obszar} label={obszar}>
                  {umiejetnosci.filter((u) => u.area === obszar).map((u) => <option key={u.skill_id} value={u.skill_id}>{u.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        {umiejetnosc ? (
          <div className={s.akcje + wejsciePoOdswiezeniu}>
            <Link to={adresMapy(poziom, umiejetnosc.skill_id)} className="link">Zobacz opanowanie</Link>
            <span className="small muted">
              {umiejetnosc.score === null ? "Za mało danych" : procentNauki.format(umiejetnosc.score)}
            </span>
          </div>
        ) : ladujeCwiczenie && <div className={s.miejsceOpanowania} aria-hidden="true" />}
      </section>

      <div className={s.para}>
        {mapa.stan === "blad" ? (
          <BladNauki komunikat="Nie udało się wczytać umiejętności." ponow={mapa.ponow} />
        ) : polecenie.stan === "blad" ? (
          <BladNauki komunikat="Nie udało się dobrać ćwiczenia." ponow={polecenie.ponow} />
        ) : ladujeCwiczenie ? (
          <div className={s.polecane}>
            <Ladowanie ksztalt="blok" etykieta="Dobieram ćwiczenie" />
          </div>
        ) : polecenie.dane && umiejetnosc ? (
          <article className={`${s.karta} ${s.polecane}${wejsciePoOdswiezeniu}`} aria-labelledby="nauka-polecenie">
            <span className={`label ${s.nadtytul}`}><Sparkles size={16} aria-hidden="true" /> Polecam</span>
            <h2 id="nauka-polecenie" className="h1">{powtorz ? "Powtórz zadanie" : nazwaFormatuNauki[format]}</h2>
            <p className="h3">{umiejetnosc.name}</p>
            <p className="muted">{polecenie.dane.reason}</p>
            <Link to={adresStartu(poziom, umiejetnosc.skill_id, format, powtorz)} className={`btn btn-primary ${s.przycisk}`}>
              {polecenie.dane.minutes > 0 ? `Zacznij · ${polecenie.dane.minutes} min` : "Zacznij"}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </article>
        ) : (
          <div className={s.stan}>
            <p className="muted">
              {wybrana ? "Brak gotowej rundy dla tej umiejętności. Wybierz inne ćwiczenie z listy poniżej." : "Brak gotowej rundy na tym poziomie."}
            </p>
          </div>
        )}
        <WolnyTemat key={poziom} poziom={poziom} umiejetnosci={umiejetnosci} />
      </div>

      <section className={s.sekcja} aria-labelledby="inne-formaty">
        <h2 className="h2" id="inne-formaty">Inne sposoby nauki</h2>
        <ul className={s.wiersze}>
          {ladujeCwiczenie && (
            <li className={s.ladowanieFormatu}>
              <Ladowanie ile={1} etykieta="Wczytuję ćwiczenia dla tej umiejętności" />
            </li>
          )}
          {!ladujeCwiczenie && umiejetnosc && umiejetnosc.formats.includes("szybka-runda") && (powtorz || !polecenie.dane || format !== "szybka-runda") && (
            <WierszFormat
              poWczytaniu={etap === "odswiezany"}
              to={adresStartu(poziom, umiejetnosc.skill_id)}
              nazwa="Szybka runda"
              opis="Kilka zadań ze sprawdzeniem po każdej odpowiedzi."
              ikona={<Timer size={18} aria-hidden="true" />}
            />
          )}
          {!ladujeCwiczenie && umiejetnosc && umiejetnosc.formats.includes("napraw-blad") && (!polecenie.dane || format !== "napraw-blad") && (
            <WierszFormat
              poWczytaniu={etap === "odswiezany"}
              to={adresStartu(poziom, umiejetnosc.skill_id, "napraw-blad")}
              nazwa="Napraw błąd"
              opis="Popraw zdania i sprawdź, dlaczego dana forma jest właściwa."
              ikona={<Wrench size={18} aria-hidden="true" />}
            />
          )}
          <WierszFormat
            to="/arkusze"
            nazwa="Arkusze CKE"
            opis="Rozwiązuj oryginalne zadania maturalne."
            ikona={<FileText size={18} aria-hidden="true" />}
          />
          <WierszFormat
            to="/nauka/uczen-uczy"
            nazwa="Uczeń uczy AI"
            opis="Wytłumacz zasadę Koledze i sprawdź, czy potrafi jej użyć."
            ikona={<GraduationCap size={18} aria-hidden="true" />}
          />
          {aiGotowe === true && (
            <WierszFormat
              poWczytaniu={etap !== "pierwszy"}
              to="/tutor"
              nazwa="Rozmowa z Pestką"
              opis="Poproś o przykład, wskazówkę lub wyjaśnienie."
              ikona={<MessagesSquare size={18} aria-hidden="true" />}
            />
          )}
        </ul>
      </section>
    </div>
  );

  return (
    <main className={`container ${s.strona}`}>
      <header className={s.glowa}>
        <Angielski />
        <h1 className="display">Nauka</h1>
        <p className="lead">Wybierz umiejętność i zrób krótką rundę przed maturą.</p>
      </header>
      {tresc}
      {!pierwszeLadowanie && <section className={s.sekcja} aria-labelledby="ostatnio">
        <h2 className="h2" id="ostatnio">Ostatnio</h2>
        {ladujeOstatnie && <Ladowanie ile={2} etykieta="Wczytuję niedokończone ćwiczenia" />}
        {ostatnie.stan === "blad" && <BladNauki komunikat="Nie udało się wczytać ostatnich ćwiczeń." ponow={ostatnie.ponow} />}
        {ostatnie.stan === "gotowe" && !ladujeOstatnie && (
          sesje.length ? (
            <ul className={`${s.wiersze} wejscie`}>
              {sesje.map((sesja) => {
                const nazwa = umiejetnosci.find((u) => u.skill_id === sesja.skill_id)?.name;
                const format = nazwaFormatuNauki[sesja.format];
                return (
                  <WierszFormat
                    key={sesja.id}
                    to={adresRundy(sesja.id)}
                    nazwa={nazwa ?? format}
                    opis={[nazwa && format, dataNauki(sesja.updated_at)].filter(Boolean).join(" · ")}
                    ikona={<Timer size={18} aria-hidden="true" />}
                    akcja="Wznów"
                  />
                );
              })}
            </ul>
          ) : <p className="muted wejscie">Nie masz niedokończonych ćwiczeń na tym poziomie.</p>
        )}
      </section>}
    </main>
  );
}

function WierszFormat({ to, nazwa, opis, ikona, akcja, poWczytaniu }: { to: string; nazwa: string; opis: string; ikona: ReactNode; akcja?: string; poWczytaniu?: boolean }) {
  const [animujWejscie] = useState(poWczytaniu);
  return (
    <li className={animujWejscie ? "wejscie" : undefined}>
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
    </li>
  );
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
      {tutor.aiGotowe === undefined && <span role="status" className="visually-hidden">Sprawdzam dostęp do Pestki…</span>}
      {tutor.aiGotowe && tutor.state !== "idle" && !wysylam && !komunikat && <p className="small muted">Pestka odpowiada w innej rozmowie.</p>}
      {komunikat && <p role="alert" className="small">{komunikat}</p>}
    </form>
  );
}
