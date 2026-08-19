<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Evaluations;

use App\Http\Controllers\Controller;
use App\Http\Requests\OjtCoordinator\StoreEvaluationCriterionRequest;
use App\Http\Requests\OjtCoordinator\UpdateEvaluationCriterionRequest;
use App\Http\Resources\OjtCoordinator\EvaluationCriterionResource;
use App\Models\EvaluationCriterion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EvaluationCriterionController extends Controller
{
    /**
     * Server-side list of evaluation criteria for the coordinator's institute
     * (global templates plus institute-specific ones) with search, filters,
     * sorting and pagination.
     */
    public function index(Request $request): JsonResponse
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

        $query = EvaluationCriterion::query()->where('institute_id', $instituteId);

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('indicator', 'like', "%{$search}%");
            });
        }

        $category = $request->string('category')->trim()->toString();

        if (in_array($category, ['personal_characteristics', 'work_characteristics', 'job_knowledge'], true)) {
            $query->where('category', $category);
        }

        $type = $request->string('type')->trim()->toString();

        if (in_array($type, ['intern', 'hte'], true)) {
            $query->where('type', $type);
        }

        $status = $request->string('status')->trim()->toString();

        if (in_array($status, ['active', 'inactive'], true)) {
            $query->where('status', $status);
        }

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'category', 'indicator', 'type', 'status'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $criteria = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => EvaluationCriterionResource::collection($criteria),
            'meta' => [
                'current_page' => $criteria->currentPage(),
                'last_page' => $criteria->lastPage(),
                'per_page' => $criteria->perPage(),
                'total' => $criteria->total(),
                'from' => $criteria->firstItem(),
                'to' => $criteria->lastItem(),
            ],
        ]);
    }

    /**
     * Create an evaluation criterion for the coordinator's institute.
     */
    public function store(StoreEvaluationCriterionRequest $request): JsonResponse
    {
        $instituteId = $this->instituteId($request);

        if (! $instituteId) {
            throw ValidationException::withMessages([
                'institute' => ['Your account is not assigned to an institute yet.'],
            ]);
        }

        $criterion = EvaluationCriterion::create([
            ...$request->validated(),
            'institute_id' => $instituteId,
        ]);

        return response()->json([
            'data' => new EvaluationCriterionResource($criterion),
        ], 201);
    }

    /**
     * Show a single evaluation criterion.
     */
    public function show(Request $request, EvaluationCriterion $evaluation): JsonResponse
    {
        $this->authorizeCriterion($request, $evaluation);

        return response()->json([
            'data' => new EvaluationCriterionResource($evaluation),
        ]);
    }

    /**
     * Update an evaluation criterion.
     */
    public function update(UpdateEvaluationCriterionRequest $request, EvaluationCriterion $evaluation): JsonResponse
    {
        $this->authorizeCriterion($request, $evaluation);
        $evaluation->update($request->validated());

        return response()->json([
            'data' => new EvaluationCriterionResource($evaluation),
        ]);
    }

    /**
     * Delete an evaluation criterion.
     */
    public function destroy(Request $request, EvaluationCriterion $evaluation): JsonResponse
    {
        $this->authorizeCriterion($request, $evaluation);

        $evaluation->delete();

        return response()->json([
            'data' => ['message' => 'Evaluation criterion deleted successfully.'],
        ]);
    }

    /**
     * The coordinator's institute id, or null if unassigned.
     */
    private function instituteId(Request $request): ?int
    {
        return $request->user()->coordinator?->institute_id;
    }

    /**
     * Ensure the criterion belongs to the coordinator's institute.
     */
    private function authorizeCriterion(Request $request, EvaluationCriterion $evaluation): void
    {
        $instituteId = $this->instituteId($request);

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        if ($evaluation->institute_id !== $instituteId) {
            abort(403, 'This criterion does not belong to your institute.');
        }
    }
}
