# Profil ucznia

Szablon: `/szablony/profil-ucznia`, komponent `ProfilUcznia.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Jak uczeń się uczy, ile ma czasu, jaki ma cel i priorytety, plus to, co Sedno wie z wyników.

## Po co

Profil zasila rekomendacje i plan. Uczeń widzi, co o nim wiemy, i może to zmienić albo usunąć.

## Jak działa

1. Pytania o sposób nauki (do pominięcia).
2. Czas dziennie i cel.
3. Priorytety, także dopisane przez Pestkę.
4. Wnioski z wyników do odczytu i usunięcia.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Onboarding (`views/Onboarding.tsx`).
- Tabela profilu w Supabase.
- Projekt: `docs/struktura-dane-ucznia.html`.

## Do zrobienia

- [ ] Pytania w onboardingu (krótko, z pomijaniem).
- [ ] Kolumny albo tabela profilu: styl nauki, czas, cel, priorytety (migracja).
- [ ] Wnioski liczone z arkuszy (tempo, mocne i słabe strony).
- [ ] Narzędzie Pestki do zapisu priorytetu z rozmowy, z widoczną informacją dla ucznia.
- [ ] Usuwanie wniosków i zgody (dane niepełnoletnich, do weryfikacji prawnej).

## Otwarte pytania

- Zakres danych o uczniu a RODO i zgoda opiekuna.

## Projekt

- `docs/struktura-dane-ucznia.html`
- `docs/dash-start.html`
