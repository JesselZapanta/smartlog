<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRequirementRequest;
use App\Http\Requests\Admin\UpdateRequirementRequest;
use App\Http\Resources\Admin\RequirementResource;
use App\Models\Requirement;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RequirementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Requirement::query()->with('institute');

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $instituteId = $request->integer('institute_id');

        if ($instituteId > 0) {
            $query->where('institute_id', $instituteId);
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

        if (! in_array($sort, ['id', 'name', 'institute_id', 'type', 'is_active'], true)) {
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

    public function store(StoreRequirementRequest $request): JsonResponse
    {
        $requirement = Requirement::create($request->validated());

        return response()->json([
            'data' => new RequirementResource($requirement->load('institute')),
        ], 201);
    }

    public function show(Requirement $requirement): JsonResponse
    {
        return response()->json([
            'data' => new RequirementResource($requirement->load('institute')),
        ]);
    }

    public function update(UpdateRequirementRequest $request, Requirement $requirement): JsonResponse
    {
        $requirement->update($request->validated());

        return response()->json([
            'data' => new RequirementResource($requirement->load('institute')),
        ]);
    }

    public function destroy(Requirement $requirement): JsonResponse
    {
        $requirement->delete();

        return response()->json([
            'data' => ['message' => 'Requirement deleted successfully.'],
        ]);
    }
}
