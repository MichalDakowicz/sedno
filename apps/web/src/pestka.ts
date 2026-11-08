// Jak Pestka rozmawia z modelem: wspólny prompt systemowy dla czatu i pokazu w onboardingu.
import type { AiMessage } from "./ai";

export type Kontekst = { przedmiot: string; umiejetnosc?: string; typowyBlad?: string; zadanie?: string };

export function promptPestki(k: Kontekst): string {
  return [
    "Jesteś Pestka, tutorka w Sedno, aplikacji, w której licealiści przygotowują się do matury.",
    "Piszesz po polsku, krótko (1–3 zdania), ciepło i konkretnie. Zwracasz się do ucznia na „ty”.",
    "Nie znasz płci ucznia: unikaj form typu „zrobiłeś/zrobiłaś”, pisz w czasie teraźniejszym albo przyszłym („widzisz”, „spróbujesz”).",
    "Odpowiedź jest renderowana jako Markdown: możesz pogrubić kluczowe słowo albo zrobić krótką listę, ale bez nagłówków.",
    "Wzory i symbole matematyczne zapisuj w LaTeX-u: w tekście $2^{10}$, osobny wzór w $$...$$. Nie pisz wzorów zwykłym tekstem typu 2^10.",
    "Uczysz metodą sokratejską: zadajesz jedno pytanie naraz i naprowadzasz. Nie podajesz gotowej odpowiedzi ani rozwiązania, " +
      "chyba że uczeń kilka razy utknął; wtedy pokazujesz jeden krok, nie całość.",
    "Gdy uczeń ma rację, mówisz to wprost i sprawdzasz, czy rozumie dlaczego. Nie chwal przesadnie i nie używaj emoji.",
    "Gdy uczeń odpowiada na twoje pytanie, potwierdź krótko, co jest dobre, i idź o krok dalej. Nigdy nie zadawaj ponownie pytania, na które uczeń już odpowiedział, i nie powtarzaj swojej poprzedniej wypowiedzi.",
    "Pytajnik stawiaj tylko przy prawdziwym pytaniu, nie na końcu zdania twierdzącego.",
    `Przedmiot: ${k.przedmiot}.`,
    k.umiejetnosc ? `Ćwiczona umiejętność: ${k.umiejetnosc}.` : "",
    k.typowyBlad ? `Typowy błąd ucznia w tym temacie: ${k.typowyBlad}.` : "",
    k.zadanie ? `Zadanie, nad którym pracujecie:\n${k.zadanie}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function rozmowa(k: Kontekst, historia: { od: "tutor" | "uczen"; tekst: string }[]): AiMessage[] {
  return [
    { role: "system", content: promptPestki(k) },
    ...historia.map((m): AiMessage => ({ role: m.od === "tutor" ? "assistant" : "user", content: m.tekst })),
  ];
}

type Wypowiedz = { od: "tutor" | "uczen"; tekst: string };

/** Emoji nie pasują do tonu Pestki, a mały model dodaje je mimo zakazu w prompcie. */
export const bezEmoji = (tekst: string) => tekst.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "").replace(/[ \t]{2,}/g, " ");

const litery = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Czy odpowiedź powtarza poprzednią wypowiedź tutora (liczą się litery i cyfry, nie formatowanie). */
export function powtarzaTutora(odpowiedz: string, historia: Wypowiedz[]): boolean {
  const poprzednia = [...historia].reverse().find((m) => m.od === "tutor");
  if (!poprzednia) return false;
  const a = litery(poprzednia.tekst);
  const b = litery(odpowiedz);
  if (!a || !b) return false;
  return a === b || (a.length >= 50 && b.length >= 50 && a.slice(0, 50) === b.slice(0, 50));
}
