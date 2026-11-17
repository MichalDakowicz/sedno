# Szablony widoków

Puste prototypy funkcji, których jeszcze nie ma w aplikacji: sam układ i przebieg, bez logiki i danych. Służą do pokazania, jak widok ma wyglądać i działać, zanim powstanie kod.

- Spis i schemat ścieżki nauki: `/szablony` (`Spis.tsx`).
- Każdy szablon: `/szablony/<slug>`, wyjątki z własnym miejscem w menu: `/nauka`, `/umiejetnosci`, `/powtorki`.
- Wejścia z działającej aplikacji: menu (Nauka, Mapa umiejętności, Powtórki), lupa w pasku (Wyszukiwanie), sekcja „W przygotowaniu” na pulpicie i w profilu (`Wejscia.tsx`), linki „Dalej w ścieżce” na dole każdego szablonu.
- Pomarańczowe numery na stronie objaśnia sekcja „Jak to działa” na dole tej samej strony.
- Każdy folder ma `README.md`: co to jest, po co, jak działa, od czego zależy i lista zadań.

## Jak dodać szablon

1. Folder `<slug>/` z komponentem i `README.md`.
2. Wpis w `SZABLONY` w `lista.ts` (tytuł, opis, grupa, `dalej`, wejście).
3. Wpis w `WIDOKI` w `Szablony.tsx`; jeśli to etap ścieżki nauki, dopisz go w `ETAPY` w `Spis.tsx`.
4. Wspólne klocki: `Strona`, `ZNumerem`, `Kreski`, `Pasek` (`Szablon.tsx`) i klasy z `Szablon.module.css`. Separatory zamiast kart, karta tylko dla rekomendacji, okna rozmowy i okna dialogowego.

Gdy funkcja dostaje prawdziwą implementację, widok przenosi się do `views/`, a szablon i jego wpisy znikają.

## Ścieżka nauki

Start (profil ucznia, plan do matury, pulpit) → Wybór (Nauka) → Ćwiczenie (formaty, arkusze, zdjęcie) → Wynik (ekran rozbioru) → Postęp (mapa umiejętności, mapa wiedzy) → Powrót (powtórki) → znów Wybór.

## Lista funkcji

Szczegółowe zadania są w `README.md` każdego szablonu.

### Nauka

- [ ] [Nauka](nauka/README.md): wybór formatu dla umiejętności i wolny temat
- [ ] [Napraw błąd](napraw-blad/README.md): praca z wstrzykniętymi błędami
- [ ] [Uczeń uczy AI](uczen-uczy/README.md): wyjaśnianie Koledze, ocena Sędziego
- [ ] [Krok po kroku](krok-po-kroku/README.md): dłuższa odpowiedź etapami z listą kontrolną
- [ ] [Tutor sokratejski](sokratejski/README.md): rozmowa z pytaniami i mini-testem
- [ ] [Szybka runda](szybka-runda/README.md): 3–5 minut wariantów zadań
- [ ] [Wizualizacje](wizualizacje/README.md): interaktywne modele pojęć
- [ ] [Ekran rozbioru](rozbior/README.md): wspólne podsumowanie po sesji

### Postęp

- [ ] [Mapa umiejętności](umiejetnosci/README.md): opanowanie z dowodami
- [ ] [Powtórki](powtorki/README.md): zanikające umiejętności i błędy
- [ ] [Mapa wiedzy](mapa-wiedzy/README.md): prywatny graf notatek
- [ ] [Plan do matury](do-matury/README.md): odliczanie, prognoza, plan tygodnia

### Konto i narzędzia

- [ ] [Analiza zdjęcia](zdjecie/README.md): rozwiązanie z kartki omówione przez Pestkę
- [ ] [Wyszukiwanie](wyszukiwanie/README.md): Ctrl+K do arkuszy, umiejętności, akcji
- [ ] [Układ pulpitu](uklad-pulpitu/README.md): widgety i gotowe układy

### Wspólne fundamenty (potrzebne kilku szablonom)

- [ ] Taksonomia umiejętności i mapowanie zadań CKE (mapa, nauka, powtórki, rozbiór)
- [ ] Estymator opanowania z miarą pewności i model zanikania
- [ ] Silnik wariantów zadań z kluczami (szybka runda, sokratejski mini-test, powtórki)
- [ ] Wspólny model wyniku sesji i dowodów (wszystkie formaty → rozbiór → mapa)
- [ ] Drabina podpowiedzi jako komponent i zapis jej użycia
- [ ] Profil ucznia w bazie: zapis jest (`profiles.learning`), do zrobienia rekomendacje i plan do matury (etap 2)
