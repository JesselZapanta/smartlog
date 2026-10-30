<?php

namespace App\Support;

use App\Models\Intern;

/**
 * Keeps `intern_hte_assignments` in step with `interns.assigned_hte`.
 *
 * Callers (the coordinator's assign/unassign actions, the transfer flow, tests
 * and seeders alike) keep writing `assigned_hte` exactly as before; the
 * `Intern` model calls this on save whenever that column changed, so every code
 * path that moves an intern gets correct placement rows without having to know
 * this table exists.
 */
class InternPlacements
{
    /**
     * Close any open placement that no longer matches `assigned_hte`, and open
     * one for the host currently pointed at. A null `assigned_hte` just closes.
     *
     * When the caller already created the matching placement itself (the
     * transfer flow does, so it can stamp `transfer_request_id`), this finds an
     * open placement for that host and leaves it alone.
     */
    public static function sync(Intern $intern): void
    {
        $activeQuery = $intern->hteAssignments()->active();

        if ($intern->assigned_hte !== null
            && (clone $activeQuery)->where('hte_id', $intern->assigned_hte)->exists()
        ) {
            return;
        }

        $activeQuery->update([
            'unassigned_at' => now(),
            'unassigned_by' => auth()->id(),
        ]);

        if ($intern->assigned_hte === null) {
            return;
        }

        $intern->hteAssignments()->create([
            'hte_id' => $intern->assigned_hte,
            'academic_year_id' => $intern->academic_year_id,
            'assigned_at' => now(),
            'assigned_by' => auth()->id(),
        ]);
    }
}
