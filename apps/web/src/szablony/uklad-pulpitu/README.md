# Układ pulpitu

Szablon: `/szablony/uklad-pulpitu`, komponent `UkladPulpitu.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Wybór gotowego układu (nauka, egzamin) i kolejności widgetów na pulpicie.

## Po co

Różni uczniowie potrzebują innego pulpitu: jeden chce propozycji, drugi tylko arkuszy i odliczania.

## Jak działa

1. Gotowe układy.
2. Lista widgetów: włącz, wyłącz, przeciągnij.
3. Podgląd na pulpicie, przywrócenie domyślnego.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Projekt: `docs/dash-uklad.html`, `docs/dashboard-widgety.html`.
- `views/Dashboard.tsx`.

## Do zrobienia

- [ ] Rozbicie pulpitu na widgety z rejestrem.
- [ ] Zapis układu na koncie.
- [ ] Przeciąganie z obsługą klawiatury.
- [ ] Gotowe układy „Nauka” i „Egzamin”.
- [ ] Decyzja: układ wspólny czy per przedmiot.

## Otwarte pytania

- Układ wspólny czy per przedmiot?

## Projekt

- `docs/dash-uklad.html`
- `docs/dashboard-widgety.html`
