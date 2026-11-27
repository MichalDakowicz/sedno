# Orchestration: handoff

_Updated 2026-11-24 19:45_

**State.** Goal 4 (`goal.md`): 9 of 13 bars met. PRs #93 (sheet list + drawing), #95 (importer), #96 (lektury) merged and deployed to production at the owner's yes: migrations 0031–0043 via autodeploy, 361 sheets (`npm run wgraj`), WL texts for 63 works (`npm run lektury:teksty`, 5541 fragments), frontend on Firebase (`trafwsedno.web.app` answers 200; not clicked through after deploy). main green: typecheck, build, 96 Deno tests.

**On hold.** PR #94 (`czat-caly-ekran`, Sonnet's full-screen chat) conflicts with the owner's own PR #97 („rozlewany nav”, merged). Proposed to the owner: close #94 and port two small fixes (subject from URL by segment, focus back to the history button after closing the drawer). Waiting for the answer.

**Open bars.** Looks/Feels for the chat (superseded by #97; needs owner's call), keyboard/screen-reader pass of the sheet list, gap audit (not run: Claude credits low; run on Opus when available or on Codex).

**Owner decisions pending.** Close #94? Lektury tier comparison Sonnet vs Haiku (`SEDNO_TIER_LEKTUR`): where to set function env on staging.

**Known issues.** In `NASTEPNE.md` section 000 (lektury cards/plan, drawing on real touch, June/August sessions, chat questions).

**Staging.** Test account AI credentials backed up in `private.ai_credential_kopia_20261123` on `sedno-dev`. Dev servers from worktrees may still run on 5183 (rysowanie-ai) and 5184 (lektury); worktrees under `C:/Users/Michu/.t3/worktrees/sedno/`.

**Models.** Heavy work gpt-6.2-sol, UI Sonnet 5.5, testers Terra/Haiku; Codex has had usage limits (reset ~every few hours), Claude credits are low.

**19:45 update.** Opus audit done: blocker (my distress-detector change hid the 116 111 note for real disclosures with a school word) fixed in #99 and deployed; 7 audit items fixed in #100 (fragment limits, [F] citation check, daily limit per call, max_tokens cap, no „confirmed” client history, loader requires SEDNO_DB; anchors measured 51–110 ms). #98 (subject from URL segment) merged. All on production (autodeploy main 4b22ea1, Firebase). #94 closed (owner's #97 replaces it).
- Model comparison: Haiku invents detail without cards → lektury stay on Sonnet; staging back to `wazne` (`.env` SEDNO_TIER_LEKTUR empty; backups `*.kopia-20261124` in `~/supabase-hosting/projects/sedno-dev`).
- Chat memory: only the current chat is sent (whole, unbounded); other chats only on explicit reference via lexical index. Owner: leave as is.
- Open bars: keyboard/screen-reader pass of the sheet list; chat Looks/Feels moved to owner's #97.
