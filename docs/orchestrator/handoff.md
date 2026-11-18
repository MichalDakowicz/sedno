# Orchestration: handoff

_Updated 2026-11-18_

**State.** Phase 2 (English learning loop) was built and merged by the teammate: backend PR #55, views PR #56 (Nauka, Mapa umiejętności, Szybka runda, Rozbiór, Powtórki, Uczeń uczy), migration 0015 (audit fixes for repeating wrong tasks and clearing the mistake flag), then PRs #57–#65 (scratchpad, generated variants and open-answer grading in 0016, Nauka loading). Production and staging (`dev`) run the same code as `main` (`904d468`). The orchestrator's own unit-3 branch `mapa-umiejetnosci` duplicates #56 and is dropped (kept, not merged). The orchestrator now verifies the merged work against `goal.md` and turns gaps into fix units.

**Goal.** 7/17 bars, with evidence in `goal.md`.

**Verified 2026-11-18.** Typecheck and build on `904d468`. Opus audit of #56 + 0015 (0 blockers, 3 majors, 9 minors). Haiku tester run of the whole loop on staging (round, breakdown, map, Powtórki, reload, second tab, network failure, 375 px, dark, keyboard, console).

**Open findings (proposed fix units, waiting for the user's decision on who builds them).**
1. Major. Abandoned rounds pile up: every visit to `/nauka/runda` makes a new session (`SzybkaRunda.tsx:44`), nothing calls `nauka_usun`, „Ostatnio” only offers „Wznów”, and 10 open sessions block new rounds (`too_many_open_sessions`). Fix: reuse an open session with the same skill, format and level; add discard; list across levels.
2. Major, needs a product decision. Mastery drifts back toward 50% as evidence ages (age shrinks every Elo update, `0015:113–127`), so an unpractised weak skill rises. Options: decay toward a low prior, or show score × retention on the map.
3. Major. Listening tasks in a round give only the full ~20-minute recording before answering (`TrescRundy.tsx:92–113`). Fix: play the segment covering the whole task before answering.
4. Goal gap. The breakdown has no „what went well / what didn't” summary (goal in-scope 5; tester found none).
5. Powtórki readability: after one listening round it shows 16 near-identical rows („Uchwyć sens nagrania · Ćwiczone w ciągu ostatniej doby · Szacowana retencja 98%”), and fresh mistakes from another skill rank below them.
6. Accessibility: round feedback is not in a live region; focus drops to `<body>` after „Ćwicz” and skill chips on /nauka; hints region appears with its first hint.
7. Minors: reload on the feedback screen skips to the next task; invalid `?umiejetnosc=`/level loops on retry; „Dziś warto” swaps content after loading; `learning_map` runs 3× on the last answer; `nauka.md` difficulty values stale; raw area ids in the Nauka skill picker; CKE key readable from `sheets` (pre-existing, own data only).

**Not verified.** Large text: the app sizes text in px, so the 200% root-font check proves nothing; retest with browser zoom. Hand calculation of mastery (bar 1 of Works). Matching every template/doc page.

**Test data left on staging.** Unfinished rounds from the tester (18 Nov, Dobieraj 4/6; Powtórki 8.3 2/7; 17 Nov). They count toward the 10-session cap.

**In flight.** Nothing.

**Next.** User decides who builds the fix units (orchestrator on branches with PRs, or the teammate) and the mastery-decay option. Then build in order 1, 3, 4, 6, 5, 2, 7.

**Housekeeping.**
- `npm run dev:staging` runs in the terminal tab „dev staging” from `C:\sedno` on `main`.
- Worktrees: `C:\sedno-pr55` (junctions `node_modules`, `data/cke`, `data/nagrania`; delete them before `git worktree remove`), `C:\sedno-dev` (branch `dev-scal`), `.claude/worktrees/agent-aa52a1d936546d89f` (branch `mapa-umiejetnosci`, dropped). Remove when no longer needed.
- The built-in browser loses the staging session when the pane restarts; the user signs in again.
