# Orchestration: handoff

_Updated 2026-11-23 22:20_

**State.** Goal 4 (`goal.md`) active: all matura subjects, sheet list by session type, drawing on figures with AI check, lektury for Pestka, full-screen chat. Nothing merged to `main` yet; all work on branches, staging (`dev`) has `rysowanie-ai` merged and 361 sheets (115 drawing questions).

**Models (owner).** Heavy work gpt-6.2-sol, UI Sonnet 5.5, testers alternate gpt-6.1-terra / Haiku 5.5. Owner allowed Sonnet for lektury so they do not wait for Codex limits.

**Branches.**
- `wszystkie-matury` (importer, 5 commits + uncommitted sol work in worktree t3-b3beb382…): 361 sheets, kontrola 0 problems. Sol resumes at 21:30 (scheduled task): June/August search (only OKE Łomża 2012/2014 without keys so far), drawing marks (false positives), then parser fix round from `notes/qa-arkuszy-cel4.md`.
- `lista-arkuszy`: 12 subjects, session groups, profile subjects; my CSS fixes (focus, select alignment, math-field overflow). Tested by Terra + Haiku.
- `czat-caly-ekran` (renamed from `czat-pelny-ekran` after a rebase; old remote branch stale): full-screen chat without top nav; focus fix by me. Tested by Haiku.
- `rysowanie` → `rysowanie-ai` (on top of `lista-arkuszy`): SVG drawing layer, self-check, AI grading for drawing questions (41 Deno tests). Deployed to staging; UI test with AI not done yet (Haiku hit limit; Terra test scheduled 21:30).
- `lektury` (+ `lektury-tresc-1/2/3`): catalog of 114 works + six-section notes (sol), Sonnet server builder (layers: wydarzenia/postacie/motywy JSON in `services/supabase/lektury/`, WL fragments loader, FTS, citation ids, keyword-without-lektura rule) and 3 Sonnet content builders. Resumed after Claude limit at 21:20.

**Staging changes.** Test account's AI credentials (Ollama, OpenAI) moved to `private.ai_credential_kopia_20261123` on `sedno-dev` so it uses the Claude server route (owner approved).

**Baseline lektury tests.** qwen run (invalid, weak model) and Claude run: answers hard to verify (whole-book links), refusals of known facts, vague plans, some false facts. Rzecki does die in „Lalka” (tester was wrong).

**Open questions for the owner.** Sonnet's chat questions (stop button, grouping conversations, keyboard viewport). Production merge/deploy needs the owner's yes.

**Next.** Collect builder reports, verify, deploy `lektury` to staging (migrations + `wgraj-teksty`), re-run the lektury test (after), merge order into main via PRs: lista-arkuszy → rysowanie-ai → czat-caly-ekran → wszystkie-matury (data) → lektury.

**22:20 update.** Codex usage limit until 2026-11-24 02:49; scheduled task resumes at 02:55 four Codex threads: lektury server fix round (worktree t3-bc3e64b6, uncommitted), importer fix round 2 (t3-b3beb382), app fixes 375 px overflow + empty self-check (t3-fffd8f3b), lektury content part 1 (t3-f53e5da6). Claude credits low: no new Claude agents.
- Done since 21:25: staging has `lektury` (migrations 0031–0037, WL texts for 63 works), importer fix round 1 (361 sheets, 100 drawing questions, old 47 ids kept) uploaded to staging; lektury content parts 2 and 3 finished (38 + 37 works, pushed); drawing undo fix (StrictMode) pushed.
- Tests: lektury after-test (Terra) shows partial improvement, open issues in the server fix round; sheets QA round 2 (Terra) open issues in importer round 2.
- June/August sessions: no official copies with keys (only OKE Łomża 2012/2014 without keys); groups stay hidden.
- After all content parts: merge `lektury-tresc-1/2/3` into `lektury`, `npm run lektury:generuj`, deploy to staging, re-test lektury.
