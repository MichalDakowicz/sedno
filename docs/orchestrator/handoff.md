# Orchestration: handoff

_Updated 2026-11-17_

## Phase 2 release

[PR #56](https://github.com/MichalDakowicz/sedno/pull/56) merged into `main` at `423698d`. Production serves the connected Nauka, Mapa umiejętności, Szybka runda, Rozbiór, Powtórki and Uczeń uczy AI views. Pestka can inspect the mathematics scratchpad and offer figures for the student to insert. The staging branch received the same code at `386f911`. [Firebase Hosting](https://trafwsedno.web.app/)

Migration 0015 addresses both audit findings below. The selected incorrect item comes first, a correct retry removes that item, and a subsequent strong score in a checked sheet clears older errors in the skill.

Production checks confirmed the released Firebase assets, login redirect and availability of the updated `nauka_start` signature. A local Chromium test at 375 px exercised the full loop using PGlite and imported CKE sheets, including a failed save and reload. The scratchpad and Uczeń uczy AI tests used simulated model responses. Authenticated staging smoke and the quality of handwriting feedback with the account's Luna model remain open.

## Unit 1 handoff

**State.** Goal 2 (English learning loop) started. The backend comes from a teammate's draft PR #55 (`backend-nauki`, services only, migrations 0009–0014, contract in `services/supabase/nauka.md`); decision recorded in `project.md` and `goal.md`. Student-facing skill names (nine skills in 0009) approved by the user. The teammate merged #55 into `main` as is (`eccbca7`, 2026-11-17 21:39), before the audit fixes, so migrations 0009–0014 go to production through the `main` autodeploy. `main` was then pushed to `dev` (staging, `a420413`).

**Goal.** 1/17 bars (mapping, with evidence in `goal.md`).

**Verified (unit 1, on PR #55 at `d207542`).**
- Importer run on all 12 English formuła 2023 sheets: 572/572 questions with CKE codes, 0 missing; the catalogue has no other formuła 2023 English sheets.
- Migration 0009 vs import: all 572 match (scratch script, not committed).
- Hand check against marking-rules PDFs: 2025 R zad. 1 and 6, 2024 P zad. 2 and 5 (26 questions) match.
- Typecheck and build green on the branch. Deno not installed locally, so edge functions were not run.
- Opus gap audit of 0009–0014, functions and scripts: 0 blockers, 2 majors, 10 minors (below). Both majors confirmed in the SQL by the orchestrator.

**Audit findings handed to the teammate (user's decision: the teammate fixes them, as a new migration 0015, not by editing 0011/0012).**
- Major: wrong tasks never come back. `nauka_start` orders by `last_seen nulls first` and takes no item list, so a missed task goes to the back (0011 ~l.295–322, 0012 ~l.77–89).
- Major: `last_mistake_at` comes from any sample (sheets too) but only a session with at least 75% clears it, so after one checked sheet every skill shows „Wróć do ostatniego błędu” (0011 ~l.127, 137–142, 193–197).
- Minors: open-session answers do not feed mastery; 10 abandoned rounds block new ones; shown `score` does not decay; before/after null in „mało danych”; `learning_map` run 3× on the last answer under the lock; nauka.md difficulty values out of date; top-up applies when the whole CKE pool is under 5; new sheets need a new migration for codes; CKE key readable from `sheets` (pre-existing, own data only); `sheet_progress` is client-controlled (own data only).

**In flight.** Unit 3 (Mapa umiejętności) on branch `mapa-umiejetnosci`. The teammate's audit fixes are expected as a new migration 0015 on a new branch; re-check them when they arrive.

**Parked.** Nothing.

**Claimed but unfinished.** None. Related Brief ideas left open: „sekcja co musze powtorzyc”, „Poziom opanowania wymagań”.

**Next.** Finish unit 3 (test on staging, audit, PR), then unit 4 (Szybka runda).

**Housekeeping.**
- Worktree `C:\sedno-pr55` (PR #55 checkout, junctions `node_modules` and `data/cke`, own `data/arkusze` from the import). Remove with `git worktree remove` when done; the junctions point into the main checkout, so delete them first.
- Worktree `C:\sedno-dev` with local branch `dev-scal` (`origin/dev` + `main`, pushed to `dev`). Reuse it for staging merges.
