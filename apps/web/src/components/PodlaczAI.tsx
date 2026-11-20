// Pestka bez dostawcy modelu na serwerze: dostawcę ustawia operator Sedno, nie uczeń, więc tylko jedno zdanie.
import styles from "./PodlaczAI.module.css";

export function PodlaczAI() {
  return <p className={styles.box}>Pestka jest chwilowo niedostępna. Spróbuj za chwilę.</p>;
}
