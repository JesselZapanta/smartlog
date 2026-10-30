<?php

namespace App\Http\Controllers\Api\OjtInstructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\OjtInstructor\StoreTransferRequestRequest;
use App\Http\Resources\Transfers\TransferRequestResource;
use App\Models\AcademicTerm;
use App\Models\TransferRequest;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TransferRequestController extends Controller
{
    /**
     * The instructor's own transfer requests for their institute's interns.
     */
    public function index(Request $request): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            return $this->emptyPage();
        }

        $query = TransferRequest::with(['intern.user', 'intern.institute', 'intern.program', 'fromHte', 'toHte', 'requester'])
            ->where('requested_by', $request->user()->id)
            ->whereHas('intern', fn (Builder $builder) => $builder->where('institute_id', $instituteId));

        $status = $request->string('status')->trim()->toString();

        if (in_array($status, $this->statuses(), true)) {
            $query->where('status', $status);
        }

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->whereHas('intern.user', function (Builder $builder) use ($search): void {
                $builder->where('firstname', 'like', "%{$search}%")
                    ->orWhere('middlename', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $transfers = $query->orderByDesc('id')->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => TransferRequestResource::collection($transfers)->resolve($request),
            'meta' => [
                'current_page' => $transfers->currentPage(),
                'last_page' => $transfers->lastPage(),
                'per_page' => $transfers->perPage(),
                'total' => $transfers->total(),
                'from' => $transfers->firstItem(),
                'to' => $transfers->lastItem(),
            ],
        ]);
    }

    /**
     * Create a transfer request for one of the institute's deployed interns
     * in the active academic term.
     */
    public function store(StoreTransferRequestRequest $request): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        $internUser = User::where('uuid', $request->string('intern_uuid')->toString())->firstOrFail();

        $activeTerm = AcademicTerm::query()->where('status', 'active')->latest('start_at')->first();

        if (! $activeTerm) {
            throw ValidationException::withMessages([
                'intern_uuid' => ['There is no active academic term to transfer within.'],
            ]);
        }

        $intern = $internUser->enrollmentFor($activeTerm->id);

        if (! $intern) {
            throw ValidationException::withMessages([
                'intern_uuid' => ['This intern is not enrolled in the active academic term.'],
            ]);
        }

        if ((int) $intern->institute_id !== (int) $instituteId) {
            abort(404, 'This intern has no enrollment in your institute.');
        }

        if ($intern->status !== 'approved') {
            throw ValidationException::withMessages([
                'intern_uuid' => ['This intern registration is not approved yet.'],
            ]);
        }

        if (! in_array($intern->ojt_status, ['ongoing', 'hours_completed'], true)) {
            throw ValidationException::withMessages([
                'intern_uuid' => ['This intern is not currently deployed to an HTE.'],
            ]);
        }

        $placement = $intern->activePlacement();

        if (! $placement) {
            throw ValidationException::withMessages([
                'intern_uuid' => ['This intern has no active HTE placement.'],
            ]);
        }

        $alreadyOpen = TransferRequest::query()
            ->where('intern_id', $intern->id)
            ->where('status', '!=', TransferRequest::STATUS_REASSIGNED)
            ->exists();

        if ($alreadyOpen) {
            throw ValidationException::withMessages([
                'intern_uuid' => ['This intern already has a transfer request in progress.'],
            ]);
        }

        $transfer = TransferRequest::create([
            'intern_id' => $intern->id,
            'academic_year_id' => $intern->academic_year_id,
            'from_hte_id' => $placement->hte_id,
            'from_placement_id' => $placement->id,
            'requested_by' => $request->user()->id,
            'reason' => $request->string('reason')->trim()->toString(),
            'status' => TransferRequest::STATUS_REQUESTED,
        ]);

        $placement->loadMissing('hte.user');

        if ($placement->hte?->user !== null) {
            UserNotification::notify(
                $placement->hte->user,
                'transfer_requested',
                'Transfer Requested',
                'A transfer was requested for '.$internUser->full_name.'. Review and accept it so the intern can evaluate your establishment.',
                ['transfer_uuid' => $transfer->uuid, 'intern_uuid' => $internUser->uuid, 'portal' => 'hte']
            );
        }

        UserNotification::notifyCoordinators(
            $instituteId,
            'transfer_requested',
            'Transfer Requested',
            'A transfer was requested for '.$internUser->full_name.' from '.($placement->hte?->name ?? 'their HTE').'.',
            ['transfer_uuid' => $transfer->uuid, 'intern_uuid' => $internUser->uuid, 'portal' => 'coordinator']
        );

        $transfer->load(['intern.user', 'intern.institute', 'intern.program', 'fromHte', 'toHte', 'requester']);

        return response()->json([
            'data' => (new TransferRequestResource($transfer))->resolve($request),
        ], 201);
    }

    private function emptyPage(): JsonResponse
    {
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

    /**
     * @return list<string>
     */
    private function statuses(): array
    {
        return [
            TransferRequest::STATUS_REQUESTED,
            TransferRequest::STATUS_ACCEPTED,
            TransferRequest::STATUS_EVALUATED,
            TransferRequest::STATUS_REASSIGNED,
        ];
    }
}
