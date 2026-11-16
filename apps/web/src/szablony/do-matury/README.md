# Plan do matury

Szablon: `/szablony/do-matury`, komponent `DoMatury.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Odliczanie do egzaminu, prognoza wyniku względem celu i plan tygodnia.

## Po co

Uczeń wie, ile ma czasu i co robić dziś, a plan sam się przelicza, gdy coś się zmieni.

## Jak działa

1. Odliczanie do pierwszego egzaminu.
2. Prognoza względem celu z profilu.
3. Plan tygodnia z czasu i słabych umiejętności.
4. Zmiana planu rozmową z Pestką.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Daty egzaminów z harmonogramu CKE (do weryfikacji co roku; data w szablonie jest przykładowa).
- Profil ucznia (czas, cel, priorytety).
- Projekt: `docs/dash-matura.html`.

## Do zrobienia

- [ ] Daty sesji per przedmiot i poziom (dziś `dniDoMatury` w `konto/przedmioty.ts`).
- [ ] Prognoza wyniku z mapy umiejętności i wag.
- [ ] Generator planu tygodnia (czas, priorytety, zanikanie).
- [ ] Przesuwanie dni i zapis zmian.
- [ ] Narzędzie Pestki do zmiany planu i priorytetów.
- [ ] Widget „Do matury” na pulpicie.

## Otwarte pytania

- Plan opcjonalny czy zawsze widoczny (decyzja otwarta w `NASTEPNE.md`)?

## Projekt

- `docs/dash-matura.html`
