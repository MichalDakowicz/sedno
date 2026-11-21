# Orchestration: handoff

_Updated 2026-11-21_

**State.** Goal 3 („Poprawki od kolegi”, `goal.md`) is active: 8/9 wymagań spełnione, otwarta tylko skrócona runda (nie trafiła się na żywo). PR #88 scalony do `main` (92bde38); frontend wgrany na Firebase Hosting (8604a54 i 8375844). Domyślna trasa AI (Anthropic: `claude-sonnet-5-5` / `claude-haiku-5-5`) wdrożona i zweryfikowana w UI zarówno na stagingu (`localhost:5174`), jak i na produkcji (`https://trafwsedno.web.app`).

**What shipped on the branch.** Server default AI route for accounts without their own key (`SEDNO_AI_KEY`, `SEDNO_AI_MODEL_WAZNE`, `SEDNO_AI_MODEL_LEKKIE`, optional `SEDNO_AI_BASE_URL`, `SEDNO_AI_EFFORT_*`; limits `SEDNO_AI_LIMIT_DZIENNY` 200 / 24 h and `SEDNO_AI_MAX_TOKENS` 4096), readiness via `POST /ai {status:true}`, server-side retry of real upstream errors (client retries removed), clean round instructions (`zdania` / `czyPolecenie` in TrescRundy; DB data was clean), Pestka line for a shortened round, CKE recording notice in every player.

**Verified.** typecheck, build, 24 Deno tests (`npx -y deno@2 test --no-check=remote -A services/supabase/tests`), `deno check` of ai / nauka-ai / ai-klucz; testy UI przeglądarką: czat Pestki w UI na stagingu (`http://localhost:5174`) oraz na produkcji (`https://trafwsedno.web.app`) na kontach bez własnych kluczy, pełny streaming odpowiedzi, rejestracja zużycia w tabeli `ai_usage`.

**Open bars.**
- Shortened-round line not seen live (tester never reached 4 correct after a mistake). Code reviewed in audits.

**Blocked on the user.**
- Confirm daily limit (200) and copy „Na dziś wykorzystano limit rozmów z Pestką. Wróć jutro.” (window is rolling 24 h).
- `.env.staging` and `SEDNO_TEST_*` for the teammate: user hands them over privately.

**Brief.** „ai dla każdego konta” (c56ae715…) zamknięte jako done 21 listopada na polecenie właściciela. „staging dla kolegi” (97e050f2…) is the user's, unclaimed.

**Next.** Przy zmianach w `ai` / `nauka-ai` powtórzyć test na nowym koncie bez klucza (staging, potem produkcja). Then `NASTEPNE.md` section 00: 375 px overflow in rounds, Pestka dock answers with empty English examples on staging (qwen3:8b — model or rendering?), two-column interleave in 2023 podstawowy task 5 text A (parser).

**Housekeeping.**
- `npm run dev:staging` runs in terminal tab „dev staging” on port 5174 (5173 was taken), from `C:\sedno` on `main`.
- Staging deploy: merge the branch into `origin/dev` from the detached worktree in the session scratchpad, then push `HEAD:dev` (dev has no own content, only merges).
- Agent worktrees under `.claude/worktrees/` are left in place (branches `worktree-agent-*`, all merged into `poprawki-od-kolegi`).
