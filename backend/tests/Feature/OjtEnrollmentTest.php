<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\DailyJournal;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\OjtEnrollment;
use App\Models\OjtEnrollmentDocument;
use App\Models\PhotoDtr;
use App\Models\Program;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function enInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function enProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function enTerm(string $code, string $description, string $status = 'inactive'): AcademicTerm
{
    return AcademicTerm::create([
        'code' => $code,
        'description' => $description,
        'status' => $status,
        'start_at' => now()->startOfYear()->addMonths(6 * (int) $code % 3),
    ]);
}

function enHte(Institute $institute, Program $program): Hte
{
    $user = User::factory()->create(['role' => 'hte', 'firstname' => 'Ana', 'middlename' => null, 'lastname' => 'Reyes', 'extension' => null]);
    $hte = Hte::create([
        'user_id' => $user->id,
        'name' => 'City Hall',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);

    return $hte;
}

function enIntern(Institute $institute, Program $program, Hte $hte, AcademicTerm $term, string $ojtStatus = 'ongoing', ?string $grade = null): Intern
{
    $user = User::factory()->create([
        'role' => 'intern',
        'firstname' => 'Juan',
        'middlename' => null,
        'lastname' => 'Dela Cruz',
        'extension' => null,
        'email_verified_at' => now(),
    ]);
    $intern = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => $term->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hte->id,
        'status' => 'approved',
        'ojt_status' => $ojtStatus,
        'grade' => $grade,
    ]);

    return $intern->load('user');
}

function enCoordinator(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create(['user_id' => $user->id, 'institute_id' => $institute->id, 'program_id' => $program->id]);

    return $user;
}

function enInstructor(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'ojt_instructor']);
    Coordinator::create(['user_id' => $user->id, 'institute_id' => $institute->id, 'program_id' => $program->id]);

    return $user;
}

/**
 * Satisfy every requirement on an application: the two documents plus a hours figure.
 */
function enCompleteRequirements(OjtEnrollment $enrollment, int $hours = 500): void
{
    foreach (OjtEnrollmentDocument::REQUIRED_TYPES as $type) {
        OjtEnrollmentDocument::create([
            'ojt_enrollment_id' => $enrollment->id,
            'type' => $type,
            'label' => $type,
            'file_path' => 'ojt-enrollment-documents/'.$type.'.pdf',
        ]);
    }

    $enrollment->update(['ojt_hours' => $hours]);
}

/* ------------------------------------------------------- schema guarantees */

test('a user can hold one enrollment per academic term', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $termA);

    $second = Intern::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
    ]);

    expect($second->id)->not->toBe($intern->id);

    $this->expectException(UniqueConstraintViolationException::class);

    Intern::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termA->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
    ]);
});

test('a re-enrolled intern can resubmit the same requirement in the new term', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);

    $requirement = Requirement::create([
        'institute_id' => $institute->id,
        'name' => 'Medical Certificate',
        'type' => 'pre_deployment',
        'is_active' => true,
    ]);

    RequirementSubmission::create([
        'user_id' => $intern->user_id,
        'intern_id' => $intern->id,
        'requirement_id' => $requirement->id,
        'file_path' => 'a.pdf',
        'status' => 'approved',
    ]);

    $second = Intern::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
    ]);

    // The same requirement, in the new term, must be allowed.
    $newSubmission = RequirementSubmission::create([
        'user_id' => $intern->user_id,
        'intern_id' => $second->id,
        'requirement_id' => $requirement->id,
        'file_path' => 'b.pdf',
        'status' => 'pending',
    ]);

    expect($newSubmission->id)->not->toBeNull();

    // The prior term's submission is untouched.
    expect(RequirementSubmission::where('intern_id', $intern->id)->where('requirement_id', $requirement->id)->first()?->file_path)
        ->toBe('a.pdf');
});

test('submissions keep user_id and intern_id in sync without explicit input', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester');
    $intern = enIntern($institute, $program, $hte, $term);
    $requirement = Requirement::create(['institute_id' => $institute->id, 'name' => 'MOA', 'type' => 'pre_deployment', 'is_active' => true]);

    $submission = RequirementSubmission::create([
        'user_id' => $intern->user_id,
        'requirement_id' => $requirement->id,
        'file_path' => 'moa.pdf',
        'status' => 'pending',
    ]);

    expect($submission->refresh()->intern_id)->toBe($intern->id);
});

/* ------------------------------------------------------- intern: enrol flow */

test('enrollment options exclude terms already held or already applied for', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $termC = enTerm('253', 'Summer');
    $intern = enIntern($institute, $program, $hte, $termA);

    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.institute_id', $institute->id)
        ->assertJsonPath('data.program_id', $program->id)
        ->assertJsonCount(1, 'data.terms')
        ->assertJsonPath('data.terms.0.id', $termC->id)
        ->assertJsonPath('data.current.grade', null);
});

test('an intern without an existing enrollment cannot apply', function () {
    $user = User::factory()->create(['role' => 'intern']);

    $this->actingAs($user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.can_enroll', false);
});

test('an intern submits an application that carries over program and institute', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);

    $this->actingAs($intern->user, 'api')
        ->post('/api/intern/enrollments', [
            'academic_year_id' => $termB->id,
            'ojt_hours' => 500,
            'cor' => UploadedFile::fake()->create('cor.pdf', 200, 'application/pdf'),
            'curriculum' => UploadedFile::fake()->create('curriculum.pdf', 200, 'application/pdf'),
        ])
        ->assertCreated()
        // A complete submission enters review immediately; there is no draft state.
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.institute_id', $institute->id)
        ->assertJsonPath('data.program_id', $program->id)
        ->assertJsonPath('data.ojt_hours', 500);

    $application = OjtEnrollment::where('user_id', $intern->user_id)->first();

    expect($application)->not->toBeNull()
        ->and($application->documents()->pluck('type')->sort()->values()->all())->toBe(['cor', 'curriculum']);
});

test('the request body cannot switch program or institute', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $otherInstitute = Institute::create(['name' => 'Institute of Nursing']);
    $otherProgram = Program::create(['institute_id' => $otherInstitute->id, 'name' => 'BS Nursing']);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);

    $this->actingAs($intern->user, 'api')
        ->post('/api/intern/enrollments', [
            'academic_year_id' => $termB->id,
            'institute_id' => $otherInstitute->id,
            'program_id' => $otherProgram->id,
            'ojt_hours' => 500,
            'cor' => UploadedFile::fake()->create('cor.pdf', 200, 'application/pdf'),
            'curriculum' => UploadedFile::fake()->create('curriculum.pdf', 200, 'application/pdf'),
        ])
        ->assertCreated()
        ->assertJsonPath('data.institute_id', $institute->id)
        ->assertJsonPath('data.program_id', $program->id);
});

test('an intern cannot apply for a term they are already enrolled in', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);

    $this->actingAs($intern->user, 'api')
        ->postJson('/api/intern/enrollments', ['academic_year_id' => $termA->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('academic_year_id');
});

test('a rejected application can be resubmitted for the same term', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'rejected',
        'rejection_reason' => 'Incomplete forms',
    ]);

    // Resubmission requires all requirements, so satisfy them first.
    enCompleteRequirements($application);

    $this->actingAs($intern->user, 'api')
        ->postJson('/api/intern/enrollments', ['academic_year_id' => $termB->id])
        ->assertOk()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.rejection_reason', null);

    expect(OjtEnrollment::where('user_id', $intern->user_id)->where('academic_year_id', $termB->id)->count())->toBe(1);
});

test('the term holding a rejected application stays selectable', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $enrolledTerm = enTerm('251', 'First Semester');
    $rejectedTerm = enTerm('252', 'Second Semester');
    $openTerm = enTerm('253', 'Third Semester');
    $intern = enIntern($institute, $program, $hte, $enrolledTerm);

    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $rejectedTerm->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'rejected',
    ]);

    // The rejected term must remain offered, otherwise the intern has no way to
    // select the application they are being asked to correct.
    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.can_enroll', true)
        ->assertJsonPath('data.terms', fn ($terms) => collect($terms)->pluck('id')->all() === [$rejectedTerm->id, $openTerm->id]);
});

test('a term with a pending or approved application is not offered again', function (string $status) {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $enrolledTerm = enTerm('251', 'First Semester');
    $lockedTerm = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $enrolledTerm);

    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $lockedTerm->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => $status,
    ]);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.can_enroll', false)
        ->assertJsonPath('data.terms', []);
})->with(['pending', 'approved']);

test('applying for a second term is rejected without hours or documents', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $enrolledTerm = enTerm('251', 'First Semester');
    $otherTerm = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $enrolledTerm);

    // The intern holds a rejected application for another term; that must not satisfy
    // the requirements for this one.
    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $enrolledTerm->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'rejected',
    ]);

    $this->actingAs($intern->user, 'api')
        ->postJson('/api/intern/enrollments', ['academic_year_id' => $otherTerm->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['ojt_hours', 'cor', 'curriculum']);

    expect(OjtEnrollment::where('user_id', $intern->user_id)->where('academic_year_id', $otherTerm->id)->exists())->toBeFalse();
});

test('an approved application is still reported as the current enrollment', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $firstTerm = enTerm('261', '1ST SEM AY 2026-2027');
    $approvedTerm = enTerm('262', '2ND SEM AY 2026-2027', 'active');
    $futureTerm = enTerm('271', '1ST SEM AY 2027-2028');

    $intern = enIntern($institute, $program, $hte, $firstTerm, 'completed', 'Failed');

    $enrollment = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $approvedTerm->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 486,
        'status' => 'approved',
    ]);

    // Approval creates the enrollment row for that term.
    (new Intern)->forceFill([
        'user_id' => $intern->user_id,
        'academic_year_id' => $approvedTerm->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'pending',
    ])->save();

    // The approved term is closed, so it is not offered for a new application — but it
    // must still be the application the intern sees on their enrollment page.
    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollments/current')
        ->assertOk()
        ->assertJsonPath('data.application.id', $enrollment->id)
        ->assertJsonPath('data.application.status', 'approved')
        ->assertJsonPath('data.application.academic_year', '2ND SEM AY 2026-2027')
        ->assertJsonPath('data.application.ojt_hours', 486)
        ->assertJsonPath('data.application.is_editable', false);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.can_enroll', true)
        ->assertJsonPath('data.terms', fn ($terms) => collect($terms)->pluck('id')->all() === [$futureTerm->id]);
});

test('an intern who failed an approved term can still apply for a later one', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $failedTerm = enTerm('261', '1ST SEM AY 2026-2027');
    $laterTerm = enTerm('271', '1ST SEM AY 2027-2028');
    $intern = enIntern($institute, $program, $hte, $failedTerm, 'completed', 'Failed');

    // The application row stays approved after a failure — the grade is recorded on the
    // intern record, not here. The intern must not be locked out of re-applying.
    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $failedTerm->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 486,
        'status' => 'approved',
    ]);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.can_enroll', true)
        ->assertJsonPath('data.terms', fn ($terms) => collect($terms)->pluck('id')->all() === [$laterTerm->id]);

    // The graded record is exposed on the enrollment page so the frontend can tell an
    // in-progress approval apart from a failed one.
    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollments/current')
        ->assertOk()
        ->assertJsonPath('data.application.status', 'approved')
        ->assertJsonPath('data.history.0.grade', 'Failed');
});

test('a term that closed without the intern completing their ojt is reported', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $closedTerm = enTerm('261', '1ST SEM AY 2026-2027');
    $intern = enIntern($institute, $program, $hte, $closedTerm, 'ongoing', null);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.incomplete_term.academic_year', '1ST SEM AY 2026-2027')
        ->assertJsonPath('data.incomplete_term.ojt_status', 'ongoing')
        ->assertJsonPath('data.incomplete_term.grade', null);
});

test('no incomplete notice when the ojt was completed, graded, or the term is still active', function (string $ojtStatus, ?string $grade, string $termStatus) {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('261', '1ST SEM AY 2026-2027', $termStatus);
    $intern = enIntern($institute, $program, $hte, $term, $ojtStatus, $grade);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.incomplete_term', null);
})->with([
    'completed but ungraded' => ['completed', null, 'inactive'],
    'completed and passed' => ['completed', 'Passed', 'inactive'],
    'unfinished but graded failed' => ['ongoing', 'Failed', 'inactive'],
    'unfinished but graded passed' => ['ongoing', 'Passed', 'inactive'],
    'term still active' => ['ongoing', null, 'active'],
    'hours completed but still active' => ['hours_completed', null, 'active'],
]);

test('a pending application makes the dashboard open on that academic year', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $finishedTerm = enTerm('261', '1ST SEM AY 2026-2027');
    $activeTerm = enTerm('262', '2ND SEM AY 2026-2027', 'active');
    $intern = enIntern($institute, $program, $hte, $finishedTerm, 'completed', 'Failed');

    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $activeTerm->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 500,
        'status' => 'pending',
    ]);

    // Approval is what creates the enrollment row, so the pending term has none. The
    // dashboard must still serve that term rather than falling back to the last one the
    // intern actually held.
    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.viewing_academic_year_id', $activeTerm->id)
        ->assertJsonPath('data.pending_application.academic_year', '2ND SEM AY 2026-2027')
        ->assertJsonPath('data.pending_application.academic_year_id', $activeTerm->id);

    // An explicit selection still wins over the pending default.
    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard?academic_year_id='.$finishedTerm->id)
        ->assertOk()
        ->assertJsonPath('data.viewing_academic_year_id', $finishedTerm->id)
        ->assertJsonPath('data.intern.academic_year', $finishedTerm->code)
        ->assertJsonPath('data.pending_application', null);
});

test('the dashboard falls back to the newest held term when nothing is pending', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $firstTerm = enTerm('261', '1ST SEM AY 2026-2027');
    $secondTerm = enTerm('262', '2ND SEM AY 2026-2027');
    $intern = enIntern($institute, $program, $hte, $firstTerm, 'ongoing', null);

    (new Intern)->forceFill([
        'user_id' => $intern->user_id,
        'academic_year_id' => $secondTerm->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
    ])->save();

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.viewing_academic_year_id', null)
        ->assertJsonPath('data.intern.academic_year', $secondTerm->code)
        ->assertJsonPath('data.pending_application', null);
});

test('approving a re-enrolment leaves the new term unassigned so it can be assigned', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $coordinator = enCoordinator($institute, $program);
    $failedTerm = enTerm('261', '1ST SEM AY 2026-2027');
    $activeTerm = enTerm('262', '2ND SEM AY 2026-2027', 'active');

    $intern = enIntern($institute, $program, $hte, $failedTerm, 'completed', 'Failed');
    $intern->forceFill(['assigned_hte' => $hte->id])->save();

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $activeTerm->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 500,
        'status' => 'pending',
    ]);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/enrollments/{$application->id}/approve")
        ->assertOk();

    $newTerm = Intern::where('user_id', $intern->user_id)
        ->where('academic_year_id', $activeTerm->id)
        ->first();

    expect($newTerm)->not->toBeNull()
        ->and($newTerm->status)->toBe('approved')
        // Carrying the old host over assigned them without a choice and hid them from
        // the assign page, which only lists unassigned interns.
        ->and($newTerm->assigned_hte)->toBeNull();

    // The intern now shows up as assignable for the active academic year.
    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/htes/{$hte->user->uuid}/assignable-interns?academic_year_id={$activeTerm->id}")
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.email', $intern->user->email);
});

test('an intern uploads and removes documents on a rejected application', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);

    $enrollment = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'rejected',
    ]);

    $this->actingAs($intern->user, 'api')
        ->post('/api/intern/enrollments/'.$enrollment->id.'/documents', [
            'type' => 'other',
            'label' => 'Prospectus',
            'file' => UploadedFile::fake()->create('prospectus.pdf', 200, 'application/pdf'),
        ])
        ->assertCreated()
        ->assertJsonPath('data.label', 'Prospectus')
        ->assertJsonPath('data.type', 'other');

    $document = OjtEnrollmentDocument::where('ojt_enrollment_id', $enrollment->id)->first();
    expect($document)->not->toBeNull();
    Storage::disk('public')->assertExists($document->file_path);

    $this->actingAs($intern->user, 'api')
        ->deleteJson("/api/intern/enrollments/{$enrollment->id}/documents/{$document->id}")
        ->assertOk();

    expect(OjtEnrollmentDocument::whereKey($document->id)->exists())->toBeFalse();
});

test('an intern cannot touch another interns application', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);
    $other = enIntern($institute, $program, $hte, $termA);

    $enrollment = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    $this->actingAs($other->user, 'api')
        ->post("/api/intern/enrollments/{$enrollment->id}/documents", [
            'label' => 'Sneaky',
            'file' => UploadedFile::fake()->create('x.pdf', 100, 'application/pdf'),
        ])
        ->assertForbidden();
});

test('current returns the application and every terms enrollment history', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');

    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollments/current')
        ->assertOk()
        ->assertJsonPath('data.application.status', 'pending')
        ->assertJsonCount(1, 'data.history')
        ->assertJsonPath('data.history.0.grade', 'Failed')
        ->assertJsonPath('data.history.0.ojt_status', 'completed');
});

/* --------------------------------------------------- coordinator: approval */

test('the coordinator queue lists pending applications for their institute', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);
    $coordinator = enCoordinator($institute, $program);

    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/enrollments?status=pending')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.student_name', 'Juan Dela Cruz')
        ->assertJsonPath('meta.total', 1);
});

test('approval creates the new term enrollment and notifies the intern', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'ongoing');
    $coordinator = enCoordinator($institute, $program);

    // Prior-term OJT data that must survive approval.
    PhotoDtr::create(['intern_id' => $intern->id, 'dtr_date' => '2026-01-10', 'status' => 'checked']);

    $enrollment = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/enrollments/{$enrollment->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');

    $newRow = Intern::where('user_id', $intern->user_id)->where('academic_year_id', $termB->id)->first();

    expect($newRow)->not->toBeNull()
        ->and($newRow->status)->toBe('approved')
        ->and($newRow->ojt_status)->toBe('pending')
        ->and($newRow->grade)->toBeNull()
        ->and($newRow->program_id)->toBe($program->id);

    // Prior term untouched.
    expect(PhotoDtr::where('intern_id', $intern->id)->count())->toBe(1)
        ->and(PhotoDtr::where('intern_id', $newRow->id)->count())->toBe(0)
        ->and($intern->refresh()->grade)->toBeNull();

    expect(UserNotification::where('user_id', $intern->user_id)->where('type', 'ojt_enrollment_approved')->count())->toBe(1);
});

test('rejecting an application records the reason and notifies the intern', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);
    $coordinator = enCoordinator($institute, $program);

    $enrollment = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/enrollments/{$enrollment->id}/reject", ['reason' => 'Prospectus is incomplete'])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.rejection_reason', 'Prospectus is incomplete');

    expect(UserNotification::where('user_id', $intern->user_id)->where('type', 'ojt_enrollment_rejected')->count())->toBe(1);
    expect(Intern::where('user_id', $intern->user_id)->where('academic_year_id', $termB->id)->exists())->toBeFalse();
});

test('rejecting requires a reason', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);
    $coordinator = enCoordinator($institute, $program);

    $enrollment = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/enrollments/{$enrollment->id}/reject", ['reason' => 'no'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('reason');
});

test('an approved application cannot be rejected afterwards', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);
    $coordinator = enCoordinator($institute, $program);

    $enrollment = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
    ]);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/enrollments/{$enrollment->id}/reject", ['reason' => 'Changed my mind'])
        ->assertStatus(422);
});

test('a coordinator cannot reach another institutes application', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);

    $otherInstitute = Institute::create(['name' => 'Institute of Nursing']);
    $otherProgram = enProgram($otherInstitute);
    $coordinator = enCoordinator($otherInstitute, $otherProgram);

    $enrollment = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/enrollments/{$enrollment->id}/approve")
        ->assertForbidden();
});

/* ------------------------------------------------------ instructor: grade */

test('the instructor assigns a grade to the active enrollment', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'hours_completed');
    $instructor = enInstructor($institute, $program);

    $this->actingAs($instructor, 'api')
        ->patchJson("/api/instructor/interns/{$intern->user->uuid}/grade", ['grade' => 'Passed'])
        ->assertOk()
        ->assertJsonPath('data.grade', 'Passed');

    expect($intern->refresh()->grade)->toBe('Passed');
});

test('a grade can be Failed and then changed in either direction', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester');
    $intern = enIntern($institute, $program, $hte, $term, 'completed');
    $instructor = enInstructor($institute, $program);

    $this->actingAs($instructor, 'api')
        ->patchJson("/api/instructor/interns/{$intern->user->uuid}/grade", ['grade' => 'Failed'])
        ->assertOk();
    expect($intern->refresh()->grade)->toBe('Failed');

    $this->actingAs($instructor, 'api')
        ->patchJson("/api/instructor/interns/{$intern->user->uuid}/grade", ['grade' => 'Passed'])
        ->assertOk();
    expect($intern->refresh()->grade)->toBe('Passed');

    $this->actingAs($instructor, 'api')
        ->patchJson("/api/instructor/interns/{$intern->user->uuid}/grade", ['grade' => null])
        ->assertOk();
    expect($intern->refresh()->grade)->toBeNull();
});

test('grade is refused for an invalid value', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester');
    $intern = enIntern($institute, $program, $hte, $term, 'ongoing');
    $instructor = enInstructor($institute, $program);

    $this->actingAs($instructor, 'api')
        ->patchJson("/api/instructor/interns/{$intern->user->uuid}/grade", ['grade' => 'A+'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('grade');
});

test('an instructor cannot grade an intern from another institute', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester');
    $intern = enIntern($institute, $program, $hte, $term, 'ongoing');

    $otherInstitute = Institute::create(['name' => 'Institute of Nursing']);
    $otherProgram = enProgram($otherInstitute);
    $instructor = enInstructor($otherInstitute, $otherProgram);

    $this->actingAs($instructor, 'api')
        ->patchJson("/api/instructor/interns/{$intern->user->uuid}/grade", ['grade' => 'Passed'])
        ->assertForbidden();
});

test('an instructor cannot grade an intern who is not deployed', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester');
    $intern = enIntern($institute, $program, $hte, $term, 'pending');
    $instructor = enInstructor($institute, $program);

    $this->actingAs($instructor, 'api')
        ->patchJson("/api/instructor/interns/{$intern->user->uuid}/grade", ['grade' => 'Passed'])
        ->assertNotFound();
});

test('grading targets the newest term when the intern has several enrollments', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    $instructor = enInstructor($institute, $program);

    $second = Intern::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hte->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
    ]);

    $this->actingAs($instructor, 'api')
        ->patchJson("/api/instructor/interns/{$intern->user->uuid}/grade", ['grade' => 'Passed'])
        ->assertOk();

    expect($second->refresh()->grade)->toBe('Passed')
        ->and($intern->refresh()->grade)->toBe('Failed');
});

test('a passed intern is no longer offered any term', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Passed');

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.can_enroll', false)
        ->assertJsonPath('data.passed_term', 'First Semester')
        ->assertJsonCount(0, 'data.terms');

    expect($intern->user->hasPassedOjt())->toBeTrue();
});

test('a passed intern cannot submit an application', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Passed');

    $this->actingAs($intern->user, 'api')
        ->postJson('/api/intern/enrollments', ['academic_year_id' => $termB->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('academic_year_id');

    expect(OjtEnrollment::where('user_id', $intern->user_id)->count())->toBe(0);
});

test('a failed intern can still enrol in a later term', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.can_enroll', true)
        ->assertJsonCount(1, 'data.terms');

    $this->actingAs($intern->user, 'api')
        ->post('/api/intern/enrollments', [
            'academic_year_id' => $termB->id,
            'ojt_hours' => 500,
            'cor' => UploadedFile::fake()->create('cor.pdf', 20, 'application/pdf'),
            'curriculum' => UploadedFile::fake()->create('curriculum.pdf', 20, 'application/pdf'),
        ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending');
});

test('an ungraded intern can still enrol in a later term', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'ongoing', null);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.can_enroll', true);
});

test('the coordinator cannot approve an application from an intern who has since passed', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'ongoing', null);
    $coordinator = enCoordinator($institute, $program);

    // The intern applies while still ungraded, then gets graded Passed before
    // the coordinator gets to it.
    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    $intern->forceFill(['grade' => 'Passed'])->save();

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/enrollments/{$application->id}/approve")
        ->assertStatus(422)
        ->assertJsonValidationErrors('status');

    expect($application->refresh()->status)->toBe('pending')
        ->and(Intern::where('user_id', $intern->user_id)->count())->toBe(1);
});

test('passing is detected across every term not just the newest', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');

    // First term graded Passed, then a newer term added on top of it. The gate
    // must look past the newest row rather than only at activeEnrollment().
    $first = enIntern($institute, $program, $hte, $termA, 'completed', 'Passed');

    (new Intern)->forceFill([
        'user_id' => $first->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
        'grade' => null,
    ])->save();

    $user = $first->user;
    expect($user->activeEnrollment()->grade)->toBeNull()
        ->and($user->hasPassedOjt())->toBeTrue();

    $this->actingAs($user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.can_enroll', false)
        ->assertJsonPath('data.passed_term', 'First Semester');
});

test('the coordinator queue flags applications from interns who have passed', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $passed = enIntern($institute, $program, $hte, $termA, 'completed', 'Passed');
    $ungraded = enIntern($institute, $program, $hte, $termA);
    $coordinator = enCoordinator($institute, $program);

    OjtEnrollment::create([
        'user_id' => $passed->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    OjtEnrollment::create([
        'user_id' => $ungraded->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    $rows = collect($this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/enrollments')
        ->assertOk()
        ->json('data'))
        ->keyBy('user_id');

    expect($rows[$passed->user_id]['intern_passed'])->toBeTrue()
        ->and($rows[$ungraded->user_id]['intern_passed'])->toBeFalse();
});

test('the instructor intern detail returns the saved grade so the card can render it', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester');
    $intern = enIntern($institute, $program, $hte, $term, 'completed', 'Passed');
    $instructor = enInstructor($institute, $program);
    declareOjtHours($intern, 300);

    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/interns/{$intern->user->uuid}")
        ->assertOk()
        ->assertJsonPath('data.grade', 'Passed')
        ->assertJsonPath('data.academic_year', 'First Semester')
        ->assertJsonStructure([
            'data' => ['uuid', 'grade', 'required_hours', 'earned_minutes', 'ojt_status'],
        ]);
});

test('a grade saved through the endpoint is returned on the next detail load', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester');
    $intern = enIntern($institute, $program, $hte, $term, 'completed', null);
    $instructor = enInstructor($institute, $program);

    $this->actingAs($instructor, 'api')
        ->patchJson("/api/instructor/interns/{$intern->user->uuid}/grade", ['grade' => 'Failed'])
        ->assertOk()
        ->assertJsonPath('data.grade', 'Failed');

    // The card refetches after saving; it must see the persisted value.
    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/interns/{$intern->user->uuid}")
        ->assertOk()
        ->assertJsonPath('data.grade', 'Failed');

    $this->actingAs($instructor, 'api')
        ->patchJson("/api/instructor/interns/{$intern->user->uuid}/grade", ['grade' => 'Passed'])
        ->assertOk()
        ->assertJsonPath('data.grade', 'Passed');

    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/interns/{$intern->user->uuid}")
        ->assertOk()
        ->assertJsonPath('data.grade', 'Passed');
});

/* ------------------------------------------------ instructor intern grade table */

test('the intern grade table lists one row per intern per term with hours', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $termA, 'ongoing', null);
    $instructor = enInstructor($institute, $program);
    declareOjtHours($intern, 300);

    // Same intern, second term — must appear as its own gradable row.
    $second = new Intern;
    $second->forceFill([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
    ])->save();

    declareOjtHours($second, 300);
    $rows = $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades')
        ->assertOk()
        ->json('data');

    expect($rows)->toHaveCount(2)
        ->and(collect($rows)->pluck('academic_year_id')->sort()->values()->all())
        ->toBe(collect([$termA->id, $termB->id])->sort()->values()->all())
        ->and($rows[0])->toHaveKeys([
            'id', 'uuid', 'full_name', 'email', 'profile_picture', 'program',
            'academic_year_id', 'academic_year', 'ojt_status', 'grade',
            'required_hours', 'earned_minutes', 'hours_met',
        ])
        ->and($rows[0]['required_hours'])->toBe(300)
        ->and($rows[0]['earned_minutes'])->toBe(0)
        ->and($rows[0]['hours_met'])->toBeFalse()
        ->and($rows[0]['grade'])->toBeNull();
});

test('the intern grade table only shows interns the instructor may grade', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester AY25-26');
    $instructor = enInstructor($institute, $program);

    $deployed = enIntern($institute, $program, $hte, $term, 'ongoing', null);
    $hoursDone = enIntern($institute, $program, $hte, $term, 'hours_completed', null);
    $finished = enIntern($institute, $program, $hte, $term, 'completed', 'Passed');
    // Not yet deployed — the PATCH would 404, so it must not be offered.
    $notDeployed = enIntern($institute, $program, $hte, $term, 'pending', null);

    $ids = collect($this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades')
        ->assertOk()
        ->json('data'))->pluck('id');

    expect($ids)->toHaveCount(3)
        ->and($ids)->toContain($deployed->id, $hoursDone->id, $finished->id)
        ->and($ids)->not->toContain($notDeployed->id);
});

test('the intern grade table is scoped to the instructors own institute', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester AY25-26');
    $mine = enIntern($institute, $program, $hte, $term, 'ongoing', null);

    $otherInstitute = Institute::create(['name' => 'Institute of Nursing']);
    $otherProgram = enProgram($otherInstitute);
    $theirs = enIntern($otherInstitute, $otherProgram, enHte($otherInstitute, $otherProgram), $term, 'ongoing', null);

    $instructor = enInstructor($institute, $program);

    $ids = collect($this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades')
        ->assertOk()
        ->json('data'))->pluck('id');

    expect($ids)->toContain($mine->id)
        ->and($ids)->not->toContain($theirs->id);
});

test('the intern grade table searches by name and email', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $term, 'ongoing', null);
    $instructor = enInstructor($institute, $program);

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades?search=Dela')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.uuid', $intern->user->uuid);

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades?search='.$intern->user->email)
        ->assertOk()
        ->assertJsonCount(1, 'data');

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades?search=Nobody')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('the intern grade table filters by academic year and grade status', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');
    $instructor = enInstructor($institute, $program);

    $passed = enIntern($institute, $program, $hte, $termA, 'completed', 'Passed');
    $failed = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    $fresh = enIntern($institute, $program, $hte, $termB, 'ongoing', null);

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades?grade=Passed')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $passed->id);

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades?grade=Failed')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $failed->id);

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades?grade=ungraded')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $fresh->id);

    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/intern-grades?academic_year_id={$termA->id}")
        ->assertOk()
        ->assertJsonCount(2, 'data');

    // Filters combine.
    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/intern-grades?academic_year_id={$termA->id}&grade=Passed")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $passed->id);
});

test('the intern grade table sorts and paginates server side', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester AY25-26');
    $instructor = enInstructor($institute, $program);

    $ids = collect(range(1, 5))->map(fn (int $i) => enIntern($institute, $program, $hte, $term, 'ongoing', null)->id);

    $ascending = collect($this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades?sort=id&order=asc')
        ->assertOk()
        ->json('data'))->pluck('id')->all();

    expect($ascending)->toBe($ids->all());

    $descending = collect($this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades?sort=id&order=desc')
        ->assertOk()
        ->json('data'))->pluck('id')->all();

    expect($descending)->toBe($ids->reverse()->values()->all());

    $firstPage = $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades?sort=id&order=asc&per_page=2&page=1')
        ->assertOk();

    expect($firstPage->json('data'))->toHaveCount(2)
        ->and($firstPage->json('meta.current_page'))->toBe(1)
        ->and($firstPage->json('meta.last_page'))->toBe(3)
        ->and($firstPage->json('meta.per_page'))->toBe(2)
        ->and($firstPage->json('meta.total'))->toBe(5)
        ->and($firstPage->json('data.0.id'))->toBe($ids->first());

    $lastPage = $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades?sort=id&order=asc&per_page=2&page=3')
        ->assertOk();

    expect($lastPage->json('data'))->toHaveCount(1)
        ->and($lastPage->json('data.0.id'))->toBe($ids->last());
});

test('sorting the grade table by grade keeps ungraded rows out of the way', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester AY25-26');
    $instructor = enInstructor($institute, $program);

    $passed = enIntern($institute, $program, $hte, $term, 'completed', 'Passed');
    $failed = enIntern($institute, $program, $hte, $term, 'completed', 'Failed');
    $ungraded = enIntern($institute, $program, $hte, $term, 'ongoing', null);

    $rows = collect($this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades?sort=grade&order=desc')
        ->assertOk()
        ->json('data'))->pluck('id')->all();

    // Passed > Failed, and the NULL grade sinks to the bottom.
    expect($rows)->toBe([$passed->id, $failed->id, $ungraded->id]);
});

test('a grade can be written to a specific term through the grade table', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');
    $instructor = enInstructor($institute, $program);

    $first = enIntern($institute, $program, $hte, $termA, 'completed', null);
    $second = (new Intern)->forceFill([
        'user_id' => $first->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
    ]);
    $second->save();

    // Targeting the older term must not touch the newer enrollment.
    $this->actingAs($instructor, 'api')
        ->patchJson("/api/instructor/interns/{$first->user->uuid}/grade", [
            'grade' => 'Failed',
            'academic_year_id' => $termA->id,
        ])
        ->assertOk()
        ->assertJsonPath('data.grade', 'Failed')
        ->assertJsonPath('data.academic_year_id', $termA->id);

    expect($first->refresh()->grade)->toBe('Failed')
        ->and($second->refresh()->grade)->toBeNull();
});

test('grading a term the intern does not hold is rejected', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $termA, 'ongoing', null);
    $instructor = enInstructor($institute, $program);

    $this->actingAs($instructor, 'api')
        ->patchJson("/api/instructor/interns/{$intern->user->uuid}/grade", [
            'grade' => 'Passed',
            'academic_year_id' => $termB->id,
        ])
        ->assertNotFound();

    expect($intern->refresh()->grade)->toBeNull();
});

test('the grade table reports hours met once the checked DTR time is enough', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $term, 'ongoing', null);
    $instructor = enInstructor($institute, $program);
    declareOjtHours($intern, 1);

    PhotoDtr::create([
        'intern_id' => $intern->id,
        'dtr_date' => '2026-01-10',
        'am_in_time' => '08:00:00',
        'am_out_time' => '09:00:00',
        'status' => 'checked',
    ]);

    $row = $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades')
        ->assertOk()
        ->json('data.0');

    expect($row['required_hours'])->toBe(1)
        ->and($row['earned_minutes'])->toBe(60)
        ->and($row['hours_met'])->toBeTrue();
});

test('an instructor without an institute sees an empty grade table', function () {
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades')
        ->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.total', 0);
});

/* ------------------------------------------------ intern dashboard final result */

test('the intern dashboard congratulates a passed intern', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $term, 'completed', 'Passed');

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.final_result.outcome', 'passed')
        ->assertJsonPath('data.final_result.grade', 'Passed')
        ->assertJsonPath('data.final_result.academic_year', 'First Semester AY25-26')
        ->assertJsonPath('data.intern.grade', 'Passed');
});

test('the intern dashboard reports a failure on the newest graded term', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $term, 'completed', 'Failed');

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.final_result.outcome', 'failed')
        ->assertJsonPath('data.final_result.grade', 'Failed');
});

test('the intern dashboard shows nothing before any term is graded', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester AY25-26');

    $ungraded = enIntern($institute, $program, $hte, $term, 'ongoing', null);
    $this->actingAs($ungraded->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.final_result', null);

});

test('a grade is reported even while the hours workflow is still open', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester AY25-26');

    // Real-world case: the instructor recorded the terminal grade but the term was
    // never moved to hours_completed/completed. The grade is the result, so the
    // intern must still be told.
    $failedOngoing = enIntern($institute, $program, $hte, $term, 'ongoing', 'Failed');
    $this->actingAs($failedOngoing->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.final_result.outcome', 'failed')
        ->assertJsonPath('data.final_result.grade', 'Failed')
        ->assertJsonPath('data.final_result.academic_year', 'First Semester AY25-26');

    $passedOngoing = enIntern($institute, $program, $hte, $term, 'ongoing', 'Passed');
    $this->actingAs($passedOngoing->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.final_result.outcome', 'passed');
});

test('a pass in any term still congratulates after re-enrolling', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');

    $passed = enIntern($institute, $program, $hte, $termA, 'completed', 'Passed');
    $second = (new Intern)->forceFill([
        'user_id' => $passed->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
    ]);
    $second->save();

    $this->actingAs($passed->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.final_result.outcome', 'passed')
        ->assertJsonPath('data.final_result.is_latest', false);
});

test('a failure stops being announced once the intern moves to a later term', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');

    $failed = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    (new Intern)->forceFill([
        'user_id' => $failed->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
    ])->save();

    // The old failure is history — it should not be announced as the current state.
    $this->actingAs($failed->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.final_result', null);
});

test('a failure is hidden once the intern is enrolled for that term again', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $term, 'ongoing', 'Failed');

    // Approving a re-enrolment for the same term reuses the existing row, so the old
    // Failed grade survives. The intern is already in the term, so the banner telling
    // them to apply again would be wrong.
    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $term->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 500,
        'status' => 'approved',
    ]);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.final_result', null);
});

test('a pending application for the same term hides the failure', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $term, 'completed', 'Failed');

    // Applying again for the same term clears the stale failure announcement,
    // because the intern is now working toward another result for that term.
    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $term->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 500,
        'status' => 'pending',
    ]);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.final_result', null);
});

test('a failure is hidden once any enrollment exists on the active academic year', function (string $status) {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $failedTerm = enTerm('261', '1ST SEM AY 2026-2027');
    $activeTerm = enTerm('262', '2ND SEM AY 2026-2027', 'active');

    $intern = enIntern($institute, $program, $hte, $failedTerm, 'completed', 'Failed');

    // Before applying, the failure is still the current state and is announced.
    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.final_result.outcome', 'failed')
        ->assertJsonPath('data.final_result.academic_year', '1ST SEM AY 2026-2027');

    // Any application on the active term — pending, approved or rejected — means the
    // intern has already moved on, so the stale failure banner must not appear.
    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $activeTerm->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => $status,
        'rejection_reason' => $status === 'rejected' ? 'tests' : null,
    ]);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.final_result', null);

    if ($status === 'rejected') {
        $this->actingAs($intern->user, 'api')
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.rejected_application.status', 'rejected');
    }
})->with(['pending', 'rejected', 'approved']);

test('the intern dashboard exposes the latest rejected enrollment application', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $termA, 'ongoing', null);

    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termA->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'rejected',
        'rejection_reason' => 'Missing curriculum',
    ]);

    $latest = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'rejected',
        'rejection_reason' => 'Unreadable COR scan',
    ]);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.rejected_application.id', $latest->id)
        ->assertJsonPath('data.rejected_application.academic_year_id', $termB->id)
        ->assertJsonPath('data.rejected_application.academic_year', 'Second Semester AY25-26')
        ->assertJsonPath('data.rejected_application.status', 'rejected')
        ->assertJsonPath('data.rejected_application.rejection_reason', 'Unreadable COR scan');
});

test('an older rejected application is hidden once a newer application exists', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $termA, 'ongoing', null);

    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termA->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'rejected',
        'rejection_reason' => 'Missing curriculum',
    ]);

    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.rejected_application', null);
});

/* -------------------------------------------- intern dashboard academic year filter */

test('the intern dashboard academic year filter switches to that term', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');

    $first = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    $second = (new Intern)->forceFill([
        'user_id' => $first->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
    ]);
    $second->save();

    PhotoDtr::create(['intern_id' => $first->id, 'dtr_date' => '2026-01-10', 'status' => 'checked']);
    PhotoDtr::create(['intern_id' => $second->id, 'dtr_date' => '2026-06-10', 'status' => 'checked']);
    DailyJournal::create(['intern_id' => $first->id, 'date' => '2026-01-11', 'title' => 'Term one entry', 'journal' => 'a', 'status' => 'checked']);
    DailyJournal::create(['intern_id' => $second->id, 'date' => '2026-06-11', 'title' => 'Term two entry', 'journal' => 'b', 'status' => 'checked']);

    // No filter defaults to the newest term. Dates come back as timezone-shifted
    // ISO strings, so the term is asserted via academic_year and the record via
    // its title rather than by comparing raw date strings.
    $default = $this->actingAs($first->user, 'api')->getJson('/api/dashboard')->assertOk();
    expect($default->json('data.intern.academic_year'))->toBe('252')
        ->and($default->json('data.recent_dtr'))->toHaveCount(1)
        ->and($default->json('data.recent_journals'))->toHaveCount(1)
        ->and($default->json('data.recent_journals.0.title'))->toBe('Term two entry');

    // Filtering back to the first term must return that term's records.
    $filtered = $this->actingAs($first->user, 'api')
        ->getJson("/api/dashboard?academic_year_id={$termA->id}")
        ->assertOk();

    expect($filtered->json('data.intern.academic_year'))->toBe('251')
        ->and($filtered->json('data.recent_dtr'))->toHaveCount(1)
        ->and($filtered->json('data.recent_journals'))->toHaveCount(1)
        ->and($filtered->json('data.recent_journals.0.title'))->toBe('Term one entry');
});

test('the intern dashboard requirement counts are per term', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');

    $first = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    $second = (new Intern)->forceFill([
        'user_id' => $first->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
    ]);
    $second->save();

    $requirement = Requirement::create([
        'institute_id' => $institute->id,
        'name' => 'Certificate of Registration',
        'type' => 'pre_deployment',
        'status' => 'active',
    ]);

    RequirementSubmission::create([
        'user_id' => $first->user_id,
        'intern_id' => $first->id,
        'requirement_id' => $requirement->id,
        'status' => 'approved',
        'file_path' => 'cor/one.pdf',
    ]);

    RequirementSubmission::create([
        'user_id' => $first->user_id,
        'intern_id' => $second->id,
        'requirement_id' => $requirement->id,
        'status' => 'pending',
        'file_path' => 'cor/two.pdf',
    ]);

    $firstTerm = $this->actingAs($first->user, 'api')
        ->getJson("/api/dashboard?academic_year_id={$termA->id}")
        ->assertOk()
        ->json('data.requirements');

    expect($firstTerm['total'])->toBe(1)
        ->and($firstTerm['approved'])->toBe(1)
        ->and($firstTerm['pending'])->toBe(0);

    $secondTerm = $this->actingAs($first->user, 'api')
        ->getJson("/api/dashboard?academic_year_id={$termB->id}")
        ->assertOk()
        ->json('data.requirements');

    expect($secondTerm['total'])->toBe(1)
        ->and($secondTerm['approved'])->toBe(0)
        ->and($secondTerm['pending'])->toBe(1);
});

test('the intern dashboard handles a term the intern never enrolled in', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $other = enTerm('252', 'Second Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $termA, 'ongoing', null);

    $this->actingAs($intern->user, 'api')
        ->getJson("/api/dashboard?academic_year_id={$other->id}")
        ->assertOk()
        ->assertJsonPath('data.intern', null)
        ->assertJsonPath('data.recent_dtr', [])
        ->assertJsonPath('data.recent_journals', []);
});

test('the intern dashboard lists every academic year and flags the ones held', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');
    $never = enTerm('253', 'Summer AY25-26');

    $first = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    (new Intern)->forceFill([
        'user_id' => $first->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
    ])->save();

    $terms = $this->actingAs($first->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->json('data.enrolled_terms');

    // All three terms are listed, so the intern can browse any of them.
    expect($terms)->toHaveCount(3);

    $byId = collect($terms)->keyBy('id');

    expect($byId[$termB->id]['is_enrolled'])->toBeTrue()
        ->and($byId[$termA->id]['is_enrolled'])->toBeTrue()
        // The term they never enrolled in is listed but flagged as empty.
        ->and($byId[$never->id]['is_enrolled'])->toBeFalse()
        ->and($byId[$never->id]['description'])->toBe('Summer AY25-26');
});

test('the final result banner describes the selected term', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');

    $failed = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    (new Intern)->forceFill([
        'user_id' => $failed->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
    ])->save();

    // Unfiltered: no graded result on the current term.
    $this->actingAs($failed->user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.final_result', null);

    // Pinned to the failed term: the banner describes that term.
    $this->actingAs($failed->user, 'api')
        ->getJson("/api/dashboard?academic_year_id={$termA->id}")
        ->assertOk()
        ->assertJsonPath('data.final_result.outcome', 'failed')
        ->assertJsonPath('data.final_result.academic_year', 'First Semester AY25-26');
});

test('the newest passed term is the one reported, not the oldest', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');
    $termC = enTerm('253', 'Summer AY25-26');

    $first = enIntern($institute, $program, $hte, $termA, 'completed', 'Passed');
    $user = $first->user;

    foreach ([$termB, $termC] as $term) {
        (new Intern)->forceFill([
            'user_id' => $user->id,
            'academic_year_id' => $term->id,
            'institute_id' => $institute->id,
            'program_id' => $program->id,
            'status' => 'approved',
            'ojt_status' => 'completed',
            'grade' => 'Passed',
        ])->save();
    }

    expect($user->passedEnrollment()->academic_year_id)->toBe($termC->id)
        ->and($user->passedEnrollment()->academicYear->description)->toBe('Summer AY25-26')
        ->and($user->originalEnrollment()->academic_year_id)->toBe($termA->id);

    // And the gate message must name the newest passed term, not the first.
    $this->actingAs($user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.passed_term', 'Summer AY25-26');
});

test('selecting a term with no records keeps the term list intact', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $never = enTerm('252', 'Second Semester AY25-26');

    $intern = enIntern($institute, $program, $hte, $termA, 'ongoing', null);

    $response = $this->actingAs($intern->user, 'api')
        ->getJson("/api/dashboard?academic_year_id={$never->id}")
        ->assertOk();

    $terms = $response->json('data.enrolled_terms');

    // The dropdown must keep offering every term. Returning [] here previously
    // emptied the filter the moment an unheld term was chosen, which broke the
    // page and left no way back.
    expect($terms)->toHaveCount(2)
        ->and(collect($terms)->pluck('id')->all())->toContain($termA->id, $never->id);

    // The unheld term must come back marked, and every panel must be a safe shape.
    $unheld = collect($terms)->firstWhere('id', $never->id);
    expect($unheld['is_enrolled'])->toBeFalse();

    expect($response->json('data.intern'))->toBeNull()
        ->and($response->json('data.recent_dtr'))->toBe([])
        ->and($response->json('data.recent_journals'))->toBe([])
        ->and($response->json('data.ojt_hours.earned'))->toBe(0)
        ->and($response->json('data.requirements.total'))->toBe(0)
        ->and($response->json('data.issues.pending'))->toBe(0)
        ->and($response->json('data.final_result'))->toBeNull();

    // Returning to a held term restores real data.
    $this->actingAs($intern->user, 'api')
        ->getJson("/api/dashboard?academic_year_id={$termA->id}")
        ->assertOk()
        ->assertJsonPath('data.intern.academic_year_id', $termA->id)
        ->assertJsonCount(2, 'data.enrolled_terms');
});

test('a passed intern cannot change a stale application', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester AY25-26');
    $termB = enTerm('252', 'Second Semester AY25-26');
    $intern = enIntern($institute, $program, $hte, $termA, 'ongoing', null);

    // They correct a rejected application while ungraded, then get graded Passed
    // before it can return to review.
    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'rejected',
    ]);

    $document = OjtEnrollmentDocument::create([
        'ojt_enrollment_id' => $application->id,
        'label' => 'COR',
        'file_path' => 'ojt-enrollment-documents/cor.pdf',
    ]);

    $this->actingAs($intern->user, 'api')
        ->postJson("/api/intern/enrollments/{$application->id}/documents", [
            'type' => 'cor',
            'file' => UploadedFile::fake()->create('form.pdf', 20, 'application/pdf'),
        ])
        ->assertCreated();

    $intern->forceFill(['grade' => 'Passed'])->save();

    // Once passed, the stale application is frozen.
    $this->actingAs($intern->user, 'api')
        ->postJson("/api/intern/enrollments/{$application->id}/documents", [
            'type' => 'curriculum',
            'file' => UploadedFile::fake()->create('form2.pdf', 20, 'application/pdf'),
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('application');

    $this->actingAs($intern->user, 'api')
        ->deleteJson("/api/intern/enrollments/{$application->id}/documents/{$document->id}")
        ->assertStatus(422)
        ->assertJsonValidationErrors('application');

    expect($document->fresh())->not->toBeNull()
        ->and($application->refresh()->status)->toBe('rejected');
});

/* ------------------------------------------------- required enrolment documents */

test('a new application is created only when all requirements are supplied together', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    $coordinator = enCoordinator($institute, $program);

    // An incomplete upload set leaves no row and nothing for the coordinator.
    $this->actingAs($intern->user, 'api')
        ->post('/api/intern/enrollments', [
            'academic_year_id' => $termB->id,
            'ojt_hours' => 500,
            'cor' => UploadedFile::fake()->create('cor.pdf', 20, 'application/pdf'),
        ], ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('curriculum');

    expect(OjtEnrollment::where('user_id', $intern->user_id)->count())->toBe(0);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/enrollments')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    // A complete submission enters review immediately.
    $this->actingAs($intern->user, 'api')
        ->post('/api/intern/enrollments', [
            'academic_year_id' => $termB->id,
            'ojt_hours' => 500,
            'cor' => UploadedFile::fake()->create('cor.pdf', 20, 'application/pdf'),
            'curriculum' => UploadedFile::fake()->create('curriculum.pdf', 20, 'application/pdf'),
        ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.ojt_hours', 500)
        ->assertJsonPath('data.missing_requirements', []);

    $application = OjtEnrollment::where('user_id', $intern->user_id)
        ->where('academic_year_id', $termB->id)
        ->first();

    expect($application->documents()->pluck('type')->sort()->values()->all())->toBe(['cor', 'curriculum']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/enrollments')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'pending');
});

test('the three required documents are named on the options endpoint', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester');
    $intern = enIntern($institute, $program, $hte, $term);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.required_items', [
            'cor' => 'New COR',
            'curriculum' => 'Curriculum',
            'ojt_hours' => 'OJT hours',
        ]);
});

test('uploading the same document type replaces the previous file', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'rejected',
    ]);

    $this->actingAs($intern->user, 'api')
        ->post("/api/intern/enrollments/{$application->id}/documents", [
            'type' => 'cor',
            'file' => UploadedFile::fake()->create('first-cor.pdf', 20, 'application/pdf'),
        ])
        ->assertCreated();

    $firstPath = OjtEnrollmentDocument::where('ojt_enrollment_id', $application->id)
        ->where('type', 'cor')
        ->value('file_path');

    $this->actingAs($intern->user, 'api')
        ->post("/api/intern/enrollments/{$application->id}/documents", [
            'type' => 'cor',
            'file' => UploadedFile::fake()->create('second-cor.pdf', 20, 'application/pdf'),
        ])
        ->assertCreated();

    $documents = OjtEnrollmentDocument::where('ojt_enrollment_id', $application->id)->get();

    expect($documents)->toHaveCount(1)
        ->and($documents->first()->file_path)->not->toBe($firstPath);

    Storage::disk('public')->assertMissing($firstPath);
});

test('an unknown document type is rejected', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'rejected',
    ]);

    // The Accept header is what makes a validation failure answer 422 instead of
    // redirecting, since this posts multipart rather than JSON.
    $this->actingAs($intern->user, 'api')
        ->post("/api/intern/enrollments/{$application->id}/documents", [
            'type' => 'coffee-receipt',
            'file' => UploadedFile::fake()->create('nope.pdf', 20, 'application/pdf'),
        ], ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('type');

    expect(OjtEnrollmentDocument::where('ojt_enrollment_id', $application->id)->count())->toBe(0);
});

test('ojt hours must be a positive number within range', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'rejected',
    ]);

    // Zero, negative, non-numeric and absurd figures are all refused.
    foreach ([0, -5, 99999] as $hours) {
        $this->actingAs($intern->user, 'api')
            ->patchJson("/api/intern/enrollments/{$application->id}/ojt-hours", ['ojt_hours' => $hours])
            ->assertStatus(422)
            ->assertJsonValidationErrors('ojt_hours');
    }

    $this->actingAs($intern->user, 'api')
        ->patchJson("/api/intern/enrollments/{$application->id}/ojt-hours", ['ojt_hours' => 'lots'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('ojt_hours');

    // Nothing was stored by any rejected attempt.
    expect($application->refresh()->ojt_hours)->toBeNull();

    $this->actingAs($intern->user, 'api')
        ->patchJson("/api/intern/enrollments/{$application->id}/ojt-hours", ['ojt_hours' => 486])
        ->assertOk()
        ->assertJsonPath('data.ojt_hours', 486);

    // And it can be corrected afterwards.
    $this->actingAs($intern->user, 'api')
        ->patchJson("/api/intern/enrollments/{$application->id}/ojt-hours", ['ojt_hours' => 500])
        ->assertOk()
        ->assertJsonPath('data.ojt_hours', 500);
});

test('a passed intern cannot declare hours on a stale application', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'ongoing', null);

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'pending',
    ]);

    $intern->forceFill(['grade' => 'Passed'])->save();

    $this->actingAs($intern->user, 'api')
        ->patchJson("/api/intern/enrollments/{$application->id}/ojt-hours", ['ojt_hours' => 500])
        ->assertStatus(422)
        ->assertJsonValidationErrors('application');
});

test('hours cannot be declared on an approved application', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
    ]);

    $this->actingAs($intern->user, 'api')
        ->patchJson("/api/intern/enrollments/{$application->id}/ojt-hours", ['ojt_hours' => 500])
        ->assertStatus(422)
        ->assertJsonValidationErrors('ojt_hours');

    expect($application->refresh()->ojt_hours)->toBeNull();
});

/* ------------------------------------------- complete submission before review */

test('an incomplete submission creates no application row', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    $coordinator = enCoordinator($institute, $program);

    $this->actingAs($intern->user, 'api')
        ->post('/api/intern/enrollments', [
            'academic_year_id' => $termB->id,
            'ojt_hours' => 500,
            'cor' => UploadedFile::fake()->create('cor.pdf', 20, 'application/pdf'),
        ], ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('curriculum');

    expect(OjtEnrollment::where('user_id', $intern->user_id)->count())->toBe(0);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/enrollments')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('a complete submission creates a pending application in one request', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    $coordinator = enCoordinator($institute, $program);

    $this->actingAs($intern->user, 'api')
        ->post('/api/intern/enrollments', [
            'academic_year_id' => $termB->id,
            'ojt_hours' => 500,
            'cor' => UploadedFile::fake()->create('cor.pdf', 20, 'application/pdf'),
            'curriculum' => UploadedFile::fake()->create('curriculum.pdf', 20, 'application/pdf'),
        ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.ojt_hours', 500)
        ->assertJsonPath('data.missing_requirements', []);

    $application = OjtEnrollment::where('user_id', $intern->user_id)
        ->where('academic_year_id', $termB->id)
        ->first();

    expect($application->documents()->pluck('type')->sort()->values()->all())->toBe(['cor', 'curriculum']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/enrollments')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'pending')
        ->assertJsonPath('data.0.ojt_hours', 500);
});

test('a submitted term is not offered again in the options list', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');

    // Before: termB is available.
    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonCount(1, 'data.terms')
        ->assertJsonPath('data.terms.0.id', $termB->id);

    $this->actingAs($intern->user, 'api')
        ->post('/api/intern/enrollments', [
            'academic_year_id' => $termB->id,
            'ojt_hours' => 500,
            'cor' => UploadedFile::fake()->create('cor.pdf', 20, 'application/pdf'),
            'curriculum' => UploadedFile::fake()->create('curriculum.pdf', 20, 'application/pdf'),
        ])
        ->assertCreated();

    // After the row exists it is no longer offered, so the intern continues that
    // row rather than tripping the unique constraint.
    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonCount(0, 'data.terms')
        ->assertJsonPath('data.can_enroll', false);
});

test('enrollment options report the active academic year rather than the latest enrollment', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $previousTerm = enTerm('261', '1ST SEM AY 2026-2027');
    $activeTerm = enTerm('262', '2nd SEM AY 2026-2027', 'active');
    $intern = enIntern($institute, $program, $hte, $previousTerm, 'completed', 'Failed');

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollment/options')
        ->assertOk()
        ->assertJsonPath('data.active_academic_year.id', $activeTerm->id)
        ->assertJsonPath('data.active_academic_year.code', '262')
        ->assertJsonPath('data.active_academic_year.description', '2nd SEM AY 2026-2027')
        ->assertJsonPath('data.current.academic_year_id', $previousTerm->id);
});

test('a term keeps one application row while its requirements are completed', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');

    OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'rejected',
    ]);

    $this->actingAs($intern->user, 'api')
        ->postJson('/api/intern/enrollments', ['academic_year_id' => $termB->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('requirements');

    expect(OjtEnrollment::where('user_id', $intern->user_id)->where('academic_year_id', $termB->id)->count())->toBe(1);
});

test('a submitted enrollment application is read-only for the intern', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 450,
        'status' => 'pending',
    ]);

    $document = OjtEnrollmentDocument::create([
        'ojt_enrollment_id' => $application->id,
        'type' => 'cor',
        'label' => 'New COR',
        'file_path' => 'ojt-enrollment-documents/cor.pdf',
    ]);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/enrollments/current')
        ->assertOk()
        ->assertJsonPath('data.application.status', 'pending')
        ->assertJsonPath('data.application.is_editable', false);

    $this->actingAs($intern->user, 'api')
        ->postJson('/api/intern/enrollments', ['academic_year_id' => $termB->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('application');

    $this->actingAs($intern->user, 'api')
        ->post("/api/intern/enrollments/{$application->id}/documents", [
            'type' => 'curriculum',
            'file' => UploadedFile::fake()->create('curriculum.pdf', 20, 'application/pdf'),
        ], ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('file');

    $this->actingAs($intern->user, 'api')
        ->patchJson("/api/intern/enrollments/{$application->id}/ojt-hours", ['ojt_hours' => 500])
        ->assertStatus(422)
        ->assertJsonValidationErrors('ojt_hours');

    $this->actingAs($intern->user, 'api')
        ->deleteJson("/api/intern/enrollments/{$application->id}/documents/{$document->id}")
        ->assertStatus(422)
        ->assertJsonValidationErrors('document');

    expect($application->refresh()->status)->toBe('pending')
        ->and($application->refresh()->ojt_hours)->toBe(450)
        ->and(OjtEnrollmentDocument::whereKey($document->id)->exists())->toBeTrue();
});

test('a coordinator can view one enrollment with its documents and missing requirements', function () {
    Storage::fake('public');

    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    $coordinator = enCoordinator($institute, $program);

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 500,
        'status' => 'pending',
    ]);

    OjtEnrollmentDocument::create([
        'ojt_enrollment_id' => $application->id,
        'type' => 'cor',
        'label' => 'New COR',
        'file_path' => 'ojt-enrollment-documents/cor.pdf',
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/enrollments/{$application->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $application->id)
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.student_name', 'Juan Dela Cruz')
        ->assertJsonPath('data.academic_year', 'Second Semester')
        ->assertJsonPath('data.ojt_hours', 500)
        ->assertJsonPath('data.documents.0.type', 'cor')
        ->assertJsonPath('data.missing_requirements', ['curriculum']);
});

test('a coordinator cannot view another institutes enrollment', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA);
    $coordinator = enCoordinator($institute, $program);

    $otherInstitute = Institute::create(['name' => 'Institute of Nursing']);
    $otherProgram = enProgram($otherInstitute);
    $other = enIntern($otherInstitute, $otherProgram, enHte($otherInstitute, $otherProgram), $termA);

    $application = OjtEnrollment::create([
        'user_id' => $other->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $otherInstitute->id,
        'program_id' => $otherProgram->id,
        'status' => 'pending',
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/enrollments/{$application->id}")
        ->assertForbidden();
});

test('an approved enrollment detail names its reviewer', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    $coordinator = enCoordinator($institute, $program);

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 500,
        'status' => 'approved',
        'reviewed_by' => $coordinator->id,
        'reviewed_at' => now(),
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/enrollments/{$application->id}")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('data.reviewed_by', $coordinator->full_name);
});

test('a coordinator can correct the hours on a pending application', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    $coordinator = enCoordinator($institute, $program);

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 450,
        'status' => 'pending',
    ]);

    $this->actingAs($coordinator, 'api')
        ->patchJson("/api/coordinator/enrollments/{$application->id}/ojt-hours", ['ojt_hours' => 500])
        ->assertOk()
        ->assertJsonPath('data.ojt_hours', 500);

    expect($application->refresh()->ojt_hours)->toBe(500);
});

test('a coordinator cannot change the hours with an invalid figure', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    $coordinator = enCoordinator($institute, $program);

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 450,
        'status' => 'pending',
    ]);

    $this->actingAs($coordinator, 'api')
        ->patchJson("/api/coordinator/enrollments/{$application->id}/ojt-hours", ['ojt_hours' => 0])
        ->assertStatus(422)
        ->assertJsonValidationErrors('ojt_hours');

    expect($application->refresh()->ojt_hours)->toBe(450);
});

test('a coordinator cannot change the hours on an approved application', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $termA = enTerm('251', 'First Semester');
    $termB = enTerm('252', 'Second Semester');
    $intern = enIntern($institute, $program, $hte, $termA, 'completed', 'Failed');
    $coordinator = enCoordinator($institute, $program);

    $application = OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $termB->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 500,
        'status' => 'approved',
    ]);

    $this->actingAs($coordinator, 'api')
        ->patchJson("/api/coordinator/enrollments/{$application->id}/ojt-hours", ['ojt_hours' => 550])
        ->assertStatus(422)
        ->assertJsonValidationErrors('ojt_hours');

    expect($application->refresh()->ojt_hours)->toBe(500);
});

test('a coordinator cannot change the hours for another institutes application', function () {
    $institute = enInstitute();
    $program = enProgram($institute);
    $hte = enHte($institute, $program);
    $term = enTerm('251', 'First Semester');
    $intern = enIntern($institute, $program, $hte, $term);
    $coordinator = enCoordinator($institute, $program);

    $otherInstitute = Institute::create(['name' => 'Institute of Nursing']);
    $otherProgram = enProgram($otherInstitute);
    $other = enIntern($otherInstitute, $otherProgram, enHte($otherInstitute, $otherProgram), $term);

    $application = OjtEnrollment::create([
        'user_id' => $other->user_id,
        'academic_year_id' => $term->id,
        'institute_id' => $otherInstitute->id,
        'program_id' => $otherProgram->id,
        'ojt_hours' => 450,
        'status' => 'pending',
    ]);

    $this->actingAs($coordinator, 'api')
        ->patchJson("/api/coordinator/enrollments/{$application->id}/ojt-hours", ['ojt_hours' => 500])
        ->assertForbidden();

    expect($application->refresh()->ojt_hours)->toBe(450);
});
