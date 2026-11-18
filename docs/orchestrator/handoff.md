# Orchestration: handoff

_Updated 2026-11-18 (evening)_

**State.** Phase 2 (English learning loop) was built and merged by the teammate: backend PR #55, views PR #56 (Nauka, Mapa umiejętności, Szybka runda, Rozbiór, Powtórki, Uczeń uczy), migration 0015 (audit fixes for repeating wrong tasks and clearing the mistake flag), then PRs #57–#65 (scratchpad, generated variants and open-answer grading in 0016, Nauka loading). Production and staging (`dev`) run the same code as `main` (`904d468`). The orchestrator's own unit-3 branch `mapa-umiejetnosci` duplicates #56 and is dropped (kept, not merged). The orchestrator now verifies the merged work against `goal.md` and turns gaps into fix units.

**Goal.** 7/17 bars, with evidence in `goal.md`.

**Verified 2026-11-18.** Typecheck and build on `904d468`. Opus audit of #56 + 0015 (0 blockers, 3 majors, 9 minors). Haiku tester run of the whole loop on staging (round, breakdown, map, Powtórki, reload, second tab, network failure, 375 px, dark, keyboard, console).

**Fix units (2026-11-18), built by the orchestrator, PRs open, not merged.**
- PR #66 `porzucone-rundy`: reuse of open rounds (also repeat rounds of the same item), „Usuń” in „Ostatnio” for all levels and formats, specific messages for the 10-round cap and bad URL params, feedback survives reload, live region with the correct answer and explanation, focus after „Ćwicz”, area names in the picker.
- PR #67 `sluchanie-i-rozbior`: whole-task listening segment before answering (only when every question has a fragment), breakdown summary „Co poszło dobrze, a co nie” with counts, note that the map shows decay.
- PR #68 `zanikanie-i-powtorki`: migrations 0017 (displayed score = Elo estimate × retention, Elo at full weight, fewer map computations) and 0018 (breakdown before/after both the estimate; weekly plan ranking), Powtórki grouped by skill with dates and loading state, „Dziś warto” loading, `nauka.md` and `docs/mapa-dowody.html` updated.
- All three: up to date with `main`, typecheck and build green together; 0017 and 0018 applied on staging; tester runs on staging; two audit rounds, the last with no blockers or majors. Repeat-round reuse checked by the orchestrator in the browser on staging.
- Left on purpose: „Usuń” without confirm (as in the student profile); listening segment seek on iOS Safari untested; per-question fragment after answering stays inside „Treść zadania”; the round grows after a mistake by design; a „Failed to load resource: 400” on every page load (no learning RPC; source unknown, likely pre-existing).

**Not verified.** Large text: the app sizes text in px, so the 200% root-font check proves nothing; retest with browser zoom. Hand calculation of mastery (bar 1 of Works). Matching every template/doc page.

**Test data left on staging.** Unfinished rounds from the tester (18 Nov, Dobieraj 4/6; Powtórki 8.3 2/7; 17 Nov). They count toward the 10-session cap.

**In flight.** PRs #66–#68 wait for the user's merge decision. Merging #68 sends 0017 and 0018 to production.

**Next.** After merge: tick the bars that depend on it (live announcements, final audit), run the hand calculation of mastery for the test account, the full keyboard path and a browser-zoom large-text check, then the goal review.

**Housekeeping.**
- `npm run dev:staging` runs in the terminal tab „dev staging” from `C:\sedno` on `main`.
- Worktrees: `C:\sedno-pr55` (junctions `node_modules`, `data/cke`, `data/nagrania`; delete them before `git worktree remove`), `C:\sedno-dev` (branch `dev-scal`), `.claude/worktrees/agent-aa52a1d936546d89f` (branch `mapa-umiejetnosci`, dropped). Remove when no longer needed.
- The built-in browser loses the staging session when the pane restarts; the user signs in again.
