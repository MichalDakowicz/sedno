-- Pierwsza pozycja to klucz. Pozostałe odpowiadają dotychczasowym dystraktorom
-- w kolejności ich tekstu. Publiczne identyfikatory i układ opcji zostają bez zmian.
with tresci(id, poprawna, bledna1, bledna2) as (
  values
  ('czytanie-d1-sens','A cut overlooked a constraint faced by users','A council hid figures to justify a larger fleet','Hospital staff requested a route that had never existed'),
  ('czytanie-d1-szczegoly','It put a smaller bus on the route','It replaced the bus with the planned service','It moved the bus to a different hospital'),
  ('czytanie-d1-wnioskowanie','Data on when passengers can travel','A clearer chart of overall passenger totals','A record of how many vehicles the council owns'),
  ('czytanie-d10-szczegoly','A panel discussion','A new application','An immediate offer'),
  ('czytanie-d12-szczegoly','By a lottery among applicants','By their activity on the newsletter','By their previous museum attendance'),
  ('czytanie-d13-sens','Keep letters clear and useful','Give everyone the same list of documents','Replace written advice with phone calls'),
  ('czytanie-d13-szczegoly','Which documents they had to send','When the council office would open','When to expect the council’s reply'),
  ('czytanie-d13-wnioskowanie','The letters left some questions open','Phone advice made written letters unnecessary','Recipients often ignored the deadline in writing'),
  ('czytanie-d16-szczegoly','Support for an attendance range','A single precise attendance forecast','Attendance data from several previous tours'),
  ('czytanie-d16-wnioskowanie','Supported ranges from false precision','First-time applicants from past grant winners','Tours that went ahead from those cancelled'),
  ('czytanie-d2-szczegoly','An image of the printed passage','A note from the newspaper editor','An address of a surviving business'),
  ('czytanie-d2-wnioskowanie','A failed search proves a business went unmentioned','Researchers can read the transcripts outside the archive','Some recognisable place names have been corrected'),
  ('czytanie-d3-szczegoly','A comparison of both schemes’ upkeep costs','A detailed timetable for essential repairs','The immediate withdrawal of the alternative'),
  ('czytanie-d3-wnioskowanie','The alternative might still cost less','Both schemes necessarily cost the same','Repair costs cannot affect the comparison'),
  ('czytanie-d4-sens','Efficiency may depend on prior knowledge','New studio members opposed equipment sharing','Written labels always make tools harder to find'),
  ('czytanie-d4-szczegoly','Both colour codes and short labels','Written labels in place of all colour codes','Written labels for long-standing members only'),
  ('czytanie-d4-wnioskowanie','Interpreting a colour on an unfamiliar item','Finding a room where equipment was stored','Realising the studio was shared with others'),
  ('czytanie-d5-wnioskowanie','People outside the centre had fewer forms','People in the centre voted more than once','Votes for the centre were left off the map'),
  ('czytanie-d6-sens','An incentive changed choices before publication','Editors hid errors after abolishing performance bonuses','Faster corrections encouraged journalists to publish guesses'),
  ('czytanie-d6-szczegoly','They made fewer uncertain claims','They mentioned fewer reporters by name','They were published later in the day'),
  ('czytanie-d6-wnioskowanie','Accounts of choices before publication','The total amount offered as a performance bonus','The time it took to publish corrections'),
  ('czytanie-d7-sens','A metric can reflect an unintended obstacle','A shorter visit always signals displeasure with exhibits','Staircase use alone reliably measures the gallery’s appeal'),
  ('czytanie-d7-szczegoly','Time viewing exhibits and waiting to leave','Time at each exhibit and how many tickets sold','Time entering the gallery and buying souvenirs'),
  ('czytanie-d7-wnioskowanie','The rise tells us little about the exhibits','The rooms must have grown less crowded','Visitors must have studied the items more carefully'),
  ('czytanie-d8-szczegoly','The waiting time for outstanding jobs','The resale price of recently repaired items','The names of volunteers who requested the target'),
  ('czytanie-d9-szczegoly','Total fuel use','Package weights','New vehicle prices'),
  ('czytanie-d9-wnioskowanie','The scheme reduced emissions','Some vans now idle at the depot','Vans now make fewer separate trips'),
  ('czytanie-p1-sens','To suggest where to meet','To ask how to reach a café','To cancel their planned trip'),
  ('czytanie-p1-wnioskowanie','They can plan before the bus leaves','They can buy their bus tickets there','The café is a long way from home'),
  ('czytanie-p10-szczegoly','At the library desk','In the workshop room','In the room upstairs'),
  ('czytanie-p12-sens','Explaining plans for a picnic','Asking pupils to clean the gym','Describing a sports competition'),
  ('czytanie-p12-szczegoly','Next to the gym','By the school gate','Under the shelter'),
  ('czytanie-p13-sens','How to care for a cat','Where to buy some pet food','When to visit a new neighbour'),
  ('czytanie-p15-szczegoly','Tomorrow','Later today','This evening'),
  ('czytanie-p16-szczegoly','A bike helmet','A bottle of water','A map of the town'),
  ('czytanie-p2-wnioskowanie','Go in through the side gate','Come back at twelve o’clock','Wait until the pool opens again'),
  ('czytanie-p3-wnioskowanie','Being able to use it matters more than its colour','Getting it in green matters more than using it now','Using it for school is impossible in its present condition'),
  ('czytanie-p4-sens','Free help fixing a bike','A place in a bicycle race','A discount on new bike parts'),
  ('czytanie-p4-szczegoly','Tools for repairs','Bikes for people to hire','Parts for people to buy'),
  ('czytanie-p5-sens','To get back a lost umbrella','To lend an umbrella to a friend','To organise a rehearsal for musicians'),
  ('czytanie-p5-szczegoly','Yellow','Orange','Purple'),
  ('czytanie-p5-wnioskowanie','He can unlock the music room','He borrowed the umbrella earlier','He’s still rehearsing in the music room'),
  ('czytanie-p6-sens','Help buying an ingredient','Instructions for making bread','Someone to cook the meal instead'),
  ('czytanie-p6-szczegoly','Potatoes','Some bread','Some carrots'),
  ('czytanie-p6-wnioskowanie','The recipe might have to change','They’d have to take the potatoes back','There wouldn’t be any bread with the soup'),
  ('czytanie-p7-wnioskowanie','No, the departure time is still the same','Yes, they can take the next train with their ticket','Yes, the train now leaves a few minutes later'),
  ('czytanie-p8-sens','Explaining why they’ll miss the meeting','Choosing the next book to discuss at the club','Offering to help fix a computer for the club'),
  ('czytanie-r1-szczegoly','During September','At the end of the year','On the first Thursday'),
  ('czytanie-r1-wnioskowanie','Whether the longer hours attract visitors','How many plants survive the winter months','Whether volunteers can come before six'),
  ('czytanie-r10-sens','How to return a cup','Where to buy a travel mug','Why drinks cost more to go'),
  ('czytanie-r10-szczegoly','The station kiosk','The café kitchen','The station office'),
  ('czytanie-r12-wnioskowanie','Guests cannot always make a live interview','Listeners often struggle to find the station','Students cannot always access the latest recording'),
  ('czytanie-r13-wnioskowanie','The climb at the end','The stretches in the wind','The first path with shelter'),
  ('czytanie-r14-sens','An option to follow a play with captions','A change to the order of scenes in a play','A discount for certain theatre seats'),
  ('czytanie-r15-szczegoly','The stalls with most visitors','The stalls selling cooked food','The stalls with first-time sellers'),
  ('czytanie-r16-wnioskowanie','Move to the regular class','Ask for an extra instructor','Stay in the beginners’ pool'),
  ('czytanie-r2-sens','Different rules for museum collections','A ban on booking temporary exhibitions','A campaign to raise funds to buy new objects'),
  ('czytanie-r2-szczegoly','A box for voluntary donations','A machine for booking tickets','A screen for visitor information'),
  ('czytanie-r2-wnioskowanie','Visit the permanent collection','Enter if a borrowed item is returned','Choose a temporary show to visit'),
  ('czytanie-r3-sens','To describe a cheaper way to visit the theatre','To announce that opening night has been postponed','To recruit more participants for a theatre course'),
  ('czytanie-r3-szczegoly','A talk with members of the cast','A programme signed by the director','A place at a rehearsal of the play'),
  ('czytanie-r3-wnioskowanie','Someone curious about the rehearsal process','Someone who wants an uninterrupted performance','Someone most interested in a talk with the cast'),
  ('czytanie-r4-sens','A new service led to more requests for help','Library memberships now last for a shorter period','Borrowers can no longer use the self-service option'),
  ('czytanie-r4-szczegoly','Fifteen minutes','Twenty-five minutes','Thirty minutes'),
  ('czytanie-r4-wnioskowanie','Keep using their library cards','Keep using the app without logging in','Wait until their local library reopens'),
  ('czytanie-r5-sens','A reward for returning containers','A switch back to disposable packaging','A decision to make lunches more affordable'),
  ('czytanie-r5-szczegoly','People rarely returned the containers','Customers did not want to pay the deposit','Staff could not clean the used containers'),
  ('czytanie-r6-wnioskowanie','Water depth can change between readings','Teams had measured the wrong river','The rods needed time to dry between readings'),
  ('czytanie-r7-sens','An accessible concert and demand for seats','A competition for young local musicians','An orchestra looking for replacement performers'),
  ('czytanie-r7-szczegoly','In plain, everyday words','In a second language only','In a separate phone app'),
  ('czytanie-r7-wnioskowanie','The first concert had no seats left','Families found the programme too long','The musicians needed more time to prepare'),
  ('czytanie-r8-szczegoly','An email about collection','An invoice through the post','A call from the manufacturer'),
  ('czytanie-r8-wnioskowanie','The delivery cost of a small part','The need to pay for the part in a shop','The poor quality of replacement lids'),
  ('czytanie-r9-szczegoly','By building address','By the time of the call','By the type of tenancy'),
  ('jezyk-napraw-d2','to leave → to have left · gramatyka','old footage → recent footage · słownictwo','to leave → to have leave · gramatyka'),
  ('jezyk-napraw-d6','to have approved → having approved · gramatyka','to have approved → to have been approved · gramatyka','still unsigned → already authorised · słownictwo'),
  ('jezyk-napraw-d7','seems → seem · gramatyka','attracted → drew · słownictwo','seems → seeming · gramatyka'),
  ('jezyk-napraw-d8','settling → settlement · słownictwo','settling → have settled · gramatyka','signed it → approved it · słownictwo'),
  ('jezyk-napraw-p1','was → were · gramatyka','station → depot · słownictwo','was → is being · gramatyka'),
  ('jezyk-napraw-p12','childs → children','childs → childrens','childs → child’s'),
  ('jezyk-napraw-p13','our → ours','our → our’s','our → us'),
  ('jezyk-napraw-p16','runing → running','runing → runned','runing → runnings'),
  ('jezyk-napraw-p9','have → has','have → having','new → newer'),
  ('jezyk-napraw-r1','know → have known · gramatyka','every Thursday → on Fridays · słownictwo','know → had known · gramatyka'),
  ('jezyk-napraw-r12','to drive → driving','to drive → to driving','to drive → driven'),
  ('jezyk-napraw-r13','of → for','of → with','of → on'),
  ('jezyk-napraw-r2','would catch → would have caught · gramatyka','missed the train → caught the next train · słownictwo','would catch → will have caught · gramatyka'),
  ('jezyk-napraw-r5','to close → closing · gramatyka','quite loud → quite noisy · słownictwo','to close → being closed · gramatyka'),
  ('jezyk-napraw-r7','Although → Despite · gramatyka','Although → Even though · gramatyka','dusk → daybreak · słownictwo'),
  ('spojnosc-d1','It compared different districts at one point in time.','The districts with most buses also had the highest ridership.','The researchers subsequently ran a controlled trial on those routes.'),
  ('spojnosc-d12','Another figure captures the complexity of the work.','Its values are reported to the nearest whole number.','Every team uses the same measure to estimate output.'),
  ('spojnosc-d14','Names and affiliations were removed from each copy.','Applicants could contact reviewers about their concerns.','Reviewers received a list of the applicants’ colleagues.'),
  ('spojnosc-d2','Staff still asked for the same paperwork at interview.','Applicants no longer needed to provide any paperwork.','The application form had long been available in two languages.'),
  ('spojnosc-d3','She asks them to suggest an alternative to each objection.','She has considered reducing the number of people in each meeting.','She once hired two assistants who had trained overseas.'),
  ('spojnosc-d4','Warehouse staff had to cover it carrying protective gear.','An architect suggested renaming the depot after a local figure.','Office staff found that the new building offered better lighting.'),
  ('spojnosc-d5','It gives no examples of feedback changing the proposal.','The final decision was announced after a meeting with supervisors.','The meetings were usually booked for Tuesday afternoons.'),
  ('spojnosc-d6','She repaired the duplicate and kept the original untouched.','She immediately discarded the duplicate and rewrote the original.','The owner explained that he had lost a different drive last year.'),
  ('spojnosc-d7','The clause may only sound relevant out of context.','The full contract is available to read on the website.','Some agents prefer email because it leaves a written record.'),
  ('spojnosc-d8','The new index was broader but left different gaps.','The index was reprinted without a single alteration.','The oldest references were always written by hand.'),
  ('spojnosc-d9','The roadworks affecting the same route also ended that month.','Later surveys confirmed there were no alternative explanations.','The revised timetable preceded the fall by several years.'),
  ('spojnosc-p1','They were too small, so she asked to swap them.','Her school had a new teacher who coached sports.','She lent them to her sister, who wanted to keep them.'),
  ('spojnosc-p11','The water in the kettle was cold.','The tea had already been poured out.','The visitors had brought some cold drinks.'),
  ('spojnosc-p12','She asked Tom to help with them.','She moved the smaller box first.','Tom had already left the building.'),
  ('spojnosc-p13','It began to rain before lunch.','Some students had brought their lunch.','The sun came out after lunch.'),
  ('spojnosc-p15','He set the timer on his camera.','He asked his sister to take it.','He stood behind his new camera.'),
  ('spojnosc-p2','He left it on the table to cool.','He ate it all while it was hot.','He put a second cake in the oven.'),
  ('spojnosc-p3','I looked on my desk but it wasn’t there.','I answered it and ended the call at once.','My coat was still at the dry cleaner’s.'),
  ('spojnosc-p4','Heavy rain stopped the outdoor races.','Everyone finished the races in record time.','The sun was shining on the school field.'),
  ('spojnosc-p5','I gave it to a woman with heavy bags.','I carried my bags to the bus stop yesterday.','The driver made everyone get off the bus.'),
  ('spojnosc-p7','He made a tall hat out of cardboard.','He bought tickets for a film at the cinema.','He left the hat for his costume at home.'),
  ('spojnosc-r1','They added weekend slots for those busy on weekdays.','They decided that only weekday bookings would be accepted.','They reported that weekday visitors rarely needed help.'),
  ('spojnosc-r2','In fact, it contains an unpublished chapter.','The first edition rarely appears in second-hand shops.','The publisher has decided to stop selling books online.'),
  ('spojnosc-r3','The manager proposed a new route or a collection point.','The customer eventually opened an account with another supplier.','The manager bought a van that could carry more parcels.'),
  ('spojnosc-r4','However, several members only own landline phones.','Consequently, every member received the first message.','Similarly, the team placed an order for more paper slips.'),
  ('spojnosc-r6','Several people skipped steps because they knew the basics.','No one in the group had ever touched a sewing machine.','The instructor had never hired a room for a course before.'),
  ('spojnosc-r7','Each now costs ten pence more to make than a standard one.','Sales were lower, although the cost of each book did not change.','The order already included ten extra books at no extra charge.'),
  ('spojnosc-r8','I was away, so they suggested Monday instead.','I paid in advance and asked for the receipt.','They confirmed there were no other delivery dates.'),
  ('pisanie-d1','The small pilot suggests a benefit without proving it.','No participant in the pilot is known to have benefited.','The pilot proves the intervention is beneficial to everyone.'),
  ('pisanie-d2','Omitting extra travel time may understate the burden on staff.','The analysis could have covered additional aspects of the policy.','The report is worthless because its authors ignore staff concerns.'),
  ('pisanie-d3','The stream reached more viewers, but poor connections drove some away.','The stream reached a wider audience because unreliable connections limited access.','The wider audience demonstrates that the stream was equally accessible to all.'),
  ('pisanie-d4','Short deadlines may help, but one deadline cannot suit every project.','A shared deadline suits all projects because shorter deadlines save time.','Short deadlines damage the quality of work, regardless of the project.'),
  ('pisanie-d5','Could we review the agreement together to clarify our views?','I expect you to admit your reading of the agreement was unreasonable.','I will revise the agreement myself and let you know the outcome.'),
  ('pisanie-d6','The curators said the archive team must cite sources in its own descriptions.','The archivists said the curators must cite sources in the exhibition descriptions.','The curators concluded that they must cite all sources in their descriptions.'),
  ('pisanie-d7','The total includes planned costs and excludes emergency costs.','The total remains provisional because it includes emergency expenditure.','The total includes neither the planned expenses nor the emergency ones.'),
  ('pisanie-d8','Sales rose with fewer visitors because a higher share made purchases.','Both sales and footfall rose even though a smaller share made purchases.','Sales rose because more people visited and many of them bought nothing.'),
  ('pisanie-p3','Can we meet in the park after school tomorrow?','Could you wait for me at our school tomorrow morning?','Would you like to meet in the local park next month?'),
  ('pisanie-p4','Please write back to me soon.','I wanted to tell you about my trip.','Thank you for coming to see me last week.'),
  ('pisanie-p5','Thanks for the book! I love the illustrations.','Thanks for the book! I’ll start reading it next month.','Thanks for the invitation! I really enjoyed the food there.'),
  ('pisanie-p6','I got back yesterday. I learnt to paddle a canoe.','I got back yesterday, but I’ll learn to paddle next summer.','I’ll come back tomorrow and tell you about the trip then.'),
  ('pisanie-p7','I have training. Could we meet at six?','Could we meet at the same time in the same place?','I have training then. Thanks for letting me know.'),
  ('pisanie-p8','You’ll enjoy the funny dialogue and the music.','It ends with the detective admitting the theft.','When are you going to the cinema to see the film?'),
  ('pisanie-r1','The textbook was missing. Could you issue a refund?','Could you confirm the delivery charge for the textbook I ordered?','A textbook was missing, so please send a replacement immediately.'),
  ('pisanie-r2','City traffic limits may cut pollution but make access harder.','Cities should create more parks to give people space to exercise.','Traffic in my town is busiest near the centre after the workday.'),
  ('pisanie-r3','However, remote work may leave less time for informal contact.','Firstly, video meetings give all colleagues a chance to come together.','Obviously, anyone who cares about the team refuses to work from home.'),
  ('pisanie-r4','Total attendance held steady as visits shifted to Saturdays.','Overall attendance rose because visits increased on both days.','Saturday attendance fell even though total visitor numbers went up.'),
  ('pisanie-r5','Is the venue accessible to wheelchair users, please?','Could you confirm which musicians will be performing at the venue?','Tell me why it is so hard to get to the venue for your event.'),
  ('pisanie-r6','You may bring your own gear, and buying it is optional.','Participants must buy equipment unless the organiser says otherwise.','Participants are required to borrow equipment supplied by others.'),
  ('pisanie-r7','Could you spare an hour a week to help pupils read?','The reading programme at our school is due to finish next month.','Volunteers should have donated more hours to the group last year.'),
  ('pisanie-r8','The higher initial cost needs weighing against later savings.','Most importantly, the scheme’s effect on public transport needs more attention.','Overall, the scheme should be cheaper to start than originally expected.')
), zmiany as (
  select t.id, o.stary, (array[t.poprawna, t.bledna1, t.bledna2])[o.nr] as nowy
  from tresci t
  join private.learning_exercises e on e.id = t.id
  cross join lateral (
    select op->>'tekst' as stary, row_number() over (
      order by (op->>'id' = any(e.answers)) desc, (op->>'tekst') collate "C"
    )::int as nr
    from jsonb_array_elements(e.prompt->'opcje') op
  ) o
  where not (e.prompt->'opcje' @> jsonb_build_array(
    jsonb_build_object('tekst', t.poprawna),
    jsonb_build_object('tekst', t.bledna1),
    jsonb_build_object('tekst', t.bledna2)
  ))
), warianty as (
  select id, id as zrodlo from tresci
  union all
  select replace(id, 'czytanie-', 'sluchanie-'), id from tresci where id like 'czytanie-%'
  union all
  select replace(id, 'pisanie-', 'pisanie-napraw-'), id from tresci where id like 'pisanie-%'
), opcje as (
  select w.id, jsonb_agg(
    case when z.nowy is null then o.opcja else jsonb_set(o.opcja, '{tekst}', to_jsonb(z.nowy)) end
    order by o.nr
  ) as dane
  from warianty w
  join private.learning_exercises e on e.id = w.id
  cross join lateral jsonb_array_elements(e.prompt->'opcje') with ordinality as o(opcja, nr)
  left join zmiany z on z.id = w.zrodlo and z.stary = o.opcja->>'tekst'
  group by w.id
)
update private.learning_exercises e
set prompt = jsonb_set(e.prompt, '{opcje}', o.dane)
from opcje o
where e.id = o.id and e.prompt->'opcje' is distinct from o.dane;
