<?php

namespace App\Http\Controllers\Api\Hte;

use App\Http\Controllers\Controller;
use App\Http\Resources\Transfers\TransferRequestResource;
use App\Models\TransferRequest;
use App\Models\UserNotification;
use App\Support\TransferFlow;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TransferRequestController extends Controller
{
    /**
     * Incoming transfer requests for the authenticated HTE: those awaiting
     * acceptance plus accepted ones whose evaluations are still underway.
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

        $query = TransferRequest::with(['intern.user', 'intern.institute', 'intern.program', 'fromHte', 'toHte', 'requester'])
            ->where('from_hte_id', $hte->id);

        $status = $request->string('status')->trim()->toString();

        if (in_array($status, [TransferRequest::STATUS_REQUESTED, TransferRequest::STATUS_ACCEPTED, TransferRequest::STATUS_EVALUATED, TransferRequest::STATUS_REASSIGNED], true)) {
            $query->where('status', $status);
        } else {
            $query->whereIn('status', [TransferRequest::STATUS_REQUESTED, TransferRequest::STATUS_ACCEPTED]);
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

        // Resolve each row individually: passing the paginator to
        // Resource::collection() would swap its items for resource instances
        // in place, breaking the model access below.
        $data = $transfers->getCollection()
            ->map(function (TransferRequest $transfer) use ($request): array {
                $item = (new TransferRequestResource($transfer))->resolve($request);

                if ($transfer->status === TransferRequest::STATUS_ACCEPTED) {
                    $item['progress'] = [
                        'intern' => TransferFlow::directionProgress($transfer, 'intern'),
                        'hte' => TransferFlow::directionProgress($transfer, 'hte'),
                    ];
                }

                return $item;
            })
            ->values()
            ->all();

        return response()->json([
            'data' => $data,
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
     * Accept an incoming transfer request, opening the evaluation phase.
     */
    public function accept(Request $request, TransferRequest $transferRequest): JsonResponse
    {
        $hte = $request->user()->hte;

        if (! $hte || $transferRequest->from_hte_id !== $hte->id) {
            abort(403, 'This transfer does not belong to your establishment.');
        }

        if ($transferRequest->status !== TransferRequest::STATUS_REQUESTED) {
            throw ValidationException::withMessages([
                'transfer' => ['This transfer is no longer awaiting acceptance.'],
            ]);
        }

        $transferRequest->forceFill([
            'status' => TransferRequest::STATUS_ACCEPTED,
            'accepted_at' => now(),
        ])->save();

        $transferRequest->loadMissing(['intern.user', 'requester']);

        if ($transferRequest->intern?->user !== null) {
            UserNotification::notify(
                $transferRequest->intern->user,
                'transfer_accepted',
                'Transfer Accepted',
                $hte->name.' accepted the transfer. Please rate your HTE to continue the process.',
                ['transfer_uuid' => $transferRequest->uuid, 'portal' => 'intern']
            );
        }

        if ($transferRequest->requester !== null) {
            UserNotification::notify(
                $transferRequest->requester,
                'transfer_accepted',
                'Transfer Accepted',
                $hte->name.' accepted the transfer request for '.($transferRequest->intern?->user?->full_name ?? 'your intern').'.',
                ['transfer_uuid' => $transferRequest->uuid, 'portal' => 'instructor']
            );
        }

        $transferRequest->load(['intern.user', 'intern.institute', 'intern.program', 'fromHte', 'toHte', 'requester']);

        return response()->json([
            'data' => (new TransferRequestResource($transferRequest))->resolve($request),
        ]);
    }
}
