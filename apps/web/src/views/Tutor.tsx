import { TutorAvatar } from "../components/TutorAvatar";
import { TutorChat } from "../components/TutorChat";
import { useTutor } from "../components/TutorContext";
import { SubjectIcon } from "../components/icons";
import { PodlaczAI } from "../components/PodlaczAI";
import { useProfil, useSession } from "../auth";
import { useAiReady } from "../ai";
import { nazwaPoziomu, przedmiot } from "../konto/przedmioty";
import styles from "./Tutor.module.css";

export function Tutor() {
  const { state } = useTutor();
  const session = useSession();
  const profil = useProfil();
  const ai = useAiReady(session ? session.user.id : null);

  if (ai === false)
    return (
      <main className={`container ${styles.page}`}>
        <section className={styles.intro}>
          <TutorAvatar size={96} className={styles.avatar} />
          <h1 className="h1">Pestka czeka na AI</h1>
          <p className="muted">Pojawię się, gdy podepniesz do konta dostawcę AI. Sedno nie ma wspólnego klucza.</p>
          <PodlaczAI />
        </section>
      </main>
    );

  const moje = profil?.subjects ?? [];

  return (
    <main className={`container ${styles.page}`}>
      <section className={styles.intro}>
        <TutorAvatar size={96} state={state} className={styles.avatar} />
        <h1 className="h1">Pestka</h1>
        <p className="muted">Twoja tutorka. Prowadzi cię pytaniami do zrozumienia, zamiast podawać gotowe odpowiedzi. Wklej zadanie albo opisz, co sprawia ci kłopot.</p>
        {moje.length > 0 && (
          <dl className={styles.context}>
            {moje.map((m) => {
              const p = przedmiot(m.id)!;
              return (
                <div key={m.id}>
                  <dt className={styles.subject}>
                    <SubjectIcon subject={p} size="sm" />
                    {p.nazwa}
                  </dt>
                  <dd>poziom {nazwaPoziomu[m.poziom]}</dd>
                </div>
              );
            })}
          </dl>
        )}
      </section>

      <section className={styles.chat} aria-label="Rozmowa z Pestką">
        <TutorChat />
      </section>
    </main>
  );
}
