export const UMIEJETNOSCI = {
  "sluchanie-sens": "Ustalanie głównej myśli nagrania",
  "sluchanie-szczegoly": "Wyszukiwanie szczegółów w nagraniu",
  "sluchanie-wnioskowanie": "Wnioskowanie na podstawie nagrania",
  "czytanie-sens": "Ustalanie głównej myśli tekstu",
  "czytanie-szczegoly": "Wyszukiwanie szczegółów w tekście",
  "czytanie-wnioskowanie": "Wnioskowanie na podstawie tekstu",
  "czytanie-spojnosc": "Rozpoznawanie powiązań w tekście",
  "srodki-jezykowe": "Dobór słownictwa i gramatyki",
  "pisanie": "Pisanie wypowiedzi",
} as const;

export const POZIOMY = ["podstawowy", "rozszerzony", "dwujezyczny"] as const;

export const ETAPY = {
  plan: {
    polecenie: "Plan uwzględnia wszystkie punkty polecenia.",
    porzadek: "Plan porządkuje pomysły w kolejności pasującej do formy tekstu.",
  },
  wstep: {
    temat: "Wstęp wprowadza temat adekwatnie do polecenia.",
    forma: "Wstęp sygnalizuje właściwą formę i cel wypowiedzi.",
  },
  rozwiniecie: {
    tresc: "Podpunkty polecenia zostały rozwinięte, z konkretnymi informacjami, wyjaśnieniami lub przykładami.",
    spojnosc: "Kolejne myśli łączą się logicznie, a akapity mają odrębne funkcje.",
  },
  zakonczenie: {
    domkniecie: "Zakończenie wynika z wcześniejszej treści i domyka wypowiedź w tej formie.",
  },
  przeglad: {
    polecenie: "Tekst realizuje punkty polecenia.",
    forma: "Układ, forma i styl pasują do sytuacji.",
    spojnosc: "Tekst rozwija temat w logicznej kolejności.",
    zakres: "Słownictwo i struktury pasują do treści i poziomu zadania.",
    poprawnosc: "Błędy językowe lub zapisu nie utrudniają rozumienia.",
  },
} as const;

export type PrzedmiotRundy = "angielski" | "matematyka" | "polski" | "informatyka";

// Kolega zawsze ma błędne rozumienie jednej zasady, a uczeń je prostuje. Kryteria mają stałe identyfikatory
// (blad, regula, przyklad), ich treść zależy od tematu. Reakcje Kolegi to gotowe zdania, więc nie zdradzają reguły.
export const RUNDY_PRZEDMIOTOW: Record<PrzedmiotRundy, {
  sedzia: string;
  podpowiedz: string;
  reakcje: { przyklad: string; bledne: string; niejasne: string; pozaTematem: string };
}> = {
  angielski: {
    sedzia: "To zadanie z angielskiego: oceniaj poprawność gramatyki i dobór struktur w przykładzie ucznia.",
    podpowiedz: "Popraw zdanie Kolegi i wyjaśnij, dlaczego tak jest.",
    reakcje: {
      przyklad: "Pokażesz mi to na przykładzie?",
      bledne: "Wciąż nie umiem zastosować tego do swojego zdania. Co mam w nim zmienić i dlaczego?",
      niejasne: "Możesz powiedzieć to inaczej albo podać przykład?",
      pozaTematem: "Wróćmy do mojego zdania. Co według ciebie w nim nie działa?",
    },
  },
  matematyka: {
    sedzia: "To zadanie z matematyki: sprawdzaj poprawność rachunków i każdego kroku. Kryterium przykładu uznaj za spełnione tylko wtedy, gdy uczeń poda poprawne obliczenia z wynikiem. Uzasadnienie bez wzoru lub bez wskazania konkretnego kroku to za mało.",
    podpowiedz: "Wskaż błędny krok, policz to poprawnie i wyjaśnij, dlaczego.",
    reakcje: {
      przyklad: "Możesz policzyć to krok po kroku? Chcę zobaczyć każdy etap.",
      bledne: "Dalej mi to nie wychodzi. Który krok w moim rozwiązaniu jest zły i dlaczego?",
      niejasne: "Nie nadążam za tym zapisem. Pokaż mi to na konkretnych liczbach.",
      pozaTematem: "Wróćmy do mojego rozwiązania. Który jego krok jest według ciebie błędny?",
    },
  },
  polski: {
    sedzia: "To zadanie z języka polskiego: sprawdzaj poprawność pojęć. Kryterium przykładu uznaj za spełnione tylko wtedy, gdy uczeń poda prawdziwy, własny przykład (najlepiej z lektury lub wiersza), który faktycznie ilustruje pojęcie. Nie przyjmuj ogólnika bez przykładu.",
    podpowiedz: "Wyjaśnij Koledze, na czym polega pomyłka, i podaj przykład, najlepiej z lektury.",
    reakcje: {
      przyklad: "Podasz mi własny przykład, najlepiej z jakiejś lektury?",
      bledne: "Dalej tego nie łapię. Co dokładnie jest nie tak z moim rozumieniem?",
      niejasne: "Możesz to powiedzieć prościej i pokazać na przykładzie?",
      pozaTematem: "Wróćmy do mojej wypowiedzi. Co według ciebie jest w niej błędne?",
    },
  },
  informatyka: {
    sedzia: "To zadanie z informatyki: sprawdzaj poprawność działania algorytmu lub kodu. Kryterium przykładu uznaj za spełnione tylko wtedy, gdy uczeń poda poprawny, konkretny przykład (dane i wynik albo krótki fragment kodu).",
    podpowiedz: "Wskaż błąd w rozumowaniu Kolegi, wyjaśnij go i pokaż na małym przykładzie.",
    reakcje: {
      przyklad: "Pokażesz mi to na małym przykładzie, z danymi i wynikiem?",
      bledne: "Wciąż nie widzę błędu. Co jest nie tak z moim rozumowaniem?",
      niejasne: "Możesz to rozpisać na konkretnych danych albo krótkim kodzie?",
      pozaTematem: "Wróćmy do mojego zadania. Co według ciebie jest w nim błędne?",
    },
  },
};

export const SCENARIUSZE = {
  "teza-rozprawki": {
    przedmiot: "angielski",
    jezyk: "en",
    tytul: "Teza rozprawki",
    polecenie: "Czy szkoły powinny organizować więcej zajęć na świeżym powietrzu?",
    przyklad: "I am going to write about lessons outside.",
    reguła: "W tym poleceniu pytanie prosi o stanowisko. Zapowiedź tematu stanowiska nie wyraża. Czytelnik powinien wiedzieć, co autor sądzi o częstszych zajęciach na zewnątrz.",
    kryteria: {
      blad: "Uczeń odróżnia zapowiedź tematu od zajęcia stanowiska.",
      regula: "Uczeń wyjaśnia, że czytelnik powinien poznać stanowisko autora.",
      przyklad: "Uczeń formułuje własną zrozumiałą tezę po angielsku odpowiadającą na pytanie.",
    },
  },
  "past-simple": {
    przedmiot: "angielski",
    jezyk: "en",
    tytul: "Czas przeszły z podaną datą",
    polecenie: "Opowiedz koledze o jednej czynności zakończonej wczoraj.",
    przyklad: "I have sent the invitation yesterday.",
    reguła: "Czynność nastąpiła w konkretnym, zakończonym czasie w przeszłości, co wskazuje yesterday. W tym zdaniu trzeba użyć Past Simple: I sent the invitation yesterday.",
    kryteria: {
      blad: "Uczeń wskazuje konflikt między czasem Present Perfect a określeniem yesterday.",
      regula: "Uczeń uzasadnia wybór Past Simple konkretnym, zakończonym momentem.",
      przyklad: "Uczeń podaje poprawione zdanie lub własny poprawny przykład Past Simple z zakończonym okresem.",
    },
  },
  "rownanie-kwadratowe": {
    przedmiot: "matematyka",
    jezyk: "pl",
    tytul: "Pierwiastki równania kwadratowego",
    polecenie: "Kolega rozwiązuje równanie x² − 5x + 6 = 0 i dostaje zły wynik.",
    przyklad: "Liczę deltę: Δ = b² − 4ac = 25 − 24 = 1, więc √Δ = 1. Ze wzoru x = (−b ± √Δ) / 2a podstawiam b = −5 i wychodzi mi x = (−5 ± 1) / 2, czyli x₁ = −2 i x₂ = −3.",
    reguła: "Błąd jest w znaku: b = −5, więc −b = 5, a nie −5. Poprawnie x = (5 ± 1) / 2, czyli x₁ = 2 i x₂ = 3. Sprawdzenie: 2² − 5·2 + 6 = 0. Przy ujemnym b wzór wymaga zmiany znaku, więc −b jest dodatnie.",
    kryteria: {
      blad: "Uczeń wskazuje, że Kolega podstawił −5 za −b, choć b = −5, więc −b = 5.",
      regula: "Uczeń uzasadnia, że we wzorze występuje −b, więc znak b trzeba odwrócić.",
      przyklad: "Uczeń podaje poprawne pierwiastki 2 i 3 z obliczeniem albo własny poprawny przykład z ujemnym b.",
    },
  },
  "ciag-arytmetyczny": {
    przedmiot: "matematyka",
    jezyk: "pl",
    tytul: "Wyraz ciągu arytmetycznego",
    polecenie: "Kolega liczy piąty wyraz ciągu arytmetycznego i dostaje zły wynik.",
    przyklad: "Pierwszy wyraz to a₁ = 3, a różnica r = 4. Wzór to aₙ = a₁ + n · r, więc a₅ = 3 + 5 · 4 = 23.",
    reguła: "Od pierwszego do n-tego wyrazu dodajemy różnicę n − 1 razy, nie n razy. Wzór to aₙ = a₁ + (n − 1) · r, więc a₅ = 3 + 4 · 4 = 19. Kontrola: 3, 7, 11, 15, 19.",
    kryteria: {
      blad: "Uczeń wskazuje, że we wzorze Kolega użył n zamiast n − 1.",
      regula: "Uczeń uzasadnia, że do a₁ dodajemy różnicę tyle razy, ile kroków dzieli wyraz od pierwszego, czyli n − 1.",
      przyklad: "Uczeń podaje poprawny wynik a₅ = 19 z obliczeniem albo własny poprawny przykład.",
    },
  },
  "logarytm-sumy": {
    przedmiot: "matematyka",
    jezyk: "pl",
    tytul: "Suma logarytmów",
    polecenie: "Kolega upraszcza sumę logarytmów i dostaje zły wynik.",
    przyklad: "Mam log₂ 8 + log₂ 4. Logarytmy o tej samej podstawie się dodaje, więc to log₂ (8 + 4) = log₂ 12, czyli około 3,58.",
    reguła: "Suma logarytmów o tej samej podstawie to logarytm iloczynu, nie sumy: log_a x + log_a y = log_a (x · y). Zatem log₂ 8 + log₂ 4 = log₂ 32 = 5. Kontrola: log₂ 8 = 3, log₂ 4 = 2, a 3 + 2 = 5.",
    kryteria: {
      blad: "Uczeń wskazuje, że Kolega dodał liczby pod logarytmem zamiast je pomnożyć.",
      regula: "Uczeń uzasadnia, że suma logarytmów o tej samej podstawie daje logarytm iloczynu.",
      przyklad: "Uczeń podaje poprawny wynik 5 z obliczeniem albo własny poprawny przykład tej reguły.",
    },
  },
  "twierdzenie-pitagorasa": {
    przedmiot: "matematyka",
    jezyk: "pl",
    tytul: "Twierdzenie Pitagorasa",
    polecenie: "Kolega szuka długości przyprostokątnej i dostaje wynik, który wygląda podejrzanie.",
    przyklad: "W trójkącie prostokątnym przeciwprostokątna ma 13, a jedna przyprostokątna 5. Z twierdzenia Pitagorasa: b² = 13² + 5² = 169 + 25 = 194, więc b ≈ 13,9.",
    reguła: "Kwadrat przeciwprostokątnej jest sumą kwadratów przyprostokątnych: c² = a² + b². Szukając przyprostokątnej, trzeba odjąć: b² = 13² − 5² = 169 − 25 = 144, więc b = 12. Wynik 13,9 jest większy od przeciwprostokątnej, co w trójkącie prostokątnym jest niemożliwe.",
    kryteria: {
      blad: "Uczeń wskazuje, że Kolega dodał kwadraty zamiast odjąć kwadrat przyprostokątnej od kwadratu przeciwprostokątnej.",
      regula: "Uczeń uzasadnia, że przeciwprostokątna jest najdłuższym bokiem, a jej kwadrat to suma kwadratów przyprostokątnych.",
      przyklad: "Uczeń podaje poprawny wynik 12 z obliczeniem albo własny poprawny przykład.",
    },
  },
  "pochodna-wielomianu": {
    przedmiot: "matematyka",
    jezyk: "pl",
    tytul: "Pochodna wielomianu",
    polecenie: "Kolega liczy pochodną funkcji f(x) = x³ + 4x i dostaje zły wynik.",
    przyklad: "Ze wzoru (xⁿ)′ = n · xⁿ⁻¹ biorę wykładnik 3 przed x i zostawiam resztę: (x³)′ = 3x³. Pochodna z 4x to 4, więc f′(x) = 3x³ + 4.",
    reguła: "Wykładnik trzeba zmniejszyć o 1: (xⁿ)′ = n · xⁿ⁻¹. Zatem (x³)′ = 3x², a (4x)′ = 4, więc f′(x) = 3x² + 4. Pochodna wielomianu stopnia 3 ma stopień 2.",
    kryteria: {
      blad: "Uczeń wskazuje, że Kolega nie zmniejszył wykładnika o 1 w składniku x³.",
      regula: "Uczeń uzasadnia wzór (xⁿ)′ = n · xⁿ⁻¹, w którym wykładnik maleje o 1.",
      przyklad: "Uczeń podaje poprawną pochodną 3x² + 4 albo własny poprawny przykład, np. pochodną x⁴.",
    },
  },
  "metafora": {
    przedmiot: "polski",
    jezyk: "pl",
    tytul: "Metafora a porównanie",
    polecenie: "Kolega myli dwa środki stylistyczne i podaje zły przykład metafory.",
    przyklad: "Metafora to zestawienie dwóch rzeczy za pomocą słowa „jak”. Na przykład „szybki jak błyskawica” to właśnie metafora.",
    reguła: "To porównanie, bo ma słowo łączące „jak”. Metafora zestawia rzeczy bez takiego słowa i przenosi cechy jednej na drugą, np. „życie to teatr” albo „burza gniewu”. Porównanie mówi, że coś jest podobne do czegoś, a metafora mówi, że coś jest czymś.",
    kryteria: {
      blad: "Uczeń wskazuje, że „szybki jak błyskawica” to porównanie, a nie metafora.",
      regula: "Uczeń uzasadnia, że porównanie ma słowo łączące, a metafora zestawia elementy bezpośrednio.",
      przyklad: "Uczeń podaje własny poprawny przykład metafory, najlepiej z lektury albo wiersza.",
    },
  },
  "cechy-romantyzmu": {
    przedmiot: "polski",
    jezyk: "pl",
    tytul: "Cechy romantyzmu",
    polecenie: "Kolega źle opisuje epokę i jej bohatera.",
    przyklad: "Romantyzm to epoka rozumu i wiary w naukę. Bohater romantyczny, na przykład Konrad z „Dziadów”, kieruje się chłodną logiką i dba o fakty.",
    reguła: "Romantyzm stawia uczucie, intuicję i wyobraźnię ponad rozum, a ufność w naukę i rozum to cecha oświecenia i pozytywizmu. Bohater romantyczny, np. Konrad z „Dziadów” cz. III, jest buntownikiem, indywidualistą, wrażliwym, gotowym walczyć o sprawę narodu, a nie chłodnym kalkulatorem.",
    kryteria: {
      blad: "Uczeń wskazuje, że w romantyzmie przeważają uczucie i intuicja, nie rozum i nauka.",
      regula: "Uczeń uzasadnia, jak romantyczna wrażliwość wpływa na postawę bohatera, np. bunt, indywidualizm albo poświęcenie.",
      przyklad: "Uczeń podaje prawdziwy przykład romantycznej postaci lub utworu i wskazuje w nim konkretną cechę.",
    },
  },
  "teza-rozprawki-pl": {
    przedmiot: "polski",
    jezyk: "pl",
    tytul: "Teza w rozprawce",
    polecenie: "Kolega pisze rozprawkę na temat „Czy warto czytać lektury?” i ma kłopot ze wstępem.",
    przyklad: "Moja teza brzmi: W tej rozprawce opiszę, dlaczego lektury są w szkole, i omówię kilka książek.",
    reguła: "Teza to jedno zdanie z jasnym stanowiskiem, które da się uzasadnić argumentami, np. „Warto czytać lektury, bo uczą rozumienia ludzi i rozwijają język”. Zapowiedź tego, o czym będzie tekst, stanowiska nie wyraża i nie daje nic do obrony.",
    kryteria: {
      blad: "Uczeń odróżnia zapowiedź tematu od tezy, czyli stanowiska autora.",
      regula: "Uczeń uzasadnia, że teza musi być stanowiskiem, które da się poprzeć argumentami.",
      przyklad: "Uczeń formułuje własną tezę, która zajmuje stanowisko wobec pytania o lektury.",
    },
  },
  "petla-range": {
    przedmiot: "informatyka",
    jezyk: "pl",
    tytul: "Pętla for i range w Pythonie",
    polecenie: "Kolega przewiduje, co wypisze program, i się myli.",
    przyklad: "Kod: for i in range(5): print(i). Wypisze liczby od 1 do 5, bo pętla zaczyna od jedynki i kończy na pięciu.",
    reguła: "range(5) daje liczby od 0 do 4: liczenie zaczyna się od 0, a górna granica nie wchodzi do zakresu. Program wypisze 0, 1, 2, 3, 4. Żeby dostać 1 do 5, trzeba range(1, 6).",
    kryteria: {
      blad: "Uczeń wskazuje, że range(5) zaczyna od 0 i kończy na 4.",
      regula: "Uczeń uzasadnia, że start domyślnie wynosi 0, a górna granica nie należy do zakresu.",
      przyklad: "Uczeń podaje poprawny kod dający liczby od 1 do 5, czyli range(1, 6), albo inny poprawny przykład.",
    },
  },
  "wyszukiwanie-binarne": {
    przedmiot: "informatyka",
    jezyk: "pl",
    tytul: "Wyszukiwanie binarne",
    polecenie: "Kolega chce użyć wyszukiwania binarnego i jest pewien, że zadziała.",
    przyklad: "Mam listę [7, 2, 9, 4, 1] i szukam w niej 4. Wyszukiwanie binarne sprawdzi środkowy element i odrzuci połowę listy, więc znajdzie 4 szybko, bo działa na każdej liście.",
    reguła: "Wyszukiwanie binarne działa tylko na liście posortowanej, bo po porównaniu ze środkiem odrzuca połowę, w której element na pewno nie leży. Na [7, 2, 9, 4, 1] środek to 9, a 4 jest mniejsze, więc odrzuca prawą połowę i może pominąć element. Najpierw trzeba posortować, np. [1, 2, 4, 7, 9].",
    kryteria: {
      blad: "Uczeń wskazuje, że lista Kolegi nie jest posortowana, więc wyszukiwanie binarne może zawieść.",
      regula: "Uczeń uzasadnia, że odrzucenie połowy jest poprawne tylko wtedy, gdy elementy są uporządkowane.",
      przyklad: "Uczeń podaje poprawny przykład, np. posortowaną listę i kroki wyszukiwania albo niedziałający przypadek.",
    },
  },
} as const satisfies Record<string, {
  przedmiot: PrzedmiotRundy;
  jezyk: "pl" | "en";
  tytul: string;
  polecenie: string;
  przyklad: string;
  reguła: string;
  kryteria: { blad: string; regula: string; przyklad: string };
}>;

export const STATUSY = ["dobrze", "do-poprawy", "do-zrobienia", "niepewne"] as const;

export function publiczneScenariusze() {
  return Object.entries(SCENARIUSZE).map(([id, { przedmiot, jezyk, tytul, polecenie, przyklad, kryteria }]) => ({
    id,
    przedmiot,
    jezyk,
    tytul,
    polecenie,
    przyklad,
    podpowiedz: RUNDY_PRZEDMIOTOW[przedmiot].podpowiedz,
    kryteria: Object.keys(kryteria),
  }));
}
