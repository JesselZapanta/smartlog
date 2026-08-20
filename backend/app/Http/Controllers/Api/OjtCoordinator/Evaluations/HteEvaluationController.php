<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Evaluations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\InternDetailResource;
use App\Http\Resources\Intern\InternListResource;
use App\Models\EvaluationCriterion;
use App\Models\Hte;
use App\Models\HteEvaluation;
use App\Models\Intern;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $internCounts = Intern::whereIn('assigned_hte', $hteIds)
            ->where('institute_id', $instituteId)
            ->where('status', 'approved')
            ->whereIn('ojt_status', ['hours_completed', 'completed'])
            ->selectRaw('assigned_hte, count(*) as total')
            ->groupBy('assigned_hte')
            ->pluck('total', 'assigned_hte');

        $evaluatedCounts = HteEvaluation::whereIn('hte_id', $hteIds)
            ->whereIn('intern_id', function ($q) use ($instituteId): void {
                $q->select('id')->from('interns')->where('institute_id', $instituteId);
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
            ->where('assigned_hte', $hte->id)
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

        $answered = [];
        $weightedMap = [];
        if ($totalCriteria > 0 && $interns->isNotEmpty()) {
            $answered = HteEvaluation::query()
                ->where('hte_id', $hte->id)
                ->whereIn('intern_id', $interns->pluck('id'))
                ->selectRaw('intern_id, count(*) as answered')
                ->groupBy('intern_id')
                ->pluck('answered', 'intern_id')
                ->all();

            $rows = HteEvaluation::query()
                ->where('hte_evaluations.hte_id', $hte->id)
                ->whereIn('hte_evaluations.intern_id', $interns->pluck('id'))
                ->join('evaluation_criteria', 'hte_evaluations.criterion_id', '=', 'evaluation_criteria.id')
                ->where('evaluation_criteria.type', 'hte')
                ->where('evaluation_criteria.institute_id', $instituteId)
                ->selectRaw('hte_evaluations.intern_id, evaluation_criteria.category, SUM(CASE WHEN hte_evaluations.is_na THEN 0 ELSE hte_evaluations.rating END) as sum_rating, COUNT(*) as answered')
                ->groupBy('hte_evaluations.intern_id', 'evaluation_criteria.category')
                ->get();

            $grouped = $rows->groupBy('intern_id');
            foreach ($interns as $intern) {
                $perCategory = $grouped->get($intern->id, collect());
                $avgs = [];
                foreach (['personal_characteristics', 'work_characteristics', 'job_knowledge'] as $cat) {
                    $row = $perCategory->firstWhere('category', $cat);
                    $avgs[$cat] = $row ? (float) $row->sum_rating / (int) $row->answered : null;
                }
                $hasData = $avgs['personal_characteristics'] !== null || $avgs['work_characteristics'] !== null || $avgs['job_knowledge'] !== null;
                $weighted = $hasData ? round(($avgs['personal_characteristics'] ?? 0) * 0.3 + ($avgs['work_characteristics'] ?? 0) * 0.3 + ($avgs['job_knowledge'] ?? 0) * 0.4, 2) : null;
                $weightedMap[$intern->id] = $weighted;
            }
        }

        $data = InternListResource::collection($interns)->resolve($request);

        foreach ($data as $index => $item) {
            $intern = $interns[$index];
            $answeredCount = (int) ($answered[$intern->id] ?? 0);

            $data[$index]['evaluation'] = [
                'total' => $totalCriteria,
                'answered' => $answeredCount,
                'status' => $this->evaluationStatus($totalCriteria, $answeredCount),
                'weighted_average' => $weightedMap[$intern->id] ?? null,
            ];
        }

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

        if ($internModel->assigned_hte !== $hteModel->id) {
            abort(404, 'This intern is not assigned to the selected HTE.');
        }

        return $this->showForIntern($request, $intern);
    }

    private function showForIntern(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);
        $assignedHte = $intern->assignedHte;

        $intern->loadMissing([
            'user.location',
            'program',
            'institute',
            'academicYear',
            'reviewer',
            'assignedHte.institute',
            'assignedHte.program',
            'assignedHte.user',
        ]);

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

        $responses = collect();
        if ($assignedHte) {
            $responses = HteEvaluation::query()
                ->where('intern_id', $intern->id)
                ->where('hte_id', $assignedHte->id)
                ->get()
                ->keyBy('criterion_id');
        }

        return response()->json([
            'data' => [
                'intern' => new InternDetailResource($intern),
                'hte' => $assignedHte ? [
                    'id' => $assignedHte->id,
                    'name' => $assignedHte->name,
                    'institute' => $assignedHte->institute?->name,
                    'program' => $assignedHte->program?->name,
                    'email' => $assignedHte->user?->email,
                    'status' => $assignedHte->status,
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
            ->where('assigned_hte', $hteId)
            ->where('status', 'approved')
            ->whereIn('ojt_status', ['hours_completed', 'completed']);

        if ($academicYearId > 0) {
            $internQuery->where('academic_year_id', $academicYearId);
        }

        $internIds = $internQuery->pluck('id');

        if ($internIds->isEmpty()) {
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
            ->where('hte_id', $hteId)
            ->whereIn('intern_id', $internIds)
            ->join('evaluation_criteria', 'hte_evaluations.criterion_id', '=', 'evaluation_criteria.id')
            ->selectRaw('evaluation_criteria.category, COUNT(*) as answered, SUM(CASE WHEN hte_evaluations.is_na THEN 1 ELSE 0 END) as na_count, SUM(CASE WHEN hte_evaluations.is_na THEN 0 ELSE hte_evaluations.rating END) as sum_rating')
            ->groupBy('evaluation_criteria.category')
            ->get()
            ->keyBy('category');

        $perCategory = [];
        $weightedSum = 0;
        $hasData = false;
        $evaluatedCount = HteEvaluation::where('hte_id', $hteId)->whereIn('intern_id', $internIds)->distinct('intern_id')->count('intern_id');

        foreach (['personal_characteristics', 'work_characteristics', 'job_knowledge'] as $cat) {
            $total = (int) ($totalByCategory[$cat] ?? 0);
            $row = $rows->get($cat);
            $answered = $row ? (int) $row->answered : 0;
            $naCount = $row ? (int) $row->na_count : 0;
            $sum = $row ? (float) $row->sum_rating : 0;
            // total expected ratings for this category = total criteria * number of evaluated interns? No, we want avg across all ratings, so denominator is answered (including N/A as 0)
            // For per-category avg, we want sum / answered (where answered includes N/A as 0, so denominator is answered)
            $avg = $answered > 0 ? $sum / $answered : null;
            if ($avg !== null) {
                $hasData = true;
            }
            $weight = $cat === 'job_knowledge' ? 0.4 : 0.3;
            if ($avg !== null) {
                $weightedSum += $avg * $weight;
            }
            $perCategory[$cat] = [
                'avg' => $avg,
                'count' => $answered - $naCount,
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
