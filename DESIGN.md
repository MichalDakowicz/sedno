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
| Akcent jako tekst | `--primary-text` | `#b83d0b` | drobny pomarańczowy tekst, linki-akcje, kicker |
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
- Telefon 375 px: bez przewijania w poziomie, cele dotyku min. 44 px, elementy pływające niczego nie zasłaniają.
- **Zapas na końcu strony** pod Pestkę na spoczynku: `padding-bottom: var(--zapas-pestki)` (120 px, na telefonie 104 px, `global.css`). Strony nie wpisują własnych wartości.

## Odstępy

Jedna drabinka, tokeny w `tokens.css`. Innych wartości w `gap`, `margin` i `padding` nie wpisujemy (wyjątek: 1–2 px na obwódki i korekty optyczne).

| Token | Wartość | Do czego |
| --- | --- | --- |
| `--s-1` | 4 px | ikona i tekst w etykiecie, drobne korekty |
| `--s-2` | 8 px | ikona i tekst w przycisku, elementy jednej kontrolki |
| `--s-3` | 12 px | nazwa i opis, pola w jednej grupie |
| `--s-4` | 16 px | wiersze listy, akapity, przycisk i link pod nim |
| `--s-5` | 24 px | bloki wewnątrz sekcji, kolumny obok siebie |
| `--s-6` | 32 px | wnętrze karty, nagłówek sekcji i jej treść na dużym ekranie |
| `--s-7` | 48 px | między sekcjami strony |
| `--s-8` | 64 px | nagłówek strony i pierwsza sekcja, koniec strony |

- **Bliskość znaczy powiązanie.** Odstęp wewnątrz grupy jest zawsze mniejszy niż między grupami: tytuł bliżej swojej treści niż poprzedniej sekcji, opis bliżej nazwy niż następnego wiersza.
- Ten sam rodzaj przerwy ma tę samą wartość na każdym ekranie (np. tytuł sekcji → treść zawsze `--s-4`, sekcja → sekcja zawsze `--s-7`).
- Na telefonie drabinka schodzi o jeden stopień dla odstępów od `--s-6` w górę.
- Wyjątki: 1–3 px (obwódki, korekty optyczne), paddingi ustalające wysokość przycisków, pól i pigułek, zapas na końcu strony pod Pestkę na spoczynku (`--zapas-pestki`).

## Hierarchia

Na każdym ekranie od razu widać, co jest najważniejsze, co jest drugie i co jest tłem. Najwyżej trzy poziomy naraz.

1. **Poziom pierwszy: jedna rzecz.** Tytuł strony i jedno działanie (przycisk główny albo karta polecenia). Jedyne miejsce z pełnym akcentem.
2. **Poziom drugi: treść.** Sekcje z nagłówkiem `.h2`, nazwy w wierszach, tekst zadań. Kolor `--fg`, bez akcentu.
3. **Poziom trzeci: pomoc.** Opisy, metadane, etykiety, akcje poboczne. Kolor `--muted` albo `--subtle`, mniejszy stopień skali.

- Ważność pokazujemy w tej kolejności: położenie (wyżej i z lewej), rozmiar, kolor, dopiero potem waga. Nie pogrubiamy, żeby coś „wybić”.
- Akcent pomarańczowy zużywa się szybko: jeden przycisk główny, zaznaczenie, postęp. Trzy pomarańczowe rzeczy obok siebie to brak hierarchii.
- Kolejność na ekranie = kolejność działania: najpierw to, co uczeń ma zrobić, potem to, co może zmienić (filtry, ustawienia), na końcu historia i szczegóły.
- Elementy tej samej wagi wyglądają tak samo (ten sam styl przycisków w grupie, ten sam stopień tekstu w wierszach).
- Liczba ważniejsza od podpisu: wynik, procent i czas dużym stopniem, jednostka i opis małym.
- Jedna karta na ekran. Dwie karty obok siebie znoszą się nawzajem.

## Elementy wspólne

Zanim napiszesz własny styl, użyj istniejącego. Ten sam element wygląda tak samo na każdym ekranie.

| Element | Skąd | Zasada |
| --- | --- | --- |
| Nagłówek strony | `components/NaglowekStrony.tsx` | link powrotu albo etykieta kontekstu, tytuł, jedno zdanie, linia. Strony nie składają własnych. |
| Przycisk główny | `.btn .btn-primary` | **jeden na ekran**. To, co uczeń ma zrobić teraz. |
| Przycisk poboczny | `.btn .btn-ghost`, `.btn-secondary` | krótka etykieta (1–2 słowa), ten sam styl dla całej grupy. Przycisk-przełącznik (`aria-pressed`, np. „Strony” w arkuszu) włączony wygląda jak zaznaczona pigułka. |
| Link-akcja | `.link` | akcje poboczne w osobnym rzędzie pod przyciskiem głównym, ze strzałką. Metadane nie wyglądają jak link. |
| Wybór jednej z kilku | `components/Pigulki.tsx` (`.pigulki` / `.pigulka`) | jeden stan zaznaczenia w całej aplikacji; zaznaczenie przesuwa się między pigułkami jak w pasku menu (`Plywak`). Wybór kilku naraz to zwykłe `.pigulki` bez przesuwania. Poziom matury zawsze jako pigułki pod nagłówkiem. |
| Lista rozwijana | `.select` | tylko gdy opcji jest za dużo na pigułki; rozwinięta lista w stylu aplikacji (`appearance: base-select`, zaokrąglenia i cień z tokenów), na dotyku systemowa. Wybór umiejętności zawsze z ogrodu, nie z listy |
| Pole | `.input` | |
| Przełącznik | `.przelacznik` | włączony pomarańczowy |
| Karta polecenia | `.karta` + `.kicker` | etykieta z ikoną, tytuł, powód, jeden przycisk |
| Propozycja dnia | `components/KartaDnia.tsx` + `nauka/dzis.ts` | ta sama karta i ten sam wybór na pulpicie i na końcu diagnozy; w Nauce karta jednej rundy z nazwą umiejętności, w Powtórkach bez karty |
| Gotowość | `components/Gotowosc.tsx` + `nauka/gotowosc.ts` | pierścień z jedną liczbą, kreską progu 30% i celu ucznia, jedno zdanie-wniosek; przy małej liczbie prób łuk w kreskę i „wstępnie”. Duża na mapie, mała w wierszu przedmiotu na pulpicie. Prognoza z arkuszy jako druga liczba, nie osobna sekcja |
| Ogród umiejętności | `components/Ogrod.tsx` | rośliny (`Kielek`) w grządkach obszarów na wspólnej linii ziemi, pod rośliną nazwa i procent; bez oceny bledsza pestka i „mało danych”, do powtórki przywiędła z kropką, „tu dziś” przy polecanej. Miniatura (`maly`) na pulpicie i w wyborze umiejętności w Nauce. Poniżej 640 px na mapie lista wierszy zamiast ogrodu |
| Poziom matury | `WyborPoziomuNauki` (`views/nauka/NaukaPowtorki.tsx`) | poziom z profilu jednym zdaniem i mały przycisk „inny poziom”; pigułki dopiero po kliknięciu. Tak samo w Arkuszach |
| Quiz celów | `views/QuizCelow.tsx` (`/cele`, krok onboardingu) | jedno pytanie Pestki na ekran, duże kafle, pasek postępu, „Pomiń quiz”; na końcu zdanie Pestki i jeden następny krok |
| Odpowiedzi A–F | kafle (`views/nauka/TrescRundy.tsx`, arkusz) | litera i tekst w jednym kaflu; po sprawdzeniu zielony i czerwony |
| Rozwijana sekcja | ikona `ChevronRight` z obrotem | bez systemowych trójkątów |
| Ładowanie | `components/Ladowanie` | szkielet w kształcie treści, bez skoku układu. Dane głównych ekranów są rozgrzane po wejściu do aplikacji i przy najechaniu na link (`nauka/rozgrzewanie.ts`), a już raz pobrane pokazujemy od razu (pamięć w `nauka/pamiec.ts`), więc szkielet widać rzadko. Treść po wczytaniu pojawia się samym kryciem. |
| Błąd Pestki | `components/BladPestki.tsx` | komunikat z `nauka/ai.ts`, „Spróbuj ponownie”, gdy ma sens, link do profilu przy braku modelu; `BrakPestki` dla konta bez AI zamiast pustej strony |
| Wykresy | `components/wykresy/` | `PasekProgu`: wartość względem progu i celu, opcjonalnie przed → po. `Linia`: zmiana w czasie, podpisany ostatni punkt, próg. `Kropki`: dni tygodnia, zadania rundy, ostatnie próby (pełna akcent, zielona ✓ dobrze, czerwona ✕ źle, kreska pominięte, pusta, przerywana zaplanowane). `OsCzasu`: dziś → przerywana przerwa z liczbą dni → egzaminy z datami. `PasDni`: 7 kratek dni z liczbą. `Pierscien`: wynik z kreską progu. `Funkcja`: model na osiach (Wizualizacje), krzywa akcentem, podpisany punkt, idzie za suwakiem bez animacji. Wszystkie: inline SVG w tokenach, `role="img"` i `aria-label` z wnioskiem, wartość dochodzi sprężyną, bez ruchu przy „Mniej ruchu”. |
| Model do zobaczenia | `views/nauka/Wizualizacje.tsx`, wykres `components/wykresy/Funkcja` | najpierw wniosek (wierzchołek, krok algorytmu), pod nim model i kontrolki, na końcu pytanie Pestki i jeden przycisk do ćwiczenia. Stan liczy serwer; model niczego nie ocenia. |
| Stan z Pestką | `components/StanPestki.tsx` | twarz w emocji, jedno zdanie z `pestka/glos.ts`, najwyżej jedno działanie. Puste stany, `BladPestki` / `BladNauki`, strona 404 (`views/NieMaStrony.tsx`); `Ladowanie` po 1 s pokazuje myślącą Pestkę ze zdaniem. Strony nie składają własnych pustych stanów. |
| Stadium umiejętności | `components/Kielek.tsx` + `nauka/stadia.ts` | pestka, kiełek, roślina z liśćmi, drzewko z owocem; 20–96 px; odcienie akcentu, nie zieleń. `animuj` tylko tam, gdzie stadium się zmienia (rozbiór, panel, ogród, gdy stadium jest wyższe niż przy ostatniej wizycie). Ta sama roślina dla tej samej umiejętności w ogrodzie, panelu, rozbiorze i wyniku diagnozy. |
| Znak | `components/Znak.tsx` | Pestka i napis „Sedno” w pasku i na logowaniu. Favicon `public/pestka.svg`, ikony PNG z `scripts/ikony.mjs`. Bez własnych wersji rysunku. |
| Liczba | `<Liczba>` / `useLiczba()` z `ruch.tsx` | duża liczba dochodzi do wartości; czytnik ekranu dostaje od razu wartość końcową |
| Ikony | `lucide-react` | 16–18 px w tekście, jedna grubość kreski |

## Tekst w interfejsie

- Po polsku, krótkimi zdaniami. Do ucznia bez form męskich i żeńskich („wyjaśnij”, nie „wyjaśniłeś”). Pestka mówi o sobie w rodzaju żeńskim.
- **Bez akapitów tłumaczących interfejs.** Dla zdania, które wyjaśnia, jak coś działa: usuń (domyślnie), przenieś do Pestki (`data-tutor-about` na elemencie) albo zostaw jedną krótką linię, gdy jej brak grozi błędem lub utratą danych. Noty o źródle (CKE) zostają.
- Jedna nazwa na jedną rzecz, wszędzie: „Matura maj 2026 · zadanie 1.3”, „Szybka runda z 18 listopada · zadanie 5” (`arkusze/typy.ts`).
- Bez żargonu („retencja”, kody wymagań) w widoku ucznia; liczby w różnych miejscach muszą się zgadzać.
- W interfejsie „Pestka”, nie „tutor” ani „AI” (wyjątek: konfiguracja dostawcy w profilu). Bez emoji.

## Pestka

- Jest na każdym ekranie i na każdym koncie. Nie zasłania treści, przycisków ani tego, o czym mówi; nie zabiera fokusu.
- **Telefon (poniżej 640 px): dok zamiast siadania na treści.** Na spoczynku Pestka stoi w prawym dolnym rogu na pasie z zanikaniem (jak pasek nawigacji u góry), więc nie siedzi na wierszu ani przycisku; omija tylko elementy przypięte (pasek tablicy, odtwarzacz). Ze wskazówką albo przywołana dokuje się z dymkiem przy dolnej albo górnej krawędzi, po tej stronie, gdzie dymek nie zasłania celu i jego karty czy wiersza; cel dostaje pierścień. Dymek w doku ma limit wysokości (42% ekranu, przewija się w środku) i strzałkę, która zwija go do Pestki z kropką czekającej wskazówki.
- Polecenia i komentarze aplikacji idą jej głosem, w pierwszej osobie, z powodem („Na dziś wybrałam…, bo…”).
- Reaguje na to, co robi uczeń (dobra i zła odpowiedź, seria, koniec rundy), gotowymi kwestiami, które działają bez modelu. Przywołana wie, na co uczeń patrzy.
- Kolory i kształt z tokenów; animacje szanują „Mniej ruchu”.
- W interfejsie „Pestka”, nigdy „tutor” ani „AI”. Podpis w panelu rozmowy mówi, na co patrzy: „przy mapie umiejętności”, „przy: <zadanie>”.
- **Karty z twarzą.** Propozycja dnia (`KartaDnia`: „Dziś warto”, „Polecam” w Nauce, „Dalej” w rozbiorze) pokazuje twarz Pestki i mówi w pierwszej osobie z powodem.
- **Na tablicy** (brudnopis matematyki): twarz Pestki to przycisk w pasku narzędzi, pole pytania obok niej. Myśli na tablicy, pisze dopiski znak po znaku (pierwiastki i ułamki odręcznie), podpowiedź w dymku przy sobie. Figury i dopiski rysuje na bieżąco, gdy przychodzą ze strumienia, wskazówka pisze się w dymku od pierwszych słów. Gdy obok niej nie ma miejsca (telefon), dymek i pole dokują się przy górnej albo dolnej krawędzi płótna (mniej zasłoniętej pracy), z limitem 40% wysokości płótna i zwijaniem do dwóch linii. Prowadzenie na żywo: kiwnięcie przy dobrym kroku, dymek i czerwony obrys przy błędzie, nic w trakcie czekania. Nie przesuwa widoku ucznia; jedna odpowiedź = jeden krok cofania; „Zetrzyj dopiski Pestki”.

### Emocje

Ten sam rysunek (`components/TutorAvatar.tsx`: oczy, policzki, usta), inna twarz. Konfetti i „z” w tokenach.

| Stan | Kiedy |
| --- | --- |
| `idle`, `thinking`, `talking` | zwykła rozmowa; `thinking` także w `Ladowanie` po 1 s |
| `radosc` | dobra odpowiedź |
| `duma` | runda z postępem, kolejne bezbłędne rundy |
| `zmartwienie` | 2+ złe odpowiedzi z rzędu; też błędy i 404 |
| `sen` | 3 min bez ruchu ucznia (jeden timeout w `TutorProvider`); budzi wskaźnik, klawiatura, przewijanie |
| `swieto` | pierwsza bezbłędna runda, kamienie milowe serii 3/7/14/30/50/100 dni w „Twój tydzień” |

### Głos

Wszystkie gotowe kwestie są w `pestka/glos.ts`, pogrupowane według sytuacji: `powitanie` (pora dnia), `dobrze`, `seria`, `blad.*`, `rozbior.*`, `seriaDni`, `przerwa`, `sen`, `puste.*`, `ladowanie`, `bledy.*`, `rozmowa.*`. `wybierz(lista, n, liczba?)` bierze kolejną kwestię (bez powtórek co chwilę, `{n}` → liczba), `powitanie()` według godziny. Nowe zdanie dopisz tam, nie w widoku.

Zasady: pierwsza osoba w rodzaju żeńskim, krótkie zdania, do ucznia bez form męskich i żeńskich, pytanie zamiast wykładu, nigdy gotowa odpowiedź, nigdy ocena ucznia, bez emoji. Karta charakteru: `docs/pestka-karta.html`.

### Kiełkująca pestka

Umiejętność rośnie w czterech stadiach (`nauka/stadia.ts`, rysunek `components/Kielek.tsx`): pestka (poniżej 55% albo brak danych), kiełek, roślina z liśćmi, drzewko z owocem. Progi w jednym miejscu: `PROGI_STADIOW = { kielek: 0.55, roslina: 0.75, drzewko: 0.85 }`, strojone pod model bez sufitu (migracja 0020: start od 50%, bezbłędne rundy dają ok. 68 → 79 → 86 → 90%): kiełek po pierwszej dobrej rundzie, roślina po dwóch bezbłędnych, drzewko po trzech, czterech albo przy stałych ok. 90% dobrych odpowiedzi. Po kilku dniach bez ćwiczeń zanik zabiera drzewko. Gdzie: wiersze mapy, panel umiejętności (duża liczba opanowania, kropki ostatnich prób, „pamiętasz ok. X%”), rozbiór (stare stadium → nowe rośnie), widget mapy na pulpicie jako „ogród” czterech obszarów z jednym zdaniem.

### Znak

Pestka obok napisu „Sedno” (`components/Znak.tsx`) w pasku i na logowaniu; w małym rozmiarze bez blasku i policzków. Favicon `public/pestka.svg`; ikony PNG, maskowalna i apple-touch generuje `apps/web/scripts/ikony.mjs` z tego samego rysunku; `public/manifest.webmanifest`. Oczy ciemne na pomarańczu w obu motywach.

## Treść sekcji, wykresy i infografiki

Każda sekcja odpowiada na **jedno pytanie ucznia** i pokazuje odpowiedź w najprostszej formie, która ją niesie. Zanim dodasz sekcję, nazwij to pytanie; jeśli się nie da, sekcja jest zbędna.

- **Kolejność w sekcji:** wniosek jednym zdaniem albo liczbą → obraz, który go pokazuje → jedno działanie. Szczegóły (lista prób, historia) pod rozwinięciem.
- **Kiedy wykres, a kiedy liczba.** Jedna wartość: duża liczba z podpisem. Wartość względem celu albo progu: pasek z kreską progu. Zmiana w czasie: linia (sparkline). Części całości: pasek podzielony. Kilka pozycji do porównania: poziome paski na jednej osi. Dni: rząd kropek albo kratek. Nie używamy wykresów kołowych, 3D ani osi bez opisu.
- **Wykres ma tytuł-wniosek** („O 6 pkt proc. więcej niż tydzień temu”), a nie nazwę („Wykres opanowania”). Najważniejszy punkt jest podpisany liczbą wprost na wykresie.
- **Tylko prawdziwe dane.** Gdy danych jest za mało, zamiast pustego wykresu jest jedno zdanie i przycisk, który to zmieni. Nic nie udajemy.
- **Wykonanie:** inline SVG z kolorami z tokenów (akcent dla ucznia, `--line` dla tła i progu, zielony i czerwony tylko dla dobrze i źle), wspólne komponenty w `components/wykresy/` (pasek z progiem, linia, kropki, oś czasu), tekst zastępczy dla czytników ekranu, działa w ciemnym motywie i na 375 px. Wartości dochodzą do stanu animacją z rozdziału „Ruch”.
- **Jedna infografika na sekcję** i najwyżej trzy na ekran; reszta to tekst i wiersze.

Co która strona pokazuje (pytanie → forma):

| Strona | Sekcja | Pytanie ucznia | Forma |
| --- | --- | --- | --- |
| Pulpit | Karta dnia | Co mam zrobić teraz? | karta Pestki z powodem i jednym przyciskiem |
| Pulpit | Twój tydzień | Czy uczę się regularnie? | 7 kropek dni i seria (dziennik aktywności w bazie), porównanie z deklaracją z quizu celów (dni, minuty), minuty nauki w ostatnich tygodniach jako linia z wnioskiem; bez dziennika w bazie dni z dat prób i bez minut |
| Pulpit | Do matury | Ile mam czasu, czy zdam i ile brakuje do celu? | dni do egzaminu i prognoza: pasek z kreską progu 30% i celem z profilu ucznia |
| Pulpit | Gotowość do matury | Na ile jestem gotowy? | wiersz na przedmiot: mały pierścień gotowości z celem i zdanie, pod angielskim ogród w miniaturze; jeden link „N powtórek na dziś” |
| Pulpit | Wyniki z arkuszy (widget do włączenia) | Czy idzie mi coraz lepiej? | średnia i linia wyników z progiem |
| Nauka | Runda i trzy drogi | Czego chcę się teraz uczyć? | pigułki przedmiotów ucznia (zapamiętany wybór), karta „Zacznij rundę · 5 min” z nazwą umiejętności i „Zmień umiejętność” (miniatura ogrodu), trzy drogi: Zapytaj Pestkę o temat, Napisz wypowiedź, Rozwiąż arkusz; „Więcej sposobów” zwinięte; „Dokończ” (do 3 rund) na końcu |
| Runda | Postęp | Ile jeszcze i jak mi idzie? | kropki zadań (zielona, czerwona, pusta) zamiast gołego paska |
| Rozbiór | Wynik rundy | Co się zmieniło po tej rundzie? | kropki odpowiedzi, jedno zdanie Pestki, pasek opanowania przed → po, stadium |
| Mapa | Gotowość i ogród | Na ile jestem gotowy i co jest słabe? | gotowość (pierścień z celem, zdanie), ogród roślin w grządkach obszarów z „tu dziś”; na telefonie wiersze z paskiem i stadium |
| Mapa | Panel umiejętności | Skąd ta ocena i co dalej? | duża liczba opanowania ze stadium, „Pamiętasz ok. X%”, linia opanowania w czasie z tytułem-wnioskiem (historia z bazy, oceny z co najmniej dwóch dni; inaczej linii nie ma), kropki ostatnich prób, jeden przycisk „Zacznij rundę · 5 min” |
| Diagnoza | Pierwsze wyniki | Od czego zacząć? | wynik i kropki odpowiedzi, zdanie Pestki, wiersze umiejętności ze stadium i paskiem (w kreskę, bo ocena z jednej, dwóch prób jest wstępna), karta dnia |
| Powtórki | Liczba i kolejka | Co mi ucieka? | „N do powtórki dziś”, jedno zdanie o jutrze i tygodniu, „Powtórz wszystkie” (kolejka: rozbiór każdej rundy proponuje następną), zwinięte grupy według umiejętności z liczbą; pusty stan „Nic nie ucieka” |
| Arkusze | Lista | Który arkusz rozwiązać? | „Kontynuuj” dla arkusza w trakcie, wynik jako pierścień z progiem, poziom z profilu („inny poziom”) |
| Arkusz w trakcie | Pasek na dole | Ile mam i czy sprawdzić? | „N z M” i „Sprawdź cały arkusz”; o brakach mówi potwierdzenie po kliknięciu. Źródło CKE w stopce na dole. Przy poleceniu z plikiem albo wykresem krótki znacznik, przy polu z kilku części sam licznik |
| Arkusz po sprawdzeniu | Wynik | Gdzie straciłem punkty i czas? | wynik i pasek z progiem 30% (poziom podstawowy) i kreską celu, zdanie o celu, paski zadań z największą stratą punktów, czas względem normy |
| Do matury | Odliczanie | Ile mam czasu i na co? | oś czasu egzaminów (dziś → dni przerwy → egzaminy z datami), prognoza z celem |
| Profil ucznia | Wnioski | Co Sedno o mnie wie? | duże liczby z podpisem (sprawdzone arkusze, średnia, pora dnia), bez tabel |
| Profil | AI na koncie | Czy Pestka działa i ile używam? | stan i dwie liczby; tabela zużycia pod rozwinięciem |
| Mapa wiedzy | Notatki | Co już wiem i co się z czym łączy? | liczba notatek i połączeń jako tytuł, graf na okręgu (komputer), lista z rozwijaną notatką (wszędzie), propozycje Pestki z „Przyjmij” i „Odrzuć” |
| Wizualizacje | Model | Jak to działa, zanim zacznę ćwiczyć? | wniosek, model z kontrolkami, pytanie Pestki, przycisk do zadań |

## Pętla nauki i słownik pojęć

Wszystko łączy się w jedną pętlę z Pestką: quiz celów → diagnoza → ogród (mapa) → „Dziś warto” → runda → rozbiór (roślina rośnie, ta sama grafika co w ogrodzie) → powtórki z błędów → ogród. Każdy ekran końcowy ma jedną wyraźną następną akcję w tej pętli, nigdy ślepy zaułek ani trzy równorzędne przyciski:

| Ekran końcowy | Następna akcja |
| --- | --- |
| Koniec quizu celów | „Sprawdźmy, od czego zacząć” (diagnoza); w onboardingu „Dalej” |
| Wynik diagnozy | karta dnia z najsłabszą umiejętnością z diagnozy; w rozbiorze sesji diagnozy „Zobacz ogród umiejętności” |
| Rozbiór rundy | „Dalej”: następna powtórka z kolejki albo polecenie Pestki |
| Koniec powtórek (ostatnia z kolejki) | „Zobacz ogród” |
| Wynik arkusza | „Omów błędy z Pestką”, a bez błędów do omówienia ogród (angielski) albo pulpit przedmiotu |

Słowa dla ucznia, wszędzie te same:

- **Gotowość** mówi o przedmiocie (pierścień na pulpicie i mapie). Liczy ją `nauka/gotowosc.ts`: średnie opanowanie umiejętności ważone punktami na maturze (`exam_points`), umiejętności bez oceny nie wchodzą do średniej; wstępna, gdy oceniona jest mniej niż połowa wagi albo prób jest mniej niż 20.
- **Opanowanie** mówi o jednej umiejętności i wyznacza stadium rośliny.
- **Obszary** to grządki ogrodu: słuchanie, czytanie, środki językowe, pisanie (`OBSZARY_NAUKI`, `OBSZARY_ANGIELSKIEGO`), te same w quizie celów i w kontekście Pestki.
- **Cel** w procentach z quizu celów (`celPrzedmiotu` w `konto/profilUcznia.ts`): kreska na pierścieniu i na pasku wyniku, „do celu brakuje…” w zdaniach, powód karty dnia, porównanie w „Twoim tygodniu”.

## Ruch

Krótko, spokojnie i nigdy kosztem działania. Tokeny w `tokens.css` (`--ruch-*`) i `tokens.ts` (`motion`); w JS wszystko przez `apps/web/src/ruch.tsx`. Innych czasów i krzywych nie wpisujemy.

| Token | Wartość | Do czego |
| --- | --- | --- |
| `--ruch-szybki` | 150 ms | wciśnięcie, zmiana koloru, drobny stan |
| `--ruch-zwykly` | 250 ms | wejście elementu, przesunięcie zaznaczenia |
| `--ruch-wolny` | 400 ms | najdłuższy ruch: wartość wykresu, wzrost rośliny |
| `--ruch-krzywa` | `cubic-bezier(0.2, 0, 0, 1)` | zwykła zmiana stanu |
| `--ruch-sprezyna` | `linear()` sprężyny (tłumienie 0,62, ok. 8% przestrzelenia); zapas `cubic-bezier(0.3, 1.35, 0.5, 1)` | to, co „ląduje”: zaznaczenie, gałka, kafel po werdykcie |

- Do ok. 400 ms. Jedyny wyjątek: skok Pestki (0,7 s).
- Tylko `transform` i `opacity`, gdzie się da.
- Kliknięcie działa od razu. Ruch nigdy nie opóźnia działania.
- Każdy ruch ma wersję bez ruchu. Decyduje jedno miejsce, `mniejRuchu()`: ustawienie „Mniej ruchu” (`data-mniej-ruchu` na `<html>`), a bez niego `prefers-reduced-motion`; w React `useMniejRuchu()`. `global.css` wyłącza wtedy wszystkie animacje i przejścia.
- Bez stale działających timerów i `requestAnimationFrame`. `sprezyna()` liczy tłumioną sprężynę na rAF w stałych krokach 1/120 s i staje w spoczynku; `krzywa()` to `--ruch-krzywa` w JS; `useLiczba()` / `<Liczba>` liczą do wartości.
- Wykresy ruszają, gdy wjadą w ekran (jeden `IntersectionObserver`, rozłączany po pierwszym razie).
- Wejście strony nie powtarza się: na stronie już obejrzanej w tej sesji (`data-strona-znana` na `<html>`, ustawia `AppLayout` przez `oznaczStrone` z `ruch.tsx`) `.wejscie`, wykresy (`useWejscie`) i liczby (`useLiczba`) stoją od razu na wartości. `.wejscie` to samo krycie, bez przesunięcia.

Wzorce:

- **Wciśnięcie:** przyciski, pigułki i kafle odpowiedzi zmniejszają się (0,96 / 0,98) i wracają sprężyną.
- **Zaznaczenie:** gałka przełącznika i zaznaczenie pigułek oraz menu (`Plywak`) przesuwają się sprężyną.
- **Werdykt w rundzie:** układ pytania zostaje, kafle zmieniają stan w miejscu (dobry podskakuje, zły drży), werdykt i Pestka wsuwają się pod spodem; następne pytanie wjeżdża.
- **Rozwinięcie:** `details` animuje wysokość przez `::details-content`, gdzie przeglądarka to umie.
- **Przeciąganie:** w układzie pulpitu (`views/UkladPulpitu.tsx`) widget idzie za wskaźnikiem, sąsiedzi przesuwają się (FLIP), po puszczeniu dociąga z prędkością rzutu. Suwak liter w arkuszu da się przeciągnąć i dociąga do najbliższej litery.

## Stany każdego ekranu

Ładowanie (szkielet, po 1 s myśląca Pestka), pusty (`StanPestki`: jedno zdanie i jeden przycisk, który to zmienia), błąd (`StanPestki` przez `BladPestki` / `BladNauki`: co się stało i „Spróbuj ponownie”), fokus klawiatury widoczny (`:focus-visible`), brak ramki na fokusie ustawianym programowo.

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
