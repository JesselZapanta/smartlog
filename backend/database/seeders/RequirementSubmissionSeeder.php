<?php

namespace Database\Seeders;

use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternHteAssignment;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Models\User;
use Database\Seeders\Concerns\ResolvesDemoAccounts;
use Database\Seeders\Concerns\WritesDemoFiles;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Requirement files for the showcase interns.
 *
 * Deployed placements end up fully approved, so the completed intern reads as
 * done at both hosts. The pre-deployment intern deliberately keeps one pending
 * and one rejected file: the coordinator's review queue and the intern's
 * resubmission flow both need something to act on before deployment is
 * possible, and the deployment gate counts only approved files.
 *
 * Every row gets a real placeholder file on the public disk — seeded
 * submissions exist to be downloaded and reviewed.
 */
class RequirementSubmissionSeeder extends Seeder
{
    use ResolvesDemoAccounts;
    use WritesDemoFiles;

    public function run(): void
    {
        $term = $this->activeTerm();

        if ($term === null) {
            return;
        }

        foreach (Institute::orderBy('id')->get() as $institute) {
            $coordinator = $this->coordinatorFor($institute);

            $first = $this->internFor($institute, 1, $term);
            $second = $this->internFor($institute, 2, $term);
            $third = $this->internFor($institute, 3, $term);

            $firstPlacement = $first === null ? null : $first->activePlacement();

            if ($first !== null && $firstPlacement !== null) {
                $this->seedPartialReview($first, $firstPlacement, $coordinator);
            }

            $secondPlacement = $second === null ? null : $second->activePlacement();

            if ($second !== null && $secondPlacement !== null) {
                $this->approvePlacement($second, $secondPlacement, $coordinator, includePostDeployment: false);
            }

            if ($third !== null) {
                foreach ($this->placementsOf($third) as $placement) {
                    // The post-deployment requirement is only ever completed at
                    // the intern's final host — the closed placement never got
                    // that far before the transfer.
                    $this->approvePlacement($third, $placement, $coordinator, includePostDeployment: $placement->isActive());
                }
            }
        }
    }

    /**
     * Approve everything the intern submitted, with the last two still moving
     * through the queue: the second-to-last pending, the last rejected.
     */
    private function seedPartialReview(Intern $intern, InternHteAssignment $placement, ?User $coordinator): void
    {
        $requirements = $placement->requirementList('pre_deployment')->values();

        foreach ($requirements as $index => $requirement) {
            $status = match ($requirements->count() - $index) {
                2 => 'pending',
                1 => 'rejected',
                default => 'approved',
            };

            $this->seedSubmission($intern, $placement, $requirement, $status, $coordinator);
        }
    }

    private function approvePlacement(Intern $intern, InternHteAssignment $placement, ?User $coordinator, bool $includePostDeployment): void
    {
        $types = $includePostDeployment ? ['pre_deployment', 'post_deployment'] : ['pre_deployment'];

        foreach ($types as $type) {
            foreach ($placement->requirementList($type) as $requirement) {
                $this->seedSubmission($intern, $placement, $requirement, 'approved', $coordinator);
            }
        }
    }

    private function seedSubmission(
        Intern $intern,
        InternHteAssignment $placement,
        Requirement $requirement,
        string $status,
        ?User $coordinator,
    ): void {
        $reviewed = $status !== 'pending';

        RequirementSubmission::updateOrCreate(
            [
                'placement_id' => $placement->id,
                'requirement_id' => $requirement->id,
            ],
            [
                'user_id' => $intern->user_id,
                'intern_id' => $intern->id,
                'file_path' => $this->putDemoPdf("requirement-submissions/demo/{$placement->id}-{$requirement->id}.pdf"),
                'status' => $status,
                'rejection_reason' => $status === 'rejected'
                    ? 'The scanned copy is blurry. Please upload a clearer file.'
                    : null,
                'reviewed_by' => $reviewed ? $coordinator?->id : null,
                'reviewed_at' => $reviewed ? $placement->assigned_at->copy()->addDays(3) : null,
            ]
        );
    }

    /**
     * @return Collection<int, InternHteAssignment>
     */
    private function placementsOf(Intern $intern): Collection
    {
        return InternHteAssignment::query()
            ->where('intern_id', $intern->id)
            ->orderBy('id')
            ->get();
    }
}
