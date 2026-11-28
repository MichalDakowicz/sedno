# services/supabase

Backend Sedno: samodzielnie hostowany Supabase na serwerze domowym, publicznie pod `https://sedno-api.dakowicz.xyz` (Cloudflare Tunnel → nginx → envoy projektu `sb-sedno`).

## Co tu jest

- `migrations/` – schemat bazy. Wgrywane po kolei, każda raz (`private.schema_migrations`).
- `functions/` – Edge Functions:
  - `ai-klucz` – zapis (szyfrowanie AES-GCM) i test klucza AI konta,
  - `ai` – bramka AI: wybiera dostawcę konta dla poziomu `wazne` / `lekkie`, woła go (OpenAI-compatible, a `api.anthropic.com` natywnym Messages API; także streaming) i loguje zużycie,
  - `nauka-ai` – Pestka w formatach nauki, odczyt zdjęcia i dane do wizualizacji,
  - `_shared/` – adapter czatu, szyfrowanie, ochrona przed SSRF, wspólne funkcje kont.
- `deploy.sh` – wgrywa migracje i funkcje przez ssh.
- `autodeploy/` – automatyczne wgrywanie z `main` (produkcja) i `dev` (staging) na serwerze (patrz „Wgrywanie”).

Kontrakt integracji z aplikacją opisuje [Backend nauki](nauka.md).

Migracje nauki od 0020:

| Migracja | Co robi |
| --- | --- |
| `0020_opanowanie_bez_sufitu` | Opanowanie jako średnia krocząca poprawności zamiast Elo (sufit ok. 67% przy samych rundach znika, powtórki wariantu liczą się z malejącą wagą). |
| `0021_rotacja_rund` | Rotacja zadań w szybkiej rundzie (niewidziane, błędne, najdawniej widziane, losowo wśród równych), ćwiczenia autorskie dopełniają pulę CKE poniżej 16, limit 10 otwartych rund na poziom. |
| `0022_historia_nauki` | Dzienne migawki opanowania, dziennik dni z arkuszem (trigger na `sheet_progress`), RPC `nauka_historia` i `nauka_aktywnosc`. |
| `0023_krotka_diagnoza` | Sesja `diagnoza` (1–3 zadania z kilku umiejętności, umiejętność na zadaniu), stan diagnozy w bazie, RPC `nauka_diagnoza`, `nauka_diagnoza_start`, `nauka_diagnoza_oznacz`; koniec sesji zapisuje migawkę opanowania. |

Testy funkcji (`tests/*_test.ts`): `deno test services/supabase/tests` (po `npm install` w katalogu głównym, żeby SDK Anthropic było w `node_modules`).

## Schemat

| Tabela | Do czego | Dostęp z aplikacji |
| --- | --- | --- |
| `profiles` | nazwa, avatar, `subjects` (przedmioty i poziomy maturalne), `server_ollama` (dostęp do Ollamy serwera), `settings` (ustawienia aplikacji), `learning` (profil ucznia), `dashboard` (układ pulpitu) | odczyt własnego, zmiana nazwy, avatara, przedmiotów oraz `settings`, `learning`, `dashboard` (jsonb pisane przez klienta, tylko właściciel wiersza dzięki RLS i uprawnieniom na poziomie kolumn; limity rozmiaru 4 KB, 8 KB, 8 KB) |
| `sheet_progress` | postęp w arkuszu (`sheet_id`, `data` jsonb) | pełny na własnych wierszach |
| `ai_credential` | dostawca AI konta, klucz zaszyfrowany | odczyt bez `key_cipher`, usuwanie; zapis tylko przez `ai-klucz` |
| `ai_routing` | który dostawca (i opcjonalnie model) obsługuje `wazne` / `lekkie` | pełny na własnych wierszach |
| `ai_usage` | log wywołań: dostawca, model, poziom, czas, tokeny | odczyt własnego |
| `sheets` | arkusze CKE (`entry` do listy, `data` cały arkusz), wgrywa `npm run wgraj` | odczyt dla zalogowanych |

Profil powstaje triggerem przy rejestracji; `profiles.onboarded_at` mówi, czy konto przeszło onboarding (`/witaj`). Wszystko za RLS. Arkusze są w bazie, a nie na hostingu, żeby widzieli je tylko zalogowani.

## AI per konto

Aplikacja nie ma własnego klucza. Każde konto dodaje dostawców w profilu, a bramka używa tylko ich. Adres dostawcy musi być publicznym https; wyjątek to Ollama na serwerze (`ollama-serwer`), dostępna tylko dla kont z `profiles.server_ollama = true`, nadawanym przez administratora:

```sql
update public.profiles set server_ollama = true
where id = (select id from auth.users where email = '...');
```

Klient: `apps/web/src/ai.ts` (`askAi`, `streamAi`, `aiKey`).

```ts
const { text } = await askAi({ tier: "lekkie", task: "podpowiedz", messages: [{ role: "user", content: "..." }] });
```

## Serwer

Projekt `~/supabase-hosting/projects/sedno` (port API 8007, podsieć Dockera `172.16.77.0/24`). Ustawienia Sedno w `docker-compose.sedno.yml` i `.env` (Google OAuth, `LLM_KEY_SECRET`, `LLM_PRIVATE_ORIGINS`). Proxy do Ollamy: `~/sedno-ollama` (nginx na `172.16.77.1:11435` i `172.16.78.1:11435`, widoczny tylko z sieci Dockera `sedno` i `sedno-dev`). Staging: projekt `~/supabase-hosting/projects/sedno-dev` (port 8008, podsieć `172.16.78.0/24`, `docker-compose.sedno-dev.yml`).

Domyślna trasa Pestki dla kont bez własnego klucza (ustawienia w `.env` / `docker-compose.sedno.yml` projektu, obok `LLM_KEY_SECRET`): `SEDNO_AI_KEY` (klucz dostawcy), `SEDNO_AI_BASE_URL` (adres zgodny z OpenAI; bez niego `https://api.openai.com/v1`), `SEDNO_AI_MODEL_WAZNE` (model do zadań ważnych), `SEDNO_AI_MODEL_LEKKIE` (model do zadań lekkich), opcjonalnie `SEDNO_AI_EFFORT_WAZNE` i `SEDNO_AI_EFFORT_LEKKIE` (`reasoning_effort`). Wypracowania z polskiego (`omowienie-wypracowania-polski`) i sprawdzanie odwołań do lektur (`pestka-sprawdz-lekture`) idą na trasie serwera na `SEDNO_AI_MODEL_MOCNE`, a przy adresie Anthropic bez tej zmiennej na `claude-opus-5-5` (`mocnaTrasa` w `_shared/ai-default.ts`); własny klucz konta zostaje przy swoim modelu. Wystarczy model jednego poziomu: drugi poziom używa go (razem z jego `SEDNO_AI_EFFORT_*`). Bez klucza albo bez żadnego modelu konto bez własnego dostawcy dostaje `no_provider`. Własny klucz konta ma zawsze pierwszeństwo: trasa serwera tylko dla konta bez żadnego klucza, a zapas po błędach nie przechodzi między kluczem konta a kluczem serwera. Limity klucza serwera: `SEDNO_AI_MAX_TOKENS` (sufit długości odpowiedzi, domyślnie 4096: brudnopis potrzebuje do 3400) i `SEDNO_AI_LIMIT_DZIENNY` (rozmów na konto w ostatnich 24 h liczonych z `ai_usage`, domyślnie 200; po przekroczeniu `429 daily_limit`). W `ai_usage` dostawca wpisuje się jako `sedno` (nazwa zarezerwowana w `ai-klucz`), a przy zapasowym poziomie wpisuje się trasa, która naprawdę odpowiedziała. Błędy dostawcy (prawdziwe odpowiedzi 429, 5xx i błąd sieci) bramka ponawia raz, potem próbuje modelu drugiego poziomu; błędów własnych (pusta odpowiedź, urwany strumień) nie ponawia. Status `{ status: true }` ma osobny limit `ai-status` i wymaga obu poziomów.

Trasa z adresem `https://api.anthropic.com/...` (serwera albo własny klucz konta) idzie przez natywne Messages API (`_shared/llm-anthropic.ts`, SDK `npm:@anthropic-ai/sdk` w wersji przypiętej w `services/supabase/package.json`); pozostali dostawcy dalej przez `/chat/completions`. Natywnie: instrukcje `system` idą osobno, powitanie Pestki na początku historii trafia do instrukcji, poziom myślenia (`SEDNO_AI_EFFORT_*`, ustawienie konta) jako `output_config.effort` (`none` → `low`), bez `temperature`, `thinking` i wymuszonego `tool_choice` (Sonnet 5.5 odrzuca je kodem 400), `max_tokens` co najmniej 1024 (myślenie się w nim mieści). Czat Pestki (`pestka.tryb = "czat"`) dostaje narzędzie serwera `web_search_20260209` bez limitu użyć, tylko na modelach, które je mają (Sonnet 5/5.5, Opus 4.6+, Fable; nie Haiku); `SEDNO_AI_WEB_SEARCH=0` je wyłącza. Zapytania, których wynik czyta kod (zwykłe `/ai` bez strumienia, sprawdzenie lektury, `nauka-ai`, test klucza), szukają bez sieci. `stop_reason: "pause_turn"` jest wznawiany (do 5 razy) z treścią asystenta, tokeny z wszystkich tur sumują się w `ai_usage`. Strony cytowane w odpowiedzi (albo, bez cytowań, pierwsze znalezione) trafiają do `pestka.zrodla` w zdarzeniu `done` jako źródła rodzaju `internet` (aplikacja podpisuje je „strona w sieci” z nazwą serwisu; tylko adresy https). Błąd wyszukiwania (obiekt zamiast listy wyników) jest pomijany, model sam o nim pisze. 529 (przeciążenie Anthropic) jest ponawiane jak 5xx.

Google OAuth: projekt Google Cloud `sedno-514016`, klient „Sedno web”, redirect `https://sedno-api.dakowicz.xyz/auth/v1/callback`. Aplikacja jest w trybie testowym: logować się mogą tylko konta dodane jako test users.

## Wgrywanie

Serwer sam wgrywa dwie gałęzie, każdą do osobnego projektu:

| Gałąź | Projekt | API |
| --- | --- | --- |
| `main` | `sedno` (produkcja) | `https://sedno-api.dakowicz.xyz` |
| `dev` | `sedno-dev` (staging) | `https://sedno-dev-api.dakowicz.xyz` |

Timery `sedno-autodeploy@main` i `sedno-autodeploy@dev` (usługi użytkownika systemd) co 2 minuty sprawdzają gałąź na GitHubie. Gdy zmieni się `services/supabase`, skrypt pobiera tarball commita (bez klonu repo), stosuje nowe migracje, podmienia funkcje i restartuje kontener funkcji. Dostęp do serwera nie jest potrzebny: żeby wgrać zmianę, wystarczy push.

- Stan: `~/supabase-hosting/sedno-autodeploy/<projekt>/` (`sha`, `hash`). Log: `journalctl --user -u 'sedno-autodeploy@*'`.
- Nieudana migracja przerywa wgrywanie, a timer próbuje ponownie co 2 minuty, aż gałąź zostanie poprawiona.
- Instalacja lub aktualizacja skryptu na serwerze: `services/supabase/autodeploy/install.sh` (przez ssh).
- Ręcznie, bez czekania: `services/supabase/deploy.sh` wgrywa bieżący katalog na produkcję. Następna zmiana `services/supabase` w `main` ją nadpisze.

Kto ma prawo zapisu do repo, ten uruchamia migracje jako `postgres` i kod funkcji na serwerze.

### Testowanie na stagingu

1. Wgraj swoją gałąź na `dev`: `git push origin <gałąź>:dev`. `dev` to wspólna gałąź do testów. Gdy są na niej cudze zmiany, scal do niej swoją gałąź, zamiast nadpisywać.
2. Po ~2 minutach zmiany są na stagingu.
3. Aplikacja ze stagingiem: plik `.env.staging` w katalogu głównym (`VITE_SUPABASE_URL=https://sedno-dev-api.dakowicz.xyz` i klucz anon stagingu), potem `npm run dev:staging`.
4. Gdy działa, PR do `main`.

Staging ma osobną bazę i konta. Logowanie tylko mailem, rejestracja bez potwierdzenia (bez Google). Arkusze są skopiowane z produkcji. Ollama serwera działa jak na produkcji, z flagą `server_ollama` ustawianą przez administratora. Migracje z porzuconych gałęzi zostają w bazie stagingu. Gdy się rozjedzie, trzeba ją postawić od nowa. Konto testowe (`SEDNO_TEST_*` w `.env`) skopiowano z produkcji razem z dostawcami AI. Klucze przeszyfrowano kluczem stagingu, a adres Ollamy zmieniono na `172.16.78.1`.

## Pilotaż wiedzy Pestki

Migracje `0027_wiedza_pestki.sql` i `0028_opracowania_lektur.sql` wymagają,
aby obraz Postgresa zawierał rozszerzenia `vector` i `unaccent`. Ładują
18 autorskich sekcji Sedno o „Lalce”, „Zemście” i „Dziadach, części III”.
Każda sekcja ma wskazane źródło i warunki użycia. Kolejna migracja może
aktualizować treść tym samym kluczem `(przedmiot, utwor, sekcja)`. Trigger
przeliczy wektor po zmianie tekstu lub haseł. Dostęp do wyszukiwania ma
wyłącznie rola serwisowa. Indeks lektur zawiera wyłącznie opracowania.

Pilotaż używa 512-wymiarowych wektorów cech słów, liczonych w Postgresie.
Migracja `0029_szerszy_kontekst_pestki.sql` zwraca trafne sekcje tego samego
utworu, z sekcją główną na początku. Przykładowo przy streszczeniu do modelu
mogą trafić także przebieg wydarzeń i opisy bohaterów.
Sprawdzanie odwołań do lektur i odpowiedzi czatu opisuje sekcja „Wiedza Pestki o lekturach” poniżej.

Interfejs pilotażu jest dostępny w czacie Pestki i pod
`/nauka/wypracowanie`. Drugi przepływ korzysta z ograniczonego katalogu
A2UI 1.0. Zapis rozmowy obejmuje tekst, źródła i kartę.

Zwykły czat przekazuje całą historię i domyślnie pomija parametr
`max_tokens`. Długość ustala dostawca. Bramka i zapis rozmowy mają
limit transportowy 8 MiB. Sufit `SEDNO_AI_MAX_TOKENS` nadal dotyczy
wywołań narzędzi z ustalonym formatem.

Migracja `0030_pamiec_rozmow_pestki.sql` wektoryzuje zapisane rozmowy
w prywatnej tabeli powiązanej z `tutor_chats`. Usunięcie rozmowy usuwa jej
wektory. Bramka wyszukuje fragmenty z własnego konta, gdy uczeń odwołuje się
do wcześniejszego czatu. W bieżącej rozmowie model nadal dostaje jej historię.
Sprawdzanie zaznaczonych akapitów jest pomijane przy indeksowaniu rozmów.

## Wiedza Pestki o lekturach

Wszystko jest kluczowane identyfikatorem utworu z katalogu (`functions/ai/katalog-lektur.ts`). Gdy bramka rozpozna
utwór w pytaniu (tytuł z kontekstem literackim, bohater, autor), pobiera materiały tylko o nim. Wiadomość, która
zawiera jedynie słowo z tytułu lub imię bohatera („wesele kuzynki”, „siostra ma lalkę”, „słodka zemsta za klasówkę”,
„dżuma w grze”), nie uruchamia lektury: nie ma materiałów, źródeł ani wątków literackich, a model dostaje regułę
krótkiej, prostej odpowiedzi i powrotu do nauki.
Pytanie z ramą literacką (np. „plan wydarzeń tomu II”) może odwołać się do ostatniej rozpoznanej lektury
w tej samej rozmowie. Bramka dla dopytania ponawia wyszukiwanie materiałów z maksymalnie dwóch wcześniejszych
pytań z odsyłaczami i używa tych samych identyfikatorów materiałów. Model dostaje tekst wcześniejszych odpowiedzi bez
numerów i identyfikatorów źródeł oraz oznaczenie odpowiedzi podpartych źródłami.

Warstwy (szczegóły formatu, walidator, generator i loader tekstów: `lektury/README.md`):

| Warstwa | Źródło | Tabela |
| --- | --- | --- |
| Karta `[K]` (autor, epoka, poziom, części, domena publiczna) | katalog w kodzie | brak, zawsze w kontekście |
| Opracowanie `[S:streszczenie]`, `[S:geneza]`, … | migracje `0027`–`0034`, `0040` | `private.wiedza_pestki` |
| Wydarzenia `[W12]`, postacie `[P3]`, motywy `[M5]`, utwory zbioru `[U2]` | `lektury/<id>.json` → migracja `0041_lektury_elementy.sql` | `private.lektury_elementy` |
| Fragmenty tekstu `[F1]` (tylko domena publiczna, poza repozytorium) | `SEDNO_DB=sb-sedno-dev-db npm run lektury:teksty` (produkcja: `sb-sedno-db`; zmienna wymagana) | `private.lektury_fragmenty` |
| Osadzenia (na później) | — | `private.lektury_osadzenia` |

Migracje: `0035` (tabele, funkcje wyszukiwania), `0036` (elementy, generowana), `0037` (usuwa przybliżoną notatkę z
planem „Lalki”, bo plan jest w elementach), `0038` (elementy z kotwicami rozdziałów), `0039` (wyszukiwanie
początków i zakończeń, uzupełnienie kotwic w załadowanych fragmentach), `0040` (testament Papkina w planie „Zemsty”),
`0041` (elementy wszystkich lektur), `0042` (łączenie źródeł po miejscu i pobieranie fragmentów do planu rozdziału),
`0043` (zbiorcze wyszukiwanie kotwic dla kart z wieloma miejscami).
Funkcje `pestka_lektury_elementy`, `pestka_lektury_fragmenty`, `pestka_lektury_fragmenty_miejsca` i
`pestka_lektury_kotwice` wywołuje wyłącznie rola serwisowa.

### Wybór materiałów według typu pytania

| Typ pytania | Materiały |
| --- | --- |
| plan wydarzeń | wydarzenia w kolejności fabuły, zawężone do miejsca z pytania. Dla rozdziału lub sceny z mniej niż trzema wydarzeniami dochodzą fragmenty tekstu z tego miejsca (`[F…]`). Plan pisze model własnymi słowami na podstawie tych materiałów; serwer go nie składa. Gdy materiały nie obejmują wskazanego miejsca, model dostaje polecenie, żeby to powiedzieć zamiast układać punkty z pamięci. |
| poprawa odpowiedzi („popraw”, „od nowa”, „prościej”, „prostszymi słowami”, „wyjaśnij inaczej”) | po odpowiedzi o lekturze serwer zbiera materiały dla pytania, na które ona odpowiadała (chyba że prośba wskazuje nowe miejsce), i dodaje polecenie napisania odpowiedzi od nowa, bez kopiowania poprzedniej wersji. Odpowiedź pisze model. |
| sprawdzenie odpowiedzi lub planu | model dostaje materiały poprzedniego pytania i polecenie oceny wyłącznie pewności wskazanego twierdzenia. Prośba o sprawdzenie planu bez planu w rozmowie daje komunikat „Wklej plan, który mam sprawdzić.” |
| streszczenie | sekcja streszczenia, do 25 wydarzeń (60 przy „szczegółowo”), sekcja bohaterów; „bez spoilerów” daje tylko dwa pierwsze zdania |
| zakończenie, finał | do pięciu końcowych wydarzeń w kolejności fabuły oraz sekcja streszczenia |
| kim jest …, bohater, relacje | dopasowanie imienia, nazwiska i członów z `odmiany` w obrębie rozpoznanej lektury, także z historii. Do opisu dołączają wydarzenia z miejsc związanych z postacią. Przy braku opisu Pestka podaje tylko dane karty lektury. |
| motywy, rozprawka, argumenty | motywy dopasowane po nazwie i jej synonimach, wydarzenia z odpowiadającego miejsca i trafne wydarzenia z pytania, sekcja motywów |
| cytat, „w którym rozdziale” | fragmenty tekstu (dokładna fraza albo słowa pytania, a przy prośbie o początek nazwanej sceny pierwsza część pasująca po nagłówku), motywy i wydarzenia pasujące do pytania |
| geneza, konteksty | sekcje geneza i konteksty |
| każde inne, w tym „czy …?” i „dlaczego …?” | trzy najtrafniejsze sekcje opracowania, uzupełnione o wydarzenia i bohaterów, do 8 elementów oraz 2 fragmenty (gdy utwór ma tekst) |

Do kontekstu modelu trafia najwyżej około 18 tys. znaków materiałów (około 6 tys. tokenów), w tym zawsze karta.
Wycinek tekstu do planu rozdziału ma do 2200 znaków, a w pozostałych odpowiedziach do 1400.

### Kontrakt odpowiedzi czatu o lekturze

Materiały są dla modelu lekturą: odpowiada własnymi słowami, a konkretne fakty wzięte z materiałów (wydarzenie, kto co
zrobił, miejsce, cytat) oznacza identyfikatorami w nawiasach kwadratowych (`[W12]`, `[P3][W14]`, `[S:geneza]`, `[K]`).
Szczegół spoza materiałów model ma podać jako niepewny („prawdopodobnie”, „sprawdź w tekście”) albo oznaczyć `[OW]`.
Strumień buforuje akapit lub punkt listy:

- identyfikator z materiałów zamienia się na znacznik `[[zrodlo:N]]` (N to numer pozycji w `zrodla`, od 1). Serwer
  ujednolica też gołe identyfikatory i dopiski miejsca w znaczniku, np. `W32` i `[F13, akt 2, sc. 2]`.
  Identyfikator nieznany znika. Serwer porządkuje interpunkcję przy usuwanych znacznikach, usuwa myślniki między odsyłaczami
  i scala sąsiednie powtórzenia;
- serwer sprawdza każde zdanie z identyfikatorem elementu. Każde wymienione miejsce musi mieć pokrycie w przypisach
  tego zdania. Parafraza jest dozwolona: serwer wymaga tylko wspólnej treści (co najmniej dwóch wspólnych
  czteroliterowych rdzeni i co najmniej jednej piątej znaczących słów zdania), nazwisk po „z/ze” obecnych w materiale,
  liczb obecnych w materiale (poza numerami miejsc) i zgodnej polaryzacji: zdanie twierdzące o czymś, czemu materiał
  zaprzecza („odmawia podania ręki”), traci źródło. Przy linku do opracowania zaprzeczenie w zdaniu musi też być w materiale;
- w odpowiedzi opartej wyłącznie na opracowaniach utworu bez tekstu w Sedno informacja o tym pojawia się raz,
  na początku odpowiedzi;
- akapit lub punkt listy z konkretem bez potwierdzonego identyfikatora dostaje jeden dopisek `(z ogólnej wiedzy, sprawdź
  w tekście)`. Konkret to miejsce w utworze, cytat, liczba, nazwa własna występująca w materiałach, odrzucony identyfikator
  albo `[OW]`; bez materiałów każdy akapit o utworze jest konkretem. Interpretacja własnymi słowami zostaje bez dopisku.
  Dopisek pomija też nagłówki, cytaty, polecenia, pytania do ucznia, listy wskazówek do rozprawki, przyznanie braku materiału
  i zdania, w których model sam zaznacza niepewność („prawdopodobnie”, „sprawdź w tekście”);
- cytat w cudzysłowie „…” (min. 4 słowa) musi występować w materiałach albo w pytaniu ucznia. W innym przypadku
  serwer usuwa cytat razem z jego odsyłaczami i informuje o tym na końcu odpowiedzi;
- bez żadnego wiersza z odpowiedzi serwer zwraca: „Sedno nie ma materiału, który rozstrzyga to pytanie. …”;
- znacznik `[[priorytet: …]]` i zdania typu „dodałam do twoich priorytetów” są usuwane z każdej odpowiedzi czatu, chyba że
  uczeń wyraźnie prosi o zapis priorytetu (np. „Zapisz priorytet: …”).

Ostatnie zdarzenie strumienia (`{"type":"done",…,"pestka":{…}}`) niesie źródła. Karta obejmująca kilka miejsc ma
opcjonalne `miejsca: [{ miejsce: string, url: string }]` w kolejności materiału. UI pokazuje po jednym linku dla każdego
miejsca pod jednym numerem przypisu. W takim przypadku `url` i `miejsce` wskazują pierwszy wpis dla starszych klientów.
Zapis „rozdz. 8 i 10” albo „rozdz. 8, 10” daje po jednym wpisie dla każdego rozdziału. Zakres ma jeden link do
początku i etykietę, np. „rozdz. 4–5, od początku 4”.
Przy braku kotwicy wpis prowadzi do właściwego tomu, tekstu lub opracowania, a UI pokazuje miejsce obok linku.
Każda strona opracowania ma w odpowiedzi najwyżej jeden numer przypisu. Karta zawiera wtedy połączone dowody
z zatwierdzonych zdań, a miejsce jest pomijane, jeśli materiał dotyczy różnych miejsc w utworze.
Epilog „Innego świata” używa opracowania opisującego scenę w Rzymie. Ogólne adresy ćwiczeń z indeksu
są pomijane przy elementach i sekcjach spoza zakresu tych ćwiczeń.
Karty bez tablicy `miejsca` korzystają z pojedynczego `url`:

```json
{
  "zrodla": [
    {
      "url": "https://wolnelektury.pl/katalog/lektura/lalka-tom-drugi.html#wl-e4032",
      "tytul": "Lalka",
      "rodzaj": "utwór",
      "sekcja": "t. II, rozdz. 14",
      "miejsce": "t. II, rozdz. 14",
      "idSekcji": "lalka/w32",
      "id": "W32",
      "typ": "wydarzenie",
      "dowod": "t. II, rozdz. 14: W pociągu do Krakowa Wokulski wysiada w Skierniewicach …",
      "twierdzenie": "[1] Wokulski wysiada w Skierniewicach i rzuca się pod pociąg."
    }
  ],
  "akcje": ["zrodlo"]
}
```

- `miejsce` to lokalizacja w utworze (tom i rozdział, akt i scena, księga i wersy); dla sekcji opracowania go nie ma, a
  `sekcja` brzmi „Opracowanie Sedno · Motywy”. `sekcja` dla wydarzeń, postaci, motywów i fragmentów powtarza `miejsce`,
  więc dotychczasowy interfejs („tytuł · sekcja”) pokazuje już lokalizację.
- `url` prowadzi do rozdziału w czytniku Wolnych Lektur (kotwica `#wl-e…`), gdy miejsce da się dopasować do fragmentu tekstu;
  w pozostałych przypadkach do strony utworu lub opracowania.
- `id` (`W12`, `P3`, `M5`, `U2`, `F1`, `S:geneza`, `K`) i `typ` (`karta`, `sekcja`, `wydarzenie`, `postac`, `motyw`, `utwor`,
  `fragment`) są nowe. `dowod` to „tekst cytowany”: dla cytatu dokładne słowa z tekstu, w pozostałych przypadkach początek
  materiału (do 400 znaków). To samo miejsce w tekście ma jedną pozycję w `zrodla`.
- `twierdzenie` zaczyna się od `[N]`, zgodnie z `[[zrodlo:N]]` w tekście (aplikacja zamienia znacznik na ` [N]`).
- Karta sprawdzania odwołań w wypracowaniu (`pestka.tryb = "lektura"`) bez zmian: `status`, `fragment`, `fakt`, `podstawa`,
  `teza`, `krok`, a w `zrodla` pojedyncze źródło z `dowod`. Teraz szuka w elementach, opracowaniu i fragmentach tekstu;
  zewnętrzne wyszukiwarki (Brave) i pobieranie tekstu w czasie zapytania usunięto.

### Poziom modelu

Pytania o lektury (rozpoznany utwór, wyraźne pytanie o lekturę, sprawdzanie odwołań) idą na poziom `wazne`. Przełącznik
jest w jednym miejscu (`TIER_LEKTUR` w `functions/ai/index.ts`); `SEDNO_TIER_LEKTUR=lekkie` w środowisku funkcji przywraca
poziom wybrany przez aplikację (wysyła `lekkie`). Poziom `wazne` lepiej trzyma się reguł cytowania identyfikatorami i rzadziej
zmyśla szczegóły, kosztem wyższej ceny i dłuższej odpowiedzi.

### Osadzenia (embeddingi), później

Jeśli semantyczne wyszukiwanie dojdzie, model to `embeddinggemma` na Ollamie właściciela. Schemat jest gotowy:
`private.lektury_osadzenia` ma klucz naturalny `(zrodlo, utwor, rodzaj, nr, czesc, model)`, kolumnę `wektor` bez wymiaru
(wymiar i indeks ANN ustala wdrożenie) oraz `tresc_hash` do wykrywania zmian. Szczegóły w `lektury/README.md`.

## Aplikacja web

Produkcja: `https://trafwsedno.web.app` (Firebase Hosting, projekt `trafwsedno`, konfiguracja w `firebase.json`). Deploy: `npm run build`, potem `firebase deploy --only hosting`. Ten adres jest w Supabase jako `SITE_URL`.

`.env` w katalogu głównym repo (wzór `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Konta testowe zakłada administrator przez Admin API; dane konta testowego są w `.env` (nie w repo).
