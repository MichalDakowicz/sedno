# Pestka w nauce

`POST /functions/v1/nauka-ai` przyjmuje JSON z polem `action`. Wywołanie wymaga nagłówków `Authorization: Bearer <access_token>` oraz `apikey` jak bramka `ai`. Funkcja wybiera dostawcę z konta, zapisuje metadane zużycia w `ai_usage` i korzysta ze wspólnego limitu 30 wywołań modelu na minutę.

| `action` | Pola wejścia | Odpowiedź |
| --- | --- | --- |
| `dopasuj-temat` | `temat` do 280 znaków, `poziom` | `{umiejetnosc, format}`. Oba mogą być `null`, gdy temat nie pasuje do katalogu angielskiego. |
| `sokratejski` | `umiejetnosc`, `poziom`, `historia?` | `{pytanie, zakoncz}`. Historia to pary `{od:"pestka",tekst}`, `{od:"uczen",tekst}` po maks. 1000 znaków na wpis. Początek rozmowy to pusta lista. Po siedmiu parach `pytanie` jest `null`. Można wcześniej przejść do mini-testu przez RPC sesji nauki. |
| `krok-po-kroku` | `etap`, `poziom`, `polecenie` do 3500 znaków, `tekst` do 8500 znaków | `{etap,slowa,akapity,statusy,pytanie}`. Kod liczy słowa i akapity oddzielone pustą linią. Pusty szkic daje `do-zrobienia` i `pytanie:null`. |
| `uczen-uczy-scenariusze` | Brak dodatkowych pól | `{scenariusze}` z tytułem, poleceniem, błędnym przykładem i identyfikatorami kryteriów. |
| `uczen-uczy` | `scenariusz`, `wypowiedzi` ucznia, od jednej do sześciu po maks. 1500 znaków | `{kolega,statusy,ruch,zakoncz,omowienie}`. Omówienie z regułą pojawia się po zakończeniu rundy. |
| `odczytaj-zdjecie` | `obraz:{mime,base64}` | `{tekst,watpliwosci}`. Odczyt pisma odręcznego do zatwierdzenia lub poprawy przez ucznia. |
| `omow-odczyt` | `polecenie` do 3500 znaków, sprawdzony przez ucznia `odczyt` do 8500 znaków | `{uwaga,pytanie}`. |
| `omow-brudnopis` | `polecenie` do 3500 znaków, `pytanie?` do 500 znaków, `obraz?` jak dla zdjęcia. Potrzebne jest pytanie lub obraz. | `{odczyt,wskazowka,ksztalty,dopiski,bryla,pominietoElementy}`. Odczyt i bryła mogą mieć wartość `null`. Do ośmiu figur płaskich, trzech dopisków i jednej bryły do wstawienia po zatwierdzeniu przez ucznia. |
| `mapa-wiedzy-polaczenia` | `notatki` — od 2 do 8 różnych UUID-ów własnych notatek z jednego przedmiotu | `{krawedzie}`, lista nowych propozycji `{first_id,second_id,label,status}`. Potwierdzenie i usuwanie opisano w [Mapie wiedzy](narzedzia-nauki.md). |
| `wizualizacje` | Opcjonalny `przedmiot` | `{modele}` z parametrami i pytaniami pomocniczymi. |
| `wizualizacja` | `id` i opcjonalne parametry modelu | Stan modelu do prezentacji w aplikacji. |

`poziom` to `podstawowy`, `rozszerzony` lub `dwujezyczny`. Etapy pisania to `plan`, `wstep`, `rozwiniecie`, `zakonczenie`, `przeglad`. Status kryterium to `dobrze`, `do-poprawy`, `do-zrobienia` lub `niepewne`. Wyniki odczytu, tutora i Sędziego służą do omówienia. Punkty i dowody opanowania powstają w sesjach ocenianych kluczem.

Sędzia dostaje scenariusz wraz z regułą i wypowiedziami ucznia. Wypowiedź Kolegi jest dobierana w kodzie z gotowych reakcji na klasyfikację Sędziego. Tekst dostawcy zawierający klasyfikację pozostaje po stronie serwera.

Odczyt zdjęcia obsługuje JPEG, PNG i WebP do 1 MiB po dekodowaniu. Wysyła obraz jako `image_url` z adresem `data:` do dostawcy konta ustawionego dla poziomu `wazne`. Ten model musi obsługiwać wejście obrazowe przez OpenAI-compatible Chat Completions. Zdjęcie pozostaje w żądaniu, a poprawiony odczyt jest osobnym żądaniem. Przy sugestii połączeń dostawca otrzymuje tytuły i pierwsze 900 znaków każdej wskazanej notatki. Teksty zwracane przez dostawcę należy wyświetlać jako tekst.

Wizualizacje działają bez konfiguracji dostawcy. `parabola` przyjmuje liczbowe `a,p,q` w zakresach z katalogu i zwraca próbki funkcji, wierzchołek oraz opis. `wyszukiwanie-binarne` przyjmuje posortowaną `tablica` do 25 liczb całkowitych i liczbę `szukana`. Zwraca kroki z indeksami liczonymi od zera oraz indeks trafienia lub `null`. `tekst-parafraza` zwraca tekst i parafrazę. Po podaniu identyfikatora w polu `fragment` zwraca dodatkowo `zgodny` i `objasnienie`.

Analiza brudnopisu używa dostawcy dla zadań `wazne`. Każdy sugerowany kształt ma `typ` i `punkty`, pary liczb w zakresie 0–1. Współrzędna x rośnie w prawo, y w dół. Typy `odcinek` i `strzalka` wymagają dwóch końców, `prostokat` i `elipsa` dwóch przeciwległych narożników, a `trojkat` trzech wierzchołków. Aplikacja może wstawić zaakceptowany schemat obok pracy ucznia. Błąd `image_not_supported` oznacza, że dostawca jawnie odrzucił wejście obrazowe.

Dopisek ma postać `{typ,tekst}`. Typ to `obliczenia`, `tekst` lub `kod`. Treść to prosty zapis do 480 znaków i 12 wierszy, z zachowanymi wcięciami. Po akceptacji Pestka zapisuje znaki i kreśli figury po kolei. Aplikacja zapisuje całą propozycję jako jedną edytowalną zmianę i uwzględnia preferencję mniejszego ruchu. Kod jest przykładem do czytania. `pominietoElementy` sygnalizuje odrzucone figury lub dopiski i pozostawia dostępną wskazówkę.

`bryla` ma pola `typ`, `wymiary` (trzy długości albo `null`) i `oznaczenia` (napisy przy krawędziach i odcinkach pomocniczych). Obsługiwane są sześcian, prostopadłościan, graniastosłup o podstawie trójkąta prostokątnego, ostrosłup o podstawie prostokątnej z wierzchołkiem nad środkiem podstawy, walec, stożek i kula. Uczeń może obrócić bryłę w podglądzie. Na tablicę trafia wybrany rzut z liniami przerywanymi dla niewidocznych krawędzi i odcinków pomocniczych. Niepoprawny element zostaje pominięty lub zastąpiony domyślną wartością, co sygnalizuje `pominietoElementy`.

Odpowiedzi błędów mają kształt `{error}`. Typowe kody to `bad_input`, `bad_image`, `no_provider`, `rate_limited`, `provider_failed` i `bad_model_response`. `notes_not_found` dotyczy każdej brakującej lub niedostępnej notatki. `notes_changed` pozwala ponowić żądanie po odświeżeniu listy.
