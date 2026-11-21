-- Osiem nowych wariantów na poziom i ćwiczoną umiejętność. Czytanie i słuchanie
-- dzielą materiał, ale mają osobne identyfikatory i sposób prezentacji.
with materialy(id, poziom, material, q_sens, o_sens, e_sens, q_szcz, o_szcz, e_szcz, q_wn, o_wn, e_wn) as (
  values
  ('p9', 'podstawowy', 'Hi Leo, our film starts at seven. I’ll get there at six to pick up the tickets. You can come straight after your lesson. I’ll wait by the big poster outside.',
    'Why is Leo receiving this message?', array['To arrange a meeting','To recommend a film','To cancel an evening out'], 'Rozmówca ustala miejsce i sposób spotkania przed seansem.',
    'When will the speaker collect the tickets?', array['At six','At five','At seven'], 'Rozmówca przyjedzie o szóstej po bilety.',
    'What can Leo do after the lesson?', array['Go straight to the cinema','Collect both tickets himself','Wait by the classroom door'], 'Bilety odbierze rozmówca, który zaczeka przy plakacie.'),
  ('p10', 'podstawowy', 'The library is open on Saturday, but the main room will be used for a children’s workshop. You can still pick up books at the desk. If you need a quiet place to read, use the study room upstairs.',
    'What is the purpose of the announcement?', array['To explain a temporary arrangement','To invite readers to a book sale','To introduce a new library service'], 'Biblioteka wyjaśnia, jak będzie działać w sobotę.',
    'Where can visitors collect books?', array['At the desk','In the study room','In the main room'], 'Odbiór książek jest możliwy przy ladzie.',
    'Where should a visitor go to read quietly?', array['To the room upstairs','To the children’s workshop','To the desk by the door'], 'Czytelnikom szukającym ciszy wskazano pokój na piętrze.'),
  ('p11', 'podstawowy', 'Hello, I bought a lamp from your shop on Monday. It works, but the switch is loose. I’d like to keep the lamp if you can send me a new switch. I still have the receipt.',
    'What does the customer want?', array['A replacement part','A full cash refund','A copy of the receipt'], 'Klient chce zatrzymać lampę i prosi o nowy przełącznik.',
    'When did the customer buy the lamp?', array['On Monday','On Tuesday','On Saturday'], 'Zakup był w poniedziałek.',
    'When would the customer be happy to keep the lamp?', array['If the shop sends a switch','If the shop gives a refund','If the shop provides a receipt'], 'Warunkiem zatrzymania lampy jest uzyskanie sprawnego przełącznika.'),
  ('p12', 'podstawowy', 'We’re having a picnic on the school field tomorrow. Bring your own lunch and a bottle for water. There will be a tap next to the gym. If the grass is wet, we’ll eat under the shelter instead.',
    'What is the speaker doing?', array['Giving information about a picnic','Asking pupils to clean the gym','Describing a sports competition'], 'To zapowiedź pikniku i instrukcja dla uczestników.',
    'Where is the tap?', array['By the gym','By the shelter','By the school gate'], 'Kran będzie obok sali gimnastycznej.',
    'What would change if the grass was wet?', array['The place they eat','The lunch pupils bring','The day of the picnic'], 'W razie mokrej trawy uczestnicy zjedzą pod wiatą.'),
  ('p13', 'podstawowy', 'I’m looking after my neighbour’s cat this weekend. The cat eats at eight in the morning. There’s food in the kitchen cupboard, and the bowl is beside the back door. Please call me if you can’t find anything.',
    'What is the message mainly about?', array['Caring for a pet','Buying some pet food','Visiting a new neighbour'], 'Wiadomość przekazuje informacje potrzebne przy opiece nad kotem.',
    'Where is the bowl?', array['By the back door','On the kitchen table','In the kitchen cupboard'], 'Miska stoi przy tylnych drzwiach.',
    'What is the speaker asking the listener to do if something is missing?', array['Get in touch for help','Buy another bag of food','Ask the neighbour to return'], 'Rozmówca prosi o telefon w razie kłopotu ze znalezieniem rzeczy.'),
  ('p14', 'podstawowy', 'Our school play is on Friday. Tickets are free, but the hall is small, so get yours from reception before Thursday. Families can take two tickets each. There won’t be any tickets at the door.',
    'What is the announcement about?', array['How to get tickets','How to join the cast','Where to park on Friday'], 'Komunikat wyjaśnia zasady odbioru biletów na przedstawienie.',
    'How many tickets can each family take?', array['Two','One','Three'], 'Limit to dwa bilety na rodzinę.',
    'What should someone do to be sure of seeing the play?', array['Collect a ticket in advance','Ask for a ticket at the door','Arrive before the other families'], 'Bilet trzeba odebrać wcześniej w recepcji.'),
  ('p15', 'podstawowy', 'Mila, I’ve finished the poster for our project, but my printer is out of ink. I’ll send you the file now. Could you print it at home and bring it in tomorrow? It only needs to be in black and white.',
    'Why is the speaker contacting Mila?', array['To ask for printing help','To suggest a new design','To offer to print a poster'], 'Rozmówca prosi Milę o wydrukowanie gotowego plakatu.',
    'When does the speaker need the poster?', array['Tomorrow','This evening','This afternoon'], 'Mila ma przynieść plakat jutro.',
    'What can Mila do if her printer has no colour ink?', array['Print it in black and white','Wait until she buys colour ink','Ask someone to redraw the poster'], 'Do plakatu wystarczy wydruk czarno-biały.'),
  ('p16', 'podstawowy', 'The afternoon bike tour is full, but there are still places on the morning tour. It follows the same route by the river and starts at ten. Helmets are included. Bring a drink and meet at the cycle shop.',
    'What is the speaker offering?', array['A different tour time','A shorter cycle route','A new place to meet'], 'Poranna wycieczka jest alternatywą dla popołudniowej.',
    'What is included in the tour?', array['A helmet','A drink','A map of town'], 'W cenie jest kask.',
    'What stays the same on the morning tour?', array['The route by the river','The afternoon starting time','The number of places left'], 'Obie wycieczki prowadzą tą samą trasą.'),
  ('r9', 'rozszerzony', 'The district heating team asked residents to report cold rooms through a new form. It groups reports by building, which makes it easier to spot faults affecting several flats. Urgent leaks should still be reported directly by phone.',
    'What is the focus of the notice?', array['A change in fault reporting','A schedule for repairs to flats','A warning about a heating outage'], 'Komunikat opisuje nowy sposób zgłaszania problemów.',
    'How does the form group reports?', array['By building','By time of day','By type of tenancy'], 'Zgłoszenia są grupowane według budynków.',
    'Why does the team keep a phone line?', array['Some faults need immediate attention','Some flats have no central heating','Some residents submit duplicate forms'], 'Pilne wycieki nadal wymagają kontaktu telefonicznego.'),
  ('r10', 'rozszerzony', 'A café introduced a deposit on takeaway cups. Regular customers can return a cup on their next visit, while visitors can drop it off at the station kiosk. The deposit is returned at either location, whether or not the customer buys anything else.',
    'What does the announcement explain?', array['How cup returns work','Why takeaway drinks cost more','Where to buy travel mugs'], 'Ogłoszenie objaśnia zwrot kubka i odzyskanie kaucji.',
    'What is the second return point?', array['The station kiosk','The café’s kitchen','The station ticket office'], 'Kubek można również oddać w kiosku na stacji.',
    'Who benefits most from the second return point?', array['People unlikely to revisit the café','People who order drinks every day','People buying drinks for large groups'], 'Drugi punkt pomaga osobom, które nie wrócą do kawiarni.'),
  ('r11', 'rozszerzony', 'This year the film festival will show its opening documentary twice. The first screening includes a director’s interview. The second includes the film only, but tickets cost less. Both screenings include English subtitles.',
    'What does the festival offer?', array['Two ways to see one film','Two versions of one documentary','Two films from the same director'], 'Widzowie mogą wybrać jeden z dwóch pokazów tego samego filmu.',
    'What follows the first screening?', array['An interview with the director','A screening of a short film','A talk about translating subtitles'], 'Pierwszy seans obejmuje rozmowę z reżyserem.',
    'Which audience might prefer the second screening?', array['Viewers focused on ticket cost','Viewers interested in meeting the director','Viewers who need a different translation'], 'Drugi pokaz jest tańszy i nadal ma angielskie napisy.'),
  ('r12', 'rozszerzony', 'The student radio station has replaced its weekly live interview with a recorded one. Contributors can now take part at a time that suits them. The programme will still go out on Wednesday, and listeners can send questions by Monday evening.',
    'What is the main change?', array['The interview is recorded ahead','The programme moves to Monday','The station only interviews students'], 'Wywiad jest teraz nagrywany wcześniej.',
    'When must listeners send their questions?', array['By Monday evening','By Wednesday evening','By Tuesday morning'], 'Termin zgłoszenia pytań to poniedziałek wieczorem.',
    'Which problem is the station trying to solve?', array['Guests’ limited availability for live interviews','Listeners’ difficulty finding the right station','Students’ lack of access to recordings'], 'Nagranie pozwala dopasować termin rozmowy do dostępności gości.'),
  ('r13', 'rozszerzony', 'A trail guide now marks exposed stretches, where the wind can be strong even on dry days. The guide also lists two sheltered alternatives. They add about twenty minutes to the walk and meet the main trail before the final climb.',
    'What does the updated guide help walkers do?', array['Choose a route for the conditions','Book a place on a guided walk','Avoid having to make the final climb'], 'Przewodnik pomaga uwzględnić wiatr przy wyborze trasy.',
    'How much time do the alternatives add?', array['About twenty minutes','About ten minutes','About thirty minutes'], 'Trasy są około dwudziestu minut dłuższe.',
    'Which part remains on both alternatives?', array['The final climb','The exposed stretches','The first sheltered path'], 'Obejścia łączą się z główną trasą przed finałowym podejściem.'),
  ('r14', 'rozszerzony', 'A theatre introduced seats with a direct view of a small caption screen. The captions include dialogue and descriptions of important sounds. The ticket office can recommend suitable seats, but there is no extra charge for using them.',
    'What is the announcement mainly about?', array['An option for following a performance','A discount for certain theatre seats','A change to the order of scenes'], 'Komunikat opisuje miejsca umożliwiające korzystanie z napisów.',
    'What do the captions include alongside dialogue?', array['Details of important sounds','Notes about the actors’ careers','Translations into several languages'], 'Napisy obok dialogu opisują istotne dźwięki.',
    'Why might someone contact the ticket office?', array['To find seats with a clear view','To pay for access to the captions','To ask when the dialogue was written'], 'Kasa pomoże dobrać miejsce z widokiem na ekran.'),
  ('r15', 'rozszerzony', 'The craft market moved its busiest stalls away from the entrance this year. Queues had blocked people trying to enter, even though there was space farther inside. The organisers will compare how long people wait before making the change permanent.',
    'What prompted the new layout?', array['Congestion at the entrance','Low sales at the busiest stalls','A shortage of space inside'], 'Kolejki utrudniały wejście na targi.',
    'Which stalls were moved?', array['The busiest stalls','The stalls selling food','The stalls with new sellers'], 'Przeniesiono stoiska odwiedzane najczęściej.',
    'What evidence will inform the final decision?', array['How long visitors spend waiting','How far stallholders carry goods','How many visitors buy crafts'], 'Organizatorzy porównają czasy oczekiwania.'),
  ('r16', 'rozszerzony', 'The pool has added a beginner session with a maximum of six swimmers. The water is no shallower than in other sessions, but there are two instructors. Swimmers who quickly move on from the basics can transfer to the regular class.',
    'What is the purpose of the new session?', array['To give beginners more support','To provide training for instructors','To make the shallow end available'], 'Mała grupa i dwoje instruktorów zapewniają początkującym wsparcie.',
    'How many people teach in the beginner session?', array['Two','One','Three'], 'Zajęcia prowadzi dwoje instruktorów.',
    'What can swimmers do once they have mastered the basics?', array['Move to the regular class','Stay in a smaller pool','Request an extra private instructor'], 'Po opanowaniu podstaw można przejść do zwykłej grupy.'),
  ('d9', 'dwujezyczny', 'A pilot scheme combined district deliveries to cut van trips. The number of trips fell, but some vans now spent longer idling at the central loading point. The evaluation team asked for fuel data before drawing a conclusion about the environmental impact.',
    'What issue does the report illustrate?', array['A headline indicator can miss trade-offs','Fuel shortages encourage more efficient routing','Central depots systematically delay package deliveries'], 'Mniejsza liczba kursów nie uwzględnia dodatkowej pracy silnika na postoju.',
    'What additional data did the team request?', array['Fuel use','Package weights','Vehicle prices'], 'Zespół poprosił o dane o paliwie.',
    'Which claim is premature at this stage?', array['The scheme lowered overall emissions','Vans make fewer separate journeys','Some vans idle at the depot'], 'Bez pomiaru paliwa nie można przesądzić o emisjach.'),
  ('d10', 'dwujezyczny', 'The scholarship panel used to rank applicants by a single overall score. It now flags candidates whose application shows unusual strength in one area, even if their total is modest. A flag triggers discussion and does not guarantee an offer.',
    'What is the change intended to do?', array['Give standout strengths more scrutiny','Ensure offers go to specialists only','Replace deliberation with a fixed ranking'], 'Flaga pozwala omówić mocną stronę pomijaną przez sumę punktów.',
    'What does a flag trigger?', array['A discussion','An offer','A second application'], 'Flagę wykorzystuje się do rozpoczęcia dyskusji.',
    'What can one infer about the overall score?', array['It can conceal a particular strength','It now guarantees a place by itself','It is discarded when two scores match'], 'Wysoki wynik cząstkowy może zniknąć w przeciętnej sumie.'),
  ('d11', 'dwujezyczny', 'An archive posted digitised diaries online. Volunteers transcribed the pages, but a trial found that contributors regularly mistook unusual place names for familiar ones. An editor will now verify place names against the paper originals before a transcription becomes searchable.',
    'What problem is the archive addressing?', array['Systematic errors in transcription','Frequent delays in scanning diaries','Poor access to the paper collection'], 'Rozpoznawalne nazwy zastępowały rzadsze i wypaczały transkrypcję.',
    'What reference will the editor consult?', array['The handwritten pages','A current street atlas','The volunteers’ personal notes'], 'Nazwy będą weryfikowane z papierowymi oryginałami.',
    'Why check before enabling search?', array['Incorrect names could mislead researchers','Search queries could overload the archive','Editors could lose the original copies'], 'Błędna nazwa zmieniałaby wyniki wyszukiwania źródeł.'),
  ('d12', 'dwujezyczny', 'A town reported that a free bus pass raised museum attendance. Passes had initially been offered to people who already subscribed to cultural newsletters. The researchers will distribute the next batch by lottery among residents who apply and compare applicants who do and do not receive one.',
    'What is the main reason for changing the study?', array['The early recipients were atypical','The museum budget was unusually high','The newsletter data were published late'], 'Pierwsi odbiorcy byli już zainteresowani kulturą.',
    'How will the next recipients be selected?', array['By lottery','By newsletter activity','By past museum visits'], 'W kolejnej turze przewidziano losowanie wśród zgłoszonych.',
    'What can the new comparison clarify?', array['Whether the pass changes attendance','Whether newsletters should charge for delivery','Whether loyal visitors prefer other museums'], 'Losowanie pozwala lepiej oddzielić wpływ karnetu od wcześniejszych zainteresowań.'),
  ('d13', 'dwujezyczny', 'When the council shortened its advice letters, more recipients replied on time. Phone calls also rose, however, mostly from people asking what documents they needed. The redesigned version keeps the short body and adds a tailored document checklist at the end.',
    'What is the redesign trying to achieve?', array['Keep clarity while restoring key details','Move all advice to phone calls','Give every recipient the same checklist'], 'Krótki tekst zostaje, a lista uzupełnia informacje konieczne do działania.',
    'What did most callers ask about?', array['Required documents','The reply deadline','The council’s opening hours'], 'Głównym tematem telefonów były wymagane dokumenty.',
    'What does the rise in calls suggest?', array['Short letters left some practical questions','Phone advice made letters unnecessary','Recipients no longer read the deadline'], 'Więcej terminowych odpowiedzi współistniało z brakami informacyjnymi.'),
  ('d14', 'dwujezyczny', 'An independent bookstore set up an online collection service. Early figures showed shorter queues, but the owner noticed that customers who came only to collect rarely added other purchases. The next report will track both time spent waiting and sales outside advance orders.',
    'What trade-off is being examined?', array['Faster service may affect extra sales','Lower prices may increase advance orders','Longer queues may attract new customers'], 'Szybszy odbiór może ograniczać dodatkowe zakupy.',
    'What will the next report record?', array['Sales beyond advance orders','The cost of packaging books','The number of new online reviews'], 'Raport uwzględni sprzedaż poza zamówieniami złożonymi z góry.',
    'What would be missed by measuring queues alone?', array['Changes in unplanned shopping','The speed of collecting orders','The size of the waiting area'], 'Sam czas kolejki pomija dokonane przy okazji zakupy.'),
  ('d15', 'dwujezyczny', 'When a river monitoring project moved its sensor downstream, monthly averages rose. A chemist pointed out that the new site is below the junction with a second stream. Both sites will be monitored through winter to see whether the apparent rise survives a like-for-like comparison.',
    'What does the chemist question?', array['Whether the readings are comparable','Whether the sensor can withstand winter','Whether both streams receive enough rainfall'], 'Zmiana lokalizacji utrudnia porównanie wyników sprzed i po przeniesieniu.',
    'Where is the new sensor?', array['Below the stream junction','Above the previous site','At the source of both streams'], 'Nowy punkt jest poniżej miejsca połączenia strumieni.',
    'If simultaneous readings differ, what becomes more plausible?', array['Location contributed to the apparent rise','Winter repairs corrected the earlier figures','Both streams changed by the same amount'], 'Równoległe pomiary pozwalają ujawnić różnicę związaną z miejscem.'),
  ('d16', 'dwujezyczny', 'An arts fund required applicants to predict audience size. Small organisations often supplied cautious estimates, while larger ones used figures from previous tours. The next form asks applicants to explain the evidence behind a range rather than commit to a single figure.',
    'What issue is the fund addressing?', array['Estimates have uneven evidential support','Small groups rarely produce any forecasts','Past tours guarantee future demand'], 'Wcześniejsze prognozy opierały się na różnej jakości danych.',
    'What must applicants provide now?', array['Evidence for a range','A single precise forecast','Attendance data from several tours'], 'Formularz wymaga zakresu popartego uzasadnieniem.',
    'What can the revised form help reviewers distinguish?', array['Credible estimates from unsupported precision','Successful tours from cancelled performances','New applicants from previous grant winners'], 'Uzasadnienie pozwala ocenić, co stoi za prognozą.')
), spojnosc(id, poziom, material, poprawna, bledna1, bledna2, wyjasnienie) as (
  values
  ('p9','podstawowy','Eva put the keys in her school bag. [___] Luckily, she had put her name on it.','She left the bag on the bus.','She walked to school with her brother.','She left the keys on the kitchen table.','Znacznik z imieniem pomoże odzyskać torbę zostawioną w autobusie.'),
  ('p10','podstawowy','It was almost dark when we reached the beach. [___] Then we could see the path again.','Dad switched on his torch.','We put our bags under a bench.','Dad looked up at the cloudy sky.','Latarka pozwala na nowo zobaczyć ścieżkę.'),
  ('p11','podstawowy','Jim went to make tea for his visitors. [___] He rinsed two mugs while it heated up.','The water was still cold.','The visitors had brought some cold drinks.','The tea had already been poured out.','Podgrzewa się jeszcze zimna woda na herbatę.'),
  ('p12','podstawowy','Lily couldn’t carry both boxes at once. [___] Together they moved everything in one trip.','She asked Tom to help.','She moved the smaller box first.','Tom had already left the building.','Prośba o pomoc wprowadza drugą osobę.'),
  ('p13','podstawowy','We were going to have lunch outside. [___] Instead, we used the tables in the hall.','It began to rain.','The sun came out after lunch.','Some students brought sandwiches from home.','Deszcz wyjaśnia zmianę miejsca posiłku.'),
  ('p14','podstawowy','Nina forgot to bring a pen. [___] She returned it after the test.','A classmate lent her one.','The test began five minutes late.','A classmate left her books at home.','„It” odsyła do pożyczonego długopisu.'),
  ('p15','podstawowy','Omar wanted a photo of the whole family. [___] That way, everyone could be in the picture.','He set a timer.','He stood behind his camera.','He asked his sister to take it.','Samowyzwalacz pozwala wszystkim stanąć przed aparatem.'),
  ('p16','podstawowy','The map showed two paths to the lake. [___] We took the other one and arrived on time.','A fallen tree blocked one path.','Both paths were open all summer.','Neither path led all the way there.','„The other one” odróżnia wybraną ścieżkę od zablokowanej.'),
  ('r9','rozszerzony','The choir rehearsed in the hall every week. [___] This meant that they had to take turns practising with the full group.','A leak forced them into a much smaller room.','The hall was expanded to seat a bigger audience.','Several singers saved copies of the sheet music.','Mniejsze pomieszczenie uzasadnia próby na zmianę.'),
  ('r10','rozszerzony','The organisers expected the short course to attract experienced cooks. [___] Consequently, the tutor spent the first morning covering basic techniques.','Most people who enrolled were complete beginners.','Every applicant had previously worked in a kitchen.','The course ended just before the autumn term began.','Przewagę początkujących wyjaśnia powrót do podstaw.'),
  ('r11','rozszerzony','The guide suggested visiting before lunch. [___] As a result, the sites we planned to see were still quiet.','We caught the first bus there.','We booked seats on the evening bus.','We bought lunch after the tour ended.','Wczesny dojazd pozwala odwiedzić miejsca przed tłumem.'),
  ('r12','rozszerzony','The project received two offers of help. [___] The team chose the former because storage was already available.','One group offered tools and the other offered space.','Both groups offered to look after the same equipment.','The first group withdrew before the second could reply.','„The former” wskazuje pierwszą z dwóch różnych ofert.'),
  ('r13','rozszerzony','The school initially kept lost items in reception. [___] This made it possible to recover them after the office had closed.','It moved the boxes to the staffed entrance.','It began locking the collection room at noon.','It asked visitors to report damage to the office.','Obsługiwane wejście zapewnia dostęp po zamknięciu biura.'),
  ('r14','rozszerzony','I opened my first account in 2018. [___] That second account is the one I now use for rent.','I opened another at a local bank in 2021.','I had already closed every account the year before.','I contacted the same bank about my missing card.','Zdanie musi wprowadzić drugie konto.'),
  ('r15','rozszerzony','The association used to publish a list of events once a year. [___] These monthly updates let members plan around last-minute changes.','It now sends a revised calendar every four weeks.','It now keeps the same calendar for two years.','It has stopped informing members of any cancellations.','„These monthly updates” odsyła do kalendarza co cztery tygodnie.'),
  ('r16','rozszerzony','Several riders found the hill too steep. [___] Both measures were intended to keep the route accessible.','We added a rest stop and marked an easier route.','We brought the bikes back to the shop for repairs.','We cancelled the ride before anyone reached the hill.','„Both measures” łączy odpoczynek i łatwiejszą trasę.'),
  ('d9','dwujezyczny','The authors attributed the fall in delays to the revised timetable. [___] The review therefore treats that attribution as provisional.','Roadworks also ended that month.','The revised timetable preceded the fall by years.','Later surveys confirmed there were no alternative explanations.','Zakończenie remontów stanowi inne możliwe wyjaśnienie spadku opóźnień.'),
  ('d10','dwujezyczny','The committee proposed an opt-in system for the service. [___] Its concern was that poorer applicants might be lost at that stage.','This would require every user to submit an application.','The service was already automatic for every eligible applicant.','The second committee completed its report ahead of schedule.','„At that stage” odnosi się do kroku złożenia wniosku.'),
  ('d11','dwujezyczny','The museum expanded the display to make room for recent donations. [___] The curators have since added a separate label explaining this gap.','Few objects from the intervening decade were available.','The new cases reused wood from the former display.','The expanded display contains examples from every decade.','Etykieta wyjaśnia brak przedmiotów z jednej dekady.'),
  ('d12','dwujezyczny','The new measure captures the volume of completed work. [___] The report presents both figures side by side to prevent misleading comparisons.','A separate measure records the complexity of the tasks.','Its values are reported to the nearest whole number.','The calculation uses the same measure for every team.','Wzmianka o dwóch liczbach wymaga drugiego wskaźnika.'),
  ('d13','dwujezyczny','The team did not intend to reduce the number of consultations. [___] The fall in appointments was therefore considered an unintended consequence.','It changed the booking system to free up staff time.','It set a lower appointment target before the year began.','It kept the same booking system and consultation levels.','Celem zmiany było uwolnienie czasu, a nie zmniejszenie liczby konsultacji.'),
  ('d14','dwujezyczny','Each reviewer received an anonymised copy of the proposal. [___] If a conflict nevertheless emerged, another reviewer took over.','Names and institutional affiliations were removed before distribution.','Reviewers were given a list of the applicants’ colleagues.','Applicants could contact their reviewers directly about any concerns.','Anonimizacja ogranicza konflikty, stąd „nevertheless”.'),
  ('d15','dwujezyczny','The group retained an evening class to accommodate daytime workers. [___] This overlap could explain why a separate weekend session drew fewer people.','The evening class already served many of the same learners.','Weekend sessions were restricted to an entirely different age group.','The team advertised all sessions in the same weekly newsletter.','„This overlap” wskazuje wspólną grupę uczestników.'),
  ('d16','dwujezyczny','Applications rose when the requirements became less restrictive. [___] The figures are thus consistent with two different mechanisms.','At the same time, a publicity campaign reached new audiences.','Applications were counted using the same definition throughout.','The change to eligibility was announced after applications closed.','Kampania stanowi drugi wiarygodny mechanizm wzrostu.')
), jezyk(id, poziom, polecenie, luka, odpowiedzi, material, poprawna, bledna1, bledna2, wyjasnienie, wskazowka) as (
  values
  ('p9','podstawowy','Wstaw formę teraźniejszą czasownika have.','My sister ___ a new bike.',array['has'],'My brother have a new helmet now.','have → has','have → have got','new → newer','W trzeciej osobie liczby pojedynczej teraźniejsza forma to has.','Sprawdź osobę i liczbę podmiotu.'),
  ('p10','podstawowy','Wstaw formę czasu przeszłego czasownika see.','Yesterday I ___ a rainbow.',array['saw'],'Last night we see a fox near our house.','see → saw','see → seen','see → sees','W past simple forma see to saw.','Yesterday i last night odnoszą się do zakończonej przeszłości.'),
  ('p11','podstawowy','Wstaw much albo many.','How ___ apples do we need?',array['many'],'How much biscuits did you buy?','much → many','much → any','much → little','Many łączy się z policzalnym rzeczownikiem w liczbie mnogiej.','Sprawdź, czy da się policzyć przedmioty.'),
  ('p12','podstawowy','Wstaw liczbę mnogą rzeczownika child.','Two ___ are waiting outside.',array['children'],'Three childs are drawing in the classroom.','childs → children','childs → child','childs → child’s','Liczba mnoga child ma formę children.','Liczebnik większy od jednego wskazuje liczbę mnogą.'),
  ('p13','podstawowy','Wstaw zaimek dzierżawczy odnoszący się do niesionej przez nas torby.','This bag belongs to us. It’s ___.',array['ours'],'These coats belong to us. They’re our.','our → ours','our → we','our → us','Ours zastępuje całe wyrażenie, np. our coats.','Sprawdź, czy po zaimku występuje rzeczownik.'),
  ('p14','podstawowy','Uzupełnij drugie słowo w konstrukcji porównawczej.','Our room is as large ___ yours.',array['as'],'The green box is as light than the blue one.','than → as','than → like','than → that','Równość wyrażamy przez as + przymiotnik + as.','Pierwsze as już wskazuje konstrukcję.'),
  ('p15','podstawowy','Wstaw przyimek pasujący przed nazwą dnia.','The shop opens late ___ Sundays.',array['on'],'They play tennis at Saturdays.','at → on','at → to','at → in','Przed dniami tygodnia używamy on.','Rozpoznaj jednostkę czasu.'),
  ('p16','podstawowy','Wstaw formę ciągłą czasownika run.','Look! The dogs are ___.',array['running'],'Look! Their dog is runing around the garden.','runing → running','runing → run','runing → runs','W running podwajamy końcowe n przed -ing.','Sprawdź pisownię rdzenia po dodaniu końcówki.'),
  ('r9','rozszerzony','Wstaw formę ciągłą czasu past perfect czasownika wait.','We ___ for an hour when the bus arrived.',array['had been waiting'],'By the time the show began, we had being standing in the rain for an hour.','had being → had been','had being → have been','had being → were been','Past perfect continuous ma postać had been + -ing.','Wyrażasz trwanie przed innym zdarzeniem w przeszłości.'),
  ('r10','rozszerzony','Uzupełnij mowę zależną czasownikiem try i would.','She said, “I will try again.” She said she ___ again.',array['would try'],'He said, “I will call back.” He said he will called back.','will called → would call','will called → would called','will called → has called','Po cofnięciu will do would czasownik ma formę podstawową.','Zachowaj przyszłość widzianą z przeszłości.'),
  ('r11','rozszerzony','Użyj have w czasie przeszłym, zaczynając konstrukcję z imiesłowem.','I ___ my glasses repaired yesterday.',array['had'],'She had her bike mend yesterday.','mend → mended','mend → mending','mend → to mend','W konstrukcji have something done używamy imiesłowu biernego.','To ktoś inny wykonał usługę.'),
  ('r12','rozszerzony','Wstaw formę czasownika speak po avoid.','He avoids ___ in large meetings.',array['speaking'],'She avoids to drive in heavy traffic.','to drive → driving','to drive → drive','to drive → driven','Po avoid czasownik kończy się na -ing.','Zwróć uwagę na wyraz, po którym występuje drugi czasownik.'),
  ('r13','rozszerzony','Wstaw składnik stałego wyrażenia responsible ___.','Who is responsible ___ checking those figures?',array['for'],'I’m responsible of organising the event.','of → for','of → to','of → at','Responsible łączy się z for przed opisywaną czynnością.','Pomyśl o przyimku z wyrażenia responsible for something.'),
  ('r14','rozszerzony','Uzupełnij zdanie imiesłowem biernym czasownika break.','The window was ___ during the storm.',array['broken'],'The door was broke during the storm.','broke → broken','broke → breaking','broke → to break','Strona bierna wymaga be oraz imiesłowu broken.','Sprawdź trzecią formę czasownika break.'),
  ('r15','rozszerzony','Wstaw wyraz związany z rzeczownikiem result.','We stayed indoors as a result ___ the storm.',array['of'],'The road was closed as a result from the flooding.','from → of','from → for','from → at','Stałe wyrażenie to as a result of.','Za luką jest przyczyna, wyrażona rzeczownikiem.'),
  ('r16','rozszerzony','Użyj take w konstrukcji would rather, by wyrazić żal dotyczący przeszłości.','I’d rather you ___ the earlier train yesterday.',array['had taken'],'I’d rather you leave last night instead of this morning.','leave → had left','leave → have left','leave → were leaving','Po would rather i osobie stosujemy past perfect, gdy chodzi o wcześniejszą, niezrealizowaną czynność.','Wskazany czas minął, a wyrażana preferencja dotyczy przeszłości.'),
  ('d9','dwujezyczny','Zachowaj inwersję i użyj arrive w czasie past simple. Użyj podmiotu we.','Only after midnight ___ at the station.',array['did we arrive'],'Only then we realised what the sign meant.','we realised → did we realise','we realised → did we realised','we realised → we did realise','Po Only then na początku klauzuli następuje inwersja.','Przenieś operator przed podmiot, a czasownik do formy podstawowej.'),
  ('d10','dwujezyczny','Uzupełnij stałe wyrażenie bear ___ mind.','Please bear ___ mind that the main entrance is closed.',array['in'],'Bear on mind that the quoted amount excludes tax.','on → in','on → by','on → at','Stałe wyrażenie to bear in mind.','Sprawdź utrwalone połączenie z mind.'),
  ('d11','dwujezyczny','Uzupełnij zdanie dokonanym imiesłowem czynnym od verify.','___ all the calculations, the auditor signed the report.',array['having verified'],'Having verify the data, the analyst sent the report.','Having verify → Having verified','Having verify → Having verifying','Having verify → Having verifies','Po having w dokonanym imiesłowie używamy trzeciej formy czasownika.','Weryfikacja jest wcześniejsza niż podpisanie.'),
  ('d12','dwujezyczny','Wstaw formę czasownika endure po lest w stylu formalnym.','They withdrew the offer lest it ___ beyond the deadline.',array['endure','should endure'],'The team cut the meeting short lest anyone misses the last train.','misses → miss','misses → missed','misses → had missed','Po lest można użyć bezokolicznikowej formy trybu łączącego.','Lest wprowadza cel polegający na uniknięciu skutku.'),
  ('d13','dwujezyczny','Wstaw przyimek w formalnym wyrażeniu subject ___.','The list is subject ___ revision.',array['to'],'These figures are subject for further review.','for → to','for → at','for → with','Konstrukcja subject to oznacza podleganie czemuś.','Rozpoznaj całe połączenie, a nie sam przyimek.'),
  ('d14','dwujezyczny','Uzupełnij tryb łączący po essential. Użyj czasownika have.','It is essential that each witness ___ access to the documents.',array['have'],'It is vital that each claim being independently verified before publication.','being → be','being → been','being → to be','Mandative subjunctive ma formę podstawową czasownika, np. have lub be.','Wybierz formę bez odmiany przez osobę.'),
  ('d15','dwujezyczny','Wstaw dokonany bezokolicznik od misread.','She appears ___ the instructions before starting.',array['to have misread'],'The board is reported to had met privately before the vote.','to had met → to have met','to had met → to have meet','to had met → to having met','Bezokolicznik dokonany to to have + imiesłów bierny.','Spotkanie jest wcześniejsze niż doniesienie o nim.'),
  ('d16','dwujezyczny','Uzupełnij czasownikiem modalnym konstrukcję inwersji oznaczającą możliwość.','___ the system fail, refer to the printed instructions.',array['should'],'Should the lights goes out, use the emergency exit.','goes → go','goes → gone','goes → going','Po modalnym should czasownik ma formę podstawową.','Inwersja nie zmienia formy czasownika głównego.')
), zadania(id, skill_id, poziom, format, prompt, opcje, odpowiedzi, wyjasnienie, wskazowki, error_type) as (
  select tryb || '-' || m.id || '-' || q.skill, tryb || '-' || q.skill, m.poziom, 'szybka-runda',
    jsonb_build_object('typ', 'wybor', 'tresc', q.polecenie)
      || case when tryb = 'czytanie' then jsonb_build_object('tekst', m.material)
        else jsonb_build_object('audioTekst', m.material, 'audioJezyk', 'en-GB') end,
    q.opcje, null::text[], q.wyjasnienie, q.wskazowki, null::text
  from materialy m
  cross join (values ('czytanie'), ('sluchanie')) as formy(tryb)
  cross join lateral (values
    ('sens', m.q_sens, m.o_sens, m.e_sens, array['Ustal, po co powstała cała wypowiedź.']),
    ('szczegoly', m.q_szcz, m.o_szcz, m.e_szcz, array['Szukaj nazwy, liczby lub czynności, o którą pyta pytanie.']),
    ('wnioskowanie', m.q_wn, m.o_wn, m.e_wn, array['Połącz informacje i odrzuć wnioski wymagające dodatkowych założeń.'])
  ) as q(skill, polecenie, opcje, wyjasnienie, wskazowki)
  union all
  select 'spojnosc-' || id, 'czytanie-spojnosc', poziom, 'szybka-runda',
    jsonb_build_object('typ', 'wybor', 'tresc', 'Które zdanie pasuje do luki i zachowuje spójność tekstu?', 'tekst', material),
    array[poprawna, bledna1, bledna2], null, wyjasnienie,
    array['Przeczytaj zdanie tuż przed luką i tuż po niej.'], null
  from spojnosc
  union all
  select 'jezyk-runda-' || id, 'srodki-jezykowe', poziom, 'szybka-runda',
    jsonb_build_object('typ', 'luka', 'tresc', polecenie, 'tekst', luka),
    null, odpowiedzi, wyjasnienie, array[wskazowka], null
  from jezyk
  union all
  select 'jezyk-napraw-' || id, 'srodki-jezykowe', poziom, 'napraw-blad',
    jsonb_build_object('typ', 'napraw-blad', 'tresc', 'Wybierz poprawkę we wskazanym zdaniu.', 'tekst', material, 'liczbaBledow', 1),
    array[poprawna, bledna1, bledna2], null, wyjasnienie, array[wskazowka], 'jezyk-i-forma'
  from jezyk
)
insert into private.learning_exercises (id, skill_id, level, format, prompt, answers, explanation, hints, error_type)
select z.id, z.skill_id, z.poziom, z.format,
  z.prompt || jsonb_strip_nulls(jsonb_build_object('opcje', o.opcje)),
  coalesce(z.odpowiedzi, o.odpowiedzi), z.wyjasnienie, z.wskazowki, z.error_type
from zadania z
cross join lateral (
  select jsonb_agg(jsonb_build_object('id', chr(64 + pozycja), 'tekst', opcja) order by pozycja) as opcje,
    array_agg(chr(64 + pozycja)) filter (where klucz) as odpowiedzi
  from (
    select opcja, nr = 1 as klucz, row_number() over (order by md5(z.id || opcja), nr)::int as pozycja
    from unnest(z.opcje) with ordinality as src(opcja, nr)
  ) a
) o;

-- CKE zachowuje pierwszeństwo przy remisie, a oryginalne warianty zawsze rozbudowują pulę.
create or replace function private.learning_variants(p_skill text, p_level text, p_format text)
returns table (id text, prompt jsonb, answers text[], explanation text, hints text[], error_type text)
language sql stable set search_path = '' as $$
  select * from private.cke_round_variants(p_skill, p_level) where p_format = 'szybka-runda'
  union all
  select e.id, e.prompt, e.answers, e.explanation, e.hints, e.error_type
  from private.learning_exercises e
  where e.skill_id = p_skill
    and e.level = p_level
    and e.format = case p_format when 'sokratejski' then 'szybka-runda' else p_format end;
$$;
