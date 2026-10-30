<?php

namespace App\Support;

use App\Models\EvaluationCriterion;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\InternHteAssignment;
use Illuminate\Support\Collection;

/**
 * Per-placement evaluation view for one intern (transfer flow, plan §9.2).
 *
 * Every placement of the enrollment row is answered against the institute's
 * active criteria, each with its category averages and weighted score, plus
 * the equal-weight blended score across placements whose HTE→intern set is
 * complete. `hte_evaluations` (intern→HTE feedback) stays out of the blend.
 */
final class InternEvaluationSummary
{
    /**
     * @param  Collection<int, EvaluationCriterion>  $criteria
     * @return array{
     *     placements: array<int, array<string, mixed>>,
     *     blended_average: float|null,
     *     blended_placements: int
     * }
     */
    public static function build(Intern $intern, Collection $criteria): array
    {
        $placements = $intern->hteAssignments()
            ->with(['hte.institute', 'hte.program', 'hte.user'])
            ->orderBy('id')
            ->get();

        $responses = InternEvaluation::query()
            ->whereIn('placement_id', $placements->pluck('id'))
            ->whereIn('criterion_id', $criteria->pluck('id'))
            ->get()
            ->groupBy('placement_id');

        $built = [];
        $scores = [];

        foreach ($placements as $placement) {
            $rows = $responses->get($placement->id, collect())->keyBy('criterion_id');
            $summary = self::summarise($criteria, $rows);

            $built[] = [
                'id' => $placement->id,
                'is_current' => $placement->isActive(),
                'hte' => self::htePayload($placement),
                'assigned_at' => $placement->assigned_at,
                'deployed_at' => $placement->deployed_at,
                'unassigned_at' => $placement->unassigned_at,
                'responses' => $rows->map(fn (InternEvaluation $row): array => [
                    'rating' => $row->rating,
                    'is_na' => $row->is_na,
                ])->all(),
                'summary' => $summary,
            ];

            if ($summary['complete'] && $summary['weighted_average'] !== null) {
                $scores[] = $summary['weighted_average'];
            }
        }

        return [
            'placements' => $built,
            'blended_average' => $scores === [] ? null : round(array_sum($scores) / count($scores), 2),
            'blended_placements' => count($scores),
        ];
    }

    /**
     * Blended score and progress for one intern from batched rows.
     *
     * The list endpoints load every placement of the page's interns at once,
     * so this mirrors `build()`'s blend without a query per intern: only
     * placements whose HTE→intern set is complete feed the equal-weight blend,
     * and progress aggregates across placements so a transferred intern's
     * `total` counts the criteria once per placement.
     *
     * @param  Collection<int, int>  $placementIds  the intern's placements, oldest first
     * @param  int  $criteriaTotal  active intern criteria for the intern's institute
     * @param  array<int, int>  $answeredByPlacement  placement id => answered count
     * @param  Collection<int, Collection<int, object>>  $rowsByPlacement  placement id => per-category sum rows
     * @return array{answered: int, total: int, weighted_average: float|null}
     */
    public static function blended(
        Collection $placementIds,
        int $criteriaTotal,
        array $answeredByPlacement,
        Collection $rowsByPlacement
    ): array {
        $answered = 0;
        $scores = [];

        foreach ($placementIds as $placementId) {
            $placementAnswered = (int) ($answeredByPlacement[$placementId] ?? 0);
            $answered += $placementAnswered;

            $rows = $rowsByPlacement->get($placementId, collect());
            $categories = [];

            foreach (array_keys(PlacementEvaluationScore::WEIGHTS) as $category) {
                $row = $rows->firstWhere('category', $category);
                $average = $row === null
                    ? null
                    : PlacementEvaluationScore::average((float) $row->sum_rating, (int) $row->rated_count);

                $categories[$category] = $average === null ? null : round($average, 2);
            }

            $weighted = PlacementEvaluationScore::weighted($categories);

            if ($criteriaTotal > 0 && $placementAnswered >= $criteriaTotal && $weighted !== null) {
                $scores[] = $weighted;
            }
        }

        return [
            'answered' => $answered,
            'total' => $criteriaTotal * max($placementIds->count(), 1),
            'weighted_average' => $scores === [] ? null : round(array_sum($scores) / count($scores), 2),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function htePayload(InternHteAssignment $placement): ?array
    {
        $hte = $placement->hte;

        if ($hte === null) {
            return null;
        }

        return [
            'id' => $hte->id,
            'name' => $hte->name,
            'institute' => $hte->institute?->name,
            'program' => $hte->program?->name,
            'email' => $hte->user?->email,
            'status' => $hte->status,
        ];
    }

    /**
     * Answer counts, category averages (N/A excluded) and the weighted score
     * for one placement against the full active criterion list.
     *
     * @param  Collection<int, EvaluationCriterion>  $criteria
     * @param  Collection<int, InternEvaluation>  $rows  keyed by criterion id
     * @return array{
     *     answered: int,
     *     total: int,
     *     complete: bool,
     *     categories: array<string, float|null>,
     *     weighted_average: float|null
     * }
     */
    private static function summarise(Collection $criteria, Collection $rows): array
    {
        $categories = [];

        foreach (PlacementEvaluationScore::WEIGHTS as $category => $weight) {
            $rated = 0;
            $sum = 0.0;

            foreach ($criteria->where('category', $category) as $criterion) {
                $row = $rows->get($criterion->id);

                if ($row === null || $row->is_na) {
                    continue;
                }

                $rated++;
                $sum += (float) $row->rating;
            }

            $average = PlacementEvaluationScore::average($sum, $rated);
            $categories[$category] = $average === null ? null : round($average, 2);
        }

        $answered = $rows->count();
        $total = $criteria->count();

        return [
            'answered' => $answered,
            'total' => $total,
            'complete' => $total > 0 && $answered >= $total,
            'categories' => $categories,
            'weighted_average' => PlacementEvaluationScore::weighted($categories),
        ];
    }
}
