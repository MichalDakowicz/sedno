# services/supabase

Backend Sedno: samodzielnie hostowany Supabase na serwerze domowym, publicznie pod `https://sedno-api.dakowicz.xyz` (Cloudflare Tunnel → nginx → envoy projektu `sb-sedno`).

## Co tu jest

- `migrations/` – schemat bazy. Wgrywane po kolei, każda raz (`private.schema_migrations`).
- `functions/` – Edge Functions:
  - `ai-klucz` – zapis (szyfrowanie AES-GCM) i test klucza AI konta,
  - `ai` – bramka AI: wybiera dostawcę konta dla poziomu `wazne` / `lekkie`, woła go (OpenAI-compatible, także streaming) i loguje zużycie,
  - `_shared/` – adapter czatu, szyfrowanie, ochrona przed SSRF, wspólne funkcje kont.
- `deploy.sh` – wgrywa migracje i funkcje przez ssh.

## Schemat

| Tabela | Do czego | Dostęp z aplikacji |
| --- | --- | --- |
| `profiles` | nazwa, avatar, `server_ollama` (dostęp do Ollamy serwera) | odczyt własnego, zmiana nazwy i avatara |
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

Projekt `~/supabase-hosting/projects/sedno` (port API 8007, podsieć Dockera `172.16.77.0/24`). Ustawienia Sedno w `docker-compose.sedno.yml` i `.env` (Google OAuth, `LLM_KEY_SECRET`, `LLM_PRIVATE_ORIGINS`). Proxy do Ollamy: `~/sedno-ollama` (nginx na `172.16.77.1:11435`, widoczny tylko z sieci Dockera projektu).

Google OAuth: projekt Google Cloud `sedno-514016`, klient „Sedno web”, redirect `https://sedno-api.dakowicz.xyz/auth/v1/callback`. Aplikacja jest w trybie testowym: logować się mogą tylko konta dodane jako test users.

## Aplikacja web

Produkcja: `https://trafwsedno.web.app` (Firebase Hosting, projekt `trafwsedno`, konfiguracja w `firebase.json`). Deploy: `npm run build`, potem `firebase deploy --only hosting`. Ten adres jest w Supabase jako `SITE_URL`.

`.env` w katalogu głównym repo (wzór `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Konta testowe zakłada administrator przez Admin API; dane konta testowego są w `.env` (nie w repo).
