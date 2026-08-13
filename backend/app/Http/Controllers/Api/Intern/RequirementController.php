<?php

namespace App\Http\Controllers\Api\Intern;

use App\Http\Controllers\Controller;
use App\Http\Requests\Intern\SubmitRequirementRequest;
use App\Http\Resources\Intern\RequirementSubmissionResource;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class RequirementController extends Controller
{
    /**
     * All active requirements of the intern's institute, with their submission status.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $intern = $user->intern;

        if (! $intern) {
            return response()->json([
                'data' => [],
            ]);
        }

        if ($intern->status !== 'approved') {
            return response()->json([
                'data' => [],
            ]);
        }

        $instituteId = $intern->institute_id;

        $requirements = Requirement::where('institute_id', $instituteId)
            ->where('is_active', true)
            ->where('type', 'pre_deployment')
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        $submissions = RequirementSubmission::where('user_id', $user->id)
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

        return response()->json([
            'data' => $rows,
        ]);
    }

    /**
     * Upload (or replace) the PDF submission for a requirement of the intern's institute.
     */
    public function submit(SubmitRequirementRequest $request, Requirement $requirement): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorizeRequirement($request, $requirement);

        $submission = RequirementSubmission::firstOrNew([
            'user_id' => $user->id,
            'requirement_id' => $requirement->id,
        ]);

        $wasResubmit = $submission->exists;

        if ($submission->exists && $submission->file_path) {
            Storage::disk('public')->delete($submission->file_path);
        }

        $submission->file_path = $request->file('file')->store('requirement-submissions', 'public');
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

        $this->authorizeRequirement($request, $requirement);

        $submission = RequirementSubmission::where('user_id', $user->id)
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
     * Ensure the intern is approved and the requirement is active + belongs to their institute.
     */
    private function authorizeRequirement(Request $request, Requirement $requirement): void
    {
        $intern = $request->user()->intern;

        if (! $intern) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        if ($intern->status !== 'approved') {
            abort(403, 'Your registration must be approved before submitting requirements.');
        }

        if ($requirement->institute_id !== $intern->institute_id || ! $requirement->is_active) {
            abort(403, 'This requirement is not available for your institute.');
        }
    }
}
