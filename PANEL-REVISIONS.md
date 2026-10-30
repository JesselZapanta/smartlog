# Panel Revisions — Analysis & Implementation Plan

**Status:** Analysis only — no code changed
**Date:** 2026-08-30 (rev 2 — updated with panel clarifications)
**Source:** OJT Panel 1 (Selatona), Panel 2 (Agua), Panel 3 (Quiros) + committee's "Better Solution"
**Reference:** `SMARTLOG-SYSTEM.md` (product spec), `backend/database/smartlog_schema.sql` (19 tables), live code

---

## Rev 2 changelog

The panels answered five of the open questions. This revision folds their answers in and marks the affected items as **CONFIRMED**.

| # | Question (rev 1) | Answer | Effect |
|---|---|---|---|
| Q1 | "Absent" = absent, or rejected-so-doesn't-count? | **Rejected *is* absent; its hours are not counted.** | #1 simplified to a display/label change — no new DB status needed |
| Q2 | On transfer, do hours reset or carry over? | **Hours continue as long as it is the same academic year.** | #10 unblocked and downgraded — hours are **AY-scoped, not placement-scoped** |
| Q3 | Confirm the 50/50 weighting | **50% old HTE + 50% new HTE** when deployed to multiple HTEs | #8 reinterpreted — weighting is **across placements**, not across evaluation directions |
| Q7 | What is a "curriculum"? | **Interns upload the curriculum, then put the OJT hours on it. Remove the OJT Hours module.** | #13 rewritten — `ojt_hours` table + admin module are **deleted** |
| Q10 | Re-enrollment: new account or reuse? | **The intern *enrolls* per academic year — no re-registration.** | #11 confirmed — one enrollment per (user, academic year) |

**Still open:** 7 questions (see the Open Questions table at the end).

---

## Master summary

| # | Panel | Revision | Area | Size | Status |
|---|-------|----------|------|------|--------|
| 1 | Selatona | Rejected DTR = absent, don't reflect hours | Reports | **S** | ✅ Confirmed |
| 2 | Selatona | Issue editable by reporter only; coordinator edits solutions/recommendations | Issues | **S** | ✅ Confirmed (reversed) |
| 3 | Selatona | Two separate Issues & Concerns modules (to HTE / to Interns) | Issues | **L** | ✅ Confirmed — two sidebar links |
| 4 | Selatona | Report annex — columns: issue, solution, recommendations | Reports | **M** | ✅ Confirmed |
| 5 | Selatona | HTE placement report — remove duplicate data | Reports | **S** | ✅ Confirmed — duplicate verified in code |
| 6 | Agua | Reassign — previous employer's data remains | Transfer | **L** | ✅ Confirmed — via the #9 transfer flow |
| 7 | Agua | Transfer option to other HTE | Transfer | **M** | ✅ Confirmed — coordinator picks target |
| 8 | Agua | Grade = equal average of all ratings (both directions, all placements) | Evaluations | **L** | ✅ Confirmed |
| 9 | Agua | Instructor requests → HTE accepts → both evaluate → coordinator reassigns | Transfer | **XL** | ✅ Confirmed (2 residual Q) |
| 10 | Agua | Close hours / previous hours | Hours | **S** | ✅ Confirmed — frozen |
| 11 | Agua | Enroll per academic year (not re-register) | Enrollment | **XL** | ✅ Confirmed |
| 12 | Quiros | Required the evaluation | Evaluations | **M** | ✅ Confirmed — transfer **and** completion |
| 13 | Quiros | Remove OJT Hours module; curriculum carries hours | Curriculum | **L** | ✅ Confirmed |
| 14 | Quiros | Prospectus 2018–2023 (students upload) | Prospectus | **L** | ✅ Confirmed |
| 15 | Better | Apply for OJT (upload prospectus) → coordinator accepts | Enrollment | **L** | ✅ Confirmed |
| 16 | Better | "Issues and Concerns" page (not just Issues) | Issues | **S** | ✅ Confirmed — folded into #3 |

**Critical path:** #6 (assignment history) → #8. #11 + #14 + #15 ship together. #13 is independent but touches every report.

**Quick wins (unblocked now):** #1, #2, #5, #10, #16

---

# Panel 1 — Selatona

## 1. DTR report: rejected = absent, hours not counted ✅ CONFIRMED

**Panel clarification:** *"rejected is absent so the hours is not counted"*

**Interpretation:** A DTR the instructor **rejected** is treated as the intern being **absent** that day. Its hours must not be counted or displayed.

### Current state — the arithmetic is already right; the display is not

- ✅ **`backend/app/Models/Intern.php:97-102`** — `earnedMinutes()` filters `where('status', 'checked')`, so `rejected` (along with `pending`, `verified`, `flagged`) contributes **0 minutes**. Every aggregate is already correct. **No backend computation change is required for the "not counted" half.**
- ❌ **`frontend/src/pages/intern/ReportPage.jsx:420`** — `computeHours(record.slots)` runs for **every** record with **no status check**; hours/minutes render at `:448-453` beside a red `Disapproved` pill. Rejected days display full hours.
- ❌ **`frontend/src/pages/intern/dtr-logs/InternDtrLogsPage.jsx:307-315`** — same pattern.
- ❌ **`frontend/src/pages/intern/dtr-logs/InternDtrPrintPage.jsx`** — **internally inconsistent**: per-day rows print hours in red (`isNotChecked`, `:126,136-137`) but the sheet Total filters `if (record.status !== "checked") continue;` (`:62-64`). Row sum ≠ printed total on the same page.
- ✅ `frontend/src/pages/intern/InternReportPrintPage.jsx:236-243` — DTR print table has no hours column; safe.
- `backend/app/Models/PhotoDtr.php:63-75` — `computedMinutes()` has **no status filter** (pure time math); filtering is the caller's job. The frontend duplicating this math in 3 places is how the display bug arose.

### Gap
1. Per-record display must show `—` (not hours) and an **Absent** label for rejected DTRs.
2. Printed DTR sheet row/total disagreement must be fixed.
3. **No separate "absent" DB concept is needed** — the panel confirmed rejected *means* absent, so `rejected` can be labelled "Absent" in the UI without a new status or column. (This is the change from rev 1.)

### Work required

*Backend*
- Expose per-record hours + a display status from `PhotoDtrResource` (it currently omits `computedMinutes` entirely) so the frontend stops recomputing and cannot drift from the backend rule again.
- **No change to `earnedMinutes()`** — it already implements the panel's rule.

*Frontend*
- `ReportPage.jsx`, `InternDtrLogsPage.jsx`, `InternDtrPrintPage.jsx` — when `status !== 'checked'`, render `—` in the hours/minutes cells and an `Absent` pill instead of the raw status word.
- Fix the print sheet so the Total matches the displayed rows.
- Align the status vocabulary: intern pages use `disapproved` (`ReportPage.jsx:270-282`) while admin/coordinator/instructor use `rejected`. One shared mapping.
- Label rejected as **"Absent"** per the panel's wording.

### Residual questions
- None — the panel's answer is unambiguous. *(Rev 1's question about a separately-settable "absent" flag is withdrawn.)*

### Related defect (see Cross-cutting **E**)
The instructor can reject an **already-`checked`** DTR with no prior-status guard (`OjtInstructor/InternMonitoringController.php:118-171`), retroactively deleting earned hours. Under the confirmed rule that turns a real workday into an absence with no way to reverse it except re-approval. This needs a status-transition guard alongside #1.

**Size:** S

---

## 2. The issue is only editable by the original reporter ✅ CONFIRMED (reversed)

**Panel answer:** *"the issue is only editable by the original reporter (not by coordinator, coordinator can only update the solutions and recommendations)"*

**⚠️ This reverses the rev-1 interpretation.** Rev 1 read *"the issue should not be editable"* as "the reporter cannot edit their own submission". The panel has now clarified the opposite: **the reporter keeps edit rights; the coordinator loses them.**

### Current state

| Role | Controller | Today | Required |
|---|---|---|---|
| Intern (reporter) | `Api/Intern/IssueController.php:178-209` | Can edit `issues` if `status !== 'resolve'` | ✅ **Keep as-is** |
| HTE (reporter) | `Api/Hte/IssueController.php:226-268` | Can edit `intern_id` + `issues` if `status !== 'resolve'` | ✅ Keep, but `intern_id` should not be editable |
| Coordinator | `Api/OjtCoordinator/Issues/IssueController.php:212-288` | **Full edit** — can change `intern_id`, `type`, `issues`, `solutions`, `recommendations`, `status`; can re-point the issue to a different intern (`:255` rewrites `hte_id`) | ❌ **Must be reduced to `solutions` + `recommendations` + `status` only** |
| All three | `destroy` (`:290`, `:270`, `:211`) | Hard delete always — **bypasses the resolve lock** | Add a resolve-lock |

Frontend shows pencil + trash on every row across all three list pages (`InternIssuesListPage.jsx:419-446`, `HteIssuesListPage.jsx:400-427`, `CoordinatorIssuesListPage.jsx:357-376`) — the coordinator's edit form exposes every field (`CoordinatorIssueFormPage.jsx`).

### Work required

*Backend*
- Restrict the coordinator's `update` payload to `solutions`, `recommendations`, `status`. Reject any attempt to change `issues`, `intern_id`, `hte_id` or `type`.
- Remove `intern_id` from the HTE reporter's editable set (a reporter must not move their issue onto a different intern).
- Add a resolve-lock to `destroy` in all three controllers.
- Fix: `status` is **client-controllable on create** — `Hte/IssueController.php:128` and `Intern/IssueController.php:116` accept it, so a reporter can pre-resolve their own issue and permanently lock their text. Force `pending` on create.
- **Bug (will 500):** `OjtCoordinator/Issues/IssueController.php` calls `UserNotification::notify()` at `:267` and `:275` with **no `use App\Models\UserNotification;`** → fatal `Class not found` exactly when a coordinator resolves an issue.

*Frontend*
- Coordinator edit form: render `issues` read-only; only `solutions`, `recommendations`, `status` editable.

**Size:** S

---

## 3. Two separate Issues & Concerns modules ✅ CONFIRMED

**Panel answer:** *"issues and concerns to hte and issues and concern to interns (2 separate module)"*

**Interpretation:** Two distinct modules, not one page with a filter:
- **Issues & Concerns to HTE** — raised by interns about the HTE they are deployed to
- **Issues & Concerns to Interns** — raised by HTEs about their assigned interns

### Current state
- `backend/database/migrations/2026_08_21_083935_create_issues_table.php:18` — `enum('type', ['intern','hte'])` records **who reported**, which already encodes which module a row belongs to. That mapping is reusable.
- All three list pages are titled just **"Issues"** (`InternIssuesListPage.jsx:236-249`, `HteIssuesListPage.jsx:248-257`, `CoordinatorIssuesListPage.jsx:213-217`), and the coordinator's page mixes both types in one table (`CoordinatorIssuesListPage.jsx:314-324` shows a `Type` column).
- The intern form offers only a free-text `issues` box — no title, no subject, no category (`InternIssueFormDialog.jsx:186-211`).
- `:19-23` — `issues`/`solutions`/`recommendations` text, `status` enum `['pending','resolve']`. **No `title`, `category`, `subject_type`, `severity`, `resolved_at`/`resolved_by`, or `uuid`.**

### Work required

*Schema (one migration)*
- `title` varchar(255) — the list currently shows only a truncated blob.
- `category` enum — recommended: `attendance`, `conduct`, `documentation`, `safety`, `work_performance`, `other`.
- `resolved_at` timestamp + `resolved_by` FK → `users` (only `status` is stored; the resolving actor is lost).
- `uuid` + unique — the table is bound by **numeric id** while every other table uses `uuid`.
- Keep the existing `type` column as the **module discriminator** — it already separates the two modules, so **two physical tables are unnecessary**. Split only at the UI/route layer.

*Backend*
- Split the three controllers into two subject-scoped query sets, or filter by `type` behind two route namespaces, e.g. `/coordinator/concerns/to-hte` and `/coordinator/concerns/to-intern`.
- Expose `title` + `category` in resources; add `category` filtering to the list endpoints.
- Notifications must target the correct audience per module.

*Frontend*
- Intern: nav item **"Issues & Concerns to HTE"** (currently `InternLayout.jsx:15` = "Issues").
- HTE: nav item **"Issues & Concerns to Interns"** (currently `HteLayout.jsx:9` = "Issues").
- Coordinator: **two separate tables/queues**, one per module, each with a `Category` filter — replacing today's single mixed table.
- Add `title` + `category` inputs to all three form dialogs.
- Delete the orphaned `CoordinatorIssueFormDialog.jsx` (352 lines, not imported anywhere).

**Size:** L

### Residual question
- ⚠️ Should the coordinator also get a single **combined** overview of both modules, or are two entirely separate queues sufficient? (Two queues means a coordinator must check both to see everything.)

---

## 4. Report annex — issues tabular with content

**As stated:** "for report issues and concern (add the content - tabular) - report annex"

**Interpretation:** The printed report must include the **full text** of each issue/concern in a proper table as an annex — not just `Student | Status`.

### Current state

*Admin* — `frontend/src/pages/admin/AdminReportPrintPage.jsx:401-431`
- Section title `Issues & Evaluations Report` (`:403`)
- Tables: `Status | Count` (`:411-414`), `Type | Count` (`:415-418`), `Recent Issues` = **`Student | Status` only** (`:423`), `Recent Evaluations` = `Student | Date` (`:427`)
- **The issue body is never printed.** `excerpt` exists in the payload (`Admin/ReportController.php:212`) but is dropped in the print mapping. `solutions` and `recommendations` are not exposed at all.

*Coordinator* — `CoordinatorReportPrintPage.jsx:288-320` — identical gap (`Recent Issues` = `Student | Status`, `:316`).

*Screen views* — `admin/ReportPage.jsx:833-921` and `ojt_coordinator/ReportPage.jsx:663-749` are **card-based, not tabular**; "Recent Issues" is capped at 5 with a single truncated `type: excerpt` line.

**Bug — admin Open/Resolved always 0:** frontend reads `data.issues.by_status.open` (`ReportPage.jsx:307,839`; print `:406`) and `.resolved` (`:840`; print `:407`), but the backend returns raw `pending`/`resolve` (`Admin/ReportController.php:92-95,269`). Coordinator pages correctly use `pending`/`resolve`.

### Work required

*Backend*
- Emit `issues.recent` with full `title`, `issues`, `solutions`, `recommendations`, `student`, `hte`, `type`, `subject_type`, `created_at`, `resolved_at` — raise or paginate the 5-row cap.
- Normalise `by_status` to `open`/`resolved` (or fix the admin frontend to read `pending`/`resolve`).
- Tag concerns rejected as **Absent**-style absent-days? No — but DTR rows in the annex need the #1 Absent label for consistency.

*Frontend*
- Add a print section **`Annex A — Issues and Concerns`** with columns: `#`, `Date`, `Subject`, `Reported By`, `Title`, `Concern (verbatim)`, `Resolution`, `Recommendation`, `Status`.
- Multi-line cells need `break-inside-avoid` so a long concern doesn't split across pages.
- Apply across **all five role print pages** (admin, coordinator, instructor, HTE, intern).

**Size:** M

---

## 5. HTE placement report — remove duplicate data

**As stated:** "HTE placement report (double data - remove one)"

**Interpretation:** ✅ **Confirmed — real duplication.**

### Current state — the same HTE rows print twice

| Report block | Screen | Print | Backend source |
|---|---|---|---|
| "Top HTEs by Assigned Interns" | `ojt_coordinator/ReportPage.jsx:452-481` | `CoordinatorReportPrintPage.jsx:203-211` | `ReportController.php:120-134` — `withCount(assignedInterns)`, `orderByDesc(...)->limit(10)` |
| "All HTEs — Assignment Load" | `ojt_coordinator/ReportPage.jsx:483-512` | `CoordinatorReportPrintPage.jsx:213-223` | `ReportController.php:162-175` — **identical query, no `limit`** |

Same columns (`Host Training Establishment`, `Status`, `Assigned`); the top 10 are literally the first 10 rows of `detail` in the same order. `htes.by_status` (`ReportController.php:157-160`) and the stat cards (`:116-118`) restate the same totals twice more.

The **Student Placement** print report (`CoordinatorStudentPlacementPrintPage.jsx`) is clean — intern rows appear once. The duplication is HTE-level only. Also `ReportController.php:330` hard-codes `department => ''`, so the "Department/Office Assigned" column is always blank.

### Work required
- Delete "Top HTEs by Assigned Interns" (screen + print); keep **"All HTEs — Assignment Load"** with a sortable/highlighted count column. Or merge into one ranked table.
- Drop `top_htes` from the coordinator report payload (keep it for the dashboard only).
- Source `department` from somewhere or drop the column.

**Size:** S

---

# Panel 2 — Agua

## 6. Reassign — previous employer's data remains

**As stated:** "You can reassign (data of previous employeer remains)"

### Current state
- **No transfer concept exists.** `grep -ri transfer backend/` → zero matches.
- `interns.assigned_hte` is a single nullable FK (`add_assigned_hte_foreign_key_to_interns_table.php:15`, `nullOnDelete`).
- Both `assign` and `unassign` use `forceFill(...)->save()`, **destroying the previous value**. No history table, no `assigned_at`/`assigned_by`, no observer.
- Only trace: a fire-and-forget `hte_assigned` notification on assign (`HteController.php:322-328`). **`unassign` sends no notification at all.**

**⚠️ Direct conflict with recent work:** commit `9ec30bf` (PR #48) added guards that **block** unassign/re-assign when `ojt_status !== 'pending'` or the intern has photo DTRs, journals, or evaluations (`HteController.php:251-263` and `:309-318`). Those implement the *opposite* of this revision and **must be replaced** by a transfer flow.

**Why the data survives naturally:**
- `photo_dtrs` and `daily_journals` have **no `hte_id`** — they key on `intern_id` only, so punches and journals are untouched by an HTE change. **And per the panel's clarification (#10) hours are AY-scoped, so an HTE change does not reset progress either.**
- `intern_evaluations` and `hte_evaluations` **do** carry `hte_id`, so the previous HTE's evaluations stay attributed to the previous HTE — exactly what "previous employer data remains" and the #8 50/50 grading both need.
- `requirement_submissions` keys on `user_id` — unaffected.

### Gap
No history/audit; the recent guards block the operation entirely; the intern is never notified of removal.

### Work required

*Schema (new table)*
```
intern_hte_assignments
  id, intern_id (FK cascade), academic_year_id (FK), hte_id (FK restrict),
  assigned_at, unassigned_at (nullable), assigned_by (FK users), unassigned_by (FK users),
  transfer_request_id (nullable FK), reason (text nullable), is_active (bool)
  unique active row per (intern_id, academic_year_id)
```
`interns.assigned_hte` remains a **denormalised pointer** to the active row so existing queries keep working.

*Backend*
- `HteController::transfer` — `from_hte_id`, `to_hte_id`, `reason`; closes the current assignment row (`unassigned_at`/`unassigned_by`) and opens a new one, in a transaction.
- Replace the `9ec30bf` guards: unassign should **close** the assignment (history preserved), not null it.
- Notify intern, previous HTE, new HTE, and instructors.
- Add an assignment-history endpoint + `hteAssignments()` relation on `Intern`.
- Per the confirmed hour rule, **do not touch** `ojt_status` or any hours on transfer.

*Frontend*
- Coordinator assign page: replace Unassign with **Transfer** (target HTE picker + reason).
- New "Assignment History" timeline in intern detail.

**Size:** L

---

## 7. Transfer option to another HTE

**As stated:** "Transfer option to other THE [HTE]"

**Interpretation:** A first-class "move this intern to a different HTE" action, replacing unassign + re-assign.

### Current state
Effectively impossible. `assign` requires `assigned_hte IS NULL` (`HteController.php:305`); `unassign` is blocked once deployed or once any record exists (`:251-263`). Before deployment it is a silent two-step with no audit and no notification.

### Work required
Delivered by #6's `transfer` endpoint. Additional UI:
- Transfer dialog: from HTE (read-only), to HTE (coordinator's institute, excluding current), reason (required, min 5).
- Block transfer to an HTE whose `status !== 'active'`.
- Warn if the new HTE has a different `program_id` — HTEs are program-scoped (`CoordinatorHteFormPage` assigns one program per HTE).

**Size:** M (after #6)

---

## 8. Grade = 50% old HTE + 50% new HTE ✅ CONFIRMED

**Panel clarification:** *"if intern is deployed on multiple hte then the grade is 50% for old hte then 50 for new hte"*

**Interpretation (revised):** The 50/50 is **across HTE placements**, not across evaluation directions. The intern's final grade is the equal-weighted average of the evaluations received at each HTE they were deployed to.

> **Change from rev 1:** this item was previously read as "50% HTE-rating + 50% intern-rating". The panel's clarification supersedes that reading for the multi-placement case.

### Formula

```
For each placement P in the intern's assignment history (for the academic year):
    score(P) = weighted category average of intern_evaluations where hte_id = P

final = Σ score(P) / count(P)        // equal weight per placement
```

- 1 HTE → 100% that HTE's score
- 2 HTEs → 50% / 50%
- N HTEs → equal weight each

The existing per-category weights (30 / 30 / 40 for `personal_characteristics` / `work_characteristics` / `job_knowledge`) apply **within** each placement. They are currently hardcoded and duplicated in four places:
- `Hte/EvaluationController.php:125`
- `OjtCoordinator/Evaluations/InternEvaluationController.php:117`
- `OjtCoordinator/Evaluations/HteEvaluationController.php:212` and `:418-420`

### Current state
- The intern **can already** evaluate a previous HTE in principle — `hte_evaluations` is keyed `unique(['intern_id','hte_id','criterion_id'])`, so a different `hte_id` is a different key. But the intern's form only offers the **currently assigned** HTE (`Intern/EvaluationController.php:115-119` requires an assigned HTE), so the previous HTE is unreachable in the UI.
- **No cross-placement combination exists** anywhere.
- **Bug — N/A drags averages down:** per-category average uses `COUNT(*)` (counts N/A rows) over `SUM(CASE WHEN is_na THEN 0 ELSE rating END)` (contributes 0 for N/A) — `HteEvaluationController.php:199,396` and equivalents. `HteEvaluationController.php:412-413` has a comment acknowledging the confusion but still divides by `answered` including N/As. Should be `COUNT(*) - N/A count`.
- **No reopen path:** `Hte/EvaluationController.php:226-230` and `Intern/EvaluationController.php:135-139` apply a **blanket whole-form lockout** — if *one* row exists for that intern+HTE, the entire submission is rejected. The `updateOrCreate` at `:250` / `:159` is **dead code**.
- **Original panel wording** was *"Can evaluate the previous employer (HTE)(50% - THE and INTERN)"* — see residual question below.

### Work required
- Implement the placement-weighted formula above as a **single shared service** (e.g. `EvaluationScoreService`) and delete the 4 duplicated 30/30/40 blocks — they will drift once placement weighting is added.
- Fix the N/A denominator bug.
- Let the intern evaluation form list **all HTEs from the intern's assignment history** (#6), not just the current one.
- Add a "Previous HTE" evaluation state; surface per-placement scores plus the final blended grade in reports and the intern dashboard.
- Expose `weighted_average` as a reusable API field rather than per-controller.
- Since grading spans placements within an academic year, scope the whole computation to the **enrollment** (#11) — a re-enrolled intern's two terms must not blend.

### Residual question
- ⚠️ The original note said *"50% - THE and INTERN"*. The clarification explains the **multi-HTE** split. Does the intern's **own** rating of each HTE (`hte_evaluations`) also contribute, on top of the HTE's rating of the intern? Two readings:
  - **(a)** Grade is HTE-rating only, split across placements — i.e. `hte_evaluations` (intern→HTE) is feedback only and ungraded.
  - **(b)** Nested: each placement scores 50% HTE-rating + 50% intern-rating, then placements are averaged. With 2 placements, each of the 4 components is 25%.

  *This doc assumes (a) as the simpler reading. Confirm with the panel.*
- ⚠️ For **3+ placements**, is it equal thirds or still 50/50 old-vs-new with the remainder split?
- ⚠️ Must every placement have an evaluation before a final grade exists? (Ties to #12.)

**Size:** L

---

## 9. Instructor-initiated transfer request → HTE accepts → both evaluate → coordinator reassigns ✅ CONFIRMED

**Panel answer:** *"the instructor will send the request to the HTE to transfer the Intern, the HTE will accept then evaluate the Intern, intern will evaluate the HTE as well, after that the coordinator will reassign the intern to new HTE"*

### The confirmed flow

```
 INSTRUCTOR                HTE (outgoing)        INTERN              COORDINATOR
 ──────────                ──────────────        ──────              ───────────
 requests transfer ──────► sees request
                           accepts  (CANNOT reject)
                           │ evaluates intern
                           ▼
                        (wait)                  evaluates HTE ──┐
                                                             │
      ◄──────────────── both evaluations complete ────────────┘
                                                             │
                                    picks the new HTE  ◄───────┘
                                    (same picker as normal assignment)
                                                             ▼
                                        HteAssignment closed + a new one opened
```

**Confirmed decisions**
- The required evaluation is the transfer gate: *"the hte and intern will evaluate first"* — **before** the coordinator reassigns.
- **The HTE cannot reject** a transfer request — accept is the only action.
- **The coordinator picks the target HTE**, using the same picker as the normal intern→HTE assignment.
- **There is no deadline.**
- **The coordinator may cancel** the request — the escape hatch for a stale or unwanted request.
- **Once both ratings are in the transfer is committed and cannot be aborted** (R10). Cancel is available only *before* the evaluation stage.
- **A resolved issue cannot be edited** by its reporter (existing `status !== 'resolve'` guard is correct — keep it, and apply it to delete as well).
- The **transfer gets its own UI**, distinct from the ordinary intern→HTE assignment page, so PR #48's unassign guards can be lifted from the transfer path (which legitimately reassigns interns who *have* records).

### State machine

```
 requested ──► accepted ──► evaluated ──► reassigned
     │            │             │
     │            │             └── both ratings in → COMMITTED, cannot abort
     │            │
     │            └── ratings still outstanding → cancel still possible
     │
     └── coordinator CANCEL  (available until both ratings land)
```

### Accepted consequences

- **Unresponsive HTE → the intern simply is not completed.** *"the intern wont be completed (its okay, we communicate with hte)"* — the term stays non-terminal until the HTE responds, and resolution happens offline. No system escape is needed. ⚠️ Reporting note: such interns will appear as `ongoing` indefinitely.
- Because a transfer is **committed** after evaluation, the coordinator's reassign action must be reliably reachable at that point — otherwise the intern holds a closed, graded placement while still assigned to the outgoing HTE.

### Current state
- **Instructor has no transfer or issues module at all.** `InstructorLayout.jsx` has no issues nav entry (only intern/HTE/coordinator do: `InternLayout.jsx:15`, `HteLayout.jsx:9`, `CoordinatorLayout.jsx:10,46`).
- No transfer-request entity exists anywhere (`grep -ri transfer backend/` → 0).
- `assigned_hte` is a single mutable FK with no history (`add_assigned_hte_foreign_key_to_interns_table.php:15`).
- **PR #48's guards directly conflict**: `HteController.php:251-263` and `:309-318` block unassign/re-assign when the intern has DTRs, journals or evaluations. The confirmed flow **requires** exactly that — reassigning an intern who *has* records. Those guards must be replaced.

### Work required

*Schema*
- `transfer_requests`: `id, uuid, intern_id, academic_year_id, from_hte_id, to_hte_id (nullable until the coordinator picks), requested_by (FK users = instructor), reason (text), status enum('requested','accepted','evaluated','reassigned','cancelled'), cancelled_by, cancelled_at, timestamps`.
- `intern_hte_assignments` (from #6) to record the closed + new placement.

*Backend*
- Instructor: `POST /instructor/transfer-requests`, list own requests.
- HTE: accept the request, then submit its `intern_evaluations` for the closing placement.
- Intern: submit its `hte_evaluations` for the closing placement.
- Coordinator: the reassign action, **gated on both evaluations being complete** for the closing placement.
- Replace the PR #48 guards with this flow.
- Notify at every transition.
- Add a **coordinator cancel** action, available only while `status ∈ {requested, accepted}`.
- Make the **reassign** action available at `status = evaluated`, and irreversible from that point.
- Notify at every transition.
- Add a `placement_id` (or equivalent) on evaluations so "evaluate for the period at HTE-A" is expressible — currently `intern_evaluations` is keyed `(intern_id, hte_id, criterion_id)` with no period, so a second term at the same HTE would collide.

*Frontend*
- Instructor: transfer request list + create form — **its own page**, separate from the ordinary assignment picker.
- HTE: request inbox with Accept (no reject), then the evaluation form.
- Intern: evaluation prompt once the HTE has accepted.
- Coordinator: reassign action, disabled until both ratings land; **Cancel** visible only before that.
- A **second sidebar nav link** per concern module, so the coordinator has two entries rather than one combined queue.

### Residual questions
- ✅ Resolved: the coordinator can cancel; the HTE cannot reject; the coordinator picks the target HTE; there is no deadline; the transfer is committed after evaluation and cannot be aborted.
- ⚠️ Still open: the instructor has no nav entry for transfer requests today (`InstructorLayout.jsx` has none) — confirm a new nav item is wanted, or whether requests appear inline on the monitoring page.

**Size:** XL

---

## 10. Close hours / previous hours ✅ CONFIRMED — unblocked

**Panel clarification:** *"Hours is continued as long as its on the same academic year"*

**Interpretation:** **Hours accumulate across HTE transfers within the same academic year.** An intern who transfers mid-year keeps their earned minutes; nothing resets. "Close hours" refers to closing the period at the end of the academic year, not at the end of a placement.

### What this changes from rev 1

Rev 1 flagged a **hard blocker**: `photo_dtrs` has no `hte_id`, so hours cannot be attributed per placement. **That blocker is dissolved** — hours are not placement-scoped, so no schema change is needed to split them.

### Current state
- `Intern::earnedMinutes()` (`Intern.php:97-102`) sums the intern's **entire** `photo_dtrs` history with **no academic-year scoping** — this is now the one thing that must change, because the confirmed rule is explicitly AY-scoped.
- `Hte/InternController.php:113-153` — `completeHours` sets `ojt_status = 'hours_completed'` and `end_date`; gates on `earnedMinutes() >= requiredHours() * 60` (`:125`). Single terminal action.
- Required hours currently comes from `Intern::requiredHours()` (`Intern.php:92-95`) = `$this->institute?->ojtHour?->hours` — **this is being replaced by #13** (curriculum-supplied hours).
- Related defects: `earnedMinutes()` lazy-loads `photoDtrs` (N+1 on list endpoints) and aggregates in PHP rather than SQL.

### Work required
- **Scope `earnedMinutes()` by academic year (enrollment)**, not by intern. This is the core of the confirmed rule. Rename to `earnedMinutesForEnrollment()` or add a parameter — touches ~10 call sites: `InternDetailResource.php:27-28`, `Intern/OjtHoursController.php:23-24`, `Intern/ReportController.php:45-50`, `DashboardController.php:891-896,952-954`, `OjtInstructor/InternController.php:183`, `InternRequirementController.php:188`, `Hte/InternController.php:123-125`.
- Fix the N+1 / PHP-side aggregation with a SQL `SUM` over the scoped set.
- Transfer must **not** alter hours or `ojt_status` (pairs with #6).
- "Close hours" at the end of an academic year: add `hours_closed_at` / `closed_minutes` snapshot on the **enrollment** (#11) so a completed term's total is immutable even if DTRs are later corrected. Purely for reporting integrity.
- UI: intern progress card should read as *"48 of 486 hours completed — AY 2026-2027"*, making the AY scope explicit.

### Residual question
- ⚠️ If an intern's DTR for a **previous academic year** is corrected after that year closed, does the closed total change? (Recommend: no — the snapshot wins, and the change is logged.)

**Size:** S (down from L in rev 1)

---

## 11. Enroll per academic year (not re-register) ✅ CONFIRMED

**Panel clarification:** *"the intern will enroll, by acad year, because it's possible then the intern will fail on this academic year internship, s/he wont be registering again instead enroll ojt for new academic year"*

**Interpretation:** An intern has **one account, one identity, many enrollments** — one per academic year. Failing an internship in one term means enrolling again for the next; it never means creating a new account.

### Current state — multi-enrollment is structurally impossible
- `AuthController::register:81` is the **only** place an `interns` row is ever created (`grep "intern()->create"` → 1 hit), and it **always creates a new `User`** (`:67`) guarded by `Rule::unique('users','email')` (`RegisterRequest.php:29`). An intern with an existing account **cannot register again**.
- `User::intern()` is a **`HasOne`** (`User.php:76-79`) and every read uses the singular `$user->intern` (`RegistrationApprovalController.php:190,210,216,222`, `Hte/InternController.php:166`, `Intern/EvaluationController.php:24,101`). A second intern row would be **silently shadowed**.
- **`interns` has no `unique('user_id')`** (`create_interns_table.php:16`) — the DB *would* permit a second row per user. This is the half-implemented gap.
- The de-facto current behaviour is an **overwrite, not an enrollment**: `Admin/InternController::update:24` uses `Intern::firstOrNew(['user_id' => $user->id])` and `UpdateInternRequest.php:21` requires `academic_year_id` → an admin silently moves the single row to a new AY. **`status`, `ojt_status`, `start_date`, `end_date`, `assigned_hte`, `rejection_reason` all persist untouched** — an intern marked `completed` under AY-2025 is still `completed` under AY-2026. No notification, no audit.
- `myRegistration` (`RegistrationApprovalController.php:183-200`) returns a **single row only — no multi-year history**.
- Both `interns.user_id` and `interns.academic_year_id` are `cascadeOnDelete` (`:16-17`), so deleting a term deletes its interns (mitigated by `AcademicTermController.php:101`).

### Decision (from the panel): Option (a) — one intern row per (user, academic year)
- Add `unique(['user_id','academic_year_id'])` to `interns`.
- Change `User::intern()` → `interns()` (HasMany), add a `currentEnrollment()` scope resolving the active academic term.
- Add `previous_intern_id` self-FK for lineage.
- Add `enrollment_outcome` enum(`'completed','failed','dropped'`) to record "failed OJT in sem 1", plus `is_repeat` flag.
- **The `interns` row effectively *is* the enrollment** — no separate table (rev 1's option (b) is withdrawn).

### Work required

*Schema*
- `unique(['user_id','academic_year_id'])`, `previous_intern_id` self-FK, `enrollment_outcome`, `is_repeat`, `hours_closed_at`/`closed_minutes` (from #10).
- Route model binding must change: routes currently bind by `user:uuid` (`routes/api.php:121-123`), but one user can now have several rows. Introduce `intern:uuid` per-enrollment binding, or composite `user:uuid + academic_year_id`.

*Backend*
- New **enrollment** flow: intern enrolls for a chosen AY without registering. `POST /enrollments` reusing the existing account.
- `myRegistration` → return **all enrollments** with a current/active flag.
- Fix the admin year-overwrite to create a new enrollment instead of mutating the old row, resetting `status`/`ojt_status`/`assigned_hte`/`start_date`/`end_date` for the new period.
- **Scope every report/dashboard query by enrollment** — with `earnedMinutes()` now AY-scoped (#10), a re-enrolled intern's hours are correctly separated.
- `photo_dtrs`/`daily_journals`/`intern_evaluations`/`hte_evaluations` are `intern_id`-scoped, so they follow the enrollment row automatically. **The prior term's data stays on the prior row** — this is exactly the panel's "the data remains the same".
- Coordinator pending list must show one row **per enrollment**, not per user.

*Frontend*
- Intern: enrollment history view; AY picker on enroll.
- Coordinator: registration list keyed by enrollment; a user with 2 terms shows 2 rows.

### Residual questions
- ⚠️ Can the intern pick the AY, or is it forced to the active term? (Currently server-forced at `AuthController.php:50-51`.)
- ⚠️ Does "failed" mean hours not met, or administratively failed? Who sets `enrollment_outcome`?
- ⚠️ Can an intern re-enroll in the *same* AY (e.g. after a rejected pre-deployment requirement)?
- ⚠️ Is there a cap on repeats? Does repeating require coordinator approval?

**Size:** XL

---

# Panel 3 — Quiros

## 12. Require the evaluation ✅ CONFIRMED — both transfer-gated AND completion-gated

**Panel answers:** *"the required evaluation is if the intern is reassign/transfer to new hte, the hte and intern will evaluate first"* and *"yes its required (keep the existing feature for normal term)"*

**Interpretation:** Evaluation is required in **two** places, and the existing evaluation feature is retained unchanged for normal terms:
1. **Before a transfer** — the outgoing HTE and the intern both evaluate (see #9).
2. **Before a term is completed** — the instructor may not set `outcome = completed` until both ratings are in.

**⚠️ This supersedes the transfer-only reading in rev 3.** The transfer gate alone would have left a normal term with no guaranteed grade, since nothing obliges an HTE to evaluate when no transfer happens.

### No circular dependency

The rev-1 concern (that the intern cannot rate their HTE until hours are done) does not bite, because the gates that already exist permit exactly this order:

- `Hte/EvaluationController.php:44` — the HTE's intern list **already includes `ongoing` interns**, so the HTE can evaluate mid-deployment.
- `Intern/EvaluationController.php:30,107` — the intern may rate their HTE once `ojt_status ∈ {hours_completed, completed}`.

So: hours met → `hours_completed` → HTE evaluates + intern evaluates → instructor sets `completed`.

### Current state
- `Hte/InternController::completeHours:113-153` checks only `ojt_status` and the hour threshold; it never touches `InternEvaluation`.
- `OjtCoordinator/Requirements/InternRequirementController::markCompleted:268-316` gates only on requirements — **an intern can be marked `completed` with zero evaluations today.**

### Work required
- Gate the instructor's outcome action (R8) on **both** ratings being complete for the term.
- Gate the coordinator's transfer reassign on both ratings for the *closing* placement (#9).
- Reuse `evaluationStatus()` (`OjtCoordinator/Evaluations/InternEvaluationController.php:220`) to report which criteria are unanswered.
- Fix the N/A denominator first (Decision: N/A is **excluded**) — `HteEvaluationController.php:199,396`.
- Surface "Evaluation pending" on the instructor and coordinator intern lists.

**Size:** M (transfer half folded into #9's XL)

**Residual question**
- ⚠️ With a completed term now requiring both ratings, is there any way to close a term where an HTE has gone unresponsive and never evaluated? Otherwise such interns can never be marked `completed` and stay open forever.

---

## 13. Remove the OJT Hours module; curriculum carries the hours ✅ CONFIRMED (rewritten)

**Panel clarification:** *"for the curriculum (remove the ojt hours module) interns will upload the curriculum then put the ojt hours (this happens because there are many curriculum for every academic year and every program)"*

**Interpretation (revised from rev 1):** The admin-configured OJT Hours module is **deleted**. Instead, each intern **uploads their curriculum** and **sets the required OJT hours on that curriculum record** — because curricula (and therefore hour requirements) vary per program *and* per academic year.

### Current state — an institute-wide constant, admin-owned
- `create_ojt_hours_table.php:15-20` — `id`, `institute_id` (FK, `cascadeOnDelete`), `hours` (int), timestamps, **`unique('institute_id')`**.
- `App\Models\OjtHour.php:10-13` — `$fillable = ['institute_id','hours']`. Two columns, no program, no term, no curriculum.
- `App\Models\Institute.php:34-36` — `ojtHour(): HasOne`, enforcing the 1:1.
- `Intern::requiredHours()` (`Intern.php:92-95`) = `$this->institute?->ojtHour?->hours` — ignores program, AY, curriculum, cohort. Returns `null` if unconfigured.
- **Admin-only module:** `Admin/OjtHourController.php` (89 lines, 5 methods, bound by numeric id) + `StoreOjtHourRequest` / `UpdateOjtHourRequest` + `AdminLayout.jsx:8` nav entry (`{ to: "/admin/ojt-hours", label: "OJT Hours", icon: Clock }`).
- **Delete guard coupling:** `Admin/InstituteController.php:98` blocks institute deletion while `ojtHour()->exists()`.
- **Migration coupling:** `2026_08_30_223456_restrict_parent_deletion_with_children` makes `ojt_hours.institute_id` a `RESTRICT` FK.
- ~10 `requiredHours()`/`earnedMinutes()` call sites and 6 report controllers reference it (`Admin/ReportController.php:128,289`, `Hte/ReportController.php:166,231`, `OjtInstructor/ReportController.php:175,237`).

### Gap
Hours are a single per-institute number applied retroactively to every intern across every year — which is exactly what the panel says is wrong.

### Work required

*Schema — remove*
- Drop the `ojt_hours` table (which also drops its RESTRICT FK).
- Delete `App\Models\OjtHour`, `Admin/OjtHourController`, `StoreOjtHourRequest`, `UpdateOjtHourRequest`.
- Remove `Institute::ojtHour()` and the delete guard at `Admin/InstituteController.php:98`.
- Remove the `AdminLayout.jsx:8` nav entry and `frontend/src/pages/admin/ojt-hours/*`.

*Schema — add*
```
curricula
  id, uuid, intern_id (FK, enrollment-scoped) | enrollment_id,
  program_id (FK), academic_year_id (FK),
  curriculum_year (int, e.g. 2018),
  document_path (string, the uploaded PDF),
  ojt_hours (int, REQUIRED HOURS SET BY THE INTERN),
  status enum('pending','approved','rejected'),
  rejection_reason, reviewed_by, reviewed_at, uploaded_at, timestamps
  unique (intern_id, academic_year_id)
```
- `interns.curriculum_id` (nullable FK) — snapshot so later curriculum edits don't rewrite history.
- `Intern::requiredHours()` → resolve from the intern's approved curriculum instead of the institute.

*Backend*
- Curriculum upload endpoint (reuse the `ImageOptimizer`/Storage pattern from `ProfileController::destroyAvatar` and the COR-swap logic at `RegistrationApprovalController.php:244-253`).
- Coordinator/admin approve/reject curriculum + hours, with a numeric sanity range (e.g. 100–1000).
- Rewrite all ~10 `requiredHours()`/`earnedMinutes()` call sites and the `ojt_hours` section in 6 report controllers to read the curriculum.
- **Validation question:** an intern-supplied hours value that nobody verifies is a grading-integrity risk. See residual question below.

*Frontend*
- Intern: curriculum upload + hours input, per academic year; progress card shows the hours and their source ("BSIT 2018 curriculum — 486 hrs").
- Coordinator/admin: curriculum review queue showing the document alongside the proposed hours.
- Remove the admin OJT Hours page and nav entry.

### Residual question
- ⚠️ **Who verifies the intern-entered hours?** The panel's phrasing ("interns will upload the curriculum then put the ojt hours") makes the intern the source of truth. That allows a student to under-declare hours and pass early. Recommend: coordinator approval is **mandatory** before the value takes effect, with the raw proposal retained for audit. Confirm this is acceptable.

**Size:** L (down from XL in rev 1 — we are deleting a resolver rather than building a multi-dimensional one)

---

## 14. Prospectus 2018–2023

**As stated:** "Prospectus 2018 – 2023"

**Interpretation:** A **Prospectus** (OJT deployment/approval letter) must be uploaded per intern, covering the 2018–2023 historical period as well as current terms.

### Current state — no prospectus concept anywhere
- `grep -ri prospectus backend/` → zero matches.
- Closest construct is `requirement_submissions` (`create_requirement_submissions_table.php:16-23`): `user_id`, `requirement_id`, `file_path`, `status` enum(`pending`/`approved`/`rejected`), `rejection_reason`, `reviewed_by`/`reviewed_at`, `unique(['user_id','requirement_id'])`.
- Requirements are **institute-level**, typed `pre_deployment` / `post_deployment` (`create_requirements_table.php:18`) — a general document checklist, **not** a year-specific letter.
- Registration uploads only a **COR** (`RegisterRequest.php:42`, `ResubmitRegistrationRequest.php:32`) — 1 PDF, ≤10 MB.
- Nothing is year-scoped except `academic_year_id` on the intern row.

### Gap
No prospectus entity, and no mechanism for a term-specific document with its own review state.

### Work required

*Schema*
- `prospectuses` (or fold into #15's application entity): `id, uuid, intern_id, academic_year_id, document_path, status enum('pending','approved','rejected'), rejection_reason, reviewed_by, reviewed_at, uploaded_by, timestamps, unique(intern_id, academic_year_id)`.
- Reuse the existing file-replacement pattern (delete the old file on replace).

*Backend*
- Upload, download, approve/reject endpoints, per intern and per term.
- Extend the reports' annex (#4) with a Prospectus compliance column (`Uploaded` / `Approved` / `Missing`) — directly useful for a 2018–2023 audit.
- **Backfill decision:** 2018–2023 is historical. Either (a) create prospectus records retroactively with a year and a document reference but no file, or (b) add a legacy flag on the enrollment (`prospectus_legacy bool`) exempting those years from the upload requirement. **(b) is far cheaper if the documents are unavailable.**

*Frontend*
- Upload control on the enrollment/apply flow and the intern detail page.
- Coordinator review queue + approve/reject with remarks.
- A "missing prospectus" filter on the registrations list.

### Residual question
- ⚠️ **Are the actual 2018–2023 prospectus documents available to upload, or is this a requirement going forward with a legacy exemption?** This is the single biggest cost driver in this item.

**Size:** L

---

# Committee's "Better Solution"

## 15. Apply for OJT (upload prospectus) → coordinator apply for OJT

**As stated:** "Apply for ojt – upload prospectus | then coordinator apply for ojt (if there is an acc already)"

**Panel clarification (partial):** the intern **enrolls** per academic year rather than re-registering.

**Interpretation:** Split OJT entry into two steps from today's single combined flow:
1. **Apply/Enroll for OJT** — the intern submits an enrollment for an academic year, attaching a Prospectus (and, per #13, a curriculum with OJT hours).
2. **Coordinator applies/endorse for OJT** — the coordinator acts; *if the intern already has an account* the coordinator files against the existing account rather than creating a new user.

### Current state — one combined flow, no application step
- `POST /register` (`AuthController::register:46-114`) performs account creation **and** intern-record creation **and** location **and** OTP in one call. There is no separate apply/enroll entity.
- The academic year is **server-forced**: `AuthController.php:50-51` picks the active term; `RegisterRequest` has **no `academic_year_id` rule** — the client cannot choose.
- The coordinator's only lever is **approve/reject** on that same registration (`RegistrationApprovalController::approve:109-144` / `reject:149-178`) — not a separate "apply for OJT" action.
- The email-unique constraint (`RegisterRequest.php:29`) is what forces the new-account flow and blocks re-application.
- The only existing request-like loop is `resubmit` (`:205-276`), which **omits `academic_year_id`**, so a resubmit can never change terms.

### Work required
This is the convergence of **#11 (enrollment)**, **#13 (curriculum)** and **#14 (prospectus)**. Implement together, as the enrollment flow:
1. New `ojt_applications` / `enrollments` entity carrying `user_id`, `academic_year_id`, `prospectus_path`, `curriculum_id`, `status`, decision trail.
2. `POST /enrollments` — the intern **enrolls** for a chosen AY, uploading Prospectus + curriculum. **Reuses the existing account**; only `POST /register` still creates users.
3. Coordinator: review + a distinct **"Apply/Endorse for OJT"** action, separate from approve/reject.
4. Approval creates the **enrollment** for that AY (per #11) and sets `academic_year_id`, which today is only ever set at registration.
5. Reject routes into the existing `resubmit` loop, extended to carry `academic_year_id`.
6. Attach the curriculum + hours (#13) and the prospectus (#14) to the same enrollment so one submission covers all three.

### Residual question
- ⚠️ "Coordinator apply for OJT" — does the coordinator **file the application on the intern's behalf**, or **endorse/approve** an intern-filed one? The two produce very different permissions and UI.
- ⚠️ Can one account hold concurrent applications for multiple terms?
- ⚠️ Does the Prospectus upload block the application, or merely accompany it?
- ⚠️ Does this replace the current `pending` → `approved` registration statuses, or layer on top of them?

**Size:** L (down from XL — it is now the enrollment flow from #11, not a separate mechanism)

---

## 16. "Issues and Concerns" page (not just Issues)

**As stated:** "Issues an Concerns page(not just issues)"

**Interpretation:** Rename the module and surface **Concerns** as a first-class type alongside Issues.

### Current state — everything is called just "Issues"

| Location | Current text |
|---|---|
| `frontend/src/pages/intern/issues/InternIssuesListPage.jsx:236-249` | Title `Issues`, subtitle `Track and manage issues with your HTE.` |
| `frontend/src/pages/hte/issues/HteIssuesListPage.jsx:248-257` | Title `Issues`, subtitle `Track and manage issues for your assigned interns.` |
| `frontend/src/pages/ojt_coordinator/issues/CoordinatorIssuesListPage.jsx:213-217` | Title `Issues`, subtitle `Track and manage issues reported in your institute.` |
| `InternLayout.jsx:15` | nav label `Issues` |
| `HteLayout.jsx:9` | nav label `Issues` |
| `CoordinatorLayout.jsx:10,46` | nav label `Issues` (footer + mobile bottom nav) |
| Dialogs | `Report an Issue` / `Edit Issue` / `Issue Details` |

Also: `CoordinatorIssueFormDialog.jsx` (352 lines) is **orphaned** — not imported anywhere; the list page navigates to `/coordinator/issues/:id` (`:364`) which renders `CoordinatorIssueFormPage.jsx` (575 lines). Duplicate dead code.

### Work required
- Rename page titles, subtitles, and all six nav labels to **"Issues and Concerns"**.
- Add a `Concern` type — either a `severity`/`kind` enum (`issue` vs `concern`) or fold into #3's `subject_type` + `category`. ⚠️ Coordinate with #3 to avoid two competing taxonomies.
- Add a kind filter chip to all three list pages.
- Delete the orphaned `CoordinatorIssueFormDialog.jsx`.
- Subtitles that say "issues" twice should be reworded.

**Size:** S

---

# Cross-cutting findings (not panel-requested)

These surfaced during the analysis and should be scheduled regardless:

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| A | **Missing import → fatal 500.** `UserNotification::notify()` with no `use` statement; resolves to a non-existent controller-namespace class. Fires exactly when a coordinator resolves an issue. | `OjtCoordinator/Issues/IssueController.php:267,275` (missing in `use` block `:5-11`) | **High** |
| B | **Admin report Open/Resolved always 0.** Frontend reads `by_status.open`/`.resolved`; backend returns `pending`/`resolve`. | `admin/ReportPage.jsx:307,839,840`; `AdminReportPrintPage.jsx:406,407` vs `Admin/ReportController.php:92-95,269` | Medium |
| C | **Category averages distorted by N/A.** Denominator `COUNT(*)` includes N/A rows while the sum contributes 0. Directly corrupts the #8 final grade. | `HteEvaluationController.php:199,396,412-413`; `InternEvaluationController.php:104`; `Hte/EvaluationController.php:106` | **High** (was Medium) |
| D | **`checked_by` / `checked_at` never written.** Instructor approve sets only `status`. Columns exist, are fillable, and are exposed by the resource — always null. | `OjtInstructor/InternMonitoringController.php:99` vs migration `:29-30`, `PhotoDtrResource.php:31-32` | Medium |
| E | **Hours can be silently destroyed.** Instructor reject has **no prior-status guard**, so a `checked` DTR can be rejected and its hours removed. Approve can flip `rejected`→`checked`. HTE verify can flip `checked`→`verified`, which **zeroes** earned hours because only `checked` counts. Under the confirmed "rejected = absent" rule, an unguarded reject silently converts a workday into an absence. | `OjtInstructor/InternMonitoringController.php:66-171`; `Hte/InternMonitoringController.php:99-103` vs `Intern.php:99` | **High** |
| F | **Re-punching resets state but keeps stale remarks.** Every punch forces `status='pending'`, so a `checked` DTR loses its hours on re-punch while the old rejection `remarks` survive. | `Intern/PhotoDtrController.php:110,133` | Medium |
| G | **`earnedMinutes()` is unscoped and N+1.** Sums the whole DTR history regardless of AY, and lazy-loads `photoDtrs` (per-intern query) on list endpoints that don't eager-load it. Aggregates in PHP rather than SQL. **Becomes the core fix for #10.** | `Intern.php:97-102`; callers `OjtInstructor/InternController.php:183`, `DashboardController.php:891` | **High** at 700 interns/term |
| H | **Delete bypasses the resolve lock** in all three issue controllers. | `OjtCoordinator/...:290`, `Hte/...:270`, `Intern/...:211` | Medium |
| I | **No notification on unassign.** The intern is never told they were removed from an HTE. | `HteController.php:266` | Medium |
| J | **`issues` table has no `uuid`**, bound by numeric id unlike every other table. | `create_issues_table.php`; `routes/api.php:114,169-170,191` | Low |
| K | **`PhotoDtrResource` omits `computedMinutes`.** The frontend recomputes hours client-side in 3 places — the direct cause of finding #1's display bug. | `app/Http/Resources/Intern/PhotoDtrResource.php` | Low |
| L | **Coordinator has no DTR endpoint** despite aggregating DTR status counts on their dashboard. | `routes/api.php:94-95,198`; `DashboardController.php:403-424` | Low |
| M | **Status vocabulary drift** — `disapproved` on intern pages vs `rejected` elsewhere. | `intern/ReportPage.jsx:270-282` | Low |
| N | **`interns.user_id` and `interns.academic_year_id` are both `cascadeOnDelete`.** Once multi-enrollment exists (#11), deleting a term destroys enrollments *and* their DTRs/journals/evaluations. `RESTRICT` is required. | `create_interns_table.php:16-17` | **High** (rises with #11) |

---

# Dependencies & sequencing

```
QUICK WINS (unblocked, ship now)
  #1  rejected→Absent label, no hours shown     S
  #2  issue not editable                        S
  #5  dedupe HTE placement report               S
  #10 scope hours by academic year              S   ← also fixes finding G
  #16 rename to "Issues and Concerns"           S

SINGLE ROAD
  #4  report annex with issue content           M
  #12 require the evaluation                    M   ← needs Q from Quiros
  #13 remove OJT Hours, curriculum carries hours L   ← independent, but
                                                        touches every report + ~10 call sites

DEPENDENT CHAIN
  #6  assignment history (intern_hte_assignments)  L
        │  (replaces PR #48 guards; enables #7, #8, #9)
        ├─► #7  transfer to another HTE              M
        ├─► #8  50/50 per-placement grade           L   (needs placement list)
        └─► #9  instructor transfer request         XL  (also needs #12)

ENROLLMENT TRACK (ship together)
  #11 enroll per academic year                  XL  ← root of the track
  #14 prospectus 2018–2023                      L
  #15 apply/enroll + coordinator endorse         L
        (each depends on #11's enrollment entity)

  #3  issues vs concerns (taxonomy)  L
  #16 ─┘  (adopt one taxonomy, not two)
```

**Critical path:** #11 (enrollment) → #15, and #6 (assignment history) → #8/#9.
**Highest risk:** #11 — it changes route binding, every list endpoint, and the meaning of `$user->intern` throughout the codebase.

---

# Open questions

✅ = answered · ⚠️ = still open

> **Note (rev 3):** Decisions below were subsequently confirmed by the panels. The multi-term enrollment solution — architecture, schema and flow — is documented separately in [`README.md`](./README.md), which supersedes items #11 and #15 here.

| # | Question | Blocks | Ask | Status |
|---|----------|--------|-----|--------|
| 1 | "Absent" = absent, or rejected-so-doesn't-count? | #1 | Selatona | ✅ Rejected *is* absent; hours not counted |
| 2 | On transfer, do hours reset or carry over? | #10 | Agua | ✅ Continue within the same academic year; **reset across years** |
| 3 | Confirm the 50/50 weighting | #8 | Agua | ✅ Equal average across HTE placements |
| 3b | Does the intern's own rating count in the grade? | #8 | Agua | ✅ **Yes — same calculation, same weights, equal weight** |
| 4 | Evaluation precondition or consequence of transfer? | #9 | Agua | ✅ **Precondition** — both evaluate before reassignment |
| 5 | Who approves an instructor's transfer request? | #9 | Agua | ✅ **HTE accepts; coordinator reassigns.** HTE cannot reject; no deadline |
| 6 | Evaluation required for completion? | #12 | Quiros | ✅ **Yes — both transfer-gated and completion-gated**; existing feature retained |
| 6b | Can a term close if the HTE never evaluates? | #12 | Committee | ✅ **No — the intern simply is not completed; resolved offline** |
| 12 | Replace PR #48's reassign guard? | #6, #7 | Committee | ✅ **Yes — the transfer gets its own UI, and the guards come off the transfer path** |
| 7 | What is a "curriculum"? | #13 | Quiros | ✅ Intern uploads it + sets hours; module removed |
| 7b | Who verifies the intern-entered hours? | #13 | Quiros | ✅ **Coordinator approves** |
| 7c | Multiple curricula per program per year? | #13 | Quiros | ✅ **Not a problem** — pinned at enrollment, coordinator approves |
| 8 | Missing evaluation direction? | #8 | Agua | ✅ **All evaluations are required** — no partial grade |
| 8b | N/A handling? | #8 | Agua | ✅ **Excluded** from the average |
| 9 | "Coordinator apply for OJT" — file or endorse? | #15 | Committee | ✅ **Endorse only** — coordinator never creates |
| 10 | Re-enrollment: new account or reuse? | #11 | Committee | ✅ Reuse — enroll per academic year |
| 10b | Can the intern choose the term? | #11, #15 | Committee | ✅ **No — automatic from the active term** |
| 10c | Concurrent enrollments? | #11 | Committee | ✅ **No — one per semester, re-enroll only after failure** |
| 10d | Who sets `enrollment_outcome`? | #11 | Committee | ✅ **The instructor** |
| 10e | Re-submit requirements on re-enrollment? | #11 | Committee | ✅ **Yes — all requirements** (schema blocker found) |
| 10f | `ongoing` without an assigned HTE? | #11 | Committee | ✅ **Not allowed** — HTE required to deploy |
| 11 | "Separate issues and concerns" — one page or two? | #3, #16 | Selatona | ✅ **Two separate modules** — "to HTE" and "to Interns" |
| 11b | Who may edit an issue? | #2 | Selatona | ✅ **Original reporter only**; coordinator edits solutions/recommendations |
| 11c | May a reporter edit a **resolved** issue? | #2 | Selatona | ✅ **No** — locked at `status = 'resolve'` |
| 12 | Replace PR #48's reassign guard? | #6, #7 | Committee | ✅ **Yes — the transfer gets its own UI; guards come off the transfer path** |
| 13 | Closed-term hours immune to later DTR correction? | #10 | Agua | ✅ **Frozen** — a later correction does not move the closed total |
| 13b | Is there an amendment path for a valid late correction? | #10 | Committee | ✅ **No — truly frozen; corrections are handled outside the system** |
| 15 | Can the HTE **reject** a transfer request? | #9 | Agua | ✅ **No** |
| 16 | Who chooses the target HTE? | #9 | Agua | ✅ **The coordinator**, using the normal assignment picker |
| 17 | Deadline for the HTE to evaluate? | #9 | Agua | ✅ **No deadline** |
| 18 | When is a final grade produced? | #8, #12 | Committee | ✅ **Every term** — both ratings required, so every intern is guaranteed a grade |
| 20 | Is there a **coordinator cancel** escape hatch for a stranded transfer? | #9 | Agua | ✅ **Yes — added**, available only before both ratings land (R10) |
| 21 | Can a transfer be aborted after both evaluations are in? | #9 | Agua | ✅ **No — committed and irreversible** (R10) |
| 22 | Combined overview of both concern modules, or two separate queues? | #3 | Selatona | ✅ **Two separate — two sidebar nav links** |

### Elaboration — Q18: when is a final grade produced? ✅ RESOLVED

The grade itself is fully specified: the equal-weight average of every rating in the term.

> Intern does 486 hours at HTE-A only. HTE-A evaluates them → `4.2`. Intern evaluates HTE-A → `4.5`. **Grade = (4.2 + 4.5) / 2 = 4.35.**

A normal intern gets a grade without any transfer. **Decision: both ratings are required for every term**, so evaluation is no longer transfer-only and every intern is guaranteed a grade. The completion gate is back — see #12.

### Elaboration — Q13: can a DTR correction change a closed term's total?

> An intern logs 400 of 486 hours. The instructor sets the outcome to `completed` and the term closes at **400**.
> Two weeks later the HTE finds a DTR was entered wrong — the intern forgot to clock out on the 14th, so a real day was short by 4 hours. The DTR is corrected.
> **Should the closed term now read 440, or stay frozen at 400?**

**Decision: frozen, and corrections happen outside the system.** The `closed_minutes` snapshot is final — the 400 stays 400, and a valid late correction is applied outside SMARTLOG. No amendment action, no override, no recalculation path is required. The snapshot must therefore be **stored rather than computed on read**, or a later DTR edit would silently move it and defeat the freeze.

---

# Appendix — schema changes this work will need

## Tables to add

| Table | Revision | Notes |
|-------|----------|-------|
| `intern_hte_assignments` | #6, #7, #8, #9 | assignment history: `assigned_at`/`unassigned_at`/`assigned_by`/`reason`; **the key to #8's per-placement grading** |
| `transfer_requests` | #9 | instructor-initiated, with decision trail |
| `curricula` | #13 | uploaded by the intern, carries `ojt_hours`, per program + academic year |
| `enrollments` / extended `interns` | #11, #15 | one per (user, academic year); `ojt_applications` wrapper for prospectus |
| `prospectuses` | #14 | if not folded into the enrollment/application entity |

## Tables to remove

| Table | Revision | Notes |
|-------|----------|-------|
| `ojt_hours` | #13 | also drops its `RESTRICT` FK from the `2026_08_30_223456` migration |

## Columns to add to existing tables

| Table | Column | Revision |
|-------|--------|----------|
| `photo_dtrs` | *(none required — hours are AY-scoped, not placement-scoped)* | #1, #10 |
| `interns` | `unique(['user_id','academic_year_id'])`, `previous_intern_id`, `curriculum_id`, `enrollment_outcome`, `is_repeat`, `hours_closed_at`, `closed_minutes` | #10, #11, #13 |
| `issues` | `subject_type`, `title`, `severity`/`kind`, `resolved_at`, `resolved_by`, `uuid` | #2, #3, #16 |
| `photo_dtrs` | *(audit)* `checked_by` / `checked_at` are written correctly | finding D |

## FK delete rules to revisit

- `interns.user_id` and `interns.academic_year_id` are both `cascadeOnDelete` (`create_interns_table.php:16-17`). Once multi-enrollment exists (#11), **deleting an `AcademicTerm` would destroy that term's enrollments and all their DTRs, journals, and evaluations.** Switch to `RESTRICT`. This rises from Medium to **High** as a consequence of #11 — worth folding into that work.
- `intern_hte_assignments.hte_id` should be `RESTRICT` so an HTE with history cannot be deleted (today `htes` deletion cascades and leaves orphaned evaluation rows).

## Net effect on reports

Every report controller currently reads `ojt_hours` and will need re-sourcing to the enrollment's curriculum:
`Admin/ReportController.php:128,289` · `Hte/ReportController.php:166,231` · `OjtInstructor/ReportController.php:175,237` · `OjtCoordinator/ReportController.php:175` · plus `Intern/ReportController.php:45-50` and `DashboardController.php:891-896,952-954`.
