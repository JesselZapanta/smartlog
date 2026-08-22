<?php

namespace App\Http\Controllers\Api\OjtInstructor;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\InternDetailResource;
use App\Http\Resources\Intern\InternListResource;
use App\Http\Resources\Intern\PhotoDtrResource;
use App\Models\Intern;
use App\Models\PhotoDtr;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternController extends Controller
{
    /**
     * View-only list of deployed interns with server-side search, filters,
     * sorting and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Intern::with(['user', 'institute', 'program', 'academicYear'])
            ->whereIn('ojt_status', ['ongoing', 'hours_completed', 'completed'])
            ->withCount([
                'journals',
                'journals as journals_verified_count' => fn (Builder $builder) => $builder->where('status', 'verified'),
                'journals as journals_approved_count' => fn (Builder $builder) => $builder->where('status', 'checked'),
                'journals as journals_rejected_count' => fn (Builder $builder) => $builder->whereIn('status', ['flagged', 'rejected']),
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
     * View-only detail for a deployed intern.
     */
    public function show(User $user): JsonResponse
    {
        $intern = $user->intern;

        if (! $intern || ! in_array($intern->ojt_status, ['ongoing', 'hours_completed', 'completed'], true)) {
            abort(404, 'This intern is not deployed.');
        }

        $intern->loadMissing([
            'user.location',
            'program',
            'institute',
            'academicYear',
            'reviewer',
            'assignedHte.institute',
            'assignedHte.program',
        ]);

        return response()->json([
            'data' => new InternDetailResource($intern),
        ]);
    }

    public function photoDtr(User $user, Request $request): JsonResponse
    {
        $intern = $user->intern;

        if (! $intern || ! in_array($intern->ojt_status, ['ongoing', 'hours_completed', 'completed'], true)) {
            abort(404, 'This intern is not deployed.');
        }

        $records = PhotoDtr::with(['verifier', 'checker'])
            ->where('intern_id', $intern->id);

        $from = $request->string('from')->trim()->toString();
        $to = $request->string('to')->trim()->toString();

        if ($from !== '') {
            $records->whereDate('dtr_date', '>=', $from);
        }

        if ($to !== '') {
            $records->whereDate('dtr_date', '<=', $to);
        }

        $records = $records->orderByDesc('dtr_date')->limit(60)->get();

        $today = $records->first(fn (PhotoDtr $record): bool => $record->dtr_date->isToday());

        return response()->json([
            'data' => PhotoDtrResource::collection($records),
            'today' => $today ? new PhotoDtrResource($today) : null,
            'deployed' => $intern->ojt_status === 'ongoing',
            'ojt_status' => $intern->ojt_status,
        ]);
    }

    public function ojtHours(User $user): JsonResponse
    {
        $intern = $user->intern;

        abort_unless($intern, 404, 'This user has no intern record.');

        if (! in_array($intern->ojt_status, ['ongoing', 'hours_completed', 'completed'], true)) {
            abort(404, 'This intern is not deployed.');
        }

        return response()->json([
            'data' => [
                'institute' => $intern->institute?->name,
                'required_hours' => $intern->requiredHours(),
                'earned_minutes' => $intern->earnedMinutes(),
            ],
        ]);
    }
}
