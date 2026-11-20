import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronRight, Play, Square, X } from "lucide-react";
import { useArkusz } from "../../arkusze/dane";
import { adresObrazu, type Blok, type PytanieZamkniete, type Zadanie } from "../../arkusze/typy";
import { AudioCke } from "../../components/BladNagrania";
import { FragmentNagrania } from "../../components/FragmentNagrania";
import { Ladowanie } from "../../components/Ladowanie";
import { TekstMat, WzorMat } from "../../components/TekstMat";
import type { PolecenieNauki as Prompt } from "../../nauka/api";
import s from "./SzybkaRunda.module.css";

type Cke = Extract<Prompt, { typ: "cke" }>;
export type Opcja = { id: string; tekst: string };

const etykietaLitery = (litera: string, pf: boolean) =>
  pf ? (litera === "T" || litera === "P" ? "Prawda" : "Fałsz") : "";

type Pole = (opcje: Opcja[] | null) => ReactNode;

/**
 * Opcje jako kafle: litera i tekst w jednym klikalnym polu. Natywne radio jest ukryte tylko wizualnie,
 * więc strzałki i spacja działają jak zwykle. Po sprawdzeniu (poprawne) kafle barwią się jak w arkuszu.
 */
export function KafleOdpowiedzi({ opcje, nazwa, wybrana, zmien, poprawne, wylaczone }: {
  opcje: Opcja[];
  nazwa: string;
  wybrana: string;
  zmien?: (id: string) => void;
  poprawne?: string[];
  wylaczone?: boolean;
}) {
  return (
    <div className={s.kafle}>
      {opcje.map((o) => {
        const dobra = poprawne?.includes(o.id);
        const stan = poprawne
          ? dobra ? (o.id === wybrana ? "trafiona" : "poprawna") : o.id === wybrana ? "bledna" : undefined
          : o.id === wybrana ? "wybrana" : undefined;
        return (
          <label key={o.id} className={s.kafel} data-stan={stan}>
            <input type="radio" className="visually-hidden" name={nazwa} value={o.id} checked={o.id === wybrana}
              disabled={wylaczone || !!poprawne} onChange={() => zmien?.(o.id)} />
            <span className={s.litera}>{o.id}</span>
            <span className={s.tekstKafla} lang={o.tekst && !/^(Prawda|Fałsz)$/.test(o.tekst) ? "en" : undefined}>
              {o.tekst && <TekstMat tekst={o.tekst} />}
              {stan === "trafiona" && <span className="visually-hidden"> (twoja odpowiedź, poprawna)</span>}
              {stan === "poprawna" && <span className="visually-hidden"> (poprawna odpowiedź)</span>}
              {stan === "bledna" && <span className="visually-hidden"> (twoja odpowiedź)</span>}
            </span>
            {(stan === "trafiona" || stan === "poprawna") && <Check className={s.znakKafla} size={18} aria-hidden="true" />}
            {stan === "bledna" && <X className={s.znakKafla} size={18} aria-hidden="true" />}
          </label>
        );
      })}
    </div>
  );
}

function ListaOpcji({ opcje }: { opcje: Opcja[] }) {
  if (!opcje.some((opcja) => !!opcja.tekst)) return null;
  return (
    <dl className={s.opcjeCke}>
      {opcje.map(({ id, tekst }) => <div key={id}><dt>{id}.</dt><dd>{tekst}</dd></div>)}
    </dl>
  );
}

function TekstCke({ tekst, pytanie }: { tekst: string; pytanie: string }) {
  const czesci = tekst.split(/\{\{(\d+\.\d+)\}\}/);
  return czesci.map((czesc, i) =>
    i % 2 ? (
      <span key={i} className={czesc === pytanie ? s.lukaCke : undefined} aria-label={`Luka ${czesc}`}>
        {czesc}. _____
      </span>
    ) : <TekstMat key={i} tekst={czesc} />,
  );
}

// Polecenia z papieru („Wpisz rozwiązania do tabeli”, „Zakreśl jedną z liter”) nie pasują do ekranu,
// a ogólne „dopasuj / wybierz” zastępuje jedno zdanie o tym konkretnym pytaniu.
const PAPIER = /\b(Wpisz|Wpisuj|Zakreśl|Zaznacz)\b|kratk|do tabeli/i;
const WYBOR = /wybierz właściwą|dopasuj|dobierz|Wykonaj zadania/i;
// Dzieli tylko na granicach zdań i niczego nie gubi: „(4.1.–4.4.).” zostaje w swoim zdaniu.
const zdania = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ(„"])/).map((z) => z.trim()).filter((z) => /[\p{L}\p{N}]/u.test(z));
const bezPapieru = (t: string) => zdania(t).filter((z) => !PAPIER.test(z) && !WYBOR.test(z)).join(" ");
// Akapit z poleceniem do części zadania, np. „Przeczytaj zdania 5.1.–5.3. Dopasuj…”.
const NUMER_PYTANIA = /\d+\.\d+\./;
const czyPolecenie = (b: Blok) =>
  b.typ === "akapit" && (b.polecenie === true || (/^Przeczytaj\b/.test(b.tekst) && (PAPIER.test(b.tekst) || NUMER_PYTANIA.test(b.tekst))));
// Nagłówek tekstu, np. „Tekst 2. (do zadań 2.2. i 2.3.)”, zaczyna nowy kawałek zadania.
const NAGLOWEK_TEKSTU = /^Tekst\s+[A-Z0-9]+\.?\s*(\(do zada[nń][^)]*\))?\s*$/;
const czyNaglowekTekstu = (b: Blok) => (b.typ === "akapit" || b.typ === "naglowek") && NAGLOWEK_TEKSTU.test(b.tekst.trim());

const PASUJACY: Record<string, string> = { nagłówek: "pasujący", tekst: "pasujący", zdanie: "pasujące", osobę: "pasującą", odpowiedź: "pasującą" };

function wlasnePolecenie(zadanie: Zadanie, nr: string, pf: boolean, opcjePytania: boolean): string {
  const t = [...zadanie.polecenie, ...zadanie.bloki.filter(czyPolecenie).map((b) => ("tekst" in b ? b.tekst : ""))].join(" ");
  const zrodlo = /nagrani|usłyszysz/i.test(t) ? "nagrania" : "tekstu";
  if (pf) return `Zdecyduj, czy zdanie ${nr} jest zgodne z treścią ${zrodlo}.`;
  if (opcjePytania) return `Wybierz odpowiedź zgodną z treścią ${zrodlo}.`;
  const co = /nagłówek|nagłówki/i.test(t) ? "nagłówek" : /zdanie \(A|zdania \(A|zdań \(A/i.test(t) ? "zdanie"
    : /tekst \(A|teksty \(A|tekstów \(A|właściwy tekst/i.test(t) ? "tekst" : /osob/i.test(t) ? "osobę" : "odpowiedź";
  const doCzego = /wypowiedzi/i.test(t) ? `wypowiedzi ${nr}` : /części tekstu/i.test(t) ? `części tekstu ${nr}`
    : /luk/i.test(t) ? `luki ${nr}` : /zda[nń]|zdania/i.test(t) ? `zdania ${nr}` : `punktu ${nr}`;
  return `Wybierz ${co} ${PASUJACY[co]} do ${doCzego}.`;
}

// Numery pytań, o które pyta blok: osobny blok pytania albo luka {{2.3}} w tekście.
function pytaniaBloku(b: Blok): string[] {
  if (b.typ === "pytanie") return [b.nr];
  if (b.typ === "pytania" || b.typ === "tabela") return b.nr;
  const teksty = b.typ === "tabelaTresci" ? b.wiersze.flat() : "tekst" in b ? [b.tekst] : b.typ === "opcje" ? b.opcje.map((o) => o.tresc) : [];
  return teksty.flatMap((t) => [...t.matchAll(/\{\{(\d+\.\d+)\}\}/g)].map((m) => m[1]!));
}

/** Bloki zadania potrzebne do jednego pytania: bez tekstów i poleceń, które dotyczą tylko innych pytań. */
function blokiPytania(zadanie: Zadanie, nr: string, bezOpcji: boolean): Blok[] {
  const kawalki: Blok[][] = [[]];
  for (const b of zadanie.bloki) {
    if (czyNaglowekTekstu(b) || czyPolecenie(b)) kawalki.push([]);
    kawalki.at(-1)!.push(b);
  }
  return kawalki
    .filter((k) => {
      const pytania = k.flatMap(pytaniaBloku);
      return !pytania.length || pytania.includes(nr);
    })
    .flat()
    .filter((b) => !czyPolecenie(b) && !(bezOpcji && b.typ === "opcje"));
}

function KontekstCke({ blok, pytanie, znaczniki }: { blok: Blok; pytanie: PytanieZamkniete; znaczniki: boolean }) {
  const tekst = (wartosc: string) => <TekstCke tekst={wartosc} pytanie={pytanie.nr} />;
  switch (blok.typ) {
    case "akapit":
      return czyNaglowekTekstu(blok)
        ? <h3 className="h3">{blok.tekst.replace(/\s*\(do zada[nń][^)]*\)/, "")}</h3>
        : <p>{tekst(blok.tekst)}</p>;
    case "naglowek": return <h3 className="h3">{tekst(blok.tekst.replace(/\s*\(do zada[nń][^)]*\)/, ""))}</h3>;
    case "zrodlo": return <p className="small muted">{tekst(blok.tekst)}</p>;
    case "kod": return <pre>{blok.tekst}</pre>;
    case "wzor": return <WzorMat tex={blok.tex} blok />;
    case "rysunek": return <img src={adresObrazu(blok.obraz.src)} alt="Rysunek do zadania" />;
    case "kadr": return <img src={adresObrazu(blok.obraz.src)} alt={blok.tekst} />;
    case "tabelaTresci":
      return (
        <div className={s.tabelaCke}>
          <table>
            <tbody>
              {blok.wiersze.map((wiersz, i) => (
                <tr key={i}>
                  {wiersz.map((komorka, j) =>
                    i < (blok.naglowek ?? 1)
                      ? <th key={j} scope="col">{tekst(komorka)}</th>
                      : <td key={j}>{tekst(komorka)}</td>,
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "opcje":
      return <dl className={s.opcjeCke}>{blok.opcje.map((o, i) => (
        <div key={i}><dt>{o.litera}.</dt><dd>{tekst(o.tresc)}</dd></div>
      ))}</dl>;
    // W dobieraniu (nagłówki do części tekstu) numer pokazuje, której części dotyczy pytanie.
    case "pytanie":
      return znaczniki ? <p className={blok.nr === pytanie.nr ? s.lukaCke : "small muted"}>{blok.nr}.</p> : null;
    case "pytania":
    case "tabela":
      return null;
  }
}

function CkeOdczyt({ prompt, pole, poOcenie, tylkoOpcje, onGotowe, ponow }: {
  prompt: Cke; pole?: Pole; poOcenie?: boolean; tylkoOpcje?: boolean; onGotowe?: () => void; ponow: () => void;
}) {
  const { dane, blad, laduje } = useArkusz(prompt.sheet_id);
  const zadanie = dane?.zadania.find((z) => z.nr === prompt.task_nr);
  const pytanie = zadanie?.pytania.find((p): p is PytanieZamkniete => p.nr === prompt.question && p.typ === "zamkniete");
  const gotowe = !!pytanie;
  useEffect(() => {
    if (gotowe) onGotowe?.();
    // onGotowe zmienia się przy każdym renderze rodzica, a liczy się tylko chwila pokazania treści.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gotowe]);

  if (laduje) return (
    <div className={s.szkieletPytania}>
      {!tylkoOpcje && <Ladowanie ksztalt="tekst" ile={5} etykieta="Wczytywanie zadania CKE" opoznienie={0} />}
      <Ladowanie ksztalt="wiersze" ile={tylkoOpcje ? 3 : 4} etykieta="Wczytywanie odpowiedzi" opoznienie={0} />
    </div>
  );
  if (!pytanie || !zadanie) return (
    <div className={s.komunikat}>
      {blad && blad !== "brak-danych"
        ? <p role="alert">Nie udało się pobrać treści zadania CKE.</p>
        : <p role="alert">Treść tego zadania CKE jest niedostępna.</p>}
      <button type="button" className="btn btn-ghost btn-sm" onClick={ponow}>Spróbuj ponownie</button>
    </div>
  );

  const pf = prompt.litery.join("") === "TF" || prompt.litery.join("") === "PF";
  const opcjePytania = !!pytanie.opcje?.length;
  // W dobieraniu teksty opcji (A–F) stoją raz dla całego zadania, a nie przy pytaniu.
  const opcjeZadania = new Map(zadanie.bloki.flatMap((b) => b.typ === "opcje" ? b.opcje.map((o) => [o.litera, o.tresc] as const) : []));
  const zBlokow = !opcjePytania && prompt.litery.every((l) => opcjeZadania.has(l));
  const opcje = prompt.litery.map((id) => ({
    id,
    tekst: pytanie.opcje?.find((o) => o.litera === id)?.tresc ?? opcjeZadania.get(id) ?? etykietaLitery(id, pf),
  }));
  const stem = pytanie.tresc && <p className={s.pytanieCke} lang="en"><TekstCke tekst={pytanie.tresc} pytanie={pytanie.nr} /></p>;

  if (tylkoOpcje) return <>{stem}{pole ? pole(opcje) : <ListaOpcji opcje={opcje} />}</>;

  const nagranie = prompt.nagranie ?? (zadanie.sluchanie ? dane?.nagranie : undefined);
  // Dopasowane fragmenty wskazują miejsce odpowiedzi, więc pokazujemy je po sprawdzeniu. Najpierw fragment
  // z arkusza, żeby runda, rozbiór i arkusz grały ten sam kawałek.
  const fragment = poOcenie ? pytanie.fragment ?? prompt.fragment : undefined;
  // Przed sprawdzeniem gra cały fragment zadania (od najwcześniejszego do najpóźniejszego pytania),
  // bo fragment samego pytania wskazywałby odpowiedź.
  // Zakres zadania liczymy tylko, gdy fragment ma każde pytanie. Inaczej mógłby ominąć szukane pytanie.
  const czasyZadania = zadanie.pytania.flatMap((p) => p.fragment ? [p.fragment] : []);
  const fragmentZadania = czasyZadania.length && czasyZadania.length === zadanie.pytania.length
    ? { od: Math.min(...czasyZadania.map((f) => f.od)), do: Math.max(...czasyZadania.map((f) => f.do)), tekst: "" }
    : undefined;
  const polecenie = zadanie.polecenie.map(bezPapieru).filter(Boolean);
  const bloki = blokiPytania(zadanie, pytanie.nr, zBlokow);

  return (
    <>
      <div className={s.material}>
        <p className={s.polecenie}>{wlasnePolecenie(zadanie, pytanie.nr, pf, opcjePytania)}</p>
        {polecenie.map((tekst, i) => <p key={i} className="muted">{tekst}</p>)}
        {nagranie && (
          <>
            {poOcenie && fragment
              ? <FragmentNagrania key="pytanie" src={nagranie} fragment={{ od: fragment.od, do: fragment.do, tekst: "" }} podpis="Fragment z odpowiedzią" />
              : fragmentZadania && <>
                <span data-tutor-about="Gra całe zadanie, żeby nie zdradzić, gdzie pada odpowiedź. Po sprawdzeniu usłyszysz sam fragment z odpowiedzią.">
                  <FragmentNagrania key="zadanie" src={nagranie} fragment={fragmentZadania} podpis="Całe zadanie" />
                </span>
              </>}
            {fragment || fragmentZadania ? (
              <details className={s.rozwijane}>
                <summary><ChevronRight size={16} aria-hidden="true" /> Pełne nagranie z arkusza</summary>
                <AudioCke className={s.audio} src={nagranie} etykieta="Pełne nagranie CKE" />
              </details>
            ) : <AudioCke className={s.audio} src={nagranie} etykieta="Nagranie CKE" />}
          </>
        )}
        <div className={s.kontekstCke} lang="en">
          {bloki.map((blok, i) => <KontekstCke key={i} blok={blok} pytanie={pytanie} znaczniki={!opcjePytania} />)}
        </div>
        {stem}
      </div>
      {pole ? pole(opcje) : <ListaOpcji opcje={opcje} />}
    </>
  );
}

function CkeRundy(props: { prompt: Cke; pole?: Pole; poOcenie?: boolean; tylkoOpcje?: boolean; onGotowe?: () => void }) {
  const [proba, setProba] = useState(0);
  return <CkeOdczyt key={proba} {...props} ponow={() => setProba((n) => n + 1)} />;
}

function NagranieAutorskie({ tekst, jezyk, poOcenie }: { tekst: string; jezyk?: string; poOcenie?: boolean }) {
  const [gra, setGra] = useState(false);
  const [blad, setBlad] = useState(false);
  const aktywne = useRef<SpeechSynthesisUtterance | null>(null);
  const id = useId();
  const jestSynteza = typeof window.speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";

  useEffect(() => {
    return () => {
      if (!aktywne.current) return;
      aktywne.current = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  function przelacz() {
    window.speechSynthesis.cancel();
    if (gra) {
      aktywne.current = null;
      setGra(false);
      return;
    }
    const nagranie = new SpeechSynthesisUtterance(tekst);
    nagranie.lang = jezyk || "en-GB";
    aktywne.current = nagranie;
    const zakoncz = () => {
      if (aktywne.current !== nagranie) return false;
      aktywne.current = null;
      setGra(false);
      return true;
    };
    nagranie.onend = zakoncz;
    nagranie.onerror = (event) => {
      if (zakoncz() && event.error !== "canceled" && event.error !== "interrupted") setBlad(true);
    };
    setGra(true);
    setBlad(false);
    window.speechSynthesis.speak(nagranie);
  }

  return (
    <div className={s.komunikat}>
      {jestSynteza && <button type="button" className="btn btn-secondary btn-sm" onClick={przelacz} aria-pressed={gra}>
        {gra ? <Square size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        {gra ? "Zatrzymaj" : "Odtwórz wypowiedź"}
      </button>}
      {(blad || !jestSynteza) && <p id={id} className="small muted" role="status">Synteza mowy jest niedostępna. Możesz przeczytać wypowiedź.</p>}
      {(poOcenie || blad || !jestSynteza) && <details className={s.rozwijane} aria-describedby={blad || !jestSynteza ? id : undefined}>
        <summary><ChevronRight size={16} aria-hidden="true" /> Transkrypcja wypowiedzi</summary>
        <p lang="en">{tekst}</p>
      </details>}
    </div>
  );
}

/**
 * tylkoOpcje: samo pytanie i opcje, bez tekstu zadania (werdykt pokazuje kafle, a treść chowa niżej).
 * onGotowe: treść zadania jest na ekranie (zegar rundy rusza dopiero wtedy).
 */
export function TrescRundy({ prompt, pole, poOcenie, tylkoOpcje, onGotowe }: {
  prompt: Prompt; pole?: Pole; poOcenie?: boolean; tylkoOpcje?: boolean; onGotowe?: () => void;
}) {
  const autorskie = prompt.typ !== "cke";
  useEffect(() => {
    if (autorskie) onGotowe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorskie]);
  if (prompt.typ === "cke") return <CkeRundy prompt={prompt} pole={pole} poOcenie={poOcenie} tylkoOpcje={tylkoOpcje} onGotowe={onGotowe} />;
  const opcje = prompt.typ === "luka" ? null : prompt.opcje;
  if (tylkoOpcje) return <>{pole ? pole(opcje) : opcje && <ListaOpcji opcje={opcje} />}</>;
  return (
    <>
      <div className={s.material}>
        {prompt.tekst && <p lang="en">{prompt.tekst}</p>}
        {prompt.typ !== "luka" && prompt.audioTekst && <NagranieAutorskie tekst={prompt.audioTekst} jezyk={prompt.audioJezyk} poOcenie={poOcenie} />}
      </div>
      {pole ? pole(opcje) : opcje && <ListaOpcji opcje={opcje} />}
    </>
  );
}
