# Szablony widoków

Puste prototypy funkcji, których jeszcze nie ma w aplikacji: sam układ i przebieg, bez logiki i danych. Służą do pokazania, jak widok ma wyglądać i działać, zanim powstanie kod.

- Spis i schemat ścieżki nauki: `/szablony` (`Spis.tsx`).
- Każdy szablon ma adres `/szablony/<slug>`.
- Wejścia do szablonów są w sekcji „W przygotowaniu” na pulpicie (`Wejscia.tsx`) i w spisie.
- Pomarańczowe numery na stronie objaśnia sekcja „Jak to działa” na dole tej samej strony.
- Każdy folder ma `README.md`: co to jest, po co, jak działa, od czego zależy i lista zadań.

## Jak dodać szablon

1. Folder `<slug>/` z komponentem i `README.md`.
2. Wpis w `SZABLONY` w `lista.ts` (tytuł, opis, grupa, `dalej`, wejście).
3. Wpis w `WIDOKI` w `Szablony.tsx`; jeśli to etap ścieżki nauki, dopisz go w `ETAPY` w `Spis.tsx`.
4. Wspólne klocki: `Strona`, `ZNumerem`, `Kreski`, `Pasek` (`Szablon.tsx`) i klasy z `Szablon.module.css`. Separatory zamiast kart, karta tylko dla rekomendacji, okna rozmowy i okna dialogowego.

Gdy funkcja dostaje prawdziwą implementację, widok przenosi się do `views/`, a szablon i jego wpisy znikają.

## Ścieżka nauki

Profil ucznia i pulpit prowadzą do Nauki (`/nauka`). Stamtąd można zacząć szybką rundę, przejść do arkusza lub otworzyć ćwiczenie „Uczeń uczy AI”. Po rundzie rozbiór prowadzi do Mapy umiejętności (`/umiejetnosci`) i Powtórek (`/powtorki`).

## Lista funkcji

Szczegółowe zadania są w `README.md` każdego szablonu.

### Nauka

- [ ] [Napraw błąd](napraw-blad/README.md): praca z wstrzykniętymi błędami
- [ ] [Krok po kroku](krok-po-kroku/README.md): dłuższa odpowiedź etapami z listą kontrolną
- [x] Tutor sokratejski: działa jako `/nauka/sokratejski` (`views/nauka/Sokratejski.tsx`)
- [ ] [Wizualizacje](wizualizacje/README.md): interaktywne modele pojęć

### Postęp

- [ ] [Mapa wiedzy](mapa-wiedzy/README.md): prywatny graf notatek

### Konto i narzędzia

- [x] Analiza zdjęcia: działa jako `/nauka/zdjecie` (`views/nauka/Zdjecie.tsx`)

### Wspólne fundamenty (potrzebne kilku szablonom)

Silnik nauki i dane konta opisuje [kontrakt API](../../../../services/supabase/nauka.md).

### Faza 2 planu do matury (`/do-matury` ma już odliczanie i cel z profilu)

- [ ] Prognoza wyniku z mapy umiejętności względem celu
- [ ] Plan tygodnia z czasu i słabych umiejętności
- [ ] Minuty zrobione w tygodniu
- [ ] Zmiana planu rozmową z Pestką
