import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AvatarState } from "./TutorAvatar";
import { aiErrorText, AiError, streamAi, type ProsbaPestki } from "../ai";
import { idBiezacej, noweId, ustawBiezaca, wczytajRozmowy, zapiszRozmowe, ZMIANA_ROZMOW, type Rozmowa, type WiadomoscRozmowy } from "../konto/rozmowy";
import { bezEmoji, pokazTekstCzatu, powtarzaTutora, priorytetDozwolony, rozmowa, szkolnePytanie, trudnaSprawa, wytnijPriorytety } from "../pestka";
import { dodajPriorytet, listaPelna, opisProfilu, usunPriorytet } from "../konto/profilUcznia";
import { useUstawienia } from "../konto/ustawienia";
import { glos } from "../pestka/glos";
import { AKCJE, type AkcjaPestki } from "../../../../services/supabase/functions/_shared/pestka-odpowiedz";

/** Priorytet, który Pestka zapisała w profilu ucznia z danej wypowiedzi (tylko na ekranie); cofniete: uczeń go cofnął. */
export type ZapisPriorytetu = { id: string; tekst: string; cofniete?: boolean };
/** zapisane i pelna: informacja pod wypowiedzią Pestki o zapisie w profilu albo o pełnej liście (tylko na ekranie). */
export type Message = WiadomoscRozmowy & { id: number; zapisane?: ZapisPriorytetu[]; pelna?: boolean; wsparcie?: boolean; blad?: boolean };

function doZapisu({ from, text, pestka }: Message): WiadomoscRozmowy {
  return { from, text, ...(pestka && { pestka }) };
}

// Wskazówka tutora przypięta do elementu z atrybutem data-tutor. Lista celów: pierwszy widoczny wygrywa,
// np. linki w pasku na desktopie, a przycisk menu na telefonie.
export type Hint = {
  target: string | string[];
  text: string;
  waitFor?: "summon";
  /** Własne przyciski zamiast „Dalej”; pusta lista: dymek bez przycisków (np. w locie do zadania). */
  actions?: { label: string; onClick: () => void; primary?: boolean }[];
  /** Gdy cel jest poza ekranem (np. strona się przewija), Pestka zostaje, gdzie jest, zamiast wracać do rogu. */
  trzymaj?: boolean;
};

export type Guide = { key: string; kind: "tour" | "hint"; hints: Hint[]; index: number };

/**
 * To, na co uczeń patrzy (zadanie w rundzie albo w arkuszu). klucz: to samo zadanie przed i po sprawdzeniu;
 * opis: tekst dla modelu (przed sprawdzeniem bez klucza odpowiedzi).
 */
export type KontekstPestki = { klucz: string; tytul: string; opis: string; przedmiot?: string; maProbe?: boolean; sokratejski?: boolean; chronOdpowiedz?: boolean };

export type Summon = { x: number; y: number; about: string | null; kontekst?: KontekstPestki | null };

type TutorValue = {
  messages: Message[];
  rozmowy: Rozmowa[];
  biezacaRozmowa: string;
  nowaRozmowa: () => void;
  otworzRozmowe: (id: string) => void;
  state: AvatarState;
  isOpen: boolean;
  /** Z kontekstem (albo z kontekstem strony) innym niż w bieżącej rozmowie zaczyna nową rozmowę o tym zadaniu. */
  open: (kontekst?: KontekstPestki | null) => void;
  /** Strona mówi, na co uczeń teraz patrzy; null, gdy na nic konkretnego. */
  ustawKontekst: (kontekst: KontekstPestki | null) => void;
  /** Tytuł zadania, o którym jest bieżąca rozmowa. */
  tematRozmowy: string | null;
  szkicWiadomosci: string;
  ustawSzkicWiadomosci: (tekst: string) => void;
  close: () => void;
  send: (text: string, przedmiot?: string) => void;
  wykonajAkcje: (akcja: Exclude<AkcjaPestki, "zrodlo">, id: number, przedmiot?: string) => void;
  sprawdzOdwolanie: (fragment: string, temat?: string) => boolean;
  /** Po błędzie modelu wysyła jeszcze raz ostatnie pytanie ucznia, bez dopisywania nowej wiadomości. */
  ponow: () => void;
  /** Przerywa trwającą odpowiedź; to, co Pestka zdążyła napisać, zostaje. */
  zatrzymaj: () => void;
  /** Pytanie z wyszukiwania: zaczyna nową rozmowę i od razu w niej pyta. Nic nie robi, gdy AI nie jest gotowe albo Pestka odpowiada. */
  zapytajWNowej: (text: string) => void;
  /** true: AI podpięte, false: brak, undefined: jeszcze sprawdzamy. */
  aiGotowe: boolean | undefined;
  suggestions: string[];
  /** Cofa priorytet zapisany przez Pestkę z danej wiadomości. */
  cofnijPriorytet: (idWiadomosci: number, idPriorytetu: string) => void;

  guide: Guide | null;
  summon: Summon | null;
  showHints: (key: string, hints: Hint[]) => void;
  startTour: () => void;
  next: () => void;
  dismiss: () => void;
  summonAt: (s: Summon) => void;
  /** Uczeń od kilku minut nic nie robi: Pestka na spoczynku zasypia, budzi ją ruch myszy, dotyk albo klawisz. */
  spi: boolean;
};

const TutorContext = createContext<TutorValue | null>(null);

const SEN_PO = 3 * 60_000;
const ZDARZENIA_AKTYWNOSCI = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;

/**
 * Sen po kilku minutach bez ruchu. Jeden timeout: zdarzenia tylko zapisują chwilę ostatniego ruchu, a timeout po
 * upływie sprawdza, czy naprawdę minęło SEN_PO, i w razie potrzeby nastawia się na resztę czasu.
 */
function useBezczynnosc() {
  const [spi, setSpi] = useState(false);
  const spiRef = useRef(false);
  useEffect(() => {
    let ostatnio = Date.now();
    let timer = 0;
    const sprawdz = () => {
      const minelo = Date.now() - ostatnio;
      if (minelo >= SEN_PO && !document.hidden) {
        spiRef.current = true;
        setSpi(true);
        timer = 0;
      } else timer = window.setTimeout(sprawdz, Math.max(1000, SEN_PO - minelo));
    };
    const ruch = () => {
      ostatnio = Date.now();
      if (spiRef.current) {
        spiRef.current = false;
        setSpi(false);
      }
      if (!timer) timer = window.setTimeout(sprawdz, SEN_PO);
    };
    timer = window.setTimeout(sprawdz, SEN_PO);
    for (const z of ZDARZENIA_AKTYWNOSCI) window.addEventListener(z, ruch, { passive: true, capture: true });
    return () => {
      window.clearTimeout(timer);
      for (const z of ZDARZENIA_AKTYWNOSCI) window.removeEventListener(z, ruch, { capture: true });
    };
  }, []);
  return spi;
}

const TOUR_KEY = "sedno.tour-done";

export function isTourDone(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return tourDoneInMemory;
  }
}

let tourDoneInMemory = false;

function markTourDone(done: boolean) {
  tourDoneInMemory = done;
  try {
    if (done) localStorage.setItem(TOUR_KEY, "1");
    else localStorage.removeItem(TOUR_KEY);
  } catch {
    // zostaje flaga w pamięci
  }
}

export function resetTour() {
  markTourDone(false);
}

// Trzy dymki po diagnozie (albo przy pierwszym wejściu na pulpit): kim jestem, co wybrałam na dziś, jak mnie wołać.
// Bez oprowadzania po interfejsie: menu i widgety mówią same za siebie.
export const tourHints: Hint[] = [
  { target: "hero", text: glos.przewodnik.powitanie },
  { target: "today-cta", text: glos.przewodnik.dzis },
  { target: "hero", text: glos.przewodnik.wolanie },
];

const shownHints = new Set<string>();

// Bez listy przedmiotów: strona Pestki pokazuje je obok, a model i tak dostaje je w kontekście rozmowy.
const greeting: string = glos.rozmowa.powitanie;

// Bez AI Pestka jest na ekranie (przewodnik, gotowe dymki), ale rozmawiać nie może: mówi wprost, czego brakuje.
const noAi: string = glos.rozmowa.bezPolaczenia;

/** przedmioty: opis przedmiotów konta do kontekstu rozmowy, np. „polski (podstawowy), angielski (rozszerzony)”. */
export function TutorProvider({ children, ai: aiStan, przedmioty = "" }: { children: ReactNode; ai?: boolean | undefined; przedmioty?: string }) {
  const ai = aiStan === true;
  const { pestkaSama: sama, pestkaKrotko: krotko } = useUstawienia();
  const samaRef = useRef(sama);
  samaRef.current = sama;
  // Bieżąca rozmowa wraca po odświeżeniu; wcześniejsze można otworzyć (konto/rozmowy.ts).
  const [rozmowy, setRozmowy] = useState<Rozmowa[]>(wczytajRozmowy);
  const [biezacaRozmowa, setBiezacaRozmowa] = useState(() => idBiezacej() ?? noweId());
  const [messages, setMessages] = useState<Message[]>(() => {
    const zapis = wczytajRozmowy().find((r) => r.id === idBiezacej());
    return zapis ? zapis.wiadomosci.map((m, i) => ({ ...m, id: i })) : [{ id: 0, from: "tutor", text: greeting }];
  });
  const [state, setState] = useState<AvatarState>("idle");
  const [isOpen, setOpen] = useState(false);
  const [szkicWiadomosci, ustawSzkicWiadomosci] = useState("");
  const [guide, setGuide] = useState<Guide | null>(null);
  const [summon, setSummon] = useState<Summon | null>(null);
  const nextId = useRef(1000);
  const przerwanie = useRef<AbortController | null>(null);
  const history = useRef<Message[]>([]);
  history.current = messages;
  const stanRef = useRef(state);
  stanRef.current = state;
  const biezacaRef = useRef(biezacaRozmowa);
  biezacaRef.current = biezacaRozmowa;
  // Kontekst strony nie przerysowuje niczego, więc trzymamy go w ref. Rozmowa pamięta, o którym zadaniu jest.
  const kontekstStrony = useRef<KontekstPestki | null>(null);
  const kontekstRozmowy = useRef<KontekstPestki | null>(null);
  const ostatniaProsba = useRef<{ pestka?: ProsbaPestki; akcja?: string; przedmiot?: string }>({});
  const [tematRozmowy, setTematRozmowy] = useState<string | null>(null);

  // Rozmowy z konta (z innego urządzenia) dochodzą po zalogowaniu: lista się odświeża, a otwarta rozmowa
  // bierze wersję z zapisu, żeby kolejna wiadomość nie nadpisała cudzych. W trakcie odpowiedzi nic nie podmieniamy.
  useEffect(() => {
    const odswiez = () => {
      const lista = wczytajRozmowy();
      setRozmowy(lista);
      if (stanRef.current !== "idle") return;
      const zapis = lista.find((r) => r.id === biezacaRef.current);
      if (!zapis) return;
      const naEkranie = JSON.stringify(history.current.filter((m) => !m.blad).map(doZapisu));
      if (naEkranie === JSON.stringify(zapis.wiadomosci)) return;
      setMessages(zapis.wiadomosci.map((m) => ({ ...m, id: nextId.current++ })));
    };
    window.addEventListener(ZMIANA_ROZMOW, odswiez);
    return () => window.removeEventListener(ZMIANA_ROZMOW, odswiez);
  }, []);

  const ustawKontekst = useCallback((k: KontekstPestki | null) => {
    kontekstStrony.current = k;
    // To samo zadanie po sprawdzeniu: rozmowa dostaje pełny opis (z kluczem), ale się nie zmienia.
    if (k && kontekstRozmowy.current?.klucz === k.klucz) kontekstRozmowy.current = k;
  }, []);

  const zacznijRozmowe = useCallback((k: KontekstPestki | null, powitanie = greeting) => {
    const id = noweId();
    biezacaRef.current = id;
    ustawSzkicWiadomosci("");
    kontekstRozmowy.current = k;
    setTematRozmowy(k?.tytul ?? null);
    setBiezacaRozmowa(id);
    ustawBiezaca(id);
    const wiadomosci: Message[] = [{ id: nextId.current++, from: "tutor", text: powitanie }];
    history.current = wiadomosci;
    setMessages(wiadomosci);
    return wiadomosci;
  }, []);

  // Odpowiedź modelu z konta: dopisujemy ją do jednej wiadomości w miarę, jak przychodzi.
  const askModel = useCallback(async (all: Message[], opcje: typeof ostatniaProsba.current = {}) => {
    ostatniaProsba.current = opcje;
    const kontekst = kontekstRozmowy.current ?? kontekstStrony.current;
    const zadanieArkusza = kontekst?.klucz.startsWith("arkusz:")
      ? document.querySelector<HTMLElement>(`[data-tutor-klucz="${CSS.escape(kontekst.klucz)}"]`)
      : null;
    const k = kontekst && zadanieArkusza?.dataset.tutorKontekst ? {
      ...kontekst, opis: zadanieArkusza.dataset.tutorKontekst,
      maProbe: zadanieArkusza.dataset.tutorProba === "tak", chronOdpowiedz: zadanieArkusza.dataset.tutorChron === "tak",
    } : kontekst;
    const id = nextId.current++;
    let started = false;
    // Flagę czytamy przed setMessages: updater wykonuje się dopiero przy renderze.
    const historia = all.filter((m) => !m.blad).map((m) => ({ od: m.from === "tutor" ? ("tutor" as const) : ("uczen" as const), tekst: m.text }));
    const ostatniaUcznia = [...historia].reverse().find((m) => m.od === "uczen")?.tekst ?? "";
    // Stała informacja o wsparciu pod odpowiedzią na taką wiadomość, niezależnie od tego, co napisze model.
    const weryfikacja = opcje.pestka?.tryb === "lektura";
    const wsparcie = !weryfikacja && trudnaSprawa(ostatniaUcznia);
    const write = (text: string, dodatek?: Pick<Message, "zapisane" | "pelna" | "blad" | "pestka">) => {
      const first = !started;
      started = true;
      const pola = { ...dodatek, ...(wsparcie ? { wsparcie: true } : {}) };
      setMessages((m) => (first ? [...m, { id, from: "tutor", text, ...pola }] : m.map((x) => (x.id === id ? { ...x, text, ...pola } : x))));
    };
    let text = "";
    const kontroler = new AbortController();
    przerwanie.current = kontroler;
    try {
      const wynik = await streamAi(
        {
          tier: "lekkie",
          task: weryfikacja ? "pestka-sprawdz-lekture" : "pestka-czat",
          pestka: opcje.pestka ?? ((!wsparcie || szkolnePytanie(ostatniaUcznia)) && !k?.sokratejski ? {
            tryb: "czat", przedmiot: k?.przedmiot ?? opcje.przedmiot,
            rozmowa: biezacaRef.current,
            chronOdpowiedz: k?.chronOdpowiedz,
            maProbe: k?.maProbe || historia.some((m) => m.od === "uczen" && /moja próba|moja odpowiedź|mój wynik|wyszło mi/i.test(m.tekst)),
          } : undefined),
          messages: rozmowa(
            { przedmiot: k?.przedmiot ?? opcje.przedmiot ?? (przedmioty ? `matura: ${przedmioty}` : "matura"), krotko,
              tryb: k?.sokratejski ? "sokratejski" : "pomoc", czat: !weryfikacja, profil: opisProfilu(), listaPelna: listaPelna(),
              zadanie: k?.opis },
            opcje.akcja ? [...historia.slice(0, -1), { od: "uczen", tekst: opcje.akcja }] : historia,
          ),
        },
        (delta) => {
          text += delta;
          if (!started) setState("talking");
          write(weryfikacja ? text : wytnijPriorytety(bezEmoji(pokazTekstCzatu(text))).widoczny);
        },
        kontroler.signal,
      );
      text = wynik.text;
      const numery = wynik.pestka?.zrodla.flatMap((z) => z.twierdzenie?.match(/^\[(\d+)\]/)?.[1] ?? []) ?? [];
      const { widoczny, priorytety } = wytnijPriorytety(bezEmoji(pokazTekstCzatu(text, numery)));
      const pestka = wsparcie ? undefined : wynik.pestka;
      if (wynik.pestka?.sprawdzenie || weryfikacja) {
        write(wynik.pestka?.sprawdzenie ? text : "Sprawdzanie lektur jest chwilowo niedostępne. Spróbuj ponownie.", { pestka, blad: !pestka?.sprawdzenie });
      }
      else if (!widoczny.trim()) write("Zamyśliłam się i nic nie napisałam. Zapytaj jeszcze raz?");
      else if (k?.sokratejski && powtarzaTutora(widoczny, historia)) write("Powtarzam się. Napisz własnymi słowami, co jest dla ciebie niejasne, a wyjaśnię to inaczej.");
      else {
        // Zapis dopiero po całej odpowiedzi i najwyżej jeden na odpowiedź; uczeń zawsze widzi w czacie, co trafiło do profilu.
        // Twarda ochrona obok promptu: priorytet musi wynikać z ostatniej wiadomości ucznia; odrzucony znika po cichu.
        const propozycja = priorytety.find((p) => priorytetDozwolony(p, ostatniaUcznia));
        if (propozycja && listaPelna()) write(widoczny, { pelna: true, pestka });
        else {
          const idP = propozycja ? dodajPriorytet(propozycja, "pestka") : null;
          write(widoczny, { pestka, ...(idP && { zapisane: [{ id: idP, tekst: propozycja!.trim().replace(/\s+/g, " ").slice(0, 120) }] }) });
        }
      }
    } catch (e) {
      // Przerwanie przez ucznia to nie błąd: zostaje częściowy tekst, bez komunikatu.
      if (!kontroler.signal.aborted) write(aiErrorText(e instanceof AiError ? e.code : "server_error"), { blad: true });
    }
    if (przerwanie.current === kontroler) przerwanie.current = null;
    setState("idle");
  }, [przedmioty, krotko]);

  const zatrzymaj = useCallback(() => przerwanie.current?.abort(), []);

  const cofnijPriorytet = useCallback((idWiadomosci: number, idPriorytetu: string) => {
    usunPriorytet(idPriorytetu);
    setMessages((m) => m.map((x) => (x.id === idWiadomosci ? { ...x, zapisane: x.zapisane?.map((z) => (z.id === idPriorytetu ? { ...z, cofniete: true } : z)) } : x)));
  }, []);

  const wyslij = useCallback((text: string, opcje: typeof ostatniaProsba.current) => {
    const clean = text.trim();
    // Jedna odpowiedź naraz: także w trakcie strumienia („talking”), inaczej druga trafiłaby do innej rozmowy.
    if (!clean || stanRef.current !== "idle") return;
    stanRef.current = "thinking";
    const student: Message = { id: nextId.current++, from: "student", text: clean };
    setMessages((m) => [...m, student]);
    setState("thinking");

    if (ai) {
      void askModel([...history.current, student], opcje);
      return;
    }

    window.setTimeout(() => {
      setMessages((m) => [...m, { id: nextId.current++, from: "tutor", text: noAi }]);
      setState("idle");
    }, 500);
  }, [ai, askModel]);

  const send = useCallback((text: string, przedmiot?: string) => wyslij(text, { przedmiot }), [wyslij]);

  const wykonajAkcje = useCallback((akcja: Exclude<AkcjaPestki, "zrodlo">, id: number, przedmiot?: string) => {
    const lista = history.current;
    const indeks = lista.findIndex((m) => m.id === id && m.pestka?.akcje?.includes(akcja));
    if (indeks < 1) return;
    const pytanie = lista.slice(0, indeks).reverse().find((m) => m.from === "student")?.text ?? "";
    const akcjaZKontekstem = `${AKCJE[akcja]}. Odnieś się do bieżącego zadania i tej wymiany:\nProśba ucznia: ${pytanie}\nOdpowiedź: ${lista[indeks].text}`;
    wyslij(AKCJE[akcja], { przedmiot, akcja: akcjaZKontekstem });
  }, [wyslij]);

  const sprawdzOdwolanie = useCallback((fragment: string, temat?: string) => {
    if (!ai || stanRef.current !== "idle") return false;
    const start = zacznijRozmowe({ klucz: "sprawdzenie-lektury", tytul: "sprawdzanie odwołania do lektury", opis: "", przedmiot: "polski" });
    const wpis: Message = { id: nextId.current++, from: "student", text: `Sprawdź odwołanie do lektury\n\n${fragment}` };
    setMessages([...start, wpis]);
    stanRef.current = "thinking";
    setState("thinking");
    setGuide(null);
    setSummon(null);
    setOpen(true);
    void askModel([...start, wpis], { pestka: { tryb: "lektura", fragment, temat } });
    return true;
  }, [ai, askModel, zacznijRozmowe]);

  const ponow = useCallback(() => {
    if (!ai || stanRef.current !== "idle") return;
    const bez = history.current.filter((m) => !m.blad);
    if (bez[bez.length - 1]?.from !== "student") return;
    stanRef.current = "thinking";
    setMessages(bez);
    setState("thinking");
    void askModel(bez, ostatniaProsba.current);
  }, [ai, askModel]);

  // Historię dla modelu budujemy tu wprost (powitanie + pytanie), bez odwoływania się do poprzedniej rozmowy.
  const zapytajWNowej = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || !ai || stanRef.current !== "idle") return;
      const wiadomosci: Message[] = [...zacznijRozmowe(null), { id: nextId.current++, from: "student", text: clean }];
      history.current = wiadomosci;
      stanRef.current = "thinking";
      setMessages(wiadomosci);
      setState("thinking");
      void askModel(wiadomosci);
    },
    [ai, askModel, zacznijRozmowe],
  );

  // „Na wezwanie”: wskazówki, o które uczeń nie prosił (pulpit, zegar), nie wyskakują same.
  // Przepuszczamy te z jego kliknięcia: „Co dziś robić?” (ask-), omówienie arkusza (omow) i ostrzeżenia zegara (zegar-), który uczeń sam włączył.
  const showHints = useCallback((key: string, hints: Hint[]) => {
    if (!samaRef.current && !key.startsWith("ask-") && !key.startsWith("omow") && !key.startsWith("zegar-")) return;
    if (shownHints.has(key) || hints.length === 0) return;
    shownHints.add(key);
    setSummon(null);
    setGuide({ key, kind: "hint", hints, index: 0 });
  }, []);

  const startTour = useCallback(() => {
    setSummon(null);
    setGuide({ key: "tour", kind: "tour", hints: tourHints, index: 0 });
  }, []);

  const next = useCallback(() => {
    setGuide((g) => {
      if (!g) return g;
      if (g.index + 1 >= g.hints.length) {
        if (g.kind === "tour") markTourDone(true);
        return null;
      }
      return { ...g, index: g.index + 1 };
    });
  }, []);

  // Zamknięcie przewodnika krzyżykiem też liczy się jako jego zakończenie, żeby nie wracał przy każdym wejściu.
  const dismiss = useCallback(() => {
    if (guide?.kind === "tour") markTourDone(true);
    setSummon(null);
    setGuide(null);
  }, [guide]);

  // Przywołanie zastępuje bieżącą wskazówkę. Krok przewodnika, który o nie prosi, przechodzi wtedy do puenty.
  const summonAt = useCallback(
    (s: Summon) => {
      if (guide?.kind === "tour" && guide.hints[guide.index]?.waitFor === "summon") {
        markTourDone(true);
        setSummon(null);
        setGuide({ ...guide, index: guide.index + 1 });
        return;
      }
      setGuide(null);
      setSummon(s);
    },
    [guide],
  );

  // Zapis po każdej zmianie, poza strumieniem odpowiedzi (wtedy na koniec, gdy Pestka skończy).
  useEffect(() => {
    if (state === "talking" || state === "thinking") return;
    ustawBiezaca(biezacaRozmowa);
    setRozmowy(zapiszRozmowe(biezacaRozmowa, messages.filter((m) => !m.blad).map(doZapisu)));
  }, [messages, state, biezacaRozmowa]);

  const nowaRozmowa = useCallback(() => {
    if (stanRef.current !== "idle") return;
    zacznijRozmowe(null);
  }, [zacznijRozmowe]);

  const otworzRozmowe = useCallback((id: string) => {
    if (stanRef.current !== "idle" || biezacaRef.current === id) return;
    const r = wczytajRozmowy().find((x) => x.id === id);
    if (!r) return;
    biezacaRef.current = id;
    ustawSzkicWiadomosci("");
    kontekstRozmowy.current = null;
    setTematRozmowy(null);
    setBiezacaRozmowa(id);
    ustawBiezaca(id);
    setMessages(r.wiadomosci.map((m) => ({ ...m, id: nextId.current++ })));
  }, []);

  // Otwarcie przy zadaniu zaczyna rozmowę o nim, zamiast pokazywać poprzednią, niezwiązaną.
  const open = useCallback((kontekst?: KontekstPestki | null) => {
    const k = kontekst ?? kontekstStrony.current;
    if (k && k.klucz !== kontekstRozmowy.current?.klucz && stanRef.current === "idle") {
      zacznijRozmowe(k, `Patrzę razem z tobą: ${k.tytul}. O co chcesz zapytać?`);
    } else if (k && k.klucz === kontekstRozmowy.current?.klucz) kontekstRozmowy.current = k;
    setGuide(null);
    setSummon(null);
    setOpen(true);
  }, [zacznijRozmowe]);

  const spi = useBezczynnosc();

  const value = useMemo<TutorValue>(
    () => ({
      messages,
      rozmowy,
      biezacaRozmowa,
      nowaRozmowa,
      otworzRozmowe,
      state,
      isOpen,
      open,
      ustawKontekst,
      tematRozmowy,
      szkicWiadomosci,
      ustawSzkicWiadomosci,
      close: () => setOpen(false),
      send,
      wykonajAkcje,
      sprawdzOdwolanie,
      ponow,
      zatrzymaj,
      zapytajWNowej,
      aiGotowe: aiStan,
      cofnijPriorytet,
      suggestions:
        messages[messages.length - 1]?.blad
          ? []
          : messages.length <= 1
          ? ["Co powtórzyć przed maturą?", "Wyjaśnij mi zadanie", "Sprawdź, czy rozumiem temat"]
          : [],
      guide,
      summon,
      showHints,
      startTour,
      next,
      dismiss,
      summonAt,
      spi,
    }),
    [spi, messages, rozmowy, biezacaRozmowa, nowaRozmowa, otworzRozmowe, state, isOpen, open, ustawKontekst, tematRozmowy, szkicWiadomosci, send, wykonajAkcje, sprawdzOdwolanie, ponow, zatrzymaj, zapytajWNowej, aiStan, cofnijPriorytet, guide, summon, showHints, startTour, next, dismiss, summonAt],
  );

  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export function useTutor(): TutorValue {
  const ctx = useContext(TutorContext);
  if (!ctx) throw new Error("useTutor poza TutorProvider");
  return ctx;
}

/** Strona zgłasza, na co uczeń patrzy; po odejściu ze strony kontekst znika. */
export function useKontekstPestki(kontekst: KontekstPestki | null) {
  const { ustawKontekst } = useContext(TutorContext) ?? {};
  const klucz = kontekst ? JSON.stringify(kontekst) : null;
  useEffect(() => {
    if (!ustawKontekst) return;
    ustawKontekst(kontekst);
    return () => ustawKontekst(null);
    // Kontekst porównujemy po treści, nie po tożsamości obiektu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ustawKontekst, klucz]);
}
