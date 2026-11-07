import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { AvatarState } from "./TutorAvatar";
import { topPick } from "../data/demo";
import { aiErrorText, AiError, streamAi } from "../ai";
import { rozmowa } from "../pestka";

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
    target: "reviews",
    text: "Przypominam też o powtórkach, zanim coś zacznie ci uciekać.",
  },
  {
    target: "hero",
    text: "Każdy dymek zamkniesz krzyżykiem. A gdy będę potrzebny, kliknij prawym przyciskiem w dowolnym miejscu (na telefonie przytrzymaj palec). Spróbuj teraz.",
    waitFor: "summon",
  },
];

const shownHints = new Set<string>();

function greeting() {
  const s = topPick();
  return (
    `Cześć, tu Pestka! Widzę, że ${s.recommendation.skill.toLowerCase()} (${s.name.toLowerCase()}) to dziś twój najsłabszy punkt. ` +
    "Zanim cokolwiek wyjaśnię: jak myślisz, skąd biorą się twoje błędy w tym temacie?"
  );
}

// Sokratejskie odpowiedzi na sztywno dla konta bez AI (Pestka i tak pojawia się dopiero po podpięciu AI).
const scripted = [
  "Dobry trop. A co się dzieje z czasem gramatycznym, gdy przechodzisz od przykładu do wniosku? Spójrz na swoje ostatnie zakończenie.",
  "Właśnie. Masz tam present simple w tezie i nagle past simple we wniosku. Jak przeredagowałabyś to jedno zdanie, żeby czas był spójny?",
  "Brzmi spójnie. Sprawdźmy to na nowym przykładzie: krótki mini-test, 3 zdania, ok. 2 minuty. Gotowa?",
];

const fallback = "Dobrze. Pokażę ci to na zadaniu, zamiast tłumaczyć regułę. Otwórz „Napraw błąd” z pulpitu, a ja będę obok.";

export function TutorProvider({ children, ai = false }: { children: ReactNode; ai?: boolean }) {
  const [messages, setMessages] = useState<Message[]>(() => [{ id: 0, from: "tutor", text: greeting() }]);
  const [state, setState] = useState<AvatarState>("idle");
  const [isOpen, setOpen] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [summon, setSummon] = useState<Summon | null>(null);
  const turn = useRef(0);
  const nextId = useRef(1);
  const history = useRef<Message[]>([]);
  history.current = messages;

  // Odpowiedź modelu z konta: dopisujemy ją do jednej wiadomości w miarę, jak przychodzi.
  const askModel = useCallback(async (all: Message[]) => {
    const pick = topPick();
    const skill = pick.skills.find((k) => k.name === pick.recommendation.skill);
    const id = nextId.current++;
    let started = false;
    // Flagę czytamy przed setMessages: updater wykonuje się dopiero przy renderze.
    const write = (text: string) => {
      const first = !started;
      started = true;
      setMessages((m) => (first ? [...m, { id, from: "tutor", text }] : m.map((x) => (x.id === id ? { ...x, text } : x))));
    };
    let text = "";
    try {
      await streamAi(
        {
          tier: "lekkie",
          task: "pestka-czat",
          maxTokens: 1500,
          messages: rozmowa(
            { przedmiot: pick.name, umiejetnosc: pick.recommendation.skill, typowyBlad: skill?.note },
            all.map((m) => ({ od: m.from === "tutor" ? "tutor" : "uczen", tekst: m.text })),
          ),
        },
        (delta) => {
          text += delta;
          if (!started) setState("talking");
          write(text);
        },
      );
      if (!text.trim()) write("Zamyśliłam się i nic nie napisałam. Zapytaj jeszcze raz?");
    } catch (e) {
      write(aiErrorText(e instanceof AiError ? e.code : "server_error"));
    }
    setState("idle");
  }, []);

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

    const reply = scripted[turn.current] ?? fallback;
    turn.current += 1;

    window.setTimeout(() => {
      setState("talking");
      setMessages((m) => [...m, { id: nextId.current++, from: "tutor", text: reply }]);
      window.setTimeout(() => setState("idle"), Math.min(2400, reply.length * 22));
    }, 900);
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

  const open = useCallback(() => {
    setGuide(null);
    setSummon(null);
    setOpen(true);
  }, []);

  const value = useMemo<TutorValue>(
    () => ({
      messages,
      state,
      isOpen,
      open,
      close: () => setOpen(false),
      send,
      suggestions:
        messages.length <= 1
          ? ["Nie wiem, podpowiedz", "Pokaż mi przykład", "Chyba z pośpiechu"]
          : ["Spróbuję przeredagować", "Daj wskazówkę", "Gotowa"],
      guide,
      summon,
      showHints,
      startTour,
      next,
      dismiss,
      summonAt,
    }),
    [messages, state, isOpen, open, send, guide, summon, showHints, startTour, next, dismiss, summonAt],
  );

  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export function useTutor(): TutorValue {
  const ctx = useContext(TutorContext);
  if (!ctx) throw new Error("useTutor poza TutorProvider");
  return ctx;
}
