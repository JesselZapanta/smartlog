# SMARTLOG — HTE Transfer Flow: Implementation Plan

**Date:** 2026-10-16
**Status:** Plan only — no code changed yet
**Scope:** Instructor-initiated intern transfer between HTEs (§#6 + #7 + #9 of `PANEL-REVISIONS.md`), with per-placement requirements, per-placement evaluations, and hours continuation within the term.
**Companion docs:** `PANEL-REVISIONS.md` (#6, #7, #8, #9, #10, #12), `REVISION-ROADMAP.md`, `AGENTS.md`

---

## 1. Locked decisions (confirmed by project owner)

| # | Decision | Answer |
|---|----------|--------|
| 1 | Transfer scope | **Only within the same term/enrollment** (`interns` row). A new semester is a new enrollment, not a transfer. |
| 2 | During transfer (after reassign, before new deploy) | **Intern cannot punch DTR or write journals** until deployed to the new HTE. |
| 3 | A → B → A | Supported. The intern **re-evaluates** the HTE again for the new placement (rare but expressible). |
| 4 | Requirements for the new placement | **A different (fresh) set** — the new placement starts with zero submissions and must complete its own submit → approve cycle. |
| 5 | Evaluation split | **Equal weight per placement** (2 placements = 50/50, N = equal shares). Handles multiple re-assignments. |
| 6 | Cancel | **No cancel action.** `requested → accepted → evaluated → reassigned` only. (Deviation from `PANEL-REVISIONS.md` §9, which allowed a coordinator cancel — superseded by owner.) |

Deviations from the panel doc are intentional and listed in §11.

---

## 2. The flow

```
INSTRUCTOR            HTE-A (outgoing)         INTERN                 COORDINATOR
──────────            ────────────────         ──────                 ───────────
creates request ────► inbox: requested
                      accepts (only action)
                      │ evaluates intern
                      │ for closing            evaluates HTE-A
                      │ placement              for closing placement
                      ▼                        │
                   (wait) ◄────────────────────┘
                              both complete
                                   │
                              status = evaluated
                                                          ┌─────────────────────┐
                                                          │ REASSIGN (gated on  │
                                                          │ both evaluations)   │
                                                          │ picks HTE-B         │
                                                          └─────────┬───────────┘
                                                                    ▼
                            placement A closed, placement B opened, assigned_hte = B
                            ojt_status = pending  (DTR + journal blocked)
                                                                    │
                                              intern submits FRESH requirements
                                              coordinator approves
                                              coordinator deploys at HTE-B
                                                                    ▼
                                              ojt_status = ongoing — hours CONTINUE
                                              (same interns row, same DTR pool)
```

### State machine

```
requested ──► accepted ──► evaluated ──► reassigned
   │             │             │
   │             │             └── both directions complete → committed
   │             └── HTE accepted; both may now evaluate the closing placement
   └── instructor created it
```

- **No cancel path** (decision 6).
- **No reject** by HTE — accept is the only action (`PANEL-REVISIONS.md` §9).
- **No deadline** — an unresponsive HTE/intern leaves the request open; resolution is offline.

---

## 3. Domain model

### 3.1 New table: `intern_hte_assignments` (placements)

One row per HTE placement of an intern. `interns.assigned_hte` stays as a **denormalised pointer to the active placement** so all existing queries keep working.

| Column | Type | Notes |
|---|---|---|
| id | PK | |
| intern_id | FK → interns, cascade | the term enrollment row |
| hte_id | FK → htes, restrict | |
| academic_year_id | FK → academic_terms, restrict | denormalised from the intern row |
| assigned_at | timestamp | when the placement was created |
| assigned_by | FK → users, nullable | coordinator (or backfill) |
| unassigned_at | timestamp, nullable | null while the placement is open |
| unassigned_by | FK → users, nullable | |
| transfer_request_id | FK → transfer_requests, nullable | which transfer opened this placement |
| deployed_at | timestamp, nullable | set by `deploy()` for this placement |
| timestamps | | |

- **Active placement** = `unassigned_at IS NULL`. Exactly one active row per intern, enforced in application code inside transactions (MySQL has no partial unique index; a generated-column unique would break the SQLite test suite — do not use).
- Index: `(intern_id, unassigned_at)`, `(hte_id)`, `(academic_year_id)`.

### 3.2 New table: `transfer_requests`

| Column | Type | Notes |
|---|---|---|
| id | PK | |
| uuid | string, unique | public route binding |
| intern_id | FK → interns, cascade | |
| academic_year_id | FK → academic_terms, restrict | denormalised for querying |
| from_hte_id | FK → htes, restrict | the HTE being left |
| to_hte_id | FK → htes, nullable | chosen by the coordinator at reassign |
| from_placement_id | FK → intern_hte_assignments | the closing placement |
| to_placement_id | FK → intern_hte_assignments, nullable | the opened placement |
| requested_by | FK → users | the instructor |
| reason | text | required, min length |
| status | enum(`requested`,`accepted`,`evaluated`,`reassigned`) default `requested`, index | |
| accepted_at | timestamp, nullable | |
| evaluated_at | timestamp, nullable | set automatically when both directions complete |
| reassigned_at | timestamp, nullable | |
| reassigned_by | FK → users, nullable | coordinator |
| timestamps | | |

- **One open request per intern** (status ≠ `reassigned`) — enforced in app code + test.

### 3.3 Modified tables

| Table | Change | Backfill |
|---|---|---|
| `requirement_submissions` | add `placement_id` FK → intern_hte_assignments (nullable), drop unique `(intern_id, requirement_id)`, add unique `(placement_id, requirement_id)` | map each row to the intern's active/backfilled placement; unmappable rows keep `placement_id = null` (legacy, ignored by gates) |
| `intern_evaluations` | add `placement_id` FK (nullable), drop unique `(intern_id, hte_id, criterion_id)`, add unique `(placement_id, criterion_id)` | map by `(intern_id, hte_id)` to the matching placement |
| `hte_evaluations` | same as above | same |
| `interns` | **no schema change** — `assigned_hte` remains the active-placement pointer | — |

**Why nullable `placement_id` on legacy rows:** MySQL unique indexes allow multiple NULLs, so historical rows that cannot be mapped do not collide and are excluded from new gates.

---

## 4. Endpoints

All new routes in `backend/routes/api.php`, inside the existing `auth:api` + `role:` groups, following the current naming convention.

### 4.1 Instructor (`role:ojt_instructor`)

| Method | Path | Purpose | Gates |
|---|---|---|---|
| GET | `/instructor/transfer-requests` | Own requests (list, filters: status, search) | requested_by = self |
| POST | `/instructor/transfer-requests` | Create request | intern in instructor's institute (`coordinator->institute_id` scope, same as `OjtInstructor\InternController::index`), intern status ∈ {ongoing, hours_completed}, has active placement, no open request, reason required |

### 4.2 HTE (`role:hte`)

| Method | Path | Purpose | Gates |
|---|---|---|---|
| GET | `/hte/transfer-requests` | Inbox: incoming requests where `from_hte_id` = own HTE | plus open (accepted) ones awaiting evaluation |
| POST | `/hte/transfer-requests/{transferRequest:uuid}/accept` | Accept (only transition out of `requested`) | from_hte = self, status = requested |

The **evaluate** action reuses the existing evaluation form — no new evaluate endpoint (see §6.2).

### 4.3 Intern (`role:intern`)

| Method | Path | Purpose | Gates |
|---|---|---|---|
| GET | `/intern/transfer-request` | The intern's open transfer request + evaluation progress (drives the evaluation prompt) | own active enrollment |
| (existing) | `GET/POST /intern/evaluations` | **Modified**: unlocked when `ojt_status ∈ {hours_completed, completed}` **or** an `accepted` transfer exists for the active placement; targets the closing placement | see §6.2 |

### 4.4 Coordinator (`role:ojt_coordinator`)

| Method | Path | Purpose | Gates |
|---|---|---|---|
| GET | `/coordinator/transfer-requests` | Queue (filters: status, search, academic_year_id) | own institute |
| GET | `/coordinator/transfer-requests/{transferRequest:uuid}` | Detail incl. both evaluation progress blocks | own institute |
| POST | `/coordinator/transfer-requests/{transferRequest:uuid}/reassign` | **The reassign action.** Body: `to_hte_id` | status = evaluated; both directions complete for the closing placement; to_hte: same institute, status active, ≠ from_hte; transaction see §7 |

The HTE picker reuses `GET /coordinator/htes` (paginated, searchable, institute-scoped). Program mismatch between HTE-A and HTE-B is surfaced as a **warning flag** in the detail payload, not a block (`PANEL-REVISIONS.md` §7).

---

## 5. Controller & service work

### 5.1 New controllers / models / requests

| File | Content |
|---|---|
| `app/Models/InternHteAssignment.php` | fillable, casts, relations (intern, hte, transferRequest), `scopeActive()` |
| `app/Models/TransferRequest.php` | fillable, uuid on create, relations, status helpers (`hasBothEvaluations()` via score service) |
| `app/Http/Controllers/Api/OjtInstructor/TransferRequestController.php` | `index`, `store` |
| `app/Http/Controllers/Api/Hte/TransferRequestController.php` | `index`, `accept` |
| `app/Http/Controllers/Api/Intern/TransferRequestController.php` | `show` (current) |
| `app/Http/Controllers/Api/OjtCoordinator/Transfers/TransferRequestController.php` | `index`, `show`, `reassign` |
| `app/Http/Requests/.../StoreTransferRequestRequest.php`, `ReassignTransferRequestRequest.php` | validation |
| `app/Http/Resources/.../TransferRequestResource.php`, `TransferRequestDetailResource.php` | envelope `{ data: ... }`, `meta` on lists |
| `app/Support/PlacementEvaluationScore.php` | resolves a placement's evaluation state (answered/total per direction, `complete` flag), per-category + weighted averages **with the N/A denominator fixed** (N/A excluded, not counted as 0), and the **equal-weight blended score across placements** (§9.2). Single home replacing the four hardcoded 30/30/40 blocks. |

### 5.2 Modified controllers

| File | Change |
|---|---|
| `Api/OjtCoordinator/Htes/HteController.php` | `assign()` opens a placement row (transaction); `unassign()` closes the active placement instead of only nulling (still keeps PR #48 guards for this normal path); both write `assigned_by`/`unassigned_by`. `unassign` also gains a notification (`PANEL-REVISIONS.md` finding I — optional, small). |
| `Api/Hte/EvaluationController.php` | Resolve the **target placement**: active placement normally; the transfer's `from_placement_id` when an open request exists and the evaluated pair must land on the closing placement. Store with `placement_id`; write-once check becomes per placement; `index` progress counts per placement. |
| `Api/Intern/EvaluationController.php` | Gate widened: `hours_completed`/`completed` **or** accepted transfer; target = closing placement (the outgoing HTE); store with `placement_id`; per-placement write-once. |
| `Api/Intern/RequirementController.php` | All submission reads/writes scoped by **active placement id** instead of `intern_id`; `index()` returns the active placement's submissions only. |
| `Api/OjtCoordinator/Requirements/InternRequirementController.php` | `show()`/`deploy()`/`approveAll()`/`rejectAll()`/`markCompleted()` scope to the active placement's submissions. `deploy()` also stamps `deployed_at` on the placement and **does not overwrite an existing `interns.start_date`** (term start preserved; flagged §11). Add guard: block `markCompleted()` while an open transfer exists. |
| `Api/OjtCoordinator/OjtEnrollmentController.php` | No change (approval creates the intern row with `assigned_hte = null`; placement created later at assign). |
| `Api/DashboardController.php`, `OjtInstructor`/`OjtCoordinator`/`Hte`/`Admin` report controllers | Minimal: expose placement/evaluation-blended fields where evaluation averages are already shown (§9.2, phase 5). |

---

## 6. Behavior details

### 6.1 Status transitions on the intern row

| Moment | `ojt_status` | `assigned_hte` |
|---|---|---|
| Assign (normal) | pending | HTE-A |
| Deploy | ongoing | HTE-A |
| Transfer request created/accepted/evaluated | **unchanged** (still ongoing at HTE-A; they still work there) | HTE-A |
| **Reassign** | **pending** (blocks DTR punch + journal write — decision 2) | **HTE-B** |
| Coordinator deploys at HTE-B | ongoing | HTE-B |
| Hours complete | hours_completed | HTE-B |
| Mark completed | completed | HTE-B |

`earnedMinutes()` needs **no change** — DTRs key on `intern_id`, so hours accrued at A count toward B automatically (decision 1: same row, same term).

### 6.2 Evaluation rules

- **HTE → intern:** the HTE form/endpoint targets the placement being evaluated. During an open transfer, that is `from_placement_id` (placement A). The existing "HTE may evaluate an `ongoing` intern" rule already covers this — no gate loosening needed on this side.
- **Intern → HTE:** gate becomes `ojt_status ∈ {hours_completed, completed}` **OR** the intern's open transfer is `accepted`; target = `from_placement_id`'s HTE. This is the one gate that must be relaxed for the transfer flow.
- **Write-once** is per placement: `(placement_id, criterion_id)` unique. A→B→A gets a fresh evaluation round on the second A placement (decision 3).
- **`accepted → evaluated`** is set automatically (idempotently) by whichever store lands second, when both directions have every active criterion answered or N/A for the closing placement. `no_criteria` (0 active criteria configured) counts as complete — otherwise an institute with no criteria could never transfer. Flagged in §11.

### 6.3 Requirements

- Submissions are **per placement**: after reassign, the intern's requirements page shows a **fresh, empty set** for placement B (decision 4); old submissions stay on placement A and are visible only as history in the coordinator detail.
- `deploy()` at HTE-B requires **placement B's** pre-deployment set fully approved — same code path as today, different scope key.
- `markCompleted()` requires **placement B's** full set (pre + post). Old placements' sets were enforced at their own deploy time.
- The intern's `submit()` upsert key becomes `(placement_id, requirement_id)`.

### 6.4 Notifications

| Transition | Type | Recipients |
|---|---|---|
| Request created | `transfer_requested` | from-HTE, coordinator |
| Accepted | `transfer_accepted` | instructor, intern |
| Both evaluations complete | `transfer_evaluated` | coordinator (action: reassign), instructor |
| Reassigned | `transfer_reassigned` | intern, from-HTE, to-HTE, instructor |
| Re-deployed | existing `intern_deployed` | intern |
| Fresh requirements cycle | existing `requirement_submitted` etc. | coordinators |

Frontend mappings added in `frontend/src/lib/notifications.js` (icon + route) for the four new types.

---

## 7. Reassign transaction (the critical write)

`POST /coordinator/transfer-requests/{uuid}/reassign`, all inside `DB::transaction()`:

1. Lock the transfer row; verify status = `evaluated` and both directions complete (score service) for `from_placement_id`.
2. Validate `to_hte_id`: same institute, `status = active`, ≠ `from_hte_id`.
3. Close placement A: `unassigned_at = now`, `unassigned_by = coordinator`.
4. Open placement B: `intern_id`, `hte_id = to`, `academic_year_id`, `assigned_at = now`, `assigned_by = coordinator`, `transfer_request_id`.
5. Update intern row: `assigned_hte = to_hte_id`, `ojt_status = 'pending'`.
6. Update transfer: `status = reassigned`, `to_hte_id`, `to_placement_id`, `reassigned_at`, `reassigned_by`.
7. Notify (after commit): intern, from-HTE, to-HTE, instructor.

Idempotency/race protection: step 1 re-checks inside the transaction; a second reassign attempt gets a 422.

---

## 8. Migrations & backfill

Order (all in `backend/database/migrations/`):

1. `create_intern_hte_assignments_table`
2. `create_transfer_requests_table`
3. `backfill_intern_hte_assignments` — one placement per existing assigned intern: `hte_id = interns.assigned_hte`, `assigned_at` from the latest `hte_assigned` notification for that user when available (else `interns.updated_at`), left active. Additionally, any `(intern_id, hte_id)` pair present in evaluation tables with no matching placement gets a placement (covers the released-inherited rows from `2026_10_10_191500`).
4. `add_placement_id_to_requirement_submissions` — add column, backfill from the intern's active placement, swap unique `(intern_id, requirement_id)` → `(placement_id, requirement_id)`.
5. `add_placement_id_to_evaluations` — both tables: add column, backfill by `(intern_id, hte_id)`, swap uniques to `(placement_id, criterion_id)`.

`down()` for 3–5 truncates the added columns (documented as lossy, consistent with `2026_10_10_191500`).

**Verification after migrate:** every intern with `assigned_hte` has exactly one active placement; every submission/evaluation maps to a placement (or is an accounted-for legacy null); `php artisan test --compact`.

---

## 9. Scoring (decision 5)

### 9.1 N/A fix (prerequisite, `PANEL-REVISIONS.md` finding C)

The existing averages divide by `COUNT(*)` while N/A contributes 0 — N/A drags scores down. Fix inside `PlacementEvaluationScore`: denominator = non-N/A answered rows. Decision: **N/A is excluded** (matches the report endpoints, which already exclude it).

### 9.2 Blended score across placements

```
score(placement) = 30% personal + 30% work + 40% job_knowledge   (per direction, N/A excluded)
blended          = Σ score(P) / count(P)   over all placements with a completed HTE→intern set
```

- 1 placement → 100% of that placement; 2 → 50/50; N → equal shares (decision 5).
- `hte_evaluations` (intern→HTE) is **feedback per placement, not part of the blended grade** — reading (a) of `PANEL-REVISIONS.md` §8's residual question. Flagged in §11.
- Surfaced at: coordinator intern-evaluation detail + print, instructor evaluation detail, reports' evaluation rows, and the intern dashboard progress card (optional phase). The four duplicated 30/30/40 blocks are deleted and replaced by the service.

---

## 10. Frontend

Mobile-first rules apply to every new screen (base ~375px, `sm:`/`md:`/`lg:` enhancement, ≥44px targets, cards instead of tables on small screens).

### 10.1 New pages & routes (`frontend/src/App.jsx`, wrapped in `ProtectedRoute`)

| Route | Role | Page |
|---|---|---|
| `/instructor/transfer-requests` | ojt_instructor | List + "New request" dialog (intern picker scoped to their institute, reason field). Status chips, search. |
| `/hte/transfer-requests` | hte | Inbox: pending requests with **Accept** (single action) + "Evaluate intern" button (links to the existing evaluation form); section for accepted requests awaiting evaluations with per-direction progress. |
| `/coordinator/transfer-requests` | ojt_coordinator | Queue with status filter; detail sheet; **Reassign** dialog (HTE picker, program-mismatch warning) enabled only at `evaluated`; shows both evaluation progress blocks. |

### 10.2 Navigation

- `InstructorLayout.jsx` — add "Transfer Requests" (lucide `ArrowLeftRight`).
- `HteLayout.jsx` — add "Transfer Requests".
- `CoordinatorLayout.jsx` — add "Transfers".
- `InternLayout.jsx` — no new entry (evaluation prompt lives on the existing `/intern/evaluations` page + notification).

### 10.3 Modified pages

| File | Change |
|---|---|
| `pages/intern/evaluations/InternEvaluateHtePage.jsx` | Unlock via transfer; banner "Transfer in progress — evaluate {HTE} for the closing placement"; targets the closing placement; read-only after submit (existing behavior). |
| `pages/hte/evaluations/HteEvaluateInternListPage.jsx` + form | Show transfer-context badge for interns with an open transfer; form targets the closing placement (backend-resolved). |
| `pages/intern/requirements` (requirements page) | No structural change — fresh set appears after reassign via placement scoping (verify empty state copy). |
| `pages/intern/InternDashboard.jsx` | Transfer state banner (requested/accepted/evaluated) + "awaiting deployment at {HTE-B}" state after reassign (the existing `NotDeployedCard` pattern). |
| Coordinator/instructor evaluation detail + print pages | Group responses **per placement** when the intern has more than one, plus the blended score (§9.2). |
| `lib/notifications.js` | Four new type mappings. |

---

## 11. Assumptions, deviations, open items

| # | Item |
|---|------|
| 1 | **No cancel** (owner decision 6) — deviates from `PANEL-REVISIONS.md` §9, which had a coordinator cancel. A stale/erroneous request cannot be withdrawn in-system; it blocks further transfer requests for that intern until reassigned. |
| 2 | **"Different set of requirements"** is implemented as a fresh submission cycle per placement (same institute requirement definitions, empty submission set, new approve cycle). If it means *different requirement definitions per placement*, that is a larger change — requirements are institute-scoped today. |
| 3 | **`start_date` on re-deploy:** proposed to keep the term's first `start_date`; the per-placement date lives on `intern_hte_assignments.deployed_at`. Confirm. |
| 4 | **Transfer allowed while `hours_completed`:** request creation allows {ongoing, hours_completed}; re-deploy returns the intern to `ongoing` at the new HTE. Confirm this is wanted. |
| 5 | **Blended grade = HTE→intern direction only** (reading (a)); intern→HTE stays feedback. The panel's residual question remains open. |
| 6 | **`no_criteria` placements count as evaluation-complete** for the reassign gate (otherwise zero-criteria institutes could never transfer). |
| 7 | **Transfer requests are not term-agnostic:** a request lives on the intern's term row; cross-semester moves remain re-enrollment, not transfer (decision 1). |
| 8 | The **completion-side evaluation gate** (`PANEL-REVISIONS.md` §12: both ratings required before a term is completed) is **out of scope** for this build; the evaluation service from §9 makes it a small follow-up. |
| 9 | Instructor scoping uses `user->coordinator->institute_id` (the existing pattern in `OjtInstructor\InternController::index` — instructors hold a `Coordinator` row). |

---

## 12. Test plan (mandatory, `PANEL-REVISIONS.md` §8)

New feature tests:

| Test file | Covers |
|---|---|
| `InstructorTransferRequestTest.php` | create (validates institute scope, status, open-request conflict, reason), list scoping, role guard |
| `HteTransferRequestTest.php` | inbox scoping (`from_hte` only), accept once, other HTE 404, cannot accept reassigned |
| `TransferEvaluationGateTest.php` | HTE eval lands on closing placement; intern eval unlocked by accepted transfer; `evaluated` auto-transition when both complete; per-placement write-once; A→B→A gets a second A round |
| `TransferReassignTest.php` | gated on `evaluated`; transaction closes A/opens B; `assigned_hte`/`ojt_status` values; to-HTE validation (institute, active, ≠ from); second reassign 422; multiple sequential transfers; notifications |
| `TransferRedeployTest.php` | DTR punch + journal blocked in interregnum; fresh requirement set per placement; deploy blocked until placement B's set approved; deploy succeeds; `deployed_at` stamped; `start_date` preserved; hours accrue across placements; `completeHours` threshold uses combined hours |
| `PlacementScoringTest.php` | N/A excluded from averages; equal-weight blend for 2 and 3 placements |

Updated tests (all currently green at 509 passing): `HteController` assign/unassign bookkeeping, requirement submission scoping, evaluation store/read scoping, `TermIsolationTest` (placement isolation), coordinator requirement deploy/mark-completed flows.

Gate commands: `vendor/bin/pint --dirty --format agent`, `php artisan test --compact`, `npm run build`, `npx oxlint`.

---

## 13. Delivery phases

| Phase | Work | Size |
|---|---|---|
| **1. Placement backbone** | `intern_hte_assignments` + model + backfill; wire `assign()`/`unassign()`; tests | L |
| **2. Requirements per placement** | column + backfill + unique swap; scope all intern/coordinator requirement queries; deploy/markCompleted gates; tests | M–L |
| **3. Evaluations per placement** | column + backfill + unique swap on both tables; HTE + intern controller placement resolution; intern gate relaxation; `PlacementEvaluationScore` (incl. N/A fix); tests | L |
| **4. Transfer flow backend** | `transfer_requests` + models/requests/resources; instructor create/list; HTE inbox/accept; coordinator list/detail/reassign transaction; status lifecycle; notifications; tests | XL |
| **5. Frontend** | 3 new pages + nav; intern eval unlock + banners; per-placement grouping + blended score displays | L |
| **6. Polish** | notification mappings, reports surfaces, docs in `SMARTLOG-SYSTEM.md` | S |

**Estimate:** ~7–10 dev days solo. Phases 1–3 are independently shippable and green the whole suite at each step; phase 4 flips the feature on; phase 5 makes it usable.

**Recommended landing order:** 1 → 2 → 3 → 4 → 5 → 6, each with its own audit entry, tests green before moving on. Phases 1–3 are safe to ship without user-visible changes (no behavior change until phase 4's endpoints exist).
