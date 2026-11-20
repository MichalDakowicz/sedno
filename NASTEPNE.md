# Następne kroki i pomysły

Stan na 2 listopada 2026, koniec pierwszej sesji planowania; sekcja 0 z 16 listopada, sekcja 0a z 19 listopada. Termin zgłoszenia do konkursu: **29 listopada 2026**.

Dokumentacja wizualna (GitHub Pages z `docs/`): 139 stron w 16 rozdziałach. Poniżej to, co zostało.

## 00. Poprawki od kolegi (gałąź `poprawki-od-kolegi`, 20 listopada 2026)

Zrobione: domyślna trasa AI serwera dla kont bez własnego klucza (limit 200 rozmów na 24 h i sufit 4096 tokenów na kluczu serwera), ponawianie błędów dostawcy na serwerze, czyste polecenia w rundach („Przeczytaj tekst. ).”), wyjaśnienie skróconej rundy, komunikat o niedziałającym nagraniu CKE we wszystkich odtwarzaczach.

- **Klucz serwera.** Wpisać `SEDNO_AI_KEY`, `SEDNO_AI_MODEL_WAZNE` (sol), `SEDNO_AI_MODEL_LEKKIE` (luna) w env projektu na serwerze (staging i produkcja), potem sprawdzić nowe konto bez klucza. Do decyzji: limit dzienny i tekst „Wróć jutro” (okno to ostatnie 24 h).
- **Skrócona runda** sprawdzona tylko w kodzie: tester nie trafił serii 4 dobrych po błędzie.
- **Runda na 375 px wychodzi poza ekran** (opcje i odtwarzacz do x≈400). Było przed tą gałęzią.
- **Pestka w docku** na stagingu (qwen3:8b) dała odpowiedź z pustymi angielskimi przykładami („Struktura: .”), choć to samo pytanie wprost przez API ma przykłady. Do sprawdzenia, czy to model, czy wyświetlanie.
- **Parser:** w angielskim podstawowym 2023 zad. 5, tekst A, zdania z dwóch kolumn są poprzeplatane.
- **Limit dzienny** liczy wiersze `ai_usage` po zakończeniu, więc równoległe zapytania mogą go trochę przekroczyć. Liczy też przerwane strumienie (prowadzenie w brudnopisie co 14 s zużywa 200 w około 45 minut); dokładniej: liczyć przerwania dopiero po pierwszym fragmencie.
- Drobne z audytu: przy starcie aplikacji `refreshAiReady` robi jedno zbędne drugie zapytanie o gotowość; strumień w `llm.ts` nie ma osłony `Array.isArray` dla `tool_calls`.
- Komunikat o zawieszonym nagraniu pojawia się dopiero po „Odtwórz”, nie przy samym wczytywaniu metadanych.

## 0a. Gałąź `pestka-z-twarza` (PR 74, stan na 19 listopada 2026)

Zrobione po stronie aplikacji: ogród i gotowość, quiz celów, nowy układ pięciu zakładek, rozgrzewanie danych, uproszczony arkusz; potem czytelność arkusza (wzory przed załadowaniem KaTeX, bloki kodu, tabele do wypełnienia, nagłówki podpunktów, warsztat Python/SQL), karta powtórki w Nauce („Powtórz zadanie”), onboarding w czterech krokach, prowadzenie Pestki na tablicy ze strumienia, notatki w mapie wiedzy ze źródłem (rozmowa, omówienie błędu), przypinanie do umiejętności i ręczne łączenie, szkielety o zmierzonej wysokości, dok Pestki na telefonie, kontrast `--primary-text`, porządki w martwym kodzie, dokumenty w `docs/`.

Niesprawdzone w przeglądarce (wymaga modelu albo zapisu na koncie): prowadzenie na żywo ze strumienia na tablicy, zapis notatki z rozmowy i z omówienia błędu, przypięcie i ręczne połączenie notatek, ostatni krok onboardingu po zapisie przedmiotów.

### Wymaga serwera (`services/`, przez staging `sedno-dev`)

- **Cele w kontekście Pestki na tablicy.** `omow-brudnopis` nie dostaje celu ani obszarów z quizu celów; trzeba je dodać do kontekstu funkcji.
- **Prognoza dla przedmiotów poza angielskim.** `nauka_plan` liczy prognozę tylko z mapy angielskiego; matematyka, informatyka i polski pokazują średnią z arkuszy.
- **Tematy zadań w arkuszach.** Dane arkuszy nie mają tematu zadania, więc nie da się przypiąć modeli z Wizualizacji ani umiejętności do zadań CKE.
- **Stan prowadzenia w strumieniu tablicy.** Strumień nie wysyła `stanProwadzenia` przed wskazówką, więc przy prowadzeniu na żywo wskazówka czeka na wynik (nie wiadomo, czy to krok, błąd, czy „czekam”). Osobne zdarzenie `{"type":"stan"}` na początku pozwoliłoby pisać ją od pierwszych słów.
- **Mapa wiedzy:** przypinanie notatek do umiejętności poza angielskim (ograniczenie `skill_id` w `knowledge_nodes` i brak taksonomii); odwołania do notatek w rozmowie z Pestką (kontekst funkcji czatu). Notatki z rundy (`source = session`) baza już przyjmuje, w aplikacji jeszcze ich nie zapisujemy.
- **„Odłóż” w Powtórkach** (`docs/dash-powtorki.html`): odłożenie powtórki musi zmienić termin w bazie.

## 0. Najbliższe kroki (stan na 16 listopada 2026)

### Do domknięcia z bieżącej pracy

- **Informatyka (gałąź `informatyka`).** Arkusze 2023–2026 z kluczem i plikami danych, treść jako tekst (kod, tabele, wycinki tylko dla wykresów i wzorów), warsztat pod zadaniem: edytor z VS Code (Monaco) z podpowiedziami Jedi i sprawdzarką wyniku z kluczem, Python w przeglądarce (Pyodide z własnego serwera), SQL na tabelach z plików (sql.js, funkcje z Accessa), podgląd danych i pobieranie plików do Excela/Accessa. Na stagingu są tylko 4 arkusze informatyki (`SEDNO_DB=sb-sedno-dev-db npm run wgraj -- informatyka`). Widok po zalogowaniu sprawdzony na stagingu 16 listopada (4 arkusze, Python i SQL w warsztacie, odpowiedź zostaje po przeładowaniu). Zostało: wgrać arkusze na produkcję (`npm run wgraj -- informatyka`); drobne: przy dowolnym kodzie panel pokazuje „Klucz CKE” zadania, na 375 px przycisk Pestki zasłania róg edytora SQL i „Wykonaj”. Dalej: C++ i Java (kompilator na serwerze w izolacji, np. Piston; odłożone), ocena algorytmów i zapytań przez Pestkę (uruchomienie zapytania ucznia i porównanie z wynikiem wzorcowym), wykresy do zadań z arkusza kalkulacyjnego.
- **Wgrać arkusze z nowego importu.** Strony i czasy fragmentów działają już przez nakładkę (`apps/web/src/arkusze/nakladka.json`, `npm run nakladka`), bez tekstów. Pełny import (`npm run importuj`, potem `npm run wgraj` przez ssh na serwer Michała) doda do bazy też tekst fragmentów pod „Posłuchaj fragmentu”.
- **Fragmenty nagrań: zrobione 8 listopada.** Whisper przepisał 39 nagrań (`data/nagrania/`), `dopasuj.py` dał fragment 547 z 558 pytań. Zostało: przesłuchać kilka fragmentów na ucho; przy nowym roczniku: `transkrybuj.py`, `dopasuj.py`, `npm run nakladka`.
- **Rozmowy z Pestką na koncie.** Na stagingu i sprawdzone 16 listopada, PR do `main` otwarty (`rozmowy-konto`, migracja `0005_rozmowy_pestki.sql`). Zostało: scalić PR. Drobne do poprawy: wolne pobranie może cofnąć widok otwartej rozmowy (zapamiętać rozmowy w trakcie wysyłania sprzed zapytania); karta, która nie traci fokusu, nie pobiera zmian z innego urządzenia (zapis warunkowy po `updated_at`); pierwsza rozmowa przy złej sieci zostaje tylko lokalnie (zapisywać właściciela przy logowaniu); rozmowy bez właściciela z poprzedniej wersji są widoczne w liście, a dopisanie do nich wysyła je na konto; odrzucony zapis (limit 256 KB) ponawia się bez końca i bez komunikatu; brak usuwania rozmów i czasu przechowywania (dane niepełnoletnich); wylogowanie bez sieci czyści dane, a sesja zostaje.
- **Ciemny motyw aplikacji.** Gotowy w PR `ciemny-motyw` (za ustawieniem systemu, paleta z `docs/style.css`, sprawdzony na stagingu we wszystkich widokach). Zostało: scalić PR. Drobne: zaznaczenie w Excalidraw jest fioletowe w obu motywach; wyłączony przełącznik w pozostałych szablonach słabo widoczny w jasnym motywie (w działających widokach poprawiony); płótno brudnopisu w ciemnym ma odcień `#121212` zamiast `--surface`; jasny motyw na 375 px nie był sprawdzany po zmianie.
- **Szablony, faza 1 (17 listopada).** Ustawienia, Profil ucznia, Wyszukiwanie (Ctrl+K), Układ pulpitu i odliczanie do matury działają na danych konta. Pięć PR-ów w łańcuchu, scalać po kolei: #49 `ustawienia` → #50 `profil-ucznia` → #51 `wyszukiwanie` → #52 `uklad-pulpitu` → #53 `do-matury`. Migracje 0006–0008 są na stagingu; na produkcję wejdą ze scaleniem. Wspólna synchronizacja danych konta: `konto/kontoSync.ts`. Przy okazji: rozmów nie da się przełączać ani wysyłać, gdy Pestka odpowiada; przy trudnej wiadomości ucznia pod odpowiedzią Pestki pojawia się stała informacja o zaufanej dorosłej osobie i telefonie 116 111. Zostało: sprawdzić daty egzaminów 2027 w BIP CKE (dziś z komunikatu z 20 sierpnia 2026 za serwisem informacyjnym, oznaczone „do weryfikacji”); czytanie na głos i powiadomienia w Ustawieniach; „Krótkie odpowiedzi” nie działają w onboardingu; wylogowanie przywraca domyślny motyw i rozmiar tekstu na ekranie logowania; informacja „Zapisałam w profilu” i „Cofnij” znikają po przeładowaniu; przy błędzie sprawdzania AI wyszukiwarka i Pestka proponują „Podepnij AI” także kontom z podpiętym AI; krok „Jak się uczysz?” w onboardingu sprawdzony tylko w kodzie. Faza 2: pętla nauki dla angielskiego (taksonomia z zasad oceniania CKE, nazwy dla ucznia do akceptacji), potem prognoza i plan tygodnia w „Do matury”, widgety Powtórki i Wybierz temat.
- **Omawianie wypracowania.** Sprawdzone 16 listopada na gpt-6-luna (konto testowe nie ma dostawcy z sol): model dostaje teraz liczbę słów, zakres i początek z arkusza (w PR rozmów), długość i cztery punkty ocenia poprawnie, łapie błędy językowe. Zostało: sprawdzić na sol; nie da się zacząć omówienia samego wypracowania od nowa (stary wątek zostaje); link „omów błędy” (`?omow=1`) z pulpitu nie otwiera omówienia; uzasadnienia błędów bywają puste lub błędne; licznik pokazuje „akapity: 1” przy liniach rozdzielonych pojedynczym Enterem; to, że początek z arkusza nie wlicza się do limitu słów, jest do weryfikacji w zasadach CKE. Pestka na lekkim poziomie podała zdanie po polsku zamiast przykładu present perfect.

- **Pętla nauki angielskiego, faza 2 (18 listopada).** Backend i widoki od kolegi (#55, #56), poprawki po audycie i testach w #66–#68 (porzucone rundy, fragment nagrania zadania, podsumowanie rozbioru, zanikanie opanowania jako ocena × retencja, Powtórki po umiejętnościach). Zostało poza celem: mikroumiejętności pod kodami CKE w panelu mapy (`docs/mapa-panel.html`, `mapa-poziomy.html` jako propozycja); trend tygodniowy, kreskowany pasek przy małej pewności i przełącznik nazwy/kody CKE na mapie (`docs/dash-mapa.html`); zachęta do krótkiej diagnozy przy „mało danych”; „Odłóż” w Powtórkach (`docs/dash-powtorki.html`); usuwanie rundy bez potwierdzenia; fragment pytania po odpowiedzi schowany w „Treści zadania”; odtwarzanie fragmentu na iOS Safari niesprawdzone; błąd 400 w konsoli przy każdym wczytaniu strony (źródło nieustalone); frontend na produkcji (Firebase) wgrywany ręcznie.

### Pomysły do zrobienia

- **Profil ucznia od pierwszego wejścia.** Na początku więcej rzeczy do wybrania przez ucznia, z których powstaje profil: jak się uczy (profil psychologiczny: motywacja, tempo, co go zniechęca), co umie, czego nie, ile czasu zajmują mu zadania. Profil uzupełnia się sam z wyników i czasów z arkuszy.
- **Polecenia na podstawie profilu.** „Co robić dziś” z tego, co uczeń umie, czego nie i ile ma czasu. Uczeń ma priorytety (np. „najpierw słuchanie”, „mam 20 minut dziennie”), które zmienia rozmową z Pestką, a Pestka zapisuje je w profilu.
- **Jeden spójny design.** Ustalić raz: gdzie karty, a gdzie linie, jakie teksty i w jakim rozmiarze, czytelność (kontrast, szerokość wiersza). Przejść przez wszystkie widoki i ujednolicić. Zapisać zasady w `apps/web/README.md`.
- **Brudnopis: wygładzanie pisma.** Odręczne pismo w brudnopisie automatycznie poprawiane na czytelne (rozpoznanie znaków i wzorów, zamiana na tekst albo wygładzona kreska), z możliwością cofnięcia.
- **Brudnopis: prostowanie przez przytrzymanie.** Narysowana kreska, przytrzymana chwilę na końcu, prostuje się w linię (a zamknięty kształt w okrąg, trójkąt lub prostokąt), jak w notatkach na tablecie.
- **Pestka przy tablicy matematycznej.** Na tablicy (brudnopis) Pestka „nadskakuje” po prawym przycisku: analizuje to, co uczeń napisał lub narysował (eksport sceny albo zdjęcie), mówi, co widzi, i sama coś dopisuje albo rysuje, np. figurę, oś czy podpowiedź w kolejnym kroku.
- **Analiza zdjęcia.** Uczeń wrzuca zdjęcie rozwiązania z kartki, a Pestka czyta je i omawia jak błędy z arkusza.

## 1. Decyzje otwarte

- **Pule arkuszy CKE:** osobne pule na naukę i na egzamin (rekomendacja) czy nauka tylko z wygenerowanych wariantów. Najpierw policzyć arkusze dla angielskiego dwujęzycznego i informatyki w formule 2023.
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
- **Sprawdzanie kodu (informatyka):** wyniki porównujemy z kluczem, kod uruchamia się w przeglądarce (warsztat). Zostało: ocena algorytmów zapisanych w arkuszu i zapytań SQL (np. uruchomienie zapytania ucznia na danych i porównanie z zapytaniem z klucza), wykresy.
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
