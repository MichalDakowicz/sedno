// Edytor kodu w warsztacie: Monaco, czyli edytor z VS Code. Python z podpowiedziami Jedi (nazwy,
// metody, pliki z danymi, parametry funkcji, opis pod kursorem, błędy składni na żywo), SQL
// z kolorowaniem i nazwami tabel i kolumn. Ctrl+Enter uruchamia.
import { useEffect, useRef } from "react";
import { monaco, rozgrzej, sprawdzSkladnie, ustawPliki } from "./monaco";
import styles from "./Warsztat.module.css";

type Props = {
  wartosc: string;
  jezyk: "python" | "sql";
  onZmiana: (kod: string) => void;
  onUruchom: () => void;
  etykieta: string;
  // Pliki z danymi zadania (Python podpowiada je w open("…")).
  pliki?: Record<string, string>;
  // Nazwy tabel i kolumn do podpowiedzi w SQL.
  schemat?: Record<string, string[]>;
};

// Lista podpowiedzi i opisy wychodzą poza ramkę edytora. Strona arkusza ma przodków z transform
// (animacje wejścia), przy których position: fixed liczy się od nich, więc widżety żyją w body.
let warstwa: HTMLElement | null = null;
function warstwaWidzetow() {
  if (!warstwa) {
    warstwa = document.createElement("div");
    // Klasa monaco-editor daje widżetom style edytora.
    warstwa.className = "monaco-editor";
    document.body.appendChild(warstwa);
  }
  return warstwa;
}

// Podpowiedzi SQL z tabel aktualnego zadania; jeden dostawca na całą stronę, schemat per model.
const schematy = new WeakMap<monaco.editor.ITextModel, Record<string, string[]>>();
monaco.languages.registerCompletionItemProvider("sql", {
  provideCompletionItems(model, position) {
    const schemat = schematy.get(model) ?? {};
    const slowo = model.getWordUntilPosition(position);
    const range = new monaco.Range(position.lineNumber, slowo.startColumn, position.lineNumber, slowo.endColumn);
    const K = monaco.languages.CompletionItemKind;
    const slowa = ["SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "JOIN", "LEFT JOIN", "INNER JOIN", "ON", "AS", "DISTINCT", "COUNT", "SUM", "AVG", "MIN", "MAX", "YEAR", "MONTH", "DAY", "LIMIT", "AND", "OR", "NOT", "IN", "LIKE", "BETWEEN", "DESC", "ASC"];
    return {
      suggestions: [
        ...Object.keys(schemat).map((t) => ({ label: t, kind: K.Class, insertText: t, range, detail: "tabela" })),
        ...Object.entries(schemat).flatMap(([t, kolumny]) => kolumny.map((k) => ({ label: k, kind: K.Field, insertText: k, range, detail: t }))),
        ...slowa.map((s) => ({ label: s, kind: K.Keyword, insertText: s, range })),
      ],
    };
  },
});

export default function EdytorKodu({ wartosc, jezyk, onZmiana, onUruchom, etykieta, pliki, schemat }: Props) {
  const miejsce = useRef<HTMLDivElement>(null);
  const edytor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const zwrotne = useRef({ onZmiana, onUruchom });
  zwrotne.current = { onZmiana, onUruchom };

  useEffect(() => {
    const model = monaco.editor.createModel(wartosc, jezyk);
    const e = monaco.editor.create(miejsce.current!, {
      model,
      theme: "sedno",
      fontSize: 14,
      fontFamily: "ui-monospace, SFMono-Regular, Consolas, 'Cascadia Code', monospace",
      tabSize: 4,
      insertSpaces: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      fixedOverflowWidgets: true,
      overflowWidgetsDomNode: warstwaWidzetow(),
      wordBasedSuggestions: jezyk === "python" ? "off" : "currentDocument",
      quickSuggestions: { other: true, comments: false, strings: true },
      suggestOnTriggerCharacters: true,
      renderLineHighlight: "line",
      padding: { top: 8, bottom: 8 },
      ariaLabel: etykieta,
      scrollbar: { alwaysConsumeMouseWheel: false },
    });
    edytor.current = e;
    e.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => zwrotne.current.onUruchom());

    let czas: ReturnType<typeof setTimeout> | undefined;
    const zmiany = model.onDidChangeContent(() => {
      zwrotne.current.onZmiana(model.getValue());
      if (jezyk !== "python") return;
      clearTimeout(czas);
      czas = setTimeout(() => void sprawdzSkladnie(model), 500);
    });
    if (jezyk === "python") {
      ustawPliki(model, pliki ?? {});
      // Wątek podpowiedzi rusza przy pierwszym fokusie, żeby nie ładować Pythona bez potrzeby.
      const fokus = e.onDidFocusEditorText(() => {
        rozgrzej(model);
        void sprawdzSkladnie(model);
        fokus.dispose();
      });
    }
    return () => {
      clearTimeout(czas);
      zmiany.dispose();
      e.dispose();
      model.dispose();
    };
    // Edytor powstaje raz na język; treść, pliki i schemat synchronizują efekty niżej.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jezyk]);

  useEffect(() => {
    const model = edytor.current?.getModel();
    if (model && pliki && jezyk === "python") ustawPliki(model, pliki);
  }, [pliki, jezyk]);

  useEffect(() => {
    const model = edytor.current?.getModel();
    if (model && schemat) schematy.set(model, schemat);
  }, [schemat]);

  // Zmiana z zewnątrz (np. wczytany postęp z konta) podmienia treść, gdy różni się od edytora.
  useEffect(() => {
    const model = edytor.current?.getModel();
    if (model && model.getValue() !== wartosc) model.setValue(wartosc);
  }, [wartosc]);

  return <div ref={miejsce} className={styles.edytor} />;
}
