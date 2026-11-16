# Szybka runda

Szablon: `/szablony/szybka-runda`, komponent `SzybkaRunda.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Format nauki: 3–5 minut krótkich wariantów zadań z jednej umiejętności, z natychmiastową odpowiedzią.

## Po co

Krótka forma na codzienne powtórki i rozgrzewkę. Główne wejście to powtórki zanikających umiejętności.

## Jak działa

1. Zegar informacyjny, runda nie urywa się w połowie zadania.
2. 5–8 wariantów jednej umiejętności.
3. Sprawdzenie od razu z jednym zdaniem wyjaśnienia.
4. Seria skraca rundę, błąd dokłada wariant.
5. Krótki rozbiór i zmiana poziomu.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Silnik wariantów (nigdy te same pytania): `docs/tryby-warianty.html`.
- Sprawdzanie bez AI z klucza (`arkusze/sprawdz.ts`).
- Zegar (`components/Zegar.tsx`).

## Do zrobienia

- [ ] Generator wariantów zadań per umiejętność i ich klucze.
- [ ] Kolejka zadań rundy z regułą serii i błędów.
- [ ] Widok zadania: zamknięte, luki, nagranie (`Nagranie.tsx`).
- [ ] Natychmiastowe sprawdzenie i jedno zdanie wyjaśnienia (z klucza albo AI).
- [ ] Zapis wyniku do mapy umiejętności i do modelu zanikania.
- [ ] Krótka wersja ekranu rozbioru.

## Otwarte pytania

- Czy rundę liczymy jako dowód opanowania z pełną wagą, skoro zadania są krótkie?

## Projekt

- `docs/nauka-rundy.html`
- `docs/tryby-czas.html`
