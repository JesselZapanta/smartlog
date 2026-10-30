# SMARTLOG — Multi-Term OJT Enrollment Solution

**Date:** 2026-08-30
**Status:** Design proposal — no code changed
**Companion doc:** [`PANEL-REVISIONS.md`](./PANEL-REVISIONS.md) (full 16-revision analysis, file-level findings, and sizing)

---

## The two questions, answered directly

### Q1. Can the system handle multiple OJT enrollments per academic year?

**Yes — after a schema change. Not today.**

Today an intern is a **1:1** with a user. `User::intern()` is a `HasOne` (`backend/app/Models/User.php:76-79`) and every query uses the singular `$user->intern`. An intern can therefore have exactly **one** OJT record for their entire lifetime, so a second term is impossible.

Once each OJT term becomes its own **enrollment** row, multiple terms per year work naturally — see [Why this works](#why-this-works-without-new-term-tables) below.

### Q2. Is it possible for the intern to register once, then apply for OJT, then have the coordinator accept?

**Yes — and this is the correct design.** It is exactly what the committee's "Better Solution" asks for:

> *"Apply for OJT – upload prospectus | then coordinator apply for OJT (if there is an account already)"*

Today this is impossible because `POST /register` does everything in one call (`backend/app/Http/Controllers/Api/AuthController.php:46-114`): create the user **+** create the intern record **+** create the location **+** send the OTP. The coordinator's only lever is approve/reject on that same record — there is no separate "apply" step, and no way to apply again because `email` is unique (`RegisterRequest.php:29`).

---

## Why this works without new term tables

**The single most important fact for this design:** `academic_terms` is **already at semester granularity**, despite the intern column being *named* `academic_year_id`.

`backend/database/seeders/AcademicTermSeeder.php:18-89` creates one row per semester:

| `code` | `description` | status |
|---|---|---|
| 251 | 1ST SEM AY 2025-2026 | inactive |
| 252 | 2ND SEM AY 2025-2026 | inactive |
| 253 | SUMMER AY 2025-2026 | inactive |
| 261 | 1ST SEM AY 2026-2027 | **active** |

`code` is `UNIQUE` (`create_academic_terms_table.php:18`) and only one term is `active` at a time.

So `interns.academic_year_id → academic_terms.id` already points at a **semester**, not a year. This means:

- `UNIQUE (user_id, academic_year_id)` yields **one enrollment per semester** — exactly the granularity the panels asked for
- 1st sem and 2nd sem of the same AY are naturally **separate enrollments** with separate hours, evaluations and grades
- No change to `academic_terms` is required

> ⚠️ Only a naming cleanup is warranted: the column `academic_year_id` is really a *term* id. Recommend renaming to `academic_term_id` in a later pass, or at minimum documenting the semantics, because it is a persistent source of confusion.

---

## Target architecture

### Today — one intern, one lifetime

```
User (1) ──── hasOne ────► Intern (1)          ← only ever created by register
                               │
                               ├── academic_year_id ──► AcademicTerm (a semester)
                               ├── assigned_hte ───────► Hte            (single, mutable)
                               └── (all DTR/journals hang off this one row)
```

`assigned_hte` is a single nullable FK overwritten in place — no history. A second enrollment row would be **silently shadowed** by the `HasOne` relation.

### Proposed — one user, many enrollments

```
User (1) ──── hasMany ───► Enrollment (N)        ← created by "Apply for OJT"
      │                        │
      │                        ├── academic_year_id ──► AcademicTerm   (semester)
      │                        ├── program_id, institute_id
      │                        ├── curriculum_id ─────► Curriculum      (uploaded PDF + ojt_hours)
      │                        ├── prospectus_id ─────► Prospectus      (uploaded PDF)
      │                        ├── status:  pending → approved → rejected
      │                        ├── outcome:  null → completed | failed | dropped
      │                        ├── hours_closed_at, closed_minutes        (immutable snapshot)
      │                        │
      │                        └── hasMany ──► HteAssignment (N)         ← transfer history
      │                                          ├── hte_id
      │                                          ├── assigned_at / unassigned_at
      │                                          └── reason
      │
      └── (DTR, journals, requirements, evaluations all hang off Enrollment)
```

### Two invariants that make this safe

1. **Term-scoped hours** (Panel 2, confirmed): hours accumulate **across HTE transfers within the same term** and reset at the term boundary. `Intern::earnedMinutes()` is currently unscoped (`Intern.php:97-102`) and must become `earnedMinutesForEnrollment()`.

2. **Per-placement grading** (Panel 2, confirmed): the final grade is the equal-weighted average of the evaluation at each HTE the intern was deployed to — 50/50 across two HTEs, 100% for one. `intern_evaluations` / `hte_evaluations` already carry `hte_id`, so grouping by it gives the placements once `HteAssignment` history exists.

---

## The flow

```
 1. REGISTER (once, ever)
    POST /register
      └─► creates User only. No OJT record.
    POST /verify-email  → OTP → login

 2. APPLY FOR OJT  (repeatable — once per term)
    POST /enrollments
      ├─ term is AUTO-SELECTED from the active academic term
      │  (the intern does not choose — see Decisions §2)
      ├─ upload Prospectus      (Panel 3)
      ├─ upload Curriculum      (Panel 3)
      ├─ enter OJT hours        (Panel 3 — coordinator must approve)
      └─► creates Enrollment (status = pending)
         ELIGIBILITY: allowed only if the intern has no
         non-terminal enrollment, and any prior enrollment
         has outcome = 'failed'

 3. COORDINATOR ACCEPTS  (never creates an enrollment)
    GET  /coordinator/enrollments?academic_year_id=   ← year-filtered queue
    POST /coordinator/enrollments/:id/approve
      ├─ verify curriculum + OJT hours   ← MANDATORY
      ├─ Enrollment.status = approved
      └─► intern may now be assigned to an HTE

 4. DEPLOY + ASSIGN
    assign HTE  →  HteAssignment opened
    REQUIREMENT: an HTE must be assigned — an intern may not
    be 'ongoing' without one
    ojt_status:  pending → ongoing

 5. RUNNING OJT
    photo DTR, journals, requirements
    hours accrue against THIS enrollment only
    (transfer: close HteAssignment, open another — hours continue)

 6. CLOSE THE TERM  — set by the INSTRUCTOR
    POST /instructor/enrollments/:id/outcome   { outcome }
      ├─ requires BOTH ratings complete        ← R8
      ├─ 'completed'  (hours met + both evaluations in)
      ├─ 'failed'     (hours not met)
      └─ 'dropped'
    └─► freezes closed_minutes  → FROZEN, later DTR
         corrections do not move it (R9)

 7. NEXT TERM — back to step 2, same account
    Enrollment (new row, new term) — prior term's data untouched
    Only permitted after outcome = 'failed'
```

---

## Grading formula (Panel 2, confirmed)

**The intern's rating of the HTE uses the same calculation as the HTE's rating of the intern.** Every rating is weighted equally.

```php
// Both directions use the SAME per-category weights:
//   personal_characteristics 30% · work_characteristics 30% · job_knowledge 40%
// and the SAME treatment of N/A (excluded from the denominator).

// For each placement P in the enrollment's HteAssignment history:
$hteRate(P)    = weightedCategoryAvg(InternEvaluation::where('intern_id',$e->id)
                                          ->where('hte_id', $P->hte_id));  // HTE rates intern
$internRate(P) = weightedCategoryAvg(HteEvaluation::where('intern_id', $e->id)
                                          ->where('hte_id', $P->hte_id));  // intern rates HTE

// Final grade: equal-weight average of EVERY score.
$all  = collect($placements)->flatMap(fn ($P) => [$hteRate($P), $internRate($P)]);
$grade = $all->avg();
```

Worked examples:

| Placements | Scores collected | Final grade |
|---|---|---|
| 1 HTE, no transfer | 2 | `(HTE rate + intern rate) / 2` → 50/50 |
| 2 HTEs (transferred) | 4 | `(A_HTE + A_intern + B_HTE + B_intern) / 4` → 25% each |
| N HTEs | 2N | equal weight across all 2N scores |

**Confirmed rules**
- **All evaluations are required.** No renormalisation, no "Incomplete" pass — a missing score means the grade cannot be produced.
- **N/A is excluded** from the average, not counted as zero. This fixes a live bug: the current per-category query divides by `COUNT(*)`, which counts N/A rows while the sum contributes `0`, so N/A actively depresses scores (`HteEvaluationController.php:199,396`; the comment at `:412-413` shows it was noticed and never fixed).

**Implementation notes**
- The 30/30/40 math is **copy-pasted in four places** (`Hte/EvaluationController.php:125`, `OjtCoordinator/Evaluations/InternEvaluationController.php:117`, `OjtCoordinator/Evaluations/HteEvaluationController.php:212` and `:418-420`). Extract it into one `EvaluationScoreService` and have both directions call it — otherwise the two directions will drift apart.
- Scope the computation to the **enrollment**, so a re-enrolled intern's two terms never blend.
- Fix the N/A denominator **first** — otherwise the new average inherits the bug.
- ⚠️ `intern_evaluations` and `hte_evaluations` are each keyed `unique(['intern_id','hte_id','criterion_id'])` with **no period column**. A re-enrolled intern returning to the *same* HTE in a later term would collide with the earlier term's rows. This needs a term or placement discriminator (see the transfer section).

---

## What this fixes from the panel revisions

| Revision | How the enrollment model addresses it |
|---|---|
| **#11** Enroll per academic year | The enrollment row **is** the per-term OJT record |
| **#15** Apply → coordinator accepts | Steps 2 and 3 above |
| **#14** Prospectus 2018–2023 | Attached to the enrollment; legacy terms can be exempted with a flag rather than backfilled |
| **#13** Remove OJT Hours module | `ojt_hours` table + admin module deleted; hours live on the uploaded `curriculum` |
| **#10** Hours continue in the same AY | Hours scoped to the enrollment (term), never reset by an HTE transfer |
| **#8** 50/50 old HTE / new HTE | Group evaluations by `hte_id` over the term's `HteAssignment` history |
| **#6/#7** Reassign / transfer | `HteAssignment` history replaces the current blocked unassign guard (PR #48) |
| **#12** Require evaluation | Gate `markCompleted` on a completed evaluation **for that enrollment** |

---

## Schema changes

### Add

```sql
-- one per (user, term): the enrollment
ALTER TABLE interns
  ADD COLUMN previous_intern_id  BIGINT UNSIGNED NULL,
  ADD COLUMN curriculum_id        BIGINT UNSIGNED NULL,
  ADD COLUMN enrollment_outcome   ENUM('completed','failed','dropped') NULL,
  ADD COLUMN hours_closed_at      TIMESTAMP NULL,
  ADD COLUMN closed_minutes       INT NULL,
  ADD UNIQUE (user_id, academic_year_id);   -- one enrollment per user per term

-- curriculum: uploaded by the intern, carries the required hours.
-- COORDINATOR APPROVAL IS MANDATORY — requiredHours() reads only
-- status = 'approved' rows (Decision 1).
CREATE TABLE curricula (
  id, uuid,
  intern_id        BIGINT UNSIGNED NOT NULL,   -- enrollment-scoped
  program_id       BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  curriculum_year  INT NOT NULL,               -- e.g. 2018
  document_path    VARCHAR(255) NOT NULL,
  ojt_hours        INT NOT NULL,               -- proposed by the intern
  status           ENUM('pending','approved','rejected') DEFAULT 'pending',
  rejection_reason TEXT NULL,
  reviewed_by      BIGINT UNSIGNED NULL, reviewed_at TIMESTAMP NULL,
  timestamps,
  UNIQUE (intern_id, academic_year_id)
);

-- prospectus: the OJT deployment letter (students hold their own
-- copies, so 2018-2023 is backfillable — see Decisions §6)
CREATE TABLE prospectuses (
  id, uuid,
  intern_id        BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  document_path    VARCHAR(255) NULL,          -- NULL if only verified offline
  prospectus_ref   VARCHAR(255) NULL,          -- "copy seen, archived at X"
  status           ENUM('pending','approved','rejected') DEFAULT 'pending',
  rejection_reason TEXT NULL,
  reviewed_by      BIGINT UNSIGNED NULL, reviewed_at TIMESTAMP NULL,
  uploaded_by      BIGINT UNSIGNED NULL,
  timestamps,
  UNIQUE (intern_id, academic_year_id)
);

-- assignment history: enables transfer + per-placement grading
CREATE TABLE intern_hte_assignments (
  id,
  intern_id        BIGINT UNSIGNED NOT NULL,
  academic_year_id BIGINT UNSIGNED NOT NULL,
  hte_id           BIGINT UNSIGNED NOT NULL,   -- RESTRICT
  assigned_at      TIMESTAMP NOT NULL,
  unassigned_at    TIMESTAMP NULL,
  assigned_by      BIGINT UNSIGNED NULL,
  unassigned_by    BIGINT UNSIGNED NULL,
  reason           TEXT NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  UNIQUE active row per (intern_id, academic_year_id)
);
```

### Remove

```sql
DROP TABLE ojt_hours;   -- also drops its RESTRICT FK
```

Plus `App\Models\OjtHour`, `Admin\OjtHourController`, its two Form Requests, `Institute::ojtHour()`, the delete guard at `Admin/InstituteController.php:98`, and the `AdminLayout.jsx:8` nav entry.

### Critical delete-rule change

```sql
-- today BOTH cascade — deleting a term would wipe that term's
-- enrollments AND every DTR, journal and evaluation under them.
ALTER TABLE interns DROP FOREIGN KEY interns_user_id_foreign;
ALTER TABLE interns ADD CONSTRAINT interns_user_id_foreign
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;   -- keep
ALTER TABLE interns DROP FOREIGN KEY interns_academic_year_id_foreign;
ALTER TABLE interns ADD CONSTRAINT interns_academic_year_id_foreign
  FOREIGN KEY (academic_year_id) REFERENCES academic_terms(id) ON DELETE RESTRICT;
```

Term deletion must **RESTRICT**, not cascade. This becomes critical the moment one user can have several enrollments.

---

## Enrollment business rules (from Decisions 1, 3, 4)

`UNIQUE (user_id, academic_year_id)` only covers the per-term case. Three further rules need **application-level** enforcement, because they span rows:

| Rule | Source | Enforcement |
|---|---|---|
| **R1** — At most **one non-terminal enrollment** per user (`pending`, `approved`, `ongoing`) | Decision 3 | Application check on `POST /enrollments`. A partial unique index is possible but awkward across a status enum; assert in the service. |
| **R2** — Re-enrollment permitted **only if every prior enrollment has `outcome = 'failed'`** | Decision 3 | Application check. Reject with a clear message if the prior outcome is `completed` or still non-terminal. |
| **R3** — `enrollment_outcome` is set **only by the instructor** | Decision 4 | Route behind `role:ojt_instructor` + institute scope. Coordinator and HTE must not be able to set it. |
| **R4** — `curricula.status` must be `approved` before its `ojt_hours` is used | Decision 1 | `requiredHours()` must filter on status. A pending curriculum returns "hours not yet approved", not the raw proposed value. |

**R1 and R2 belong in one place** — an `EnrollmentService` — so the intern UI, the coordinator queue, and any future bulk/import path all enforce the same gate. Putting them in the controller will let them drift.

---

## Data safety

The model is deliberately non-destructive — every prior term's records stay exactly where they are:

| Record | Keyed to | Survives a new term? |
|---|---|---|
| Photo DTR, daily journals, requirements | `intern_id` (the enrollment row) | ✅ stays on the prior term's row |
| Intern/HTE evaluations | `intern_id` + `hte_id` | ✅ stays on the prior term's row |
| Registration, COR | `user_id` | ✅ shared identity, re-uploadable per term |
| User, location | `user_id` | ✅ reused |

Nothing is overwritten in place — which is the defect in today's admin year-overwrite (`Admin/InternController.php:24` mutates the single row, carrying `status` / `ojt_status` / `assigned_hte` across years, so a `completed` intern stays `completed` on a new term).

---

## Delivery phases

| Phase | Work | Size |
|---|---|---|
| **1** | `UNIQUE(user_id, academic_year_id)`; `User::intern()` → `interns()`; `currentEnrollment()` scope; rebind routes from `user:uuid` to enrollment; return all enrollments from `myRegistration`; scope `earnedMinutes()` per enrollment; `RESTRICT` the term FK; add enrollment outcome fields | **L** |
| **2** | `POST /enrollments` (apply) + coordinator accept/reject queue; attach prospectus; instructor+coordinator dashboards show per-term enrollments | **L** |
| **3** | `curricula` table + intern upload + hours entry; coordinator approval; delete the OJT Hours module; re-source `requiredHours()` and all report controllers | **L** |
| **4** | `intern_hte_assignments` + transfer flow (replaces the PR #48 guards) + assignment history UI | **L** |
| **5** | Per-placement grading service (50/50 across HTEs); fix the N/A denominator bug; evaluation required to complete | **M** |

Phase 1 is the foundation and the highest-risk step — it changes the meaning of `$user->intern` across roughly ten controllers. Phases 2–5 are independent of each other afterwards.

---

## Decisions — confirmed

All open questions are now answered by the panels.

| # | Question | Decision | Implementation consequence |
|---|----------|----------|----------------------------|
| 1 | Who verifies the intern-entered OJT hours? | **The coordinator approves.** | `curricula.status` must be `approved` before its `ojt_hours` is read. Approval is **mandatory** — an unapproved value must never count. |
| 2 | Can the intern choose the term? | **No — automatic, from the active academic year.** | Term comes from `AcademicTerm::where('status','active')` exactly as `AuthController.php:50-51` does today. The intern form shows it read-only. **Re-enrollment cannot open until an admin marks the next term `active`.** |
| 3 | Concurrent enrollments in two terms? | **No — one OJT enrollment per semester.** Re-enrolling happens only after failing the previous term. | `UNIQUE (user_id, academic_year_id)` + a business rule for the rest: at most one non-terminal enrollment, and re-enrollment rejected unless every prior enrollment has `outcome = 'failed'`. |
| 4 | Who sets `enrollment_outcome`? | **The instructor.** | New instructor endpoint. Not automatic on the hour check, and not the coordinator. |
| 5 | Does the intern's own rating count in the grade? | **All evaluations are required**, and the grade is the **equal average of each HTE's rating of the intern.** | No renormalisation, no "Incomplete" pass. See [Grading formula](#grading-formula-panel-2-confirmed). |
| 6 | Are the 2018–2023 prospectuses available? | **Yes — students upload their own PDF.** | Ordinary upload on the enrollment. No legacy exemption. |
| 7 | Multiple curricula per program per year? | **Not a problem — the curriculum is fixed at enrollment (1st year); it only changes later.** Coordinator approves/rejects. | The enrollment **pins** the curriculum version. Later revisions must not alter an in-flight or completed term. |
| 8 | Missing evaluation direction? | **All evaluations are required.** | No partial grading path. |
| 9 | N/A handling? | **Excluded** from the average. | Fixes the live N/A denominator bug (`HteEvaluationController.php:199,396`). |
| 10 | Re-enroll after passing? | **No — rare, failure-only. A student who completed/passed cannot repeat.** | Rule R2 is strict. Normally one term is enough. |
| 11 | Re-submit requirements on re-enrollment? | **Yes — all requirements must be submitted again.** | ⚠️ **Blocker — see below.** |
| 12 | Can an intern be `ongoing` with no HTE? | **No.** | Deployment must require an assigned HTE. Today `InternRequirementController.php:246` allows a null HTE — must be enforced. |
| 13 | When is evaluation required? | **Both** — before a transfer **and** before a normal term is completed. The existing evaluation feature stays as-is. | `enrollment_outcome = completed` must be gated on both ratings being complete. |
| 14 | Report annex columns? | **`issue`, `solution`, `recommendations`.** | Exactly three content columns. |
| 15 | Can a DTR correction change a closed term's total? | **No — frozen.** | The `closed_minutes` snapshot is final. |

### Enrollment module

The coordinator **never creates an enrollment** — the intern initiates it against whatever term is currently `active`.

```
INTERN                                  COORDINATOR
──────                                  ───────────
Enroll (pick auto term)                 Approval queue  ← filtered by academic year
 ├─ upload Prospectus (PDF)               ├─ accept  → status=approved
 ├─ upload Curriculum (PDF)               │             → student may then be assigned an HTE
 └─ enter OJT hours                        └─ reject  → reason → intern resubmits
      ↓
 Enrollment (status=pending)
```

The coordinator's approval table needs an **academic-year filter** — with one approval queue per term, the table is only useful when scoped to a year.

### ⚠️ Blocker surfaced by Decision 11

Re-enrollment requires re-submitting **all** requirements, but `requirement_submissions` is keyed to the **user**, not the enrollment:

```php
// create_requirement_submissions_table.php:16, 25
$table->foreignId('user_id')->constrained()->cascadeOnDelete();
$table->unique(['user_id', 'requirement_id']);
```

A re-enrolled intern re-submitting the same requirement would **violate the unique constraint** — they could never satisfy the new term. This must be re-scoped to the enrollment:

```sql
ALTER TABLE requirement_submissions DROP INDEX requirement_submissions_user_id_requirement_id_unique;
ALTER TABLE requirement_submissions
  CHANGE user_id intern_id BIGINT UNSIGNED NOT NULL;
ALTER TABLE requirement_submissions
  ADD UNIQUE (intern_id, requirement_id);
```

Every read of requirements (intern requirements page, coordinator review, `deploy` gate, all six report controllers) currently keys on `user_id` and must be updated. This also makes per-term requirement history correct rather than accidentally shared across terms.

### Enrollment business rules

| Rule | Source | Enforcement |
|---|---|---|
| **R1** — At most **one non-terminal enrollment** per user (`pending`/`approved`/`ongoing`) | Decision 3 | Application check in the enrollment service. |
| **R2** — Re-enrollment only if every prior enrollment has `outcome = 'failed'`; a completed intern can **never** re-enroll | Decision 3, 10 | Application check, with a distinct message for "already passed" vs "still in progress". |
| **R3** — `enrollment_outcome` set **only by the instructor** | Decision 4 | Route behind `role:ojt_instructor` + institute scope. |
| **R4** — `curricula.status` must be `approved` before its `ojt_hours` is used | Decision 1 | `requiredHours()` filters on status. |
| **R5** — Hours **reset at each academic year**; they continue only *within* the same year | Decision 2 | `earnedMinutesForEnrollment()`, never summed across enrollments. |
| **R6** — Deployment requires an assigned HTE | Decision 12 | Enforce at `markOngoing`; today the HTE is nullable. |
| **R7** — Re-enrollment requires re-submitting **all** requirements | Decision 11 | Depends on the `requirement_submissions` re-scoping above. |
| **R8** — `enrollment_outcome = completed` requires **both** ratings (HTE→intern and intern→HTE) | Decision 13 | Gate the instructor's outcome action. Not a circular dependency — see the sequence below. |
| **R9** — A term's `closed_minutes` is **frozen** at outcome time | Decision 15 | Later DTR corrections do **not** move the closed total. See the amendment note. |
| **R10** — A transfer request may be **cancelled by the coordinator only before** both ratings are in; after that it is **committed** and cannot be aborted | Decisions 20, 21 | The cancel action is hidden/disabled once the evaluation stage is reached. |

**R8 does not create a circular dependency.** The natural sequence works with the gates that already exist:

```
hours met  →  ojt_status = hours_completed
              │
              ├─► HTE evaluates intern      (Hte/EvaluationController.php:44 already
              │                             allows evaluation while ongoing)
              └─► intern evaluates HTE      (Intern/EvaluationController.php:30,107
                                            already allows this at hours_completed)
              │
              ▼
      both ratings complete  →  instructor sets outcome = completed   ← R8 gate
```

### Frozen hours (R9) — no amendment path

Decision: a term's `closed_minutes` is **truly final**. *"it should be frozen... the fixes will happen outside the system."*

> An intern logs 400 of 486 hours and the term closes. Two weeks later the HTE finds a missed clock-out worth 4 hours. **The record stays at 400.** The correction is applied outside SMARTLOG.

So the system needs **no** amendment action, coordinator override, or recalculation path. A DTR row may still be edited, but it does not move the closed total. This keeps historic reports fully reproducible and guarantees a `completed` term can never change after the fact.

⚠️ Implementation note: the `closed_minutes` snapshot must be **stored**, not computed on read — otherwise a later DTR edit would silently move the number and defeat the freeze.

**R1, R2, R5, R7 and R8 belong in one place** — an `EnrollmentService` — so the intern UI, the coordinator queue, the instructor outcome action, and any future import path all enforce the same gate.

---

## Implementation guidance

- **Copy `UserController` / `AcademicTermController`** as the controller pattern; see [`AGENTS.md`](./AGENTS.md) for the full backend/frontend conventions.
- Response envelope `{ "data": ... }`; paginated lists add `meta`; creates return 201; validation errors use `{ "errors": { field: [...] } }`.
- After every PHP change: `vendor/bin/pint --dirty --format agent`
- After every frontend change: `npm run build` in `frontend/`
- Full test suite: `php artisan test --compact` (currently **328 passing**)
- **Every change must be covered by a test** — the enrollment routes in particular need feature tests for: apply, accept, reject+resubmit, re-enroll into a new term, and term-deletion RESTRICT.
