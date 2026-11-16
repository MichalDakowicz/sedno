# Ustawienia

Szablon: `/szablony/ustawienia`, komponent `Ustawienia.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Wygląd, dostępność, zachowanie Pestki i powiadomienia.

## Po co

Jedno miejsce na preferencje, których dziś nie ma albo są rozproszone (ciemny motyw, mniej ruchu).

## Jak działa

1. Motyw i rozmiar tekstu, działa od razu.
2. Dostępność, domyślnie z systemu.
3. Pestka: sama czy na wezwanie, długość odpowiedzi.
4. Powiadomienia, domyślnie wyłączone.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Projekt: `docs/dashboard-ustawienia.html`, `docs/dash-dostepnosc.html`.
- Tokeny (`packages/ui`): ciemny motyw wymaga zestawu tokenów.

## Do zrobienia

- [ ] Ciemny motyw w tokenach aplikacji (dziś tylko w `docs/`).
- [ ] Skala tekstu przez zmienną CSS.
- [ ] „Mniej ruchu” niezależnie od systemu.
- [ ] Ustawienia Pestki czytane przez `TutorContext`.
- [ ] Powiadomienia (web push, wykonalność do weryfikacji).
- [ ] Zapis ustawień na koncie.

## Projekt

- `docs/dashboard-ustawienia.html`
- `docs/dash-dostepnosc.html`
