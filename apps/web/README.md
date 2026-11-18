# apps/web

Aplikacja web Sedno: React + TypeScript + Vite.

```bash
npm install        # w katalogu głównym repo
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
```

## Widoki

| Ścieżka | Widok |
| --- | --- |
| `/logowanie` | Logowanie: Google, e-mail, wejście na konto demo |
| `/` | Pulpit ogólny: rekomendacja z najsłabszego przedmiotu, powtórki ze wszystkich, lista przedmiotów |
| `/przedmiot/:id` | Pulpit zawężony do przedmiotu (`polski`, `matematyka`, `angielski`) z mapą umiejętności |
| `/tutor` | Pełny widok rozmowy z Pestką |
| `/profil` | Przedmioty, ponowne uruchomienie przewodnika, wylogowanie |
| `/arkusze` | Lista arkuszy CKE: angielski według poziomu, matematyka (poziom podstawowy) |
| `/arkusze/:id` | Rozwiązywanie arkusza i sprawdzanie z kluczem CKE |
| `/nauka`, `/umiejetnosci`, `/powtorki` | Szablony (puste prototypy) z `src/szablony/` |
| `/szablony`, `/szablony/:slug` | Spis pustych prototypów ze schematem ścieżki nauki; opis w `src/szablony/README.md` |

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
- `src/arkusze/postep.ts`: odpowiedzi, wynik i szkice z brudnopisu (`brudnopisy`, elementy sceny Excalidraw per zadanie) w `localStorage` (`sedno.arkusz.<id>`), dopóki nie ma backendu.
- Matematyka: treść to tekst ze wzorami LaTeX w `\( … \)` i bloki `wzor`, `rysunek`, `tabelaTresci`. `components/TekstMat.tsx` renderuje je przez KaTeX (`Wzory.tsx`, osobny leniwy chunk z CSS i fontami w paczce). Zadania, których treść różni się od arkusza standardowego, są kadrem (blok `kadr`); kadry i rysunki przychodzą w JSON-ie arkusza jako data URL (`adresObrazu` w `typy.ts`). Zadania wielopunktowe uczeń ocenia sam (0–N pkt) z linkiem do strony schematu w zasadach CKE.
- `src/components/Brudnopis.tsx`: brudnopis przy zadaniu z matematyki. Excalidraw (`BrudnopisEdytor.tsx`) ładuje się leniwie po otwarciu. Wbudowane UI Excalidraw jest ukryte; własny pasek obok płótna (na telefonie nad nim) ma okrojony zestaw narzędzi, 4 kolory, 3 grubości i zakreślacz, cofnij/ponów (skrót klawiszowy wysyłany do edytora, bo 0.18 nie ma na to API), zoom i „pokaż całość”. Start: ołówek ze średnią kreską (cienka do rysowania po wykresach), przybliżenie najwyżej 75% (odręczna kreska Excalidraw ma ok. 4× „grubości”, przy 100% wygląda jak marker), figura w prawym górnym rogu i zajmuje do 60% widoku (90% na wąskim ekranie; „pokaż całość” centruje), domyślny rozmiar tekstu dobrany do ok. 16 px na ekranie. Panel na szerokim ekranie wychodzi poza kolumnę tekstu (do 1100 px). Rysunek bazowy z arkusza jest zablokowanym obrazem o id `rysunek-bazowy`, dokładanym przy każdym otwarciu, więc w postępie zostają same elementy (bez pliku obrazu). Fonty Excalidraw serwuje Vite pod `/excalidraw/fonts` (z `node_modules`, przy buildzie kopia bez fontów CJK), żeby nie pobierać ich z CDN.
- Widok arkusza (`src/views/Arkusz.tsx`): linki do PDF arkusza i zasad oceniania na stronie CKE, sprawdzanie pojedynczego zadania z możliwością poprawy, luki na brakujące zdania rozwijane pod luką, suwak liter przy dopasowaniach.
- `src/components/Nagranie.tsx`: odtwarzacz nagrania; po starcie przypina się do dołu ekranu.
- `src/components/Wypracowanie.tsx`: edytor wypowiedzi pisemnej: wybór tematu, lista elementów treści, licznik słów względem zakresu z polecenia, tryb skupienia.

Logowanie to Supabase Auth (`src/auth.ts`). Pestka odpowiada modelem z konta przez bramkę `ai` (`src/ai.ts`), a jej prompt i ochrona przed powtórzeniami i emoji są w `src/pestka.ts`. Pokaz w onboardingu ma przygotowane odpowiedzi na wypadek braku AI albo powtórzenia przez model.

## Styl

Tokeny w `packages/ui` (`tokens.css` dla web, `tokens.ts` dla mobile). Ikony: `lucide-react`. Zasady:

- Hierarchia przez typografię (rozmiar, kolor), nagłówki w wadze 400 z ciasnym trackingiem. Sekcje stron to `.h2`, `.h3` tylko w środku sekcji.
- **Skala tekstu:** tylko tokeny `--t-xs` 13, `--t-sm` 15, `--t-md` 17, `--t-lg` 20 px (rosną z ustawieniem „Rozmiar tekstu” przez `--skala-tekstu`), tekst ciągły 16 px, nagłówki z klas `.display`, `.h1`–`.h3`. Tekst do czytania (treść zadań, wyjaśnienia, opisy w wierszach) co najmniej `--t-sm`; `--t-xs` tylko etykiety wersalikami i metadane. Nie wpisujemy pikseli w `font-size`.
- **Zaokrąglenia:** tylko `--r-xs` 6 (znaczniki, małe pola), `--r-sm` 12, `--r-md` 20, `--r-lg` 28 i `--r-pill`; koła `50%`. Dymek rozmowy: `--r-md` z jednym rogiem `--r-xs`, wszędzie tak samo.
- **Nagłówek strony:** `components/NaglowekStrony.tsx` (link powrotu albo etykieta kontekstu, tytuł, lead, linia pod spodem). Strony nie składają własnych nagłówków.
- Sekcje rozdzielają linie. Karta (`.karta` w `global.css`, w modułach przez `composes: karta from global`) tylko tam, gdzie treść musi się wyróżnić: rekomendacja „Dziś warto”, „Polecam”, „Na dziś”, „Dalej”, okno rozmowy, dialogi.
- **Jeden główny przycisk na ekran** (`btn-primary`). Akcje poboczne w osobnym rzędzie pod nim jako `.link` ze strzałką; w wierszach list linki, nie powtórzone przyciski. Metadane bez stylu linku.
- **Wybór:** pola wyboru to `.select` (wysokość i promień `.input`, własna strzałka), pigułki to `.pigulki` / `.pigulka` z jednym stanem zaznaczenia (`aria-pressed` albo `aria-current`). Poziom matury wszędzie jako pigułki pod nagłówkiem. Przełącznik `.przelacznik`: włączony pomarańczowy.
- **Nazwy zadań:** „Matura maj 2026 · zadanie 1.3” (`nazwaZadaniaCke`) i „Szybka runda z 18 listopada · zadanie 5” (`nazwaZadaniaRundy`, oba w `arkusze/typy.ts`), tak samo na Nauce, w Powtórkach, na mapie i na pulpicie.
- Jeden akcent: pomarańczowy `#ff7448`, drugi kolor jasnoniebieski `#d3e1ff` dla akcji pobocznych. Każdy przedmiot ma swój kolor ikony (`--tone-*`).
- Pasek nawigacji ma tło z zanikaniem, żeby przewijana treść nie prześwitywała nad nim.
- Ciemny motyw idzie za ustawieniem systemu (`prefers-color-scheme`), bez przełącznika. Kolory zmienia blok `@media` na końcu `tokens.css`, więc w CSS używamy tokenów, nie wpisanych na sztywno barw. Excalidraw, Monaco i Chart.js znają motyw przez `src/motyw.ts`. Obrazy z arkuszy zostają bez zmian (białe podłoże).
