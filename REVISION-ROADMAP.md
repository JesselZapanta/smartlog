# SMARTLOG — Revision Implementation Roadmap

**Date:** 2026-08-30
**Scope:** All 16 panel revisions (OJT Panel 1 / Selatona, Panel 2 / Agua, Panel 3 / Quiros, plus the committee's "Better Solution")
**Companion docs:**
- [`PANEL-REVISIONS.md`](./PANEL-REVISIONS.md) — per-revision analysis, current-state code references, sizing
- [`README.md`](./README.md) — multi-term enrollment architecture, schema, flow, business rules

**No application code has been changed. This is a plan.**

---

## ▶ START HERE — ordered execution checklist

Work top to bottom. Steps 1–3 have no design decisions and can be done in an hour.

### Batch 1 — trivial bug fixes · ~1 hour

| Step | Do this | Where | Serves | ✅ Done when |
|---|---|---|---|---|
| **1** | Add `use App\Models\UserNotification;` | `backend/app/Http/Controllers/Api/OjtCoordinator/Issues/IssueController.php` (import block, `:5-11`) | #2 | A coordinator can resolve an issue without a 500 |
| **2** | Write `checked_by` / `checked_at` alongside `status` in the approve branch | `backend/app/Http/Controllers/Api/OjtInstructor/InternMonitoringController.php:99` | #1, #10 | `PhotoDtrResource` returns non-null `checked_by` / `checked_at` |
| **3** | Align admin report status keys — pick one convention and make both sides match | Frontend `admin/ReportPage.jsx:307,839,840` + `AdminReportPrintPage.jsx:406,407` vs backend `Admin/ReportController.php:92-95,269` | #4 | Admin **Open** and **Resolved** show real counts, not 0 |

### Batch 2 — data integrity · ~3 days · **requires tests**

| Step | Do this | Where | Serves | ✅ Done when |
|---|---|---|---|---|
| **4** | Extract the duplicated 30/30/40 weighted average into one `EvaluationScoreService` | `Hte/EvaluationController.php:125`, `OjtCoordinator/Evaluations/InternEvaluationController.php:117`, `HteEvaluationController.php:212` and `:418-420` | #8 | One service; the 4 copies are gone |
| **5** | Fix the N/A denominator — count non-N/A rows instead of `COUNT(*)` | `HteEvaluationController.php:199,396`, `InternEvaluationController.php:104`, `Hte/EvaluationController.php:106` | #8 | An all-N/A category no longer drags the average toward 0 |
| **6** | Add status-transition guards: **block `checked`→`rejected`, block `checked`→`verified`, block re-punching a `checked` DTR.** Allow `rejected`→`checked` (the "we made a mistake" path) | `OjtInstructor/InternMonitoringController.php:66-171`; `Hte/InternMonitoringController.php:99-103`; `Intern/PhotoDtrController.php:110,133` | #1 | A `checked` DTR can never silently lose its earned hours |
| **7** | Scope `earnedMinutes()` by academic year and aggregate in **SQL** (not PHP). Join `photo_dtrs → interns.academic_year_id`. Same task as finding **#G** | `backend/app/Models/Intern.php:97-102`; callers: `InternDetailResource.php:27-28`, `Intern/OjtHoursController.php:23-24`, `Intern/ReportController.php:45-50`, `DashboardController.php:891-896,952-954`, `OjtInstructor/InternController.php:183`, `InternRequirementController.php:188`, `Hte/InternController.php:123-125` | #10, #G | Hours reset per academic year; no N+1; report queries no longer load every DTR row into memory |

### Batch 3 — UI & permissions · ~3 days

| Step | Do this | Where | Serves | ✅ Done when |
|---|---|---|---|---|
| **8** | Expose `computedMinutes` (and the display status) on the resource | `backend/app/Http/Resources/Intern/PhotoDtrResource.php` | #1 | The frontend stops recomputing hours in 3 places |
| **9** | Rejected DTRs render **Absent** with `—` hours; fix the print sheet so per-row values agree with the Total | `intern/ReportPage.jsx:420,448-453`; `InternDtrLogsPage.jsx:307-315`; `InternDtrPrintPage.jsx:62-64,126,136-137` | #1 | Row sum matches the printed total on every sheet |
| **10** | Coordinator's issue edit → `solutions` + `recommendations` + `status` only. Reporter keeps `issues`. Remove `intern_id` from the HTE reporter's editable set. Add a resolve-lock to `destroy` | `OjtCoordinator/Issues/IssueController.php:212-288`; `Hte/IssueController.php:226-268`; `destroy` in all three | #2 | The coordinator cannot alter a reporter's text |
| **11** | Force `status = pending` on issue create (currently client-supplied, so a reporter can pre-resolve and lock their own text) | `Hte/IssueController.php:128`, `Intern/IssueController.php:116` | #2 | A new issue can never start out resolved |
| **12** | Delete the duplicated "Top HTEs by Assigned Interns" table | `ojt_coordinator/ReportPage.jsx:452-481`; `CoordinatorReportPrintPage.jsx:203-211`; drop `top_htes` from `ReportController.php:120-134` | #5 | Each HTE row appears exactly once |
| **13** | Normalise the status vocabulary (`disapproved` vs `rejected`) | `intern/ReportPage.jsx:270-282` | #1 | One shared mapping |

### After Batch 3

Run `php artisan test --compact` (baseline **328 passing**) and `vendor/bin/pint --dirty --format agent`. Then move to the **Next** tier — the two foundations, #11 and #9. Full sequencing in §4.

> ⚠️ **Carry into #11 (Next tier):** `requirement_submissions` is `UNIQUE(user_id, requirement_id)`. Since a re-enrolled intern must resubmit all requirements, that column must be re-scoped to the enrollment **before** #11 ships, or the new term becomes unsatisfiable.

---

## 1. The revisions

| # | Panel | Revision | Area | Size | Status |
|---|-------|----------|------|------|--------|
| 1 | Selatona | Rejected DTR = **absent**, hours not reflected | Reports | S | Confirmed |
| 2 | Selatona | Issue editable by **reporter only**; coordinator edits solutions/recommendations | Issues | S | Confirmed (reversed) |
| 3 | Selatona | **Two separate** Issues & Concerns modules (to HTE / to Interns) | Issues | L | Confirmed |
| 4 | Selatona | Report annex — cols: issue, solution, recommendations | Reports | M | Confirmed |
| 5 | Selatona | HTE placement report — remove duplicated table | Reports | S | Confirmed |
| 6 | Agua | Reassign — previous employer's data remains | Transfer | L | Confirmed |
| 7 | Agua | Transfer option to other HTE | Transfer | M | Confirmed |
| 8 | Agua | Grade = equal average of **all** ratings | Evaluations | L | Confirmed |
| 9 | Agua | Instructor requests → HTE accepts → both evaluate → coordinator reassigns | Transfer | **XL** | Confirmed |
| 10 | Agua | Close hours — continue within same AY, **reset across years** | Hours | S | Confirmed |
| 11 | Agua | **Enroll per academic year** (never re-register) | Enrollment | **XL** | Confirmed |
| 12 | Quiros | Evaluation required — **transfer AND completion** | Evaluations | M | Confirmed |
| 13 | Quiros | **Remove OJT Hours module**; curriculum carries hours | Curriculum | L | Confirmed |
| 14 | Quiros | Prospectus 2018–2023 (students upload) | Prospectus | L | Confirmed |
| 15 | Better | Apply for OJT (upload prospectus) → coordinator accepts | Enrollment | L | Confirmed |
| 16 | Better | "Issues and Concerns" page (not just Issues) | Issues | S | Confirmed (fold into #3) |

**Effort totals:** 5×S · 3×M · 6×L · 2×XL ≈ **33 days** solo, plus the cross-cutting bug fixes in §5.

Sizing key: **S** ≤ ½ day · **M** ≤ 1 day · **L** ≤ 3 days · **XL** > 3 days

---

## 2. The two roots

Almost everything is blocked by one of two foundational items.

```
        #11  ENROLLMENT (XL)                #6 + #9  ASSIGNMENT HISTORY (L + XL)
     one intern row per                    intern_hte_assignments — who was at
     (user, semester)                      which HTE, and when
              │                                        │
     ┌────────┼──────────┐                             ├─► #8  grade
     │        │          │                             └─► #7  transfer
   #14    #15          #13                             #12 (transfer half)
prospectus  apply     curriculum                              │
                    (+ R4 hours)                               │
   #10 (hours by term) ─────────────────────────────────────┘
```

- **#11** blocks #13, #14, #15 — and gives #10 and #8 a term to scope against.
- **#9** blocks #8, #7, and the transfer half of #12.

---

## 3. Hard ordering constraints

### 🔴 Never drop `ojt_hours` before `curricula` is live

`Hte/InternController.php:123-129` treats a **null** required-hours value as *"not met"*:

```php
$required === null || $intern->earnedMinutes() < $required * 60   // → 422
```

Drop the table before the curriculum replacement is approved and **every intern is permanently locked out of `hours_completed`**. #13 must ship as a single atomic release: curricula + approval UI live **first**, `ojt_hours` dropped **last**.

### 🔴 Fold #16 into #3 — do not build it separately

#16 is a rename; #3 splits the page in two. Building #16 first means renaming the same nav item twice. Ship the rename **with** the split.

### 🟢 #10 survives the #11 refactor — build it now

`photo_dtrs → intern_id → interns.academic_year_id` is joinable **today**. Scoping by AY now works via that join; after #11 the intern row *is* the enrollment and the identical query still holds. It also fixes an N+1 and removes unbounded PHP-side aggregation (`Intern.php:97-102`).

---

## 4. Sequencing — First / Next / Then / Last

> The concrete, step-by-step version of this section is the **START HERE** checklist at the top of this document. This section explains *why* the tiers are ordered the way they are.

### 🥇 FIRST — independent, cheap, several are live bugs

Nothing here blocks anything. Clears real defects and builds momentum.

| Item | Why first |
|---|---|
| **#A** fatal 500 | `OjtCoordinator/Issues/IssueController.php:267,275` — missing `use App\Models\UserNotification;`. **Crashes every coordinator-resolved issue.** One-line fix. |
| **#B** admin reports always 0 | Frontend reads `by_status.open`/`.resolved`; backend returns `pending`/`resolve`. Reports silently under-report. |
| **#D** `checked_by` never written | `OjtInstructor/InternMonitoringController.php:99` sets only `status`. The audit columns exist, are fillable and are exposed by the resource — always null. |
| **#E** hours silently destroyed | HTE verify flips `checked`→`verified`, which **zeroes** earned hours (only `checked` counts). Unguarded reject converts a real workday into an "absent". |
| **#C** N/A denominator | Must land **before** #8 or the new grade inherits the bug. `HteEvaluationController.php:199,396`. |
| **#1** rejected → Absent | Display-only; backend math already correct. |
| **#2** reporter-only editing | S, self-contained. |
| **#5** drop duplicated HTE table | S, pure deletion. |
| **#10** scope hours by AY | Clean win now, survives the refactor, fixes N+1. |

**≈ 5 days.** Removes 6 live bugs with zero rework later.

### 🥈 NEXT — the two foundations

| Item | Why here |
|---|---|
| **#11** Enrollment (XL) | Root of 4 dependents. **Highest-risk item in the project**: `User::intern()` `HasOne`→`HasMany` touches ~10 controllers, route rebinding and every list endpoint. Requires `UNIQUE(user_id, academic_year_id)`, `RESTRICT` on the term FK, and re-scoping `requirement_submissions`. |
| **#9** Transfer flow (XL) | Second root. Also **actively wrong today** — PR #48's guards (`HteController.php:251-263`, `:309-318`) block reassigning interns *with* records, which the confirmed flow requires. The guards are a bug until this lands. |

Run as parallel tracks. **#11 first within its track**, since #13/#14/#15 all sit on it.

### 🥉 THEN — dependents, safe to parallelise

| Item | Needs |
|---|---|
| **#15 + #14** apply flow + prospectus | #11 — ship together, they are one submission |
| **#13** curriculum + drop OJT Hours | #11 — and obey constraint §3 |
| **#8** grading | #9 (placements) + #C (N/A fix) |
| **#12** evaluation gates | #9 (transfer half) + #11 (completion half) |
| **#3** concern modules | **nothing** — fully independent, can start any time |
| **#7** transfer picker | #9 (thin, 3–5 days) |

### 🏁 LAST — polish

- **#4** report annex — last, because its columns should reflect whatever `title`/`category` #3 introduces, and the underlying data must be trustworthy after #2.
- **#16** ships *with* #3.

---

## 5. Cross-cutting bug fixes (not panel-requested)

Surface independently of the revisions; several are more urgent than the features they sit beside.

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| A | **Missing import → fatal 500** on coordinator resolving an issue | `OjtCoordinator/Issues/IssueController.php:267,275` | **High** |
| B | **Admin report Open/Resolved always 0** | `admin/ReportPage.jsx:307,839,840`; `AdminReportPrintPage.jsx:406,407` vs `Admin/ReportController.php:92-95,269` | Medium |
| C | **N/A drags category averages down** — `COUNT(*)` counts N/A, sum contributes 0 | `HteEvaluationController.php:199,396,412-413`; `InternEvaluationController.php:104`; `Hte/EvaluationController.php:106` | **High** — corrupts the new grade |
| D | **`checked_by` / `checked_at` never written** | `OjtInstructor/InternMonitoringController.php:99` | Medium |
| E | **Hours can be silently destroyed** — `checked`→`verified` zeroes them; unguarded reject | `OjtInstructor/InternMonitoringController.php:66-171`; `Hte/InternMonitoringController.php:99-103` | **High** |
| F | **Re-punch resets to `pending` but keeps stale `remarks`** | `Intern/PhotoDtrController.php:110,133` | Medium |
| G | **`earnedMinutes()` unscoped + N+1**, aggregates in PHP | `Intern.php:97-102`; `OjtInstructor/InternController.php:183`, `DashboardController.php:891` | **High** at 700 interns/term |
| H | **Delete bypasses the resolve lock** in all 3 issue controllers | `OjtCoordinator/...:290`, `Hte/...:270`, `Intern/...:211` | Medium |
| I | **No notification on unassign** | `HteController.php:266` | Medium |
| J | **`issues` table has no `uuid`**, bound by numeric id | `create_issues_table.php`; `routes/api.php:114,169-170,191` | Low |
| K | **`PhotoDtrResource` omits `computedMinutes`** — frontend recomputes in 3 places, the direct cause of #1's display bug | `app/Http/Resources/Intern/PhotoDtrResource.php` | Low |
| L | **Coordinator has no DTR endpoint** despite aggregating DTR counts | `routes/api.php:94-95,198`; `DashboardController.php:403-424` | Low |
| M | **Status vocabulary drift** — `disapproved` vs `rejected` | `intern/ReportPage.jsx:270-282` | Low |
| N | **`interns.academic_year_id` is `cascadeOnDelete`** — once multi-enrollment exists, deleting a term wipes that term's DTRs, journals and evaluations | `create_interns_table.php:16-17` | **High** (rises with #11) |

---

## 6. Critical path and effort

```
#11 (XL) ──► #15+#14 (L) ──► #13 (L) ──► drop ojt_hours
   │
   └──► #10 already shipped in FIRST

#9 (XL) ──► #8 (L) ──► #12 (M)
   │
   └──► #7 (M)

#3 (L) ──► #16 (S) ──► #4 (M)
```

| Tier | Items | Effort |
|---|---|---|
| **First** | 6 bug fixes + #1, #2, #5, #10 | ~5 d |
| **Next** | #11, #9 | ~10 d |
| **Then** | #15+#14, #13, #8, #12, #3, #7 | ~18 d |
| **Last** | #4 | ~1 d |

**~5 weeks** on the critical path with the two XLs running in parallel and dedicated owners; **~7 weeks** solo.

---

## 7. Recommendation

1. **Week 1 — clear the defects.** The 6 bug fixes plus #1, #2, #5, #10. They are independent, they are live defects, and they de-risk everything downstream. Prioritise **#E** above all others: it is currently destroying intern hours, and the confirmed "rejected = absent" decision makes that failure mode more consequential, not less.
2. **Then commit to the two foundations** (#11, #9) — the only items with real architectural risk. #9 is urgent on correctness grounds because it is what makes PR #48's guards safe to remove.
3. **Everything else follows** and can be parallelised once those land.

---

## 8. Engineering notes

- **Tests are mandatory for every change** — `php artisan test --compact` (currently **328 passing**). The enrollment routes need feature tests for: apply, accept, reject + resubmit, re-enroll into a new term, and term-deletion `RESTRICT`.
- After every PHP change: `vendor/bin/pint --dirty --format agent`
- After every frontend change: `npm run build` in `frontend/`
- Route model binding changes in #11 are the easiest thing to get wrong — every intern route currently binds `{user:uuid}`, and one user will soon own several enrollment rows.
- `requirement_submissions` must be re-scoped to the enrollment before #11 ships, or re-enrolled interns cannot satisfy their requirement list at all.
