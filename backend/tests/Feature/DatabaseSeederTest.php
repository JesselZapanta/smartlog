<?php

use App\Models\AcademicTerm;
use App\Models\DailyJournal;
use App\Models\Hte;
use App\Models\HteEvaluation;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\InternHteAssignment;
use App\Models\Issue;
use App\Models\OjtEnrollment;
use App\Models\OjtEnrollmentDocument;
use App\Models\PhotoDtr;
use App\Models\RequirementSubmission;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');

    $this->seed();
});

function seededInstitute(string $needle): Institute
{
    return Institute::where('name', 'like', "%{$needle}%")->firstOrFail();
}

function seededIntern(Institute $institute, string $email): Intern
{
    return Intern::whereHas('user', fn ($query) => $query->where('email', $email))
        ->where('institute_id', $institute->id)
        ->firstOrFail();
}

it('adds the upcoming term the enrollment showcase applies for', function () {
    $upcoming = AcademicTerm::where('code', '262')->first();

    expect($upcoming)->not->toBeNull()
        ->and($upcoming->description)->toBe('2ND SEM AY 2026-2027')
        ->and($upcoming->status)->toBe('inactive')
        ->and(AcademicTerm::where('code', '261')->value('status'))->toBe('active');
});

it('gives every institute five HTE partners', function () {
    expect(Hte::count())->toBe(30)
        ->and(Hte::whereHas('user', fn ($query) => $query->where('email', 'hte@smartlog.test'))->value('name'))
        ->toBe('Tangub City Central Elementary School')
        ->and(Hte::whereHas('user', fn ($query) => $query->where('email', 'hte2@smartlog.test'))->value('name'))
        ->toBe('Tangub City National High School')
        ->and(Hte::whereHas('user', fn ($query) => $query->where('email', 'hte5@smartlog.test'))->value('name'))
        ->toBe('Santa Isabel Elementary School');

    foreach (Institute::all() as $institute) {
        expect(Hte::where('institute_id', $institute->id)->count())->toBe(5);
    }
});

it('approves the first four interns per institute and keeps the rest pending', function () {
    expect(Intern::where('status', 'approved')->count())->toBe(72)
        ->and(Intern::where('status', 'pending')->count())->toBe(36);

    $ite = seededInstitute('Teacher Education');

    expect(seededIntern($ite, 'intern.ite.4@smartlog.test')->status)->toBe('approved')
        ->and(seededIntern($ite, 'intern.ite.5@smartlog.test')->status)->toBe('pending');
});

it('parks the first intern before deployment with a partial requirement review', function () {
    $ite = seededInstitute('Teacher Education');
    $intern = seededIntern($ite, 'intern@smartlog.test');

    $placement = $intern->activePlacement();

    expect($placement)->not->toBeNull()
        ->and($placement->hte_id)->toBe(Hte::where('name', 'Tangub City Central Elementary School')->value('id'))
        ->and($placement->deployed_at)->toBeNull()
        ->and($intern->assigned_hte)->toBe($placement->hte_id)
        ->and($intern->ojt_status)->toBe('pending')
        ->and($intern->academic_year_id)->toBe(AcademicTerm::where('code', '261')->value('id'));

    $submissions = RequirementSubmission::where('placement_id', $placement->id);

    expect($submissions->count())->toBe(13)
        ->and((clone $submissions)->where('status', 'approved')->count())->toBe(11)
        ->and((clone $submissions)->where('status', 'pending')->count())->toBe(1)
        ->and((clone $submissions)->where('status', 'rejected')->count())->toBe(1);

    $rejected = (clone $submissions)->where('status', 'rejected')->first();

    expect($rejected->rejection_reason)->not->toBeNull()
        ->and((clone $submissions)->where('status', 'pending')->value('reviewed_at'))->toBeNull();

    Storage::disk('public')->assertExists($rejected->file_path);
});

it('holds the second intern mid-transfer awaiting their HTE rating', function () {
    $ite = seededInstitute('Teacher Education');
    $intern = seededIntern($ite, 'intern.ite.2@smartlog.test');

    $placement = $intern->activePlacement();

    expect($placement)->not->toBeNull()
        ->and($placement->hte_id)->toBe(Hte::where('name', 'Tangub City National High School')->value('id'))
        ->and($placement->deployed_at)->not->toBeNull()
        ->and($intern->ojt_status)->toBe('ongoing');

    $transfer = TransferRequest::where('intern_id', $intern->id)->firstOrFail();

    expect($transfer->status)->toBe('accepted')
        ->and($transfer->accepted_at)->not->toBeNull()
        ->and($transfer->to_hte_id)->toBeNull()
        ->and($transfer->from_placement_id)->toBe($placement->id);

    expect(InternEvaluation::where('placement_id', $placement->id)->count())->toBe(19)
        ->and(HteEvaluation::where('placement_id', $placement->id)->count())->toBe(0);
});

it('shows the third intern completed at two hosts with blended evaluations', function () {
    $ite = seededInstitute('Teacher Education');
    $intern = seededIntern($ite, 'intern.ite.3@smartlog.test');

    $placements = InternHteAssignment::where('intern_id', $intern->id)->orderBy('id')->get();

    expect($placements)->toHaveCount(2);

    $previous = $placements[0];
    $current = $placements[1];

    expect($previous->hte_id)->toBe(Hte::where('name', 'Tangub City National High School')->value('id'))
        ->and($previous->unassigned_at)->not->toBeNull()
        ->and($previous->deployed_at)->not->toBeNull()
        ->and($current->hte_id)->toBe(Hte::where('name', 'Tangub City Central Elementary School')->value('id'))
        ->and($current->unassigned_at)->toBeNull()
        ->and($current->deployed_at)->not->toBeNull()
        ->and($current->requirements_customized_at)->not->toBeNull()
        ->and($current->requirements()->count())->toBe(12)
        ->and($intern->ojt_status)->toBe('completed')
        ->and($intern->grade)->toBeNull()
        ->and($intern->start_date?->toDateString())->toBe('2026-08-04')
        ->and($intern->end_date?->toDateString())->toBe('2026-10-16')
        ->and($intern->photoDtrs()->count())->toBe(54)
        ->and($intern->journals()->count())->toBe(54)
        ->and($intern->journals()->where('status', 'checked')->count())->toBe(54)
        ->and($intern->earnedMinutes())->toBe(486 * 60)
        ->and($intern->assigned_hte)->toBe($current->hte_id);

    $transfer = TransferRequest::where('intern_id', $intern->id)->firstOrFail();

    expect($transfer->status)->toBe('reassigned')
        ->and($transfer->evaluated_at)->not->toBeNull()
        ->and($transfer->reassigned_at)->not->toBeNull()
        ->and($transfer->from_placement_id)->toBe($previous->id)
        ->and($transfer->to_placement_id)->toBe($current->id);

    foreach ($placements as $placement) {
        expect(InternEvaluation::where('placement_id', $placement->id)->count())->toBe(19)
            ->and(HteEvaluation::where('placement_id', $placement->id)->count())->toBe(19);
    }

    expect(RequirementSubmission::where('placement_id', $previous->id)->where('status', 'approved')->count())->toBe(13)
        ->and(RequirementSubmission::where('placement_id', $current->id)->where('status', 'approved')->count())->toBe(12);
});

it('files enrollment applications with documents for the approved interns', function () {
    $ite = seededInstitute('Teacher Education');

    $active = AcademicTerm::where('code', '261')->firstOrFail();
    $upcoming = AcademicTerm::where('code', '262')->firstOrFail();

    $first = seededIntern($ite, 'intern@smartlog.test');
    $second = seededIntern($ite, 'intern.ite.2@smartlog.test');

    $approved = OjtEnrollment::where('user_id', $first->user_id)->where('academic_year_id', $active->id)->firstOrFail();
    $pending = OjtEnrollment::where('user_id', $first->user_id)->where('academic_year_id', $upcoming->id)->firstOrFail();

    expect($approved->status)->toBe('approved')
        ->and($approved->ojt_hours)->toBe(486)
        ->and($approved->reviewed_at)->not->toBeNull()
        ->and($pending->status)->toBe('pending')
        ->and($pending->reviewed_at)->toBeNull()
        ->and(OjtEnrollment::where('user_id', $second->user_id)->count())->toBe(1);

    foreach ([$approved, $pending] as $enrollment) {
        $documents = OjtEnrollmentDocument::where('ojt_enrollment_id', $enrollment->id)->get();

        expect($documents)->toHaveCount(2)
            ->and($documents->pluck('type')->sort()->values()->all())->toBe(['cor', 'curriculum'])
            ->and($documents->pluck('label')->sort()->values()->all())->toBe(['Curriculum', 'New COR']);

        foreach ($documents as $document) {
            Storage::disk('public')->assertExists($document->file_path);
        }
    }

    expect(OjtEnrollment::count())->toBe(78)
        ->and(OjtEnrollmentDocument::count())->toBe(156);
});

it('leaves the fourth intern approved but unassigned for the coordinator to place', function () {
    $intern = seededIntern(seededInstitute('Teacher Education'), 'intern.ite.4@smartlog.test');

    expect($intern->status)->toBe('approved')
        ->and($intern->assigned_hte)->toBeNull()
        ->and($intern->ojt_status)->toBe('pending')
        ->and($intern->activePlacement())->toBeNull()
        ->and(OjtEnrollment::where('user_id', $intern->user_id)->where('status', 'approved')->count())->toBe(1);
});

it('builds a past-term simulation cohort with monitoring, evaluations, and concerns', function () {
    $prior = AcademicTerm::where('code', '252')->firstOrFail();
    $ite = seededInstitute('Teacher Education');

    expect(Intern::where('academic_year_id', $prior->id)->count())->toBe(48)
        ->and(Intern::where('academic_year_id', $prior->id)->where('grade', 'Passed')->count())->toBe(18)
        ->and(Intern::where('academic_year_id', $prior->id)->where('grade', 'Failed')->count())->toBe(12)
        ->and(Intern::where('academic_year_id', $prior->id)->whereNull('grade')->count())->toBe(18);

    $passed = seededIntern($ite, 'intern.ite.p1@smartlog.test');

    expect($passed->ojt_status)->toBe('completed')
        ->and($passed->activePlacement())->not->toBeNull()
        ->and($passed->photoDtrs()->count())->toBe(61)
        ->and($passed->journals()->count())->toBe(61)
        ->and($passed->journals()->where('status', 'checked')->count())->toBe(61)
        ->and($passed->earnedMinutes())->toBe(486 * 60);

    $failed = seededIntern($ite, 'intern.ite.p4@smartlog.test');

    expect($failed->grade)->toBe('Failed')
        ->and($failed->photoDtrs()->count())->toBe(38)
        ->and($failed->earnedMinutes())->toBeLessThan(486 * 60);

    expect(DailyJournal::where('status', 'verified')->count())->toBeGreaterThan(0)
        ->and(DailyJournal::where('status', 'flagged')->count())->toBeGreaterThan(0)
        ->and(PhotoDtr::where('status', 'rejected')->count())->toBeGreaterThan(0)
        ->and(Issue::where('status', 'pending')->count())->toBeGreaterThan(0)
        ->and(Issue::where('status', 'resolve')->count())->toBeGreaterThan(0);

    $transfer = TransferRequest::whereHas(
        'intern',
        fn ($query) => $query->where('id', seededIntern($ite, 'intern.ite.p2@smartlog.test')->id)
    )->firstOrFail();

    expect($transfer->status)->toBe('reassigned')
        ->and($transfer->to_placement_id)->not->toBeNull();

    foreach ([$transfer->fromPlacement, $transfer->toPlacement] as $placement) {
        expect(InternEvaluation::where('placement_id', $placement->id)->count())->toBe(19)
            ->and(HteEvaluation::where('placement_id', $placement->id)->count())->toBe(19);
    }
});

it('can run a second time without duplicating or reshuffling the data', function () {
    $transfer = TransferRequest::firstOrFail();
    $userUuid = User::where('email', 'intern@smartlog.test')->value('uuid');

    $counts = [
        'htes' => Hte::count(),
        'placements' => InternHteAssignment::count(),
        'transfers' => TransferRequest::count(),
        'submissions' => RequirementSubmission::count(),
        'intern_evaluations' => InternEvaluation::count(),
        'hte_evaluations' => HteEvaluation::count(),
        'enrollments' => OjtEnrollment::count(),
        'documents' => OjtEnrollmentDocument::count(),
        'dtrs' => PhotoDtr::count(),
        'journals' => DailyJournal::count(),
        'issues' => Issue::count(),
    ];

    expect($counts)->toBe([
        'htes' => 30,
        'placements' => 84,
        'transfers' => 24,
        'submissions' => 1092,
        'intern_evaluations' => 1482,
        'hte_evaluations' => 1368,
        'enrollments' => 78,
        'documents' => 156,
        'dtrs' => 3276,
        'journals' => 3276,
        'issues' => 18,
    ]);

    $this->seed();

    expect(Hte::count())->toBe($counts['htes'])
        ->and(InternHteAssignment::count())->toBe($counts['placements'])
        ->and(TransferRequest::count())->toBe($counts['transfers'])
        ->and(RequirementSubmission::count())->toBe($counts['submissions'])
        ->and(InternEvaluation::count())->toBe($counts['intern_evaluations'])
        ->and(HteEvaluation::count())->toBe($counts['hte_evaluations'])
        ->and(OjtEnrollment::count())->toBe($counts['enrollments'])
        ->and(OjtEnrollmentDocument::count())->toBe($counts['documents'])
        ->and(PhotoDtr::count())->toBe($counts['dtrs'])
        ->and(DailyJournal::count())->toBe($counts['journals'])
        ->and(Issue::count())->toBe($counts['issues'])
        ->and(TransferRequest::find($transfer->id)->uuid)->toBe($transfer->uuid)
        ->and(User::where('email', 'intern@smartlog.test')->value('uuid'))->toBe($userUuid);
});
