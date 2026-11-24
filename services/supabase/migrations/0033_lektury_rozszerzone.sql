-- Autorskie opracowania Sedno. Lokalizacje w planie odnoszą się do wskazanych wydań.
with zrodla(utwor, tytul, url, rodzaj) as (
  values
    ('fortepian-szopena', 'Fortepian Szopena', 'https://wolnelektury.pl/katalog/lektura/fortepian-chopina/', 'utwór'),
    ('europejska-poezja-romantyczna', 'Europejska poezja romantyczna, wybór', 'https://zpe.gov.pl/a/sprawdz-sie/DHGMg506F', 'opracowanie'),
    ('wiersze-baranczaka', 'Wiersze Barańczaka, wybór', 'https://zpe.gov.pl/a/przeczytaj/D4il8EjHH', 'opracowanie'),
    ('traktat-moralny', 'Traktat moralny', 'https://zpe.gov.pl/watek/LPDHCLV14X/26/a/cwiczenia/D1HLNV3QC', 'opracowanie'),
    ('wiersze-przybosia', 'Wiersze Przybosia, wybór', 'https://zpe.gov.pl/a/wprowadzenie/D6SdYAytN', 'opracowanie'),
    ('odyseja', 'Odyseja', 'https://wolnelektury.pl/katalog/lektura/homer-odyseja/', 'utwór'),
    ('boska-komedia', 'Boska Komedia', 'https://wolnelektury.pl/katalog/lektura/boska-komedia/', 'utwór'),
    ('hamlet', 'Hamlet', 'https://wolnelektury.pl/katalog/lektura/hamlet/', 'utwór'),
    ('kordian', 'Kordian', 'https://wolnelektury.pl/katalog/lektura/kordian/', 'utwór'),
    ('ojciec-goriot', 'Ojciec Goriot', 'https://wolnelektury.pl/katalog/lektura/ojciec-goriot/', 'utwór'),
    ('klub-pickwicka', 'Klub Pickwicka', 'https://www.gutenberg.org/ebooks/580', 'utwór'),
    ('martwe-dusze', 'Martwe dusze', 'https://www.gutenberg.org/ebooks/1081', 'utwór'),
    ('pani-bovary', 'Pani Bovary', 'https://www.gutenberg.org/ebooks/2413', 'utwór'),
    ('proces-kafki', 'Proces', 'https://wolnelektury.pl/katalog/lektura/kafka-proces/', 'utwór'),
    ('mistrz-i-malgorzata', 'Mistrz i Małgorzata', 'https://literatura.edu.pl/mistrz-i-malgorzata-michail-bulhakow/', 'opracowanie'),
    ('szewcy', 'Szewcy', 'https://wolnelektury.pl/katalog/lektura/szewcy/', 'utwór'),
    ('sklepy-cynamonowe', 'Sklepy cynamonowe, wybór', 'https://wolnelektury.pl/katalog/lektura/schulz-sklepy-cynamonowe/', 'utwór'),
    ('mala-apokalipsa', 'Mała Apokalipsa', 'https://zpe.gov.pl/pdf/P15hhym13', 'opracowanie'),
    ('antygona-w-nowym-jorku', 'Antygona w Nowym Jorku', 'https://culture.pl/pl/dzielo/janusz-glowacki-antygona-w-nowym-jorku-0', 'opracowanie'),
    ('mrozek-opowiadanie', 'Opowiadanie Mrożka, wybór', 'https://czasopisma.bg.ug.edu.pl/index.php/JSR/article/download/531/202/410', 'opracowanie'),
    ('herbert-esej', 'Esej Herberta, wybór', 'https://culture.pl/pl/tworca/zbigniew-herbert', 'opracowanie'),
    ('herling-esej', 'Esej Herlinga-Grudzińskiego, wybór', 'https://kulturaparyska.com/pl/publication/download/1327', 'utwór')
), notatki(utwor, sekcja, hasla, tekst) as (
  values
    ('fortepian-szopena', 'streszczenie', 'streszczenie Fortepian Szopena Cyprian Kamil Norwid idea siegnal bruk',
      'Osoba mówiąca wspomina Chopina i podejmuje refleksję o jego muzyce. Obraz fortepianu wyrzuconego na bruk pozwala zestawić doskonałość dzieła z przemocą w świecie.'),
    ('fortepian-szopena', 'wydarzenia', 'plan wydarzeń przebieg kolejność Fortepian Szopena Cyprian Kamil Norwid idea siegnal bruk',
      '1. [Początek] Mówiący zwraca się do Chopina i przywołuje jego ostatnie dni.
2. [Środkowe części] Rozważa kształt dojrzałej sztuki.
3. [Końcowe części] Obraz zniszczenia instrumentu domyka rozważania.'),
    ('fortepian-szopena', 'geneza', 'geneza Fortepian Szopena Cyprian Kamil Norwid romantyzm idea siegnal bruk',
      'Punktem wyjścia był los instrumentu związanego z Chopinem podczas rosyjskich represji w Warszawie. Norwid rozbudował zdarzenie w poemat o działaniu sztuki i jej odbiorze.'),
    ('fortepian-szopena', 'bohaterowie', 'bohaterowie Fortepian Szopena Cyprian Kamil Norwid idea siegnal bruk',
      'Mówiący jest świadkiem dawnych spotkań z artystą oraz komentatorem jego dzieła. Chopin jest adresatem wspomnienia, a fortepian skupia uwagę jako materialny ślad sztuki.'),
    ('fortepian-szopena', 'motywy', 'motywy Fortepian Szopena Cyprian Kamil Norwid idea siegnal bruk',
      'Zderzenie instrumentu z brukiem pozwala mówić o konflikcie piękna i przemocy. Wiersz kieruje także ku pytaniu o dalsze trwanie dzieła po zniszczeniu przedmiotu.'),
    ('fortepian-szopena', 'konteksty', 'konteksty Fortepian Szopena Cyprian Kamil Norwid idea siegnal bruk',
      'Z koncertem Jankiela można porównać, jak muzyka przenosi pamięć zbiorową. U Norwida w centrum jest również los samego dzieła i warunki jego przyjęcia.'),
    ('europejska-poezja-romantyczna', 'streszczenie', 'streszczenie Europejska poezja romantyczna, wybór Różni poeci europejscy',
      'Ojciec wiezie dziecko przez nocny krajobraz. Chłopiec słyszy króla olch, którego słów ojciec nie rozpoznaje. Gdy docierają do celu, dziecko już nie żyje.'),
    ('europejska-poezja-romantyczna', 'wydarzenia', 'plan wydarzeń przebieg kolejność Europejska poezja romantyczna, wybór Różni poeci europejscy',
      '1. [Nocna jazda] Ojciec osłania chłopca podczas drogi.
2. [Głosy] Król olch próbuje skłonić dziecko do pójścia za sobą.
3. [Dojazd] Ojciec stwierdza śmierć chłopca.'),
    ('europejska-poezja-romantyczna', 'geneza', 'geneza Europejska poezja romantyczna, wybór Różni poeci europejscy romantyzm',
      'Ballada Goethego z okresu poprzedzającego ukształtowanie romantyzmu wywarła wpływ na późniejszą tradycję ballady. Opowieść rozwija się przez przyspieszający dialog i powtórzenia.'),
    ('europejska-poezja-romantyczna', 'bohaterowie', 'bohaterowie Europejska poezja romantyczna, wybór Różni poeci europejscy',
      'Ojciec szuka naturalnych przyczyn tego, co słyszy i widzi chłopiec. Dziecko doświadcza zagrożenia. Król olch przemawia jako postać dostępna jego perspektywie.'),
    ('europejska-poezja-romantyczna', 'motywy', 'motywy Europejska poezja romantyczna, wybór Różni poeci europejscy',
      'Nocna podróż zestawia naturalne wyjaśnienia z doświadczeniem nadprzyrodzonym. Rosnący lęk dziecka nadaje scenie napięcie.'),
    ('europejska-poezja-romantyczna', 'konteksty', 'konteksty Europejska poezja romantyczna, wybór Różni poeci europejscy',
      'Z Romantycznością można porównać sposób przedstawienia dwojga uczestników, którzy odmiennie objaśniają przeżycie jednej postaci.'),
    ('wiersze-baranczaka', 'streszczenie', 'streszczenie Wiersze Barańczaka, wybór Stanisław Barańczak',
      'Mówiący rozważa postawę, która ma zapewnić bezpieczne i uporządkowane życie. Zestawia pozornie oczywiste wartości z ceną ich bezrefleksyjnego przyjęcia.'),
    ('wiersze-baranczaka', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Barańczaka, wybór Stanisław Barańczak',
      '1. [Rozpoznanie] Wypowiedź przywołuje cechy uznawane za pożądane.
2. [Zderzenie ocen] Sposób wypowiedzi ujawnia dystans do utrwalonych formuł.
3. [Wybór] Uwaga przechodzi w stronę niezależnej oceny.'),
    ('wiersze-baranczaka', 'geneza', 'geneza Wiersze Barańczaka, wybór Stanisław Barańczak literatura powojenna',
      'Barańczak skupia uwagę na tym, jak utarte formuły kształtują ocenę ludzkich zachowań. Wiersz kieruje ten mechanizm ku językowi codziennych norm.'),
    ('wiersze-baranczaka', 'bohaterowie', 'bohaterowie Wiersze Barańczaka, wybór Stanisław Barańczak',
      'Mówiący rozpatruje własną postawę wobec modelu życia. Figury zachowań i ocen wyznaczają relację ze zbiorowością.'),
    ('wiersze-baranczaka', 'motywy', 'motywy Wiersze Barańczaka, wybór Stanisław Barańczak',
      'Rozpoznanie nacisku formuł służy pytaniu o konformizm. W interpretacji warto wskazać, gdzie pozytywnie brzmiące nazwy zyskują ironiczny sens.'),
    ('wiersze-baranczaka', 'konteksty', 'konteksty Wiersze Barańczaka, wybór Stanisław Barańczak',
      'Z Ferdydurke można porównać wpływ przyjętych ról na zachowanie. Wiersz skupia się na języku wartościowania, powieść rozbudowuje sceny wzajemnego formowania.'),
    ('traktat-moralny', 'streszczenie', 'streszczenie Traktat moralny Czesław Miłosz milosz traktat moraln',
      'Poemat pyta, jak dokonywać wyborów w świecie, w którym działają silne naciski historii i ideologii. Mówiący odwołuje się do przykładów, tonu pouczenia i ironii.'),
    ('traktat-moralny', 'wydarzenia', 'plan wydarzeń przebieg kolejność Traktat moralny Czesław Miłosz milosz traktat moraln',
      '1. [Rozpoznanie problemu] Mówca wskazuje utratę pewności co do powszechnych ocen.
2. [Rozwinięcie] Rozważa zachowanie ludzi wobec presji historii.
3. [Wnioski] Kieruje uwagę na zakres możliwego działania jednostki.'),
    ('traktat-moralny', 'geneza', 'geneza Traktat moralny Czesław Miłosz literatura powojenna milosz traktat moraln',
      'Powojenny poemat wykorzystuje formę traktatu i narzędzia wypowiedzi poetyckiej. Prowadzi argumentację przez przykłady i zmiany tonu.'),
    ('traktat-moralny', 'bohaterowie', 'bohaterowie Traktat moralny Czesław Miłosz milosz traktat moraln',
      'Mówiący pełni funkcję komentatora zwracającego się do odbiorcy, który musi podjąć własne decyzje. Przywoływane osoby i postawy uczestniczą w przykładach wywodu.'),
    ('traktat-moralny', 'motywy', 'motywy Traktat moralny Czesław Miłosz milosz traktat moraln',
      'Odpowiedzialność łączy się z zakresem sprawczości w trudnej sytuacji. Ironia pozwala ujawniać wygodę gotowych usprawiedliwień.'),
    ('traktat-moralny', 'konteksty', 'konteksty Traktat moralny Czesław Miłosz milosz traktat moraln',
      'Z Innym światem można zestawić pytanie o granice odpowiedzialności w warunkach przymusu. Formę poetyckiego wywodu warto odróżnić od relacji świadka.'),
    ('wiersze-przybosia', 'streszczenie', 'streszczenie Wiersze Przybosia, wybór Julian Przyboś taterniczk przybos',
      'Wiersz oddaje doświadczenie górskiej przestrzeni i przywołuje śmierć taterniczki. Dynamiczne obrazy pozwalają odczuć nagłą zmianę perspektywy i ciężar straty.'),
    ('wiersze-przybosia', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Przybosia, wybór Julian Przyboś taterniczk przybos',
      '1. [Obraz gór] Przestrzeń ukazuje się w ruchu i poprzez dźwięk.
2. [Chwila zagrożenia] Perspektywa przywołuje położenie wspinającej się osoby.
3. [Pamięć] Obraz powraca jako zapis tragicznego zdarzenia.'),
    ('wiersze-przybosia', 'geneza', 'geneza Wiersze Przybosia, wybór Julian Przyboś dwudziestolecie międzywojenne i literatura powojenna taterniczk przybos',
      'Utwór związany jest ze śmiercią taterniczki. Przyboś wykorzystuje środki poezji awangardowej, w tym skondensowane metafory i celowo zmienną perspektywę.'),
    ('wiersze-przybosia', 'bohaterowie', 'bohaterowie Wiersze Przybosia, wybór Julian Przyboś taterniczk przybos',
      'Głos należy do osoby odtwarzającej doświadczenie straty. Zmarła taterniczka jest przywołana przez obraz i sytuację graniczną.'),
    ('wiersze-przybosia', 'motywy', 'motywy Wiersze Przybosia, wybór Julian Przyboś taterniczk przybos',
      'Górskie nachylenia i dynamika obrazu budują doświadczenie niebezpieczeństwa. Zapis chwili służy pamięci, bez przejścia w zwykłą relację reporterską.'),
    ('wiersze-przybosia', 'konteksty', 'konteksty Wiersze Przybosia, wybór Julian Przyboś taterniczk przybos',
      'Wiersz można zestawić z Czatyrdahem wokół skali górskiego krajobrazu. U Przybosia kompozycję określa pamięć o konkretnym zdarzeniu.'),
    ('odyseja', 'streszczenie', 'streszczenie Odyseja Homer odyseusz odyss penelop telemach polifem itajk itak',
      'Odyseusz wraca spod Troi i przez lata nie może dotrzeć do Itaki. Po licznych przygodach przybywa do domu w przebraniu. Pokonuje zalotników i odzyskuje miejsce u boku Penelopy.'),
    ('odyseja', 'wydarzenia', 'plan wydarzeń przebieg kolejność Odyseja Homer odyseusz odyss penelop telemach polifem itajk itak',
      '1. [Pieśń V] Odyseusz opuszcza wyspę Kalipso.
2. [Pieśń IX] U Feaków opowiada o ucieczce od Polifema.
3. [Pieśń XII] Opowiada o minięciu Syren.
4. [Pieśń XIII] Feakowie odwożą go na Itakę.
5. [Pieśń XXI] Odyseusz napina własny łuk.
6. [Pieśń XXII] Pokonuje zalotników.
7. [Pieśń XXIII] Penelopa wystawia jego tożsamość na próbę.'),
    ('odyseja', 'geneza', 'geneza Odyseja Homer starożytność odyseusz odyss penelop telemach polifem itajk itak',
      'Epos rozwija grecką tradycję opowieści o powrotach spod Troi. Część przygód jest opowiedziana wstecz przez samego Odyseusza, dlatego ich kolejność w narracji różni się od chronologii.'),
    ('odyseja', 'bohaterowie', 'bohaterowie Odyseja Homer odyseusz odyss penelop telemach polifem itajk itak',
      'Odyseusz jest królem Itaki i mężem Penelopy. Telemach dorasta podczas nieobecności ojca. Atena wspiera powrót, Posejdon występuje przeciw bohaterowi.'),
    ('odyseja', 'motywy', 'motywy Odyseja Homer odyseusz odyss penelop telemach polifem itajk itak',
      'Podstęp w jaskini Polifema pokazuje rolę pomysłowości i niebezpieczeństwo chełpliwości. Próba łuku i rozpoznanie przez Penelopę łączą powrót z odzyskaniem tożsamości.'),
    ('odyseja', 'konteksty', 'konteksty Odyseja Homer odyseusz odyss penelop telemach polifem itajk itak',
      'W porównaniu z Iliadą w centrum znajduje się powrót i doświadczenie domu. Motyw gościnności daje kryterium oceny przyjmujących rozbitka i zalotników nadużywających pobytu.'),
    ('boska-komedia', 'streszczenie', 'streszczenie Boska Komedia Dante Alighieri wergiliusz dante beatrycz pieklo dantego',
      'Zagubiony Dante wędruje przez Piekło i Czyściec z Wergiliuszem. Dalsza droga przez Raj przebiega z pomocą Beatrycze i prowadzi ku wizji Boga. Spotkania pozwalają rozważać konsekwencje ludzkich czynów.'),
    ('boska-komedia', 'wydarzenia', 'plan wydarzeń przebieg kolejność Boska Komedia Dante Alighieri wergiliusz dante beatrycz pieklo dantego',
      '1. [Piekło, pieśń I] Dante gubi się w lesie.
2. [Piekło, pieśń I] Wergiliusz przychodzi mu z pomocą.
3. [Piekło, pieśń V] Dante spotyka Franceskę i Paola.
4. [Czyściec, pieśń XXX] Pojawia się Beatrycze.
5. [Raj, pieśń XXXIII] Wędrówka prowadzi do wizji Boga.'),
    ('boska-komedia', 'geneza', 'geneza Boska Komedia Dante Alighieri średniowiecze wergiliusz dante beatrycz pieklo dantego',
      'Poemat wykorzystuje średniowieczną wizję zaświatów i łączy ją z refleksją nad polityką oraz własnym doświadczeniem wygnańca. Opowieść ma trzy części.'),
    ('boska-komedia', 'bohaterowie', 'bohaterowie Boska Komedia Dante Alighieri wergiliusz dante beatrycz pieklo dantego',
      'Dante jest narratorem i pielgrzymem. Wergiliusz prowadzi go przez Piekło i większą część Czyśćca. Beatrycze przejmuje rolę przewodniczki, a w ostatnich pieśniach Raju pomaga św. Bernard.'),
    ('boska-komedia', 'motywy', 'motywy Boska Komedia Dante Alighieri wergiliusz dante beatrycz pieklo dantego',
      'Zagubienie w lesie otwiera alegorię duchowej drogi. Rozmowa z Franceską w pieśni V Piekła pozwala zestawić emocjonalną siłę opowieści z konsekwencjami działania.'),
    ('boska-komedia', 'konteksty', 'konteksty Boska Komedia Dante Alighieri wergiliusz dante beatrycz pieklo dantego',
      'Wergiliusz w roli przewodnika łączy średniowieczną wizję z tradycją Eneidy. Kształt zaświatów współtworzą obrazy biblijnego sądu oraz historyczne konflikty włoskich miast.'),
    ('hamlet', 'streszczenie', 'streszczenie Hamlet William Szekspir ofeli klaudiusz hamlet elsynor poloniusz laertes rozenkranc gildenstern',
      'Duch ojca mówi Hamletowi, że został zamordowany przez własnego brata. Hamlet próbuje sprawdzić tę wiadomość przez przedstawienie teatralne. Odkładana zemsta i kolejne śmierci prowadzą do pojedynku, w którym ginie także on sam.'),
    ('hamlet', 'wydarzenia', 'plan wydarzeń przebieg kolejność Hamlet William Szekspir ofeli klaudiusz hamlet elsynor poloniusz laertes rozenkranc gildenstern',
      '1. [Akt I] Duch króla oskarża Klaudiusza o zabójstwo.
2. [Akt III] Hamlet wystawia sztukę przypominającą opis zbrodni.
3. [Akt III] Hamlet zabija ukrytego Poloniusza.
4. [Akt IV] Dwór dowiaduje się o śmierci Ofelii.
5. [Akt V] Rozpoczyna się pojedynek Hamleta z Laertesem.
6. [Akt V] Hamlet zabija Klaudiusza i umiera.'),
    ('hamlet', 'geneza', 'geneza Hamlet William Szekspir renesans ofeli klaudiusz hamlet elsynor poloniusz laertes rozenkranc gildenstern',
      'Dramat wykorzystuje wcześniejszą opowieść o duńskim księciu. Szekspir rozwija wzorzec tragedii zemsty, wprowadzając pytania o wiarygodność ducha, osąd czynu i możliwość działania.'),
    ('hamlet', 'bohaterowie', 'bohaterowie Hamlet William Szekspir ofeli klaudiusz hamlet elsynor poloniusz laertes rozenkranc gildenstern',
      'Hamlet jest synem poprzedniego króla. Klaudiusz przejmuje tron i poślubia Gertrudę. Ofelia jest córką Poloniusza i siostrą Laertesa. Horacy to zaufany towarzysz Hamleta.'),
    ('hamlet', 'motywy', 'motywy Hamlet William Szekspir ofeli klaudiusz hamlet elsynor poloniusz laertes rozenkranc gildenstern',
      'Próba teatralna w akcie III pokazuje poszukiwanie dowodu za pomocą przedstawienia. Scena na cmentarzu w akcie V wiąże pamięć o zmarłych z nieuchronnością rozpadu ciała.'),
    ('hamlet', 'konteksty', 'konteksty Hamlet William Szekspir ofeli klaudiusz hamlet elsynor poloniusz laertes rozenkranc gildenstern',
      'W porównaniu z Makbetem przemoc także wiąże się z tronem, lecz główna postać Hamleta próbuje ocenić cudzą zbrodnię i konsekwencje odwetu.'),
    ('kordian', 'streszczenie', 'streszczenie Kordian Juliusz Słowacki mont blanc grzegorz kordian winkler kordian strach i imaginacj',
      'Młody Kordian doświadcza poczucia bezcelowości i podróżuje po Europie. Na Mont Blanc formułuje program poświęcenia dla narodu. Podejmuje samotną próbę zabicia cara, ale upada przed drzwiami jego sypialni.'),
    ('kordian', 'wydarzenia', 'plan wydarzeń przebieg kolejność Kordian Juliusz Słowacki mont blanc grzegorz kordian winkler kordian strach i imaginacj',
      '1. [Akt I] Kordian opowiada o swoim zniechęceniu.
2. [Akt I] Próbuje odebrać sobie życie.
3. [Akt II] Podróżuje i rozpoznaje sprzeczność między wyobrażeniami a doświadczeniem.
4. [Akt II, Mont Blanc] Przyjmuje ideę działania dla Polski.
5. [Akt III] Spiskowcy odrzucają zamiar zabicia cara.
6. [Akt III] Kordian mdleje przed sypialnią.
7. [Finał] Scena egzekucji pozostawia wynik otwarty.'),
    ('kordian', 'geneza', 'geneza Kordian Juliusz Słowacki romantyzm mont blanc grzegorz kordian winkler kordian strach i imaginacj',
      'Dramat emigracyjny spogląda na działania poprzedzające powstanie listopadowe i przyczyny klęski. Przygotowanie oraz sceny spisku przedstawiają interpretację historycznych wyborów, a nie kronikę.'),
    ('kordian', 'bohaterowie', 'bohaterowie Kordian Juliusz Słowacki mont blanc grzegorz kordian winkler kordian strach i imaginacj',
      'Kordian przechodzi od rozczarowania do próby czynu. Grzegorz opowiada mu historie w akcie I. Prezes przeciwstawia się zabójstwu cara, a Strach i Imaginacja personifikują siły zatrzymujące bohatera.'),
    ('kordian', 'motywy', 'motywy Kordian Juliusz Słowacki mont blanc grzegorz kordian winkler kordian strach i imaginacj',
      'Na Mont Blanc bohater przekształca poczucie samotności w deklarację misji. Przed sypialnią cara tekst konfrontuje tę deklarację z psychologiczną i moralną trudnością czynu.'),
    ('kordian', 'konteksty', 'konteksty Kordian Juliusz Słowacki mont blanc grzegorz kordian winkler kordian strach i imaginacj',
      'Kordiana można porównać z Konradem z III części Dziadów jako samotnych bohaterów podejmujących misję narodową. Warto wskazać różnice między zamiarem działania politycznego a sporem z Bogiem.'),
    ('ojciec-goriot', 'streszczenie', 'streszczenie Ojciec Goriot Honoré de Balzac rastignac vautrin pani vauquer delifin nucing delphin nucing',
      'Goriot przeznacza majątek na potrzeby córek i stopniowo popada w biedę. Młody Rastignac śledzi jego los i próbuje wejść do paryskiego towarzystwa. Po śmierci Goriota staje wobec miasta jako jawny uczestnik walki o pozycję.'),
    ('ojciec-goriot', 'wydarzenia', 'plan wydarzeń przebieg kolejność Ojciec Goriot Honoré de Balzac rastignac vautrin pani vauquer delifin nucing delphin nucing',
      '1. [Pensjonat] Rastignac poznaje Goriota i pozostałych mieszkańców.
2. [Wejście do salonów] Rastignac zbliża się do Delfiny.
3. [Wątek Vautrina] Vautrin przedstawia studentowi cyniczny plan awansu.
4. [Choroba] Goriot słabnie po kolejnych rodzinnych żądaniach.
5. [Finał] Rastignac uczestniczy w pogrzebie Goriota.'),
    ('ojciec-goriot', 'geneza', 'geneza Ojciec Goriot Honoré de Balzac realizm XIX wieku rastignac vautrin pani vauquer delifin nucing delphin nucing',
      'Powieść jest częścią Komedii ludzkiej. Balzac ukazuje Paryż przez różne środowiska, skupiając je wokół pensjonatu i prób awansu młodego człowieka.'),
    ('ojciec-goriot', 'bohaterowie', 'bohaterowie Ojciec Goriot Honoré de Balzac rastignac vautrin pani vauquer delifin nucing delphin nucing',
      'Goriot jest ojcem Anastazji i Delfiny. Rastignac to młody student z prowincji. Vautrin usiłuje wykorzystać jego ambicje, a pani Vauquer prowadzi pensjonat.'),
    ('ojciec-goriot', 'motywy', 'motywy Ojciec Goriot Honoré de Balzac rastignac vautrin pani vauquer delifin nucing delphin nucing',
      'Choroba i pogrzeb Goriota ukazują konsekwencje jednostronnego oddania. Spotkania Rastignaca z Vautrinem pozwalają analizować ścieranie się ambicji i zobowiązań moralnych.'),
    ('ojciec-goriot', 'konteksty', 'konteksty Ojciec Goriot Honoré de Balzac rastignac vautrin pani vauquer delifin nucing delphin nucing',
      'Z Lalką można porównać wpływ pieniędzy na dostęp do wyższych warstw. W obu utworach przestrzeń miasta pozwala śledzić różnice społeczne poprzez drogę bohatera.'),
    ('klub-pickwicka', 'streszczenie', 'streszczenie Klub Pickwicka Charles Dickens sam weller jingle bardell',
      'Samuel Pickwick i towarzysze podróżują, obserwując angielską codzienność. W wyniku nieporozumienia gospodyni pozywa go za niedotrzymanie obietnicy małżeństwa. Rozmaite przygody oraz skutki procesu tworzą epizodyczną historię.'),
    ('klub-pickwicka', 'wydarzenia', 'plan wydarzeń przebieg kolejność Klub Pickwicka Charles Dickens sam weller jingle bardell',
      '1. [Początek] Członkowie klubu organizują wyprawy.
2. [Wątek Jingle’a] Podróżni spotykają człowieka wykorzystującego ich zaufanie.
3. [Proces] Pani Bardell występuje z roszczeniem przeciw Pickwickowi.
4. [Fleet] Pickwick trafia do więzienia dla dłużników.
5. [Zakończenie] Spór prawny zostaje rozwiązany.'),
    ('klub-pickwicka', 'geneza', 'geneza Klub Pickwicka Charles Dickens realizm XIX wieku sam weller jingle bardell',
      'Dickens rozwijał powieść w odcinkach. Podróż tytułowego klubu stała się ramą dla komicznych scen, opowieści pobocznych i obserwacji instytucji.'),
    ('klub-pickwicka', 'bohaterowie', 'bohaterowie Klub Pickwicka Charles Dickens sam weller jingle bardell',
      'Samuel Pickwick przewodzi grupie. Sam Weller jest jego służącym i odpowiada praktycznym rozsądkiem na naiwność towarzystwa. Pani Bardell jest stroną procesu, a Jingle umie wykorzystywać pozory.'),
    ('klub-pickwicka', 'motywy', 'motywy Klub Pickwicka Charles Dickens sam weller jingle bardell',
      'Proces Bardell przeciw Pickwickowi pokazuje, jak interpretacja wypowiedzi przechodzi w narzędzie interesu. Pobyt we Fleet ujawnia społeczne skutki długów.'),
    ('klub-pickwicka', 'konteksty', 'konteksty Klub Pickwicka Charles Dickens sam weller jingle bardell',
      'Humor i epizodyczna podróż pozwalają obserwować różne warstwy społeczeństwa. Z Martwymi duszami można porównać rolę serii spotkań w portretowaniu kraju.'),
    ('martwe-dusze', 'streszczenie', 'streszczenie Martwe dusze Mikołaj Gogol czyczykow cziczikow pliuszkin sobakiewicz nozdriow manilow',
      'Czyczykow podróżuje po prowincji i skupuje od właścicieli nazwiska zmarłych chłopów wciąż figurujących w ewidencji. Projekt opiera się na różnicy między dokumentem a rzeczywistością. Gdy transakcje budzą podejrzenia, opuszcza miasto.'),
    ('martwe-dusze', 'wydarzenia', 'plan wydarzeń przebieg kolejność Martwe dusze Mikołaj Gogol czyczykow cziczikow pliuszkin sobakiewicz nozdriow manilow',
      '1. [Przyjazd] Czyczykow zabiega o przychylność miejscowych urzędników.
2. [Wizyty w majątkach] Proponuje właścicielom zakup zmarłych poddanych ujętych w spisach.
3. [Narastanie plotek] Mieszkańcy próbują wyjaśnić jego zamiary.
4. [Wyjazd] Czyczykow opuszcza miasto.'),
    ('martwe-dusze', 'geneza', 'geneza Martwe dusze Mikołaj Gogol realizm XIX wieku czyczykow cziczikow pliuszkin sobakiewicz nozdriow manilow',
      'Gogol stworzył utwór łączący podróż z satyrą na społeczeństwo i administrację carskiej Rosji. Proceder bohatera opiera się na okresowo aktualizowanych wykazach ludności.'),
    ('martwe-dusze', 'bohaterowie', 'bohaterowie Martwe dusze Mikołaj Gogol czyczykow cziczikow pliuszkin sobakiewicz nozdriow manilow',
      'Czyczykow jest organizatorem transakcji. Kolejni właściciele, m.in. Maniłow, Sobakiewicz i Pluszkin, reagują odmiennie i budują serię satyrycznych portretów.'),
    ('martwe-dusze', 'motywy', 'motywy Martwe dusze Mikołaj Gogol czyczykow cziczikow pliuszkin sobakiewicz nozdriow manilow',
      'Rozmowy o cenie człowieka ukazują jego uprzedmiotowienie przez ewidencję i interes ekonomiczny. Plotki pokazują, jak pozorny porządek urzędniczy opiera się na domysłach.'),
    ('martwe-dusze', 'konteksty', 'konteksty Martwe dusze Mikołaj Gogol czyczykow cziczikow pliuszkin sobakiewicz nozdriow manilow',
      'Z Ojcem Goriot można zestawić związek majątku ze statusem, a z Klubem Pickwicka rolę podróży w tworzeniu panoramy społecznej.'),
    ('pani-bovary', 'streszczenie', 'streszczenie Pani Bovary Gustave Flaubert emma bovary charles bovary rodolph lery bovary',
      'Emma Bovary pragnie życia zgodnego z wyobrażeniami o miłości i luksusie. Szuka spełnienia w romansach i zakupach, pogłębiając długi. W obliczu katastrofy zażywa truciznę.'),
    ('pani-bovary', 'wydarzenia', 'plan wydarzeń przebieg kolejność Pani Bovary Gustave Flaubert emma bovary charles bovary rodolph lery bovary',
      '1. [Część I] Emma poślubia Karola Bovary.
2. [Część I] Doświadcza balu w Vaubyessard.
3. [Część II] Wiąże się z Rudolfem.
4. [Część III] Odnawia znajomość z Leonem.
5. [Część III] Groźba utraty majątku staje się bezpośrednia.
6. [Część III] Emma zażywa arszenik.'),
    ('pani-bovary', 'geneza', 'geneza Pani Bovary Gustave Flaubert realizm XIX wieku emma bovary charles bovary rodolph lery bovary',
      'Flaubert wykorzystuje los mieszkanki prowincji do analizy wyobrażeń przekazywanych przez literaturę i życie społeczne. Powieść obserwuje zarówno Emmę, jak i otaczające ją środowisko.'),
    ('pani-bovary', 'bohaterowie', 'bohaterowie Pani Bovary Gustave Flaubert emma bovary charles bovary rodolph lery bovary',
      'Emma jest żoną lekarza Karola. Rudolf i Leon są jej kochankami. Kupiec Lheureux ułatwia Emmie dokonywanie zakupów na kredyt.'),
    ('pani-bovary', 'motywy', 'motywy Pani Bovary Gustave Flaubert emma bovary charles bovary rodolph lery bovary',
      'Bal podsyca fantazję o świecie dostatku. Narastające długi w części III łączą pragnienie zmiany życia z materialną zależnością.'),
    ('pani-bovary', 'konteksty', 'konteksty Pani Bovary Gustave Flaubert emma bovary charles bovary rodolph lery bovary',
      'Można zestawić Emmę z Wokulskim jako postacie budujące wyobrażenia o miłości, analizując wpływ lektur oraz środowiska na ich oczekiwania.'),
    ('proces-kafki', 'streszczenie', 'streszczenie Proces Franz Kafka jozef k jozefa k titorell przed prawem kafk',
      'Józef K. zostaje zatrzymany, choć nie dowiaduje się, o co jest oskarżony. Próby nawiązania kontaktu z sądem nie przynoszą rozstrzygnięcia. W finale dwóch ludzi wykonuje wyrok.'),
    ('proces-kafki', 'wydarzenia', 'plan wydarzeń przebieg kolejność Proces Franz Kafka jozef k jozefa k titorell przed prawem kafk',
      '1. [Aresztowanie] Josef K. spotyka strażników w dniu urodzin.
2. [Pierwsze śledztwo] Stawia się przed sądem w nieoczekiwanym otoczeniu.
3. [Malarz] Titorelli opisuje ograniczone możliwości działania.
4. [W katedrze] Kapelan opowiada przypowieść o wejściu do prawa.
5. [Koniec] Dwaj mężczyźni zabierają K. na miejsce egzekucji.'),
    ('proces-kafki', 'geneza', 'geneza Proces Franz Kafka modernizm XX wieku jozef k jozefa k titorell przed prawem kafk',
      'Powieść ukazała się po śmierci autora i była opracowywana z rękopisów. Niedostępność reguł procesu jest elementem świata przedstawionego, a nie luką, którą bohater może łatwo usunąć.'),
    ('proces-kafki', 'bohaterowie', 'bohaterowie Proces Franz Kafka jozef k jozefa k titorell przed prawem kafk',
      'Józef K. jest urzędnikiem bankowym. Adwokat przyjmuje rolę pośrednika, Titorelli zna praktyki sądu, a kapelan wyjaśnia problem prawa przez przypowieść.'),
    ('proces-kafki', 'motywy', 'motywy Proces Franz Kafka jozef k jozefa k titorell przed prawem kafk',
      'Brak jawnego oskarżenia w scenie zatrzymania pokazuje bezradność jednostki wobec procedury. W katedrze historia odźwiernego uwydatnia problem dostępu do prawa.'),
    ('proces-kafki', 'konteksty', 'konteksty Proces Franz Kafka jozef k jozefa k titorell przed prawem kafk',
      'Z Rokiem 1984 można zestawić zależność jednostki od aparatu kontroli. W Procesie mechanizm sądu pozostaje nieprzejrzysty, co wymaga innego sposobu interpretacji niż nazwana organizacja Partii.'),
    ('mistrz-i-malgorzata', 'streszczenie', 'streszczenie Mistrz i Małgorzata Michaił Bułhakow woland berlioz woland behemot woland azazell poncjusz pilat mistrz',
      'Przyjazd Wolanda do Moskwy wywołuje serię niezwykłych wydarzeń. Małgorzata podejmuje próbę odzyskania zaginionego Mistrza. Ich historia splata się z opowieścią o Piłacie i Jeszui, którą Mistrz uczynił tematem powieści.'),
    ('mistrz-i-malgorzata', 'wydarzenia', 'plan wydarzeń przebieg kolejność Mistrz i Małgorzata Michaił Bułhakow woland berlioz woland behemot woland azazell poncjusz pilat mistrz',
      '1. [Patriarsze Prudy] Woland rozmawia z Berliozem i Iwanem o istnieniu Jezusa.
2. [Teatr Variétés] Świta Wolanda wystawia mieszkańców na próbę.
3. [Klinika] Iwan poznaje Mistrza.
4. [Bal] Małgorzata podejmuje rolę gospodyni Wolanda.
5. [Finał] Mistrz i Małgorzata otrzymują miejsce odpoczynku.'),
    ('mistrz-i-malgorzata', 'geneza', 'geneza Mistrz i Małgorzata Michaił Bułhakow literatura XX wieku woland berlioz woland behemot woland azazell poncjusz pilat mistrz',
      'Powieść powstawała w realiach stalinowskich, a jej droga do druku była pośmiertna. Konstrukcja zestawia Moskwę, relację o czasach Piłata i wątek fantastyczny.'),
    ('mistrz-i-malgorzata', 'bohaterowie', 'bohaterowie Mistrz i Małgorzata Michaił Bułhakow woland berlioz woland behemot woland azazell poncjusz pilat mistrz',
      'Mistrz pisze powieść o Piłacie. Małgorzata zachowuje wierność Mistrzowi, a Woland przybywa ze świtą. Iwan Bezdomny staje się słuchaczem Mistrza. Piłat mierzy się z decyzją o losie Jeszui.'),
    ('mistrz-i-malgorzata', 'motywy', 'motywy Mistrz i Małgorzata Michaił Bułhakow woland berlioz woland behemot woland azazell poncjusz pilat mistrz',
      'Wizyta Wolanda odsłania zachłanność i lęki mieszkańców. W wątku Piłata decyzja dotycząca Jeszui wiąże władzę z tchórzostwem. Bal i jego następstwa pokazują znaczenie działania Małgorzaty.'),
    ('mistrz-i-malgorzata', 'konteksty', 'konteksty Mistrz i Małgorzata Michaił Bułhakow woland berlioz woland behemot woland azazell poncjusz pilat mistrz',
      'Utwór zestawia realia kontroli kultury z fantastyką i przekształca tradycję faustyczną. Wątek Jeszui jest literacką reinterpretacją materiału biblijnego.'),
    ('szewcy', 'streszczenie', 'streszczenie Szewcy Stanisław Ignacy Witkiewicz sajetan tempe scurvy dziarsk chlopc gniebon',
      'Szewcy buntują się przeciw ograniczeniom nakładanym przez władzę i przejmują kontrolę. Po ich wystąpieniu zmieniają się układ sił i sposób sprawowania przymusu. Kolejne przewroty nie przynoszą wyzwolenia.'),
    ('szewcy', 'wydarzenia', 'plan wydarzeń przebieg kolejność Szewcy Stanisław Ignacy Witkiewicz sajetan tempe scurvy dziarsk chlopc gniebon',
      '1. [Akt I] Sajetan i czeladnicy pracują i dyskutują o porządku społecznym.
2. [Akt I] Scurvy przejmuje władzę przy pomocy Dziarskich Chłopców.
3. [Akt II] Szewcom odbiera się możliwość pracy.
4. [Akt II] Szewcy zaczynają pracować i odwracają układ sił.
5. [Akt III] Pojawia się nowa władza.'),
    ('szewcy', 'geneza', 'geneza Szewcy Stanisław Ignacy Witkiewicz dwudziestolecie międzywojenne sajetan tempe scurvy dziarsk chlopc gniebon',
      'Witkacy konstruuje groteskowy dramat o przemianach społecznych. Umowność warsztatu, języka i przewrotów pozwala obserwować mechanizmy władzy.'),
    ('szewcy', 'bohaterowie', 'bohaterowie Szewcy Stanisław Ignacy Witkiewicz sajetan tempe scurvy dziarsk chlopc gniebon',
      'Sajetan Tempe jest majstrem. Czeladnicy uczestniczą w buncie. Prokurator Scurvy i Księżna reprezentują odmienne formy przewagi i pożądania. W finale pojawiają się przedstawiciele innego porządku.'),
    ('szewcy', 'motywy', 'motywy Szewcy Stanisław Ignacy Witkiewicz sajetan tempe scurvy dziarsk chlopc gniebon',
      'Zakaz pracy w akcie II zamienia dotychczasowy ciężar w potrzebę. Kolejne przewroty pokazują, że zmiana rządzących może prowadzić do innej postaci podporządkowania.'),
    ('szewcy', 'konteksty', 'konteksty Szewcy Stanisław Ignacy Witkiewicz sajetan tempe scurvy dziarsk chlopc gniebon',
      'Dramat można zestawić z Tangiem wokół powrotu przymusu po buncie. Groteska obejmuje zarówno brutalne wydarzenia, jak i zderzenia rejestrów języka.'),
    ('sklepy-cynamonowe', 'streszczenie', 'streszczenie Sklepy cynamonowe, wybór Bruno Schulz adela jakub jakub adela',
      'W tytułowym opowiadaniu nocna droga przez miasto przechodzi w wędrówkę wyobraźni. W Ptakach ojciec tworzy własny świat na poddaszu, a Ulica Krokodyli przedstawia dzielnicę zbudowaną z pozorów i obietnic.'),
    ('sklepy-cynamonowe', 'wydarzenia', 'plan wydarzeń przebieg kolejność Sklepy cynamonowe, wybór Bruno Schulz adela jakub jakub adela',
      '1. [Sklepy cynamonowe] Józef opuszcza teatr i wybiera drogę przez nocne miasto.
2. [Ptaki] Ojciec zajmuje się ptakami na poddaszu.
3. [Ptaki] Adela doprowadza do rozpadu jego przedsięwzięcia.
4. [Ulica Krokodyli] Narrator obserwuje podejrzanie efektowną dzielnicę.'),
    ('sklepy-cynamonowe', 'geneza', 'geneza Sklepy cynamonowe, wybór Bruno Schulz dwudziestolecie międzywojenne adela jakub jakub adela',
      'Schulz przetwarza doświadczenie miasta i domu rodzinnego przez język wspomnienia i wyobraźni. Opowiadania tworzą powiązany tom, choć każde ma własny porządek obrazów.'),
    ('sklepy-cynamonowe', 'bohaterowie', 'bohaterowie Sklepy cynamonowe, wybór Bruno Schulz adela jakub jakub adela',
      'Józef jest narratorem związanym z domem i miastem. Ojciec Jakub na nowo organizuje własne otoczenie. Adela interweniuje w sprawy domu i przerywa hodowlę ptaków.'),
    ('sklepy-cynamonowe', 'motywy', 'motywy Sklepy cynamonowe, wybór Bruno Schulz adela jakub jakub adela',
      'Wyobraźnia nadaje zwykłej wędrówce rozmiar niezwykłego doświadczenia. W Ptakach różnica między działaniem ojca i Adeli wpływa na ocenę granic twórczej swobody.'),
    ('sklepy-cynamonowe', 'konteksty', 'konteksty Sklepy cynamonowe, wybór Bruno Schulz adela jakub jakub adela',
      'Zbiór pozwala badać mitologizowanie codzienności i oniryczny kształt przestrzeni. Warto porównać, jak miasto opisane we wspomnieniu różni się od mapy realistycznej.'),
    ('mala-apokalipsa', 'streszczenie', 'streszczenie Mała Apokalipsa Tadeusz Konwicki konwick samospalen plac defilad samospalen',
      'Pisarz otrzymuje od znajomych z opozycji propozycję publicznego samospalenia w geście protestu. Jego wędrówka przez Warszawę prowadzi do kolejnych spotkań i refleksji o własnym wyborze. Finał skupia się na dojściu do miejsca planowanego protestu.'),
    ('mala-apokalipsa', 'wydarzenia', 'plan wydarzeń przebieg kolejność Mała Apokalipsa Tadeusz Konwicki konwick samospalen plac defilad samospalen',
      '1. [Początek dnia] Znajomi informują narratora o oczekiwanym czynie.
2. [Wędrówka] Bohater przemierza Warszawę i spotyka ludzi związanych z różnymi stronami sporu.
3. [Przygotowania] Wraca do pytania o sens i skutki protestu.
4. [Finał] Zbliża się do Pałacu Kultury, w którego otoczeniu ma dokonać czynu.'),
    ('mala-apokalipsa', 'geneza', 'geneza Mała Apokalipsa Tadeusz Konwicki literatura po 1945 roku konwick samospalen plac defilad samospalen',
      'Utwór należy do powieści Konwickiego przedstawiających rozkład życia publicznego w PRL. Został opublikowany poza oficjalnym obiegiem, co odpowiada podejmowanej problematyce cenzury i niezależności.'),
    ('mala-apokalipsa', 'bohaterowie', 'bohaterowie Mała Apokalipsa Tadeusz Konwicki konwick samospalen plac defilad samospalen',
      'Narrator to pisarz, od którego inni oczekują radykalnej decyzji. Opozycjoniści próbują nadać czynowi znaczenie zbiorowe. Osoby spotykane podczas wędrówki przedstawiają rozmaite reakcje na rzeczywistość.'),
    ('mala-apokalipsa', 'motywy', 'motywy Mała Apokalipsa Tadeusz Konwicki konwick samospalen plac defilad samospalen',
      'Wędrówka pokazuje przepaść między oficjalnym obrazem państwa i doświadczeniem mieszkańców. Planowany protest może być przykładem konfliktu między osobistą decyzją a oczekiwaniem środowiska.'),
    ('mala-apokalipsa', 'konteksty', 'konteksty Mała Apokalipsa Tadeusz Konwicki konwick samospalen plac defilad samospalen',
      'W porównaniu z biblijną Apokalipsą tytuł dookreśla koniec w skali jednostki i politycznej codzienności. Deformacja realiów Warszawy pozwala omówić groteskę.'),
    ('antygona-w-nowym-jorku', 'streszczenie', 'streszczenie Antygona w Nowym Jorku Janusz Głowacki pchelka sasza anit tompkin',
      'Bezdomna Anita zamierza pochować zmarłego Johna w parku. Prosi o wsparcie Saszę i Pchełkę. Ich działanie prowadzi do tragicznej pomyłki i odsłania pozycję osób żyjących poza głównym nurtem miasta.'),
    ('antygona-w-nowym-jorku', 'wydarzenia', 'plan wydarzeń przebieg kolejność Antygona w Nowym Jorku Janusz Głowacki pchelka sasza anit tompkin',
      '1. [Park] Anita dowiaduje się o losie Johna.
2. [Decyzja] Chce sprowadzić jego ciało i zapewnić mu pochówek.
3. [Próba] Sasza i Pchełka zabierają zwłoki uznane za ciało Johna.
4. [Następstwa] Okazuje się, że przywieziono inną osobę.
5. [Finał] Dalszy los Anity ujawnia tragiczny wymiar wykluczenia.'),
    ('antygona-w-nowym-jorku', 'geneza', 'geneza Antygona w Nowym Jorku Janusz Głowacki literatura po 1989 roku pchelka sasza anit tompkin',
      'Głowacki przenosi pytanie o godność zmarłego z tradycji Antygony do współczesnego Nowego Jorku. Sytuacja ludzi bezdomnych zmienia kształt sporu o pochówek.'),
    ('antygona-w-nowym-jorku', 'bohaterowie', 'bohaterowie Antygona w Nowym Jorku Janusz Głowacki pchelka sasza anit tompkin',
      'Anita chce decydować o pochówku bliskiej osoby. Sasza i Pchełka są mieszkańcami parku, którzy podejmują próbę pomocy. Policjant przedstawia perspektywę organów porządku.'),
    ('antygona-w-nowym-jorku', 'motywy', 'motywy Antygona w Nowym Jorku Janusz Głowacki pchelka sasza anit tompkin',
      'Plan pogrzebu ukazuje troskę o godność zmarłego i prawo do pamięci. Pomyłka przy wydobyciu zwłok wzmacnia motyw anonimowości, która dotyczy nie tylko śmierci.'),
    ('antygona-w-nowym-jorku', 'konteksty', 'konteksty Antygona w Nowym Jorku Janusz Głowacki pchelka sasza anit tompkin',
      'Z Antygoną Sofoklesa warto porównać stawkę pochówku i status bohaterki wobec prawa. Groteskowe elementy tekstu Głowackiego współistnieją z tragicznym finałem.'),
    ('mrozek-opowiadanie', 'streszczenie', 'streszczenie Opowiadanie Mrożka, wybór Sławomir Mrożek gumow slon nadmuchiw slon',
      'Dyrektor ogrodu zoologicznego postanawia zastąpić prawdziwego słonia imitacją. Próba pokazania sztucznego zwierzęcia publiczności kończy się kompromitacją. Opowiadanie ukazuje skutki zastępowania rzeczywistości propagandowym pozorem.'),
    ('mrozek-opowiadanie', 'wydarzenia', 'plan wydarzeń przebieg kolejność Opowiadanie Mrożka, wybór Sławomir Mrożek gumow slon nadmuchiw slon',
      '1. [Decyzja dyrektora] Zamiast żywego zwierzęcia ogród przygotowuje gumowego słonia.
2. [Przygotowania] Pracownicy napełniają imitację.
3. [Pokaz] Wiatr unosi imitację na oczach zwiedzających.'),
    ('mrozek-opowiadanie', 'geneza', 'geneza Opowiadanie Mrożka, wybór Sławomir Mrożek literatura powojenna gumow slon nadmuchiw slon',
      'Słoń jest przykładem krótkiej prozy satyrycznej Mrożka. Zwykła instytucja i pozornie racjonalna decyzja prowadzą do absurdalnego wyniku.'),
    ('mrozek-opowiadanie', 'bohaterowie', 'bohaterowie Opowiadanie Mrożka, wybór Sławomir Mrożek gumow slon nadmuchiw slon',
      'Dyrektor podejmuje decyzję o imitacji. Pracownicy mają ją wykonać. Zwiedzający są odbiorcami pokazu, który ujawnia rozbieżność między zapowiedzią i rzeczywistością.'),
    ('mrozek-opowiadanie', 'motywy', 'motywy Opowiadanie Mrożka, wybór Sławomir Mrożek gumow slon nadmuchiw slon',
      'Imitacja słonia skupia motyw pozoru. Scena pokazu pozwala wskazać, kiedy urzędowy pomysł przestaje być wiarygodny.'),
    ('mrozek-opowiadanie', 'konteksty', 'konteksty Opowiadanie Mrożka, wybór Sławomir Mrożek gumow slon nadmuchiw slon',
      'Opowiadanie można zestawić z satyrą o instytucjach i języku. Komizm wynika ze zderzenia tonu służbowego z niemożliwością utrzymania pozoru.'),
    ('herbert-esej', 'streszczenie', 'streszczenie Esej Herberta, wybór Zbigniew Herbert',
      'W Lascaux narrator przygląda się malowidłom naskalnym. Wyjście od oglądania konkretnych obrazów pozwala mu zapytać o relację współczesnego widza z dawnymi twórcami.'),
    ('herbert-esej', 'wydarzenia', 'plan wydarzeń przebieg kolejność Esej Herberta, wybór Zbigniew Herbert',
      '1. [Lascaux] Eseista kieruje uwagę na materialne ślady prehistorycznej sztuki.
2. [Lascaux] Obserwacja przedstawień zwierząt staje się punktem wyjścia do namysłu nad twórcą i odbiorcą.'),
    ('herbert-esej', 'geneza', 'geneza Esej Herberta, wybór Zbigniew Herbert literatura powojenna',
      'Tekst należy do tomu Barbarzyńca w ogrodzie. Herbert łączy widzenie dzieła w jego otoczeniu z zainteresowaniem historią sztuki.'),
    ('herbert-esej', 'bohaterowie', 'bohaterowie Esej Herberta, wybór Zbigniew Herbert',
      'Głos eseju należy do uważnego podróżnika i odbiorcy. Dawni twórcy nie występują jako bohaterowie biografii: są przywołani przez pozostawione obrazy.'),
    ('herbert-esej', 'motywy', 'motywy Esej Herberta, wybór Zbigniew Herbert',
      'Ogląd malowideł pozwala rozważyć, jak sztuka łączy ludzi rozdzielonych czasem. Jaskinia wskazuje również na znaczenie miejsca, w którym oglądamy dzieło.'),
    ('herbert-esej', 'konteksty', 'konteksty Esej Herberta, wybór Zbigniew Herbert',
      'Esej można zestawić z Miejscem Stasiuka wokół związku dzieła z otoczeniem. Oba teksty wychodzą od spotkania z materialnym śladem przeszłości.'),
    ('herling-esej', 'streszczenie', 'streszczenie Esej Herlinga-Grudzińskiego, wybór Gustaw Herling-Grudziński',
      'Eseista rozważa, jak ryciny Piranesiego pozwalają myśleć o zamknięciu i zagubieniu. W utworach plastycznych interesuje go przestrzeń więzienia oraz różne próby wyjaśnienia jej oddziaływania.'),
    ('herling-esej', 'wydarzenia', 'plan wydarzeń przebieg kolejność Esej Herlinga-Grudzińskiego, wybór Gustaw Herling-Grudziński',
      '1. [Ogląd rycin] Uwaga skupia się na przestrzeni wymykającej się zwykłej orientacji.
2. [Zestawienie odczytań] Eseista przywołuje różne wyjaśnienia wyobrażonych więzień.
3. [Refleksja] Obraz pozwala mówić o osamotnieniu i poczuciu uwięzienia.'),
    ('herling-esej', 'geneza', 'geneza Esej Herlinga-Grudzińskiego, wybór Gustaw Herling-Grudziński literatura powojenna i emigracyjna',
      'Szkic wykorzystuje ryciny włoskiego artysty jako podstawę eseju o kulturze. Przechodzi od konkretnego dzieła i jego recepcji do interpretacji wykraczającej poza opis.'),
    ('herling-esej', 'bohaterowie', 'bohaterowie Esej Herlinga-Grudzińskiego, wybór Gustaw Herling-Grudziński',
      'Piranesi jest twórcą omawianych przedstawień, a mówiący odbiorcą i komentatorem. Esej konfrontuje również głosy wcześniejszych interpretatorów.'),
    ('herling-esej', 'motywy', 'motywy Esej Herlinga-Grudzińskiego, wybór Gustaw Herling-Grudziński',
      'Powtarzające się wizje przeszkód i zamknięcia umożliwiają odczytanie więzienia jako przestrzeni psychicznej. Esej przedstawia interpretacje w formie pytań i propozycji.'),
    ('herling-esej', 'konteksty', 'konteksty Esej Herlinga-Grudzińskiego, wybór Gustaw Herling-Grudziński',
      'Szkic można zestawić z Innym światem, pamiętając o różnicy między świadectwem historycznego uwięzienia a interpretacją dzieła sztuki.')
)
insert into private.wiedza_pestki (przedmiot, utwor, sekcja, tytul, tekst, hasla, zrodlo_url, zrodlo_rodzaj, warunki)
select 'polski', z.utwor, n.sekcja, z.tytul, n.tekst, n.hasla, z.url, z.rodzaj,
  case when z.rodzaj = 'utwór' then 'Autorska notatka Sedno na podstawie wskazanego wydania. Bez przedruku tekstu.'
       else 'Autorska notatka Sedno na podstawie wskazanego materiału edukacyjnego. Bez przedruku materiału.' end
from notatki n join zrodla z using (utwor)
on conflict (przedmiot, utwor, sekcja) do update
set (tytul, tekst, hasla, zrodlo_url, zrodlo_rodzaj, warunki) =
    (excluded.tytul, excluded.tekst, excluded.hasla, excluded.zrodlo_url, excluded.zrodlo_rodzaj, excluded.warunki)
where (wiedza_pestki.tytul, wiedza_pestki.tekst, wiedza_pestki.hasla, wiedza_pestki.zrodlo_url,
       wiedza_pestki.zrodlo_rodzaj, wiedza_pestki.warunki) is distinct from
      (excluded.tytul, excluded.tekst, excluded.hasla, excluded.zrodlo_url, excluded.zrodlo_rodzaj, excluded.warunki);
