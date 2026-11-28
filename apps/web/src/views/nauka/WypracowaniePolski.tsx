// Ćwiczenie wypracowania z polskiego w czterech krokach: temat od Pestki, plan z jej pytaniami, pisanie z planem obok
// i ocena według kryteriów CKE. Logika i zapytania do modelu w nauka/wypracowanie.ts, szkic w pamięci przeglądarki.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, Plus, RefreshCw, Sparkles } from "lucide-react";
import { useSession } from "../../auth";
import { liczSlowa } from "../../arkusze/sprawdz";
import { BladPestki, BrakPestki } from "../../components/BladPestki";
import { Ladowanie } from "../../components/Ladowanie";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Pigulki } from "../../components/Pigulki";
import { useKontekstPestki, useTutor } from "../../components/TutorContext";
import { Wypracowanie } from "../../components/Wypracowanie";
import { czyPrzerwane } from "../../nauka/ai";
import {
  EPOKI, KRYTERIA_OCENY, KRYTERIA_PLANU, MAX_PUNKTOW, MIN_SLOW, generujTemat, nazwaLektury, ocenWypracowanie, pustyPlan,
  sprawdzPlan, sumaPunktow, tematZapasowy, wczytajLektury, wczytajSzkic, zapiszSzkic,
  type Etap, type Lektura, type Ocena, type Plan, type Szkic,
} from "../../nauka/wypracowanie";
import { Liczba } from "../../ruch";
import { PestkaMowi } from "./PestkaRundy";
import s from "./SzybkaRunda.module.css";
import k from "./KrokPoKroku.module.css";
import w from "./WypracowaniePolski.module.css";

const ETAPY: { id: Etap; nazwa: string }[] = [
  { id: "temat", nazwa: "Temat" },
  { id: "plan", nazwa: "Plan" },
  { id: "pisanie", nazwa: "Pisanie" },
  { id: "ocena", nazwa: "Ocena" },
];
const STATUS = { dobrze: "Spełnione", "do-poprawy": "Do poprawy", "do-zrobienia": "Czeka", niepewne: "Do doprecyzowania" } as const;
const ZAKRES: [number, number] = [MIN_SLOW, Infinity];

export function WypracowaniePolski() {
  const session = useSession();
  return session ? <Cwiczenie key={session.user.id} user={session.user.id} /> : null;
}

function useLektury() {
  const [lektury, ustaw] = useState<Lektura[] | null>(null);
  useEffect(() => {
    let aktualne = true;
    void wczytajLektury().then((l) => aktualne && ustaw(l), () => aktualne && ustaw([]));
    return () => { aktualne = false; };
  }, []);
  return lektury;
}

function Cwiczenie({ user }: { user: string }) {
  const [szkic, ustawSzkic] = useState<Szkic>(() => wczytajSzkic(user));
  const lektury = useLektury();
  const naglowekKroku = useRef<HTMLDivElement>(null);
  const pierwszy = useRef(true);

  useEffect(() => zapiszSzkic(user, szkic), [user, szkic]);

  const zmien = (z: Partial<Szkic> | ((s: Szkic) => Partial<Szkic>)) => ustawSzkic((s) => ({ ...s, ...(typeof z === "function" ? z(s) : z) }));
  const idzDo = (etap: Etap) => zmien({ etap });

  // Nowy krok zaczyna się od góry, a czytnik ekranu ląduje na jego treści.
  useEffect(() => {
    if (pierwszy.current) {
      pierwszy.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    naglowekKroku.current?.focus({ preventScroll: true });
  }, [szkic.etap]);

  const lektura = lektury?.find((l) => l.id === szkic.plan.lektura);
  const temat = szkic.temat?.tekst ?? "";
  const planTekst = opisPlanuDlaPestki(szkic.plan, lektura);
  useKontekstPestki({
    klucz: `wypracowanie-polski:${szkic.etap}`,
    tytul: `wypracowaniu z polskiego, krok: ${ETAPY.find((e) => e.id === szkic.etap)?.nazwa.toLowerCase()}`,
    przedmiot: "polski",
    maProbe: !!szkic.tekst.trim() || !!szkic.plan.stanowisko.trim(),
    opis: [
      "Ćwiczenie wypracowania (matura z polskiego, poziom podstawowy).",
      temat ? `Temat: ${temat}` : "Temat jeszcze nie wybrany.",
      szkic.etap !== "temat" ? `Plan ucznia:\n${planTekst}` : "",
      szkic.etap === "pisanie" || szkic.etap === "ocena" ? `Tekst ucznia:\n${szkic.tekst}` : "",
      szkic.etap === "ocena" && szkic.ocena ? `Ocena Pestki: ${sumaPunktow(szkic.ocena)}/${MAX_PUNKTOW} pkt. ${szkic.ocena.podsumowanie}` : "",
      "Pomagaj pytaniami i wskazówkami. Nie pisz wypracowania, tezy ani argumentów za ucznia.",
    ].filter(Boolean).join("\n"),
  });

  const dostepny = (e: Etap) => e === "temat" || (e === "ocena" ? !!szkic.ocena : !!szkic.temat);

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: "/nauka?przedmiot=polski", nazwa: "Nauka" }} tytul="Wypracowanie" />

      <Pigulki role="group" aria-label="Krok" className={w.kroki}>
        {ETAPY.map((e, i) => (
          <button key={e.id} type="button" className="pigulka" aria-pressed={e.id === szkic.etap} disabled={!dostepny(e.id)} onClick={() => idzDo(e.id)}>
            <span className={w.nrKroku} aria-hidden="true">{i + 1}</span> {e.nazwa}
          </button>
        ))}
      </Pigulki>

      <div key={szkic.etap} ref={naglowekKroku} tabIndex={-1} className={w.krok}
        aria-label={ETAPY.find((e) => e.id === szkic.etap)?.nazwa}>
        {szkic.etap === "temat" && <KrokTemat szkic={szkic} lektury={lektury} zmien={zmien} />}
        {szkic.etap === "plan" && szkic.temat && <KrokPlan szkic={szkic} lektury={lektury} lektura={lektura} zmien={zmien} />}
        {szkic.etap === "pisanie" && szkic.temat && <KrokPisanie szkic={szkic} lektura={lektura} zmien={zmien} />}
        {szkic.etap === "ocena" && szkic.temat && <KrokOcena szkic={szkic} lektura={lektura} zmien={zmien} />}
      </div>
    </main>
  );
}

type Zmien = (z: Partial<Szkic> | ((s: Szkic) => Partial<Szkic>)) => void;

function opisPlanuDlaPestki(plan: Plan, lektura?: Lektura) {
  return [
    `Lektura obowiązkowa: ${lektura ? nazwaLektury(lektura) : "(nie wybrano)"}`,
    `Stanowisko: ${plan.stanowisko}`,
    ...plan.argumenty.map((a, i) => `Argument ${i + 1}: ${a}`),
    `Konteksty: ${plan.konteksty}`,
  ].join("\n");
}

const pustaPraca = (sz: Szkic) => !sz.tekst.trim() && !sz.plan.stanowisko.trim() && !sz.plan.argumenty.some((a) => a.trim());

function KrokTemat({ szkic, lektury, zmien }: { szkic: Szkic; lektury: Lektura[] | null; zmien: Zmien }) {
  const { aiGotowe } = useTutor();
  const [laduje, ustawLaduje] = useState(false);
  const [blad, ustawBlad] = useState<unknown>(null);
  const [pytaj, ustawPytaj] = useState(false);
  const trwa = useRef(false);
  const { temat, wybor } = szkic;

  async function nowy(zWyborem = wybor) {
    if (trwa.current || !lektury) return;
    ustawPytaj(false);
    ustawBlad(null);
    const byly = szkic.temat ? [...szkic.byly, szkic.temat.tekst].slice(-12) : szkic.byly;
    const ustawTemat = (t: NonNullable<Szkic["temat"]>) => zmien({
      temat: t, byly, plan: pustyPlan(zWyborem.lektura || t.lektury[0] || ""), tekst: "", uwagiPlanu: null, ocena: null, ocenionyTekst: "",
    });
    if (aiGotowe === false) return ustawTemat(tematZapasowy(byly));
    trwa.current = true;
    ustawLaduje(true);
    try {
      ustawTemat(await generujTemat(lektury, { epoka: zWyborem.epoka, lektura: zWyborem.lektura, byly }));
    } catch (e) {
      if (!czyPrzerwane(e)) ustawBlad(e);
    } finally {
      trwa.current = false;
      ustawLaduje(false);
    }
  }

  // Pierwsze wejście: temat układa się sam, bez klikania.
  useEffect(() => {
    if (!temat && lektury && aiGotowe !== undefined) void nowy();
  }, [lektury, aiGotowe]);

  function zawez(z: Partial<Szkic["wybor"]>) {
    const nowyWybor = { ...wybor, ...z };
    zmien({ wybor: nowyWybor });
    if (pustaPraca(szkic)) void nowy(nowyWybor);
  }

  function inny() {
    if (pustaPraca(szkic)) void nowy();
    else ustawPytaj(true);
  }

  const polecane = (temat?.lektury ?? []).map((id) => lektury?.find((l) => l.id === id)).filter((l): l is Lektura => !!l);
  const lekturyEpoki = (lektury ?? []).filter((l) => !wybor.epoka || l.epoka === wybor.epoka);

  return (
    <div className={w.waski}>
      <PestkaMowi
        tekst={laduje ? "Układam temat…" : blad ? "Nie udało się ułożyć tematu." : temat ? "Taki temat mógłby być na maturze. Bierzesz?" : "Zaraz dostaniesz temat."}
        emocja={laduje || (!temat && !blad) ? "thinking" : undefined}
      />

      <section className={`karta ${w.tematKarta}`} aria-live="polite" aria-busy={laduje}>
        <span className="kicker"><Sparkles size={15} aria-hidden="true" /> Temat</span>
        {laduje || !temat ? (
          <Ladowanie ksztalt="tekst" ile={2} etykieta="Pestka układa temat" opoznienie={0} />
        ) : (
          <div key={temat.tekst} className={w.tematTresc}>
            <p className={`h1 ${w.tematTekst}`}>{temat.tekst}</p>
            <ul className={w.wymogi}>
              <li>lektura obowiązkowa</li>
              <li>inny utwór literacki</li>
              <li>wybrane konteksty</li>
              <li>min. {MIN_SLOW} wyrazów</li>
            </ul>
            {polecane.length > 0 && (
              <p className="small muted">Pasuje na przykład: {polecane.map((l) => l.tytul).join(", ")}</p>
            )}
          </div>
        )}
      </section>

      {blad !== null && <BladPestki blad={blad} ponow={() => void nowy()} />}
      {aiGotowe === false && <BrakPestki tekst="Pestka jest niedostępna, więc temat pochodzi z arkusza CKE." />}

      {pytaj ? (
        <div className={w.pytanie} role="alert">
          <p>Nowy temat wyczyści plan i tekst.</p>
          <div className={s.akcje}>
            <button type="button" className="btn btn-primary" onClick={() => void nowy()}>Nowy temat</button>
            <button type="button" className="btn btn-ghost" onClick={() => ustawPytaj(false)}>Zostań przy tym</button>
          </div>
        </div>
      ) : (
        <div className={s.akcje}>
          <button type="button" className="btn btn-primary" disabled={!temat || laduje}
            onClick={() => zmien((sz) => ({ etap: "plan", plan: sz.plan.lektura ? sz.plan : { ...sz.plan, lektura: sz.temat?.lektury[0] ?? "" } }))}>
            Piszę na ten temat
          </button>
          <button type="button" className="btn btn-ghost" disabled={laduje || !lektury} onClick={inny}>
            <RefreshCw size={17} aria-hidden="true" /> Inny temat
          </button>
        </div>
      )}

      <section className={s.sekcja} aria-labelledby="zawez">
        <h2 className="label" id="zawez">Zawęź temat</h2>
        <div className={w.wybory}>
          <label className={w.pole}>
            <span className="small muted">Epoka</span>
            <select className="select" value={wybor.epoka} disabled={laduje}
              onChange={(e) => zawez({ epoka: e.currentTarget.value, lektura: "" })}>
              <option value="">Dowolna</option>
              {EPOKI.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <label className={w.pole}>
            <span className="small muted">Lektura</span>
            <select className="select" value={wybor.lektura} disabled={laduje || !lektury}
              onChange={(e) => zawez({ lektura: e.currentTarget.value })}>
              <option value="">Dowolna</option>
              {lekturyEpoki.map((l) => <option key={l.id} value={l.id}>{nazwaLektury(l)}</option>)}
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}

function KrokPlan({ szkic, lektury, lektura, zmien }: { szkic: Szkic; lektury: Lektura[] | null; lektura?: Lektura; zmien: Zmien }) {
  const { aiGotowe } = useTutor();
  const [sprawdza, ustawSprawdza] = useState(false);
  const [blad, ustawBlad] = useState<unknown>(null);
  const trwa = useRef<AbortController | null>(null);
  const listaUwag = useRef<HTMLHeadingElement>(null);
  const { plan, uwagiPlanu: uwagi } = szkic;
  const temat = szkic.temat!;
  useEffect(() => () => trwa.current?.abort(), []);

  const ustawPlan = (p: Partial<Plan>) => zmien((sz) => ({ plan: { ...sz.plan, ...p } }));
  const ustawArgument = (i: number, t: string) => ustawPlan({ argumenty: plan.argumenty.map((a, j) => (j === i ? t : a)) });
  const gotowy = !!plan.stanowisko.trim() && !!plan.argumenty[0]?.trim();

  async function sprawdz() {
    if (trwa.current || !gotowy) return;
    const ctrl = new AbortController();
    trwa.current = ctrl;
    ustawSprawdza(true);
    ustawBlad(null);
    try {
      const u = await sprawdzPlan(temat.tekst, plan, lektura, ctrl.signal);
      zmien({ uwagiPlanu: u });
      requestAnimationFrame(() => listaUwag.current?.focus());
    } catch (e) {
      if (!ctrl.signal.aborted && !czyPrzerwane(e)) ustawBlad(e);
    } finally {
      if (trwa.current === ctrl) trwa.current = null;
      if (!ctrl.signal.aborted) ustawSprawdza(false);
    }
  }

  const polecane = new Set(temat.lektury);
  const PODPISY = ["lektura obowiązkowa", "inny utwór literacki", "dowolny utwór albo kontekst"];
  const zPestka = aiGotowe !== false;

  return (
    <div className={w.waski}>
      <p className={w.tematMaly}><span className="label">Temat</span> {temat.tekst}</p>

      <section className={`${s.sekcja} ${k.bezLinii}`} aria-label="Plan">
        <div className={k.formularz}>
          <label className={k.pole}>
            <span className="small muted">Lektura obowiązkowa</span>
            <select className="select" value={plan.lektura} disabled={!lektury} onChange={(e) => ustawPlan({ lektura: e.currentTarget.value })}>
              <option value="">Wybierz lekturę</option>
              {lektury && polecane.size > 0 && (
                <optgroup label="Pasują do tematu">
                  {lektury.filter((l) => polecane.has(l.id)).map((l) => <option key={l.id} value={l.id}>{nazwaLektury(l)}</option>)}
                </optgroup>
              )}
              {EPOKI.map((e) => {
                const zEpoki = (lektury ?? []).filter((l) => l.epoka === e && !polecane.has(l.id));
                return zEpoki.length ? (
                  <optgroup key={e} label={e}>{zEpoki.map((l) => <option key={l.id} value={l.id}>{nazwaLektury(l)}</option>)}</optgroup>
                ) : null;
              })}
            </select>
          </label>
          <label className={k.pole}>
            <span className="small muted">Stanowisko</span>
            <textarea className={k.tekst} rows={2} maxLength={600} value={plan.stanowisko} placeholder="Twoja odpowiedź na temat, jednym zdaniem"
              onChange={(e) => ustawPlan({ stanowisko: e.currentTarget.value })} />
          </label>
          {plan.argumenty.map((a, i) => (
            <label key={i} className={k.pole}>
              <span className="small muted">Argument {i + 1} · {PODPISY[i]}</span>
              <textarea className={k.tekst} rows={3} maxLength={1200} value={a}
                placeholder={i === 0 ? "Argument i scena z lektury, która go pokazuje" : "Argument i utwór, który go pokazuje"}
                onChange={(e) => ustawArgument(i, e.currentTarget.value)} />
            </label>
          ))}
          {plan.argumenty.length < 3 && (
            <button type="button" className={`link ${w.dodaj}`} onClick={() => ustawPlan({ argumenty: [...plan.argumenty, ""] })}>
              <Plus size={15} aria-hidden="true" /> Trzeci argument
            </button>
          )}
          <label className={k.pole}>
            <span className="small muted">Konteksty</span>
            <textarea className={k.tekst} rows={2} maxLength={800} value={plan.konteksty} placeholder="Na przykład historyczny, biblijny, filozoficzny"
              onChange={(e) => ustawPlan({ konteksty: e.currentTarget.value })} />
          </label>
        </div>

        <div className={s.akcje}>
          {zPestka && !uwagi ? (
            <>
              <button type="button" className="btn btn-primary" disabled={!gotowy || sprawdza} onClick={() => void sprawdz()}>
                <Sparkles size={17} aria-hidden="true" /> {sprawdza ? "Pestka czyta…" : "Sprawdź plan z Pestką"}
              </button>
              <button type="button" className="btn btn-ghost" disabled={!gotowy} onClick={() => zmien({ etap: "pisanie" })}>Pisz bez sprawdzania</button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primary" disabled={!gotowy} onClick={() => zmien({ etap: "pisanie" })}>Zacznij pisać</button>
              {zPestka && (
                <button type="button" className="btn btn-ghost" disabled={!gotowy || sprawdza} onClick={() => void sprawdz()}>
                  <Sparkles size={17} aria-hidden="true" /> {sprawdza ? "Pestka czyta…" : "Sprawdź ponownie"}
                </button>
              )}
            </>
          )}
        </div>
        {blad !== null && <BladPestki blad={blad} ponow={() => void sprawdz()} />}
      </section>

      {zPestka && (
        <section className={s.sekcja} aria-labelledby="uwagi-planu">
          <h2 className="h2" id="uwagi-planu" tabIndex={-1} ref={listaUwag}>Pestka o planie</h2>
          <ul className={k.kryteria} aria-live="polite">
            {Object.entries(KRYTERIA_PLANU).map(([klucz, nazwa]) => {
              const status = uwagi?.statusy[klucz] ?? "do-zrobienia";
              return (
                <li key={klucz}>
                  <span>{nazwa}</span>
                  <span className="small" data-status={status}>{STATUS[status]}</span>
                </li>
              );
            })}
          </ul>
          {uwagi && <PestkaMowi tekst={[uwagi.uwaga, uwagi.pytanie].filter(Boolean).join(" ")} />}
        </section>
      )}
    </div>
  );
}

function PanelPlanu({ szkic, lektura, zmien }: { szkic: Szkic; lektura?: Lektura; zmien: Zmien }) {
  const { plan, ocena } = szkic;
  const pozycje: [string, ReactNode][] = [
    ["Lektura", lektura ? nazwaLektury(lektura) : null],
    ["Stanowisko", plan.stanowisko.trim()],
    ...plan.argumenty.map((a, i): [string, ReactNode] => [`Argument ${i + 1}`, a.trim()]),
    ["Konteksty", plan.konteksty.trim()],
  ];
  const nieaktualna = ocena && szkic.tekst !== szkic.ocenionyTekst;
  // Na wąskim ekranie plan stoi nad tekstem, więc domyślnie jest zwinięty; na szerokim zawsze widać całość (CSS).
  const [rozwiniety, ustawRozwiniety] = useState(false);
  return (
    <div className={w.panel} data-zwiniety={rozwiniety ? undefined : ""}>
      <div className={w.panelGlowa}>
        <button type="button" className={w.zwin} aria-expanded={rozwiniety} onClick={() => ustawRozwiniety((r) => !r)}>
          <ChevronRight size={16} aria-hidden="true" /> <span className={w.panelTytul}>Twój plan</span>
        </button>
        <span className={`${w.panelTytul} ${w.tytulSzeroki}`}>Twój plan</span>
        <button type="button" className="link small" onClick={() => zmien({ etap: "plan" })}>Zmień</button>
      </div>
      <dl className={`${w.planLista} ${w.zwijane}`}>
        {pozycje.filter(([, v]) => v).map(([n, v]) => (
          <div key={n}>
            <dt className="label">{n}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {ocena && ocena.poprawki.length > 0 && (
        <div className={`${w.doPoprawy} ${w.zwijane}`}>
          <span className={w.panelTytul}>Do poprawy{nieaktualna ? "" : ` · ${sumaPunktow(ocena)}/${MAX_PUNKTOW} pkt`}</span>
          <ol className={w.planLista}>
            {ocena.poprawki.map((p, i) => (
              <li key={i}>
                <span className="label">{p.akapit ? `Akapit ${p.akapit}` : "Całość"}</span>
                <p>{p.tekst}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function KrokPisanie({ szkic, lektura, zmien }: { szkic: Szkic; lektura?: Lektura; zmien: Zmien }) {
  const { aiGotowe } = useTutor();
  const slowa = liczSlowa(szkic.tekst);
  const ponowna = !!szkic.ocena && szkic.tekst !== szkic.ocenionyTekst;
  return (
    <>
      <p className={`${w.tematMaly} ${w.waski}`}><span className="label">Temat</span> {szkic.temat!.tekst}</p>
      <Wypracowanie jezyk="pl" tekst={szkic.tekst} onTekst={(tekst) => zmien({ tekst })} polecenie={szkic.temat!.tekst}
        tematy={[]} punkty={[]} zakres={ZAKRES} temat={null} odhaczone={[]} tylkoOdczyt={false} onTemat={() => {}} onOdhacz={() => {}}
        obok={<PanelPlanu szkic={szkic} lektura={lektura} zmien={zmien} />} />
      <div className={s.akcje}>
        {aiGotowe !== false && (
          <button type="button" className="btn btn-primary" disabled={!szkic.tekst.trim() || (!!szkic.ocena && !ponowna)}
            onClick={() => zmien({ etap: "ocena", ocena: null })}>
            <Sparkles size={17} aria-hidden="true" /> {ponowna ? "Oceń ponownie" : "Oceń z Pestką"}
          </button>
        )}
        {szkic.ocena && !ponowna && (
          <button type="button" className="btn btn-ghost" onClick={() => zmien({ etap: "ocena" })}>Zobacz ocenę</button>
        )}
      </div>
      {slowa > 0 && slowa < MIN_SLOW && <p className="small muted">Poniżej {MIN_SLOW} wyrazów praca dostaje punkty tylko za warunki formalne i kompetencje literackie.</p>}
    </>
  );
}

function KrokOcena({ szkic, lektura, zmien }: { szkic: Szkic; lektura?: Lektura; zmien: Zmien }) {
  const [czesciowa, ustawCzesciowa] = useState<Ocena | null>(null);
  const [blad, ustawBlad] = useState<unknown>(null);
  const [pytaj, ustawPytaj] = useState(false);
  const trwa = useRef<AbortController | null>(null);
  const ocena = szkic.ocena ?? czesciowa;
  const gotowa = !!szkic.ocena;

  async function ocen() {
    if (trwa.current) return;
    const ctrl = new AbortController();
    trwa.current = ctrl;
    ustawBlad(null);
    ustawCzesciowa(null);
    const tekst = szkic.tekst;
    try {
      const o = await ocenWypracowanie(szkic.temat!.tekst, szkic.plan, lektura, tekst, ustawCzesciowa, ctrl.signal);
      if (!ctrl.signal.aborted) zmien({ ocena: o, ocenionyTekst: tekst });
    } catch (e) {
      if (!ctrl.signal.aborted && !czyPrzerwane(e)) ustawBlad(e);
    } finally {
      if (trwa.current === ctrl) trwa.current = null;
    }
  }

  useEffect(() => {
    if (!szkic.ocena) void ocen();
    return () => {
      trwa.current?.abort();
      trwa.current = null;
    };
  }, []);

  const suma = ocena ? sumaPunktow(ocena) : 0;
  const mysli = !gotowa && blad === null;

  return (
    <div className={w.waski}>
      <p className={w.tematMaly}><span className="label">Temat</span> {szkic.temat!.tekst}</p>

      <section className={`${s.sekcja} ${k.bezLinii}`} aria-labelledby="wynik" aria-busy={mysli}>
        <div className={w.wynik}>
          <h2 className="visually-hidden" id="wynik">Ocena</h2>
          <span className={w.punkty}><Liczba wartosc={suma} /></span>
          <span className="muted">/ {MAX_PUNKTOW} pkt{gotowa ? "" : "…"}</span>
          <span className={`small muted ${w.szacunek}`}>szacunek Pestki · {ocena?.slowa ?? liczSlowa(szkic.tekst)} wyrazów</span>
        </div>
        <PestkaMowi tekst={ocena?.podsumowanie || (blad !== null ? "Nie udało się dokończyć oceny." : "Czytam twoją pracę jak egzaminator…")}
          emocja={mysli && !ocena?.podsumowanie ? "thinking" : undefined} />
        {blad !== null && <BladPestki blad={blad} ponow={() => void ocen()} />}

        <ul className={`${k.kryteria} ${w.kryteria}`} aria-live="polite">
          {KRYTERIA_OCENY.map((kr) => {
            const wiersz = ocena?.kryteria.find((x) => x.id === kr.id);
            return (
              <li key={kr.id} data-gotowe={wiersz ? "" : undefined}>
                <span className={w.kryterium}>
                  <span>{kr.nazwa}</span>
                  {wiersz?.komentarz && <span className="small muted">{wiersz.komentarz}</span>}
                </span>
                <span className={w.punktyKryterium}>{wiersz ? `${wiersz.punkty}/${kr.max}` : <span className="muted">–/{kr.max}</span>}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {ocena && ocena.poprawki.length > 0 && (
        <section className={s.sekcja} aria-labelledby="poprawki">
          <h2 className="h2" id="poprawki">Co poprawić</h2>
          <ol className={w.poprawki}>
            {ocena.poprawki.map((p, i) => (
              <li key={i}>
                <span className="label">{p.akapit ? `Akapit ${p.akapit}` : "Cała praca"}</span>
                <p>{p.tekst}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {gotowa && (
        <section className={s.sekcja} aria-label="Dalej">
          {pytaj ? (
            <div className={w.pytanie} role="alert">
              <p>Nowy temat wyczyści plan i tekst.</p>
              <div className={s.akcje}>
                <button type="button" className="btn btn-primary"
                  onClick={() => zmien((sz) => ({ etap: "temat", temat: null, byly: sz.temat ? [...sz.byly, sz.temat.tekst].slice(-12) : sz.byly, plan: pustyPlan(), tekst: "", uwagiPlanu: null, ocena: null, ocenionyTekst: "" }))}>
                  Nowy temat
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => ustawPytaj(false)}>Zostań przy tym</button>
              </div>
            </div>
          ) : (
            <div className={s.akcje}>
              <button type="button" className="btn btn-primary" onClick={() => zmien({ etap: "pisanie" })}>Popraw tekst</button>
              <button type="button" className="btn btn-ghost" onClick={() => ustawPytaj(true)}><RefreshCw size={17} aria-hidden="true" /> Nowy temat</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
