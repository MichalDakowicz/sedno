-- Autorskie opracowania Sedno. Linki wskazują materiały wykorzystane do sprawdzenia notatek.
-- Aktualizację publikuje kolejna migracja z tym samym kluczem (przedmiot, utwór, sekcja).
with zrodla(utwor, tytul, tekst_url, omowienie_url, geneza_url) as (
  values
    ('lalka', 'Lalka', 'https://wolnelektury.pl/katalog/lektura/lalka/', 'https://zpe.gov.pl/a/przeczytaj/DlvkFdJcP', 'https://zpe.gov.pl/a/przeczytaj/DlvkFdJcP'),
    ('zemsta', 'Zemsta', 'https://wolnelektury.pl/katalog/lektura/zemsta/', 'https://zpe.gov.pl/a/przeczytaj/DpgvZKvJ9', 'https://zpe.gov.pl/a/przeczytaj/DpgvZKvJ9'),
    ('dziady-iii', 'Dziady, część III', 'https://wolnelektury.pl/katalog/lektura/dziady-dziady-poema-dziady-czesc-iii/', 'https://zpe.gov.pl/a/przeczytaj/D11XyZOFL', 'https://zpe.gov.pl/a/dowiedz-sie/D1LP9Z15R')
), notatki(utwor, sekcja, hasla, tekst) as (
  values
    ('lalka', 'streszczenie', 'krótkie streszczenie fabuła powieść Warszawa Wokulski Izabela',
      'Stanisław Wokulski, warszawski kupiec, pomnaża majątek na dostawach podczas wojny rosyjsko-tureckiej. Próbuje zdobyć względy arystokratki Izabeli Łęckiej i wchodzi do jej środowiska. Odkrycie jej zażyłości ze Starskim załamuje go. Powieść nie rozstrzyga, co ostatecznie stało się z Wokulskim.'),
    ('lalka', 'wydarzenia', 'przebieg wydarzeń wojna zesłanie Paryż Geist Zasławek Wysocki pociąg Skierniewice ruiny Zasław',
      'Po udziale w powstaniu styczniowym Wokulski trafia na zesłanie. Po powrocie żeni się z wdową po Minclu i obejmuje sklep. Po powrocie z wojny rosyjsko-tureckiej zabiega o Izabelę: pomaga Łęckim finansowo i odkupuje ich kamienicę. W Paryżu poznaje Geista, a w Zasławku zbliża się do Izabeli. W pociągu słyszy rozmowę Izabeli ze Starskim po angielsku; wysiada w Skierniewicach i próbuje zginąć pod pociągiem. Ratuje go dróżnik Wysocki. Rzecki umiera, a dalsze losy Wokulskiego pozostają niejasne.'),
    ('lalka', 'geneza', 'geneza powstanie tytuł publikacja Kurier Codzienny Prus 1887 1889',
      '„Lalka” ukazywała się w odcinkach w „Kurierze Codziennym” od września 1887 do maja 1889 roku. Prus wiązał tytuł z prasową wiadomością o procesie dotyczącym kradzieży lalki. Powieść przedstawia przemiany społeczeństwa po powstaniu styczniowym.'),
    ('lalka', 'bohaterowie', 'Stanisław Wokulski Izabela Łęcka Ignacy Rzecki Julian Ochocki Starski Geist Szuman Wysocki',
      'Stanisław Wokulski jest głównym bohaterem, kupcem, uczestnikiem powstania styczniowego i daw­nym zesłańcem. Łączy praktyczne zdolności przedsiębiorcy z idealizowaniem Izabeli Łęckiej, arystokratki wychowanej w przekonaniu o wyższości własnej warstwy. Ignacy Rzecki, stary subiekt i przyjaciel Wokulskiego, prowadzi pamiętnik i wierzy w bonapartystów. Julian Ochocki interesuje się nauką i marzy o maszynie latającej. Kazimierz Starski jest krewnym Izabeli, z którym prowadzi poufałą rozmowę w pociągu.'),
    ('lalka', 'motywy', 'motyw miłość idealizm awans społeczny praca utylitaryzm lalka samotność',
      'Miłość Wokulskiego do Izabeli odsłania rozdźwięk między wyobrażeniem a znajomością drugiej osoby. Kupiec może zdobyć majątek i wejść do salonów, ale pochodzenie nadal wpływa na to, jak jest traktowany. Trzy odmiany idealizmu pokazują Rzecki, Wokulski i Ochocki: polityczną wiarę w napoleońską przyszłość, uczucie i zaangażowanie społeczne oraz wiarę w naukę.'),
    ('lalka', 'konteksty', 'pozytywizm romantyzm realizm powieść epoka Warszawa pamiętnik narracja',
      'Wokulski pozwala zestawić dziedzictwo romantyzmu (powstanie i idealizowana miłość) z pozytywistyczną pracą, przedsiębiorczością i zainteresowaniem nauką. Warszawa służy pokazaniu różnych warstw społecznych, od arystokracji po ubóstwo Powiśla. Pamiętnik Rzeckiego wprowadza inny punkt widzenia obok narracji trzecioosobowej.'),
    ('zemsta', 'streszczenie', 'krótkie streszczenie fabuła spór mur zamek ślub zgoda',
      'Cześnik i Rejent mieszkają w dwóch częściach jednego zamku i spierają się o mur. Klara i Wacław kochają się mimo kłótni opiekuna i ojca. Intrygi starszych prowadzą do ślubu młodych i końcowej zgody sąsiadów.'),
    ('zemsta', 'wydarzenia', 'przebieg wydarzeń akty mur Rejent murarze Papkin Dyndalski list Klara Wacław ślub',
      'Cześnik rozważa małżeństwo z Podstoliną i wysyła Papkina z oświadczynami. Na polecenie Rejenta murarze naprawiają mur, a ludzie Cześnika przerywają roboty. Wacław dostaje się do części zamku Cześnika pod pretekstem niewoli i szuka pomocy w sprawie Klary. Rejent próbuje ożenić syna z Podstoliną, a Papkin po wizycie u Rejenta sądzi, że został otruty, i spisuje testament. Cześnik zwabia Wacława i postanawia wydać za niego Klarę, by pokrzyżować plany Rejenta. Ślub kochających się młodych prowadzi do zgody.'),
    ('zemsta', 'geneza', 'geneza Fredro Odrzykoń Kamieniec Firlej Skotnicki proces',
      'Punktem wyjścia dla Fredry był historyczny spór Firlejów i Skotnickich o zamek w Odrzykoniu. Potomkowie zwaśnionych rodzin zawarli małżeństwo. Fredro przetworzył ten materiał w komediową intrygę o sąsiadach walczących o mur.'),
    ('zemsta', 'bohaterowie', 'Cześnik Maciej Raptusiewicz Rejent Milczek Klara Wacław Papkin Podstolina Dyndalski',
      'Cześnik Maciej Raptusiewicz, opiekun Klary, jest gwałtowny i działa otwarcie. Rejent Milczek, ojciec Wacława, działa skrycie i używa prawa do realizacji swoich planów. Wacław i Klara chcą się pobrać. Papkin, samochwała i pośrednik Cześnika, stara się też o Klarę. Podstolina to wdowa, którą Cześnik chce poślubić i z którą Rejent próbuje ożenić Wacława.'),
    ('zemsta', 'motywy', 'motyw zemsta konflikt zgoda miłość mur komizm',
      'Mur dzieli wspólny zamek i staje się materialnym znakiem konfliktu. Choć kłótnia sąsiadów nakręca intrygę, decyzja Cześnika podjęta z zemsty pomaga młodym wziąć ślub. Komizm powstaje między innymi dzięki zderzeniu temperamentów sąsiadów i rozbieżności między opowieściami Papkina o sobie a jego zachowaniem.'),
    ('zemsta', 'konteksty', 'komedia charakterów komizm obyczaj szlachecki adaptacja Wajda',
      'Zestawienie gwałtownego Cześnika z pozornie pokornym Rejentem to przykład komizmu charakterów. Spór o mur i kontrakty małżeńskie pozwalają przyjrzeć się obyczajom przedstawionej szlachty. Film Andrzeja Wajdy jest przykładem adaptacji dramatu, który funkcjonował przede wszystkim na scenie.'),
    ('dziady-iii', 'streszczenie', 'krótkie streszczenie dramat więzienie Konrad car Senator widzenie',
      'W więzieniu w Wilnie Gustaw przemienia się w Konrada. Dramat przedstawia prześladowania młodzieży i bunt poety, który w Wielkiej Improwizacji żąda od Boga władzy nad ludzkimi duszami. Widzenie księdza Piotra nadaje cierpieniu narodu sens religijny, a sceny Salonu warszawskiego i Pana Senatora pokazują postawy wobec przemocy carskiej.'),
    ('dziady-iii', 'wydarzenia', 'przebieg wydarzeń Prolog Sobolewski Wielka Improwizacja Ewa ksiądz Piotr Rollison Senator Ustęp',
      'W Prologu więzień zapisuje na ścianie symboliczną śmierć Gustawa i narodziny Konrada. W scenie więziennej Sobolewski opowiada o wywożeniu więźniów. W Wielkiej Improwizacji Konrad występuje przeciw Bogu, a ksiądz Piotr odprawia nad nim egzorcyzmy. Po widzeniu Ewy następuje widzenie księdza Piotra i sen Senatora. Salon warszawski pokazuje różne postawy elit i młodzieży. W scenie u Senatora matka Rollisona upomina się o więzionego syna. Ustęp przenosi uwagę na Rosję i mechanizmy carskiej władzy.'),
    ('dziady-iii', 'geneza', 'geneza Mickiewicz Drezno 1832 proces filomatów filaretów powstanie listopadowe',
      'Mickiewicz napisał III część „Dziadów” w Dreźnie w 1832 roku, po klęsce powstania listopadowego. Wykorzystał doświadczenia procesu i uwięzienia młodzieży związanej z filomatami i filaretami w Wilnie. Akcja scen więziennych odwołuje się do wcześniejszych represji, a perspektywa autora obejmuje także doświadczenie klęski i emigracji.'),
    ('dziady-iii', 'bohaterowie', 'Gustaw Konrad ksiądz Piotr Ewa Senator Nowosilcow Sobolewski Rollison Rollisonowa',
      'Konrad, dawny Gustaw, jest więzionym poetą i buntuje się w imieniu narodu. Ksiądz Piotr odpowiada na cierpienie modlitwą i pokorą. Senator Nowosilcow reprezentuje władzę carską. Sobolewski relacjonuje wywózkę więźniów, a niewidoma pani Rollison szuka pomocy dla torturowanego syna. Ewa modli się za prześladowanych i doświadcza widzenia.'),
    ('dziady-iii', 'motywy', 'motyw prometeizm mesjanizm bunt cierpienie naród patriotyzm władza',
      'Bunt Konrada można czytać jako prometejski: poeta występuje w interesie wspólnoty, a zarazem rości sobie prawo do kierowania innymi. Widzenie księdza Piotra łączy los Polski z figurą męki i zmartwychwstania. Losy więźniów oraz kontrast grup w Salonie warszawskim pozwalają analizować patriotyzm i obojętność wobec represji.'),
    ('dziady-iii', 'konteksty', 'dramat romantyczny historia proces filomatów filaretów Biblia Wielka Improwizacja',
      'III część „Dziadów” zestawia sceny historyczne z wizjami i działaniem sił nadprzyrodzonych. Represje w Wilnie stanowią kontekst historyczny, a obrazy pasyjne w widzeniu księdza Piotra otwierają kontekst biblijny. Zderzenie Wielkiej Improwizacji z widzeniem pozwala porównać bunt poety z religijną ufnością zakonnika.')
)
insert into private.wiedza_pestki (przedmiot, utwor, sekcja, tytul, tekst, hasla, zrodlo_url, zrodlo_rodzaj, warunki)
select 'polski', z.utwor, n.sekcja, z.tytul, n.tekst, n.hasla,
  case when n.sekcja = 'geneza' then z.geneza_url
       when n.sekcja in ('motywy', 'konteksty') then z.omowienie_url
       else z.tekst_url end,
  case when n.sekcja in ('geneza', 'motywy', 'konteksty') then 'opracowanie' else 'utwór' end,
  case when n.sekcja in ('geneza', 'motywy', 'konteksty')
       then 'Autorska notatka Sedno na podstawie informacji z ZPE. Bez przedruku materiału źródłowego.'
       else 'Autorska notatka Sedno na podstawie utworu z domeny publicznej, wydanie cyfrowe Wolnych Lektur. Bez przedruku tekstu.' end
from notatki n join zrodla z using (utwor)
on conflict (przedmiot, utwor, sekcja) do update
set (tytul, tekst, hasla, zrodlo_url, zrodlo_rodzaj, warunki) =
    (excluded.tytul, excluded.tekst, excluded.hasla, excluded.zrodlo_url, excluded.zrodlo_rodzaj, excluded.warunki);
