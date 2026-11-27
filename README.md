# Sedno

Aplikacja do nauki do matury z tutorem AI o imieniu Pestka. Projekt na konkurs „Sztuczna inteligencja wśród nas” (Wydział Informatyki UwB).

- Działająca aplikacja: **https://trafwsedno.web.app**
- Opis funkcjonalności i instrukcja korzystania: [`docs/zgloszenie/`](docs/zgloszenie/)
- Zarys pomysłu i projekt: katalog [`docs/`](docs/index.html), publikowany przez GitHub Pages
- Informacje o konkursie: [`docs/konkurs.md`](docs/konkurs.md)

## Uruchomienie (wersja gotowa)

Sedno to aplikacja webowa, więc „wersja binarna” to zbudowana aplikacja w przeglądarce. Są dwa sposoby:

1. **Bez instalacji.** Otwórz https://trafwsedno.web.app w przeglądarce (Chrome, Edge, Firefox albo Safari, także na telefonie). Zaloguj się kontem Google (nowe konto powstaje przy pierwszym logowaniu) albo e-mailem i hasłem konta testowego, które podajemy w zgłoszeniu.
2. **Lokalnie z paczki.** Paczka `sedno-web.zip` zawiera gotowy katalog `dist` (pliki HTML, JS i CSS). Wymaga Node.js 20 lub nowszego:

   ```bash
   unzip sedno-web.zip -d sedno-web
   npx serve -s sedno-web/dist -l 4173
   ```

   Potem otwórz http://localhost:4173. Paczka łączy się z tym samym serwerem co wersja w sieci, więc potrzebny jest internet.

Aplikację można też zainstalować jak aplikację na telefonie: w przeglądarce „Dodaj do ekranu głównego”.

## Kompilacja ze źródeł

Wymagania: Node.js 20 lub nowszy (sprawdzone na 24) i npm. System dowolny (Windows, macOS, Linux).

```bash
git clone https://github.com/MichalDakowicz/sedno.git
cd sedno
npm install
```

Utwórz plik `apps/web/.env` z adresem serwera i publicznym kluczem (wzór: `.env.example`):

```bash
VITE_SUPABASE_URL=https://sedno-api.dakowicz.xyz
VITE_SUPABASE_ANON_KEY=<klucz publiczny anon>
```

Klucz `anon` jest publiczny (trafia do każdej zbudowanej aplikacji), ale nie trzymamy go w repo; podajemy go w zgłoszeniu konkursowym.

Polecenia (z katalogu głównego):

| Polecenie | Co robi |
| --- | --- |
| `npm run dev` | serwer deweloperski z podglądem na żywo, http://localhost:5173 |
| `npm run typecheck` | sprawdzenie typów TypeScript |
| `npm run build` | wersja produkcyjna w `apps/web/dist` (to jest zawartość paczki `sedno-web.zip`) |

Zbudowany katalog `apps/web/dist` to statyczne pliki: można je wystawić dowolnym serwerem plików (np. `npx serve -s apps/web/dist`). Produkcja stoi na Firebase Hosting (`firebase.json`).

## Budowa projektu

Monorepo na workspace'ach npm:

| Katalog | Co jest w środku |
| --- | --- |
| `apps/web` | aplikacja: React, TypeScript, Vite ([szczegóły](apps/web/README.md)) |
| `packages/ui` | wspólne tokeny wyglądu (kolory, odstępy, ruch) |
| `services/supabase` | backend: baza PostgreSQL z migracjami, funkcje serwera (bramka AI, Pestka w nauce, lektury), testy ([szczegóły](services/supabase/README.md)) |
| `services/arkusze` | import arkuszy maturalnych CKE do bazy |
| `docs` | dokumentacja projektu i zgłoszenia |

Backend to samodzielnie hostowany Supabase (PostgreSQL, uwierzytelnianie, funkcje Deno). Model językowy wywołuje tylko serwer: aplikacja nie ma w sobie żadnego klucza AI. Postawienie własnego backendu opisuje [`services/supabase/README.md`](services/supabase/README.md); do zbudowania i uruchomienia aplikacji nie jest potrzebne.

Testy funkcji serwera: `npx -y deno@2 test -A services/supabase/tests`.

## Zasady wyglądu

[`DESIGN.md`](DESIGN.md): kolory, typografia, odstępy, elementy wspólne i Pestka.
