<?php

namespace Database\Seeders;

use App\Models\AcademicTerm;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternHteAssignment;
use App\Models\Requirement;
use App\Models\TransferRequest;
use App\Models\User;
use Database\Seeders\Concerns\ResolvesDemoAccounts;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Places the showcase interns so every placement state is reachable from a
 * fresh seed: one awaiting deployment, one mid-transfer, and one completed
 * after a reassignment.
 *
 * The seeders never go through the API controllers, so the transfer rows are
 * written directly in their final states — `accepted` with the outgoing
 * evaluation still pending, and `reassigned` with both evaluations on record.
 * Query construction mirrors what the controllers would have produced; see
 * App\Support\TransferFlow for the status bookkeeping the states imply.
 */
class InternPlacementSeeder extends Seeder
{
    use ResolvesDemoAccounts;

    /**
     * Requirements the coordinator dropped at the new host during the
     * reassignment — the college holds the MOA and contracts, not the HTE.
     *
     * @var list<string>
     */
    private const DROPPED_ON_REASSIGNMENT = ['MOA', 'Internship Contract'];

    public function run(): void
    {
        $term = $this->activeTerm();

        if ($term === null) {
            return;
        }

        foreach (Institute::orderBy('id')->get() as $institute) {
            $primaryHte = $this->hteFor($institute, 1);
            $secondaryHte = $this->hteFor($institute, 2);
            $coordinator = $this->coordinatorFor($institute);
            $instructor = $this->instructorFor($institute);

            if ($primaryHte === null || $secondaryHte === null || $coordinator === null || $instructor === null) {
                continue;
            }

            $first = $this->internFor($institute, 1, $term);
            $second = $this->internFor($institute, 2, $term);
            $third = $this->internFor($institute, 3, $term);

            if ($first !== null) {
                $this->seedAwaitingDeployment($first, $primaryHte, $term, $coordinator);
            }

            if ($second !== null) {
                $this->seedTransferAccepted($second, $secondaryHte, $term, $coordinator, $instructor);
            }

            if ($third !== null) {
                $this->seedCompletedAfterTransfer($third, $primaryHte, $secondaryHte, $term, $coordinator, $instructor);
            }
        }
    }

    /**
     * Assigned to their first host, still working through the pre-deployment
     * requirements — nothing is deployed until all of them are approved.
     */
    private function seedAwaitingDeployment(Intern $intern, Hte $hte, AcademicTerm $term, User $coordinator): void
    {
        $start = $term->start_at->copy();

        $this->ensurePlacement($intern, $hte, $term, [
            'assigned_at' => $start->copy()->addDays(4)->setTime(9, 0),
            'assigned_by' => $coordinator->id,
            'unassigned_at' => null,
            'unassigned_by' => null,
            'deployed_at' => null,
        ]);

        $intern->forceFill([
            'assigned_hte' => $hte->id,
            'ojt_status' => 'pending',
            'start_date' => null,
            'end_date' => null,
            'grade' => null,
        ])->save();
    }

    /**
     * Deployed at their host with a transfer the HTE has accepted — the intern
     * still has to rate that HTE before the coordinator can reassign.
     */
    private function seedTransferAccepted(Intern $intern, Hte $currentHte, AcademicTerm $term, User $coordinator, User $instructor): void
    {
        $start = $term->start_at->copy();

        $placement = $this->ensurePlacement($intern, $currentHte, $term, [
            'assigned_at' => $start->copy()->addDays(4)->setTime(10, 0),
            'assigned_by' => $coordinator->id,
            'deployed_at' => $start->copy()->addDays(9)->setTime(8, 0),
            'unassigned_at' => null,
            'unassigned_by' => null,
        ]);

        $transfer = $this->ensureTransfer($intern, $currentHte, $term, $instructor);

        $transfer->fill([
            'to_hte_id' => null,
            'from_placement_id' => $placement->id,
            'to_placement_id' => null,
            'status' => TransferRequest::STATUS_ACCEPTED,
            'accepted_at' => $start->copy()->addDays(68)->setTime(14, 30),
            'evaluated_at' => null,
            'reassigned_at' => null,
            'reassigned_by' => null,
        ])->save();

        $intern->forceFill([
            'assigned_hte' => $currentHte->id,
            'ojt_status' => 'ongoing',
            'start_date' => $start->copy()->addDays(9)->toDateString(),
            'end_date' => null,
            'grade' => null,
        ])->save();
    }

    /**
     * Completed at a second host after the full transfer lifecycle: accepted,
     * both evaluations answered, reassigned, deployed again. Left ungraded so
     * the instructor's grading list has something to act on.
     */
    private function seedCompletedAfterTransfer(Intern $intern, Hte $destinationHte, Hte $previousHte, AcademicTerm $term, User $coordinator, User $instructor): void
    {
        $start = $term->start_at->copy();

        $closed = $this->ensurePlacement($intern, $previousHte, $term, [
            'assigned_at' => $start->copy()->subDay()->setTime(11, 0),
            'assigned_by' => $coordinator->id,
            'deployed_at' => $start->copy()->addDays(3)->setTime(8, 0),
            'unassigned_at' => $start->copy()->addDays(55)->setTime(9, 0),
            'unassigned_by' => $coordinator->id,
        ]);

        $transfer = $this->ensureTransfer($intern, $previousHte, $term, $instructor);

        $transfer->fill([
            'to_hte_id' => $destinationHte->id,
            'from_placement_id' => $closed->id,
            'status' => TransferRequest::STATUS_REQUESTED,
        ])->save();

        $open = $this->ensurePlacement($intern, $destinationHte, $term, [
            'assigned_at' => $start->copy()->addDays(55)->setTime(10, 30),
            'assigned_by' => $coordinator->id,
            'transfer_request_id' => $transfer->id,
            'deployed_at' => $start->copy()->addDays(58)->setTime(8, 0),
            'requirements_customized_at' => $start->copy()->addDays(55)->setTime(10, 30),
            'unassigned_at' => null,
            'unassigned_by' => null,
        ]);

        $transfer->fill([
            'to_placement_id' => $open->id,
            'status' => TransferRequest::STATUS_REASSIGNED,
            'accepted_at' => $start->copy()->addDays(45)->setTime(14, 0),
            'evaluated_at' => $start->copy()->addDays(52)->setTime(16, 0),
            'reassigned_at' => $start->copy()->addDays(55)->setTime(10, 30),
            'reassigned_by' => $coordinator->id,
        ])->save();

        $intern->forceFill([
            'assigned_hte' => $destinationHte->id,
            'ojt_status' => 'completed',
            'start_date' => $start->copy()->addDays(3)->toDateString(),
            'end_date' => $start->copy()->addDays(76)->toDateString(),
            'grade' => null,
        ])->save();

        $open->requirements()->sync(
            Requirement::query()
                ->where('institute_id', $intern->institute_id)
                ->where('is_active', true)
                ->whereNotIn('name', self::DROPPED_ON_REASSIGNMENT)
                ->pluck('id')
                ->all()
        );
    }

    /**
     * One placement row per intern–HTE–term, re-runnable in place.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function ensurePlacement(Intern $intern, Hte $hte, AcademicTerm $term, array $attributes): InternHteAssignment
    {
        return InternHteAssignment::updateOrCreate(
            [
                'intern_id' => $intern->id,
                'hte_id' => $hte->id,
                'academic_year_id' => $term->id,
            ],
            $attributes
        );
    }

    /**
     * The intern's single transfer for the term, created once so its UUID —
     * the identifier notifications and pages navigate by — never rotates on
     * a re-seed.
     */
    private function ensureTransfer(Intern $intern, Hte $fromHte, AcademicTerm $term, User $instructor): TransferRequest
    {
        $transfer = TransferRequest::firstOrNew([
            'intern_id' => $intern->id,
            'academic_year_id' => $term->id,
            'from_hte_id' => $fromHte->id,
        ]);

        if ($transfer->uuid === null) {
            $transfer->uuid = (string) Str::uuid();
        }

        $transfer->fill([
            'requested_by' => $instructor->id,
            'reason' => 'The establishment can no longer provide tasks aligned with the intern\'s program.',
        ]);

        return $transfer;
    }
}
