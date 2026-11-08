# services/supabase

Backend Sedno: samodzielnie hostowany Supabase na serwerze domowym, publicznie pod `https://sedno-api.dakowicz.xyz` (Cloudflare Tunnel → nginx → envoy projektu `sb-sedno`).

## Co tu jest

- `migrations/` – schemat bazy. Wgrywane po kolei, każda raz (`private.schema_migrations`).
- `functions/` – Edge Functions:
  - `ai-klucz` – zapis (szyfrowanie AES-GCM) i test klucza AI konta,
  - `ai` – bramka AI: wybiera dostawcę konta dla poziomu `wazne` / `lekkie`, woła go (OpenAI-compatible, także streaming) i loguje zużycie,
  - `_shared/` – adapter czatu, szyfrowanie, ochrona przed SSRF, wspólne funkcje kont.
- `deploy.sh` – wgrywa migracje i funkcje przez ssh.
- `autodeploy/` – automatyczne wgrywanie z `main` (produkcja) i `dev` (staging) na serwerze (patrz „Wgrywanie”).

## Schemat

| Tabela | Do czego | Dostęp z aplikacji |
| --- | --- | --- |
| `profiles` | nazwa, avatar, `subjects` (przedmioty i poziomy maturalne), `server_ollama` (dostęp do Ollamy serwera) | odczyt własnego, zmiana nazwy, avatara, przedmiotów |
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

1. Wgraj swoją gałąź na `dev`: `git push -f origin <gałąź>:dev`. `dev` to wspólna gałąź do testów, nadpisywana bez scalania. Przed nadpisaniem zapytaj, czy nikt na niej teraz nie testuje.
2. Po ~2 minutach zmiany są na stagingu.
3. Aplikacja ze stagingiem: plik `.env.staging` w katalogu głównym (`VITE_SUPABASE_URL=https://sedno-dev-api.dakowicz.xyz` i klucz anon stagingu), potem `npm run dev:staging`.
4. Gdy działa, PR do `main`.

Staging ma osobną bazę i konta. Logowanie tylko mailem, rejestracja bez potwierdzenia (bez Google). Arkusze są skopiowane z produkcji. Ollama serwera działa jak na produkcji, z flagą `server_ollama` ustawianą przez administratora. Migracje z porzuconych gałęzi zostają w bazie stagingu. Gdy się rozjedzie, trzeba ją postawić od nowa.

## Aplikacja web

Produkcja: `https://trafwsedno.web.app` (Firebase Hosting, projekt `trafwsedno`, konfiguracja w `firebase.json`). Deploy: `npm run build`, potem `firebase deploy --only hosting`. Ten adres jest w Supabase jako `SITE_URL`.

`.env` w katalogu głównym repo (wzór `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Konta testowe zakłada administrator przez Admin API; dane konta testowego są w `.env` (nie w repo).
