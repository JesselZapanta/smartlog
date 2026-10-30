<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Transfers;

use App\Http\Controllers\Controller;
use App\Http\Requests\OjtCoordinator\ReassignTransferRequestRequest;
use App\Http\Resources\Transfers\TransferRequestResource;
use App\Models\Hte;
use App\Models\InternHteAssignment;
use App\Models\TransferRequest;
use App\Models\UserNotification;
use App\Support\TransferFlow;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransferRequestController extends Controller
{
    /**
     * The transfer queue for the coordinator's institute.
     */
    public function index(Request $request): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            return $this->emptyPage();
        }

        $query = TransferRequest::with(['intern.user', 'intern.institute', 'intern.program', 'fromHte', 'toHte', 'requester'])
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

        $academicYearId = $request->integer('academic_year_id');

        if ($academicYearId > 0) {
            $query->where('academic_year_id', $academicYearId);
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
     * Transfer detail with both evaluation progress blocks, which gate the
     * reassign action.
     */
    public function show(Request $request, TransferRequest $transferRequest): JsonResponse
    {
        $transfer = $this->authorizeTransfer($request, $transferRequest);

        $transfer->loadMissing([
            'intern.user',
            'intern.institute',
            'intern.program',
            'fromHte.user',
            'fromHte.program',
            'toHte.user',
            'toHte.program',
            'requester',
        ]);

        return response()->json([
            'data' => $this->detailPayload($request, $transfer),
        ]);
    }

    /**
     * Reassign the intern to a new HTE once both evaluations are complete.
     *
     * Closes the outgoing placement, opens the new one, resets the intern to
     * `pending` so DTR and journal entries are blocked until re-deployment,
     * and marks the transfer `reassigned` — all inside one transaction, with
     * the status re-checked under a row lock so a double submit gets a 422.
     */
    public function reassign(ReassignTransferRequestRequest $request, TransferRequest $transferRequest): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        $this->authorizeTransfer($request, $transferRequest);

        $toHteId = $request->integer('to_hte_id');
        $coordinatorId = $request->user()->id;

        [$transfer, $intern, $toHte] = DB::transaction(function () use ($transferRequest, $toHteId, $instituteId, $coordinatorId): array {
            $transfer = TransferRequest::whereKey($transferRequest->id)->lockForUpdate()->firstOrFail();

            if ($transfer->status !== TransferRequest::STATUS_EVALUATED) {
                throw ValidationException::withMessages([
                    'transfer' => ['This transfer is not ready for reassignment.'],
                ]);
            }

            $intern = $transfer->intern()->first();

            if (! $intern || ! TransferFlow::evaluationsComplete($transfer)) {
                throw ValidationException::withMessages([
                    'transfer' => ['The evaluation requirements for this transfer are not complete.'],
                ]);
            }

            $toHte = Hte::whereKey($toHteId)->first();

            if (! $toHte || (int) $toHte->institute_id !== $instituteId || $toHte->status !== 'active') {
                throw ValidationException::withMessages([
                    'to_hte_id' => ['Select an active HTE from your institute.'],
                ]);
            }

            if ((int) $toHte->id === (int) $transfer->from_hte_id) {
                throw ValidationException::withMessages([
                    'to_hte_id' => ['The intern is already assigned to this HTE.'],
                ]);
            }

            if ((int) $intern->assigned_hte !== (int) $transfer->from_hte_id) {
                throw ValidationException::withMessages([
                    'transfer' => ['The intern is no longer at the originating HTE.'],
                ]);
            }

            $fromPlacement = $transfer->fromPlacement()->first() ?? $intern->activePlacement();

            if (! $fromPlacement) {
                throw ValidationException::withMessages([
                    'transfer' => ['The transfer has no closing placement to release.'],
                ]);
            }

            $fromPlacement->forceFill([
                'unassigned_at' => now(),
                'unassigned_by' => $coordinatorId,
            ])->save();

            $placement = InternHteAssignment::create([
                'intern_id' => $intern->id,
                'hte_id' => $toHte->id,
                'academic_year_id' => $intern->academic_year_id,
                'transfer_request_id' => $transfer->id,
                'assigned_at' => now(),
                'assigned_by' => $coordinatorId,
            ]);

            $intern->forceFill([
                'assigned_hte' => $toHte->id,
                'ojt_status' => 'pending',
            ])->save();

            $transfer->forceFill([
                'status' => TransferRequest::STATUS_REASSIGNED,
                'to_hte_id' => $toHte->id,
                'to_placement_id' => $placement->id,
                'reassigned_at' => now(),
                'reassigned_by' => $coordinatorId,
            ])->save();

            return [$transfer, $intern, $toHte];
        });

        $transfer->loadMissing(['intern.user', 'fromHte.user', 'toHte.user', 'requester']);

        $internName = $intern->user?->full_name ?? 'The intern';
        $data = ['transfer_uuid' => $transfer->uuid, 'intern_uuid' => $intern->user?->uuid];

        if ($intern->user !== null) {
            UserNotification::notify(
                $intern->user,
                'transfer_reassigned',
                'Transfer Completed',
                'You have been reassigned to '.$toHte->name.'. Submit the new requirements and wait for deployment before logging DTR or journal entries.',
                $data + ['portal' => 'intern']
            );
        }

        if ($transfer->fromHte?->user !== null) {
            UserNotification::notify(
                $transfer->fromHte->user,
                'transfer_reassigned',
                'Transfer Completed',
                $internName.' has been reassigned to '.$toHte->name.'. Thank you for facilitating the transfer.',
                $data + ['portal' => 'hte']
            );
        }

        if ($transfer->toHte?->user !== null) {
            UserNotification::notify(
                $transfer->toHte->user,
                'transfer_reassigned',
                'New Intern Assigned',
                $internName.' has been reassigned to your establishment. They will report once the coordinator re-deploys them.',
                $data + ['portal' => 'hte']
            );
        }

        if ($transfer->requester !== null) {
            UserNotification::notify(
                $transfer->requester,
                'transfer_reassigned',
                'Transfer Completed',
                $internName.' has been reassigned to '.$toHte->name.'.',
                $data + ['portal' => 'instructor']
            );
        }

        $transfer->load(['intern.user', 'intern.institute', 'intern.program', 'fromHte', 'toHte', 'requester']);

        return response()->json([
            'data' => $this->detailPayload($request, $transfer),
        ]);
    }

    /**
     * Detail payload used by show() and reassign().
     *
     * @return array<string, mixed>
     */
    private function detailPayload(Request $request, TransferRequest $transfer): array
    {
        $data = (new TransferRequestResource($transfer))->resolve($request);

        $data['intern']['ojt_status'] = $transfer->intern?->ojt_status;
        $data['intern']['status'] = $transfer->intern?->status;

        $data['from_hte'] = $data['from_hte'] ? array_merge($data['from_hte'], [
            'program_id' => $transfer->fromHte?->program_id,
            'program' => $transfer->fromHte?->program?->name,
            'email' => $transfer->fromHte?->user?->email,
        ]) : null;

        $data['to_hte'] = $data['to_hte'] ? array_merge($data['to_hte'], [
            'program_id' => $transfer->toHte?->program_id,
            'program' => $transfer->toHte?->program?->name,
            'email' => $transfer->toHte?->user?->email,
        ]) : null;

        $data['evaluation_progress'] = [
            'intern' => TransferFlow::directionProgress($transfer, 'intern'),
            'hte' => TransferFlow::directionProgress($transfer, 'hte'),
        ];
        $data['ready_to_reassign'] = $transfer->status === TransferRequest::STATUS_EVALUATED;

        return $data;
    }

    private function authorizeTransfer(Request $request, TransferRequest $transferRequest): TransferRequest
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        $transferRequest->loadMissing('intern');

        if ((int) $transferRequest->intern?->institute_id !== $instituteId) {
            abort(403, 'This transfer does not belong to your institute.');
        }

        return $transferRequest;
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
