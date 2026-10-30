<?php

namespace App\Http\Controllers\Api\Intern;

use App\Http\Controllers\Controller;
use App\Models\Hte;
use App\Models\TransferRequest;
use App\Support\TransferFlow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransferRequestController extends Controller
{
    /**
     * The intern's open transfer request with their evaluation progress, which
     * drives the "rate your HTE" prompt during a transfer.
     */
    public function show(Request $request): JsonResponse
    {
        $intern = $request->user()->activeEnrollment();

        if (! $intern) {
            abort(404, 'No intern record found for this account.');
        }

        $transfer = TransferRequest::with(['fromHte', 'toHte'])
            ->where('intern_id', $intern->id)
            ->where('status', '!=', TransferRequest::STATUS_REASSIGNED)
            ->latest('id')
            ->first();

        if (! $transfer) {
            // Between reassignment and re-deployment the intern holds no open
            // transfer, but the dashboard still needs to say where they are
            // headed, so the finished one is surfaced until they are deployed.
            $transfer = $intern->ojt_status === 'pending'
                ? TransferRequest::with(['fromHte', 'toHte'])
                    ->where('intern_id', $intern->id)
                    ->where('status', TransferRequest::STATUS_REASSIGNED)
                    ->latest('id')
                    ->first()
                : null;

            if (! $transfer) {
                return response()->json(['data' => null]);
            }

            return response()->json([
                'data' => [
                    'uuid' => $transfer->uuid,
                    'status' => $transfer->status,
                    'reason' => $transfer->reason,
                    'from_hte' => $this->hteSummary($transfer->fromHte),
                    'to_hte' => $this->hteSummary($transfer->toHte),
                    'created_at' => $transfer->created_at,
                    'accepted_at' => $transfer->accepted_at,
                    'evaluated_at' => $transfer->evaluated_at,
                    'reassigned_at' => $transfer->reassigned_at,
                    'evaluation' => null,
                ],
            ]);
        }

        $progress = TransferFlow::directionProgress($transfer, 'hte');

        $canEvaluate = in_array($intern->ojt_status, ['hours_completed', 'completed'], true)
            || $transfer->status === TransferRequest::STATUS_ACCEPTED;

        return response()->json([
            'data' => [
                'uuid' => $transfer->uuid,
                'status' => $transfer->status,
                'reason' => $transfer->reason,
                'from_hte' => $this->hteSummary($transfer->fromHte),
                'to_hte' => $this->hteSummary($transfer->toHte),
                'created_at' => $transfer->created_at,
                'accepted_at' => $transfer->accepted_at,
                'evaluated_at' => $transfer->evaluated_at,
                'reassigned_at' => null,
                'evaluation' => [
                    'total' => $progress['total'],
                    'answered' => $progress['answered'],
                    'complete' => $progress['complete'],
                    'submitted' => $progress['answered'] > 0,
                    'can_evaluate' => $canEvaluate,
                ],
            ],
        ]);
    }

    /**
     * @return array{id: int, name: string}|null
     */
    private function hteSummary(?Hte $hte): ?array
    {
        return $hte ? ['id' => $hte->id, 'name' => $hte->name] : null;
    }
}
