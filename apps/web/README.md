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
| `/arkusze` | Lista arkuszy CKE z angielskiego według poziomu |
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

Dane arkuszy nie są w repo ani w buildzie. `npm run pobierz`, `npm run importuj`, a potem `npm run wgraj` (opis w `services/arkusze/README.md`) wgrywa je do tabeli `sheets` w Supabase; aplikacja czyta je stamtąd po zalogowaniu (RLS).

- `src/arkusze/typy.ts`: format danych z importu.
- `src/arkusze/sprawdz.ts`: sprawdzanie bez AI. Zamknięte z klucza; otwarte zgodne z listą CKE są zaliczone, z listy niepoprawnych niezaliczone, reszta idzie do samooceny.
- `src/arkusze/postep.ts`: odpowiedzi i wynik w `localStorage` (`sedno.arkusz.<id>`), dopóki nie ma backendu.
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
