import {
  Atom,
  BookOpen,
  CodeXml,
  Dna,
  FlaskConical,
  Globe,
  Hourglass,
  Languages,
  Lightbulb,
  Scale,
  Scroll,
  Sigma,
  type LucideIcon,
} from "lucide-react";
import type { Ton } from "../konto/przedmioty";

import styles from "./icons.module.css";

const subjectIcons: Record<string, LucideIcon> = {
  polski: BookOpen,
  matematyka: Sigma,
  angielski: Languages,
  informatyka: CodeXml,
  biologia: Dna,
  chemia: FlaskConical,
  fizyka: Atom,
  geografia: Globe,
  historia: Hourglass,
  wos: Scale,
  filozofia: Lightbulb,
  lacina: Scroll,
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
