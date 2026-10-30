<?php

namespace Database\Seeders;

use App\Models\EvaluationCriterion;
use App\Models\HteEvaluation;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\InternHteAssignment;
use Database\Seeders\Concerns\ResolvesDemoAccounts;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Evaluation answers for the showcase interns.
 *
 * The completed intern has both directions answered at both placements — that
 * is what makes the blended final rating visible. The intern mid-transfer has
 * only the outgoing HTE's answers on record, which is exactly the step that
 * keeps the transfer short of reassignment: the intern still has to rate that
 * establishment.
 *
 * Ratings alternate around a base so the seeded scores read as filled-in
 * surveys rather than constant rows: the previous host scores low (the
 * mismatch behind the transfer), the new host scores high.
 */
class EvaluationSeeder extends Seeder
{
    use ResolvesDemoAccounts;

    public function run(): void
    {
        $term = $this->activeTerm();

        if ($term === null) {
            return;
        }

        foreach (Institute::orderBy('id')->get() as $institute) {
            $internCriteria = $this->activeCriteria($institute, 'intern');
            $hteCriteria = $this->activeCriteria($institute, 'hte');

            $second = $this->internFor($institute, 2, $term);
            $third = $this->internFor($institute, 3, $term);

            $secondPlacement = $second === null ? null : $second->activePlacement();

            if ($second !== null && $secondPlacement !== null) {
                $this->seedInternEvaluations($second, $secondPlacement, $internCriteria, base: 4);
            }

            if ($third !== null) {
                $placements = InternHteAssignment::query()
                    ->where('intern_id', $third->id)
                    ->orderBy('id')
                    ->get();

                foreach ($placements as $placement) {
                    $base = $placement->isActive() ? 5 : 3;

                    $this->seedInternEvaluations($third, $placement, $internCriteria, $base);
                    $this->seedHteEvaluations($third, $placement, $hteCriteria, $base);
                }
            }
        }
    }

    /**
     * The HTE's ratings of the intern (intern_evaluations).
     *
     * @param  Collection<int, EvaluationCriterion>  $criteria
     */
    private function seedInternEvaluations(Intern $intern, InternHteAssignment $placement, Collection $criteria, int $base): void
    {
        foreach ($criteria as $index => $criterion) {
            InternEvaluation::updateOrCreate(
                [
                    'placement_id' => $placement->id,
                    'criterion_id' => $criterion->id,
                ],
                [
                    'intern_id' => $intern->id,
                    'hte_id' => $placement->hte_id,
                    'rating' => $index % 2 === 0 ? $base : max(1, $base - 1),
                    'is_na' => false,
                ]
            );
        }
    }

    /**
     * The intern's ratings of the HTE (hte_evaluations).
     *
     * @param  Collection<int, EvaluationCriterion>  $criteria
     */
    private function seedHteEvaluations(Intern $intern, InternHteAssignment $placement, Collection $criteria, int $base): void
    {
        foreach ($criteria as $index => $criterion) {
            HteEvaluation::updateOrCreate(
                [
                    'placement_id' => $placement->id,
                    'criterion_id' => $criterion->id,
                ],
                [
                    'intern_id' => $intern->id,
                    'hte_id' => $placement->hte_id,
                    'rating' => $index % 2 === 0 ? $base : max(1, $base - 1),
                    'is_na' => false,
                ]
            );
        }
    }

    /**
     * @return Collection<int, EvaluationCriterion>
     */
    private function activeCriteria(Institute $institute, string $type): Collection
    {
        return EvaluationCriterion::query()
            ->where('institute_id', $institute->id)
            ->where('type', $type)
            ->where('status', 'active')
            ->orderBy('id')
            ->get();
    }
}
