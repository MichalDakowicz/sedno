-- Konto testowe do wspólnego testowania korzysta z klucza serwera jak każde zwykłe konto.
-- Własny klucz ma pierwszeństwo i nie przechodzi po cichu na serwer (ai-route.ts), a na podpiętym kluczu
-- skończyły się środki, więc Pestka nie odpowiadała w testach. Routing konta znika kaskadą.
delete from public.ai_credential
where user_id in (select id from auth.users where email = 'test@sedno.dakowicz.xyz');
