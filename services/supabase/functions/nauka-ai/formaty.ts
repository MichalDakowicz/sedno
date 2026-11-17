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

export const SCENARIUSZE = {
  "teza-rozprawki": {
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
} as const;

export const STATUSY = ["dobrze", "do-poprawy", "do-zrobienia", "niepewne"] as const;

export function publiczneScenariusze() {
  return Object.entries(SCENARIUSZE).map(([id, { tytul, polecenie, przyklad, kryteria }]) => ({
    id,
    tytul,
    polecenie,
    przyklad,
    kryteria: Object.keys(kryteria),
  }));
}
