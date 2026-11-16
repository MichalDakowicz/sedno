# Powtórki

Szablon: `/powtorki`, komponent `Powtorki.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Lista umiejętności, które zanikają, i konkretnych błędów do przećwiczenia. Zastępuje zaślepkę w menu.

## Po co

Bez powtórek opanowanie spada. Strona daje jedną krótką rzecz na dziś i resztę w kolejce.

## Jak działa

1. Jedna polecana powtórka na dziś (karta).
2. Zanikające umiejętności z czasem od ostatniego ćwiczenia.
3. Błędy z arkuszy i formatów do naprawienia.
4. Zrobione znikają i wracają przy spadku.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Model zanikania opanowania.
- Szybka runda i Napraw błąd jako formaty powtórki.
- Projekt: `docs/dash-powtorki.html`.

## Do zrobienia

- [ ] Model zanikania (spadek z czasem, parametry per umiejętność).
- [ ] Kolejka powtórek: waga na maturze razy spadek.
- [ ] Zbieranie błędów z arkuszy (`arkusze/sprawdz.ts`) i formatów.
- [ ] Start szybkiej rundy z kontekstem umiejętności.
- [ ] Oznaczanie zrobionych i ponowne pojawianie się.
- [ ] Przypomnienie o powtórce (opcjonalne, z ustawień).

## Otwarte pytania

- Ile powtórek dziennie najwyżej?

## Projekt

- `docs/dash-powtorki.html`
- `docs/nauka-rundy.html`
