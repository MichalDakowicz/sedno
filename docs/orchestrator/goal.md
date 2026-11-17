# Goal

_Set 2026-11-17 · status: active_

**Goal.** A student of English sees on the skill map what they can and can't do yet, gets a recommendation of what to practise, does a quick round of tasks for that skill, sees a breakdown with the change in mastery, and fading skills come back in Powtórki. Mapa umiejętności, Nauka, Szybka runda, Ekran rozbioru and Powtórki stop being templates.

**In scope.**
1. **Mapowanie**: the importer extracts the CKE requirement code(s) for every task of the English sheets in formuła 2023 (2023–2026), all three levels (podstawowy, rozszerzony, dwujęzyczny); a taxonomy file maps codes to student-facing skills grouped into areas (słuchanie, czytanie, środki językowe, pisanie). Requirement wording comes from the core curriculum; student-facing names are approved by the user before merge (approved 2026-11-17: the nine skills in migration 0009 of PR #55).

**Backend source.** Mapping, model, sessions, breakdown, recommendations and Powtórki RPCs come from PR #55 (`backend-nauki`, migrations 0009–0014, contract in `services/supabase/nauka.md`). Units 1–2 verify it; units 3–7 build the frontend on it. Authored exercises (migration 0010) only top up a round when CKE tasks run out; they are not generated variants.
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
- [ ] Mastery on the map matches a hand calculation for the test account · proof: tester + script
- [ ] Quick round → breakdown → map change → Powtórki works end to end on staging after login · proof: tester run
- [ ] Attempts survive reload and show on a second device/tab after reload · proof: tester run
- [ ] Typecheck and build green; no console errors in touched views · proof: checks, tester console read

### Looks
- [ ] Matches the templates and docs (`docs/mapa-umiejetnosci.html`, `mapa-panel.html`, `nauka-rundy.html`, `ocena-feedback.html`, `dash-powtorki.html`, `dashboard-wejscia.html`) · proof: tester screenshots
- [ ] Empty („mało danych”, no attempts), loading and error states · proof: tester screenshots
- [ ] Light and dark, 375 px (also with large text) and desktop, no overflow · proof: tester measurements
- [ ] Separators instead of cards (cards only for the recommendation, chat and dialogs) · proof: diff review

### Feels
- [ ] Full keyboard path through map, panel, round and breakdown · proof: tester run
- [ ] Visible focus, labels, live announcements for round feedback · proof: tester run, audit

### Holds up
- [ ] No network / failed save gives a message, a round in progress is not lost on reload · proof: simulated failure
- [ ] New table has owner-only RLS · proof: migration review, audit
- [ ] Final gap audit has no blocker or major findings · proof: audit report

### Shipped
- [ ] Branch per unit, PRs open, migrations on staging only until merge · proof: PR links
- [ ] Template folders and registry entries removed for moved templates; docs updated for decisions · proof: diff
- [ ] Handoff updated · proof: `docs/orchestrator/handoff.md`
