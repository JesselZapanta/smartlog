<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreOjtHourRequest;
use App\Http\Requests\Admin\UpdateOjtHourRequest;
use App\Http\Resources\Admin\OjtHourResource;
use App\Models\OjtHour;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OjtHourController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = OjtHour::query()->with('institute');

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->whereHas('institute', function (Builder $builder) use ($search): void {
                $builder->where('name', 'like', "%{$search}%");
            });
        }

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'institute_id', 'hours'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $hours = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => OjtHourResource::collection($hours),
            'meta' => [
                'current_page' => $hours->currentPage(),
                'last_page' => $hours->lastPage(),
                'per_page' => $hours->perPage(),
                'total' => $hours->total(),
                'from' => $hours->firstItem(),
                'to' => $hours->lastItem(),
            ],
        ]);
    }

    public function store(StoreOjtHourRequest $request): JsonResponse
    {
        $ojtHour = OjtHour::create($request->validated());

        return response()->json([
            'data' => new OjtHourResource($ojtHour->load('institute')),
        ], 201);
    }

    public function show(OjtHour $ojtHour): JsonResponse
    {
        return response()->json([
            'data' => new OjtHourResource($ojtHour->load('institute')),
        ]);
    }

    public function update(UpdateOjtHourRequest $request, OjtHour $ojtHour): JsonResponse
    {
        $ojtHour->update($request->validated());

        return response()->json([
            'data' => new OjtHourResource($ojtHour->load('institute')),
        ]);
    }

    public function destroy(OjtHour $ojtHour): JsonResponse
    {
        $ojtHour->delete();

        return response()->json([
            'data' => ['message' => 'OJT hours deleted successfully.'],
        ]);
    }
}
