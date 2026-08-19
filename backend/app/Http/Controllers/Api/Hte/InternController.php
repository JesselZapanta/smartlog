<?php

namespace App\Http\Controllers\Api\Hte;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\InternDetailResource;
use App\Http\Resources\Intern\InternListResource;
use App\Models\Intern;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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
            ->whereIn('ojt_status', ['ongoing', 'hours_completed'])
            ->withCount([
                'journals',
                'journals as journals_verified_count' => fn (Builder $builder) => $builder->where('status', 'verified'),
                'journals as journals_flagged_count' => fn (Builder $builder) => $builder->whereIn('status', ['flagged', 'rejected']),
                'journals as journals_pending_count' => fn (Builder $builder) => $builder->where('status', 'pending'),
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
     * Mark the intern's OJT hours as completed once they meet the required hours.
     * Sets ojt_status to hours_completed and end_date to today.
     */
    public function completeHours(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);

        if ($intern->ojt_status !== 'ongoing') {
            throw ValidationException::withMessages([
                'ojt_status' => ['This intern has not been deployed or has already completed their OJT hours.'],
            ]);
        }

        $required = $intern->requiredHours();

        if ($required === null || $intern->earnedMinutes() < $required * 60) {
            throw ValidationException::withMessages([
                'hours' => ['The intern has not yet met the required OJT hours.'],
            ]);
        }

        $endDate = now()->toDateString();

        $intern->forceFill([
            'ojt_status' => 'hours_completed',
            'end_date' => $endDate,
        ])->save();

        UserNotification::notify(
            $user,
            'intern_hours_completed',
            'OJT hours completed',
            "Congratulations! You have completed your required OJT hours as of {$endDate}.",
            ['uuid' => $user->uuid],
        );

        return response()->json([
            'data' => [
                'message' => $intern->user->full_name.' has completed their OJT hours.',
                'ojt_status' => 'hours_completed',
                'end_date' => $endDate,
            ],
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
