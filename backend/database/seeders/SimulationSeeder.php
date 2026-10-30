<?php

namespace Database\Seeders;

use App\Models\AcademicTerm;
use App\Models\DailyJournal;
use App\Models\EvaluationCriterion;
use App\Models\Hte;
use App\Models\HteEvaluation;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\InternHteAssignment;
use App\Models\Issue;
use App\Models\JournalPhoto;
use App\Models\Location;
use App\Models\OjtEnrollment;
use App\Models\OjtEnrollmentDocument;
use App\Models\PhotoDtr;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Models\TransferRequest;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\Concerns\ResolvesDemoAccounts;
use Database\Seeders\Concerns\WritesDemoFiles;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * A past-term simulation cohort layered over the showcase seeders.
 *
 * UserSeeder supplies ten accounts per institute for the active term. This
 * seeder adds eight more per institute in the previous semester, which makes
 * eighteen interns per institute across two terms. The past cohort is where
 * the finished states live: passed, failed, ungraded, and hours-completed
 * internships, each with a realistic paper trail.
 *
 * Every completed intern gets a checked photo DTR and a journal for each
 * working day, stopping exactly at the declared OJT hours. Failed interns stop
 * short and carry flagged, rejected, and pending rows. Two interns per
 * institute went through a transfer, so both placements carry requirement
 * submissions and evaluation answers. The active term's mid-transfer and
 * completed-after-transfer showcase interns also get full monitoring histories
 * split across their old and new hosts.
 */
class SimulationSeeder extends Seeder
{
    use ResolvesDemoAccounts;
    use WritesDemoFiles;

    private const PRIOR_TERM_CODE = '252';

    private const COHORT_SIZE = 8;

    private const OJT_HOURS = 486;

    private const FAILED_HOURS = 304;

    private const PHOTO = 'photo-dtr/demo/placeholder.png';

    private const JOURNAL_PHOTO = 'journal-photos/demo/placeholder.png';

    /**
     * One outcome per cohort position. `htes` holds 1-based indexes into the
     * institute's five partner establishments; two entries mean a transfer.
     *
     * @var array<int, array{kind: string, htes: array<int, int>}>
     */
    private const PROFILES = [
        1 => ['kind' => 'passed', 'htes' => [3]],
        2 => ['kind' => 'passed', 'htes' => [1, 2]],
        3 => ['kind' => 'passed', 'htes' => [4]],
        4 => ['kind' => 'failed', 'htes' => [5]],
        5 => ['kind' => 'ungraded', 'htes' => [2]],
        6 => ['kind' => 'failed', 'htes' => [3, 4]],
        7 => ['kind' => 'hours_completed', 'htes' => [5]],
        8 => ['kind' => 'ungraded', 'htes' => [1]],
    ];

    private const FIRST_NAMES = [
        'Liza', 'Marc', 'Jonah', 'Paolo', 'Grace',
        'Rico', 'Mika', 'Aldrin', 'Trisha', 'Noel',
    ];

    private const LAST_NAMES = [
        'Salazar', 'Domingo', 'Navarro', 'Padilla', 'Bautista',
        'Mercado', 'Rosales', 'Ocampo', 'Valdez', 'Chavez',
    ];

    private const BARANGAYS = [
        'Mantic', 'Santa Isabel', 'Baliwagan', 'Mauswagon',
        'Labuyo', 'Sicot', 'Huyohoy', 'Silanga',
    ];

    /**
     * @var array<int, array{fathers_name: string, fathers_occupation: string, mothers_name: string, mothers_occupation: string}>
     */
    private const FAMILIES = [
        ['fathers_name' => 'Rogelio Salazar', 'fathers_occupation' => 'Farmer', 'mothers_name' => 'Estrella Salazar', 'mothers_occupation' => 'Teacher'],
        ['fathers_name' => 'Benigno Domingo', 'fathers_occupation' => 'Fisherman', 'mothers_name' => 'Perla Domingo', 'mothers_occupation' => 'Housewife'],
        ['fathers_name' => 'Ramon Navarro', 'fathers_occupation' => 'Driver', 'mothers_name' => 'Ligaya Navarro', 'mothers_occupation' => 'Vendor'],
        ['fathers_name' => 'Arturo Padilla', 'fathers_occupation' => 'Carpenter', 'mothers_name' => 'Nena Padilla', 'mothers_occupation' => 'Seamstress'],
        ['fathers_name' => 'Efren Bautista', 'fathers_occupation' => 'Farmer', 'mothers_name' => 'Celia Bautista', 'mothers_occupation' => 'Teacher'],
        ['fathers_name' => 'Danilo Mercado', 'fathers_occupation' => 'Barangay Kagawad', 'mothers_name' => 'Fely Mercado', 'mothers_occupation' => 'Housewife'],
        ['fathers_name' => 'Ricardo Rosales', 'fathers_occupation' => 'Electrician', 'mothers_name' => 'Minda Rosales', 'mothers_occupation' => 'Vendor'],
        ['fathers_name' => 'Felipe Ocampo', 'fathers_occupation' => 'Fisherman', 'mothers_name' => 'Lorna Ocampo', 'mothers_occupation' => 'Teacher'],
    ];

    /**
     * Daily tasks per institute, used for journal titles and bodies.
     *
     * @var array<string, array<int, string>>
     */
    private const JOURNAL_TOPICS = [
        'ite' => [
            'assisted the cooperating teacher with lesson delivery',
            'prepared instructional materials for the class',
            'checked learner outputs and recorded scores',
            'observed classroom management techniques',
            'facilitated a small-group learning activity',
            'recorded attendance and updated class records',
            'assisted learners during a remedial session',
            'organized teaching materials and classroom displays',
        ],
        'ibfs' => [
            'processed client documents and routed them to the responsible office',
            'assisted walk-in clients with their inquiries',
            'encoded records into the office database',
            'prepared financial reports and supporting schedules',
            'organized office files and maintained the records room',
            'monitored supply inventory and prepared requisitions',
            'assisted with payroll documentation',
            'responded to client inquiries over the phone and email',
        ],
        'ics' => [
            'developed a module for the assigned system',
            'provided technical support to office users',
            'repaired and maintained computer hardware',
            'documented the features of the assigned system',
            'tested application functions and logged defects',
            'maintained network equipment and cabling',
            'assisted users with software installation and setup',
            'organized the technical documentation repository',
        ],
        'icje' => [
            'assisted with patrol operations and crowd control',
            'processed incident reports and blotter entries',
            'observed safety and security protocols',
            'organized case records and evidence logs',
            'assisted with traffic management along the city route',
            'monitored security procedures at the station',
            'documented daily operational activities',
            'supported a community safety awareness program',
        ],
        'ihs' => [
            'assisted with prenatal checkups and consultations',
            'recorded vital signs and updated patient charts',
            'provided health education to mothers and caregivers',
            'organized patient records at the health station',
            'assisted with immunization and nutrition activities',
            'monitored maternal health cases during home visits',
            'supported a community health program',
            'prepared clinical supplies for the day',
        ],
        'ias' => [
            'drafted communication materials for an office campaign',
            'organized a community extension activity',
            'documented research notes and interview transcripts',
            'assisted with a public information campaign',
            'transcribed interview notes for the research team',
            'prepared activity reports and documentation',
            'supported an extension program in a partner barangay',
            'organized archival records and reference materials',
        ],
    ];

    public function run(): void
    {
        $activeTerm = $this->activeTerm();
        $priorTerm = AcademicTerm::query()->where('code', self::PRIOR_TERM_CODE)->first();

        if ($priorTerm === null) {
            return;
        }

        $photo = $this->putDemoImage(self::PHOTO);
        $journalPhoto = $this->putDemoImage(self::JOURNAL_PHOTO);

        foreach (Institute::query()->orderBy('id')->get() as $institute) {
            $coordinator = $this->coordinatorFor($institute);
            $instructor = $this->instructorFor($institute);
            $htes = Hte::query()
                ->where('institute_id', $institute->id)
                ->orderBy('id')
                ->get()
                ->values();

            $programs = $institute->programs()->orderBy('id')->pluck('id');

            if ($coordinator === null || $instructor === null || $htes->count() < 5 || $programs->isEmpty()) {
                continue;
            }

            $internCriteria = $this->activeCriteria($institute, 'intern');
            $hteCriteria = $this->activeCriteria($institute, 'hte');

            $this->seedPriorCohort([
                'institute' => $institute,
                'programs' => $programs,
                'coordinator' => $coordinator,
                'instructor' => $instructor,
                'htes' => $htes,
                'term' => $priorTerm,
                'intern_criteria' => $internCriteria,
                'hte_criteria' => $hteCriteria,
                'photo' => $photo,
                'journal_photo' => $journalPhoto,
            ]);

            if ($activeTerm !== null) {
                $this->seedOngoingMonitoring($institute, $instructor, $activeTerm, $photo, $journalPhoto);
                $this->seedCompletedMonitoring($institute, $instructor, $activeTerm, $photo, $journalPhoto);
            }
        }
    }

    /**
     * @param  array{
     *     institute: Institute,
     *     programs: Collection<int, int>,
     *     coordinator: User,
     *     instructor: User,
     *     htes: Collection<int, Hte>,
     *     term: AcademicTerm,
     *     intern_criteria: Collection<int, EvaluationCriterion>,
     *     hte_criteria: Collection<int, EvaluationCriterion>,
     *     photo: string,
     *     journal_photo: string
     * }  $context
     */
    private function seedPriorCohort(array $context): void
    {
        $institute = $context['institute'];
        $term = $context['term'];
        $baseStart = CarbonImmutable::parse($term->start_at)->addDays(4);
        $hteUserIds = $context['htes']->pluck('user_id', 'id')->all();

        for ($slot = 1; $slot <= self::COHORT_SIZE; $slot++) {
            $profile = self::PROFILES[$slot];
            $kind = $profile['kind'];
            $start = $this->nextWeekday($baseStart->addDays(($slot - 1) % 3));
            $programId = $context['programs'][($slot - 1) % $context['programs']->count()];

            $user = $this->seedPriorUser($institute, $slot);

            $intern = $this->seedPriorIntern(
                $user,
                $institute,
                $programId,
                $term,
                $context['coordinator'],
                $context['instructor'],
                $start,
                $slot,
            );

            $enrollment = $this->seedPriorEnrollment($intern, $term, $context['coordinator']);
            $this->seedEnrollmentDocuments($enrollment);

            $placementData = $this->seedPriorPlacements(
                $intern,
                $institute,
                $term,
                $profile,
                $context['htes'],
                $context['coordinator'],
                $context['instructor'],
                $start,
            );

            $this->seedPriorRequirements(
                $intern,
                $placementData['placements'],
                $context['coordinator'],
                $kind,
            );

            foreach ($placementData['placements'] as $placement) {
                $base = match ($kind) {
                    'passed' => $placement->isActive() ? 5 : 4,
                    'failed' => 2,
                    default => 4,
                };

                $this->seedEvaluations(
                    $intern,
                    $placement,
                    $context['intern_criteria'],
                    $context['hte_criteria'],
                    $base,
                );
            }

            $this->seedMonitoring(
                $intern,
                $placementData,
                $kind,
                $context['institute'],
                $context['instructor']->id,
                $hteUserIds,
                $context['photo'],
                $context['journal_photo'],
            );

            $intern->forceFill([
                'assigned_hte' => $placementData['last_placement']->hte_id,
                'ojt_status' => $kind === 'hours_completed' ? 'hours_completed' : 'completed',
                'grade' => match ($kind) {
                    'passed' => 'Passed',
                    'failed' => 'Failed',
                    default => null,
                },
                'start_date' => $placementData['first_date']->toDateString(),
                'end_date' => $placementData['last_date']->toDateString(),
            ])->save();

            if ($slot === 1) {
                $this->seedIssue(
                    $intern,
                    $placementData['last_placement']->hte_id,
                    'intern',
                    'The initial orientation did not cover the tools and accounts needed for the assigned tasks.',
                    'The HTE scheduled a follow-up orientation and provided the missing access.',
                    'Include a written onboarding checklist for every new intern.',
                    'resolve',
                );
            }

            if ($slot === 4) {
                $this->seedIssue(
                    $intern,
                    $placementData['last_placement']->hte_id,
                    'hte',
                    'The intern frequently arrived late and missed several required journal entries.',
                    null,
                    null,
                    'pending',
                );
            }
        }
    }

    private function seedPriorUser(Institute $institute, int $slot): User
    {
        $email = 'intern.'.$this->slugFor($institute).'.p'.$slot.'@smartlog.test';

        $user = User::firstOrNew(['email' => $email]);
        $user->uuid ??= (string) Str::uuid();
        $user->fill([
            'firstname' => self::FIRST_NAMES[($institute->id + $slot - 1) % count(self::FIRST_NAMES)],
            'middlename' => null,
            'lastname' => self::LAST_NAMES[(($slot - 1) * 3 + $institute->id) % count(self::LAST_NAMES)],
            'extension' => null,
            'contact_number' => '0918'.str_pad((string) (4000000 + $institute->id * 1000 + $slot * 37), 7, '0', STR_PAD_LEFT),
            'profile_picture' => null,
            'role' => 'intern',
            'email_verified_at' => now(),
            'password' => 'password',
        ])->save();

        Location::updateOrCreate(
            ['user_id' => $user->id],
            [
                'region' => '10',
                'province' => 'Misamis Occidental',
                'city_municipality' => 'Tangub City',
                'barangay' => self::BARANGAYS[($slot - 1) % count(self::BARANGAYS)],
                'status' => 'active',
            ]
        );

        return $user;
    }

    private function seedPriorIntern(
        User $user,
        Institute $institute,
        int $programId,
        AcademicTerm $term,
        User $coordinator,
        User $instructor,
        CarbonImmutable $start,
        int $slot,
    ): Intern {
        $family = self::FAMILIES[($slot - 1) % count(self::FAMILIES)];
        $barangay = self::BARANGAYS[($slot - 1) % count(self::BARANGAYS)];

        return Intern::updateOrCreate(
            [
                'user_id' => $user->id,
                'academic_year_id' => $term->id,
            ],
            [
                'institute_id' => $institute->id,
                'program_id' => $programId,
                'date_of_birth' => $start->subYears(20 + ($slot % 3))->subDays($slot * 13)->format('Y-m-d'),
                'place_of_birth' => 'Tangub City, Misamis Occidental',
                ...$family,
                'fathers_contact' => '0918'.str_pad((string) (5000000 + $slot * 19), 7, '0', STR_PAD_LEFT),
                'mothers_contact' => '0918'.str_pad((string) (6000000 + $slot * 19), 7, '0', STR_PAD_LEFT),
                'parents_guardian_address' => 'Brgy. '.$barangay.', Tangub City',
                'practicum_instructor' => $instructor->full_name,
                'status' => 'approved',
                'rejection_reason' => null,
                'reviewed_by' => $coordinator->id,
                'reviewed_at' => $start->subDays(10),
                'assigned_hte' => null,
                'ojt_status' => 'pending',
                'grade' => null,
                'start_date' => null,
                'end_date' => null,
            ]
        );
    }

    private function seedPriorEnrollment(Intern $intern, AcademicTerm $term, User $coordinator): OjtEnrollment
    {
        return OjtEnrollment::updateOrCreate(
            [
                'user_id' => $intern->user_id,
                'academic_year_id' => $term->id,
            ],
            [
                'institute_id' => $intern->institute_id,
                'program_id' => $intern->program_id,
                'ojt_hours' => self::OJT_HOURS,
                'status' => 'approved',
                'rejection_reason' => null,
                'reviewed_by' => $coordinator->id,
                'reviewed_at' => CarbonImmutable::parse($term->start_at)->subDays(14),
            ]
        );
    }

    private function seedEnrollmentDocuments(OjtEnrollment $enrollment): void
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

    /**
     * @param  array{kind: string, htes: array<int, int>}  $profile
     * @param  Collection<int, Hte>  $htes
     * @return array{
     *     chunks: array<int, array{placement: InternHteAssignment, dates: array<int, CarbonImmutable>, start_index: int}>,
     *     placements: array<int, InternHteAssignment>,
     *     day_count: int,
     *     total_minutes: int,
     *     first_date: CarbonImmutable,
     *     last_date: CarbonImmutable,
     *     last_placement: InternHteAssignment
     * }
     */
    private function seedPriorPlacements(
        Intern $intern,
        Institute $institute,
        AcademicTerm $term,
        array $profile,
        Collection $htes,
        User $coordinator,
        User $instructor,
        CarbonImmutable $start,
    ): array {
        $hours = $profile['kind'] === 'failed' ? self::FAILED_HOURS : self::OJT_HOURS;
        $dayCount = $this->dayCount($hours);
        $transfer = isset($profile['htes'][1]);

        if (! $transfer) {
            $placement = $this->ensurePlacement($intern, $htes[$profile['htes'][0] - 1], $term, [
                'assigned_at' => $start->subDays(5)->setTime(9, 0),
                'assigned_by' => $coordinator->id,
                'transfer_request_id' => null,
                'deployed_at' => $start->setTime(8, 0),
                'requirements_customized_at' => null,
                'unassigned_at' => null,
                'unassigned_by' => null,
            ]);

            $dates = $this->weekdayDates($start, $dayCount);

            return [
                'chunks' => [[
                    'placement' => $placement,
                    'dates' => $dates,
                    'start_index' => 0,
                ]],
                'placements' => [$placement],
                'day_count' => $dayCount,
                'total_minutes' => $hours * 60,
                'first_date' => $dates[0],
                'last_date' => $dates[$dayCount - 1],
                'last_placement' => $placement,
            ];
        }

        $firstCount = max(1, (int) round($dayCount * 0.45));
        $firstDates = $this->weekdayDates($start, $firstCount);
        $secondStart = $this->nextWeekday($firstDates[$firstCount - 1]->addDays(3));
        $secondDates = $this->weekdayDates($secondStart, $dayCount - $firstCount);

        $fromHte = $htes[$profile['htes'][0] - 1];
        $toHte = $htes[$profile['htes'][1] - 1];
        $closedAt = $firstDates[$firstCount - 1]->setTime(17, 0);
        $reassignedAt = $secondStart->subDay()->setTime(10, 30);

        $previous = $this->ensurePlacement($intern, $fromHte, $term, [
            'assigned_at' => $start->subDays(5)->setTime(9, 0),
            'assigned_by' => $coordinator->id,
            'transfer_request_id' => null,
            'deployed_at' => $firstDates[0]->setTime(8, 0),
            'requirements_customized_at' => null,
            'unassigned_at' => $closedAt,
            'unassigned_by' => $coordinator->id,
        ]);

        $transfer = TransferRequest::firstOrNew([
            'intern_id' => $intern->id,
            'academic_year_id' => $term->id,
            'from_hte_id' => $fromHte->id,
        ]);

        $transfer->uuid ??= (string) Str::uuid();
        $transfer->fill([
            'to_hte_id' => $toHte->id,
            'from_placement_id' => $previous->id,
            'to_placement_id' => null,
            'requested_by' => $instructor->id,
            'reason' => 'The establishment can no longer provide tasks aligned with the intern\'s program.',
            'status' => TransferRequest::STATUS_REASSIGNED,
            'accepted_at' => $closedAt->addDay()->setTime(14, 0),
            'evaluated_at' => $closedAt->addDays(2)->setTime(16, 0),
            'reassigned_at' => $reassignedAt,
            'reassigned_by' => $coordinator->id,
        ])->save();

        $current = $this->ensurePlacement($intern, $toHte, $term, [
            'assigned_at' => $reassignedAt,
            'assigned_by' => $coordinator->id,
            'transfer_request_id' => $transfer->id,
            'deployed_at' => $secondDates[0]->setTime(8, 0),
            'requirements_customized_at' => $reassignedAt,
            'unassigned_at' => null,
            'unassigned_by' => null,
        ]);

        $transfer->forceFill(['to_placement_id' => $current->id])->save();

        $current->requirements()->sync(
            Requirement::query()
                ->where('institute_id', $institute->id)
                ->where('is_active', true)
                ->whereNotIn('name', ['MOA', 'Internship Contract'])
                ->pluck('id')
                ->all()
        );

        return [
            'chunks' => [
                [
                    'placement' => $previous,
                    'dates' => $firstDates,
                    'start_index' => 0,
                ],
                [
                    'placement' => $current,
                    'dates' => $secondDates,
                    'start_index' => $firstCount,
                ],
            ],
            'placements' => [$previous, $current],
            'day_count' => $dayCount,
            'total_minutes' => $hours * 60,
            'first_date' => $firstDates[0],
            'last_date' => $secondDates[count($secondDates) - 1],
            'last_placement' => $current,
        ];
    }

    /**
     * @param  array<int, InternHteAssignment>  $placements
     */
    private function seedPriorRequirements(
        Intern $intern,
        array $placements,
        User $coordinator,
        string $kind,
    ): void {
        $completed = in_array($kind, ['passed', 'ungraded'], true);
        $finalTypes = $completed ? ['pre_deployment', 'post_deployment'] : ['pre_deployment'];

        if (count($placements) === 1) {
            $this->seedRequirementSubmissions($intern, $placements[0], $finalTypes, $coordinator);

            return;
        }

        $this->seedRequirementSubmissions($intern, $placements[0], ['pre_deployment'], $coordinator);
        $this->seedRequirementSubmissions($intern, $placements[1], $finalTypes, $coordinator);
    }

    /**
     * @param  array<int, string>  $types
     */
    private function seedRequirementSubmissions(
        Intern $intern,
        InternHteAssignment $placement,
        array $types,
        User $coordinator,
    ): void {
        $placement->loadMissing('intern');
        $reviewedAt = CarbonImmutable::parse($placement->assigned_at)->addDays(3);

        foreach ($types as $type) {
            foreach ($placement->requirementList($type) as $requirement) {
                $path = "requirement-submissions/demo/{$placement->id}-{$requirement->id}.pdf";

                RequirementSubmission::updateOrCreate(
                    [
                        'placement_id' => $placement->id,
                        'requirement_id' => $requirement->id,
                    ],
                    [
                        'user_id' => $intern->user_id,
                        'intern_id' => $intern->id,
                        'file_path' => $this->putDemoPdf($path),
                        'status' => 'approved',
                        'rejection_reason' => null,
                        'reviewed_by' => $coordinator->id,
                        'reviewed_at' => $reviewedAt,
                    ]
                );
            }
        }
    }

    /**
     * @param  Collection<int, EvaluationCriterion>  $internCriteria
     * @param  Collection<int, EvaluationCriterion>  $hteCriteria
     */
    private function seedEvaluations(
        Intern $intern,
        InternHteAssignment $placement,
        Collection $internCriteria,
        Collection $hteCriteria,
        int $base,
    ): void {
        foreach ($internCriteria as $index => $criterion) {
            InternEvaluation::updateOrCreate(
                [
                    'placement_id' => $placement->id,
                    'criterion_id' => $criterion->id,
                ],
                [
                    'intern_id' => $intern->id,
                    'hte_id' => $placement->hte_id,
                    'rating' => $index % 3 === 0 ? $base : max(1, $base - 1),
                    'is_na' => false,
                ]
            );
        }

        foreach ($hteCriteria as $index => $criterion) {
            HteEvaluation::updateOrCreate(
                [
                    'placement_id' => $placement->id,
                    'criterion_id' => $criterion->id,
                ],
                [
                    'intern_id' => $intern->id,
                    'hte_id' => $placement->hte_id,
                    'rating' => $index % 3 === 0 ? $base : max(1, $base - 1),
                    'is_na' => false,
                ]
            );
        }
    }

    /**
     * @param  array{
     *     chunks: array<int, array{placement: InternHteAssignment, dates: array<int, CarbonImmutable>, start_index: int}>,
     *     day_count: int,
     *     total_minutes: int
     * }  $placementData
     * @param  array<int, int>  $hteUserIds
     */
    private function seedMonitoring(
        Intern $intern,
        array $placementData,
        string $kind,
        Institute $institute,
        int $instructorId,
        array $hteUserIds,
        string $photo,
        string $journalPhoto,
    ): void {
        foreach ($placementData['chunks'] as $chunk) {
            $placement = $chunk['placement'];
            $hteUserId = $hteUserIds[$placement->hte_id];
            $hteName = $placement->hte?->name ?? 'the host establishment';

            foreach ($chunk['dates'] as $offset => $date) {
                $index = $chunk['start_index'] + $offset;
                $minutes = $this->minutesForDay($index, $placementData['day_count'], $placementData['total_minutes']);
                $dtrStatus = $this->dtrStatus($kind, $index);
                $journalStatus = $this->journalStatus($kind, $index);

                $this->storeDtr(
                    $intern,
                    $date,
                    $this->dtrAttributes($date, $minutes, $dtrStatus, $index, $hteUserId, $instructorId, $photo)
                );

                $entry = $this->journalEntry($institute, $index, $hteName);

                $journal = $this->storeJournal($intern, $date, [
                    'title' => $entry['title'],
                    'journal' => $entry['body'],
                    'status' => $journalStatus,
                    'remarks' => $this->remarks($journalStatus, $index, 'journal'),
                ]);

                JournalPhoto::firstOrCreate([
                    'journal_id' => $journal->id,
                    'photo' => $journalPhoto,
                ]);
            }
        }
    }

    private function seedOngoingMonitoring(
        Institute $institute,
        User $instructor,
        AcademicTerm $term,
        string $photo,
        string $journalPhoto,
    ): void {
        $intern = $this->internFor($institute, 2, $term);

        if ($intern === null || $intern->ojt_status !== 'ongoing') {
            return;
        }

        $placement = $intern->activePlacement();

        if ($placement === null) {
            return;
        }

        $hteUser = User::query()->whereKey($placement->hte?->user_id)->first();

        if ($hteUser === null) {
            return;
        }

        $start = $intern->start_date
            ? CarbonImmutable::parse($intern->start_date)
            : CarbonImmutable::parse($term->start_at)->addDays(9);

        $dates = $this->weekdayDates($start, 50);
        $hteName = $placement->hte?->name ?? 'the host establishment';

        foreach ($dates as $index => $date) {
            $dtrStatus = $this->dtrStatus('ongoing', $index);
            $journalStatus = $this->journalStatus('ongoing', $index);

            $this->storeDtr(
                $intern,
                $date,
                $this->dtrAttributes($date, 480, $dtrStatus, $index, $hteUser->id, $instructor->id, $photo)
            );

            $entry = $this->journalEntry($institute, $index, $hteName);

            $journal = $this->storeJournal($intern, $date, [
                'title' => $entry['title'],
                'journal' => $entry['body'],
                'status' => $journalStatus,
                'remarks' => $this->remarks($journalStatus, $index, 'journal'),
            ]);

            JournalPhoto::firstOrCreate([
                'journal_id' => $journal->id,
                'photo' => $journalPhoto,
            ]);
        }

        $this->seedIssue(
            $intern,
            $placement->hte_id,
            'intern',
            'The shared workstation is often unavailable, which delays the assigned programming tasks.',
            null,
            null,
            'pending',
        );
    }

    /**
     * The active term's completed-after-transfer showcase intern starts at the
     * first host days into the term and finishes at the second, but that whole
     * stretch has to add up to the declared hours like any finished OJT. The
     * declared minutes are split across the working days at whichever host was
     * open on each date, so the transfer is visible in both histories.
     */
    private function seedCompletedMonitoring(
        Institute $institute,
        User $instructor,
        AcademicTerm $term,
        string $photo,
        string $journalPhoto,
    ): void {
        $intern = $this->internFor($institute, 3, $term);

        if ($intern === null || $intern->ojt_status !== 'completed') {
            return;
        }

        $placements = $intern->hteAssignments()->with('hte')->orderBy('id')->get();

        if ($placements->count() < 2 || $placements->contains(fn ($placement): bool => $placement->hte === null)) {
            return;
        }

        $requiredMinutes = ($intern->requiredHours() ?? self::OJT_HOURS) * 60;

        $start = CarbonImmutable::parse($placements[0]->deployed_at ?? $term->start_at)->startOfDay();
        $end = CarbonImmutable::parse($intern->end_date ?? $term->start_at)->startOfDay();
        $dates = $this->weekdayRange($start, $end);

        if ($dates === []) {
            return;
        }

        $lastIndex = count($dates) - 1;
        $minutesPerDay = intdiv($requiredMinutes, count($dates));
        $remainder = $requiredMinutes % count($dates);

        foreach ($dates as $index => $date) {
            $closedAt = $placements[0]->unassigned_at?->copy()->endOfDay() ?? $date->endOfDay();
            $placement = $date->lte($closedAt) ? $placements[0] : $placements[1];

            $minutes = $minutesPerDay + ($index === $lastIndex ? $remainder : 0);

            $this->storeDtr(
                $intern,
                $date,
                $this->dtrAttributes($date, $minutes, 'checked', $index, $placement->hte->user_id, $instructor->id, $photo)
            );

            $entry = $this->journalEntry($institute, $index, $placement->hte->name);

            $journal = $this->storeJournal($intern, $date, [
                'title' => $entry['title'],
                'journal' => $entry['body'],
                'status' => 'checked',
                'remarks' => null,
            ]);

            JournalPhoto::firstOrCreate([
                'journal_id' => $journal->id,
                'photo' => $journalPhoto,
            ]);
        }
    }

    /**
     * Save by calendar day rather than by exact column value: SQLite keeps the
     * time component on a cast date, so `updateOrCreate` would miss its own row
     * and trip the unique index on a re-seed.
     */
    private function storeDtr(Intern $intern, CarbonImmutable $date, array $attributes): void
    {
        $dtr = PhotoDtr::query()
            ->where('intern_id', $intern->id)
            ->whereDate('dtr_date', $date->toDateString())
            ->first() ?? new PhotoDtr([
                'intern_id' => $intern->id,
                'dtr_date' => $date->toDateString(),
            ]);

        $dtr->fill($attributes)->save();
    }

    private function storeJournal(Intern $intern, CarbonImmutable $date, array $attributes): DailyJournal
    {
        $journal = DailyJournal::query()
            ->where('intern_id', $intern->id)
            ->whereDate('date', $date->toDateString())
            ->first() ?? new DailyJournal([
                'intern_id' => $intern->id,
                'date' => $date->toDateString(),
            ]);

        $journal->fill($attributes)->save();

        return $journal;
    }

    private function ensurePlacement(
        Intern $intern,
        Hte $hte,
        AcademicTerm $term,
        array $attributes,
    ): InternHteAssignment {
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

    /**
     * @return array<int, CarbonImmutable>
     */
    private function weekdayDates(CarbonImmutable $start, int $count): array
    {
        $dates = [];
        $cursor = $start;

        while (count($dates) < $count) {
            if ($cursor->isWeekday()) {
                $dates[] = $cursor;
            }

            $cursor = $cursor->addDay();
        }

        return $dates;
    }

    /**
     * @return array<int, CarbonImmutable>
     */
    private function weekdayRange(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $dates = [];
        $cursor = $start;

        while ($cursor->lte($end)) {
            if ($cursor->isWeekday()) {
                $dates[] = $cursor;
            }

            $cursor = $cursor->addDay();
        }

        return $dates;
    }

    private function nextWeekday(CarbonImmutable $date): CarbonImmutable
    {
        $cursor = $date;

        while (! $cursor->isWeekday()) {
            $cursor = $cursor->addDay();
        }

        return $cursor;
    }

    private function dayCount(int $hours): int
    {
        $minutes = $hours * 60;
        $fullDays = intdiv($minutes, 480);
        $remainder = $minutes % 480;

        return $fullDays + ($remainder > 0 ? 1 : 0);
    }

    private function minutesForDay(int $index, int $dayCount, int $totalMinutes): int
    {
        $remainder = $totalMinutes % 480;

        if ($index === $dayCount - 1 && $remainder > 0) {
            return $remainder;
        }

        return 480;
    }

    /**
     * @return array<string, mixed>
     */
    private function dtrAttributes(
        CarbonImmutable $date,
        int $minutes,
        string $status,
        int $index,
        int $hteUserId,
        int $instructorId,
        string $photo,
    ): array {
        $amMinutes = min(240, $minutes);
        $pmMinutes = max(0, $minutes - 240);
        $verified = in_array($status, ['verified', 'checked'], true);
        $checked = $status === 'checked';

        return [
            'am_in_time' => '08:00:00',
            'am_in_photo' => $photo,
            'am_out_time' => $this->minutesToTime(8 * 60 + $amMinutes),
            'am_out_photo' => $photo,
            'pm_in_time' => $pmMinutes > 0 ? '13:00:00' : null,
            'pm_in_photo' => $pmMinutes > 0 ? $photo : null,
            'pm_out_time' => $pmMinutes > 0 ? $this->minutesToTime(13 * 60 + $pmMinutes) : null,
            'pm_out_photo' => $pmMinutes > 0 ? $photo : null,
            'status' => $status,
            'verified_by' => $verified ? $hteUserId : null,
            'verified_at' => $verified ? $date->setTime(17, 30) : null,
            'checked_by' => $checked ? $instructorId : null,
            'checked_at' => $checked ? $date->addDay()->setTime(9, 0) : null,
            'remarks' => $this->remarks($status, $index, 'dtr'),
        ];
    }

    private function minutesToTime(int $minutes): string
    {
        return sprintf('%02d:%02d:00', intdiv($minutes, 60), $minutes % 60);
    }

    private function dtrStatus(string $kind, int $index): string
    {
        if ($kind === 'failed') {
            return match (true) {
                $index % 9 === 4 => 'flagged',
                $index % 13 === 7 => 'rejected',
                $index % 11 === 9 => 'pending',
                default => 'checked',
            };
        }

        if ($kind === 'ongoing') {
            return match ($index % 12) {
                8 => 'verified',
                9 => 'flagged',
                10 => 'pending',
                11 => 'rejected',
                default => 'checked',
            };
        }

        return 'checked';
    }

    private function journalStatus(string $kind, int $index): string
    {
        if ($kind === 'failed') {
            return match ($index % 10) {
                7 => 'flagged',
                8 => 'rejected',
                9 => 'pending',
                default => 'checked',
            };
        }

        if ($kind === 'ongoing') {
            return match (($index + 2) % 12) {
                8 => 'verified',
                9 => 'flagged',
                10 => 'pending',
                11 => 'rejected',
                default => 'checked',
            };
        }

        return 'checked';
    }

    private function remarks(string $status, int $index, string $channel): ?string
    {
        if (! in_array($status, ['flagged', 'rejected'], true)) {
            return null;
        }

        $messages = $channel === 'dtr'
            ? [
                'The selfie is blurry. Please retake it at the same time entry.',
                'The logged hours do not match the approved duty schedule.',
                'The afternoon time-out is missing a valid photo.',
                'The entry was submitted twice for the same date.',
            ]
            : [
                'The entry does not describe the tasks completed in enough detail.',
                'A required supporting photo is missing from this journal.',
                'The narrative does not match the DTR entries for this date.',
                'Please add the skills applied and the output produced.',
            ];

        return $messages[$index % count($messages)];
    }

    /**
     * @return array{title: string, body: string}
     */
    private function journalEntry(Institute $institute, int $index, string $hteName): array
    {
        $topics = self::JOURNAL_TOPICS[$this->slugFor($institute)] ?? self::JOURNAL_TOPICS['ias'];
        $topic = $topics[$index % count($topics)];

        return [
            'title' => 'Daily journal - '.Str::limit($topic, 90),
            'body' => "Today I {$topic} at {$hteName}. I coordinated with my supervisor, followed the workplace procedures, and documented the tasks I completed. The activity helped me connect the theories from my coursework with the actual demands of the job.",
        ];
    }

    private function seedIssue(
        Intern $intern,
        int $hteId,
        string $type,
        string $issue,
        ?string $solution,
        ?string $recommendation,
        string $status,
    ): void {
        Issue::updateOrCreate(
            [
                'intern_id' => $intern->id,
                'type' => $type,
                'issues' => $issue,
            ],
            [
                'hte_id' => $hteId,
                'solutions' => $solution,
                'recommendations' => $recommendation,
                'status' => $status,
            ]
        );
    }
}
