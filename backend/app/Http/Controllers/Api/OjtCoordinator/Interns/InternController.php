<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Interns;

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
     * View-only list of approved interns for the coordinator's institute.
     */
    public function index(Request $request): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;

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

        $query = Intern::with(['user', 'institute', 'program', 'academicYear'])
            ->where('institute_id', $instituteId)
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
     * View-only detail for an approved intern of the coordinator's institute.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);

        $intern->loadMissing(['user.location', 'program', 'institute', 'academicYear', 'reviewer']);

        return response()->json([
            'data' => new InternDetailResource($intern),
        ]);
    }

    /**
     * Ensure the intern is approved and belongs to the coordinator's institute.
     */
    private function authorizeIntern(Request $request, User $user): Intern
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        $intern = $user->intern;

        if (! $intern) {
            abort(404, 'This user has no intern record.');
        }

        if ($intern->institute_id !== $instituteId || $intern->status !== 'approved') {
            abort(403, 'This intern does not belong to your institute.');
        }

        return $intern;
    }
}
