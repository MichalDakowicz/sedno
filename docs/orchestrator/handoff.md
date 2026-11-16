# Orchestration: handoff

_Updated 2026-11-16_

**State.** Three PRs open, none merged:
- https://github.com/MichalDakowicz/sedno/pull/46 `rozmowy-konto` at `6c8ffaf`: chats with Pestka on the account, essay prompt fix. Also merged into `dev` (`0a33c9f`), so staging has it.
- https://github.com/MichalDakowicz/sedno/pull/48 `ciemny-motyw` at `23d88c8`: dark theme. Not on `dev`.
- https://github.com/MichalDakowicz/sedno/pull/47 `orkiestrator-dokumenty`: these docs and `NASTEPNE.md`.

All checks (typecheck, build) are green on each branch, and `rozmowy-konto` and `ciemny-motyw` merge together without conflicts. A direct push to `main` was blocked by a permission check, so docs go through PR #47.

**Goal.** Achieved, 12/12 bars, archived in `goals/2026-11-16-do-domkniecia.md`.

**Done this session.**
- Chats with Pestka on the account. Logout leak fixed, then three audit rounds: confirmation flag instead of clocks, owner key, SIGNED_OUT clear, pull on tab return, 3 s logout flush. Verified by three tester runs on staging, my own offline check, and a final audit with no blockers or majors.
- Informatyka after login on staging: 4 sheets, Python and SQL run, answer survives reload.
- Essay discussion: the model gets the app's word count, range and given start. Checked on gpt-6-luna.
- Dark theme following the system setting. Verified by two tester runs over every view in dark and light at desktop and 375 px, and two audits with no blockers or majors and no light regression.

**Not verified.**
- Logout and login with another account in a browser (code reading only).
- Essay discussion on sol (no sol provider on the test account).
- Light theme at 375 px after the dark-theme change.

**In flight.** Nothing.

**Parked.** Nothing.

**Claimed but unfinished.** None. Brief is linked to project `sedno`, and no entries matched this goal. Three workspace-panel entries from 9 November are still "doing" under another session's claim.

**Next.**
- Merge #46, #47 and #48 (user).
- Then the minors in `NASTEPNE.md` section 0: chat sync races, ownerless chats, deleting chats and retention, restarting the essay discussion, the `?omow=1` link, Excalidraw selection colour, and the light toggle.

**Housekeeping.**
- Test account on staging:
  - "Ważne" tier is on openai gpt-6-luna; the user said to keep it.
  - Test chats remain.
  - The 2025 English sheet is submitted with the test essay.
  - A local Python draft on informatyka 2023 task 2 was replaced with `print(2+2)`; it is browser-local only.
- `npm run dev:staging` runs from `.claude/worktrees/ciemny-motyw` in a terminal tab.
- Worktrees `.claude/worktrees/rozmowy-konto`, `rozmowy-poprawki` and `ciemny-motyw` can be removed after merging. Branch `rozmowy-poprawki` equals `rozmowy-konto`.
