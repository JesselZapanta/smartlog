<?php

namespace App\Http\Controllers\Api\OjtInstructor\Evaluations;

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
    public function index(Request $request): JsonResponse
    {
        $query = Intern::with(['user', 'institute', 'program', 'academicYear', 'assignedHte'])
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

        $instituteIds = $interns->pluck('institute_id')->filter()->unique()->values();

        $totals = EvaluationCriterion::query()
            ->whereIn('institute_id', $instituteIds)
            ->where('type', 'intern')
            ->where('status', 'active')
            ->selectRaw('institute_id, count(*) as total')
            ->groupBy('institute_id')
            ->pluck('total', 'institute_id');

        $answered = [];
        $weightedMap = [];
        if ($interns->isNotEmpty()) {
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
                ->selectRaw('intern_evaluations.intern_id, evaluation_criteria.category, SUM(CASE WHEN intern_evaluations.is_na THEN 0 ELSE intern_evaluations.rating END) as sum_rating, COUNT(*) as answered')
                ->groupBy('intern_evaluations.intern_id', 'evaluation_criteria.category')
                ->get()
                ->groupBy('intern_id');

            foreach ($interns as $intern) {
                $perCategory = $rows->get($intern->id, collect());
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
            $total = (int) ($totals[$intern->institute_id] ?? 0);
            $answeredCount = (int) ($answered[$intern->id] ?? 0);

            $data[$index]['evaluation'] = [
                'total' => $total,
                'answered' => $answeredCount,
                'status' => $this->evaluationStatus($total, $answeredCount),
                'weighted_average' => $weightedMap[$intern->id] ?? null,
            ];
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

    public function show(Request $request, User $user): JsonResponse
    {
        $intern = $user->intern;

        if (! $intern || ! in_array($intern->ojt_status, ['hours_completed', 'completed'], true)) {
            abort(404, 'This intern evaluation is not available.');
        }

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
}
