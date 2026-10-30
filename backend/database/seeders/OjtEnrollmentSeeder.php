<?php

namespace Database\Seeders;

use App\Models\AcademicTerm;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\OjtEnrollment;
use App\Models\OjtEnrollmentDocument;
use Database\Seeders\Concerns\ResolvesDemoAccounts;
use Database\Seeders\Concerns\WritesDemoFiles;
use Illuminate\Database\Seeder;

/**
 * Enrollment applications for the showcase interns.
 *
 * The four approved interns per institute hold an approved application for the
 * active term — the paperwork behind their enrollment — and the first intern
 * also has a pending application for the next term, giving the coordinator's
 * enrollment review page a live queue on a fresh install.
 */
class OjtEnrollmentSeeder extends Seeder
{
    use ResolvesDemoAccounts;
    use WritesDemoFiles;

    private const OJT_HOURS = 486;

    public function run(): void
    {
        $activeTerm = $this->activeTerm();
        $nextTerm = AcademicTerm::query()->where('code', '262')->first();

        if ($activeTerm === null) {
            return;
        }

        foreach (Institute::orderBy('id')->get() as $institute) {
            $coordinator = $this->coordinatorFor($institute);

            for ($index = 1; $index <= 4; $index++) {
                $intern = $this->internFor($institute, $index, $activeTerm);

                if ($intern === null) {
                    continue;
                }

                $enrollment = $this->ensureEnrollment($intern, $activeTerm, [
                    'ojt_hours' => self::OJT_HOURS,
                    'status' => 'approved',
                    'rejection_reason' => null,
                    'reviewed_by' => $coordinator?->id,
                    'reviewed_at' => $activeTerm->start_at->copy()->subDays(7),
                ]);

                $this->seedRequiredDocuments($enrollment);

                if ($index === 1 && $nextTerm !== null) {
                    $application = $this->ensureEnrollment($intern, $nextTerm, [
                        'ojt_hours' => self::OJT_HOURS,
                        'status' => 'pending',
                        'rejection_reason' => null,
                        'reviewed_by' => null,
                        'reviewed_at' => null,
                    ]);

                    $this->seedRequiredDocuments($application);
                }
            }
        }
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function ensureEnrollment(Intern $intern, AcademicTerm $term, array $attributes): OjtEnrollment
    {
        return OjtEnrollment::updateOrCreate(
            [
                'user_id' => $intern->user_id,
                'academic_year_id' => $term->id,
            ],
            [
                'institute_id' => $intern->institute_id,
                'program_id' => $intern->program_id,
                ...$attributes,
            ]
        );
    }

    private function seedRequiredDocuments(OjtEnrollment $enrollment): void
    {
        foreach (OjtEnrollmentDocument::REQUIRED_TYPES as $type) {
            $path = "ojt-enrollment-documents/demo/{$enrollment->user_id}-{$enrollment->academic_year_id}-{$type}.pdf";

            OjtEnrollmentDocument::updateOrCreate(
                [
                    'ojt_enrollment_id' => $enrollment->id,
                    'type' => $type,
                ],
                [
                    'label' => OjtEnrollment::REQUIRED_ITEMS[$type],
                    'file_path' => $this->putDemoPdf($path),
                ]
            );
        }
    }
}
