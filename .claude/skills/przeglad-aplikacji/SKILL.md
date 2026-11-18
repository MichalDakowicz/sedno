---
name: przeglad-aplikacji
description: Pełny przegląd aplikacji webowej przed wydaniem albo pokazem — co przybyło w repo, testy przez agentów (baza, logika, dane, przejście po ekranach), ocena wyglądu, spójności, intuicyjności, brakujących funkcji i postaci-marki, a na końcu lista napraw w paczkach i zlecenie ich agentom. Użyj, gdy użytkownik prosi „przejrzyj wszystko”, „przetestuj aplikację”, „co poprawić / usprawnić”, „zrób audyt”, „sprawdź, czy design jest spójny”, „co jeszcze dorobić”.
---

# Przegląd aplikacji

Cel: jedna lista napraw i usprawnień z plikami i priorytetami, a potem ich wykonanie. Podział ról: **główny model czyta kod i ocenia**, **agenty (Opus albo Sonnet) testują, zbierają dowody i wdrażają**. Agent nie ocenia wyglądu: dostarcza zrzuty i fakty.

Zanim zaczniesz, przeczytaj instrukcje projektu (`CLAUDE.md`, README aplikacji, plik z następnymi krokami, notatki przekazania od innych osób). Zasady projektu (git, atrybucja, staging, język) mają pierwszeństwo przed tym plikiem.

## 1. Co przybyło

1. Zaktualizuj gałąź główną (`git pull --ff-only`) i policz, co weszło od ostatniego znanego stanu: `git log`, `git diff --shortstat`, największe zmienione pliki, otwarte gałęzie.
2. Przeczytaj notatki przekazania innych osób albo agentów: co już sprawdzono, co świadomie zostawiono. Nie powtarzaj ich testów, szukaj tego, czego nie objęły.
3. Stan bazowy: instalacja zależności, typecheck, build. Zanotuj rozmiary największych paczek. Odrzuć przypadkowe zmiany (np. `package-lock.json` po instalacji).
4. Powiedz użytkownikowi w kilku zdaniach, co przybyło, zanim ruszysz dalej.

## 2. Testy przez agentów (równolegle, w tle)

Każdemu agentowi daj: cel, co wolno, czego nie wolno (żadnych zmian w repo, żadnych commitów, żadnych zdalnych serwerów), katalog na pliki robocze poza repo, format raportu (ranking, plik:linia, kroki odtworzenia, wynik rzeczywisty i oczekiwany, co wykonano, a co tylko przeczytano). Bez odtworzenia albo dokładnej linii nie ma znaleziska.

- **Baza (Opus).** Czysta baza w Dockerze (obraz zgodny z produkcją, np. `supabase/postgres`), wszystkie migracje po kolei, dane testowe, wywołania funkcji jako zalogowany użytkownik. Szukać: błędów wzorów (dzielenie przez zero, NULL, pusty stan nowego konta), dziur w dostępie między kontami i bez logowania, funkcji z uprawnieniami właściciela bez `search_path`, powtórzeń przy podwójnym wysłaniu, stref czasowych. Kontener usunąć po testach.
- **Logika (Sonnet).** Krótkie skrypty uruchamiane na czystych funkcjach: synchronizacja z kontem (utrata i przeciek danych po wylogowaniu, nadpisanie nowszych danych starszymi), sprawdzanie odpowiedzi (normalizacja liczb, wielkości liter, znaków), daty graniczne, parsowanie odpowiedzi modelu, ochrona adresów. Moduły zależne od klienta bazy testować na kopii ze stubami.
- **Dane i dokumenty (Sonnet).** Własna kontrola projektu, potem własny walidator danych wejściowych (klucze, sumy punktów, duplikaty, śmieci z PDF, kolejność czasów) i sprawdzenie strony dokumentacji (martwe linki, sieroty, nieaktualne opisy w README). Materiałów chronionych prawem autorskim nie cytować szerzej niż kilka słów.
- **Przejście po ekranach (Opus).** Dopiero gdy użytkownik zaloguje się w panelu przeglądarki; haseł nie wpisuje ani główny model, ani agent. Agent przechodzi wszystkie ścieżki na komputerze (1280), telefonie (375) i w ciemnym motywie, sprawdza konsolę, i **zapisuje ścieżkę pliku każdego zrzutu** (linia „[Image: source: …]” w wyniku narzędzia). Raport: błędy z krokami, fakty o postaci-przewodniku na każdym ekranie (gdzie jest, co zrobiła po każdej akcji, co odpowiedziała), lista zrzutów z opisem stanu, dane utworzone na koncie. Na produkcyjnym backendzie: minimum zapisów, żadnych usunięć, żadnych zmian ustawień na stałe.

Najpoważniejsze znaleziska agentów potwierdź samodzielnie w kodzie, zanim podasz je jako pewne. W raporcie dla użytkownika rozdzielaj: „potwierdziłem w kodzie” i „z raportu agenta, niesprawdzone”.

## 3. Czytanie kodu (główny model)

Kolejność według ryzyka: funkcje serwerowe i walidacja wejścia, synchronizacja danych z kontem, główna pętla produktu (to, co ma zrobić wrażenie), potem reszta. Przy okazji policz z CSS:

- wartości `border-radius` i `font-size` we wszystkich arkuszach stylów (`grep -rhoE … | sort | uniq -c`): ile jest poza tokenami, ile tekstu ma 12–14 px;
- gdzie postać-przewodnik jest wpięta (wywołania wskazówek, atrybuty kontekstu), a gdzie jej nie ma.

## 4. Ocena wyglądu: ekran po ekranie, nie wyrywkowo

Obejrzyj **wszystkie** zrzuty, nie kilkanaście. Dla każdego ekranu przejdź tę listę, w tej kolejności:

1. **Wyrównanie.** Lewa krawędź nagłówka i treści; bloki obok siebie (karta + blok boczny: wspólna górna linia albo wyśrodkowanie, nigdy „przyklejone do góry” przy wyższym sąsiedzie); wartości po prawej stronie wierszy listy w jednej kolumnie; dolne krawędzie kolumn.
2. **Spójność między ekranami.** Ten sam element ma wyglądać tak samo wszędzie: nagłówek strony (etykieta, tytuł, opis, linia), zaznaczona opcja (pigułki, zakładki), ta sama kontrolka dla tej samej rzeczy (np. poziom raz jako lista, raz jako pigułki to błąd), karta polecenia (cień, ramka, odstępy), nagłówki sekcji, przełączniki, wiersze list, przyciski drugorzędne.
3. **Typografia.** Skala rozmiarów w tokenach; tekst do czytania min. 15 px; opisy pod nazwami nie drobniejsze niż reszta; interlinia; szerokość wiersza do ok. 60–70 znaków.
4. **Zaokrąglenia i cienie.** Tylko wartości z tokenów; dymki rozmów takie same wszędzie.
5. **Hierarchia.** Jeden główny przycisk na ekran; linki obok przycisku nie wyglądają jak przypadkowy tekst; metadane nie udają linków.
6. **Stany.** Ładowanie (szkielet zamiast pustki, brak skoków układu), pusty stan z przyciskiem, błąd z ponowieniem, fokus klawiatury bez ramek wyglądających jak błąd.
7. **Szybkość odczuwalna.** Czy powrót na odwiedzoną stronę ładuje wszystko od nowa (brak pamięci podręcznej danych), ile sekund trwają najwolniejsze miejsca.
8. **Telefon i ciemny motyw.** Zasłanianie treści przez elementy pływające, przewijanie w poziomie, kontrast.

Jeśli użytkownik sam wyłapie coś, czego nie było na liście, to znak, że przegląd był za płytki: przejdź tę listę jeszcze raz na wszystkich ekranach, zamiast dopisywać jeden punkt.

## 5. Intuicyjność: droga użytkownika

Przejdź drogę od pierwszego wejścia do powtarzanej codziennej czynności i odpowiedz:

- Czy po wejściu wiadomo, co zrobić najpierw i dlaczego? Czy jest **jedno** źródło „co robić dziś”, czy kilka ekranów liczy własne propozycje, które się różnią?
- Czy ekran zaczyna się od działania, czy od ustawień i filtrów?
- Ile jest równorzędnych sposobów zrobienia tego samego bez wskazówki, który wybrać?
- Czy menu ma pozycje, które są w praktyce częścią innej pozycji?
- Czy ta sama rzecz ma jedną nazwę we wszystkich miejscach? Czy żargon jest wyjaśniony albo usunięty?
- Czy liczby pokazywane w różnych miejscach się zgadzają (liczniki, procenty, czasy)?
- Czy aplikacja mówi wprost, czego jeszcze nie ma, zamiast pokazywać puste albo sprzeczne stany?
- Czy materiały robocze (szablony, „w przygotowaniu”) są schowane przed odbiorcą pokazu?

## 6. Brakujące funkcje

Porównaj, co obsługuje backend, z tym, co woła frontend (lista akcji funkcji serwerowych i funkcji bazy kontra ich użycia w kodzie aplikacji). Gotowy backend bez widoku to najtańsza nowa funkcja. Potem: postęp w czasie, start dla nowego użytkownika (diagnoza), pokrycie pozostałych obszarów produktu, materiały wymagane do wydania albo zgłoszenia.

## 7. Postać jako marka

Jeśli produkt ma postać-przewodnika: czy jest na każdym ekranie, czy reaguje na to, co robi użytkownik (sukces, błąd, seria, koniec zadania, bezczynność), czy wie, na co użytkownik patrzy, gdy ten ją woła, czy nie zasłania treści i przycisków. Dla marki: karta charakteru (jak mówi, czego nie robi), zestaw emocji, obecność w ładowaniu, pustych stanach i błędach, jeden głos we wszystkich poleceniach, znak w logo i ikonie, imię zamiast słów „tutor” i „AI”, motyw graficzny łączący nazwę produktu, postać i postęp.

## 8. Lista napraw

Zapisz w notatkach roboczych projektu (np. `notes/przeglad-RRRR-MM-DD.md`), w paczkach, z których każda da się zlecić osobno:

- paczka = temat (np. „runda i rozbiór”, „postać zawsze obok”, „typografia i spójność”, „utrata danych”, „baza”, „treść”, „porządki”);
- punkt = co jest dziś, co ma być, plik i linia, skąd wiadomo (kod, test, zrzut);
- na końcu: co działa dobrze i ma zostać, oraz dane testowe zostawione na kontach.

Nie planuj w dniach. Podaj kolejność i zależności (np. progi grafiki zależą od poprawki wzoru w bazie).

## 9. Zlecenie agentom

- Jedna gałąź i jeden PR na cały zestaw, chyba że projekt mówi inaczej. Agenty pracują **po kolei**, bo dotykają tych samych plików.
- W zleceniu: zakres (które paczki, w jakiej kolejności), twarde granice (np. tylko frontend, bez nowych zależności), wzorce do ponownego użycia z nazwami plików, zasady projektu (styl, język tekstów, motywy, 375 px, dostępność), zasady gita projektu (małe commity, brak atrybucji, bez pushowania), obowiązkowa weryfikacja (typecheck, build, podgląd w przeglądarce ze zrzutami) i format raportu.
- Naprawiać wspólnymi klasami i komponentami, nie łatką na każdym ekranie.
- Nowe uwagi użytkownika w trakcie dosyłaj agentowi wiadomością jako kolejne punkty zakresu.
- Między paczkami wymagaj tylko zielonego typechecku i builda. **Pełny przegląd kodu i wyglądu robi główny model raz, na końcu**, potem poprawki, push i PR. Scalanie zostaje dla użytkownika, jeśli tak ustalono.
- Zmiany w bazie i funkcjach serwerowych idą przez staging, nie prosto na produkcję.

## Raportowanie w trakcie

Po każdym etapie krótka wiadomość: co skończone, co potwierdzone samodzielnie, co jeszcze trwa. Wyniki agentów podawaj dopiero, gdy wrócą. Na pytanie „czemu tego nie wyłapałeś” odpowiadaj wprost, co było sprawdzone, a co nie, i od razu nadrabiaj.
