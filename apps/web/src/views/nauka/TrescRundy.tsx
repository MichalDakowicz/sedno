import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Play, Square } from "lucide-react";
import { useArkusz } from "../../arkusze/dane";
import { adresObrazu, type Blok, type PytanieZamkniete } from "../../arkusze/typy";
import { FragmentNagrania } from "../../components/FragmentNagrania";
import { Ladowanie } from "../../components/Ladowanie";
import { TekstMat, WzorMat } from "../../components/TekstMat";
import type { PolecenieNauki as Prompt } from "../../nauka/api";
import s from "./SzybkaRunda.module.css";

type Cke = Extract<Prompt, { typ: "cke" }>;
type Opcja = { id: string; tekst: string };

const etykietaLitery = (litera: string, pf: boolean) =>
  pf ? (litera === "T" || litera === "P" ? "Prawda" : "Fałsz") : "";

type Pole = (opcje: Opcja[] | null) => ReactNode;

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

function KontekstCke({ blok, pytanie }: { blok: Blok; pytanie: PytanieZamkniete }) {
  const tekst = (wartosc: string) => <TekstCke tekst={wartosc} pytanie={pytanie.nr} />;
  switch (blok.typ) {
    case "akapit": return <p>{tekst(blok.tekst)}</p>;
    case "naglowek": return <h3 className="h3">{tekst(blok.tekst)}</h3>;
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
    case "pytanie":
    case "pytania":
    case "tabela":
      return null;
  }
}

function CkeOdczyt({ prompt, pole, poOcenie, ponow }: { prompt: Cke; pole?: Pole; poOcenie?: boolean; ponow: () => void }) {
  const { dane, blad, laduje } = useArkusz(prompt.sheet_id);
  if (laduje) return <Ladowanie ksztalt="tekst" etykieta="Wczytywanie zadania CKE" />;
  const zadanie = dane?.zadania.find((z) => z.nr === prompt.task_nr);
  const pytanie = zadanie?.pytania.find((p): p is PytanieZamkniete => p.nr === prompt.question && p.typ === "zamkniete");
  if (!pytanie || !zadanie) return (
    <div className={s.komunikat}>
      {blad && blad !== "brak-danych"
        ? <p role="alert">Nie udało się pobrać treści zadania CKE.</p>
        : <p role="alert">Treść tego zadania CKE jest niedostępna.</p>}
      <button type="button" className="btn btn-ghost btn-sm" onClick={ponow}>Spróbuj ponownie</button>
    </div>
  );

  const nagranie = prompt.nagranie ?? (zadanie.sluchanie ? dane?.nagranie : undefined);
  // Dopasowane fragmenty wskazują miejsce odpowiedzi, więc pokazujemy je po sprawdzeniu.
  const fragment = poOcenie ? prompt.fragment ?? pytanie.fragment : undefined;
  // Przed sprawdzeniem gra cały fragment zadania (od najwcześniejszego do najpóźniejszego pytania),
  // bo fragment samego pytania wskazywałby odpowiedź.
  // Zakres zadania liczymy tylko, gdy fragment ma każde pytanie. Inaczej mógłby ominąć szukane pytanie.
  const czasyZadania = zadanie.pytania.flatMap((p) => p.fragment ? [p.fragment] : []);
  const fragmentZadania = czasyZadania.length && czasyZadania.length === zadanie.pytania.length
    ? { od: Math.min(...czasyZadania.map((f) => f.od)), do: Math.max(...czasyZadania.map((f) => f.do)), tekst: "" }
    : undefined;
  const pf = prompt.litery.join("") === "TF" || prompt.litery.join("") === "PF";
  const opcje = prompt.litery.map((id) => ({
    id,
    tekst: pytanie.opcje?.find((o) => o.litera === id)?.tresc ?? etykietaLitery(id, pf),
  }));

  return (
    <>
      <div className={s.material}>
        {zadanie.polecenie.map((tekst, i) => <p key={i}>{tekst}</p>)}
        {nagranie && (
          <>
            {poOcenie && fragment
              ? <FragmentNagrania key="pytanie" src={nagranie} fragment={{ od: fragment.od, do: fragment.do, tekst: "" }} />
              : fragmentZadania && <FragmentNagrania key="zadanie" src={nagranie} fragment={fragmentZadania} />}
            {fragment || fragmentZadania ? (
              <details className={s.pelneNagranie}>
                <summary>Pełne nagranie z arkusza</summary>
                <audio className={s.audio} controls preload="none" src={nagranie} aria-label="Pełne nagranie CKE" />
              </details>
            ) : <audio className={s.audio} controls preload="none" src={nagranie} aria-label="Nagranie CKE" />}
          </>
        )}
        <div className={s.kontekstCke} lang="en">
          {zadanie.bloki.map((blok, i) => <KontekstCke key={i} blok={blok} pytanie={pytanie} />)}
        </div>
        {pytanie.tresc && <p className={s.pytanieCke} lang="en"><TekstCke tekst={pytanie.tresc} pytanie={pytanie.nr} /></p>}
      </div>
      {pole ? pole(opcje) : <ListaOpcji opcje={opcje} />}
    </>
  );
}

function CkeRundy({ prompt, pole, poOcenie }: { prompt: Cke; pole?: Pole; poOcenie?: boolean }) {
  const [proba, setProba] = useState(0);
  return <CkeOdczyt key={proba} prompt={prompt} pole={pole} poOcenie={poOcenie} ponow={() => setProba((n) => n + 1)} />;
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
      {(poOcenie || blad || !jestSynteza) && <details className={s.pelneNagranie} aria-describedby={blad || !jestSynteza ? id : undefined}>
        <summary>Transkrypcja wypowiedzi</summary>
        <p lang="en">{tekst}</p>
      </details>}
    </div>
  );
}

export function TrescRundy({ prompt, pole, poOcenie }: { prompt: Prompt; pole?: Pole; poOcenie?: boolean }) {
  if (prompt.typ === "cke") return <CkeRundy prompt={prompt} pole={pole} poOcenie={poOcenie} />;
  const opcje = prompt.typ === "luka" ? null : prompt.opcje;
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
