<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreInstituteRequest;
use App\Http\Requests\Admin\UpdateInstituteRequest;
use App\Http\Resources\Admin\InstituteResource;
use App\Models\Institute;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstituteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Institute::query();

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $status = $request->string('status')->trim()->toString();

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'name', 'description', 'is_active'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $institutes = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => InstituteResource::collection($institutes),
            'meta' => [
                'current_page' => $institutes->currentPage(),
                'last_page' => $institutes->lastPage(),
                'per_page' => $institutes->perPage(),
                'total' => $institutes->total(),
                'from' => $institutes->firstItem(),
                'to' => $institutes->lastItem(),
            ],
        ]);
    }

    public function store(StoreInstituteRequest $request): JsonResponse
    {
        $institute = Institute::create($request->validated());

        return response()->json([
            'data' => new InstituteResource($institute),
        ], 201);
    }

    public function show(Institute $institute): JsonResponse
    {
        return response()->json([
            'data' => new InstituteResource($institute),
        ]);
    }

    public function update(UpdateInstituteRequest $request, Institute $institute): JsonResponse
    {
        $institute->update($request->validated());

        return response()->json([
            'data' => new InstituteResource($institute),
        ]);
    }

    public function destroy(Institute $institute): JsonResponse
    {
        if ($institute->programs()->exists()
            || $institute->interns()->exists()
            || $institute->htes()->exists()
            || $institute->coordinators()->exists()
            || $institute->requirements()->exists()
            || $institute->evaluationCriteria()->exists()
            || $institute->ojtHour()->exists()
        ) {
            return response()->json([
                'message' => 'Cannot delete institute with existing records.',
                'errors' => ['institute' => ['This institute cannot be deleted because it still has related programs, interns, HTEs, or requirements. Remove or reassign them first.']],
            ], 422);
        }

        $institute->delete();

        return response()->json([
            'data' => ['message' => 'Institute deleted successfully.'],
        ]);
    }
}
