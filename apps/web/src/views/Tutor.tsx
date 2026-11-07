import { TutorAvatar } from "../components/TutorAvatar";
import { TutorChat } from "../components/TutorChat";
import { useTutor } from "../components/TutorContext";
import { SubjectIcon } from "../components/icons";
import { topPick } from "../data/demo";
import { PodlaczAI } from "../components/PodlaczAI";
import { useSession } from "../auth";
import { useAiReady } from "../ai";
import styles from "./Tutor.module.css";

export function Tutor() {
  const { state } = useTutor();
  const pick = topPick();
  const focus = pick.skills.find((s) => s.name === pick.recommendation.skill);
  const session = useSession();
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

  return (
    <main className={`container ${styles.page}`}>
      <section className={styles.intro}>
        <TutorAvatar size={96} state={state} className={styles.avatar} />
        <h1 className="h1">Pestka</h1>
        <p className="muted">
          Twój tutor. Prowadzi cię pytaniami do zrozumienia, zna twoją mapę umiejętności i nie pyta o to, co już umiesz. Rozmowa kończy się
          krótkim testem na nowym przykładzie.
        </p>
        <dl className={styles.context}>
          <div>
            <dt>Przedmiot</dt>
            <dd className={styles.subject}>
              <SubjectIcon subject={pick} size="sm" />
              {pick.name}
            </dd>
          </div>
          <div>
            <dt>Temat</dt>
            <dd>{pick.recommendation.skill}</dd>
          </div>
          {focus && (
            <div>
              <dt>Opanowanie</dt>
              <dd>{focus.mastery}%</dd>
            </div>
          )}
          {focus && (
            <div>
              <dt>Typowy błąd</dt>
              <dd>{focus.note}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className={styles.chat} aria-label="Rozmowa z Pestką">
        <TutorChat />
      </section>
    </main>
  );
}
