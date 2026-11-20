# Goal

_Set 2026-11-20 · status: active_

**Goal.** The teammate's list is closed: Pestka works on an account without its own AI key (once the server has a default key), a model hiccup is absorbed on the server, English sheets 2023/2024 have clean instructions, a shortened round is explained to the student, and a CKE recording that does not load in a round says so.

**In scope.** `services/supabase/functions` (default route, server-side retry), `services/arkusze` (parser, re-import, staging upload), `apps/web` quick round and round recordings.
**Not in this goal.** The OpenAI key itself (the user adds it as a server secret later), handing `.env.staging` to the teammate (the user does it privately), hosting CKE recordings, production sheet upload and production deploy without the user's yes.

## Done when

### Works
- [ ] An account without `ai_credential` gets a route from server secrets: tier `wazne` → sol model, `lekkie` → luna model; an account's own key still wins; without server secrets the reply is a clean `not_configured`, not a crash · proof: Deno tests with a fake provider, staging call without a key
- [ ] A 500 / 429 / network error from the provider gets one server-side retry, then the other tier's model; in a stream only before the first chunk; in both `ai` and `nauka-ai` · proof: Deno tests
- [ ] Junk in 2024 task 4.3 („Przeczytaj tekst. ).”) and glued sub-question instructions in 2023 task 5.1 are fixed at the source; re-import and `kontrola` pass; sheets uploaded to staging · proof: JSON diff, staging view
- [ ] When a quick round is shortened after a streak (e.g. „4 z 6” → „5 z 5”), Pestka says „Cztery dobre z rzędu. Kończymy rundę wcześniej.” · proof: tester on staging
- [ ] A recording in a round that errors or gets no data for ~10 s shows the same notice as the sheet player („Strona CKE nie oddała nagrania. Spróbuj za chwilę.”) with „Wczytaj jeszcze raz” · proof: tester with a blocked recording URL

### Looks
- [ ] New notices follow DESIGN.md (no cards, existing text styles) at 375 and 1280 px, light and dark · proof: tester screenshots

### Feels
- [ ] Notices are announced (`role="status"`), the reload button is reachable by keyboard · proof: tester, code review

### Holds up
- [ ] No key in logs or error bodies; retry does not duplicate saved grades; Opus audit has no blocker or major findings · proof: audit report

### Shipped
- [ ] `npm run typecheck`, `npm run build`, `deno test services/supabase/tests` green; branch + PR; tested on staging; Brief and `NASTEPNE.md` updated; production only on the user's yes · proof: check output, PR link

## Blocked on
- OpenAI key as a server secret (blocks: live proof of the default route, not the code)

## Changes
- 2026-11-20: goal set (approved by the user)
