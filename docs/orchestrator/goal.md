# Goal

_Set 2026-11-17 · status: active_

**Goal.** A student of English sees on the skill map what they can and can't do yet, gets a recommendation of what to practise, does a quick round of tasks for that skill, sees a breakdown with the change in mastery, and fading skills come back in Powtórki. Mapa umiejętności, Nauka, Szybka runda, Ekran rozbioru and Powtórki stop being templates.

**In scope.**
1. **Mapowanie**: the importer extracts the CKE requirement code(s) for every task of the English sheets in formuła 2023 (2023–2026), all three levels (podstawowy, rozszerzony, dwujęzyczny); a taxonomy file maps codes to student-facing skills grouped into areas (słuchanie, czytanie, środki językowe, pisanie). Requirement wording comes from the core curriculum; student-facing names are approved by the user before merge (approved 2026-11-17: the nine skills in migration 0009 of PR #55).

**Backend source.** Mapping, model, sessions, breakdown, recommendations and Powtórki RPCs come from PR #55 (`backend-nauki`, migrations 0009–0014, contract in `services/supabase/nauka.md`). Units 1–2 verify it. The frontend for units 3–7 also came from the teammate (PR #56); the orchestrator verifies it against the bars below and fixes gaps. Authored exercises (migration 0010) only top up a round when CKE tasks run out; they are not generated variants.
2. **Model opanowania**: per-skill Elo (decision 2026-11-17) from sheet answers and quick-round attempts; task difficulty starts from task type and points (no multi-student calibration yet); uncertainty from the number of attempts with a „mało danych” state; decay with time since last practice. Attempts stored with owner-only RLS (migrations of PR #55).
3. **Mapa umiejętności** (`/umiejetnosci`): areas and skills with a mastery bar and the CKE code in the background, „mało danych”, a skill panel with evidence (links to tasks) and „Ćwicz”; the dashboard map widget uses the same data.
4. **Szybka runda**: 5–8 real tasks of one skill from all sheets of the student's level, unseen first (decision 2026-11-17); immediate check with the key; recording for listening tasks; streak shortens, a mistake adds a task; results feed the model.
5. **Ekran rozbioru**: result, what went well and what didn't, mastery before and after, one recommended next step.
6. **Nauka** (`/nauka`): today's recommended skill (weakest, weighted) and the formats that really exist (szybka runda, arkusz, rozmowa z Pestką); free topic goes to Pestka.
7. **Powtórki** (`/powtorki`): fading skills and wrong tasks to repeat; start a quick round from one.

**Not in this goal.** Other formats (Napraw błąd, Uczeń uczy, Krok po kroku, Tutor sokratejski, Wizualizacje); generated task variants; essay (wypowiedź) as mastery evidence; other subjects; forecast and weekly plan in „Do matury”; Mapa wiedzy; Analiza zdjęcia.

## Done when

### Works
- [x] Every English task in formuła 2023 (all three levels) has at least one requirement code and a skill; unmapped tasks = 0 · proof: import report · _2026-11-17, PR #55 at `d207542`: import 572/572 with codes across 12 sheets (the whole catalogue); migration 0009 matches the import on all 572; 26 questions (2025 R zad. 1, 6; 2024 P zad. 2, 5) checked by hand against the CKE marking-rules PDFs. PR #55 merged into `main` by the teammate the same day (`eccbca7`)._
- [x] Mastery on the map matches a hand calculation for the test account · proof: tester + script · _2026-11-18, staging after 0017/0018: recomputed in the browser from `nauka_dowody` rows (dedupe by source, last 40, Elo from 1000 with K = 48 × weight, estimate × retention, threshold n ≥ 3 and aged weight ≥ 1.2): „Uchwyć sens nagrania” 0.289 / confidence 0.848 and „Dobieraj słownictwo i gramatykę” 0.542 / 0.643, identical to `nauka_mapa`._
- [x] Quick round → breakdown → map change → Powtórki works end to end on staging after login · proof: tester run · _2026-11-18, staging, main `904d468`: round on „Dobieraj słownictwo i gramatykę” 6→8 tasks with 2 wrong; breakdown „6 z 8 poprawnie”, before „Mało danych”, after 54%; map shows 54% and 8 attempts; Powtórki lists both wrong tasks and a round started from 9.3 opens with that task._
- [x] Attempts survive reload and show on a second device/tab after reload · proof: tester run · _2026-11-18: reload mid-round kept „Zadanie 3 z 6” and the streak; a second tab on the same round URL showed the same state._
- [x] Typecheck and build green; no console errors in touched views · proof: checks, tester console read · _2026-11-18, `904d468`: typecheck and build green; no console errors on /, /umiejetnosci, /nauka, round, breakdown, /powtorki._

### Looks
- [ ] Matches the templates and docs (`docs/mapa-umiejetnosci.html`, `mapa-panel.html`, `nauka-rundy.html`, `ocena-feedback.html`, `dash-powtorki.html`, `dashboard-wejscia.html`) · proof: tester screenshots
- [ ] Empty („mało danych”, no attempts), loading and error states · proof: tester screenshots
- [ ] Light and dark, 375 px (also with large text) and desktop, no overflow · proof: tester measurements
- [x] Separators instead of cards (cards only for the recommendation, chat and dialogs) · proof: diff review · _2026-11-18 audit of PR #56: cards only for the Nauka recommendation, Powtórki „Na dziś”, Rozbiór „Dalej” and the Uczeń uczy chat; ghost buttons use the global inset outline, not cards._

### Feels
- [ ] Full keyboard path through map, panel, round and breakdown · proof: tester run
- [x] Visible focus, labels, live announcements for round feedback · proof: tester run, audit · _2026-11-18, PR #66: one persistent `role=status` region carries the correct answer and explanation (tester read „Poprawna odpowiedź: B. W kluczu CKE…”), the verdict is the focused heading; focus outline 2px on rows and buttons; hints region always mounted._

### Holds up
- [x] No network / failed save gives a message, a round in progress is not lost on reload · proof: simulated failure · _2026-11-18: rejected fetch on answer gives „Nie udało się połączyć z Nauką” with „Ponów zapis odpowiedzi”; retry saved it. Map load failure gives a message and retry works._
- [x] New table has owner-only RLS · proof: migration review, audit · _2026-11-18: attempts live in `private` tables with RLS on and no grants, reachable only through security-definer RPCs keyed on `auth.uid()` (audits of 0009–0015)._
- [ ] Final gap audit has no blocker or major findings · proof: audit report

### Shipped
- [x] Branch per unit, PRs open, migrations on staging only until merge · proof: PR links · _Backend and views from the teammate's PRs #55, #56; fixes in PRs #66, #67, #68 (merged 2026-11-18 at the user's yes); 0017 and 0018 ran on staging before merge, production got them from the `main` autodeploy at `5c5d329`._
- [x] Template folders and registry entries removed for moved templates; docs updated for decisions · proof: diff · _Templates for Nauka, Mapa umiejętności, Szybka runda, Rozbiór, Powtórki and Uczeń uczy removed in #56 (audit found no dead links); `nauka.md` and `docs/mapa-dowody.html` updated for the decay decision in #68._
- [ ] Handoff updated · proof: `docs/orchestrator/handoff.md`
