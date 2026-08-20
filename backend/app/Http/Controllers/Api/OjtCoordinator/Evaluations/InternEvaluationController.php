<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Evaluations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\InternDetailResource;
use App\Http\Resources\Intern\InternListResource;
use App\Models\EvaluationCriterion;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternEvaluationController extends Controller
{
    /**
     * Intern monitoring-style table for the coordinator's institute,
     * each row annotated with HTE evaluation progress (read-only).
     */
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

        $query = Intern::with(['user', 'institute', 'program', 'academicYear', 'assignedHte'])
            ->where('institute_id', $instituteId)
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
            ->where('type', 'intern')
            ->where('status', 'active')
            ->count();

        $answered = [];
        $weightedMap = [];
        if ($totalCriteria > 0 && $interns->isNotEmpty()) {
            $answered = InternEvaluation::query()
                ->whereIn('intern_id', $interns->pluck('id'))
                ->selectRaw('intern_id, count(*) as answered')
                ->groupBy('intern_id')
                ->pluck('answered', 'intern_id')
                ->all();

            $rows = InternEvaluation::query()
                ->whereIn('intern_evaluations.intern_id', $interns->pluck('id'))
                ->join('evaluation_criteria', 'intern_evaluations.criterion_id', '=', 'evaluation_criteria.id')
                ->where('evaluation_criteria.type', 'intern')
                ->where('evaluation_criteria.institute_id', $instituteId)
                ->selectRaw('intern_evaluations.intern_id, evaluation_criteria.category, SUM(CASE WHEN intern_evaluations.is_na THEN 0 ELSE intern_evaluations.rating END) as sum_rating, COUNT(*) as answered')
                ->groupBy('intern_evaluations.intern_id', 'evaluation_criteria.category')
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
            $data[$index]['assigned_hte_name'] = $intern->assignedHte?->name;
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
     * Read-only evaluation form for one intern: intern summary, HTE info,
     * active intern criteria for the institute, and any responses from the
     * assigned HTE.
     */
    public function show(Request $request, User $user): JsonResponse
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
            ->where('type', 'intern')
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
            $responses = InternEvaluation::query()
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
