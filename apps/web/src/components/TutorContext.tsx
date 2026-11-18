import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AvatarState } from "./TutorAvatar";
import { aiErrorText, AiError, streamAi } from "../ai";
import { idBiezacej, noweId, ustawBiezaca, wczytajRozmowy, zapiszRozmowe, ZMIANA_ROZMOW, type Rozmowa } from "../konto/rozmowy";
import { bezEmoji, powtarzaTutora, priorytetDozwolony, rozmowa, trudnaSprawa, wytnijPriorytety } from "../pestka";
import { dodajPriorytet, listaPelna, opisProfilu, usunPriorytet } from "../konto/profilUcznia";
import { useUstawienia } from "../konto/ustawienia";

/** Priorytet, który Pestka zapisała w profilu ucznia z danej wypowiedzi (tylko na ekranie); cofniete: uczeń go cofnął. */
export type ZapisPriorytetu = { id: string; tekst: string; cofniete?: boolean };
/** zapisane i pelna: informacja pod wypowiedzią Pestki o zapisie w profilu albo o pełnej liście (tylko na ekranie). */
export type Message = { id: number; from: "tutor" | "student"; text: string; zapisane?: ZapisPriorytetu[]; pelna?: boolean; wsparcie?: boolean };

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
export type KontekstPestki = { klucz: string; tytul: string; opis: string };

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
  close: () => void;
  send: (text: string) => void;
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
};

const TutorContext = createContext<TutorValue | null>(null);

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

export const tourHints: Hint[] = [
  {
    target: "hero",
    text: "Cześć, jestem Pestka, twoja tutorka. Nie mam stałego miejsca: pojawiam się tam, gdzie mam ci coś do powiedzenia. Pokażę ci, jak tu działam.",
  },
  {
    target: ["nav-links", "nav-menu"],
    text: "Tu przechodzisz między pulpitem, nauką i arkuszami. Mapa umiejętności i powtórki są w Nauce.",
  },
  {
    target: "subjects",
    text: "To twoje przedmioty. Pulpit pokazuje wszystko naraz, a kliknięcie przedmiotu zawęża go tylko do niego.",
  },
  {
    target: "today-cta",
    text: "Tak wyglądają moje sugestie: przychodzę do przycisku, który polecam, i mówię dlaczego. Ty decydujesz, czy w niego klikasz.",
  },
  {
    target: "results",
    text: "Tu widzisz wyniki z arkuszy. Z nich wybieram, co polecić na dziś.",
  },
  {
    target: "hero",
    text: "Każdy dymek zamkniesz krzyżykiem. A gdy będę potrzebna, kliknij prawym przyciskiem w dowolnym miejscu (na telefonie przytrzymaj palec). Spróbuj teraz.",
    waitFor: "summon",
  },
  {
    target: "today-cta",
    text: "Właśnie tak. To tyle. Zacznij od tego przycisku.",
  },
];

const shownHints = new Set<string>();

// Bez listy przedmiotów: strona Pestki pokazuje je obok, a model i tak dostaje je w kontekście rozmowy.
const greeting = "Cześć, jestem Pestka. Wklej zadanie albo napisz, z czym masz kłopot, a przejdziemy przez to razem.";

// Bez AI Pestka jest na ekranie (przewodnik, gotowe dymki), ale rozmawiać nie może: mówi wprost, czego brakuje.
const noAi = "Żeby odpowiadać, potrzebuję AI podpiętego do konta. Zrobisz to w profilu, w sekcji „AI na koncie”.";

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
    return zapis ? zapis.wiadomosci.map((m, i) => ({ id: i, from: m.from, text: m.text })) : [{ id: 0, from: "tutor", text: greeting }];
  });
  const [state, setState] = useState<AvatarState>("idle");
  const [isOpen, setOpen] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [summon, setSummon] = useState<Summon | null>(null);
  const nextId = useRef(1000);
  const history = useRef<Message[]>([]);
  history.current = messages;
  const stanRef = useRef(state);
  stanRef.current = state;
  const biezacaRef = useRef(biezacaRozmowa);
  biezacaRef.current = biezacaRozmowa;
  // Kontekst strony nie przerysowuje niczego, więc trzymamy go w ref. Rozmowa pamięta, o którym zadaniu jest.
  const kontekstStrony = useRef<KontekstPestki | null>(null);
  const kontekstRozmowy = useRef<KontekstPestki | null>(null);
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
      const naEkranie = JSON.stringify(history.current.map((m) => ({ from: m.from, text: m.text })));
      if (naEkranie === JSON.stringify(zapis.wiadomosci)) return;
      setMessages(zapis.wiadomosci.map((m) => ({ id: nextId.current++, from: m.from, text: m.text })));
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
  const askModel = useCallback(async (all: Message[]) => {
    const id = nextId.current++;
    let started = false;
    // Flagę czytamy przed setMessages: updater wykonuje się dopiero przy renderze.
    const historia = all.map((m) => ({ od: m.from === "tutor" ? ("tutor" as const) : ("uczen" as const), tekst: m.text }));
    const ostatniaUcznia = [...historia].reverse().find((m) => m.od === "uczen")?.tekst ?? "";
    // Stała informacja o wsparciu pod odpowiedzią na taką wiadomość, niezależnie od tego, co napisze model.
    const wsparcie = trudnaSprawa(ostatniaUcznia);
    const write = (text: string, dodatek?: Pick<Message, "zapisane" | "pelna">) => {
      const first = !started;
      started = true;
      const pola = { ...dodatek, ...(wsparcie ? { wsparcie: true } : {}) };
      setMessages((m) => (first ? [...m, { id, from: "tutor", text, ...pola }] : m.map((x) => (x.id === id ? { ...x, text, ...pola } : x))));
    };
    let text = "";
    try {
      await streamAi(
        {
          tier: "lekkie",
          task: "pestka-czat",
          messages: rozmowa(
            { przedmiot: przedmioty ? `matura: ${przedmioty}` : "matura", krotko, czat: true, profil: opisProfilu(), listaPelna: listaPelna(), zadanie: kontekstRozmowy.current?.opis },
            historia,
          ),
        },
        (delta) => {
          text += delta;
          if (!started) setState("talking");
          write(wytnijPriorytety(bezEmoji(text)).widoczny);
        },
      );
      const { widoczny, priorytety } = wytnijPriorytety(bezEmoji(text));
      if (!widoczny.trim()) write("Zamyśliłam się i nic nie napisałam. Zapytaj jeszcze raz?");
      else if (powtarzaTutora(widoczny, historia)) write("Powtarzam się. Napisz własnymi słowami, co jest dla ciebie niejasne, a wyjaśnię to inaczej.");
      else {
        // Zapis dopiero po całej odpowiedzi i najwyżej jeden na odpowiedź; uczeń zawsze widzi w czacie, co trafiło do profilu.
        // Twarda ochrona obok promptu: priorytet musi wynikać z ostatniej wiadomości ucznia; odrzucony znika po cichu.
        const propozycja = priorytety.find((p) => priorytetDozwolony(p, ostatniaUcznia));
        if (propozycja && listaPelna()) write(widoczny, { pelna: true });
        else {
          const idP = propozycja ? dodajPriorytet(propozycja, "pestka") : null;
          write(widoczny, idP ? { zapisane: [{ id: idP, tekst: propozycja!.trim().replace(/\s+/g, " ").slice(0, 120) }] } : undefined);
        }
      }
    } catch (e) {
      write(aiErrorText(e instanceof AiError ? e.code : "server_error"));
    }
    setState("idle");
  }, [przedmioty, krotko]);

  const cofnijPriorytet = useCallback((idWiadomosci: number, idPriorytetu: string) => {
    usunPriorytet(idPriorytetu);
    setMessages((m) => m.map((x) => (x.id === idWiadomosci ? { ...x, zapisane: x.zapisane?.map((z) => (z.id === idPriorytetu ? { ...z, cofniete: true } : z)) } : x)));
  }, []);

  const send = useCallback((text: string) => {
    const clean = text.trim();
    // Jedna odpowiedź naraz: także w trakcie strumienia („talking”), inaczej druga trafiłaby do innej rozmowy.
    if (!clean || stanRef.current !== "idle") return;
    stanRef.current = "thinking";
    const student: Message = { id: nextId.current++, from: "student", text: clean };
    setMessages((m) => [...m, student]);
    setState("thinking");

    if (ai) {
      void askModel([...history.current, student]);
      return;
    }

    window.setTimeout(() => {
      setMessages((m) => [...m, { id: nextId.current++, from: "tutor", text: noAi }]);
      setState("idle");
    }, 500);
  }, [ai, askModel]);

  // Historię dla modelu budujemy tu wprost (powitanie + pytanie), bez odwoływania się do poprzedniej rozmowy.
  const zapytajWNowej = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || !ai || stanRef.current !== "idle") return;
      const wiadomosci: Message[] = [...zacznijRozmowe(null), { id: nextId.current++, from: "student", text: clean }];
      history.current = wiadomosci;
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
    setRozmowy(zapiszRozmowe(biezacaRozmowa, messages.map((m) => ({ from: m.from, text: m.text }))));
  }, [messages, state, biezacaRozmowa]);

  const nowaRozmowa = useCallback(() => {
    if (stanRef.current !== "idle") return;
    zacznijRozmowe(null);
  }, [zacznijRozmowe]);

  const otworzRozmowe = useCallback((id: string) => {
    if (stanRef.current !== "idle") return;
    const r = wczytajRozmowy().find((x) => x.id === id);
    if (!r) return;
    kontekstRozmowy.current = null;
    setTematRozmowy(null);
    setBiezacaRozmowa(id);
    ustawBiezaca(id);
    setMessages(r.wiadomosci.map((m) => ({ id: nextId.current++, from: m.from, text: m.text })));
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
      close: () => setOpen(false),
      send,
      zapytajWNowej,
      aiGotowe: aiStan,
      cofnijPriorytet,
      suggestions:
        messages.length <= 1
          ? ["Co powtórzyć przed maturą?", "Wyjaśnij mi zadanie", "Sprawdź, czy rozumiem temat"]
          : ["Daj wskazówkę", "Pokaż przykład", "Spróbuję jeszcze raz"],
      guide,
      summon,
      showHints,
      startTour,
      next,
      dismiss,
      summonAt,
    }),
    [messages, rozmowy, biezacaRozmowa, nowaRozmowa, otworzRozmowe, state, isOpen, open, ustawKontekst, tematRozmowy, send, zapytajWNowej, aiStan, cofnijPriorytet, guide, summon, showHints, startTour, next, dismiss, summonAt],
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
  const klucz = kontekst ? `${kontekst.klucz}\n${kontekst.opis}` : null;
  useEffect(() => {
    if (!ustawKontekst) return;
    ustawKontekst(kontekst);
    return () => ustawKontekst(null);
    // Kontekst porównujemy po treści, nie po tożsamości obiektu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ustawKontekst, klucz]);
}
