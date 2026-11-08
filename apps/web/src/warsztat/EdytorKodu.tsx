// Edytor kodu (CodeMirror 6) z kolorowaniem Pythona albo SQL. Ctrl+Enter uruchamia.
import { useEffect, useRef } from "react";
import { basicSetup, EditorView } from "codemirror";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { python } from "@codemirror/lang-python";
import { sql, SQLite } from "@codemirror/lang-sql";
import styles from "./Warsztat.module.css";

type Props = {
  wartosc: string;
  jezyk: "python" | "sql";
  onZmiana: (kod: string) => void;
  onUruchom: () => void;
  etykieta: string;
  // Nazwy tabel i kolumn do podpowiedzi w SQL.
  schemat?: Record<string, string[]>;
};

// Kolory z tokenów aplikacji, więc edytor ma ten sam motyw co reszta strony.
const motyw = EditorView.theme({
  "&": { fontSize: "14px", backgroundColor: "var(--surface)", color: "var(--fg)" },
  ".cm-content": { fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", caretColor: "var(--fg)" },
  ".cm-gutters": { backgroundColor: "var(--bg)", color: "var(--subtle)", border: "none", borderRight: "1px solid var(--line)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--primary-soft) 45%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--fg)" },
  "&.cm-focused": { outline: "none" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": { backgroundColor: "color-mix(in srgb, var(--primary) 25%, transparent)" },
  ".cm-cursor": { borderLeftColor: "var(--fg)" },
});

export default function EdytorKodu({ wartosc, jezyk, onZmiana, onUruchom, etykieta, schemat }: Props) {
  const miejsce = useRef<HTMLDivElement>(null);
  const widok = useRef<EditorView | null>(null);
  // Najnowsze funkcje z propsów, bez przebudowy edytora przy każdym renderze.
  const zwrotne = useRef({ onZmiana, onUruchom });
  zwrotne.current = { onZmiana, onUruchom };
  const jezykSlot = useRef(new Compartment());

  useEffect(() => {
    const v = new EditorView({
      parent: miejsce.current!,
      state: EditorState.create({
        doc: wartosc,
        extensions: [
          basicSetup,
          motyw,
          indentUnit.of("    "),
          jezykSlot.current.of([]),
          Prec.highest(keymap.of([{ key: "Mod-Enter", run: () => (zwrotne.current.onUruchom(), true) }])),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) zwrotne.current.onZmiana(u.state.doc.toString());
          }),
          EditorView.contentAttributes.of({ "aria-label": etykieta }),
        ],
      }),
    });
    widok.current = v;
    return () => v.destroy();
    // Edytor powstaje raz; treść z zewnątrz synchronizuje efekt niżej.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    widok.current?.dispatch({ effects: jezykSlot.current.reconfigure(jezyk === "python" ? python() : sql({ dialect: SQLite, schema: schemat, upperCaseKeywords: true })) });
  }, [jezyk, schemat]);

  // Zmiana z zewnątrz (np. wczytany postęp z konta) podmienia treść, gdy różni się od edytora.
  useEffect(() => {
    const v = widok.current;
    if (v && v.state.doc.toString() !== wartosc) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: wartosc } });
  }, [wartosc]);

  return <div ref={miejsce} className={styles.edytor} />;
}
