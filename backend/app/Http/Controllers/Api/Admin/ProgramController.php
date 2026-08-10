<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProgramRequest;
use App\Http\Requests\Admin\UpdateProgramRequest;
use App\Http\Resources\ProgramResource;
use App\Models\Program;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgramController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Program::query()->with('institute');

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

        $status = $request->string('status')->trim()->toString();

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'name', 'institute_id', 'is_active'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $programs = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => ProgramResource::collection($programs),
            'meta' => [
                'current_page' => $programs->currentPage(),
                'last_page' => $programs->lastPage(),
                'per_page' => $programs->perPage(),
                'total' => $programs->total(),
                'from' => $programs->firstItem(),
                'to' => $programs->lastItem(),
            ],
        ]);
    }

    public function store(StoreProgramRequest $request): JsonResponse
    {
        $program = Program::create($request->validated());

        return response()->json([
            'data' => new ProgramResource($program->load('institute')),
        ], 201);
    }

    public function show(Program $program): JsonResponse
    {
        return response()->json([
            'data' => new ProgramResource($program->load('institute')),
        ]);
    }

    public function update(UpdateProgramRequest $request, Program $program): JsonResponse
    {
        $program->update($request->validated());

        return response()->json([
            'data' => new ProgramResource($program->load('institute')),
        ]);
    }

    public function destroy(Program $program): JsonResponse
    {
        $program->delete();

        return response()->json([
            'data' => ['message' => 'Program deleted successfully.'],
        ]);
    }
}
