<?php

namespace App\Http\Controllers\Api\Hte;

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
     * The interns assigned to the authenticated HTE, paginated with
     * search / academic year / sort support.
     */
    public function index(Request $request): JsonResponse
    {
        $hte = $request->user()->hte;

        if (! $hte) {
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
            ->where('assigned_hte', $hte->id)
            ->where('ojt_status', 'ongoing')
            ->withCount([
                'journals',
                'journals as journals_verified_count' => fn (Builder $builder) => $builder->where('status', 'verified'),
                'journals as journals_flagged_count' => fn (Builder $builder) => $builder->where('status', 'flagged'),
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
     * View a single intern assigned to the authenticated HTE.
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
     * Ensure the intern is assigned to the authenticated HTE.
     */
    private function authorizeIntern(Request $request, User $user): Intern
    {
        $hte = $request->user()->hte;

        if (! $hte) {
            abort(403, 'Your account is not linked to an HTE profile.');
        }

        $intern = $user->intern;

        if (! $intern) {
            abort(404, 'This user has no intern record.');
        }

        if ($intern->assigned_hte !== $hte->id) {
            abort(403, 'This intern is not assigned to your establishment.');
        }

        return $intern;
    }
}
