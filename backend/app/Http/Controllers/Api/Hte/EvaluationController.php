<?php

namespace App\Http\Controllers\Api\Hte;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\InternDetailResource;
use App\Http\Resources\Intern\InternListResource;
use App\Models\EvaluationCriterion;
use App\Models\Hte;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\InternHteAssignment;
use App\Models\TransferRequest;
use App\Models\User;
use App\Models\UserNotification;
use App\Support\PlacementEvaluationScore;
use App\Support\TransferFlow;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EvaluationController extends Controller
{
    /**
     * The interns assigned to the authenticated HTE, each annotated with
     * their evaluation progress for the intern evaluation form.
     */
    public function index(Request $request): JsonResponse
    {
        $hte = $request->user()->hte;

        if (! $hte) {
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

        $query = Intern::with(['user', 'institute', 'program', 'academicYear'])
            ->where('assigned_hte', $hte->id)
            ->whereIn('ojt_status', ['ongoing', 'hours_completed', 'completed'])
            ->withCount([
                'journals',
                'journals as journals_verified_count' => fn (Builder $builder) => $builder->where('status', 'verified'),
                'journals as journals_flagged_count' => fn (Builder $builder) => $builder->whereIn('status', ['flagged', 'rejected']),
                'journals as journals_pending_count' => fn (Builder $builder) => $builder->where('status', 'pending'),
            ]);

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->whereHas('user', function (Builder $builder) use ($search): void {
                $builder->where('firstname', 'like', "%{$search}%")
                    ->orWhere('middlename', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $academicYearId = $request->integer('academic_year_id');

        if ($academicYearId > 0) {
            $query->where('academic_year_id', $academicYearId);
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

        $instituteIds = $interns->pluck('institute_id')->filter()->unique()->values();

        $totals = EvaluationCriterion::query()
            ->whereIn('institute_id', $instituteIds)
            ->where('type', 'intern')
            ->where('status', 'active')
            ->selectRaw('institute_id, count(*) as total')
            ->groupBy('institute_id')
            ->pluck('total', 'institute_id');

        $placements = InternHteAssignment::query()
            ->whereIn('intern_id', $interns->pluck('id'))
            ->where('hte_id', $hte->id)
            ->whereNull('unassigned_at')
            ->pluck('id', 'intern_id');

        $answered = InternEvaluation::query()
            ->whereIn('placement_id', $placements->values())
            ->selectRaw('placement_id, count(*) as answered')
            ->groupBy('placement_id')
            ->pluck('answered', 'placement_id');

        $openTransfers = TransferRequest::query()
            ->whereIn('from_placement_id', $placements->values())
            ->where('status', '!=', TransferRequest::STATUS_REASSIGNED)
            ->get(['uuid', 'status', 'from_placement_id'])
            ->keyBy('from_placement_id');

        $weightedRows = InternEvaluation::query()
            ->whereIn('intern_evaluations.placement_id', $placements->values())
            ->join('evaluation_criteria', 'intern_evaluations.criterion_id', '=', 'evaluation_criteria.id')
            ->where('evaluation_criteria.type', 'intern')
            ->selectRaw('intern_evaluations.placement_id, evaluation_criteria.category, SUM(CASE WHEN intern_evaluations.is_na THEN 0 ELSE intern_evaluations.rating END) as sum_rating, SUM(CASE WHEN intern_evaluations.is_na THEN 0 ELSE 1 END) as rated_count')
            ->groupBy('intern_evaluations.placement_id', 'evaluation_criteria.category')
            ->get()
            ->groupBy('placement_id');

        $data = InternListResource::collection($interns)->resolve($request);

        foreach ($data as $index => $item) {
            $intern = $interns[$index];
            $total = (int) ($totals[$intern->institute_id] ?? 0);
            $placementId = $placements[$intern->id] ?? null;
            $answeredCount = $placementId !== null ? (int) ($answered[$placementId] ?? 0) : 0;

            $perCategory = $placementId !== null ? $weightedRows->get($placementId, collect()) : collect();
            $avgs = [];
            foreach (PlacementEvaluationScore::WEIGHTS as $category => $weight) {
                $row = $perCategory->firstWhere('category', $category);
                $avgs[$category] = $row
                    ? PlacementEvaluationScore::average((float) $row->sum_rating, (int) $row->rated_count)
                    : null;
            }

            $data[$index]['evaluation'] = [
                'total' => $total,
                'answered' => $answeredCount,
                'status' => $this->evaluationStatus($total, $answeredCount),
                'weighted_average' => PlacementEvaluationScore::weighted($avgs),
            ];

            $transfer = $placementId !== null ? $openTransfers->get($placementId) : null;
            $data[$index]['transfer'] = $transfer ? [
                'uuid' => $transfer->uuid,
                'status' => $transfer->status,
            ] : null;
        }

        return response()->json([
            'data' => $data,
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
     * The evaluation form for one intern: the intern summary, the active
     * intern criteria for their institute grouped in the standard category
     * order, and any existing responses from this HTE.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);
        $hte = $request->user()->hte;

        $intern->loadMissing([
            'user.location',
            'program',
            'institute',
            'academicYear',
            'reviewer',
            'assignedHte.institute',
            'assignedHte.program',
        ]);

        $criteria = EvaluationCriterion::query()
            ->where('institute_id', $intern->institute_id)
            ->where('type', 'intern')
            ->where('status', 'active')
            ->orderByRaw("CASE category
                WHEN 'personal_characteristics' THEN 1
                WHEN 'work_characteristics' THEN 2
                WHEN 'job_knowledge' THEN 3
                ELSE 4 END")
            ->orderBy('id')
            ->get();

        $placement = $this->activePlacementFor($intern, $hte);

        $responses = InternEvaluation::query()
            ->when(
                $placement !== null,
                fn ($query) => $query->where('placement_id', $placement->id),
                fn ($query) => $query->where('intern_id', $intern->id)->where('hte_id', $hte->id)->whereNull('placement_id'),
            )
            ->get()
            ->keyBy('criterion_id');

        return response()->json([
            'data' => [
                'intern' => new InternDetailResource($intern),
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
     * Store (or update) the HTE's evaluation responses for an intern.
     */
    public function store(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);
        $hte = $request->user()->hte;

        $data = $request->validate([
            'responses' => ['required', 'array'],
            'responses.*.criterion_id' => ['required', 'integer'],
            'responses.*.rating' => ['nullable', 'integer', 'between:1,5'],
            'responses.*.is_na' => ['nullable', 'boolean'],
        ]);

        $validIds = EvaluationCriterion::query()
            ->where('institute_id', $intern->institute_id)
            ->where('type', 'intern')
            ->where('status', 'active')
            ->pluck('id')
            ->all();

        $placement = $this->activePlacementFor($intern, $hte);

        $alreadySubmitted = InternEvaluation::query()
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
                    "responses.{$criterionId}.criterion_id" => ['This criterion is not part of this intern\'s evaluation form.'],
                ]);
            }

            $isNa = (bool) ($response['is_na'] ?? false);
            $rating = $isNa ? null : ($response['rating'] ?? null);

            if (! $isNa && $rating === null) {
                throw ValidationException::withMessages([
                    "responses.{$criterionId}.rating" => ['A rating or N/A is required for every indicator.'],
                ]);
            }

            InternEvaluation::updateOrCreate(
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
            'intern_evaluated',
            'Intern Evaluated',
            $request->user()->hte->name.' evaluated '.$user->full_name.'.',
            ['intern_uuid' => $user->uuid, 'hte_id' => $hte->id]
        );

        UserNotification::notifyInstructors(
            'intern_evaluated',
            'Intern Evaluated',
            $request->user()->hte->name.' evaluated '.$user->full_name.'.',
            ['intern_uuid' => $user->uuid, 'hte_id' => $hte->id]
        );

        return response()->json([
            'data' => ['message' => 'Evaluation submitted successfully.'],
        ], 201);
    }

    /**
     * Derive the evaluation progress status for an intern.
     */
    private function evaluationStatus(int $total, int $answered): string
    {
        if ($total === 0) {
            return 'no_criteria';
        }

        if ($answered === 0) {
            return 'not_evaluated';
        }

        return $answered < $total ? 'partial' : 'completed';
    }

    /**
     * The open placement linking the intern to this HTE.
     */
    private function activePlacementFor(Intern $intern, Hte $hte): ?InternHteAssignment
    {
        return $intern->hteAssignments()
            ->where('hte_id', $hte->id)
            ->whereNull('unassigned_at')
            ->latest('id')
            ->first();
    }

    /**
     * Ensure the intern is assigned to the authenticated HTE.
     */
    private function authorizeIntern(Request $request, User $user): Intern
    {
        $hte = $request->user()->hte;

        if (! $hte) {
            abort(403, 'Your account is not linked to an HTE profile.');
        }

        $intern = $user->enrollmentFor($request->integer('academic_year_id') ?: null);

        if (! $intern) {
            abort(404, 'This user has no intern record.');
        }

        if ($intern->assigned_hte !== $hte->id) {
            abort(403, 'This intern is not assigned to your establishment.');
        }

        return $intern;
    }
}
