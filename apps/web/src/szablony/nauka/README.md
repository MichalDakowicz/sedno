# Nauka

Szablon: `/nauka`, komponent `Nauka.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Centrum wyboru, czego i jak się uczyć. Zastępuje dawną zaślepkę pod „Nauka” w menu.

## Po co

Uczeń nie powinien sam decydować, który z sześciu formatów pasuje do umiejętności. Strona podaje jedną rekomendację (format, umiejętność, czas) i zostawia wolny wybór dla tych, którzy wiedzą, czego chcą.

## Jak działa

1. Na górze przedmiot i umiejętność proponowana dziś (ta sama logika co „Dziś warto” na pulpicie). Uczeń może zmienić umiejętność.
2. Karta z rekomendowanym formatem: powód jednym zdaniem, czas, przycisk startu.
3. Pozostałe formaty jako wiersze: nazwa, „kiedy warto”, czas. Kliknięcie startuje sesję od razu.
4. Wolny temat: pole tekstowe, Pestka dopasowuje umiejętność z mapy i format.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Model opanowania umiejętności (mapa) i ich waga na maturze.
- Reguły doboru formatu do poziomu (`docs/nauka-fundament.html`, `docs/formaty-przeglad.html`).
- `konto/wyniki.ts` (`propozycja`) jako punkt startu.

## Do zrobienia

- [ ] Wybór przedmiotu z profilu (`profil.subjects`), zapamiętanie ostatniego.
- [ ] Lista umiejętności przedmiotu i „Zmień” (okno dialogowe z wyszukiwaniem).
- [ ] Reguła rekomendacji formatu: poziom opanowania, typ umiejętności, historia formatów.
- [ ] Powód rekomendacji składany z danych, nie z modelu.
- [ ] Wolny temat: przypisanie tekstu do umiejętności przez AI, w razie braku AI rozmowa z Pestką.
- [ ] Sekcja „Ostatnio” z niedokończonymi sesjami.
- [ ] Wskazówki Pestki (`data-tutor`) dla karty i wolnego tematu.
- [ ] Stany: brak przedmiotów, brak danych, brak AI (formaty wymagające AI wyszarzone).

## Otwarte pytania

- Czy formaty bez AI (szybka runda z kluczem) mają działać na kontach bez podpiętego modelu?

## Projekt

- `docs/dashboard-wejscia.html`
- `docs/nauka-fundament.html`
- `docs/formaty-przeglad.html`
