<?php

namespace App\Http\Controllers\Api\OjtCoordinator;

use App\Http\Controllers\Controller;
use App\Http\Requests\OjtCoordinator\RejectOjtEnrollmentRequest;
use App\Http\Requests\OjtCoordinator\UpdateOjtEnrollmentHoursRequest;
use App\Http\Resources\OjtEnrollmentResource;
use App\Models\Intern;
use App\Models\OjtEnrollment;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OjtEnrollmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            return response()->json([
                'data' => [],
                'meta' => ['current_page' => 1, 'last_page' => 1, 'per_page' => 10, 'total' => 0, 'from' => null, 'to' => null],
            ]);
        }

        $academicYearId = $request->integer('academic_year_id');
        $status = $request->string('status')->trim()->toString();
        $search = $request->string('search')->trim()->toString();

        $query = OjtEnrollment::with(['user.internEnrollments', 'academicYear', 'institute', 'program', 'documents'])
            ->where('institute_id', $instituteId)
            ->when($academicYearId > 0, fn (Builder $q) => $q->where('academic_year_id', $academicYearId))
            ->when(in_array($status, ['pending', 'approved', 'rejected'], true), fn (Builder $q) => $q->where('status', $status))
            ->when($search !== '', function (Builder $q) use ($search): void {
                $q->whereHas('user', function (Builder $user) use ($search): void {
                    $user->where('firstname', 'like', "%{$search}%")
                        ->orWhere('middlename', 'like', "%{$search}%")
                        ->orWhere('lastname', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            });

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'created_at'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);
        $enrollments = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $enrollments->through(fn (OjtEnrollment $e): OjtEnrollmentResource => new OjtEnrollmentResource($e))->values(),
            'meta' => [
                'current_page' => $enrollments->currentPage(),
                'last_page' => $enrollments->lastPage(),
                'per_page' => $enrollments->perPage(),
                'total' => $enrollments->total(),
                'from' => $enrollments->firstItem(),
                'to' => $enrollments->lastItem(),
            ],
        ]);
    }

    public function show(Request $request, OjtEnrollment $ojtEnrollment): JsonResponse
    {
        $this->authorizeInstitute($request, $ojtEnrollment);

        return response()->json([
            'data' => new OjtEnrollmentResource($ojtEnrollment->load(['user', 'academicYear', 'institute', 'program', 'documents', 'reviewer'])),
        ]);
    }

    public function updateHours(UpdateOjtEnrollmentHoursRequest $request, OjtEnrollment $ojtEnrollment): JsonResponse
    {
        $this->authorizeInstitute($request, $ojtEnrollment);

        if ($ojtEnrollment->status === 'approved') {
            throw ValidationException::withMessages([
                'ojt_hours' => 'This application was already approved, so the hours can no longer be changed.',
            ]);
        }

        $ojtEnrollment->update(['ojt_hours' => (int) $request->validated('ojt_hours')]);

        // The hours figure is part of what the intern declared, so a coordinator
        // overwriting it has to be visible to them rather than a silent change.
        UserNotification::notify(
            $ojtEnrollment->user,
            'ojt_enrollment_hours_updated',
            'OJT Hours Updated',
            'Your OJT hours for '.($ojtEnrollment->academicYear?->description ?? 'your application').' were updated to '.(int) $request->validated('ojt_hours').' hours.',
            ['ojt_enrollment_id' => $ojtEnrollment->id, 'academic_year_id' => $ojtEnrollment->academic_year_id]
        );

        return response()->json([
            'data' => new OjtEnrollmentResource($ojtEnrollment->fresh()->load(['user', 'academicYear', 'institute', 'program', 'documents'])),
            'message' => 'OJT hours updated.',
        ]);
    }

    public function approve(Request $request, OjtEnrollment $ojtEnrollment): JsonResponse
    {
        $this->authorizeInstitute($request, $ojtEnrollment);

        if ($ojtEnrollment->status === 'approved') {
            throw ValidationException::withMessages([
                'status' => 'This application was already approved.',
            ]);
        }

        // The intern may have been graded Passed after they applied, which makes
        // them ineligible to re-enrol. Re-checked here so a stale application
        // cannot be approved into a second enrollment.
        $passed = Intern::where('user_id', $ojtEnrollment->user_id)
            ->where('grade', 'Passed')
            ->orderByDesc('academic_year_id')
            ->first();

        if ($passed) {
            throw ValidationException::withMessages([
                'status' => 'This intern has already passed their OJT in '.$passed->academicYear?->description.' and cannot be enrolled again.',
            ]);
        }

        // Approval is what creates the new term's enrollment row. Every OJT
        // record (DTRs, journals, issues, evaluations) hangs off intern_id, so
        // the previous term's data stays untouched and separate.
        $existing = Intern::where('user_id', $ojtEnrollment->user_id)
            ->where('academic_year_id', $ojtEnrollment->academic_year_id)
            ->first();

        if (! $existing) {
            $previous = $ojtEnrollment->previousIntern();

            // forceFill rather than create(): `status` is deliberately not in the
            // model's fillable list, matching how the rest of the app writes it.
            (new Intern)->forceFill([
                'user_id' => $ojtEnrollment->user_id,
                'academic_year_id' => $ojtEnrollment->academic_year_id,
                'institute_id' => $ojtEnrollment->institute_id,
                'program_id' => $ojtEnrollment->program_id,
                'status' => 'approved',
                'ojt_status' => 'pending',
                'grade' => null,
                // Deliberately not carried over. The host for a new term is a fresh
                // operational decision taken on the assign page, and inheriting the old
                // one both assigned the intern without anyone choosing and hid them
                // from that page, whose assignable list filters on an unassigned HTE.
                'assigned_hte' => null,
                'date_of_birth' => $previous?->date_of_birth,
                'place_of_birth' => $previous?->place_of_birth,
                'fathers_name' => $previous?->fathers_name,
                'mothers_name' => $previous?->mothers_name,
                'parents_guardian_address' => $previous?->parents_guardian_address,
                'practicum_instructor' => $previous?->practicum_instructor,
            ])->save();
        }

        $ojtEnrollment->update([
            'status' => 'approved',
            'rejection_reason' => null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        UserNotification::notify(
            $ojtEnrollment->user,
            'ojt_enrollment_approved',
            'OJT Enrolment Approved',
            'Your OJT enrolment for '.($ojtEnrollment->academicYear?->description ?? 'the upcoming term').' has been approved.',
            ['ojt_enrollment_id' => $ojtEnrollment->id, 'academic_year_id' => $ojtEnrollment->academic_year_id]
        );

        return response()->json([
            'data' => new OjtEnrollmentResource($ojtEnrollment->fresh()->load(['user', 'academicYear', 'institute', 'program', 'documents'])),
            'message' => 'Application approved. The intern is enrolled for that term.',
        ]);
    }

    public function reject(RejectOjtEnrollmentRequest $request, OjtEnrollment $ojtEnrollment): JsonResponse
    {
        $this->authorizeInstitute($request, $ojtEnrollment);

        if ($ojtEnrollment->status === 'approved') {
            throw ValidationException::withMessages([
                'status' => 'An approved application cannot be rejected. Ask the intern to withdraw it.',
            ]);
        }

        $ojtEnrollment->update([
            'status' => 'rejected',
            'rejection_reason' => $request->validated('reason'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        UserNotification::notify(
            $ojtEnrollment->user,
            'ojt_enrollment_rejected',
            'OJT Enrolment Rejected',
            'Your OJT enrolment application was rejected. Reason: '.$request->validated('reason'),
            ['ojt_enrollment_id' => $ojtEnrollment->id, 'academic_year_id' => $ojtEnrollment->academic_year_id]
        );

        return response()->json([
            'data' => new OjtEnrollmentResource($ojtEnrollment->fresh()->load(['user', 'academicYear', 'institute', 'program', 'documents'])),
            'message' => 'Application rejected.',
        ]);
    }

    public function destroy(Request $request, OjtEnrollment $ojtEnrollment): JsonResponse
    {
        $this->authorizeInstitute($request, $ojtEnrollment);

        if ($ojtEnrollment->status === 'approved') {
            $created = Intern::where('user_id', $ojtEnrollment->user_id)
                ->where('academic_year_id', $ojtEnrollment->academic_year_id)
                ->exists();

            throw ValidationException::withMessages([
                'application' => $created
                    ? 'This application created an enrollment. Remove the intern record instead.'
                    : 'Approved applications cannot be deleted. Reject it instead.',
            ]);
        }

        $ojtEnrollment->delete();

        return response()->json([
            'data' => ['message' => 'Application removed.'],
        ]);
    }

    private function authorizeInstitute(Request $request, OjtEnrollment $enrollment): void
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        abort_if(! $instituteId, 403, 'Your account is not assigned to an institute yet.');

        abort_if((int) $enrollment->institute_id !== (int) $instituteId, 403, 'This application belongs to another institute.');
    }
}
