# Orchestration: handoff

_Updated 2026-11-17_

**State.** Templates phase 1 is merged into `main` (2026-11-17, at the user's request): #49 `ustawienia`, #50 `profil-ucznia`, #51 `wyszukiwanie`, #52 `uklad-pulpitu`, #53 `do-matury`, plus #54 with these docs. `main` matches the chain tip; typecheck and build are green. Migrations 0006–0008 go to production through the `main` autodeploy; the orchestrator could not read the autodeploy log (no server unit is in a failed state), so confirm with `journalctl --user -u sedno-autodeploy@main` if needed.

**Goal.** Achieved, 17/17 bars, archived in `goals/2026-11-17-szablony-faza-1.md`. „Profile insights can be deleted” was accepted by the user on code and audit evidence (the test account has no computable insights). No active goal.

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
- User: confirm exam dates in BIP CKE; review the support note copy; check that migrations 0006–0008 reached production.
- Then draft goal 2: learning loop for English (skill taxonomy from CKE marking rules with student-facing names for approval, mapping tasks to skills, mastery estimate, Mapa umiejętności, Nauka, Szybka runda, Rozbiór, Powtórki).

**Housekeeping.**
- `npm run dev:staging` runs from the main checkout `C:\sedno`, now on `main`.
- This run's worktrees are removed; its branches (`ustawienia`, `profil-ucznia`, `wyszukiwanie`, `uklad-pulpitu`, `do-matury`, `orkiestrator-cel`) are merged and kept.
- Testing from a worktree without its own `node_modules` resolves `@sedno/ui` from the main checkout and 403s fonts; test from the main checkout instead.
- The built-in browser loses the staging session when the pane restarts; the user signs in again (agents never type the password).
- Test account: several test chats with Pestka remain; settings, layouts and profile were reset; profile answers left: motywacja, czas 20 min, cele.
