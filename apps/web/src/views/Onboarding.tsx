// Pierwsze wejście na konto: powitanie Pestki, przedmioty i poziomy, quiz celów, a na końcu
// diagnoza (z angielskim) albo pulpit. Bez AI na koncie ostatni krok mówi, jak podpiąć dostawcę.
// Przechodzi się go raz na konto.
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { TutorAvatar } from "../components/TutorAvatar";
import { resetTour } from "../components/TutorContext";
import { PodlaczAI } from "../components/PodlaczAI";
import { WyborPrzedmiotow } from "../components/WyborPrzedmiotow";
import { markOnboarded, saveSubjects, useProfil, useSession, imieZNazwy } from "../auth";
import { useAiReady } from "../ai";
import { QuizCelow } from "./QuizCelow";
import type { MojPrzedmiot } from "../konto/przedmioty";
import styles from "./Onboarding.module.css";

const KROKI = ["Cześć", "Przedmioty", "Cele", "Start"];

export function Onboarding() {
  const session = useSession();
  const profil = useProfil();
  const ai = useAiReady(session ? session.user.id : null);
  const navigate = useNavigate();
  const [krok, setKrok] = useState(0);
  const [wybor, setWybor] = useState<MojPrzedmiot[] | null>(null);
  const [zapis, setZapis] = useState(false);

  if (session === false) return <Navigate to="/logowanie" replace />;
  if (!session || profil === undefined || ai === undefined) return null;

  const imie = imieZNazwy(profil?.display_name);
  const przedmioty = wybor ?? profil?.subjects ?? [];
  const angielski = przedmioty.some((p) => p.id === "angielski");

  async function zakoncz(dokad: string) {
    await markOnboarded();
    if (dokad === "/") resetTour();
    navigate(dokad);
  }

  async function zapiszPrzedmioty() {
    setZapis(true);
    const ok = await saveSubjects(przedmioty);
    setZapis(false);
    if (ok) setKrok(2);
  }

  return (
    <div className={styles.page}>
      <header className={`container ${styles.top}`}>
        <span className={styles.logo}>Sedno</span>
        <ol className={styles.progress} aria-label="Postęp">
          {KROKI.map((k, i) => (
            <li key={k} className={i <= krok ? styles.done : undefined} aria-current={i === krok ? "step" : undefined}>
              <span className="visually-hidden">{k}</span>
            </li>
          ))}
        </ol>
        <button type="button" className={styles.skip} onClick={() => void zakoncz("/")}>
          Pomiń
        </button>
      </header>

      <main className={`container ${styles.main}`}>
        {krok === 0 && (
          <section className={styles.step}>
            <TutorAvatar size={88} state="talking" />
            <h1 className="display">
              Cześć{imie ? `, ${imie}` : ""}! <span className="accent">Jestem Pestka.</span>
            </h1>
            <p className="lead">Odpowiem na pytanie, dam wskazówkę albo pomogę ci sprawdzić próbę.</p>
            <button type="button" className="btn btn-primary" onClick={() => setKrok(1)}>
              Zaczynamy
            </button>
          </section>
        )}

        {krok === 1 && (
          <section className={styles.step}>
            <TutorAvatar size={64} />
            <h1 className="h1">Co zdajesz na maturze?</h1>
            <WyborPrzedmiotow value={przedmioty} onChange={setWybor} />
            <button type="button" className="btn btn-primary" disabled={!przedmioty.length || zapis} onClick={() => void zapiszPrzedmioty()}>
              Dalej
            </button>
          </section>
        )}

        {krok === 2 && <QuizCelow wOnboardingu onKoniec={() => setKrok(3)} />}

        {krok === 3 &&
          (ai ? (
            <section className={styles.step}>
              <TutorAvatar size={64} state="talking" />
              <h1 className="h1">{angielski ? "Sprawdźmy, od czego zacząć" : "Wszystko gotowe"}</h1>
              <p className="lead">
                {angielski ? "Kilka krótkich zadań pokaże mi, co już umiesz." : "Na pulpicie czeka pierwsza propozycja."} Gdy zechcesz pogadać, kliknij mnie w rogu ekranu.
              </p>
              {angielski ? (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => void zakoncz("/nauka/diagnoza")}>
                    Zacznij diagnozę
                  </button>
                  <button type="button" className={styles.later} onClick={() => void zakoncz("/")}>
                    Przejdź do pulpitu
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => void zakoncz("/")}>
                  Przejdź do pulpitu
                </button>
              )}
            </section>
          ) : (
            <section className={styles.step}>
              <TutorAvatar size={64} />
              <h1 className="h1">Na razie odpoczywam</h1>
              <PodlaczAI />
              <button type="button" className={styles.later} onClick={() => void zakoncz(angielski ? "/nauka/diagnoza" : "/")}>
                {angielski ? "Na razie bez Pestki: diagnoza" : "Na razie bez Pestki"}
              </button>
            </section>
          ))}
      </main>
    </div>
  );
}
