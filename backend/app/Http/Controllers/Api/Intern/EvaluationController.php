<?php

namespace App\Http\Controllers\Api\Intern;

use App\Http\Controllers\Controller;
use App\Models\EvaluationCriterion;
use App\Models\HteEvaluation;
use App\Models\Intern;
use App\Models\InternHteAssignment;
use App\Models\TransferRequest;
use App\Models\UserNotification;
use App\Support\TransferFlow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EvaluationController extends Controller
{
    /**
     * The intern's HTE evaluation form: the assigned HTE summary, the
     * active HTE criteria for the intern's institute ordered by category,
     * and any existing responses from this intern.
     *
     * Only available when the intern's ojt_status is hours_completed or
     * completed, or when an accepted transfer is closing the current
     * placement — the intern must rate the outgoing HTE before reassignment.
     */
    public function show(Request $request): JsonResponse
    {
        [$intern, $placement] = $this->authorizeEvaluation($request);

        $hte = $intern->assignedHte;

        if (! $hte) {
            return response()->json([
                'data' => [
                    'hte' => null,
                    'criteria' => [],
                ],
            ]);
        }

        $hte->loadMissing(['institute', 'program', 'user']);

        $criteria = EvaluationCriterion::query()
            ->where('institute_id', $intern->institute_id)
            ->where('type', 'hte')
            ->where('status', 'active')
            ->orderByRaw("CASE category
                WHEN 'personal_characteristics' THEN 1
                WHEN 'work_characteristics' THEN 2
                WHEN 'job_knowledge' THEN 3
                ELSE 4 END")
            ->orderBy('id')
            ->get();

        $responses = HteEvaluation::query()
            ->when(
                $placement !== null,
                fn ($query) => $query->where('placement_id', $placement->id),
                fn ($query) => $query->where('intern_id', $intern->id)->where('hte_id', $hte->id)->whereNull('placement_id'),
            )
            ->get()
            ->keyBy('criterion_id');

        // An in-flight transfer closing this placement explains why the form is
        // open before the hours gate: the intern must rate the outgoing HTE.
        $transfer = $placement !== null
            ? TransferRequest::query()
                ->where('from_placement_id', $placement->id)
                ->where('status', '!=', TransferRequest::STATUS_REASSIGNED)
                ->latest('id')
                ->first(['uuid', 'status'])
            : null;

        return response()->json([
            'data' => [
                'hte' => [
                    'id' => $hte->id,
                    'name' => $hte->name,
                    'institute' => $hte->institute?->name,
                    'program' => $hte->program?->name,
                    'email' => $hte->user?->email,
                    'status' => $hte->status,
                ],
                'intern' => [
                    'id' => $intern->id,
                    'ojt_status' => $intern->ojt_status,
                ],
                'transfer' => $transfer ? [
                    'uuid' => $transfer->uuid,
                    'status' => $transfer->status,
                ] : null,
                'criteria' => $criteria->map(fn (EvaluationCriterion $criterion) => [
                    'id' => $criterion->id,
                    'category' => $criterion->category,
                    'indicator' => $criterion->indicator,
                    'response' => $responses->has($criterion->id)
                        ? [
                            'rating' => $responses[$criterion->id]->rating,
                            'is_na' => $responses[$criterion->id]->is_na,
                        ]
                        : null,
                ])->values(),
            ],
        ]);
    }

    /**
     * Store the intern's HTE evaluation responses.
     */
    public function store(Request $request): JsonResponse
    {
        [$intern, $placement] = $this->authorizeEvaluation($request);

        $hte = $intern->assignedHte;

        if (! $hte) {
            throw ValidationException::withMessages([
                'hte' => ['You have no assigned HTE to evaluate.'],
            ]);
        }

        $data = $request->validate([
            'responses' => ['required', 'array'],
            'responses.*.criterion_id' => ['required', 'integer'],
            'responses.*.rating' => ['nullable', 'integer', 'between:1,5'],
            'responses.*.is_na' => ['nullable', 'boolean'],
        ]);

        $validIds = EvaluationCriterion::query()
            ->where('institute_id', $intern->institute_id)
            ->where('type', 'hte')
            ->where('status', 'active')
            ->pluck('id')
            ->all();

        $alreadySubmitted = HteEvaluation::query()
            ->when(
                $placement !== null,
                fn ($query) => $query->where('placement_id', $placement->id),
                fn ($query) => $query->where('intern_id', $intern->id)->where('hte_id', $hte->id),
            )
            ->exists();

        if ($alreadySubmitted) {
            throw ValidationException::withMessages([
                'evaluation' => ['This evaluation has already been submitted and cannot be updated.'],
            ]);
        }

        foreach ($data['responses'] as $response) {
            $criterionId = (int) $response['criterion_id'];

            if (! in_array($criterionId, $validIds, true)) {
                throw ValidationException::withMessages([
                    "responses.{$criterionId}.criterion_id" => ['This criterion is not part of this HTE\'s evaluation form.'],
                ]);
            }

            $isNa = (bool) ($response['is_na'] ?? false);
            $rating = $isNa ? null : ($response['rating'] ?? null);

            if (! $isNa && $rating === null) {
                throw ValidationException::withMessages([
                    "responses.{$criterionId}.rating" => ['A rating or N/A is required for every indicator.'],
                ]);
            }

            HteEvaluation::updateOrCreate(
                [
                    'placement_id' => $placement?->id,
                    'criterion_id' => $criterionId,
                    'intern_id' => $intern->id,
                    'hte_id' => $hte->id,
                ],
                ['rating' => $rating, 'is_na' => $isNa]
            );
        }

        TransferFlow::syncForPlacement($placement);

        UserNotification::notifyCoordinators(
            $intern->institute_id,
            'hte_evaluated',
            'HTE Evaluated',
            $request->user()->full_name.' evaluated '.$hte->name.'.',
            ['intern_uuid' => $request->user()->uuid, 'hte_id' => $hte->id]
        );

        return response()->json([
            'data' => ['message' => 'HTE evaluation submitted successfully.'],
        ], 201);
    }

    /**
     * Resolve the intern and gate the HTE evaluation.
     *
     * @return array{0: Intern, 1: ?InternHteAssignment}
     */
    private function authorizeEvaluation(Request $request): array
    {
        $intern = $request->user()->activeEnrollment();

        if (! $intern) {
            abort(404, 'No intern record found for this account.');
        }

        $placement = $intern->activePlacement();

        if (! in_array($intern->ojt_status, ['hours_completed', 'completed'], true) && ! $this->hasAcceptedTransfer($placement)) {
            throw ValidationException::withMessages([
                'ojt_status' => ['This evaluation is only available after your OJT hours are marked as completed, or once a transfer has been accepted for your current placement.'],
            ]);
        }

        return [$intern, $placement];
    }

    /**
     * Whether an accepted transfer is closing the given placement, which lets
     * the intern rate the outgoing HTE before the reassignment happens.
     */
    private function hasAcceptedTransfer(?InternHteAssignment $placement): bool
    {
        if ($placement === null) {
            return false;
        }

        return TransferRequest::query()
            ->where('from_placement_id', $placement->id)
            ->where('status', TransferRequest::STATUS_ACCEPTED)
            ->exists();
    }
}
