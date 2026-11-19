import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Map as MapIcon } from "lucide-react";
import { logout, saveSubjects, useProfil, useSession } from "../auth";
import { KontoAI } from "../components/KontoAI";
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
    <main className="container" style={{ paddingTop: "var(--s-6)", paddingBottom: "var(--zapas-pestki)", display: "grid", gap: "var(--s-6)" }}>
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

      <section id="przedmioty" ref={przedmiotyRef} style={{ display: "grid", gap: 16, justifyItems: "start" }}>
        <h2 className="h2" data-tutor-about="Pulpit, propozycje i ja dopasowujemy się do tych przedmiotów.">Przedmioty maturalne</h2>
        {profil && <WyborPrzedmiotow value={profil.subjects} onChange={(v) => void zmien(v)} />}
        {blad && (
          <p className="small" role="alert">
            {blad}
          </p>
        )}
      </section>

      <KontoAI />

      <section style={{ display: "grid", gap: 4, paddingTop: "var(--s-4)", borderTop: "1px solid var(--line)", justifyItems: "start" }}>
        <h2 className="h2">Ustawienia</h2>
        <Link to="/ustawienia" className="link" style={{ marginTop: 12 }}>
          Otwórz ustawienia
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <section style={{ display: "grid", gap: 4, paddingTop: "var(--s-4)", borderTop: "1px solid var(--line)", justifyItems: "start" }}>
        <h2 className="h2">Układ pulpitu</h2>
        <Link to="/uklad-pulpitu" className="link" style={{ marginTop: 12 }}>
          Otwórz układ pulpitu
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
