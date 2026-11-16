# Ekran rozbioru

Szablon: `/szablony/rozbior`, komponent `Rozbior.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Wspólne podsumowanie po każdej sesji nauki: wynik, co poszło, zmiana na mapie, następny krok.

## Po co

Zamyka pętlę nauki: uczeń widzi, co się zmieniło, a Sedno od razu proponuje następny krok, zamiast wyrzucać na pulpit.

## Jak działa

1. Wynik jednym zdaniem.
2. Co poszło i co nie, w typach błędu z rubryki.
3. Zmiana opanowania przed i po.
4. Jeden polecany następny krok i alternatywy; błędy idą do powtórek.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Sześć typów błędu: `docs/ocena-typy.html`.
- Rozbiory w formatach: `docs/blad-rozbior.html`, `docs/uczen-rozbior.html`, `docs/krok-ekran.html`.
- `components/OmowienieBledow.tsx` z arkuszy.

## Do zrobienia

- [ ] Wspólny model wyniku sesji (format, umiejętności, dowody, błędy).
- [ ] Komponent ekranu z miejscem na środek specyficzny dla formatu.
- [ ] Zmiana opanowania przed i po z modelu umiejętności.
- [ ] Reguła następnego kroku (format i umiejętność).
- [ ] Dodawanie błędów do powtórek.
- [ ] Omówienie z Pestką (jak `OmowienieBledow`).

## Otwarte pytania

- Czy pokazywać punkty, czy tylko opis słowny?

## Projekt

- `docs/ocena-feedback.html`
- `docs/ocena-niepewnosc.html`
