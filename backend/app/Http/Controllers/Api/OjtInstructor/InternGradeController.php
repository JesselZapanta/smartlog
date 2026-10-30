<?php

namespace App\Http\Controllers\Api\OjtInstructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\OjtInstructor\UpdateInternGradeRequest;
use App\Http\Resources\Intern\InternGradeListResource;
use App\Models\Intern;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Terminal grade for an OJT term.
 *
 * Only the OJT instructor can write this — there is deliberately no coordinator
 * or admin route. Grade is independent of `ojt_status`, and the hour
 * requirement is not enforced: the instructor sees a warning in the UI when
 * marking Passed without the hours met, and may proceed.
 */
class InternGradeController extends Controller
{
    /**
     * Every gradable enrollment in the instructor's institute, one row per
     * intern per term, with server-side search, filters, sorting and pagination.
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

        $query = Intern::with(['user', 'program', 'academicYear', 'photoDtrs'])
            ->where('institute_id', $instituteId)
            // Same window the update endpoint accepts, so the list never offers a
            // row the instructor would then be refused on.
            ->whereIn('ojt_status', ['ongoing', 'hours_completed', 'completed']);

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

        $grade = $request->string('grade')->trim()->toString();

        if ($grade === 'ungraded') {
            $query->whereNull('grade');
        } elseif (in_array($grade, ['Passed', 'Failed'], true)) {
            $query->where('grade', $grade);
        }

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'academic_year_id', 'grade'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        if ($sort === 'grade') {
            // Ungraded rows hold a NULL grade, which sorts unpredictably; push
            // them last so "desc" does not open with a page of blanks.
            $query->orderByRaw('grade IS NULL ASC')->orderBy('grade', $order);
        } else {
            $query->orderBy($sort, $order);
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        // id as the final tiebreaker keeps pagination stable when the primary
        // sort column has ties.
        $interns = $query->orderBy('id')->paginate($perPage)->withQueryString();

        // requiredHours() reads the intern's term application, so prefetch them for the
        // page rather than issuing one query per row.
        Intern::prefetchTermEnrollments(collect($interns->items()));

        return response()->json([
            'data' => InternGradeListResource::collection($interns),
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

    public function update(UpdateInternGradeRequest $request, User $user): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;
        $intern = $user->enrollmentFor($request->integer('academic_year_id') ?: null);

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        if (! $intern) {
            abort(404, 'This intern is not deployed.');
        }

        if (! in_array($intern->ojt_status, ['ongoing', 'hours_completed', 'completed'], true)) {
            abort(404, 'This intern is not deployed.');
        }

        if ($intern->institute_id !== null && (int) $intern->institute_id !== (int) $instituteId) {
            abort(403, 'This intern belongs to another institute.');
        }

        $grade = $request->validated('grade');

        if ($intern->grade === $grade) {
            return response()->json([
                'data' => ['grade' => $grade],
                'message' => 'Grade is unchanged.',
            ]);
        }

        $intern->grade = $grade;
        $intern->save();

        $requiredHours = $intern->requiredHours();
        $requiredMinutes = ($requiredHours ?? 0) * 60;

        return response()->json([
            'data' => [
                'grade' => $intern->grade,
                'academic_year_id' => $intern->academic_year_id,
                'required_hours' => $requiredHours,
                'earned_minutes' => $intern->earnedMinutes(),
                'hours_met' => $requiredMinutes > 0 && $intern->earnedMinutes() >= $requiredMinutes,
            ],
            'message' => $grade === null
                ? 'Grade cleared.'
                : "Grade set to {$grade}.",
        ]);
    }
}
