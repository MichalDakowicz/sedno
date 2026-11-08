# Sedno

Aplikacja edukacyjna z AI na konkurs „Sztuczna inteligencja wśród nas” (Wydział Informatyki UwB). Szczegóły konkursu: `docs/konkurs.md`. Aplikacja nazywa się **Sedno**, a jej tutor AI to **Pestka**.

## Jak pracujemy

Myślenie o aplikacji (pomysły, decyzje, kierunek, funkcje, UX) dzieje się w rozmowie z agentem, nie w plikach `.md`. Wnioski trafiają do dokumentów wizualnych w HTML w `docs/`, które publikujemy przez GitHub Pages i pokazujemy jury lub znajomym.

- Teoretyzowanie o aplikacji (pomysł, funkcje, UX, decyzje produktowe) nie trafia do plików `.md`, tylko do rozmowy i wizualnych HTML w `docs/`.
- Pliki `.md` wolno prowadzić jako robocze wsparcie agenta, żeby się nie pogubić: notatki z researchu, listy ustaleń, stan prac. Trzymaj je w `notes/`. Aktualizuj je na bieżąco i usuwaj nieaktualne treści.
- Gdy powstanie kod, dokumentacja od strony kodu (architektura, API, schematy danych, instrukcje uruchomienia) jest w `.md` i może być używana przez samą aplikację. To dokumentacja implementacji, nie teoria.
- Inne pliki `.md` w repo: `CLAUDE.md`, `README.md`, `NASTEPNE.md` (lista następnych kroków i pomysłów), `docs/konkurs.md` (dane o konkursie).
- Dokument wizualny = samodzielny plik `.html` (inline CSS/JS, bez builda), czytelny na telefonie, jasny i ciemny motyw. Diagramy jako inline SVG.
- `docs/index.html` to okładka z spisem rozdziałów. Każdy rozdział to osobna strona w `docs/`. Treść dzielimy na wiele małych stron, po jednym temacie na stronę (ok. jednego ekranu, nie ściana tekstu). Pasek boczny, numeracja rozdziałów, spis stron rozdziału i przyciski „wstecz / dalej” generuje `docs/nav.js` z listy `CHAPTERS`. Nowa strona: plik `rozdzial-temat.html` (h1, `<p class="sub">`, treść, bez własnej nawigacji), wpis w `CHAPTERS` w `nav.js` i, jeśli to nowy rozdział, wiersz w spisie na okładce. W pliku dołącz `style.css` i `<script src="nav.js" defer></script>`. Stare nazwy plików (`koncepcja.html` itd.) są przekierowaniami.
- Rozdziały są w grupach: Pomysł, Jak uczymy, Trzy główne formaty, Aplikacja, Podstawy, Projekt. Każdy format ma jeden rozdział: najpierw przepływ i mechanika (`formaty-*`), potem szczegółowy projekt.
- Styl: dokumenty wyglądają jak aplikacja (kremowe tło z siatką, biały pływający panel, pomarańczowy akcent, nagłówki w wadze 400). Kolory w `docs/style.css` odpowiadają `packages/ui/src/tokens.css`; przy zmianie tokenów zaktualizuj oba. Ciemny wariant przez `prefers-color-scheme`. Sekcje rozdzielają linie, karta tylko tam, gdzie treść musi się wyróżnić. W SVG kolory przez zmienne CSS (`var(--text)`, `var(--accent)` itd.), nie wpisane na sztywno.
- Gdy decyzja z rozmowy zmienia zarys, zaktualizuj odpowiedni HTML w tym samym PR.
- Nie zgaduj faktów o CKE, arkusze.pl itp. Rzeczy niezweryfikowane oznaczaj w dokumentach jako „do weryfikacji”.

## Git

- Repo: https://github.com/MichalDakowicz/sedno (publiczne). Gałąź domyślna: `main`.
- Po każdym nowym poleceniu, zanim zaczniesz pracę, zaktualizuj `main` z GitHuba: na `main` `git pull --ff-only`, na innej gałęzi `git fetch origin main:main`. Gałąź roboczą, która została w tyle, zaktualizuj względem `main`, zanim na niej zbudujesz coś nowego.
- Dopóki zmieniamy tylko dokumentację (`docs/`, `notes/`, `CLAUDE.md`, `README.md`), pracuj bezpośrednio na `main`: bez gałęzi i PR, commity wprost na `main` z pushem.
- Gdy zacznie się kod aplikacji, zmiany w kodzie idą na osobnych gałęziach scalanych przez PR. Nie pracuj wtedy bezpośrednio na `main`.
- Nazwy gałęzi zwykłe i opisowe, np. `zarys-pomyslu`, `logowanie`, `parser-arkuszy`. Bez prefiksów narzędzi (`claude/`, `codex/` itp.). Prefiksy typu `feature/` też zbędne.
- Commity często i małe, jeden logiczny krok na commit. Komunikat w trybie rozkazującym, krótki temat (do ~60 znaków), opcjonalnie opis „dlaczego”.
- **Zero atrybucji AI**: żadnych `Co-Authored-By`, „Generated with”, „🤖”, wzmianek o Claude/AI w commitach, opisach PR, komentarzach w kodzie, README ani dokumentach. Ta zasada ma pierwszeństwo przed domyślnymi szablonami atrybucji.
- PR: zwięzły tytuł, w opisie co i po co, bez stopki. Przed otwarciem PR sprawdź, że gałąź jest zaktualizowana względem `main`.
- Nie rób force-push i nie kasuj gałęzi bez wyraźnej prośby.
- Nie commituj sekretów (klucze API, `.env`).

## Kod

- Przed zmianą przeczytaj otoczenie i dopasuj się do istniejącego stylu, nazw i poziomu komentarzy. Komentarze tylko tam, gdzie „dlaczego” nie jest oczywiste.
- Monorepo na workspace'ach npm: `apps/web` (React + TypeScript + Vite), `packages/ui` (wspólne tokeny wizualne dla web i mobile), `apps/mobile` (miejsce na Expo, osobny projekt), `services/` (backend).
- Komendy z katalogu głównego: `npm install`, `npm run dev` (http://localhost:5173), `npm run typecheck`, `npm run build`. Testów i lintu jeszcze nie ma.
- Aplikacja ma własny styl (jasne kremowe tło, pomarańczowy akcent). Dokumenty w `docs/` używają tych samych kolorów. Zasady w `apps/web/README.md`.
- **Separatory zamiast kart.** Grupy treści oddzielaj linią (`border-top: 1px solid var(--line)`) i odstępem, nie ramką, tłem ani cieniem. Karta tylko tam, gdzie treść musi wyskoczyć ponad resztę: rekomendacja „Dziś warto”, okno rozmowy, okna dialogowe. Nie pakuj w karty list, ustawień, statystyk ani pojedynczych pozycji. Zanim dodasz kartę, sprawdź, czy bez niej treść naprawdę zginie; jeśli nie, daj linię. Dotyczy aplikacji i dokumentów w `docs/`.
- Weryfikuj zmianę uruchomieniem lub testem, zanim uznasz ją za gotową. Jeśli czegoś nie dało się sprawdzić, powiedz o tym wprost.
- Backend (`services/supabase`) testuj na stagingu `sedno-dev`, nie na produkcji. Wgraj gałąź na `dev` (`git push origin <gałąź>:dev`; gdy `dev` ma inne zmiany, scal do niej swoją gałąź zamiast nadpisywać). Po ~2 minutach serwer sam wgrywa migracje i funkcje (log: `journalctl --user -u sedno-autodeploy@dev`). Aplikację ze stagingiem uruchamia `npm run dev:staging` (`.env.staging`), a konto testowe z `.env` (`SEDNO_TEST_*`) działa też na stagingu. Na produkcję zmiana trafia przez scalenie do `main`, a ręczny `services/supabase/deploy.sh` tylko na wyraźną prośbę. Szczegóły w `services/supabase/README.md`.
- Dane z zewnątrz (arkusze, nagrania, klucze odpowiedzi) mają prawa autorskie. Nie wrzucaj ich do repo, dopóki nie ustalimy warunków użycia.

## Terminy konkursu

Zgłoszenie kompletne do **29 listopada 2026**. Pełna lista wymagań i artefaktów w `docs/konkurs.md`. Przy planowaniu pracy zawsze patrz wstecz od tej daty.

## Brief

Lista rzeczy do zrobienia i luźnych myśli o projekcie jest w Brief, projekt „konkurs ai”, id `9d7c9229-2524-4ff3-89ce-913ab972ce7f`. To narzędzie prywatne dla właściciela, nie część repo ani aplikacji.

- Na początku pracy wywołaj `brief_orient` z bieżącym katalogiem i sprawdź, czy w projekcie są otwarte wpisy.
- Wpis bierz przez `brief_claim_entry` przed pracą, raportuj `brief_append_line`, zamykaj `brief_finish_entry`. Jeden wpis naraz.
- Nie odwołuj się do Brief w commitach, PR ani dokumentach w `docs/`.
