# Goal

_Set 2026-11-16 · status: achieved 2026-11-17 (17/17; one bar accepted by the user on code and audit evidence)_

**Goal.** Five templates from „Konto i narzędzia” plus the exam countdown stop being prototypes: they run on real account data, live in `views/` (or `components/`), and their template folders and entries are gone.

**In scope.**
1. **Wyszukiwanie**: Ctrl+K and the search icon open a dialog with a focus trap; index of sheets, actions and chats; matching without Polish diacritics and with typos; a question can be handed to Pestka.
2. **Ustawienia**: text scale, „mniej ruchu”, theme (light / dark / system), Pestka settings read by `TutorContext`; saved on the account.
3. **Profil ucznia**: short skippable questions in onboarding, daily time, goal, priorities; migration; insights from sheets (pace, strong and weak points) readable and deletable; a Pestka tool that saves a priority from chat with a visible notice.
4. **Układ pulpitu**: dashboard split into widgets with a registry; on/off and order (also by keyboard); ready layouts „Nauka” and „Egzamin”; restore default; **layout per subject**; saved on the account.
5. **Plan do matury, part 1**: countdown from session dates per subject and level (dates marked „do weryfikacji”), goal from the profile, dashboard widget. The widget is **optional**: on in „Egzamin”, off in „Nauka”, the student can hide it.

**Not in this goal.** Skill map, Nauka, learning formats, Rozbiór, Powtórki, forecast and weekly plan, skills in search (phase 2: learning loop for English, next goal, taxonomy from CKE marking rules with student-facing names approved by the user). Web push notifications. Mapa wiedzy, Analiza zdjęcia, Wizualizacje.

## Done when

### Works
- [x] Every in-scope flow runs on staging after login · proof: tester run on `npm run dev:staging` — final regression 2026-11-17 on 9301885 plus final verify on 1c9be9d, all five flows pass
- [x] Settings, profile and layout survive a reload and show up in a second tab after reload · proof: tester run — settings and profile sync live between two tabs; layouts survive reload and localStorage clear (restored from account)
- [x] Typecheck and build green · proof: `npm run typecheck`, `npm run build` — green on every branch of the chain, last on do-matury 1c9be9d
- [x] No console errors in touched views · proof: tester console read — no errors in the regression runs (only React Router future-flag warnings)

### Looks
- [x] Matches the template and `docs/dash-szukaj.html`, `docs/dashboard-ustawienia.html`, `docs/dash-uklad.html`, `docs/dash-matura.html`, `docs/dash-start.html` · proof: tester screenshots side by side — template copy and sections kept; docs updated where decisions changed them (szukaj, uklad, matura, ustawienia, start)
- [x] Empty, loading and error states where the design draws them · proof: tester screenshots — search loading/error/empty, insights empty/error, save-failure line, profile loading on /uklad-pulpitu
- [x] Light and dark theme, 375 px and desktop, no overflow or clipping · proof: tester screenshots — scrollWidth = 375 on all touched views and sheet pages incl. text size „Większy” (measured 2026-11-17 on 1c9be9d)
- [x] Separators instead of cards per `CLAUDE.md` · proof: diff review and audits

### Feels
- [x] Full keyboard path: Ctrl+K, arrows, Enter, Escape, widget reorder by keyboard · proof: tester run — incl. edge announcements and focus on handle click
- [x] Visible focus, labels on controls, readable contrast · proof: tester run, audit — one shared switch with 3:1 off state, aria-describedby, live regions

### Holds up
- [x] No network or no AI gives a message, not a blank screen · proof: simulated network failure 2026-11-17 — /ustawienia shows „Nie zapisano na koncie. Spróbuję ponownie.”, search shows „Nie udało się wczytać arkuszy.”; without AI search offers „Podepnij AI”
- [x] New tables have RLS limited to the owner · proof: migration review, audit — new columns on profiles (owner-only RLS from 0001) with column-level update grants only
- [x] Profile insights can be deleted · proof: accepted by the user 2026-11-17 on code and audit evidence — not verified live: the test account has no computable insights (2 checked English sheets without clear differences). „Usuń” verified in code and two audits only
- [x] Final gap audit has no blocker or major findings · proof: audit report — final audit on 9301885 had 0 blockers; its 3 majors and 9 minors were fixed and re-verified

### Shipped
- [x] Branch per unit, PRs open, migrations on staging only · proof: PR links — #49–#53 (stacked), 0006–0008 on staging via `dev`
- [x] Template folders, `lista.ts`, `Szablony.tsx`, `Spis.tsx` and `szablony/README.md` updated for moved templates · proof: diff, final audit grep
- [x] Handoff updated · proof: `docs/orchestrator/handoff.md`
