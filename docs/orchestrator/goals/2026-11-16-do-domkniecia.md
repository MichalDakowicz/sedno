# Goal

_Set 2026-11-16 · status: achieved_

**Goal.** Close the in-scope items of "Do domknięcia" in `NASTEPNE.md`: Pestka chats are
saved on the account and work on staging (PR to `main` open), the informatyka sheet view
and the essay discussion by sol are verified after login on staging.

**In scope.** Branch `rozmowy-konto`, staging `sedno-dev`, informatyka sheet view, essay
discussion (sol) on a realistic English essay written by the orchestrator.
**Not in this goal.** Production upload of sheets, full import, listening to audio
fragments, recording the film, Karta Zgłoszenia and Klauzula, C++/Java, demo account for
the jury, submission drafts.

## Done when

### Works
- [x] `rozmowy-konto` updated with `main` (merge, no force-push), `typecheck` and `build` green · proof: merge b3ab279; typecheck/build exit 0 after every commit up to 6c8ffaf
- [x] Migration 0005 applied on staging · proof: staging REST for `tutor_chats` answers 42501 "permission denied" for anon (table exists, revoke works), 18:27
- [x] A Pestka chat after login survives a reload and appears in a second session (cleared localStorage) · proof: tester run 1 scenarios 2–3, run 3 A2–A3
- [x] Merging local and account chats: newer wins, nothing is lost · proof: rule changed after audit to "unconfirmed local wins, confirmed yields to account" (no clock comparison); tester run 3 A4 (stale tab gets account version), A5 (ownerless chat stays local); known minor races listed in NASTEPNE.md
- [x] Informatyka sheet after login on staging: the 4 sheets open, Python and SQL run, an answer survives a reload · proof: tester run 2 part A (print(2+2) → 4, SELECT 1 → 1, answer kept after reload; subjects restored)
- [x] Essay discussion by sol on a realistic essay returns a discussion consistent with the rubric, no console errors · proof: run on gpt-6-luna per change below; tester run 3 B2–B3 (149 words in range, 4 content points correct, 7/7 language errors); after the prompt fix b441768; console clean after dev server restart (earlier useTutor errors were an HMR artifact)

### Looks
- [x] Chat window and sheet look unchanged versus `main`, both themes, 375 px and wide, no clipping · proof: light: tester run 1 scenario 7 and run 2 A5; dark (PR https://github.com/MichalDakowicz/sedno/pull/48): dark-theme tester runs 1–2 over every view at desktop and 375 px (no overflow, spreadsheet and CKE images stay light), audits 1–2 with no blockers or majors and no light regression; console clean on a fresh dev server

### Feels
- [x] Saving a chat does not block typing (debounced save), no visible jank · proof: tester run 1 scenario 1

### Holds up
- [x] RLS: an account sees only its own chats; a network error on save does not lose the chat (it stays in the browser) · proof: audits 1–3 (RLS using/with check on auth.uid, grants); own check: upserts blocked → chat kept unconfirmed, after `online` confirmed and restored from the account
- [x] Opus gap auditor: no blocker or major findings in `rozmowy-konto` · proof: audit 3 on 6c8ffaf (4 minors moved to NASTEPNE.md)

### Shipped
- [x] `rozmowy-konto` pushed and merged into `dev`, PR to `main` open (not merged) · proof: dev 0a33c9f, https://github.com/MichalDakowicz/sedno/pull/46
- [x] `NASTEPNE.md` section 0 updated, Brief and `handoff.md` updated · proof: commit "docs: update orchestrator handoff" (no Brief entries matched these items)

## Blocked on
- None

## Changes
- 2026-11-16: goal set (approved by the user)
- 2026-11-16: submission drafts removed from the goal; the user handles them separately (approved by the user)
- 2026-11-16: the test account's "Ważne" tier ran on ollama qwen3:8b, not sol; switched to openai gpt-6-luna for the essay bar. A check on sol itself stays open in NASTEPNE.md (approved by the user)
- 2026-11-16: the user kept "both themes" in the Looks bar although the app has no dark theme; goal blocked on it
- 2026-11-16: dark theme for the app added to scope (branch `ciemny-motyw`, follows the system setting, palette from `docs/style.css`) to meet the Looks bar (approved by the user)
