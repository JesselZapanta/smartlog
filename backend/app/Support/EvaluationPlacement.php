<?php

namespace App\Support;

use App\Models\InternHteAssignment;

/**
 * Resolves the placement an evaluation row belongs to when the caller did not
 * supply one (legacy code paths and test factories). Controllers always pass
 * the active placement explicitly, so this lookup is only a safety net.
 *
 * The open placement for the pair wins; otherwise the most recent closed one
 * is used so a former host's evaluation stays attributable after a transfer.
 */
final class EvaluationPlacement
{
    public static function resolve(?int $internId, ?int $hteId): ?int
    {
        if ($internId === null || $hteId === null) {
            return null;
        }

        return InternHteAssignment::query()
            ->where('intern_id', $internId)
            ->where('hte_id', $hteId)
            ->whereNull('unassigned_at')
            ->latest('id')
            ->value('id')
            ?? InternHteAssignment::query()
                ->where('intern_id', $internId)
                ->where('hte_id', $hteId)
                ->latest('id')
                ->value('id');
    }
}
