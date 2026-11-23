# services/supabase

Backend Sedno: samodzielnie hostowany Supabase na serwerze domowym, publicznie pod `https://sedno-api.dakowicz.xyz` (Cloudflare Tunnel → nginx → envoy projektu `sb-sedno`).

## Co tu jest

- `migrations/` – schemat bazy. Wgrywane po kolei, każda raz (`private.schema_migrations`).
- `functions/` – Edge Functions:
  - `ai-klucz` – zapis (szyfrowanie AES-GCM) i test klucza AI konta,
  - `ai` – bramka AI: wybiera dostawcę konta dla poziomu `wazne` / `lekkie`, woła go (OpenAI-compatible, także streaming) i loguje zużycie,
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

Testy funkcji (`tests/*_test.ts`): `deno test services/supabase/tests`.

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

Domyślna trasa Pestki dla kont bez własnego klucza (ustawienia w `.env` / `docker-compose.sedno.yml` projektu, obok `LLM_KEY_SECRET`): `SEDNO_AI_KEY` (klucz dostawcy), `SEDNO_AI_BASE_URL` (adres zgodny z OpenAI; bez niego `https://api.openai.com/v1`), `SEDNO_AI_MODEL_WAZNE` (model do zadań ważnych), `SEDNO_AI_MODEL_LEKKIE` (model do zadań lekkich), opcjonalnie `SEDNO_AI_EFFORT_WAZNE` i `SEDNO_AI_EFFORT_LEKKIE` (`reasoning_effort`). Wystarczy model jednego poziomu: drugi poziom używa go (razem z jego `SEDNO_AI_EFFORT_*`). Bez klucza albo bez żadnego modelu konto bez własnego dostawcy dostaje `no_provider`. Własny klucz konta ma zawsze pierwszeństwo: trasa serwera tylko dla konta bez żadnego klucza, a zapas po błędach nie przechodzi między kluczem konta a kluczem serwera. Limity klucza serwera: `SEDNO_AI_MAX_TOKENS` (sufit długości odpowiedzi, domyślnie 4096: brudnopis potrzebuje do 3400) i `SEDNO_AI_LIMIT_DZIENNY` (rozmów na konto w ostatnich 24 h liczonych z `ai_usage`, domyślnie 200; po przekroczeniu `429 daily_limit`). W `ai_usage` dostawca wpisuje się jako `sedno` (nazwa zarezerwowana w `ai-klucz`), a przy zapasowym poziomie wpisuje się trasa, która naprawdę odpowiedziała. Błędy dostawcy (prawdziwe odpowiedzi 429, 5xx i błąd sieci) bramka ponawia raz, potem próbuje modelu drugiego poziomu; błędów własnych (pusta odpowiedź, urwany strumień) nie ponawia. Status `{ status: true }` ma osobny limit `ai-status` i wymaga obu poziomów.

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
Weryfikacja poza indeksem pobiera fragmenty z publicznego API Wolnych Lektur.
Jeśli do środowiska kontenera Edge Functions dodasz `SEDNO_BRAVE_SEARCH_KEY`
i zrestartujesz funkcje, Pestka będzie mogła przeszukać także ZPE i Culture.pl
przez Brave Search. Tylko skrócony fakt i tytuł trafiają do wyszukiwarki.
Cytaty są sprawdzane w dostępnej treści utworu.

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

## Aplikacja web

Produkcja: `https://trafwsedno.web.app` (Firebase Hosting, projekt `trafwsedno`, konfiguracja w `firebase.json`). Deploy: `npm run build`, potem `firebase deploy --only hosting`. Ten adres jest w Supabase jako `SITE_URL`.

`.env` w katalogu głównym repo (wzór `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Konta testowe zakłada administrator przez Admin API; dane konta testowego są w `.env` (nie w repo).
