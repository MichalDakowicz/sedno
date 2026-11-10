import { createContext, Fragment, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Headphones, List, MessagesSquare, Pencil, RotateCcw, Timer, X } from "lucide-react";
import { useArkusz } from "../arkusze/dane";
import { pustyPostep, usePostep, type Brudnopis as ZapisBrudnopisu, type Czas, type Postep, type Warsztat as ZapisWarsztatu } from "../arkusze/postep";
import { policz, policzPytania, punktyZSamooceny, werdykt, zakresSlow, type Werdykt } from "../arkusze/sprawdz";
import {
  nazwaPoziomu,
  adresObrazu,
  nazwaPrzedmiotu,
  type Arkusz as ArkuszDane,
  type Blok,
  type Kroj,
  type Obraz,
  type Opcja,
  type Pytanie,
  type PytanieOtwarte,
  type PytanieZamkniete,
  type Wypowiedz,
  type Zadanie,
} from "../arkusze/typy";
import { Brudnopis, otworzNaPelnymEkranie, PokazDodatkoweRysunki, ZDARZENIE_PELNY } from "../components/Brudnopis";
import { TekstMat, WzorMat } from "../components/TekstMat";
import { Nagranie } from "../components/Nagranie";
import { Wypracowanie, type Temat } from "../components/Wypracowanie";
import { Ladowanie } from "../components/Ladowanie";
import { PoleMatematyczne } from "../components/PoleMatematyczne";
import { MaterialyWiersz } from "../warsztat/MaterialyWiersz";
import { PanelWarsztatu } from "../warsztat/PanelWarsztatu";
import { useUklad } from "../warsztat/panelUklad";
import { CeleWstawiania, rodzajPytania, zaznaczenia } from "../warsztat/materialy";
import { Przenoszenie, type Wariant } from "../warsztat/Przenoszenie";
import { OmowienieBledow, type Wejscie } from "../components/OmowienieBledow";
import { FragmentNagrania } from "../components/FragmentNagrania";
import { rozklejPestke } from "../components/rozklejPestke";
import { useTutor } from "../components/TutorContext";
import { doOmowienia } from "../arkusze/omowienie";
import { useSession } from "../auth";
import { useAiReady } from "../ai";
import { uplynelo, zapisCzasu, zatrzymaj } from "../components/Zegar";
import { ustawAktywnyZegar, useAktywnyZegar } from "../arkusze/zegarAktywny";
import { dodajCzas, minuty, norma, odmierz, opisTempa, tempo, zacznijOdmierzac } from "../arkusze/czasZadan";
import styles from "./Arkusz.module.css";

type Kontekst = {
  arkusz: ArkuszDane;
  postep: Postep;
  ustaw: (nr: string, wartosc: string) => void;
  ocen: (nr: string, ocena: boolean | number) => void;
  ustawBrudnopis: (zadanie: number, zapis: ZapisBrudnopisu | null) => void;
  ustawWarsztat: (zadanie: number, zapis: ZapisWarsztatu) => void;
  pytania: Map<string, Pytanie>;
  luki: Map<Blok, Luka>; // zdania z luką na część odpowiedzi otwartej
  kadryTekst: Map<Blok, Blok[]>; // wycinki z luką jako tekst (tylko pełny ekran)
  lukiKadrow: Map<Blok, Luka>;
  obliczenia: Set<string>; // pytania, na które odpowiedzią jest rozwiązanie na płótnie
  kody: Map<string, WyborKodu>; // odpowiedzi kodem „A albo B oraz 1.–3.” jako wybór
  ukryteKodem: Set<Blok>; // bloki, które pokazują KodZWyborem i PrawdaFalszKod
  pf: Map<string, StwierdzeniaPF>; // odpowiedzi kodem P/F jako przełączniki przy zdaniach
  dwie: Map<string, WyborDwoch>; // „zapisz dwie odpowiedzi spośród A–F” jako wybór
  tabele: Map<string, TabelaDopasowania>; // „Uzupełnij tabelę” literami A–F
  opcjeNaRysunkach: Map<string, { kadr: Blok; tekst: Blok[] }>; // opcje A–D jako rysunki w wycinku
  wBloku: Set<string>; // pytania z własnym blokiem; w tekście zostaje tylko znacznik
  wTabeli: Set<string>; // pytania z odpowiedzią w tabeli (komórki do wpisania albo P / F, informatyka)
  opcjeDla: (nr: string) => Opcja[] | undefined;
  sprawdzone: (nr: string) => boolean;
  otwartaLuka: string | null;
  setOtwartaLuka: (nr: string | null) => void;
  idzDoZadania: (nr: number) => void;
  idzDoPytania: (nr: string) => void;
};

const Ctx = createContext<Kontekst | null>(null);
const useCtx = () => useContext(Ctx)!;

// Panel z materiałami do zadania (informatyka): dla którego zadania jest otwarty i jak go otworzyć.
const MaterialyCtx = createContext<{ nr: number | null; otworz: (nr: number, przycisk: HTMLElement) => void }>({ nr: null, otworz: () => {} });
const nrZadania = (nrPytania: string) => Number(nrPytania.split(".")[0]);

export function Arkusz() {
  const { id = "" } = useParams();
  const { dane, blad, laduje } = useArkusz(id);
  const [postep, zmien] = usePostep(id);
  const [otwartaLuka, setOtwartaLuka] = useState<string | null>(null);
  const [materialy, setMaterialy] = useState<{ nr: number; otwarty: boolean } | null>(null);
  const przyciskMaterialow = useRef<HTMLElement | null>(null);
  const uklad = useUklad();
  const otworzMaterialy = useCallback((nr: number, przycisk: HTMLElement) => {
    przyciskMaterialow.current = przycisk;
    setMaterialy({ nr, otwarty: true });
  }, []);
  const materialyCtx = useMemo(() => ({ nr: materialy?.otwarty ? materialy.nr : null, otworz: otworzMaterialy }), [materialy, otworzMaterialy]);

  const sprawdzone = useCallback((nr: string) => postep.sprawdzony || postep.sprawdzoneZadania.includes(nrZadania(nr)), [postep]);
  useEffect(zacznijOdmierzac, [id]);
  // Arkusz na czas zgłasza się do paska, żeby zegar został widoczny także poza nim.
  const aktywnyZegar = useAktywnyZegar();
  const maZegar = !!postep.czas && !postep.sprawdzony;
  useEffect(() => {
    if (!dane) return;
    if (maZegar && dane.czas) {
      if (aktywnyZegar?.id !== dane.id) ustawAktywnyZegar({ id: dane.id, limitMin: dane.czas });
    } else if (aktywnyZegar?.id === dane.id) ustawAktywnyZegar(null);
  }, [dane, maZegar, aktywnyZegar?.id]);
  const session = useSession();
  const ai = useAiReady(session ? session.user.id : null) === true;
  // Który z błędów do omówienia jest otwarty (indeks w doOmowienia), null: nie omawiamy.
  const [omawiany, setOmawiany] = useState<number | null>(null);
  // Skąd Pestka wlatuje do karty omawiania (miejsce, w którym siedziała na zadaniu).
  const [wejsciePestki, setWejsciePestki] = useState<Wejscie | null>(null);
  const zacznijOmawianie = () => {
    if (dane && doOmowienia(dane, postep).length) setOmawiany(0);
  };
  // Domyślnie cały arkusz na jednej stronie. Na życzenie arkusz w stronach jak wydruk CKE
  // (uczy układu i przechodzenia między stronami); wybór pamięta przeglądarka. Numer strony
  // siedzi w adresie (?strona=5), więc przeżywa odświeżenie. Import bez stron zostaje jedną stroną.
  const [wStronach, setWStronach] = useState(() => czytajWStronach());
  const mozliweStrony = useMemo(() => {
    if (!dane || !dane.zadania.every((z) => z.strona)) return null;
    const s = [...new Set(dane.zadania.flatMap(stronyZadania))].sort((a, b) => a - b);
    return s.length > 1 ? s : null;
  }, [dane]);
  const strony = wStronach ? mozliweStrony : null;
  const [paramsStron, setParamsStron] = useSearchParams();
  const zAdresu = Number(paramsStron.get("strona"));
  const strona = strony ? (strony.includes(zAdresu) ? zAdresu : strony[0]) : undefined;
  // Zadanie, nad którym uczeń ostatnio był na ekranie (nie czyści się na górze arkusza, gdzie żadne nie jest widoczne).
  const ostatnieZadanie = useRef<{ nr: number } | null>(null);
  useEffect(() => {
    if (!dane) return;
    const numery = dane.zadania.map((z) => z.nr);
    const zapamietaj = () => {
      const z = zadanieNaEkranie(numery);
      if (z) ostatnieZadanie.current = { nr: z.nr };
    };
    window.addEventListener("scroll", zapamietaj, { passive: true });
    return () => window.removeEventListener("scroll", zapamietaj);
  }, [dane]);
  const idzNaStrone = useCallback(
    (s: number, naGore = true) => {
      setParamsStron(
        (p) => {
          const n = new URLSearchParams(p);
          n.set("strona", String(s));
          return n;
        },
        { replace: true },
      );
      if (naGore) window.scrollTo({ top: 0 });
    },
    [setParamsStron],
  );
  // Do zadania na innej stronie (link „Zadanie 3.” w podsumowaniu, omawianie): najpierw strona, potem przewinięcie.
  const pokaz = useCallback(
    (idElementu: string, s: number | undefined, odstep: number) => {
      if (s !== undefined && strona !== undefined && strona !== s) idzNaStrone(s, false);
      // Nad elementem zostaje miejsce pod paskiem, żeby Pestka mogła usiąść na zadaniu.
      window.setTimeout(() => {
        const el = document.getElementById(idElementu);
        if (!el) return;
        const pasek = document.querySelector("nav[aria-label=\"Główna\"]")?.getBoundingClientRect().bottom ?? 0;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - pasek - odstep, behavior: "smooth" });
      }, 60);
    },
    [strona, idzNaStrone],
  );
  const pokazZadanie = useCallback(
    (nr: number) => {
      const z = dane?.zadania.find((x) => x.nr === nr);
      pokaz(`zadanie-${nr}`, z && strony ? stronyZadania(z)[0] : undefined, 72);
    },
    [dane, strony, pokaz],
  );
  // Do podpunktu: w arkuszu w stronach na stronę, na której leży jego pytanie.
  const pokazPytanie = useCallback(
    (nr: string) => {
      const z = dane?.zadania.find((x) => x.nr === nrZadania(nr));
      const b = z?.bloki.find((x) => (x.typ === "pytanie" ? x.nr === nr : (x.typ === "pytania" || x.typ === "tabela") && x.nr.includes(nr)));
      pokaz(`pytanie-${nr}`, z && strony ? (b?.strona ?? z.strona ?? stronyZadania(z)[0]) : undefined, 24);
    },
    [dane, strony, pokaz],
  );
  useEffect(() => {
    const zHasha = () => {
      const m = location.hash.match(/^#zadanie-(\d+)$/);
      if (m) pokazZadanie(Number(m[1]));
    };
    zHasha();
    window.addEventListener("hashchange", zHasha);
    return () => window.removeEventListener("hashchange", zHasha);
  }, [pokazZadanie]);
  // Przejście na pełnym ekranie do brudnopisu zadania z innej strony: brudnopis stoi
  // na ostatniej stronie zadania, więc tam przewracamy arkusz.
  useEffect(() => {
    if (!dane || !strony) return;
    const naPrzejscie = (e: Event) => {
      const plik = (e as CustomEvent<string>).detail;
      const z = dane.zadania.find((x) => `${dane.id}-${x.nr}` === plik);
      const s = z ? stronyZadania(z).at(-1) : undefined;
      if (s !== undefined && s !== strona) idzNaStrone(s, false);
    };
    window.addEventListener(ZDARZENIE_PELNY, naPrzejscie);
    return () => window.removeEventListener(ZDARZENIE_PELNY, naPrzejscie);
  }, [dane, strony, strona, idzNaStrone]);
  // Strzałki w lewo i w prawo przewracają strony, o ile uczeń nie pisze w polu.
  useEffect(() => {
    if (!strony || strona === undefined) return;
    const naKlawisz = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      // Na pełnym ekranie brudnopisu strona pod spodem stoi w miejscu.
      if (document.querySelector('section[role="dialog"][aria-label^="Brudnopis"]')) return;
      if ((e.target as Element).closest("input, textarea, select, [contenteditable='true'], .excalidraw")) return;
      const i = strony.indexOf(strona);
      if (e.key === "ArrowRight" && i < strony.length - 1) idzNaStrone(strony[i + 1]);
      if (e.key === "ArrowLeft" && i > 0) idzNaStrone(strony[i - 1]);
    };
    window.addEventListener("keydown", naKlawisz);
    return () => window.removeEventListener("keydown", naKlawisz);
  }, [strony, strona, idzNaStrone]);

  // Karta omawiania stoi pod ostatnią stroną zadania; „Następny błąd” może być na innej stronie.
  useEffect(() => {
    if (omawiany === null || !dane || !strony) return;
    const z = doOmowienia(dane, postep)[omawiany]?.zadanie;
    const s = z ? stronyZadania(z).at(-1) : undefined;
    if (s !== undefined && s !== strona) idzNaStrone(s, false);
  }, [omawiany]);

  const { showHints, dismiss: odprawPestke } = useTutor();
  const lot = useRef<number>();
  useEffect(() => () => window.clearTimeout(lot.current), []);
  // Pestka leci prosto do pierwszego zadania z błędem (bez powrotu do rogu), mówi, od którego
  // zaczynamy, i oddaje głos karcie omawiania pod tym zadaniem. Strona przewija się do zadania,
  // a Pestka czeka w miejscu (trzymaj) i skacze na zadanie, gdy ono wjedzie na ekran.
  const lecDoBledu = () => {
    const pierwszy = dane ? doOmowienia(dane, postep)[0] : undefined;
    if (!pierwszy) return;
    const nr = pierwszy.zadanie.nr;
    setOmawiany(null);
    pokazZadanie(nr);
    window.clearTimeout(lot.current);
    // Chwila na przełączenie strony arkusza: wskazówka bez celu na stronie zostałaby pominięta.
    lot.current = window.setTimeout(() => {
      showHints(`omow-lot-${Date.now()}`, [{ target: `zadanie-${nr}`, text: `Zaczynamy od zadania ${nr}.`, actions: [], trzymaj: true }]);
      lot.current = window.setTimeout(async () => {
        // Pestka się rozkleja (drży, zamyka oczy, dzieli się): druga wlatuje do karty, a ona wraca na spoczynek.
        const podzial = await rozklejPestke();
        setWejsciePestki({ z: podzial?.doKarty ?? null, id: Date.now() });
        // Druga Pestka wraca na spoczynek tym samym skokiem co w przewodniku (rozklejPestke).
        odprawPestke();
        setOmawiany(0);
        // Dymek pojawia się dopiero po wylądowaniu (ok. 0,7 s), więc zostaje chwila na przeczytanie.
      }, 2600);
    }, 150);
  };
  // Po sprawdzeniu arkusza Pestka przylatuje do wyniku i pyta, czy poprawiamy błędy.
  const zaproponujOmowienie = (ile: number) => {
    window.clearTimeout(lot.current);
    lot.current = window.setTimeout(
      () =>
        showHints(`omow-${Date.now()}`, [
          {
            target: "wynik",
            text: `Przejrzałam arkusz: ${ile === 1 ? "błąd jest w jednym zadaniu" : `błędy są w ${ile} zadaniach`}. Poprawimy?`,
            trzymaj: true,
            actions: [
              { label: "Tak, poprawmy", primary: true, onClick: lecDoBledu },
              { label: "Później", onClick: odprawPestke },
            ],
          },
        ]),
      800,
    );
  };
  const [params, setParams] = useSearchParams();
  // ?omow=1 (np. z pulpitu) od razu otwiera omawianie błędów sprawdzonego arkusza.
  useEffect(() => {
    if (!params.has("omow") || !dane || !ai) return;
    if (postep.sprawdzony) zacznijOmawianie();
    setParams({}, { replace: true });
  }, [params, dane, ai, postep.sprawdzony]);
  // W trybie na czas długa cisza to też praca nad arkuszem, nie przerwa.
  const ciszaTezLiczy = !!postep.czas?.start;

  const kontekst = useMemo<Kontekst | null>(() => {
    if (!dane) return null;
    const pytania = new Map<string, Pytanie>();
    const wBloku = new Set<string>();
    const opcjeZadan = new Map<number, Opcja[]>();
    const luki = new Map<Blok, Luka>();
    const kadryTekst = new Map<Blok, Blok[]>();
    const lukiKadrow = new Map<Blok, Luka>();
    const obliczenia = new Set<string>();
    const kody = new Map<string, WyborKodu>();
    const ukryteKodem = new Set<Blok>();
    const pf = new Map<string, StwierdzeniaPF>();
    const dwie = new Map<string, WyborDwoch>();
    const tabele = new Map<string, TabelaDopasowania>();
    const opcjeNaRysunkach = new Map<string, { kadr: Blok; tekst: Blok[] }>();
    for (const z of dane.zadania) {
      for (const p of z.pytania) pytania.set(p.nr, p);
      (lukiZadania(z) ?? pojedynczeLuki(z)).forEach((l, b) => luki.set(b, l));
      if ([...luki.values()].some((l) => l.opcje && z.pytania.includes(l.pytanie))) opcjeDoLiter(z)?.ukryte.forEach((b) => ukryteKodem.add(b));
      pytaniaZObliczeniami(z).forEach((nr) => obliczenia.add(nr));
      tabeleDopasowania(z).forEach((t, nr) => tabele.set(nr, t));
      rysunkoweOpcje(z).forEach((o, nr) => opcjeNaRysunkach.set(nr, o));
      wyboryDwoch(z).forEach((w, nr) => {
        dwie.set(nr, w);
        w.ukryte.forEach((b) => ukryteKodem.add(b));
      });
      // Całe zadanie P/F w wycinku: na pełnym ekranie tekst, a stwierdzenia z przełącznikami (też na stronie).
      const zKadru = pfZKadru(z);
      if (zKadru) {
        kadryTekst.set(zKadru.kadr, zKadru.tekst);
        pf.set(zKadru.nr, zKadru.stwierdzenia);
      }
      stwierdzeniaPF(z).forEach((w, nr) => {
        pf.set(nr, w);
        w.ukryte.forEach((b) => ukryteKodem.add(b));
      });
      kodyZWyborem(z).forEach((w, nr) => {
        kody.set(nr, w);
        w.ukryte.forEach((b) => ukryteKodem.add(b));
      });
      z.bloki.forEach((b, i) => {
        // Wycinek z samym tekstem (niski przy długim tekście, bez rysunku) na pełnym ekranie jako tekst.
        // Linia tekstu na szerokości arkusza to ok. 95 znaków i 20 pkt wysokości.
        if (b.typ === "kadr" && b.obraz.wys <= Math.ceil(b.tekst.length / 95) * 20 + 20) kadryTekst.set(b, naAkapity(b.tekst));
        const k = kadrZLuka(b, z.bloki[i + 1], z);
        if (!k) return;
        kadryTekst.set(b, k.bloki);
        lukiKadrow.set(...k.luka);
      });
      for (const b of z.bloki) {
        if (b.typ === "pytanie") wBloku.add(b.nr);
        if (b.typ === "pytania" || b.typ === "tabela") b.nr.forEach((n) => wBloku.add(n));
        if (b.typ === "opcje" && !opcjeZadan.has(z.nr)) opcjeZadan.set(z.nr, b.opcje);
      }
    }
    return {
      arkusz: dane,
      luki,
      kadryTekst,
      lukiKadrow,
      obliczenia,
      kody,
      ukryteKodem,
      pf,
      dwie,
      tabele,
      opcjeNaRysunkach,
      wTabeli: new Set(dane.zadania.flatMap((z) => z.bloki.flatMap((b) => (b.typ === "tabelaTresci" && b.pytanie ? [b.pytanie] : [])))),
      postep,
      pytania,
      wBloku,
      sprawdzone,
      otwartaLuka,
      setOtwartaLuka,
      idzDoZadania: pokazZadanie,
      idzDoPytania: pokazPytanie,
      opcjeDla: (nr) => {
        const p = pytania.get(nr);
        return p?.typ === "zamkniete" ? (p.opcje ?? opcjeZadan.get(nrZadania(nr))) : undefined;
      },
      ustaw: (nr, wartosc) => {
        const ms = odmierz(ciszaTezLiczy);
        zmien((p) =>
          p.sprawdzony || p.sprawdzoneZadania.includes(nrZadania(nr)) ? p : dodajCzas({ ...p, odpowiedzi: { ...p.odpowiedzi, [nr]: wartosc } }, nrZadania(nr), ms),
        );
      },
      ocen: (nr, ocena) => zmien((p) => ({ ...p, samoocena: { ...p.samoocena, [nr]: ocena } })),
      // Brudnopis to pomoc, więc działa także po sprawdzeniu zadania.
      ustawBrudnopis: (zadanie, zapis) => {
        const ms = odmierz(ciszaTezLiczy);
        zmien((p) => {
          const brudnopisy = { ...p.brudnopisy };
          if (zapis) brudnopisy[zadanie] = zapis;
          else delete brudnopisy[zadanie];
          // Rysowanie po sprawdzeniu to już nie rozwiązywanie, więc nie dolicza czasu.
          const liczy = !p.sprawdzony && !p.sprawdzoneZadania.includes(Number(zadanie));
          if (!liczy) return { ...p, brudnopisy };
          // Przy „Zapisz obliczenia” odpowiedzią jest szkic: jest szkic, jest odpowiedź do oceny.
          const odpowiedzi = { ...p.odpowiedzi };
          for (const nr of obliczenia) if (nrZadania(nr) === Number(zadanie)) odpowiedzi[nr] = zapis ? ODPOWIEDZ_NA_PLOTNIE : "";
          return dodajCzas({ ...p, brudnopisy, odpowiedzi }, Number(zadanie), ms);
        });
      },
      // Kod w warsztacie, jak brudnopis, zostaje do dyspozycji także po sprawdzeniu.
      ustawWarsztat: (zadanie, zapis) => {
        const ms = odmierz(ciszaTezLiczy);
        zmien((p) => {
          const z = { ...p, warsztat: { ...p.warsztat, [zadanie]: zapis } };
          return p.sprawdzony || p.sprawdzoneZadania.includes(zadanie) ? z : dodajCzas(z, zadanie, ms);
        });
      },
    };
  }, [dane, postep, zmien, sprawdzone, otwartaLuka, ciszaTezLiczy, pokazZadanie, pokazPytanie]);

  // Lista zdań pod luką zamyka się kliknięciem obok albo klawiszem Escape.
  useEffect(() => {
    if (!otwartaLuka) return;
    const zamknij = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !(e.target as Element).closest("[data-luka]")) setOtwartaLuka(null);
    };
    document.addEventListener("keydown", zamknij);
    document.addEventListener("pointerdown", zamknij);
    return () => {
      document.removeEventListener("keydown", zamknij);
      document.removeEventListener("pointerdown", zamknij);
    };
  }, [otwartaLuka]);

  const wynik = dane ? policz(dane, postep.odpowiedzi, postep.samoocena) : null;
  // Zapisany wynik aktualizujemy, gdy uczeń ocenia odpowiedzi otwarte.
  const zdobyte = wynik?.zdobyte;
  useEffect(() => {
    if (zdobyte === undefined) return;
    zmien((p) => (p.sprawdzony && p.wynik && p.wynik.zdobyte !== zdobyte ? { ...p, wynik: { ...p.wynik, zdobyte } } : p));
  }, [zdobyte, zmien]);

  usePrzewiniecie(id, !!dane);

  // Pestka odpoczywa po przeciwnej stronie niż panel, żeby panel miał pełną wysokość (patrz TutorGuide).
  const stronaPanelu = materialy?.otwarty && !uklad.waski ? uklad.strona : undefined;
  // Treść odsuwa się razem z wysuwaniem panelu; podczas ciągnięcia uchwytu odsunięcie ma śledzić myszkę bez opóźnienia.
  const [animujOdsuniecie, setAnimujOdsuniecie] = useState(false);
  useEffect(() => {
    setAnimujOdsuniecie(true);
    const t = window.setTimeout(() => setAnimujOdsuniecie(false), 600);
    return () => window.clearTimeout(t);
  }, [stronaPanelu]);
  useEffect(() => {
    if (!stronaPanelu) return;
    document.documentElement.dataset.panelStrona = stronaPanelu;
    return () => {
      delete document.documentElement.dataset.panelStrona;
    };
  }, [stronaPanelu]);

  if (laduje)
    return (
      <main className={`container ${styles.page}`}>
        <Ladowanie ksztalt="tekst" ile={7} etykieta="Wczytuję arkusz" />
      </main>
    );
  if (blad || !dane || !kontekst || !wynik) {
    return (
      <main className={`container ${styles.page}`}>
        <h1 className="h1">Nie ma takiego arkusza</h1>
        <Link to="/arkusze" className="link">
          Wróć do listy
        </Link>
      </main>
    );
  }

  const sprawdzCaly = () => {
    zmien((p) => ({
      ...p,
      sprawdzony: true,
      wynik: { zdobyte: wynik.zdobyte, mozliwe: wynik.mozliwe, kiedy: new Date().toISOString() },
      czas: p.czas && zatrzymaj(p.czas),
    }));
    if (strony) idzNaStrone(strony[0], false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const ile = doOmowienia(dane, postep).length;
    if (ai && ile) zaproponujOmowienie(ile);
  };
  const odNowa = () => {
    zmien(() => pustyPostep);
    if (strony) idzNaStrone(strony[0], false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // Poprawa zadania: odpowiedzi zostają, znika ocena i samoocena jego pytań.
  const poprawZadanie = (z: Zadanie) =>
    zmien((p) => {
      const samoocena = { ...p.samoocena };
      for (const q of z.pytania) delete samoocena[q.nr];
      const sprawdzoneZadania = p.sprawdzony ? dane.zadania.map((x) => x.nr) : p.sprawdzoneZadania;
      return { ...p, samoocena, sprawdzony: false, wynik: undefined, sprawdzoneZadania: sprawdzoneZadania.filter((n) => n !== z.nr) };
    });

  const ustawCzas = (c: Czas | undefined) => zmien((p) => ({ ...p, czas: c }));
  const naCzas = () => ustawCzas({ start: Date.now(), zuzyte: 0 });

  const listaOmowien = postep.sprawdzony ? doOmowienia(dane, postep) : [];
  const omawiane = omawiany !== null ? listaOmowien[omawiany] : undefined;

  const odpowiedziane = [...kontekst.pytania.keys()].filter((nr) => postep.odpowiedzi[nr]?.trim()).length;

  const zadanieMaterialow = materialy ? dane.zadania.find((z) => z.nr === materialy.nr) : undefined;
  // Panel obok treści odsuwa arkusz od swojej krawędzi; na wąskim ekranie przykrywa go w całości.
  const odsuniecie = {
    [uklad.strona === "prawa" ? "paddingRight" : "paddingLeft"]: materialy?.otwarty && !uklad.waski ? `calc(${uklad.szerokosc}px + 32px)` : 0,
    ...(animujOdsuniecie ? { transition: "padding 0.5s cubic-bezier(0.22, 1, 0.36, 1)" } : {}),
  };

  return (
    <Ctx.Provider value={kontekst}>
      <MaterialyCtx.Provider value={materialyCtx}>
      <div style={odsuniecie}>
      <main className={`container ${styles.page}`}>
        <Naglowek
          arkusz={dane}
          onNaCzas={dane.czas && !postep.czas && !postep.sprawdzony ? naCzas : undefined}
          zwiniety={!!strony && strona !== strony[0]}
          wStronach={
            mozliweStrony && (!strony || strona === strony[0])
              ? {
                  wlaczone: wStronach,
                  onZmien: () => {
                    // Przełącznik stoi w nagłówku, więc uczeń klika go z góry arkusza. Po zmianie sposobu
                    // pokazania wraca więc do zadania, nad którym ostatnio pracował, a nie do początku.
                    const miejsce = ostatnieZadanie.current;
                    const z = miejsce && dane.zadania.find((x) => x.nr === miejsce.nr);
                    if (!wStronach && z && mozliweStrony) idzNaStrone(stronyZadania(z)[0], false);
                    zapiszWStronach(!wStronach);
                    setWStronach(!wStronach);
                    if (!miejsce) return;
                    window.setTimeout(() => {
                      const el = document.getElementById(`zadanie-${miejsce.nr}`);
                      if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 96) });
                    }, 80);
                  },
                }
              : undefined
          }
        />

        {/* Wynik jak okładka: na pierwszej stronie arkusza, nie na każdej. */}
        {postep.sprawdzony && (!strony || strona === strony[0]) && (
          <Podsumowanie
            wynik={wynik}
            odNowa={odNowa}
            czas={postep.czas}
            limitMin={dane.czas}
            arkusz={dane}
            postep={postep}
            omow={{ ile: doOmowienia(dane, postep).length, ai, start: lecDoBledu }}
          />
        )}

        <SpisZadan />

        {dane.zadania
          .filter((z) => strona === undefined || stronyZadania(z).includes(strona))
          .map((z) => (
          <Fragment key={z.nr}>
            <ZadanieWidok zadanie={z} strona={strona} onPopraw={() => poprawZadanie(z)} />
            {omawiane?.zadanie.nr === z.nr && (strona === undefined || strona === stronyZadania(z).at(-1)) && (
              <OmowienieBledow
                key={z.nr}
                wejscie={wejsciePestki}
                arkusz={dane}
                postep={postep}
                d={omawiane}
                numer={omawiany! + 1}
                wszystkich={listaOmowien.length}
                onDalej={() => {
                  // Kolejny błąd: Pestka wskakuje do nowej karty z góry i znowu wyjaśnia.
                  setWejsciePestki({ z: null, id: Date.now() });
                  setOmawiany(omawiany! + 1);
                }}
                onWynikPrzykladu={(nr, w) => zmien((p) => ({ ...p, omowione: { ...p.omowione, [nr]: w } }))}
                onZapiszRozmowe={(nr, r) => zmien((p) => ({ ...p, rozmowyOmowien: { ...p.rozmowyOmowien, [nr]: r } }))}
                onZamknij={() => {
                  setOmawiany(null);
                  setWejsciePestki(null);
                }}
              />
            )}
          </Fragment>
        ))}

        {strony && strona !== undefined && <Strony strony={strony} strona={strona} onZmien={idzNaStrone} />}

        <footer className={styles.footer}>
          {postep.sprawdzony ? (
            <button type="button" className="btn btn-ghost" onClick={odNowa}>
              <RotateCcw size={16} aria-hidden="true" /> Rozwiąż od nowa
            </button>
          ) : (
            <>
              <p className="muted small">
                Odpowiedzi: {odpowiedziane} z {kontekst.pytania.size}. Zapisują się na bieżąco w tej przeglądarce.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={sprawdzCaly}
                data-tutor-about="Po sprawdzeniu zobaczysz klucz przy każdym pytaniu. Odpowiedzi otwarte spoza listy CKE ocenisz sam, z kluczem przed oczami."
              >
                <Check size={18} aria-hidden="true" /> Sprawdź cały arkusz
              </button>
            </>
          )}
        </footer>
      </main>
      </div>
      {materialy && zadanieMaterialow && (
        <CeleWstawiania.Provider
          value={zadanieMaterialow.pytania.flatMap((p) =>
            p.typ === "otwarte" && !p.kod && !kontekst.sprawdzone(p.nr) ? [{ nr: p.nr, rodzaj: rodzajPytania(p, zadanieMaterialow), odpowiedz: postep.odpowiedzi[p.nr] ?? "" }] : [],
          )}
        >
        <PanelWarsztatu
          zadanie={zadanieMaterialow}
          pliki={dane.dane?.pliki ?? {}}
          zip={dane.dane?.zip}
          zapis={postep.warsztat?.[zadanieMaterialow.nr]}
          onZapis={(z) => kontekst.ustawWarsztat(zadanieMaterialow.nr, z)}
          doWstawienia={zadanieMaterialow.pytania.filter((p) => p.typ === "otwarte" && !p.kod && !sprawdzone(p.nr)).map((p) => p.nr)}
          onWstaw={kontekst.ustaw}
          uklad={uklad}
          otwarty={materialy.otwarty}
          onSchowaj={() => setMaterialy((m) => m && { ...m, otwarty: false })}
          przycisk={przyciskMaterialow}
        />
        </CeleWstawiania.Provider>
      )}
      </MaterialyCtx.Provider>
    </Ctx.Provider>
  );
}

// Przewinięcie arkusza przetrwa odświeżenie strony (w obrębie karty przeglądarki).
// Zapisujemy zadanie u góry ekranu i przesunięcie względem niego, a nie same piksele:
// treść nad nim dochodzi asynchronicznie (wzory, obrazki, brudnopisy) i zmienia wysokość.
// Powrót ponawiamy przez kilka sekund, chyba że uczeń sam zacznie przewijać.
type Miejsce = { zadanie: string; przesuniecie: number };

function usePrzewiniecie(id: string, gotowe: boolean) {
  useEffect(() => {
    if (!gotowe) return;
    const klucz = `sedno.przewiniecie.${id}`;
    const zadania = () => [...document.querySelectorAll<HTMLElement>('section[id^="zadanie-"]')];
    const gora = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;

    let miejsce: Miejsce | null = null;
    try {
      const zapis = JSON.parse(sessionStorage.getItem(klucz) ?? "null");
      if (typeof zapis?.zadanie === "string" && typeof zapis.przesuniecie === "number") miejsce = zapis;
    } catch {
      // zablokowany storage albo stary zapis: zaczynamy od góry
    }
    const poprzednie = history.scrollRestoration;
    history.scrollRestoration = "manual";

    let wraca = !!miejsce;
    let klatka = 0;
    let proby = 0;
    const wroc = () => {
      const el = miejsce && document.getElementById(miejsce.zadanie);
      if (!el || !miejsce) {
        wraca = false;
        return;
      }
      const cel = Math.max(0, gora(el) + miejsce.przesuniecie);
      if (Math.abs(window.scrollY - cel) > 1) window.scrollTo(0, cel);
      // Ok. 5 s: tyle zwykle dochodzą wzory i obrazki.
      if (proby++ < 300) klatka = requestAnimationFrame(wroc);
      else wraca = false;
    };
    if (wraca) wroc();
    const przerwij = () => {
      wraca = false;
      cancelAnimationFrame(klatka);
    };

    let timer = 0;
    const naPrzewiniecie = () => {
      if (wraca) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const lista = zadania();
        // Pierwsze zadanie zaczynające się na ekranie: zmiany wysokości nad nim nie przesuną widoku.
        const u = lista.find((el) => el.getBoundingClientRect().top >= 0) ?? lista[lista.length - 1];
        if (!u) return;
        const zapis: Miejsce = { zadanie: u.id, przesuniecie: Math.round(window.scrollY - gora(u)) };
        try {
          sessionStorage.setItem(klucz, JSON.stringify(zapis));
        } catch {
          // brak miejsca albo zablokowany storage
        }
      }, 150);
    };
    const wejscia = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    wejscia.forEach((w) => window.addEventListener(w, przerwij, { passive: true }));
    window.addEventListener("scroll", naPrzewiniecie, { passive: true });
    return () => {
      przerwij();
      window.clearTimeout(timer);
      wejscia.forEach((w) => window.removeEventListener(w, przerwij));
      window.removeEventListener("scroll", naPrzewiniecie);
      history.scrollRestoration = poprzednie;
    };
  }, [id, gotowe]);
}

// zwiniety: dalsza strona arkusza w stronach. Jak w wydruku pełny nagłówek jest tylko na pierwszej,
// ale odtwarzacz zostaje w tym samym miejscu drzewa, żeby nagranie nie urwało się przy przewracaniu.
const KLUCZ_STRON = "sedno.arkuszWStronach";
function czytajWStronach() {
  try {
    return localStorage.getItem(KLUCZ_STRON) === "1";
  } catch {
    return false;
  }
}
function zapiszWStronach(w: boolean) {
  try {
    localStorage.setItem(KLUCZ_STRON, w ? "1" : "0");
  } catch {
    // bez dostępu do pamięci przeglądarki wybór działa do zamknięcia karty
  }
}

function Naglowek({ arkusz, onNaCzas, zwiniety, wStronach }: { arkusz: ArkuszDane; onNaCzas?: () => void; zwiniety?: boolean; wStronach?: { wlaczone: boolean; onZmien: () => void } }) {
  const maSluchanie = arkusz.zadania.some((z) => z.sluchanie);
  // Tryb na czas startuje dopiero po przeczytaniu, co obejmuje i jak działa zegar.
  const [pytaONaCzas, setPytaONaCzas] = useState(false);
  return (
    <header className={styles.head}>
      <Link to="/arkusze" className={`small muted ${styles.back}`}>
        <ArrowLeft size={16} aria-hidden="true" /> Arkusze
      </Link>
      <span className="label">
        {nazwaPrzedmiotu[arkusz.przedmiot] ?? arkusz.przedmiot} · {nazwaPoziomu[arkusz.poziom]} · formuła {arkusz.formula ?? "2023"} · {arkusz.symbol}
      </span>
      {!zwiniety && (
      <h1 className="h1">
        Matura {arkusz.sesja} {arkusz.rok}
      </h1>
      )}
      {!zwiniety && <p className="muted">{[arkusz.data, arkusz.czas && `${arkusz.czas} minut`, `${arkusz.punkty} pkt`].filter(Boolean).join(" · ")}</p>}
      {!zwiniety && arkusz.przedmiot === "matematyka" && <p className="small muted">Brudnopis nie wpływa na wynik w zadaniach zamkniętych. Zapisuje się w postępie arkusza.</p>}
      {!zwiniety && (arkusz.pdf?.arkusz || onNaCzas || wStronach) && (
        <div className={styles.pdfs}>
          {arkusz.pdf?.arkusz && (
            <a className="btn btn-secondary btn-sm" href={arkusz.pdf?.arkusz} target="_blank" rel="noreferrer">
              <FileText size={16} aria-hidden="true" /> Arkusz PDF
            </a>
          )}
          {onNaCzas && (
            <button type="button" className="btn btn-ghost btn-sm" aria-expanded={pytaONaCzas} aria-controls="na-czas" onClick={() => setPytaONaCzas(!pytaONaCzas)}>
              <Timer size={16} aria-hidden="true" /> Rozwiąż na czas
            </button>
          )}
          {wStronach && (
            <button type="button" className="btn btn-ghost btn-sm" aria-pressed={wStronach.wlaczone} onClick={wStronach.onZmien}>
              <BookOpen size={16} aria-hidden="true" /> {wStronach.wlaczone ? "Wszystko na jednej stronie" : "Podziel na strony jak w arkuszu"}
            </button>
          )}
        </div>
      )}
      {!zwiniety && onNaCzas && pytaONaCzas && (
        <div id="na-czas" className={styles.naCzas}>
          <p>
            Zegar odmierza {arkusz.czas} minut na cały arkusz, tyle co na maturze. Odpowiedzi zapisują się jak zawsze, a zegar i tak ich nie blokuje: po czasie możesz pisać dalej.
          </p>
          <ul className="small muted">
            <li>Zegar możesz wstrzymać albo wyłączyć. Stan trzyma postęp arkusza, więc przeżywa odświeżenie strony i zapisuje się na koncie.</li>
            <li>Pestka odezwie się trzy razy: w połowie czasu, na 15 minut przed końcem i po czasie.</li>
            <li>„Sprawdź cały arkusz” zatrzymuje zegar, a wynik pokaże twój czas i tempo przy zadaniach.</li>
          </ul>
          <div className={styles.pdfs}>
            <button type="button" className="btn btn-primary btn-sm" onClick={onNaCzas}>
              <Timer size={16} aria-hidden="true" /> Start, {arkusz.czas} minut
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPytaONaCzas(false)}>
              Nie teraz
            </button>
          </div>
        </div>
      )}
      {!zwiniety && wStronach && (
        <p className="small muted">
          {wStronach.wlaczone
            ? "Strony to tylko sposób pokazania arkusza jak na wydruku CKE. Zadania, odpowiedzi, zegar i zapis są te same, co na jednej stronie."
            : "Podział na strony to tylko sposób pokazania arkusza jak na wydruku CKE (strzałki w lewo i w prawo przewracają). Zadania, odpowiedzi, zegar i zapis są te same."}
        </p>
      )}
      {maSluchanie && arkusz.nagranie && <Nagranie src={arkusz.nagranie} />}
      {!zwiniety && <p className="small muted">Źródło: Centralna Komisja Egzaminacyjna, cke.gov.pl.</p>}
    </header>
  );
}

function Podsumowanie({
  wynik,
  odNowa,
  czas,
  limitMin,
  arkusz,
  postep,
  omow,
}: {
  wynik: ReturnType<typeof policz>;
  odNowa: () => void;
  czas?: Czas;
  limitMin?: number;
  arkusz: ArkuszDane;
  postep: Postep;
  omow: { ile: number; ai: boolean; start: () => void };
}) {
  const procent = wynik.mozliwe ? Math.round((wynik.zdobyte / wynik.mozliwe) * 100) : 0;
  return (
    <section className={styles.summary} aria-live="polite" data-tutor="wynik">
      <span className="label">{wynik.wypowiedzi ? "Wynik bez wypowiedzi pisemnej" : "Wynik"}</span>
      <p className={styles.bigScore}>
        {wynik.zdobyte} <span className="muted">/ {wynik.mozliwe} pkt</span> <span className={styles.percent}>{procent}%</span>
      </p>
      <p className="muted">
        {wynik.doOceny > 0
          ? `${wynik.doOceny} ${wynik.doOceny === 1 ? "odpowiedź otwarta czeka" : "odpowiedzi otwarte czekają"} na twoją ocenę. Porównaj z kluczem albo schematem oceniania przy pytaniu.`
          : "Wszystkie odpowiedzi ocenione."}
        {wynik.wypowiedzi > 0 && ` Wypowiedź pisemna (${wynik.wypowiedzi} pkt) wymaga oceny według kryteriów, na razie bez punktów.`}
      </p>
      {czas && (
        <p className="muted">
          Czas: {zapisCzasu(uplynelo(czas))}
          {limitMin ? ` z ${limitMin} minut${uplynelo(czas) > limitMin * 60_000 ? ", po czasie" : ""}.` : "."}
        </p>
      )}
      <TempoZadan arkusz={arkusz} postep={postep} />
      {/* Klucz dopiero po sprawdzeniu: przed rozwiązaniem kusiłby podejrzeniem. */}
      {arkusz.pdf?.zasady && (
        <a className="link" href={arkusz.pdf.zasady} target="_blank" rel="noreferrer">
          <FileText size={16} aria-hidden="true" /> Zasady oceniania PDF
        </a>
      )}
      {omow.ile > 0 &&
        (omow.ai ? (
          <button type="button" className="btn btn-primary" onClick={omow.start}>
            <MessagesSquare size={18} aria-hidden="true" /> Omów błędy z Pestką ({omow.ile})
          </button>
        ) : (
          <p className="small muted">
            Pestka omówi z tobą błędy, gdy podłączysz AI w <Link to="/profil">profilu</Link>.
          </p>
        ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={odNowa}>
        <RotateCcw size={16} aria-hidden="true" /> Rozwiąż od nowa
      </button>
    </section>
  );
}

/** Zadania, przy których czas razem z wynikiem coś mówi: długo i źle, długo i dobrze, szybko i źle. */
function TempoZadan({ arkusz, postep }: { arkusz: ArkuszDane; postep: Postep }) {
  const czasy = postep.czasZadan ?? {};
  if (!Object.keys(czasy).length) return null;
  const wiersze = arkusz.zadania.flatMap((z) => {
    const ms = czasy[z.nr];
    if (!ms) return [];
    const w = policzPytania(z.pytania, postep.odpowiedzi, postep.samoocena);
    const t = tempo(ms, norma(arkusz, z), w.mozliwe ? w.zdobyte / w.mozliwe : null);
    return t && t !== "w-normie" ? [{ z, ms, t, n: norma(arkusz, z)! }] : [];
  });
  return (
    <div className={styles.tempo}>
      <span className="label">Czas przy zadaniach</span>
      {wiersze.length ? (
        <ul>
          {wiersze.slice(0, 5).map(({ z, ms, t, n }) => (
            <li key={z.nr}>
              <a href={`#zadanie-${z.nr}`}>Zadanie {z.nr}.</a>
              <span>
                {minuty(ms)} <span className="muted">(norma ok. {minuty(n)})</span>
              </span>
              <span className="muted">{opisTempa[t]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Tempo w normie przy wszystkich zadaniach, przy których był mierzony czas.</p>
      )}
      <p className="small muted">Czas liczymy od poprzedniej czynności w arkuszu, bez chwil poza kartą. Norma to czas arkusza proporcjonalnie do punktów.</p>
    </div>
  );
}

// Zadanie, które uczeń ma teraz na ekranie: ostatnie, którego początek minął linię pod paskiem.
// W arkuszu w stronach liczą się tylko zadania obecne na stronie.
function zadanieNaEkranie(numery: number[]): { nr: number; odGory: number } | null {
  const pasek = document.querySelector("nav[aria-label=\"Główna\"]")?.getBoundingClientRect().bottom ?? 0;
  let wynik: { nr: number; odGory: number } | null = null;
  for (const nr of numery) {
    const el = document.getElementById(`zadanie-${nr}`);
    const gora = el?.getBoundingClientRect().top;
    if (gora !== undefined && gora <= pasek + 120) wynik = { nr, odGory: gora };
  }
  return wynik;
}

function useAktualneZadanie(numery: number[]) {
  const [aktualne, setAktualne] = useState<number | null>(null);
  useEffect(() => {
    let klatka = 0;
    const licz = () => {
      klatka = 0;
      setAktualne(zadanieNaEkranie(numery)?.nr ?? null);
    };
    const zglos = () => {
      if (!klatka) klatka = requestAnimationFrame(licz);
    };
    licz();
    window.addEventListener("scroll", zglos, { passive: true });
    window.addEventListener("resize", zglos);
    // Zmiana strony arkusza podmienia zadania w drzewie bez przewinięcia.
    const obserwator = new MutationObserver(zglos);
    obserwator.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(klatka);
      obserwator.disconnect();
      window.removeEventListener("scroll", zglos);
      window.removeEventListener("resize", zglos);
    };
  }, [numery]);
  return aktualne;
}

// Zwijany spis zadań i podpunktów z oznaczeniem, co ma już odpowiedź, i skokiem do miejsca w arkuszu.
function SpisZadan() {
  const { arkusz, postep, sprawdzone, idzDoZadania, idzDoPytania } = useCtx();
  const [otwarty, setOtwarty] = useState(false);
  const numery = useMemo(() => arkusz.zadania.map((z) => z.nr), [arkusz]);
  const aktualne = useAktualneZadanie(numery);
  const maOdpowiedz = (nr: string) => !!postep.odpowiedzi[nr]?.trim();
  const wiersze = arkusz.zadania.map((z) => {
    const pytania = z.pytania.filter((p) => p.typ !== "wypowiedz");
    const ile = z.pytania.filter((p) => maOdpowiedz(p.nr)).length;
    return { z, pytania, ile, wszystkich: z.pytania.length };
  });
  const gotowych = wiersze.filter((w) => w.wszystkich > 0 && w.ile === w.wszystkich).length;
  return (
    <nav className={styles.spis} aria-label="Spis zadań">
      <button type="button" className={styles.spisPrzycisk} aria-expanded={otwarty} aria-controls="spis-zadan" onClick={() => setOtwarty(!otwarty)}>
        <List size={16} aria-hidden="true" />
        <span>Spis zadań</span>
        <span className="small muted">
          {gotowych} z {wiersze.length} z odpowiedzią
        </span>
        <ChevronDown size={16} aria-hidden="true" className={otwarty ? styles.spisStrzalkaOtwarta : undefined} />
      </button>
      {otwarty && (
        <ol id="spis-zadan" className={styles.spisLista}>
          {wiersze.map(({ z, pytania, ile, wszystkich }) => {
            const stan = ile === 0 ? "bez odpowiedzi" : ile === wszystkich ? "jest odpowiedź" : `${ile} z ${wszystkich}`;
            return (
              <li key={z.nr} className={styles.spisWiersz}>
                <button
                  type="button"
                  className={styles.spisZadanie}
                  aria-current={aktualne === z.nr ? "location" : undefined}
                  onClick={() => idzDoZadania(z.nr)}
                >
                  <span className={styles.spisNr}>{z.nr}.</span>
                  <span className={styles.spisTytul}>{z.tytul ?? `Zadanie ${z.nr}`}</span>
                  <span className={styles.spisStan} data-stan={ile === 0 ? "brak" : ile === wszystkich ? "jest" : "czesc"}>
                    {sprawdzone(`${z.nr}.`) && !postep.sprawdzony ? "sprawdzone" : stan}
                  </span>
                </button>
                {pytania.length > 1 && (
                  <ul className={styles.spisPodzadania} aria-label={`Podzadania zadania ${z.nr}`}>
                    {pytania.map((p) => (
                      <li key={p.nr}>
                        <button
                          type="button"
                          data-stan={maOdpowiedz(p.nr) ? "jest" : "brak"}
                          aria-label={`Zadanie ${p.nr}, ${maOdpowiedz(p.nr) ? "jest odpowiedź" : "bez odpowiedzi"}`}
                          onClick={() => idzDoPytania(p.nr)}
                        >
                          {p.nr}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}

// Przewracanie stron pod treścią strony, jak stopka wydruku: poprzednia, numery stron z PDF, następna.
function Strony({ strony, strona, onZmien }: { strony: number[]; strona: number; onZmien: (s: number) => void }) {
  const i = strony.indexOf(strona);
  return (
    <nav className={styles.strony} aria-label="Strony arkusza">
      <button type="button" className="btn btn-ghost btn-sm" disabled={i <= 0} onClick={() => onZmien(strony[i - 1])}>
        <ArrowLeft size={16} aria-hidden="true" /> Poprzednia
      </button>
      <ol className={styles.numery}>
          {strony.map((s) => (
            <li key={s}>
              <button type="button" aria-current={s === strona ? "page" : undefined} aria-label={`Strona ${s}`} onClick={() => onZmien(s)}>
                {s}
              </button>
            </li>
          ))}
      </ol>
      <button type="button" className="btn btn-ghost btn-sm" disabled={i >= strony.length - 1} onClick={() => onZmien(strony[i + 1])}>
        Następna <ArrowRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}

/** Strony PDF, na których leży zadanie (rosnąco). Pusta lista: import bez podziału na strony. */
function stronyZadania(z: Zadanie): number[] {
  const s = new Set<number>();
  if (z.strona) s.add(z.strona);
  for (const b of z.bloki) if (b.strona) s.add(b.strona);
  return [...s].sort((a, b) => a - b);
}

/** strona: arkusz w stronach; zadanie pokazuje tylko to, co leży na tej stronie. */
function ZadanieWidok({ zadanie, onPopraw, strona }: { zadanie: Zadanie; onPopraw: () => void; strona?: number }) {
  const materialy = useContext(MaterialyCtx);
  const otworzMaterialy = materialy.otworz;
  const { arkusz, postep, wBloku, sprawdzone, ustawBrudnopis, luki, tabele, opcjeNaRysunkach, ukryteKodem } = useCtx();
  const pisemna = zadanie.pytania[0]?.typ === "wypowiedz";
  const gotowe = sprawdzone(`${zadanie.nr}.`);
  const wTekscie = zadanie.pytania.filter((p) => !wBloku.has(p.nr) && p.typ !== "wypowiedz");
  const wynik = policzPytania(zadanie.pytania, postep.odpowiedzi, postep.samoocena);
  // Zadanie na kilku stronach: nagłówek na pierwszej, wynik, brudnopis i przyciski na ostatniej.
  const naStronach = strona !== undefined ? stronyZadania(zadanie) : null;
  const pierwsza = !naStronach || strona === naStronach[0];
  const ostatnia = !naStronach || strona === naStronach.at(-1);

  // Wypowiedź pisemna: tematy do wyboru i elementy treści trafiają do edytora.
  const pisanie = useMemo(() => (pisemna ? rozbierzPolecenie(zadanie) : null), [pisemna, zadanie]);
  // Na pełnym ekranie brudnopisu całe zadanie; na stronie arkusza tylko bloki tej strony.
  const wszystkieBloki = (pisanie ? zadanie.bloki.filter((b) => !pisanie.ukryte.has(b)) : zadanie.bloki).filter((b) => !ukryteKodem.has(b));
  const bloki = wszystkieBloki.filter((b) => strona === undefined || (b.strona ?? zadanie.strona) === strona);

  return (
    <section
      className={styles.task}
      id={pierwsza ? `zadanie-${zadanie.nr}` : undefined}
      data-tutor={pierwsza ? `zadanie-${zadanie.nr}` : undefined}
    >
      {!pierwsza && <p className={`small muted ${styles.ciagDalszy}`}>Zadanie {zadanie.nr}. · ciąg dalszy</p>}
      {pierwsza && (
      <>
      <header className={styles.taskHead}>
        <h2 className="h3">
          Zadanie {zadanie.nr}.{zadanie.tytul && <span className={styles.taskTitle}> {zadanie.tytul}</span>}
        </h2>
        <span className="small muted">
          {gotowe && !pisemna ? `${wynik.zdobyte} / ${zadanie.punkty} pkt` : `0–${zadanie.punkty} pkt`}
          {gotowe && postep.czasZadan?.[zadanie.nr] ? ` · ${minuty(postep.czasZadan[zadanie.nr]!)}` : ""}
        </span>
        {zadanie.sluchanie && (
          <span className={`small ${styles.listen}`}>
            <Headphones size={14} aria-hidden="true" /> nagranie
          </span>
        )}
      </header>
      {zadanie.polecenie.map((p, i) => (
        <p key={i} className={styles.instruction}>
          {p}
        </p>
      ))}
      </>
      )}
      <div className={styles.content}>
        {podzielNaCzesci(
          grupujPrawdaFalsz(bloki, zadanie),
          arkusz.przedmiot === "angielski",
          new Set(zadanie.pytania.filter((p) => !p.tresc.trim()).map((p) => p.nr)),
        ).map((c, i) => (
          <div key={i} className={styles.part} data-rodzaj={c.rodzaj}>
            {c.polecenie && (
              <p className={styles.instruction}>
                <Tekst tekst={c.polecenie} />
              </p>
            )}
            {c.elementy.map((b, j) =>
              Array.isArray(b) ? (
                <PrawdaFalsz key={j} pytania={b} />
              ) : b.typ === "pytanie" && pisanie ? (
                <WypowiedzWidok key={j} pytanie={zadanie.pytania[0] as Wypowiedz} pisanie={pisanie} />
              ) : (
                <BlokWidok key={j} blok={b} zadanie={zadanie.nr} />
              ),
            )}
          </div>
        ))}
      </div>
      {ostatnia && gotowe && wTekscie.length > 0 && (
        <div className={styles.keyList}>
          {wTekscie.map((p) => (
            <Informacja key={p.nr} pytanie={p} zNumerem />
          ))}
        </div>
      )}
      {ostatnia && arkusz.przedmiot === "matematyka" && (
        <Brudnopis
          plik={`${arkusz.id}-${zadanie.nr}`}
          zadanie={zadanie.nr}
          rysunek={zadanie.rysunek}
          opcjeZWycinka={(() => {
            // Pytanie z samymi literami, którego opcje są rysunkami w wycinku (nie liczbami w tekście).
            const [p] = zadanie.pytania;
            const kadr = zadanie.bloki.find((b) => b.typ === "kadr");
            if (zadanie.pytania.length !== 1 || p.typ !== "zamkniete" || p.opcje?.length || kadr?.typ !== "kadr") return undefined;
            return kadrJakoTekst(kadr.tekst) && !opcjeZKadru(kadr.tekst) ? kadr.obraz : undefined;
          })()}
          dodatkoweRysunki={zadanie.pytania
            .flatMap((p) => [...(tabele.get(p.nr)?.kadry ?? []), ...(opcjeNaRysunkach.has(p.nr) ? [opcjeNaRysunkach.get(p.nr)!.kadr] : [])])
            .flatMap((k) => (k.typ === "kadr" ? [k.obraz] : []))}
          zapis={postep.brudnopisy?.[zadanie.nr]}
          onZmiana={(zapis) => ustawBrudnopis(zadanie.nr, zapis)}
          tresc={
            <Kompakt.Provider value={true}>
              <TrescKompakt zadanie={zadanie} bloki={wszystkieBloki} />
            </Kompakt.Provider>
          }
          duzyRysunek={[...luki.values()].some((l) => l.ile > 1 && zadanie.pytania.includes(l.pytanie))}
        />
      )}
      {ostatnia && arkusz.przedmiot === "informatyka" && zadanie.pytania.some((p) => p.typ === "otwarte" && !p.kod) && (
        <MaterialyWiersz
          zadanie={zadanie}
          pliki={arkusz.dane?.pliki ?? {}}
          zip={arkusz.dane?.zip}
          otwarty={materialy.nr === zadanie.nr}
          onOtworz={(przycisk) => otworzMaterialy(zadanie.nr, przycisk)}
        />
      )}
      {/* Sprawdzamy tylko cały arkusz, jak na maturze, a błędy omawia potem Pestka.
          Zadanie sprawdzone wcześniej (stary zapis postępu albo inne zadanie poprawiane
          po sprawdzeniu) pokazuje wynik i pozwala wrócić do odpowiedzi. */}
      {ostatnia && !pisemna && !postep.sprawdzony && gotowe && (
        <div className={styles.taskActions}>
          <span className={styles.taskScore}>
            {wynik.zdobyte} / {wynik.mozliwe} pkt
            {wynik.doOceny > 0 && <span className="small muted"> · {wynik.doOceny} do twojej oceny</span>}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onPopraw}>
            <Pencil size={15} aria-hidden="true" /> Popraw odpowiedzi
          </button>
        </div>
      )}
      {ostatnia && !pisemna && postep.sprawdzony && (
        <div className={styles.taskActions}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onPopraw}>
            <Pencil size={15} aria-hidden="true" /> Popraw odpowiedzi w tym zadaniu
          </button>
        </div>
      )}
    </section>
  );
}

type ElementZadania = Blok | PytanieZamkniete[];
type Czesc = { rodzaj: "czytanie" | "tresc" | "pytania"; elementy: ElementZadania[]; polecenie?: string };

const TRESC = new Set<Blok["typ"]>(["akapit", "wzor", "rysunek", "tabelaTresci", "naglowek", "zrodlo", "kadr", "kod"]);
const jestTrescia = (e: ElementZadania | undefined) => !!e && !Array.isArray(e) && TRESC.has(e.typ);

// Polecenie do grupy pytań w środku zadania, np. „For questions 4.1.–4.4.,
// choose…” albo „W zadaniach 1.3.–1.6. zakreśl…”, tuż przed pytaniami.
// Etykieta tekstu („Tekst 2. (do zadań 2.2. i 2.3.)”) się nie liczy.
const POLECENIE_PYTAN = /\b\d+\.\d+\./;
const ETYKIETA_TEKSTU = /^(Tekst|Text)\s+\d/;

// Dzieli zadanie na ciągi treści i ciągi pytań, żeby oddzielić je linią.
// Treść z tytułem, przypisem albo dłuższa niż krótkie wprowadzenie to tekst
// do czytania i dostaje wyróżnienie (poza matematyką, gdzie nagłówki to
// podpunkty, a nie tytuły tekstów). Sąsiednie przypisy („Na podstawie: …”,
// „Źródło: …”) łączymy w jedną drobną linię pod tekstem: to atrybucja CKE.
// oznaczenia: pytania bez własnej treści (np. kratka „4.1.” na nagłówek akapitu). Taka kratka tuż
// przed akapitem należy do tekstu, więc nie rozcina go na części oddzielone liniami.
function podzielNaCzesci(elementy: ElementZadania[], teksty: boolean, oznaczenia: Set<string>): Czesc[] {
  const czesci: Czesc[] = [];
  elementy.forEach((e, i) => {
    const nast = elementy[i + 1];
    const oznaczenieAkapitu = !Array.isArray(e) && e.typ === "pytanie" && oznaczenia.has(e.nr) && !!nast && !Array.isArray(nast) && nast.typ === "akapit";
    const ost = czesci[czesci.length - 1];
    if (
      !Array.isArray(e) &&
      e.typ === "akapit" &&
      !e.tekst.includes("{{") &&
      POLECENIE_PYTAN.test(e.tekst) &&
      !ETYKIETA_TEKSTU.test(e.tekst) &&
      elementy[i + 1] &&
      !jestTrescia(elementy[i + 1])
    ) {
      czesci.push({ rodzaj: "pytania", elementy: [], polecenie: e.tekst });
      return;
    }
    const tresc = jestTrescia(e) || oznaczenieAkapitu;
    const c = ost && (ost.rodzaj !== "pytania") === tresc ? ost : ({ rodzaj: tresc ? "tresc" : "pytania", elementy: [] } satisfies Czesc);
    if (c !== ost) czesci.push(c);
    const poprzedni = c.elementy[c.elementy.length - 1];
    if (!Array.isArray(e) && e.typ === "zrodlo" && !Array.isArray(poprzedni) && poprzedni?.typ === "zrodlo")
      c.elementy[c.elementy.length - 1] = { typ: "zrodlo", tekst: `${poprzedni.tekst} ${e.tekst}` };
    else c.elementy.push(e);
  });
  for (const c of czesci) {
    if (!teksty || c.rodzaj !== "tresc") continue;
    const dlugosc = c.elementy.reduce((n, e) => n + (!Array.isArray(e) && "tekst" in e ? e.tekst.length : 0), 0);
    const tytul = c.elementy.some((e) => !Array.isArray(e) && (e.typ === "naglowek" || e.typ === "zrodlo"));
    if (tytul || dlugosc > 600) c.rodzaj = "czytanie";
  }
  return czesci;
}

function Zrodlo({ tekst }: { tekst: string }) {
  // Jedna linia; dotknięcie albo fokus pokazuje całość, gdy się nie mieści.
  return (
    <p className={styles.source} title={tekst} tabIndex={0}>
      {tekst}
    </p>
  );
}

type Pisanie = { tematy: Temat[]; punkty: string[]; polecenie: string; zakres: [number, number] | null; ukryte: Set<Blok> };

// Z bloków zadania z wypowiedzią wyciąga tematy („1. …”, „2. …”) z ich
// punktami oraz punkty polecenia („• …”) i zakres długości.
function rozbierzPolecenie(z: Zadanie): Pisanie {
  const tematy: Temat[] = [];
  const punkty: string[] = [];
  const ukryte = new Set<Blok>();
  for (const b of z.bloki) {
    if (b.typ !== "akapit") continue;
    const t = b.tekst.match(/^(\d)\.\s+(.*)$/s);
    if (t) {
      tematy.push({ nr: Number(t[1]), tekst: t[2], punkty: [] });
      ukryte.add(b);
    } else if (/^•\s/.test(b.tekst)) {
      if (tematy.length) {
        tematy[tematy.length - 1].punkty.push(b.tekst.replace(/^•\s*/, ""));
        ukryte.add(b);
      } else punkty.push(b.tekst);
    }
  }
  const caly = [...z.polecenie, ...z.bloki.map((b) => ("tekst" in b ? b.tekst : ""))].join(" ");
  return { tematy: tematy.length > 1 ? tematy : [], punkty, polecenie: z.polecenie.join(" "), zakres: zakresSlow(caly), ukryte: tematy.length > 1 ? ukryte : new Set() };
}

function werdyktPytania(p: Pytanie, postep: Postep): Werdykt {
  const w = werdykt(p, postep.odpowiedzi[p.nr]);
  const ocena = postep.samoocena[p.nr];
  if (w !== "do-oceny" || ocena === undefined) return w;
  // Część punktów zostaje „do oceny”: ani w pełni dobrze, ani źle.
  const punkty = punktyZSamooceny(p, ocena);
  return punkty === p.punkty ? "dobrze" : punkty === 0 ? "zle" : "do-oceny";
}

function Kadr({ obraz, tekst }: { obraz: Obraz; tekst: string }) {
  // Kadry są renderowane w skali 2 px na punkt PDF; 1,5 px na punkt daje tekst
  // zbliżony wielkością do reszty strony, a na wąskim ekranie obraz się zwęża.
  return (
    <figure className={styles.kadr}>
      <img src={adresObrazu(obraz.src)} alt={tekst} width={Math.round(obraz.szer * 1.5)} height={Math.round(obraz.wys * 1.5)} loading="lazy" />
    </figure>
  );
}

// Treść zadania nad brudnopisem na pełnym ekranie: cała szerokość, gęściej.
// Zadanie z jednym pytaniem: numer i treść po lewej, odpowiedzi po prawej.
function TrescKompakt({ zadanie, bloki: wszystkie }: { zadanie: Zadanie; bloki: Blok[] }) {
  const { arkusz, sprawdzone, wBloku, luki, kadryTekst, lukiKadrow, obliczenia, pf, tabele, opcjeNaRysunkach } = useCtx();
  const plik = `${arkusz.id}-${zadanie.nr}`;
  // Odpowiedzi w lukach zdań: bez kolumny odpowiedzi, po prawej staje rysunek.
  const zLukami = [...luki.values()].some((l) => l.ile > 1 && zadanie.pytania.includes(l.pytanie));
  const i = arkusz.zadania.findIndex((z) => z.nr === zadanie.nr);
  const [poprzednie, nastepne] = [arkusz.zadania[i - 1], arkusz.zadania[i + 1]];
  // Rysunek zadania i tak leży na płótnie brudnopisu: nie powtarzamy go, a wycinek
  // strony z opcjami na rysunku albo z luką zastępujemy jego tekstem.
  const naRysunku = !!zadanie.rysunek && zadanie.pytania.length === 1 && zadanie.pytania[0].typ === "zamkniete" && !zadanie.pytania[0].opcje?.length;
  // Opcje w tekście wycinka (liczby, krótkie wyrażenia): pokazujemy je jako zwykłe odpowiedzi.
  const kadrOpcji = naRysunku ? wszystkie.find((b) => b.typ === "kadr") : undefined;
  const opcjeKadru = kadrOpcji?.typ === "kadr" ? opcjeZKadru(kadrOpcji.tekst) : null;
  const pierwszyNaglowek = wszystkie.findIndex((b) => b.typ === "naglowek");
  // Tabela przyporządkowania: wykresy opcji są na płótnie, nad nim zostaje tekst polecenia.
  const kadryTabel = new Map<Blok, Blok[]>();
  for (const p of zadanie.pytania) {
    const t = tabele.get(p.nr);
    t?.kadry.forEach((k, i) => kadryTabel.set(k, i === 0 ? naAkapity(t.wstep) : []));
    // Opcje A–D na rysunkach: rysunki idą na płótno, nad nim zostaje tekst polecenia.
    const o = opcjeNaRysunkach.get(p.nr);
    if (o) kadryTabel.set(o.kadr, o.tekst);
  }
  const calosc = (zadanie.rysunek ? wszystkie.filter((b) => b.typ !== "rysunek") : wszystkie).flatMap((b) =>
    kadryTabel.has(b)
      ? kadryTabel.get(b)!
      : b.typ === "kadr" && naRysunku
      ? (kadrJakoTekst(b.tekst) ?? [b])
      : b.typ === "kadr" && zadanie.rysunek && pierwszyNaglowek > 0 && wszystkie.indexOf(b) < pierwszyNaglowek
        ? (wstepBezRysunku(b.tekst) ?? tekstBezPodpisow(b.tekst))
        : (kadryTekst.get(b) ??
          // Rysunek z wycinka jest na płótnie; wycinek z opcjami A–D na rysunkach zostaje obrazkiem.
          (b.typ === "kadr" && zadanie.rysunek && !/(^|\s)[A-F]\.\s/.test(b.tekst) ? tekstBezPodpisow(b.tekst) : [b])),
  );
  const uporzadkowane = uporzadkujAkapity(calosc, (b) => luki.has(b) || lukiKadrow.has(b));
  const podzial = zLukami ? null : podzielNaPodpunkty(uporzadkowane);
  const [podpunkt, setPodpunkt] = useState(() => {
    const kierunek = zuzyjWejscie();
    return podzial ? startowyPodpunkt(plik, podzial.podpunkty.length, kierunek) : 0;
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(kluczPodpunktu(plik), String(podpunkt));
    } catch {
      // zablokowany storage: po odświeżeniu pierwszy podpunkt
    }
  }, [plik, podpunkt]);
  const ilePodpunktow = podzial?.podpunkty.length ?? 1;
  const aktywny = podzial ? podzial.podpunkty[Math.min(podpunkt, ilePodpunktow - 1)] : null;
  // Nagłówek podpunktu („Zadanie 12.1 (0–2 pkt)”) zastępuje numer w nagłówku widoku.
  // Luki z wyborem w tekście ({{29.1}}): opcje pokazuje każda luka (LukaZdanie), więc bez osobnej listy.
  const opcjeLukTekstu = uporzadkowane.some((b) => b.typ === "akapit" && /\{\{\d+\.\d+\}\}/.test(b.tekst)) ? uporzadkowane.find((b) => b.typ === "opcje") : undefined;
  const bloki = (podzial && aktywny ? [...podzial.wstep, ...aktywny.filter((b) => b.typ !== "naglowek")] : uporzadkowane).filter((b) => b !== opcjeLukTekstu);
  const numer = (aktywny && numerPodpunktu(aktywny)) ?? String(zadanie.nr);
  // Wykresy opcji A–F na płótnie tylko przy podpunkcie z tabelą przyporządkowania.
  const ustawDodatkowe = useContext(PokazDodatkoweRysunki);
  const zTabela = !aktywny || aktywny.some((b) => b.typ === "pytanie" && (tabele.has(b.nr) || opcjeNaRysunkach.has(b.nr)));
  useEffect(() => ustawDodatkowe(zTabela), [ustawDodatkowe, zTabela]);

  const wstecz = () => {
    if (podzial && podpunkt > 0) return setPodpunkt(podpunkt - 1);
    if (!poprzednie) return;
    wejscie = "koniec";
    otworzNaPelnymEkranie(`${arkusz.id}-${poprzednie.nr}`);
  };
  const dalej = () => {
    if (podzial && podpunkt < ilePodpunktow - 1) return setPodpunkt(podpunkt + 1);
    if (!nastepne) return;
    wejscie = "poczatek";
    otworzNaPelnymEkranie(`${arkusz.id}-${nastepne.nr}`);
  };
  const jestWstecz = (podzial && podpunkt > 0) || !!poprzednie;
  const jestDalej = (podzial && podpunkt < ilePodpunktow - 1) || !!nastepne;

  const pytaniaBloki = bloki.filter(czyPytanie);
  // Odpowiedź w luce tekstu (wycinek zamieniony na tekst) nie potrzebuje prawej kolumny.
  // Rozwiązanie na płótnie i stwierdzenia P/F zostają w głównej kolumnie, bez prawej.
  const naPlotnie = pytaniaBloki.length === 1 && pytaniaBloki[0].typ === "pytanie" && (obliczenia.has(pytaniaBloki[0].nr) || pf.has(pytaniaBloki[0].nr));
  const obok = pytaniaBloki.length === 1 && !zLukami && !naPlotnie && !bloki.some((b) => lukiKadrow.has(b));
  // Pytanie (zdanie po ostatnim poleceniu, np. „Odcinek 𝑂𝐷 ma długość”) stoi przy odpowiedziach
  // po prawej, żeby w każdym typie zadania było w tym samym miejscu.
  const bezPytania = bloki.filter((b) => b !== pytaniaBloki[0]);
  const ostatniePolecenie = bezPytania.reduce((n, b, k) => (b.typ === "akapit" && b.polecenie ? k : n), -1);
  const pytanieZdanie =
    obok && ostatniePolecenie >= 0 && bezPytania.slice(ostatniePolecenie + 1).every((b) => b.typ === "akapit" || b.typ === "wzor")
      ? bezPytania.slice(ostatniePolecenie + 1)
      : [];
  const lewa = bezPytania.filter((b) => !pytanieZdanie.includes(b));
  const gotowe = sprawdzone(`${zadanie.nr}.`);
  const wTekscie = zadanie.pytania.filter((p) => !wBloku.has(p.nr) && p.typ !== "wypowiedz");
  const polecenie = zadanie.polecenie.map((p, i) => (
    <p key={i} className={styles.instruction}>
      {p}
    </p>
  ));
  const klucz = gotowe && wTekscie.length > 0 && (
    <div className={styles.keyList}>
      {wTekscie.map((p) => (
        <Informacja key={p.nr} pytanie={p} zNumerem />
      ))}
    </div>
  );
  // Przy tabeli przyporządkowania płótno z wykresami A–F potrzebuje miejsca: tekst nad nim
  // ma niższą wysokość i przewija się sam.
  const przewijana = bloki.some((b) => b.typ === "pytanie" && tabele.has(b.nr));
  const tresc = (
    <div className={przewijana ? `${styles.kompakt} ${styles.przewijana}` : styles.kompakt}>
      <div className={styles.glowa}>
        <button
          type="button"
          className={`btn btn-ghost btn-sm ${styles.przejscie}`}
          disabled={!jestWstecz}
          onClick={wstecz}
          aria-label="Poprzednie zadanie"
          title="Poprzednie zadanie"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <h2 className="h3">Zadanie {numer}.</h2>
        <button
          type="button"
          className={`btn btn-ghost btn-sm ${styles.przejscie}`}
          disabled={!jestDalej}
          onClick={dalej}
          aria-label="Następne zadanie"
          title="Następne zadanie"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        {podzial && (
          <span className="small muted">
            podpunkt {podpunkt + 1} z {ilePodpunktow}
          </span>
        )}
      </div>
      {polecenie}
      <div className={obok || zLukami || podzial || pytaniaBloki.length <= 1 ? styles.content : `${styles.content} ${styles.szpalty}`}>
        <BlokiKompakt elementy={grupujPrawdaFalsz(obok ? lewa : bloki, zadanie)} zadanie={zadanie.nr} />
      </div>
      {klucz}
    </div>
  );
  return <NumerWidoku.Provider value={numer}>{uklad()}</NumerWidoku.Provider>;

  function uklad() {
  // Luki do wyboru litery: po prawej opcje A–E (rysunek jest na płótnie). Luki do wpisania:
  // po prawej rysunek, bo uczeń odczytuje z niego odpowiedzi.
  const opcjeLuk = [...luki.values()].find((l) => l.opcje && zadanie.pytania.includes(l.pytanie))?.opcje;
  if (zLukami && opcjeLuk)
    return (
      <div className={styles.obok}>
        {tresc}
        <div className={`${styles.kompakt} ${styles.odpowiedzi}`}>
          <ListaOpcjiLiter opcje={opcjeLuk} pionowo />
        </div>
      </div>
    );
  if (zLukami && zadanie.rysunek)
    return (
      <div className={styles.obok}>
        {tresc}
        <div className={`${styles.kompakt} ${styles.odpowiedzi}`}>
          <Kadr obraz={zadanie.rysunek} tekst="Rysunek do zadania" />
        </div>
      </div>
    );
  if (!obok) return tresc;
  // Odpowiedzi w prawej kolumnie: nie spychają płótna w dół. Litery do opcji
  // z rysunku stoją jedna pod drugą, jak opcje na rysunku.
  return (
    <div className={naRysunku && !opcjeKadru ? `${styles.obok} ${styles.pionowo}` : styles.obok}>
      {tresc}
      <div className={`${styles.kompakt} ${styles.odpowiedzi}`}>
        {pytanieZdanie.length > 0 && (
          <div className={styles.content}>
            <BlokiKompakt elementy={pytanieZdanie} zadanie={zadanie.nr} />
          </div>
        )}
        {opcjeKadru && zadanie.pytania[0].typ === "zamkniete" ? (
          <div className={styles.question}>
            <Opcje pytanie={{ ...zadanie.pytania[0], opcje: opcjeKadru }} />
            <Informacja pytanie={zadanie.pytania[0]} />
          </div>
        ) : (
          <BlokWidok blok={pytaniaBloki[0]} zadanie={zadanie.nr} />
        )}
      </div>
    </div>
  );
  }
}

// Pytanie otwarte z poleceniem „Zapisz obliczenia.” (albo rozumowanie, dowód) oceniane według
// schematu: odpowiedzią jest rozwiązanie na płótnie brudnopisu, bez pola na wynik.
const POLECENIE_OBLICZEN = /Zapisz obliczenia|Zapisz rozumowanie|Zapisz rozwiązanie|Przeprowadź dowód|Wykaż/i;
const ODPOWIEDZ_NA_PLOTNIE = "rozwiązanie w brudnopisie";

function pytaniaZObliczeniami(z: Zadanie): string[] {
  const wynik: string[] = [];
  let polecenia = z.polecenie.join(" ");
  for (const b of z.bloki) {
    if (b.typ === "akapit" || b.typ === "kadr") polecenia += " " + b.tekst;
    if (b.typ !== "pytanie") continue;
    const p = z.pytania.find((q) => q.nr === b.nr);
    if (p?.typ === "otwarte" && !p.tresc && !p.kod && !p.oczekiwane?.length && !p.akceptowane?.length && POLECENIE_OBLICZEN.test(polecenia)) wynik.push(p.nr);
    polecenia = "";
  }
  return wynik;
}

// Zadanie otwarte z kilkoma zdaniami do uzupełnienia („1. Dziedziną funkcji f jest
// przedział …… .”): klucz CKE ma jedno pytanie za kilka punktów, ale uczeń wpisuje
// osobną odpowiedź w każdą lukę. Części trzymamy w jednej odpowiedzi, linia po linii.
// opcje: odpowiedź to litera spośród opcji zadania („wybraną spośród oznaczonych literami A–E”);
// pod ostatnim zdaniem stoi wtedy lista opcji.
type Luka = { pytanie: PytanieOtwarte; czesc: number; ile: number; opcje?: Opcja[] };
const ZNACZNIK_LUKI = /…{2,}|\.{4,}/;
const LUKI_W_ZDANIU = new RegExp(ZNACZNIK_LUKI.source, "g");

function lukiZadania(z: Zadanie): Map<Blok, Luka> | null {
  const [p] = z.pytania;
  if (z.pytania.length !== 1 || p.typ !== "otwarte" || p.tresc) return null;
  const zdania = z.bloki.filter((b) => b.typ === "akapit" && !b.polecenie && ZNACZNIK_LUKI.test(b.tekst));
  if (zdania.length < 2) return null;
  const opcje = opcjeDoLiter(z);
  return new Map(zdania.map((b, czesc) => [b, { pytanie: p, czesc, ile: zdania.length, opcje: opcje?.opcje }]));
}

// „Zapisz po numerze zdania właściwą odpowiedź, wybraną spośród oznaczonych literami A–E”:
// opcje A–D z bloku opcji i dopisane akapitem „E. 5,70 zł”. Zwraca też bloki do ukrycia.
function opcjeDoLiter(z: Zadanie): { opcje: Opcja[]; ukryte: Blok[] } | null {
  const polecenie = z.bloki.filter((b) => b.typ === "akapit" && b.polecenie).map((b) => (b.typ === "akapit" ? b.tekst : "")).join(" ") + " " + z.bloki.map((b) => (b.typ === "akapit" ? b.tekst : "")).join(" ");
  const blok = z.bloki.find((b) => b.typ === "opcje");
  if (blok?.typ !== "opcje" || !/spośród oznaczonych literami/.test(polecenie)) return null;
  const dodatkowe = z.bloki.filter((b) => b.typ === "akapit" && !b.polecenie && OPCJA_W_AKAPICIE.test(b.tekst));
  const opcje = [
    ...blok.opcje,
    ...dodatkowe.map((b) => {
      const [, litera, tresc] = (b as { tekst: string }).tekst.match(OPCJA_W_AKAPICIE)!;
      return { litera, tresc };
    }),
  ].sort((a, c) => a.litera.localeCompare(c.litera));
  return { opcje, ukryte: [blok, ...dodatkowe] };
}

// Pytanie otwarte z jednym zdaniem do dokończenia („Zbiorem … jest przedział …… .”):
// odpowiedź wpisuje się w lukę tego zdania, bez osobnego pola pod nim.
function pojedynczeLuki(z: Zadanie): Map<Blok, Luka> {
  const wynik = new Map<Blok, Luka>();
  let sekcja: Blok[] = [];
  for (const b of z.bloki) {
    if (b.typ !== "pytanie") {
      sekcja.push(b);
      continue;
    }
    const p = z.pytania.find((q) => q.nr === b.nr);
    const zLuka = sekcja.filter((x) => x.typ === "akapit" && !x.polecenie && ZNACZNIK_LUKI.test(x.tekst));
    const obliczenia = POLECENIE_OBLICZEN.test(sekcja.map((x) => ("tekst" in x ? x.tekst : "")).join(" "));
    if (p?.typ === "otwarte" && !p.tresc && !p.kod && !obliczenia && zLuka.length === 1) {
      // Jedno zdanie z kilkoma lukami (informatyka, zadanie 5): każda luka to osobna część odpowiedzi.
      const ile = zLuka[0].typ === "akapit" ? (zLuka[0].tekst.match(LUKI_W_ZDANIU) ?? []).length : 1;
      wynik.set(zLuka[0], { pytanie: p, czesc: 0, ile: Math.max(ile, 1) });
    }
    sekcja = [];
  }
  return wynik;
}

const czesciOdpowiedzi = (odpowiedz: string | undefined, ile: number) => {
  const czesci = (odpowiedz ?? "").split("\n");
  return Array.from({ length: ile }, (_, i) => czesci[i] ?? "");
};

function ZdanieZLuka({ tekst, luka, bezOpcji, formaty }: { tekst: string; luka: Luka; bezOpcji?: boolean; formaty?: [number, number, Kroj][] }) {
  const { arkusz, postep, ustaw, sprawdzone } = useCtx();
  const { pytanie: p, czesc, ile } = luka;
  const czesci = czesciOdpowiedzi(postep.odpowiedzi[p.nr], ile);
  const m = tekst.match(ZNACZNIK_LUKI)!;
  const [przed, po] = [tekst.slice(0, m.index), tekst.slice(m.index! + m[0].length)];
  // Informatyka: formatowanie (indeksy podstaw systemów, kursywa) przycięte do części przed i po luce.
  const kawalek = (od: number, do_: number) =>
    formaty ? (
      <TekstFormaty tekst={tekst.slice(od, do_)} formaty={formaty.filter(([a, b]) => b > od && a < do_).map(([a, b, k]) => [Math.max(a, od) - od, Math.min(b, do_) - od, k] as [number, number, Kroj])} />
    ) : null;
  const zapisz = (wartosc: string, i = czesc) => {
    const nowe = czesciOdpowiedzi(postep.odpowiedzi[p.nr], ile);
    nowe[i] = wartosc.replace(/\n/g, " ");
    // Puste części na końcu nie liczą się jako odpowiedź.
    ustaw(p.nr, nowe.join("\n").replace(/\n+$/, ""));
  };
  // Zdanie z kilkoma lukami (informatyka): każda ma własne pole i własną część odpowiedzi.
  const luki = [...tekst.matchAll(LUKI_W_ZDANIU)];
  if (arkusz.przedmiot === "informatyka" && !luka.opcje && luki.length > 1 && ile >= luki.length) {
    const od = (i: number) => (i ? luki[i - 1].index! + luki[i - 1][0].length : 0);
    const ostatnia = luki[luki.length - 1];
    const koniec = ostatnia.index! + ostatnia[0].length;
    return (
      <div className={`${styles.para} ${styles.zdanieLuka}`}>
        {luki.map((l, i) => {
          const wartosc = czesci[czesc + i] ?? "";
          return (
            <Fragment key={i}>
              {kawalek(od(i), l.index!) ?? <Tekst tekst={tekst.slice(od(i), l.index!)} />}
              <span className={styles.inlineGap}>
                <input type="text" value={wartosc} size={Math.max(12, wartosc.length + 2)} readOnly={sprawdzone(p.nr)} autoComplete="off" spellCheck={false} onChange={(e) => zapisz(e.target.value, czesc + i)} aria-label={`Odpowiedź ${p.nr}, luka ${i + 1}`} />
              </span>
            </Fragment>
          );
        })}
        {kawalek(koniec, tekst.length) ?? <Tekst tekst={tekst.slice(koniec)} />}
      </div>
    );
  }
  return (
    <div className={`${styles.para} ${styles.zdanieLuka}`}>
      {kawalek(0, m.index!) ?? <Tekst tekst={przed} />}
      {luka.opcje ? (
        <PrzelacznikLiter
          litery={luka.opcje.map((o) => o.litera)}
          wybrana={czesci[czesc] || undefined}
          gotowe={sprawdzone(p.nr)}
          etykieta={`Odpowiedź ${p.nr}, zdanie ${czesc + 1}`}
          onWybor={(l) => {
            const nowe = czesciOdpowiedzi(postep.odpowiedzi[p.nr], ile);
            nowe[czesc] = l;
            ustaw(p.nr, nowe.join("\n").replace(/\n+$/, ""));
          }}
        />
      ) : arkusz.przedmiot === "informatyka" ? (
        // Informatyka: zwykłe pole (liczba w innym systemie, wynik), bez klawiatury matematycznej.
        <span className={styles.inlineGap}>
          <input type="text" value={czesci[czesc] ?? ""} size={Math.max(12, (czesci[czesc] ?? "").length + 2)} readOnly={sprawdzone(p.nr)} autoComplete="off" spellCheck={false} onChange={(e) => zapisz(e.target.value)} aria-label={`Odpowiedź ${p.nr}, część ${czesc + 1}`} />
        </span>
      ) : ile === 1 && (p.oczekiwane?.length || p.akceptowane?.length) ? (
        // Odpowiedź porównywana z kluczem jako tekst: zwykłe pole w luce.
        <LukaTekst pytanie={p} bezNumeru />
      ) : (
      <PoleMatematyczne
        wartosc={czesci[czesc]}
        tylkoOdczyt={sprawdzone(p.nr)}
        etykieta={`Odpowiedź ${p.nr}, zdanie ${czesc + 1}`}
        onZmiana={(latex) => {
          const nowe = czesciOdpowiedzi(postep.odpowiedzi[p.nr], ile);
          nowe[czesc] = latex.replace(/\n/g, " ");
          // Puste części na końcu nie liczą się jako odpowiedź.
          ustaw(p.nr, nowe.join("\n").replace(/\n+$/, ""));
        }}
      />
      )}
      {kawalek(m.index! + m[0].length, tekst.length) ?? <Tekst tekst={po} />}
      {luka.opcje && czesc === ile - 1 && !bezOpcji && <ListaOpcjiLiter opcje={luka.opcje} />}
    </div>
  );
}

function ListaOpcjiLiter({ opcje, pionowo }: { opcje: Opcja[]; pionowo?: boolean }) {
  return (
    <div className={pionowo ? `${styles.opcjeLiter} ${styles.opcjeLiterPion}` : styles.opcjeLiter}>
      {opcje.map((o) => (
        <span key={o.litera}>
          <span className={styles.letter}>{o.litera}</span> <Tekst tekst={o.tresc} />
        </span>
      ))}
    </div>
  );
}

// Zadanie z podpunktami (12.1, 12.2, 12.3): na pełnym ekranie każdy podpunkt to osobny
// krok ze wspólnym wstępem, a strzałki przechodzą 12.1 → 12.2 → 12.3 → 13. Płótno
// zostaje jedno na całe zadanie. Podpunkt to bloki od nagłówka do jego pytania.
const czyPytanie = (b: Blok) => b.typ === "pytanie" || b.typ === "pytania" || b.typ === "tabela";

function podzielNaPodpunkty(bloki: Blok[]): { wstep: Blok[]; podpunkty: Blok[][] } | null {
  const pierwszy = bloki.findIndex((b) => b.typ === "naglowek");
  if (pierwszy < 0) return null;
  const podpunkty: Blok[][] = [];
  let biezacy: Blok[] = [];
  for (const b of bloki.slice(pierwszy)) {
    // Po pytaniu kolejny blok (nagłówek albo wycinek bez nagłówka) zaczyna nowy podpunkt.
    if (biezacy.some(czyPytanie) && !czyPytanie(b)) {
      podpunkty.push(biezacy);
      biezacy = [];
    }
    biezacy.push(b);
  }
  if (biezacy.length) podpunkty.push(biezacy);
  return podpunkty.length >= 2 && podpunkty.every((pp) => pp.some(czyPytanie)) ? { wstep: bloki.slice(0, pierwszy), podpunkty } : null;
}

// Numer podpunktu z jego pytania („12.1”), do nagłówka zamiast „Zadanie 12.1 (0–2 pkt)”.
function numerPodpunktu(bloki: Blok[]): string | null {
  const b = bloki.find(czyPytanie);
  if (!b) return null;
  return b.typ === "pytanie" ? b.nr : b.typ === "pytania" || b.typ === "tabela" ? (b.nr[0] ?? null) : null;
}

// Który podpunkt pokazać po wejściu: strzałką do przodu pierwszy, wstecz ostatni,
// a po odświeżeniu zapamiętany w karcie przeglądarki.
let wejscie: "poczatek" | "koniec" | null = null;
const kluczPodpunktu = (plik: string) => `sedno.podpunkt.${plik}`;

// Kierunek zużywa pierwsze zamontowane zadanie, także bez podpunktów, żeby nie przeszedł dalej.
function zuzyjWejscie() {
  const kierunek = wejscie;
  wejscie = null;
  return kierunek;
}

function startowyPodpunkt(plik: string, ile: number, kierunek: typeof wejscie): number {
  if (kierunek === "koniec") return ile - 1;
  if (kierunek === "poczatek") return 0;
  try {
    const n = Number(sessionStorage.getItem(kluczPodpunktu(plik)));
    return Number.isInteger(n) && n >= 0 && n < ile ? n : 0;
  } catch {
    return 0;
  }
}

// Wycinek strony z luką do pytania otwartego („Suma 𝑥1 + 𝑥2 jest równa ……… .”): na pełnym
// ekranie jako tekst z polem w luce, z nagłówkiem podpunktu, którego w tekście wycinka nie ma.
function kadrZLuka(kadr: Blok, nastepny: Blok | undefined, z: Zadanie): { bloki: Blok[]; luka: [Blok, Luka] } | null {
  if (kadr.typ !== "kadr" || nastepny?.typ !== "pytanie" || !ZNACZNIK_LUKI.test(kadr.tekst)) return null;
  const p = z.pytania.find((q) => q.nr === nastepny.nr);
  if (p?.typ !== "otwarte" || p.tresc) return null;
  const akapity = naAkapity(kadr.tekst);
  const zLuka = akapity.find((a) => a.typ === "akapit" && ZNACZNIK_LUKI.test(a.tekst));
  if (!zLuka) return null;
  const naglowek: Blok[] = p.nr.includes(".") ? [{ typ: "naglowek", tekst: `Zadanie ${p.nr} (0–${p.punkty} pkt)` }] : [];
  return { bloki: [...naglowek, ...akapity], luka: [zLuka, { pytanie: p, czesc: 0, ile: 1 }] };
}

// Pełny ekran brudnopisu: gęstszy układ i zamiana wycinków na tekst tam, gdzie się da.
const Kompakt = createContext(false);
// Numer w nagłówku pełnego ekranu: pytanie o tym samym numerze go nie powtarza.
const NumerWidoku = createContext<string | null>(null);

// Tekst wycinka strony (z PDF) bez etykiet opcji, które są na rysunku: „Dana jest
// nierówność 3 − 2(1 − 2𝑥) ≥ 2𝑥 − 17 Na którym rysunku… A. 0 1 3 𝑥 B. …”.
// Nowe zdanie po wzorze zaczyna akapit, a polecenia („Wybierz…”) są pogrubione jak w arkuszu.
const POLECENIA = /^(Dokończ|Wybierz|Zapisz|Uzupełnij|Wpisz|Oblicz|Rozwiąż|Wykaż|Podaj|Zaznacz|Oceń)(?=\s)/;

function kadrJakoTekst(tekst: string): Blok[] | null {
  const opcje = tekst.search(/\sA\.(?=\s)[\s\S]*\sB\.(?=\s)[\s\S]*\sC\.(?=\s)[\s\S]*\sD\.(?=\s|$)/);
  if (opcje < 0) return null;
  const tresc = tekst.slice(0, opcje).trim();
  return tresc ? tekstBezPodpisow(tresc) : null;
}

// Opcje zapisane w tekście wycinka („A. 4 B. 9 C. 10 D. 16”). Gdy to podpisy osi z rysunków
// („A. 0 1 3 𝑥 …”, więcej niż dwa kawałki), opcje są na rysunku i zwracamy null.
function opcjeZKadru(tekst: string): Opcja[] | null {
  const od = tekst.search(/\sA\.(?=\s)[\s\S]*\sB\.(?=\s)[\s\S]*\sC\.(?=\s)[\s\S]*\sD\.(?=\s|$)/);
  if (od < 0) return null;
  const czesci = (" " + tekst.slice(od).trim()).split(/\s([A-D])\.\s+/).slice(1);
  const opcje: Opcja[] = [];
  for (let i = 0; i + 1 < czesci.length; i += 2) opcje.push({ litera: czesci[i], tresc: czesci[i + 1].trim() });
  return opcje.length === 4 && opcje.every((o) => o.tresc && o.tresc.split(/\s+/).length <= 2) ? opcje : null;
}

function naAkapity(tresc: string): Blok[] {
  return tresc
    .split(/(?<=[.?!])\s+|(?<=[\d)\]\u{1D400}-\u{1D7FF}])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż])/u)
    .filter(Boolean)
    .map((zdanie): Blok => ({ typ: "akapit", tekst: zdanie, polecenie: POLECENIA.test(zdanie) }));
}

// Krótki wzór między akapitami („Liczba … jest równa”) w gęstym widoku idzie w jednej linii z tekstem.
// Ułamki i potęgi zostają w stylu wystawionym (\displaystyle), żeby w linii nie maleły.
const WZOR_W_LINII = 160;
const doLinii = (b: Blok | PytanieZamkniete[]) =>
  !Array.isArray(b) && ((b.typ === "akapit" && !b.polecenie) || (b.typ === "wzor" && b.tex.length <= WZOR_W_LINII));

const czyZdanieNumerowane = (b: Blok | PytanieZamkniete[]) => !Array.isArray(b) && b.typ === "akapit" && !b.polecenie && /^\d+\.\s/.test(b.tekst);

function BlokiKompakt({ elementy, zadanie }: { elementy: (Blok | PytanieZamkniete[])[]; zadanie: number }) {
  const { luki, lukiKadrow } = useCtx();
  const wynik: ReactNode[] = [];
  for (let i = 0; i < elementy.length; ) {
    const b = elementy[i];
    // Zdania do uzupełnienia („1. Dziedziną funkcji … jest przedział …… .”) w dwóch kolumnach.
    let n = i;
    while (n < elementy.length && czyZdanieNumerowane(elementy[n])) n++;
    if (n - i >= 2) {
      wynik.push(
        <ol key={i} className={styles.zdania}>
          {(elementy.slice(i, n) as Blok[]).map((c, k) => (
            <li key={k} className={styles.para}>
              {c.typ === "akapit" && ((l) => (l ? <ZdanieZLuka tekst={c.tekst} luka={l} bezOpcji /> : <Tekst tekst={c.tekst} />))(luki.get(c) ?? lukiKadrow.get(c))}
            </li>
          ))}
        </ol>,
      );
      // Opcje do wyboru literą stoją na pełnym ekranie w prawej kolumnie (TrescKompakt).
      i = n;
      continue;
    }
    let j = i;
    while (j < elementy.length && doLinii(elementy[j])) j++;
    const ciag = elementy.slice(i, j) as Blok[];
    if (ciag.some((c) => c.typ === "wzor")) {
      wynik.push(
        <div key={i} className={styles.para}>
          {ciag.map((c, k) => (
            <span key={k}>
              {k > 0 && " "}
              {c.typ === "wzor" ? <WzorMat tex={`\\displaystyle ${c.tex}`} /> : c.typ === "akapit" ? <Tekst tekst={c.tekst} /> : null}
            </span>
          ))}
        </div>,
      );
      i = j;
      continue;
    }
    wynik.push(Array.isArray(b) ? <PrawdaFalsz key={i} pytania={b} /> : <BlokWidok key={i} blok={b} zadanie={zadanie} />);
    i++;
  }
  return <>{wynik}</>;
}

function BlokWidok({ blok, zadanie }: { blok: Blok; zadanie: number }) {
  const { pytania, luki, lukiKadrow } = useCtx();
  const kompakt = useContext(Kompakt);
  switch (blok.typ) {
    case "akapit": {
      const luka = luki.get(blok) ?? (kompakt ? lukiKadrow.get(blok) : undefined);
      if (luka) return <ZdanieZLuka tekst={blok.tekst} luka={luka} formaty={blok.formaty} />;
      if (blok.formaty)
        return (
          <div className={styles.para}>
            <TekstFormaty tekst={blok.tekst} formaty={blok.formaty} />
          </div>
        );
    }
      return (
        <div className={blok.polecenie ? `${styles.para} ${styles.command}` : styles.para}>
          <Tekst tekst={blok.tekst} />
        </div>
      );
    case "wzor":
      return <WzorMat tex={blok.tex} blok />;
    case "rysunek":
      return <Kadr obraz={blok.obraz} tekst="Rysunek do zadania" />;
    case "tabelaTresci":
      if (blok.naglowek !== undefined || blok.pytanie || blok.zakresy || blok.obrazy) return <TabelaInformatyki blok={blok} />;
      // Na pełnym ekranie wąska, wysoka tabela (Ocena | Liczba uczniów, 6 wierszy) idzie
      // w poprzek: nagłówki w pierwszej kolumnie, wartości obok, więc zajmuje dwa wiersze.
      if (kompakt && blok.wiersze[0]?.length <= 3 && blok.wiersze.length > 3)
        return (
          <div className={styles.dataTableWrap}>
            <table className={styles.dataTable}>
              <tbody>
                {blok.wiersze[0].map((naglowek, j) => (
                  <tr key={j}>
                    <th scope="row">
                      <Tekst tekst={naglowek} />
                    </th>
                    {blok.wiersze.slice(1).map((w, i) => (
                      <td key={i}>
                        <Tekst tekst={w[j] ?? ""} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      return (
        <div className={styles.dataTableWrap}>
          <table className={styles.dataTable}>
            <tbody>
              {blok.wiersze.map((w, i) => (
                <tr key={i}>
                  {w.map((k, j) =>
                    i === 0 ? (
                      <th key={j} scope="col">
                        <Tekst tekst={k} />
                      </th>
                    ) : (
                      <td key={j}>
                        <Tekst tekst={k} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "naglowek":
      return <h3 className={styles.textTitle}>{blok.tekst}</h3>;
    case "zrodlo":
      return <Zrodlo tekst={blok.tekst} />;
    case "kadr":
      return <Kadr obraz={blok.obraz} tekst={blok.tekst} />;
    case "kod":
      return <pre className={styles.codeBlock}>{blok.tekst}</pre>;
    case "opcje":
      return <OpcjeZadania opcje={blok.opcje} zadanie={zadanie} />;
    case "pytanie": {
      const p = pytania.get(blok.nr);
      return p ? <PytanieWidok pytanie={p} /> : null;
    }
    case "pytania":
      return (
        <div className={styles.columns}>
          {blok.nr.map((nr) => {
            const p = pytania.get(nr);
            return p ? <PytanieWidok key={nr} pytanie={p} /> : null;
          })}
        </div>
      );
    case "tabela":
      return (
        <div className={styles.table}>
          {blok.nr.map((nr) => {
            const p = pytania.get(nr);
            return p?.typ === "zamkniete" ? <WierszTabeli key={nr} pytanie={p} /> : null;
          })}
        </div>
      );
  }
}

// Opcje wspólne dla zadania (zdania A–F, teksty A–D). Opcje użyte już
// w lukach są przygaszone, żeby było widać, co zostało.
function OpcjeZadania({ opcje, zadanie }: { opcje: Opcja[]; zadanie: number }) {
  const { postep } = useCtx();
  const uzyte = new Set(Object.entries(postep.odpowiedzi).filter(([nr]) => nrZadania(nr) === zadanie).map(([, l]) => l));
  return (
    <dl className={styles.options}>
      {opcje.map((o) => (
        <div key={o.litera} data-uzyta={uzyte.has(o.litera) || undefined}>
          <dt>{o.litera}</dt>
          <dd>
            <Tekst tekst={o.tresc} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Akapit z informatyki: pogrubienie, kursywa (nazwy funkcji i zmiennych) i krój kodu (nazwy plików, symbole).
function TekstFormaty({ tekst, formaty }: { tekst: string; formaty: [number, number, Kroj][] }) {
  const czesci: ReactNode[] = [];
  let poz = 0;
  for (const [od, do_, kroj] of [...formaty].sort((a, b) => a[0] - b[0])) {
    if (od < poz) continue;
    if (od > poz) czesci.push(tekst.slice(poz, od));
    const s = tekst.slice(od, do_);
    czesci.push(
      kroj === "b" ? <strong key={od}>{s}</strong> : kroj === "i" ? <em key={od}>{s}</em> : kroj === "sup" ? <sup key={od}>{s}</sup> : kroj === "sub" ? <sub key={od}>{s}</sub> : <code key={od} className={styles.inlineCode}>{s}</code>,
    );
    poz = do_;
  }
  if (poz < tekst.length) czesci.push(tekst.slice(poz));
  return <>{czesci}</>;
}

// Tabela z informatyki: nagłówek, scalone komórki, komórki-wycinki. Gdy odpowiedź na pytanie jest
// w tabeli, puste komórki są polami do wpisania, a kolumny P i F przełącznikiem w każdym wierszu.
// Wpisane komórki leżą pod kluczem „<nr>:tabela” (JSON), a odpowiedź pytania to wiersze tabeli
// tekstem (komórki spacją), sprawdzane z wierszami klucza.
function TabelaInformatyki({ blok }: { blok: Extract<Blok, { typ: "tabelaTresci" }> }) {
  const { postep, ustaw, sprawdzone, pytania } = useCtx();
  const naglowek = blok.naglowek ?? 1;
  const p = blok.pytanie ? pytania.get(blok.pytanie) : undefined;
  const gotowe = p ? sprawdzone(p.nr) : true;
  const pf = p?.typ === "otwarte" && p.kod;
  const obrazy = new Map((blok.obrazy ?? []).map((o) => [`${o.r},${o.c}`, o.obraz]));
  const klucz = p ? `${p.nr}:tabela` : "";
  const komorki: Record<string, string> = (() => {
    try {
      return p ? JSON.parse(postep.odpowiedzi[klucz] || "{}") : {};
    } catch {
      return {};
    }
  })();
  // Wiersze z przełącznikiem P / F, w kolejności, i litera wybrana w każdym.
  const wierszePF = pf ? blok.wiersze.map((w, r) => (w.includes("P") && w.includes("F") ? r : -1)).filter((r) => r >= 0) : [];
  const literyPF = (postep.odpowiedzi[p?.nr ?? ""] ?? "").padEnd(wierszePF.length, "_");
  const poprawnePF = p?.typ === "otwarte" ? p.oczekiwane?.[0] : undefined;

  const wpisz = (r: number, c: number, wartosc: string) => {
    if (!p) return;
    const nowe = { ...komorki, [`${r},${c}`]: wartosc };
    if (!wartosc) delete nowe[`${r},${c}`];
    ustaw(klucz, JSON.stringify(nowe));
    // Odpowiedź: wiersze danych, w każdym komórki z treści i wpisane, rozdzielone spacją.
    const wiersze = blok.wiersze.slice(naglowek).map((w, i) => w.map((k, c) => k || nowe[`${i + naglowek},${c}`] || "").join(" ").trim());
    ustaw(p.nr, Object.keys(nowe).length ? wiersze.join("\n") : "");
  };
  const wybierzPF = (i: number, litera: string) => {
    if (!p) return;
    const litery = [...literyPF];
    litery[i] = litera || "_";
    const wynik = litery.join("");
    ustaw(p.nr, /^_+$/.test(wynik) ? "" : wynik);
  };

  return (
    <div className={styles.dataTableWrap}>
      <table className={`${styles.dataTable} ${styles.infTable} ${pf ? styles.pfTable : p ? styles.fillTable : ""}`}>
        <tbody>
          {blok.wiersze.map((w, r) => {
            const iPF = wierszePF.indexOf(r);
            return (
              <tr key={r}>
                {w.map((k, c) => {
                  const zakres = blok.zakresy?.[r]?.[c] ?? 1;
                  const obraz = obrazy.get(`${r},${c}`);
                  if (iPF >= 0 && (k === "P" || k === "F")) {
                    if (k === "F") return null;
                    const wybrana = literyPF[iPF] === "_" ? undefined : literyPF[iPF];
                    return (
                      <td key={c} colSpan={2} className={styles.pfCell}>
                        <PrawdaFalszKomorka wybrana={wybrana} poprawna={gotowe ? poprawnePF?.[iPF] : undefined} gotowe={gotowe} onWybor={(l) => wybierzPF(iPF, l)} etykieta={`Zdanie ${iPF + 1}: prawda czy fałsz`} />
                      </td>
                    );
                  }
                  const tresc = obraz ? <img src={adresObrazu(obraz.src)} alt={k} width={Math.round(obraz.szer * 1.5)} className={styles.cellImage} /> : <Tekst tekst={k} />;
                  if (r < naglowek)
                    return (
                      <th key={c} scope="col" colSpan={zakres}>
                        {tresc}
                      </th>
                    );
                  if (!k && p && !pf)
                    return (
                      <td key={c} colSpan={zakres} className={styles.fillCell}>
                        <input
                          type="text"
                          value={komorki[`${r},${c}`] ?? ""}
                          readOnly={gotowe}
                          autoComplete="off"
                          spellCheck={false}
                          onChange={(e) => wpisz(r, c, e.target.value)}
                          aria-label={`Odpowiedź ${p.nr}, wiersz ${r + 1 - naglowek}, kolumna ${c + 1}`}
                        />
                      </td>
                    );
                  return (
                    <td key={c} colSpan={zakres}>
                      {tresc}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Przełącznik Prawda / Fałsz w wierszu tabeli z informatyki, w stylu przełącznika z angielskiego.
const PF_PL = [
  { litera: "P", nazwa: "Prawda", ikona: Check },
  { litera: "F", nazwa: "Fałsz", ikona: X },
];
function PrawdaFalszKomorka({ wybrana, poprawna, gotowe, onWybor, etykieta }: { wybrana?: string; poprawna?: string; gotowe: boolean; onWybor: (l: string) => void; etykieta: string }) {
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  return (
    <div ref={kontener} className={styles.tfToggle} role="radiogroup" aria-label={etykieta}>
      {ramka && <span className={styles.tfThumb} style={ramka} aria-hidden="true" />}
      {PF_PL.map(({ litera, nazwa, ikona: Ikona }) => (
        <button
          key={litera}
          type="button"
          role="radio"
          aria-checked={wybrana === litera}
          className={styles.tfOption}
          data-stan={stanCzesci(wybrana, poprawna, litera, gotowe)}
          disabled={gotowe}
          onClick={() => onWybor(wybrana === litera ? "" : litera)}
        >
          <Ikona size={15} strokeWidth={2.4} aria-hidden="true" />
          {nazwa}
        </button>
      ))}
    </div>
  );
}

// Tekst ze znacznikami luk {{3.1}}.
function Tekst({ tekst, wlasny }: { tekst: string; wlasny?: string }) {
  const { pytania, wBloku } = useCtx();
  const czesci = tekst.split(/\{\{(\d+\.\d+)\}\}/);
  return (
    <>
      {czesci.map((c, i) => {
        if (i % 2 === 0) return <TekstMat key={i} tekst={c} />;
        const p = pytania.get(c);
        // Pytanie z własnym blokiem odpowiada tam; w tekście zostaje sam znacznik.
        if (!p || (wBloku.has(c) && c !== wlasny))
          return (
            <span key={i} className={styles.gapMark}>
              {c}. _____
            </span>
          );
        if (p.typ === "zamkniete") return <LukaZdanie key={i} pytanie={p} />;
        if (p.typ === "otwarte") return <LukaTekst key={i} pytanie={p} bezNumeru={c === wlasny} />;
        return null;
      })}
    </>
  );
}

const czyPrawdaFalsz = (p?: Pytanie): p is PytanieZamkniete => p?.typ === "zamkniete" && p.litery.join("") === "TF";
// Nagłówek kolumn z tabeli w arkuszu („T F”) — w widoku zastępują go przełączniki.
const NAGLOWEK_PF = /^(T\s*F|P\s*F|True\s+False)$/i;

// Kolejne pytania prawda/fałsz łączymy w jedną kartę z wierszami.
function grupujPrawdaFalsz(bloki: Blok[], z: Zadanie): (Blok | PytanieZamkniete[])[] {
  const wynik: (Blok | PytanieZamkniete[])[] = [];
  for (const b of bloki) {
    if (b.typ === "akapit" && NAGLOWEK_PF.test(b.tekst.trim())) continue;
    const p = b.typ === "pytanie" ? z.pytania.find((q) => q.nr === b.nr) : undefined;
    if (czyPrawdaFalsz(p)) {
      const ost = wynik[wynik.length - 1];
      if (Array.isArray(ost)) ost.push(p);
      else wynik.push([p]);
    } else wynik.push(b);
  }
  return wynik;
}

const PF = [
  { litera: "T", nazwa: "True", ikona: Check },
  { litera: "F", nazwa: "False", ikona: X },
];

function PrawdaFalsz({ pytania }: { pytania: PytanieZamkniete[] }) {
  return (
    <div className={styles.tf} role="list">
      {pytania.map((p) => (
        <WierszPrawdaFalsz key={p.nr} pytanie={p} />
      ))}
    </div>
  );
}

function WierszPrawdaFalsz({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const wybrana = postep.odpowiedzi[p.nr] || undefined;
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  const w = gotowe ? werdykt(p, wybrana) : undefined;
  return (
    <div className={styles.tfRow} role="listitem" data-werdykt={w}>
      <p className={styles.tfStatement}>
        <span className={styles.qnr}>{p.nr}.</span>
        {p.tresc}
      </p>
      <div className={styles.tfSide}>
        <div ref={kontener} className={styles.tfToggle} role="radiogroup" aria-label={`Pytanie ${p.nr}: prawda czy fałsz`}>
          {ramka && <span className={styles.tfThumb} style={ramka} aria-hidden="true" />}
          {PF.map(({ litera, nazwa, ikona: Ikona }) => (
            <button
              key={litera}
              type="button"
              role="radio"
              data-litera={litera}
              aria-checked={wybrana === litera}
              className={styles.tfOption}
              data-stan={stanOpcji(p, litera, postep, gotowe)}
              disabled={gotowe}
              onClick={() => ustaw(p.nr, wybrana === litera ? "" : litera)}
            >
              <Ikona size={15} strokeWidth={2.4} aria-hidden="true" />
              {nazwa}
            </button>
          ))}
        </div>
        {gotowe && (
          <span className={styles.tfVerdict} data-werdykt={w}>
            {w === "dobrze" ? "Dobrze" : w === "pusto" ? "Brak" : "Źle"}
          </span>
        )}
      </div>
    </div>
  );
}

function PytanieWidok({ pytanie: p }: { pytanie: Pytanie }) {
  const { arkusz, luki, lukiKadrow, obliczenia, kody, pf, dwie, tabele, wTabeli } = useCtx();
  const kompakt = useContext(Kompakt);
  const numerWidoku = useContext(NumerWidoku);
  if (p.typ === "wypowiedz") return null;
  // Informatyka: nagłówek „Zadanie 7.1 (0–3 pkt)” już podaje numer podpunktu, więc nie powtarzamy go nad polem.
  const wNaglowku = arkusz.przedmiot === "informatyka" && arkusz.zadania.some((z) => z.bloki.some((b) => b.typ === "naglowek" && b.tekst.startsWith(`Zadanie ${p.nr} `)));
  const zNumerem = p.nr.includes(".") && p.nr !== numerWidoku && !wNaglowku;
  // Odpowiedź w lukach zdań (ZdanieZLuka): tu zostaje tylko informacja po sprawdzeniu.
  const wLukach = new Set([...luki.values(), ...(kompakt ? lukiKadrow.values() : [])].map((l) => l.pytanie.nr));
  return (
    <div className={styles.question} id={kompakt ? undefined : `pytanie-${p.nr}`}>
      {/* Numer bez podpunktu to numer zadania, który stoi już w nagłówku. */}
      {(zNumerem || p.tresc) && (
        <div className={styles.stem}>
          {zNumerem && <span className={styles.qnr}>{p.nr}.</span>}
          {p.tresc && <Tekst tekst={p.tresc} wlasny={p.nr} />}
        </div>
      )}
      {p.typ === "zamkniete" && (p.opcje?.length ? <Opcje pytanie={p} /> : kompakt ? <LiteryKompakt pytanie={p} /> : <PoleLitery pytanie={p} />)}
      {p.typ === "otwarte" && kody.has(p.nr) && <KodZWyborem pytanie={p} wybor={kody.get(p.nr)!} />}
      {p.typ === "otwarte" && pf.has(p.nr) && <PrawdaFalszKod pytanie={p} stwierdzenia={pf.get(p.nr)!} />}
      {p.typ === "otwarte" && dwie.has(p.nr) && <WyborKilku pytanie={p} wybor={dwie.get(p.nr)!} />}
      {p.typ === "otwarte" && tabele.has(p.nr) && <TabelaDopasowaniaWidok pytanie={p} tabela={tabele.get(p.nr)!} />}
      {obliczenia.has(p.nr) && <p className="small muted">Rozwiązanie zapisz w brudnopisie. Po sprawdzeniu ocenisz je według schematu CKE.</p>}
      {p.typ === "otwarte" && !p.tresc.includes(`{{${p.nr}}}`) && !wLukach.has(p.nr) && !obliczenia.has(p.nr) && !kody.has(p.nr) && !pf.has(p.nr) && !dwie.has(p.nr) && !tabele.has(p.nr) && !wTabeli.has(p.nr) && (
        <LukaTekst pytanie={p} blok placeholder={p.kod ? "kod odpowiedzi z liter i cyfr" : p.zasadyStrona ? "wynik albo krótka odpowiedź" : undefined} />
      )}
      <Informacja pytanie={p} />
    </div>
  );
}

function stanOpcji(p: PytanieZamkniete, litera: string, postep: Postep, sprawdzone: boolean) {
  const wybrana = postep.odpowiedzi[p.nr] === litera;
  if (!sprawdzone) return wybrana ? "wybrana" : undefined;
  // „trafiona”: wybrana i poprawna; „poprawna”: poprawna, ale uczeń jej nie wybrał.
  if (litera === p.poprawna) return wybrana ? "trafiona" : "poprawna";
  return wybrana ? "bledna" : undefined;
}

// Pozycja podświetlenia pod wybraną opcją, mierzona z DOM, żeby mogło
// płynnie przesuwać się między opcjami jak suwak.
function usePodswietlenie(wybrana: string | undefined) {
  const kontener = useRef<HTMLDivElement>(null);
  const [ramka, setRamka] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const zmierz = () => {
      const el = wybrana ? kontener.current?.querySelector<HTMLElement>(`[data-litera="${wybrana}"]`) : null;
      setRamka(el ? { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight } : null);
    };
    zmierz();
    const ro = new ResizeObserver(zmierz);
    if (kontener.current) ro.observe(kontener.current);
    return () => ro.disconnect();
  }, [wybrana]);
  return { kontener, ramka };
}

// Ile opcji zmieści się w rzędzie w gęstym widoku (pełny ekran brudnopisu), po długości
// najdłuższej. Wzory liczymy bez poleceń LaTeX-a, bo na ekranie zajmują mniej.
function kolumnyOpcji(opcje: Opcja[]): 1 | 2 | 4 {
  const dlugosc = Math.max(...opcje.map((o) => o.tresc.replace(/\\[a-zA-Z]+/g, "").replace(/[{}\\()^_$\s]/g, "").length));
  return dlugosc <= 18 ? 4 : dlugosc <= 48 ? 2 : 1;
}

// Wstęp zadania jako wycinek strony z tym samym rysunkiem, który leży na płótnie: na pełnym
// ekranie zostaje sam tekst. Tekst z PDF kończy się podpisami osi („𝑦 10 9 8 … −6”),
// więc ucinamy go na ostatnim zdaniu przed ciągiem liczb.
function wstepBezRysunku(tekst: string): Blok[] | null {
  const osie = tekst.search(/(?:\s+(?:[−-]?\d+(?:[−-]\d+)*|[𝑥𝑦]|[A-F]\.)){6,}/u);
  if (osie < 0) return null;
  const koniec = Math.max(tekst.lastIndexOf(".", osie), tekst.lastIndexOf("?", osie), tekst.lastIndexOf("!", osie));
  return koniec > 0 ? naAkapity(tekst.slice(0, koniec + 1)) : null;
}

// Wycinek z tekstem i rysunkiem, który leży już na płótnie: zostaje sam tekst. Podpisy
// rysunku wpadają do tekstu z PDF (ciągi liczb z osi, „6 30°” przed kolejnym zdaniem),
// więc je wycinamy.
function tekstBezPodpisow(tekst: string): Blok[] {
  const bezOsi = tekst.replace(/(?:\s+(?:[−-]?\d+(?:[−-]\d+)*|[𝑥𝑦]|[A-F]\.)){6,}/gu, " ");
  return naAkapity(bezOsi)
    .map((b) => (b.typ === "akapit" ? { ...b, tekst: b.tekst.replace(/^(?:[^\sa-ząćęłńóśźż]{1,5}\s+)+(?=[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{2,})/u, "") } : b))
    .filter((b) => b.typ !== "akapit" || /[a-ząćęłńóśźż]{3,}/.test(b.tekst))
    .map((b) => (b.typ === "akapit" ? { ...b, polecenie: POLECENIA.test(b.tekst) || /^Oblicz\b|^Wyznacz\b/.test(b.tekst) } : b));
}

// Pytanie zamknięte z samymi literami, którego opcje A–D są rysunkami w wycinku („…jest
// zaznaczony na rysunku A. B. C. D.”): rysunki trafiają na płótno, nad nim tekst polecenia.
function rysunkoweOpcje(z: Zadanie): Map<string, { kadr: Blok; tekst: Blok[] }> {
  const wynik = new Map<string, { kadr: Blok; tekst: Blok[] }>();
  z.bloki.forEach((b, i) => {
    const nast = z.bloki[i + 1];
    if (b.typ !== "kadr" || nast?.typ !== "pytanie") return;
    const p = z.pytania.find((q) => q.nr === nast.nr);
    const etykiety = b.tekst.search(/\sA\.\s*B\.\s*C\.\s*D\.\s*$/);
    if (p?.typ !== "zamkniete" || p.opcje?.length || etykiety < 0) return;
    wynik.set(p.nr, { kadr: b, tekst: naAkapity(b.tekst.slice(0, etykiety).trim()) });
  });
  return wynik;
}

// Porządki w tekście na pełnym ekranie (dane z PDF i DOCX łamią akapity w dziwnych miejscach):
// akapit od małej litery to dalszy ciąg poprzedniego („…wybraną” + „spośród oznaczonych…”),
// krótkie objaśnienia po „Oznaczenia:” idą w jednej linii, a sam podpis „Tabela” nad tabelą
// znika. Akapity z luką (chronione) zostają nietknięte, bo wiąże się z nimi odpowiedź.
function uporzadkujAkapity(bloki: Blok[], chroniony: (b: Blok) => boolean): Blok[] {
  const wynik: Blok[] = [];
  let objasnienia = false;
  bloki.forEach((b, i) => {
    const prev = wynik[wynik.length - 1];
    if (b.typ === "akapit" && /^Tabela(\s+\d+)?\.?$/.test(b.tekst.trim()) && bloki[i + 1]?.typ === "tabelaTresci") return;
    if (b.typ !== "akapit" || chroniony(b) || prev?.typ !== "akapit" || chroniony(prev) || /^\d+\.\s/.test(b.tekst)) {
      objasnienia = false;
      wynik.push(b);
      return;
    }
    if (/^[a-ząćęłńóśźż]/.test(b.tekst)) {
      wynik[wynik.length - 1] = { ...prev, tekst: `${prev.tekst} ${b.tekst}` };
      return;
    }
    if ((objasnienia || /:\s*$/.test(prev.tekst)) && b.tekst.length <= 80 && !b.polecenie) {
      wynik[wynik.length - 1] = { ...prev, tekst: objasnienia ? `${prev.tekst}; ${b.tekst}` : `${prev.tekst} ${b.tekst}` };
      objasnienia = true;
      return;
    }
    objasnienia = false;
    wynik.push(b);
  });
  return wynik;
}

// Tabela przyporządkowania („Fragment wykresu funkcji 𝑦 = 𝑔(𝑥) przedstawiono na rysunku …”,
// klucz np. „AE”): każdy wiersz ma przełącznik liter A–F, a kod składa się z liter
// w kolejności wierszy. Wiersze to powtórzenia tego samego początku zdania po poleceniu.
type TabelaDopasowania = { wstep: string; wiersze: string[]; litery: string[]; kadry: Blok[] };

function tabeleDopasowania(z: Zadanie): Map<string, TabelaDopasowania> {
  const wynik = new Map<string, TabelaDopasowania>();
  let sekcja: Blok[] = [];
  for (const b of z.bloki) {
    if (b.typ !== "pytanie") {
      sekcja.push(b);
      continue;
    }
    const p = z.pytania.find((q) => q.nr === b.nr);
    const klucz = p?.typ === "otwarte" && p.kod ? p.oczekiwane?.[0] : undefined;
    const kadr = sekcja.find((x): x is Blok & { typ: "kadr"; tekst: string } => x.typ === "kadr" && /Uzupełnij tabelę/.test(x.tekst));
    const zakres = kadr?.tekst.match(/literami ([A-Z])[–-]([A-Z])\./);
    if (klucz && /^[A-Z]{2,}$/.test(klucz) && kadr && zakres) {
      const poPoleceniu = kadr.tekst.slice(kadr.tekst.indexOf(zakres[0]) + zakres[0].length);
      const tresc = poPoleceniu.slice(0, poPoleceniu.search(/\s[A-Z]\.\s/)).trim();
      const poczatek = tresc.split(/\s+/).slice(0, 3).join(" ");
      const wiersze = tresc
        .split(poczatek)
        .filter((w) => w.trim())
        .map((w) => `${poczatek}${w}`.trim());
      const litery = Array.from({ length: zakres[2].charCodeAt(0) - zakres[1].charCodeAt(0) + 1 }, (_, i) => String.fromCharCode(zakres[1].charCodeAt(0) + i));
      // Wycinki z wykresami opcji (A–F) idą na płótno; wstęp to tekst wycinka przed wierszami tabeli.
      const kadry = sekcja.filter((x) => x.typ === "kadr" && (x === kadr || /(^|\s)[A-Z]\.\s/.test(x.tekst)));
      const wstep = kadr.tekst.slice(0, kadr.tekst.indexOf(poczatek)).trim();
      if (wiersze.length === klucz.length) wynik.set(p!.nr, { wstep, wiersze, litery, kadry });
    }
    sekcja = [];
  }
  return wynik;
}

function PrzelacznikLiter({ litery, wybrana, poprawna, gotowe, onWybor, etykieta }: { litery: string[]; wybrana?: string; poprawna?: string; gotowe: boolean; onWybor: (w: string) => void; etykieta: string }) {
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  return (
    <div ref={kontener} className={styles.slider} role="radiogroup" aria-label={etykieta}>
      {ramka && <span className={styles.thumb} style={ramka} aria-hidden="true" />}
      {litery.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          data-litera={l}
          aria-checked={wybrana === l}
          className={styles.segment}
          data-stan={stanCzesci(wybrana, poprawna, l, gotowe)}
          disabled={gotowe}
          onClick={() => onWybor(wybrana === l ? "" : l)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function TabelaDopasowaniaWidok({ pytanie: p, tabela }: { pytanie: PytanieOtwarte; tabela: TabelaDopasowania }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const robocze = postep.odpowiedzi[`${p.nr}.wybor`] ?? postep.odpowiedzi[p.nr] ?? "";
  const wybory = tabela.wiersze.map((_, i) => (tabela.litery.includes(robocze[i]) ? robocze[i] : undefined));
  const klucz = p.oczekiwane?.[0] ?? "";
  const wybierz = (i: number, w: string) => {
    const nowe = wybory.map((x, j) => (j === i ? w || undefined : x));
    ustaw(`${p.nr}.wybor`, nowe.map((x) => x ?? "_").join(""));
    ustaw(p.nr, nowe.every(Boolean) ? nowe.join("") : "");
  };
  return (
    <div className={styles.pfWiersze}>
      {tabela.wiersze.map((w, i) => (
        <div key={i} className={styles.pfWiersz}>
          <p className={styles.para}>{w}</p>
          <PrzelacznikLiter litery={tabela.litery} wybrana={wybory[i]} poprawna={klucz[i]} gotowe={gotowe} etykieta={w} onWybor={(l) => wybierz(i, l)} />
        </div>
      ))}
    </div>
  );
}

// Odpowiedź kodem „Zapisz dwie właściwe odpowiedzi spośród oznaczonych literami A–F” (klucz
// np. „CE”): wszystkie opcje w jednej liście, wybór dwóch, a zdanie „…… oraz ……” wypełnia
// się wybranymi literami. Kod (litery w kolejności alfabetu) trafia do odpowiedzi dopiero
// przy dwóch wyborach; wybór w trakcie leży pod kluczem „11.wybor”.
type WyborDwoch = { zdanie: string; opcje: Opcja[]; ile: number; ukryte: Set<Blok> };
const OPCJA_W_AKAPICIE = /^([A-Z])\.\s+([\s\S]+)$/;

function wyboryDwoch(z: Zadanie): Map<string, WyborDwoch> {
  const wynik = new Map<string, WyborDwoch>();
  let sekcja: Blok[] = [];
  for (const b of z.bloki) {
    if (b.typ !== "pytanie") {
      sekcja.push(b);
      continue;
    }
    const p = z.pytania.find((q) => q.nr === b.nr);
    const klucz = p?.typ === "otwarte" && p.kod ? p.oczekiwane?.[0] : undefined;
    const opcje = sekcja.find((x) => x.typ === "opcje");
    const zdanie = sekcja.find((x) => x.typ === "akapit" && !x.polecenie && ZNACZNIK_LUKI.test(x.tekst));
    if (klucz && /^[A-Z]{2,}$/.test(klucz) && !/^[PF]+$/.test(klucz) && opcje?.typ === "opcje" && zdanie?.typ === "akapit") {
      const wAkapitach = sekcja.filter((x) => x.typ === "akapit" && !x.polecenie && OPCJA_W_AKAPICIE.test(x.tekst));
      const dodatkowe = wAkapitach.map((x) => {
        const [, litera, tresc] = (x as { tekst: string }).tekst.match(OPCJA_W_AKAPICIE)!;
        return { litera, tresc };
      });
      wynik.set(p!.nr, {
        zdanie: zdanie.tekst,
        opcje: [...opcje.opcje, ...dodatkowe].sort((a, c) => a.litera.localeCompare(c.litera)),
        ile: klucz.length,
        ukryte: new Set<Blok>([opcje, zdanie, ...wAkapitach]),
      });
    }
    sekcja = [];
  }
  return wynik;
}

function WyborKilku({ pytanie: p, wybor }: { pytanie: PytanieOtwarte; wybor: WyborDwoch }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const wybrane = [...(postep.odpowiedzi[`${p.nr}.wybor`] ?? postep.odpowiedzi[p.nr] ?? "")].filter((l) => wybor.opcje.some((o) => o.litera === l));
  const klucz = p.oczekiwane?.[0] ?? "";
  const przelacz = (l: string) => {
    // Trzeci wybór zastępuje najstarszy, żeby nie trzeba było najpierw odznaczać.
    const nowe = wybrane.includes(l) ? wybrane.filter((x) => x !== l) : [...wybrane, l].slice(-wybor.ile);
    ustaw(`${p.nr}.wybor`, nowe.join(""));
    ustaw(p.nr, nowe.length === wybor.ile ? [...nowe].sort().join("") : "");
  };
  const posortowane = [...wybrane].sort();
  let n = 0;
  const czesci = wybor.zdanie.split(/(…{2,}|\.{4,})/);
  return (
    <div className={styles.wieleWybor}>
      <p className={styles.para}>
        {czesci.map((c, i) =>
          i % 2 ? (
            <span key={i} className={styles.lukaLitera}>
              {posortowane[n++] ?? "……"}
            </span>
          ) : (
            <Tekst key={i} tekst={c} />
          ),
        )}
      </p>
      <div className={styles.choices} data-kolumny="2" role="group" aria-label={`Pytanie ${p.nr}: wybierz ${wybor.ile}`}>
        {wybor.opcje.map((o) => {
          const wybrana = wybrane.includes(o.litera);
          const stan = gotowe ? (klucz.includes(o.litera) ? (wybrana ? "trafiona" : "poprawna") : wybrana ? "bledna" : undefined) : wybrana ? "wybrana" : undefined;
          return (
            <button key={o.litera} type="button" role="checkbox" aria-checked={wybrana} className={styles.choice} data-stan={stan} disabled={gotowe} onClick={() => przelacz(o.litera)}>
              <span className={styles.letter}>{o.litera}</span>
              <span>
                <Tekst tekst={o.tresc} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Całe zadanie P/F jako jeden wycinek strony (tekst, diagramy, tabela P/F; klucz np. „PP”).
// Tekst z PDF: wstęp, podpisy osi, polecenie „Oceń prawdziwość…”, a potem stwierdzenia
// z wtrąconym „P F” z kolumn tabeli. Wyciągamy z niego wstęp, polecenie i zdania.
function pfZKadru(z: Zadanie): { kadr: Blok; tekst: Blok[]; nr: string; stwierdzenia: StwierdzeniaPF } | null {
  const [p] = z.pytania;
  const klucz = z.pytania.length === 1 && p.typ === "otwarte" && p.kod ? p.oczekiwane?.[0] : undefined;
  const kadr = z.bloki.find((b) => b.typ === "kadr" && /Oceń prawdziwość/.test(b.tekst));
  if (!klucz || !/^[PF]+$/.test(klucz) || kadr?.typ !== "kadr") return null;
  const t = kadr.tekst;
  const od = t.search(/Oceń prawdziwość/);
  const koniecPolecenia = t.indexOf("fałszywe.", od);
  if (koniecPolecenia < 0) return null;
  const polecenie = t.slice(od, koniecPolecenia + "fałszywe.".length);
  const zdania = t
    .slice(koniecPolecenia + "fałszywe.".length)
    .replace(/\s+P\s+F(?=\s|$)/g, "")
    .trim()
    .split(/(?<=\.)\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/)
    .filter(Boolean);
  if (zdania.length !== klucz.length) return null;
  const wstep = wstepBezRysunku(t.slice(0, od)) ?? naAkapity(t.slice(0, od));
  return {
    kadr,
    tekst: [...wstep, { typ: "akapit", tekst: polecenie, polecenie: true }],
    nr: p.nr,
    stwierdzenia: { zdania: zdania.map((tekst): Blok[] => [{ typ: "akapit", tekst }]), ukryte: new Set() },
  };
}

// Odpowiedź kodem P/F („Oceń prawdziwość stwierdzeń 1. i 2.”, klucz np. „PF”): każde
// stwierdzenie to wiersz z przełącznikiem P | F, jak tabela w arkuszu CKE. Gotowy kod
// trafia do odpowiedzi dopiero po wyborze przy wszystkich zdaniach; wybór w trakcie
// leży pod osobnym kluczem („5.pf”), którego ocena nie widzi.
type StwierdzeniaPF = { zdania: Blok[][]; ukryte: Set<Blok> };

function stwierdzeniaPF(z: Zadanie): Map<string, StwierdzeniaPF> {
  const wynik = new Map<string, StwierdzeniaPF>();
  let sekcja: Blok[] = [];
  for (const b of z.bloki) {
    if (b.typ !== "pytanie") {
      sekcja.push(b);
      continue;
    }
    const p = z.pytania.find((q) => q.nr === b.nr);
    const klucz = p?.typ === "otwarte" && p.kod ? p.oczekiwane?.[0] : undefined;
    if (klucz && /^[PF]+$/.test(klucz)) {
      // Zdanie zaczyna akapit „1. …”, a kolejne akapity bez numeru (wzór w osobnej linii) go dopełniają.
      const zdania: Blok[][] = [];
      for (const x of sekcja) {
        if (x.typ !== "akapit" || x.polecenie) continue;
        if (/^\d+\.\s/.test(x.tekst)) zdania.push([x]);
        else if (zdania.length) zdania[zdania.length - 1].push(x);
      }
      if (zdania.length === klucz.length) wynik.set(p!.nr, { zdania, ukryte: new Set(zdania.flat()) });
    }
    sekcja = [];
  }
  return wynik;
}

function PrzelacznikPF({ wybrana, poprawna, gotowe, onWybor, etykieta }: { wybrana?: string; poprawna?: string; gotowe: boolean; onWybor: (w: string) => void; etykieta: string }) {
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  return (
    <div ref={kontener} className={styles.slider} role="radiogroup" aria-label={etykieta}>
      {ramka && <span className={styles.thumb} style={ramka} aria-hidden="true" />}
      {["P", "F"].map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          data-litera={l}
          aria-checked={wybrana === l}
          aria-label={l === "P" ? "Prawda" : "Fałsz"}
          className={styles.segment}
          data-stan={stanCzesci(wybrana, poprawna, l, gotowe)}
          disabled={gotowe}
          onClick={() => onWybor(wybrana === l ? "" : l)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function PrawdaFalszKod({ pytanie: p, stwierdzenia }: { pytanie: PytanieOtwarte; stwierdzenia: StwierdzeniaPF }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const robocze = postep.odpowiedzi[`${p.nr}.pf`] ?? postep.odpowiedzi[p.nr] ?? "";
  const wybory = stwierdzenia.zdania.map((_, i) => (robocze[i] === "P" || robocze[i] === "F" ? robocze[i] : undefined));
  const klucz = p.oczekiwane?.[0] ?? "";
  const wybierz = (i: number, w: string) => {
    const nowe = wybory.map((x, j) => (j === i ? w || undefined : x));
    ustaw(`${p.nr}.pf`, nowe.map((x) => x ?? "_").join(""));
    ustaw(p.nr, nowe.every(Boolean) ? nowe.join("") : "");
  };
  return (
    <div className={styles.pfWiersze}>
      {stwierdzenia.zdania.map((zdanie, i) => (
        <div key={i} className={styles.pfWiersz}>
          <div className={styles.para}>
            {zdanie.map((b, k) => (
              <span key={k}>
                {k > 0 && " "}
                {b.typ === "akapit" && <Tekst tekst={b.tekst} />}
              </span>
            ))}
          </div>
          <PrzelacznikPF wybrana={wybory[i]} poprawna={klucz[i]} gotowe={gotowe} etykieta={`Stwierdzenie ${i + 1}: prawda czy fałsz`} onWybor={(w) => wybierz(i, w)} />
        </div>
      ))}
    </div>
  );
}

// Odpowiedź kodem „A albo B oraz 1., 2. albo 3.” („Ten ciąg jest … oraz …”): zamiast wpisywać
// „B2”, uczeń wybiera w dwóch grupach, a zapis zostaje kodem, więc sprawdzanie z kluczem działa.
type WyborKodu = { przed: string; miedzy: string; litery: Opcja[]; cyfry: Opcja[]; ukryte: Set<Blok> };
const NUMEROWANA = /^(\d)\.\s+([\s\S]+)$/;

function kodyZWyborem(z: Zadanie): Map<string, WyborKodu> {
  const wynik = new Map<string, WyborKodu>();
  let sekcja: Blok[] = [];
  for (const b of z.bloki) {
    if (b.typ !== "pytanie") {
      sekcja.push(b);
      continue;
    }
    const p = z.pytania.find((q) => q.nr === b.nr);
    const opcje = sekcja.find((x) => x.typ === "opcje");
    if (p?.typ === "otwarte" && p.kod && p.oczekiwane?.every((k) => /^[A-Z]\d$/.test(k)) && opcje?.typ === "opcje") {
      const numerowane = sekcja.filter((x): x is Blok & { typ: "akapit"; tekst: string; polecenie?: boolean } => x.typ === "akapit" && !x.polecenie && NUMEROWANA.test(x.tekst));
      // Krótkie kawałki zdania: „Ten ciąg jest” przed pierwszą grupą, „oraz” przed drugą.
      const kawalki = sekcja.filter((x): x is Blok & { typ: "akapit"; tekst: string; polecenie?: boolean } => x.typ === "akapit" && !x.polecenie && !NUMEROWANA.test(x.tekst) && x.tekst.length <= 80);
      const zdanie = kawalki.slice(-2);
      if (numerowane.length >= 2)
        wynik.set(p.nr, {
          przed: zdanie.length === 2 ? zdanie[0].tekst : "",
          miedzy: zdanie.length === 2 ? zdanie[1].tekst : (zdanie[0]?.tekst ?? "oraz"),
          litery: opcje.opcje,
          cyfry: numerowane.map((x) => {
            const [, nr, tresc] = x.tekst.match(NUMEROWANA)!;
            return { litera: nr, tresc };
          }),
          ukryte: new Set<Blok>([opcje, ...numerowane, ...zdanie]),
        });
    }
    sekcja = [];
  }
  return wynik;
}

function stanCzesci(wybrana: string | undefined, poprawna: string | undefined, wartosc: string, gotowe: boolean) {
  if (!gotowe) return wybrana === wartosc ? "wybrana" : undefined;
  if (wartosc === poprawna) return wybrana === wartosc ? "trafiona" : "poprawna";
  return wybrana === wartosc ? "bledna" : undefined;
}

function GrupaKodu({ opcje, wybrana, poprawna, gotowe, onWybor, etykieta }: { opcje: Opcja[]; wybrana?: string; poprawna?: string; gotowe: boolean; onWybor: (w: string) => void; etykieta: string }) {
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  return (
    <div ref={kontener} className={styles.choices} role="radiogroup" aria-label={etykieta}>
      {ramka && <span className={styles.highlight} style={ramka} aria-hidden="true" />}
      {opcje.map((o) => (
        <button
          key={o.litera}
          type="button"
          role="radio"
          data-litera={o.litera}
          aria-checked={wybrana === o.litera}
          className={styles.choice}
          data-stan={stanCzesci(wybrana, poprawna, o.litera, gotowe)}
          disabled={gotowe}
          onClick={() => onWybor(wybrana === o.litera ? "" : o.litera)}
        >
          <span className={styles.letter}>{o.litera}</span>
          <span>
            <Tekst tekst={o.tresc} />
          </span>
        </button>
      ))}
    </div>
  );
}

function KodZWyborem({ pytanie: p, wybor }: { pytanie: PytanieOtwarte; wybor: WyborKodu }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const kod = postep.odpowiedzi[p.nr] ?? "";
  const litera = kod.match(/^[A-Z]/)?.[0];
  const cyfra = kod.match(/\d+$/)?.[0];
  const klucz = p.oczekiwane?.[0] ?? "";
  return (
    // Jak w arkuszu CKE: jeden wiersz tabeli „Ten ciąg jest | A / B | oraz | 1. / 2. / 3.”.
    <div className={styles.kodWybor}>
      <p className={styles.kodTekst}>
        <Tekst tekst={wybor.przed} />
      </p>
      <div>
        <GrupaKodu opcje={wybor.litery} wybrana={litera} poprawna={klucz[0]} gotowe={gotowe} etykieta={`Pytanie ${p.nr}, pierwsza część`} onWybor={(l) => ustaw(p.nr, `${l}${cyfra ?? ""}`)} />
      </div>
      <p className={styles.kodTekst}>
        <Tekst tekst={wybor.miedzy} />
      </p>
      <div>
        <GrupaKodu opcje={wybor.cyfry} wybrana={cyfra} poprawna={klucz.slice(1)} gotowe={gotowe} etykieta={`Pytanie ${p.nr}, druga część`} onWybor={(c) => ustaw(p.nr, `${litera ?? ""}${c}`)} />
      </div>
    </div>
  );
}

function Opcje({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const wybrana = postep.odpowiedzi[p.nr] || undefined;
  const { kontener, ramka } = usePodswietlenie(gotowe ? undefined : wybrana);
  return (
    <div ref={kontener} className={styles.choices} data-kolumny={kolumnyOpcji(p.opcje!)} role="radiogroup" aria-label={`Pytanie ${p.nr}`}>
      {ramka && <span className={styles.highlight} style={ramka} aria-hidden="true" />}
      {p.opcje!.map((o) => (
        <button
          key={o.litera}
          type="button"
          role="radio"
          data-litera={o.litera}
          aria-checked={wybrana === o.litera}
          className={styles.choice}
          data-stan={stanOpcji(p, o.litera, postep, gotowe)}
          disabled={gotowe}
          onClick={() => ustaw(p.nr, wybrana === o.litera ? "" : o.litera)}
        >
          <span className={styles.letter}>{o.litera}</span>
          <span>
            <Tekst tekst={o.tresc} />
          </span>
        </button>
      ))}
    </div>
  );
}

// Litery po kolei (A, B, C…) opisujemy zakresem „A–F”, inne wypisujemy.
function zakresLiter(litery: string[]) {
  const poKolei = litery.every((l, i) => i === 0 || l.charCodeAt(0) === litery[i - 1].charCodeAt(0) + 1);
  return poKolei && litery.length > 2 ? `${litery[0]}–${litery.at(-1)}` : litery.join(", ");
}

// Same litery (dopasowanie): pole na jedną literę, jak kratka w tabeli odpowiedzi
// na maturze. Przyjmuje tylko litery z zadania, a po wpisaniu przechodzi do
// następnego takiego pola, więc tabelę wypełnia się z klawiatury.
// Pełny ekran brudnopisu: litery do kliknięcia (opcje leżą na płótnie albo w treści).
function LiteryKompakt({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  return (
    <PrzelacznikLiter
      litery={p.litery}
      wybrana={postep.odpowiedzi[p.nr] || undefined}
      poprawna={p.poprawna}
      gotowe={sprawdzone(p.nr)}
      etykieta={`Pytanie ${p.nr}`}
      onWybor={(l) => ustaw(p.nr, l)}
    />
  );
}

function PoleLitery({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const wybrana = postep.odpowiedzi[p.nr] ?? "";
  const zakres = zakresLiter(p.litery);
  const wpisz = (e: ChangeEvent<HTMLInputElement>) => {
    const l = e.target.value.slice(-1).toUpperCase();
    if (l && !p.litery.includes(l)) return;
    ustaw(p.nr, l);
    if (!l) return;
    const pola = [...document.querySelectorAll<HTMLInputElement>("input[data-pole-litery]:not(:disabled)")];
    pola[pola.indexOf(e.target) + 1]?.focus();
  };
  return (
    <span className={styles.letterField}>
      <input
        className={styles.letterInput}
        data-pole-litery=""
        data-stan={wybrana ? stanOpcji(p, wybrana, postep, gotowe) : undefined}
        value={wybrana}
        onChange={wpisz}
        onFocus={(e) => e.target.select()}
        disabled={gotowe}
        aria-label={`Pytanie ${p.nr}: wpisz literę ${zakres}`}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
      />
      {!gotowe && <span className="small muted">{zakres}</span>}
    </span>
  );
}

function WierszTabeli({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { arkusz, postep, sprawdzone } = useCtx();
  const w = werdykt(p, postep.odpowiedzi[p.nr]);
  return (
    <div className={styles.row}>
      <span className={styles.qnr}>{p.nr}.</span>
      <PoleLitery pytanie={p} />
      {sprawdzone(p.nr) && (
        <span className={styles.rowVerdict} data-werdykt={w}>
          {w === "dobrze" ? <Check size={16} aria-label="dobrze" /> : <X size={16} aria-label="źle" />}
          {w !== "dobrze" && <span className="small">poprawna: {p.poprawna}</span>}
        </span>
      )}
      {sprawdzone(p.nr) && p.fragment && arkusz.nagranie && (
        <span className={styles.rowFragment}>
          <FragmentNagrania src={arkusz.nagranie} fragment={p.fragment} />
        </span>
      )}
    </div>
  );
}

// Luka na brakujące zdanie: kliknięcie rozwija pod nią listę zdań, wybrane
// zdanie wchodzi w tekst. Bez treści opcji zostaje mały wybór liter.
function LukaZdanie({ pytanie: p }: { pytanie: PytanieZamkniete }) {
  const { arkusz, postep, ustaw, sprawdzone, opcjeDla, otwartaLuka, setOtwartaLuka } = useCtx();
  const kompakt = useContext(Kompakt);
  const opcje = opcjeDla(p.nr);
  const gotowe = sprawdzone(p.nr);
  const wybrana = postep.odpowiedzi[p.nr] || "";
  // Matematyka na pełnym ekranie: pod luką od razu opcje z treścią („A 5,80 zł”), bez listy obok.
  if (kompakt && arkusz.przedmiot === "matematyka")
    return (
      <span className={styles.wyborLuki} role="radiogroup" aria-label={`Luka ${p.nr}`}>
        {(opcje ?? p.litery.map((l) => ({ litera: l, tresc: "" }))).map((o) => (
          <button
            key={o.litera}
            type="button"
            role="radio"
            aria-checked={wybrana === o.litera}
            className={styles.choice}
            data-stan={stanCzesci(wybrana || undefined, p.poprawna, o.litera, gotowe)}
            disabled={gotowe}
            onClick={() => ustaw(p.nr, wybrana === o.litera ? "" : o.litera)}
          >
            <span className={styles.letter}>{o.litera}</span>
            {o.tresc && (
              <span>
                <Tekst tekst={o.tresc} />
              </span>
            )}
          </button>
        ))}
      </span>
    );
  const otwarta = otwartaLuka === p.nr && !gotowe;
  const w = gotowe ? werdyktPytania(p, postep) : undefined;
  const tresc = opcje?.find((o) => o.litera === wybrana)?.tresc;
  // Które zdania są już wstawione w inne luki tego zadania.
  const zajete = new Map<string, string>();
  for (const [nr, l] of Object.entries(postep.odpowiedzi)) if (nr !== p.nr && nrZadania(nr) === nrZadania(p.nr) && l) zajete.set(l, nr);

  return (
    <span className={styles.sentenceGap} data-luka>
      <button
        type="button"
        className={styles.gapChip}
        data-wybrana={wybrana ? "" : undefined}
        data-werdykt={w}
        data-otwarta={otwarta || undefined}
        aria-expanded={otwarta}
        disabled={gotowe}
        onClick={() => setOtwartaLuka(otwarta ? null : p.nr)}
      >
        <span className={styles.gapNr}>{p.nr}.</span>
        {wybrana ? (
          <>
            <strong>{wybrana}</strong>
            {tresc && <span className={styles.gapText}>{tresc}</span>}
          </>
        ) : (
          <span className={styles.gapPrompt}>{!opcje ? "wybierz" : arkusz.przedmiot === "matematyka" ? "wybierz odpowiedź" : "wybierz zdanie"}</span>
        )}
        {!gotowe && <ChevronDown size={14} aria-hidden="true" className={styles.gapChevron} />}
      </button>
      {otwarta && (
        <span className={styles.picker} role="listbox" aria-label={`Zdania do luki ${p.nr}`}>
          {(opcje ?? p.litery.map((l) => ({ litera: l, tresc: "" }))).map((o) => (
            <button
              key={o.litera}
              type="button"
              role="option"
              aria-selected={wybrana === o.litera}
              className={styles.pickerOption}
              data-zajeta={zajete.has(o.litera) || undefined}
              onClick={() => {
                ustaw(p.nr, o.litera);
                setOtwartaLuka(null);
              }}
            >
              <span className={styles.letter}>{o.litera}</span>
              <span>{o.tresc || `Litera ${o.litera}`}</span>
              {zajete.has(o.litera) && <span className={styles.badge}>w {zajete.get(o.litera)}</span>}
            </button>
          ))}
          {wybrana && (
            <button
              type="button"
              className={styles.pickerClear}
              onClick={() => {
                ustaw(p.nr, "");
                setOtwartaLuka(null);
              }}
            >
              Wyczyść lukę
            </button>
          )}
        </span>
      )}
    </span>
  );
}

function LukaTekst({ pytanie: p, blok, bezNumeru, placeholder }: { pytanie: PytanieOtwarte; blok?: boolean; bezNumeru?: boolean; placeholder?: string }) {
  const { arkusz, postep, ustaw, sprawdzone } = useCtx();
  const gotowe = sprawdzone(p.nr);
  const w = gotowe ? werdyktPytania(p, postep) : undefined;
  const wartosc = postep.odpowiedzi[p.nr] ?? "";
  // Matematyka oceniana według schematu (bez listy odpowiedzi do porównania): pole z zapisem
  // matematycznym. Przy kluczu z listą zostaje zwykły tekst, bo porównujemy go z kluczem.
  if (blok && arkusz.przedmiot === "matematyka" && !p.kod && !p.oczekiwane?.length && !p.akceptowane?.length)
    return (
      <span className={styles.blockGap} data-werdykt={w}>
        <PoleMatematyczne wartosc={wartosc} onZmiana={(latex) => ustaw(p.nr, latex)} tylkoOdczyt={gotowe} etykieta={`Odpowiedź ${p.nr}`} szerokie />
      </span>
    );
  // Informatyka: wynik bywa kilkoma wierszami (wyjście programu, lista nazw), a odpowiedzią bywa algorytm czy zapytanie.
  const zadanieP = arkusz.zadania.find((z) => z.nr === nrZadania(p.nr));
  const rodzaj = zadanieP ? rodzajPytania(p, zadanieP) : "inne";
  if (blok && arkusz.przedmiot === "informatyka" && !p.kod && (rodzaj === "kod" || rodzaj === "sql"))
    return (
      <span className={styles.blockGap} data-werdykt={w}>
        <PoleKodu p={p} rodzaj={rodzaj} wartosc={wartosc} tylkoOdczyt={gotowe} />
      </span>
    );
  if (blok && arkusz.przedmiot === "informatyka" && !p.kod)
    return (
      <span className={styles.blockGap} data-werdykt={w}>
        <textarea
          className={styles.codeAnswer}
          value={wartosc}
          rows={Math.min(14, Math.max(3, wartosc.split("\n").length + 1))}
          readOnly={gotowe}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => ustaw(p.nr, e.target.value)}
          placeholder={p.wynik ? "wynik: wpisz albo wstaw z programu" : "odpowiedź, algorytm albo zapytanie"}
          aria-label={`Odpowiedź ${p.nr}`}
        />
      </span>
    );
  return (
    <span className={blok ? styles.blockGap : styles.inlineGap} data-werdykt={w}>
      {!blok && !bezNumeru && <span className={styles.gapNr}>{p.nr}.</span>}
      <input
        type="text"
        value={wartosc}
        size={Math.max(blok ? 30 : 12, wartosc.length + 2)}
        readOnly={gotowe}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(e) => ustaw(p.nr, e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder ? `Odpowiedź ${p.nr}` : `Luka ${p.nr}`}
      />
    </span>
  );
}

// Pole na algorytm albo zapytanie SQL: czcionka stała, Tab wstawia wcięcie, a kod z edytora panelu
// (zaznaczony albo cały) przenosi się jednym przyciskiem, po podglądzie. Pseudokod też się tu zmieści.
function PoleKodu({ p, rodzaj, wartosc, tylkoOdczyt }: { p: PytanieOtwarte; rodzaj: "kod" | "sql"; wartosc: string; tylkoOdczyt: boolean }) {
  const { postep, ustaw } = useCtx();
  const [przenos, setPrzenos] = useState(false);
  const wyjscie = useRef(false);
  const jezyk: "sql" | "python" = rodzaj === "sql" ? "sql" : "python";
  const zEdytora = postep.warsztat?.[nrZadania(p.nr)]?.[jezyk] ?? "";
  const zaznaczone = zaznaczenia[jezyk];
  const warianty: Wariant[] = [
    ...(zaznaczone.trim() ? [{ id: "zaznaczony", etykieta: "Zaznaczony kod", tekst: zaznaczone, rodzaj: "kod" as const, jezyk }] : []),
    ...(zEdytora.trim() ? [{ id: "caly", etykieta: "Cały kod z edytora", tekst: zEdytora.replace(/\s+$/, ""), rodzaj: "kod" as const, jezyk }] : []),
  ];
  return (
    <>
      <textarea
        className={`${styles.codeAnswer} ${styles.codeAnswerKod}`}
        value={wartosc}
        rows={Math.min(20, Math.max(8, wartosc.split("\n").length + 2))}
        readOnly={tylkoOdczyt}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(e) => ustaw(p.nr, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") wyjscie.current = true;
          else if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !wyjscie.current && !tylkoOdczyt) {
            e.preventDefault();
            // execCommand zachowuje cofanie (Ctrl+Z); przy braku obsługi wstawiamy ręcznie.
            if (!document.execCommand("insertText", false, "    ")) {
              const t = e.currentTarget;
              ustaw(p.nr, `${wartosc.slice(0, t.selectionStart)}    ${wartosc.slice(t.selectionEnd)}`);
            }
          } else wyjscie.current = false;
        }}
        placeholder={rodzaj === "sql" ? "zapytanie SQL (Tab wstawia wcięcie)" : "algorytm w pseudokodzie albo kod programu (Tab wstawia wcięcie)"}
        aria-label={`Odpowiedź ${p.nr}`}
        aria-describedby={`pomoc-${p.nr}`}
      />
      <span id={`pomoc-${p.nr}`} className="small muted">
        Tab wstawia wcięcie; Esc, a potem Tab przechodzi dalej.
      </span>
      {!tylkoOdczyt && warianty.length > 0 && (
        przenos ? (
          <Przenoszenie cele={[{ nr: p.nr, rodzaj, odpowiedz: wartosc }]} warianty={warianty} onWstaw={ustaw} onZamknij={() => setPrzenos(false)} />
        ) : (
          <span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPrzenos(true)}>
              Wstaw kod z edytora…
            </button>
          </span>
        )
      )}
    </>
  );
}

function WypowiedzWidok({ pytanie: p, pisanie }: { pytanie: Wypowiedz; pisanie: Pisanie }) {
  const { postep, ustaw, sprawdzone } = useCtx();
  const klucz = (pole: string) => `${p.nr}:${pole}`;
  const temat = Number(postep.odpowiedzi[klucz("temat")]) || null;
  const odhaczone = (postep.odpowiedzi[klucz("lista")] ?? "").split(",").filter(Boolean).map(Number);
  return (
    <div className={styles.essay}>
      <Wypracowanie
        tekst={postep.odpowiedzi[p.nr] ?? ""}
        poczatek={p.poczatek}
        tematy={pisanie.tematy}
        punkty={pisanie.punkty}
        polecenie={pisanie.polecenie}
        zakres={pisanie.zakres}
        temat={temat}
        odhaczone={odhaczone}
        tylkoOdczyt={sprawdzone(p.nr)}
        onTekst={(t) => ustaw(p.nr, t)}
        onTemat={(n) => ustaw(klucz("temat"), String(n))}
        onOdhacz={(i) => ustaw(klucz("lista"), (odhaczone.includes(i) ? odhaczone.filter((x) => x !== i) : [...odhaczone, i]).join(","))}
      />
      {sprawdzone(p.nr) && (
        <p className={`small ${styles.note}`}>
          Wypowiedź oceniasz na razie sam według kryteriów z polecenia (treść, spójność, zakres i poprawność środków językowych). Automatyczna ocena przyjdzie razem z AI.
        </p>
      )}
    </div>
  );
}

function opisSamooceny(p: Pytanie, ocena: boolean | number | undefined, zLista: boolean) {
  if (ocena === undefined) return zLista ? "Spoza listy CKE: oceń sam" : "Oceń sam według schematu CKE";
  if (p.punkty > 1) return `Przyznane przez ciebie: ${punktyZSamooceny(p, ocena)} z ${p.punkty} pkt`;
  return ocena ? "Zaliczona przez ciebie" : "Niezaliczona przez ciebie";
}

// Informacja zwrotna pod pytaniem po sprawdzeniu.
function Informacja({ pytanie: p, zNumerem }: { pytanie: Pytanie; zNumerem?: boolean }) {
  const { arkusz, postep, ocen, sprawdzone, opcjeDla } = useCtx();
  if (!sprawdzone(p.nr) || p.typ === "wypowiedz") return null;
  const surowy = werdykt(p, postep.odpowiedzi[p.nr]);
  const w = werdyktPytania(p, postep);
  const odp = postep.odpowiedzi[p.nr]?.trim();
  const nr: ReactNode = zNumerem ? <strong>{p.nr}. </strong> : null;
  const schemat = p.zasadyStrona && arkusz.pdf?.zasady ? `${arkusz.pdf.zasady}#page=${p.zasadyStrona}` : null;

  if (p.typ === "zamkniete") {
    const zdanie = opcjeDla(p.nr)?.find((o) => o.litera === p.poprawna)?.tresc;
    return (
      <div className={styles.feedback} data-werdykt={w}>
        <p className={styles.feedbackHead}>
          {nr}
          {w === "dobrze" ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
          {w === "dobrze" ? "Dobrze" : `${odp ? `Twoja: ${odp}. ` : "Brak odpowiedzi. "}Poprawna: ${p.poprawna}`}
        </p>
        {w !== "dobrze" && zdanie && !p.opcje?.length && <p className={`small muted ${styles.correctText}`}><Tekst tekst={zdanie} /></p>}
        {p.fragment && arkusz.nagranie && <FragmentNagrania src={arkusz.nagranie} fragment={p.fragment} />}
      </div>
    );
  }

  return (
    <div className={styles.feedback} data-werdykt={w}>
      <p className={styles.feedbackHead}>
        {nr}
        {w === "dobrze" ? <Check size={16} aria-hidden="true" /> : w === "zle" ? <X size={16} aria-hidden="true" /> : null}
        {surowy === "dobrze" && "Zgodne z kluczem CKE"}
        {surowy === "zle" && "Ta odpowiedź jest w kluczu jako niepoprawna"}
        {surowy === "pusto" && "Brak odpowiedzi"}
        {surowy === "do-oceny" && opisSamooceny(p, postep.samoocena[p.nr], !!(p.oczekiwane?.length || p.akceptowane?.length))}
      </p>
      {p.fragment && arkusz.nagranie && <FragmentNagrania src={arkusz.nagranie} fragment={p.fragment} />}
      {surowy !== "dobrze" && (
        <div className={styles.key}>
          {schemat && (
            <p>
              <a className="link" href={schemat} target="_blank" rel="noreferrer">
                Rozwiązanie i schemat oceniania CKE (strona {p.zasadyStrona})
              </a>
            </p>
          )}
          {p.rozwiazanie ? (
            // Informatyka: rozwiązanie z klucza w układzie z klucza (wiersze wyniku, wcięcia pseudokodu).
            <>
              <span className="label">Rozwiązanie CKE</span>
              <pre className={styles.keyCode}>{p.rozwiazanie}</pre>
              {p.zasady && (
                <details>
                  <summary className="small">Zasady oceniania</summary>
                  <p className={`small muted ${styles.keyRules}`}>{p.zasady}</p>
                </details>
              )}
            </>
          ) : p.oczekiwane?.length ? (
            <p>
              <span className="label">Oczekiwana</span> {p.oczekiwane.slice(0, 6).join(" / ")}
            </p>
          ) : p.akceptowane?.length ? (
            // Starsze klucze nie mają odpowiedzi oczekiwanej, tylko przykłady na 1 pkt.
            <p>
              <span className="label">Przykłady na 1 pkt</span> {p.akceptowane.slice(0, 4).join(" / ")}
            </p>
          ) : null}
          {p.opis && <p className="small muted">{p.opis}</p>}
          {p.akceptowane?.length ? (
            <details>
              <summary className="small">Inne akceptowane ({p.akceptowane.length})</summary>
              <p className="small muted">{p.akceptowane.join(" · ")}</p>
            </details>
          ) : null}
        </div>
      )}
      {surowy === "do-oceny" &&
        (p.punkty > 1 ? (
          // Zadanie wielopunktowe: uczeń przyznaje sobie punkty według schematu.
          <div className={styles.selfCheck} role="group" aria-label={`Twoje punkty za ${p.nr}`}>
            {Array.from({ length: p.punkty + 1 }, (_, n) => (
              <button key={n} type="button" className={`btn btn-sm ${n ? "btn-secondary" : "btn-ghost"}`} aria-pressed={postep.samoocena[p.nr] === n} onClick={() => ocen(p.nr, n)}>
                {n} pkt
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.selfCheck}>
            <button type="button" className="btn btn-sm btn-secondary" aria-pressed={postep.samoocena[p.nr] === true} onClick={() => ocen(p.nr, true)}>
              Zaliczam
            </button>
            <button type="button" className="btn btn-sm btn-ghost" aria-pressed={postep.samoocena[p.nr] === false} onClick={() => ocen(p.nr, false)}>
              Nie zaliczam
            </button>
          </div>
        ))}
    </div>
  );
}
