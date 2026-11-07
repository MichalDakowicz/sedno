# Następne kroki i pomysły

Stan na 2 listopada 2026, koniec pierwszej sesji planowania. Termin zgłoszenia do konkursu: **29 listopada 2026**.

Dokumentacja wizualna (GitHub Pages z `docs/`): 139 stron w 16 rozdziałach. Poniżej to, co zostało.

## 1. Decyzje otwarte

- **Pule arkuszy CKE:** osobne pule na naukę i na egzamin (rekomendacja) czy nauka tylko z wygenerowanych wariantów. Najpierw policzyć arkusze dla angielskiego dwujęzycznego i informatyki w formule 2023.
- **Przedmiot startowy:** rekomendacja angielski dwujęzyczny, informatyka potem razem z problemem sprawdzania kodu.
- **Plan nauki do matury** w widgecie „Do matury” czy tylko odliczanie (rekomendacja: opcjonalny widget, ukryty w układzie „nauka”).
- **Regulamin konkursu:** przeczytać PDF w całości, w szczególności co znaczy „wersja binarna” dla aplikacji webowej, wymagania dotyczące danych użytkowników, Karta Zgłoszenia i Klauzula Informacyjna.
- **Dane niepełnoletnich:** zgoda opiekuna, czas przechowywania, hosting danych.
- **Prawa autorskie CKE:** brak noty o licencji, darmowy dostęp to nie licencja. Rozważyć pytanie do CKE (`sekretariat@cke.gov.pl`). Prace uczniów w sprawozdaniach mają ten sam status.
- **Elementy motywacyjne** (serie, odznaki): chcemy czy nie.
- **Układ dashboardu per przedmiot** czy wspólny.

## 2. Formaty nauki do dopracowania

Mają pełny projekt: napraw błąd, uczeń uczy AI (dwa agenty: Sędzia i Kolega), budowanie krok po kroku.

Zostały cztery, na razie tylko zarysowane:

1. **Tutor sokratejski:** pytania zamiast wykładu, zna mapę ucznia, ma granice jak drabina podpowiedzi, kończy mini-testem.
2. **Szybkie rundy i powtórki:** 3–5 minut, warianty zadań, powtórki wynikające z zanikania opanowania.
3. **Wizualizacje per przedmiot:** algorytm krok po kroku, wykres z suwakiem, klikana mapa, tekst z zaznaczaniem parafrazy.
4. **Mapa wiedzy** (notatnik na połączeniach): węzły, połączenia budowane przez AI, prywatna dla ucznia, odwołania w rozmowie z tutorem.

Do uzupełnienia w istniejących formatach:

- Który format robimy pierwszy w pełni dla przedmiotu startowego.
- Weryfikacja prac z wstrzykniętymi błędami (brak błędów dodatkowych), kto je zatwierdza.
- Persony kolegi: ile i czy wybierane przez ucznia.
- Statusy listy kontrolnej: słowne czy z opcją punktów.

## 3. Silnik, dane i ocena

- **Filar 5, ćwiczenia i warianty:** jak powstaje wariant zadania dla angielskiego i jak go weryfikujemy (klucz wariantu), wersje dla matematyki i informatyki (szablony z parametrami, solvery).
- **Sprawdzanie kodu (informatyka):** osobny problem: izolowane uruchamianie, porównanie wyników z danymi CKE, SQL, arkusz kalkulacyjny. Zadania praktyczne ocenia się po wynikach, nie po kodzie.
- **Rubryki innych przedmiotów:** ta sama struktura co dla angielskiego, ale każda wymaga własnej analizy.
- **Część ustna** angielskiego dwujęzycznego: obsługujemy czy nie.
- **Waga umiejętności na maturze:** policzyć z kluczy CKE (punkty per kod wymagania). Zasila „Dziś warto”.
- **Mikroumiejętności:** taksonomia, kto ją pisze i jak ją przeglądamy. Nazwy zrozumiałe dla ucznia.
- **Estymator wewnętrzny opanowania:** metoda (np. rozkład Beta lub Elo), miara pewności.
- **Baza wektorowa:** co dokładnie trzyma (zadania, odpowiedzi, mapowanie na umiejętności).

## 3a. Matematyka: arkusze i brudnopis (stan po pierwszej iteracji)

Działa: matura podstawowa 2023–2026 jako tekst ze wzorami (z formy DOCX, KaTeX), figury z PDF, klucz z zasad (litery, kody, krótkie wyniki, strona schematu), brudnopis w Excalidraw przy każdym zadaniu, rysunek bazowy do dorysowania. Kadr zostaje w 12 zadaniach przerobionych w formie dla niewidomych. Dalej:

- **Ocena rozwiązań otwartych:** podpiąć OCR pisma ze zdjęcia (repozytorium kolegi) i połączyć z tanimi metodami sprawdzania. Brudnopis da się wyeksportować do PNG (`exportToBlob`), więc OCR może czytać też szkic z aplikacji.
- **Zadania z kodem (PF, A2, CE):** zamiast pola tekstowego przełączniki P/F i wybór „A albo B oraz 1–3”, częściowe punkty przy dwupunktowych kodach (np. BF).
- **Pozostałe kadry (12 zadań):** odbudować tekst z PDF dla zadań przerobionych w formie 660 (na tekście z PDF i ze wzorami zgadywanymi z położenia znaków albo ręcznie), w tym opcje z osiami liczbowymi jako obrazy opcji. Do tego czasu tekst w kadrze jest drobny przy 375 px.
- **Obrazy w Supabase Storage:** kadry i rysunki jadą dziś w JSON-ie arkusza jako data URL (0,5–1,2 MB na arkusz matematyki). Przenieść do prywatnego bucketa z RLS dla zalogowanych, gdy arkuszy przybędzie.
- **Arkusze bez formy DOCX** (starsze sesje, poziom rozszerzony): sprawdzić, czy CKE publikuje formę 660; jeśli nie, zostaje kadr.
- **Rysunki bazowe:** przejrzeć 2026, przenieść zadania z figurą tylko w opcjach A–D (np. 2024 14.4) do jednego rysunku z kilku stron; ewentualnie zamiana prostych osi i figur na wektorowe elementy Excalidraw.
- **Poziom rozszerzony** i sesje dodatkowe (czerwiec, sierpień).
- **Rozmiar postępu:** odręczne szkice mają dużo punktów; przy synchronizacji z kontem sprawdzić limit i ewentualnie upraszczać kreski.
- **Pestka przy brudnopisie:** podpowiedź na podstawie szkicu (eksport sceny do obrazu dla modelu).

## 4. Research do zrobienia

- Sprawozdania CKE z biologii, fizyki i geografii: zawartość nieprzejrzana.
- Ekstrakcja przykładów rozwiązań zdających ze sprawozdań (w PDF-ach to głównie obrazy): model rozumiejący obraz plus kontrola ręczna.
- Czy w informatorach lub sprawozdaniach są kompletne, oceniane prace z punktacją (kalibracja oceny AI).
- Wiernie przepisać z PDF tabelę przeliczeniową (Tabela C) rubryki wypracowania i ustalić punktację całego zadania 10 (z tabel wychodzi 15, do weryfikacji).
- Zliczyć arkusze CKE per przedmiot i rok (pule).
- Typowe błędy dla przedmiotów innych niż angielski, matematyka, chemia.

## 5. Architektura i konkurs (jeszcze nie ruszone)

- Stack: strona webowa, backend, baza (osobna per przedmiot), model AI, koszty, hosting.
- Konta: logowanie Google i e-mail działa (Supabase na serwerze, `services/supabase`). Zostało: konto demo dla jury z wypełnionymi danymi i resetem, publikacja aplikacji OAuth z trybu testowego, hosting aplikacji web.
- AI: bramka per konto gotowa (`ai`, `ai-klucz`). Zostało: podpiąć Pestkę i ocenę wypracowań do `askAi`/`streamAi`, prompty per format.
- Zapasowe odpowiedzi AI dla konta demo, gdyby model był niedostępny.
- Praca offline: które formaty działają bez internetu.
- Zgłoszenie: kod źródłowy z instrukcją kompilacji, „wersja binarna” z instrukcją uruchomienia, instrukcja użytkownika, film do 5 minut (AVI lub MP4), opis do 1 strony, Karta Zgłoszenia, Klauzula Informacyjna. Wysłać link na `informatyka_konkurs@uwb.edu.pl`.
- Scenariusz filmu: ścieżka pokazowa (dashboard, „Dziś warto”, „Napraw błąd”, „Uczeń uczy AI”, wzrost na mapie).

## 6. Pomysły na później

- Interaktywne ćwiczenia obok arkuszy zasilające tę samą mapę.
- Raport z postępów do wydruku.
- Dostosowania egzaminacyjne (np. dysleksja) w ustawieniach.
- Zasada „jakość przed prędkością”: tempo jako późniejszy, osobny cel. Zapisane w rozdziale Tryby.

## Zasady pracy (przypomnienie)

- Teoretyzowanie w rozmowie i w HTML w `docs/`. Notatki robocze w `notes/`. Ten plik jest wyjątkiem na liście rzeczy do zrobienia.
- Zmiany tylko w dokumentach idą prosto na `main`. Gdy zacznie się kod, gałęzie i PR.
- Bez atrybucji AI w commitach, PR i dokumentach.
