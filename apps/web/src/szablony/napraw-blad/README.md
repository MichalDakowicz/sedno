# Napraw błąd

Szablon: `/szablony/napraw-blad`, komponent `NaprawBlad.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Format nauki: uczeń dostaje cudzą pracę z wstrzykniętymi błędami, znajduje je, nazywa typ i poprawia.

## Po co

Znajdowanie błędów w cudzym tekście uczy patrzeć na własny jak egzaminator. To jeden z trzech formatów z pełnym projektem w dokumentacji.

## Jak działa

1. Pasek: ile błędów jest w pracy, ile znalezionych (liczba jawna).
2. Praca do poprawy; zaznaczanie fragmentu przeciągnięciem.
3. Panel zaznaczenia: typ błędu (sześć typów z rubryki) i poprawka.
4. Lista poprawek z oceną: trafione, częściowo, fałszywe trafienie.
5. „Podpowiedz” schodzi po drabinie: akapit, zdanie, typ. Każdy szczebel obniża wagę dowodu.
6. „Oddaj” prowadzi na ekran rozbioru.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Generator prac z błędami i weryfikacja (brak błędów dodatkowych): `docs/blad-generator.html`.
- Model danych pracy: `docs/blad-model.html`.
- Ocena poprawki: AI klasyfikuje, kod liczy (`docs/ocena-zasada.html`).

## Do zrobienia

- [ ] Model danych pracy i błędów (pozycje w tekście, typ, poprawne warianty).
- [ ] Zaznaczanie tekstu z dopasowaniem do błędu (tolerancja granic): `docs/blad-zaznaczanie.html`.
- [ ] Panel typu i poprawki, na telefonie jako arkusz od dołu.
- [ ] Ocena poprawki przez AI z kaskadą reguł, punkty w kodzie.
- [ ] Drabina podpowiedzi i zapis jej użycia w dowodzie.
- [ ] Generator prac, weryfikacja i kolejka zatwierdzonych prac.
- [ ] Dobór pracy do poziomu ucznia: `docs/blad-dobor.html`.
- [ ] Zapis sesji i przekazanie do ekranu rozbioru.
- [ ] Odmiany dla matematyki i informatyki (błąd w rozwiązaniu, w kodzie).

## Otwarte pytania

- Kto zatwierdza wygenerowane prace przed pokazaniem uczniom?
- Czy liczba błędów zawsze jawna, czy ukryta na wyższych poziomach?

## Projekt

- `docs/formaty-blad-przeplyw.html`
- `docs/blad-przyklad.html`
- `docs/blad-rozbior.html`
