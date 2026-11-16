# Goal

_Set 2026-11-16 · status: active_

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
- [ ] Every in-scope flow runs on staging after login · proof: tester run on `npm run dev:staging`
- [ ] Settings, profile and layout survive a reload and show up in a second tab after reload · proof: tester run
- [ ] Typecheck and build green · proof: `npm run typecheck`, `npm run build`
- [ ] No console errors in touched views · proof: tester console read

### Looks
- [ ] Matches the template and `docs/dash-szukaj.html`, `docs/dashboard-ustawienia.html`, `docs/dash-uklad.html`, `docs/dash-matura.html`, `docs/dash-start.html` · proof: tester screenshots side by side
- [ ] Empty, loading and error states where the design draws them · proof: tester screenshots
- [ ] Light and dark theme, 375 px and desktop, no overflow or clipping · proof: tester screenshots
- [ ] Separators instead of cards per `CLAUDE.md` · proof: diff review

### Feels
- [ ] Full keyboard path: Ctrl+K, arrows, Enter, Escape, widget reorder by keyboard · proof: tester run
- [ ] Visible focus, labels on controls, readable contrast · proof: tester run, audit

### Holds up
- [ ] No network or no AI gives a message, not a blank screen · proof: tester offline run
- [ ] New tables have RLS limited to the owner · proof: migration review, audit
- [ ] Profile insights can be deleted · proof: tester run
- [ ] Final gap audit has no blocker or major findings · proof: audit report

### Shipped
- [ ] Branch per unit, PRs open, migrations on staging only · proof: PR links
- [ ] Template folders, `lista.ts`, `Szablony.tsx`, `Spis.tsx` and `szablony/README.md` updated for moved templates · proof: diff
- [ ] Handoff updated · proof: `docs/orchestrator/handoff.md`
