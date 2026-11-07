import { useNavigate } from "react-router-dom";
import { LogOut, Map as MapIcon } from "lucide-react";
import { logout, useProfil, useSession } from "../auth";
import { KontoAI } from "../components/KontoAI";
import { resetTour } from "../components/TutorContext";
import { SubjectIcon } from "../components/icons";
import { formatDate, student, subjects } from "../data/demo";

export function Profile() {
  const navigate = useNavigate();
  const session = useSession();
  const profil = useProfil();

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 120, display: "grid", gap: 40 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <span className="label">Profil</span>
        <h1 className="display">{profil?.display_name ?? student.name}</h1>
        {session && <p className="muted">{session.user.email}</p>}
      </div>

      <section style={{ display: "grid", gap: 16 }}>
        <h2 className="h3">Twoje przedmioty</h2>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", borderTop: "1px solid var(--line)" }}>
          {subjects.map((s) => (
            <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
              <SubjectIcon subject={s} size="sm" />
              <span style={{ flex: 1 }}>
                {s.name} <span className="muted">· {s.level}</span>
              </span>
              <span className="muted small">matura {formatDate(s.examDate)}</span>
            </li>
          ))}
        </ul>
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
