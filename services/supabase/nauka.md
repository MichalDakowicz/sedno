# Backend nauki

Interfejs korzysta z istniejącej sesji Supabase. Wywołuj funkcje przez `supabase.rpc()`. Baza pobiera identyfikator konta z sesji. Poziom to `podstawowy`, `rozszerzony` albo `dwujezyczny`. Domyślnie baza wybiera pierwszą konfigurację angielskiego z profilu lub poziom podstawowy.

## Nauka, mapa i powtórki

| RPC | Argumenty | Wynik |
| --- | --- | --- |
| `nauka_katalog` | `p_level?` | Poziomy i katalog umiejętności z kodami wymagań. |
| `nauka_mapa` | `p_level?` | `skills` z liczbą użytych dowodów, opanowaniem `score` (ocena modelu razy retencja), wskaźnikiem pewności `confidence`, retencją, `due_at`, średnią liczbą punktów w arkuszu i dostępnymi formatami. |
| `nauka_dowody` | `p_skill`, `p_level?`, `p_limit?` | Do 100 prób od najnowszej, z odwołaniem `sheet_id` i `question` lub `session_id` i pozycją. |
| `nauka_polec` | `p_level?`, `p_skill?` | Jedna propozycja z powodem i czasem, także dla widżetu „Dziś warto”. Gdy dotyczy konkretnego zadania, `repeat_id` wskazuje to zadanie. |
| `nauka_powtorki` | `p_level?` | `today` i `queue` z bieżącymi błędami lub umiejętnościami do powtórki. Jedna umiejętność może mieć kilka błędów, każdy z osobnym `mistake.source_id`. |
| `nauka_plan` | `p_level?` | Plan na siedem dni w strefie Europe/Warsaw, cel i czas z profilu oraz zakres prognozy. |
| `nauka_plan_dni` | `p_days`, `p_level?` | Zapis dni tygodnia (ISO, 1 = poniedziałek) i przeliczony plan. `null` przywraca poniedziałek–piątek. |

Punktacja wykorzystuje istniejący `sheet_progress`. Baza przelicza sprawdzone zadania za pomocą klucza w `sheets`. Import angielskiego w Formule 2023 odczytuje kody wymagań z PDF-u i raportuje pokrycie. Migracja zawiera zweryfikowane mapowanie dla 12 standardowych arkuszy z maja 2023–2026, dostępne także dla danych zaimportowanych wcześniej. W słuchaniu i czytaniu waga trafia do głównego kodu rozumienia. Wagi maturalne są średnią z czterech arkuszy danego poziomu. Ocena pomija puste odpowiedzi, samoocenę, nieznane warianty odpowiedzi otwartych i wypracowania. Przy dawnym zapisie i pojedynczym zadaniu data aktualizacji postępu zastępuje datę próby. [Archiwum CKE](https://cke.gov.pl/egzamin-maturalny/egzamin-maturalny-w-formule-2023/arkusze/)

`score` to opanowanie pokazywane uczniowi: szansa poprawnej odpowiedzi na zadanie odniesienia o trudności 1000 według modelu Elo (`estimated`), pomnożona przez retencję. Wartość wynosi od 0 do 1 lub `null`, gdy jest mniej niż 3 różnych dowodów albo ich łączna aktualna waga jest mniejsza niż 1,2. Ta sama wartość służy do porządkowania mapy i widżetu na pulpicie.

Retencja to `0,5^(dni od ostatniej próby / okres połowicznego zaniku)`. Okres jest osobny dla każdej umiejętności (tabela `learning_skills`). Zanik dotyczy tylko `score` w mapie. Pola `opanowanie_przed` i `opanowanie_po` w wyniku rundy to ocena modelu (`estimated`) przed i po rundzie, każde `null` przy tym samym progu danych co w mapie, więc są porównywalne. Przykład: ocena 0,375 i okres 28 dni dają po 14 dniach bez ćwiczeń 0,375 × 0,707 ≈ 0,265. Sama ocena modelu nie zmienia się z czasem. Wiek próby wpływa tylko na próg danych i `confidence`.

Każda umiejętność zaczyna od oceny 1000. Aktualizacja Elo ma parametr K równy 48, pomnożony przez wagę dowodu. Waga zadania CKE to jego liczba punktów. Dla ćwiczeń w aplikacji wynosi 0,45 (mini-test 0,55) i maleje o 1 / (1 + 0,5 × liczba użytych podpowiedzi). Trudność zadania zależy od jego rodzaju. Zadanie zamknięte CKE ma 950, a otwarte 1100, plus 40 za każdy punkt powyżej pierwszego. W ćwiczeniach autorskich luka ma 1100, naprawa błędu 1050, a pozostałe typy 950. Model używa maksymalnie 40 ostatnich różnych dowodów na umiejętność. Powtórzenie zadania aktualizuje dowód używany przez model. Pełna historia jest dostępna w rozbiorze. Wskaźnik pewności zależy od łącznej, zestarzałej wagi dowodów. Progi, trudności i okresy zaniku są początkowymi parametrami Sedna.

Powtórki ustawia kolejność: najpierw umiejętności z błędami, od tej z najświeższą pomyłką, a w niej najnowsze błędy. Potem umiejętności do odświeżenia według pilności (punkty w arkuszu razy utrata retencji). `today` jest pierwszym wierszem `queue`. Wiersze jednej umiejętności są obok siebie.

Prognoza dotyczy obiektywnie ocenianej części arkusza. Wymaga dwóch sprawdzonych arkuszy z ostatnich 180 dni. W każdym arkuszu trzeba móc ocenić co najmniej 85% puli punktów tej części, z czego co najmniej 35% puli musi mieć ocenioną odpowiedź. Puste zadania w oddanym arkuszu dają zero. Wynik pojawia się przy pokryciu przynajmniej 60% wagi umiejętności przez próby z co najmniej dwóch arkuszy.

## Sesje i rozbiór

1. Wygeneruj UUID i zapamiętaj go na czas ponowień. Wywołaj `nauka_start({ p_session, p_skill, p_format, p_level })`. Formaty `szybka-runda`, `napraw-blad` i `sokratejski` (mini-test) wskazuje `nauka_mapa.skills[].formats`. Jeśli powtórka zwraca `mistake.repeat_id`, przekaż je jako `p_item` dla formatu `szybka-runda`. Zadanie będzie pierwsze w rundzie. HTTP 409 z komunikatem `review_item_unavailable` oznacza, że trzeba odświeżyć kolejkę.
2. Wyświetl `question.prompt`. Dla `typ: "cke"` pobierz treść i kontekst z `sheets` według `sheet_id`, `task_nr` i `question`. Odpowiedź to jedna z `litery`. Zadanie ze słuchania przekazuje `nagranie` i, jeśli jest dostępny w imporcie, `fragment` z czasem początku i końca. Dla ćwiczeń autorskich pole `typ` określa ćwiczenie wyboru, lukę albo naprawę błędu. Dla wyboru wysyłaj `opcje[].id`. `audioTekst` i `audioJezyk` są danymi do odczytania przez syntezę mowy klienta.
3. `nauka_podpowiedz({ p_session, p_position, p_step })` odsłania kolejny szczebel. W mini-teście podpowiedzi są wyłączone.
4. `nauka_odpowiedz({ p_session, p_position, p_answer })` dopisuje odpowiedź raz. Pusty tekst oznacza pominięcie. Po zatwierdzeniu odpowiedzi serwer zwraca jej ocenę, klucz i wyjaśnienie w `answers`. Zmiana odpowiedzi na oddanej pozycji daje HTTP 409.
5. Po zakończeniu `question` ma wartość `null`, a `result` zawiera `wynik`, opanowanie przed i po oraz `nastepny_krok`. `nauka_sesja({ p_session })` odtwarza sesję. `nauka_ostatnie({ p_level })` listuje niedokończone sesje. `nauka_usun({ p_session })` usuwa sesję i jej dowody.

Szybka runda ma od 5 do 8 pozycji. Błąd może wydłużyć rundę, a seria czterech dobrych odpowiedzi ją skraca. Najpierw trafiają do niej zadania zamknięte CKE z wybranego poziomu, zaczynając od niewidzianych. Pula mniejsza niż pięć pasujących pytań CKE jest uzupełniana ćwiczeniami autorskimi. Rundy działają bez połączenia z dostawcą modelu. Naprawa błędu polega na wybraniu przygotowanej poprawki.

Późniejsza poprawna odpowiedź usuwa błąd z tego samego zadania. Runda z co najmniej 75% poprawnych odpowiedzi albo późniejszy arkusz z wynikiem co najmniej 75% punktów danej umiejętności usuwa jej starsze błędy. Do wyniku arkusza liczą się co najmniej dwie obiektywnie ocenione odpowiedzi. Błędy z właśnie zaliczonej pracy nadal można powtórzyć. Gdy `repeat_id` ma wartość `null`, można otworzyć zadanie w jego źródle lub poćwiczyć tę samą umiejętność.

## Krok po kroku

`writing_drafts` przechowuje prywatne szkice z poleceniem, formą, etapem i sekcjami tekstu w `sections`. Przy zapisie filtruj po `id` i bieżącym `revision`. Baza podnosi numer wersji. Brak zaktualizowanego wiersza oznacza konieczność odświeżenia danych przed kolejną zmianą. `nauka_oddaj_szkic({ p_draft, p_revision })` zamyka wersję po wejściu w etap `przeglad` i uzupełnieniu rozwinięcia. Oddany szkic pozostaje dostępny do omówienia i usunięcia. Uwagi do etapów zwraca [Pestka w nauce](nauka-ai.md).

## Pozostałe integracje

- [Pestka w nauce](nauka-ai.md) opisuje dopasowanie wolnego tematu, rozmowy sokratejskie, informację zwrotną do pisania, scenariusze „Uczeń uczy AI”, analizę zdjęcia i modele do wizualizacji.
- [Mapa wiedzy i terminy matur](narzedzia-nauki.md) opisuje graf prywatnych notatek i dane do odliczania.
