# arkusze

Importer pobiera standardowe pisemne arkusze CKE i zasady oceniania obu formuł, a następnie składa JSON czytany przez aplikację. Gdy standardowy arkusz ma wersje A i B, importujemy wersję A. Katalog rejestruje osobne zeszyty polskiego i informatyki w sesjach, w których CKE je opublikowała.

## Uruchomienie

Z katalogu głównego repozytorium:

~~~bash
npm install
npm run pobierz
npm run importuj
npm run kontrola
~~~

Pliki CKE i wyniki pozostają w ignorowanym przez Git katalogu `data/`. W worktree na Windows można współdzielić wejście przez junction `data/cke` do `C:\sedno\data\cke`. Wyjście `data/arkusze` należy do bieżącego worktree. Nagrania angielskiego zostają pod oficjalnymi adresami CKE. W przypadku informatyki ZIP z danymi jest rozpakowywany do pola `dane.pliki`.

Do kontroli wybranych arkuszy służą prefiksy identyfikatora lub formuły, np. `npm run importuj -- biologia-2023 polski-podstawowy-2026-maj`. Import z prefiksami aktualizuje wyłącznie pasujące wpisy indeksu. Wczytywanie do Supabase to osobna operacja opisana na końcu.

## Katalog i terminy

| Pole | Znaczenie |
| --- | --- |
| termin | glowny, dodatkowy, poprawkowy lub probny |
| sesja | Rzeczywisty miesiąc, np. maj, czerwiec, sierpień lub grudzień |
| czesc | Etykieta osobnego zeszytu, np. Część 2 |
| id | przedmiot-poziom-rok-miesiac[-czesc-N][-probna][-formula-2015] |

Identyfikatory trzech arkuszy angielskiego z czerwca 2020 zachowują końcówkę maj-formula-2015 na potrzeby zapisanych postępów. Ich pole sesja ma wartość czerwiec. Formuła 2023 zachowuje identyfikatory bez sufiksu formuły.

`pobierz.js` czyta wykazy lat, archiwum i materiały dodatkowe na cke.gov.pl. Rozpoznaje linki według nazw plików i opisów, dopasowuje formę 100 lub historyczny odpowiednik A1 oraz łączy zeszyty ze wspólnym kluczem. Próby obejmują również publikacje diagnostyczne, m.in. materiały z marca, września i grudnia 2022. Samodzielny załącznik mapy i ZIP są kojarzone z właściwą sesją.

Raport `data/cke/braki.json` zawiera niedostępne strony, nieudane pobrania, niekompletne wpisy i terminy bez linków. W sprawdzonych publicznych wykazach CKE i OKE nie potwierdzono arkuszy terminów dodatkowych i poprawkowych w Formule 2015 ani 2023. W [katalogu Komisji Egzaminacyjnych](https://egzaminy.gov.pl/cke/materialy-egzaminacyjne/egzamin-maturalny) parametry czerwca i sierpnia zwracały domyślny maj. Próby zmiany kodu sesji w adresach plików z terminów głównych nie dały PDF-ów tych terminów.

OKE Łomża publikuje trzy archiwalne zestawy sprzed Formuły 2015. Pobranie PDF i treść pierwszych stron potwierdzają poniższe sesje. Wszystkim wymienionym arkuszom brakuje zweryfikowanych oficjalnych zasad oceniania.

- [Czerwiec 2012](https://oke.lomza.pl/aktualnosci/arkusze-egzaminu-maturalnego-czerwiec-2012-r/) obejmuje 20 zeszytów z angielskiego, biologii, chemii, francuskiego, geografii, historii, matematyki, polskiego i WOS-u.
- [Sierpień 2012](https://oke.lomza.pl/aktualnosci/arkusze-egzaminu-maturalnego-sierpie-2012-r/) obejmuje 4 arkusze podstawowe z angielskiego, matematyki, niemieckiego i polskiego.
- [Sierpień 2014](https://oke.lomza.pl/aktualnosci/arkusze-z-egzaminu-poprawkowego-w-2014-r/) obejmuje 3 arkusze podstawowe z angielskiego, matematyki i polskiego.

Czerwiec 2020 w katalogu był terminem głównym przesuniętym z maja.

## Parsery

| Przedmiot | Treść i klucz |
| --- | --- |
| Angielski | Istniejący parser bloków, luk i słuchania. W nowych sesjach uzupełniamy brakujące odpowiedzi opisowe tekstem i stroną zasad. Dwie kolumny tekstu bez nagłówków (dymki, podpis obok wiadomości) rozpoznajemy po liniach przeplatających się co kilka punktów i składamy kolumna po kolumnie. |
| Matematyka | Cztery istniejące arkusze podstawowe Formuły 2023 używają dotychczasowego składania DOCX z PDF. Pozostałe poziomy i sesje używają parsera wspólnego z równaniami DOCX, gdy treść pasuje do wersji standardowej. Starsze klucze zamknięte mogą mieć odpowiedzi w jednym wierszu tabeli. |
| Informatyka | Zachowana ścieżka czterech arkuszy głównych Formuły 2023. Pozostałe arkusze używają wspólnego parsera, z pseudokodem jako kod i plikami przypisanymi do zadań. W Formule 2015 część praktyczna może być osobnym zeszytem. |
| Polski | Parser wspólny plus wykrywanie testu i wypracowania, również przy dwóch tematach w jednym zadaniu. Wypracowanie ma jedno pole otwarte i kryteria CKE, a osobny zeszyt zachowuje drukowaną punktację. |
| Biologia, chemia, fizyka | Parser wspólny. Zachowuje akapity, tabele, indeksy i rysunki. Wykorzystuje równania z DOCX, jeżeli forma 660 ma zgodną treść. |
| Geografia | Parser wspólny. Zewnętrzna mapa CKE jest pierwszą ilustracją arkusza. |
| Historia, WOS, filozofia, łacina | Parser wspólny. Źródła, nagłówki, tabele i ilustracje pozostają w kolejności z arkusza. Zadania argumentacyjne i tłumaczenia zachowują zasady i przykłady z klucza. |

`tresc-pdf.js`, `bloki-pisemne.js` i `arkusz-pisemny.js` składają tekst z położeń i krojów czcionek w PDF. Siatka z renderu wyznacza komórki tabeli. Grafiki wykrywamy po tuszu poza obwiedniami tekstu i tabel. Fragment z nierozpoznanymi znakami może zostać blokiem kadr, a import podaje numer zadania, stronę i powód. Tryb starszych arkuszy zachowuje wcześniej zapisywane bloki i kadry.

W formie 660 równania Office zamieniamy na LaTeX. Porównanie treści formy 660 z arkuszem standardowym opiera się na wspólnych literach i cyfrach. Parser wspólny wybiera zgodny wariant DOCX, jeżeli KaTeX może wyrenderować jego wzory. Ułożony piętrowo wzór z PDF można osadzić jako osobny wycinek między akapitami. Jasna kratka do obliczeń jest pomijana przy wykrywaniu ilustracji.

W angielskiej Formule 2023 `wymagania.js` przypisuje kody wymagań z tabel w kluczu. Fragmenty nagrania wcześniej dopasowane przez `nagrania/dopasuj.py` pochodzą z plików `data/nagrania/<id>-fragmenty.json`, więc ponowny import może je dołączyć.

Klucz pojedynczego wyboru daje przyciski i poprawną literę. P/F i inne jednoznaczne kody używają pola odpowiedzi z kodem, a pewne krótkie odpowiedzi trafiają do `oczekiwane`. Przy odpowiedziach opisowych pola zasady, rozwiazanie i `zasadyStrona` pozwalają porównać odpowiedź z kluczem CKE. Punkty pochodzą z arkusza, a rozbieżności z kluczem i stroną tytułową trafiają do `ostrzezenia`.

## Kontrola i ograniczenia

- `npm run kontrola` sprawdza zgodność indeksu z arkuszami, punkty, odsyłacze do pytań i kluczy, zakresy krojów, obrazy i wzory KaTeX. Ostrzeżenia importu oraz podejrzanie długie odpowiedzi są liczone obok błędów.
- Tabele w źródłach, wielokolumnowe teksty i zapis matematyczny w PDF bywają niejednoznaczne. Rozwiązanie do samooceny może wtedy wymagać otwarcia wskazanej strony klucza, np. gdy klucz pokazuje wykres albo wzór strukturalny.
- Podpunkt z odpowiedzią rysunkową zawiera `rysowanie: { obraz: { src, szer, wys } }`. Analizujemy polecenie i położenie figury w PDF. Przy tworzeniu nowego wykresu szukamy osi lub siatki za poleceniem. Płótno zastępuje wykorzystany blok rysunku we własnym podpunkcie, a figury źródłowe pozostają dostępne w treści. `rysowanie.json` pozwala wybrać ręcznie sprawdzone wycinki w punktach PDF `[lewo, dół, prawo, góra]` lub figurę innego fragmentu. `kontrola` dekoduje osadzone PNG/WebP, porównuje wymiary i sprawdza kontrast. Klucz pytania służy nadal do oceny.
- Regresję należy porównać z kopią `data/arkusze-przed`. Dane z kodem sprzed rozszerzenia i dane po rozszerzeniu powinny mieć takie same identyfikatory, zadania, pytania i klucze dla wcześniejszych 47 arkuszy.

## Podgląd importu i wgrywanie

Polecenia do podglądu, uruchamiane z katalogu głównego:

~~~bash
node services/arkusze/src/podglad.js <plik.pdf> [numer-zadania]
node services/arkusze/src/podglad-klucz.js <plik.pdf>
node services/arkusze/src/podglad-docx.js <plik.docx> [numery-zadań]
node services/arkusze/src/zrzut.js <plik.pdf>
~~~

`npm run wgraj` wczytuje wygenerowany indeks i pliki JSON do tabeli sheets. Dla stagingu ustaw `SEDNO_DB=sb-sedno-dev-db`. `npm run wgraj -- informatyka` ogranicza wgrywanie do pasujących arkuszy.
