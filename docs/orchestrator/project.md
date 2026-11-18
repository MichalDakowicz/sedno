# Orchestration: project

How agents ship and track this project. Rules and testing live in CLAUDE.md; the goal
lives in goal.md; the last session's state lives in handoff.md.

## Project

- Root: `sedno`
- Layout: npm workspaces: `apps/web` (React + TS + Vite), `packages/ui` (tokens), `services/supabase` (backend, migrations), `services/arkusze` (CKE import)
- Design source: existing app on `main` plus `docs/*.html` and `apps/web/README.md`. Web leads.
- Task list: `NASTEPNE.md` (section 0 first)
- Brief: project `sedno` (formerly "konkurs ai"), id `9d7c9229-2524-4ff3-89ce-913ab972ce7f`, linked to this checkout
- Regression pass at session start: when stale

## Shipping

- Autonomy: push (commit + push feature branch, open PR; ask before each deploy)
- Staging: pushing to `dev` is allowed for agreed units (autodeploy applies migrations and functions)
- Production (`main` merge, `npm run wgraj` without `SEDNO_DB`, `deploy.sh`): always ask
- Branch per unit, base `main`; docs-only changes go straight to `main`
- Always ask first: migrations outside staging, production data, infra

## Testing notes

- Checks: `npm run typecheck`, `npm run build` (no tests or lint yet)
- Staging app: `npm run dev:staging` (port 5173), in the user's terminal tab
- Logging in needs the test account password: the user signs in once in the built-in browser; agents never type it

## Models

builder `sonnet` · tester `haiku` · gap auditor `opus`

## Decisions

- 2026-11-16: templates go in two phases: first the ones without the skill model (search, settings, student profile, dashboard layout, exam countdown), then the learning loop for English.
- Skill taxonomy comes from CKE marking rules; student-facing names need the user's approval before merge.
- Dashboard layout is per subject. The „Do matury” widget is optional (on in „Egzamin”, off in „Nauka”).
- 2026-11-17 (phase 2): all three English levels of formuła 2023; quick rounds draw real tasks from all sheets of the level, unseen first; mastery estimator is Elo per skill (task difficulty from type and points until there is data to calibrate).
- 2026-11-17 (phase 2): the backend of the learning loop comes from a teammate's PR #55 (`backend-nauki`, services only). The orchestrator verifies it (import report, code spot-checks, audit, staging) and builds the frontend on its RPCs; fixes go to that branch or to the teammate. Student-facing skill names in migration 0009 approved by the user. Authored English exercises (migration 0010) may top up a quick round when fewer than 5 CKE tasks are left.
- 2026-11-17 (phase 2, later): the teammate also built and merged the frontend (PR #56: Nauka, Mapa umiejętności, Szybka runda, Rozbiór, Powtórki, Uczeń uczy; migration 0015 fixes both audit majors). The orchestrator's unit-3 branch `mapa-umiejetnosci` is a duplicate and is dropped (branch kept, not merged). From here the orchestrator verifies the merged phase 2 against `goal.md` and turns gaps into fix units.
- 2026-11-18: displayed mastery = Elo estimate × retention; breakdown before/after = estimate without decay (PRs #66–#68 merged at the user's yes).
- Requirement codes per task are in the CKE marking-rules PDFs (`data/cke/<rok>/*-zasady.pdf`, readable with `pdftotext -layout`); requirement wording is from the core curriculum.

## Open questions

- What "wersja binarna" means for a web app (contest rules PDF not read in full) (blocks: final submission, not this goal)
