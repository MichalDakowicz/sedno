import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight, LogOut, Map as MapIcon } from "lucide-react";
import { logout, saveSubjects, useProfil, useSession } from "../auth";
import { resetTour } from "../components/TutorContext";
import { WyborPrzedmiotow } from "../components/WyborPrzedmiotow";
import { zgrupuj, type MojPrzedmiot } from "../konto/przedmioty";
import { useUczenie } from "../konto/profilUcznia";
import { podsumowanieCelow } from "./QuizCelow";
import { NaglowekStrony } from "../components/NaglowekStrony";

export function Profile() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const session = useSession();
  const profil = useProfil();
  const [blad, setBlad] = useState<string | null>(null);
  const przedmiotyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (hash === "#przedmioty" && profil) przedmiotyRef.current?.scrollIntoView({ block: "start" });
  }, [hash, !!profil]);

  // Zmiana przedmiotów zapisuje się od razu, więc udany zapis nie potrzebuje komunikatu; widać tylko błędy.
  // Pusta lista się nie zapisuje, bo pulpit nie miałby czego pokazać.
  const uczenie = useUczenie();
  async function zmien(v: MojPrzedmiot[]) {
    if (!v.length) return setBlad("Zostaw przynajmniej jeden przedmiot.");
    setBlad(null);
    if (!(await saveSubjects(v))) setBlad("Nie udało się zapisać. Spróbuj jeszcze raz.");
  }

  return (
    <main className="container" style={{ paddingTop: "var(--s-6)", paddingBottom: "var(--zapas-pestki)", display: "grid", gap: "var(--s-7)" }}>
      <NaglowekStrony etykieta="Profil" tytul={profil?.display_name ?? "Twoje konto"} lead={session ? session.user.email : undefined} />

      {/* Cele i sposób nauki na samej górze: to z nich korzysta Pestka, pulpit i „Dziś warto”. */}
      <section style={{ display: "grid", gap: "var(--s-3)", justifyItems: "start" }}>
        <h2 className="h2" data-tutor-about="Jak się uczysz, ile masz czasu, cele, priorytety i to, co wiem z twoich wyników.">Cele i sposób nauki</h2>
        {profil && <p className="muted">{podsumowanieCelow(uczenie, zgrupuj(profil.subjects).map((m) => m.id))}</p>}
        <Link to="/profil-ucznia" className="btn btn-secondary">
          Zmień cele i sposób nauki
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <section id="przedmioty" ref={przedmiotyRef} style={{ display: "grid", gap: "var(--s-4)", justifyItems: "start", paddingTop: "var(--s-4)", borderTop: "1px solid var(--line)" }}>
        <h2 className="h2" data-tutor-about="Pulpit, propozycje i ja dopasowujemy się do tych przedmiotów.">Przedmioty maturalne</h2>
        {profil && <WyborPrzedmiotow bezKrawedzi value={profil.subjects} onChange={(v) => void zmien(v)} />}
        {blad && (
          <p className="small" role="alert">
            {blad}
          </p>
        )}
      </section>

      {/* Ustawienia i układ pulpitu to po prostu dwa wiersze-linki, bez osobnych nagłówków i „Otwórz…”. */}
      <ul className="wiersze" aria-label="Ustawienia">
        <li>
          <Link to="/ustawienia" className="wiersz">
            <span className="wiersz-tresc"><span className="h3">Ustawienia</span><span className="wiersz-opis">Wygląd, dostępność, głos Pestki</span></span>
            <span className="wiersz-akcja"><ChevronRight size={20} aria-hidden="true" /></span>
          </Link>
        </li>
        <li>
          <Link to="/uklad-pulpitu" className="wiersz">
            <span className="wiersz-tresc"><span className="h3">Układ pulpitu</span><span className="wiersz-opis">Co widać na pulpicie i w jakiej kolejności</span></span>
            <span className="wiersz-akcja"><ChevronRight size={20} aria-hidden="true" /></span>
          </Link>
        </li>
      </ul>

      <div style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            resetTour();
            navigate("/");
          }}
        >
          <MapIcon size={18} aria-hidden="true" />
          Pokaż przewodnik z Pestką
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            void logout().then(() => navigate("/logowanie"));
          }}
        >
          <LogOut size={18} aria-hidden="true" />
          Wyloguj
        </button>
      </div>
    </main>
  );
}
