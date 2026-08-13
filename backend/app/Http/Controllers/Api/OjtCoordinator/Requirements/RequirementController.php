<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Requirements;

use App\Http\Controllers\Controller;
use App\Http\Requests\OjtCoordinator\CoordinatorStoreRequirementRequest;
use App\Http\Requests\OjtCoordinator\CoordinatorUpdateRequirementRequest;
use App\Http\Resources\Admin\RequirementResource;
use App\Models\Requirement;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class RequirementController extends Controller
{
    /**
     * CRUD list of requirements for the coordinator's institute.
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

        $query = Requirement::with('institute')->where('institute_id', $instituteId);

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $type = $request->string('type')->trim()->toString();

        if (in_array($type, ['pre_deployment', 'post_deployment'], true)) {
            $query->where('type', $type);
        }

        $status = $request->string('status')->trim()->toString();

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'name', 'type', 'is_active'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $requirements = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => RequirementResource::collection($requirements),
            'meta' => [
                'current_page' => $requirements->currentPage(),
                'last_page' => $requirements->lastPage(),
                'per_page' => $requirements->perPage(),
                'total' => $requirements->total(),
                'from' => $requirements->firstItem(),
                'to' => $requirements->lastItem(),
            ],
        ]);
    }

    /**
     * Create a requirement for the coordinator's institute.
     */
    public function store(CoordinatorStoreRequirementRequest $request): JsonResponse
    {
        $instituteId = $this->instituteId($request);

        if (! $instituteId) {
            throw ValidationException::withMessages([
                'institute' => ['Your account is not assigned to an institute yet.'],
            ]);
        }

        $data = $request->validated();

        $this->ensureUniqueName($instituteId, $data['name']);

        $requirement = Requirement::create([
            ...$data,
            'institute_id' => $instituteId,
        ]);

        return response()->json([
            'data' => new RequirementResource($requirement->load('institute')),
        ], 201);
    }

    /**
     * Show a requirement of the coordinator's institute.
     */
    public function show(Request $request, Requirement $requirement): JsonResponse
    {
        $this->authorizeRequirement($request, $requirement);

        return response()->json([
            'data' => new RequirementResource($requirement->load('institute')),
        ]);
    }

    /**
     * Update a requirement of the coordinator's institute.
     */
    public function update(CoordinatorUpdateRequirementRequest $request, Requirement $requirement): JsonResponse
    {
        $this->authorizeRequirement($request, $requirement);
        $data = $request->validated();

        $this->ensureUniqueName($requirement->institute_id, $data['name'], $requirement->id);

        $requirement->update($data);

        return response()->json([
            'data' => new RequirementResource($requirement->load('institute')),
        ]);
    }

    /**
     * Delete a requirement of the coordinator's institute.
     */
    public function destroy(Request $request, Requirement $requirement): JsonResponse
    {
        $this->authorizeRequirement($request, $requirement);

        $requirement->delete();

        return response()->json([
            'data' => ['message' => 'Requirement deleted successfully.'],
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
     * Ensure the requirement belongs to the coordinator's institute.
     */
    private function authorizeRequirement(Request $request, Requirement $requirement): void
    {
        $instituteId = $this->instituteId($request);

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        if ($requirement->institute_id !== $instituteId) {
            abort(403, 'This requirement does not belong to your institute.');
        }
    }

    private function ensureUniqueName(int $instituteId, string $name, ?int $ignoreId = null): void
    {
        $query = Requirement::where('institute_id', $instituteId)->where('name', $name);

        if ($ignoreId) {
            $query->where('id', '!=', $ignoreId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'name' => ['A requirement with this name already exists for your institute.'],
            ]);
        }
    }
}
