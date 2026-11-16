# Wyszukiwanie

Szablon: `/szablony/wyszukiwanie`, komponent `Wyszukiwanie.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Okno szybkiego przejścia (Ctrl+K): akcje, arkusze, umiejętności, rozmowy.

## Po co

Przy rosnącej liczbie arkuszy i umiejętności samo menu nie wystarcza. Pytanie pełnym zdaniem trafia do Pestki.

## Jak działa

1. Otwarcie z lupy w pasku albo Ctrl+K.
2. Wyniki w grupach; bez wpisania ostatnie i polecane.
3. Klawiatura: strzałki, Enter, Escape; pytanie do Pestki.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Projekt: `docs/dash-szukaj.html`.
- Lista arkuszy (`arkusze/dane.ts`).

## Do zrobienia

- [ ] Okno dialogowe z pułapką fokusu i skrótem Ctrl+K.
- [ ] Indeks: arkusze, umiejętności, akcje, rozmowy.
- [ ] Dopasowanie bez polskich znaków i z literówkami.
- [ ] Przekazanie pytania do Pestki.
- [ ] Lupa w pasku otwiera okno zamiast przechodzić na stronę szablonu.

## Projekt

- `docs/dash-szukaj.html`
