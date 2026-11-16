# Uczeń uczy AI

Szablon: `/szablony/uczen-uczy`, komponent `UczenUczy.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Format nauki: uczeń tłumaczy pojęcie Koledze (AI z personą), a drugi agent, Sędzia, ocenia wyjaśnienie.

## Po co

Tłumaczenie komuś innemu najszybciej pokazuje luki w rozumieniu. Kolega popełnia typowe błędy, a uczeń musi je wyłapać.

## Jak działa

1. Zadanie rundy: pojęcie i persona Kolegi.
2. Rozmowa: Kolega dopytuje i myli się celowo, nigdy nie podaje odpowiedzi sam.
3. Pole odpowiedzi ucznia.
4. Lista kontrolna Sędziego odhaczana na żywo (bez punktów).
5. Mini-test Kolegi na koniec: jego wynik to dowód skuteczności wyjaśnienia. Potem rozbiór.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Dwa agenty, Sędzia i Kolega: `docs/uczen-architektura.html`.
- Persony: `docs/uczen-persona.html`.
- Zasady bezpieczeństwa: `docs/uczen-bezpieczenstwo.html`.

## Do zrobienia

- [ ] Scenariusz rundy jako dane (pojęcie, typowe błędy, lista kontrolna).
- [ ] Prompt i stan Kolegi (persona, błędy do „popełnienia”).
- [ ] Sędzia: ocena każdej wypowiedzi ucznia, aktualizacja listy kontrolnej.
- [ ] Wykrywanie wklejonych gotowców i odpowiedzi nie na temat.
- [ ] Mini-test Kolegi i przeliczenie na dowód opanowania.
- [ ] Okno rozmowy na wspólnych komponentach z `TutorChat`.
- [ ] Przekazanie wyniku do ekranu rozbioru.

## Otwarte pytania

- Ile person i czy uczeń wybiera Kolegę sam?

## Projekt

- `docs/formaty-uczen-przeplyw.html`
- `docs/uczen-przyklad.html`
- `docs/uczen-dialog.html`
