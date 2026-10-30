<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Evaluations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\InternDetailResource;
use App\Http\Resources\Intern\InternListResource;
use App\Models\EvaluationCriterion;
use App\Models\Hte;
use App\Models\HteEvaluation;
use App\Models\Intern;
use App\Models\InternHteAssignment;
use App\Models\User;
use App\Support\PlacementEvaluationScore;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class HteEvaluationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;

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

        $query = Hte::with(['user', 'institute', 'program'])
            ->where('institute_id', $instituteId)
            ->where('status', 'active');

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhereHas('user', function (Builder $b) use ($search): void {
                        $b->where('email', 'like', "%{$search}%");
                    });
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

        $htes = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        $hteIds = $htes->pluck('id');

        $internCounts = InternHteAssignment::query()
            ->join('interns', 'interns.id', '=', 'intern_hte_assignments.intern_id')
            ->whereIn('intern_hte_assignments.hte_id', $hteIds)
            ->where('interns.institute_id', $instituteId)
            ->where('interns.status', 'approved')
            ->whereIn('interns.ojt_status', ['hours_completed', 'completed'])
            ->selectRaw('intern_hte_assignments.hte_id as hte_id, count(DISTINCT intern_hte_assignments.intern_id) as total')
            ->groupBy('intern_hte_assignments.hte_id')
            ->pluck('total', 'hte_id');

        $evaluatedCounts = HteEvaluation::whereIn('hte_id', $hteIds)
            ->whereIn('intern_id', function ($q) use ($instituteId): void {
                $q->select('id')->from('interns')
                    ->where('institute_id', $instituteId)
                    ->where('status', 'approved')
                    ->whereIn('ojt_status', ['hours_completed', 'completed']);
            })
            ->selectRaw('hte_id, count(DISTINCT intern_id) as evaluated')
            ->groupBy('hte_id')
            ->pluck('evaluated', 'hte_id');

        $data = $htes->map(function (Hte $hte) use ($internCounts, $evaluatedCounts): array {
            $totalInterns = (int) ($internCounts[$hte->id] ?? 0);
            $evaluated = (int) ($evaluatedCounts[$hte->id] ?? 0);

            return [
                'id' => $hte->id,
                'uuid' => $hte->user->uuid,
                'name' => $hte->name,
                'institute' => $hte->institute?->name,
                'program' => $hte->program?->name,
                'email' => $hte->user?->email,
                'status' => $hte->status,
                'interns_count' => $totalInterns,
                'evaluated_count' => $evaluated,
                'created_at' => $hte->created_at,
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $htes->currentPage(),
                'last_page' => $htes->lastPage(),
                'per_page' => $htes->perPage(),
                'total' => $htes->total(),
                'from' => $htes->firstItem(),
                'to' => $htes->lastItem(),
            ],
        ]);
    }

    public function interns(Request $request, User $user): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        $hte = $user->hte;

        if (! $hte || $hte->institute_id !== $instituteId) {
            abort(403, 'This HTE does not belong to your institute.');
        }

        $hte->loadMissing(['institute', 'program']);

        $query = Intern::with(['user', 'institute', 'program', 'academicYear', 'assignedHte'])
            ->where('institute_id', $instituteId)
            ->whereHas('hteAssignments', fn (Builder $builder) => $builder->where('hte_id', $hte->id))
            ->where('status', 'approved')
            ->whereIn('ojt_status', ['hours_completed', 'completed'])
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

        $totalCriteria = EvaluationCriterion::query()
            ->where('institute_id', $instituteId)
            ->where('type', 'hte')
            ->where('status', 'active')
            ->count();

        $placements = InternHteAssignment::query()
            ->whereIn('intern_id', $interns->pluck('id'))
            ->where('hte_id', $hte->id)
            ->orderBy('id')
            ->get()
            ->groupBy('intern_id')
            ->map(function (Collection $group): int {
                $open = $group->first(fn (InternHteAssignment $placement) => $placement->unassigned_at === null);

                return ($open ?? $group->last())->id;
            });

        $answered = [];
        $weightedMap = [];
        if ($interns->isNotEmpty()) {
            $answered = HteEvaluation::query()
                ->whereIn('placement_id', $placements->values())
                ->selectRaw('placement_id, count(*) as answered')
                ->groupBy('placement_id')
                ->pluck('answered', 'placement_id')
                ->all();

            $rows = HteEvaluation::query()
                ->whereIn('hte_evaluations.placement_id', $placements->values())
                ->join('evaluation_criteria', 'hte_evaluations.criterion_id', '=', 'evaluation_criteria.id')
                ->where('evaluation_criteria.type', 'hte')
                ->where('evaluation_criteria.institute_id', $instituteId)
                ->selectRaw('hte_evaluations.placement_id, evaluation_criteria.category, SUM(CASE WHEN hte_evaluations.is_na THEN 0 ELSE hte_evaluations.rating END) as sum_rating, SUM(CASE WHEN hte_evaluations.is_na THEN 0 ELSE 1 END) as rated_count')
                ->groupBy('hte_evaluations.placement_id', 'evaluation_criteria.category')
                ->get()
                ->groupBy('placement_id');

            foreach ($interns as $intern) {
                $placementId = $placements[$intern->id] ?? null;
                $perCategory = $placementId !== null ? $rows->get($placementId, collect()) : collect();
                $avgs = [];
                foreach (PlacementEvaluationScore::WEIGHTS as $category => $weight) {
                    $row = $perCategory->firstWhere('category', $category);
                    $avgs[$category] = $row
                        ? PlacementEvaluationScore::average((float) $row->sum_rating, (int) $row->rated_count)
                        : null;
                }
                $weightedMap[$intern->id] = PlacementEvaluationScore::weighted($avgs);
            }
        }

        $data = $interns->getCollection()
            ->map(function (Intern $intern) use ($request, $placements, $answered, $weightedMap, $totalCriteria): array {
                $placementId = $placements[$intern->id] ?? null;
                $answeredCount = $placementId !== null ? (int) ($answered[$placementId] ?? 0) : 0;

                $row = (new InternListResource($intern))->resolve($request);
                $row['evaluation'] = [
                    'total' => $totalCriteria,
                    'answered' => $answeredCount,
                    'status' => $this->evaluationStatus($totalCriteria, $answeredCount),
                    'weighted_average' => $weightedMap[$intern->id] ?? null,
                ];

                return $row;
            })
            ->values()
            ->all();

        $summary = $this->buildHteSummary($hte->id, $instituteId, $academicYearId);
        $summary['hte'] = [
            'id' => $hte->id,
            'name' => $hte->name,
            'institute' => $hte->institute?->name,
            'program' => $hte->program?->name,
        ];

        return response()->json([
            'data' => $data,
            'summary' => $summary,
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

    public function show(Request $request, User $user): JsonResponse
    {
        return $this->showForIntern($request, $user);
    }

    public function showForHte(Request $request, User $hte, User $intern): JsonResponse
    {
        $internModel = $this->authorizeIntern($request, $intern);
        $hteModel = $hte->hte;

        if (! $hteModel || $hteModel->institute_id !== $internModel->institute_id) {
            abort(403, 'This HTE does not belong to your institute.');
        }

        $placement = $this->placementFor($internModel, $hteModel->id);

        if (! $placement) {
            abort(404, 'This intern was not deployed to the selected HTE.');
        }

        $responses = HteEvaluation::query()
            ->where('placement_id', $placement->id)
            ->get()
            ->keyBy('criterion_id');

        return $this->evaluationPayload($internModel, $hteModel, $responses);
    }

    private function placementFor(Intern $intern, int $hteId): ?InternHteAssignment
    {
        $placements = $intern->hteAssignments()
            ->where('hte_id', $hteId)
            ->orderBy('id')
            ->get();

        return $placements->first(fn (InternHteAssignment $placement) => $placement->unassigned_at === null)
            ?? $placements->last();
    }

    private function showForIntern(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);
        $hte = $intern->assignedHte;

        $responses = collect();
        if ($hte) {
            $placement = $intern->hteAssignments()
                ->where('hte_id', $hte->id)
                ->whereNull('unassigned_at')
                ->latest('id')
                ->first();

            $responses = HteEvaluation::query()
                ->when(
                    $placement !== null,
                    fn ($query) => $query->where('placement_id', $placement->id),
                    fn ($query) => $query->where('intern_id', $intern->id)->where('hte_id', $hte->id)->whereNull('placement_id'),
                )
                ->get()
                ->keyBy('criterion_id');
        }

        return $this->evaluationPayload($intern, $hte, $responses);
    }

    /**
     * @param  Collection<int, HteEvaluation>  $responses
     */
    private function evaluationPayload(Intern $intern, ?Hte $hte, Collection $responses): JsonResponse
    {
        $intern->loadMissing([
            'user.location',
            'program',
            'institute',
            'academicYear',
            'reviewer',
        ]);

        $hte?->loadMissing(['institute', 'program', 'user']);

        $instituteId = $intern->institute_id;

        $criteria = EvaluationCriterion::query()
            ->where('institute_id', $instituteId)
            ->where('type', 'hte')
            ->where('status', 'active')
            ->orderByRaw("CASE category
                WHEN 'personal_characteristics' THEN 1
                WHEN 'work_characteristics' THEN 2
                WHEN 'job_knowledge' THEN 3
                ELSE 4 END")
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => [
                'intern' => new InternDetailResource($intern),
                'hte' => $hte ? [
                    'id' => $hte->id,
                    'name' => $hte->name,
                    'institute' => $hte->institute?->name,
                    'program' => $hte->program?->name,
                    'email' => $hte->user?->email,
                    'status' => $hte->status,
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

    private function buildHteSummary(int $hteId, int $instituteId, int $academicYearId): ?array
    {
        $totalByCategory = EvaluationCriterion::query()
            ->where('institute_id', $instituteId)
            ->where('type', 'hte')
            ->where('status', 'active')
            ->selectRaw('category, count(*) as total')
            ->groupBy('category')
            ->pluck('total', 'category')
            ->all();

        if (empty($totalByCategory)) {
            return null;
        }

        $internQuery = Intern::query()
            ->where('institute_id', $instituteId)
            ->whereHas('hteAssignments', fn (Builder $builder) => $builder->where('hte_id', $hteId))
            ->where('status', 'approved')
            ->whereIn('ojt_status', ['hours_completed', 'completed']);

        if ($academicYearId > 0) {
            $internQuery->where('academic_year_id', $academicYearId);
        }

        $internIds = $internQuery->pluck('id');

        $placementIds = InternHteAssignment::query()
            ->whereIn('intern_id', $internIds)
            ->where('hte_id', $hteId)
            ->pluck('id');

        if ($internIds->isEmpty() || $placementIds->isEmpty()) {
            return [
                'per_category' => [
                    'personal_characteristics' => ['avg' => null, 'count' => 0, 'total' => (int) ($totalByCategory['personal_characteristics'] ?? 0), 'na_count' => 0, 'answered' => 0],
                    'work_characteristics' => ['avg' => null, 'count' => 0, 'total' => (int) ($totalByCategory['work_characteristics'] ?? 0), 'na_count' => 0, 'answered' => 0],
                    'job_knowledge' => ['avg' => null, 'count' => 0, 'total' => (int) ($totalByCategory['job_knowledge'] ?? 0), 'na_count' => 0, 'answered' => 0],
                ],
                'weighted' => null,
                'interns_count' => 0,
                'evaluated_count' => 0,
            ];
        }

        $rows = HteEvaluation::query()
            ->whereIn('hte_evaluations.placement_id', $placementIds)
            ->join('evaluation_criteria', 'hte_evaluations.criterion_id', '=', 'evaluation_criteria.id')
            ->selectRaw('evaluation_criteria.category, COUNT(*) as answered, SUM(CASE WHEN hte_evaluations.is_na THEN 1 ELSE 0 END) as na_count, SUM(CASE WHEN hte_evaluations.is_na THEN 0 ELSE hte_evaluations.rating END) as sum_rating')
            ->groupBy('evaluation_criteria.category')
            ->get()
            ->keyBy('category');

        $perCategory = [];
        $weightedSum = 0;
        $hasData = false;
        $evaluatedCount = HteEvaluation::whereIn('placement_id', $placementIds)->distinct('intern_id')->count('intern_id');

        foreach (['personal_characteristics', 'work_characteristics', 'job_knowledge'] as $cat) {
            $total = (int) ($totalByCategory[$cat] ?? 0);
            $row = $rows->get($cat);
            $answered = $row ? (int) $row->answered : 0;
            $naCount = $row ? (int) $row->na_count : 0;
            $sum = $row ? (float) $row->sum_rating : 0;
            $rated = $answered - $naCount;
            $avg = $rated > 0 ? $sum / $rated : null;
            if ($avg !== null) {
                $hasData = true;
                $weightedSum += $avg * PlacementEvaluationScore::WEIGHTS[$cat];
            }
            $perCategory[$cat] = [
                'avg' => $avg,
                'count' => $rated,
                'total' => $total,
                'na_count' => $naCount,
                'answered' => $answered,
            ];
        }

        return [
            'per_category' => $perCategory,
            'weighted' => $hasData ? round($weightedSum, 2) : null,
            'interns_count' => $internIds->count(),
            'evaluated_count' => $evaluatedCount,
        ];
    }

    private function authorizeIntern(Request $request, User $user): Intern
    {
        $instituteId = $request->user()->coordinator?->institute_id;

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
