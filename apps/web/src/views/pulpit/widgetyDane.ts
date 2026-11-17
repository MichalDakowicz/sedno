// Dane widgetów pulpitu bez Reacta i komponentów: z nich korzysta magazyn układu (konto/ukladPulpitu.ts),
// więc nie może ciągnąć za sobą widoków. Kolejność wpisów jest domyślną kolejnością na pulpicie i w ustawieniach;
// pola `nauka` i `egzamin` mówią, czy gotowy układ włącza widget. Komponenty są przypisane w widgety.ts.
// Widgetów, których aplikacja jeszcze nie ma („Powtórki”, „Wybierz temat”), tu nie ma.

export type WidgetDane = {
  id: string;
  nazwa: string;
  opis: string;
  /** Stały widget jest zawsze na górze i nie da się go wyłączyć ani przesunąć. */
  staly?: boolean;
  /** Gdy jest pierwszym włączonym widgetem, staje w kolumnie obok „Dziś warto”. */
  obok?: boolean;
  /** Włączony w gotowym układzie „Nauka” / „Egzamin”. */
  nauka: boolean;
  egzamin: boolean;
};

export const WIDGETY_DANE: WidgetDane[] = [
  { id: "dzis", nazwa: "Dziś warto", opis: "Rekomendacja na dziś", staly: true, nauka: true, egzamin: true },
  { id: "wyniki", nazwa: "Wyniki z arkuszy", opis: "Średnia i ostatnie arkusze", obok: true, nauka: true, egzamin: true },
  { id: "matura", nazwa: "Do matury", opis: "Odliczanie do egzaminów", nauka: false, egzamin: true },
  { id: "mapa", nazwa: "Mapa umiejętności", opis: "Najsłabsze umiejętności przedmiotu", nauka: true, egzamin: false },
];
