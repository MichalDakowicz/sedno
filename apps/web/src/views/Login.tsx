import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { TutorAvatar } from "../components/TutorAvatar";
import { loginGoogle, loginPassword, useSession } from "../auth";
import styles from "./Login.module.css";

// Konto demo dla jury pokazujemy tylko, gdy build dostał jego dane.
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL as string | undefined;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD as string | undefined;

export function Login() {
  const navigate = useNavigate();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function google() {
    setError(null);
    const err = await loginGoogle();
    if (err) setError(err);
  }

  async function withPassword(mail: string, pass: string) {
    setBusy(true);
    setError(null);
    const err = await loginPassword(mail, pass);
    setBusy(false);
    if (err) setError(err);
    else navigate("/");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void withPassword(email, password);
  }

  return (
    <div className={styles.page}>
      <header className={`container ${styles.top}`}>
        <span className={styles.logo}>Sedno</span>
      </header>

      <main className={`container ${styles.main}`}>
        <div className={styles.hero}>
          <TutorAvatar size={72} />
          <h1 className="display">
            <span className={styles.line}>Przygotuj się do matury</span>
            <span className={`accent ${styles.line}`}>z tym, czego jeszcze nie umiesz.</span>
          </h1>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <button type="button" className={`btn btn-ghost ${styles.google}`} onClick={google}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
            </svg>
            Kontynuuj z Google
          </button>

          <div className={styles.divider}>
            <span>albo e-mailem</span>
          </div>

          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              placeholder="ty@szkola.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Hasło</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            Zaloguj się
          </button>

          <p className={styles.footer}>Nowe konto zakładasz przez Google. Hasło mają konta testowe.</p>
        </form>
      </main>

      {DEMO_EMAIL && DEMO_PASSWORD && (
        <aside className={`container ${styles.demo}`}>
          <p>
            <span className="label">Dla jury</span>
            <span className="muted"> Konto demo ma wypełnioną mapę umiejętności i historię.</span>
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void withPassword(DEMO_EMAIL, DEMO_PASSWORD)} disabled={busy}>
            Wejdź na konto demo
          </button>
        </aside>
      )}
    </div>
  );
}
