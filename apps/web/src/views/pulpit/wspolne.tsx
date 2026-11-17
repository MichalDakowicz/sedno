import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { ArkuszWpis } from "../../arkusze/typy";
import type { Wynik } from "../../konto/wyniki";
import styles from "../Dashboard.module.css";

export function Kicker({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className={styles.kicker}>
      <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
      {children}
    </span>
  );
}

export const tytul = (a: ArkuszWpis) => `Matura ${a.sesja} ${a.rok}`;
export const procent = (w: Wynik) => Math.round((w.zdobyte / w.mozliwe) * 100);

export function Wynikowy({ value }: { value: number }) {
  const level = value < 50 ? "low" : value < 75 ? "mid" : "high";
  return (
    <span className={styles.bar} aria-hidden="true">
      <span style={{ width: `${value}%` }} data-level={level} />
    </span>
  );
}
