// Instrukcja podpięcia AI do konta. Pokazujemy ją na końcu onboardingu i tam, gdzie Pestka czeka na AI.
import { Link } from "react-router-dom";
import styles from "./PodlaczAI.module.css";

export function PodlaczAI({ onGo }: { onGo?: () => void }) {
  return (
    <div className={styles.box}>
      <ol className={styles.steps}>
        <li>
          Wejdź w <strong>Profil</strong>, sekcja <strong>AI na koncie</strong>.
        </li>
        <li>
          Dodaj dostawcę. <strong>OpenAI</strong>: klucz utworzysz na platform.openai.com w zakładce API keys, a nazwę modelu wybierzesz z listy modeli w tym
          samym panelu. <strong>Ollama</strong>: wpisz adres swojego serwera (https) i nazwę modelu.
        </li>
        <li>
          Kliknij <strong>Sprawdź</strong>. Gdy działa, wybierz dostawcę dla zadań <strong>ważnych</strong> (ocena, wyjaśnienia błędów) i{" "}
          <strong>lekkich</strong> (podpowiedzi). Może to być ten sam.
        </li>
      </ol>
      <p className="small muted">
        Klucz jest przypisany do twojego konta i zaszyfrowany na serwerze. Sedno nie ma wspólnego klucza i nie pokazuje twojego nikomu, także tobie.
      </p>
      <Link to="/profil#ai" className="btn btn-primary" onClick={onGo}>
        Podepnij AI
      </Link>
    </div>
  );
}
