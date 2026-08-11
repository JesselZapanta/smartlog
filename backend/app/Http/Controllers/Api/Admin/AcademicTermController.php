<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAcademicTermRequest;
use App\Http\Requests\Admin\UpdateAcademicTermRequest;
use App\Http\Resources\AcademicTermResource;
use App\Models\AcademicTerm;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AcademicTermController extends Controller
{
    public function options(): JsonResponse
    {
        return response()->json([
            'data' => AcademicTerm::orderByDesc('start_at')
                ->get(['id', 'code', 'description', 'status']),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = AcademicTerm::query();

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $status = $request->string('status')->trim()->toString();

        if ($status !== '') {
            $query->where('status', $status);
        }

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'code', 'description', 'status', 'start_at', 'end_at'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $terms = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => AcademicTermResource::collection($terms),
            'meta' => [
                'current_page' => $terms->currentPage(),
                'last_page' => $terms->lastPage(),
                'per_page' => $terms->perPage(),
                'total' => $terms->total(),
                'from' => $terms->firstItem(),
                'to' => $terms->lastItem(),
            ],
        ]);
    }

    public function store(StoreAcademicTermRequest $request): JsonResponse
    {
        $term = AcademicTerm::create($request->validated());

        return response()->json([
            'data' => new AcademicTermResource($term),
        ], 201);
    }

    public function show(AcademicTerm $academicTerm): JsonResponse
    {
        return response()->json([
            'data' => new AcademicTermResource($academicTerm),
        ]);
    }

    public function update(UpdateAcademicTermRequest $request, AcademicTerm $academicTerm): JsonResponse
    {
        $academicTerm->update($request->validated());

        return response()->json([
            'data' => new AcademicTermResource($academicTerm),
        ]);
    }

    public function destroy(AcademicTerm $academicTerm): JsonResponse
    {
        $academicTerm->delete();

        return response()->json([
            'data' => ['message' => 'Academic term deleted successfully.'],
        ]);
    }
}
