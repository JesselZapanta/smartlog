<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Requirements;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\RequirementSubmissionResource;
use App\Models\Intern;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
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

        $submissionCounts = RequirementSubmission::whereIn(
            'user_id',
            collect($interns->items())->pluck('user_id')
        )
            ->whereIn('requirement_id', $preRequirementIds->merge($postRequirementIds))
            ->get(['user_id', 'requirement_id'])
            ->groupBy('user_id')
            ->map(function ($rows) use ($preRequirementIds, $postRequirementIds): array {
                return [
                    'pre' => $rows->filter(fn ($row): bool => $preRequirementIds->contains($row->requirement_id))->count(),
                    'post' => $rows->filter(fn ($row): bool => $postRequirementIds->contains($row->requirement_id))->count(),
                ];
            });

        $rows = collect($interns->items())->map(function (Intern $intern) use ($submissionCounts, $totalPreRequirements, $totalPostRequirements): array {
            $canSeePostDeployment = in_array($intern->ojt_status, ['hours_completed', 'completed'], true);
            $counts = $submissionCounts[$intern->user_id] ?? ['pre' => 0, 'post' => 0];
            $submitted = $counts['pre'] + ($canSeePostDeployment ? $counts['post'] : 0);
            $total = $totalPreRequirements + ($canSeePostDeployment ? $totalPostRequirements : 0);

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
     * All active requirements of the intern's institute with their submissions.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $instituteId = $this->instituteId($request);
        $intern = $this->authorizeIntern($request, $user);

        $canSeePostDeployment = in_array($intern->ojt_status, ['hours_completed', 'completed'], true);

        $requirements = Requirement::where('institute_id', $instituteId)
            ->where('is_active', true)
            ->where(function (Builder $query) use ($canSeePostDeployment): void {
                $query->where('type', 'pre_deployment')
                    ->when($canSeePostDeployment, fn (Builder $query) => $query->orWhere('type', 'post_deployment'));
            })
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        $submissions = RequirementSubmission::with('reviewer')
            ->where('user_id', $intern->user_id)
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
                'submitted' => $submitted,
                'total' => $total,
                'requirements' => $rows->values()->all(),
            ],
        ]);
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

        $requirements = Requirement::where('institute_id', $instituteId)
            ->where('is_active', true)
            ->where('type', 'pre_deployment')
            ->get();

        if ($requirements->isEmpty()) {
            throw ValidationException::withMessages([
                'requirements' => ['No active pre-deployment requirements to complete.'],
            ]);
        }

        $approvedCount = RequirementSubmission::where('user_id', $user->id)
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

        $requirements = Requirement::where('institute_id', $instituteId)
            ->where('is_active', true)
            ->get();

        if ($requirements->isEmpty()) {
            throw ValidationException::withMessages([
                'requirements' => ['No active requirements to complete.'],
            ]);
        }

        $approvedCount = RequirementSubmission::where('user_id', $user->id)
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
        $this->authorizeIntern($request, $user);

        $submission = $this->findSubmission($user, $requirement);

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
        $this->authorizeIntern($request, $user);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $submission = $this->findSubmission($user, $requirement);

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
        $this->authorizeIntern($request, $user);

        $submissions = RequirementSubmission::with('requirement')
            ->where('user_id', $user->id)
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
        $this->authorizeIntern($request, $user);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $submissions = RequirementSubmission::with('requirement')
            ->where('user_id', $user->id)
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
     * Find the intern's submission for the requirement, or fail if missing.
     */
    private function findSubmission(User $user, Requirement $requirement): RequirementSubmission
    {
        $submission = RequirementSubmission::where('user_id', $user->id)
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

        $intern = $user->intern;

        if (! $intern) {
            abort(404, 'This user has no intern record.');
        }

        if ($intern->institute_id !== $instituteId || $intern->status !== 'approved') {
            abort(403, 'This intern does not belong to your institute.');
        }

        return $intern;
    }
}
