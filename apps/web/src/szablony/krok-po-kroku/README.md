# Krok po kroku

Szablon: `/szablony/krok-po-kroku`, komponent `KrokPoKroku.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Format nauki: dłuższa odpowiedź (wypracowanie, rozwiązanie wieloetapowe) budowana etapami z listą kontrolną z rubryki.

## Po co

Uczeń widzi, czego wymaga rubryka, zanim skończy pisać, a pomoc stopniowo znika, aż pisze sam jak na egzaminie.

## Jak działa

1. Etapy pracy (plan, wstęp, rozwinięcie, zakończenie, przegląd).
2. Polecenie zawsze nad edytorem.
3. Edytor etapu z licznikiem słów.
4. Lista kontrolna oceniana na żywo słownie.
5. Wygaszanie pomocy w kolejnych pracach.
6. Przegląd, oddanie, ocena z rubryki, rozbiór.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Rubryka jako dane: `docs/ocena-rubryka.html`.
- Istniejący edytor `components/Wypracowanie.tsx`.
- Wygaszanie: `docs/krok-wygaszanie-projekt.html`.

## Do zrobienia

- [ ] Etapy i przejścia jako dane per typ pracy: `docs/krok-etapy.html`.
- [ ] Edytor etapu na bazie `Wypracowanie.tsx` (licznik, tryb skupienia).
- [ ] Ocena elementów listy na żywo (z opóźnieniem, tanim modelem): `docs/krok-ocena.html`.
- [ ] Poziomy wygaszania pomocy zapisane per uczeń i typ pracy.
- [ ] Ekran przeglądu i oddanie z pełną oceną: `docs/krok-oddanie.html`.
- [ ] Odmiana dla matematyki (rozwiązanie krok po kroku).
- [ ] Zapis szkicu w postępie (jak w arkuszach).

## Otwarte pytania

- Statusy listy: tylko słowne czy z opcją punktów?

## Projekt

- `docs/formaty-krok-przeplyw.html`
- `docs/krok-przyklad.html`
- `docs/krok-ekran.html`
