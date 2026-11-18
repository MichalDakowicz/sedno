# Design Sedno

Jedno źródło zasad wyglądu dla wszystkich ekranów aplikacji (`apps/web`) i dokumentów (`docs/`). Każdy nowy ekran i każda zmiana istniejącego ma być z nim zgodna. Wartości mieszkają w kodzie: tokeny w `packages/ui/src/tokens.css` (i `tokens.ts` dla mobile), wspólne klasy w `apps/web/src/styles/global.css`. Ten plik mówi, **czego wolno użyć i kiedy**. Gdy zmieniasz token albo wspólną klasę, popraw też ten plik i `docs/style.css`.

## Zasada nadrzędna

Interfejs ma być prosty, czytelny i zrozumiały bez instrukcji. Jeśli coś trzeba tłumaczyć akapitem, zmień kontrolkę albo etykietę, a nie dopisuj tekstu. To, co warto wiedzieć, ale nie od razu, mówi Pestka na żądanie.

## Kolory

Tylko zmienne CSS, nigdy wartości wpisane na sztywno (także w SVG: `var(--fg)`, `var(--primary)`).

| Rola | Token | Jasny | Kiedy |
| --- | --- | --- | --- |
| Tło strony | `--bg` | `#fff9f6` | kremowe tło z siatką (`--grid`) |
| Powierzchnia | `--surface` | `#ffffff` | karty, pola, panel nawigacji, dymki Pestki |
| Tekst | `--fg` | `#0f151d` | tytuły i tekst do czytania |
| Tekst pomocniczy | `--muted` | `#424951` | opisy pod nazwami, lead |
| Tekst drobny | `--subtle` | `#545b63` | etykiety wersalikami, metadane |
| Linie | `--line` | `#ece4df` | separatory sekcji i wierszy, obwódki pól |
| Akcent | `--primary` | `#ff7448` | obwódki zaznaczenia, paski postępu, ikony |
| Akcent pod białym tekstem | `--primary-strong` | `#f2643a` | przycisk główny (tekst min. 19 px, 700) |
| Akcent jako tekst | `--primary-text` | `#c2410c` | drobny pomarańczowy tekst, linki-akcje, kicker |
| Tło akcentu | `--primary-soft` | `#ffe6dc` | zaznaczona pigułka, delikatne wyróżnienie |
| Drugi kolor | `--secondary` / `--secondary-fg` | `#d3e1ff` / `#1b2a4a` | przycisk poboczny, dymek ucznia w rozmowie |
| Dobrze | `--success`, `--success-strong` | `#1f9d63`, `#17804f` | poprawna odpowiedź |
| Źle | `--danger` | `#e40014` | błędna odpowiedź, błąd |
| Przedmioty | `--tone-*-bg` / `--tone-*-fg` | | ikona przedmiotu: polski pomarańczowy, matematyka niebieski, angielski żółty, informatyka zielony |

- Jeden akcent: pomarańczowy. Zielony i czerwony znaczą tylko „dobrze” i „źle”, nie „włączone” ani „ważne”.
- Ciemny motyw to te same tokeny z innymi wartościami (blok na końcu `tokens.css`). Każdy ekran sprawdzamy w obu.
- Kontrast: tekst na tle min. 4,5:1; biały na pomarańczu tylko duży i pogrubiony.

## Typografia

Font: Inter (`--font`). Rozmiary tylko z tej skali; wszystkie rosną z ustawieniem „Rozmiar tekstu” (`--skala-tekstu`).

| Klasa / token | Rozmiar | Waga | Do czego |
| --- | --- | --- | --- |
| `.display` | 40–56 px | 400 | tytuł strony (jeden na ekran) |
| `.h1` | 32–40 px | 400 | tytuł w karcie polecenia |
| `.h2` | 24–28 px | 400 | sekcja strony |
| `.h3` / `--t-lg` | 20 px | 500 | nagłówek wewnątrz sekcji, nazwa w wierszu |
| `.lead` | 20 px, `--muted` | 400 | jedno zdanie pod tytułem strony |
| tekst ciągły | 16 px | 400 | treść zadań, rozmowa |
| `--t-md` | 17 px | | wyróżniony tekst w treści |
| `.small` / `--t-sm` | 15 px, interlinia 1,5 | | opisy w wierszach, wyjaśnienia |
| `.label`, `.kicker` / `--t-xs` | 13 px, wersaliki, 600 | | etykiety i metadane, nic do czytania zdaniami |

- Nagłówki lekkie (400) z ciasnym odstępem liter; hierarchię robi rozmiar i kolor, nie pogrubienie.
- Tekst, który uczeń ma przeczytać, nigdy poniżej 15 px.
- Szerokość wiersza do ok. 60–70 znaków; lead najwyżej jedno krótkie zdanie.
- Żadnych własnych `font-size` w pikselach w modułach CSS.

## Zaokrąglenia i cienie

| Token | Wartość | Do czego |
| --- | --- | --- |
| `--r-xs` | 6 px | znaczniki, małe pola, ścięty róg dymka rozmowy |
| `--r-sm` | 12 px | pola tekstowe wieloliniowe, kafle odpowiedzi, małe panele |
| `--r-md` | 20 px | dymki rozmowy, panele średnie |
| `--r-lg` | 28 px | karty, panel nawigacji, okna |
| `--r-pill` | 999 px | przyciski, pigułki, pola jednoliniowe |
| `50%` | | awatary i okrągłe ikony |

Innych wartości nie używamy. Cienie: `--shadow-float` (karta, panel pływający), `--shadow-raised` (okno nad treścią). W ciemnym motywie karta ma dodatkowo cienką obwódkę `--line`.

## Układ

- **Dwie szerokości treści:** szeroka `.container` (1120 px: pulpit, listy) i do czytania `.container.czytanie` (820 px: runda, rozbiór, arkusz). Nagłówek zaczyna się na tej samej lewej krawędzi co treść pod nim.
- **Separatory zamiast kart.** Sekcje i wiersze rozdziela linia `1px solid var(--line)` i odstęp. Karta (`.karta`) tylko tam, gdzie treść musi wyskoczyć: polecenie Pestki („Dziś warto”, „Polecam”, „Na dziś”, „Dalej”), okno rozmowy, okna dialogowe. Listy, ustawienia i statystyki nie stoją w kartach.
- **Blok obok karty** (`.obok-karty`): pierwsza linia tekstu na wysokości wnętrza karty (`--wnetrze-karty` ustawia strona: padding karty obok) albo cały blok wyśrodkowany w pionie, gdy jest dużo niższy. Nigdy przyklejony do górnej krawędzi wyższego sąsiada. Poniżej 900 px kolumny idą jedna pod drugą.
- **Wiersz listy** (`.wiersze` / `.wiersz`): nazwa z opisem | wartość | akcja. Kolumny wartości i akcji mają stałą szerokość, więc wartości w kolejnych wierszach stoją na jednej osi. Części: `.wiersz-ikona` (opcjonalna, 48 px), `.wiersz-tresc` z `.wiersz-nazwa` i `.wiersz-opis` (15 px), `.wiersz-wartosc` (tu `.wiersz-pasek`: pasek i procent), `.wiersz-akcja` (strzałka, link, przyciski). Szerokości ustawia lista: `--wiersz-wartosc` (domyślnie 12rem) i `--wiersz-akcja` (20 px; `auto`, gdy akcja to słowo jednakowe we wszystkich wierszach). Wiersz bez wartości albo bez akcji ma o kolumnę mniej. Na telefonie wartość schodzi pod nazwę.
- Odstępy z jednej drabinki: 4, 8, 12, 16, 24, 32, 48 px. Między sekcjami strony 48 px, między wierszami listy min. 16 px.
- Telefon 375 px: bez przewijania w poziomie, cele dotyku min. 44 px, elementy pływające niczego nie zasłaniają.

## Elementy wspólne

Zanim napiszesz własny styl, użyj istniejącego. Ten sam element wygląda tak samo na każdym ekranie.

| Element | Skąd | Zasada |
| --- | --- | --- |
| Nagłówek strony | `components/NaglowekStrony.tsx` | link powrotu albo etykieta kontekstu, tytuł, jedno zdanie, linia. Strony nie składają własnych. |
| Przycisk główny | `.btn .btn-primary` | **jeden na ekran**. To, co uczeń ma zrobić teraz. |
| Przycisk poboczny | `.btn .btn-ghost`, `.btn-secondary` | krótka etykieta (1–2 słowa), ten sam styl dla całej grupy. Przycisk-przełącznik (`aria-pressed`, np. „Strony” w arkuszu) włączony wygląda jak zaznaczona pigułka. |
| Link-akcja | `.link` | akcje poboczne w osobnym rzędzie pod przyciskiem głównym, ze strzałką. Metadane nie wyglądają jak link. |
| Wybór jednej z kilku | `.pigulki` / `.pigulka` | jeden stan zaznaczenia w całej aplikacji. Poziom matury zawsze jako pigułki pod nagłówkiem. |
| Lista rozwijana | `.select` | tylko gdy opcji jest za dużo na pigułki |
| Pole | `.input` | |
| Przełącznik | `.przelacznik` | włączony pomarańczowy |
| Karta polecenia | `.karta` + `.kicker` | etykieta z ikoną, tytuł, powód, jeden przycisk |
| Odpowiedzi A–F | kafle (`views/nauka/TrescRundy.tsx`, arkusz) | litera i tekst w jednym kaflu; po sprawdzeniu zielony i czerwony |
| Rozwijana sekcja | ikona `ChevronRight` z obrotem | bez systemowych trójkątów |
| Ładowanie | `components/Ladowanie` | szkielet w kształcie treści, bez skoku układu. Dane już raz pobrane pokazujemy od razu (pamięć w `nauka/pamiec.ts`). |
| Ikony | `lucide-react` | 16–18 px w tekście, jedna grubość kreski |

## Tekst w interfejsie

- Po polsku, krótkimi zdaniami. Do ucznia bez form męskich i żeńskich („wyjaśnij”, nie „wyjaśniłeś”). Pestka mówi o sobie w rodzaju żeńskim.
- **Bez akapitów tłumaczących interfejs.** Dla zdania, które wyjaśnia, jak coś działa: usuń (domyślnie), przenieś do Pestki (`data-tutor-about` na elemencie) albo zostaw jedną krótką linię, gdy jej brak grozi błędem lub utratą danych. Noty o źródle (CKE) zostają.
- Jedna nazwa na jedną rzecz, wszędzie: „Matura maj 2026 · zadanie 1.3”, „Szybka runda z 18 listopada · zadanie 5” (`arkusze/typy.ts`).
- Bez żargonu („retencja”, kody wymagań) w widoku ucznia; liczby w różnych miejscach muszą się zgadzać.
- W interfejsie „Pestka”, nie „tutor” ani „AI” (wyjątek: konfiguracja dostawcy w profilu). Bez emoji.

## Pestka

- Jest na każdym ekranie i na każdym koncie. Nie zasłania treści, przycisków ani tego, o czym mówi; nie zabiera fokusu.
- Polecenia i komentarze aplikacji idą jej głosem, w pierwszej osobie, z powodem („Na dziś wybrałam…, bo…”).
- Reaguje na to, co robi uczeń (dobra i zła odpowiedź, seria, koniec rundy), gotowymi kwestiami, które działają bez modelu. Przywołana wie, na co uczeń patrzy.
- Kolory i kształt z tokenów; animacje szanują „Mniej ruchu”.

## Ruch

Krótko i spokojnie: 150–300 ms, `ease`. Wejście strony nie powtarza się, gdy dane są z pamięci. Każda animacja ma wersję bez ruchu (`prefers-reduced-motion` i ustawienie „Mniej ruchu”).

## Stany każdego ekranu

Ładowanie (szkielet), pusty (jedno zdanie i jeden przycisk, który to zmienia), błąd (co się stało i „Spróbuj ponownie”), fokus klawiatury widoczny (`:focus-visible`), brak ramki na fokusie ustawianym programowo.

## Lista kontrolna przed oddaniem ekranu

1. Kolory, rozmiary tekstu i zaokrąglenia tylko z tokenów.
2. Nagłówek z `NaglowekStrony`, jedna z dwóch szerokości treści, wspólna lewa krawędź.
3. Jeden przycisk główny; reszta to przyciski poboczne albo linki w osobnym rzędzie.
4. Karty tylko dla polecenia, rozmowy i okien; reszta na liniach.
5. Wartości w wierszach na jednej osi; bloki obok siebie wyrównane.
6. Żadnego akapitu tłumaczącego interfejs; jedna nazwa na jedną rzecz.
7. Jasny i ciemny motyw, 375 px, klawiatura, stany ładowania, pusty i błędu.
8. Pestka obecna i niczego nie zasłania.
9. Zrzut góry strony obok zrzutów innych stron: nagłówek, pigułki i karty wyglądają tak samo.
