import { useNavigate, useNavigationType, useOutletContext } from "react-router-dom";
import { TutorChat } from "../components/TutorChat";
import { zamknijPelny } from "../components/sterKsztaltu";
import styles from "./Tutor.module.css";

export function Tutor() {
  const navigate = useNavigate();
  const nawigacja = useNavigationType();
  const bylWInnymWidoku = useOutletContext<boolean>();

  function wroc() {
    if (bylWInnymWidoku && nawigacja !== "REPLACE") navigate(-1);
    else navigate("/", { replace: true });
  }

  return (
    <main className={styles.page} aria-label="Rozmowa z Pestką" data-ksztalt="czat">
      <TutorChat pelny zamknijPelny={() => void zamknijPelny(wroc)} />
    </main>
  );
}
