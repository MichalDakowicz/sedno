# Plan: intuicyjność, brakujące funkcje, Pestka jako marka

Ciąg dalszy `notes/przeglad-2026-11-18.md` (paczki 1–7). Ta sama gałąź, jeden PR. Kolejność: najpierw paczki 4, 6 i 7 z przeglądu, potem paczki 8–10 stąd, na końcu paczka 5 (baza).

Założenie: konto ma podpięte AI z naszego serwera, więc funkcje z modelem są dostępne. Mimo to każdy ekran ma działać sensownie, gdy model nie odpowie (komunikat i ponowienie, bez pustej strony).

## Paczka 8. Intuicyjność: jedna droga ucznia

1. **Jedno „co dziś robić”.** Dziś liczą się trzy osobne propozycje: „Dziś warto” (pulpit, `views/pulpit/Dzis.tsx`, z arkuszy), „Polecam” (Nauka, `nauka_polec`), „Na dziś” (Powtórki, `nauka_powtorki.today`), z różnymi czasami (20 i 45 minut). Zrobić jeden moduł `apps/web/src/nauka/dzis.ts`, który zwraca jedną propozycję dnia (kolejność: niedokończona runda albo arkusz → powtórka na dziś → polecenie z `nauka_polec` → nowy arkusz) i jeden szacowany czas. Pulpit pokazuje ją jako kartę Pestki, Nauka i Powtórki pokazują tę samą propozycję, a nie własną.
2. **Nauka zaczyna się od polecenia.** Kolejność na `/nauka`: karta propozycji → „Wolny temat” → inne sposoby → dopiero potem wybór poziomu i umiejętności („Chcę coś innego”).
3. **Sposoby nauki z podpowiedzią, kiedy który.** Sześć pozycji bez wskazówki. Każda dostaje jedno zdanie „kiedy” („Masz 5 minut”, „Chcesz zrozumieć, nie tylko trafić”, „Przed maturą próbną”) i jedną oznaczoną przez Pestkę jako polecaną dla tego ucznia.
4. **Przedmioty bez nauki mówią wprost, co jest.** Rundy są tylko dla angielskiego. Przy matematyce, informatyce i polskim pokazać, co uczeń może zrobić dziś (arkusze, tablica z Pestką, warsztat), zamiast „arkusze w drodze”. Po paczce 9 punkt 4 matematyka dostaje własne rundy.
5. **Menu.** Pięć pozycji w pasku: Pulpit, Nauka, Arkusze, Mapa umiejętności, Powtórki (decyzja właściciela z 19 listopada: więcej zakładek u góry odciąża strony; zakładki w Nauce usunięte). Na telefonie menu ma też Pestkę, „Do matury”, Profil i Ustawienia.
6. **Diagnoza na start.** Po onboardingu, zamiast oprowadzania po interfejsie: Pestka proponuje „Sprawdźmy, od czego zacząć” (ok. 10 minut): po 2–3 zadania z każdego obszaru angielskiego na wybranym poziomie, na istniejących rundach (`nauka_start` po kolei dla umiejętności, bez nowych funkcji w bazie). Na końcu mapa z pierwszymi wynikami i propozycja dnia. Można pominąć i wrócić z pulpitu („Dokończ diagnozę”). Przewodnik po interfejsie skrócić do trzech dymków i pokazywać po diagnozie.
7. **Puste stany prowadzą dalej.** Każde „Mało danych”, „Nie masz niedokończonych ćwiczeń”, „bez wyniku” ma jeden przycisk do rzeczy, która to zmieni.

## Paczka 9. Brakujące funkcje (backend już jest)

Funkcja `nauka-ai` i baza obsługują więcej, niż aplikacja pokazuje. Kontrakt: `services/supabase/nauka.md`, `nauka-ai.md`, `narzedzia-nauki.md`, `warianty-i-ocena.md`. Dziś aplikacja woła tylko `dopasuj-temat`, `omow-brudnopis`, `uczen-uczy`. Szablony w `apps/web/src/szablony/` to puste prototypy z opisem w README: zamienić je na działające widoki pod właściwymi adresami w `/nauka/...` i usunąć ze spisu szablonów.

1. **Postęp w czasie na pulpicie.** Widget „Twój tydzień”: plan tygodnia z `nauka_plan` / `nauka_plan_dni`, dni z nauką, seria dni, zmiana opanowania w tygodniu. Prognoza wyniku matury z danych, które zwraca baza (sprawdzić w `nauka.md`, gdzie jest prognoza), w widgecie „Do matury” obok odliczania, z opisem, z czego jest liczona.
2. **Zdjęcie rozwiązania z kartki** (`odczytaj-zdjecie`, `omow-odczyt`): uczeń robi zdjęcie albo wybiera plik, Pestka pokazuje odczyt do poprawienia, potem wskazuje pierwszy krok do sprawdzenia. Wejście z arkusza matematyki (przy zadaniu otwartym) i z Nauki. Limit obrazu 1 MB: zmniejszać po stronie przeglądarki (jest `image-blob-reduce` w zależnościach).
3. **Pisanie krok po kroku** (`krok-po-kroku`, `nauka_oddaj_szkic`): wypowiedź pisemna z angielskiego etapami (plan, szkic, przegląd), lista kontrolna ze statusami, liczba słów i akapitów, jedno pytanie Pestki naraz.
4. **Rundy z matematyki i informatyki** (`warianty-katalog`, `wariant-zadania`, `ocen-rozwiazanie`): lista szablonów zadań, wariant z losowymi danymi, odpowiedź w polach, ocena kluczem; przy zadaniach otwartych ocena rubryką CKE ze statusem „do weryfikacji”, gdy model nie jest pewny. Wejście z Nauki po wyborze przedmiotu.
5. **Mini-test sokratejski** (`sokratejski`): rozmowa pytaniami do 7 wymian, z twarzą Pestki, zakończona krótkim podsumowaniem i propozycją rundy.
6. **Mapa wiedzy** (`mapa-wiedzy-polaczenia`, tabele `knowledge_nodes` / `knowledge_edges`): notatki ucznia jako węzły, Pestka proponuje połączenia, uczeń je przyjmuje albo odrzuca. Robić jako ostatnie z tej paczki.
7. **Wizualizacje** (`wizualizacje`, `wizualizacja`): katalog modeli i stan do narysowania; pokazać przy zadaniach, do których pasują. Robić po mapie wiedzy.
8. **Wyszukiwanie (Ctrl+K)** znajduje umiejętności, arkusze i sposoby nauki, a pytanie do Pestki odpowiada w oknie wyszukiwania.

## Paczka 10. Pestka jako marka

1. **Karta charakteru.** Nowa strona w `docs/` (rozdział „Pestka”, wpis w `CHAPTERS` w `docs/nav.js` i wiersz na okładce): kim jest, jak mówi (pierwsza osoba, rodzaj żeński, krótkie zdania, pytania zamiast wykładu), czego nigdy nie robi (nie podaje gotowej odpowiedzi, nie ocenia ucznia, nie używa emoji), stałe zwroty na powitanie, pochwałę, błąd, przerwę. Te same zasady w jednym pliku `apps/web/src/pestka/glos.ts` z listami gotowych kwestii, z których korzystają wszystkie dymki bez AI.
2. **Emocje.** `TutorAvatar` ma trzy stany (`idle`, `thinking`, `talking`). Dodać: radość (dobra odpowiedź), duma (koniec rundy z postępem), zmartwienie (kilka błędów z rzędu), sen (kilka minut bez ruchu, budzi się na ruch myszy), świętowanie (seria dni, pierwsze 100% w rundzie). Animacje w CSS/SVG, szanują „Mniej ruchu”.
3. **Kiełkująca pestka na mapie.** Każda umiejętność na `/umiejetnosci` to pestka w czterech stadiach zależnych od opanowania: pestka (mało danych), kiełek (do ok. 40%), roślina z liśćmi (do ok. 75%), drzewko z owocem (powyżej). Po rundzie w rozbiorze widać, jak stadium rośnie. Na pulpicie mały „ogród” jako podsumowanie mapy. Inline SVG, kolory z tokenów, jasny i ciemny motyw. Progi stadiów ustalić po paczce 5 (dziś opanowanie z samych rund zatrzymuje się ok. 67%).
4. **Pestka zamiast szarych stanów.** Ładowanie pierwszego wejścia (Pestka „myśli” z jednym zdaniem zamiast samego szkieletu tam, gdzie czeka się dłużej niż ok. 1 s), puste stany, błąd sieci, strona nieznanego adresu (dziś przekierowanie na pulpit), wylogowanie.
5. **Jeden głos w poleceniach.** „Dziś warto”, „Polecam”, „Na dziś”, „Dalej” w rozbiorze: wszędzie ta sama karta z twarzą Pestki i zdaniem w pierwszej osobie („Na dziś wybrałam…”), z powodem („bo w ostatnim arkuszu…”).
6. **Znak.** Pestka w logo w pasku (obok albo zamiast kropki przy „Sedno”), ikona karty przeglądarki i ikony PWA z Pestką, obraz podglądu linku. Ekran logowania już ją ma: dopasować do nowego znaku.
7. **Imię zamiast „tutor” i „AI”.** W interfejsie wszędzie „Pestka” („Zapytaj Pestkę”, „Pestka sprawdza”), w doku podpis „tutor” zamienić na to, co akurat robi („przy zadaniu 1.1”, „przy mapie”). „AI” zostaje tylko w profilu przy konfiguracji dostawcy.

## Zasady wykonania

- Wspólne klasy i komponenty z paczek 3 i 3b (nagłówek strony, karta, wiersz listy, pigułki wyboru, skala tekstu) obowiązują we wszystkich nowych widokach.
- Każdy nowy widok: jasny i ciemny motyw, 375 px, klawiatura, stany ładowania, błędu i pusty.
- Zmiany w `services/` tylko w paczce 5, przez staging `sedno-dev`.
- Opis kodu nowych widoków w `apps/web/README.md`; dokumenty w `docs/` aktualizować, gdy zmienia się zarys (menu, diagnoza, Pestka).

## Paczka 11. Płynność i ruch

Uwaga właściciela: interfejs ma być płynny i interaktywny, elementy mają się zachowywać jak rzeczy z fizyką, a nie przełączać się skokowo. Robić razem z paczką 10.

1. **Jedna biblioteka ruchu w kodzie.** Wspólne krzywe i czasy jako tokeny (`--ruch-szybki`, `--ruch-zwykly`, krzywa sprężysta) i mały hook do animacji sprężynowych (bez nowych zależności, na `requestAnimationFrame` albo `linear()` w CSS). Wszystkie przejścia korzystają z nich, nie z własnych wartości.
2. **Wskaźnik zaznaczenia przesuwa się, nie przeskakuje:** pigułki, zakładki, menu, przełączniki, pasek postępu rundy.
3. **Przejścia między stronami i stanami:** treść wchodzi razem, bez migania i bez skoku układu; pytanie → werdykt → następne pytanie przechodzą płynnie (kafle zostają na miejscu, zmienia się stan); rozwijane sekcje animują wysokość.
4. **Reakcja na dotyk:** przyciski i kafle uginają się przy wciśnięciu i wracają sprężyście; elementy przeciągane (widgety pulpitu, suwak liter) mają bezwładność i dociągają się do miejsca.
5. **Liczby i paski rosną:** procent opanowania, wynik, licznik odpowiedzi dochodzą do wartości zamiast pojawiać się od razu.
6. **Pestka jako miara jakości ruchu:** jej skok, lądowanie, ugięcie i podział kropli to wzorzec; reszta interfejsu ma ten sam charakter (krótko, sprężyście, bez przeciągania).
7. **Granice:** nic nie trwa dłużej niż ok. 400 ms, ruch nie opóźnia działania (klik działa od razu), wszystko ma wersję bez ruchu („Mniej ruchu”, `prefers-reduced-motion`), 60 klatek na telefonie średniej klasy (animować tylko `transform` i `opacity`).
8. Zasady dopisać do rozdziału „Ruch” w `DESIGN.md`.

## Paczka 12. Treść sekcji, wykresy i infografiki

Zasady i tabela „strona → sekcja → pytanie ucznia → forma” są w `DESIGN.md`, rozdział „Treść sekcji, wykresy i infografiki”. Robić po paczce 9 (potrzebuje jej danych: tydzień, prognoza), razem z paczkami 10 i 11.

1. **Wspólne komponenty** w `apps/web/src/components/wykresy/`: pasek z progiem i celem, linia (sparkline) z podpisanym ostatnim punktem, kropki (dni tygodnia, zadania rundy, ostatnie próby), oś czasu (egzaminy, 7 dni powtórek), pierścień wyniku. Inline SVG, kolory z tokenów, tekst zastępczy, animacja dojścia do wartości, wersja bez ruchu.
2. **Przejść każdą stronę z tabeli** i dla każdej sekcji: nazwać pytanie, ustawić kolejność wniosek → obraz → działanie, zamienić tabelki i gołe liczby na formę z tabeli, usunąć sekcje bez pytania. Najwyżej trzy infografiki na ekran.
3. **Dane tylko prawdziwe**, z istniejących funkcji bazy i postępu arkuszy. Gdzie danych nie ma w kontrakcie (np. opanowanie w czasie dla linii na panelu umiejętności), policzyć z tego, co jest (lista prób z datami), albo zgłosić brak i nie rysować.
4. **Stan z małą ilością danych:** jedno zdanie i przycisk zamiast pustego wykresu.
5. Zrzuty każdej strony z tabeli (1280 jasny, 375, ciemny dla pulpitu i mapy).

## Wydanie

Decyzja właściciela z 19 listopada: po skończeniu wszystkich paczek i końcowym przeglądzie otwieramy PR, scalamy go sami i wdrażamy na produkcję (hosting Firebase `trafwsedno`). Zmiany w `services/` najpierw na stagingu przez gałąź `dev`.
