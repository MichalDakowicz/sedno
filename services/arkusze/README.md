# arkusze

Import arkuszy maturalnych CKE (język angielski, formuła 2015 i 2023, wszystkie lata dostępne na stronie CKE) do JSON dla aplikacji. Na razie bez AI: parser oparty na regułach i układzie tekstu w PDF.

Pliki CKE i wynikowe JSON-y lądują w `data/` w katalogu głównym, który jest w `.gitignore`. Materiały CKE mają prawa autorskie i nie trafiają do repozytorium, dopóki nie ustalimy warunków użycia.

## Użycie

Z katalogu głównego repo:

```bash
npm run pobierz    # PDF-y ze strony CKE do data/cke/<rok>/
npm run importuj   # JSON-y do data/arkusze/
npm run kontrola   # spójność danych: klucze, luki, punkty
npm run wgraj      # data/arkusze/ do tabeli sheets w Supabase (ssh na serwer)
```

Aplikacja webowa czyta arkusze z tabeli `sheets` w Supabase (tylko zalogowani), więc po każdym imporcie trzeba je wgrać (`wgraj.js`). Na hosting nie trafiają. Nagrań nie pobieramy: JSON ma adres pliku mp3 na stronie CKE.

## Jak to działa

- `pobierz.js` przechodzi po stronach lat obu formuł, `pliki.js` rozpoznaje pliki po nazwie (nazewnictwo zmieniało się trzy razy, opis w pliku). Wynik to `data/cke/katalog.json`: formuła, rok, poziom, arkusz, klucz i adres nagrania.
- `tekst.js` wyciąga tekst przez pdfjs. Linia to fragmenty o tym samym `y`; fragmenty oddzielone dużą przerwą są osobnymi segmentami (kolumny tabel).
- `arkusz.js` dzieli arkusz na zadania („Zadanie N. (0–X)” / „TASK N.”), a zadanie na bloki w kolejności z arkusza: akapit, nagłówek, źródło, opcje, pytanie, tabela odpowiedzi. Luki w tekście zamienia na znaczniki `{{3.1}}`. Akapity rozpoznaje po odstępach w pionie.
- `klucz.js` czyta zasady oceniania: litery z kolumny „Poprawna odpowiedź” (przy dwóch wersjach arkusza bierze wersję A) oraz listy odpowiedzi oczekiwanych, akceptowanych i niepoprawnych dla zadań otwartych. Zapis typu `healthy food / dishes` rozwija na warianty.
- `scal.js` łączy jedno z drugim: pytanie z literą w kluczu jest zamknięte, reszta otwarta, zadanie bez etykiet pytań to wypowiedź pisemna.
- `importuj.js` zapisuje `<id>.json` i `index.json`, a w polu `ostrzezenia` notuje rozjazdy (pytanie bez klucza, suma punktów różna od podanej na arkuszu).

Podgląd przy poprawianiu parsera:

```bash
node src/podglad.js ../../data/cke/2025/MJAP-P0-100-A-2505-arkusz.pdf [nr zadania]
node src/podglad-klucz.js ../../data/cke/2025/MJAP-R0-100-200-660-2505-zasady.pdf
node src/zrzut.js <plik.pdf>   # surowe linie z pozycjami do pliku .pdfjs.txt
```

## Znane ograniczenia

- Wszystkie 39 arkuszy importują się bez ostrzeżeń, a suma punktów zgadza się z arkuszem. Wyjątek znany ręcznie: w dwujęzycznym 2018 klucz pytania 3.4 skleja kilka krótkich odpowiedzi z sąsiednich komórek; uczeń ocenia je sam.
- Tabele kluczy mają różne układy: etykieta pytania na środku komórki (granice liczone w `granice()`) albo u góry; nagłówek „Inne akceptowane odpowiedzi:” w środku komórki; odpowiedzi w punktach; odpowiedzi pełnymi zdaniami łamanymi w kolumnie. Nowy rocznik warto sprawdzić skanem jakości (długie wpisy, polski tekst w odpowiedziach).
- Import części katalogu do testów: `node src/importuj.js 2015` (prefiks formuła-rok-poziom).

- Teksty w kilku kolumnach (np. ulotka w zadaniu 6 rozszerzenia 2025) wychodzą jako wymieszane linie.
- Klucz zadań otwartych bywa przypisany do sąsiedniego pytania na granicy wierszy tabeli. Sprawdzanie w aplikacji traktuje go jako pomoc: pewne „dobrze” tylko przy zgodności z listą, poza nią uczeń porównuje sam.
