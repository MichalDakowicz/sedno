// Pisanie krok po kroku: wypowiedź pisemna z angielskiego etapami (plan, wstęp, rozwinięcie, zakończenie, przegląd).
// Szkic leży na koncie w writing_drafts (zapis z numerem wersji, nauka.md), uwagi do etapu daje Pestka (krok-po-kroku):
// lista kryteriów ze statusami i jedno pytanie naraz. Pestkę wołamy tylko przyciskiem, nie przy pisaniu.
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Sparkles } from "lucide-react";
import { useSession } from "../../auth";
import { nazwaPoziomu, type Poziom } from "../../arkusze/typy";
import { BladPestki, BrakPestki } from "../../components/BladPestki";
import { Ladowanie } from "../../components/Ladowanie";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { Pigulki } from "../../components/Pigulki";
import { useKontekstPestki, useTutor } from "../../components/TutorContext";
import { czyPrzerwane, naukaAi, policzTekst, type EtapPisania, type StatusKryterium, type UwagiDoSzkicu } from "../../nauka/ai";
import { usePoziomNauki } from "../../nauka/stan";
import { supabase } from "../../supabase";
import { dataNauki } from "./NaukaPowtorki";
import { PestkaMowi } from "./PestkaRundy";
import s from "./SzybkaRunda.module.css";
import k from "./KrokPoKroku.module.css";

type Forma = "email" | "wpis" | "rozprawka" | "artykul" | "list-formalny";
type Sekcje = Partial<Record<Exclude<EtapPisania, "przeglad">, string>>;
type Szkic = {
  id: string; level: Poziom; form: Forma; prompt: string; stage: EtapPisania; sections: Sekcje;
  revision: number; updated_at: string; submitted_at: string | null;
};

const FORMY: { id: Forma; nazwa: string }[] = [
  { id: "email", nazwa: "E-mail" },
  { id: "wpis", nazwa: "Wpis na blogu" },
  { id: "list-formalny", nazwa: "List formalny" },
  { id: "artykul", nazwa: "Artykuł" },
  { id: "rozprawka", nazwa: "Rozprawka" },
];
const nazwaFormy = (f: Forma) => FORMY.find((x) => x.id === f)?.nazwa ?? f;

const ETAPY: { id: EtapPisania; nazwa: string }[] = [
  { id: "plan", nazwa: "Plan" },
  { id: "wstep", nazwa: "Wstęp" },
  { id: "rozwiniecie", nazwa: "Rozwinięcie" },
  { id: "zakonczenie", nazwa: "Zakończenie" },
  { id: "przeglad", nazwa: "Przegląd" },
];

// Te same kryteria co w funkcji (formaty.ts ETAPY); tu tylko krótkie nazwy dla ucznia.
const KRYTERIA: Record<EtapPisania, Record<string, string>> = {
  plan: { polecenie: "Wszystkie punkty polecenia", porzadek: "Kolejność pasuje do formy" },
  wstep: { temat: "Wprowadza temat", forma: "Widać formę i cel" },
  rozwiniecie: { tresc: "Punkty polecenia rozwinięte", spojnosc: "Myśli łączą się w akapity" },
  zakonczenie: { domkniecie: "Domyka wypowiedź" },
  przeglad: { polecenie: "Realizuje polecenie", forma: "Układ i styl", spojnosc: "Logiczna kolejność", zakres: "Słownictwo i struktury", poprawnosc: "Poprawność językowa" },
};
const STATUS: Record<StatusKryterium, string> = { dobrze: "Spełnione", "do-poprawy": "Do poprawy", "do-zrobienia": "Czeka", niepewne: "Do doprecyzowania" };

const POLA = "id, level, form, prompt, stage, sections, revision, updated_at, submitted_at";
function odmiana(n: number, [jeden, kilka, wiele]: [string, string, string]) {
  const r = n % 100;
  return `${n} ${n === 1 ? jeden : r % 10 >= 2 && r % 10 <= 4 && (r < 12 || r > 14) ? kilka : wiele}`;
}
const SLOWA: [string, string, string] = ["słowo", "słowa", "słów"];
const AKAPITY: [string, string, string] = ["akapit", "akapity", "akapitów"];
const calyTekst = (sekcje: Sekcje) => (["wstep", "rozwiniecie", "zakonczenie"] as const).map((e) => sekcje[e]?.trim()).filter(Boolean).join("\n\n");

export function KrokPoKroku() {
  const [params] = useSearchParams();
  const session = useSession();
  const { aiGotowe } = useTutor();
  const id = params.get("szkic");
  return (
    <main className={`container czytanie ${s.strona}`}>
      {!session ? null : id ? (
        <Edytor key={id} id={id} />
      ) : (
        <>
          <NaglowekStrony wstecz={{ do: "/nauka", nazwa: "Nauka" }} tytul="Pisanie krok po kroku" lead="Wypowiedź pisemna etapami, z uwagami Pestki do każdego." />
          {aiGotowe === false && <BrakPestki tekst="Szkic zapiszesz i bez modelu, ale uwagi do etapów daje Pestka." />}
          <NowySzkic />
          <Szkice />
        </>
      )}
    </main>
  );
}

function NowySzkic() {
  const [poziom] = usePoziomNauki();
  const navigate = useNavigate();
  const [forma, ustawForme] = useState<Forma>("email");
  const [polecenie, ustawPolecenie] = useState("");
  const [zapisuje, ustawZapisuje] = useState(false);
  const [blad, ustawBlad] = useState("");
  const idSzkicu = useRef(crypto.randomUUID());

  async function zacznij(e: FormEvent) {
    e.preventDefault();
    if (!polecenie.trim() || zapisuje) return;
    ustawZapisuje(true);
    ustawBlad("");
    // Id z przeglądarki: ponowienie po błędzie sieci nie zakłada drugiego szkicu.
    const { error } = await supabase.from("writing_drafts").insert({ id: idSzkicu.current, level: poziom, form: forma, prompt: polecenie.trim() });
    ustawZapisuje(false);
    if (error && error.code !== "23505") return ustawBlad("Nie udało się założyć szkicu. Spróbuj ponownie.");
    navigate(`/nauka/pisanie?szkic=${idSzkicu.current}`);
  }

  return (
    <section className={`${s.sekcja} ${k.bezLinii}`} aria-labelledby="nowy-szkic">
      <h2 className="h2" id="nowy-szkic">Nowa wypowiedź</h2>
      <form className={k.formularz} onSubmit={(e) => void zacznij(e)}>
        <div className={k.pole} role="group" aria-labelledby="forma-szkicu">
          <span id="forma-szkicu" className="small muted">Forma</span>
          <Pigulki>
            {FORMY.map((f) => (
              <button key={f.id} type="button" className="pigulka" aria-pressed={f.id === forma} onClick={() => ustawForme(f.id)}>{f.nazwa}</button>
            ))}
          </Pigulki>
        </div>
        <label className={k.pole}>
          <span className="small muted">Polecenie · {nazwaPoziomu[poziom]}</span>
          <textarea className={k.tekst} rows={4} maxLength={3500} value={polecenie} onChange={(e) => ustawPolecenie(e.currentTarget.value)}
            placeholder="Wklej polecenie z arkusza albo wpisz własne" />
        </label>
        {blad && <p role="alert" className={s.blad}>{blad}</p>}
        <div className={s.akcje}>
          <button type="submit" className="btn btn-primary" disabled={zapisuje || !polecenie.trim()}>{zapisuje ? "Zakładam…" : "Zacznij od planu"}</button>
        </div>
      </form>
    </section>
  );
}

function Szkice() {
  const [szkice, ustawSzkice] = useState<Szkic[] | null>(null);
  const [blad, ustawBlad] = useState(false);
  const [proba, ustawProbe] = useState(0);
  useEffect(() => {
    let aktualne = true;
    void supabase.from("writing_drafts").select(POLA).order("updated_at", { ascending: false }).limit(20).then(({ data, error }) => {
      if (!aktualne) return;
      if (error) ustawBlad(true);
      else ustawSzkice((data ?? []) as Szkic[]);
    });
    return () => { aktualne = false; };
  }, [proba]);
  if (!blad && szkice && !szkice.length) return null;
  return (
    <section className={s.sekcja} aria-labelledby="moje-szkice">
      <h2 className="h2" id="moje-szkice">Twoje szkice</h2>
      {blad ? (
        <div className={s.komunikat}>
          <p role="alert">Nie udało się wczytać szkiców.</p>
          <button type="button" className="btn btn-ghost" onClick={() => { ustawBlad(false); ustawProbe((n) => n + 1); }}>Spróbuj ponownie</button>
        </div>
      ) : !szkice ? <Ladowanie ile={2} etykieta="Wczytuję szkice" /> : (
        <ul className="wiersze">
          {szkice.map((d) => (
            <li key={d.id}>
              <Link to={`/nauka/pisanie?szkic=${d.id}`} className="wiersz">
                <span className="wiersz-tresc">
                  <span className="h3">{nazwaFormy(d.form)}</span>
                  <span className="wiersz-opis">{d.prompt.slice(0, 120)}</span>
                </span>
                <span className="wiersz-wartosc small muted">
                  {d.submitted_at ? "Oddane" : ETAPY.find((e) => e.id === d.stage)?.nazwa} · {dataNauki(d.updated_at)}
                </span>
                <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Edytor({ id }: { id: string }) {
  const { aiGotowe } = useTutor();
  const [szkic, ustawSzkic] = useState<Szkic | null>(null);
  const [stanWczytania, ustawStanWczytania] = useState<"laduje" | "brak" | "blad" | "gotowe">("laduje");
  const [zapis, ustawZapis] = useState<"zapisane" | "zapisuje" | "niezapisane" | "konflikt" | "blad">("zapisane");
  const [uwagi, ustawUwagi] = useState<UwagiDoSzkicu | null>(null);
  const [sprawdza, ustawSprawdza] = useState(false);
  const [bladPestki, ustawBladPestki] = useState<unknown>(null);
  const [oddaje, ustawOddaje] = useState(false);
  const [bladOddania, ustawBladOddania] = useState("");
  const aktualny = useRef<Szkic | null>(null);
  const brudny = useRef(false);
  const zapisuje = useRef<Promise<void> | null>(null);
  const timer = useRef<number>();
  const trwa = useRef<AbortController | null>(null);
  const naglowekUwag = useRef<HTMLHeadingElement>(null);

  const wczytaj = useCallback(async () => {
    const { data, error } = await supabase.from("writing_drafts").select(POLA).eq("id", id).maybeSingle();
    if (error) return ustawStanWczytania("blad");
    if (!data) return ustawStanWczytania("brak");
    aktualny.current = data as Szkic;
    ustawSzkic(data as Szkic);
    ustawStanWczytania("gotowe");
  }, [id]);

  useEffect(() => { void wczytaj(); }, [wczytaj]);

  // Zapis z numerem wersji: brak zmienionego wiersza znaczy, że szkic zmienił się gdzie indziej (nauka.md).
  const zapisz = useCallback(async () => {
    if (zapisuje.current) return zapisuje.current;
    const run = (async () => {
      while (brudny.current && aktualny.current && !aktualny.current.submitted_at) {
        brudny.current = false;
        const d = aktualny.current;
        ustawZapis("zapisuje");
        const { data, error } = await supabase.from("writing_drafts").update({ stage: d.stage, sections: d.sections })
          .eq("id", d.id).eq("revision", d.revision).select("revision, updated_at").maybeSingle();
        if (error) { brudny.current = true; ustawZapis("blad"); return; }
        if (!data) { ustawZapis("konflikt"); await wczytaj(); return; }
        aktualny.current = { ...aktualny.current, revision: data.revision, updated_at: data.updated_at };
        ustawSzkic(aktualny.current);
      }
      ustawZapis(brudny.current ? "niezapisane" : "zapisane");
    })();
    zapisuje.current = run;
    await run;
    zapisuje.current = null;
  }, [wczytaj]);

  useEffect(() => () => {
    window.clearTimeout(timer.current);
    trwa.current?.abort();
    if (brudny.current) void zapisz();
  }, [zapisz]);

  function zmien(nowy: Partial<Szkic>, odRazu = false) {
    if (!aktualny.current) return;
    aktualny.current = { ...aktualny.current, ...nowy };
    ustawSzkic(aktualny.current);
    brudny.current = true;
    ustawZapis("niezapisane");
    window.clearTimeout(timer.current);
    // Zapis po pauzie w pisaniu (zwykłe zapytanie do bazy, bez Pestki).
    timer.current = window.setTimeout(() => void zapisz(), odRazu ? 0 : 1500);
  }

  useKontekstPestki(szkic ? {
    klucz: `szkic:${szkic.id}:${szkic.stage}`,
    tytul: `${nazwaFormy(szkic.form)}, etap: ${ETAPY.find((e) => e.id === szkic.stage)?.nazwa.toLowerCase()}`,
    opis: [`Wypowiedź pisemna z angielskiego (${nazwaPoziomu[szkic.level]}), forma: ${nazwaFormy(szkic.form)}.`, `Polecenie: ${szkic.prompt}`,
      `Plan: ${szkic.sections.plan ?? ""}`, `Tekst: ${calyTekst(szkic.sections)}`, "Nie pisz tekstu za ucznia: pytaj i wskazuj."].join("\n"),
  } : null);

  if (stanWczytania !== "gotowe" || !szkic) {
    return (
      <>
        <NaglowekStrony wstecz={{ do: "/nauka/pisanie", nazwa: "Pisanie" }} tytul="Szkic" />
        {stanWczytania === "laduje" ? <Ladowanie ksztalt="tekst" etykieta="Wczytuję szkic" /> : (
          <div className={s.komunikat}>
            <p role="alert">{stanWczytania === "brak" ? "Nie ma takiego szkicu na twoim koncie." : "Nie udało się wczytać szkicu."}</p>
            {stanWczytania === "blad" ? <button type="button" className="btn btn-ghost" onClick={() => void wczytaj()}>Spróbuj ponownie</button>
              : <Link to="/nauka/pisanie" className="btn btn-secondary">Wróć do szkiców</Link>}
          </div>
        )}
      </>
    );
  }

  const oddane = !!szkic.submitted_at;
  const etap = szkic.stage;
  const tekstEtapu = etap === "przeglad" ? calyTekst(szkic.sections) : szkic.sections[etap] ?? "";
  const licznikEtapu = policzTekst(tekstEtapu);
  const licznikCalosci = policzTekst(calyTekst(szkic.sections));
  const moznaOddac = etap === "przeglad" && !!szkic.sections.rozwiniecie?.trim() && !oddane;
  const uwagiEtapu = uwagi?.etap === etap ? uwagi : null;

  async function sprawdz() {
    if (!szkic || trwa.current) return;
    const ctrl = new AbortController();
    trwa.current = ctrl;
    ustawSprawdza(true);
    ustawBladPestki(null);
    try {
      const w = await naukaAi.krokPoKroku(etap, szkic.level, szkic.prompt, tekstEtapu, ctrl.signal);
      if (ctrl.signal.aborted) return;
      ustawUwagi(w);
      requestAnimationFrame(() => naglowekUwag.current?.focus());
    } catch (e) {
      if (!ctrl.signal.aborted && !czyPrzerwane(e)) ustawBladPestki(e);
    } finally {
      if (trwa.current === ctrl) trwa.current = null;
      if (!ctrl.signal.aborted) ustawSprawdza(false);
    }
  }

  async function oddaj() {
    if (oddaje) return;
    ustawOddaje(true);
    ustawBladOddania("");
    window.clearTimeout(timer.current);
    await zapisz();
    const d = aktualny.current;
    if (!d) return;
    const { data, error } = await supabase.rpc("nauka_oddaj_szkic", { p_draft: d.id, p_revision: d.revision });
    ustawOddaje(false);
    if (error) {
      ustawBladOddania(error.message === "draft_not_ready" ? "Najpierw napisz rozwinięcie." : error.message === "draft_changed" ? "Szkic zmienił się w międzyczasie. Odśwież stronę." : "Nie udało się oddać szkicu. Spróbuj ponownie.");
      return;
    }
    aktualny.current = { ...d, ...(data as Partial<Szkic>) };
    ustawSzkic(aktualny.current);
  }

  return (
    <>
      <NaglowekStrony wstecz={{ do: "/nauka/pisanie", nazwa: "Pisanie" }} tytul={nazwaFormy(szkic.form)}>
        <p className="small muted">Język angielski · {nazwaPoziomu[szkic.level]}{oddane ? " · oddane" : ""}</p>
      </NaglowekStrony>

      <section className={`${s.sekcja} ${k.bezLinii}`} aria-label="Polecenie">
        <p className={k.polecenie}>{szkic.prompt}</p>
        <Pigulki role="group" aria-label="Etap">
          {ETAPY.map((e) => (
            <button key={e.id} type="button" className="pigulka" aria-pressed={e.id === etap} disabled={oddane && e.id !== "przeglad"}
              onClick={() => { zmien({ stage: e.id }, true); ustawBladPestki(null); }}>
              {e.nazwa}
            </button>
          ))}
        </Pigulki>
      </section>

      <section className={s.sekcja} aria-labelledby="etap-tekst">
        <div className={k.glowa}>
          <h2 className="h2" id="etap-tekst">{ETAPY.find((e) => e.id === etap)?.nazwa}</h2>
          <span className="small muted" role="status">{oddane ? "Oddane" : { zapisane: "Zapisane", zapisuje: "Zapisuję…", niezapisane: "Zmiany czekają na zapis", konflikt: "Wczytałam nowszą wersję szkicu", blad: "Nie udało się zapisać" }[zapis]}</span>
        </div>
        {etap === "przeglad" ? (
          <div className={k.calosc} lang="en">{tekstEtapu || <span className="muted">Tekst pojawi się tu po napisaniu wstępu, rozwinięcia i zakończenia.</span>}</div>
        ) : (
          <textarea className={k.tekst} rows={etap === "plan" ? 6 : 10} maxLength={8500} lang="en" spellCheck readOnly={oddane}
            aria-label={`Tekst etapu: ${ETAPY.find((e) => e.id === etap)?.nazwa}`} value={tekstEtapu}
            onChange={(e) => zmien({ sections: { ...szkic.sections, [etap]: e.currentTarget.value } })}
            onBlur={() => { if (brudny.current) { window.clearTimeout(timer.current); void zapisz(); } }} />
        )}
        <p className={`small muted ${k.licznik}`}>
          {etap === "przeglad" ? `Całość: ${odmiana(licznikCalosci.slowa, SLOWA)} · ${odmiana(licznikCalosci.akapity, AKAPITY)}`
            : `Ten etap: ${odmiana(licznikEtapu.slowa, SLOWA)} · ${odmiana(licznikEtapu.akapity, AKAPITY)} · całość: ${odmiana(licznikCalosci.slowa, SLOWA)}`}
        </p>
        {zapis === "blad" && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { brudny.current = true; void zapisz(); }}>Zapisz ponownie</button>}
        <div className={s.akcje}>
          {moznaOddac ? (
            <button type="button" className="btn btn-primary" disabled={oddaje} onClick={() => void oddaj()}>{oddaje ? "Oddaję…" : "Oddaj"}</button>
          ) : null}
          {!oddane && aiGotowe !== false && (
            <button type="button" className={moznaOddac ? "btn btn-ghost" : "btn btn-primary"} disabled={sprawdza || !tekstEtapu.trim()} onClick={() => void sprawdz()}>
              <Sparkles size={17} aria-hidden="true" /> {sprawdza ? "Pestka czyta…" : "Sprawdź z Pestką"}
            </button>
          )}
        </div>
        {bladOddania && <p role="alert" className={s.blad}>{bladOddania}</p>}
        {aiGotowe === false && <Link to="/profil#ai" className="link small">Połącz Pestkę w profilu, żeby sprawdzała etapy</Link>}
        {bladPestki !== null && <BladPestki blad={bladPestki} ponow={() => void sprawdz()} />}
      </section>

      <section className={s.sekcja} aria-labelledby="lista-kontrolna">
        <h2 className="h2" id="lista-kontrolna" tabIndex={-1} ref={naglowekUwag}>Lista kontrolna</h2>
        <ul className={k.kryteria} aria-live="polite">
          {Object.entries(KRYTERIA[etap]).map(([kryterium, nazwa]) => {
            const status = uwagiEtapu?.statusy[kryterium] ?? "do-zrobienia";
            return (
              <li key={kryterium}>
                <span>{nazwa}</span>
                <span className="small" data-status={status}>{STATUS[status]}</span>
              </li>
            );
          })}
        </ul>
        {uwagiEtapu?.pytanie && <PestkaMowi tekst={uwagiEtapu.pytanie} />}
      </section>
    </>
  );
}
