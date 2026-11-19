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
| `/witaj` | Onboarding: Pestka, przedmioty, kilka pytań o naukę, na końcu diagnoza albo pulpit |
| `/` | Pulpit ogólny: propozycja dnia (`nauka/dzis.ts`, karta `components/KartaDnia.tsx`), widgety z układu pulpitu, lista przedmiotów |
| `/przedmiot/:id` | Pulpit zawężony do przedmiotu: propozycja dnia, arkusze przedmiotu, widgety |
| `/uklad-pulpitu` | Wybór i kolejność widgetów pulpitu, osobno dla każdego przedmiotu |
| `/nauka` | Nauka (angielski): propozycja dnia, Wolny temat, sposoby nauki z polecanym, inne przedmioty, „Chcę coś innego” (poziom i umiejętność), niedokończone rundy |
| `/nauka/runda`, `/nauka/runda/:id` | Szybka runda albo „Napraw błąd”: start z parametrów (`?poziom&umiejetnosc&format&powtorz`) i trwająca runda |
| `/nauka/rozbior/:id` | Rozbiór zakończonej rundy: zmiana opanowania, zadania, następny krok |
| `/nauka/uczen-uczy` | Uczeń uczy AI: wyjaśnienie zasady Koledze, ocena sędziego |
| `/nauka/diagnoza` | Diagnoza na start: po jednej rundzie z każdego obszaru, potem pierwsze wyniki i propozycja dnia (`nauka/diagnoza.ts`, stan w przeglądarce) |
| `/umiejetnosci` | Mapa umiejętności: opanowanie umiejętności, panel z próbami (`?umiejetnosc=`) |
| `/powtorki` | Powtórki: propozycja dnia, błędy do przećwiczenia, umiejętności do odświeżenia |
| `/arkusze` | Lista arkuszy CKE: angielski według poziomu, matematyka (podstawowy), informatyka (rozszerzony); `?przedmiot&poziom` |
| `/arkusze/:id` | Rozwiązywanie arkusza i sprawdzanie z kluczem CKE, omawianie błędów z Pestką |
| `/tutor` | Pełny widok rozmowy z Pestką |
| `/do-matury` | Odliczanie do egzaminów i cele z profilu ucznia |
| `/profil` | Przedmioty, AI na koncie, wejścia do ustawień, profilu ucznia i układu pulpitu |
| `/profil-ucznia` | Jak się uczysz, czas i cel, priorytety, wnioski z wyników |
| `/ustawienia` | Motyw, rozmiar tekstu, dostępność, zachowanie Pestki |
| `/szablony`, `/szablony/:slug` | Prototypy z `src/szablony/` (tylko w trybie deweloperskim na pulpicie); opis w `src/szablony/README.md` |

## Pestka (tutor AI)

Pestka jest na każdym koncie i nie ma stałego miejsca w treści (`TutorGuide.tsx`, stan w `TutorContext.tsx`). Przewodnik, reakcje i dymki z gotowych tekstów działają bez AI; to, co woła model (rozmowa, „Wyjaśnij z Pestką”, omawianie błędów), sprawdza `aiGotowe` i bez AI odsyła do profilu („Podepnij AI w profilu”).

- **Spoczynek:** gdy nie ma nic do powiedzenia, siedzi w prawym dolnym rogu ekranu, w całości widoczna. Kropka oznacza czekającą wskazówkę; kliknięcie przewija do niej.
- **Wskazówki:** strona wywołuje `showHints(klucz, wskazówki)`. Pestka skacze do elementu z `data-tutor="…"`, siada na jego rogu, podświetla go i pokazuje dymek. Zwykła wskazówka nie przewija strony: Pestka czeka na spoczynku, aż element wjedzie w ekran. Dymek staje po tej stronie, gdzie mieści się na ekranie i nie zasłania elementu, o którym mówi.
- **Spoczynek:** na przyciskach, polach i paskach narzędzi Pestka nie siada (podnosi się nad nie); na telefonie strona ma zapas na końcu, żeby ostatnie przyciski dało się przewinąć nad nią.
- **W rundzie nauki:** Pestka stoi w treści przy werdykcie i przy podsumowaniu rozbioru (`views/nauka/PestkaRundy.tsx`), z gotowymi tekstami z kilku list, więc nie zasłania opcji ani przycisków i nie zabiera fokusu.
- **Kontekst:** strona zgłasza, na co patrzy uczeń (`useKontekstPestki`), a zadanie w arkuszu niesie go w `data-tutor-kontekst` (prawy przycisk). Otwarcie rozmowy przy innym zadaniu zaczyna nową rozmowę o nim; przed sprawdzeniem bez klucza odpowiedzi.
- **Przewijanie i zmiany treści:** podąża za elementem. Gdy element wyjedzie z ekranu albo zniknie (przejście na inną stronę, przełączenie karty), wraca na spoczynek, a przy powrocie elementu skacze do niego z powrotem. Zmiany w treści strony wykrywa `MutationObserver`.
- **Przewodnik:** przy pierwszym wejściu na pulpit (`tourHints`). Przyciemnia resztę ekranu wokół wskazanego elementu (`.spot`), a zwykła wskazówka tylko obwodzi element pierścieniem. Ostatni krok czeka na przywołanie. Ponownie tylko z `/profil` („Pokaż przewodnik z Pestką”), nie z dymka Pestki: tam zostają rzeczy na co dzień.
- **Przywołanie:** prawy przycisk (na telefonie przytrzymanie) w dowolnym miejscu poza polami tekstowymi i płótnem tablicy (tam jest menu Excalidraw i panel „Pestka w brudnopisie”). Jeśli element pod kursorem ma `data-tutor-about="…"`, Pestka wyjaśnia go w dymku.
- **Odprawienie:** krzyżyk w dymku albo Escape: dymek gaśnie, Pestka skacze na spoczynek. Kliknięcie w avatar otwiera rozmowę w panelu bocznym (`TutorDock.tsx`).

## Arkusze

Dane arkuszy nie są w repo ani w buildzie. `npm run pobierz`, `npm run importuj`, a potem `npm run wgraj` (opis w `services/arkusze/README.md`) wgrywa je do tabeli `sheets` w Supabase; aplikacja czyta je stamtąd po zalogowaniu (RLS).

- `src/arkusze/typy.ts`: format danych z importu.
- `src/arkusze/sprawdz.ts`: sprawdzanie bez AI. Zamknięte z klucza; otwarte zgodne z listą CKE są zaliczone, z listy niepoprawnych niezaliczone, reszta idzie do samooceny.
- `src/arkusze/postep.ts`: odpowiedzi, wynik i szkice z brudnopisu (`brudnopisy`, elementy sceny Excalidraw per zadanie). Kopia w `localStorage` (`sedno.arkusz.<id>`), źródłem prawdy jest tabela `sheet_progress`. Niewysłana zmiana ma znacznik w `sedno.arkusze.niewyslane` (z kontem): wygrywa ze starszą kopią z konta i idzie na konto przy pobraniu, po błędzie (co 30 s), po powrocie sieci i przy `pagehide`. Wylogowanie i zmiana konta czyszczą pamięć i lokalne kopie (`sedno.arkusze.wlasciciel`).
- Matematyka: treść to tekst ze wzorami LaTeX w `\( … \)` i bloki `wzor`, `rysunek`, `tabelaTresci`. `components/TekstMat.tsx` renderuje je przez KaTeX (`Wzory.tsx`, osobny leniwy chunk z CSS i fontami w paczce). Zadania, których treść różni się od arkusza standardowego, są kadrem (blok `kadr`); kadry i rysunki przychodzą w JSON-ie arkusza jako data URL (`adresObrazu` w `typy.ts`). Zadania wielopunktowe uczeń ocenia sam (0–N pkt) z linkiem do strony schematu w zasadach CKE.
- `src/components/Brudnopis.tsx`: brudnopis przy zadaniu z matematyki. Excalidraw (`BrudnopisEdytor.tsx`) ładuje się leniwie po otwarciu. Wbudowane UI Excalidraw jest ukryte; własny pasek obok płótna (na telefonie nad nim) ma okrojony zestaw narzędzi, 4 kolory, 3 grubości i zakreślacz, cofnij/ponów (skrót klawiszowy wysyłany do edytora, bo 0.18 nie ma na to API), zoom i „pokaż całość”. Start: ołówek ze średnią kreską (cienka do rysowania po wykresach), przybliżenie najwyżej 75% (odręczna kreska Excalidraw ma ok. 4× „grubości”, przy 100% wygląda jak marker), figura w prawym górnym rogu i zajmuje do 60% widoku (90% na wąskim ekranie; „pokaż całość” centruje), domyślny rozmiar tekstu dobrany do ok. 16 px na ekranie. Panel na szerokim ekranie wychodzi poza kolumnę tekstu (do 1100 px). Rysunek bazowy z arkusza jest zablokowanym obrazem o id `rysunek-bazowy`, dokładanym przy każdym otwarciu, więc w postępie zostają same elementy (bez pliku obrazu). Fonty Excalidraw serwuje Vite pod `/excalidraw/fonts` (z `node_modules`, przy buildzie kopia bez fontów CJK), żeby nie pobierać ich z CDN.
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
