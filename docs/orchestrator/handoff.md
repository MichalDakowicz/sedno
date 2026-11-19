# Orchestration: handoff

_Updated 2026-11-18_

**State.** Goal 2 (English learning loop) is achieved, 17/17 bars, archived in `goals/2026-11-18-petla-nauki-angielskiego.md`. No active goal. `main` is at `e5e82c6`; production and staging databases run migrations up to 0019 (autodeploy logs: `gotowe: sedno ← main e5e82c6`, staging at the same code).

**How it went.** The teammate built the backend and the views (PRs #55, #56, then #57–#65). The orchestrator verified them against the goal (import report, PDF spot-checks, three Opus audits, five Haiku tester runs on staging, a hand calculation of mastery) and built the fixes: #66–#68 (abandoned rounds, listening segment, breakdown summary, decay as estimate × retention, Powtórki grouping) and #69–#71 (writing skill out of automatic ranking, „mało danych” threshold without ageing, delete only open rounds, focus fixes, „Ćwicz” first, dashboard widgets Powtórki / Kontynuuj / Wybierz temat). All merged at the user's yes.

**Decisions this run.** Backend and views from the teammate, orchestrator verifies and fixes. Student-facing skill names approved (migration 0009). Displayed mastery = Elo estimate × retention; breakdown before/after = estimate without decay. Skills without scored CKE evidence (pisanie) are left out of automatic recommendations and the weekly plan. „Usuń” for unfinished rounds without confirm (as in the student profile).

**Not verified / left.** Listed in `NASTEPNE.md` section 0 („Pętla nauki angielskiego, faza 2”): micro-skills, weekly trend, low-confidence bar and names/codes toggle on the map; diagnosis prompt at „mało danych”; „Odłóż” in Powtórki; listening segment seek on iOS Safari; per-question fragment after answering inside „Treść zadania”; dashboard runs the map 3–4 times per load (not measured); an occasional „Failed to load resource: 400” on page load (not seen on the last clean load). The production frontend (Firebase Hosting `trafwsedno`) was redeployed by the orchestrator from `main` at the user's request on 2026-11-18 (`firebase deploy --only hosting`); production serves the new bundle (contains the #66–#71 views); smoke-tested signed in (read-only, no rounds started): dashboard shows Powtórki, Kontynuuj and the map widget; /umiejetnosci, /nauka and /powtorki (with „Szacowany czas”) load; no console errors.

**In flight.** Nothing. Test data on the staging account: a few unfinished rounds and many listening mistakes in Powtórki.

**Claimed but unfinished.** None.

**Next.**
- User: agree with the teammate on the split of work for the next goal (two agent teams worked on the same goal twice this run).
- Next orchestrator: draft goal 3 with the user (candidates in `NASTEPNE.md`: other subjects, „Do matury” forecast and weekly plan, other formats).

**Housekeeping.**
- `npm run dev:staging` runs in the terminal tab „dev staging” from `C:\sedno` on `main`.
- Merged branches deleted on GitHub (only `main` and `dev` remain) and locally for this run. Left: `C:\sedno-dev` (junction `node_modules`; local branch `dev-scal` for staging merges) and the worktree with the dropped unmerged branch `mapa-umiejetnosci`; worktrees of other sessions untouched.
- The built-in browser loses the staging session when the pane restarts; the user signs in again.
- After switching branches under a running dev server, restart it: stale hot-reload modules cause false console errors (`useTutor poza TutorProvider`).
