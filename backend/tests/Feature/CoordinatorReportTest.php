<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\DailyJournal;
use App\Models\EvaluationCriterion;
use App\Models\Hte;
use App\Models\HteEvaluation;
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

function crInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function crProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function crTerm(): AcademicTerm
{
    return AcademicTerm::firstOrCreate(['code' => '251'], ['description' => 'First Semester', 'status' => 'active']);
}

function crHte(Institute $institute, Program $program, string $name = 'City Hall'): Hte
{
    $user = User::factory()->create(['role' => 'hte']);
    $hte = Hte::create([
        'user_id' => $user->id,
        'name' => $name,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);

    return $hte->load('user');
}

function crIntern(Institute $institute, Program $program, Hte $hte, string $name = 'Dela Cruz'): Intern
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
        'academic_year_id' => crTerm()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hte->id,
        'ojt_status' => 'ongoing',
    ]);

    return $intern->load('user');
}

function crCoordinator(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $user->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    return $user;
}

function crCriterion(Institute $institute, string $type = 'intern'): EvaluationCriterion
{
    return EvaluationCriterion::create([
        'institute_id' => $institute->id,
        'category' => 'job_knowledge',
        'indicator' => 'Technical skill',
        'type' => $type,
        'status' => 'active',
    ]);
}

test('evaluation totals are summed for the combined report', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program);
    $intern = crIntern($institute, $program, $hte);
    $coordinator = crCoordinator($institute, $program);

    $internCriterion = crCriterion($institute, 'intern');
    $hteCriterion = crCriterion($institute, 'hte');

    InternEvaluation::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'criterion_id' => $internCriterion->id, 'rating' => 5]);
    InternEvaluation::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'criterion_id' => $hteCriterion->id, 'rating' => 4]);
    HteEvaluation::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'criterion_id' => $hteCriterion->id, 'rating' => 3]);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonPath('data.evaluations.intern_ratings', 2)
        ->assertJsonPath('data.evaluations.hte_ratings', 1)
        ->assertJsonPath('data.evaluations.total', 3);
});

test('evaluation totals default to zero when there are no ratings', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $coordinator = crCoordinator($institute, $program);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonPath('data.evaluations.total', 0);
});

test('the issues report combines intern and hte concerns', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program);
    $intern = crIntern($institute, $program, $hte);
    $coordinator = crCoordinator($institute, $program);

    Issue::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'type' => 'intern', 'issues' => 'Late attendance.', 'status' => 'pending']);
    Issue::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'type' => 'intern', 'issues' => 'No clear instructions.', 'status' => 'resolve']);
    Issue::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'type' => 'hte', 'issues' => 'Unresponsive on the phone.', 'status' => 'pending']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonPath('data.issues.total', 3)
        ->assertJsonPath('data.issues.by_type.intern', 2)
        ->assertJsonPath('data.issues.by_type.hte', 1)
        ->assertJsonPath('data.issues.by_status.pending', 2)
        ->assertJsonPath('data.issues.by_status.resolve', 1);
});

test('recent concerns expose the hte name and the direction', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program, 'Municipal Library');
    $intern = crIntern($institute, $program, $hte);
    $coordinator = crCoordinator($institute, $program);

    Issue::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'type' => 'hte', 'issues' => 'Unresponsive.', 'status' => 'pending']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonPath('data.issues.recent.0.hte', 'Municipal Library')
        ->assertJsonPath('data.issues.recent.0.type', 'hte')
        ->assertJsonPath('data.issues.recent.0.status', 'pending')
        ->assertJsonPath('data.issues.recent.0.excerpt', 'Unresponsive.');
});

test('concerns from another institute are excluded', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $coordinator = crCoordinator($institute, $program);

    $otherInstitute = crInstitute();
    $otherInstitute->update(['name' => 'Institute of Nursing']);
    $otherProgram = crProgram($otherInstitute);
    $otherHte = crHte($otherInstitute, $otherProgram, 'Other HTE');
    $otherIntern = crIntern($otherInstitute, $otherProgram, $otherHte);

    Issue::create(['intern_id' => $otherIntern->id, 'hte_id' => $otherHte->id, 'type' => 'intern', 'issues' => 'Foreign.', 'status' => 'pending']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonPath('data.issues.total', 0)
        ->assertJsonCount(0, 'data.issues.recent');
});

test('annex c rows expose full untruncated text for solutions and recommendations', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program, 'City Hall');
    $intern = crIntern($institute, $program, $hte, 'Santos Juan');
    $coordinator = crCoordinator($institute, $program);

    $long = str_repeat('Detailed concern text. ', 12);

    Issue::create([
        'intern_id' => $intern->id,
        'hte_id' => $hte->id,
        'type' => 'hte',
        'issues' => $long,
        'solutions' => 'Met the supervisor weekly.',
        'recommendations' => 'Keep a shared logbook.',
        'status' => 'resolve',
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonCount(1, 'data.issues.rows')
        ->assertJsonPath('data.issues.rows.0.student', 'Santos Juan')
        ->assertJsonPath('data.issues.rows.0.hte', 'City Hall')
        ->assertJsonPath('data.issues.rows.0.direction', 'HTE')
        ->assertJsonPath('data.issues.rows.0.solutions', 'Met the supervisor weekly.')
        ->assertJsonPath('data.issues.rows.0.recommendations', 'Keep a shared logbook.')
        ->assertJsonPath('data.issues.rows.0.status', 'resolve');
});

test('annex c rows keep the intern direction label and are not truncated', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program);
    $intern = crIntern($institute, $program, $hte);
    $coordinator = crCoordinator($institute, $program);

    $issue = Issue::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'type' => 'intern', 'issues' => 'Late attendance.', 'status' => 'pending']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonPath('data.issues.rows.0.direction', 'Intern')
        ->assertJsonPath('data.issues.rows.0.id', $issue->id)
        ->assertJsonPath('data.issues.rows.0.issues', 'Late attendance.');

    expect(strlen($this->getJson('/api/coordinator/reports')->json('data.issues.rows.0.issues')))
        ->toBe(strlen('Late attendance.'));
});

test('the payload carries the coordinator name and degree program for the annex header', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $coordinator = User::factory()->create([
        'role' => 'ojt_coordinator',
        'firstname' => 'Juan',
        'middlename' => null,
        'lastname' => 'Dela Cruz',
        'extension' => null,
    ]);
    Coordinator::create(['user_id' => $coordinator->id, 'institute_id' => $institute->id, 'program_id' => $program->id]);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonPath('data.coordinator.name', 'Juan Dela Cruz')
        ->assertJsonPath('data.coordinator.program', 'BS Computer Science');
});

test('the intern roster lists real records rather than counts', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program, 'City Hall');
    $intern = crIntern($institute, $program, $hte, 'Santos Juan');
    $coordinator = crCoordinator($institute, $program);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonCount(1, 'data.interns.rows')
        ->assertJsonPath('data.interns.rows.0.name', 'Santos Juan')
        ->assertJsonPath('data.interns.rows.0.program', 'BS Computer Science')
        ->assertJsonPath('data.interns.rows.0.hte', 'City Hall')
        ->assertJsonPath('data.interns.rows.0.ojt_status', 'ongoing');
});

test('hte detail lists the intern names assigned to each establishment', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program, 'City Hall');
    $internA = crIntern($institute, $program, $hte, 'Santos Juan');
    $internB = crIntern($institute, $program, $hte, 'Reyes Maria');
    $coordinator = crCoordinator($institute, $program);

    $response = $this->actingAs($coordinator, 'api')->getJson('/api/coordinator/reports')->assertOk();

    $detail = collect($response->json('data.htes.detail'))->firstWhere('name', 'City Hall');

    expect($detail['assigned'])->toBe(2)
        ->and($detail['interns'])->toContain('Santos Juan', 'Reyes Maria')
        ->and($response->json('data.htes'))->not->toHaveKey('top_htes');
});

test('dtr rows expose the four time-in and time-out slots', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program);
    $intern = crIntern($institute, $program, $hte);
    $coordinator = crCoordinator($institute, $program);

    PhotoDtr::create([
        'intern_id' => $intern->id,
        'dtr_date' => '2026-01-15',
        'am_in_time' => '08:05:00',
        'am_out_time' => '12:00:00',
        'pm_in_time' => '13:00:00',
        'pm_out_time' => '17:00:00',
        'status' => 'checked',
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonCount(1, 'data.dtr.rows')
        ->assertJsonPath('data.dtr.rows.0.student', 'Dela Cruz')
        ->assertJsonPath('data.dtr.rows.0.am_in', '08:05:00')
        ->assertJsonPath('data.dtr.rows.0.pm_out', '17:00:00')
        ->assertJsonPath('data.dtr.rows.0.status', 'checked');
});

test('journal rows expose the real title and status', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program);
    $intern = crIntern($institute, $program, $hte);
    $coordinator = crCoordinator($institute, $program);

    DailyJournal::create([
        'intern_id' => $intern->id,
        'date' => '2026-01-15',
        'title' => 'First day at the library',
        'journal' => 'Oriented on the shelving system.',
        'status' => 'verified',
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonCount(1, 'data.journals.rows')
        ->assertJsonPath('data.journals.rows.0.title', 'First day at the library')
        ->assertJsonPath('data.journals.rows.0.status', 'verified');
});

test('requirement submission rows expose student requirement and review dates', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program);
    $intern = crIntern($institute, $program, $hte);
    $coordinator = crCoordinator($institute, $program);

    $requirement = Requirement::create([
        'institute_id' => $institute->id,
        'name' => 'Medical Certificate',
        'type' => 'pre_deployment',
        'is_active' => true,
    ]);

    RequirementSubmission::create([
        'user_id' => $intern->user_id,
        'requirement_id' => $requirement->id,
        'file_path' => 'certs/med.pdf',
        'status' => 'approved',
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonCount(1, 'data.requirements.rows')
        ->assertJsonPath('data.requirements.rows.0.student', 'Dela Cruz')
        ->assertJsonPath('data.requirements.rows.0.requirement', 'Medical Certificate')
        ->assertJsonPath('data.requirements.rows.0.type', 'pre_deployment')
        ->assertJsonPath('data.requirements.rows.0.status', 'approved');
});

test('evaluation rows give per-intern rating counts and averages excluding N/A', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program);
    $intern = crIntern($institute, $program, $hte);
    $coordinator = crCoordinator($institute, $program);

    $internCriterion = crCriterion($institute, 'intern');
    $hteCriterion = crCriterion($institute, 'hte');

    InternEvaluation::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'criterion_id' => $internCriterion->id, 'rating' => 4]);
    InternEvaluation::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'criterion_id' => $hteCriterion->id, 'rating' => 2]);
    HteEvaluation::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'criterion_id' => $hteCriterion->id, 'rating' => 5]);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonPath('data.evaluations.rows.0.student', 'Dela Cruz')
        ->assertJsonPath('data.evaluations.rows.0.hte', 'City Hall')
        ->assertJsonPath('data.evaluations.rows.0.intern_rated', 2)
        ->assertJsonPath('data.evaluations.rows.0.intern_average', 3)
        ->assertJsonPath('data.evaluations.rows.0.hte_rated', 1)
        ->assertJsonPath('data.evaluations.rows.0.hte_average', 5);
});

test('evaluation rows report null averages when nothing was rated', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program);
    $intern = crIntern($institute, $program, $hte);
    $coordinator = crCoordinator($institute, $program);

    $criterion = crCriterion($institute, 'intern');
    InternEvaluation::create(['intern_id' => $intern->id, 'hte_id' => $hte->id, 'criterion_id' => $criterion->id, 'rating' => null, 'is_na' => true]);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonPath('data.evaluations.rows.0.intern_rated', 0)
        ->assertJsonPath('data.evaluations.rows.0.intern_average', null);
});

test('every concern reaches the pdf rows with no artificial cap', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program);
    $intern = crIntern($institute, $program, $hte);
    $coordinator = crCoordinator($institute, $program);

    foreach (range(1, 60) as $i) {
        Issue::create([
            'intern_id' => $intern->id,
            'hte_id' => $hte->id,
            'type' => $i % 2 === 0 ? 'hte' : 'intern',
            'issues' => "Concern number {$i}",
            'solutions' => "Solution {$i}",
            'recommendations' => "Recommendation {$i}",
            'status' => 'pending',
        ]);
    }

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonCount(60, 'data.issues.rows')
        ->assertJsonPath('data.issues.rows.59.issues', 'Concern number 60')
        ->assertJsonPath('data.issues.rows.59.solutions', 'Solution 60');
});

test('every dtr record reaches the pdf rows with no artificial cap', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program);
    $intern = crIntern($institute, $program, $hte);
    $coordinator = crCoordinator($institute, $program);

    foreach (range(1, 45) as $i) {
        PhotoDtr::create([
            'intern_id' => $intern->id,
            'dtr_date' => sprintf('2026-%02d-%02d', intdiv($i - 1, 28) + 1, (($i - 1) % 28) + 1),
            'am_in_time' => sprintf('08:%02d:00', $i % 60),
            'status' => 'checked',
        ]);
    }

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonCount(45, 'data.dtr.rows')
        ->assertJsonPath('data.dtr.rows.0.date', '2026-01-01')
        ->assertJsonPath('data.dtr.rows.44.date', '2026-02-17');
});

test('every intern reaches the roster with no artificial cap', function () {
    $institute = crInstitute();
    $program = crProgram($institute);
    $hte = crHte($institute, $program);
    $coordinator = crCoordinator($institute, $program);

    foreach (range(1, 40) as $i) {
        crIntern($institute, $program, $hte, "Student{$i} Lastname");
    }

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonCount(40, 'data.interns.rows')
        ->assertJsonCount(40, 'data.evaluations.rows');
});

test('a coordinator without an institute gets an empty payload including totals', function () {
    $user = User::factory()->create(['role' => 'ojt_coordinator']);

    $this->actingAs($user, 'api')
        ->getJson('/api/coordinator/reports')
        ->assertOk()
        ->assertJsonPath('data.issues.total', 0)
        ->assertJsonPath('data.evaluations.total', 0)
        ->assertJsonPath('data.evaluations.intern_ratings', 0);
});
