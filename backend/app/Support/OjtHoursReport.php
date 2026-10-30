<?php

namespace App\Support;

use App\Models\Intern;

/**
 * Per-intern OJT hours for the report screens.
 *
 * The reports used to publish the `ojt_hours` configuration table — one row per
 * institute. That table is gone: OJT hours are declared by the intern on the enrollment
 * application for the term they are serving, so a single institute-wide figure no longer
 * describes anything. Each row here is one intern's declared requirement for one term,
 * alongside what they have actually rendered.
 */
class OjtHoursReport
{
    /**
     * @param  int|null  $instituteId  Limit to one institute, or null for every institute.
     * @param  int|null  $targetYearId  Limit to one academic term, or null for all.
     * @return array<int, array<string, mixed>>
     */
    public static function rows(?int $instituteId = null, ?int $targetYearId = null, int $limit = 50): array
    {
        $interns = Intern::with(['user', 'program', 'institute', 'academicYear'])
            ->when($instituteId, fn ($query) => $query->where('institute_id', $instituteId))
            ->when($targetYearId, fn ($query) => $query->where('academic_year_id', $targetYearId))
            ->orderByDesc('academic_year_id')
            ->orderBy('id')
            ->limit($limit)
            ->get();

        // Warm the term applications so resolving the requirement is not a query per row.
        Intern::prefetchTermEnrollments($interns);

        return $interns->map(function (Intern $intern): array {
            $requiredHours = $intern->requiredHours();
            $earnedMinutes = $intern->earnedMinutes();

            return [
                'intern_id' => $intern->id,
                'uuid' => $intern->user->uuid,
                'student' => $intern->user->full_name,
                'email' => $intern->user->email,
                'institute' => $intern->institute?->name ?? '—',
                'program' => $intern->program?->name ?? '—',
                'academic_year' => $intern->academicYear?->description ?? '—',
                'academic_year_id' => $intern->academic_year_id,
                // Null means the intern has not applied for OJT enrollment for that term,
                // so there is nothing declared to compare against.
                'required_hours' => $requiredHours,
                'earned_hours' => (int) floor($earnedMinutes / 60),
                'ojt_status' => $intern->ojt_status,
            ];
        })->values()->all();
    }
}
