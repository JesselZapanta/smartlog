<?php

namespace App\Support;

use App\Models\EvaluationCriterion;
use App\Models\HteEvaluation;
use App\Models\InternEvaluation;
use App\Models\InternHteAssignment;
use App\Models\TransferRequest;
use App\Models\UserNotification;

/**
 * Status bookkeeping for the HTE transfer lifecycle.
 *
 * Evaluation entry points call syncForPlacement() after saving, so an accepted
 * transfer flips to `evaluated` as soon as the outgoing HTE has evaluated the
 * intern and the intern has evaluated that HTE at the closing placement. Either
 * side can land second, so every step is idempotent.
 */
final class TransferFlow
{
    /**
     * Advance every accepted transfer whose outgoing placement is the given
     * one, if both evaluation directions are now complete.
     */
    public static function syncForPlacement(?InternHteAssignment $placement): void
    {
        if ($placement === null) {
            return;
        }

        $transfers = TransferRequest::query()
            ->where('from_placement_id', $placement->id)
            ->where('status', TransferRequest::STATUS_ACCEPTED)
            ->get();

        foreach ($transfers as $transfer) {
            self::syncEvaluatedStatus($transfer);
        }
    }

    /**
     * Flip an accepted transfer to `evaluated` when nothing is left to answer.
     */
    public static function syncEvaluatedStatus(TransferRequest $transfer): void
    {
        if ($transfer->status !== TransferRequest::STATUS_ACCEPTED) {
            return;
        }

        if (! self::evaluationsComplete($transfer)) {
            return;
        }

        $transfer->forceFill([
            'status' => TransferRequest::STATUS_EVALUATED,
            'evaluated_at' => now(),
        ])->save();

        $transfer->loadMissing(['intern.user', 'requester']);

        if ($transfer->intern?->user === null) {
            return;
        }

        UserNotification::notifyCoordinators(
            $transfer->intern->institute_id,
            'transfer_evaluated',
            'Transfer Ready for Reassignment',
            'All evaluations for '.$transfer->intern->user->full_name.' are complete. You can now assign a new HTE.',
            ['transfer_uuid' => $transfer->uuid, 'intern_uuid' => $transfer->intern->user->uuid, 'portal' => 'coordinator']
        );

        if ($transfer->requester !== null) {
            UserNotification::notify(
                $transfer->requester,
                'transfer_evaluated',
                'Transfer Ready for Reassignment',
                'All evaluations for '.$transfer->intern->user->full_name.' are complete. The coordinator can now assign a new HTE.',
                ['transfer_uuid' => $transfer->uuid, 'intern_uuid' => $transfer->intern->user->uuid, 'portal' => 'instructor']
            );
        }
    }

    /**
     * Progress of one evaluation direction at the closing placement.
     *
     * `intern` is the HTE rating the intern (intern_evaluations); `hte` is the
     * intern rating the HTE (hte_evaluations).
     *
     * @return array{total: int, answered: int, complete: bool}
     */
    public static function directionProgress(TransferRequest $transfer, string $type): array
    {
        $transfer->loadMissing('intern');

        $instituteId = $transfer->intern?->institute_id;
        $placementId = $transfer->from_placement_id;

        if ($instituteId === null || $placementId === null) {
            return ['total' => 0, 'answered' => 0, 'complete' => false];
        }

        $activeIds = EvaluationCriterion::query()
            ->where('institute_id', $instituteId)
            ->where('type', $type)
            ->where('status', 'active')
            ->pluck('id');

        $model = $type === 'intern' ? InternEvaluation::class : HteEvaluation::class;

        $answeredIds = $model::query()
            ->where('placement_id', $placementId)
            ->pluck('criterion_id');

        return [
            'total' => $activeIds->count(),
            'answered' => $answeredIds->intersect($activeIds)->count(),
            'complete' => $activeIds->diff($answeredIds)->isEmpty(),
        ];
    }

    /**
     * Both directions are complete when every active criterion of the intern's
     * institute has an answer from the closing placement. A direction with no
     * criteria vacuously counts as complete.
     */
    public static function evaluationsComplete(TransferRequest $transfer): bool
    {
        $transfer->loadMissing('intern');

        $placementId = $transfer->from_placement_id;
        $instituteId = $transfer->intern?->institute_id;

        if ($placementId === null || $instituteId === null) {
            return false;
        }

        return self::directionComplete($instituteId, 'intern', InternEvaluation::class, $placementId)
            && self::directionComplete($instituteId, 'hte', HteEvaluation::class, $placementId);
    }

    /**
     * @param  class-string<InternEvaluation|HteEvaluation>  $model
     */
    private static function directionComplete(int $instituteId, string $type, string $model, int $placementId): bool
    {
        $activeIds = EvaluationCriterion::query()
            ->where('institute_id', $instituteId)
            ->where('type', $type)
            ->where('status', 'active')
            ->pluck('id');

        if ($activeIds->isEmpty()) {
            return true;
        }

        $answeredIds = $model::query()
            ->where('placement_id', $placementId)
            ->pluck('criterion_id');

        return $activeIds->diff($answeredIds)->isEmpty();
    }
}
