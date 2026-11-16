# Mapa umiejętności

Szablon: `/umiejetnosci`, komponent `Umiejetnosci.tsx`. Pusty prototyp: sam układ, bez logiki i danych.

## Co to jest

Pełna mapa opanowania umiejętności przedmiotu, z kodami wymagań CKE w drugim planie. Zastępuje zaślepkę w menu.

## Po co

Uczeń widzi, co już umie, a czego nie, w zrozumiałych słowach. Każda ocena ma źródło (dowody), więc da się jej zaufać.

## Jak działa

1. Wybór przedmiotu.
2. Obszary i umiejętności z paskiem opanowania i kodem CKE.
3. „Mało danych” zamiast zgadywania.
4. Panel umiejętności: dowody, typowy błąd, „Ćwicz”.

Numery odpowiadają pomarańczowym znacznikom na stronie szablonu.

## Od czego zależy

- Dwie warstwy modelu: `docs/mapa-model.html`.
- Dowody: `docs/mapa-dowody.html`.
- Mapowanie z kluczy CKE: `docs/cke-mapowanie.html`.

## Do zrobienia

- [ ] Taksonomia umiejętności per przedmiot (nazwy dla ucznia i kody CKE).
- [ ] Mapowanie zadań z arkuszy na umiejętności.
- [ ] Estymator opanowania z miarą pewności (np. Beta albo Elo, decyzja otwarta).
- [ ] Lista i panel umiejętności (na telefonie panel jako osobny ekran).
- [ ] Lista dowodów z linkami do zadań i sesji.
- [ ] „Ćwicz” prowadzi do Nauki z wybraną umiejętnością.
- [ ] Widget mapy na pulpicie z tych samych danych.

## Otwarte pytania

- Metoda estymatora i próg „mało danych”.

## Projekt

- `docs/mapa-umiejetnosci.html`
- `docs/mapa-panel.html`
- `docs/dash-mapa.html`
