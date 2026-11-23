-- Autorskie opracowania Sedno. Lokalizacje w planie odnoszą się do wskazanych wydań.
with zrodla(utwor, tytul, url, rodzaj) as (
  values
    ('lalka', 'Lalka', 'https://wolnelektury.pl/katalog/lektura/lalka/', 'utwór'),
    ('zemsta', 'Zemsta', 'https://wolnelektury.pl/katalog/lektura/zemsta/', 'utwór'),
    ('dziady-iii', 'Dziady, część III', 'https://wolnelektury.pl/katalog/lektura/dziady-dziady-poema-dziady-czesc-iii/', 'utwór'),
    ('dziady-ii', 'Dziady, część II', 'https://wolnelektury.pl/katalog/lektura/dziady-dziady-poema-dziady-czesc-ii/', 'utwór'),
    ('antygona', 'Antygona', 'https://wolnelektury.pl/katalog/lektura/antygona/', 'utwór'),
    ('iliada', 'Iliada', 'https://wolnelektury.pl/katalog/lektura/homer-iliada/', 'utwór'),
    ('lament-swietokrzyski', 'Lament świętokrzyski', 'https://wolnelektury.pl/katalog/lektura/lament-swietokrzyski/', 'utwór'),
    ('polikarp', 'Rozmowa Mistrza Polikarpa ze Śmiercią', 'https://wolnelektury.pl/katalog/lektura/rozmowa-mistrza-polikarpa-ze-smiercia/', 'utwór'),
    ('piesn-o-rolandzie', 'Pieśń o Rolandzie', 'https://wolnelektury.pl/katalog/lektura/piesn-o-rolandzie/', 'utwór'),
    ('makbet', 'Makbet', 'https://wolnelektury.pl/katalog/lektura/makbet/', 'utwór'),
    ('skapiec', 'Skąpiec', 'https://wolnelektury.pl/katalog/lektura/skapiec/', 'utwór'),
    ('mitologia-grecja', 'Mitologia, część I: Grecja', 'https://zpe.gov.pl/a/mitologia-grecka-i-rzymska/DYnjb0jnx', 'opracowanie'),
    ('potop', 'Potop', 'https://wolnelektury.pl/katalog/lektura/potop/', 'utwór'),
    ('zbrodnia-i-kara', 'Zbrodnia i kara', 'https://pl.wikisource.org/wiki/Zbrodnia_i_kara_(Dostojewski,_1928)', 'utwór'),
    ('wesele', 'Wesele', 'https://wolnelektury.pl/katalog/lektura/wesele/', 'utwór'),
    ('chlopi', 'Chłopi', 'https://wolnelektury.pl/katalog/lektura/chlopi/', 'utwór'),
    ('przedwiosnie', 'Przedwiośnie', 'https://wolnelektury.pl/katalog/lektura/przedwiosnie/', 'utwór'),
    ('ferdydurke', 'Ferdydurke', 'https://zpe.gov.pl/watek/LP491JJ1BM/367/a/dowiedz-sie/D7S1UQBS7', 'opracowanie'),
    ('prosze-panstwa-do-gazu', 'Proszę państwa do gazu', 'https://wolnelektury.pl/katalog/lektura/borowski-prosze-panstwa-do-gazu/', 'utwór'),
    ('inny-swiat', 'Inny świat', 'https://zpe.gov.pl/a/sprawdz-sie/Dly3K3ja7', 'opracowanie'),
    ('zdazyc-przed-panem-bogiem', 'Zdążyć przed Panem Bogiem', 'https://zpe.gov.pl/a/przeczytaj/DYOHC1uNy', 'opracowanie'),
    ('dzuma', 'Dżuma', 'https://zpe.gov.pl/watek/LP491JJ1BM/420/a/dowiedz-sie/DE6JBM2RG', 'opracowanie'),
    ('rok-1984', 'Rok 1984', 'https://zpe.gov.pl/a/przeczytaj/D7HzGmpq5', 'opracowanie'),
    ('tango', 'Tango', 'https://zpe.gov.pl/a/przeczytaj/DYfODctad', 'opracowanie'),
    ('gora-edek', 'Górą „Edek”', 'https://zpe.gov.pl/watek/LPDHCLV14X/71/a/dowiedz-sie/DF6BHUF4D', 'opracowanie'),
    ('miejsce', 'Miejsce', 'https://zpe.gov.pl/pdf/PsG45Z6Kx', 'opracowanie'),
    ('profesor-andrews', 'Profesor Andrews w Warszawie', 'https://zpe.gov.pl/a/wprowadzenie/DVqbKE9pK', 'opracowanie'),
    ('podroze-z-herodotem', 'Podróże z Herodotem', 'https://culture.pl/pl/dzielo/podroze-z-herodotem', 'opracowanie'),
    ('pan-tadeusz', 'Pan Tadeusz', 'https://wolnelektury.pl/katalog/lektura/pan-tadeusz/', 'utwór'),
    ('balladyna', 'Balladyna', 'https://wolnelektury.pl/katalog/lektura/balladyna/', 'utwór'),
    ('biblia', 'Biblia', 'https://pl.wikisource.org/wiki/Biblia_Wujka_(1923)', 'utwór'),
    ('ksiega-rodzaju', 'Księga Rodzaju', 'https://pl.wikisource.org/wiki/Biblia_Wujka_(1923)/Ksi%C4%99ga_Rodzaju_(ca%C5%82o%C5%9B%C4%87)', 'utwór'),
    ('ksiega-hioba', 'Księga Hioba', 'https://pl.wikisource.org/wiki/Biblia_Wujka_(1923)/Ksi%C4%99ga_Hioba', 'utwór'),
    ('ksiega-koheleta', 'Księga Koheleta', 'https://pl.wikisource.org/wiki/Biblia_Wujka_(1923)/Ksi%C4%99ga_Koheleta', 'utwór'),
    ('ksiega-psalmow', 'Księga Psalmów', 'https://pl.wikisource.org/wiki/Biblia_Wujka_(1923)/Ksi%C4%99ga_Psalm%C3%B3w', 'utwór'),
    ('apokalipsa-sw-jana', 'Apokalipsa św. Jana', 'https://pl.wikisource.org/wiki/Biblia_Wujka_(1923)/Apokalipsa_%C5%9Bw._Jana', 'utwór'),
    ('piesn-nad-piesniami', 'Pieśń nad Pieśniami', 'https://pl.wikisource.org/wiki/Biblia_Wujka_(1923)/Pie%C5%9B%C5%84_nad_Pie%C5%9Bniami', 'utwór'),
    ('horacy-wybrane', 'Wybrane utwory Horacego', 'https://wolnelektury.pl/katalog/lektura/horacy-wybrane-utwory/', 'utwór'),
    ('bogurodzica', 'Bogurodzica', 'https://wolnelektury.pl/katalog/lektura/bogurodzica/', 'utwór'),
    ('piesni-kochanowskiego', 'Pieśni, wybór', 'https://wolnelektury.pl/katalog/lektura/piesni/', 'utwór'),
    ('treny', 'Treny', 'https://wolnelektury.pl/katalog/lektura/treny/', 'utwór'),
    ('poezja-baroku', 'Poezja baroku, wybór', 'https://wolnelektury.pl/katalog/lektura/naborowski-krotkosc-zywota/', 'opracowanie'),
    ('hymn-do-milosci-ojczyzny', 'Hymn do miłości ojczyzny', 'https://wolnelektury.pl/katalog/lektura/hymn-do-milosci-ojczyzny/', 'utwór'),
    ('oda-do-mlodosci', 'Oda do młodości', 'https://wolnelektury.pl/katalog/lektura/oda-do-mlodosci/', 'utwór'),
    ('sonety-krymskie', 'Sonety krymskie i wybrane wiersze Mickiewicza', 'https://wolnelektury.pl/katalog/lektura/sonety-krymskie/', 'utwór'),
    ('testament-moj', 'Testament mój i wybrane wiersze Słowackiego', 'https://wolnelektury.pl/katalog/lektura/testament-moj/', 'utwór'),
    ('satyry-krasickiego', 'Satyra Krasickiego, wybór', 'https://wolnelektury.pl/katalog/lektura/satyry/', 'utwór'),
    ('bajki-krasickiego', 'Bajki Krasickiego', 'https://wolnelektury.pl/katalog/lektura/bajki-i-przypowiesci/', 'utwór'),
    ('ballady-mickiewicza', 'Ballady i romanse, wybór', 'https://wolnelektury.pl/katalog/lektura/ballady-i-romanse/', 'utwór'),
    ('wiersze-baczynskiego', 'Wiersze Baczyńskiego, wybór', 'https://wolnelektury.pl/katalog/lektura/baczynski-elegia-o-chlopcu-polskim/', 'utwór'),
    ('wiersze-bialoszewskiego', 'Wiersze Białoszewskiego, wybór', 'https://zpe.gov.pl/a/przeczytaj/DE4524hI1', 'opracowanie'),
    ('wiersze-czechowicza', 'Wiersze Czechowicza, wybór', 'https://wolnelektury.pl/katalog/lektura/nuta-czlowiecza-zal/', 'utwór'),
    ('wiersze-herberta', 'Wiersze Herberta, wybór', 'https://zpe.gov.pl/a/zbigniew-herbert-przeslanie-pana-cogito/D13cLarOU', 'opracowanie'),
    ('wiersze-lesmiana', 'Wiersze Leśmiana, wybór', 'https://wolnelektury.pl/katalog/lektura/dusiolek/', 'utwór'),
    ('wiersze-milosza', 'Wiersze Miłosza, wybór', 'https://zpe.gov.pl/a/audiobook/D1B7VqKaY', 'opracowanie'),
    ('wiersze-norwida', 'Wiersze Norwida, wybór', 'https://wolnelektury.pl/katalog/lektura/norwid-nad-grobem-julii-capulleti-w-weronie/', 'utwór'),
    ('wiersze-pawlikowskiej', 'Wiersze Pawlikowskiej-Jasnorzewskiej, wybór', 'https://wolnelektury.pl/katalog/lektura/pawlikowska-jasnorzewska-milosc/', 'utwór'),
    ('wiersze-poswiatowskiej', 'Wiersze Poświatowskiej, wybór', 'https://zpe.gov.pl/pdf/P152LxHEN', 'opracowanie'),
    ('wiersze-tetmajera', 'Wiersze Przerwy-Tetmajera, wybór', 'https://wolnelektury.pl/katalog/lektura/hymn-do-nirwany/', 'utwór'),
    ('wiersze-rozewicza', 'Wiersze Różewicza, wybór', 'https://zpe.gov.pl/a/dowiedz-sie/DBALJ78LR', 'opracowanie'),
    ('wiersze-staffa', 'Wiersze Staffa, wybór', 'https://pl.wikisource.org/wiki/Deszcz_jesienny', 'utwór'),
    ('wiersze-szymborskiej', 'Wiersze Szymborskiej, wybór', 'https://zpe.gov.pl/a/DrMQiGFaL', 'opracowanie'),
    ('wiersze-tuwima', 'Wiersze Tuwima, wybór', 'https://wolnelektury.pl/katalog/lektura/tuwim-do-prostego-czlowieka/', 'utwór')
), notatki(utwor, sekcja, hasla, tekst) as (
  values
    ('lalka', 'wydarzenia', 'plan wydarzeń przebieg kolejność Lalka Bolesław Prus wokuls rzeck ochock zaslaw izabel leck',
      '1. [Tom I, rozdz. I](https://wolnelektury.pl/katalog/lektura/lalka-tom-pierwszy.html#s2) Rozmówcy omawiają wyjazd Wokulskiego na wojnę.
2. [Tom I, rozdz. VIII: Medytacje](https://wolnelektury.pl/katalog/lektura/lalka-tom-pierwszy.html#s9) Izabela rozważa trudną sytuację finansową Łęckich.
3. [Tom I, rozdz. XIII: Wielkopańskie zabawy](https://wolnelektury.pl/katalog/lektura/lalka-tom-pierwszy.html#s14) Wokulski ubiega się o względy Izabeli w otoczeniu arystokratów.
4. [Tom I, rozdz. XVIII](https://wolnelektury.pl/katalog/lektura/lalka-tom-pierwszy.html#s19) Na licytacji nabyta zostaje kamienica Łęckich na zlecenie Wokulskiego.
5. [Tom II, rozdz. II: Szare dnie i krwawe godziny](https://wolnelektury.pl/katalog/lektura/lalka-tom-drugi.html#s3) Wokulski przebywa w Paryżu.
6. [Tom II, rozdz. IV: Człowiek szczęśliwy w miłości](https://wolnelektury.pl/katalog/lektura/lalka-tom-drugi.html#s5) Wokulski dociera do Zasławka.
7. [Tom II, rozdz. XIV: Tempus fugit, aeternitas manet](https://wolnelektury.pl/katalog/lektura/lalka-tom-drugi.html#s15) Wokulski słyszy poufałą rozmowę Izabeli i Starskiego w pociągu.
8. [Tom II, rozdz. XIV](https://wolnelektury.pl/katalog/lektura/lalka-tom-drugi.html#s15) Wokulski wysiada w Skierniewicach.
9. [Tom II, rozdz. XIV](https://wolnelektury.pl/katalog/lektura/lalka-tom-drugi.html#s15) Dróżnik Wysocki ratuje Wokulskiego.
10. [Tom II, rozdz. XVIII](https://wolnelektury.pl/katalog/lektura/lalka-tom-drugi.html#s19) Rzecki umiera.'),
    ('zemsta', 'wydarzenia', 'plan wydarzeń przebieg kolejność Zemsta Aleksander Fredro czesni raptusiewicz papkin milczek milczk podstolin',
      '1. [Akt I] Cześnik zamierza poślubić Podstolinę.
2. [Akt I, scena VIII] Ludzie Cześnika przeszkadzają w naprawie muru, na którą nalega Rejent.
3. [Akt II] Wacław zostaje przy Cześniku, aby pozostać w pobliżu Klary.
4. [Akt III] Rejent chce ożenić Wacława z Podstoliną.
5. [Akt IV] Cześnik doprowadza do małżeństwa Wacława z Klarą.
6. [Akt IV, scena ostatnia] Cześnik i Rejent godzą się.'),
    ('dziady-iii', 'wydarzenia', 'plan wydarzeń przebieg kolejność Dziady, część III Adam Mickiewicz rollison nowosilcow wielk improwizac widzeni ksiedza piotra salon warszawsk',
      '1. [Prolog] Więzień zapisuje symboliczną śmierć Gustawa i narodziny Konrada.
2. [Akt I, scena I] Sobolewski opowiada o wywożonych więźniach.
3. [Akt I, scena II] Konrad w Improwizacji żąda władzy nad duszami.
4. [Akt I, scena III] Ksiądz Piotr odprawia egzorcyzmy nad Konradem.
5. [Akt I, scena IV] Ewa ma widzenie.
6. [Akt I, scena V] Ksiądz Piotr ma widzenie dotyczące losu Polski.
7. [Akt I, scena VI] Senator doświadcza koszmaru.
8. [Akt I, scena VII] Goście Salonu warszawskiego ujawniają odmienne postawy wobec represji.
9. [Akt I, scena VIII] Pani Rollison prosi Senatora o pomoc dla syna.
10. [Akt I, scena IX] Podczas obrzędu ukazuje się cierpiąca postać.
11. [Ustęp] Perspektywa przenosi się na obraz Rosji i jej carskiej władzy.'),
    ('dziady-ii', 'streszczenie', 'streszczenie Dziady, część II Adam Mickiewicz guslarz widmo zlego pana jozio i rozi',
      'Guślarz prowadzi obrzęd przywoływania zmarłych w kaplicy. Duchy kolejno proszą o pomoc i wyjaśniają, czego zabrakło im za życia. Po zakończeniu obrzędu milcząca zjawa idzie za pasterką.'),
    ('dziady-ii', 'wydarzenia', 'plan wydarzeń przebieg kolejność Dziady, część II Adam Mickiewicz guslarz widmo zlego pana jozio i rozi',
      '1. [Początek obrzędu] Guślarz poleca zamknąć kaplicę i zgasić światła.
2. [Duchy lekkie] Józio i Rózia proszą o gorczycę, bo nigdy nie zaznali goryczy.
3. [Widmo złego pana] Ptaki odganiają duszę pana od pożywienia.
4. [Duch pośredni] Zosia prosi młodzieńców, żeby przyciągnęli ją do ziemi.
5. [Finał] Nieproszona zjawa pomimo zaklęć wpatruje się w pasterkę.
6. [Finał] Widmo wychodzi za pasterką z kaplicy.'),
    ('dziady-ii', 'geneza', 'geneza Dziady, część II Adam Mickiewicz romantyzm guslarz widmo zlego pana jozio i rozi',
      'Druga część dramatu ma formę zapisu ludowego obrzędu. W przedmowie do cyklu Mickiewicz wyjaśnia, że podczas dziadów przygotowywano pokarmy i napoje dla dusz przodków.'),
    ('dziady-ii', 'bohaterowie', 'bohaterowie Dziady, część II Adam Mickiewicz guslarz widmo zlego pana jozio i rozi',
      'Guślarz prowadzi ceremonię, a chór powtarza wspólny refren. Józio i Rózia nie doświadczyli cierpienia. Zły pan odmawiał pomocy potrzebującym, Zosia pozostawała obojętna na ludzką miłość.'),
    ('dziady-ii', 'motywy', 'motywy Dziady, część II Adam Mickiewicz guslarz widmo zlego pana jozio i rozi',
      'Widmo złego pana pokazuje zależność między winą a karą. Dzieci i Zosia pokazują, że w ludowej etyce pełnia człowieczeństwa wymaga zarówno trudnych doświadczeń, jak i więzi z innymi.'),
    ('dziady-ii', 'konteksty', 'konteksty Dziady, część II Adam Mickiewicz guslarz widmo zlego pana jozio i rozi',
      'Wspólnotowa ceremonia łączy wyobrażenia o powrocie zmarłych z chrześcijańską troską o dusze. Powtórzenia chóru i polecenia Guślarza nadają scenie rytm obrzędu.'),
    ('antygona', 'streszczenie', 'streszczenie Antygona Sofokles polinejk eteokl ismena ismeny hajmon kreon',
      'Kreon zakazuje pochówku Polinejkesa. Antygona sprzeciwia się decyzji i oddaje bratu cześć. Gdy Kreon ulega ostrzeżeniu wróżbity i zmienia rozkaz, dochodzi już do śmierci Antygony, Hajmona i Eurydyki.'),
    ('antygona', 'wydarzenia', 'plan wydarzeń przebieg kolejność Antygona Sofokles polinejk eteokl ismena ismeny hajmon kreon',
      '1. [Prolog] Antygona oznajmia Ismenie, że pochowa brata.
2. [Rozmowa ze strażnikiem] Kreon dowiaduje się, że ciało przysypano ziemią.
3. [Przesłuchanie] Schwytana Antygona przyznaje się do czynu.
4. [Rozmowa ojca i syna] Hajmon próbuje przekonać Kreona do zmiany decyzji.
5. [Ostrzeżenie Tejrezjasza] Wróżbita ukazuje konsekwencje znieważenia zmarłego.
6. [Finał] Kreon zarządza pochówek Polinejkesa.
7. [Finał] Posłaniec ujawnia śmierć Antygony i Hajmona.
8. [Finał] Eurydyka odbiera sobie życie.'),
    ('antygona', 'geneza', 'geneza Antygona Sofokles starożytność polinejk eteokl ismena ismeny hajmon kreon',
      'Sofokles opracował epizod mitu tebańskiego dotyczący dzieci Edypa. Dramat zaczyna się po wojnie braci o Teby, a ich śmierć należy do historii poprzedzającej akcję.'),
    ('antygona', 'bohaterowie', 'bohaterowie Antygona Sofokles polinejk eteokl ismena ismeny hajmon kreon',
      'Antygona i Ismena są siostrami Polinejkesa i Eteoklesa. Kreon włada Tebami. Jego syn Hajmon jest narzeczonym Antygony, a Eurydyka żoną Kreona. Tejrezjasz występuje jako wróżbita.'),
    ('antygona', 'motywy', 'motywy Antygona Sofokles polinejk eteokl ismena ismeny hajmon kreon',
      'W przesłuchaniu Antygona uzasadnia czyn obowiązkiem wobec zmarłego i bogów. W rozmowie z Hajmonem Kreon uważa ustępstwo za zagrożenie dla władzy. Los jego rodziny pokazuje cenę uporu.'),
    ('antygona', 'konteksty', 'konteksty Antygona Sofokles polinejk eteokl ismena ismeny hajmon kreon',
      'Tragedia grecka pozwala omówić konflikt zobowiązań wobec rodziny, bogów i państwa. Chór komentuje decyzje i ich skutki, m.in. po schwytaniu Antygony oraz po tragedii domu Kreona.'),
    ('iliada', 'streszczenie', 'streszczenie Iliada Homer achilles hektor patrokl priam andromach',
      'W końcowym okresie wojny trojańskiej Achilles wycofuje się z walki po kłótni z Agamemnonem. Wraca, gdy ginie Patroklos. Po zabiciu Hektora oddaje jego zwłoki proszącemu o nie ojcu.'),
    ('iliada', 'wydarzenia', 'plan wydarzeń przebieg kolejność Iliada Homer achilles hektor patrokl priam andromach',
      '1. [Księga I] Agamemnon odbiera Achillesowi Bryzeidę.
2. [Księga I] Achilles odmawia dalszej walki.
3. [Księga VI] Hektor żegna się z Andromachą.
4. [Księga XVI] Patroklos rusza do walki w zbroi Achillesa.
5. [Księga XVI] Hektor zabija Patroklosa.
6. [Księga XXII] Achilles zabija Hektora w pojedynku.
7. [Księga XXIV] Priam prosi Achillesa o ciało syna.
8. [Księga XXIV] Trojanie urządzają pogrzeb Hektora.'),
    ('iliada', 'geneza', 'geneza Iliada Homer starożytność achilles hektor patrokl priam andromach',
      'Epos tradycyjnie przypisywany Homerowi wyrasta z greckiej tradycji opowieści o Trojanach i Achajach. Utwór zapowiada jako temat gniew Achillesa.'),
    ('iliada', 'bohaterowie', 'bohaterowie Iliada Homer achilles hektor patrokl priam andromach',
      'Achilles jest wojownikiem Achajów, Agamemnon ich wodzem. Patroklos to towarzysz Achillesa. Hektor jest obrońcą Troi, synem Priama i mężem Andromachy. Bogowie ingerują w starcia.'),
    ('iliada', 'motywy', 'motywy Iliada Homer achilles hektor patrokl priam andromach',
      'Księga XXII pokazuje wybór Hektora, który staje do walki mimo przewagi przeciwnika. Spotkanie Priama i Achillesa w księdze XXIV przenosi uwagę z zemsty na wiążące obu doświadczenie straty.'),
    ('iliada', 'konteksty', 'konteksty Iliada Homer achilles hektor patrokl priam andromach',
      'Epos zestawia wojenny honor ze współczuciem. Rozbudowane porównania, stałe określenia bohaterów oraz udział bogów w ludzkich sprawach są cechami jego stylu.'),
    ('lament-swietokrzyski', 'streszczenie', 'streszczenie Lament świętokrzyski Autor nieznany zale matki boskiej pod krzyzem',
      'Maryja stojąca pod krzyżem zwraca się do słuchaczy, syna, anioła i innych matek. Chce ulżyć Jezusowi i prosi o współczucie. Jej wypowiedź skupia się na doświadczeniu matki patrzącej na cierpienie dziecka.'),
    ('lament-swietokrzyski', 'wydarzenia', 'plan wydarzeń przebieg kolejność Lament świętokrzyski Autor nieznany zale matki boskiej pod krzyzem',
      '1. [Wezwanie] Maryja prosi ludzi, aby wysłuchali jej skargi.
2. [Zwrot do syna] Pragnie podzielić z Jezusem jego cierpienie.
3. [Zwrot do Gabriela] Zestawia dawną zapowiedź radości ze swoim bólem.
4. [Zwrot do matek] Prosi je o modlitwę, by nie doświadczyły podobnego nieszczęścia.'),
    ('lament-swietokrzyski', 'geneza', 'geneza Lament świętokrzyski Autor nieznany średniowiecze zale matki boskiej pod krzyzem',
      'Anonimowa polska pieśń należy do tradycji średniowiecznych lamentów pasyjnych. Jej inny tytuł pochodzi od pierwszych słów utworu.'),
    ('lament-swietokrzyski', 'bohaterowie', 'bohaterowie Lament świętokrzyski Autor nieznany zale matki boskiej pod krzyzem',
      'Maryja jest osobą mówiącą. Jezus pozostaje adresatem jej próśb podczas ukrzyżowania. Gabriel pojawia się we wspomnieniu zwiastowania, a inne matki są adresatkami końcowego wezwania.'),
    ('lament-swietokrzyski', 'motywy', 'motywy Lament świętokrzyski Autor nieznany zale matki boskiej pod krzyzem',
      'Próba otarcia krwi Jezusa pokazuje bezradną troskę matki. Kontrast zwiastowania i sceny pod krzyżem wiąże dawną obietnicę z aktualnym cierpieniem.'),
    ('lament-swietokrzyski', 'konteksty', 'konteksty Lament świętokrzyski Autor nieznany zale matki boskiej pod krzyzem',
      'Tekst można zestawić ze Stabat Mater oraz z obrazem Maryi w Bogurodzicy. W lamencie mówi ona o swoim doświadczeniu, a w Bogurodzicy wspólnota zwraca się do niej o wstawiennictwo.'),
    ('polikarp', 'streszczenie', 'streszczenie Rozmowa Mistrza Polikarpa ze Śmiercią Autor nieznany',
      'Uczony Polikarp prosi Boga, by mógł ujrzeć Śmierć. Zjawia się ona jako rozkładające się ciało i budzi jego przerażenie. W rozmowie przypomina, że podlegają jej ludzie ze wszystkich stanów.'),
    ('polikarp', 'wydarzenia', 'plan wydarzeń przebieg kolejność Rozmowa Mistrza Polikarpa ze Śmiercią Autor nieznany',
      '1. [Początek rozmowy] Polikarp modli się o widzenie Śmierci.
2. [Objawienie] Śmierć ukazuje się z kosą.
3. [Dialog] Mędrzec zadaje pytania mimo strachu.
4. [Wyliczenie stanów] Śmierć opisuje swoją władzę nad ludźmi.
5. [Satyryczne przykłady] Wytyka przywary m.in. nieuczciwym sędziom i duchownym.'),
    ('polikarp', 'geneza', 'geneza Rozmowa Mistrza Polikarpa ze Śmiercią Autor nieznany średniowiecze',
      'Anonimowy wiersz przekazuje średniowieczną refleksję o nieuchronności śmierci w formie dialogu. Motyw uczonego rozmawiającego ze Śmiercią ma odpowiedniki w literaturze europejskiej.'),
    ('polikarp', 'bohaterowie', 'bohaterowie Rozmowa Mistrza Polikarpa ze Śmiercią Autor nieznany',
      'Polikarp jest uczonym i rozmówcą Śmierci. Śmierć przemawia, posiada kosę i odpowiada na pytania, wymieniając przedstawicieli różnych stanów.'),
    ('polikarp', 'motywy', 'motywy Rozmowa Mistrza Polikarpa ze Śmiercią Autor nieznany',
      'Opis ciała Śmierci łączy grozę z wyrazistą przesadą. Wyliczenie stanów podkreśla wspólny los ludzi, a przykłady ich przewinień nadają dialogowi charakter satyry.'),
    ('polikarp', 'konteksty', 'konteksty Rozmowa Mistrza Polikarpa ze Śmiercią Autor nieznany',
      'Utwór rozwija zasadę memento mori i jest bliski motywowi tańca śmierci. Król, duchowny i człowiek ubogi podlegają śmierci mimo różnic między ich pozycjami.'),
    ('piesn-o-rolandzie', 'streszczenie', 'streszczenie Pieśń o Rolandzie Autor nieznany ronsewal oliwier roland durendal',
      'Ganelon doprowadza do zasadzki na tylną straż wojsk Karola Wielkiego. Roland opóźnia wezwanie pomocy i ginie wraz z towarzyszami. Karol wraca na miejsce, a zdrada Ganelona zostaje osądzona.'),
    ('piesn-o-rolandzie', 'wydarzenia', 'plan wydarzeń przebieg kolejność Pieśń o Rolandzie Autor nieznany ronsewal oliwier roland durendal',
      '1. [Poselstwo] Ganelon porozumiewa się z przeciwnikami Karola.
2. [Zasadzka] Oddział Rolanda zostaje zaatakowany w wąwozie.
3. [Spór o róg] Roland początkowo odrzuca radę Oliwiera, by wezwać wsparcie.
4. [Walka] Roland w końcu dmie w róg.
5. [Śmierć Rolanda] Bohater usiłuje zniszczyć miecz pod koniec bitwy.
6. [Sąd] Ganelon zostaje skazany za zdradę.'),
    ('piesn-o-rolandzie', 'geneza', 'geneza Pieśń o Rolandzie Autor nieznany średniowiecze ronsewal oliwier roland durendal',
      'Anonimowa pieśń należy do francuskich pieśni o czynach. Jej świat wykorzystuje pamięć o wyprawie Karola Wielkiego, podporządkowując wydarzenia wzorcom epiki rycerskiej.'),
    ('piesn-o-rolandzie', 'bohaterowie', 'bohaterowie Pieśń o Rolandzie Autor nieznany ronsewal oliwier roland durendal',
      'Roland dowodzi strażą tylną. Oliwier jest jego towarzyszem, a Turpin arcybiskupem walczącym po stronie Franków. Ganelon występuje przeciw Rolandowi, Karol dowodzi całym wojskiem.'),
    ('piesn-o-rolandzie', 'motywy', 'motywy Pieśń o Rolandzie Autor nieznany ronsewal oliwier roland durendal',
      'W sporze o róg rozchodzą się dwie wizje odpowiedzialności rycerza. W scenie śmierci Rolanda miecz i zwrócenie się ku Bogu łączą honor rycerski z religią.'),
    ('piesn-o-rolandzie', 'konteksty', 'konteksty Pieśń o Rolandzie Autor nieznany ronsewal oliwier roland durendal',
      'Można porównać śmierć Rolanda z postawą Hektora wobec Achillesa. Obaj uczestniczą w opowieściach wojennych, ale działają w różnych porządkach religijnych i wspólnotowych.'),
    ('makbet', 'streszczenie', 'streszczenie Makbet William Szekspir banko makduf macduf dunsinan dunsinane',
      'Po spotkaniu z wiedźmami Makbet zabija króla Dunkana i obejmuje tron. Chroniąc władzę, zleca kolejne zbrodnie. Ostatecznie ginie z ręki Makdufa, a tron odzyskuje prawowity następca.'),
    ('makbet', 'wydarzenia', 'plan wydarzeń przebieg kolejność Makbet William Szekspir banko makduf macduf dunsinan dunsinane',
      '1. [Akt I] Wiedźmy przepowiadają Makbetowi koronę.
2. [Akt II] Makbet zabija śpiącego Dunkana.
3. [Akt III] Zabójcy Makbeta mordują Banka.
4. [Akt III] Duch Banka ukazuje się Makbetowi podczas uczty.
5. [Akt IV] Wiedźmy przedstawiają Makbetowi mylące przepowiednie.
6. [Akt IV] Ludzie Makbeta mordują rodzinę Makdufa.
7. [Akt V] Lady Makbet we śnie próbuje zmyć wyobrażoną krew.
8. [Akt V] Wojsko Malcolma maskuje się gałęziami z lasu Birnam.
9. [Akt V] Makduf zabija Makbeta.'),
    ('makbet', 'geneza', 'geneza Makbet William Szekspir renesans banko makduf macduf dunsinan dunsinane',
      'Szekspir wykorzystał dzieje szkockich władców i podporządkował je tragedii o zdobyciu tronu przemocą. Akcja zaczyna się od zwycięstwa wojennego i pierwszego spotkania z wiedźmami.'),
    ('makbet', 'bohaterowie', 'bohaterowie Makbet William Szekspir banko makduf macduf dunsinan dunsinane',
      'Makbet zaczyna jako zasłużony wódz Dunkana. Lady Makbet nakłania go do pierwszej zbrodni. Banko słyszy przepowiednię o swoich potomkach, Makduf występuje przeciw tyranii, a Malcolm jest synem Dunkana.'),
    ('makbet', 'motywy', 'motywy Makbet William Szekspir banko makduf macduf dunsinan dunsinane',
      'Krew jako ślad winy powraca w lunatykowaniu Lady Makbet w akcie V. W akcie III reakcja Makbeta na ducha Banka zdradza utratę kontroli mimo zdobycia tronu.'),
    ('makbet', 'konteksty', 'konteksty Makbet William Szekspir banko makduf macduf dunsinan dunsinane',
      'Przepowiednie pozwalają odróżnić zapowiedź od decyzji bohatera. W akcie V spełnienie pozornie niemożliwych warunków ujawnia wieloznaczność słów wiedźm.'),
    ('skapiec', 'streszczenie', 'streszczenie Skąpiec Molier harpagon walery eliz frozyn',
      'Harpagon chce decydować o małżeństwach swoich dzieci i sam zamierza poślubić Mariannę. Zniknięcie szkatułki z pieniędzmi przesłania mu inne sprawy. Rozpoznanie dawnych więzi rodzinnych umożliwia małżeństwa zakochanych.'),
    ('skapiec', 'wydarzenia', 'plan wydarzeń przebieg kolejność Skąpiec Molier harpagon walery eliz frozyn',
      '1. [Akt I] Harpagon ogłasza zamiar poślubienia Marianny.
2. [Akt II] Kleant rozpoznaje w ojcu lichwiarza udzielającego pożyczki.
3. [Akt III] Marianna przychodzi do domu Harpagona.
4. [Akt IV] Szkatułka Harpagona znika z ogrodu.
5. [Akt V] Anzelm rozpoznaje w Walerym i Mariannie swoje dzieci.
6. [Akt V] Harpagon godzi się na śluby w zamian za odzyskanie pieniędzy.'),
    ('skapiec', 'geneza', 'geneza Skąpiec Molier barok harpagon walery eliz frozyn',
      'Molier ujął skąpstwo w formę komedii charakteru. Motyw kosztowności ukrytych przez skąpca łączy dramat z wcześniejszą tradycją komediową, w tym z twórczością Plauta.'),
    ('skapiec', 'bohaterowie', 'bohaterowie Skąpiec Molier harpagon walery eliz frozyn',
      'Harpagon jest ojcem Kleanta i Elizy. Kleant kocha Mariannę, a Eliza Walerego. Strzałka jest sługą Kleanta, Frozyna pośredniczką, Anzelm ojcem Walerego i Marianny.'),
    ('skapiec', 'motywy', 'motywy Skąpiec Molier harpagon walery eliz frozyn',
      'Szkatułka pokazuje, że troska o pieniądze wypiera u Harpagona więzi rodzinne. W akcie V nieporozumienie podczas rozmowy z Walerym zestawia miłość do Elizy z obsesją majątku.'),
    ('skapiec', 'konteksty', 'konteksty Skąpiec Molier harpagon walery eliz frozyn',
      'Komedia wykorzystuje komizm charakteru i sytuacji. Finał odsłania ukryte pokrewieństwo, które pozwala rozwiązać intrygę małżeńską.'),
    ('mitologia-grecja', 'streszczenie', 'streszczenie Mitologia, część I: Grecja Jan Parandowski prometeusz syzyf orfeusz eurydyk zeus demeter persefon herakles dedal ikar',
      'Część grecka opowiada o pochodzeniu świata, bogach i bohaterach. Mity wyjaśniają m.in. pojawienie się człowieka i zmienność przyrody. Inne historie skupiają się na cenie miłości, wiedzy lub sprzeciwu wobec bogów.'),
    ('mitologia-grecja', 'wydarzenia', 'plan wydarzeń przebieg kolejność Mitologia, część I: Grecja Jan Parandowski prometeusz syzyf orfeusz eurydyk zeus demeter persefon herakles dedal ikar',
      '1. [Narodziny świata] Po kolejnych pokoleniach władców bogów władzę uzyskuje Zeus.
2. [Mit o Prometeuszu] Prometeusz przekazuje ludziom ogień.
3. [Mit o Prometeuszu] Zeus karze buntownika.
4. [Mit o Demeter i Korze] Utrata córki sprawia, że Demeter przestaje troszczyć się o plony.
5. [Mit o Orfeuszu] Śpiewak schodzi do krainy umarłych po Eurydykę.
6. [Mit o Orfeuszu] Przed końcem drogi odwraca się i traci Eurydykę.
7. [Mit o Syzyfie] Syzyf musi bez końca wtaczać głaz pod górę.'),
    ('mitologia-grecja', 'geneza', 'geneza Mitologia, część I: Grecja Jan Parandowski antyk w opracowaniu międzywojennym prometeusz syzyf orfeusz eurydyk zeus demeter persefon herakles dedal ikar',
      'Parandowski zebrał antyczne opowieści w polskim opracowaniu dwudziestowiecznym. Część grecka pozwala rozdzielić dawne tradycje od sposobu, w jaki zostały uporządkowane i przedstawione współczesnemu czytelnikowi.'),
    ('mitologia-grecja', 'bohaterowie', 'bohaterowie Mitologia, część I: Grecja Jan Parandowski prometeusz syzyf orfeusz eurydyk zeus demeter persefon herakles dedal ikar',
      'Zeus stoi na czele bogów olimpijskich. Prometeusz jest dobroczyńcą ludzi. Demeter jako matka Kory wiąże los córki z urodzajem. Orfeusz dzięki śpiewowi uzyskuje warunkową zgodę na powrót Eurydyki.'),
    ('mitologia-grecja', 'motywy', 'motywy Mitologia, część I: Grecja Jan Parandowski prometeusz syzyf orfeusz eurydyk zeus demeter persefon herakles dedal ikar',
      'Kara Prometeusza służy namysłowi nad ofiarą poniesioną dla ludzi. Mit o Syzyfie przedstawia powracający, bezowocny wysiłek. W micie o Orfeuszu sztuka pozwala przekroczyć granicę śmierci, ale odzyskanie ukochanej się nie udaje.'),
    ('mitologia-grecja', 'konteksty', 'konteksty Mitologia, część I: Grecja Jan Parandowski prometeusz syzyf orfeusz eurydyk zeus demeter persefon herakles dedal ikar',
      'Los Prometeusza jest kontekstem dla buntu Konrada w III części Dziadów. Mit o Syzyfie można odczytać obok eseju Camusa, który nadaje starożytnej karze sens filozoficzny.'),
    ('potop', 'streszczenie', 'streszczenie Potop Henryk Sienkiewicz kmicic babini billewicz zaglob',
      'Andrzej Kmicic traci zaufanie Oleńki i wiąże się przysięgą z Januszem Radziwiłłem. Po odkryciu zdrady magnata zmienia stronę. Pod nazwiskiem Babinicz służy Rzeczypospolitej, a jego czyny umożliwiają rehabilitację.'),
    ('potop', 'wydarzenia', 'plan wydarzeń przebieg kolejność Potop Henryk Sienkiewicz kmicic babini billewicz zaglob',
      '1. [Tom I] Kmicic poznaje Oleńkę w Wodoktach.
2. [Tom I] Na uczcie w Kiejdanach Radziwiłł ujawnia porozumienie ze Szwecją.
3. [Tom I] Kmicic uświadamia sobie zamiary Radziwiłłów.
4. [Tom II] Babinicz pomaga obrońcom Jasnej Góry.
5. [Tom II] Kmicic uczestniczy w ocaleniu króla podczas jego powrotu.
6. [Tom III] Zostają publicznie ogłoszone zasługi Kmicica.'),
    ('potop', 'geneza', 'geneza Potop Henryk Sienkiewicz pozytywizm kmicic babini billewicz zaglob',
      'Powieść historyczna jest środkową częścią Trylogii. Sienkiewicz osadził przemianę fikcyjnego bohatera w realiach najazdu szwedzkiego na Rzeczpospolitą.'),
    ('potop', 'bohaterowie', 'bohaterowie Potop Henryk Sienkiewicz kmicic babini billewicz zaglob',
      'Kmicic jest żołnierzem i narzeczonym Oleńki Billewiczówny. Janusz Radziwiłł wykorzystuje jego wierność przysiędze. Ksiądz Kordecki kieruje obroną klasztoru, a Jan Kazimierz wraca do kraju.'),
    ('potop', 'motywy', 'motywy Potop Henryk Sienkiewicz kmicic babini billewicz zaglob',
      'Uczta w Kiejdanach pokazuje konflikt między dochowaniem przysięgi a lojalnością wobec wspólnoty. Przyjęcie nazwiska Babinicz pozwala bohaterowi działać mimo utraty dobrego imienia. Publiczna rehabilitacja zamyka ten proces.'),
    ('potop', 'konteksty', 'konteksty Potop Henryk Sienkiewicz kmicic babini billewicz zaglob',
      'Powieść łączy wydarzenia historyczne z romansem i przygodą. Los Kmicica można zestawić z losami bohaterów, którzy odkupują wcześniejszą winę pracą na rzecz wspólnoty, np. Jacka Soplicy.'),
    ('zbrodnia-i-kara', 'streszczenie', 'streszczenie Zbrodnia i kara Fiodor Dostojewski raskolnikow marmieladow swidrygajlow razumichin porfir piotrowicz',
      'Raskolnikow morduje lichwiarkę i niespodziewanie jej siostrę. Po zbrodni nie potrafi żyć zgodnie z teorią, która miała ją usprawiedliwić. Wsparcie Soni towarzyszy mu w przyznaniu się do czynu i na zesłaniu.'),
    ('zbrodnia-i-kara', 'wydarzenia', 'plan wydarzeń przebieg kolejność Zbrodnia i kara Fiodor Dostojewski raskolnikow marmieladow swidrygajlow razumichin porfir piotrowicz',
      '1. [Część I] Raskolnikow zabija Alonę Iwanownę.
2. [Część I] Zabija również powracającą Lizawietę.
3. [Po zbrodni] Ukrywa zabrane przedmioty.
4. [Rozmowy z Porfirym] Śledczy bada teorię Raskolnikowa o jednostkach wyjątkowych.
5. [Część V] Raskolnikow wyznaje Soni prawdę.
6. [Część VI] Bohater przyznaje się na komisariacie.
7. [Epilog] Sonia odwiedza go na Syberii.'),
    ('zbrodnia-i-kara', 'geneza', 'geneza Zbrodnia i kara Fiodor Dostojewski realizm XIX wieku raskolnikow marmieladow swidrygajlow razumichin porfir piotrowicz',
      'Powieść ukazuje Petersburg i środowisko ludzi narażonych na ubóstwo. Autor umieszcza zabójstwo wcześnie, by skupić się na skutkach decyzji oraz na jej moralnym i psychologicznym wymiarze.'),
    ('zbrodnia-i-kara', 'bohaterowie', 'bohaterowie Zbrodnia i kara Fiodor Dostojewski raskolnikow marmieladow swidrygajlow razumichin porfir piotrowicz',
      'Rodion Raskolnikow jest byłym studentem. Sonia Marmieładowa pomaga rodzinie i próbuje skłonić go do przyjęcia odpowiedzialności. Porfiry prowadzi śledztwo, a Razumichin wspiera Rodiona i jego bliskich.'),
    ('zbrodnia-i-kara', 'motywy', 'motywy Zbrodnia i kara Fiodor Dostojewski raskolnikow marmieladow swidrygajlow razumichin porfir piotrowicz',
      'Rozmowy z Porfirym odsłaniają rozbieżność między teorią jednostki wyjątkowej i doświadczeniem zabójcy. Odczytanie historii Łazarza przez Sonię daje kontekst dla przemiany zarysowanej w epilogu.'),
    ('zbrodnia-i-kara', 'konteksty', 'konteksty Zbrodnia i kara Fiodor Dostojewski raskolnikow marmieladow swidrygajlow razumichin porfir piotrowicz',
      'Realistyczny obraz miasta współistnieje z psychologicznym opisem winy. Wątek Łazarza umożliwia porównanie kary prawnej z możliwością odnowy człowieka.'),
    ('wesele', 'streszczenie', 'streszczenie Wesele Stanisław Wyspiański wernyhor gospodarz zlot rog jasiek rog chochol tan bronowic czepiec czepc',
      'Na weselu w Bronowicach spotykają się chłopi i inteligenci. Zjawy wydobywają ich lęki, ambicje i wyobrażenia o historii. Wernyhora przynosi wezwanie do wspólnego działania, lecz szansa zostaje zmarnowana.'),
    ('wesele', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wesele Stanisław Wyspiański wernyhor gospodarz zlot rog jasiek rog chochol tan bronowic czepiec czepc',
      '1. [Akt I] Czepiec zagaduje Dziennikarza o politykę.
2. [Akt I] Rachela podsuwa pomysł zaproszenia Chochoła.
3. [Akt II] Stańczyk ukazuje się Dziennikarzowi.
4. [Akt II] Wernyhora wręcza Gospodarzowi złoty róg.
5. [Akt III] Jasiek gubi róg, schylając się po czapkę.
6. [Akt III] Chochoł wprawia zgromadzonych w taniec.'),
    ('wesele', 'geneza', 'geneza Wesele Stanisław Wyspiański Młoda Polska wernyhor gospodarz zlot rog jasiek rog chochol tan bronowic czepiec czepc',
      'Dramat nawiązuje do wesela poety Lucjana Rydla i Jadwigi Mikołajczykówny w Bronowicach. Utwór przetwarza spotkanie różnych środowisk w opowieść o wspólnocie i przeszkodach, które utrudniają jej działanie.'),
    ('wesele', 'bohaterowie', 'bohaterowie Wesele Stanisław Wyspiański wernyhor gospodarz zlot rog jasiek rog chochol tan bronowic czepiec czepc',
      'Pan Młody idealizuje wieś, a Panna Młoda należy do środowiska chłopskiego. Gospodarz otrzymuje misję od Wernyhory i przekazuje zadanie Jaśkowi. Czepiec okazuje zainteresowanie życiem publicznym. Chochoł kieruje finałowym tańcem.'),
    ('wesele', 'motywy', 'motywy Wesele Stanisław Wyspiański wernyhor gospodarz zlot rog jasiek rog chochol tan bronowic czepiec czepc',
      'Rozmowa Czepca z Dziennikarzem w akcie I ujawnia różnicę między oczekiwaniami rozmówców. Utrata rogu w akcie III pokazuje rozpad wspólnego przedsięwzięcia. Taniec finałowy można interpretować jako obraz bezwładu.'),
    ('wesele', 'konteksty', 'konteksty Wesele Stanisław Wyspiański wernyhor gospodarz zlot rog jasiek rog chochol tan bronowic czepiec czepc',
      'Dramat łączy realistyczne rozmowy z wizjami i symboliczną akcją. Spotkanie z Upiorem w akcie II przypomina o rabacji galicyjskiej i podważa łatwe wyobrażenie o zgodzie stanów.'),
    ('chlopi', 'streszczenie', 'streszczenie Chłopi Władysław Stanisław Reymont boryn jagna jagnie jagne antek boryn hanka boryn w lipcach',
      'Życie Lipiec wyznaczają pory roku, praca i własność ziemi. Maciej Boryna poślubia Jagnę, co pogłębia konflikt z synem Antkiem. Po śmierci Macieja wieś wypędza Jagnę, a Hanka umacnia pozycję w gospodarstwie.'),
    ('chlopi', 'wydarzenia', 'plan wydarzeń przebieg kolejność Chłopi Władysław Stanisław Reymont boryn jagna jagnie jagne antek boryn hanka boryn w lipcach',
      '1. [Jesień] Maciej Boryna zaręcza się z Jagną.
2. [Jesień] Jagna i Maciej biorą ślub.
3. [Zima] Chłopi z Lipiec stają do walki o las.
4. [Zima] Boryna odnosi ranę podczas walki.
5. [Wiosna] Umierający Maciej wychodzi w pole i wykonuje gest siewu.
6. [Lato] Mieszkańcy wywożą Jagnę poza wieś.'),
    ('chlopi', 'geneza', 'geneza Chłopi Władysław Stanisław Reymont Młoda Polska boryn jagna jagnie jagne antek boryn hanka boryn w lipcach',
      'Cztery części powieści noszą nazwy pór roku. Reymont podporządkował temu cyklowi prace polowe, obrzędy i przemiany w rodzinie Borynów.'),
    ('chlopi', 'bohaterowie', 'bohaterowie Chłopi Władysław Stanisław Reymont boryn jagna jagnie jagne antek boryn hanka boryn w lipcach',
      'Maciej jest zamożnym gospodarzem i ojcem Antka. Antek jest mężem Hanki, lecz wiąże się z Jagną. Hanka stopniowo przejmuje odpowiedzialność za rodzinę. Jagna jest córką Dominikowej.'),
    ('chlopi', 'motywy', 'motywy Chłopi Władysław Stanisław Reymont boryn jagna jagnie jagne antek boryn hanka boryn w lipcach',
      'Spór Borynów o własność wiąże majątek z pozycją w rodzinie. Gest siewu w części Wiosna łączy życie Macieja z ziemią. Wygnanie Jagny w części Lato pokazuje przemoc wspólnoty wobec jednostki.'),
    ('chlopi', 'konteksty', 'konteksty Chłopi Władysław Stanisław Reymont boryn jagna jagnie jagne antek boryn hanka boryn w lipcach',
      'Powieść scala obserwację życia wsi z językiem stylizowanym i symbolicznymi obrazami. Zestawienie z Weselem pozwala porównać opis codzienności mieszkańców wsi z obrazem spotkania różnych stanów.'),
    ('przedwiosnie', 'streszczenie', 'streszczenie Przedwiośnie Stefan Żeromski baryk nawloc gajowc lulk szklan dom chlodk',
      'Cezary Baryka dorasta w Baku i doświadcza tam rewolucji. W Polsce konfrontuje opowieść ojca o dobrobycie z biedą i nierównością. Zetknięcie z różnymi programami politycznymi prowadzi go do udziału w demonstracji.'),
    ('przedwiosnie', 'wydarzenia', 'plan wydarzeń przebieg kolejność Przedwiośnie Stefan Żeromski baryk nawloc gajowc lulk szklan dom chlodk',
      '1. [Szklane domy] Cezary początkowo popiera rewolucję w Baku.
2. [Szklane domy] Seweryn opowiada synowi o szklanych domach.
3. [Szklane domy] Ojciec umiera w drodze do Polski.
4. [Nawłoć] Cezary odwiedza majątek Hipolita Wielosławskiego.
5. [Nawłoć] Cezary dostrzega biedę mieszkańców Chłodka.
6. [Wiatr od wschodu] Baryka poznaje stanowiska Gajowca i Lulka.
7. [Wiatr od wschodu] Cezary wychodzi przed szereg maszerujących robotników.'),
    ('przedwiosnie', 'geneza', 'geneza Przedwiośnie Stefan Żeromski dwudziestolecie międzywojenne baryk nawloc gajowc lulk szklan dom chlodk',
      'Żeromski pisał o problemach świeżo odzyskanej państwowości i zagrożeniach, jakie dostrzegał w społecznych nierównościach. Fikcyjna biografia Cezarego wiąże rewolucję w Rosji z polskimi sporami o reformy.'),
    ('przedwiosnie', 'bohaterowie', 'bohaterowie Przedwiośnie Stefan Żeromski baryk nawloc gajowc lulk szklan dom chlodk',
      'Cezary jest synem Jadwigi i Seweryna. Hipolit zaprasza go do Nawłoci, gdzie Cezary wiąże się z Laurą. Gajowiec reprezentuje stopniową przebudowę państwa, Lulek sympatyzuje z rewolucją.'),
    ('przedwiosnie', 'motywy', 'motywy Przedwiośnie Stefan Żeromski baryk nawloc gajowc lulk szklan dom chlodk',
      'W pierwszej części szklane domy wyrażają nadzieję na życie bez biedy. W Nawłoci kontrast dworu i Chłodka porządkuje doświadczenie nierówności. Otwarte zakończenie pozostawia sens gestu Cezarego do interpretacji.'),
    ('przedwiosnie', 'konteksty', 'konteksty Przedwiośnie Stefan Żeromski baryk nawloc gajowc lulk szklan dom chlodk',
      'Utwór można czytać jako powieść o dorastaniu i wypowiedź o drogach budowania państwa. Kompozycja trzech części przeprowadza bohatera od doświadczenia rewolucji przez wieś do sporów politycznych w Warszawie.'),
    ('ferdydurke', 'streszczenie', 'streszczenie Ferdydurke Witold Gombrowicz pimk mietus mlodziak upupian syfon mietus',
      'Profesor Pimko narzuca dorosłemu Józiowi rolę ucznia. Józio trafia do świata szkoły, pozornie nowoczesnej rodziny Młodziaków i ziemiańskiego dworu. W każdym z tych środowisk ludzie wzajemnie narzucają sobie role.'),
    ('ferdydurke', 'wydarzenia', 'plan wydarzeń przebieg kolejność Ferdydurke Witold Gombrowicz pimk mietus mlodziak upupian syfon mietus',
      '1. [Rozdział I] Pimko zabiera Józia do szkoły.
2. [Epizod szkolny] Syfon i Miętus przeciwstawiają sobie różne sposoby bycia uczniem.
3. [Epizod u Młodziaków] Józio wystawia na próbę deklarowaną nowoczesność rodziny.
4. [Epizod w Bolimowie] Miętus próbuje zbliżyć się do parobka Walka.
5. [Finał] Józio opuszcza dwór z Zosią.'),
    ('ferdydurke', 'geneza', 'geneza Ferdydurke Witold Gombrowicz dwudziestolecie międzywojenne pimk mietus mlodziak upupian syfon mietus',
      'Gombrowicz ukształtował powieść jako groteskowy zapis zmagań jednostki z formą społeczną. Epizody fabularne przeplatają się z odrębnymi opowieściami i dygresjami.'),
    ('ferdydurke', 'bohaterowie', 'bohaterowie Ferdydurke Witold Gombrowicz pimk mietus mlodziak upupian syfon mietus',
      'Józio jest narratorem i bohaterem poddanym szkolnemu przymusowi. Pimko narzuca mu niedojrzałość. Miętus sprzeciwia się szkolnym ideałom Syfona. Młodziakowie opierają własny wizerunek na nowoczesności.'),
    ('ferdydurke', 'motywy', 'motywy Ferdydurke Witold Gombrowicz pimk mietus mlodziak upupian syfon mietus',
      'Wizyta Pimki pokazuje mechanizm upupiania, czyli wtłaczania człowieka w rolę niedojrzałego. Szkolne spory i dom Młodziaków pokazują, jak zachowanie zależy od tego, jak widzą jednostkę inni.'),
    ('ferdydurke', 'konteksty', 'konteksty Ferdydurke Witold Gombrowicz pimk mietus mlodziak upupian syfon mietus',
      'Groteska pozwala wyolbrzymić zwykłe sytuacje wychowania i kontaktów międzyludzkich. Warto zestawić figurę narzuconej formy ze sporem o swobodę i konwencję w Tangu.'),
    ('prosze-panstwa-do-gazu', 'streszczenie', 'streszczenie Proszę państwa do gazu Tadeusz Borowski rampa birkenau henri rampa',
      'Narrator wraz z innymi więźniami pracuje przy przyjęciu transportu do obozu. Przybywający są pozbawiani bagażu i poddawani selekcji. Język relacji ujawnia, jak obóz zmienia reakcje uczestników.'),
    ('prosze-panstwa-do-gazu', 'wydarzenia', 'plan wydarzeń przebieg kolejność Proszę państwa do gazu Tadeusz Borowski rampa birkenau henri rampa',
      '1. [Początek] Więźniowie rozmawiają podczas odwszawiania.
2. [Rampa] Nadjeżdża transport.
3. [Rampa] Przybywający opuszczają wagony.
4. [Selekcja] Ludzie kierowani są w różne strony.
5. [Rampa] Po opróżnieniu transportu więźniowie zajmują się rzeczami przywiezionych osób.'),
    ('prosze-panstwa-do-gazu', 'geneza', 'geneza Proszę państwa do gazu Tadeusz Borowski literatura o wojnie i okupacji rampa birkenau henri rampa',
      'Borowski wyrasta z pokolenia doświadczonego okupacją i uwięzieniem w niemieckich obozach. W opowiadaniu buduje perspektywę uczestnika, którego głosu nie należy utożsamiać wprost z osądem autora.'),
    ('prosze-panstwa-do-gazu', 'bohaterowie', 'bohaterowie Proszę państwa do gazu Tadeusz Borowski rampa birkenau henri rampa',
      'Tadek jest więźniem i pierwszoosobowym narratorem. Henri zna pracę przy rozładunku. Nowo przybyli ludzie są niepewni swojego losu, a przebieg selekcji zależy od funkcjonariuszy obozowych.'),
    ('prosze-panstwa-do-gazu', 'motywy', 'motywy Proszę państwa do gazu Tadeusz Borowski rampa birkenau henri rampa',
      'Przy pracy na rampie współistnieją głód więźniów i udział w obozowej machinie. Rejestracja zachowań z małą liczbą jawnych ocen pozwala dostrzec przystosowanie do przemocy.'),
    ('prosze-panstwa-do-gazu', 'konteksty', 'konteksty Proszę państwa do gazu Tadeusz Borowski rampa birkenau henri rampa',
      'Opowiadanie można porównać z Innym światem w analizie skutków obozu dla relacji między ludźmi. Oba świadectwa dotyczą odmiennych systemów i wymagają uwzględnienia ich historycznej specyfiki.'),
    ('inny-swiat', 'streszczenie', 'streszczenie Inny świat Gustaw Herling-Grudziński jercew kostylew natalia lwown dom swidan',
      'Herling-Grudziński opisuje pobyt w sowieckim obozie pracy w Jercewie. Losy więźniów pokazują działanie głodu, przymusu i hierarchii. Narrator pyta również o granice sądzenia ludzi zmuszanych do walki o przeżycie.'),
    ('inny-swiat', 'wydarzenia', 'plan wydarzeń przebieg kolejność Inny świat Gustaw Herling-Grudziński jercew kostylew natalia lwown dom swidan',
      '1. [Po aresztowaniu] Narrator trafia do systemu sowieckich więzień i obozów.
2. [Jercewo] Poznaje zależność przydziału żywności od wydajności pracy.
3. [Ręka w ogniu] Kostylew opala rękę, by nie pracować dla systemu.
4. [Głodówka] Narrator domaga się zwolnienia.
5. [Epilog] Spotkany po wojnie były więzień oczekuje od narratora zrozumienia.'),
    ('inny-swiat', 'geneza', 'geneza Inny świat Gustaw Herling-Grudziński literatura powojenna i emigracyjna jercew kostylew natalia lwown dom swidan',
      'Książka jest świadectwem doświadczenia łagru i jego literackim opracowaniem. Tytuł odsyła do Dostojewskiego, którego Zapiski z martwego domu stanowią punkt odniesienia dla opisu więziennego świata.'),
    ('inny-swiat', 'bohaterowie', 'bohaterowie Inny świat Gustaw Herling-Grudziński jercew kostylew natalia lwown dom swidan',
      'Narrator opisuje zarówno własną drogę, jak i losy innych więźniów. Kostylew sprzeciwia się pracy dla systemu. Natalia Lwowna udostępnia narratorowi książkę Dostojewskiego.'),
    ('inny-swiat', 'motywy', 'motywy Inny świat Gustaw Herling-Grudziński jercew kostylew natalia lwown dom swidan',
      'Rozdział Ręka w ogniu pokazuje sprzeciw Kostylewa podjęty kosztem zdrowia. Epilog stawia pytanie o miarę odpowiedzialności za zachowania w warunkach przymusu.'),
    ('inny-swiat', 'konteksty', 'konteksty Inny świat Gustaw Herling-Grudziński jercew kostylew natalia lwown dom swidan',
      'Rozdziały ukazują elementy systemu łagrowego przez indywidualne historie. Odesłanie do Dostojewskiego pozwala zestawić dawne więzienie z dwudziestowiecznym obozem pracy.'),
    ('zdazyc-przed-panem-bogiem', 'streszczenie', 'streszczenie Zdążyć przed Panem Bogiem Hanna Krall edelman mordechaj anielewicz umar gett profesor mol',
      'Hanna Krall rozmawia z Markiem Edelmanem o powstaniu w getcie warszawskim i jego pracy lekarza po wojnie. Relacja wydobywa doświadczenia pojedynczych ludzi i trudne decyzje o ratowaniu życia. Wątki wojenny i medyczny wzajemnie się objaśniają.'),
    ('zdazyc-przed-panem-bogiem', 'wydarzenia', 'plan wydarzeń przebieg kolejność Zdążyć przed Panem Bogiem Hanna Krall edelman mordechaj anielewicz umar gett profesor mol',
      '1. [Wspomnienia z getta] Edelman opowiada o deportacjach i działaniach Żydowskiej Organizacji Bojowej.
2. [Powstanie] Żydowscy bojownicy podejmują zbrojny opór w getcie.
3. [Powojenna praktyka] Edelman pracuje z chorymi na serce.
4. [Rozmowa reporterska] Wojenne wspomnienia są zestawiane z decyzjami medycznymi.'),
    ('zdazyc-przed-panem-bogiem', 'geneza', 'geneza Zdążyć przed Panem Bogiem Hanna Krall literatura powojenna edelman mordechaj anielewicz umar gett profesor mol',
      'Reportaż opiera się na rozmowach z Edelmanem. Krall organizuje wspomnienia tematycznie, przechodząc między doświadczeniem Zagłady a pracą szpitalną rozmówcy.'),
    ('zdazyc-przed-panem-bogiem', 'bohaterowie', 'bohaterowie Zdążyć przed Panem Bogiem Hanna Krall edelman mordechaj anielewicz umar gett profesor mol',
      'Marek Edelman był jednym z dowódców powstania w getcie i po wojnie został lekarzem. Reporterka zadaje pytania i porządkuje rozmowę, zachowując wyrazisty głos świadka.'),
    ('zdazyc-przed-panem-bogiem', 'motywy', 'motywy Zdążyć przed Panem Bogiem Hanna Krall edelman mordechaj anielewicz umar gett profesor mol',
      'Wspomnienia o powstaniu wydobywają znaczenie wyboru w sytuacji skrajnego przymusu. Opisy leczenia serca pokazują, jak walkę o życie można rozumieć także poza wojną.'),
    ('zdazyc-przed-panem-bogiem', 'konteksty', 'konteksty Zdążyć przed Panem Bogiem Hanna Krall edelman mordechaj anielewicz umar gett profesor mol',
      'Reportaż pozwala porównać jednostkową pamięć z publiczną opowieścią o bohaterstwie. Zmiana perspektywy między gettem i szpitalem wiąże oba wątki, nie zrównując okoliczności.'),
    ('dzuma', 'streszczenie', 'streszczenie Dżuma Albert Camus rieux tarrou rambert paneloux cottard',
      'W Oranie wybucha epidemia, a miasto zostaje odcięte. Doktor Rieux i inni mieszkańcy podejmują walkę z chorobą. Po ustąpieniu epidemii kronikarz przypomina, że podobne zagrożenie może powrócić.'),
    ('dzuma', 'wydarzenia', 'plan wydarzeń przebieg kolejność Dżuma Albert Camus rieux tarrou rambert paneloux cottard',
      '1. [Część I] W mieście pojawiają się martwe szczury.
2. [Część I] Władze zamykają miasto.
3. [Część II] Tarrou organizuje ochotniczą pomoc sanitarną.
4. [Wątek Ramberta] Dziennikarz rezygnuje z próby ucieczki.
5. [Część IV] Umiera syn sędziego Othona.
6. [Część V] Tarrou choruje i umiera.
7. [Zakończenie] Rieux ujawnia swą rolę kronikarza.'),
    ('dzuma', 'geneza', 'geneza Dżuma Albert Camus literatura powojenna rieux tarrou rambert paneloux cottard',
      'Camus ujmuje los odciętego miasta w formę fikcyjnej kroniki. Powojenny kontekst pozwala czytać epidemię także jako metaforę zagrożenia zbiorowego.'),
    ('dzuma', 'bohaterowie', 'bohaterowie Dżuma Albert Camus rieux tarrou rambert paneloux cottard',
      'Bernard Rieux leczy chorych. Tarrou współorganizuje pomoc. Rambert początkowo chce wydostać się z miasta. Paneloux podejmuje pytanie o religijny sens epidemii, a Cottard korzysta z zaburzenia zwykłego porządku.'),
    ('dzuma', 'motywy', 'motywy Dżuma Albert Camus rieux tarrou rambert paneloux cottard',
      'Decyzja Ramberta o pozostaniu pokazuje przejście od prywatnego interesu do solidarności. W części IV śmierć dziecka stawia pytanie o sens niezawinionego cierpienia. Końcowe ostrzeżenie podkreśla trwałą możliwość powrotu zła.'),
    ('dzuma', 'konteksty', 'konteksty Dżuma Albert Camus rieux tarrou rambert paneloux cottard',
      'Powieść nadaje się do porównania z Księgą Hioba wokół cierpienia niewinnych. Odrębny odczyt widzi w zamkniętym mieście model społeczeństwa poddanego długotrwałej próbie.'),
    ('rok-1984', 'streszczenie', 'streszczenie Rok 1984 George Orwell winston smith wielk brat nowomow ministerstw prawd pokoj 101',
      'Winston Smith pracuje przy fałszowaniu przeszłości na użytek Partii. Próbuje zachować własne myśli i wchodzi w zakazany związek z Julią. Po aresztowaniu władza za pomocą przemocy podporządkowuje również jego uczucia.'),
    ('rok-1984', 'wydarzenia', 'plan wydarzeń przebieg kolejność Rok 1984 George Orwell winston smith wielk brat nowomow ministerstw prawd pokoj 101',
      '1. [Część I] Winston zaczyna prowadzić dziennik.
2. [Część II] Winston i Julia wynajmują pokój nad sklepem.
3. [Część II] O’Brien zyskuje zaufanie Winstona.
4. [Część II] Policja Myśli aresztuje Winstona i Julię.
5. [Część III] Winston zdradza Julię pod wpływem lęku w pokoju 101.
6. [Część III] Winston uznaje swoją miłość do Wielkiego Brata.'),
    ('rok-1984', 'geneza', 'geneza Rok 1984 George Orwell literatura powojenna winston smith wielk brat nowomow ministerstw prawd pokoj 101',
      'Orwell stworzył powojenną antyutopię badającą władzę przez język, propagandę i nadzór. Konstruuje fikcyjną Oceanię i pokazuje jej mechanizmy z perspektywy pracownika Partii.'),
    ('rok-1984', 'bohaterowie', 'bohaterowie Rok 1984 George Orwell winston smith wielk brat nowomow ministerstw prawd pokoj 101',
      'Winston przerabia archiwalne teksty. Julia tworzy z nim więź poza kontrolowanym życiem publicznym. O’Brien przyjmuje rolę powiernika, a później prowadzi przesłuchania. Wielki Brat jest figurą władzy Partii.'),
    ('rok-1984', 'motywy', 'motywy Rok 1984 George Orwell winston smith wielk brat nowomow ministerstw prawd pokoj 101',
      'Praca w Ministerstwie Prawdy pokazuje zależność między pamięcią a władzą. Nowomowa ogranicza możliwość wyrażania sprzeciwu. Pokój 101 służy złamaniu więzi przez wykorzystanie osobistego lęku.'),
    ('rok-1984', 'konteksty', 'konteksty Rok 1984 George Orwell winston smith wielk brat nowomow ministerstw prawd pokoj 101',
      'Ustrój Oceanii można analizować jako model totalitaryzmu. Dziennik Winstona daje przykład prywatnego zapisu przeciwstawionego oficjalnej wersji przeszłości.'),
    ('tango', 'streszczenie', 'streszczenie Tango Sławomir Mrożek artur edek stomil eleonor stomil eugeniusz edek',
      'Artur buntuje się przeciw swobodzie obyczajowej panującej w domu rodziców i próbuje przywrócić reguły. Kiedy nie potrafi znaleźć dla nich przekonującej podstawy, skłania się ku przymusowi. Edek przejmuje inicjatywę dzięki sile.'),
    ('tango', 'wydarzenia', 'plan wydarzeń przebieg kolejność Tango Sławomir Mrożek artur edek stomil eleonor stomil eugeniusz edek',
      '1. [Akt I] Artur sprzeciwia się obyczajom domowników.
2. [Akt II] Artur próbuje odbudować tradycję przez zapowiedź ślubu z Alą.
3. [Akt III] Artur ogłasza zamiar użycia władzy jako zasady porządku.
4. [Akt III] Ala wyznaje Arturowi zdradę z Edkiem.
5. [Akt III] Edek zabija Artura.
6. [Finał aktu III] Edek tańczy tango z Eugeniuszem.'),
    ('tango', 'geneza', 'geneza Tango Sławomir Mrożek literatura powojenna artur edek stomil eleonor stomil eugeniusz edek',
      'Dramat należy do powojennej twórczości Mrożka. Wykorzystuje groteskę i odwraca schemat konfliktu pokoleń, wyposażając młodego bohatera w pragnienie konwencji.'),
    ('tango', 'bohaterowie', 'bohaterowie Tango Sławomir Mrożek artur edek stomil eleonor stomil eugeniusz edek',
      'Artur jest synem Eleonory i Stomila. Ala jest kuzynką i narzeczoną Artura. Edek przebywa w domu i zdobywa przewagę, a Eugeniusz ostatecznie poddaje się jego władzy.'),
    ('tango', 'motywy', 'motywy Tango Sławomir Mrożek artur edek stomil eleonor stomil eugeniusz edek',
      'Ślub projektowany w akcie II pokazuje próbę odzyskania wspólnych form. Finałowy taniec układa relację Edka i Eugeniusza w obraz dominacji, co umożliwia porównanie z zakończeniem Wesela.'),
    ('tango', 'konteksty', 'konteksty Tango Sławomir Mrożek artur edek stomil eleonor stomil eugeniusz edek',
      'Groteska i teatr absurdu pomagają wyjaśnić, dlaczego spór rodzinny nabiera znaczeń politycznych. Postać Edka może stanowić punkt wyjścia do lektury opowiadania Marka Nowakowskiego.'),
    ('gora-edek', 'streszczenie', 'streszczenie Górą „Edek” Marek Nowakowski maly fiat parking',
      'Obserwator opisuje spór o miejsce parkingowe w zatłoczonym mieście. Kierowca dużego samochodu wypiera kierowcę małego fiata. Narrator rozpoznaje w silniejszym uczestniku odpowiednik Edka z Tanga.'),
    ('gora-edek', 'wydarzenia', 'plan wydarzeń przebieg kolejność Górą „Edek” Marek Nowakowski maly fiat parking',
      '1. [Początek] Narrator przywołuje postać Edka z dramatu Mrożka.
2. [Obserwacja ulicy] W rzędzie samochodów powstaje luka.
3. [Spór o miejsce] Kierowca małego fiata próbuje w nią wjechać.
4. [Zakończenie zajścia] Duży pojazd wymusza dla siebie miejsce.'),
    ('gora-edek', 'geneza', 'geneza Górą „Edek” Marek Nowakowski literatura po 1989 roku maly fiat parking',
      'Opowiadanie z tomu Prawo prerii wychodzi od obserwacji miejskiej codzienności i jawnie nawiązuje do postaci z Tanga. Materiał ZPE wiąże konflikt z obrazem przemian po 1989 roku.'),
    ('gora-edek', 'bohaterowie', 'bohaterowie Górą „Edek” Marek Nowakowski maly fiat parking',
      'Narrator jest świadkiem zajścia. Dwóch kierowców reprezentuje strony nierównej rywalizacji o miejsce. Edek pozostaje przywołaną figurą, z którą narrator zestawia zachowanie agresywnego uczestnika.'),
    ('gora-edek', 'motywy', 'motywy Górą „Edek” Marek Nowakowski maly fiat parking',
      'Spór o miejsce parkingowe daje konkretny przykład wymuszania przewagi. Rozmiar samochodu podkreśla nierówność, a nawiązanie do Edka przenosi uwagę z jednostkowej nieuprzejmości na mechanizm dominacji.'),
    ('gora-edek', 'konteksty', 'konteksty Górą „Edek” Marek Nowakowski maly fiat parking',
      'W finale Tanga Edek zdobywa władzę dzięki sile, a u Nowakowskiego podobny mechanizm działa w zwykłej sytuacji ulicznej. Zestawienie pokazuje, jak aluzja literacka zmienia sens zaobserwowanej sceny.'),
    ('miejsce', 'streszczenie', 'streszczenie Miejsce Andrzej Stasiuk cerkiew stasiuk cerkwi galicyjsk opowiesci galicyjsk',
      'Narrator wraca myślą do cerkwi przeniesionej z dawnej wsi. Opis pustego miejsca przechodzi w rekonstrukcję historii budynku i ludzi, którzy go używali. Powraca pytanie, czy zachowany budynek przenosi również pamięć związaną z jego otoczeniem.'),
    ('miejsce', 'wydarzenia', 'plan wydarzeń przebieg kolejność Miejsce Andrzej Stasiuk cerkiew stasiuk cerkwi galicyjsk opowiesci galicyjsk',
      '1. [Dawna wieś] Narrator odtwarza w wyobraźni powstanie cerkwi.
2. [Życie wspólnoty] Przywołuje ludzi związanych ze świątynią.
3. [Przeniesienie] Budynek zostaje zabrany z pierwotnego położenia.
4. [Rama opowieści] Rozmówca pyta narratora o dawne wejście.'),
    ('miejsce', 'geneza', 'geneza Miejsce Andrzej Stasiuk literatura po 1989 roku cerkiew stasiuk cerkwi galicyjsk opowiesci galicyjsk',
      'Utwór należy do Opowieści galicyjskich i sięga do krajobrazu naznaczonego nieobecnością dawnych mieszkańców. Pierwszoosobowa narracja łączy szczegółową obserwację z wyobrażaniem przeszłości.'),
    ('miejsce', 'bohaterowie', 'bohaterowie Miejsce Andrzej Stasiuk cerkiew stasiuk cerkwi galicyjsk opowiesci galicyjsk',
      'Narrator jest obserwatorem i rekonstruuje dzieje miejsca. Wspomina budowniczych i wiernych. Rozmówca znajdujący się przy dawnym miejscu świątyni pyta o jej materialny układ.'),
    ('miejsce', 'motywy', 'motywy Miejsce Andrzej Stasiuk cerkiew stasiuk cerkwi galicyjsk opowiesci galicyjsk',
      'Pytanie o wejście skupia uwagę na pustej przestrzeni noszącej ślad nieobecnego budynku. Wyobrażana historia cerkwi pozwala rozważać, co pamięć ocala wraz z przedmiotem, a co wiąże się z jego otoczeniem.'),
    ('miejsce', 'konteksty', 'konteksty Miejsce Andrzej Stasiuk cerkiew stasiuk cerkwi galicyjsk opowiesci galicyjsk',
      'Opowiadanie można zestawić z tekstami o śladach kultury łemkowskiej i z pojęciem pamięci miejsca. Różnica między zabytkiem a przestrzenią użytkowaną przez wspólnotę ukierunkowuje interpretację.'),
    ('profesor-andrews', 'streszczenie', 'streszczenie Profesor Andrews w Warszawie Olga Tokarczuk',
      'Brytyjski profesor przyjeżdża do Warszawy tuż przed wprowadzeniem stanu wojennego. Zostaje sam w mieście, którego języka i reguł nie rozumie. Przypadkowe spotkania pokazują zarówno bariery, jak i możliwość kontaktu.'),
    ('profesor-andrews', 'wydarzenia', 'plan wydarzeń przebieg kolejność Profesor Andrews w Warszawie Olga Tokarczuk',
      '1. [Przyjazd] Profesor Andrews dociera do Warszawy.
2. [Po wprowadzeniu stanu wojennego] Traci kontakt z osobami, które miały się nim zająć.
3. [Wędrówka po mieście] Próbuje odczytać zachowanie mieszkańców.
4. [Pobyt w Warszawie] Doświadcza pomocy mimo bariery językowej.'),
    ('profesor-andrews', 'geneza', 'geneza Profesor Andrews w Warszawie Olga Tokarczuk literatura po 1989 roku',
      'Opowiadanie z tomu Gra na wielu bębenkach wykorzystuje stan wojenny jako sytuację, w której cudzoziemiec zostaje odsunięty od zwykłych objaśnień i musi odczytywać miasto samodzielnie.'),
    ('profesor-andrews', 'bohaterowie', 'bohaterowie Profesor Andrews w Warszawie Olga Tokarczuk',
      'Tytułowy profesor jest gościem z Wielkiej Brytanii. Ma rozpoznawalną rolę zawodową, lecz po przyjeździe nie dysponuje środowiskiem, które ułatwiłoby mu porozumienie z mieszkańcami.'),
    ('profesor-andrews', 'motywy', 'motywy Profesor Andrews w Warszawie Olga Tokarczuk',
      'Wędrówka profesora przedstawia znane mieszkańcom miasto z perspektywy obcego. Codzienne gesty pomocy pozwalają obserwować relację, która nie wymaga pełnego zrozumienia cudzej mowy.'),
    ('profesor-andrews', 'konteksty', 'konteksty Profesor Andrews w Warszawie Olga Tokarczuk',
      'Historyczny kontekst stanu wojennego tłumaczy izolację i zmianę rytmu życia miasta. Perspektywa ograniczona do obcego bohatera pozwala przeanalizować, jak wiedza odbiorcy różni się od wiedzy postaci.'),
    ('podroze-z-herodotem', 'streszczenie', 'streszczenie Podróże z Herodotem Ryszard Kapuściński kapuscins herodot dzieje herodot',
      'Reporter zestawia własne podróże z lekturą Dziejów Herodota. Wspomina pierwsze wyjazdy i próby rozumienia obcych miejsc. Starożytny autor staje się dla niego rozmówcą w namyśle nad obserwacją i opowiadaniem świata.'),
    ('podroze-z-herodotem', 'wydarzenia', 'plan wydarzeń przebieg kolejność Podróże z Herodotem Ryszard Kapuściński kapuscins herodot dzieje herodot',
      '1. [Początek] Młody reporter chce po raz pierwszy zobaczyć świat za granicą.
2. [Przed wyjazdem] Otrzymuje Dzieje Herodota.
3. [Pierwsza podróż] Zmierza do Indii i konfrontuje się z barierą językową.
4. [Kolejne podróże] Łączy doświadczenia reporterskie z powracającą lekturą.'),
    ('podroze-z-herodotem', 'geneza', 'geneza Podróże z Herodotem Ryszard Kapuściński literatura po 1989 roku kapuscins herodot dzieje herodot',
      'Kapuściński komponuje książkę z autobiograficznych wspomnień, doświadczenia reporterskiego i rozmowy z tekstem starożytnego historyka. Epizody są podporządkowane refleksji o poznawaniu świata.'),
    ('podroze-z-herodotem', 'bohaterowie', 'bohaterowie Podróże z Herodotem Ryszard Kapuściński kapuscins herodot dzieje herodot',
      'Kapuściński jest narratorem, który wspomina własne początki. Herodot pozostaje bohaterem dawnego tekstu i punktem odniesienia dla współczesnego podróżnika. Ludzie spotykani w podróży stają się źródłem opowieści.'),
    ('podroze-z-herodotem', 'motywy', 'motywy Podróże z Herodotem Ryszard Kapuściński kapuscins herodot dzieje herodot',
      'W pierwszych podróżach bariera językowa obnaża ograniczenia obserwatora. Współobecność Dziejów pokazuje, że podróżowanie i czytanie mogą prowadzić do wspólnego pytania o wiarygodność relacji.'),
    ('podroze-z-herodotem', 'konteksty', 'konteksty Podróże z Herodotem Ryszard Kapuściński kapuscins herodot dzieje herodot',
      'Książkę można czytać w kontekście historii reportażu i badań nad spotkaniem kultur. Własne doświadczenia narratora pozwalają porównać jego metody z praktyką gromadzenia relacji u Herodota.'),
    ('pan-tadeusz', 'streszczenie', 'streszczenie Pan Tadeusz Adam Mickiewicz soplic gerwaz sedzi soplic telimen wojsk koncert protaz hrabi horeszk',
      'Tadeusz przybywa do Soplicowa, gdzie toczy się spór o zamek Horeszków. Ksiądz Robak pracuje na rzecz przygotowania powstania, a jego dawna wina łączy historię obu rodzin. Finał przynosi zgodę i zaręczyny Tadeusza i Zosi.'),
    ('pan-tadeusz', 'wydarzenia', 'plan wydarzeń przebieg kolejność Pan Tadeusz Adam Mickiewicz soplic gerwaz sedzi soplic telimen wojsk koncert protaz hrabi horeszk',
      '1. [Księga I] Tadeusz wraca do Soplicowa.
2. [Księga II] Gerwazy opowiada Hrabiemu o dziejach zamku.
3. [Księga IV] Ksiądz Robak interweniuje podczas polowania na niedźwiedzia.
4. [Księga X] Ranny Robak wyjawia Gerwazemu, że jest Jackiem Soplicą.
5. [Księga XI] W Soplicowie goszczą polscy dowódcy związani z wyprawą Napoleona.
6. [Księga XII] Jankiel gra koncert, który przywołuje historię Polski.
7. [Księga XII] Zgromadzeni tańczą poloneza.'),
    ('pan-tadeusz', 'geneza', 'geneza Pan Tadeusz Adam Mickiewicz romantyzm soplic gerwaz sedzi soplic telimen wojsk koncert protaz hrabi horeszk',
      'Mickiewicz jako emigrant odtwarza litewską przestrzeń dzieciństwa i dawne życie szlacheckie w poemacie. Akcję umieszcza w okresie nadziei związanej z wyprawą Napoleona.'),
    ('pan-tadeusz', 'bohaterowie', 'bohaterowie Pan Tadeusz Adam Mickiewicz soplic gerwaz sedzi soplic telimen wojsk koncert protaz hrabi horeszk',
      'Tadeusz jest synem Jacka Soplicy. Jacek jako Robak pracuje dla sprawy narodowej. Gerwazy dochowuje wierności Horeszkom, a Zosia należy do ich rodziny. Telimena opiekuje się Zosią.'),
    ('pan-tadeusz', 'motywy', 'motywy Pan Tadeusz Adam Mickiewicz soplic gerwaz sedzi soplic telimen wojsk koncert protaz hrabi horeszk',
      'Spowiedź Jacka w księdze X łączy winę z możliwością odkupienia. Koncert Jankiela w księdze XII ukazuje pamięć historyczną przez muzykę, a polonez podkreśla obrzędowy wymiar wspólnoty.'),
    ('pan-tadeusz', 'konteksty', 'konteksty Pan Tadeusz Adam Mickiewicz soplic gerwaz sedzi soplic telimen wojsk koncert protaz hrabi horeszk',
      'Epopeja łączy wątki prywatne z historycznymi przemianami. Inwokację można odczytywać obok finałowych scen Soplicowa jako dwa ujęcia pamięci o utraconej ojczyźnie.'),
    ('balladyna', 'streszczenie', 'streszczenie Balladyna Juliusz Słowacki goplan skierk choclik grabiec grabca grabcowi kostryn',
      'Dwie siostry zbierają maliny, aby rozstrzygnąć, która poślubi Kirkora. Balladyna zabija Alinę i popełnia dalsze zbrodnie w drodze do władzy. Jako królowa sądzi sprawy związane z własnymi czynami, po czym ginie.'),
    ('balladyna', 'wydarzenia', 'plan wydarzeń przebieg kolejność Balladyna Juliusz Słowacki goplan skierk choclik grabiec grabca grabcowi kostryn',
      '1. [Akt I] Goplana poleca swoim pomocnikom wpłynąć na drogę Kirkora.
2. [Akt II] Balladyna zabija Alinę w lesie.
3. [Dalsze zabiegi o władzę] Balladyna wchodzi w przymierze z Kostrynem.
4. [Akt V] Zwycięska Balladyna pozbywa się Kostryna.
5. [Akt V] Królowa wydaje wyroki dotyczące własnych przestępstw.
6. [Akt V] Balladyna pada rażona piorunem.'),
    ('balladyna', 'geneza', 'geneza Balladyna Juliusz Słowacki romantyzm goplan skierk choclik grabiec grabca grabcowi kostryn',
      'Słowacki zestawił fabułę o zdobyciu władzy z baśniowymi postaciami i umowną przeszłością Polski. Rozbudowana sieć wątków pozwala połączyć rodzinny konflikt z refleksją o rządzeniu.'),
    ('balladyna', 'bohaterowie', 'bohaterowie Balladyna Juliusz Słowacki goplan skierk choclik grabiec grabca grabcowi kostryn',
      'Balladyna i Alina są córkami Wdowy. Kirkor szuka żony, Goplana działa z pomocą Skierki i Chochlika, a Kostryn staje się sprzymierzeńcem Balladyny.'),
    ('balladyna', 'motywy', 'motywy Balladyna Juliusz Słowacki goplan skierk choclik grabiec grabca grabcowi kostryn',
      'Zbieranie malin prowadzi do wyboru, który można odczytać jako początek narastania zbrodni. Wyroki w akcie V odwracają sytuację bohaterki: sama wypowiada zasadę, której podlega.'),
    ('balladyna', 'konteksty', 'konteksty Balladyna Juliusz Słowacki goplan skierk choclik grabiec grabca grabcowi kostryn',
      'Utwór zestawia dramat z motywami baśni i legend. Powiązanie pierwszej zbrodni z późniejszą tyranią umożliwia porównanie losów Balladyny i Makbeta.'),
    ('biblia', 'streszczenie', 'streszczenie Biblia Autorzy biblijni',
      'W Księdze Rodzaju opowieści o początkach łączą się z dziejami przodków Izraela. Hiob pyta o sens niezawinionego cierpienia, Kohelet o trwałość ludzkich działań. Psalmy zawierają modlitwy, a Apokalipsa opisuje wizje sądu i odnowy.'),
    ('biblia', 'wydarzenia', 'plan wydarzeń przebieg kolejność Biblia Autorzy biblijni',
      '1. [Rdz 1–3] Bóg stwarza świat; człowiek przekracza zakaz i traci raj.
2. [Hi 1–2] Hiob traci rodzinę i majątek, a potem doświadcza choroby.
3. [Koh 1–3] Mędrzec rozważa przemijanie i czas właściwy poszczególnym sprawom.
4. [Ps 22 i 23 (numeracja hebrajska)] Skarga człowieka opuszczonego i obraz Boga jako pasterza ukazują odmienne sytuacje modlitwy.
5. [Ap 20–22] Po sądzie wyłania się obraz odnowionego świata.'),
    ('biblia', 'geneza', 'geneza Biblia Autorzy biblijni starożytność',
      'Biblia obejmuje księgi powstające w różnych okolicznościach, zapisane w różnych gatunkach. Przekład Jakuba Wujka należy do tradycji, która wywarła wpływ na polszczyznę.'),
    ('biblia', 'bohaterowie', 'bohaterowie Biblia Autorzy biblijni',
      'Adam i Ewa zostają umieszczeni w Edenie. Hiob rozmawia o cierpieniu z przyjaciółmi. Kohelet przyjmuje rolę mędrca; psalmiści mówią głosem jednostki lub wspólnoty. Jan relacjonuje wizje Apokalipsy.'),
    ('biblia', 'motywy', 'motywy Biblia Autorzy biblijni',
      'Rdz 3 przedstawia utratę rajskiego bezpieczeństwa. Hi 1–2 ukazuje niezawinioną próbę, Koh 3 porządek czasu, a Ap 21 oczekiwanie odnowy po katastrofie.'),
    ('biblia', 'konteksty', 'konteksty Biblia Autorzy biblijni',
      'Czytając aluzję biblijną, warto wskazać konkretną księgę, scenę i jej funkcję w nowym utworze. Przykładowo wizję końca świata w Apokalipsie można zestawić z jej odmiennym obrazem w poezji XX w.'),
    ('ksiega-rodzaju', 'streszczenie', 'streszczenie Księga Rodzaju Autorzy biblijni adam i ew ogon eden kain i ab wieza babel ark noeg',
      'Pierwsze rozdziały przedstawiają stworzenie świata i ludzi, utratę Edenu, bratobójstwo i potop. Dalsze opowieści skupiają się na Abrahamie i kolejnych pokoleniach jego rodziny.'),
    ('ksiega-rodzaju', 'wydarzenia', 'plan wydarzeń przebieg kolejność Księga Rodzaju Autorzy biblijni adam i ew ogon eden kain i ab wieza babel ark noeg',
      '1. [Rdz 1] Opowieść ukazuje porządek stworzenia.
2. [Rdz 3] Adam i Ewa opuszczają Eden.
3. [Rdz 4] Kain zabija Abla.
4. [Rdz 6–9] Noe buduje arkę przed potopem.
5. [Rdz 11] Budowa wieży Babel kończy się rozproszeniem ludzi.
6. [Rdz 22] Abraham otrzymuje polecenie złożenia Izaaka w ofierze, ale zostaje powstrzymany.'),
    ('ksiega-rodzaju', 'geneza', 'geneza Księga Rodzaju Autorzy biblijni starożytność adam i ew ogon eden kain i ab wieza babel ark noeg',
      'Księga otwiera Pięcioksiąg. Łączy narracje o początkach ludzkości z opowieściami o dziejach przodków Izraela.'),
    ('ksiega-rodzaju', 'bohaterowie', 'bohaterowie Księga Rodzaju Autorzy biblijni adam i ew ogon eden kain i ab wieza babel ark noeg',
      'Adam i Ewa są mieszkańcami Edenu. Kain i Abel to ich synowie. Noe ocala podczas potopu. Abraham jest ojcem Izaaka, który należy do kolejnego pokolenia patriarchów.'),
    ('ksiega-rodzaju', 'motywy', 'motywy Księga Rodzaju Autorzy biblijni adam i ew ogon eden kain i ab wieza babel ark noeg',
      'Rdz 3 pozwala analizować przekroczenie zakazu i skutki zdobycia wiedzy. Rdz 4 ukazuje zazdrość i bratobójstwo. W Rdz 22 próba Abrahama rodzi pytanie o granice posłuszeństwa.'),
    ('ksiega-rodzaju', 'konteksty', 'konteksty Księga Rodzaju Autorzy biblijni adam i ew ogon eden kain i ab wieza babel ark noeg',
      'Opowieść o stworzeniu można porównać z początkiem mitologii greckiej. W obu przypadkach punkt wyjścia stanowi narodzenie porządku, ale relacje między człowiekiem i siłami boskimi mają inny charakter.'),
    ('ksiega-hioba', 'streszczenie', 'streszczenie Księga Hioba Autorzy biblijni cierpien hiob',
      'Sprawiedliwy Hiob traci majątek, dzieci i zdrowie. Przyjaciele próbują wyjaśnić jego cierpienie, lecz Hiob nie widzi w nim zasłużonej kary. Pod koniec Bóg odpowiada na jego pytania obrazem stworzenia przekraczającego ludzkie poznanie.'),
    ('ksiega-hioba', 'wydarzenia', 'plan wydarzeń przebieg kolejność Księga Hioba Autorzy biblijni cierpien hiob',
      '1. [Hi 1] Hiob otrzymuje wiadomości o utracie dobytku i dzieci.
2. [Hi 2] Zostaje dotknięty chorobą.
3. [Hi 2] Trzej przyjaciele przybywają i milczą przy nim.
4. [Hi 3–31] Hiob skarży się i spiera z rozmówcami.
5. [Hi 38–41] Bóg odpowiada, przywołując zjawiska świata.
6. [Hi 42] Los Hioba się odmienia.'),
    ('ksiega-hioba', 'geneza', 'geneza Księga Hioba Autorzy biblijni starożytność cierpien hiob',
      'Księga należy do biblijnej literatury mądrościowej. Rama narracyjna otacza rozbudowany dialog i mowy o pochodzeniu cierpienia.'),
    ('ksiega-hioba', 'bohaterowie', 'bohaterowie Księga Hioba Autorzy biblijni cierpien hiob',
      'Hiob jest człowiekiem sprawiedliwym poddanym próbie. Elifaz, Bildad i Sofar próbują wyjaśnić przyczynę jego losu. Elihu przemawia przed odpowiedzią Boga.'),
    ('ksiega-hioba', 'motywy', 'motywy Księga Hioba Autorzy biblijni cierpien hiob',
      'Początkowe rozdziały oddzielają cierpienie od indywidualnej winy. Spór Hioba z przyjaciółmi ukazuje ograniczenia wyjaśnienia każdej krzywdy jako kary.'),
    ('ksiega-hioba', 'konteksty', 'konteksty Księga Hioba Autorzy biblijni cierpien hiob',
      'Los Hioba można zestawić ze śmiercią dziecka w części IV Dżumy. W obu tekstach cudze cierpienie stawia pod znakiem zapytania łatwe wyjaśnienia.'),
    ('ksiega-koheleta', 'streszczenie', 'streszczenie Księga Koheleta Autorzy biblijni marno nad marno',
      'Kohelet bada, co człowiekowi zostaje z pracy i dążeń. Przygląda się powtarzalności świata i przemijaniu różnych dóbr. Docenia proste radości, mając świadomość, że nie zapewniają trwałej kontroli nad życiem.'),
    ('ksiega-koheleta', 'wydarzenia', 'plan wydarzeń przebieg kolejność Księga Koheleta Autorzy biblijni marno nad marno',
      '1. [Koh 1] Mędrzec opisuje krążenie zjawisk i podejmuje badanie ludzkiego życia.
2. [Koh 2] Rozważa własne osiągnięcia, przyjemności i ich przemijanie.
3. [Koh 3] Wylicza czasy właściwe różnym czynnościom.
4. [Koh 12] Obrazy starości i śmierci domykają rozważania.'),
    ('ksiega-koheleta', 'geneza', 'geneza Księga Koheleta Autorzy biblijni starożytność marno nad marno',
      'Księga należy do biblijnej literatury mądrościowej. Przemawiający występuje jako mędrzec i przyjmuje perspektywę człowieka obserwującego świat z ziemskiego punktu widzenia.'),
    ('ksiega-koheleta', 'bohaterowie', 'bohaterowie Księga Koheleta Autorzy biblijni marno nad marno',
      'Kohelet jest przede wszystkim głosem rozważającym doświadczenia, a nie bohaterem ciągłej fabuły. Głos końcowy odnosi się do przekazanych przez niego pouczeń.'),
    ('ksiega-koheleta', 'motywy', 'motywy Księga Koheleta Autorzy biblijni marno nad marno',
      'Motyw marności w Koh 1–2 pozwala rozpatrywać ulotność zysku i sławy. W Koh 3 przeciwwagą dla pragnienia kontroli jest rozpoznanie, że poszczególne sprawy mają swój czas.'),
    ('ksiega-koheleta', 'konteksty', 'konteksty Księga Koheleta Autorzy biblijni marno nad marno',
      'Kohelet stanowi punkt odniesienia dla europejskiej tradycji vanitas. Barokowe obrazy przemijania można zestawiać z obserwacją kruchości codziennych osiągnięć.'),
    ('ksiega-psalmow', 'streszczenie', 'streszczenie Księga Psalmów Autorzy biblijni pan jest moim pasterzem pan moim pasterzem',
      'Psalmy obejmują modlitwy pochwalne, błagalne i dziękczynne. Głos modlących się wyraża zaufanie, skargę, żal albo radość. Poszczególne utwory mają własną sytuację i układ.'),
    ('ksiega-psalmow', 'wydarzenia', 'plan wydarzeń przebieg kolejność Księga Psalmów Autorzy biblijni pan jest moim pasterzem pan moim pasterzem',
      '1. [Ps 22] Skarga opuszczonego przechodzi w zapowiedź dziękczynienia.
2. [Ps 23] Pasterz prowadzi mówiącego przez miejsca zagrożenia.
3. [Ps 130] Osoba mówiąca zwraca się do Boga z głębokości i oczekuje przebaczenia.'),
    ('ksiega-psalmow', 'geneza', 'geneza Księga Psalmów Autorzy biblijni starożytność pan jest moim pasterzem pan moim pasterzem',
      'Psałterz jest wielogatunkowym zbiorem poezji religijnej. Tradycja wiąże wiele psalmów z Dawidem, lecz zbiór obejmuje różne głosy i okoliczności.'),
    ('ksiega-psalmow', 'bohaterowie', 'bohaterowie Księga Psalmów Autorzy biblijni pan jest moim pasterzem pan moim pasterzem',
      'Adresatem modlitwy jest Bóg. W zależności od psalmu mówi osoba zagrożona, dziękująca jednostka albo wspólnota. Pasterz w Ps 23 to obraz opieki Boga.'),
    ('ksiega-psalmow', 'motywy', 'motywy Księga Psalmów Autorzy biblijni pan jest moim pasterzem pan moim pasterzem',
      'Ps 22 pokazuje napięcie między poczuciem opuszczenia a ufnością. Ps 23 ujmuje bezpieczeństwo jako obecność przewodnika w zagrożeniu. Ps 130 łączy żal z oczekiwaniem.'),
    ('ksiega-psalmow', 'konteksty', 'konteksty Księga Psalmów Autorzy biblijni pan jest moim pasterzem pan moim pasterzem',
      'Psalmy można zestawiać z polskimi parafrazami, zwłaszcza Psałterzem Dawidowym Kochanowskiego. W cytowaniu warto zaznaczyć tradycję numeracji, bo numery bywają przesunięte.'),
    ('apokalipsa-sw-jana', 'streszczenie', 'streszczenie Apokalipsa św. Jana Jan z Patmos jezdzc apokalips now jeruzal baranek pieczec',
      'Jan relacjonuje wizje odsłaniające sąd, walkę ze złem i przyszłą odnowę. Obrazy katastrof poprzedzają wizję nowego nieba, nowej ziemi i Nowego Jeruzalem.'),
    ('apokalipsa-sw-jana', 'wydarzenia', 'plan wydarzeń przebieg kolejność Apokalipsa św. Jana Jan z Patmos jezdzc apokalips now jeruzal baranek pieczec',
      '1. [Ap 1] Jan otrzymuje polecenie zapisania wizji.
2. [Ap 5–6] Baranek otwiera pieczęcie, po czym ukazują się kolejni jeźdźcy.
3. [Ap 20] Umarli stają przed sądem.
4. [Ap 21–22] Jan ogląda odnowiony świat i święte miasto.'),
    ('apokalipsa-sw-jana', 'geneza', 'geneza Apokalipsa św. Jana Jan z Patmos starożytność jezdzc apokalips now jeruzal baranek pieczec',
      'Księga zamyka Nowy Testament. Jej język korzysta z konwencji objawienia przekazywanego przez wizje, symbole i obrazy.'),
    ('apokalipsa-sw-jana', 'bohaterowie', 'bohaterowie Apokalipsa św. Jana Jan z Patmos jezdzc apokalips now jeruzal baranek pieczec',
      'Jan jest świadkiem i narratorem wizji. Baranek otwiera pieczęcie. Aniołowie pośredniczą w przekazywaniu obrazów, a bestie i smok reprezentują siły wrogie Bogu.'),
    ('apokalipsa-sw-jana', 'motywy', 'motywy Apokalipsa św. Jana Jan z Patmos jezdzc apokalips now jeruzal baranek pieczec',
      'W Ap 6 jeźdźcy obrazują zagrożenia następujące po otwarciu pieczęci. W Ap 21 Nowe Jeruzalem wyraża nadzieję, że sąd i katastrofa nie stanowią ostatniego słowa.'),
    ('apokalipsa-sw-jana', 'konteksty', 'konteksty Apokalipsa św. Jana Jan z Patmos jezdzc apokalips now jeruzal baranek pieczec',
      'Wizja Sądu Ostatecznego stanowi kontekst dla malarstwa oraz poezji wykorzystującej obrazy końca świata. W porównaniu warto sprawdzić, czy późniejsze dzieło podtrzymuje również nadzieję odnowy.'),
    ('piesn-nad-piesniami', 'streszczenie', 'streszczenie Pieśń nad Pieśniami Autorzy biblijni oblubienic i oblubien',
      'Głosy zakochanych opisują pragnienie spotkania i zachwyt nad bliską osobą. Pieśni przedstawiają zarówno wzajemność, jak i rozłąkę. Obrazy natury budują zmysłowy język miłości.'),
    ('piesn-nad-piesniami', 'wydarzenia', 'plan wydarzeń przebieg kolejność Pieśń nad Pieśniami Autorzy biblijni oblubienic i oblubien',
      '1. [Pnp 2] Zakochani przywołują obrazy wiosny.
2. [Pnp 3] Oblubienica wyrusza na poszukiwanie ukochanego.
3. [Pnp 5] Opóźnione otwarcie drzwi prowadzi do rozłąki.
4. [Pnp 8] Końcowe obrazy określają siłę miłości wobec śmierci.'),
    ('piesn-nad-piesniami', 'geneza', 'geneza Pieśń nad Pieśniami Autorzy biblijni starożytność oblubienic i oblubien',
      'Księga ma formę poezji miłosnej. W tradycji biblijnej bywa odczytywana wprost jako cykl pieśni o miłości oraz alegorycznie jako obraz relacji z Bogiem.'),
    ('piesn-nad-piesniami', 'bohaterowie', 'bohaterowie Pieśń nad Pieśniami Autorzy biblijni oblubienic i oblubien',
      'Najważniejsze głosy należą do oblubieńca i oblubienicy. W niektórych partiach pojawiają się także inne osoby, m.in. córki Jerozolimy, do których zwraca się mówiąca.'),
    ('piesn-nad-piesniami', 'motywy', 'motywy Pieśń nad Pieśniami Autorzy biblijni oblubienic i oblubien',
      'Poszukiwanie ukochanego w Pnp 3 i 5 łączy miłość z niepewnością oraz pragnieniem obecności. W Pnp 8 obraz więzi zostaje zestawiony z nieuchronnością śmierci.'),
    ('piesn-nad-piesniami', 'konteksty', 'konteksty Pieśń nad Pieśniami Autorzy biblijni oblubienic i oblubien',
      'Księgę można porównać z opowieścią o Orfeuszu i Eurydyce, zwracając uwagę na różnicę między wyznaniem poetyckim a narracją o próbie pokonania śmierci.'),
    ('horacy-wybrane', 'streszczenie', 'streszczenie Wybrane utwory Horacego Horacy carpe diem horac leukono',
      'W Pieśni I, 11 mówca zaleca skupienie na teraźniejszości. W Pieśni III, 30 opisuje trwałość własnej poezji. Oba wiersze stawiają pytanie o upływ czasu z różnych perspektyw.'),
    ('horacy-wybrane', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wybrane utwory Horacego Horacy carpe diem horac leukono',
      '1. [Pieśń I, 11] Mówca przestrzega Leukonoę przed odgadywaniem przyszłości.
2. [Pieśń I, 11] Zwraca uwagę na obecny dzień.
3. [Pieśń III, 30] Porównuje dzieło poety do trwałego pomnika.
4. [Pieśń III, 30] Przewiduje zachowanie swojej sławy.'),
    ('horacy-wybrane', 'geneza', 'geneza Wybrane utwory Horacego Horacy starożytność carpe diem horac leukono',
      'Wybrane pieśni należą do rzymskiej liryki Horacego. Ich forma łączy wypowiedź skierowaną do adresata z refleksją nad postępowaniem człowieka lub miejscem poety.'),
    ('horacy-wybrane', 'bohaterowie', 'bohaterowie Wybrane utwory Horacego Horacy carpe diem horac leukono',
      'W Pieśni I, 11 występują mówiący i Leukonoe, do której skierowana jest rada. W Pieśni III, 30 mówiący przyjmuje rolę poety i zwraca się do Melpomeny.'),
    ('horacy-wybrane', 'motywy', 'motywy Wybrane utwory Horacego Horacy carpe diem horac leukono',
      'Pieśń I, 11 podejmuje niepewność przyszłości. W III, 30 pomnik wskazuje na trwanie poezji, a nie na materialną budowlę. Oba obrazy odnoszą się do granic ludzkiego życia.'),
    ('horacy-wybrane', 'konteksty', 'konteksty Wybrane utwory Horacego Horacy carpe diem horac leukono',
      'Pieśń III, 30 można zestawić z Kochanowskiego Pieśnią XXIV z Ksiąg wtórych lub Testamentem moim, pytając, jak każdy poeta wyobraża sobie trwanie po śmierci.'),
    ('bogurodzica', 'streszczenie', 'streszczenie Bogurodzica Autor nieznany deesis bogurodzic',
      'W pierwszych dwóch strofach wspólnota zwraca się do Maryi, a następnie do Chrystusa. Prosi o dobre życie doczesne i szczęście po śmierci. Po każdej strofie powraca wezwanie Kyrie eleison.'),
    ('bogurodzica', 'wydarzenia', 'plan wydarzeń przebieg kolejność Bogurodzica Autor nieznany deesis bogurodzic',
      '1. [Strofa I] Wspólnota wzywa Maryję jako pośredniczkę.
2. [Strofa II] Zwraca się do Chrystusa przez wzgląd na Jana Chrzciciela.
3. [Strofa II] Prosi o dobro na ziemi i zbawienie.'),
    ('bogurodzica', 'geneza', 'geneza Bogurodzica Autor nieznany średniowiecze deesis bogurodzic',
      'To anonimowa średniowieczna pieśń religijna. Jej rdzeń stanowią dwie początkowe strofy; przekaz rozbudowywano o dalsze strofy.'),
    ('bogurodzica', 'bohaterowie', 'bohaterowie Bogurodzica Autor nieznany deesis bogurodzic',
      'Głos należy do modlącej się zbiorowości. Chrystus jest adresatem próśb, Maryja i Jan Chrzciciel pełnią funkcję pośredników.'),
    ('bogurodzica', 'motywy', 'motywy Bogurodzica Autor nieznany deesis bogurodzic',
      'Dwie strofy ukazują wstawiennictwo i łączą doczesność z perspektywą życia po śmierci. Powracające wezwanie nadaje wypowiedzi charakter liturgiczny.'),
    ('bogurodzica', 'konteksty', 'konteksty Bogurodzica Autor nieznany deesis bogurodzic',
      'Układ postaci przywołuje ikonografię deesis. Porównanie z Lamentem świętokrzyskim pokazuje odmienność zbiorowej modlitwy do Maryi i osobistej skargi Maryi.'),
    ('piesni-kochanowskiego', 'streszczenie', 'streszczenie Pieśni, wybór Jan Kochanowski spustoszeni podol',
      'W Pieśni IX z Ksiąg pierwszych zabawa staje się okazją do namysłu nad niepewnością losu. W Pieśni V z Ksiąg wtórych opis najazdu na Podole prowadzi do wezwania do wspólnego działania.'),
    ('piesni-kochanowskiego', 'wydarzenia', 'plan wydarzeń przebieg kolejność Pieśni, wybór Jan Kochanowski spustoszeni podol',
      '1. [Pieśń IX, księga I] Mówca rozpoczyna od wezwania do zabawy.
2. [Pieśń IX, księga I] Przechodzi do uwagi o zmienności Fortuny.
3. [Pieśń V, księga II] Przedstawia skutki najazdu na Podole.
4. [Pieśń V, księga II] Wzywa adresatów do podjęcia wysiłku obronnego.'),
    ('piesni-kochanowskiego', 'geneza', 'geneza Pieśni, wybór Jan Kochanowski renesans spustoszeni podol',
      'Kochanowski wykorzystuje formę pieśni do refleksji filozoficznej i wypowiedzi obywatelskiej. Pieśń V wyrasta z doświadczenia najazdu tatarskiego na Podole.'),
    ('piesni-kochanowskiego', 'bohaterowie', 'bohaterowie Pieśni, wybór Jan Kochanowski spustoszeni podol',
      'W Pieśni IX głos należy do uczestnika spotkania, który przechodzi od tonu biesiadnego do refleksji. W Pieśni V mówca zwraca się do Polaków, ukazując ludzi dotkniętych najazdem.'),
    ('piesni-kochanowskiego', 'motywy', 'motywy Pieśni, wybór Jan Kochanowski spustoszeni podol',
      'W Pieśni IX zmienna Fortuna uzasadnia postulat zachowania równowagi. W Pieśni V obraz krzywdy i końcowa przestroga rozwijają motyw odpowiedzialności za wspólnotę.'),
    ('piesni-kochanowskiego', 'konteksty', 'konteksty Pieśni, wybór Jan Kochanowski spustoszeni podol',
      'Pieśń IX można porównać z Horacym wokół używania chwili i świadomego przyjęcia zmienności losu. Pieśń V łączy wartość słowa poetyckiego z funkcją obywatelskiego apelu.'),
    ('treny', 'streszczenie', 'streszczenie Treny Jan Kochanowski orszulk urszulk orszula tren kochanowsk',
      'Śmierć Urszulki prowadzi mówiącego od żalu przez zwątpienie w wartość dawnych przekonań do próby odzyskania równowagi. W trenach IX–XI kryzys dotyczy mądrości, losu po śmierci i cnoty. Cykl zamyka sen.'),
    ('treny', 'wydarzenia', 'plan wydarzeń przebieg kolejność Treny Jan Kochanowski orszulk urszulk orszula tren kochanowsk',
      '1. [Treny I–VIII] Ojciec przywołuje utratę dziecka i pustkę w domu.
2. [Tren IX] Kwestionuje zdolność mądrości do ochrony przed cierpieniem.
3. [Tren X] Pyta, gdzie może być Urszulka po śmierci.
4. [Tren XI] Podważa przekonanie, że cnota daje bezpieczeństwo.
5. [Treny XII–XVIII] Powraca do pamięci o córce i stopniowo kieruje ku modlitwie.
6. [Tren XIX] Matka poety ze zmarłą dziewczynką ukazuje się we śnie.'),
    ('treny', 'geneza', 'geneza Treny Jan Kochanowski renesans orszulk urszulk orszula tren kochanowsk',
      'Cykl powstał po śmierci córki Kochanowskiego i rozbudowuje antyczną tradycję żałobnego trenu. Bohaterką wspomnień jest dziecko, a układ dziewiętnastu utworów pokazuje też doświadczenie ojca.'),
    ('treny', 'bohaterowie', 'bohaterowie Treny Jan Kochanowski orszulk urszulk orszula tren kochanowsk',
      'Głos należy do ojca, który jest poetą i człowiekiem doświadczającym kryzysu. Urszulka powraca w pamięci i w śnie. Matka poety przynosi we śnie słowa pocieszenia.'),
    ('treny', 'motywy', 'motywy Treny Jan Kochanowski orszulk urszulk orszula tren kochanowsk',
      'Apostrofa do mądrości w trenie IX, pytania w trenie X i zwątpienie w trenie XI ukazują kolejne aspekty kryzysu. Tren XIX prowadzi do próby przyjęcia ludzkiego losu.'),
    ('treny', 'konteksty', 'konteksty Treny Jan Kochanowski orszulk urszulk orszula tren kochanowsk',
      'Odwołania do tradycji antycznej i chrześcijańskiej spotykają się w pytaniach trenu X. Cykl pozwala zestawić intelektualny stoicyzm z przeżyciem żałoby.'),
    ('poezja-baroku', 'streszczenie', 'streszczenie Poezja baroku, wybór Różni poeci baroku naborowsk zywot morsztyn trup',
      'Krótkość żywota przedstawia życie jako bardzo krótki moment między narodzinami a śmiercią. W Do trupa sytuacja kochającego zostaje porównana z losem zmarłego. Oba utwory stosują wyrazisty pomysł kompozycyjny.'),
    ('poezja-baroku', 'wydarzenia', 'plan wydarzeń przebieg kolejność Poezja baroku, wybór Różni poeci baroku naborowsk zywot morsztyn trup',
      '1. [Krótkość żywota] Mówca przechodzi od następstwa pokoleń do przykładów ulotności.
2. [Do trupa] Mówiący wylicza podobieństwa zmarłego i zakochanego.
3. [Do trupa] Zestawienie zmienia się w kontrast cierpienia i spoczynku.'),
    ('poezja-baroku', 'geneza', 'geneza Poezja baroku, wybór Różni poeci baroku barok naborowsk zywot morsztyn trup',
      'Są to przykłady poezji baroku, w której istotne bywają efektowna konstrukcja porównania, paradoks oraz zainteresowanie nietrwałością życia. Obaj poeci wykorzystują odmienne gatunki i cele wypowiedzi.'),
    ('poezja-baroku', 'bohaterowie', 'bohaterowie Poezja baroku, wybór Różni poeci baroku naborowsk zywot morsztyn trup',
      'W Krótkości żywota mówi obserwator ludzkiej kondycji. W Do trupa mówi zakochany, a jego adresat nie może odpowiedzieć; dzięki temu punkt ciężkości pozostaje na mówiącym.'),
    ('poezja-baroku', 'motywy', 'motywy Poezja baroku, wybór Różni poeci baroku naborowsk zywot morsztyn trup',
      'W Krótkości żywota nagromadzenie obrazów krótkiego trwania rozwija vanitas. W Do trupa obraz śmierci służy wyolbrzymieniu cierpienia miłosnego i buduje koncept.'),
    ('poezja-baroku', 'konteksty', 'konteksty Poezja baroku, wybór Różni poeci baroku naborowsk zywot morsztyn trup',
      'Naborowskiego można zestawić z Koheletem przy analizie przemijania. Morsztyna warto czytać obok innych sonetów, zwracając uwagę na przejście od porównania do puenty.'),
    ('hymn-do-milosci-ojczyzny', 'streszczenie', 'streszczenie Hymn do miłości ojczyzny Ignacy Krasicki',
      'Mówca zwraca się do miłości ojczyzny jako wartości przemieniającej sposób przeżywania cierpienia. Gotowość do poświęcenia dotyczy wolności i dobra wspólnego.'),
    ('hymn-do-milosci-ojczyzny', 'wydarzenia', 'plan wydarzeń przebieg kolejność Hymn do miłości ojczyzny Ignacy Krasicki',
      '1. [Początek] Mówca przywołuje miłość ojczyzny w bezpośrednim zwrocie.
2. [Środek] Wylicza koszty, których znaczenie zmienia oddanie.
3. [Finał] Oświadcza gotowość podjęcia nawet największej ofiary.'),
    ('hymn-do-milosci-ojczyzny', 'geneza', 'geneza Hymn do miłości ojczyzny Ignacy Krasicki oświecenie',
      'Utwór wykorzystuje uroczystą formę hymnu do wypowiedzi obywatelskiej. Wysoki styl nadaje dobru wspólnemu rangę wartości wymagającej stałego zobowiązania.'),
    ('hymn-do-milosci-ojczyzny', 'bohaterowie', 'bohaterowie Hymn do miłości ojczyzny Ignacy Krasicki',
      'Głos należy do osoby wyrażającej postawę obywatelską. Adresatem jest upersonifikowana miłość ojczyzny. Wiersz przywołuje ludzi ponoszących koszty służby.'),
    ('hymn-do-milosci-ojczyzny', 'motywy', 'motywy Hymn do miłości ojczyzny Ignacy Krasicki',
      'W wyliczeniu przykrych doświadczeń porównanie i paradoks pokazują, jak przekonanie o celu pozwala przyjąć ofiarę. Finał prowadzi od uczuć do możliwego działania.'),
    ('hymn-do-milosci-ojczyzny', 'konteksty', 'konteksty Hymn do miłości ojczyzny Ignacy Krasicki',
      'Hymn można zestawić z Odą do młodości, pytając, jak uroczysty ton służy mobilizacji odbiorców. U Krasickiego centrum stanowi służba ojczyźnie.'),
    ('oda-do-mlodosci', 'streszczenie', 'streszczenie Oda do młodości Adam Mickiewicz',
      'Mówiący przeciwstawia energię młodości światu ograniczonym przez egoizm i bezwład. Wzywa do wspólnego działania i wyobraża sobie odnowę rzeczywistości.'),
    ('oda-do-mlodosci', 'wydarzenia', 'plan wydarzeń przebieg kolejność Oda do młodości Adam Mickiewicz',
      '1. [Początek] Mówca przyzywa siłę młodości.
2. [Obraz starego świata] Pokazuje ludzi uwięzionych w ciasnej perspektywie własnego interesu.
3. [Wezwanie] Zwraca się do przyjaciół o solidarne działanie.
4. [Finał] Zapowiada pojawienie się nowego świata.'),
    ('oda-do-mlodosci', 'geneza', 'geneza Oda do młodości Adam Mickiewicz romantyzm',
      'Mickiewicz wykorzystuje tradycyjną formę ody do wyrażenia programu przemiany. Wiersz łączy wzniosły apel z wyobraźnią przekraczającą ograniczenia obserwowanego świata.'),
    ('oda-do-mlodosci', 'bohaterowie', 'bohaterowie Oda do młodości Adam Mickiewicz',
      'Mówiący przemawia zarówno do młodości, jak i do grupy przyjaciół. Przeciwstawia im ludzi skupionych na własnych korzyściach.'),
    ('oda-do-mlodosci', 'motywy', 'motywy Oda do młodości Adam Mickiewicz',
      'Powracające wezwania kierowane do wspólnoty podkreślają rolę współdziałania. Obrazy lotu i otwierania przestrzeni wskazują na przekraczanie ograniczeń.'),
    ('oda-do-mlodosci', 'konteksty', 'konteksty Oda do młodości Adam Mickiewicz',
      'Wiersz można zestawić z Romantycznością, by porównać dwa sposoby przekraczania ograniczeń poznania. Oda rozwija program zbiorowego wysiłku, ballada przedstawia konkretną scenę.'),
    ('sonety-krymskie', 'streszczenie', 'streszczenie Sonety krymskie i wybrane wiersze Mickiewicza Adam Mickiewicz pielgrzym mirz mirz pielgrzym',
      'Sonety przedstawiają podróż i doświadczenie obcego krajobrazu. W Stepach akermańskich cisza prowadzi do nasłuchiwania głosu z Litwy. Burza i Czatyrdah ukazują ludzi wobec sił natury.'),
    ('sonety-krymskie', 'wydarzenia', 'plan wydarzeń przebieg kolejność Sonety krymskie i wybrane wiersze Mickiewicza Adam Mickiewicz pielgrzym mirz mirz pielgrzym',
      '1. [Stepy akermańskie] Podróżny porównuje step do przestrzeni morskiej.
2. [Stepy akermańskie] Przystaje nasłuchując.
3. [Burza] Wśród zagrożenia na statku pasażerowie reagują na różne sposoby.
4. [Czatyrdah] Mirza zwraca się do góry.'),
    ('sonety-krymskie', 'geneza', 'geneza Sonety krymskie i wybrane wiersze Mickiewicza Adam Mickiewicz romantyzm pielgrzym mirz mirz pielgrzym',
      'Cykl powstał w związku z podróżą Mickiewicza na Krym. Forma sonetu pozwala łączyć scenę krajobrazową z refleksją i różnymi głosami mówiącymi.'),
    ('sonety-krymskie', 'bohaterowie', 'bohaterowie Sonety krymskie i wybrane wiersze Mickiewicza Adam Mickiewicz pielgrzym mirz mirz pielgrzym',
      'Podróżny obserwuje i porównuje otoczenie z własnym doświadczeniem. Mirza w Czatyrdahu przedstawia perspektywę człowieka zaznajomionego z krajobrazem. W Burzy pasażerowie uosabiają różne postawy wobec strachu.'),
    ('sonety-krymskie', 'motywy', 'motywy Sonety krymskie i wybrane wiersze Mickiewicza Adam Mickiewicz pielgrzym mirz mirz pielgrzym',
      'W zakończeniu Stepów akermańskich niesłyszalny głos z Litwy ujawnia tęsknotę. W Czatyrdahu kontrast góry i człowieka unaocznia ogrom natury.'),
    ('sonety-krymskie', 'konteksty', 'konteksty Sonety krymskie i wybrane wiersze Mickiewicza Adam Mickiewicz pielgrzym mirz mirz pielgrzym',
      'Z Inwokacją Pana Tadeusza można porównać sposób wyrażania pamięci o ojczyźnie. W sonetach ważna jest również rola orientalnych nazw i perspektywy przewodnika.'),
    ('testament-moj', 'streszczenie', 'streszczenie Testament mój i wybrane wiersze Słowackiego Juliusz Słowacki',
      'W Testamencie moim mówiący dokonuje bilansu życia i zwraca się do tych, którzy pozostaną. W Hymnie doświadczenie piękna przyrody towarzyszy poczuciu oddalenia od kraju i ludzi.'),
    ('testament-moj', 'wydarzenia', 'plan wydarzeń przebieg kolejność Testament mój i wybrane wiersze Słowackiego Juliusz Słowacki',
      '1. [Testament mój] Poeta wraca do doświadczeń życia.
2. [Testament mój] Formułuje życzenie dotyczące własnej spuścizny.
3. [Testament mój] Zwraca się do żyjących o dalszy wysiłek.
4. [Hymn] Podróżny obserwuje zachód słońca i wypowiada skargę.'),
    ('testament-moj', 'geneza', 'geneza Testament mój i wybrane wiersze Słowackiego Juliusz Słowacki romantyzm',
      'Oba wiersze korzystają z form o rozpoznawalnym adresacie: testamentowej dyspozycji i hymnicznego zwrotu do Boga. Otwierają różne perspektywy na doświadczenie poety emigracyjnego.'),
    ('testament-moj', 'bohaterowie', 'bohaterowie Testament mój i wybrane wiersze Słowackiego Juliusz Słowacki',
      'W Testamencie moim wypowiada się poeta zwracający się do bliskich i następców. W Hymnie samotny podróżny kieruje słowa do Boga.'),
    ('testament-moj', 'motywy', 'motywy Testament mój i wybrane wiersze Słowackiego Juliusz Słowacki',
      'Końcowe strofy Testamentu łączą pamięć o poecie z działaniem następnych pokoleń. W Hymnie powtarzana skarga pozwala odczytać krajobraz przez doświadczenie wygnania i samotności.'),
    ('testament-moj', 'konteksty', 'konteksty Testament mój i wybrane wiersze Słowackiego Juliusz Słowacki',
      'Testament można zestawić z Pieśnią III, 30 Horacego wokół przyszłości dzieła. Hymn pozwala porównać doświadczenie obcej przestrzeni z Sonetami krymskimi.'),
    ('satyry-krasickiego', 'streszczenie', 'streszczenie Satyra Krasickiego, wybór Ignacy Krasicki pan piotr zona',
      'W Żonie modnej małżeństwo dla majątku prowadzi bohatera do wydatków i utraty spokoju. W Pijaństwie rozmówca opowiada, jak łatwo okazje towarzyskie prowadzą do nadmiaru, po czym sam wraca do dawnego nawyku.'),
    ('satyry-krasickiego', 'wydarzenia', 'plan wydarzeń przebieg kolejność Satyra Krasickiego, wybór Ignacy Krasicki pan piotr zona',
      '1. [Żona modna] Piotr zabiega o małżeństwo, zwracając uwagę na korzyść majątkową.
2. [Żona modna] Nowa pani nadaje domowi i otoczeniu kosztowny kształt.
3. [Żona modna] Uroczystość kończy się pożarem stodoły.
4. [Pijaństwo] Rozmówca opowiada o skutkach picia.
5. [Pijaństwo] Pomimo rozmowy wraca do alkoholu.'),
    ('satyry-krasickiego', 'geneza', 'geneza Satyra Krasickiego, wybór Ignacy Krasicki oświecenie pan piotr zona',
      'Krasicki wykorzystuje satyrę do ukazywania obyczajów przez wyraziste przykłady, dialog i puentę. Opis występku łączy z obserwacją tego, jak człowiek usprawiedliwia własne zachowanie.'),
    ('satyry-krasickiego', 'bohaterowie', 'bohaterowie Satyra Krasickiego, wybór Ignacy Krasicki pan piotr zona',
      'Piotr opowiada o żonie i własnych decyzjach; oboje kierują się wyobrażeniami o korzyści lub prestiżu. W Pijaństwie rozmówcy przedstawiają doświadczenie picia i pochwałę trzeźwości.'),
    ('satyry-krasickiego', 'motywy', 'motywy Satyra Krasickiego, wybór Ignacy Krasicki pan piotr zona',
      'Przebudowa domu w Żonie modnej pozwala omówić modę jako kosztowną demonstrację statusu. Puenta Pijaństwa ukazuje różnicę między dostrzeżeniem wady a zmianą zachowania.'),
    ('satyry-krasickiego', 'konteksty', 'konteksty Satyra Krasickiego, wybór Ignacy Krasicki pan piotr zona',
      'Satyry można zestawić z bajkami Krasickiego. Oba gatunki służą ujawnianiu wad, lecz satyra rozwija sytuację obyczajową i głosy rozmówców.'),
    ('bajki-krasickiego', 'streszczenie', 'streszczenie Bajki Krasickiego Ignacy Krasicki czyzyk klatc',
      'Krótkie bajki ukazują mechanizmy zależności, przewagi i naiwności. Dwa czyżyki różnie rozumieją niewolę, wilki wykorzystują przewagę nad jagnięciem, a lis zdobywa ser pochlebstwem.'),
    ('bajki-krasickiego', 'wydarzenia', 'plan wydarzeń przebieg kolejność Bajki Krasickiego Ignacy Krasicki czyzyk klatc',
      '1. [Ptaszki w klatce] Młody czyżyk pyta starego o przyczynę płaczu.
2. [Ptaszki w klatce] Stary ptak wspomina wolność.
3. [Jagnię i wilcy] Wilki uzasadniają napaść własną przewagą.
4. [Kruk i lis] Kruk otwiera dziób pod wpływem pochwał.'),
    ('bajki-krasickiego', 'geneza', 'geneza Bajki Krasickiego Ignacy Krasicki oświecenie czyzyk klatc',
      'Krasicki rozwija tradycję krótkiej bajki z morałem, wykorzystując umowne figury zwierząt. Przedstawione sceny skupiają zachowanie i jego konsekwencję w zwięzłej formie.'),
    ('bajki-krasickiego', 'bohaterowie', 'bohaterowie Bajki Krasickiego Ignacy Krasicki czyzyk klatc',
      'Stary czyżyk zna życie na wolności, młody zna przede wszystkim klatkę. Wilki są silniejszymi napastnikami, a lis wykorzystuje próżność kruka.'),
    ('bajki-krasickiego', 'motywy', 'motywy Bajki Krasickiego Ignacy Krasicki czyzyk klatc',
      'Klatka służy przedstawieniu różnych wyobrażeń o wolności. W Kruku i lisie pochlebstwo pozwala oszukać adresata, który pragnie potwierdzenia własnej wartości.'),
    ('bajki-krasickiego', 'konteksty', 'konteksty Bajki Krasickiego Ignacy Krasicki czyzyk klatc',
      'Bajki można czytać jako obraz wzajemnych interesów w oświeceniowej literaturze moralnej. Porównanie przykładów warto oprzeć na tym, czy bohater rozumie swój los i ma na niego wpływ.'),
    ('ballady-mickiewicza', 'streszczenie', 'streszczenie Ballady i romanse, wybór Adam Mickiewicz karusi jasienk karusi',
      'W Romantyczności mieszkańcy patrzą na Karusię rozmawiającą ze zmarłym ukochanym. W Świteziance próba wierności prowadzi do kary. W Lilijach zbrodnia ukrywana przez żonę zostaje ujawniona i ukarana.'),
    ('ballady-mickiewicza', 'wydarzenia', 'plan wydarzeń przebieg kolejność Ballady i romanse, wybór Adam Mickiewicz karusi jasienk karusi',
      '1. [Romantyczność] Karusia mówi do zmarłego Jasieńka.
2. [Romantyczność] Starzec kwestionuje widzenie, a narrator staje po stronie dziewczyny.
3. [Świtezianka] Strzelec łamie obietnicę daną dziewczynie.
4. [Lilije] Żona zabija męża i ukrywa ciało.
5. [Lilije] Przy wyborze nowego męża powraca zabity.'),
    ('ballady-mickiewicza', 'geneza', 'geneza Ballady i romanse, wybór Adam Mickiewicz romantyzm karusi jasienk karusi',
      'Zbiór wykorzystuje ludowe opowieści, pieśni i wierzenia. Romantyczność wprowadza spór o granice rozumowego poznania do sceny oglądanej przez gromadę.'),
    ('ballady-mickiewicza', 'bohaterowie', 'bohaterowie Ballady i romanse, wybór Adam Mickiewicz karusi jasienk karusi',
      'Karusia doświadcza spotkania z ukochanym, którego nie widzi starzec. Narrator odpowiada na jego sprzeciw. W Świteziance strzelec jest poddany próbie, a w Lilijach główną postacią jest sprawczyni zbrodni.'),
    ('ballady-mickiewicza', 'motywy', 'motywy Ballady i romanse, wybór Adam Mickiewicz karusi jasienk karusi',
      'Spór ze starcem w Romantyczności pokazuje rozziew między osobistym przeżyciem i jego empirycznym sprawdzeniem. W Świteziance i Lilijach świat nadprzyrodzony wymierza karę za złamanie zobowiązania lub zbrodnię.'),
    ('ballady-mickiewicza', 'konteksty', 'konteksty Ballady i romanse, wybór Adam Mickiewicz karusi jasienk karusi',
      'Romantyczność można zestawić z obrzędem w II części Dziadów. W obu tekstach wspólnota traktuje kontakt ze zmarłymi poważnie, choć pełni on odmienną rolę.'),
    ('wiersze-baczynskiego', 'streszczenie', 'streszczenie Wiersze Baczyńskiego, wybór Krzysztof Kamil Baczyński',
      'Głos mówiący zwraca się do chłopca, którego młodość ukształtowała wojna. Czułe słowa towarzyszą obrazom przemocy i przedwczesnej śmierci.'),
    ('wiersze-baczynskiego', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Baczyńskiego, wybór Krzysztof Kamil Baczyński',
      '1. [Początek] Mówiący przypomina dziecięce marzenia zastąpione doświadczeniem wojny.
2. [Środek] Chłopiec zostaje zmuszony do dorastania wśród obrazów przemocy.
3. [Finał] Pytanie łączy śmierć z cierpieniem emocjonalnym.'),
    ('wiersze-baczynskiego', 'geneza', 'geneza Wiersze Baczyńskiego, wybór Krzysztof Kamil Baczyński literatura wojny i okupacji',
      'Utwór należy do poezji okupacyjnej Baczyńskiego. Łączy formę elegii z głosem bliskiej osoby mówiącej o losie dziecka.'),
    ('wiersze-baczynskiego', 'bohaterowie', 'bohaterowie Wiersze Baczyńskiego, wybór Krzysztof Kamil Baczyński',
      'Chłopiec jest adresatem wypowiedzi. Osoba mówiąca zwraca się do niego jak do syna i patrzy na jego biografię z perspektywy rodzinnego żalu.'),
    ('wiersze-baczynskiego', 'motywy', 'motywy Wiersze Baczyńskiego, wybór Krzysztof Kamil Baczyński',
      'Początkowe przeciwstawienie marzeń i doświadczeń rozwija motyw utraty dzieciństwa. Końcowe pytanie nie sprowadza śmierci do opisu zdarzenia.'),
    ('wiersze-baczynskiego', 'konteksty', 'konteksty Wiersze Baczyńskiego, wybór Krzysztof Kamil Baczyński',
      'Wiersz można porównać z Ocalonym Różewicza. Łączy je doświadczenie wojenne, ale różnią się pozycją mówiącego i formą obrazu.'),
    ('wiersze-bialoszewskiego', 'streszczenie', 'streszczenie Wiersze Białoszewskiego, wybór Miron Białoszewski binnarow',
      'Wiersz przywołuje wnętrze drewnianego kościoła w Binarowej. Dawne obrazy i słowa powracają w nowoczesnej wypowiedzi obserwatora.'),
    ('wiersze-bialoszewskiego', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Białoszewskiego, wybór Miron Białoszewski binnarow',
      '1. [Opis] Uwaga kieruje się ku wnętrzu świątyni.
2. [Obrazy] Elementy wystroju zyskują własną dynamikę.
3. [Nawiązania] Współczesny głos korzysta z rytmu i wyobrażeń dawnych pieśni.'),
    ('wiersze-bialoszewskiego', 'geneza', 'geneza Wiersze Białoszewskiego, wybór Miron Białoszewski literatura powojenna binnarow',
      'Białoszewski odwołuje się do kultury religijnej i materialnych śladów przeszłości w małopolskim kościele. Wykorzystuje doświadczenie oglądania wnętrza jako podstawę pracy językowej.'),
    ('wiersze-bialoszewskiego', 'bohaterowie', 'bohaterowie Wiersze Białoszewskiego, wybór Miron Białoszewski binnarow',
      'W wierszu mówi obserwator. Uwaga skupia się też na postaciach przedstawionych w sztuce kościelnej, które pojawiają się jako obrazy, a nie uczestnicy ciągłej fabuły.'),
    ('wiersze-bialoszewskiego', 'motywy', 'motywy Wiersze Białoszewskiego, wybór Miron Białoszewski binnarow',
      'Ożywianie wystroju pozwala pokazać działanie wyobraźni. Zestawienie dawnej mowy z nowoczesnym widzeniem kieruje uwagę na to, co język może odzyskać z przeszłości.'),
    ('wiersze-bialoszewskiego', 'konteksty', 'konteksty Wiersze Białoszewskiego, wybór Miron Białoszewski binnarow',
      'Z Bogurodzicą można porównać użycie religijnego rejestru. Wiersz Białoszewskiego przetwarza dawny język, patrząc na zabytkowe wnętrze z nowej perspektywy.'),
    ('wiersze-czechowicza', 'streszczenie', 'streszczenie Wiersze Czechowicza, wybór Józef Czechowicz',
      'W Żalu doświadczenie drogi przechodzi w wizję zagrożenia obejmującego wielu ludzi. Mówiący wyobraża sobie przyszłą katastrofę jako serię śmierci, które dotykają także jego.'),
    ('wiersze-czechowicza', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Czechowicza, wybór Józef Czechowicz',
      '1. [Początek] Obrazy przestrzeni towarzyszą wędrującemu.
2. [Wizja zbiorowa] Pojawiają się obrazy przemocy i zniszczenia.
3. [Rozpoznanie] Mówiący przeżywa wiele możliwych losów.'),
    ('wiersze-czechowicza', 'geneza', 'geneza Wiersze Czechowicza, wybór Józef Czechowicz dwudziestolecie międzywojenne',
      'Utwór należy do poezji przedwojennej. Rozwija katastroficzne obrazy za pomocą zmieniających się skojarzeń, rytmu i powracających form.'),
    ('wiersze-czechowicza', 'bohaterowie', 'bohaterowie Wiersze Czechowicza, wybór Józef Czechowicz',
      'Głos wędrowca zmienia perspektywę i utożsamia się z różnymi ludźmi. Poszczególne postacie pojawiają się w wizji, a nie w uporządkowanej fabule.'),
    ('wiersze-czechowicza', 'motywy', 'motywy Wiersze Czechowicza, wybór Józef Czechowicz',
      'Zwielokrotnienie własnej śmierci łączy lęk jednostkowy ze zbiorowym. Zmiana obrazów i dźwięków nadaje przeczuciu katastrofy konkretną postać.'),
    ('wiersze-czechowicza', 'konteksty', 'konteksty Wiersze Czechowicza, wybór Józef Czechowicz',
      'Żal można zestawić z Apokalipsą na poziomie obrazów katastrofy oraz z Baczyńskim, uwzględniając różnicę między przeczuciem a doświadczeniem okupacji.'),
    ('wiersze-herberta', 'streszczenie', 'streszczenie Wiersze Herberta, wybór Zbigniew Herbert',
      'W Przesłaniu Pana Cogito mówca wzywa do wierności wybranym wartościom mimo braku gwarancji sukcesu. Odwołuje się do odwagi, pamięci i sprzeciwu wobec upokorzenia.'),
    ('wiersze-herberta', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Herberta, wybór Zbigniew Herbert',
      '1. [Początek] Mówca kieruje do adresata wezwanie do działania.
2. [Środek] Rozwija nakazy dotyczące odwagi, pamięci i stosunku do przemocy.
3. [Finał] Kończy krótkim wezwaniem do wierności.'),
    ('wiersze-herberta', 'geneza', 'geneza Wiersze Herberta, wybór Zbigniew Herbert literatura powojenna',
      'Wiersz należy do tomu Pan Cogito. Forma wypowiedzi jako przesłania nadaje mu kształt etycznego zobowiązania przekazanego odbiorcy.'),
    ('wiersze-herberta', 'bohaterowie', 'bohaterowie Wiersze Herberta, wybór Zbigniew Herbert',
      'Mówiący formułuje nakazy, adresat jest człowiekiem, który ma trudny wybór przed sobą. Przywołane postacie dawnej kultury tworzą tradycję, do której można się odnieść.'),
    ('wiersze-herberta', 'motywy', 'motywy Wiersze Herberta, wybór Zbigniew Herbert',
      'Przykładem odwagi jest opór bez obietnicy nagrody. Końcowe wezwanie wiąże działanie z wiernością, a nie z odniesionym zwycięstwem.'),
    ('wiersze-herberta', 'konteksty', 'konteksty Wiersze Herberta, wybór Zbigniew Herbert',
      'Można zestawić wiersz z wyborem Antygony. W obu przypadkach warto odróżnić przyjętą zasadę postępowania od przewidywanych skutków.'),
    ('wiersze-lesmiana', 'streszczenie', 'streszczenie Wiersze Leśmiana, wybór Bolesław Leśmian bajdal',
      'Bajdała zasypia podczas wędrówki i doświadcza napaści niezwykłej istoty. Po przebudzeniu kieruje pretensje do towarzyszących mu zwierząt, a następnie pyta Boga o istnienie dręczącego stworzenia.'),
    ('wiersze-lesmiana', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Leśmiana, wybór Bolesław Leśmian bajdal',
      '1. [Wędrówka] Zmęczony Bajdała zasypia.
2. [Sen] Dusiołek przygniata śpiącego.
3. [Przebudzenie] Bajdała zwraca się do zwierząt.
4. [Puenta] Zadaje Bogu pytanie o stworzenie Dusiołka.'),
    ('wiersze-lesmiana', 'geneza', 'geneza Wiersze Leśmiana, wybór Bolesław Leśmian modernizm i dwudziestolecie międzywojenne bajdal',
      'Leśmian wykorzystuje kształt ludowej opowieści, potoczystą narrację i językową pomysłowość. Niezwykłe doświadczenie przechodzi w krótkie pytanie filozoficzne.'),
    ('wiersze-lesmiana', 'bohaterowie', 'bohaterowie Wiersze Leśmiana, wybór Bolesław Leśmian bajdal',
      'Bajdała jest wędrowcem i wygłasza końcową skargę. Dusiołek zostaje ukazany jako konkretna, osobliwa istota. Zwierzęta nie przerywają jego działania.'),
    ('wiersze-lesmiana', 'motywy', 'motywy Wiersze Leśmiana, wybór Bolesław Leśmian bajdal',
      'W puencie komiczna przygoda przechodzi w pytanie o zło w stworzonym świecie. Budowa nazwy stworzenia łączy jego postać z działaniem.'),
    ('wiersze-lesmiana', 'konteksty', 'konteksty Wiersze Leśmiana, wybór Bolesław Leśmian bajdal',
      'Z Księgą Hioba można porównać zwrot do Boga w sprawie cierpienia. Gatunek i skala zdarzenia są odmienne, co pozwala zbadać rolę komizmu.'),
    ('wiersze-milosza', 'streszczenie', 'streszczenie Wiersze Miłosza, wybór Czesław Miłosz staruszek pomidor',
      'Piosenka o końcu świata ukazuje zwykły dzień, podczas którego zwierzęta i ludzie zajmują się codziennymi sprawami. Mówiący podważa oczekiwanie, że kres musi dać się rozpoznać po widowiskowych znakach.'),
    ('wiersze-milosza', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Miłosza, wybór Czesław Miłosz staruszek pomidor',
      '1. [Początek] Pojawiają się obrazy spokojnej przyrody.
2. [Dalsze sceny] Ludzie wykonują codzienne czynności.
3. [Finał] Staruszek podwiązujący pomidory powtarza zdanie o braku innego końca.'),
    ('wiersze-milosza', 'geneza', 'geneza Wiersze Miłosza, wybór Czesław Miłosz literatura wojny i powojenna staruszek pomidor',
      'Wiersz należy do poezji Miłosza związanej z doświadczeniem wojny. Tytuł i lekka forma piosenki współdziałają z tematem ostatecznym.'),
    ('wiersze-milosza', 'bohaterowie', 'bohaterowie Wiersze Miłosza, wybór Czesław Miłosz staruszek pomidor',
      'Zewnętrzny głos przedstawia równoległe sceny. Staruszek pozostaje częścią codzienności i otrzymuje ostatnie słowo o jej sensie.'),
    ('wiersze-milosza', 'motywy', 'motywy Wiersze Miłosza, wybór Czesław Miłosz staruszek pomidor',
      'Finał z pomidorami przeciwstawia zwykły gest oczekiwaniu katastroficznych znaków. Wiersz pozwala rozważać indywidualny wymiar końca.'),
    ('wiersze-milosza', 'konteksty', 'konteksty Wiersze Miłosza, wybór Czesław Miłosz staruszek pomidor',
      'Z Ap 6 i 21 można zestawić brak jawnego widowiska kosmicznego u Miłosza oraz zapowiedzi katastrofy i odnowy w księdze biblijnej.'),
    ('wiersze-norwida', 'streszczenie', 'streszczenie Wiersze Norwida, wybór Cyprian Kamil Norwid',
      'Obraz ruin i grobów przywołuje los bohaterów Szekspira. Cyprysy i ludzie odmiennie interpretują spadającą gwiazdę, co tworzy spór o sposób rozumienia świata.'),
    ('wiersze-norwida', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Norwida, wybór Cyprian Kamil Norwid',
      '1. [Pejzaż] Uwaga pada na ruiny i groby.
2. [Głos cyprysów] Zjawisko niebieskie staje się znakiem współczucia.
3. [Głos ludzi] Zjawisko otrzymuje wyjaśnienie materialne.'),
    ('wiersze-norwida', 'geneza', 'geneza Wiersze Norwida, wybór Cyprian Kamil Norwid romantyzm',
      'Norwid wykorzystuje kulturową pamięć o Romeo i Julii oraz konkretny krajobraz Werony. Zwięzła forma buduje sens przez zestawienie głosów.'),
    ('wiersze-norwida', 'bohaterowie', 'bohaterowie Wiersze Norwida, wybór Cyprian Kamil Norwid',
      'Obserwator przedstawia scenę, a cyprysy i ludzie są zbiorowymi głosami interpretującymi zjawisko. Kochankowie należą do wspominanej historii.'),
    ('wiersze-norwida', 'motywy', 'motywy Wiersze Norwida, wybór Cyprian Kamil Norwid',
      'Motyw gwiazdy pozwala pokazać różnicę między znakiem i przedmiotem. Obraz ruin wiąże refleksję z trwaniem pamięci po zmarłych.'),
    ('wiersze-norwida', 'konteksty', 'konteksty Wiersze Norwida, wybór Cyprian Kamil Norwid',
      'Z Romantycznością można porównać współobecność dwu sposobów poznania. U Norwida tworzą ją wypowiedzi wobec tego samego obrazu przyrody.'),
    ('wiersze-pawlikowskiej', 'streszczenie', 'streszczenie Wiersze Pawlikowskiej-Jasnorzewskiej, wybór Maria Pawlikowska-Jasnorzewska',
      'W Miłości osoba mówiąca przyznaje, że żyje podczas rozłąki. Porównanie do róży w oddaleniu od wody pozwala wyrazić koszt rozłączenia.'),
    ('wiersze-pawlikowskiej', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Pawlikowskiej-Jasnorzewskiej, wybór Maria Pawlikowska-Jasnorzewska',
      '1. [Początek] Mówiąca opisuje przedłużającą się nieobecność adresata.
2. [Puenta] Porównuje własne trwanie do życia kwiatu pozbawionego wody.'),
    ('wiersze-pawlikowskiej', 'geneza', 'geneza Wiersze Pawlikowskiej-Jasnorzewskiej, wybór Maria Pawlikowska-Jasnorzewska dwudziestolecie międzywojenne',
      'Miniatura liryczna skupia sytuację uczuciową w niewielu wersach. Znaczenie potocznego spostrzeżenia zmienia się pod wpływem końcowego obrazu.'),
    ('wiersze-pawlikowskiej', 'bohaterowie', 'bohaterowie Wiersze Pawlikowskiej-Jasnorzewskiej, wybór Maria Pawlikowska-Jasnorzewska',
      'Wypowiada się osoba doświadczająca rozłąki, zwracając się do nieobecnego adresata. Róża stanowi element porównania, a nie postać zdarzenia.'),
    ('wiersze-pawlikowskiej', 'motywy', 'motywy Wiersze Pawlikowskiej-Jasnorzewskiej, wybór Maria Pawlikowska-Jasnorzewska',
      'Końcowe porównanie ukazuje trwanie bez poczucia pełni życia. Rozłąka jest przedstawiona zwięźle, bez rozwijania historii kochanków.'),
    ('wiersze-pawlikowskiej', 'konteksty', 'konteksty Wiersze Pawlikowskiej-Jasnorzewskiej, wybór Maria Pawlikowska-Jasnorzewska',
      'Można porównać sposób przedstawiania miłości z Do trupa Morsztyna. Oba wiersze korzystają z obrazu granicy życia, ale używają odmiennej skali i tonu.'),
    ('wiersze-poswiatowskiej', 'streszczenie', 'streszczenie Wiersze Poświatowskiej, wybór Halina Poświatowska',
      'Osoba mówiąca przyjmuje imię Julii i zestawia doświadczenie miłości z jej utratą. Aluzja do znanej historii zostaje przepisana w pierwszej osobie i przeniesiona w współczesną wrażliwość.'),
    ('wiersze-poswiatowskiej', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Poświatowskiej, wybór Halina Poświatowska',
      '1. [Początek] Mówiąca określa siebie imieniem Julii.
2. [Rozwinięcie] Przywołuje osobiste doświadczenie miłości.
3. [Zamknięcie] Wraca do imienia wyznaczającego sens wypowiedzi.'),
    ('wiersze-poswiatowskiej', 'geneza', 'geneza Wiersze Poświatowskiej, wybór Halina Poświatowska literatura powojenna',
      'Utwór należy do liryki Poświatowskiej, w której cielesność, miłość i nietrwałość często tworzą wspólny obszar refleksji. Aluzja do Szekspira wprowadza tradycję przez samą autoprezentację.'),
    ('wiersze-poswiatowskiej', 'bohaterowie', 'bohaterowie Wiersze Poświatowskiej, wybór Halina Poświatowska',
      'Głos należy do współczesnej mówiącej rozpoznającej się w postaci Julii. Utwór nie odtwarza pełnej obsady dramatu Szekspira.'),
    ('wiersze-poswiatowskiej', 'motywy', 'motywy Wiersze Poświatowskiej, wybór Halina Poświatowska',
      'Powrót imienia buduje napięcie między własnym doświadczeniem i kulturowym wzorem. Miłość nie zostaje wyłącznie oznaką szczęścia.'),
    ('wiersze-poswiatowskiej', 'konteksty', 'konteksty Wiersze Poświatowskiej, wybór Halina Poświatowska',
      'Porównanie z Romeem i Julią pozwala omówić, jak współczesny monolog zmienia sens historii opowiadanej wcześniej w dramacie.'),
    ('wiersze-tetmajera', 'streszczenie', 'streszczenie Wiersze Przerwy-Tetmajera, wybór Kazimierz Przerwa-Tetmajer',
      'Mówiący zwraca się do Nirwany z prośbą o uwolnienie od bólu i pragnień. Kolejne obrazy ukazują świat jako miejsce doświadczeń, od których chce się odsunąć.'),
    ('wiersze-tetmajera', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Przerwy-Tetmajera, wybór Kazimierz Przerwa-Tetmajer',
      '1. [Początek] Mówiący nazywa doświadczane ciężary.
2. [Kolejne wezwania] Powtarza prośbę o uwolnienie od cierpienia.
3. [Zamknięcie] Pragnienie zapomnienia wyznacza sens wezwania.'),
    ('wiersze-tetmajera', 'geneza', 'geneza Wiersze Przerwy-Tetmajera, wybór Kazimierz Przerwa-Tetmajer Młoda Polska',
      'Przerwa-Tetmajer stosuje formę hymnu i powtórzenia zbliżone do litanii. Odwołuje się do pojęcia przetworzonego w myśli i literaturze epoki.'),
    ('wiersze-tetmajera', 'bohaterowie', 'bohaterowie Wiersze Przerwy-Tetmajera, wybór Kazimierz Przerwa-Tetmajer',
      'Głosem utworu jest człowiek doświadczający znużenia i rozczarowania. Nirwana jest upersonifikowaną adresatką prośby.'),
    ('wiersze-tetmajera', 'motywy', 'motywy Wiersze Przerwy-Tetmajera, wybór Kazimierz Przerwa-Tetmajer',
      'Powracające wezwanie pokazuje, że mówiący szuka ukojenia poza zaangażowaniem w codzienność. Obrazy życia budują podstawę jego postawy.'),
    ('wiersze-tetmajera', 'konteksty', 'konteksty Wiersze Przerwy-Tetmajera, wybór Kazimierz Przerwa-Tetmajer',
      'Wiersz można odczytać w kontekście młodopolskiego dekadentyzmu. Zestawienie z postawą czynu w Odzie do młodości pozwala uwypuklić różnicę wyborów.'),
    ('wiersze-rozewicza', 'streszczenie', 'streszczenie Wiersze Różewicza, wybór Tadeusz Różewicz',
      'Mówiący ocalał z wojennej przemocy, ale utracił zaufanie do podstawowych pojęć moralnych. Wylicza ich przeciwieństwa, a następnie szuka kogoś, kto pomoże mu odzyskać zdolność rozróżniania.'),
    ('wiersze-rozewicza', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Różewicza, wybór Tadeusz Różewicz',
      '1. [Początek] Mówiący przedstawia siebie jako ocalałego.
2. [Środek] Przypomina doświadczenia, które zatarły granice między pojęciami.
3. [Zakończenie] Szuka nauczyciela i mistrza.'),
    ('wiersze-rozewicza', 'geneza', 'geneza Wiersze Różewicza, wybór Tadeusz Różewicz literatura powojenna',
      'Wiersz odpowiada na zmiany świadomości spowodowane wojną. Ograniczone środki i powtarzane wyliczenia podkreślają trudność wyrażenia tego doświadczenia.'),
    ('wiersze-rozewicza', 'bohaterowie', 'bohaterowie Wiersze Różewicza, wybór Tadeusz Różewicz',
      'Osoba mówiąca jest świadkiem przemocy i ocenia skutki ocalenia. Poszukiwany nauczyciel występuje jako oczekiwany przewodnik.'),
    ('wiersze-rozewicza', 'motywy', 'motywy Wiersze Różewicza, wybór Tadeusz Różewicz',
      'Wyliczenie nazw ukazuje rozpad języka moralnego. Poszukiwanie nauczyciela otwiera możliwość odbudowy różnic między pojęciami.'),
    ('wiersze-rozewicza', 'konteksty', 'konteksty Wiersze Różewicza, wybór Tadeusz Różewicz',
      'W zakończeniu można dostrzec aluzję do rozdzielania i nazywania z Księgi Rodzaju. Zestawienie z Borowskim pozwala badać skutki wojny dla słów i ocen.'),
    ('wiersze-staffa', 'streszczenie', 'streszczenie Wiersze Staffa, wybór Leopold Staff deszcz staff',
      'Powtarzający się dźwięk deszczu otwiera ciąg obrazów smutku. Wspomnienia i wizje tworzą przestrzeń, w której nawet ogród zostaje dotknięty zniszczeniem.'),
    ('wiersze-staffa', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Staffa, wybór Leopold Staff deszcz staff',
      '1. [Refren] Rytm uderzeń deszczu powraca między strofami.
2. [Kolejne wizje] Pojawiają się obrazy pochodu, rozstania i śmierci.
3. [Ogród] Postać szatana pozostawia po sobie obraz spustoszenia.'),
    ('wiersze-staffa', 'geneza', 'geneza Wiersze Staffa, wybór Leopold Staff Młoda Polska i literatura XX wieku deszcz staff',
      'Wiersz należy do młodopolskiej liryki Staffa. Brzmienie wypowiedzi współtworzy nastrój, a refren łączy kolejne obrazy.'),
    ('wiersze-staffa', 'bohaterowie', 'bohaterowie Wiersze Staffa, wybór Leopold Staff deszcz staff',
      'Osoba mówiąca rejestruje odgłosy i własne skojarzenia. Pojawiające się postacie należą do świata wizji, w tym postać płacząca w zniszczonym ogrodzie.'),
    ('wiersze-staffa', 'motywy', 'motywy Wiersze Staffa, wybór Leopold Staff deszcz staff',
      'Deszcz tworzy związek między zewnętrznym rytmem a stanem wewnętrznym. Obraz ogrodu pozwala wskazać, w jaki sposób krajobraz odzwierciedla doświadczenie smutku.'),
    ('wiersze-staffa', 'konteksty', 'konteksty Wiersze Staffa, wybór Leopold Staff deszcz staff',
      'Z Hymnem do Nirwany można porównać sposoby wyrażania nastroju epoki. Staff wykorzystuje muzyczność i obrazy, a Tetmajer kieruje wypowiedź ku adresatce.'),
    ('wiersze-szymborskiej', 'streszczenie', 'streszczenie Wiersze Szymborskiej, wybór Wisława Szymborska',
      'Mówiący zauważa, że nie da się przeżyć doświadczenia drugi raz w tej samej postaci. Rozważanie przechodzi od ogólnej reguły życia do tego, jak zmieniają się uczucia między ludźmi.'),
    ('wiersze-szymborskiej', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Szymborskiej, wybór Wisława Szymborska',
      '1. [Początek] Mówiący przedstawia niepowtarzalność zdarzeń jako zasadę.
2. [Środek] Obraz róży pokazuje zmianę przeżywania relacji.
3. [Finał] Różnica między dwojgiem ludzi zostaje przyjęta jako część ich więzi.'),
    ('wiersze-szymborskiej', 'geneza', 'geneza Wiersze Szymborskiej, wybór Wisława Szymborska literatura powojenna',
      'Wiersz łączy lekki rytm i obrazowość z refleksją nad czasem. Jego regularna, łatwa do zapamiętania forma umożliwiła także adaptacje muzyczne.'),
    ('wiersze-szymborskiej', 'bohaterowie', 'bohaterowie Wiersze Szymborskiej, wybór Wisława Szymborska',
      'Mówiący wypowiada się najpierw szeroko o wspólnym doświadczeniu ludzi, a następnie zwraca się ku konkretnej relacji. Adresat współtworzy sytuację końcową.'),
    ('wiersze-szymborskiej', 'motywy', 'motywy Wiersze Szymborskiej, wybór Wisława Szymborska',
      'Motyw niepowtarzalności pozwala widzieć zmianę jako zwykłą część życia. Przemiana znaczenia róży pokazuje zależność między obrazem a sytuacją emocjonalną.'),
    ('wiersze-szymborskiej', 'konteksty', 'konteksty Wiersze Szymborskiej, wybór Wisława Szymborska',
      'Z Księgą Koheleta można zestawić namysł nad czasem. Kohelet dostrzega powtarzalność zjawisk, Szymborska wydobywa odmienność konkretnych chwil.'),
    ('wiersze-tuwima', 'streszczenie', 'streszczenie Wiersze Tuwima, wybór Julian Tuwim',
      'Mówiący ostrzega odbiorcę przed użyciem patriotycznych haseł do uzasadnienia wojny. Zestawia publiczne wezwania z ekonomicznym interesem osób korzystających na konflikcie.'),
    ('wiersze-tuwima', 'wydarzenia', 'plan wydarzeń przebieg kolejność Wiersze Tuwima, wybór Julian Tuwim',
      '1. [Początek] Mówca przywołuje znaki i hasła zapowiadające mobilizację.
2. [Rozpoznanie] Zachęca do zbadania interesów ukrytych za przekazem.
3. [Finał] Wzywa adresata do sprzeciwu wobec manipulacji.'),
    ('wiersze-tuwima', 'geneza', 'geneza Wiersze Tuwima, wybór Julian Tuwim dwudziestolecie międzywojenne',
      'Utwór jest przykładem zaangażowanej liryki Tuwima z okresu międzywojennego. Bezpośredni zwrot do odbiorcy nadaje wypowiedzi publicystyczną siłę.'),
    ('wiersze-tuwima', 'bohaterowie', 'bohaterowie Wiersze Tuwima, wybór Julian Tuwim',
      'Głos należy do mówcy ostrzegającego adresata, od którego oczekuje niezależnego osądu. Podmioty korzystające na wojnie charakteryzuje ich interes, a nie indywidualne losy.'),
    ('wiersze-tuwima', 'motywy', 'motywy Wiersze Tuwima, wybór Julian Tuwim',
      'Wyliczenie form przekazu pokazuje, jak propaganda otacza człowieka. Finał kieruje uwagę na możliwość odmowy uczestnictwa.'),
    ('wiersze-tuwima', 'konteksty', 'konteksty Wiersze Tuwima, wybór Julian Tuwim',
      'Zestawienie z Rokiem 1984 pozwala omówić język podporządkowany władzy. W wierszu ważny jest przede wszystkim konkretny mechanizm mobilizowania odbiorców.')
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
