# Goal

_Set 2026-11-16 · status: active_

**Goal.** Close the in-scope items of "Do domknięcia" in `NASTEPNE.md`: Pestka chats are
saved on the account and work on staging (PR to `main` open), the informatyka sheet view
and the essay discussion by sol are verified after login on staging, and the contest
submission materials exist as drafts.

**In scope.** Branch `rozmowy-konto`, staging `sedno-dev`, informatyka sheet view, essay
discussion (sol) on a realistic English essay written by the orchestrator, drafts: build
and run instructions (`README.md`), user manual, one-page description, film script
(`notes/zgloszenie/`).
**Not in this goal.** Production upload of sheets, full import, listening to audio
fragments, recording the film, Karta Zgłoszenia and Klauzula, C++/Java, demo account for
the jury.

## Done when

### Works
- [ ] `rozmowy-konto` updated with `main` (merge, no force-push), `typecheck` and `build` green · proof: command output
- [ ] Migration 0005 applied on staging · proof: autodeploy log, table `tutor_chats` exists
- [ ] A Pestka chat after login survives a reload and appears in a second session (cleared localStorage) · proof: tester, screenshots
- [ ] Merging local and account chats: newer wins, nothing is lost · proof: tester scenario with two versions
- [ ] Informatyka sheet after login on staging: the 4 sheets open, Python and SQL run, an answer survives a reload · proof: tester
- [ ] Essay discussion by sol on a realistic essay returns a discussion consistent with the rubric, no console errors · proof: tester, discussion text

### Looks
- [ ] Chat window and sheet look unchanged versus `main`, both themes, 375 px and wide, no clipping · proof: screenshots

### Feels
- [ ] Saving a chat does not block typing (debounced save), no visible jank · proof: tester

### Holds up
- [ ] RLS: an account sees only its own chats; a network error on save does not lose the chat (it stays in the browser) · proof: auditor + tester offline
- [ ] Opus gap auditor: no blocker or major findings in `rozmowy-konto` · proof: report

### Shipped
- [ ] `rozmowy-konto` pushed and merged into `dev`, PR to `main` open (not merged) · proof: PR link
- [ ] Submission drafts exist; "wersja binarna" marked "do weryfikacji" · proof: files
- [ ] `NASTEPNE.md` section 0 updated, Brief and `handoff.md` updated · proof: commit

## Blocked on
- Test account login: the user signs in once in the built-in browser (blocks: bars 3–6)

## Changes
- 2026-11-16: goal set (approved by the user)
