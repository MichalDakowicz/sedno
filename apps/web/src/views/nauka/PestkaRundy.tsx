// Pestka w rundzie: krótka reakcja przy werdykcie i przy rozbiorze. Stoi w treści strony, obok werdyktu,
// więc nie zasłania opcji ani przycisków i nie zabiera fokusu. Teksty są gotowe (bez AI), więc działa
// także na koncie bez podpiętego modelu.
import { useEffect, useState, type ReactNode } from "react";
import { useArkusz } from "../../arkusze/dane";
import { kontekstZadania } from "../../arkusze/omowienie";
import { nazwaZadaniaCke } from "../../arkusze/typy";
import { TutorAvatar, type AvatarState } from "../../components/TutorAvatar";
import { useKontekstPestki } from "../../components/TutorContext";
import type { OdpowiedzNauki, PolecenieNauki } from "../../nauka/api";
import { nazwaOdpowiedzi } from "./sesjaRundy";
import s from "./SzybkaRunda.module.css";

/** Pestka z dymkiem w treści strony. Przy pojawieniu się podskakuje i chwilę mówi; z emocją pokazuje ją od razu i zostaje przy niej. */
export function PestkaMowi({ tekst, emocja, children }: { tekst: string; emocja?: AvatarState; children?: ReactNode }) {
  const [mowi, setMowi] = useState(true);
  useEffect(() => {
    setMowi(true);
    const t = window.setTimeout(() => setMowi(false), 1600);
    return () => window.clearTimeout(t);
  }, [tekst]);
  return (
    <div className={s.pestka}>
      <span key={tekst} className={s.pestkaAvatar}><TutorAvatar size={40} state={emocja ?? (mowi ? "talking" : "idle")} /></span>
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
  if (!ocena) return [...linie, "", "Etap: przed oddaniem. Możesz wskazać następny krok, bez zdradzania odpowiedzi."].join("\n");
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
    przedmiot: dane?.przedmiot,
    maProbe: !!odpowiedz.trim(),
    chronOdpowiedz: !sprawdzone,
    opis: kontekstZadania({ ...zadanie, pytania: [pytanie] }, { odpowiedzi: { [pytanie.nr]: odpowiedz }, samoocena: {} }, sprawdzone),
  } : null);
  return null;
}

function KontekstAutorski({ prompt, klucz, odpowiedz, ocena }: { prompt: Exclude<PolecenieNauki, { typ: "cke" }>; klucz: string; odpowiedz: string; ocena?: OdpowiedzNauki }) {
  useKontekstPestki({ klucz, tytul: "zadanie z rundy", opis: opisAutorski(prompt, odpowiedz, ocena),
    przedmiot: "angielski", maProbe: !!odpowiedz.trim(), chronOdpowiedz: !ocena });
  return null;
}

/** Bieżące zadanie rundy jako kontekst rozmowy: dok i prawy przycisk wiedzą, o co pyta uczeń. */
export function KontekstRundy({ prompt, klucz, odpowiedz, ocena }: { prompt: PolecenieNauki; klucz: string; odpowiedz: string; ocena?: OdpowiedzNauki }) {
  return prompt.typ === "cke"
    ? <KontekstCke prompt={prompt} klucz={klucz} odpowiedz={odpowiedz} sprawdzone={!!ocena} />
    : <KontekstAutorski prompt={prompt} klucz={klucz} odpowiedz={odpowiedz} ocena={ocena} />;
}
