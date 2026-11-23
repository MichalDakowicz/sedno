# apps/web

Aplikacja web Sedno: React + TypeScript + Vite.

```bash
npm install        # w katalogu głównym repo
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
```

## Widoki

Menu ma pięć pozycji: Pulpit, Nauka, Arkusze, Mapa umiejętności, Powtórki (`components/TopNav.tsx`). Na telefonie menu ma do tego Pestkę, „Do matury”, Profil i Ustawienia. Od 1180 px w dół etykiety w pasku są bez ikon, żeby pięć pozycji i wyspa zegara zmieściły się od 961 px.

| Ścieżka | Widok |
| --- | --- |
| `/logowanie` | Logowanie: Google, e-mail, wejście na konto demo |
| `/witaj` | Onboarding: powitanie Pestki, przedmioty i poziomy, quiz celów (`QuizCelow`), na końcu diagnoza (z angielskim) albo pulpit |
| `/` | Pulpit ogólny: propozycja dnia (`nauka/dzis.ts`, karta `components/KartaDnia.tsx`), gotowość z każdego przedmiotu (`views/pulpit/GotowoscPrzedmiotow.tsx`, pod angielskim ogród w miniaturze), widgety z układu pulpitu (domyślnie „Twój tydzień”); zaproszenie do quizu celów, dopóki nie zrobiony |
| `/przedmiot/:id` | Pulpit zawężony do przedmiotu: propozycja dnia, arkusze przedmiotu, widgety |
| `/uklad-pulpitu` | Wybór i kolejność widgetów pulpitu, osobno dla każdego przedmiotu |
| `/nauka` | Nauka: przedmiot (pigułki, `?przedmiot`, zapamiętany w przeglądarce), karta „Zacznij rundę” z umiejętnością (`?umiejetnosc`, zmiana z miniatury ogrodu), trzy drogi (Zapytaj Pestkę, Napisz wypowiedź, Rozwiąż arkusz), „Więcej sposobów” zwinięte, „Dokończ” (do 3 rund) |
| `/nauka/runda`, `/nauka/runda/:id` | Szybka runda albo „Napraw błąd”: start z parametrów (`?poziom&umiejetnosc&format&powtorz`) i trwająca runda; w tym samym widoku sesja diagnozy (koniec prowadzi do `/nauka/diagnoza`) |
| `/nauka/rozbior/:id` | Rozbiór zakończonej rundy: zmiana opanowania, zadania, następny krok; dla sesji diagnozy wynik na umiejętność (`views/nauka/WynikDiagnozy.tsx`) |
| `/nauka/uczen-uczy` | Naucz Kolegę: wyjaśnienie zasady Koledze, ocena sędziego |
| `/nauka/zadania` | Zadania z matematyki i informatyki: typy zadań (`?przedmiot`), wariant z losowymi danymi i ocena kluczem (`?szablon`) |
| `/nauka/zdjecie` | Zdjęcie rozwiązania z kartki: odczyt do poprawienia i uwaga Pestki; z arkusza `?arkusz&zadanie` |
| `/nauka/sokratejski` | Rozmowa z pytaniami: do siedmiu pytań Pestki o umiejętność (`?umiejetnosc`), potem mini-test |
| `/nauka/pisanie` | Pisanie krok po kroku: szkice na koncie, edytor etapu (`?szkic`), lista kontrolna i pytanie Pestki |
| `/nauka/mapa-wiedzy` | Mapa wiedzy (`?przedmiot`, `?umiejetnosc` zawęża do notatek przypiętych do umiejętności, `?notatka` otwiera jedną): notatki ucznia ze źródłem, graf połączeń (od 640 px), ręczne łączenie notatek, przypinanie do rośliny z ogrodu (angielski), propozycje Pestki do przyjęcia albo odrzucenia |
| `/nauka/wizualizacje` | Modele do zobaczenia (`?model=parabola\|wyszukiwanie-binarne\|tekst-parafraza`): katalog z `wizualizacje`, stan z `wizualizacja` |
| `/nauka/diagnoza` | Diagnoza na start (`nauka/diagnoza.ts`): jedna krótka sesja (`nauka_diagnoza_start`, ok. 16 zadań), stan na koncie osobno dla poziomu, na końcu wynik na umiejętność i propozycja dnia. Bez tych funkcji w bazie dawna wersja: po jednej rundzie z każdego obszaru, stan w przeglądarce |
| `/umiejetnosci` | Mapa umiejętności: gotowość (`components/Gotowosc.tsx`), ogród (`components/Ogrod.tsx`, poniżej 640 px lista wierszy), panel z linią opanowania w czasie i próbami (`?umiejetnosc=`) |
| `/powtorki` | Powtórki: liczba na dziś, „Powtórz wszystkie” (kolejka w `nauka/kolejka.ts`: rozbiór każdej rundy proponuje następną, ostatni kończy się ogrodem), zwinięte grupy według umiejętności |
| `/cele` | Quiz celów z Pestką (`views/QuizCelow.tsx`): cel w % na przedmiot, mocne i słabe obszary, czas i dni; ten sam quiz jest krokiem onboardingu |
| `/arkusze` | Lista arkuszy CKE: angielski według poziomu, matematyka (podstawowy), informatyka (rozszerzony); `?przedmiot&poziom` |
| `/arkusze/:id` | Rozwiązywanie arkusza i sprawdzanie z kluczem CKE, omawianie błędów z Pestką |
| `/tutor` | Pełny widok rozmowy z Pestką |
| `/do-matury` | Odliczanie do egzaminów i cele z profilu ucznia |
| `/profil` | Przedmioty, AI na koncie, wejścia do ustawień, profilu ucznia i układu pulpitu |
| `/profil-ucznia` | Jak się uczysz, czas i cel, priorytety, wnioski z wyników |
| `/ustawienia` | Motyw, rozmiar tekstu, dostępność, zachowanie Pestki |
| `/szablony`, `/szablony/:slug` | Prototypy z `src/szablony/` (został „Napraw błąd”); opis w `src/szablony/README.md` |
| `*` | Nie ma takiej strony (`views/NieMaStrony.tsx`): zmartwiona Pestka, adres i „Wróć na pulpit” |

## Dane ekranów: rejestr zapytań i rozgrzewanie

- **Rejestr** `src/nauka/zapytania.ts`: jeden klucz i jedna funkcja pobierająca na rodzaj danych (mapa, powtórki, plan, historia, aktywność, diagnoza, dowody, polecenie dnia, otwarte rundy). Widoki biorą dane przez `useZapytanie(zapytania.mapa(poziom))` (`src/nauka/stan.ts`), więc te same dane mają ten sam klucz w pamięci na każdym ekranie.
- **Pamięć** `src/nauka/pamiec.ts`: stale-while-revalidate z kluczem `<id konta>:<klucz>`. `pobierzWspolnie` współdzieli obietnicę w locie, więc rozgrzewanie, widok i dwa widgety pytają bazę raz. Zmiana w nauce (`uniewaznijNauke`) czyści pamięć i zapytania w locie; odpowiedź wysłana przed zmianą nie trafia już do pamięci.
- **Rozgrzewanie** `src/nauka/rozgrzewanie.ts`: `useRozgrzewanie()` w `AppLayout` po zalogowaniu, w `requestIdleCallback`, pobiera dane pięciu pozycji menu dla poziomu angielskiego z profilu; `rozgrzewajLink(do)` w `TopNav` robi to samo przy najechaniu, fokusie i dotknięciu linku, a roślina w ogrodzie rozgrzewa próby panelu. Lista arkuszy (`arkusze/dane.ts`, `rozgrzejListeArkuszy`) i wiersze postępu konta (`konto/wyniki.ts`, `rozgrzejPostepyKonta`) mają własne wspólne obietnice.
- **Wejścia** bez powtórek: `AppLayout` oznacza stronę już obejrzaną w sesji (`oznaczStrone` w `src/ruch.tsx`, `data-strona-znana`), a `.wejscie`, `useWejscie` i `useLiczba` stoją wtedy od razu na wartości. `.wejscie` to samo krycie.
- Pomiar (dev, konto testowe, zimna pamięć po przeładowaniu, klik 1,5 s po starcie): od kliknięcia w menu do treści 11–22 ms zamiast 51–317 ms, zmiany wysokości strony po wejściu 0 zamiast 1–6, CLS 0 w obu wersjach.

## Gotowość, ogród i cele

- `src/nauka/gotowosc.ts`: gotowość z przedmiotu = średnie opanowanie umiejętności ważone `exam_points` (bez punktów waga 1), nieocenione nie wchodzą do średniej; wstępna, gdy oceniona jest mniej niż połowa wagi albo prób jest mniej niż 20. `wniosekGotowosci` daje zdanie (najmocniejszy obszar, najwięcej do zyskania, ile brakuje do celu).
- `src/components/Ogrod.tsx`: rośliny w grządkach `OBSZARY_NAUKI`; stadia z ostatniej wizyty w `localStorage` (`sedno.ogrod.<konto>.<poziom>`), roślina rośnie tylko przy wyższym stadium. `adres` (link do panelu) albo `onWybierz` (wybór w Nauce), `onZapowiedz` (rozgrzanie).
- Cele w `profiles.learning` przez `src/konto/profilUcznia.ts` (kopia w `localStorage`): `celProcent`, `mocne`, `slabe`, `dni`, `czas`, `quiz`. `celPrzedmiotu(u, id)` (procent z quizu, a bez niego dawny wybór z `CELE`) i `minutyDziennie(u)` czytają gotowość, karta dnia (`nauka/dzis.ts`), „Twój tydzień”, wynik arkusza i rozbiór; `opisProfilu()` przekazuje cele, mocne i słabe strony Pestce w rozmowie. Tablica (`omow-brudnopis`) ich nie dostaje, bo funkcja serwera nie ma na to pola.
- `nauka/dzis.ts`: po diagnozie zakończonej dziś karta dnia proponuje najsłabszą umiejętność z diagnozy; obszar zadeklarowany jako słaby ma pierwszeństwo przed poleceniem z mapy, dopóki jego umiejętności mają mało danych.

## Nauka z Pestką (funkcja `nauka-ai`)

Wszystkie wywołania funkcji `nauka-ai` idą przez `src/nauka/ai.ts`: jedno typowane wywołanie na akcję i `komunikatPestki`, który zamienia kod błędu (`rate_limited`, `no_provider`, `provider_failed`, `bad_model_response`, `image_not_supported`, błędy wejścia) na krótki komunikat z informacją, czy ponowienie ma sens. Wspólny wygląd błędu i braku modelu: `components/BladPestki.tsx`. Widoki wołają funkcję tylko na wyraźne działanie ucznia (limit 30 wywołań modelu na minutę, 24 warianty, 12 ocen).

- `views/nauka/Zadania.tsx`: katalog szablonów (`warianty-katalog`), wariant (`wariant-zadania`) i ocena (`ocen-rozwiazanie`). Id wariantu i próby to `crypto.randomUUID()`; id wariantu leży w `sessionStorage`, a ta sama odpowiedź po błędzie idzie z tym samym id próby. Pole odpowiedzi zależy od formy (liczba, tekst, lista, pola, SQL). Werdykt z kryteriami, status „Do weryfikacji” i reakcja Pestki z `PestkaRundy.tsx`. Działa bez modelu (ocena kluczem).
- `views/pulpit/TwojTydzien.tsx`: widget „Twój tydzień”. Plan z `nauka_plan` (dni zmienia `nauka_plan_dni`), prognoza z pola `forecast` planu. Dni z nauką, seria i minuty w ostatnich tygodniach z `nauka_aktywnosc`; bez tej funkcji w bazie dni i seria liczone w przeglądarce z dat prób `nauka_dowody` (angielski) i `sheet_progress.updated_at` (każdy przedmiot), w strefie Europe/Warsaw, a minut nie ma.
- `components/BrudnopisEdytor.tsx` + `brudnopisPestkaApi.ts`: `omow-brudnopis` idzie zwykłym `fetch` z `stream: true`; `components/strumienTablicy.ts` czyta zdarzenia (`wskazowka`, `ksztalt`, `dopisek`, `wynik`, `blad`), a dymek przy pytaniu pisze wskazówkę od pierwszych fragmentów. Figury i dopiski rysują się, gdy przychodzą (`zapisNaZywo` w `brudnopisPestkaRysunek.ts`: miejsce raz, przy pierwszym elemencie, potem kolejne pod spodem; na tablicę bez kroku cofania). `wynik` zatwierdza całość jednym krokiem cofania i dokłada ramkę błędu i bryłę; gdy figury albo dopiski w wyniku różnią się od strumienia, zapis na żywo znika i rysuje się ten z wyniku. Prowadzenie na żywo (`useProwadzeniePestki`, bez pytania) korzysta z tego samego strumienia: figury i dopiski rysują się, gdy przychodzą, ale tylko dopóki tablica się nie zmieniła; gdy uczeń pisze dalej, strumień jest przerywany, a narysowane na żywo znika (tak samo przy `czekam`). Wskazówka przy prowadzeniu nie pisze się na żywo, bo czy to krok, błąd czy „czekam”, wiadomo dopiero z wyniku. Funkcja sprzed strumienia odpowiada zwykłym JSON-em i działa jak dawniej.
- `views/nauka/Wizualizacje.tsx` + `nauka/wizualizacje.ts`: katalog modeli (`wizualizacje`, tylko znane aplikacji) i stan (`wizualizacja`, bez modelu językowego), suwaki pytają serwer po 180 ms pauzy, a na ekranie zostaje ostatni dobry stan. Gdzie model pasuje (typ zadania, umiejętność, przedmiot) i dokąd po nim: `nauka/wizualizacje.ts`.
- Mapa wiedzy jest schowana: `MAPA_WIEDZY_WLACZONA = false` w `nauka/wiedza.ts` wyłącza wejścia w Nauce, w rozmowie z Pestką, w omawianiu błędów i w panelu umiejętności; trasa i dane zostają.
- `views/nauka/MapaWiedzy.tsx` + `nauka/wiedza.ts`: `knowledge_nodes` i `knowledge_edges` klientem Supabase (RLS), każda zmiana idzie do bazy i lista odświeża się z niej; propozycje przez `mapa-wiedzy-polaczenia` z ośmioma najświeższymi notatkami przedmiotu. Notatka ma źródło (`source`: `manual`, `chat` z id rozmowy, `sheet` z `<arkusz>#<zadanie>`, `session`) i opcjonalnie `skill_id` (tylko angielski). `components/ZapiszWMapie.tsx` zapisuje odpowiedź Pestki jako notatkę pod wiadomością w rozmowie (`TutorChat`) i w omawianiu błędu (`OmowienieBledow`); ręczne połączenie (`polaczNotatki`) zapisuje krawędź z mniejszym id na pierwszym miejscu.
- `views/nauka/Zdjecie.tsx`: zdjęcie zmniejszane na płótnie do JPEG ok. 900 KB (dłuższy bok do 1600 px), `odczytaj-zdjecie`, poprawiony odczyt do `omow-odczyt`. Zdjęcie nie jest zapisywane. Wejście z zadania otwartego w arkuszu matematyki (nie w trakcie pisania na czas).
- `views/nauka/Sokratejski.tsx`: `sokratejski` z historią par, okno rozmowy w stylu `TutorChat.module.css`, zapis rozmowy w `sessionStorage`. Podsumowanie i propozycję mini-testu składa aplikacja.
- `views/nauka/KrokPoKroku.tsx`: szkice w `writing_drafts` (zapis po pauzie z filtrem `revision`, konflikt wczytuje nowszą wersję), `krok-po-kroku` na przycisk, oddanie przez `nauka_oddaj_szkic`.
- `components/Wyszukiwanie.tsx`: oprócz akcji, arkuszy i rozmów szuka umiejętności z mapy i sposobów nauki; pytanie do Pestki dostaje odpowiedź w oknie (ta sama rozmowa co w `/tutor`).

## Nauka a wersja bazy

Aplikacja może trafić na produkcję przed migracjami bazy. Odczyty nowych funkcji (`naukaApi.diagnoza`, `historia`, `aktywnosc` w `nauka/api.ts`) zwracają `null`, gdy funkcji nie ma (`brakFunkcji`: PostgREST `PGRST202`, Postgres `42883`). Widok wraca wtedy do dawnego zachowania (diagnoza w przeglądarce, dni z dat prób) albo nie pokazuje sekcji (linia opanowania, minuty, zmiana w tygodniu), bez komunikatu o błędzie. Historię i dziennik aktywności zamienia na wykresy `nauka/historia.ts` (punkty rzadkie: wartość z dnia bez punktu to poprzednia); przy danych z mniej niż dwóch dni sekcji nie ma.

Sesja diagnozy ma `skill_id = null` i format `diagnoza`: umiejętność ma każde zadanie (`question.skill_id`). Lista niedokończonych rund ją pomija, a błędy z niej w Powtórkach i na mapie mają nazwę „Diagnoza z …” (`useSesjaDiagnozy`).

## Pestka (tutor AI)

Pestka jest na każdym koncie i nie ma stałego miejsca w treści (`TutorGuide.tsx`, stan w `TutorContext.tsx`). Przewodnik, reakcje i dymki z gotowych tekstów działają bez AI; to, co woła model (rozmowa, „Wyjaśnij z Pestką”, omawianie błędów), sprawdza `aiGotowe` i bez AI odsyła do profilu („Podepnij AI w profilu”).

- **Spoczynek:** gdy nie ma nic do powiedzenia, siedzi w prawym dolnym rogu ekranu, w całości widoczna. Kropka oznacza czekającą wskazówkę; kliknięcie przewija do niej.
- **Wskazówki:** strona wywołuje `showHints(klucz, wskazówki)`. Pestka skacze do elementu z `data-tutor="…"`, siada na jego rogu, podświetla go i pokazuje dymek. Zwykła wskazówka nie przewija strony: Pestka czeka na spoczynku, aż element wjedzie w ekran. Dymek staje po tej stronie, gdzie mieści się na ekranie i nie zasłania elementu, o którym mówi.
- **Spoczynek:** na przyciskach, polach i paskach narzędzi Pestka nie siada (podnosi się nad nie); strona ma zapas na końcu (`--zapas-pestki`), żeby ostatnie przyciski dało się przewinąć nad nią.
- **Telefon (poniżej 640 px):** na spoczynku w rogu ma pod sobą pas z zanikaniem (`.dok`) i omija tylko elementy przypięte (`fixed`, `sticky`). Wskazówka i przywołanie dokują się przy dolnej albo górnej krawędzi (`wybierzDok`: strona, gdzie dymek nie zasłania celu ani jego karty, wiersza czy sekcji; poprzednia zostaje, dopóki nie zasłania). Dymek w doku ma limit wysokości i przewija się w środku; strzałka zwija go (Pestka wraca na spoczynek z kropką, kliknięcie rozwija).
- **W rundzie nauki:** Pestka stoi w treści przy werdykcie i przy podsumowaniu rozbioru (`views/nauka/PestkaRundy.tsx`), z gotowymi tekstami z kilku list, więc nie zasłania opcji ani przycisków i nie zabiera fokusu.
- **Kontekst:** strona zgłasza, na co patrzy uczeń (`useKontekstPestki`), a zadanie w arkuszu niesie go w `data-tutor-kontekst` (prawy przycisk). Otwarcie rozmowy przy innym zadaniu zaczyna nową rozmowę o nim; przed sprawdzeniem bez klucza odpowiedzi.
- **Przewijanie i zmiany treści:** podąża za elementem. Gdy element wyjedzie z ekranu albo zniknie (przejście na inną stronę, przełączenie karty), wraca na spoczynek, a przy powrocie elementu skacze do niego z powrotem. Zmiany w treści strony wykrywa `MutationObserver`.
- **Przewodnik:** przy pierwszym wejściu na pulpit, zwykle po diagnozie (`tourHints`): trzy dymki z `glos.przewodnik` (kim jest, co wybrała na dziś, jak ją wołać), bez oprowadzania po interfejsie. Przyciemnia resztę ekranu wokół wskazanego elementu (`.spot`), a zwykła wskazówka tylko obwodzi element pierścieniem. Ponownie tylko z `/profil` („Pokaż przewodnik z Pestką”), nie z dymka Pestki: tam zostają rzeczy na co dzień.
- **Przywołanie:** prawy przycisk (na telefonie przytrzymanie) w dowolnym miejscu poza polami tekstowymi i płótnem tablicy (tam jest menu Excalidraw i panel „Pestka w brudnopisie”). Jeśli element pod kursorem ma `data-tutor-about="…"`, Pestka wyjaśnia go w dymku.
- **Odprawienie:** krzyżyk w dymku albo Escape: dymek gaśnie, Pestka skacze na spoczynek. Kliknięcie w avatar otwiera rozmowę w panelu bocznym (`TutorDock.tsx`).
- **Emocje:** `TutorAvatar.tsx` ma stany `idle`, `thinking`, `talking` i emocje `radosc`, `duma`, `zmartwienie`, `sen`, `swieto` (kiedy która: `DESIGN.md`). Sen włącza jeden timeout w `TutorProvider` po 3 min bez ruchu ucznia; wskaźnik, klawiatura albo przewijanie ją budzą.
- **Głos:** wszystkie gotowe kwestie są w `pestka/glos.ts` (`glos`, `wybierz(lista, n, liczba?)`, `powitanie()`). Widoki nie wpisują własnych tekstów Pestki.
- **Stany:** `components/StanPestki.tsx` (twarz w emocji, zdanie z `glos.ts`, jedno działanie) w pustych stanach, w `BladPestki` / `BladNauki` i na stronie 404; `Ladowanie` po 1 s pokazuje myślącą Pestkę. Gdy kształt szkieletu nie oddaje wysokości treści, ekran podaje zmierzoną `wysokosc={[szeroki, telefon]}` (karta dnia, „Twój tydzień”, karta w Nauce, mapa, powtórki, arkusz).
- **Kiełkująca pestka:** `nauka/stadia.ts` (stadium z opanowania, progi `PROGI_STADIOW`) i rysunek `components/Kielek.tsx`: ogród (`components/Ogrod.tsx`) na mapie, na pulpicie i w Nauce, wiersze mapy na telefonie, panel umiejętności, rozbiór.
- **Znak:** `components/Znak.tsx` (Pestka i „Sedno” w pasku i na logowaniu). Favicon `public/pestka.svg`, ikony PNG (zwykłe, maskowalna, apple-touch) generuje `node scripts/ikony.mjs` z tego samego rysunku; `public/manifest.webmanifest`.

## Arkusze

Dane arkuszy nie są w repo ani w buildzie. `npm run pobierz`, `npm run importuj`, a potem `npm run wgraj` (opis w `services/arkusze/README.md`) wgrywa je do tabeli `sheets` w Supabase; aplikacja czyta je stamtąd po zalogowaniu (RLS).

- `src/arkusze/typy.ts`: format danych z importu.
- `src/arkusze/sprawdz.ts`: sprawdzanie bez AI. Zamknięte z klucza; otwarte zgodne z listą CKE są zaliczone, z listy niepoprawnych niezaliczone, reszta idzie do samooceny.
- `src/arkusze/postep.ts`: odpowiedzi, wynik i szkice z brudnopisu (`brudnopisy`, elementy sceny Excalidraw per zadanie). Kopia w `localStorage` (`sedno.arkusz.<id>`), źródłem prawdy jest tabela `sheet_progress`. Niewysłana zmiana ma znacznik w `sedno.arkusze.niewyslane` (z kontem): wygrywa ze starszą kopią z konta i idzie na konto przy pobraniu, po błędzie (co 30 s), po powrocie sieci i przy `pagehide`. Wylogowanie i zmiana konta czyszczą pamięć i lokalne kopie (`sedno.arkusze.wlasciciel`).
- Matematyka: treść to tekst ze wzorami LaTeX w `\( … \)` i bloki `wzor`, `rysunek`, `tabelaTresci`. `components/TekstMat.tsx` renderuje je przez KaTeX (`Wzory.tsx`, osobny leniwy chunk z CSS i fontami w paczce). Arkusz ze wzorami zaczyna pobierać KaTeX od razu po wczytaniu (`rozgrzejWzory`); do tego czasu wzór w linii jest uproszczonym tekstem (`wzorTekstem`: ułamek „a/b”, „·”), a wzór blokowy ma zarezerwowane miejsce. Zadania, których treść różni się od arkusza standardowego, są kadrem (blok `kadr`); kadry i rysunki przychodzą w JSON-ie arkusza jako data URL (`adresObrazu` w `typy.ts`). Zadania wielopunktowe uczeń ocenia sam (0–N pkt) z linkiem do strony schematu w zasadach CKE.
- `src/components/Brudnopis.tsx`: brudnopis przy zadaniu z matematyki. Excalidraw (`BrudnopisEdytor.tsx`) ładuje się leniwie po otwarciu. Wbudowane UI Excalidraw jest ukryte; własny pasek obok płótna (na telefonie nad nim) ma okrojony zestaw narzędzi, 4 kolory, 3 grubości i zakreślacz, cofnij/ponów (skrót klawiszowy wysyłany do edytora, bo 0.18 nie ma na to API), zoom i „pokaż całość”. Start: ołówek ze średnią kreską (cienka do rysowania po wykresach), przybliżenie najwyżej 75% (odręczna kreska Excalidraw ma ok. 4× „grubości”, przy 100% wygląda jak marker), figura w prawym górnym rogu i zajmuje do 60% widoku (90% na wąskim ekranie; „pokaż całość” centruje), domyślny rozmiar tekstu dobrany do ok. 16 px na ekranie. Panel na szerokim ekranie wychodzi poza kolumnę tekstu (do 1100 px). Rysunek bazowy z arkusza jest zablokowanym obrazem o id `rysunek-bazowy`, dokładanym przy każdym otwarciu, więc w postępie zostają same elementy (bez pliku obrazu). Fonty Excalidraw serwuje Vite pod `/excalidraw/fonts` (z `node_modules`, przy buildzie kopia bez fontów CJK), żeby nie pobierać ich z CDN.
- Rysowanie na figurze: pytanie otwarte z `rysowanie: { obraz, polecenie? }` (`arkusze/typy.ts`) pokazuje figurę jako pole odpowiedzi (`components/RysunekNaFigurze.tsx`: warstwa SVG nad obrazem, zdarzenia wskaźnika, pióro w 4 kolorach, linia, gumka usuwająca całe kreski, cofnij/ponów, wyczyść, pełny ekran z przybliżeniem, „Przewijaj stronę” dla dotyku) i krótkie pole „Odpowiedź słowami” dla tych, którzy nie rysują. Zamiast Excalidraw, bo ten ładuje kilka MB i ma jedną scenę na zadanie. Rysunek to wektory w punktach figury (`arkusze/rysunek.ts`, kreska uproszczona RDP, 0,1 pkt; typowo kilka KB, limit 120 KB JSON-a na rysunek), więc skaluje się z obrazem i synchronizuje jak reszta postępu: `<nr>:rysunek` (JSON), `<nr>:opis` (tekst), a `<nr>` to „[rysunek]” z opisem, dzięki czemu liczniki, werdykt i omawianie błędów widzą odpowiedź. Po sprawdzeniu rysunek stoi na figurze obok zasad i rozwiązania CKE z samooceną. Ocena przez Pestkę (`components/OcenaRysunku.tsx`, `naukaAi.ocenPytanieArkusza`: figura z rysunkiem jako PNG ≤ 900 KB, akcja `ocen-rozwiazanie` z `arkusz` i `pytanie`; rubrykę serwer bierze z bazy) jest wyłączona flagą `OCENA_RYSUNKOW_AI` do czasu obsługi po stronie serwera.
- Widok arkusza (`src/views/Arkusz.tsx`): linki do PDF arkusza i zasad oceniania na stronie CKE, sprawdzanie pojedynczego zadania z możliwością poprawy, luki na brakujące zdania rozwijane pod luką, suwak liter przy dopasowaniach.
- `src/components/Nagranie.tsx`: odtwarzacz nagrania; po starcie przypina się do dołu ekranu.
- `src/components/Wypracowanie.tsx`: edytor wypowiedzi pisemnej: wybór tematu, lista elementów treści, licznik słów względem zakresu z polecenia, tryb skupienia.

Logowanie to Supabase Auth (`src/auth.ts`). Pestka odpowiada modelem z konta przez bramkę `ai` (`src/ai.ts`), a jej prompt i ochrona przed powtórzeniami i emoji są w `src/pestka.ts`. Pokaz w onboardingu ma przygotowane odpowiedzi na wypadek braku AI albo powtórzenia przez model.

## Styl

Zasady wyglądu dla wszystkich ekranów (kolory, skala tekstu, odstępy, zaokrąglenia, układ, wspólne elementy, tekst w interfejsie, Pestka, lista kontrolna) są w [`DESIGN.md`](../../DESIGN.md) w katalogu głównym. Tu tylko to, co dotyczy kodu:

- Tokeny w `packages/ui` (`tokens.css` dla web, `tokens.ts` dla mobile), wspólne klasy w `src/styles/global.css`; w modułach CSS przez `composes: karta from global` albo `:global(...)`. Ikony: `lucide-react`.
- Nazwy zadań z `nazwaZadaniaCke` i `nazwaZadaniaRundy` (`arkusze/typy.ts`).
- Ciemny motyw: blok `@media` na końcu `tokens.css` i `:root[data-motyw]`; Excalidraw, Monaco i Chart.js znają motyw przez `src/motyw.ts`. Obrazy z arkuszy zostają bez zmian (białe podłoże).
- Pasek nawigacji ma tło z zanikaniem, żeby przewijana treść nie prześwitywała nad nim.
- Ruch: `src/ruch.tsx` (`mniejRuchu()` i `useMniejRuchu()` jako jedyne miejsce decyzji o „Mniej ruchu”, `sprezyna()`, `krzywa()`, `useLiczba()` / `<Liczba>`), tokeny `--ruch-*` w `tokens.css`. Zasady w `DESIGN.md`.
- Wykresy: `components/wykresy/` (`PasekProgu`, `Linia`, `Kropki`, `OsCzasu`, `PasDni`, `Pierscien`), inline SVG w tokenach z `aria-label`; wartość animuje się po wejściu w ekran.
