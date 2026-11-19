import { useId } from "react";
import styles from "./TutorAvatar.module.css";

/**
 * Stany Pestki. idle, thinking, talking: zwykła rozmowa. Emocje: radosc (dobra odpowiedź), duma (koniec rundy
 * z postępem), zmartwienie (kilka błędów z rzędu), sen (kilka minut bez ruchu ucznia), swieto (pierwsza bezbłędna
 * runda, kamień milowy serii). Każda emocja to ten sam rysunek z inną twarzą; ruch wyłącza „Mniej ruchu”.
 */
export type AvatarState = "idle" | "thinking" | "talking" | "radosc" | "duma" | "zmartwienie" | "sen" | "swieto";

type Props = {
  size?: number;
  state?: AvatarState;
  className?: string;
};

const OCZY_LUKI = new Set<AvatarState>(["radosc", "swieto"]);
const OCZY_ZAMKNIETE = new Set<AvatarState>(["duma", "sen"]);

export function TutorAvatar({ size = 56, state = "idle", className }: Props) {
  const gradient = `tutor-body-${useId().replace(/:/g, "")}`;
  const otwarte = !OCZY_LUKI.has(state) && !OCZY_ZAMKNIETE.has(state);
  return (
    <svg
      className={[styles.avatar, styles[state], className].filter(Boolean).join(" ")}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      data-stan={state}
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff8a3d" />
          <stop offset="55%" stopColor="#ff7448" />
          <stop offset="100%" stopColor="#ff5e3a" />
        </linearGradient>
      </defs>
      {state === "swieto" && (
        <g className={styles.konfetti}>
          <rect x="4" y="10" width="4" height="7" rx="1.5" style={{ fill: "var(--secondary-fg)" }} transform="rotate(-25 6 13)" />
          <circle cx="58" cy="12" r="2.6" style={{ fill: "var(--success)" }} />
          <rect x="54" y="26" width="4" height="7" rx="1.5" style={{ fill: "var(--primary)" }} transform="rotate(30 56 29)" />
          <circle cx="7" cy="30" r="2.2" style={{ fill: "var(--primary)" }} />
          <circle cx="32" cy="1" r="2.2" style={{ fill: "var(--secondary-fg)" }} />
        </g>
      )}
      {state === "sen" && (
        <g className={styles.zetki} fill="none" style={{ stroke: "var(--muted)" }} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path className={styles.zetka} d="M48 10h6l-6 7h6" />
          <path className={styles.zetka} d="M56 2h4l-4 5h4" />
        </g>
      )}
      <g className={styles.body}>
        <path
          d="M32 4c13.5 0 24 8.6 26.6 21.4 2.4 11.9-2 24-12.6 30.2C38.8 59.8 25.2 59.8 18 55.6 7.4 49.4 3 37.3 5.4 25.4 8 12.6 18.5 4 32 4Z"
          fill={`url(#${gradient})`}
        />
        <ellipse cx="22" cy="16" rx="7" ry="4" fill="#fff" opacity="0.22" transform="rotate(-24 22 16)" />
        <circle className={styles.policzek} cx="16.5" cy="38" r="4" fill="#ffc8b7" opacity="0.7" />
        <circle className={styles.policzek} cx="47.5" cy="38" r="4" fill="#ffc8b7" opacity="0.7" />
        {state === "zmartwienie" && (
          <g fill="none" stroke="#0f151d" strokeWidth="2" strokeLinecap="round">
            <path d="M19.5 22.5l7-2.5" />
            <path d="M44.5 22.5l-7-2.5" />
          </g>
        )}
        {otwarte && (
          <g className={styles.eyes}>
            <ellipse className={styles.eye} cx="24" cy="30" rx="3.4" ry={state === "zmartwienie" ? 3.6 : 4.6} fill="#0f151d" />
            <ellipse className={styles.eye} cx="40" cy="30" rx="3.4" ry={state === "zmartwienie" ? 3.6 : 4.6} fill="#0f151d" />
          </g>
        )}
        {OCZY_LUKI.has(state) && (
          <g fill="none" stroke="#0f151d" strokeWidth="2.6" strokeLinecap="round">
            <path d="M20 31.5c1.8-4 6.2-4 8 0" />
            <path d="M36 31.5c1.8-4 6.2-4 8 0" />
          </g>
        )}
        {OCZY_ZAMKNIETE.has(state) && (
          <g fill="none" stroke="#0f151d" strokeWidth="2.4" strokeLinecap="round">
            {state === "duma" ? (
              <>
                <path d="M20 29c1.8 3 6.2 3 8 0" />
                <path d="M36 29c1.8 3 6.2 3 8 0" />
              </>
            ) : (
              <>
                <path d="M20.5 31h7" />
                <path d="M36.5 31h7" />
              </>
            )}
          </g>
        )}
        {(state === "idle" || state === "thinking" || state === "talking") && (
          <path className={styles.smile} d="M27 40.5c2.8 2.6 7.2 2.6 10 0" fill="none" stroke="#0f151d" strokeWidth="2.4" strokeLinecap="round" />
        )}
        {state === "duma" && <path d="M25.5 40c3.6 3.6 9.4 3.6 13 0" fill="none" stroke="#0f151d" strokeWidth="2.4" strokeLinecap="round" />}
        {(state === "radosc" || state === "swieto") && <path d="M26 39h12c0 4.4-2.7 7-6 7s-6-2.6-6-7Z" fill="#0f151d" />}
        {state === "zmartwienie" && <path d="M27.5 43c2.6-2.2 6.4-2.2 9 0" fill="none" stroke="#0f151d" strokeWidth="2.4" strokeLinecap="round" />}
        {state === "sen" && <ellipse cx="32" cy="42" rx="2" ry="1.6" fill="#0f151d" />}
        <ellipse className={styles.mouth} cx="32" cy="41.5" rx="3.2" ry="2.4" fill="#0f151d" />
      </g>
    </svg>
  );
}
