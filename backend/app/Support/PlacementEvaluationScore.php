<?php

namespace App\Support;

/**
 * Panel-weighted evaluation score shared by the HTE, coordinator and instructor
 * evaluation views.
 *
 * Category weights are fixed: personal characteristics 30%, work
 * characteristics 30%, job knowledge 40%. N/A answers are excluded from a
 * category's average rather than counted as zero, and a category with no rated
 * answers contributes nothing to the weighted score.
 */
final class PlacementEvaluationScore
{
    /** @var array<string, float> */
    public const WEIGHTS = [
        'personal_characteristics' => 0.3,
        'work_characteristics' => 0.3,
        'job_knowledge' => 0.4,
    ];

    /**
     * Average of rated (non-N/A) answers, or null when nothing was rated.
     */
    public static function average(?float $sumRatings, int $ratedCount): ?float
    {
        if ($ratedCount === 0) {
            return null;
        }

        return (float) $sumRatings / $ratedCount;
    }

    /**
     * Weighted score on the 1–5 rating scale, or null when every category is
     * empty.
     *
     * @param  array<string, float|null>  $categoryAverages
     */
    public static function weighted(array $categoryAverages): ?float
    {
        $hasData = false;
        $total = 0.0;

        foreach (self::WEIGHTS as $category => $weight) {
            $average = $categoryAverages[$category] ?? null;

            if ($average === null) {
                continue;
            }

            $hasData = true;
            $total += $average * $weight;
        }

        return $hasData ? round($total, 2) : null;
    }
}
