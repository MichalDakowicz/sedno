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
| `/nauka`, `/umiejetnosci`, `/powtorki` | Zaślepki |

## Pestka (tutor AI)

Pestka jest zawsze widoczna, ale nie ma stałego miejsca w treści (`TutorGuide.tsx`, stan w `TutorContext.tsx`):

- **Spoczynek:** gdy nie ma nic do powiedzenia, siedzi w prawym dolnym rogu ekranu, w całości widoczna. Kropka oznacza czekającą wskazówkę; kliknięcie przewija do niej.
- **Wskazówki:** strona wywołuje `showHints(klucz, wskazówki)`. Pestka skacze do elementu z `data-tutor="…"`, siada na jego rogu, podświetla go i pokazuje dymek. Zwykła wskazówka nie przewija strony: Pestka czeka na spoczynku, aż element wjedzie w ekran.
- **Przewijanie:** podąża za elementem. Gdy element wyjedzie z ekranu, wraca na spoczynek, a przy powrocie elementu skacze do niego z powrotem.
- **Przewodnik:** przy pierwszym wejściu na pulpit (`tourHints`). Ostatni krok czeka na przywołanie. Ponownie z `/profil`.
- **Przywołanie:** prawy przycisk (na telefonie przytrzymanie) w dowolnym miejscu poza polami tekstowymi. Jeśli element pod kursorem ma `data-tutor-about="…"`, Pestka wyjaśnia go w dymku.
- **Odprawienie:** krzyżyk w dymku albo Escape: dymek gaśnie, Pestka skacze na spoczynek. Kliknięcie w avatar otwiera rozmowę w panelu bocznym (`TutorDock.tsx`).

## Arkusze

Dane arkuszy nie są w repo. Najpierw `npm run pobierz` i `npm run importuj` (opis w `services/arkusze/README.md`); wtedy serwer dev serwuje `data/arkusze/*.json` pod `/dane/arkusze/`, a build kopiuje je do `dist/dane/arkusze`.

- `src/arkusze/typy.ts`: format danych z importu.
- `src/arkusze/sprawdz.ts`: sprawdzanie bez AI. Zamknięte z klucza; otwarte zgodne z listą CKE są zaliczone, z listy niepoprawnych niezaliczone, reszta idzie do samooceny.
- `src/arkusze/postep.ts`: odpowiedzi, wynik i szkice z brudnopisu (`brudnopisy`, elementy sceny Excalidraw per zadanie) w `localStorage` (`sedno.arkusz.<id>`), dopóki nie ma backendu.
- Matematyka: treść to tekst ze wzorami LaTeX w `\( … \)` i bloki `wzor`, `rysunek`, `tabelaTresci`. `components/TekstMat.tsx` renderuje je przez KaTeX (`Wzory.tsx`, osobny leniwy chunk z CSS i fontami w paczce). Zadania, których treść różni się od arkusza standardowego, są kadrem (blok `kadr`, PNG z `data/arkusze/obrazy/`). Zadania wielopunktowe uczeń ocenia sam (0–N pkt) z linkiem do strony schematu w zasadach CKE.
- `src/components/Brudnopis.tsx`: brudnopis przy zadaniu z matematyki. Excalidraw (`BrudnopisEdytor.tsx`) ładuje się leniwie po otwarciu. Wbudowane UI Excalidraw jest ukryte; własny pasek obok płótna (na telefonie nad nim) ma okrojony zestaw narzędzi, 4 kolory, 3 grubości i zakreślacz, cofnij/ponów (skrót klawiszowy wysyłany do edytora, bo 0.18 nie ma na to API), zoom i „pokaż całość”. Start: ołówek z cienką kreską, przybliżenie najwyżej 75% (odręczna kreska Excalidraw ma ok. 4× „grubości”, przy 100% wygląda jak marker), figura wyśrodkowana i zajmuje do 60% widoku (90% na wąskim ekranie), domyślny rozmiar tekstu dobrany do ok. 16 px na ekranie. Panel na szerokim ekranie wychodzi poza kolumnę tekstu (do 1100 px). Rysunek bazowy z arkusza jest zablokowanym obrazem o id `rysunek-bazowy`, dokładanym przy każdym otwarciu, więc w postępie zostają same elementy (bez pliku obrazu). Fonty Excalidraw serwuje Vite pod `/excalidraw/fonts` (z `node_modules`, przy buildzie kopia bez fontów CJK), żeby nie pobierać ich z CDN.
- Widok arkusza (`src/views/Arkusz.tsx`): linki do PDF arkusza i zasad oceniania na stronie CKE, sprawdzanie pojedynczego zadania z możliwością poprawy, luki na brakujące zdania rozwijane pod luką, suwak liter przy dopasowaniach.
- `src/components/Nagranie.tsx`: odtwarzacz nagrania; po starcie przypina się do dołu ekranu.
- `src/components/Wypracowanie.tsx`: edytor wypowiedzi pisemnej: wybór tematu, lista elementów treści, licznik słów względem zakresu z polecenia, tryb skupienia.

Logowanie i odpowiedzi Pestki są na niby (`src/auth.ts`, `TutorContext.tsx`), dane w `src/data/demo.ts`.

## Styl

Tokeny w `packages/ui` (`tokens.css` dla web, `tokens.ts` dla mobile). Ikony: `lucide-react`. Zasady:

- Hierarchia przez typografię (rozmiar, kolor), nagłówki w wadze 400 z ciasnym trackingiem.
- Sekcje rozdzielają linie. Karta tylko tam, gdzie treść musi się wyróżnić (rekomendacja „Dziś warto”, okno rozmowy).
- Jeden akcent: pomarańczowy `#ff7448`, drugi kolor jasnoniebieski `#d3e1ff` dla akcji pobocznych. Każdy przedmiot ma swój kolor ikony (`--tone-*`).
- Pasek nawigacji ma tło z zanikaniem, żeby przewijana treść nie prześwitywała nad nim.
