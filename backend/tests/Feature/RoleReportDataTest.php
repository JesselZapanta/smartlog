<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\DailyJournal;
use App\Models\EvaluationCriterion;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\Issue;
use App\Models\PhotoDtr;
use App\Models\Program;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function arInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function arProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function arTerm(): AcademicTerm
{
    return AcademicTerm::firstOrCreate(['code' => '251'], ['description' => 'First Semester', 'status' => 'active']);
}

function arHte(Institute $institute, Program $program, string $name = 'City Hall'): Hte
{
    $user = User::factory()->create(['role' => 'hte', 'firstname' => 'Ana', 'middlename' => null, 'lastname' => 'Reyes', 'extension' => null]);
    $hte = Hte::create([
        'user_id' => $user->id,
        'name' => $name,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);

    return $hte->load('user');
}

function arIntern(Institute $institute, Program $program, Hte $hte, string $name = 'Santos Juan'): Intern
{
    $parts = explode(' ', $name);
    $user = User::factory()->create([
        'role' => 'intern',
        'firstname' => $parts[0],
        'middlename' => null,
        'lastname' => $parts[1] ?? 'Intern',
        'extension' => null,
    ]);
    $intern = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => arTerm()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hte->id,
        'ojt_status' => 'ongoing',
    ]);

    return $intern->load('user');
}

function arInstructor(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'ojt_instructor', 'firstname' => 'Mara', 'middlename' => null, 'lastname' => 'Lim', 'extension' => null]);
    Coordinator::create([
        'user_id' => $user->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    return $user;
}

function arAdmin(): User
{
    return User::factory()->create(['role' => 'admin', 'firstname' => 'Admin', 'middlename' => null, 'lastname' => 'User', 'extension' => null, 'email_verified_at' => now()]);
}

function arCriterion(Institute $institute, string $type = 'intern'): EvaluationCriterion
{
    return EvaluationCriterion::create([
        'institute_id' => $institute->id,
        'category' => 'job_knowledge',
        'indicator' => 'Technical skill',
        'type' => $type,
        'status' => 'active',
    ]);
}

/* ---------------------------------------------------------------- admin -- */

test('admin report exposes full record level data', function () {
    $institute = arInstitute();
    $program = arProgram($institute);
    $hte = arHte($institute, $program);
    $intern = arIntern($institute, $program, $hte);
    $admin = arAdmin();

    $requirement = Requirement::create(['institute_id' => $institute->id, 'name' => 'Medical Certificate', 'type' => 'pre_deployment', 'is_active' => true]);
    RequirementSubmission::create(['user_id' => $intern->user_id, 'requirement_id' => $requirement->id, 'file_path' => 'c.pdf', 'status' => 'approved']);
    PhotoDtr::create(['intern_id' => $intern->id, 'dtr_date' => '2026-01-15', 'am_in_time' => '08:00:00', 'pm_out_time' => '17:00:00', 'status' => 'checked']);
    DailyJournal::create(['intern_id' => $intern->id, 'date' => '2026-01-15', 'title' => 'Orientation', 'journal' => 'Intro.', 'status' => 'verified']);
    Issue::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'type' => 'intern', 'issues' => 'Late.', 'solutions' => 'Fix.', 'recommendations' => 'Rec.', 'status' => 'pending']);

    $criterion = arCriterion($institute, 'intern');
    InternEvaluation::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'criterion_id' => $criterion->id, 'rating' => 4]);

    $this->actingAs($admin, 'api')
        ->getJson('/api/reports')
        ->assertOk()
        ->assertJsonPath('data.interns.rows.0.name', 'Santos Juan')
        ->assertJsonPath('data.interns.rows.0.hte', 'City Hall')
        ->assertJsonCount(1, 'data.requirements.rows')
        ->assertJsonPath('data.requirements.rows.0.requirement', 'Medical Certificate')
        ->assertJsonCount(1, 'data.dtr.rows')
        ->assertJsonPath('data.dtr.rows.0.am_in', '08:00:00')
        ->assertJsonCount(1, 'data.journals.rows')
        ->assertJsonPath('data.journals.rows.0.title', 'Orientation')
        ->assertJsonPath('data.issues.rows.0.direction', 'Intern')
        ->assertJsonPath('data.issues.rows.0.solutions', 'Fix.')
        ->assertJsonPath('data.evaluations.rows.0.intern_average', 4);
});

test('admin report lists every user account', function () {
    $admin = arAdmin();
    User::factory()->create(['role' => 'intern', 'firstname' => 'Un', 'middlename' => null, 'lastname' => 'Verified', 'extension' => null, 'email_verified_at' => now()]);
    User::factory()->create(['role' => 'hte', 'firstname' => 'Un', 'middlename' => null, 'lastname' => 'Pending', 'extension' => null, 'email_verified_at' => null]);

    $response = $this->actingAs($admin, 'api')->getJson('/api/reports')->assertOk();

    expect($response->json('data.users.rows'))->toHaveCount(3);

    $emails = collect($response->json('data.users.rows'))->pluck('email');

    expect($emails)->toContain($admin->email);
});

test('admin report hte detail names the assigned interns and the institute', function () {
    $institute = arInstitute();
    $program = arProgram($institute);
    $hte = arHte($institute, $program, 'City Hall');
    arIntern($institute, $program, $hte, 'Santos Juan');
    $admin = arAdmin();

    $detail = collect($this->actingAs($admin, 'api')->getJson('/api/reports')->json('data.htes.detail'))->firstWhere('name', 'City Hall');

    expect($detail['assigned'])->toBe(1)
        ->and($detail['interns'])->toBe(['Santos Juan'])
        ->and($detail['institute'])->toBe('Institute of Computing');
});

test('admin report issues by_status uses the backend status keys', function () {
    $institute = arInstitute();
    $program = arProgram($institute);
    $hte = arHte($institute, $program);
    $intern = arIntern($institute, $program, $hte);
    $admin = arAdmin();

    Issue::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'type' => 'intern', 'issues' => 'A', 'status' => 'pending']);
    Issue::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'type' => 'hte', 'issues' => 'B', 'status' => 'resolve']);

    $byStatus = $this->actingAs($admin, 'api')->getJson('/api/reports')->json('data.issues.by_status');

    expect($byStatus)->toHaveKey('pending')
        ->and($byStatus)->toHaveKey('resolve')
        ->and($byStatus)->not->toHaveKey('open')
        ->and($byStatus)->not->toHaveKey('resolved');
});

/* ----------------------------------------------------------- instructor -- */

test('instructor report exposes full record level data for its institute', function () {
    $institute = arInstitute();
    $program = arProgram($institute);
    $hte = arHte($institute, $program);
    $intern = arIntern($institute, $program, $hte);
    $instructor = arInstructor($institute, $program);

    $requirement = Requirement::create(['institute_id' => $institute->id, 'name' => 'Clearance', 'type' => 'post_deployment', 'is_active' => true]);
    RequirementSubmission::create(['user_id' => $intern->user_id, 'requirement_id' => $requirement->id, 'file_path' => 'cl.pdf', 'status' => 'rejected']);
    PhotoDtr::create(['intern_id' => $intern->id, 'dtr_date' => '2026-01-16', 'am_in_time' => '08:10:00', 'status' => 'verified']);
    DailyJournal::create(['intern_id' => $intern->id, 'date' => '2026-01-16', 'title' => 'Day two', 'journal' => 'Work.', 'status' => 'checked']);
    Issue::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'type' => 'hte', 'issues' => 'Absent twice.', 'solutions' => 'Warned.', 'recommendations' => 'Monitor.', 'status' => 'resolve']);

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/reports')
        ->assertOk()
        ->assertJsonPath('data.interns.rows.0.name', 'Santos Juan')
        ->assertJsonCount(1, 'data.requirements.rows')
        ->assertJsonPath('data.requirements.rows.0.status', 'rejected')
        ->assertJsonCount(1, 'data.dtr.rows')
        ->assertJsonPath('data.dtr.rows.0.am_in', '08:10:00')
        ->assertJsonCount(1, 'data.journals.rows')
        ->assertJsonCount(1, 'data.issues.rows')
        ->assertJsonPath('data.issues.rows.0.direction', 'HTE')
        ->assertJsonPath('data.issues.rows.0.solutions', 'Warned.')
        ->assertJsonCount(1, 'data.evaluations.rows');
});

test('instructor report rows exclude interns from another institute', function () {
    $institute = arInstitute();
    $program = arProgram($institute);
    $instructor = arInstructor($institute, $program);

    $otherInstitute = Institute::create(['name' => 'Institute of Nursing']);
    $otherProgram = arProgram($otherInstitute);
    $otherHte = arHte($otherInstitute, $otherProgram, 'Other HTE');
    arIntern($otherInstitute, $otherProgram, $otherHte, 'Outside Diaz');

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/reports')
        ->assertOk()
        ->assertJsonCount(0, 'data.interns.rows')
        ->assertJsonCount(0, 'data.dtr.rows');
});

/* ---------------------------------------------------------------- intern -- */

test('intern report exposes their own dtr journals and submissions in full', function () {
    $institute = arInstitute();
    $program = arProgram($institute);
    $hte = arHte($institute, $program);
    $intern = arIntern($institute, $program, $hte);

    $requirement = Requirement::create(['institute_id' => $institute->id, 'name' => 'Medical Certificate', 'type' => 'pre_deployment', 'is_active' => true]);
    RequirementSubmission::create([
        'user_id' => $intern->user_id,
        'requirement_id' => $requirement->id,
        'file_path' => 'med.pdf',
        'status' => 'rejected',
        'rejection_reason' => 'Illegible scan',
    ]);
    PhotoDtr::create(['intern_id' => $intern->id, 'dtr_date' => '2026-01-17', 'am_in_time' => '07:55:00', 'am_out_time' => '12:00:00', 'status' => 'checked']);
    DailyJournal::create(['intern_id' => $intern->id, 'date' => '2026-01-17', 'title' => 'Third day', 'journal' => 'Did the intake.', 'status' => 'pending']);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/reports')
        ->assertOk()
        ->assertJsonCount(1, 'data.dtr.rows')
        ->assertJsonPath('data.dtr.rows.0.am_in', '07:55:00')
        ->assertJsonCount(1, 'data.journals.rows')
        ->assertJsonPath('data.journals.rows.0.title', 'Third day')
        ->assertJsonCount(1, 'data.requirements.rows')
        ->assertJsonPath('data.requirements.rows.0.rejection_reason', 'Illegible scan');
});

test('intern report rows never include another interns records', function () {
    $institute = arInstitute();
    $program = arProgram($institute);
    $hte = arHte($institute, $program);
    $intern = arIntern($institute, $program, $hte, 'Santos Juan');
    $other = arIntern($institute, $program, $hte, 'Reyes Maria');

    PhotoDtr::create(['intern_id' => $other->id, 'dtr_date' => '2026-01-18', 'status' => 'checked']);

    $this->actingAs($intern->user, 'api')
        ->getJson('/api/intern/reports')
        ->assertOk()
        ->assertJsonCount(0, 'data.dtr.rows');
});

test('an intern with no linked record gets empty rows', function () {
    $user = User::factory()->create(['role' => 'intern']);

    $this->actingAs($user, 'api')
        ->getJson('/api/intern/reports')
        ->assertOk()
        ->assertJsonPath('data.intern', null)
        ->assertJsonCount(0, 'data.dtr.rows')
        ->assertJsonCount(0, 'data.journals.rows')
        ->assertJsonCount(0, 'data.requirements.rows');
});
