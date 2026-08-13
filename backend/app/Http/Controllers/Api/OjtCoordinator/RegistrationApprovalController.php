<?php

namespace App\Http\Controllers\Api\OjtCoordinator;

use App\Http\Controllers\Controller;
use App\Http\Requests\Intern\ResubmitRegistrationRequest;
use App\Http\Requests\OjtCoordinator\RejectRegistrationRequest;
use App\Http\Resources\Intern\InternResource;
use App\Http\Resources\LocationResource;
use App\Models\Intern;
use App\Models\User;
use App\Models\UserNotification;
use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class RegistrationApprovalController extends Controller
{
    /**
     * Server-side list of registrations for the coordinator's institute.
     * Supports search, status filter, id/created_at sorting (id desc default),
     * and pagination.
     */
    public function pending(Request $request): JsonResponse
    {
        $coordinator = $request->user();
        $instituteId = $coordinator->coordinator?->institute_id;

        $query = Intern::with(['user', 'program', 'institute']);

        if ($instituteId) {
            $query->where('institute_id', $instituteId);
        } else {
            $query->whereRaw('1 = 0');
        }

        $status = $request->string('status', 'pending')->trim()->toString();

        if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $query->where('status', $status);
        }

        $academicYearId = $request->integer('academic_year_id');

        if ($academicYearId > 0) {
            $query->where('academic_year_id', $academicYearId);
        }

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->whereHas('user', function (Builder $builder) use ($search): void {
                $builder->where('firstname', 'like', "%{$search}%")
                    ->orWhere('middlename', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
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

        $rows = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => collect($rows->items())
                ->map(fn (Intern $intern): array => $this->row($intern))
                ->values()
                ->all(),
            'meta' => [
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'per_page' => $rows->perPage(),
                'total' => $rows->total(),
                'from' => $rows->firstItem(),
                'to' => $rows->lastItem(),
            ],
        ]);
    }

    /**
     * Full registration detail for the review page.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeReview($request, $user);

        return response()->json([
            'data' => $this->detail($intern),
        ]);
    }

    /**
     * Approve an intern registration for the coordinator's institute.
     */
    public function approve(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeReview($request, $user);

        if ($intern->status === 'approved') {
            throw ValidationException::withMessages([
                'registration' => ['This registration is already approved.'],
            ]);
        }

        $intern->forceFill([
            'status' => 'approved',
            'rejection_reason' => null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        UserNotification::notify(
            $user,
            'registration_approved',
            'Registration approved',
            'Congratulations! Your OJT registration has been approved.',
            ['uuid' => $user->uuid],
        );

        return response()->json([
            'data' => $this->row($intern->refresh()),
        ]);
    }

    /**
     * Reject an intern registration for the coordinator's institute.
     */
    public function reject(RejectRegistrationRequest $request, User $user): JsonResponse
    {
        $intern = $this->authorizeReview($request, $user);

        if ($intern->status === 'approved') {
            throw ValidationException::withMessages([
                'registration' => ['An approved registration cannot be rejected.'],
            ]);
        }

        $intern->forceFill([
            'status' => 'rejected',
            'rejection_reason' => $request->validated('reason'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        UserNotification::notify(
            $user,
            'registration_rejected',
            'Registration rejected',
            'Your OJT registration was not approved. Review the reason and resubmit your details.'
                .($request->validated('reason') ? ' Reason: '.$request->validated('reason') : ''),
            ['uuid' => $user->uuid],
        );

        return response()->json([
            'data' => $this->row($intern->refresh()),
        ]);
    }

    /**
     * The authenticated intern's full registration (intern + location records).
     */
    public function myRegistration(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => [
                'intern' => $user->intern ? new InternResource($user->intern) : null,
                'location' => $user->location ? new LocationResource($user->location) : null,
                'institute' => $user->intern?->institute
                    ? ['id' => $user->intern->institute_id, 'name' => $user->intern->institute->name]
                    : null,
                'program' => $user->intern?->program
                    ? ['id' => $user->intern->program_id, 'name' => $user->intern->program->name]
                    : null,
            ],
        ]);
    }

    /**
     * Intern updates their rejected registration and submits it again.
     */
    public function resubmit(ResubmitRegistrationRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->role !== 'intern' || ! $user->intern) {
            throw ValidationException::withMessages([
                'registration' => ['Only interns with a registration can resubmit.'],
            ]);
        }

        if ($user->intern->status !== 'rejected') {
            throw ValidationException::withMessages([
                'registration' => ['Only a rejected registration can be resubmitted.'],
            ]);
        }

        $user->intern->fill($request->safe()->only([
            'institute_id',
            'program_id',
            'date_of_birth',
            'place_of_birth',
            'fathers_name',
            'fathers_occupation',
            'fathers_contact',
            'mothers_name',
            'mothers_occupation',
            'mothers_contact',
            'parents_guardian_address',
            'practicum_instructor',
        ]));

        $user->intern->forceFill([
            'status' => 'pending',
            'rejection_reason' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ])->save();

        if ($request->hasFile('cor')) {
            $oldPath = $user->intern->cor_path;
            $newPath = $request->file('cor')->store('cor', 'public');

            if ($oldPath && $oldPath !== $newPath) {
                Storage::disk('public')->delete($oldPath);
            }

            $user->intern->forceFill(['cor_path' => $newPath])->save();
        }

        $user->location()->updateOrCreate([], $request->safe()->only([
            'region',
            'province',
            'city_municipality',
            'barangay',
        ]));

        UserNotification::notifyCoordinators(
            $user->intern->institute_id,
            'registration_resubmitted',
            'Registration resubmitted',
            "{$user->full_name} resubmitted their registration for review.",
            ['uuid' => $user->uuid],
        );

        return response()->json([
            'data' => [
                'message' => 'Registration resubmitted. Your OJT coordinator will review it again.',
                'intern' => new InternResource($user->intern->refresh()),
            ],
        ]);
    }

    /**
     * Ensure the coordinator is assigned to the intern's institute.
     */
    private function authorizeReview(Request $request, User $user): Intern
    {
        $coordinator = $request->user();

        if ($coordinator->role !== 'ojt_coordinator') {
            abort(403, 'Only OJT coordinators can review registrations.');
        }

        $instituteId = $coordinator->coordinator?->institute_id;

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        $intern = $user->intern;

        if (! $intern) {
            abort(404, 'This user has no intern registration.');
        }

        if ($intern->institute_id !== $instituteId) {
            abort(403, 'This intern does not belong to your institute.');
        }

        return $intern;
    }

    /**
     * @return array<string, mixed>
     */
    private function row(Intern $intern): array
    {
        return [
            'id' => $intern->id,
            'uuid' => $intern->user->uuid,
            'full_name' => $intern->user->full_name,
            'email' => $intern->user->email,
            'program' => $intern->program?->name,
            'institute' => $intern->institute?->name,
            'status' => $intern->status,
            'rejection_reason' => $intern->rejection_reason,
            'created_at' => $intern->created_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detail(Intern $intern): array
    {
        $intern->loadMissing(['user.location', 'program', 'institute', 'academicYear', 'reviewer']);

        return [
            'id' => $intern->id,
            'uuid' => $intern->user->uuid,
            'full_name' => $intern->user->full_name,
            'email' => $intern->user->email,
            'contact_number' => $intern->user->contact_number,
            'profile_picture' => $intern->user->profile_picture,
            'program' => $intern->program?->name,
            'institute' => $intern->institute?->name,
            'academic_year' => $intern->academicYear?->description,
            'practicum_instructor' => $intern->practicum_instructor,
            'cor' => StorageUrl::url($intern->cor_path),
            'date_of_birth' => $intern->date_of_birth,
            'place_of_birth' => $intern->place_of_birth,
            'fathers_name' => $intern->fathers_name,
            'fathers_occupation' => $intern->fathers_occupation,
            'fathers_contact' => $intern->fathers_contact,
            'mothers_name' => $intern->mothers_name,
            'mothers_occupation' => $intern->mothers_occupation,
            'mothers_contact' => $intern->mothers_contact,
            'parents_guardian_address' => $intern->parents_guardian_address,
            'location' => $intern->user->location ? new LocationResource($intern->user->location) : null,
            'status' => $intern->status,
            'rejection_reason' => $intern->rejection_reason,
            'reviewed_by' => $intern->reviewer?->full_name,
            'reviewed_at' => $intern->reviewed_at,
            'created_at' => $intern->created_at,
        ];
    }
}
