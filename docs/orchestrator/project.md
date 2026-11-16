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

## Open questions

- What "wersja binarna" means for a web app (contest rules PDF not read in full) (blocks: final submission, not this goal)
