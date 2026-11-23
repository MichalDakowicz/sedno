# Warianty i ocena rozwiązań otwartych

Akcje funkcji `nauka-ai` wymagają sesji Supabase. Klient wywołuje je przez `supabase.functions.invoke("nauka-ai", { body })`.

| Akcja | Wejście | Wynik |
| --- | --- | --- |
| `warianty-katalog` | Opcjonalny `przedmiot` | `{szablony}` z polami `id`, `przedmiot`, `poziomy` i `nazwa`. |
| `wariant-zadania` | `id` (UUID), `szablon` z katalogu | `{id,szablon,przedmiot,zadanie}`. `zadanie` zawiera `polecenie`, `forma`, `punkty` oraz ewentualnie `dane` i `pola`. |
| `ocen-rozwiazanie` | `proba` (UUID), `wariant` (UUID) albo para `arkusz,pytanie`, `odpowiedz` | `{proba,zrodlo,status,metoda,punkty,maksPunktow,opis}`. Wariant może zwrócić `kryteria`, a ocena według rubryki odwołanie `zasady` do PDF-u CKE. |

Każde nowe żądanie zadania losuje dane z jednego z dziesięciu szablonów. Klucze liczy serwer. Konto dostaje różne zadania w ramach danego szablonu. Ponowienie z tym samym `id` i `szablon` zwraca wcześniejsze zadanie. Klucz oraz dodatkowe zestawy danych dla SQL pozostają w prywatnej tabeli.

### Odpowiedź

- Dla form `liczba`, `tekst` i `lista` użyj `odpowiedz.tekst`. Liczbę można zapisać dziesiętnie, jako ułamek lub procent. Pierwiastki równania oddziel średnikiem.
- Dla formy `pola` użyj `odpowiedz.pola` z nazwami z `zadanie.pola`. Każde pole przyjmuje tekst.
- Dla formy `sql` użyj `odpowiedz.kod`. Szablon sum w grupach sprawdza pojedynczy `SELECT` z grupowaniem po dziale na widocznym i dodatkowych zestawach. Rozpoznaje `SUM` i `COUNT`, filtr roku oraz kolejność działów. Ocena zapytania spoza tego podzbioru wymaga weryfikacji.
- Dla arkusza można przekazać `odpowiedz.tekst`, `wynik`, `kod`, `jezyk` oraz zdjęcie `obraz:{mime,base64}` jak w `odczytaj-zdjecie`. Identyfikator `pytanie` przyjmuje również podpunkty, np. `"3.1"`. Ocena dotyczy otwartych pytań z matematyki i informatyki oraz otwartych pytań z polem `rysowanie` w dowolnym przedmiocie. Wtedy `obraz` to figura z arkusza z kreskami ucznia, a model dostaje także `rysowanie.polecenie`. Pusty lub nieczytelny rysunek dostaje 0 punktów. Schemat CKE i rozwiązanie pochodzą z bazy.

### Punktacja i ponowienia

Metoda `klucz` porównuje odpowiedzi jednoznaczne. Metoda `testy` sprawdza wariant zapytania SQL. Metoda `rubryka` wykorzystuje model dla pracy z arkusza, w tym rozumowania, kodu, pseudokodu i SQL. Kryteria i maksymalna punktacja pochodzą z rekordu arkusza albo ze wskazanego PDF-u CKE. Kod z arkuszy jest oceniany na podstawie rubryki i rozwiązania wzorcowego. Nieczytelna praca, brak punktacji lub format wymagający sprawdzenia zwracają `status:"do-weryfikacji"` i `punkty:null`.

Wyślij ten sam UUID próby po utracie połączenia. Zakończona próba zwraca zapisany wynik, a równoległe ocenianie zwraca `409 grading_in_progress`. Zmiana treści lub celu próby wymaga nowego UUID. W bazie zostaje wynik i skrót zgłoszenia, bez kopii tekstu, kodu i zdjęcia ucznia. Ocenianie zwraca wynik przez API. Dane arkusza i jego dotychczasowa punktacja klienta są niezależne od tego zgłoszenia.
