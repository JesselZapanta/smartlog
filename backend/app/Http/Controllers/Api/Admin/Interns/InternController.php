<?php

namespace App\Http\Controllers\Api\Admin\Interns;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\InternDetailResource;
use App\Http\Resources\Intern\InternListResource;
use App\Models\Intern;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternController extends Controller
{
    /**
     * View-only list of approved interns with server-side search, filters, sorting and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Intern::with(['user', 'institute', 'program', 'academicYear'])
            ->where('status', 'approved');

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->whereHas('user', function (Builder $builder) use ($search): void {
                $builder->where('firstname', 'like', "%{$search}%")
                    ->orWhere('middlename', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $instituteId = $request->integer('institute_id');

        if ($instituteId > 0) {
            $query->where('institute_id', $instituteId);
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

        return response()->json([
            'data' => InternListResource::collection($interns),
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
     * View-only detail for a single intern.
     */
    public function show(User $user): JsonResponse
    {
        $intern = $user->intern;

        if (! $intern) {
            return response()->json([
                'data' => ['message' => 'This user has no intern record.'],
            ], 404);
        }

        $intern->loadMissing(['user.location', 'program', 'institute', 'academicYear', 'reviewer']);

        return response()->json([
            'data' => new InternDetailResource($intern),
        ]);
    }
}
