import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, Map as MapIcon } from "lucide-react";
import { logout, saveSubjects, useProfil, useSession } from "../auth";
import { KontoAI } from "../components/KontoAI";
import { resetTour } from "../components/TutorContext";
import { WyborPrzedmiotow } from "../components/WyborPrzedmiotow";
import type { MojPrzedmiot } from "../konto/przedmioty";

export function Profile() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const session = useSession();
  const profil = useProfil();
  const [zapisano, setZapisano] = useState<string | null>(null);
  const przedmiotyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (hash === "#przedmioty" && profil) przedmiotyRef.current?.scrollIntoView({ block: "start" });
  }, [hash, !!profil]);

  // Zmiana przedmiotów zapisuje się od razu; pusta lista nie, bo pulpit nie miałby czego pokazać.
  async function zmien(v: MojPrzedmiot[]) {
    if (!v.length) return setZapisano("Zostaw przynajmniej jeden przedmiot.");
    setZapisano(null);
    setZapisano((await saveSubjects(v)) ? "Zapisano." : "Nie udało się zapisać.");
  }

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 120, display: "grid", gap: 40 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <span className="label">Profil</span>
        <h1 className="display">{profil?.display_name ?? "Twoje konto"}</h1>
        {session && <p className="muted">{session.user.email}</p>}
      </div>

      <section id="przedmioty" ref={przedmiotyRef} style={{ display: "grid", gap: 16, justifyItems: "start" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h2 className="h3">Przedmioty maturalne</h2>
          <p className="muted small">Pulpit, propozycje i Pestka dopasowują się do nich.</p>
        </div>
        {profil && <WyborPrzedmiotow value={profil.subjects} onChange={(v) => void zmien(v)} />}
        {zapisano && (
          <p className="small muted" role="status">
            {zapisano}
          </p>
        )}
      </section>

      <KontoAI />

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
