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
    slug: "napraw-blad",
    tytul: "Napraw błąd",
    opis: "Praca z wstrzykniętymi błędami: uczeń je znajduje, nazywa i poprawia.",
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
    slug: "wizualizacje",
    tytul: "Wizualizacje",
    opis: "Interaktywny model do pojęcia: wykres z suwakiem, algorytm krok po kroku.",
    grupa: "Nauka",
    dalej: ["szybka-runda"],
    wejscie: "Nauka",
  },
  {
    slug: "mapa-wiedzy",
    tytul: "Mapa wiedzy",
    opis: "Prywatny notatnik ucznia jako węzły i połączenia między pojęciami.",
    grupa: "Postęp",
    dalej: ["sokratejski"],
    wejscie: "Pulpit: „Wybierz temat”",
  },
];

export const GRUPY: Grupa[] = ["Nauka", "Postęp", "Konto i narzędzia"];

export function szablon(slug: string) {
  return SZABLONY.find((s) => s.slug === slug);
}

export const WDROZONE: Record<string, { to: string; tytul: string; opis: string }> = {
  nauka: { to: "/nauka", tytul: "Nauka", opis: "Wybierz umiejętność i format." },
  "uczen-uczy": { to: "/nauka/uczen-uczy", tytul: "Uczeń uczy AI", opis: "Wytłumacz Koledze, jak działa angielska reguła." },
  "szybka-runda": { to: "/nauka/runda", tytul: "Szybka runda", opis: "Krótka runda jednej umiejętności." },
  rozbior: { to: "/nauka", tytul: "Rozbiór po rundzie", opis: "Po zakończeniu rundy zobacz wynik i zmianę opanowania." },
  umiejetnosci: { to: "/umiejetnosci", tytul: "Mapa umiejętności", opis: "Sprawdź opanowanie i przejrzyj dowody." },
  "zdjecie": { to: "/nauka/zdjecie", tytul: "Zdjęcie z kartki", opis: "Pestka czyta rozwiązanie z kartki i wskazuje krok do sprawdzenia." },
  "sokratejski": { to: "/nauka/sokratejski", tytul: "Rozmowa z pytaniami", opis: "Pestka pyta o jedną umiejętność, na końcu mini-test." },
  powtorki: { to: "/powtorki", tytul: "Powtórki", opis: "Wróć do błędu albo umiejętności, która zanika." },
};

export function adres(slug: string) {
  return WDROZONE[slug]?.to ?? `/szablony/${slug}`;
}
