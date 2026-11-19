// „Zapisz w mapie wiedzy” pod odpowiedzią Pestki (rozmowa, omawianie błędu): notatka z tekstem odpowiedzi
// i odwołaniem do źródła. Tytuł to pierwsze zdanie; uczeń zmieni go w mapie wiedzy.
import { useState } from "react";
import { Link } from "react-router-dom";
import { BookmarkPlus, Check } from "lucide-react";
import type { PrzedmiotId } from "../konto/przedmioty";
import { BladWiedzy, dodajNotatke, LIMIT_TYTULU, type ZrodloNotatki } from "../nauka/wiedza";
import styles from "./ZapiszWMapie.module.css";

/** Markdown z odpowiedzi Pestki jako zwykły tekst notatki (mapa pokazuje treść bez formatowania). */
const bezZnacznikow = (t: string) => t.replace(/\*\*|__|`/g, "").replace(/^#+\s*/gm, "").replace(/^\s*[-*]\s+/gm, "• ").trim();

function tytulZ(tekst: string, podpowiedz?: string) {
  if (podpowiedz) return podpowiedz.slice(0, LIMIT_TYTULU);
  const zdanie = tekst.split(/(?<=[.!?])\s|\n/)[0]?.trim() || tekst.trim();
  return zdanie.length > 80 ? `${zdanie.slice(0, 79).trimEnd()}…` : zdanie;
}

export function ZapiszWMapie({ przedmiot, tekst, zrodlo, tytul }: { przedmiot: PrzedmiotId; tekst: string; zrodlo: ZrodloNotatki; tytul?: string }) {
  const [stan, ustawStan] = useState<{ faza: "gotowe" | "zapisuje" } | { faza: "zapisane"; id: string } | { faza: "blad"; tekst: string }>({ faza: "gotowe" });
  const tresc = bezZnacznikow(tekst);
  if (!tresc) return null;

  async function zapisz() {
    ustawStan({ faza: "zapisuje" });
    try {
      const n = await dodajNotatke(przedmiot, tytulZ(tresc, tytul), tresc, { zrodlo });
      ustawStan({ faza: "zapisane", id: n.id });
    } catch (e) {
      ustawStan({ faza: "blad", tekst: e instanceof BladWiedzy ? e.message : "Nie udało się zapisać notatki." });
    }
  }

  if (stan.faza === "zapisane")
    return (
      <p className={styles.wiersz} role="status">
        <Check size={14} aria-hidden="true" /> W mapie wiedzy.{" "}
        <Link to={`/nauka/mapa-wiedzy?przedmiot=${przedmiot}&notatka=${stan.id}`}>Zobacz</Link>
      </p>
    );
  return (
    <p className={styles.wiersz}>
      <button type="button" className={styles.przycisk} disabled={stan.faza === "zapisuje"} onClick={() => void zapisz()}>
        <BookmarkPlus size={14} aria-hidden="true" /> {stan.faza === "zapisuje" ? "Zapisuję…" : "Zapisz w mapie wiedzy"}
      </button>
      {stan.faza === "blad" && <span className={styles.blad} role="alert">{stan.tekst}</span>}
    </p>
  );
}
