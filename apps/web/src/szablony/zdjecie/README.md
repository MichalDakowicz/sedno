# Analiza zdjęcia

Szablon: `/szablony/zdjecie`, komponent `Zdjecie.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Uczeń wrzuca zdjęcie rozwiązania z kartki, Sedno je odczytuje, a Pestka omawia.

## Po co

Maturę pisze się ręcznie. Uczeń może ćwiczyć na papierze i mimo to dostać omówienie.

## Jak działa

1. Wybór zadania.
2. Zdjęcie albo plik, kadrowanie.
3. Odczyt do poprawienia przez ucznia.
4. Omówienie krok po kroku bez gotowca.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- OCR pisma (repozytorium kolegi, do ustalenia).
- Omówienie błędów (`OmowienieBledow.tsx`).
- Eksport brudnopisu (`exportToBlob`).

## Do zrobienia

- [ ] Wybór zadania z arkusza albo opis własnego.
- [ ] Aparat i wysyłanie pliku z kompresją, kadrowanie.
- [ ] OCR i model (wzory do LaTeX).
- [ ] Widok odczytu z poprawianiem.
- [ ] Omówienie Pestki w trybie sokratejskim.
- [ ] Zdjęcia w prywatnym buckecie albo bez przechowywania.

## Otwarte pytania

- Czy przechowujemy zdjęcia, czy tylko odczyt?

## Projekt

- `NASTEPNE.md (pomysł „Analiza zdjęcia”)`
