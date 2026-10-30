<?php

namespace App\Http\Controllers\Api\Intern;

use App\Http\Controllers\Controller;
use App\Http\Requests\Intern\SubmitRequirementRequest;
use App\Http\Resources\Intern\RequirementSubmissionResource;
use App\Models\Intern;
use App\Models\InternHteAssignment;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class RequirementController extends Controller
{
    /**
     * All active requirements of the intern's institute, with their submission status,
     * plus a read-only record of every previous placement (host) after a transfer.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $intern = $user->activeEnrollment();

        if (! $intern || $intern->status !== 'approved') {
            return response()->json([
                'data' => [],
                'hte' => null,
                'previous_placements' => [],
            ]);
        }

        $hte = $intern->assignedHte()->with(['user', 'program', 'institute'])->first();

        if (! $hte) {
            return response()->json([
                'data' => [],
                'hte' => null,
                'previous_placements' => [],
            ]);
        }

        $hteInfo = [
            'id' => $hte->id,
            'name' => $hte->name,
            'contact_person' => $hte->user->full_name,
            'email' => $hte->user->email,
            'program' => $hte->program?->name,
            'institute' => $hte->institute?->name,
            'status' => $hte->status,
            'start_at' => $hte->start_at,
            'end_at' => $hte->end_at,
        ];

        $instituteId = $intern->institute_id;

        $canSeePostDeployment = in_array($intern->ojt_status, ['hours_completed', 'completed'], true);

        $placement = $intern->activePlacement();

        $requirements = $this->visibleRequirements($intern, $placement, $canSeePostDeployment);

        // Scoped to the intern's open placement, not to the enrollment. A transferred
        // intern holds one placement per host, and keying on the enrollment would
        // surface — and later overwrite — the previous host's submissions.
        $submissions = RequirementSubmission::query()
            ->when(
                $placement !== null,
                fn ($query) => $query->where('placement_id', $placement->id),
                fn ($query) => $query->where('intern_id', $intern->id),
            )
            ->whereIn('requirement_id', $requirements->pluck('id'))
            ->get()
            ->keyBy('requirement_id');

        $rows = $this->requirementRows($requirements, $submissions);

        // Every closed placement stays on the page after a transfer: the previous
        // hosts' requirement sets and whatever was submitted there, read-only.
        $previousPlacements = $intern->hteAssignments()
            ->with('hte')
            ->whereNotNull('unassigned_at')
            ->orderByDesc('id')
            ->get()
            ->map(function (InternHteAssignment $past) use ($intern, $canSeePostDeployment): array {
                $pastRequirements = $this->visibleRequirements($intern, $past, $canSeePostDeployment);

                $pastSubmissions = RequirementSubmission::query()
                    ->where('placement_id', $past->id)
                    ->whereIn('requirement_id', $pastRequirements->pluck('id'))
                    ->get()
                    ->keyBy('requirement_id');

                return [
                    'id' => $past->id,
                    'hte' => $past->hte ? [
                        'id' => $past->hte->id,
                        'name' => $past->hte->name,
                        'status' => $past->hte->status,
                    ] : null,
                    'assigned_at' => $past->assigned_at,
                    'unassigned_at' => $past->unassigned_at,
                    'requirements' => $this->requirementRows($pastRequirements, $pastSubmissions),
                ];
            })
            ->values();

        return response()->json([
            'data' => $rows,
            'hte' => $hteInfo,
            'previous_placements' => $previousPlacements,
        ]);
    }

    /**
     * Upload (or replace) the PDF submission for a requirement of the intern's institute.
     */
    public function submit(SubmitRequirementRequest $request, Requirement $requirement): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $intern = $this->currentEnrollment($request);
        $placement = $this->currentPlacement($intern);

        $this->authorizeRequirement($requirement, $intern, $placement);

        // Keyed on the placement, so a transferred intern starts a blank cycle at the
        // new host while the previous host keeps its record on its own placement.
        $submission = RequirementSubmission::firstOrNew([
            'placement_id' => $placement->id,
            'requirement_id' => $requirement->id,
        ]);

        $wasResubmit = $submission->exists;

        if ($submission->exists && $submission->file_path) {
            Storage::disk('public')->delete($submission->file_path);
        }

        $submission->file_path = $request->file('file')->store('requirement-submissions', 'public');
        $submission->intern_id = $intern->id;
        $submission->user_id = $user->id;
        $submission->status = 'pending';
        $submission->rejection_reason = null;
        $submission->reviewed_by = null;
        $submission->reviewed_at = null;
        $submission->save();

        UserNotification::notifyCoordinators(
            (int) $requirement->institute_id,
            'requirement_submitted',
            $wasResubmit ? 'Requirement resubmitted' : 'Requirement submitted',
            "{$user->full_name} submitted their {$requirement->name} for review.",
            ['requirement_id' => $requirement->id, 'uuid' => $user->uuid],
        );

        return response()->json([
            'data' => new RequirementSubmissionResource($submission->load('requirement', 'reviewer')),
        ]);
    }

    /**
     * Remove the intern's submission for a requirement.
     */
    public function destroy(Request $request, Requirement $requirement): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $intern = $this->currentEnrollment($request);
        $placement = $this->currentPlacement($intern);

        $this->authorizeRequirement($requirement, $intern, $placement);

        // Only ever this host's row: removing a submission must never take out the
        // record the placement at a previous host is keeping.
        $submission = RequirementSubmission::where('placement_id', $placement->id)
            ->where('requirement_id', $requirement->id)
            ->first();

        if ($submission) {
            Storage::disk('public')->delete($submission->file_path);
            $submission->delete();
        }

        return response()->json([
            'data' => ['message' => 'Submission removed successfully.'],
        ]);
    }

    /**
     * The enrollment the intern is currently working in.
     *
     * Every requirement action is scoped to this row rather than to the user, which is
     * what keeps a re-enrolled intern's terms separate. The host lives on this same
     * row (`assigned_hte`); the placement resolved from it scopes the work to the host
     * currently being served.
     */
    private function currentEnrollment(Request $request): Intern
    {
        /** @var User $user */
        $user = $request->user();
        $intern = $user->activeEnrollment();

        if (! $intern) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        if ($intern->status !== 'approved') {
            abort(403, 'Your registration must be approved before submitting requirements.');
        }

        if ($intern->assigned_hte === null) {
            abort(403, 'You must be assigned to an HTE before submitting requirements.');
        }

        return $intern;
    }

    /**
     * The intern's open placement — the host the requirements belong to.
     */
    private function currentPlacement(Intern $intern): InternHteAssignment
    {
        $placement = $intern->activePlacement();

        if (! $placement) {
            abort(403, 'You must be assigned to an HTE before submitting requirements.');
        }

        return $placement;
    }

    /**
     * @param  Collection<int, Requirement>  $requirements
     * @param  Collection<int, RequirementSubmission>  $submissions
     * @return Collection<int, array<string, mixed>>
     */
    private function requirementRows(Collection $requirements, Collection $submissions): Collection
    {
        return $requirements->map(function (Requirement $requirement) use ($submissions): array {
            $submission = $submissions->get($requirement->id);

            return [
                'id' => $requirement->id,
                'name' => $requirement->name,
                'description' => $requirement->description,
                'type' => $requirement->type,
                'submission' => $submission ? new RequirementSubmissionResource($submission) : null,
            ];
        })->values();
    }

    /**
     * Requirements an intern may see: the placement's set (its customised selection
     * when one exists, otherwise the institute's active list), minus post-deployment
     * requirements until the intern reaches hours completed.
     */
    private function visibleRequirements(Intern $intern, ?InternHteAssignment $placement, bool $canSeePostDeployment): Collection
    {
        $requirements = $placement
            ? $placement->requirementList()
            : Requirement::where('institute_id', $intern->institute_id)->where('is_active', true)->get();

        return $requirements
            ->filter(fn (Requirement $requirement): bool => $requirement->type === 'pre_deployment' || $canSeePostDeployment)
            ->sortBy([
                ['type', 'asc'],
                ['name', 'asc'],
            ])
            ->values();
    }

    /**
     * Ensure the requirement is active, belongs to the intern's institute, and is
     * part of the placement's set — a coordinator can cut a requirement from the
     * new host's list after a transfer.
     */
    private function authorizeRequirement(Requirement $requirement, Intern $intern, InternHteAssignment $placement): void
    {
        if ($requirement->institute_id !== $intern->institute_id || ! $requirement->is_active) {
            abort(403, 'This requirement is not available for your institute.');
        }

        if (! $placement->requirementList()->contains('id', $requirement->id)) {
            abort(403, 'This requirement is not part of your current placement.');
        }
    }
}
