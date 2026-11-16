# Orchestration: handoff

_Updated 2026-11-16_

**State.** Branch `rozmowy-konto` at `6c8ffaf`, pushed. Also merged into `dev` (`0a33c9f`), staging has it. Checks: typecheck and build green. PR https://github.com/MichalDakowicz/sedno/pull/46 open, not merged. `main` has local docs commits not pushed yet (the push was blocked by a permission check; the user decides).

**Goal.** Close "Do domknięcia" (chats on the account, informatyka and essay discussion checked on staging): 11/12 bars met, status active. Open bar: Looks, because the app has no dark theme and "both themes" cannot apply; waiting for the user's OK to drop it.

**Done this session.**
- Chats with Pestka on the account: merged `main` into `rozmowy-konto`, fixed logout leak, then three audit rounds (confirmation flag instead of clocks, owner key, SIGNED_OUT clear, pull on tab return, logout flush with 3 s limit). Verified by three tester runs on staging, own offline check, and Opus audit 3 with no blockers or majors.
- Informatyka after login on staging: 4 sheets, Python and SQL, answer survives reload (tester run 2).
- Essay discussion: the model now gets the app's word count, range and the given start (b441768). Checked on gpt-6-luna (tester run 3).

**Not verified.** Logout and login with another account in a browser (code reading only). Essay discussion on sol (the test account has no sol provider). Dark theme (the app has none).

**In flight.** Nothing.

**Parked.** Nothing.

**Claimed but unfinished.** None. Brief: repo linked to project `sedno`; no Brief entries matched this goal's items. Three Brief entries about the workspace panel are still "doing" from 9 November under another session's claim.

**Next.** Merge PR #46 (user). Then the minors listed under section 0 of `NASTEPNE.md` (chat sync races, ownerless chats, deleting chats, essay discussion restart, `?omow=1` link).

**Housekeeping.**
- Test account changes on staging: "Ważne" tier switched from ollama-serwer to openai (gpt-6-luna); test chats ("Test synchronizacji", "Lokalna bez wlasciciela" local only, others) and the submitted 2025 English sheet with the test essay remain.
- Worktrees `.claude/worktrees/rozmowy-konto` (runs `npm run dev:staging` in a terminal tab) and `.claude/worktrees/rozmowy-poprawki` (branch `rozmowy-poprawki`, same commit as `rozmowy-konto`) can be removed after the merge.
