# Orchestration: handoff

_Updated 2026-11-20_

**State.** Goal 3 („Poprawki od kolegi”, `goal.md`) is active: 8/9 bars met. PR #88 merged into `main` (92bde38) at the user's yes; functions reach production via autodeploy, the Firebase frontend is not redeployed yet. Staging (`dev`) runs the same code.

**What shipped on the branch.** Server default AI route for accounts without their own key (`SEDNO_AI_KEY`, `SEDNO_AI_MODEL_WAZNE`, `SEDNO_AI_MODEL_LEKKIE`, optional `SEDNO_AI_BASE_URL`, `SEDNO_AI_EFFORT_*`; limits `SEDNO_AI_LIMIT_DZIENNY` 200 / 24 h and `SEDNO_AI_MAX_TOKENS` 4096), readiness via `POST /ai {status:true}`, server-side retry of real upstream errors (client retries removed), clean round instructions (`zdania` / `czyPolecenie` in TrescRundy; DB data was clean), Pestka line for a shortened round, CKE recording notice in every player.

**Verified.** typecheck, build, 24 Deno tests (`npx -y deno@2 test --no-check=remote -A services/supabase/tests`; deno is not installed, npx works), `deno check` of ai / nauka-ai / ai-klucz; three Opus audits (all majors fixed; the last one fixed by counting aborted calls again); Haiku tester on staging: chat streams, recording notice in role=status, no instruction junk, notice looks at 375/1280 light/dark; clean reload has no console errors (earlier `useTutor poza TutorProvider` was HMR noise).

**Open bars.**
- Shortened-round line not seen live (tester never reached 4 correct after a mistake). Code reviewed in audits.

**Blocked on the user.**
- Server secrets above in the env of `sb-sedno` / `sb-sedno-dev` (infra, user's call). Then check a fresh account without a key.
- Confirm daily limit (200) and copy „Na dziś wykorzystano limit rozmów z Pestką. Wróć jutro.” (window is rolling 24 h).
- `.env.staging` and `SEDNO_TEST_*` for the teammate: user hands them over privately.

**Claimed but unfinished (Brief).** „ai dla każdego konta” (c56ae715…) stays claimed until the key is set. „staging dla kolegi” (97e050f2…) is the user's, unclaimed.

**Next.** Redeploy the Firebase frontend from `main` when the user asks (`firebase deploy --only hosting`). Then `NASTEPNE.md` section 00: 375 px overflow in rounds, Pestka dock answers with empty English examples on staging (qwen3:8b — model or rendering?), two-column interleave in 2023 podstawowy task 5 text A (parser).

**Housekeeping.**
- `npm run dev:staging` runs in terminal tab „dev staging” on port 5174 (5173 was taken), from `C:\sedno` on `main`.
- Staging deploy: merge the branch into `origin/dev` from the detached worktree in the session scratchpad, then push `HEAD:dev` (dev has no own content, only merges).
- Agent worktrees under `.claude/worktrees/` are left in place (branches `worktree-agent-*`, all merged into `poprawki-od-kolegi`).
