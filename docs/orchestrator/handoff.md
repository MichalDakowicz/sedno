# Orchestration: handoff

_Updated 2026-11-17_

**State.** Templates phase 1 is built as a stacked chain of five PRs, none merged. Merge in this order; each PR's base is the previous branch:

1. https://github.com/MichalDakowicz/sedno/pull/49 `ustawienia` (settings, migration 0006)
2. https://github.com/MichalDakowicz/sedno/pull/50 `profil-ucznia` (student profile, shared sync `konto/kontoSync.ts`, Pestka priorities and support note, migration 0007)
3. https://github.com/MichalDakowicz/sedno/pull/51 `wyszukiwanie` (Ctrl+K search, chat switching blocked while Pestka answers)
4. https://github.com/MichalDakowicz/sedno/pull/52 `uklad-pulpitu` (dashboard widgets, per-subject layouts, migration 0008)
5. https://github.com/MichalDakowicz/sedno/pull/53 `do-matury` (exam countdown, tip 1c9be9d)

Later fixes were committed on the lowest branch that owns the file and merged up the chain, so every branch contains everything below it. Typecheck and build are green on every branch. Migrations 0006–0008 are on staging (`dev`); production gets them with the merge. This branch (`orkiestrator-cel`) holds the goal, this handoff and `NASTEPNE.md`.

**Goal.** 16/17 bars met (`goal.md`). Open: „Profile insights can be deleted” was not verified live, because the test account has no computable insights; „Usuń” is verified in code and two audits only. The user decides whether that is enough.

**Verified.** Per unit: build, own checks, tester run on staging, gap audit, fixes, re-test. Then a full regression of all five flows, a final audit of the whole chain (0 blockers; its majors and minors fixed), and a last browser check: 375 px with large text on every touched view and both sheet pages, simulated network failure, the support note, send blocking, shared switch, new search actions.

**Not verified.**
- The onboarding step „Jak się uczysz?” (test account has finished onboarding; code only).
- Deleting a profile insight live (see goal).
- Past-exam display on /do-matury (no past dates yet).
- Pestka's reply quality on the light model: it sometimes uses masculine forms and repeated the support sentence once with a grammar slip; the fixed support note under the reply is deterministic.

**Decisions this run.** Two phases (this one, then the English learning loop). Dashboard layout per subject; „Do matury” widget optional (on in Egzamin, off in Nauka). Search question starts a new chat. Exam dates 2027 from the CKE communiqué of 20 Aug 2026 via a news site, marked „do weryfikacji”. Support note copy for difficult messages (trusted adult + 116 111) written by the orchestrator; the user should review it. Round 4 on the settings test stage approved by the user.

**In flight.** Nothing.

**Parked.** Nothing. Small leftovers are in `NASTEPNE.md` (section 0, „Szablony, faza 1”).

**Claimed but unfinished.** None. No Brief entries matched this goal.

**Next.**
- User: review and merge #49 → #53 in order; confirm exam dates in BIP CKE; review the support note copy.
- Then draft goal 2: learning loop for English (skill taxonomy from CKE marking rules with student-facing names for approval, mapping tasks to skills, mastery estimate, Mapa umiejętności, Nauka, Szybka runda, Rozbiór, Powtórki).

**Housekeeping.**
- `npm run dev:staging` runs from the main checkout `C:\sedno`, which is detached at `do-matury`. Switch it back to `main` after merging.
- Worktrees for this run: `.claude/worktrees/agent-a601c43402eb2aefe` (ustawienia), `agent-aff129185dfcedc63` (profil-ucznia), `agent-a43f08ce2faa615d0` (wyszukiwanie), `agent-aed5faa7f43ed087c` (uklad-pulpitu), `agent-a6f0a28fb22565e16` (do-matury), `orkiestrator-cel`. Remove after merging.
- Testing from a worktree without its own `node_modules` resolves `@sedno/ui` from the main checkout and 403s fonts; test from the main checkout instead.
- The built-in browser loses the staging session when the pane restarts; the user signs in again (agents never type the password).
- Test account: several test chats with Pestka remain; settings, layouts and profile were reset; profile answers left: motywacja, czas 20 min, cele.
