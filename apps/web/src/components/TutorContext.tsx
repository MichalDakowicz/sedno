import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AvatarState } from "./TutorAvatar";
import { aiErrorText, AiError, streamAi } from "../ai";
import { idBiezacej, noweId, ustawBiezaca, wczytajRozmowy, zapiszRozmowe, type Rozmowa } from "../konto/rozmowy";
import { bezEmoji, powtarzaTutora, rozmowa } from "../pestka";

export type Message = { id: number; from: "tutor" | "student"; text: string };

// Wskazówka tutora przypięta do elementu z atrybutem data-tutor. Lista celów: pierwszy widoczny wygrywa,
// np. linki w pasku na desktopie, a przycisk menu na telefonie.
export type Hint = {
  target: string | string[];
  text: string;
  waitFor?: "summon";
};

export type Guide = { key: string; kind: "tour" | "hint"; hints: Hint[]; index: number };

export type Summon = { x: number; y: number; about: string | null };

type TutorValue = {
  messages: Message[];
  rozmowy: Rozmowa[];
  biezacaRozmowa: string;
  nowaRozmowa: () => void;
  otworzRozmowe: (id: string) => void;
  state: AvatarState;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  send: (text: string) => void;
  suggestions: string[];

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
    text: "Cześć, jestem Pestka, twój tutor. Nie mam stałego miejsca: pojawiam się tam, gdzie mam ci coś do powiedzenia. Pokażę ci, jak tu działam.",
  },
  {
    target: ["nav-links", "nav-menu"],
    text: "Tu przechodzisz między sekcjami: nauka, arkusze, mapa umiejętności i powtórki.",
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
    text: "Każdy dymek zamkniesz krzyżykiem. A gdy będę potrzebny, kliknij prawym przyciskiem w dowolnym miejscu (na telefonie przytrzymaj palec). Spróbuj teraz.",
    waitFor: "summon",
  },
];

const shownHints = new Set<string>();

// Bez listy przedmiotów: strona Pestki pokazuje je obok, a model i tak dostaje je w kontekście rozmowy.
const greeting = "Cześć, jestem Pestka. Wklej zadanie albo napisz, z czym masz kłopot, a przejdziemy przez to razem.";

// Bez AI na koncie Pestki nie ma w aplikacji; gdyby rozmowa jednak ruszyła, mówi wprost, czego brakuje.
const noAi = "Żeby odpowiadać, potrzebuję AI podpiętego do konta. Zrobisz to w profilu, w sekcji „AI na koncie”.";

/** przedmioty: opis przedmiotów konta do kontekstu rozmowy, np. „polski (podstawowy), angielski (rozszerzony)”. */
export function TutorProvider({ children, ai = false, przedmioty = "" }: { children: ReactNode; ai?: boolean; przedmioty?: string }) {
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

  // Odpowiedź modelu z konta: dopisujemy ją do jednej wiadomości w miarę, jak przychodzi.
  const askModel = useCallback(async (all: Message[]) => {
    const id = nextId.current++;
    let started = false;
    // Flagę czytamy przed setMessages: updater wykonuje się dopiero przy renderze.
    const write = (text: string) => {
      const first = !started;
      started = true;
      setMessages((m) => (first ? [...m, { id, from: "tutor", text }] : m.map((x) => (x.id === id ? { ...x, text } : x))));
    };
    let text = "";
    const historia = all.map((m) => ({ od: m.from === "tutor" ? ("tutor" as const) : ("uczen" as const), tekst: m.text }));
    try {
      await streamAi(
        {
          tier: "lekkie",
          task: "pestka-czat",
          messages: rozmowa({ przedmiot: przedmioty ? `matura: ${przedmioty}` : "matura" }, historia),
        },
        (delta) => {
          text += delta;
          if (!started) setState("talking");
          write(bezEmoji(text));
        },
      );
      if (!text.trim()) write("Zamyśliłam się i nic nie napisałam. Zapytaj jeszcze raz?");
      else if (powtarzaTutora(bezEmoji(text), historia)) write("Powtarzam się. Napisz własnymi słowami, co jest dla ciebie niejasne, a wyjaśnię to inaczej.");
    } catch (e) {
      write(aiErrorText(e instanceof AiError ? e.code : "server_error"));
    }
    setState("idle");
  }, [przedmioty]);

  const send = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;
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

  const showHints = useCallback((key: string, hints: Hint[]) => {
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

  // Przywołanie zastępuje bieżącą wskazówkę. Ostatni krok przewodnika właśnie o nie prosi, więc wtedy go kończy.
  const summonAt = useCallback(
    (s: Summon) => {
      if (guide?.kind === "tour" && guide.hints[guide.index]?.waitFor === "summon") markTourDone(true);
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
    const id = noweId();
    setBiezacaRozmowa(id);
    ustawBiezaca(id);
    setMessages([{ id: nextId.current++, from: "tutor", text: greeting }]);
  }, []);

  const otworzRozmowe = useCallback((id: string) => {
    const r = wczytajRozmowy().find((x) => x.id === id);
    if (!r) return;
    setBiezacaRozmowa(id);
    ustawBiezaca(id);
    setMessages(r.wiadomosci.map((m) => ({ id: nextId.current++, from: m.from, text: m.text })));
  }, []);

  const open = useCallback(() => {
    setGuide(null);
    setSummon(null);
    setOpen(true);
  }, []);

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
      close: () => setOpen(false),
      send,
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
    [messages, rozmowy, biezacaRozmowa, nowaRozmowa, otworzRozmowe, state, isOpen, open, send, guide, summon, showHints, startTour, next, dismiss, summonAt],
  );

  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export function useTutor(): TutorValue {
  const ctx = useContext(TutorContext);
  if (!ctx) throw new Error("useTutor poza TutorProvider");
  return ctx;
}
