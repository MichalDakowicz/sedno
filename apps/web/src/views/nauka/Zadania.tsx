// Zadania z matematyki i informatyki: szablony z funkcji nauka-ai, wariant z losowymi danymi i ocena kluczem
// (warianty-i-ocena.md). Wariant i próba mają UUID z klienta: ponowienie po błędzie sieci wysyła te same id,
// więc serwer zwraca to samo zadanie i ten sam wynik, a nie liczy próby drugi raz.
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type Ref } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, ChevronRight, CircleAlert, CircleHelp, MessageCircle, X } from "lucide-react";
import { useProfil, useSession } from "../../auth";
import { nazwaPoziomu } from "../../arkusze/typy";
import { BladPestki } from "../../components/BladPestki";
import { Ladowanie } from "../../components/Ladowanie";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { useKontekstPestki, useTutor } from "../../components/TutorContext";
import { SubjectIcon } from "../../components/icons";
import { przedmiot as daneP } from "../../konto/przedmioty";
import {
  czyPrzerwane, naukaAi, type OcenaRozwiazania, type OdpowiedzWariantu, type Wariant, type ZadanieWariantu,
} from "../../nauka/ai";
import { useZapytanieNauki } from "../../nauka/stan";
import { PestkaMowi, tekstyPestki, wybierz } from "./PestkaRundy";
import { odczytajRunde, UUID_SESJI, zapiszRunde } from "./sesjaRundy";
import s from "./SzybkaRunda.module.css";
import z from "./Zadania.module.css";
import { Pigulki } from "../../components/Pigulki";

export const PRZEDMIOTY_ZADAN = ["matematyka", "informatyka"] as const;
type PrzedmiotZadan = typeof PRZEDMIOTY_ZADAN[number];
const czyPrzedmiotZadan = (w: unknown): w is PrzedmiotZadan => PRZEDMIOTY_ZADAN.some((p) => p === w);

export const adresZadan = (przedmiot?: PrzedmiotZadan, szablon?: string) => {
  const params = new URLSearchParams();
  if (przedmiot) params.set("przedmiot", przedmiot);
  if (szablon) params.set("szablon", szablon);
  const q = params.toString();
  return q ? `/nauka/zadania?${q}` : "/nauka/zadania";
};

// Nazwy pól z szablonów (warianty.ts) po polsku; nieznane pole pokazujemy pod własną nazwą.
const NAZWY_POL: Record<string, string> = { wyraz: "Wyraz ciągu", suma: "Suma", ile: "Liczba elementów" };
const nazwaPola = (pole: string) => NAZWY_POL[pole] ?? pole.charAt(0).toUpperCase() + pole.slice(1);

function useKatalog(przedmiot: PrzedmiotZadan) {
  return useZapytanieNauki(`nauka:warianty:${przedmiot}`, (signal) => naukaAi.katalogWariantow(przedmiot, signal));
}

export function Zadania() {
  const [params, ustawParams] = useSearchParams();
  const profil = useProfil();
  const session = useSession();
  const moje = profil?.subjects ?? [];
  const zParametru = params.get("przedmiot");
  const przedmiot: PrzedmiotZadan = czyPrzedmiotZadan(zParametru) ? zParametru : moje.map((p) => p.id).find(czyPrzedmiotZadan) ?? "matematyka";
  const poziomy = moje.filter((p) => p.id === przedmiot).map((p) => p.poziom);
  const szablon = params.get("szablon");
  const katalog = useKatalog(przedmiot);

  if (szablon && session) {
    const wpis = katalog.dane?.find((t) => t.id === szablon);
    if (katalog.stan === "gotowe" && !wpis) {
      return (
        <main className={`container czytanie ${s.strona}`}>
          <NaglowekStrony wstecz={{ do: adresZadan(przedmiot), nazwa: "Zadania" }} tytul="Zadania" />
          <div className={s.komunikat}>
            <p role="alert">Nie ma takiego typu zadania.</p>
            <Link to={adresZadan(przedmiot)} className="btn btn-primary">Wybierz z listy</Link>
          </div>
        </main>
      );
    }
    return <ZadanieZSzablonu key={`${session.user.id}:${szablon}`} user={session.user.id} szablon={szablon} przedmiot={przedmiot}
      nazwa={wpis?.nazwa ?? null} bladKatalogu={katalog.stan === "blad" ? katalog.ponow : null} />;
  }

  const wybierzPrzedmiot = (p: PrzedmiotZadan) => ustawParams({ przedmiot: p }, { replace: true });
  const lista = (katalog.dane ?? []).filter((t) => !poziomy.length || t.poziomy.some((p) => poziomy.includes(p)));

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: "/nauka", nazwa: "Nauka" }} tytul="Zadania" lead="Nowe dane w każdym zadaniu, wynik od razu.">
        <Pigulki role="group" aria-label="Przedmiot">
          {PRZEDMIOTY_ZADAN.map((p) => (
            <button key={p} type="button" className="pigulka" aria-pressed={p === przedmiot} onClick={() => wybierzPrzedmiot(p)}>
              <SubjectIcon subject={daneP(p)!} size="sm" />
              {daneP(p)!.nazwa}
            </button>
          ))}
        </Pigulki>
      </NaglowekStrony>
      <section className={`${s.sekcja} ${z.bezLinii}`} aria-labelledby="typy-zadan">
        <h2 className="h2" id="typy-zadan">Typy zadań</h2>
        {poziomy.length > 0 && <p className="small muted">{poziomy.map((p) => nazwaPoziomu[p]).join(", ")}</p>}
        {katalog.stan === "ladowanie" && <Ladowanie ile={4} etykieta="Wczytuję typy zadań" />}
        {katalog.stan === "blad" && <BladPestki blad={null} ponow={katalog.ponow} />}
        {katalog.stan === "gotowe" && (lista.length ? (
          <ul className="wiersze">
            {lista.map((t) => (
              <li key={t.id}>
                <Link to={adresZadan(przedmiot, t.id)} className="wiersz">
                  <span className="wiersz-tresc"><span className="h3">{t.nazwa}</span></span>
                  <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={s.komunikat}>
            <p className="muted">Na twoim poziomie nie ma jeszcze zadań z tego przedmiotu.</p>
            <Link to={`/arkusze?przedmiot=${przedmiot}`} className="btn btn-secondary">Arkusze CKE</Link>
          </div>
        ))}
      </section>
    </main>
  );
}

type Proba = { id: string; skrot: string };
type Pamiec = { wariant: string; numer: number };

function ZadanieZSzablonu({ user, szablon, przedmiot, nazwa, bladKatalogu }: {
  user: string; szablon: string; przedmiot: PrzedmiotZadan; nazwa: string | null; bladKatalogu: (() => void) | null;
}) {
  const { aiGotowe, open } = useTutor();
  const klucz = `sedno.zadania:${user}:${szablon}`;
  const [pamiec, ustawPamiec] = useState<Pamiec>(() => {
    const zapis = odczytajRunde<Pamiec>(klucz);
    return zapis && UUID_SESJI.test(zapis.wariant) && Number.isInteger(zapis.numer) ? zapis : { wariant: crypto.randomUUID(), numer: 1 };
  });
  const [wariant, ustawWariant] = useState<Wariant | null>(null);
  const [bladWariantu, ustawBladWariantu] = useState<unknown>(null);
  const [proby, ustawProby] = useState(0);
  const [odpowiedz, ustawOdpowiedz] = useState<{ tekst: string; pola: Record<string, string> }>({ tekst: "", pola: {} });
  const [ocena, ustawOcena] = useState<OcenaRozwiazania | null>(null);
  const [sprawdzam, ustawSprawdzam] = useState(false);
  const [bladOceny, ustawBladOceny] = useState<unknown>(null);
  const [seria, ustawSerie] = useState(0);
  const proba = useRef<Proba | null>(null);
  const trwa = useRef<AbortController | null>(null);
  const naglowek = useRef<HTMLHeadingElement>(null);
  const werdykt = useRef<HTMLHeadingElement>(null);
  const id = useId();

  useEffect(() => {
    zapiszRunde(klucz, pamiec);
    const ctrl = new AbortController();
    ustawWariant(null);
    ustawBladWariantu(null);
    naukaAi.wariant(pamiec.wariant, szablon, ctrl.signal).then(
      (w) => { if (!ctrl.signal.aborted) ustawWariant(w); },
      (e: unknown) => { if (!ctrl.signal.aborted && !czyPrzerwane(e)) ustawBladWariantu(e); },
    );
    return () => ctrl.abort();
  }, [klucz, pamiec, szablon, proby]);

  useEffect(() => () => trwa.current?.abort(), []);
  useEffect(() => { if (wariant && !ocena) naglowek.current?.focus({ preventScroll: pamiec.numer === 1 }); }, [wariant, ocena, pamiec.numer]);
  useEffect(() => { if (ocena) werdykt.current?.focus(); }, [ocena]);

  const zadanie = wariant?.zadanie;
  const tytul = nazwa ?? "Zadanie";
  const tytulZadania = `${tytul} · zadanie ${pamiec.numer}`;

  useKontekstPestki(zadanie ? {
    klucz: `wariant:${pamiec.wariant}`,
    tytul: tytulZadania,
    opis: opisDlaPestki(zadanie, odpowiedz, ocena),
  } : null);

  function nastepne() {
    trwa.current?.abort();
    proba.current = null;
    ustawOcena(null);
    ustawBladOceny(null);
    ustawOdpowiedz({ tekst: "", pola: {} });
    ustawPamiec((p) => ({ wariant: crypto.randomUUID(), numer: p.numer + 1 }));
  }

  function poprawiaj() {
    proba.current = null;
    ustawOcena(null);
    ustawBladOceny(null);
  }

  async function sprawdz(e?: FormEvent) {
    e?.preventDefault();
    if (!zadanie || trwa.current) return;
    const tresc = doWyslania(zadanie, odpowiedz);
    if (!tresc) return;
    const skrot = JSON.stringify(tresc);
    // Ta sama odpowiedź po błędzie idzie z tym samym id próby; zmieniona wymaga nowego (kontrakt oceny).
    if (proba.current?.skrot !== skrot) proba.current = { id: crypto.randomUUID(), skrot };
    const ctrl = new AbortController();
    trwa.current = ctrl;
    ustawSprawdzam(true);
    ustawBladOceny(null);
    try {
      const wynik = await naukaAi.ocenWariant(proba.current.id, pamiec.wariant, tresc, ctrl.signal);
      if (ctrl.signal.aborted) return;
      const pelne = wynik.status === "ocenione" && wynik.punkty === wynik.maksPunktow;
      ustawSerie((n) => (pelne ? n + 1 : 0));
      ustawOcena(wynik);
    } catch (blad) {
      if (!ctrl.signal.aborted && !czyPrzerwane(blad)) ustawBladOceny(blad);
    } finally {
      if (trwa.current === ctrl) trwa.current = null;
      if (!ctrl.signal.aborted) ustawSprawdzam(false);
    }
  }

  const gotowe = zadanie ? doWyslania(zadanie, odpowiedz) !== null : false;

  return (
    <main className={`container czytanie ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: adresZadan(przedmiot), nazwa: "Zadania" }} tytul={tytul}>
        <p className="small muted">{daneP(przedmiot)!.nazwa}</p>
      </NaglowekStrony>
      {bladKatalogu && !nazwa && <BladPestki blad={null} ponow={bladKatalogu} etykieta="Wczytaj nazwę" />}
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{ocena ? opisWerdyktu(ocena) : ""}</div>

      {bladWariantu ? (
        <section className={`${s.sekcja} ${z.bezLinii}`}>
          <BladPestki blad={bladWariantu} ponow={() => ustawProby((n) => n + 1)} />
        </section>
      ) : !zadanie ? (
        <Ladowanie ksztalt="tekst" etykieta="Losuję dane do zadania" />
      ) : (
        <section className={`${s.sekcja} ${z.bezLinii}`} aria-labelledby={id} data-tutor="pytanie-rundy">
          <h2 id={id} className="h2" tabIndex={-1} ref={naglowek}>Zadanie {pamiec.numer}</h2>
          <p className={z.polecenie}>{zadanie.polecenie}</p>
          <DaneZadania dane={zadanie.dane} />
          <span className="small muted">{zadanie.punkty} {zadanie.punkty === 1 ? "punkt" : zadanie.punkty < 5 ? "punkty" : "punktów"}</span>

          {ocena ? (
            <Werdykt ocena={ocena} zadanie={zadanie} odpowiedz={odpowiedz} seria={seria} numer={pamiec.numer} tytulRef={werdykt}
              wyjasnij={aiGotowe ? () => open({ klucz: `wariant:${pamiec.wariant}`, tytul: tytulZadania, opis: opisDlaPestki(zadanie, odpowiedz, ocena) }) : null}
              nastepne={nastepne} poprawiaj={poprawiaj} />
          ) : (
            <form className={s.formularz} onSubmit={(e) => void sprawdz(e)} aria-busy={sprawdzam}>
              <PoleOdpowiedzi zadanie={zadanie} odpowiedz={odpowiedz} zmien={ustawOdpowiedz} wylaczone={sprawdzam} wyslij={() => void sprawdz()} />
              {bladOceny !== null && <BladPestki blad={bladOceny} ponow={() => void sprawdz()} etykieta="Wyślij ponownie" />}
              <div className={s.akcje}>
                <button type="submit" className="btn btn-primary" disabled={sprawdzam || !gotowe}>{sprawdzam ? "Sprawdzam…" : "Sprawdź"}</button>
                <button type="button" className="btn btn-ghost" disabled={sprawdzam} onClick={nastepne}>Inne dane</button>
              </div>
            </form>
          )}
        </section>
      )}
    </main>
  );
}

function DaneZadania({ dane }: { dane: unknown }) {
  if (!dane || typeof dane !== "object") return null;
  const d = dane as { liczby?: unknown; wydatki?: unknown; zdanie?: unknown };
  if (Array.isArray(d.liczby)) {
    return <p className={z.dane}><span className="visually-hidden">Tablica: </span>[{d.liczby.join(", ")}]</p>;
  }
  if (typeof d.zdanie === "string") return <p className={z.zdanie} lang="en">{d.zdanie}</p>;
  if (Array.isArray(d.wydatki)) {
    const wiersze = d.wydatki as { dzial: string; rok: number; kwota: number }[];
    return (
      <div className={z.tabela}>
        <table>
          <caption className="small muted">Tabela wydatki</caption>
          <thead><tr><th scope="col">dzial</th><th scope="col">rok</th><th scope="col">kwota</th></tr></thead>
          <tbody>{wiersze.map((w, i) => <tr key={i}><td>{w.dzial}</td><td>{w.rok}</td><td>{w.kwota}</td></tr>)}</tbody>
        </table>
      </div>
    );
  }
  return null;
}

function PoleOdpowiedzi({ zadanie, odpowiedz, zmien, wylaczone, wyslij }: {
  zadanie: ZadanieWariantu;
  odpowiedz: { tekst: string; pola: Record<string, string> };
  zmien: (o: { tekst: string; pola: Record<string, string> }) => void;
  wylaczone: boolean;
  wyslij: () => void;
}) {
  if (zadanie.forma === "pola" && zadanie.pola?.length) {
    return (
      <fieldset className={z.pola} disabled={wylaczone}>
        <legend className="small">Twoja odpowiedź</legend>
        {zadanie.pola.map((pole) => (
          <label key={pole} className={z.pole}>
            <span className="small muted">{nazwaPola(pole)}</span>
            <input className="input" value={odpowiedz.pola[pole] ?? ""} maxLength={250} autoComplete="off" inputMode="text"
              onChange={(e) => zmien({ ...odpowiedz, pola: { ...odpowiedz.pola, [pole]: e.currentTarget.value } })} />
          </label>
        ))}
      </fieldset>
    );
  }
  if (zadanie.forma === "sql") {
    const skrot = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); wyslij(); }
    };
    return (
      <label className={z.pole}>
        <span className="small">Zapytanie SQL</span>
        <textarea className={z.kod} value={odpowiedz.tekst} rows={6} maxLength={12000} spellCheck={false} disabled={wylaczone}
          aria-keyshortcuts="Control+Enter Meta+Enter" placeholder="SELECT …" onKeyDown={skrot}
          onChange={(e) => zmien({ ...odpowiedz, tekst: e.currentTarget.value })} />
      </label>
    );
  }
  return (
    <label className={z.pole}>
      <span className="small">{zadanie.forma === "lista" ? "Twoja odpowiedź (oddziel średnikiem)" : "Twoja odpowiedź"}</span>
      <input className="input" value={odpowiedz.tekst} maxLength={500} autoComplete="off" spellCheck={false} disabled={wylaczone}
        lang={zadanie.forma === "tekst" ? "en" : undefined}
        onChange={(e) => zmien({ ...odpowiedz, tekst: e.currentTarget.value })} />
    </label>
  );
}

function doWyslania(zadanie: ZadanieWariantu, o: { tekst: string; pola: Record<string, string> }): OdpowiedzWariantu | null {
  if (zadanie.forma === "pola") {
    const pola = Object.fromEntries((zadanie.pola ?? []).map((p) => [p, (o.pola[p] ?? "").trim()]));
    return Object.values(pola).every(Boolean) ? { pola } : null;
  }
  const tekst = o.tekst.trim();
  if (!tekst) return null;
  return zadanie.forma === "sql" ? { kod: tekst } : { tekst };
}

function Werdykt({ ocena, zadanie, odpowiedz, seria, numer, tytulRef, wyjasnij, nastepne, poprawiaj }: {
  ocena: OcenaRozwiazania;
  zadanie: ZadanieWariantu;
  odpowiedz: { tekst: string; pola: Record<string, string> };
  seria: number;
  numer: number;
  tytulRef: Ref<HTMLHeadingElement>;
  wyjasnij: (() => void) | null;
  nastepne: () => void;
  poprawiaj: () => void;
}) {
  const niepewne = ocena.status === "do-weryfikacji";
  const pelne = !niepewne && ocena.punkty === ocena.maksPunktow;
  const czesc = !niepewne && !pelne && (ocena.punkty ?? 0) > 0;
  const naglowek = niepewne ? "Do weryfikacji" : pelne ? "Dobra odpowiedź" : czesc ? "Część punktów" : "Tym razem nie";
  const Ikona = niepewne ? CircleHelp : pelne ? Check : CircleAlert;
  const reakcja = niepewne ? wybierz(tekstyPestki.niepewne, numer)
    : pelne ? (seria >= 3 ? wybierz(tekstyPestki.seria, numer).replace("{n}", String(seria)) : wybierz(tekstyPestki.dobrze, numer))
      : czesc ? wybierz(tekstyPestki.czesciowo, numer)
        : wybierz(wyjasnij ? tekstyPestki.zle : tekstyPestki.zleSprobuj, numer);
  return (
    <div className={s.formularz} data-tutor="werdykt">
      <div className={s.werdykt}>
        <h3 className={`h2 ${s.ocena}`} ref={tytulRef} tabIndex={-1} data-correct={niepewne ? undefined : pelne} data-status={ocena.status}>
          <Ikona size={24} aria-hidden="true" />
          {naglowek}
          {!niepewne && <span className={z.punkty}>{ocena.punkty} / {ocena.maksPunktow} pkt</span>}
        </h3>
        <PestkaMowi tekst={reakcja}>
          {!pelne && wyjasnij && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={wyjasnij}>
              <MessageCircle size={16} aria-hidden="true" /> Zapytaj Pestkę
            </button>
          )}
        </PestkaMowi>
      </div>
      <p><strong>Twoja odpowiedź</strong> · {opisOdpowiedzi(zadanie, odpowiedz)}</p>
      {ocena.kryteria && ocena.kryteria.length > 0 && (
        <ul className={z.kryteria} aria-label="Kryteria">
          {ocena.kryteria.map((k, i) => {
            const ok = k.punkty === k.maksPunktow;
            return (
              <li key={i} data-ok={ok}>
                {ok ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
                <span>{nazwaPola(k.opis)}</span>
                <span className="small muted">{k.punkty} / {k.maksPunktow} pkt</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted">{ocena.opis}</p>
      <div className={s.akcje}>
        <button type="button" className="btn btn-primary" onClick={nastepne}>Następne zadanie <ArrowRight size={17} aria-hidden="true" /></button>
        {!pelne && <button type="button" className="btn btn-ghost" onClick={poprawiaj}>{niepewne ? "Popraw zapis" : "Spróbuj jeszcze raz"}</button>}
      </div>
    </div>
  );
}

function opisOdpowiedzi(zadanie: ZadanieWariantu, o: { tekst: string; pola: Record<string, string> }) {
  if (zadanie.forma === "pola") return (zadanie.pola ?? []).map((p) => `${nazwaPola(p)}: ${o.pola[p] ?? ""}`).join(" · ");
  return o.tekst.trim() || "Brak odpowiedzi";
}

function opisWerdyktu(o: OcenaRozwiazania) {
  if (o.status === "do-weryfikacji") return `Do weryfikacji. ${o.opis}`;
  return `${o.punkty} z ${o.maksPunktow} punktów. ${o.opis}`;
}

function opisDlaPestki(zadanie: ZadanieWariantu, o: { tekst: string; pola: Record<string, string> }, ocena: OcenaRozwiazania | null) {
  const linie = ["Zadanie ćwiczebne z losowymi danymi.", `Polecenie: ${zadanie.polecenie}`];
  if (zadanie.dane) linie.push(`Dane: ${JSON.stringify(zadanie.dane)}`);
  linie.push(`Odpowiedź ucznia: ${opisOdpowiedzi(zadanie, o)}`);
  if (!ocena) return [...linie, "", "Uczeń jeszcze nie sprawdził odpowiedzi. Nie podawaj wyniku: naprowadzaj pytaniami."].join("\n");
  linie.push(`Ocena kluczem: ${opisWerdyktu(ocena)}`);
  ocena.kryteria?.forEach((k) => linie.push(`- ${nazwaPola(k.opis)}: ${k.punkty}/${k.maksPunktow}`));
  linie.push("", "Klucz nie jest znany. Pomóż znaleźć błąd pytaniami, bez podawania wyniku.");
  return linie.join("\n");
}

