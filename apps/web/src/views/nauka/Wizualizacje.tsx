// Wizualizacje (paczka 9 pkt 7): katalog modeli z nauka-ai i jeden model naraz pod ?model=. Stan modelu liczy serwer
// (akcja wizualizacja, bez modelu językowego i bez limitu modelu); suwaki pytają go po krótkiej pauzie, a na ekranie
// zostaje ostatni dobry stan. Model nie ocenia, tylko przygotowuje do ćwiczenia: na końcu jeden przycisk do zadań.
import { useEffect, useId, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { BladPestki } from "../../components/BladPestki";
import { Ladowanie } from "../../components/Ladowanie";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Pigulki } from "../../components/Pigulki";
import { useKontekstPestki } from "../../components/TutorContext";
import { SubjectIcon } from "../../components/icons";
import { Funkcja } from "../../components/wykresy";
import { przedmiot as daneP } from "../../konto/przedmioty";
import { czyPrzerwane, naukaAi } from "../../nauka/ai";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import {
  adresWizualizacji, cwiczeniePoModelu, znaneModele,
  type Model, type ModelParabola, type ModelParafrazy, type ModelWyszukiwania, type StanParaboli, type StanParafrazy, type StanWyszukiwania,
} from "../../nauka/wizualizacje";
import { PestkaMowi } from "./PestkaRundy";
import s from "./SzybkaRunda.module.css";
import w from "./Wizualizacje.module.css";

export function Wizualizacje() {
  const [params] = useSearchParams();
  const katalog = useZapytanieNauki("nauka:wizualizacje", (signal) => naukaAi.wizualizacje(undefined, signal).then(znaneModele));
  const id = params.get("model");
  const model = katalog.dane?.find((m) => m.id === id) ?? null;

  return (
    <main className={`container czytanie ${s.strona}`}>
      <NaglowekStrony wstecz={model ? { do: adresWizualizacji(), nazwa: "Modele" } : { do: "/nauka", nazwa: "Nauka" }}
        tytul={model?.nazwa ?? "Modele do zobaczenia"} lead={model ? undefined : "Przesuń, zobacz, co się zmienia, potem ćwicz."}>
        {model && <p className="small muted">{daneP(model.przedmiot)?.nazwa}</p>}
      </NaglowekStrony>
      {katalog.stan === "ladowanie" || katalog.stan === "pominiete" ? (
        <Ladowanie ile={3} etykieta="Wczytuję modele" />
      ) : katalog.stan === "blad" ? (
        <BladPestki blad={null} ponow={katalog.ponow} />
      ) : model ? (
        <WidokModelu key={model.id} model={model} />
      ) : (
        <section className={`${s.sekcja} ${w.bezLinii}`} aria-labelledby="modele">
          {id && <p className="small muted" role="status">Nie ma takiego modelu. Wybierz z listy.</p>}
          <h2 className="h2 visually-hidden" id="modele">Modele</h2>
          <ul className="wiersze">
            {(katalog.dane ?? []).map((m) => {
              const p = daneP(m.przedmiot);
              return (
                <li key={m.id}>
                  <Link to={adresWizualizacji(m.id)} className="wiersz">
                    {p && <span className="wiersz-ikona"><SubjectIcon subject={p} /></span>}
                    <span className="wiersz-tresc">
                      <span className="h3">{m.nazwa}</span>
                      <span className="wiersz-opis">{p?.nazwa}</span>
                    </span>
                    <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

/** Stan modelu z serwera dla parametrów; nowe parametry po pauzie, poprzedni stan zostaje do czasu odpowiedzi. */
function useStanModelu<T extends object>(id: string, parametry: Record<string, unknown>, pauza = 180) {
  const klucz = JSON.stringify(parametry);
  const [stan, ustawStan] = useState<T | null>(null);
  const [blad, ustawBlad] = useState<unknown>(null);
  const [proba, ustawProbe] = useState(0);
  useEffect(() => {
    const kontroler = new AbortController();
    const t = window.setTimeout(() => {
      naukaAi.wizualizacja<T>(id, JSON.parse(klucz) as Record<string, unknown>, kontroler.signal).then(
        (wynik) => {
          ustawStan(wynik);
          ustawBlad(null);
        },
        (e) => {
          if (!czyPrzerwane(e) && !kontroler.signal.aborted) ustawBlad(e);
        },
      );
    }, stan ? pauza : 0);
    return () => {
      window.clearTimeout(t);
      kontroler.abort();
    };
    // Pierwsze pobranie bez pauzy; kolejne (suwak) po niej.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, klucz, proba]);
  return { stan, blad, ponow: () => ustawProbe((n) => n + 1) };
}

function WidokModelu({ model }: { model: Model }) {
  const [poziom] = usePoziomNauki();
  const dalej = cwiczeniePoModelu(model, poziom);
  useKontekstPestki({ klucz: `model:${model.id}`, tytul: model.nazwa, opis: `Uczeń ogląda model „${model.nazwa}” (${model.przedmiot}).` });
  return (
    <>
      {model.id === "parabola" ? <Parabola model={model} /> : model.id === "wyszukiwanie-binarne" ? <Wyszukiwanie model={model} /> : <Parafraza model={model} />}
      <Pytania pytania={model.pytania} />
      <section className={s.sekcja} aria-label="Dalej">
        <Link to={dalej.do} className="btn btn-primary">{dalej.etykieta}</Link>
      </section>
    </>
  );
}

function Pytania({ pytania }: { pytania: string[] }) {
  const [n, ustawN] = useState(0);
  if (!pytania.length) return null;
  return (
    <section className={s.sekcja} aria-label="Pytanie Pestki">
      <PestkaMowi tekst={pytania[n % pytania.length]!}>
        {pytania.length > 1 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => ustawN((x) => x + 1)}>Inne pytanie</button>
        )}
      </PestkaMowi>
    </section>
  );
}

const liczba = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });
/** Liczba z prawdziwym minusem (−), nie łącznikiem. */
const znak = (x: number) => (x < 0 ? `−${liczba.format(-x)}` : liczba.format(x));

/** y = a(x − p)² + q w zapisie ze szkoły: bez „1” przed nawiasem, „x + 3” zamiast „x − −3”, bez „+ 0”. */
function wzorParaboli(a: number, p: number, q: number) {
  const wspolczynnik = a === 1 ? "" : a === -1 ? "−" : znak(a);
  const nawias = p === 0 ? "x²" : `(x ${p < 0 ? "+" : "−"} ${liczba.format(Math.abs(p))})²`;
  const wyraz = q === 0 ? "" : ` ${q < 0 ? "−" : "+"} ${liczba.format(Math.abs(q))}`;
  return a === 0 ? `y = ${znak(q)}` : `y = ${wspolczynnik}${nawias}${wyraz}`;
}
const NAZWY_PARAMETROW: Record<"a" | "p" | "q", string> = { a: "a", p: "p", q: "q" };

function Parabola({ model }: { model: ModelParabola }) {
  const start = { a: model.parametry.a.wartosc, p: model.parametry.p.wartosc, q: model.parametry.q.wartosc };
  const [wartosci, ustaw] = useState(start);
  const { stan, blad, ponow } = useStanModelu<StanParaboli>("parabola", wartosci);
  const id = useId();
  const wzor = wzorParaboli(wartosci.a, wartosci.p, wartosci.q);
  // Wniosek z polskim zapisem liczb (serwer opisuje stan z kropką dziesiętną); dane te same, z odpowiedzi serwera.
  const wniosek = !stan ? "Wykres funkcji kwadratowej" : !stan.wierzcholek
    ? `Funkcja stała: y = ${znak(stan.q)}`
    : `Wierzchołek W(${znak(stan.wierzcholek.x)}; ${znak(stan.wierzcholek.y)}), ramiona ${stan.a > 0 ? "w górę" : "w dół"}`;
  return (
    <>
      <section className={`${s.sekcja} ${w.bezLinii}`} aria-labelledby={`${id}-wykres`}>
        <h2 className="h2" id={`${id}-wykres`}>{wniosek}</h2>
        <p className={w.wzor} aria-live="polite">{wzor}</p>
        <div className={w.obszar}>
          {stan ? (
            <Funkcja punkty={stan.punkty} opis={`${wniosek}. ${wzor}.`} podpisPod={stan.a > 0}
              wyrozniony={stan.wierzcholek && { ...stan.wierzcholek, etykieta: `W(${znak(stan.wierzcholek.x)}; ${znak(stan.wierzcholek.y)})` }} />
          ) : blad ? null : <Ladowanie ile={1} etykieta="Rysuję wykres" />}
        </div>
        {blad != null && <BladPestki blad={blad} ponow={ponow} />}
      </section>
      <section className={s.sekcja} aria-labelledby={`${id}-parametry`}>
        <h2 className="h2" id={`${id}-parametry`}>Parametry</h2>
        <div className={w.suwaki}>
          {(["a", "p", "q"] as const).map((k) => {
            const p = model.parametry[k];
            return (
              <label key={k} className={w.suwak}>
                <span className={w.suwakNazwa}>{NAZWY_PARAMETROW[k]}</span>
                <input type="range" min={p.min} max={p.max} step={p.krok} value={wartosci[k]}
                  onChange={(e) => { const x = e.currentTarget.valueAsNumber; ustaw((v) => ({ ...v, [k]: x })); }} />
                <output className={w.suwakWartosc}>{znak(wartosci[k])}</output>
              </label>
            );
          })}
        </div>
        <button type="button" className={`link small ${w.reset}`} onClick={() => ustaw(start)}>
          <RotateCcw size={15} aria-hidden="true" /> Wróć do początku
        </button>
      </section>
    </>
  );
}

function Wyszukiwanie({ model }: { model: ModelWyszukiwania }) {
  // Do wyboru liczby z tablicy i jedna spoza niej: wtedy widać, co algorytm zwraca, gdy nie znajdzie.
  const brak = (() => {
    let x = model.tablica[Math.floor(model.tablica.length / 2)]! + 1;
    while (model.tablica.includes(x)) x++;
    return x;
  })();
  const opcje = [...model.tablica, brak].sort((a, b) => a - b);
  const [szukana, ustawSzukana] = useState(model.szukana);
  const [krok, ustawKrok] = useState(0);
  const { stan, blad, ponow } = useStanModelu<StanWyszukiwania>("wyszukiwanie-binarne", { tablica: model.tablica, szukana }, 0);
  const id = useId();
  const kroki = stan?.szukana === szukana ? stan.kroki : [];
  const k = kroki[Math.min(krok, kroki.length - 1)];
  const ostatni = kroki.length > 0 && krok >= kroki.length - 1;
  const wniosek = !k ? "Wyszukiwanie binarne" : ostatni
    ? stan!.indeks !== null ? `Znalezione na pozycji ${stan!.indeks + 1} po ${kroki.length} porównaniach` : `Liczby ${szukana} nie ma: zakres się wyczerpał po ${kroki.length} porównaniach`
    : `Krok ${krok + 1} z ${kroki.length}`;
  return (
    <>
      <section className={`${s.sekcja} ${w.bezLinii}`} aria-labelledby={`${id}-szukana`}>
        <h2 className="h2" id={`${id}-szukana`}>Czego szukamy?</h2>
        <Pigulki role="group" aria-label="Szukana liczba">
          {opcje.map((x) => (
            <button key={x} type="button" className="pigulka" aria-pressed={x === szukana} onClick={() => { ustawSzukana(x); ustawKrok(0); }}>
              {x}{x === brak && <span className="visually-hidden"> (nie ma w tablicy)</span>}
            </button>
          ))}
        </Pigulki>
      </section>
      <section className={s.sekcja} aria-labelledby={`${id}-kroki`}>
        <h2 className="h2" id={`${id}-kroki`}>{wniosek}</h2>
        {blad != null && <BladPestki blad={blad} ponow={ponow} />}
        {!k && !blad && <Ladowanie ile={1} etykieta="Liczę kroki" />}
        {k && (
          <>
            <ol className={w.tablica} aria-label="Tablica">
              {model.tablica.map((x, i) => {
                const poza = i < k.lewy || i > k.prawy;
                const srodek = i === k.srodek;
                return (
                  <li key={i} className={w.komorka} data-poza={poza || undefined} data-srodek={srodek || undefined}
                    data-trafione={srodek && k.wynik === "znaleziono" ? "" : undefined}>
                    <span className={w.komorkaWartosc}>{x}</span>
                    <span className={w.komorkaIndeks} aria-hidden="true">{i + 1}</span>
                    <span className="visually-hidden">{`, pozycja ${i + 1}${poza ? ", odrzucona" : ""}${srodek ? ", porównywana" : ""}`}</span>
                  </li>
                );
              })}
            </ol>
            <p className={w.opisKroku} aria-live="polite">
              {k.opis} {k.wynik === "znaleziono" ? "To ta liczba." : k.wynik === "szukaj-po-prawej" ? `${k.wartosc} < ${szukana}, więc szukamy po prawej.` : `${k.wartosc} > ${szukana}, więc szukamy po lewej.`}
            </p>
            <div className={w.krokowanie}>
              <button type="button" className="btn btn-ghost btn-sm" disabled={krok === 0} onClick={() => ustawKrok((n) => n - 1)}>
                <ChevronLeft size={16} aria-hidden="true" /> Wstecz
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={ostatni} onClick={() => ustawKrok((n) => n + 1)}>
                Następny krok <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function Parafraza({ model }: { model: ModelParafrazy }) {
  const [fragment, ustawFragment] = useState<string | null>(null);
  const { stan, blad, ponow } = useStanModelu<StanParafrazy>("tekst-parafraza", fragment ? { fragment } : {}, 0);
  const id = useId();
  const werdykt = useRef<HTMLParagraphElement>(null);
  const oceniony = fragment && stan && "zgodny" in stan && stan.zgodny !== undefined ? stan : null;
  useEffect(() => {
    if (oceniony) werdykt.current?.focus();
  }, [oceniony]);
  return (
    <>
      <section className={`${s.sekcja} ${w.bezLinii}`} aria-labelledby={`${id}-parafraza`}>
        <h2 className="h2" id={`${id}-parafraza`}>Które zdanie mówi to samo?</h2>
        {stan && <p className={w.parafraza}>{stan.parafraza}</p>}
        {!stan && !blad && <Ladowanie ile={2} etykieta={`Wczytuję ${model.nazwa.toLowerCase()}`} />}
        {blad != null && <BladPestki blad={blad} ponow={ponow} />}
      </section>
      {stan && (
        <section className={s.sekcja} aria-labelledby={`${id}-tekst`}>
          <h2 className="h2" id={`${id}-tekst`}>Tekst</h2>
          <div className={w.fragmenty} role="group" aria-label="Fragmenty tekstu">
            {stan.fragmenty.map((f) => {
              const wybrany = f.id === fragment;
              const ocena = wybrany && oceniony ? (oceniony.zgodny ? "dobrze" : "zle") : undefined;
              return (
                <button key={f.id} type="button" className={w.fragment} aria-pressed={wybrany} data-ocena={ocena}
                  onClick={() => ustawFragment(f.id)}>
                  {f.tekst}
                </button>
              );
            })}
          </div>
          {oceniony && (
            <p ref={werdykt} tabIndex={-1} className={w.werdykt} data-ocena={oceniony.zgodny ? "dobrze" : "zle"}>
              <strong>{oceniony.zgodny ? "Tak, to ta parafraza." : "To nie ten fragment."}</strong>{" "}
              {oceniony.zgodny ? oceniony.objasnienie : "Szukaj zdania, które mówi o tym samym innymi słowami."}
            </p>
          )}
        </section>
      )}
    </>
  );
}
