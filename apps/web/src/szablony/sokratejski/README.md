# Tutor sokratejski

Szablon: `/szablony/sokratejski`, komponent `Sokratejski.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Format nauki: Pestka prowadzi ucznia pytaniami do zrozumienia jednej umiejętności i kończy mini-testem.

## Po co

Wykład łatwo przeczytać i zapomnieć. Pytania zmuszają ucznia do myślenia, a drabina podpowiedzi pilnuje, żeby Pestka nie dała gotowca.

## Jak działa

1. Cel rozmowy: jedna umiejętność z mapy.
2. Pytania Pestki dobierane do odpowiedzi ucznia.
3. Drabina podpowiedzi na żądanie ucznia.
4. Mini-test bez pomocy, wynik do mapy, rozbiór.
5. Propozycja zapisania pojęcia w mapie wiedzy.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Istniejąca rozmowa z Pestką (`views/Tutor.tsx`, `pestka.ts`).
- Drabina podpowiedzi: `docs/tryby-drabina.html`.

## Do zrobienia

- [ ] Tryb rozmowy „sokratejski” w `pestka.ts` (prompt: pytaj, nie wykładaj).
- [ ] Stan rozmowy: cel, użyte szczeble drabiny, liczba wymian.
- [ ] Panel drabiny obok okna rozmowy (na telefonie pod nim).
- [ ] Mini-test z wariantów silnika ćwiczeń i ocena z kluczem.
- [ ] Zapis dowodu z wagą zależną od użytej pomocy.
- [ ] Wyciąganie pojęć do mapy wiedzy (propozycja, zgoda ucznia).

## Otwarte pytania

- Ile wymian przed mini-testem i czy uczeń może go pominąć?

## Projekt

- `docs/nauka-tutor.html`
- `docs/tryby-drabina.html`
