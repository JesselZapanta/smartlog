<?php

namespace App\Http\Controllers\Api\OjtInstructor\Evaluations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\InternDetailResource;
use App\Http\Resources\Intern\InternListResource;
use App\Models\EvaluationCriterion;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\InternHteAssignment;
use App\Models\User;
use App\Support\InternEvaluationSummary;
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

        // Every placement, open or closed: scores blend across hosts for
        // transferred interns, matching the read-only detail report.
        $placementsByIntern = InternHteAssignment::query()
            ->whereIn('intern_id', $interns->pluck('id'))
            ->orderBy('id')
            ->get()
            ->groupBy('intern_id');

        $placementIds = $placementsByIntern->flatten()->pluck('id');

        $answered = [];
        $rows = collect();

        if ($placementIds->isNotEmpty()) {
            $answered = InternEvaluation::query()
                ->join('evaluation_criteria', 'intern_evaluations.criterion_id', '=', 'evaluation_criteria.id')
                ->whereIn('intern_evaluations.placement_id', $placementIds)
                ->where('evaluation_criteria.type', 'intern')
                ->where('evaluation_criteria.status', 'active')
                ->selectRaw('intern_evaluations.placement_id, count(*) as answered')
                ->groupBy('intern_evaluations.placement_id')
                ->pluck('answered', 'placement_id')
                ->all();

            $rows = InternEvaluation::query()
                ->join('evaluation_criteria', 'intern_evaluations.criterion_id', '=', 'evaluation_criteria.id')
                ->whereIn('intern_evaluations.placement_id', $placementIds)
                ->where('evaluation_criteria.type', 'intern')
                ->where('evaluation_criteria.status', 'active')
                ->selectRaw('intern_evaluations.placement_id, evaluation_criteria.category, SUM(CASE WHEN intern_evaluations.is_na THEN 0 ELSE intern_evaluations.rating END) as sum_rating, SUM(CASE WHEN intern_evaluations.is_na THEN 0 ELSE 1 END) as rated_count')
                ->groupBy('intern_evaluations.placement_id', 'evaluation_criteria.category')
                ->get()
                ->groupBy('placement_id');
        }

        $data = InternListResource::collection($interns)->resolve($request);

        foreach ($data as $index => $item) {
            $intern = $interns[$index];

            $evaluation = InternEvaluationSummary::blended(
                ($placementsByIntern[$intern->id] ?? collect())->pluck('id'),
                (int) ($totals[$intern->institute_id] ?? 0),
                $answered,
                $rows,
            );

            $data[$index]['evaluation'] = [
                'total' => $evaluation['total'],
                'answered' => $evaluation['answered'],
                'status' => $this->evaluationStatus($evaluation['total'], $evaluation['answered']),
                'weighted_average' => $evaluation['weighted_average'],
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

    /**
     * Read-only evaluation report for one intern: intern summary, every
     * placement of the enrollment row with its HTE responses, per-placement
     * scores, and the equal-weight blended score across placements.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $intern = $user->enrollmentFor($request->integer('academic_year_id') ?: null);

        if (! $intern || ! in_array($intern->ojt_status, ['hours_completed', 'completed'], true)) {
            abort(404, 'This intern evaluation is not available.');
        }

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

        $summary = InternEvaluationSummary::build($intern, $criteria);

        return response()->json([
            'data' => [
                'intern' => new InternDetailResource($intern),
                'criteria' => $criteria->map(fn (EvaluationCriterion $criterion) => [
                    'id' => $criterion->id,
                    'category' => $criterion->category,
                    'indicator' => $criterion->indicator,
                ])->values(),
                'placements' => $summary['placements'],
                'blended_average' => $summary['blended_average'],
                'blended_placements' => $summary['blended_placements'],
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
