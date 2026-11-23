// Głos Pestki: wszystkie gotowe kwestie (bez modelu) w jednym miejscu, pogrupowane według sytuacji. Zasady z karty
// charakteru (docs/pestka-karta.html): pierwsza osoba w rodzaju żeńskim, krótkie zdania, do ucznia bez form męskich
// i żeńskich, pytanie zamiast wykładu, bez gotowej odpowiedzi, bez oceniania ucznia, bez emoji.
// {n} w tekście podstawia się liczbą (np. seria).

// Losowy początek na kartę, a dalej kolejne pozycje listy: teksty się zmieniają, ale nie powtarzają co chwilę.
const przesuniecie = Math.floor(Math.random() * 100);

/** Kwestia z listy dla n-tej sytuacji (np. numeru zadania); {n} zamienia na liczbę, gdy podana. */
export function wybierz(lista: readonly string[], n: number, liczba?: number) {
  const tekst = lista[(n + przesuniecie) % lista.length]!;
  return liczba === undefined ? tekst : tekst.replace("{n}", String(liczba));
}

export const glos = {
  powitanie: {
    rano: ["Dzień dobry. Zacznijmy od czegoś krótkiego.", "Dzień dobry. Mam pomysł na pierwsze pięć minut."],
    dzien: ["Cześć. Wybrałam coś na dziś.", "Cześć. Mamy chwilę? Jedna runda wystarczy."],
    wieczor: ["Dobry wieczór. Krótka powtórka przed snem dobrze się trzyma.", "Dobry wieczór. Coś lekkiego na koniec dnia?"],
    noc: ["Późno już. Jedna krótka rzecz i odpoczynek.", "Jeszcze nie śpisz? Zróbmy coś krótkiego."],
  },
  /** Dobra odpowiedź w rundzie. */
  dobrze: ["Dobrze.", "Zgadza się.", "Tak, to ta.", "Trafione.", "Dokładnie tak."],
  /** Kilka dobrych z rzędu. */
  seria: ["Dobrze. To już {n} z rzędu.", "{n} dobre z rzędu.", "Zgadza się. {n} z rzędu, tak trzymaj."],
  /** Cztery dobre z rzędu skracają rundę: zastępuje zwykłą kwestię o serii, żeby nie padły dwa zdania o serii. */
  skrocona: ["Cztery dobre z rzędu. Kończymy rundę wcześniej."],
  blad: {
    zle: ["Tym razem nie. Wyjaśnić?", "To nie ta. Wyjaśnić, dlaczego?", "Nie tym razem. Mogę pokazać, gdzie jest haczyk."],
    bezWyjasnienia: ["Tym razem nie. Zerknij na wyjaśnienie.", "To nie ta. Wyjaśnienie jest pod spodem."],
    pominiete: ["Pominięte. Poprawną odpowiedź widać na zielono.", "Bez odpowiedzi. Zerknij, która była dobra."],
    zwolnij: ["Zwolnijmy. Przy następnym weź podpowiedź, jeśli utkniesz.", "Trzy z rzędu nie wyszły. Zwolnijmy i czytajmy uważniej."],
    /** Trzy złe z rzędu w diagnozie: tam nie ma podpowiedzi, a błędy pokazują, od czego zacząć. */
    zwolnijDiagnoza: ["Trzy z rzędu nie wyszły. Nic nie szkodzi: tak szukam, od czego zacząć.", "Te są trudniejsze. Spokojnie, diagnoza ma pokazać właśnie to."],
    dokladam: ["Dokładam jedno zadanie, żeby to utrwalić.", "Jeszcze jedno zadanie na utrwalenie."],
    czesciowo: ["Część się zgadza. Zerknij, gdzie brakuje punktu.", "Blisko. Jedno kryterium jeszcze nie wyszło."],
    sprobuj: ["Tym razem nie. Spróbuj jeszcze raz albo weź następne.", "To nie to. Sprawdź obliczenia i spróbuj ponownie."],
    niepewne: ["Tego nie ocenię pewnie. Sprawdź zapis odpowiedzi.", "Nie umiem tego jednoznacznie sprawdzić. Zerknij na format."],
  },
  /** Jedno zdanie po rundzie, w rozbiorze. */
  rozbior: {
    koniecPowtorek: ["To, co uciekało, wróciło na miejsce. Zobacz, jak wygląda ogród.", "Powtórki za tobą. Rośliny w ogrodzie to pokażą."],
    bezbledna: ["Bezbłędna runda. Tak się buduje pewność.", "Wszystko dobrze. Ta umiejętność idzie w górę."],
    dobra: ["Dobra runda. Zostało kilka rzeczy do dopracowania.", "Większość dobrze. Zerknij na to, co nie wyszło."],
    slaba: ["Ta umiejętność potrzebuje jeszcze kilku rund. Zacznij od zadań z błędem.", "Trudna runda. Przejrzyj błędy, a następna pójdzie lepiej."],
  },
  /** Jedno zdanie pod wynikiem diagnozy na start. */
  diagnoza: ["Mam pierwszy obraz. Od najsłabszych umiejętności zaczniemy plan.", "Już wiem, od czego zacząć. Najpierw to, co poszło najsłabiej."],
  /** Seria dni z nauką na pulpicie. */
  seriaDni: {
    kamien: ["{n} dni z rzędu. Świętuję razem z tobą.", "Seria {n} dni. To już nawyk."],
    zwykla: ["{n} dni z rzędu. Dobrze się to układa.", "Seria trwa: {n} dni."],
  },
  przerwa: ["Zrób przerwę. Wrócę z czymś krótkim.", "Pięć minut przerwy dobrze zrobi. Poczekam."],
  sen: ["Zdrzemnę się, aż wrócisz."],
  /** Puste stany: zdanie i propozycja, co to zmieni. */
  puste: {
    powtorki: ["Nic nie czeka na powtórkę. Zrobię listę po kolejnych zadaniach.", "Na dziś czysto. Powtórki pojawią się po następnej rundzie."],
    proby: ["Jeszcze tu pusto. Jedna runda pokaże mi, od czego zacząć."],
    wyniki: ["Jeszcze nie mam twojego wyniku. Jeden arkusz pokaże mi, gdzie jesteś."],
    ogolne: ["Na razie tu pusto."],
    mapaDzialow: ["Mapy działów z tego przedmiotu jeszcze nie mam. Zajrzyj do arkuszy."],
  },
  ladowanie: ["Już patrzę.", "Chwilę, zbieram twoje wyniki.", "Szukam, co dziś warto."],
  bledy: {
    siec: ["Nie mogę się połączyć. Sprawdź internet, a ja spróbuję jeszcze raz.", "Coś przerwało połączenie. Spróbujmy ponownie."],
    ogolny: ["Coś poszło nie tak po mojej stronie. Spróbujmy jeszcze raz."],
    nieZnaleziono: ["Nie znam tego adresu. Może się zgubił?", "Tu nic nie ma. Wróćmy tam, gdzie coś na ciebie czeka."],
  },
  /** Przewodnik przy pierwszym wejściu na pulpit: trzy dymki. */
  przewodnik: {
    powitanie: "Cześć, jestem Pestka. Będę obok przez całą naukę do matury.",
    dzis: "To wybrałam na dziś. Krótko i tam, gdzie najwięcej zyskasz.",
    wolanie: "Gdy coś będzie niejasne, kliknij mnie. Siedzę w rogu ekranu.",
  },
  /** Quiz celów (views/QuizCelow.tsx): jedno pytanie Pestki na ekran. */
  quiz: {
    wstep: "Kilka szybkich pytań, a dobiorę naukę pod ciebie. Każde możesz pominąć.",
    przedmioty: "Które przedmioty zdajesz na maturze?",
    cel: "Ile chcesz mieć z tego przedmiotu?",
    mocne: "W czym z angielskiego czujesz się mocno?",
    slabe: "A co sprawia najwięcej kłopotu?",
    czas: "Ile czasu dziennie dasz radę na naukę?",
    dni: "Ile dni w tygodniu?",
    koniec: "Mam to. Tak to widzę:",
  },
  rozmowa: {
    powitanie: "Cześć, jestem Pestka. Wklej zadanie albo napisz, z czym masz kłopot, a przejdziemy przez to razem.",
    bezPolaczenia: "Pestka jest chwilowo niedostępna. Spróbuj za chwilę.",
    przywolanie: "Jestem. W czym ci pomóc?",
    widze: "Widzę: {n}. Zapytasz mnie o nie?",
    coDzis: "To wybrałam na dziś. Krótko i w twoim najsłabszym miejscu.",
  },
} as const;

/** Powitanie według pory dnia (strefa urządzenia). */
export function powitanie(teraz = new Date()) {
  const h = teraz.getHours();
  const pora = h >= 5 && h < 11 ? "rano" : h >= 11 && h < 18 ? "dzien" : h >= 18 && h < 23 ? "wieczor" : "noc";
  return wybierz(glos.powitanie[pora], teraz.getDate());
}
