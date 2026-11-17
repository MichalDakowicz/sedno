// Spis pustych prototypów widoków. `dalej` to następne kroki w ścieżce nauki: z nich powstają linki
// „Dalej w ścieżce” na dole każdego szablonu i schemat na stronie spisu.

export type Grupa = "Nauka" | "Postęp" | "Konto i narzędzia";

export type Szablon = {
  slug: string;
  tytul: string;
  opis: string;
  grupa: Grupa;
  dalej: string[];
  /** Gdzie w działającej aplikacji jest wejście do tego widoku. */
  wejscie: string;
};

export const SZABLONY: Szablon[] = [
  {
    slug: "nauka",
    tytul: "Nauka",
    opis: "Wybór formatu nauki dla umiejętności albo wolnego tematu.",
    grupa: "Nauka",
    dalej: ["napraw-blad", "uczen-uczy", "krok-po-kroku", "sokratejski", "szybka-runda", "wizualizacje"],
    wejscie: "Menu: Nauka; pulpit: „Dziś warto”",
  },
  {
    slug: "napraw-blad",
    tytul: "Napraw błąd",
    opis: "Praca z wstrzykniętymi błędami: uczeń je znajduje, nazywa i poprawia.",
    grupa: "Nauka",
    dalej: ["rozbior"],
    wejscie: "Nauka",
  },
  {
    slug: "uczen-uczy",
    tytul: "Uczeń uczy AI",
    opis: "Uczeń tłumaczy pojęcie Koledze, Sędzia ocenia wyjaśnienie.",
    grupa: "Nauka",
    dalej: ["rozbior"],
    wejscie: "Nauka",
  },
  {
    slug: "krok-po-kroku",
    tytul: "Krok po kroku",
    opis: "Budowanie dłuższej odpowiedzi z listą kontrolną i wygaszaną pomocą.",
    grupa: "Nauka",
    dalej: ["rozbior"],
    wejscie: "Nauka",
  },
  {
    slug: "sokratejski",
    tytul: "Tutor sokratejski",
    opis: "Pestka prowadzi pytaniami zamiast wykładu i kończy mini-testem.",
    grupa: "Nauka",
    dalej: ["rozbior", "mapa-wiedzy"],
    wejscie: "Nauka; rozmowa z Pestką",
  },
  {
    slug: "szybka-runda",
    tytul: "Szybka runda",
    opis: "3–5 minut wariantów zadań z jednej umiejętności.",
    grupa: "Nauka",
    dalej: ["rozbior"],
    wejscie: "Nauka; Powtórki",
  },
  {
    slug: "wizualizacje",
    tytul: "Wizualizacje",
    opis: "Interaktywny model do pojęcia: wykres z suwakiem, algorytm krok po kroku.",
    grupa: "Nauka",
    dalej: ["szybka-runda"],
    wejscie: "Nauka",
  },
  {
    slug: "rozbior",
    tytul: "Ekran rozbioru",
    opis: "Podsumowanie po sesji: co poszło, co nie, wpływ na mapę i następny krok.",
    grupa: "Nauka",
    dalej: ["umiejetnosci", "powtorki"],
    wejscie: "Koniec każdego formatu",
  },
  {
    slug: "umiejetnosci",
    tytul: "Mapa umiejętności",
    opis: "Opanowanie umiejętności przedmiotu z kodami wymagań w drugim planie.",
    grupa: "Postęp",
    dalej: ["nauka", "powtorki"],
    wejscie: "Menu: Mapa umiejętności",
  },
  {
    slug: "powtorki",
    tytul: "Powtórki",
    opis: "Umiejętności, które zanikają, i błędy do przećwiczenia.",
    grupa: "Postęp",
    dalej: ["szybka-runda", "napraw-blad"],
    wejscie: "Menu: Powtórki; pulpit",
  },
  {
    slug: "mapa-wiedzy",
    tytul: "Mapa wiedzy",
    opis: "Prywatny notatnik ucznia jako węzły i połączenia między pojęciami.",
    grupa: "Postęp",
    dalej: ["sokratejski"],
    wejscie: "Pulpit: „Wybierz temat”",
  },
  {
    slug: "zdjecie",
    tytul: "Analiza zdjęcia",
    opis: "Zdjęcie rozwiązania z kartki, które Pestka czyta i omawia.",
    grupa: "Konto i narzędzia",
    dalej: ["rozbior"],
    wejscie: "Arkusz: zadanie otwarte; rozmowa z Pestką",
  },
];

export const GRUPY: Grupa[] = ["Nauka", "Postęp", "Konto i narzędzia"];

export function szablon(slug: string) {
  return SZABLONY.find((s) => s.slug === slug);
}

/** Szablony, które mają własny adres w menu aplikacji zamiast `/szablony/:slug`. */
export const ADRES_W_MENU: Record<string, string> = {
  nauka: "/nauka",
  umiejetnosci: "/umiejetnosci",
  powtorki: "/powtorki",
};

export function adres(slug: string) {
  return ADRES_W_MENU[slug] ?? `/szablony/${slug}`;
}
