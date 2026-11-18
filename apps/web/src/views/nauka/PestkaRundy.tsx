// Pestka w rundzie: krótka reakcja przy werdykcie i przy rozbiorze. Stoi w treści strony, obok werdyktu,
// więc nie zasłania opcji ani przycisków i nie zabiera fokusu. Teksty są gotowe (bez AI), więc działa
// także na koncie bez podpiętego modelu.
import { useEffect, useState, type ReactNode } from "react";
import { useArkusz } from "../../arkusze/dane";
import { kontekstZadania } from "../../arkusze/omowienie";
import { nazwaZadaniaCke } from "../../arkusze/typy";
import { TutorAvatar } from "../../components/TutorAvatar";
import { useKontekstPestki } from "../../components/TutorContext";
import type { OdpowiedzNauki, PolecenieNauki } from "../../nauka/api";
import { nazwaOdpowiedzi } from "./sesjaRundy";
import s from "./SzybkaRunda.module.css";

// Losowy początek na kartę, a dalej kolejne pozycje listy: teksty się zmieniają, ale nie powtarzają co chwilę.
const przesuniecie = Math.floor(Math.random() * 100);
export const wybierz = (lista: readonly string[], n: number) => lista[(n + przesuniecie) % lista.length]!;

export const tekstyPestki = {
  dobrze: ["Dobrze.", "Zgadza się.", "Tak, to ta.", "Trafione.", "Dokładnie tak."],
  seria: ["Dobrze. To już {n} z rzędu.", "{n} dobre z rzędu.", "Zgadza się. {n} z rzędu, tak trzymaj."],
  zle: ["Tym razem nie. Wyjaśnić?", "To nie ta. Wyjaśnić, dlaczego?", "Nie tym razem. Mogę pokazać, gdzie jest haczyk."],
  zleBezWyjasnienia: ["Tym razem nie. Zerknij na wyjaśnienie.", "To nie ta. Wyjaśnienie jest pod spodem."],
  pominiete: ["Pominięte. Poprawną odpowiedź widać na zielono.", "Bez odpowiedzi. Zerknij, która była dobra."],
  zwolnij: ["Zwolnijmy. Przy następnym weź podpowiedź, jeśli utkniesz.", "Trzy z rzędu nie wyszły. Zwolnijmy i czytajmy uważniej."],
  dokladam: ["Dokładam jedno zadanie, żeby to utrwalić.", "Jeszcze jedno zadanie na utrwalenie."],
  czesciowo: ["Część się zgadza. Zerknij, gdzie brakuje punktu.", "Blisko. Jedno kryterium jeszcze nie wyszło."],
  zleSprobuj: ["Tym razem nie. Spróbuj jeszcze raz albo weź następne.", "To nie to. Sprawdź obliczenia i spróbuj ponownie."],
  niepewne: ["Tego nie ocenię pewnie. Sprawdź zapis odpowiedzi.", "Nie umiem tego jednoznacznie sprawdzić. Zerknij na format."],
} as const;

/** Pestka z dymkiem w treści strony. Przy pojawieniu się podskakuje i chwilę mówi. */
export function PestkaMowi({ tekst, children }: { tekst: string; children?: ReactNode }) {
  const [mowi, setMowi] = useState(true);
  useEffect(() => {
    setMowi(true);
    const t = window.setTimeout(() => setMowi(false), 1600);
    return () => window.clearTimeout(t);
  }, [tekst]);
  return (
    <div className={s.pestka}>
      <span key={tekst} className={s.pestkaAvatar}><TutorAvatar size={40} state={mowi ? "talking" : "idle"} /></span>
      <div className={s.pestkaDymek}>
        <p><span className="visually-hidden">Pestka: </span>{tekst}</p>
        {children}
      </div>
    </div>
  );
}

function opisAutorski(prompt: Exclude<PolecenieNauki, { typ: "cke" }>, odpowiedz: string, ocena?: OdpowiedzNauki): string {
  const linie = ["Ćwiczenie z rundy nauki (język angielski).", `Polecenie: ${prompt.tresc}`];
  if (prompt.tekst) linie.push(prompt.tekst);
  if (prompt.typ !== "luka") prompt.opcje.forEach((o) => linie.push(`${o.id}. ${o.tekst}`));
  linie.push(`Odpowiedź ucznia: ${odpowiedz.trim() ? nazwaOdpowiedzi(odpowiedz, prompt) : "(brak)"}`);
  if (!ocena) return [...linie, "", "Uczeń jeszcze nie sprawdził tego zadania. Nie podawaj poprawnej odpowiedzi: naprowadzaj pytaniami."].join("\n");
  if (prompt.typ !== "luka" && prompt.audioTekst) linie.push(`Transkrypcja nagrania: ${prompt.audioTekst}`);
  linie.push(`Poprawna odpowiedź: ${ocena.solutions.map((a) => nazwaOdpowiedzi(a, prompt)).join(" / ")}`, `Wyjaśnienie: ${ocena.explanation}`);
  return linie.join("\n");
}

function KontekstCke({ prompt, klucz, odpowiedz, sprawdzone }: { prompt: Extract<PolecenieNauki, { typ: "cke" }>; klucz: string; odpowiedz: string; sprawdzone: boolean }) {
  const { dane } = useArkusz(prompt.sheet_id);
  const zadanie = dane?.zadania.find((z) => z.nr === prompt.task_nr);
  const pytanie = zadanie?.pytania.find((p) => p.nr === prompt.question);
  useKontekstPestki(zadanie && pytanie ? {
    klucz,
    tytul: nazwaZadaniaCke(prompt.sheet_id, prompt.question),
    opis: kontekstZadania({ ...zadanie, pytania: [pytanie] }, { odpowiedzi: { [pytanie.nr]: odpowiedz }, samoocena: {} }, sprawdzone),
  } : null);
  return null;
}

function KontekstAutorski({ prompt, klucz, odpowiedz, ocena }: { prompt: Exclude<PolecenieNauki, { typ: "cke" }>; klucz: string; odpowiedz: string; ocena?: OdpowiedzNauki }) {
  useKontekstPestki({ klucz, tytul: "zadanie z rundy", opis: opisAutorski(prompt, odpowiedz, ocena) });
  return null;
}

/** Bieżące zadanie rundy jako kontekst rozmowy: dok i prawy przycisk wiedzą, o co pyta uczeń. */
export function KontekstRundy({ prompt, klucz, odpowiedz, ocena }: { prompt: PolecenieNauki; klucz: string; odpowiedz: string; ocena?: OdpowiedzNauki }) {
  return prompt.typ === "cke"
    ? <KontekstCke prompt={prompt} klucz={klucz} odpowiedz={odpowiedz} sprawdzone={!!ocena} />
    : <KontekstAutorski prompt={prompt} klucz={klucz} odpowiedz={odpowiedz} ocena={ocena} />;
}
