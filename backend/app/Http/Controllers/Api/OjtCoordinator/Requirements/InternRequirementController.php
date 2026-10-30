<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Requirements;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\RequirementSubmissionResource;
use App\Models\Intern;
use App\Models\InternHteAssignment;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Models\TransferRequest;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InternRequirementController extends Controller
{
    /**
     * List of approved interns of the coordinator's institute with their requirement progress.
     */
    public function interns(Request $request): JsonResponse
    {
        $instituteId = $this->instituteId($request);

        if (! $instituteId) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 10,
                    'total' => 0,
                    'from' => null,
                    'to' => null,
                ],
            ]);
        }

        $requirementsByType = Requirement::where('institute_id', $instituteId)
            ->where('is_active', true)
            ->get()
            ->groupBy('type');

        $preRequirementIds = $requirementsByType->get('pre_deployment', collect())->pluck('id');
        $postRequirementIds = $requirementsByType->get('post_deployment', collect())->pluck('id');
        $totalPreRequirements = $preRequirementIds->count();
        $totalPostRequirements = $postRequirementIds->count();

        $query = Intern::with(['user', 'institute', 'program'])
            ->where('institute_id', $instituteId)
            ->where('status', 'approved');

        $academicYearId = $request->integer('academic_year_id');

        if ($academicYearId > 0) {
            $query->where('academic_year_id', $academicYearId);
        }

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->whereHas('user', function (Builder $builder) use ($search): void {
                $builder->where('firstname', 'like', "%{$search}%")
                    ->orWhere('middlename', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'created_at'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $interns = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        // Counted per placement when one is open: a transferred intern's progress is
        // their progress at the current host, not a sum with the previous one. The
        // enrollment-scoped count remains for interns who have no host yet.
        $pageInternIds = collect($interns->items())->pluck('id');

        $placements = InternHteAssignment::query()
            ->whereIn('intern_id', $pageInternIds)
            ->whereNull('unassigned_at')
            ->get()
            ->keyBy('intern_id');

        $customizedPlacementIds = $placements
            ->filter(fn (InternHteAssignment $placement): bool => $placement->requirements_customized_at !== null)
            ->pluck('id');

        $customizedRequirements = $customizedPlacementIds->isEmpty()
            ? collect()
            : Requirement::query()
                ->join('placement_requirements', 'placement_requirements.requirement_id', '=', 'requirements.id')
                ->whereIn('placement_requirements.intern_hte_assignment_id', $customizedPlacementIds)
                ->where('requirements.is_active', true)
                ->get(['requirements.*', 'placement_requirements.intern_hte_assignment_id as placement_id'])
                ->groupBy('placement_id');

        $submissionCounts = RequirementSubmission::whereIn('placement_id', $placements->pluck('id'))
            ->get(['placement_id', 'requirement_id'])
            ->groupBy('placement_id');

        // Counted per enrollment row, not per user: a re-enrolled intern appears once per
        // term, and keying on user_id merged every term's progress into one figure.
        $enrollmentSubmissionCounts = RequirementSubmission::whereIn('intern_id', $pageInternIds)
            ->whereIn('requirement_id', $preRequirementIds->merge($postRequirementIds))
            ->get(['intern_id', 'requirement_id'])
            ->groupBy('intern_id');

        $rows = collect($interns->items())->map(function (Intern $intern) use (
            $placements,
            $customizedRequirements,
            $submissionCounts,
            $enrollmentSubmissionCounts,
            $requirementsByType,
            $preRequirementIds,
            $postRequirementIds,
            $totalPreRequirements,
            $totalPostRequirements
        ): array {
            $canSeePostDeployment = in_array($intern->ojt_status, ['hours_completed', 'completed'], true);

            $placement = $placements->get($intern->id);

            if ($placement) {
                $requirements = $placement->requirements_customized_at !== null
                    ? ($customizedRequirements->get($placement->id) ?? collect())
                    : $requirementsByType->flatten();

                $preIds = $requirements->where('type', 'pre_deployment')->pluck('id');
                $postIds = $requirements->where('type', 'post_deployment')->pluck('id');

                $counts = $submissionCounts->get($placement->id, collect());
                $submitted = $counts->whereIn('requirement_id', $preIds)->count();
                $total = $preIds->count();

                if ($canSeePostDeployment) {
                    $submitted += $counts->whereIn('requirement_id', $postIds)->count();
                    $total += $postIds->count();
                }
            } else {
                $counts = $enrollmentSubmissionCounts->get($intern->id, collect());
                $submitted = $counts->filter(fn ($row): bool => $preRequirementIds->contains($row->requirement_id))->count();
                $total = $totalPreRequirements;

                if ($canSeePostDeployment) {
                    $submitted += $counts->filter(fn ($row): bool => $postRequirementIds->contains($row->requirement_id))->count();
                    $total += $totalPostRequirements;
                }
            }

            return [
                'id' => $intern->id,
                'uuid' => $intern->user->uuid,
                'full_name' => $intern->user->full_name,
                'email' => $intern->user->email,
                'profile_picture' => $intern->user->profile_picture,
                'program' => $intern->program?->name,
                'ojt_status' => $intern->ojt_status,
                'start_date' => $intern->start_date?->toDateString(),
                'submitted' => $submitted,
                'total' => $total,
            ];
        })->values()->all();

        return response()->json([
            'data' => $rows,
            'meta' => [
                'current_page' => $interns->currentPage(),
                'last_page' => $interns->lastPage(),
                'per_page' => $interns->perPage(),
                'total' => $interns->total(),
                'from' => $interns->firstItem(),
                'to' => $interns->lastItem(),
            ],
        ]);
    }

    /**
     * All active requirements of the intern's institute with their submissions,
     * plus one entry per placement so a transferred intern's previous hosts
     * stay reviewable next to the current one.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $instituteId = $this->instituteId($request);
        $intern = $this->authorizeIntern($request, $user);

        $canSeePostDeployment = in_array($intern->ojt_status, ['hours_completed', 'completed'], true);

        // Newest first so the open placement leads. The open placement carries the
        // requirement set being reviewed; a released intern falls back to their
        // latest placement so the coordinator can still see what was submitted
        // before the release.
        $placements = $intern->hteAssignments()->with('hte')->orderByDesc('id')->get();

        // Reused so each placement can resolve its requirement set without a fresh query.
        $placements->each(fn (InternHteAssignment $assignment) => $assignment->setRelation('intern', $intern));

        $placement = $placements->first(fn (InternHteAssignment $assignment): bool => $assignment->isActive())
            ?? $placements->first();

        $current = $this->requirementPayload($intern, $placement, $instituteId, $canSeePostDeployment);

        return response()->json([
            'data' => [
                'intern' => [
                    'uuid' => $intern->user->uuid,
                    'full_name' => $intern->user->full_name,
                    'email' => $intern->user->email,
                    'profile_picture' => $intern->user->profile_picture,
                    'program' => $intern->program?->name,
                    'ojt_status' => $intern->ojt_status,
                    'start_date' => $intern->start_date?->toDateString(),
                    'end_date' => $intern->end_date?->toDateString(),
                    'earned_minutes' => $intern->earnedMinutes(),
                    'hte' => $intern->assignedHte?->name,
                ],
                'submitted' => $current['submitted'],
                'total' => $current['total'],
                'requirements' => $current['requirements'],
                'placements' => $placements
                    ->map(fn (InternHteAssignment $assignment): array => [
                        'id' => $assignment->id,
                        'hte' => $assignment->hte?->name,
                        'is_current' => $assignment->isActive(),
                        'assigned_at' => $assignment->assigned_at?->toDateString(),
                        'unassigned_at' => $assignment->unassigned_at?->toDateString(),
                        'requirements' => $this->requirementPayload($intern, $assignment, $instituteId, $canSeePostDeployment)['requirements'],
                    ])
                    ->values()
                    ->all(),
            ],
        ]);
    }

    /**
     * Requirement rows for one placement — or for the enrollment when the intern
     * has no placement yet — with the placement's own submissions.
     *
     * Scoped to the placement being reviewed: a submission belongs to the host it
     * was made at, so a previous host's file must not surface as if it satisfied
     * the current one.
     *
     * @return array{requirements: array<int, array<string, mixed>>, submitted: int, total: int}
     */
    private function requirementPayload(
        Intern $intern,
        ?InternHteAssignment $placement,
        int $instituteId,
        bool $canSeePostDeployment
    ): array {
        $requirements = $placement
            ? $placement->requirementList()
            : Requirement::where('institute_id', $instituteId)->where('is_active', true)->get();

        $requirements = $requirements
            ->filter(fn (Requirement $requirement): bool => $requirement->type === 'pre_deployment' || $canSeePostDeployment)
            ->sortBy([
                ['type', 'asc'],
                ['name', 'asc'],
            ])
            ->values();

        $submissions = RequirementSubmission::with('reviewer')
            ->where('intern_id', $intern->id)
            ->when($placement !== null, fn ($query) => $query->where('placement_id', $placement->id))
            ->whereIn('requirement_id', $requirements->pluck('id'))
            ->get()
            ->keyBy('requirement_id');

        $rows = $requirements->map(function (Requirement $requirement) use ($submissions): array {
            $submission = $submissions->get($requirement->id);

            return [
                'id' => $requirement->id,
                'name' => $requirement->name,
                'description' => $requirement->description,
                'type' => $requirement->type,
                'submission' => $submission ? new RequirementSubmissionResource($submission) : null,
            ];
        });

        $submitted = $rows
            ->filter(fn (array $row): bool => $row['type'] === 'pre_deployment' && $row['submission'] !== null)
            ->count();

        $total = $rows->filter(fn (array $row): bool => $row['type'] === 'pre_deployment')->count();

        return [
            'requirements' => $rows->values()->all(),
            'submitted' => $submitted,
            'total' => $total,
        ];
    }

    /**
     * Deploy the intern once all active pre-deployment requirements are approved.
     */
    public function deploy(Request $request, User $user): JsonResponse
    {
        $instituteId = $this->instituteId($request);

        $data = $request->validate([
            'start_date' => ['nullable', 'date'],
        ]);

        $intern = $this->authorizeIntern($request, $user);

        if (in_array($intern->ojt_status, ['ongoing', 'hours_completed', 'completed'], true)) {
            throw ValidationException::withMessages([
                'ojt_status' => ['This intern has already been deployed or completed their OJT.'],
            ]);
        }

        $placement = $intern->activePlacement();

        $requirements = $placement
            ? $placement->requirementList('pre_deployment')
            : Requirement::where('institute_id', $instituteId)
                ->where('is_active', true)
                ->where('type', 'pre_deployment')
                ->get();

        if ($requirements->isEmpty()) {
            throw ValidationException::withMessages([
                'requirements' => ['No active pre-deployment requirements to complete.'],
            ]);
        }

        // Counted against the placement (or the enrollment when the intern has no host
        // yet): the previous host's approvals do not deploy the intern at the new one.
        $approvedCount = RequirementSubmission::query()
            ->when(
                $placement !== null,
                fn ($query) => $query->where('placement_id', $placement->id),
                fn ($query) => $query->where('intern_id', $intern->id),
            )
            ->whereIn('requirement_id', $requirements->pluck('id'))
            ->where('status', 'approved')
            ->count();

        if ($approvedCount !== $requirements->count()) {
            throw ValidationException::withMessages([
                'requirements' => ['All pre-deployment requirements must be approved before deploying.'],
            ]);
        }

        $startDate = $data['start_date'] ?? now()->toDateString();

        $intern->forceFill([
            'ojt_status' => 'ongoing',
            'start_date' => $startDate,
        ])->save();

        // The placement records when the intern actually started at this host, which is
        // what a redeployment after a transfer stamps against the new host.
        if ($placement) {
            $placement->forceFill(['deployed_at' => $startDate])->save();
        }

        $hteName = $intern->assignedHte?->name;

        UserNotification::notify(
            $user,
            'intern_deployed',
            'Officially deployed',
            'You have been officially deployed'.($hteName ? " to {$hteName}" : '')." starting {$startDate}.",
            ['uuid' => $user->uuid],
        );

        return response()->json([
            'data' => [
                'message' => $intern->user->full_name.' has been deployed.',
                'ojt_status' => 'ongoing',
                'start_date' => $startDate,
            ],
        ]);
    }

    /**
     * Mark the intern as completed once all active requirements are approved.
     */
    public function markCompleted(Request $request, User $user): JsonResponse
    {
        $instituteId = $this->instituteId($request);
        $intern = $this->authorizeIntern($request, $user);

        if ($intern->ojt_status === 'completed') {
            throw ValidationException::withMessages([
                'ojt_status' => ['This intern has already been marked as completed.'],
            ]);
        }

        // An intern mid-transfer is between hosts; completing them now would
        // leave the transfer dangling, so the flow must finish first.
        $openTransfer = TransferRequest::query()
            ->where('intern_id', $intern->id)
            ->where('status', '!=', TransferRequest::STATUS_REASSIGNED)
            ->exists();

        if ($openTransfer) {
            throw ValidationException::withMessages([
                'transfer' => ['This intern has a transfer in progress. Finish the transfer before marking them as completed.'],
            ]);
        }

        $placement = $intern->activePlacement();

        $requirements = $placement
            ? $placement->requirementList()
            : Requirement::where('institute_id', $instituteId)->where('is_active', true)->get();

        if ($requirements->isEmpty()) {
            throw ValidationException::withMessages([
                'requirements' => ['No active requirements to complete.'],
            ]);
        }

        // Likewise scoped to the placement in play, so a previous host's approvals
        // cannot satisfy the gate at the new one.
        $approvedCount = RequirementSubmission::query()
            ->when(
                $placement !== null,
                fn ($query) => $query->where('placement_id', $placement->id),
                fn ($query) => $query->where('intern_id', $intern->id),
            )
            ->whereIn('requirement_id', $requirements->pluck('id'))
            ->where('status', 'approved')
            ->count();

        if ($approvedCount !== $requirements->count()) {
            throw ValidationException::withMessages([
                'requirements' => ['All requirements must be approved before marking the intern as completed.'],
            ]);
        }

        $intern->forceFill(['ojt_status' => 'completed'])->save();

        UserNotification::notify(
            $user,
            'ojt_completed',
            'OJT completed',
            'Congratulations! You have completed your OJT.',
            ['uuid' => $user->uuid],
        );

        return response()->json([
            'data' => [
                'message' => $intern->user->full_name.' has been marked as completed.',
                'ojt_status' => 'completed',
            ],
        ]);
    }

    /**
     * Approve an intern's requirement submission.
     */
    public function approve(Request $request, User $user, Requirement $requirement): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);

        $submission = $this->findSubmission($intern, $requirement);

        $submission->forceFill([
            'status' => 'approved',
            'rejection_reason' => null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        UserNotification::notify(
            $user,
            'requirement_approved',
            'Requirement approved',
            "Your {$requirement->name} submission has been approved.",
            ['requirement_id' => $requirement->id, 'uuid' => $user->uuid],
        );

        return response()->json([
            'data' => new RequirementSubmissionResource($submission->load('requirement', 'reviewer')),
        ]);
    }

    /**
     * Reject an intern's requirement submission with a reason.
     */
    public function reject(Request $request, User $user, Requirement $requirement): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $submission = $this->findSubmission($intern, $requirement);

        $submission->forceFill([
            'status' => 'rejected',
            'rejection_reason' => $data['reason'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        UserNotification::notify(
            $user,
            'requirement_rejected',
            'Requirement rejected',
            "Your {$requirement->name} submission was rejected. Reason: {$data['reason']}",
            ['requirement_id' => $requirement->id, 'uuid' => $user->uuid],
        );

        return response()->json([
            'data' => new RequirementSubmissionResource($submission->load('requirement', 'reviewer')),
        ]);
    }

    /**
     * Approve all pending submissions of the intern's requirements.
     */
    public function approveAll(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);

        // The open placement only: approving "all" must never reach back into a
        // previous host's still-pending submissions.
        $placement = $intern->activePlacement();

        $submissions = RequirementSubmission::with('requirement')
            ->where('intern_id', $intern->id)
            ->when($placement !== null, fn ($query) => $query->where('placement_id', $placement->id))
            ->where('status', 'pending')
            ->get();

        $reviewerId = $request->user()->id;
        $count = 0;

        foreach ($submissions as $submission) {
            $submission->forceFill([
                'status' => 'approved',
                'rejection_reason' => null,
                'reviewed_by' => $reviewerId,
                'reviewed_at' => now(),
            ])->save();

            UserNotification::notify(
                $user,
                'requirement_approved',
                'Requirement approved',
                "Your {$submission->requirement->name} submission has been approved.",
                ['requirement_id' => $submission->requirement_id, 'uuid' => $user->uuid],
            );

            $count++;
        }

        return response()->json([
            'data' => [
                'message' => "{$count} requirement(s) approved.",
                'count' => $count,
            ],
        ]);
    }

    /**
     * Reject all pending submissions of the intern's requirements with a reason.
     */
    public function rejectAll(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        // The open placement only, for the same reason as approveAll.
        $placement = $intern->activePlacement();

        $submissions = RequirementSubmission::with('requirement')
            ->where('intern_id', $intern->id)
            ->when($placement !== null, fn ($query) => $query->where('placement_id', $placement->id))
            ->where('status', 'pending')
            ->get();

        $reviewerId = $request->user()->id;
        $count = 0;

        foreach ($submissions as $submission) {
            $submission->forceFill([
                'status' => 'rejected',
                'rejection_reason' => $data['reason'],
                'reviewed_by' => $reviewerId,
                'reviewed_at' => now(),
            ])->save();

            UserNotification::notify(
                $user,
                'requirement_rejected',
                'Requirement rejected',
                "Your {$submission->requirement->name} submission was rejected. Reason: {$data['reason']}",
                ['requirement_id' => $submission->requirement_id, 'uuid' => $user->uuid],
            );

            $count++;
        }

        return response()->json([
            'data' => [
                'message' => "{$count} requirement(s) rejected.",
                'count' => $count,
            ],
        ]);
    }

    /**
     * Find the submission for this term's enrollment, or fail if missing.
     *
     * Takes the `Intern` rather than the `User`: the submission belongs to one
     * enrollment, so a re-enrolled intern's earlier term must not be reviewable from
     * the current one.
     */
    private function findSubmission(Intern $intern, Requirement $requirement): RequirementSubmission
    {
        $placement = $intern->activePlacement();

        $submission = RequirementSubmission::where('intern_id', $intern->id)
            ->when($placement !== null, fn ($query) => $query->where('placement_id', $placement->id))
            ->where('requirement_id', $requirement->id)
            ->first();

        if (! $submission) {
            throw ValidationException::withMessages([
                'submission' => ['This intern has not submitted this requirement yet.'],
            ]);
        }

        return $submission;
    }

    /**
     * The coordinator's institute id, or null if unassigned.
     */
    private function instituteId(Request $request): ?int
    {
        return $request->user()->coordinator?->institute_id;
    }

    /**
     * Ensure the intern is approved and belongs to the coordinator's institute.
     */
    private function authorizeIntern(Request $request, User $user): Intern
    {
        $instituteId = $this->instituteId($request);

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        $intern = $user->enrollmentFor($request->integer('academic_year_id') ?: null);

        if (! $intern) {
            abort(404, 'This user has no intern record.');
        }

        if ($intern->institute_id !== $instituteId || $intern->status !== 'approved') {
            abort(403, 'This intern does not belong to your institute.');
        }

        return $intern;
    }
}
