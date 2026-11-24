# Wiedza Pestki o lekturach

Wszystko jest kluczowane identyfikatorem utworu z katalogu (`functions/ai/katalog-lektur.ts`, pole `id`).
Gdy bramka rozpozna utwór w pytaniu, wyszukiwanie zawsze zawęża się do tego jednego utworu.

Warstwy wiedzy o utworze:

| Warstwa | Skąd | Gdzie w bazie |
| --- | --- | --- |
| Karta (autor, epoka, poziom, wymagane części, domena publiczna, slug Wolnych Lektur) | katalog w kodzie | nie ma jej w bazie, trafia do kontekstu zawsze |
| Opracowanie, sześć sekcji (streszczenie, wydarzenia, geneza, bohaterowie, motywy, konteksty) | migracje `0027`–`0034` | `private.wiedza_pestki` |
| Elementy: wydarzenia, postacie, motywy, utwory zbioru | pliki `lektury/<id>.json` → migracja generowana | `private.lektury_elementy` |
| Fragmenty pełnego tekstu (tylko domena publiczna) | skrypt `wgraj-teksty.ts`, nie ma ich w repozytorium | `private.lektury_fragmenty` |
| Osadzenia (na później) | patrz niżej | `private.lektury_osadzenia` |

## Format pliku `lektury/<id>.json`

Nazwa pliku to `id` z katalogu. Walidator odrzuca nieznane pola.

```json
{
  "id": "lalka",
  "wydarzenia": [
    { "nr": 1, "miejsce": "t. I, rozdz. 7", "kto": ["Wokulski"], "gdzie": "Warszawa, sklep", "opis": "Jedno zdanie." }
  ],
  "postacie": [
    { "imie": "Stanisław Wokulski", "odmiany": ["Wokulski", "Wokulskiego"], "rola": "…", "relacje": "…", "miejsca": ["t. I, rozdz. 1"] }
  ],
  "motywy": [
    { "motyw": "miłość", "przyklad": "…", "miejsce": "t. I, rozdz. 13", "cytat": "do 15 słów, tylko utwór z domeny publicznej" }
  ],
  "utwory": [{ "tytul": "…", "miejsce": "…", "opis": "…" }],
  "zrodla": [{ "url": "https://…", "rodzaj": "utwór", "co": "czego dotyczy" }],
  "do_weryfikacji": ["rzeczy, których nie udało się potwierdzić"]
}
```

Zasady:

- `wydarzenia[].nr` rośnie ściśle (kolejność fabuły). `miejsce`, `kto`, `opis` są niepuste. `opis` to jedno zdanie, do 500 znaków.
- `postacie[].odmiany` to formy fleksyjne, po których pytanie znajduje postać. `miejsca` niepuste.
- `motywy[].miejsce` niepuste. `cytat` jest dozwolony tylko dla utworów z domeny publicznej (wpis katalogu z polem `wl`), do 15 słów, dosłownie z tekstu.
- `utwory` tylko dla zbiorów i poezji. `zrodla` ma co najmniej jeden wpis. `do_weryfikacji` może być pustą listą.
- Nie zgadujemy faktów. Czego nie da się potwierdzić w tekście lub opracowaniu, trafia do `do_weryfikacji`.

### Notacja miejsca

Ta sama notacja jest w plikach i we fragmentach tekstu, dzięki czemu wydarzenie dostaje link do właściwego rozdziału:
`t. I, rozdz. 7` · `akt II, sc. 3` · `cz. III, sc. 2` · `ks. IV, w. 120–180` · `prolog`.
Tomy i księgi pisze się cyframi rzymskimi, rozdziały i sceny arabskimi. Numery wersów (`, w. …`) przy łączeniu
z fragmentem są pomijane. Numerację bierzemy z wydania Wolnych Lektur (inne wydania numerują inaczej).
Generator przypisuje elementom „Lalki” kotwice rozdziałów z obu tomów. Test porównuje mapę i wynik loadera
z zapisanymi nagłówkami czytnika.

## Walidacja i generator

```bash
npx -y deno@2 test --no-check=remote -A services/supabase/tests/lektury_test.ts   # walidator + zgodność migracji z JSON
npm run lektury:generuj            # sprawdza najnowszą wygenerowaną migrację
npm run lektury:generuj -- 0041    # nowa treść po wdrożeniu poprzedniej migracji dostaje nowy numer
npm run lektury:generuj -- 0041 --nadpisz   # tylko gdy plik jeszcze nie trafił na serwer
```

Migracja zawiera wszystkie utwory (dla każdego `delete` + `insert`), więc jest idempotentna i najnowsza wygenerowana
migracja zawsze zawiera pełny stan. Test sprawdza, że najnowsza wygenerowana migracja jest zgodna z plikami JSON.

## Fragmenty tekstu

```bash
npm run lektury:teksty -- lalka --sucho        # pobiera, dzieli, liczy; niczego nie wysyła
npm run lektury:teksty -- lalka                # produkcja (SEDNO_DB domyślnie sb-sedno-db)
SEDNO_DB=sb-sedno-dev-db npm run lektury:teksty   # staging
```

Skrypt pobiera tekst z API Wolnych Lektur, wymaga stopki „Ten utwór jest w domenie publicznej”, dzieli według
struktury (tom, część, księga, akt, scena, rozdział, prolog) na fragmenty do 800 słów i zapisuje je razem z lokalizacją
i adresem strony w czytniku (z kotwicą nagłówka `#wl-e…` lub `#s…`, gdy HTML ją ma). Wiersze dostają zakres wersów w obrębie
księgi. Załadunek jest idempotentny (dla utworu `delete` + `insert` w jednej transakcji). Host ssh: `SEDNO_SSH`.

## Wyszukiwanie

Funkcje `public.pestka_lektury_elementy` i `public.pestka_lektury_fragmenty` (tylko `service_role`) szukają zawsze w jednym
utworze. Wyszukiwanie to Postgres full-text z konfiguracją `simple` na tekście bez polskich znaków (`unaccent`)
i prefiksami 5 liter (znoszą fleksję), a dla dosłownego cytatu `pg_trgm` na tekście znormalizowanym do liter i cyfr.

## Osadzenia (embeddingi) — później, bez przebudowy schematu

Jeśli semantyczne wyszukiwanie dojdzie, model to `embeddinggemma` (wielojęzyczny) na Ollamie właściciela.
Schemat jest już gotowy:

- tabela `private.lektury_osadzenia` ma klucz naturalny `(zrodlo, utwor, rodzaj, nr, czesc, model)` i kolumnę `wektor` **bez wymiaru**,
  więc przeładowanie elementów lub fragmentów nie osieraca wektorów, a wymiar ustala model przy wdrożeniu;
- `tresc_hash` pozwala skryptowi wypełniającemu znaleźć wiersze zmienione od ostatniego liczenia;
- indeks ANN powstaje osobno dla modelu, np.
  `create index on private.lektury_osadzenia using hnsw ((wektor::extensions.vector(768)) extensions.vector_cosine_ops) where model = 'embeddinggemma';`
  (wymiar do ustalenia przy wdrożeniu);
- wypełnianie: skrypt (analogiczny do `wgraj-teksty.ts`) czyta elementy i fragmenty, woła Ollamę i robi upsert do tabeli;
- użycie: do RPC wyszukiwania można dodać drugi człon rankingu (odległość kosinusowa), a pytanie osadzić w bramce tym samym modelem.
  Do czasu wdrożenia wyszukiwanie działa bez tej tabeli.
