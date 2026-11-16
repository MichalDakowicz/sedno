// Monaco (edytor z VS Code) dla warsztatu: kolorowanie Pythona i SQL, motyw w kolorach aplikacji
// i podpowiedzi Jedi z podpowiedzi.worker.ts. Ładowane leniwie razem z EdytorKodu.
import "monaco-editor/esm/vs/editor/edcore.main";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import "monaco-editor/esm/vs/basic-languages/sql/sql.contribution";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { czyCiemny, naZmianeMotywu } from "../motyw";
import type { BladSkladni, Odpowiedz, Podpowiedz, Sygnatura, Zapytanie } from "./podpowiedzi.worker";

(self as unknown as { MonacoEnvironment: { getWorker: () => Worker } }).MonacoEnvironment = { getWorker: () => new EditorWorker() };

monaco.editor.defineTheme("sedno", {
  base: "vs",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6b7280", fontStyle: "italic" },
    { token: "keyword", foreground: "c2410c" },
    { token: "string", foreground: "17804f" },
    { token: "number", foreground: "2f55b4" },
  ],
  colors: {
    "editor.background": "#ffffff",
    "editor.lineHighlightBackground": "#fff4ef",
    "editorLineNumber.foreground": "#9aa0a6",
    "editorLineNumber.activeForeground": "#0f151d",
    "editorCursor.foreground": "#0f151d",
    "editor.selectionBackground": "#ffd9cb",
    // Zaznaczona podpowiedź: ciemny tekst na jasnym pomarańczu (domyślnie biały tekst byłby nieczytelny).
    "editorSuggestWidget.selectedBackground": "#ffe6dc",
    "editorSuggestWidget.selectedForeground": "#0f151d",
    "editorSuggestWidget.selectedIconForeground": "#0f151d",
    "editorSuggestWidget.highlightForeground": "#c2410c",
    "editorSuggestWidget.focusHighlightForeground": "#c2410c",
    "list.activeSelectionBackground": "#ffe6dc",
    "list.activeSelectionForeground": "#0f151d",
    "list.focusBackground": "#ffe6dc",
    "list.focusForeground": "#0f151d",
    "list.hoverBackground": "#fff4ef",
  },
});

// Wersja ciemna w kolorach docs/style.css (ciemny blok tokens.css): powierzchnia #1b232e, tekst #f3efec.
monaco.editor.defineTheme("sedno-ciemny", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "8b95a1", fontStyle: "italic" },
    { token: "keyword", foreground: "ffab8a" },
    { token: "string", foreground: "4fcf92" },
    { token: "number", foreground: "9db8ff" },
  ],
  colors: {
    "editor.background": "#1b232e",
    "editor.foreground": "#f3efec",
    "editor.lineHighlightBackground": "#3a221940",
    "editorLineNumber.foreground": "#8a929c",
    "editorLineNumber.activeForeground": "#f3efec",
    "editorCursor.foreground": "#ff8a5f",
    "editor.selectionBackground": "#5a3626",
    "editorSuggestWidget.background": "#1b232e",
    "editorSuggestWidget.selectedBackground": "#3a2219",
    "editorSuggestWidget.selectedForeground": "#f3efec",
    "editorSuggestWidget.selectedIconForeground": "#f3efec",
    "editorSuggestWidget.highlightForeground": "#ffab8a",
    "editorSuggestWidget.focusHighlightForeground": "#ffab8a",
    "list.activeSelectionBackground": "#3a2219",
    "list.activeSelectionForeground": "#f3efec",
    "list.focusBackground": "#3a2219",
    "list.focusForeground": "#f3efec",
    "list.hoverBackground": "#2a3340",
  },
});

/** Motyw edytora zgodny z ustawieniem systemu. */
export const motywEdytora = () => (czyCiemny() ? "sedno-ciemny" : "sedno");
// setTheme dotyczy wszystkich edytorów naraz, więc jeden nasłuch na cały moduł wystarcza.
naZmianeMotywu(() => monaco.editor.setTheme(motywEdytora()));

export { monaco };

// ——— Klient wątku podpowiedzi ———

let watek: Worker | null = null;
let licznik = 0;
const czekajace = new Map<number, (w: unknown) => void>();
let pliki: Record<string, string> | null = null;

// Omit rozdzielony na warianty unii (zwykły Omit na unii gubi pola wariantów).
type BezId<T> = T extends unknown ? Omit<T, "id"> : never;

function zapytaj<T>(z: BezId<Zapytanie>): Promise<T | null> {
  watek ??= Object.assign(new Worker(new URL("./podpowiedzi.worker.ts", import.meta.url), { type: "module" }), {
    onmessage: (e: MessageEvent<Odpowiedz>) => {
      czekajace.get(e.data.id)?.(e.data.wynik);
      czekajace.delete(e.data.id);
    },
  });
  const id = ++licznik;
  return new Promise((ok) => {
    czekajace.set(id, ok as (w: unknown) => void);
    watek!.postMessage({ ...z, id } as Zapytanie);
  });
}

// Pliki danych modelu (zadania); przed zapytaniem o model z innymi plikami wysyłamy jego pliki.
const plikiModeli = new WeakMap<monaco.editor.ITextModel, Record<string, string>>();
export function ustawPliki(model: monaco.editor.ITextModel, p: Record<string, string>) {
  plikiModeli.set(model, p);
}
function zModelu(model: monaco.editor.ITextModel) {
  const p = plikiModeli.get(model) ?? {};
  if (p !== pliki) {
    pliki = p;
    void zapytaj({ typ: "pliki", pliki: p });
  }
}

/** Uruchamia wątek podpowiedzi zawczasu, żeby pierwsza podpowiedź nie czekała na załadowanie Pythona. */
export function rozgrzej(model: monaco.editor.ITextModel) {
  zModelu(model);
}

const pozycja = (model: monaco.editor.ITextModel, p: monaco.Position) => {
  zModelu(model);
  return { kod: model.getValue(), linia: p.lineNumber, kolumna: p.column - 1 };
};

const RODZAJ: Record<string, monaco.languages.CompletionItemKind> = {
  function: monaco.languages.CompletionItemKind.Function,
  class: monaco.languages.CompletionItemKind.Class,
  module: monaco.languages.CompletionItemKind.Module,
  instance: monaco.languages.CompletionItemKind.Variable,
  statement: monaco.languages.CompletionItemKind.Variable,
  param: monaco.languages.CompletionItemKind.Variable,
  keyword: monaco.languages.CompletionItemKind.Keyword,
  property: monaco.languages.CompletionItemKind.Property,
  path: monaco.languages.CompletionItemKind.File,
};

monaco.languages.registerCompletionItemProvider("python", {
  triggerCharacters: [".", '"', "'", "/"],
  async provideCompletionItems(model, position) {
    const wynik = await zapytaj<Podpowiedz[]>({ typ: "uzupelnij", ...pozycja(model, position) });
    // Odpowiedź wątku przychodzi asynchronicznie; edytor mógł zniknąć w międzyczasie (zmiana widoku).
    if (model.isDisposed()) return { suggestions: [] };
    const slowo = model.getWordUntilPosition(position);
    const range = new monaco.Range(position.lineNumber, slowo.startColumn, position.lineNumber, slowo.endColumn);
    return {
      suggestions: (wynik ?? []).map((p, i) => ({
        label: p.nazwa,
        kind: RODZAJ[p.rodzaj] ?? monaco.languages.CompletionItemKind.Text,
        detail: p.opis,
        documentation: p.dok || undefined,
        insertText: p.nazwa,
        range,
        sortText: String(i).padStart(4, "0"),
      })),
    };
  },
});

monaco.languages.registerSignatureHelpProvider("python", {
  signatureHelpTriggerCharacters: ["(", ","],
  signatureHelpRetriggerCharacters: [","],
  async provideSignatureHelp(model, position) {
    const wynik = await zapytaj<Sygnatura[]>({ typ: "sygnatura", ...pozycja(model, position) });
    if (!wynik?.length || model.isDisposed()) return null;
    return {
      value: {
        signatures: wynik.map((s) => ({ label: s.etykieta, documentation: s.dok || undefined, parameters: s.parametry.map((p) => ({ label: p })) })),
        activeSignature: 0,
        activeParameter: Math.max(0, wynik[0].aktywny),
      },
      dispose() {},
    };
  },
});

monaco.languages.registerHoverProvider("python", {
  async provideHover(model, position) {
    const wynik = await zapytaj<{ naglowek: string; dok: string }[]>({ typ: "opis", ...pozycja(model, position) });
    const o = wynik?.[0];
    if (!o || model.isDisposed()) return null;
    return { contents: [{ value: "```python\n" + o.naglowek + "\n```" }, ...(o.dok ? [{ value: o.dok.replace(/\n/g, "  \n") }] : [])] };
  },
});

/** Błędy składni na żywo (czerwone podkreślenie jak w VS Code). */
export async function sprawdzSkladnie(model: monaco.editor.ITextModel) {
  const wynik = await zapytaj<BladSkladni[]>({ typ: "bledy", kod: model.getValue(), linia: 1, kolumna: 0 });
  if (!wynik || model.isDisposed()) return;
  monaco.editor.setModelMarkers(
    model,
    "jedi",
    wynik.map((b) => ({
      severity: monaco.MarkerSeverity.Error,
      message: b.tekst.replace(/^SyntaxError: /, "Błąd składni: "),
      startLineNumber: b.linia,
      startColumn: b.kolumna + 1,
      endLineNumber: b.doLinii,
      endColumn: Math.max(b.doKolumny + 1, b.kolumna + 2),
    })),
  );
}
