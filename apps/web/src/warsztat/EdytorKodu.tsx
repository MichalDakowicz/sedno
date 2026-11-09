// Edytor kodu w warsztacie: Monaco, czyli edytor z VS Code. Python z podpowiedziami Jedi (nazwy,
// metody, pliki z danymi, parametry funkcji, opis pod kursorem, błędy składni na żywo), SQL
// z kolorowaniem i nazwami tabel i kolumn. Ctrl+Enter uruchamia.
import { memo, useEffect, useRef } from "react";
import { monaco, rozgrzej, sprawdzSkladnie, ustawPliki } from "./monaco";
import styles from "./Warsztat.module.css";

type Props = {
  wartosc: string;
  jezyk: "python" | "sql";
  onZmiana: (kod: string) => void;
  onUruchom: (kod: string) => void;
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

function EdytorKodu({ wartosc, jezyk, onZmiana, onUruchom, etykieta, pliki, schemat }: Props) {
  const miejsce = useRef<HTMLDivElement>(null);
  const edytor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const zwrotne = useRef({ onZmiana, onUruchom });
  zwrotne.current = { onZmiana, onUruchom };
  const wyslane = useRef(wartosc);

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
      // Edytor dopasowuje się do panelu: długie linie zawijamy, poziomego przewijania nie ma.
      wordWrap: "on",
      wrappingIndent: "same",
      scrollbar: { alwaysConsumeMouseWheel: false, horizontal: "hidden" },
    });
    edytor.current = e;
    // Zapis do postępu przerenderowuje cały arkusz, więc idzie dopiero po chwili bez pisania
    // (i od razu przy wyjściu z edytora, uruchomieniu i zamknięciu).
    let zapis: ReturnType<typeof setTimeout> | undefined;
    const wyslij = () => {
      clearTimeout(zapis);
      const kod = model.getValue();
      if (kod === wyslane.current) return;
      wyslane.current = kod;
      zwrotne.current.onZmiana(kod);
    };
    e.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      wyslij();
      zwrotne.current.onUruchom(model.getValue());
    });
    const rozmycie = e.onDidBlurEditorText(wyslij);

    let czas: ReturnType<typeof setTimeout> | undefined;
    const zmiany = model.onDidChangeContent(() => {
      clearTimeout(zapis);
      zapis = setTimeout(wyslij, 600);
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
      wyslij();
      rozmycie.dispose();
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

  // Zmiana z zewnątrz (np. wczytany postęp z konta) podmienia treść. Wartość, którą edytor sam
  // wysłał, nie wraca do niego (przy opóźnionym zapisie cofnęłaby świeżo wpisane znaki).
  useEffect(() => {
    const model = edytor.current?.getModel();
    if (model && wartosc !== wyslane.current && model.getValue() !== wartosc) {
      wyslane.current = wartosc;
      model.setValue(wartosc);
    }
  }, [wartosc]);

  return <div ref={miejsce} className={styles.edytor} />;
}

// Rerender strony (np. po zapisie postępu) nie dotyka edytora, dopóki nie zmienią się jego dane.
export default memo(EdytorKodu, (a, b) => a.wartosc === b.wartosc && a.jezyk === b.jezyk && a.pliki === b.pliki && a.schemat === b.schemat && a.etykieta === b.etykieta);
