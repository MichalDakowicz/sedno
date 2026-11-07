# arkusze

Import arkuszy maturalnych CKE do JSON dla aplikacji: język angielski (formuła 2015 i 2023, wszystkie lata dostępne na stronie CKE) i matematyka na poziomie podstawowym (formuła 2023). Na razie bez AI: parser oparty na regułach i układzie tekstu w PDF.

Pliki CKE i wynikowe JSON-y lądują w `data/` w katalogu głównym, który jest w `.gitignore`. Materiały CKE mają prawa autorskie i nie trafiają do repozytorium, dopóki nie ustalimy warunków użycia.

## Użycie

Z katalogu głównego repo:

```bash
npm run pobierz    # PDF-y ze strony CKE do data/cke/<rok>/
npm run importuj   # JSON-y do data/arkusze/
npm run kontrola   # spójność danych: klucze, luki, punkty
```

Aplikacja webowa w trybie dev czyta `data/arkusze/` (patrz `apps/web/vite.config.ts`). Nagrań nie pobieramy: JSON ma adres pliku mp3 na stronie CKE.

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

## Matematyka

Tekst z PDF gubi ułamki, potęgi i pierwiastki. Treść ze wzorami bierzemy więc z formy 660 arkusza (DOCX dla osób niewidomych, `MMAP-P0-660-…docx`), w której wzory są równaniami Office (OMML). Z PDF bierzemy numerację, punkty, figury i klucz wersji A.

- `docx.js`: fragmenty „Zadanie N.” z blokami `akapit` (wzory inline w `\( … \)`), `wzor` (osobna linia), `opcja`, `tabelaTresci`, `miejsceRysunku`. Polecenia „Zapisz właściwą odpowiedź” zamienia na „Wybierz…”, a legendę kolumn („Oc – ocena”) wstawia z powrotem do nagłówka tabeli.
- `omml.js`: OMML na LaTeX (ułamki, potęgi i indeksy, pierwiastki, nawiasy, funkcje, układy w klamrze, akcenty). Zmienne idą kursywą mimo stylu „plain” w Wordzie, słowa („dla”) jako `\text`, przecinek dziesiętny jako `{,}`.
- `matematyka.js`, PDF: fragment to nagłówek „Zadanie N.” albo „Zadanie N.M.” z treścią do następnego nagłówka lub etykiety „Brudnopis”, z częściami na kolejnych stronach. Każdy fragment ma kadr, czyli wycinek wyrenderowanej strony (pdfjs + `@napi-rs/canvas`, 2 px na punkt, `data/arkusze/obrazy/<id>/<nr>.png`).
- Składanie (`zadaniaMatematyki`): treść z DOCX, gdy zgadza się z PDF (podobieństwo 2·LCS/(|a|+|b|) ≥ 0,8 na samych literach i cyfrach; dla tabel także udział wspólnych znaków ≥ 0,9). Inaczej blok `kadr`, bo forma 660 bywa przerobiona (inne opcje, opis zamiast figury). Import wypisuje kadry z powodem. Podpunkty dostają nagłówek, zdania-polecenia flagę `polecenie`.
- Rysunek bazowy (`<nr>-rysunek.png`, pole `rysunek` zadania i blok `rysunek` w miejscu rysunku z DOCX) to najwyższy pas tuszu bez linii akapitu, co najmniej 70 × 80 pt, a 20 pt tam, gdzie DOCX ma rysunek. Tabele „A albo B oraz 1–3” pomijamy. Ramkę poprawia się ręcznie w `rysunki.json`: `{ "<id arkusza>": { "<nr>": null | { "strona": n, "ramka": [x0, y0, x1, y1] } } }` (punkty PDF, początek w lewym dolnym rogu; `null` wyłącza rysunek).
- Klucz (`kluczMatematyki`): kolumna „Wersja A” tabeli rozwiązań. Pojedyncza litera A–D przy zadaniu „Wybierz właściwą odpowiedź” daje pytanie zamknięte (z opcjami z DOCX); kod (PF, A2, CE) albo krótki wynik daje pytanie otwarte z `oczekiwane`; resztę uczeń ocenia według schematu ze strony `zasadyStrona` w PDF zasad.
- `kontrola` renderuje każdy wzór przez KaTeX. Podgląd DOCX: `node src/podglad-docx.js <plik.docx> [numery]`.
- Import tylko matematyki: `node src/importuj.js matematyka`.

## Znane ograniczenia

- Wszystkie 39 arkuszy importują się bez ostrzeżeń, a suma punktów zgadza się z arkuszem. Wyjątek znany ręcznie: w dwujęzycznym 2018 klucz pytania 3.4 skleja kilka krótkich odpowiedzi z sąsiednich komórek; uczeń ocenia je sam.
- Tabele kluczy mają różne układy: etykieta pytania na środku komórki (granice liczone w `granice()`) albo u góry; nagłówek „Inne akceptowane odpowiedzi:” w środku komórki; odpowiedzi w punktach; odpowiedzi pełnymi zdaniami łamanymi w kolumnie. Nowy rocznik warto sprawdzić skanem jakości (długie wpisy, polski tekst w odpowiedziach).
- Import części katalogu do testów: `node src/importuj.js 2015` (prefiks formuła-rok-poziom albo przedmiot-formuła-rok-poziom, np. `matematyka-2023`).

- Teksty w kilku kolumnach (np. ulotka w zadaniu 6 rozszerzenia 2025) wychodzą jako wymieszane linie.
- Klucz zadań otwartych bywa przypisany do sąsiedniego pytania na granicy wierszy tabeli. Sprawdzanie w aplikacji traktuje go jako pomoc: pewne „dobrze” tylko przy zgodności z listą, poza nią uczeń porównuje sam.
