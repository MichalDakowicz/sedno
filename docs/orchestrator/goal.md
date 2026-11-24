# Goal

_Set 2026-11-23 · status: active_

**Goal.** Every planned matura subject is in Sedno with sheets from all CKE sessions that exist (main, additional, resit, CKE mock), as full text, grouped by session type in the sheet list; the full-screen Pestka chat has a new look.

**Subjects.** biologia, chemia, filozofia, fizyka, geografia, historia (only „historia”, not music or art history), informatyka, język łaciński i kultura antyczna, język polski, matematyka, wiedza o społeczeństwie, angielski. Other foreign languages are out.

**In scope.** `services/arkusze` (catalog, download, parsers, `kontrola`, staging upload), `apps/web` (sheet list grouping, subject tabs, profile subjects, full-screen chat), `docs/` pages that describe the sheet list or chat.
**Not in this goal.** Oral exams, other foreign languages, publishers' mock exams (Operon, Nowa Era: copyright), vocational exams, production upload and production deploy without the user's yes, exam dates for new subjects that are not confirmed on the CKE site.

**Data contract** (shared by importer and app):
- `przedmiot`: `angielski | matematyka | informatyka | polski | biologia | chemia | fizyka | geografia | historia | wos | filozofia | lacina`
- entry gets `termin: "glowny" | "dodatkowy" | "poprawkowy" | "probny"` (missing = `glowny`) and optional `czesc` (e.g. „Część 1”) when one session has several booklets.
- id: `<przedmiot>-<poziom>-<rok>-<sesja ascii>[-<czesc>][-formula-2015]`. Ids of the 47 sheets already in the database do not change (student progress is keyed by id).
- New subjects use only block types that exist in `apps/web/src/arkusze/typy.ts`; anything new is agreed first.

## Done when

### Works
- [x] `npm run pobierz` builds a catalog with all 12 subjects, formuła 2015 and 2023, every level CKE published, sessions main / additional / resit and CKE mocks; missing files are listed, not guessed · proof: 361 sheets, 12 subjects, formuła 2015+2023, główny + próbne CKE; June/August not published officially with keys (CKE, 8 OKE, 1720 URL guesses checked) — documented in README
- [x] `npm run importuj` turns every catalog entry into a sheet with text content (paragraphs, sources, tables, code; images only for figures, maps, charts, formulas that text cannot carry), closed questions with the key letter, open questions with the CKE marking rule for self-check · proof: full text, 100 drawing questions, two QA rounds vs PDF (Terra), round-2 fixes
- [x] `npm run kontrola` passes for all sheets; point totals match the sheet for a sample of every subject · proof: 0 problems, 33 import warnings (run by orchestrator)
- [x] Existing 47 sheets keep their ids and content quality (no regression in English, math, informatics) · proof: 47/47 ids, tasks, points and keys unchanged (regression diff)
- [x] Sheets uploaded to staging; a sheet of every subject opens, takes answers and checks them · proof: staging + production (361); UI tests Terra/Haiku: open, answer, check, ring
- [x] Drawing tasks („narysuj”, „zaznacz na mapie”, „uzupełnij wykres”): importer marks them with `rysowanie: { obraz, polecenie? }`; the student draws on that figure in the sheet; AI checks the drawing against the marking rule when the account has AI, otherwise self-check · proof: SVG drawing layer, self-check, AI grading in nauka-ai (41 tests), staging test: AI 0/2 with justification; PR #93
- [x] Lektury: Pestka has the official list of required readings for the Polish matura (sources, „do weryfikacji” where unconfirmed) and authored notes (six sections) for every work; detection without false positives; tested on staging before/after · proof: 114-work catalog, 113 works with layers, 63 WL texts; 7 test rounds on staging, last without blocker; PR #96, production
- [x] Sheet list: tab per subject, groups Termin główny · Termin dodatkowy · Termin poprawkowy · Próbne (and formuła where both exist); student can pick the new subjects in onboarding and profile · proof: PR #93 merged; Terra/Haiku UI tests

### Looks
- [ ] Sheet list with 12 subjects and the full-screen chat follow `DESIGN.md` (lines, not cards) at 375 and 1280 px, light and dark · proof:
- [ ] Full-screen chat has a new, deliberate layout (Sonnet design pass, before/after screenshots) · proof:

### Feels
- [ ] Subject tabs and groups work by keyboard and screen reader; chat input, history and scroll behave on phone and desktop · proof:

### Holds up
- [ ] Audit has no blocker or major findings; no CKE files or data in the repo · proof:

### Shipped
- [x] `npm run typecheck`, `npm run build` green; branches + PRs; tested on staging (Terra and Haiku alternating); `NASTEPNE.md`, `services/arkusze/README.md` and Brief updated; production only on the user's yes · proof: main after merges: typecheck, build, 96 Deno tests; PRs #93 #95 #96 merged; production deployed (migrations 0031–0043, sheets, WL texts, Firebase)

## Blocked on
- Nothing.

## Changes
- 2026-11-24: PRs #93, #95, #96 merged and deployed to production at the owner's yes; #94 (chat) on hold — owner merged own full-screen chat (#97)
- 2026-11-23: owner: Pestka test on lektury + full reading list with summaries as AI context
- 2026-11-23: owner: drawing on figures with AI check added; June/August sheets: find official CKE/OKE copies (not on CKE „arkusze” pages)
- 2026-11-23: goal set (approved by the user): full text, not page crops; formuła 2015 included
