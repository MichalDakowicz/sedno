import {
  BookOpen,
  Footprints,
  GraduationCap,
  Languages,
  MessagesSquare,
  Sigma,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Ton } from "../konto/przedmioty";

export type Format = "Napraw błąd" | "Szybkie rundy" | "Uczeń uczy AI" | "Krok po kroku" | "Tutor";
import styles from "./icons.module.css";

const subjectIcons: Record<string, LucideIcon> = {
  polski: BookOpen,
  matematyka: Sigma,
  angielski: Languages,
};

export const formatIcons: Record<Format, LucideIcon> = {
  "Napraw błąd": Wrench,
  "Szybkie rundy": Zap,
  "Uczeń uczy AI": GraduationCap,
  "Krok po kroku": Footprints,
  Tutor: MessagesSquare,
};

type SubjectIconProps = { subject: { id: string; tone: Ton }; size?: "sm" | "md" | "lg" };

// Ikona przedmiotu w kółku w kolorze przedmiotu. Kolor pomaga rozpoznać przedmiot bez czytania nazwy.
export function SubjectIcon({ subject, size = "md" }: SubjectIconProps) {
  const Icon = subjectIcons[subject.id] ?? BookOpen;
  const px = size === "sm" ? 14 : size === "md" ? 18 : 22;
  return (
    <span className={`${styles.badge} ${styles[size]}`} data-tone={subject.tone} aria-hidden="true">
      <Icon size={px} strokeWidth={2} />
    </span>
  );
}
