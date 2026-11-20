# Backend nauki

Interfejs korzysta z istniejącej sesji Supabase. Wywołuj funkcje przez `supabase.rpc()`. Baza pobiera identyfikator konta z sesji. Poziom to `podstawowy`, `rozszerzony` albo `dwujezyczny`. Domyślnie baza wybiera pierwszą konfigurację angielskiego z profilu lub poziom podstawowy.

## Nauka, mapa i powtórki

| RPC | Argumenty | Wynik |
| --- | --- | --- |
| `nauka_katalog` | `p_level?` | Poziomy i katalog umiejętności z kodami wymagań. |
| `nauka_mapa` | `p_level?` | `skills` z liczbą użytych dowodów, opanowaniem `score` (ocena modelu razy retencja), wskaźnikiem pewności `confidence`, retencją, `due_at`, średnią liczbą punktów w arkuszu i dostępnymi formatami. |
| `nauka_dowody` | `p_skill`, `p_level?`, `p_limit?` | Do 100 prób od najnowszej, z odwołaniem `sheet_id` i `question` lub `session_id` i pozycją. |
| `nauka_polec` | `p_level?`, `p_skill?` | Jedna propozycja z powodem i czasem, także dla widżetu „Dziś warto”. Automatyczny wybór pomija umiejętności bez automatycznej oceny (obecnie pisanie, kod V), bo wypracowania nie są dowodem i ich opanowanie ma sufit. Wskazana wprost `p_skill` działa zawsze. Gdy dotyczy konkretnego zadania, `repeat_id` wskazuje to zadanie. |
| `nauka_powtorki` | `p_level?` | `today` i `queue` z bieżącymi błędami lub umiejętnościami do powtórki. Jedna umiejętność może mieć kilka błędów, każdy z osobnym `mistake.source_id`. |
| `nauka_plan` | `p_level?` | Plan na siedem dni w strefie Europe/Warsaw, cel i czas z profilu oraz zakres prognozy. Ćwiczenia wybiera z pominięciem umiejętności bez automatycznej oceny (pisanie). |
| `nauka_plan_dni` | `p_days`, `p_level?` | Zapis dni tygodnia (ISO, 1 = poniedziałek) i przeliczony plan. `null` przywraca poniedziałek–piątek. |

Punktacja wykorzystuje istniejący `sheet_progress`. Baza przelicza sprawdzone zadania za pomocą klucza w `sheets`. Import angielskiego w Formule 2023 odczytuje kody wymagań z PDF-u i raportuje pokrycie. Migracja zawiera zweryfikowane mapowanie dla 12 standardowych arkuszy z maja 2023–2026, dostępne także dla danych zaimportowanych wcześniej. W słuchaniu i czytaniu waga trafia do głównego kodu rozumienia. Wagi maturalne są średnią z czterech arkuszy danego poziomu. Ocena pomija puste odpowiedzi, samoocenę, nieznane warianty odpowiedzi otwartych i wypracowania. Przy dawnym zapisie i pojedynczym zadaniu data aktualizacji postępu zastępuje datę próby. [Archiwum CKE](https://cke.gov.pl/egzamin-maturalny/egzamin-maturalny-w-formule-2023/arkusze/)

`score` to opanowanie pokazywane uczniowi: ocena modelu (`estimated`, od 0 do 1) pomnożona przez retencję. Wartość jest `null`, gdy są mniej niż 3 próby albo ich łączna waga (bez uwzględnienia wieku) jest mniejsza niż 1,2. Próg nie wraca więc po kilku dniach od ćwiczenia. Ta sama wartość służy do porządkowania mapy i widżetu na pulpicie.

Retencja to `0,5^(dni od ostatniej próby / okres połowicznego zaniku)`. Okres jest osobny dla każdej umiejętności (tabela `learning_skills`). Zanik dotyczy tylko `score` w mapie. Pola `opanowanie_przed` i `opanowanie_po` w wyniku rundy to ocena modelu (`estimated`) przed i po rundzie, każde `null` przy tym samym progu danych co w mapie, więc są porównywalne. Przykład: ocena 0,375 i okres 28 dni dają po 14 dniach bez ćwiczeń 0,375 × 0,707 ≈ 0,265. Sama ocena modelu nie zmienia się z czasem. Wiek próby wpływa tylko na `confidence`.

Ocena modelu (od migracji 0020) to średnia krocząca poprawności. Każda umiejętność zaczyna od 0,5, a każda próba, od najstarszej, przesuwa ocenę w stronę swojego wyniku (0 albo 1) o krok `1 − 0,8^(waga × mnożnik trudności)`. Mnożnik to `10^((trudność − 1000) / 800)` dla sukcesu i `10^((1000 − trudność) / 800)` dla błędu, więc sukces w trudnym zadaniu i błąd w łatwym ważą więcej. Krok liczony jest od całej oceny, dlatego przy wysokim opanowaniu błąd zabiera dużo, a sukces dodaje mało. Waga zadania CKE to jego liczba punktów. Dla ćwiczeń w aplikacji wynosi 0,45 (mini-test 0,55, diagnoza 0,9) i maleje o 1 / (1 + 0,5 × liczba użytych podpowiedzi). Trudność zależy od rodzaju zadania: zamknięte CKE 950, otwarte 1100 plus 40 za każdy punkt powyżej pierwszego, w ćwiczeniach autorskich luka 1100, naprawa błędu 1050, pozostałe 950. Model używa 60 ostatnich prób na umiejętność. Powtórka tego samego wariantu też się liczy, ale każda starsza próba wariantu waży 0,85 poprzedniej. Bezbłędne pięciozadaniowe rundy dają kolejno ok. 68%, 79%, 86%, 90%, 93%, 95%, 96%, 97%, 98%. Runda 4 z 5 (błąd w pierwszym zadaniu) przy 98% kończy się na ok. 91%. Wskaźnik pewności zależy od łącznej, zestarzałej wagi prób. Progi, trudności i okresy zaniku są początkowymi parametrami Sedna.

Powtórki ustawia kolejność: najpierw umiejętności z błędami, od tej z najświeższą pomyłką, a w niej najnowsze błędy. Potem umiejętności do odświeżenia według pilności (punkty w arkuszu razy utrata retencji). `today` jest pierwszym wierszem `queue`. Wiersze jednej umiejętności są obok siebie.

Prognoza dotyczy obiektywnie ocenianej części arkusza. Wymaga dwóch sprawdzonych arkuszy z ostatnich 180 dni. W każdym arkuszu trzeba móc ocenić co najmniej 85% puli punktów tej części, z czego co najmniej 35% puli musi mieć ocenioną odpowiedź. Puste zadania w oddanym arkuszu dają zero. Wynik pojawia się przy pokryciu przynajmniej 60% wagi umiejętności przez próby z co najmniej dwóch arkuszy.

## Sesje i rozbiór

1. Wygeneruj UUID i zapamiętaj go na czas ponowień. Wywołaj `nauka_start({ p_session, p_skill, p_format, p_level })`. Formaty `szybka-runda`, `napraw-blad` i `sokratejski` (mini-test) wskazuje `nauka_mapa.skills[].formats`. Jeśli powtórka zwraca `mistake.repeat_id`, przekaż je jako `p_item` dla formatu `szybka-runda`. Zadanie będzie pierwsze w rundzie. HTTP 409 z komunikatem `review_item_unavailable` oznacza, że trzeba odświeżyć kolejkę.
2. Wyświetl `question.prompt`. Dla `typ: "cke"` pobierz treść i kontekst z `sheets` według `sheet_id`, `task_nr` i `question`. Odpowiedź to jedna z `litery`. Zadanie ze słuchania przekazuje `nagranie` i, jeśli jest dostępny w imporcie, `fragment` z czasem początku i końca. Dla ćwiczeń autorskich pole `typ` określa ćwiczenie wyboru, lukę albo naprawę błędu. Dla wyboru wysyłaj `opcje[].id`. `audioTekst` i `audioJezyk` są danymi do odczytania przez syntezę mowy klienta.
3. `nauka_podpowiedz({ p_session, p_position, p_step })` odsłania kolejny szczebel. W mini-teście podpowiedzi są wyłączone.
4. `nauka_odpowiedz({ p_session, p_position, p_answer })` dopisuje odpowiedź raz. Pusty tekst oznacza pominięcie. Po zatwierdzeniu odpowiedzi serwer zwraca jej ocenę, klucz i wyjaśnienie w `answers`. Zmiana odpowiedzi na oddanej pozycji daje HTTP 409.
5. Po zakończeniu `question` ma wartość `null`, a `result` zawiera `wynik`, opanowanie przed i po oraz `nastepny_krok`. `nauka_sesja({ p_session })` odtwarza sesję. `nauka_ostatnie({ p_level })` listuje niedokończone sesje. `nauka_usun({ p_session })` usuwa tylko niedokończoną sesję. Dla ukończonej, która jest już dowodem w modelu, zwraca `false`.

Limit to 10 niedokończonych sesji na poziom, liczonych tak samo jak lista `nauka_ostatnie` (bez diagnozy). Przekroczenie daje HTTP 409 `too_many_open_sessions`.

Szybka runda ma od 5 do 8 pozycji. Błąd może wydłużyć rundę, a seria czterech dobrych odpowiedzi ją skraca. Pula to zadania zamknięte CKE z wybranego poziomu, a gdy jest ich mniej niż 16 (za mało na dwie pełne rundy bez powtórek), także ćwiczenia autorskie. Runda bierze najpierw zadania niewidziane, potem te z błędną ostatnią odpowiedzią w rundzie, potem najdawniej widziane. Zadania z jednej rundy (lub z jednego dnia w arkuszu) są sobie równe i losowane, a przy remisie CKE wygrywa z ćwiczeniem autorskim. Kolejność w rundzie jest losowa, osobno w części podstawowej i w zapasie dochodzącym po błędach. Kolejne rundy nie powtarzają więc tego samego zestawu. Pula mniejsza niż cel daje krótszą rundę. Rundy działają bez połączenia z dostawcą modelu. Naprawa błędu polega na wybraniu przygotowanej poprawki.

Koniec każdej sesji (także diagnozy) zapisuje dzienną migawkę opanowania (patrz „Historia i aktywność”).

## Diagnoza na start

Jedna krótka sesja w formacie `diagnoza`: 1–3 zadania z każdej z kilku umiejętności, bez podpowiedzi i bez wydłużania po błędach. Odpowiedzi zasilają model z wagą 0,9 za zadanie. Stan jest w bazie, osobno dla każdego poziomu. Zadania odpowiada się zwykłym `nauka_odpowiedz`, a sesję odtwarza `nauka_sesja`.

| RPC | Argumenty | Wynik |
| --- | --- | --- |
| `nauka_diagnoza` | `p_level?` | Stan diagnozy (kształt niżej). |
| `nauka_diagnoza_start` | `p_session` (UUID klienta), `p_level?`, `p_per_skill?` (1–3, domyślnie 2), `p_skills?` (1–8 identyfikatorów; domyślnie wszystkie umiejętności oceniane automatycznie, bez pisania) | Stan diagnozy z nową sesją. Ponowienie z tym samym `p_session` zwraca bieżący stan. 409 `diagnosis_in_progress`, gdy na tym poziomie trwa inna diagnoza; 409 `session_id_in_use`, gdy UUID należy do innej sesji; 422 `no_exercises_for_format`. |
| `nauka_diagnoza_oznacz` | `p_status` (`pominieta`, `obejrzana` albo `od-nowa`), `p_level?` | Stan diagnozy. `pominieta` porzuca niedokończoną sesję, `obejrzana` zapisuje, że uczeń widział podsumowanie, `od-nowa` porzuca niedokończoną sesję i czyści stan (ukończona zostaje dowodem w modelu). |

Stan: `{level, status, started_at, skipped_at, seen_at, session}`. `status` to `brak`, `trwa`, `gotowa` albo `pominieta`. `session` to ta sama odpowiedź co z `nauka_sesja` albo `null`. W diagnozie `session.skill_id` jest `null`, a umiejętność ma każde zadanie (`question.skill_id`, `answers[].skill_id`); `hint_count` wynosi 0. Zadania są ułożone obszarami, w umiejętności najpierw niewidziane. Po ostatniej odpowiedzi `session.result` ma `wynik` `{poprawne, wszystkich}`, `umiejetnosci` `[{skill_id, name, area, poprawne, wszystkich, opanowanie, score}]` (`opanowanie` to ocena modelu, dostępna już po jednej próbie; `score` z mapy pojawia się po trzech próbach, więc przy `p_per_skill: 3`) i `nastepny_krok`. Błędy z diagnozy trafiają do Powtórek (`mistake.session_id` wskazuje sesję diagnozy). Diagnoza nie rozlicza wcześniejszych błędów jak dobra runda i nie ma jej w `nauka_ostatnie`.

## Historia i aktywność

| RPC | Argumenty | Wynik |
| --- | --- | --- |
| `nauka_historia` | `p_level?`, `p_days?` (1–366, domyślnie 90) | `{level, from, to, skills: [{skill_id, name, area, points: [{day, score, estimated, evidence_count}]}]}`. Jeden punkt na dzień, w którym zmieniło się opanowanie (stan z końca dnia), tylko umiejętności z punktami w zakresie. Dni w strefie Europe/Warsaw. Wywołanie zapisuje też dzisiejszy stan z mapy, więc ostatni punkt zgadza się z mapą. Punkty z dni bez zmian trzeba przenieść na wykresie od poprzedniego. |
| `nauka_aktywnosc` | `p_days?` (1–366, domyślnie 28) | `{from, to, timezone, days, weeks, streak}`. `days`: każdy dzień zakresu `{day, zadania, poprawne, minuty, rundy, arkusze, aktywny}`. `weeks`: osiem ostatnich tygodni ISO `{od, minuty, zadania, dni_aktywne}`. `streak`: `{current, longest, active_today, last_active}`. Liczy wszystkie poziomy razem. |

`score` w migawce to wartość z mapy (z zanikiem, `null` przy małej liczbie prób), `estimated` to ocena modelu bez zaniku. Migawkę zapisuje koniec sesji, sprawdzenie arkusza (zmiana `sprawdzony` lub `sprawdzoneZadania`) i `nauka_historia`. Historia sprzed migracji 0022 to wynik „po” z ukończonych rund (ostatnia runda dnia).

Minuty to suma odstępów między kolejnymi odpowiedziami w sesji (pierwsza liczona od startu sesji), każda przerwa najwyżej 5 minut. Czasu w arkuszach baza nie zna, więc arkusz liczy się tylko jako dzień aktywności (`arkusze` to liczba zapisów postępu tego dnia; przed migracją 0022 znany jest tylko dzień ostatniej zmiany każdego arkusza). Dzień jest aktywny, gdy była odpowiedź w sesji, ukończona sesja albo zapis arkusza. Seria to kolejne aktywne dni kończące się dziś albo wczoraj.

Późniejsza poprawna odpowiedź usuwa błąd z tego samego zadania. Runda z co najmniej 75% poprawnych odpowiedzi albo późniejszy arkusz z wynikiem co najmniej 75% punktów danej umiejętności usuwa jej starsze błędy. Do wyniku arkusza liczą się co najmniej dwie obiektywnie ocenione odpowiedzi. Błędy z właśnie zaliczonej pracy nadal można powtórzyć. Gdy `repeat_id` ma wartość `null`, można otworzyć zadanie w jego źródle lub poćwiczyć tę samą umiejętność.

## Krok po kroku

`writing_drafts` przechowuje prywatne szkice z poleceniem, formą, etapem i sekcjami tekstu w `sections`. Przy zapisie filtruj po `id` i bieżącym `revision`. Baza podnosi numer wersji. Brak zaktualizowanego wiersza oznacza konieczność odświeżenia danych przed kolejną zmianą. `nauka_oddaj_szkic({ p_draft, p_revision })` zamyka wersję po wejściu w etap `przeglad` i uzupełnieniu rozwinięcia. Oddany szkic pozostaje dostępny do omówienia i usunięcia. Uwagi do etapów zwraca [Pestka w nauce](nauka-ai.md).

## Pozostałe integracje

- [Pestka w nauce](nauka-ai.md) opisuje dopasowanie wolnego tematu, rozmowy sokratejskie, informację zwrotną do pisania, scenariusze „Uczeń uczy AI”, analizę zdjęcia i modele do wizualizacji.
- [Mapa wiedzy i terminy matur](narzedzia-nauki.md) opisuje graf prywatnych notatek i dane do odliczania.
