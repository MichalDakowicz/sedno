# Orchestration: handoff

_Updated 2026-11-17_

**State.** Goal 2 (English learning loop) started. The backend comes from a teammate's draft PR #55 (`backend-nauki`, services only, migrations 0009–0014, contract in `services/supabase/nauka.md`); decision recorded in `project.md` and `goal.md`. Student-facing skill names (nine skills in 0009) approved by the user. Nothing deployed to staging yet.

**Goal.** 1/17 bars (mapping, with evidence in `goal.md`; counts once #55 is merged).

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

**In flight.** Waiting for the teammate's fixes on `backend-nauki`. Then re-check the fixes, merge `main` + `backend-nauki` into `dev` (push to `dev`, autodeploy), tester runs the RPCs on staging.

**Parked.** Nothing.

**Claimed but unfinished.** None. Related Brief ideas left open: „sekcja co musze powtorzyc”, „Poziom opanowania wymagań”.

**Next.** Unit 3 (Mapa umiejętności `/umiejetnosci`) can start on a branch from `backend-nauki`; `nauka_mapa` is not touched by the majors. Testing it needs staging, so it waits for the deploy.

**Housekeeping.**
- Worktree `C:\sedno-pr55` (PR #55 checkout, junctions `node_modules` and `data/cke`, own `data/arkusze` from the import). Remove with `git worktree remove` when done; the junctions point into the main checkout, so delete them first.
- Worktree `C:\sedno-dev` with local branch `dev-scal` (`origin/dev` + `main` + `backend-nauki`, merges clean, not pushed). Rebuild it after the teammate's fixes.
