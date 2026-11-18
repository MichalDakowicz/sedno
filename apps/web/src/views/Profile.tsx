import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Map as MapIcon } from "lucide-react";
import { logout, saveSubjects, useProfil, useSession } from "../auth";
import { KontoAI } from "../components/KontoAI";
import { resetTour } from "../components/TutorContext";
import { WyborPrzedmiotow } from "../components/WyborPrzedmiotow";
import type { MojPrzedmiot } from "../konto/przedmioty";
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
  async function zmien(v: MojPrzedmiot[]) {
    if (!v.length) return setBlad("Zostaw przynajmniej jeden przedmiot.");
    setBlad(null);
    if (!(await saveSubjects(v))) setBlad("Nie udało się zapisać. Spróbuj jeszcze raz.");
  }

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 120, display: "grid", gap: 40 }}>
      <NaglowekStrony etykieta="Profil" tytul={profil?.display_name ?? "Twoje konto"} lead={session ? session.user.email : undefined} />

      <section id="przedmioty" ref={przedmiotyRef} style={{ display: "grid", gap: 16, justifyItems: "start" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h2 className="h2">Przedmioty maturalne</h2>
          <p className="muted small">Pulpit, propozycje i Pestka dopasowują się do nich.</p>
        </div>
        {profil && <WyborPrzedmiotow value={profil.subjects} onChange={(v) => void zmien(v)} />}
        {blad && (
          <p className="small" role="alert">
            {blad}
          </p>
        )}
      </section>

      <KontoAI />

      <section style={{ display: "grid", gap: 4, paddingTop: 28, borderTop: "1px solid var(--line)", justifyItems: "start" }}>
        <h2 className="h2">Ustawienia</h2>
        <p className="muted small">Motyw, rozmiar tekstu, dostępność i zachowanie Pestki.</p>
        <Link to="/ustawienia" className="link" style={{ marginTop: 12 }}>
          Otwórz ustawienia
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <section style={{ display: "grid", gap: 4, paddingTop: 28, borderTop: "1px solid var(--line)", justifyItems: "start" }}>
        <h2 className="h2">Profil ucznia</h2>
        <p className="muted small">Jak się uczysz, ile masz czasu, cele, priorytety i to, co Sedno wie z twoich wyników.</p>
        <Link to="/profil-ucznia" className="link" style={{ marginTop: 12 }}>
          Otwórz profil ucznia
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <section style={{ display: "grid", gap: 4, paddingTop: 28, borderTop: "1px solid var(--line)", justifyItems: "start" }}>
        <h2 className="h2">Układ pulpitu</h2>
        <p className="muted small">Wybór i kolejność widgetów na pulpicie.</p>
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
