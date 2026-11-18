import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FileText, MessagesSquare, Sparkles, Timer } from "lucide-react";
import { Ladowanie } from "../../components/Ladowanie";
import { useTutor } from "../../components/TutorContext";
import { SubjectIcon } from "../../components/icons";
import { brakArkuszy, naPoziomie, nazwaPoziomu, przedmiot } from "../../konto/przedmioty";
import { adresStartu } from "../../nauka/adresy";
import { naukaApi, nazwaFormatuNauki } from "../../nauka/api";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import type { KontekstPulpitu } from "./widgety";
import { Kicker, procent, tytul } from "./wspolne";
import styles from "../Dashboard.module.css";

export function Dzis({ co, aktywny, ai }: KontekstPulpitu) {
  const { open: openTutor } = useTutor();
  const [poziomNauki] = usePoziomNauki();
  const proponujNauke = aktywny === "angielski" || (!aktywny && co?.przedmiot.id === "angielski" && co.rodzaj !== "dokoncz");
  const nauka = useZapytanieNauki(proponujNauke ? `dzis-${poziomNauki}` : null, async (signal) => {
    const [propozycja, katalog] = await Promise.all([naukaApi.polec(poziomNauki, undefined, signal), naukaApi.katalog(poziomNauki, signal)]);
    const umiejetnosc = katalog.skills.find((u) => u.id === propozycja?.skill_id);
    return propozycja && umiejetnosc ? { ...propozycja, nazwa: umiejetnosc.name } : null;
  });

  if (nauka.stan === "ladowanie") return <Ladowanie ksztalt="blok" etykieta="Dobieram ćwiczenie" />;

  if (nauka.dane) {
    const { skill_id, format, repeat_id, minutes, reason, nazwa } = nauka.dane;
    return (
      <article className={styles.today} aria-labelledby="today-title" data-tutor-about="To propozycja ćwiczenia na podstawie mapy umiejętności.">
        <div className={styles.todayHead}><Kicker icon={Sparkles}>Dziś warto</Kicker></div>
        <h2 id="today-title" className="h1">{nazwa}</h2>
        <p className={styles.reason}>{reason}</p>
        <div className={styles.actions}>
          <Link to={adresStartu(poziomNauki, skill_id, format, repeat_id ?? undefined)} className="btn btn-primary" data-tutor="today-cta">
            <Timer size={18} aria-hidden="true" />
            {nazwaFormatuNauki[format]} · {minutes} min
          </Link>
        </div>
      </article>
    );
  }

  if (!co) return null;
  const showSubject = !aktywny;
  const p = przedmiot(co.przedmiot.id)!;
  const poziom = nazwaPoziomu[co.przedmiot.poziom];

  let naglowek: string;
  let powod: string;
  let akcja: ReactNode;
  if (co.rodzaj === "dokoncz") {
    naglowek = "Dokończ arkusz";
    powod = `${tytul(co.zaczety.arkusz)}, poziom ${poziom}. Masz już ${co.zaczety.odpowiedzi} odpowiedzi z ${co.zaczety.arkusz.pytan}, wynik zobaczysz po sprawdzeniu.`;
    akcja = (
      <Link to={`/arkusze/${co.zaczety.arkusz.id}`} className="btn btn-primary" data-tutor="today-cta">
        <FileText size={18} aria-hidden="true" />
        Wróć do arkusza
      </Link>
    );
  } else if (co.rodzaj === "nowy") {
    naglowek = tytul(co.arkusz);
    powod = co.ostatni
      ? `Ostatni wynik: ${procent(co.ostatni)}% (${tytul(co.ostatni.arkusz).toLowerCase()}). Kolejny arkusz pokaże, czy to stały poziom.`
      : `Nie masz jeszcze wyniku z tego przedmiotu. Najnowszy arkusz na poziomie ${poziom} pokaże, od czego zacząć.`;
    akcja = (
      <Link to={`/arkusze/${co.arkusz.id}`} className="btn btn-primary" data-tutor="today-cta">
        <FileText size={18} aria-hidden="true" />
        Rozwiąż arkusz{co.arkusz.czas ? ` · ${co.arkusz.czas} min` : ""}
      </Link>
    );
  } else if (co.rodzaj === "wszystko") {
    naglowek = "Wszystkie arkusze rozwiązane";
    powod = `Masz wyniki ze wszystkich arkuszy na poziomie ${poziom}, które są w Sedno.${co.ostatni ? ` Ostatni: ${procent(co.ostatni)}%.` : ""}`;
    akcja = (
      <Link to="/arkusze" className="btn btn-primary" data-tutor="today-cta">
        <FileText size={18} aria-hidden="true" />
        Przejrzyj arkusze
      </Link>
    );
  } else {
    naglowek = `${p.nazwa}, poziom ${poziom}`;
    powod = brakArkuszy(co.przedmiot.id, co.przedmiot.poziom, co.inne);
    akcja = co.inne.length ? (
      <Link to={`/arkusze?przedmiot=${co.przedmiot.id}&poziom=${co.inne[0]}`} className="btn btn-primary" data-tutor="today-cta">
        <FileText size={18} aria-hidden="true" />
        Arkusze {naPoziomie[co.inne[0]!]}
      </Link>
    ) : ai ? (
      <button type="button" className="btn btn-primary" data-tutor="today-cta" onClick={() => openTutor()}>
        <MessagesSquare size={18} aria-hidden="true" />
        Porozmawiaj z Pestką
      </button>
    ) : (
      <Link to="/arkusze" className="btn btn-primary" data-tutor="today-cta">
        <FileText size={18} aria-hidden="true" />
        Zobacz dostępne arkusze
      </Link>
    );
  }

  return (
    // Jedyna karta na pulpicie: propozycja to główne działanie, więc dostaje wyróżnienie.
    <article className={styles.today} aria-labelledby="today-title" data-tutor-about="To propozycja na dziś. Wybieram ją z twoich arkuszy: najpierw dokończenie zaczętego, potem najnowszy nierozwiązany.">
      <div className={styles.todayHead}>
        <Kicker icon={Sparkles}>Dziś warto</Kicker>
        {showSubject && (
          <Link to={`/przedmiot/${p.id}`} className={styles.tag}>
            <SubjectIcon subject={p} size="sm" />
            {p.nazwa}
          </Link>
        )}
      </div>
      <h2 id="today-title" className="h1">
        {naglowek}
      </h2>
      <p className={styles.reason}>{powod}</p>
      <div className={styles.actions}>{akcja}</div>
    </article>
  );
}
