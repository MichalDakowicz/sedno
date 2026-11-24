# QA treści arkuszy (cel 4, 23 listopada 2026)

Robocza lista błędów z dwóch testów (Terra, Haiku) gałęzi `wszystkie-matury`. Do rundy poprawek importu; usunąć po naprawie.

## Klasy błędów (naprawiać we wspólnym parserze, nie per arkusz)

1. **Brak tekstów źródłowych sprzed zadań.** Filozofia 2025 (Timajos, s. 4–5, zad. 1–2), filozofia 2024 f2015 (Pascal, s. 4–5, zad. 1–4), polski 2025 cz. 2 (lista lektur s. 3–4, zad. 15). Blocker.
2. **Ułamki i piętrowe zapisy rozbite na akapity.** Matematyka R 2025 zad. 2 (b ≠ ½a), zad. 3 ((√3−1)/2); matematyka R 2024 f2015 zad. 1 (opcje A–D to ułamki, pytanie wyszło jako otwarte). Fizyka 2024 f2015 zad. 12 (nuklidy ¹⁸₉F, mF, N0, Nr: indeksy jako osobne akapity). Fizyka 2025 zad. 6, 8 („4p1”, „g g”, „P A”). Blocker/major.
3. **Etykiety osi i wykresów poza kadrem, powtórzone jako luźne akapity.** Fizyka 2025 zad. 6 (Wykres 1, osie), zad. 1 (ucięte etykiety osi y); fizyka 2024 f2015 zad. 12 (osie poza obrazem). Biologia 2025 zad. 4 („nasiona” pod rysunkiem). Major.
4. **Rysunki ucięte na brzegach.** Biologia 2025 zad. 7 (dół), zad. 14 (góra, prawo, dół); historia 2024 f2015 zad. 11 (genealogia: pasek 952×36 i drzewo), zad. 25 (legenda mapy z prawej). Major.
5. **Wzory w kluczu nieczytelne.** Chemia 2025 zad. 2.1 (równanie jądrowe w przykładowym rozwiązaniu). Major.
6. Drobne: geografia 2025 zad. 1 mapa obrócona o 90° (sprawdzić orientację strony PDF); historia 2025 zad. 25 `zasadyStrona` wskazuje stronę bez tekstu zasad; `zasadyStrona` zwykle wskazuje stronę z nagłówkiem, a zasady są na następnej; pytania zamknięte mają pustą `tresc` (sprawdzić, czy aplikacja pokazuje polecenie z bloków obok).

## Niesprawdzone dogłębnie

WOS, łacina, geografia 2024 f2015, biologia 2024 f2015 (zad. 16), polski cz. 1, chemia 2024 f2015.

## Z testu UI (Haiku, staging)

7. **Pytania zamknięte bez wyboru.** Chemia 2025 zad. 2.2 („Zaznacz jedną odpowiedź”: opcje w tekście, pole tekstowe, samoocena zamiast oceny automatycznej). Biologia 2025 zad. 1.1 tabela P/F jako zwykłe komórki i pole tekstowe; informatyka ma już przełączniki P/F z tabeli, użyć tego samego. Major.
8. Indeksy górne i dolne w chemii 2025 zad. 2.1–2.2 sklejone z tekstem („jąder235U powstają92Kr”). Minor/major.
9. Polski 2025 cz. 1: pusta odpowiedź do wypracowania i tak pokazuje „Do oceny przy pytaniu: 1”. Minor (aplikacja).
10. **Arkusze nowych przedmiotów na 375 px wystają w bok** (biologia 2022 grudzień próbna: 583 px, biologia 2015 maj po sprawdzeniu: 638 px). Pasek rysowania i figura mieszczą się; winna jest inna treść (tabele, kadry?). Do znalezienia elementu i poprawki w aplikacji lub imporcie.
11. Ocena rysunku przez Pestkę działa na stagingu (biologia 2015 9.1: 0/2 z rzeczowym uzasadnieniem w ~11 s). Pusty rysunek nie ma przycisku oceny (pokazuje „Brak odpowiedzi”), to zamierzone.
