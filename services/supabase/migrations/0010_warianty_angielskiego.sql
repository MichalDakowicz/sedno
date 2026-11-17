-- Oryginalne ćwiczenia. Klucze są dostępne wyłącznie podczas oceny w bazie.
create table private.learning_exercises (
  id text primary key,
  skill_id text not null references private.learning_skills(id),
  level text not null check (level in ('podstawowy', 'rozszerzony', 'dwujezyczny')),
  format text not null check (format in ('szybka-runda', 'napraw-blad')),
  prompt jsonb not null,
  answers text[] not null check (cardinality(answers) > 0),
  explanation text not null,
  hints text[] not null,
  error_type text
);

create index learning_exercises_catalog on private.learning_exercises(skill_id, level, format);

-- Zestaw rozumienia tekstu i nagrania. W każdej tablicy odpowiedzi pierwszy element
-- to klucz, pozostałe to dystraktory. Publiczne identyfikatory opcji powstają niżej.
with teksty(id, level, material, q_sens, o_sens, e_sens, q_szcz, o_szcz, e_szcz, q_wn, o_wn, e_wn) as (
  values
  ('p1', 'podstawowy', 'Hi Maya, can we meet by the library at half past four? The café closes early today, and we still need somewhere to plan our trip before the bus leaves.',
   'Why is the speaker calling?', array['To suggest a meeting place','To cancel a trip','To ask how to reach a café'], 'Rozmówca proponuje bibliotekę jako miejsce spotkania.',
   'When does the speaker want to meet?', array['4:30','4:00','5:30'], '„Half past four” to 4:30.',
   'Why is the library a better choice today?', array['They will have time to plan there','It is where they buy bus tickets','The café is too far from home'], 'Kawiarnia zamyka się wcześniej, a plan wyjazdu trzeba ustalić przed odjazdem.'),
  ('p2', 'podstawowy', 'Good morning. The sports centre pool is open as usual, but the front door is being painted. Until noon, please enter through the gate next to the car park.',
   'What is the announcement about?', array['A temporary change of entrance','A change to swimming lesson times','The closure of the pool'], 'Komunikat wskazuje tymczasowe wejście.',
   'What is next to the gate?', array['The car park','A sports shop','The swimming pool'], 'Tymczasowa brama znajduje się przy parkingu.',
   'What should a swimmer arriving at ten do?', array['Use the side gate','Come back after noon','Wait for the pool to open'], 'O dziesiątej nadal obowiązuje instrukcja wejścia przez bramę.'),
  ('p3', 'podstawowy', 'I ordered a green notebook for school, but the parcel contained a blue one. I can use this one, so there is no need to send a new parcel. Please check the colours on your website.',
   'What is the speaker mainly reporting?', array['A problem with the item received','A parcel that has never arrived','A delay paying for school supplies'], 'Zamówienie dotarło, ale w niewłaściwym kolorze.',
   'What colour arrived?', array['Blue','Green','White'], 'Zielony był zamówiony, a niebieski dotarł.',
   'What does the customer’s decision tell us about the notebook?', array['Being able to use it matters more than getting the right colour','It cannot be used for school in its present condition','Getting it in green matters more than using it now'], 'Klient może korzystać z zeszytu mimo innego koloru i dlatego go zatrzyma.'),
  ('p4', 'podstawowy', 'On Saturday we can repair your bike for free in the park. Bring it before eleven, and bring any new parts it needs. We have tools, but we do not sell parts at the event.',
   'What does the speaker offer?', array['Free help fixing bikes','A bicycle race','Discounts on bicycle parts'], 'Ogłoszenie dotyczy bezpłatnych napraw.',
   'What is available at the event?', array['Tools','New parts for sale','New bikes for hire'], 'Organizatorzy mają narzędzia, lecz nie sprzedają części.',
   'What should a cyclist do if a wheel needs replacing?', array['Bring a replacement wheel','Ask to buy a wheel in the park','Wait until after eleven'], 'Kto potrzebuje nowej części, ma ją sam przynieść.'),
  ('p5', 'podstawowy', 'I left my umbrella in the music room after rehearsal. It has a yellow handle. If the room is locked, ask Mr Lane to open it. I need the umbrella for my walk home.',
   'Why is the speaker giving these instructions?', array['To get back something left behind','To organise a music rehearsal','To lend someone an umbrella'], 'Instrukcje mają pomóc w odzyskaniu parasola.',
   'What colour is the umbrella handle?', array['Yellow','Black','Red'], 'Rączka ma kolor żółty.',
   'What can we infer about Mr Lane?', array['He can get into the music room even when it is locked','He borrowed the umbrella earlier that day','He is still rehearsing in the room'], 'To do niego trzeba się zwrócić, gdy drzwi są zamknięte.'),
  ('p6', 'podstawowy', 'I’m making soup for tonight. There are plenty of potatoes in the cupboard, but we have no carrots. Mum has already bought the bread, so please stop for carrots on your way home.',
   'What does the speaker want?', array['Help getting a missing ingredient','Instructions for making bread','Someone to cook dinner instead'], 'Prośba dotyczy brakujących marchewek.',
   'What is already in the cupboard?', array['Potatoes','Carrots','Bread'], 'Ziemniaki są w szafce; chleb został kupiony, ale nie podano jego miejsca.',
   'What could happen if nobody went to the shops?', array['The speaker might need to change the soup recipe','There would be no bread to have with the soup','The potatoes would have to be returned'], 'Ziemniaki są na miejscu i chleb kupiono, ale w zupie zabraknie marchewek.'),
  ('p7', 'podstawowy', 'Your train to Westbridge is now leaving from platform five. The departure time is still 9:20. There is a lift near the ticket office if you need help reaching the platform with luggage.',
   'What does the announcement tell passengers?', array['Their platform has changed','Their train has been cancelled','Their departure time is later'], 'Zmienia się numer peronu, a czas odjazdu pozostaje ten sam.',
   'What time is the departure?', array['9:20','9:15','9:25'], 'Podany czas to 9:20.',
   'Does the change give passengers extra time to reach the station?', array['No, the departure time is unchanged','Yes, trains now leave five minutes later','Yes, passengers can take a later train on the same ticket'], 'Zmiana peronu nie oznacza zmiany godziny odjazdu.'),
  ('p8', 'podstawowy', 'I can’t join the book club online tonight because someone is fixing my internet. I’ve read the first four chapters, though. Could you send me the discussion questions so I can prepare for next week?',
   'What is the speaker doing?', array['Explaining an absence and asking for material','Choosing the next book for the club','Offering to repair a computer'], 'Rozmówca wyjaśnia nieobecność i prosi o pytania.',
   'How much of the book has the speaker read?', array['Four chapters','One chapter','The whole book'], 'Przeczytał pierwsze cztery rozdziały.',
   'Does the speaker plan to stay in the club?', array['Yes, they want to prepare for next week','No, they have stopped reading','No, they asked to cancel the next meeting'], 'Prośba o pytania służy przygotowaniu do następnego spotkania.'),
  ('r1', 'rozszerzony', 'The community garden will trial a later closing time on Thursdays. Volunteers had complained that the current timetable excludes people who work until six. The committee will review attendance in September before deciding whether to extend the change to other days.',
   'What is the main subject?', array['A trial intended to widen access','An appeal for new garden equipment','A permanent change to all opening hours'], 'Późniejsze zamknięcie jest próbą ułatwiającą dostęp.',
   'When will the committee review attendance?', array['In September','On the first Thursday','At the end of the year'], 'Jako miesiąc przeglądu podano wrzesień.',
   'What will probably matter when the committee decides what to do next?', array['Whether enough people use the later hours','How many plants survive the winter','Whether volunteers can work before six'], 'Frekwencja podczas próby ma dostarczyć danych do decyzji.'),
  ('r2', 'rozszerzony', 'The town museum has removed ticket charges from its permanent collection. Its temporary shows still need a paid reservation, partly because they borrow expensive objects from elsewhere. A donation box replaces the old ticket desk for visitors to the permanent rooms.',
   'What is the focus of the announcement?', array['Different admission rules for different collections','A fundraising campaign to buy new objects','A ban on booking temporary exhibitions'], 'Stała i czasowa ekspozycja mają różne zasady wstępu.',
   'What replaced the old ticket desk for the permanent rooms?', array['A donation box','A booking machine','An information screen'], 'Przewidziano puszkę na dobrowolne wpłaty.',
   'What can a visitor with no reservation and no budget do?', array['Visit the permanent collection','See any temporary show','Enter only if a borrowed object is returned'], 'Bezpłatny dostęp obejmuje kolekcję stałą.'),
  ('r3', 'rozszerzony', 'The theatre will sell a limited number of rehearsal seats at half price. People who take up the offer should expect occasional stops while the director gives instructions. Tickets for the opening night still include a short talk with the cast after the performance.',
   'What is the main purpose?', array['To explain an alternative to a regular theatre visit','To announce that opening night has been postponed','To recruit participants for a theatre course'], 'Opisano możliwość oglądania próby po obniżonej cenie.',
   'What is included on opening night?', array['A conversation with the cast','A seat at a rehearsal','A programme signed by the director'], 'Widz może wysłuchać rozmowy z obsadą.',
   'Who is the rehearsal offer best suited to?', array['Someone interested in seeing how a production takes shape','Someone who wants a guaranteed uninterrupted performance','Someone whose priority is a talk with the cast'], 'Przerwy na instrukcje pokazują pracę zespołu nad spektaklem.'),
  ('r4', 'rozszerzony', 'The library expected its new app to reduce queues, but demand for help with logins kept the desk busier than before. It now offers fifteen-minute drop-in sessions for anyone setting up an account. Borrowers can still use their existing cards at self-service machines.',
   'What is the main point?', array['A new service produced unexpected demand for support','Self-service borrowing has been withdrawn','Library memberships now expire sooner'], 'Wprowadzenie aplikacji nie zmniejszyło liczby wizyt przy stanowisku z powodu pytań o logowanie.',
   'How long is a drop-in session?', array['Fifteen minutes','Ten minutes','Thirty minutes'], 'Pojedyncze spotkanie przewidziano na piętnaście minut.',
   'What can borrowers do if they prefer not to set up the app?', array['Keep borrowing with their cards','Use the app without logging in','Wait until the library reopens'], 'Dotychczasowe karty nadal działają w automatach.'),
  ('r5', 'rozszerzony', 'Last spring the café switched entirely to reusable containers. Customers liked the scheme, but many forgot to bring the containers back. The owner has now introduced a small refundable deposit rather than restoring disposable packaging.',
   'What change is being described?', array['An incentive to return reusable containers','A reduction in lunch prices','A move back to disposable packaging'], 'Zwrot kaucji ma zachęcić do oddania pojemnika.',
   'What was the initial problem?', array['People often failed to return containers','People refused to pay a deposit','The café could not clean the packaging'], 'Na początku klienci często zapominali o zwrotach.',
   'What probably happens when someone brings a container back?', array['They can recover the deposit','They have to buy another meal','They receive a disposable container'], 'Kaucja jest zwrotna, więc oddanie pojemnika pozwala ją odzyskać.'),
  ('r6', 'rozszerzony', 'Participants in the river survey once had to estimate water depth by eye. This year the coordinator has lent out identical measuring rods and asked each team to take its reading at the same time. In the past, teams working an hour apart sometimes reported very different depths.',
   'What is the topic?', array['Making survey measurements comparable','Reducing the number of survey volunteers','Restoring the river to its original depth'], 'Ujednolicono narzędzia i porę pomiaru.',
   'What equipment was lent out?', array['Measuring rods','Water pumps','Protective boots'], 'Koordynator udostępnił jednakowe miarki.',
   'Why was the timing rule introduced?', array['Depth may vary between readings taken at different times','The rods need an hour to dry','Teams had been reporting from the wrong river'], 'Odczyty z odległych godzin często znacznie się różniły.'),
  ('r7', 'rozszerzony', 'A local orchestra advertised a concert for families new to classical music. It kept the programme short and printed explanations in plain language. When seats ran out, the organiser put the same musicians in a second performance on the following afternoon.',
   'What is the main focus?', array['An accessible concert and the response to demand','A competition for young musicians','An orchestra replacing its performers'], 'Przystępny koncert przyciągnął więcej chętnych niż przewidziano.',
   'How did the programme describe the music?', array['In plain language','In a second language only','In a separate mobile app'], 'Wyjaśnienia napisano prostym językiem.',
   'Why did the organiser schedule another concert?', array['The first concert had no seats left','The musicians needed more time to prepare','Families had complained about the length of the programme'], 'Drugi występ zorganizowano po wyczerpaniu miejsc.'),
  ('r8', 'rozszerzony', 'At first the maker offered replacement lids for the bottles only in an online shop. That meant paying for delivery, even though the lid itself cost little. From Monday, people will be able to collect prepaid lids at two partner shops after receiving a collection email.',
   'What is being introduced?', array['Another way to obtain a spare part','A new type of bottle with a fixed lid','A repair service available by phone'], 'Nowa możliwość to odbiór opłaconej nakrętki w sklepie.',
   'What should customers wait for before collecting a lid?', array['A collection email','A new invoice by post','A phone call from the maker'], 'O gotowości odbioru informuje wiadomość e-mail.',
   'Which difficulty does the new arrangement address?', array['The extra cost of having a small part delivered','The poor quality of replacement lids','The need to visit a shop to pay for the part'], 'Odbiór eliminuje konieczność zamawiania dostawy.'),
  ('d1', 'dwujezyczny', 'An attendance dashboard initially made the evening bus look expendable. The few passengers, however, included hospital staff whose shifts ended after the last suggested alternative. The council kept the route on a smaller vehicle while gathering information about hours worked, which the dashboard had never captured.',
   'Which idea best captures the account?', array['A superficially sensible cut overlooked a constraint faced by users','A council concealed passenger figures to justify a larger fleet','Hospital staff asked for a bus whose route had never existed'], 'Sama frekwencja nie pokazywała, że części pasażerów brakuje alternatywy.',
   'What immediate change did the council make?', array['It kept the service but used a smaller vehicle','It sent the bus to a different hospital','It replaced the bus with the proposed service'], 'Kurs pozostał, lecz skierowano na niego mniejszy pojazd.',
   'What would best address the blind spot in the dashboard?', array['Data on when passengers actually become free to travel','A more colourful chart of overall passenger totals','A record of how many vehicles the council owns'], 'Godziny kończenia zmian mówią, czy inny kurs jest użyteczny.'),
  ('d2', 'dwujezyczny', 'Specialists praised the archive’s searchable newspaper transcripts, as did researchers who lived far away. Yet editors had corrected recognisable places more often than short-lived businesses. The director released confidence flags and invited readers to submit images of disputed passages before contributing any corrections.',
   'Which tension underpins the account?', array['An access improvement exposes gaps in the reliability of results','Digital copies prevent researchers from sharing discoveries','Business names are more important to a newspaper than place names'], 'Cyfrowy dostęp jest szerszy, lecz korekta zapisów była nierównomierna.',
   'What may a reader be asked to provide for a dispute?', array['An image of the passage','An address of a surviving business','A note from the newspaper editor'], 'Dyrektor prosi o obrazy spornych fragmentów.',
   'Which research claim deserves particular caution?', array['An unreturned search proves a short-lived business was never mentioned','Researchers can consult the transcripts outside the archive','Some recognisable place names have been corrected'], 'Brak wyniku może wynikać z błędu transkrypcji nazwy firmy.'),
  ('d3', 'dwujezyczny', 'The review panel praised the scheme’s forecast savings, then found that the comparison treated essential repairs as costs borne only by the existing scheme. It requested a second comparison in which both schemes assumed upkeep. The alternative might still be cheaper, the chair observed, but the published gap could not establish that.',
   'What is chiefly criticised?', array['An uneven assumption made in comparing two options','The existence of repair costs in either scheme','The fact that the chair allowed a second comparison'], 'Porównanie obciąża kosztami utrzymania tylko jedną stronę.',
   'What did the panel request?', array['A comparison accounting for upkeep on both sides','Immediate withdrawal of the alternative','A detailed schedule of essential repairs only'], 'Druga analiza ma uwzględnić utrzymanie w obu rozwiązaniach.',
   'Which claim is consistent with the chair’s view?', array['The alternative’s advantage remains possible but unproven','Both schemes necessarily cost the same','Repair costs cannot influence the comparison'], 'Przewodniczący oddziela możliwy wynik od tego, co wykazano.'),
  ('d4', 'dwujezyczny', 'A shared studio marked every shelf with colour codes, dramatically reducing the time regular members spent searching. New members, however, had been relying on the original labels when deciding where an unfamiliar tool belonged. The studio kept the colours and restored a short text label beside each one.',
   'What does the example illustrate?', array['An efficiency gain can depend on prior knowledge','Written labels always make tools harder to find','New studio members opposed sharing equipment'], 'Kolory przyspieszyły pracę ludziom znającym system, nowi potrzebowali opisów.',
   'What was the final arrangement?', array['Colour codes alongside short labels','Labels restored in place of all colour codes','Labels visible only to people with longer memberships'], 'Zachowano kody kolorystyczne i przywrócono podpisy.',
   'What problem would a first-time visitor have had under the colour-only system?', array['Knowing what a colour signified for an unfamiliar item','Finding any room in which tools were kept','Recognising that other people also used the studio'], 'Kolor skraca drogę tylko po poznaniu tego, co oznacza.'),
  ('d5', 'dwujezyczny', 'A coastal town invited residents to vote on the locations of drinking fountains. The map placed the most votes in the historic centre; observers noticed that the paper forms were stocked exclusively there. A second round distributed forms in outlying neighbourhoods before spending was committed.',
   'Which issue is central?', array['How the way a survey is distributed can affect its result','Why paper forms are always preferable to a digital survey','How the historic centre lost all its proposed fountains'], 'Pierwszy rozkład głosów mógł wynikać z dostępności formularzy.',
   'Which action had the town deferred?', array['Committing the spending','Printing the second set of forms','Putting locations on a map'], 'Drugą rundę przeprowadzono przed podjęciem wydatków.',
   'Why is the first result an incomplete guide to priorities?', array['Residents outside the centre had less access to paper forms','People in the centre voted more than once','Votes for the centre were excluded from the map'], 'Pominięcie osiedli w dystrybucji ogranicza reprezentatywność, bez dowodu na fałszywe głosy.'),
  ('d6', 'dwujezyczny', 'A publisher offered reporters a bonus for issuing corrections promptly. Publication speed improved, but uncertain articles started to contain fewer provisional claims in the first place. Managers had expected the change to influence the handling of mistakes; interviews suggested it was also altering decisions before publication.',
   'What is the main point?', array['An incentive shaped behaviour earlier than its designers expected','Quick corrections encouraged reporters to publish more guesses','Editors hid mistakes after abolishing performance bonuses'], 'Premia wpłynęła także na decyzje o pierwotnej treści.',
   'What changed in uncertain articles?', array['They contained fewer provisional claims','They reached readers later','They named fewer reporters'], 'Liczba twierdzeń wstępnych spadła.',
   'Which evidence most directly identifies the unexpected effect?', array['Accounts of decision-making before articles appeared','The faster publication of corrections alone','Knowing the total value of the bonus'], 'Wywiady pozwoliły uchwycić zachowanie przed publikacją artykułów.'),
  ('d7', 'dwujezyczny', 'On crowded days a gallery used the average time visitors spent inside as a sign of engagement. A curator pointed out that a narrow staircase forced people into a slow queue near the exit. For the next month the assistant recorded time in the rooms separately from time waiting to leave.',
   'Which idea ties the account together?', array['A metric can reflect an obstacle rather than the behaviour it is meant to measure','A shorter visit always indicates dissatisfaction with the exhibition','A staircase is the only reliable place to assess a gallery’s appeal'], 'Długość wizyty zależała też od oczekiwania na wyjście.',
   'What did the assistant record separately?', array['Time in rooms and time waiting to leave','Time at different exhibits and the number of tickets sold','Time entering the gallery and time buying souvenirs'], 'Rozdzielono zwiedzanie od kolejki przy wyjściu.',
   'If total visit time rose while time in rooms stayed the same, what is the strongest inference?', array['The rise alone would show little about the exhibition’s appeal','Visitors definitely studied each item more carefully','The rooms must have become less crowded'], 'Sam wzrost łącznego czasu może wynikać z kolejki.'),
  ('d8', 'dwujezyczny', 'The repair group was asked to double the number of items it processed. Volunteers reported that they could do so by selecting small, harmless faults first, though people with more serious faults would then wait longer. The coordinator began publishing both throughput and the age of the outstanding jobs.',
   'What is the account mainly about?', array['A target can create an incentive that undermines another goal','Processing fewer items always increases customer satisfaction','Small faults were previously impossible to repair'], 'Premiowanie liczby napraw może pogorszyć dostęp dla osób z trudniejszymi usterkami.',
   'What additional information began appearing in reports?', array['How long outstanding jobs had been waiting','The resale price of repaired items','Which volunteers requested the target'], 'Raporty pokazują także wiek zleceń bez zakończenia.',
   'What does the new reporting help identify?', array['Whether older work is neglected while totals rise','Which faults are easiest to repair at home','Whether every customer requests the same type of item'], 'Oba wskaźniki razem pokazują, czy wzrost liczby napraw odbywa się kosztem zalegających zleceń.')
), warianty as (
  select tryb || '-' || teksty.id || '-' || q.skill as id, tryb || '-' || q.skill as skill_id, level,
    q.question, material, tryb, q.options, q.explanation, q.hints
  from teksty
  cross join (values ('czytanie'), ('sluchanie')) as formy(tryb)
  cross join lateral (values
    ('sens', q_sens, o_sens, e_sens, array['Ustal, po co powstała cała wypowiedź.', 'Sprawdź, które zdanie łączy najważniejsze informacje.']),
    ('szczegoly', q_szcz, o_szcz, e_szcz, array['Zwróć uwagę na nazwę, liczbę lub czynność, o którą pyta pytanie.', 'Porównaj szczegół z właściwym fragmentem wypowiedzi.']),
    ('wnioskowanie', q_wn, o_wn, e_wn, array['Połącz dwie informacje z wypowiedzi.', 'Odrzuć wnioski, do których potrzebne są dodatkowe założenia.'])
  ) as q(skill, question, options, explanation, hints)
)
insert into private.learning_exercises (id, skill_id, level, format, prompt, answers, explanation, hints)
select w.id, skill_id, level, 'szybka-runda',
  jsonb_build_object('typ', 'wybor', 'tresc', question, 'opcje', o.options)
    || case when tryb = 'czytanie' then jsonb_build_object('tekst', material)
      else jsonb_build_object('audioTekst', material, 'audioJezyk', 'en-GB') end,
  o.answers, explanation, hints
from warianty w
cross join lateral (
  select jsonb_agg(jsonb_build_object('id', chr(64 + position), 'tekst', opt) order by position) as options,
    array_agg(chr(64 + position)) filter (where is_answer) as answers
  from (
    select opt, ord = 1 as is_answer, row_number() over (order by md5(w.id || opt), ord)::int as position
    from unnest(w.options) with ordinality as src(opt, ord)
  ) a
) o;

-- Luki oraz poprawki z osobnymi zdaniami dla ćwiczenia i rozpoznawania błędu.
with jezyk(id, level, instruction, gap, accepted, work, repair, d1, d2, explanation, hint) as (
  values
  ('p1','podstawowy','Wstaw właściwą formę czasownika be.','They ___ at the station an hour ago.',array['were'],
   'Lena and Max was at the station an hour ago. The next train had already left.','was → were · gramatyka','was → is · gramatyka','station → school · słownictwo','Czasownik be w czasie przeszłym ma przy podmiocie w liczbie mnogiej formę were.','Ustal liczbę podmiotu i czas, którego dotyczy zdanie.'),
  ('p2','podstawowy','Wstaw właściwą formę czasownika go.','Yesterday we ___ to the park.',array['went'],
   'Yesterday I goed to the market. I bought some bread.','goed → went · gramatyka','goed → gone · gramatyka','market → shop · słownictwo','Czas przeszły od go ma nieregularną formę went.','Wydarzenie jest zakończone. Sprawdź, czy czasownik jest regularny.'),
  ('p3','podstawowy','Wstaw some albo any.','There aren’t ___ eggs in the fridge.',array['any'],
   'We don’t have some clean glasses. Could you wash two?','some → any · gramatyka','some → a · gramatyka','clean → tall · słownictwo','Po przeczeniu typowy wybór to any.','Zwróć uwagę, czy w zdaniu jest przeczenie.'),
  ('p4','podstawowy','Wstaw do albo does.','Where ___ your sister work?',array['does'],
   'Where do Nina work? Her phone is switched off.','do → does · gramatyka','do → doing · gramatyka','off → down · słownictwo','W pytaniu w present simple dla trzeciej osoby liczby pojedynczej używamy does.','Sprawdź osobę podmiotu w zdaniu pytającym.'),
  ('p5','podstawowy','Wstaw in, on albo at.','The bus leaves ___ seven o’clock.',array['at'],
   'Meet me in six o’clock. We can have dinner after the film.','in → at · gramatyka','in → on · gramatyka','after → during · słownictwo','Przed konkretną godziną wstawiamy at.','Sprawdź, czy wyrażenie oznacza godzinę, dzień czy dłuższy okres.'),
  ('p6','podstawowy','Wstaw stopień wyższy przymiotnika easy.','The first puzzle is ___ than the second.',array['easier'],
   'My new job is easyer than my old one. I have more time for lunch now.','easyer → easier · gramatyka','easyer → easiest · gramatyka','lunch → dinner · słownictwo','W tej formie końcowe y zamienia się na i przed -er.','Słowo than sygnalizuje porównanie dwóch rzeczy.'),
  ('p7','podstawowy','Wstaw a albo an.','Can I borrow ___ umbrella?',array['an'],
   'I saw a owl near the bus stop. It stayed there until morning.','a → an · gramatyka','a → some · gramatyka','owl → eagle · słownictwo','Przed wyrazem rozpoczynającym się od dźwięku samogłoski użyj an.','Liczy się pierwszy dźwięk wyrazu po przedimku.'),
  ('p8','podstawowy','Wstaw formę czasownika study pasującą do zdania.','Marta usually ___ after dinner.',array['studies'],
   'My brother study English after dinner. He also reads short stories.','study → studies · gramatyka','study → studying · gramatyka','short → small · słownictwo','Przy trzeciej osobie liczby pojedynczej study przechodzi w studies.','W zdaniu opisano zwyczaj jednej osoby.'),
  ('r1','rozszerzony','Uzupełnij zdanie formą czasownika live z since.','I ___ here since 2018 and I have no plans to leave.',array['have lived','have been living'],
   'I know Jo since 2018. We still meet every Thursday.','know → have known · gramatyka','know → knew · gramatyka','every → all · słownictwo','Since podaje moment rozpoczęcia stanu, który nadal trwa, więc potrzebne jest present perfect.','Ustal, czy opis trwa do chwili mówienia.'),
  ('r2','rozszerzony','Wstaw formę czasownika book w zdaniu o nierealnej przeszłości. Użyj would.','If we had checked the date, we ___ the right tickets.',array['would have booked'],
   'If the bus had arrived on time, we would catch the train yesterday. In fact, we missed it.','would catch → would have caught · gramatyka','would catch → will have caught · gramatyka','missed → took · słownictwo','Wynik nierzeczywistego zdarzenia w przeszłości ma formę would have z imiesłowem.','Porównaj czas zdarzenia z czasem jego hipotetycznego skutku.'),
  ('r3','rozszerzony','Użyj czasownika send w stronie biernej.','The invitations ___ yesterday by the organisers.',array['were sent'],
   'Both invitations was sent yesterday. The guests got them this morning.','was sent → were sent · gramatyka','was sent → have send · gramatyka','got → gave · słownictwo','W past simple w stronie biernej liczba mnoga wymaga were + imiesłów.','Podmiot wskazuje odbiorcę działania, a nie wykonawcę.'),
  ('r4','rozszerzony','Wybierz borrow albo lend.','Could you ___ me a charger until the end of class?',array['lend'],
   'Could I lend your charger until the end of class? My phone has died.','lend → borrow · słownictwo','lend → borrow from · słownictwo','died → dead · gramatyka','Borrow opisuje czynność biorącego, lend czynność dającego.','Ustal, czy osoba chwilowo bierze przedmiot, czy go komuś daje.'),
  ('r5','rozszerzony','Przekształć turn na formę wymaganą przez zdanie.','Would you mind ___ the music down?',array['turning'],
   'Would you mind to close the window? The traffic is quite loud.','to close → closing · gramatyka','to close → closed · gramatyka','loud → aloud · słownictwo','Po mind w uprzejmej prośbie użyj formy z -ing.','Sprawdź, jakiej formy drugiego czasownika wymaga mind.'),
  ('r6','rozszerzony','Wstaw make w formie czasu pasującego do zdania.','The engineers have already ___ several changes.',array['made'],
   'The builders did a serious mistake when measuring the doorway. They corrected it before painting.','did → made · słownictwo','did → have make · gramatyka','serious → seriously · gramatyka','Make występuje m.in. w stałych połączeniach make a change oraz make a mistake.','Zastanów się, który czasownik naturalnie łączy się z rzeczownikiem.'),
  ('r7','rozszerzony','Wstaw despite albo although.','___ the heavy rain, the match went ahead.',array['despite'],
   'Although the bad weather, we finished the route before dusk. Our shoes were soaked.','Although → Despite · gramatyka','Although → Even though · gramatyka','dusk → sun · słownictwo','Po despite może wystąpić grupa rzeczownikowa, a although wprowadza zdanie.','Sprawdź, czy po spójniku jest podmiot z orzeczeniem.'),
  ('r8','rozszerzony','Wstaw właściwy zaimek względny oznaczający relację posiadania.','The neighbour ___ bike was stolen called the police.',array['whose'],
   'The neighbour which bike was stolen called the police. He had locked it outside.','which → whose · gramatyka','which → who · gramatyka','stolen → robbed · słownictwo','Whose wskazuje, do kogo należał rower.','Sprawdź, czy brakuje zaimka wskazującego osobę czy właściciela przedmiotu.'),
  ('d1','dwujezyczny','Zachowaj inwersję po przestawieniu okolicznika. Użyj discover i czasu past simple. Przemawia grupa („we”).','Not until we reached the end of the trail ___ that the bridge was closed.',array['did we discover'],
   'Not until I opened the parcel I noticed the damage. By then, the courier had gone.','I noticed → did I notice · gramatyka','I noticed → had I notice · gramatyka','the parcel → a parcel · treść','Po Not until na początku zdania występuje inwersja z operatorem.','Gdzie w zdaniu głównym powinien znaleźć się operator do?'),
  ('d2','dwujezyczny','Uzupełnij lukę bezokolicznikiem dokonanym od leave z to.','The apprentices appear ___ the workshop before the inventory began.',array['to have left'],
   'The suspect is believed to leave the building before the alarm sounded. The police are reviewing old footage.','to leave → to have left · gramatyka','to leave → to have leave · gramatyka','old → older · słownictwo','Bezokolicznik dokonany wskazuje czynność wcześniejszą niż obecny stan wiedzy lub wrażenie.','Porównaj moment zdarzenia z momentem, w którym ktoś formułuje opinię.'),
  ('d3','dwujezyczny','Uzupełnij konstrukcję inwersji warunkowej używanej do opisania możliwej sytuacji.','___ the supplier fail to deliver, we will contact a second firm.',array['should'],
   'Should the shipment fails to arrive, please notify the office. We have a backup supplier.','fails → fail · gramatyka','fails → failing · gramatyka','notify → notification · gramatyka','Warunkowe Should w pozycji początkowej wymaga podstawowej formy czasownika.','Potraktuj wyraz na początku jako czasownik modalny.'),
  ('d4','dwujezyczny','Uzupełnij stałe połączenie cast z przyimkiem.','The contradictory testimony cast doubt ___ the original account.',array['on','upon'],
   'The missing receipt cast doubt for the account given by the witness. The panel requested more evidence.','for → on · słownictwo','for → by · słownictwo','given → giving · gramatyka','Cast doubt on lub upon to stałe połączenie oznaczające poddawanie w wątpliwość.','Szukaj typowego połączenia po rzeczowniku doubt.'),
  ('d5','dwujezyczny','Użyj biernej formy czasownika review po mandative subjunctive.','The panel demanded that the decision ___ before Friday.',array['be reviewed','should be reviewed'],
   'The panel demanded that the decision be review by Friday. Every member agreed to return then.','be review → be reviewed · gramatyka','be review → been reviewed · gramatyka','every member → all members · styl','Po demanded that można użyć be + imiesłów albo should be + imiesłów.','Ustal, która forma bierna pojawi się po podstawowej formie be.'),
  ('d6','dwujezyczny','Wstaw formę dokonaną czasownika say po deny.','She denied ___ the words before the meeting.',array['having said'],
   'The director denied to have approved the final version. The note on the desk was still unsigned.','to have approved → having approved · gramatyka','to have approved → to approving · gramatyka','unsigned → unsign · słownictwo','Deny łączy się z formą -ing, tutaj dokonaną, bo rzekoma czynność była wcześniejsza.','Rozważ formę z -ing i jej odmianę dla zdarzenia wcześniejszego.'),
  ('d7','dwujezyczny','Wstaw w konstrukcji przyzwalającej formę czasownika seem.','Odd as it may ___, nobody checked whether the door was locked.',array['seem'],
   'Odd as it may seems, the alarm had attracted no attention. The caretaker heard it only later.','seems → seem · gramatyka','seems → seeming · gramatyka','attracted → attraction · słownictwo','Po may pozostaje podstawowa forma czasownika także w konstrukcji Odd as it may seem.','Czym jest may i jaką formę czasownika zwykle po nim stawiamy?'),
  ('d8','dwujezyczny','Wstaw słowo z rodziny settle tworzące rzeczownik pasujący do zdania.','After months of negotiation, both parties reached a ___.',array['settlement'],
   'Both parties reached a settling after months of negotiation. The lawyers signed it the following morning.','settling → settlement · słownictwo','settling → settle · gramatyka','signed → written · słownictwo','Reach a settlement oznacza dojść do ugody; potrzebny jest utrwalony rzeczownik settlement.','Szukaj nazwy uzgodnionego rozwiązania, a nie nazwy czynności.')
), warianty as (
  select 'jezyk-runda-' || id, 'srodki-jezykowe', level, 'szybka-runda',
    jsonb_build_object('typ', 'luka', 'tresc', instruction, 'tekst', gap),
    accepted, explanation, array[hint], null::text
  from jezyk
  union all
  select 'jezyk-napraw-' || j.id, 'srodki-jezykowe', level, 'napraw-blad',
    jsonb_build_object('typ', 'napraw-blad', 'tresc', 'Zidentyfikuj błąd i wybierz poprawkę z właściwą kategorią.',
      'tekst', work, 'liczbaBledow', 1, 'opcje', o.options),
    o.answers, explanation, array['Przyjrzyj się pierwszemu zdaniu.', hint], 'jezyk-i-forma'
  from jezyk j
  cross join lateral (
    select jsonb_agg(jsonb_build_object('id', chr(64 + position), 'tekst', opt) order by position) as options,
      array_agg(chr(64 + position)) filter (where is_answer) as answers
    from (
      select opt, ord = 1 as is_answer, row_number() over (order by md5(j.id || opt), ord)::int as position
      from unnest(array[j.repair, j.d1, j.d2]) with ordinality as src(opt, ord)
    ) a
  ) o
)
insert into private.learning_exercises (id, skill_id, level, format, prompt, answers, explanation, hints, error_type)
select * from warianty;

with spoj(id, level, context, correct, d1, d2, explanation) as (
  values
  ('p1','podstawowy','Sara bought a pair of shoes online. [___] The shop sent her a larger pair the next day.','They were too small, so she asked to exchange them.','Her school has a new sports teacher.','She lent them to her sister, who liked them.','Wymiana na większe buty ma sens po informacji, że pierwsze były za małe.'),
  ('p2','podstawowy','Sam took a cake out of the oven. [___] When it was cool, he put chocolate on top.','He left it on the table for half an hour.','He ate it all while it was hot.','He put a second cake in the oven.','Brakuje kroku, podczas którego pierwsze ciasto stygnie.'),
  ('p3','podstawowy','I could hear my phone ringing. [___] Then I remembered putting it in my coat pocket.','I looked on the desk, but it was not there.','I answered it and ended the call at once.','My coat was still at the dry cleaner’s.','„It” to telefon, a wzmianka o kieszeni kończy opis poszukiwań.'),
  ('p4','podstawowy','Everyone arrived at school in their sports clothes. [___] Instead, the classes played indoor games.','Heavy rain made it impossible to hold the races outside.','The sun was shining on the school field.','Everyone finished the races in record time.','„Instead” zapowiada zastąpienie wyścigów zabawami w budynku.'),
  ('p5','podstawowy','There was only one seat left on the bus. [___] It made her journey much easier.','I let the woman with the heavy bags sit there.','The driver made everyone get off the bus.','I carried the bags to the bus stop yesterday.','„There” odnosi się do miejsca, a „her” do kobiety z torbami.'),
  ('p6','podstawowy','The class planted six young trees in April. [___] By June, all six were growing well.','The pupils watered them twice a week.','No one had space to plant even one tree.','The class sold all the trees before planting time.','Regularna pielęgnacja łączy sadzenie z udanym wzrostem.'),
  ('p7','podstawowy','Oli needed a costume for the school play. [___] At the show, everyone thought the hat looked real.','He cut a tall hat out of an old cardboard box.','He bought tickets for a film.','He wore his usual clothes and left his hat at home.','Brakuje informacji o powstaniu kapelusza, do którego wraca zdanie końcowe.'),
  ('p8','podstawowy','My aunt had promised to teach me to cook rice. [___] I tried the method on my own the next evening.','She showed me how much water to add.','I prefer the soup sold at our local shop.','She left before we could start.','„The method” odsyła do pokazanej wcześniej techniki.'),
  ('r1','rozszerzony','The volunteers initially offered appointments on weekdays. [___] As a result, the Saturday sessions filled within a few hours.','They added a weekend option for people unable to visit on weekdays.','They decided that only weekday bookings would be accepted.','They reported that weekday visitors rarely needed help.','„As a result” łączy uruchomienie nowej opcji z dużym zainteresowaniem.'),
  ('r2','rozszerzony','Some readers treated the new edition as a simple reprint. [___] It also provides a timeline based on letters recovered last year.','In fact, it includes a previously unpublished opening chapter.','The first edition rarely appears in second-hand shops.','The publisher has decided to stop selling books online.','„Also” dodaje kolejną nowość do niepublikowanego wcześniej rozdziału.'),
  ('r3','rozszerzony','The shop’s biggest customer wanted shorter delivery times. [___] Neither proposal required the shop to hire extra drivers.','The manager suggested changing the route or using a local collection point.','The manager bought a van that could carry more parcels.','The customer eventually opened a second account.','„Neither proposal” wymaga dwóch konkretnych propozycji.'),
  ('r4','rozszerzony','The team replaced paper slips with text messages to prevent lost reminders. [___] A volunteer now calls anyone whose number cannot receive a message.','However, several members turn out to have landlines only.','Consequently, every member received the first message.','Similarly, the team ordered more paper slips yesterday.','Kontrast i późniejsze telefony wynikają z braku numerów obsługujących SMS.'),
  ('r5','rozszerzony','At first the club kept its equipment in one building. [___] This arrangement means that fewer people have to cross the city to borrow it.','It now keeps smaller collections at three branches.','It later found the building’s oldest key in a drawer.','It reserved the whole stock for visitors from outside the city.','„This arrangement” dotyczy rozproszenia sprzętu między oddziałami.'),
  ('r6','rozszerzony','The first workshop was intended for complete beginners. [___] For that reason, a separate class is now available for people who can already sew.','Several participants had skipped parts of the explanation because they knew the basics.','The instructor had never hired a room before.','No one in the group had ever touched a sewing machine.','Doświadczeni uczestnicy potrzebowali klasy na innym poziomie.'),
  ('r7','rozszerzony','Recycled notebooks cost the society more than expected. [___] To cover that difference, the society agreed to raise the price by ten pence.','Each one now costs ten pence more to produce than the standard version.','Sales were lower, although the unit cost did not change.','The order already included ten extra books at no extra charge.','„That difference” odnosi się do podanej różnicy w koszcie sztuki.'),
  ('r8','rozszerzony','The team offered to deliver the repaired chair on Friday. [___] Since I am working from home that day, I accepted the second offer.','When I said I would be away, they suggested Monday instead.','I paid in advance and asked for the receipt.','They confirmed there were no other delivery dates.','„That day” i „the second offer” wymagają wskazania drugiego terminu.'),
  ('d1','dwujezyczny','One study linked bus frequency to higher employment in the outer districts. [___] It therefore cannot establish what would happen if frequency changed on the same routes.','Its comparison, however, was between different districts at one moment in time.','The researchers subsequently ran a controlled trial on those routes.','The districts with most buses also recorded the highest ridership.','Wniosek o braku wiedzy o zmianie w czasie wynika z porównania przekrojowego.'),
  ('d2','dwujezyczny','The policy was praised for ending a cumbersome application form. [___] What disappeared from view had simply reappeared later in the process.','At interview, staff still asked applicants to supply the same documentation.','Applicants no longer needed to provide any paperwork.','The form had always been available in two languages.','Drugie miejsce występowania tych samych dokumentów uzasadnia metaforę znikania i powrotu.'),
  ('d3','dwujezyczny','The director prefers to hire assistants who can challenge a plan. [___] In other words, their criticism is valuable only if colleagues can act on it.','She asks them to follow each objection with a workable alternative.','She once hired two assistants who had trained abroad.','She has considered reducing the number of people in each meeting.','„In other words” parafrazuje wymóg podania wykonalnej alternatywy.'),
  ('d4','dwujezyczny','The long walk to the new depot seemed a minor inconvenience to office staff. [___] Those workers consequently had less time to change and prepare before their shifts.','Warehouse staff, by contrast, had to cover it carrying tools and protective gear.','Office staff found that the new building offered better lighting.','An architect suggested renaming the depot after a local figure.','Kontrast identyfikuje osoby, dla których dojście było większym obciążeniem.'),
  ('d5','dwujezyczny','The report describes the staff meetings as consultation. [___] This absence makes it hard to tell whether the process affected the final decision.','It gives no examples of a concern raised in a meeting changing any part of the proposal.','The meetings were usually booked for Tuesday afternoons.','The final decision was announced after a meeting with several supervisors.','„This absence” odnosi się do braku udokumentowanego wpływu.'),
  ('d6','dwujezyczny','The technician cloned the faulty drive before attempting a repair. [___] This precaution let her return to the original state when the first attempt failed.','She ran the repair on the duplicate and left the original untouched.','The owner explained that he had lost a different drive last year.','She immediately discarded the duplicate and rewrote the original.','Powrót do stanu początkowego był możliwy dzięki pracy na kopii.'),
  ('d7','dwujezyczny','An agent can quote the wording of the contract to reassure a customer. [___] In the latter case, that reassurance may be worse than silence.','The clause may genuinely cover the customer’s situation, or it may merely sound relevant out of context.','Some agents prefer to use email because it leaves a record.','A copy of the contract is available on the website.','„The latter case” odsyła do drugiej z dwóch wymienionych możliwości.'),
  ('d8','dwujezyczny','The old index was incomplete but its omissions were predictable. [___] Users could therefore no longer rely on the old shortcuts when checking that a name was absent.','The revised index covered more material, yet its gaps fell in different, undocumented places.','The index was reprinted without a single alteration.','The oldest references were always written by hand.','Zmiana rodzaju pominięć odbiera użytkownikom podstawę dawnych metod sprawdzania.')
), pis(id, level, instruction, correct, d1, d2, explanation) as (
  values
  ('p1','podstawowy','Do koleżanki: przeproś za spóźnienie i wyjaśnij jego powód.','Sorry I’m late. I missed the bus.','Sorry I’m late. I can drive you home.','I missed the bus. Are you busy tomorrow?', 'Tylko ta odpowiedź jednocześnie przeprasza i podaje powód.'),
  ('p2','podstawowy','W wiadomości do gospodarza: powiedz, kiedy przyjedziesz i poproś o adres.','I’ll arrive on Sunday at noon. Could you send me your address?','Could you send me your address? I liked the photos.','I’ll arrive on Sunday at noon. Thanks for sending the address.', 'Podano termin i poproszono o adres.'),
  ('p3','podstawowy','Zaproś kolegę na spotkanie w parku jutro po szkole.','Would you like to meet in the park tomorrow after school?','Would you like to meet in the park next month?','Let’s wait at school tomorrow morning.', 'Zaproszenie uwzględnia miejsce oraz porę z polecenia.'),
  ('p4','podstawowy','W nieformalnym e-mailu zakończ prośbą o szybką odpowiedź.','Write back soon!','Thank you for coming last week.','I’m writing to tell you about my holiday.', '„Write back soon” odnosi się wprost do czasu odpowiedzi.'),
  ('p5','podstawowy','Podziękuj koleżance za książkę i powiedz, co ci się w niej podoba.','Thanks for the book! I love the illustrations.','Could I borrow a book with nice illustrations?','Thanks for the book! I’ll read it next month.', 'Po podziękowaniu wskazano konkretną zaletę.'),
  ('p6','podstawowy','Wróciłeś z wyjazdu wczoraj. Napisz, czego się tam nauczyłeś.','I got back yesterday and learnt how to paddle a canoe on the trip.','I got back yesterday, but I’ll learn to paddle next summer.','I’ll come back tomorrow and tell you everything then.', 'Zdanie wskazuje datę powrotu oraz nabytą umiejętność.'),
  ('p7','podstawowy','Proponowany termin koliduje z treningiem. Uprzejmie zaproponuj inną godzinę.','I have training then. Could we meet at six instead?','I have training then. Thanks for letting me know.','Could we meet at the same time in the same place?', 'Zdanie podaje powód i inną godzinę.'),
  ('p8','podstawowy','Zaleciłeś film koledze. Uzasadnij polecenie bez zdradzania zakończenia.','I think you’ll enjoy the funny dialogue and the music.','It ends with the detective admitting the theft.','When are you going to the cinema?', 'Uzasadnienie opisuje walory bez podawania finału.'),
  ('r1','rozszerzony','W formalnej reklamacji zgłoś brak zamówionego podręcznika i poproś o zwrot pieniędzy.','The textbook was missing from the parcel. I would be grateful if you could issue a refund.','The textbook was missing, so please send a replacement immediately.','I would be grateful if you could confirm the cost of delivery.', 'Pierwsza wersja opisuje problem i prosi o właściwe rozwiązanie w neutralnym rejestrze.'),
  ('r2','rozszerzony','We wstępie do rozprawki rozważ przedmiot sporu: czy miasto powinno ograniczyć ruch w centrum.','Reducing traffic in city centres may improve air quality, but it can also make access harder for some residents.','Traffic in my town is heavy at the end of the workday.','Cities should build more parks because people need places to exercise.', 'Przywołano dwie strony kwestii ograniczenia ruchu.'),
  ('r3','rozszerzony','Napisz neutralne zdanie przedstawiające kontrargument do opinii, że praca zdalna zawsze integruje zespół.','However, staff may have fewer opportunities to build relationships outside scheduled meetings.','Firstly, video meetings make it easy to bring everyone together.','Obviously, sensible people never agree to work from home.', 'Kontrargument odpowiada na tezę i zachowuje neutralny ton.'),
  ('r4','rozszerzony','Zakończ krótki raport: frekwencja wzrosła w soboty, spadła w środy i łącznie się nie zmieniła.','Overall attendance remained stable, although visits shifted from Wednesdays to Saturdays.','Attendance rose consistently because visits increased on both days.','Saturday attendance was lower, but the overall total increased.', 'Podsumowanie powinno zachować zarówno przesunięcie między dniami, jak i łączny wynik.'),
  ('r5','rozszerzony','W liście do organizatora grzecznie zapytaj o dostęp dla osób na wózkach.','Could you confirm whether the venue is accessible to wheelchair users?','Tell me why your event is so hard to reach.','Could you confirm which musicians will be performing?', 'Pytanie jest uprzejme oraz precyzyjnie dotyczy dostępności miejsca.'),
  ('r6','rozszerzony','Zachowaj sens: uczestnicy nie muszą kupować sprzętu, choć mogą przynieść własny.','Participants may bring their own equipment, but there is no requirement to buy any.','Participants must buy equipment unless the organiser says otherwise.','Participants must use equipment borrowed from other people.', 'Zdanie zachowuje zarówno możliwość, jak i brak obowiązku.'),
  ('r7','rozszerzony','W artykule zachęć czytelnika do wolontariatu, podając przykład tygodniowego zobowiązania.','Why not give one hour a week to help younger pupils with their reading?','Volunteers should have contributed more hours last year.','The reading programme is expected to finish next month.', 'Pytanie zwraca się do czytelnika i proponuje konkretny wymiar pomocy.'),
  ('r8','rozszerzony','Zakończ rozprawkę bez nowego argumentu: wyższy koszt początkowy, ale mniejsze koszty później.','In conclusion, the higher initial expense needs to be weighed against the lower costs over time.','In conclusion, the scheme should also be cheaper to start than we assumed.','Above all, its possible effect on public transport needs attention.', 'Wniosek łączy podane argumenty bez zmiany danych i bez wprowadzania nowego wątku.'),
  ('d1','dwujezyczny','Zredaguj wniosek: pilotaż sugeruje korzyść, ale miał zbyt małą próbę na mocną deklarację.','The pilot points to a possible benefit, though its small sample limits the strength of that inference.','The pilot proves that the intervention will benefit everyone.','No member of the sample is known to have benefited.', 'Ocena stopnia pewności odpowiada wskazanej sile dowodu.'),
  ('d2','dwujezyczny','Do formalnego raportu: skrytykuj nieuwzględnienie dłuższego czasu dojazdu, bez ataku na autorów.','By omitting additional travel time, the analysis may understate the total burden on staff.','The study is useless because its authors clearly do not care about staff.','The analysis could have provided more information on many things.', 'Rzeczowa uwaga nazywa pominięty czynnik i jego możliwy skutek.'),
  ('d3','dwujezyczny','Połącz kontrast: zasięg transmisji był szerszy, lecz widzowie z niestabilnym internetem często rezygnowali.','Although the stream reached a wider audience, unreliable connections left some viewers unable to stay.','The stream reached a wider audience because unreliable connections limited access.','The wider audience demonstrates that the stream was equally accessible to all.', 'Zdanie zachowuje kontrast między zasięgiem ogólnym a barierą dla części osób.'),
  ('d4','dwujezyczny','Przyznaj częściowo rację oponentowi: krótsze terminy mogą pomagać, lecz wspólny termin nie pasuje do wszystkich projektów.','Shorter deadlines can be useful, but their value does not establish a case for imposing a single deadline on every project.','Shorter deadlines are inherently damaging, whatever the work.','A shared deadline is sound because shorter deadlines save time.', 'Zdanie przyjmuje słuszny fragment argumentu bez przejmowania ogólnego wniosku.'),
  ('d5','dwujezyczny','W formalnej odpowiedzi zaproponuj wspólny przegląd umowy, bez sugerowania winy odbiorcy.','I would welcome an opportunity to review the agreement together and clarify the points on which our interpretations differ.','I expect you to admit your original reading of the agreement was absurd.','I will correct the agreement immediately without asking for your views.', 'Propozycja jest wspólna, konkretna i neutralna wobec obu interpretacji.'),
  ('d6','dwujezyczny','Uniknij niejasnego „they”: kuratorzy uznali, że archiwiści muszą wstawić źródła do swoich opisów.','The curators concluded that the archivists must cite sources in the archival team’s descriptions.','The curators concluded that they must cite sources in their descriptions.','The archivists concluded that the curators must cite sources.', 'Wersja jawnie wskazuje role i właściciela opisów.'),
  ('d7','dwujezyczny','Zwięźle sparafrazuj: doliczono już wydatki planowe; poza sumą pozostają wydatki awaryjne.','The total includes scheduled spending but excludes emergency outlays.','The total excludes both scheduled and emergency spending.','The sum is open to further calculation because it includes the cost of all emergencies.', 'Parafraza zachowuje rozróżnienie między dwiema kategoriami wydatków.'),
  ('d8','dwujezyczny','Zbuduj spójny wniosek z danych: sprzedaż wzrosła mimo spadku ruchu, bo większy odsetek odwiedzających kupił produkt.','Sales rose despite lower visitor numbers because a higher proportion of visitors made a purchase.','Sales rose because visitor numbers increased and many visitors bought nothing.','Sales and footfall both rose, even though fewer visitors chose to buy.', 'Wniosek poprawnie łączy liczbę odwiedzających i odsetek dokonujących zakupu.')
), zadania as (
  select 'spojnosc-' || id as id, 'czytanie-spojnosc' as skill_id, level, 'szybka-runda' as format,
    'Które zdanie pasuje do luki i zachowuje spójność tekstu?' as instruction,
    context, array[correct, d1, d2] as variants, explanation,
    array['Przeczytaj zdanie tuż przed luką i tuż po niej.',
      'Sprawdź, czego dotyczą zaimki i jaki związek sygnalizują spójniki.'] as hints
  from spoj
  union all
  select 'pisanie-' || id, 'pisanie', level, 'szybka-runda', instruction,
    null, array[correct, d1, d2], explanation,
    array['Rozbij polecenie na wymagania dotyczące treści i stylu.']
  from pis
  union all
  select 'pisanie-napraw-' || id, 'pisanie', level, 'napraw-blad',
    instruction || ' Wybierz poprawioną wersję.', d1, array[correct, d2], explanation,
    array['Porównaj roboczą wersję z każdym wymaganiem polecenia.']
  from pis
)
insert into private.learning_exercises (id, skill_id, level, format, prompt, answers, explanation, hints)
select z.id, skill_id, level, format,
  jsonb_strip_nulls(jsonb_build_object('typ', case when format = 'napraw-blad' then format else 'wybor' end,
    'tresc', instruction, 'tekst', context, 'liczbaBledow', case when format = 'napraw-blad' then 1 end,
    'opcje', o.options)),
  o.answers, explanation, hints
from zadania z
cross join lateral (
  select jsonb_agg(jsonb_build_object('id', chr(64 + position), 'tekst', opt) order by position) as options,
    array_agg(chr(64 + position)) filter (where is_answer) as answers
  from (
    select opt, ord = 1 as is_answer, row_number() over (order by md5(z.id || opt), ord)::int as position
    from unnest(z.variants) with ordinality as src(opt, ord)
  ) a
) o;

-- Klucz otwartego zadania CKE zawiera przykłady. Ocena rundy wymaga pełnego,
-- jednoznacznego klucza, więc wybieramy tylko zadania zamknięte.
create function private.cke_round_variants(p_skill text, p_level text)
returns table (id text, prompt jsonb, answers text[], explanation text, hints text[], error_type text)
language sql stable set search_path = '' as $$
  with arkusze as (
    select distinct m.sheet_id
    from private.cke_learning_map m
    where m.skill_id = p_skill and m.level = p_level
  )
  select concat(m.sheet_id, ':', m.question),
    jsonb_strip_nulls(jsonb_build_object(
      'typ', 'cke',
      'sheet_id', m.sheet_id,
      'task_nr', z.task->'nr',
      'question', m.question,
      'tresc', nullif(q.item->>'tresc', ''),
      'litery', to_jsonb(l.options),
      'nagranie', audio.url,
      'fragment', case when audio.url is not null and
        jsonb_typeof(q.item #> '{fragment,od}') = 'number' and jsonb_typeof(q.item #> '{fragment,do}') = 'number'
        then case when (q.item #> '{fragment,od}')::numeric >= 0
          and (q.item #> '{fragment,do}')::numeric > (q.item #> '{fragment,od}')::numeric
          then jsonb_build_object('od', q.item #> '{fragment,od}', 'do', q.item #> '{fragment,do}')
        end
      end
    )),
    array[q.item->>'poprawna'],
    'W kluczu CKE poprawna jest odpowiedź ' || (q.item->>'poprawna') || '.',
    '{}'::text[],
    null::text
  from arkusze a
  join public.sheets s on s.id = a.sheet_id
  cross join lateral jsonb_array_elements(case when jsonb_typeof(s.data->'zadania') = 'array'
    then s.data->'zadania' else '[]'::jsonb end) as z(task)
  cross join lateral jsonb_array_elements(case when jsonb_typeof(z.task->'pytania') = 'array'
    then z.task->'pytania' else '[]'::jsonb end) as q(item)
  join private.cke_learning_map m on m.sheet_id = a.sheet_id and m.question = q.item->>'nr'
  cross join lateral (
    select array_agg(option.value order by option.position) as options
    from (
      select letter.value, min(letter.position) as position
      from jsonb_array_elements_text(case when jsonb_typeof(q.item->'litery') = 'array'
        then q.item->'litery' else '[]'::jsonb end) with ordinality as letter(value, position)
      where letter.value ~ '^[A-HT]$'
      group by letter.value
    ) option
  ) l
  cross join lateral (select case when p_skill like 'sluchanie-%' then nullif(s.data->>'nagranie', '') end as url) audio
  where m.skill_id = p_skill and m.level = p_level
    and q.item->>'typ' = 'zamkniete'
    and jsonb_typeof(z.task->'nr') = 'number'
    and cardinality(l.options) >= 2
    and (q.item->>'poprawna') = any(l.options)
    and (p_skill not like 'sluchanie-%' or audio.url is not null);
$$;

create function private.learning_variants(p_skill text, p_level text, p_format text)
returns table (id text, prompt jsonb, answers text[], explanation text, hints text[], error_type text)
language sql stable set search_path = '' as $$
  with cke as materialized (
    select * from private.cke_round_variants(p_skill, p_level) where p_format = 'szybka-runda'
  )
  select * from cke
  union all
  select e.id, e.prompt, e.answers, e.explanation, e.hints, e.error_type
  from private.learning_exercises e
  where e.skill_id = p_skill
    and e.level = p_level
    and e.format = case p_format when 'sokratejski' then 'szybka-runda' else p_format end
    and (p_format <> 'szybka-runda' or (select count(*) from cke) < 5);
$$;

revoke all on private.learning_exercises from public, anon, authenticated;
revoke all on function private.learning_variants(text, text, text),
  private.cke_round_variants(text, text) from public, anon, authenticated;
