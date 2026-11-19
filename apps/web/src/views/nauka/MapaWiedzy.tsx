// Mapa wiedzy (paczka 9 pkt 6): notatki ucznia jako węzły, połączenia między nimi. Pestka proponuje połączenia
// (nauka-ai, mapa-wiedzy-polaczenia, najświeższe notatki przedmiotu), uczeń je przyjmuje albo odrzuca. Graf na
// szerokim ekranie, a lista notatek wszędzie (na telefonie zamiast grafu). Dane: nauka/wiedza.ts.
import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type Ref } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, ChevronRight, MessageCircle, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { useProfil } from "../../auth";
import { BladPestki } from "../../components/BladPestki";
import { Ladowanie } from "../../components/Ladowanie";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Pigulki } from "../../components/Pigulki";
import { StanPestki } from "../../components/StanPestki";
import { useTutor } from "../../components/TutorContext";
import { SubjectIcon } from "../../components/icons";
import { przedmiot as daneP, PRZEDMIOTY, type PrzedmiotId } from "../../konto/przedmioty";
import { naukaAi } from "../../nauka/ai";
import { useZapytanieNauki } from "../../nauka/stan";
import {
  BladWiedzy, doPolaczen, dodajNotatke, LIMIT_TRESCI, LIMIT_TYTULU, pobierzMape, przyjmijPolaczenie, usunNotatke, usunPolaczenie, zmienNotatke,
  type MapaWiedzy as Mapa, type Notatka, type Polaczenie,
} from "../../nauka/wiedza";
import s from "./SzybkaRunda.module.css";
import m from "./MapaWiedzy.module.css";

const czyPrzedmiot = (w: unknown): w is PrzedmiotId => PRZEDMIOTY.some((p) => p.id === w);
const komunikat = (e: unknown) => (e instanceof BladWiedzy ? e.message : "Coś poszło nie tak. Spróbuj ponownie.");
const notatki = (n: number) => (n === 1 ? "notatka" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "notatki" : "notatek");
const polaczen = (n: number) => (n === 1 ? "połączenie" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "połączenia" : "połączeń");

export function MapaWiedzy() {
  const [params, ustawParams] = useSearchParams();
  const profil = useProfil();
  const moje = (profil?.subjects ?? []).map((p) => p.id).filter(czyPrzedmiot);
  const lista = moje.length ? moje : PRZEDMIOTY.map((p) => p.id);
  const zParametru = params.get("przedmiot");
  const przedmiot: PrzedmiotId = czyPrzedmiot(zParametru) ? zParametru : lista[0]!;
  const mapa = useZapytanieNauki(`wiedza:${przedmiot}`, (signal) => pobierzMape(przedmiot, signal));

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: "/nauka", nazwa: "Nauka" }} tytul="Mapa wiedzy" lead="Twoje notatki i to, co je łączy.">
        {lista.length > 1 && (
          <Pigulki role="group" aria-label="Przedmiot">
            {lista.map((p) => (
              <button key={p} type="button" className="pigulka" aria-pressed={p === przedmiot}
                onClick={() => ustawParams({ przedmiot: p }, { replace: true })}>
                <SubjectIcon subject={daneP(p)!} size="sm" />
                {daneP(p)!.nazwa}
              </button>
            ))}
          </Pigulki>
        )}
      </NaglowekStrony>
      {mapa.stan === "ladowanie" || mapa.stan === "pominiete" ? (
        <Ladowanie ile={4} etykieta="Wczytuję notatki" />
      ) : mapa.stan === "blad" ? (
        <StanPestki emocja="zmartwienie" rozmiar="maly" rola="alert" tekst={mapa.blad ?? "Nie udało się wczytać notatek."}
          akcja={{ etykieta: "Spróbuj ponownie", onClick: mapa.ponow }} />
      ) : (
        <Widok key={przedmiot} przedmiot={przedmiot} mapa={mapa.dane!} odswiez={mapa.ponow} />
      )}
    </main>
  );
}

function Widok({ przedmiot, mapa, odswiez }: { przedmiot: PrzedmiotId; mapa: Mapa; odswiez: () => void }) {
  const { aiGotowe, open } = useTutor();
  const [wybrana, ustawWybrana] = useState<string | null>(null);
  const [edycja, ustawEdycje] = useState(false);
  const [blad, ustawBlad] = useState<string | null>(null);
  const [czeka, ustawCzeka] = useState(false);
  const [bladPestki, ustawBladPestki] = useState<unknown>(null);
  const [puste, ustawPuste] = useState(false);
  const formularz = useRef<HTMLInputElement>(null);
  const id = useId();
  const poId = useMemo(() => new Map(mapa.notatki.map((n) => [n.id, n])), [mapa.notatki]);
  const przyjete = mapa.polaczenia.filter((p) => p.status === "accepted");
  const propozycje = mapa.polaczenia.filter((p) => p.status === "proposed" && poId.has(p.first_id) && poId.has(p.second_id));
  const notatka = wybrana ? poId.get(wybrana) ?? null : null;
  const mozePestka = mapa.notatki.length >= 2 && aiGotowe !== false;

  // Każda zmiana idzie od razu do bazy, a lista odświeża się z niej (bez lokalnej kopii, która mogłaby się rozjechać).
  async function wykonaj(dzialanie: () => Promise<unknown>) {
    ustawBlad(null);
    try {
      await dzialanie();
      odswiez();
      return true;
    } catch (e) {
      ustawBlad(komunikat(e));
      return false;
    }
  }

  async function poprosPestke() {
    ustawCzeka(true);
    ustawBladPestki(null);
    ustawPuste(false);
    try {
      const nowe = await naukaAi.polaczeniaWiedzy(doPolaczen(mapa.notatki));
      ustawPuste(nowe.length === 0);
      odswiez();
    } catch (e) {
      ustawBladPestki(e);
    } finally {
      ustawCzeka(false);
    }
  }

  const nazwa = (nid: string) => poId.get(nid)?.title ?? "notatka";
  const wniosek = !mapa.notatki.length ? "Jeszcze nie ma notatek"
    : `${mapa.notatki.length} ${notatki(mapa.notatki.length)}, ${przyjete.length} ${polaczen(przyjete.length)}`;

  return (
    <>
      {blad && <p className={m.blad} role="alert">{blad}</p>}

      {mapa.notatki.length === 0 ? (
        <section className={`${s.sekcja} ${m.bezLinii}`} aria-label="Pusta mapa">
          <StanPestki tekst="Zapisz pierwszą notatkę: definicję, wzór albo regułę. Gdy będą co najmniej dwie, poszukam, co je łączy." />
        </section>
      ) : (
        <section className={`${s.sekcja} ${m.bezLinii}`} aria-labelledby={`${id}-mapa`}>
          <h2 className="h2" id={`${id}-mapa`}>{wniosek}</h2>
          {mapa.notatki.length >= 2 && (
            <Graf notatki={mapa.notatki} przyjete={przyjete} propozycje={propozycje} wybrana={wybrana} wybierz={(n) => { ustawWybrana(n); ustawEdycje(false); }} />
          )}
          <ul className={`wiersze ${m.lista}`}>
            {mapa.notatki.map((n) => {
              const ile = przyjete.filter((p) => p.first_id === n.id || p.second_id === n.id).length;
              return (
                <li key={n.id}>
                  <button type="button" className={`wiersz ${m.wiersz}`} aria-pressed={n.id === wybrana} onClick={() => { ustawWybrana(n.id === wybrana ? null : n.id); ustawEdycje(false); }}>
                    <span className="wiersz-tresc">
                      <span className="h3">{n.title}</span>
                      <span className="wiersz-opis">{ile ? `${ile} ${polaczen(ile)}` : "bez połączeń"}</span>
                    </span>
                    <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" className={m.strzalka} /></span>
                  </button>
                  {n.id === wybrana && notatka && (edycja ? (
                    <FormularzNotatki poczatek={notatka} etykieta="Zapisz zmiany" glowny={false}
                      zapisz={(t, b) => wykonaj(() => zmienNotatke(notatka.id, t, b)).then((ok) => { if (ok) ustawEdycje(false); return ok; })}
                      anuluj={() => ustawEdycje(false)} />
                  ) : (
                    <SzczegolyNotatki notatka={notatka} polaczenia={przyjete.filter((p) => p.first_id === notatka.id || p.second_id === notatka.id)}
                      nazwa={nazwa} ai={aiGotowe !== false}
                      zapytaj={() => open({ klucz: `notatka:${notatka.id}`, tytul: notatka.title, opis: `Notatka ucznia z mapy wiedzy (${daneP(przedmiot)?.nazwa}): „${notatka.title}”. ${notatka.body}`.slice(0, 1200) })}
                      edytuj={() => ustawEdycje(true)}
                      usun={() => { if (window.confirm(`Usunąć notatkę „${notatka.title}” razem z jej połączeniami?`)) void wykonaj(() => usunNotatke(notatka.id)).then(() => ustawWybrana(null)); }}
                      rozlacz={(p) => void wykonaj(() => usunPolaczenie(p))} />
                  ))}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {mapa.notatki.length >= 2 && (
        <section className={s.sekcja} aria-labelledby={`${id}-propozycje`}>
          <h2 className="h2" id={`${id}-propozycje`}>{propozycje.length ? `Pestka widzi ${propozycje.length} ${polaczen(propozycje.length)}` : "Co łączy twoje notatki?"}</h2>
          {propozycje.length > 0 && (
            <ul className="wiersze">
              {propozycje.map((p) => (
                <li key={`${p.first_id}:${p.second_id}`} className={`wiersz ${m.propozycja}`}>
                  <span className="wiersz-tresc">
                    <span className="h3">{nazwa(p.first_id)} <span aria-hidden="true">↔</span><span className="visually-hidden"> i </span> {nazwa(p.second_id)}</span>
                    {p.label && <span className="wiersz-opis">{p.label}</span>}
                  </span>
                  <span className={`wiersz-akcja ${m.decyzja}`}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void wykonaj(() => przyjmijPolaczenie(p))}>
                      <Check size={16} aria-hidden="true" /> Przyjmij
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void wykonaj(() => usunPolaczenie(p))}>
                      <X size={16} aria-hidden="true" /> Odrzuć
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {puste && <p className="small muted" role="status">Tym razem nie widzę nowych połączeń. Dopisz notatkę i spróbuj znowu.</p>}
          {bladPestki != null && <BladPestki blad={bladPestki} ponow={() => void poprosPestke()} />}
          {mozePestka ? (
            <div>
              <button type="button" className={`btn ${propozycje.length ? "btn-ghost" : "btn-primary"}`} disabled={czeka} onClick={() => void poprosPestke()}>
                <Sparkles size={18} aria-hidden="true" /> {czeka ? "Pestka szuka połączeń…" : "Poproś Pestkę o połączenia"}
              </button>
            </div>
          ) : aiGotowe === false && <p className="small muted">Połączenia proponuje Pestka, a na tym koncie nie ma jeszcze modelu.</p>}
        </section>
      )}

      <section className={s.sekcja} aria-labelledby={`${id}-nowa`}>
        <h2 className="h2" id={`${id}-nowa`}>Nowa notatka</h2>
        <FormularzNotatki key={mapa.notatki.length} poleRef={formularz} etykieta="Zapisz notatkę" glowny={mapa.notatki.length < 2}
          zapisz={(t, b) => wykonaj(() => dodajNotatke(przedmiot, t, b))} />
      </section>
    </>
  );
}

function SzczegolyNotatki({ notatka, polaczenia, nazwa, ai, zapytaj, edytuj, usun, rozlacz }: {
  notatka: Notatka; polaczenia: Polaczenie[]; nazwa: (id: string) => string; ai: boolean;
  zapytaj: () => void; edytuj: () => void; usun: () => void; rozlacz: (p: Polaczenie) => void;
}) {
  return (
    <div className={m.szczegoly}>
      {notatka.body ? <p className={m.tresc}>{notatka.body}</p> : <p className="small muted">Bez treści.</p>}
      {polaczenia.length > 0 && (
        <ul className={m.polaczenia} aria-label="Połączenia">
          {polaczenia.map((p) => {
            const inna = p.first_id === notatka.id ? p.second_id : p.first_id;
            return (
              <li key={inna}>
                <span><span aria-hidden="true">↔</span> {nazwa(inna)}{p.label && <span className="muted"> · {p.label}</span>}</span>
                <button type="button" className={m.ikona} aria-label={`Usuń połączenie z „${nazwa(inna)}”`} title="Usuń połączenie" onClick={() => rozlacz(p)}>
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className={m.akcje}>
        {ai && <button type="button" className="btn btn-secondary btn-sm" onClick={zapytaj}><MessageCircle size={16} aria-hidden="true" /> Zapytaj Pestkę o to</button>}
        <button type="button" className="btn btn-ghost btn-sm" onClick={edytuj}><Pencil size={16} aria-hidden="true" /> Zmień</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={usun}><Trash2 size={16} aria-hidden="true" /> Usuń</button>
      </div>
    </div>
  );
}

function FormularzNotatki({ poczatek, etykieta, glowny, zapisz, anuluj, poleRef }: {
  poczatek?: Notatka; etykieta: string; glowny: boolean;
  zapisz: (tytul: string, tresc: string) => Promise<boolean>; anuluj?: () => void; poleRef?: Ref<HTMLInputElement>;
}) {
  const [tytul, ustawTytul] = useState(poczatek?.title ?? "");
  const [tresc, ustawTresc] = useState(poczatek?.body ?? "");
  const [zapisuje, ustawZapisuje] = useState(false);
  const id = useId();
  async function wyslij(e: FormEvent) {
    e.preventDefault();
    if (!tytul.trim() || zapisuje) return;
    ustawZapisuje(true);
    const ok = await zapisz(tytul, tresc);
    ustawZapisuje(false);
    if (ok && !poczatek) {
      ustawTytul("");
      ustawTresc("");
    }
  }
  const naEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && anuluj) anuluj();
  };
  return (
    <form className={m.formularz} onSubmit={(e) => void wyslij(e)} onKeyDown={naEscape}>
      <label className={m.pole} htmlFor={`${id}-t`}>
        <span className="label">Pojęcie</span>
        <input id={`${id}-t`} ref={poleRef} className="input" value={tytul} maxLength={LIMIT_TYTULU} required
          placeholder="np. Parafraza" onChange={(e) => ustawTytul(e.currentTarget.value)} />
      </label>
      <label className={m.pole} htmlFor={`${id}-b`}>
        <span className="label">Notatka</span>
        <textarea id={`${id}-b`} className={`input ${m.obszar}`} value={tresc} maxLength={LIMIT_TRESCI} rows={3}
          placeholder="Własnymi słowami: co to jest i kiedy się przydaje." onChange={(e) => ustawTresc(e.currentTarget.value)} />
      </label>
      <div className={m.akcje}>
        <button type="submit" className={`btn ${glowny ? "btn-primary" : "btn-secondary"}`} disabled={!tytul.trim() || zapisuje}>{etykieta}</button>
        {anuluj && <button type="button" className="btn btn-ghost" onClick={anuluj}>Anuluj</button>}
      </div>
    </form>
  );
}

// Graf: notatki na okręgu (stałe miejsca, więc nic nie skacze po odświeżeniu), przyjęte połączenia linią, propozycje
// Pestki przerywaną. Węzły to przyciski; wybrany węzeł otwiera notatkę na liście pod grafem.
function Graf({ notatki, przyjete, propozycje, wybrana, wybierz }: {
  notatki: Notatka[]; przyjete: Polaczenie[]; propozycje: Polaczenie[]; wybrana: string | null; wybierz: (id: string | null) => void;
}) {
  const W = 640;
  const H = Math.min(420, 220 + notatki.length * 10);
  const r = Math.min(W, H) / 2 - 48;
  const kolejne = [...notatki].sort((a, b) => a.title.localeCompare(b.title, "pl"));
  const miejsce = new Map(kolejne.map((n, i) => {
    const kat = (i / kolejne.length) * Math.PI * 2 - Math.PI / 2;
    return [n.id, { x: W / 2 + Math.cos(kat) * r * 1.35, y: H / 2 + Math.sin(kat) * r, kat }];
  }));
  const linia = (p: Polaczenie) => {
    const a = miejsce.get(p.first_id);
    const b = miejsce.get(p.second_id);
    return a && b ? { x1: a.x, y1: a.y, x2: b.x, y2: b.y } : null;
  };
  const opis = `Mapa: ${notatki.length} ${notatki.length === 1 ? "notatka" : "notatek"}, ${przyjete.length} połączeń, ${propozycje.length} propozycji Pestki.`;
  const skrot = (t: string) => (t.length > 22 ? `${t.slice(0, 21)}…` : t);
  return (
    <svg className={m.graf} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={opis}>
      {propozycje.map((p) => {
        const l = linia(p);
        return l && <line key={`p${p.first_id}${p.second_id}`} className={m.krawedzPropozycja} {...l} />;
      })}
      {przyjete.map((p) => {
        const l = linia(p);
        const aktywna = wybrana && (p.first_id === wybrana || p.second_id === wybrana);
        return l && <line key={`a${p.first_id}${p.second_id}`} className={m.krawedz} data-aktywna={aktywna || undefined} {...l}><title>{p.label}</title></line>;
      })}
      {kolejne.map((n) => {
        const p = miejsce.get(n.id)!;
        const prawo = Math.cos(p.kat) >= -0.01;
        return (
          <g key={n.id} className={m.wezel} data-wybrany={n.id === wybrana || undefined} role="button" tabIndex={0} aria-pressed={n.id === wybrana}
            aria-label={n.title} onClick={() => wybierz(n.id === wybrana ? null : n.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); wybierz(n.id === wybrana ? null : n.id); } }}>
            <circle cx={p.x} cy={p.y} r={14} className={m.wezelCel} />
            <circle cx={p.x} cy={p.y} r={7} className={m.wezelKropka} />
            <text x={p.x + (prawo ? 12 : -12)} y={p.y + 4} textAnchor={prawo ? "start" : "end"} className={m.wezelNazwa}>{skrot(n.title)}</text>
          </g>
        );
      })}
    </svg>
  );
}
