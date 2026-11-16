# Mapa wiedzy

Szablon: `/szablony/mapa-wiedzy`, komponent `MapaWiedzy.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Prywatny notatnik ucznia jako graf: notatki to węzły, połączenia proponuje AI.

## Po co

Uczeń buduje własny obraz przedmiotu, a Pestka może się do niego odwoływać w rozmowie.

## Jak działa

1. Wyszukiwarka i filtr przedmiotu.
2. Graf notatek; połączenia od AI do zatwierdzenia.
3. Panel węzła z notatką i źródłem.
4. „Zapytaj Pestkę o to”.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Projekt: `docs/nauka-mapa-wiedzy.html`, `docs/dash-temat.html`.

## Do zrobienia

- [ ] Model danych: węzły, krawędzie, źródło, właściciel (RLS).
- [ ] Widok grafu i lista dla telefonu.
- [ ] Propozycje połączeń przez AI z zatwierdzaniem.
- [ ] Dodawanie notatek z rozmowy z Pestką.
- [ ] Kontekst węzła w rozmowie sokratejskiej.
- [ ] Eksport notatek (opcjonalnie).

## Otwarte pytania

- Czy mapa wiedzy wchodzi na konkurs, czy po nim?

## Projekt

- `docs/nauka-mapa-wiedzy.html`
