<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\EvaluationCriterion;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function coordEvalInstitute2(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function coordEvalProgram2(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function coordEvalCoordinator2(Institute $institute): User
{
    $user = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $user->id,
        'institute_id' => $institute->id,
        'program_id' => coordEvalProgram2($institute)->id,
    ]);

    return $user;
}

function coordEvalHte2(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'hte']);
    Hte::create([
        'user_id' => $user->id,
        'name' => 'Test HTE',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);

    return $user;
}

function coordEvalIntern2(Institute $institute, Program $program, int $hteId, string $ojtStatus = 'hours_completed'): User
{
    $user = User::factory()->create(['role' => 'intern']);
    $intern = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hteId,
        'ojt_status' => $ojtStatus,
    ]);
    $intern->forceFill(['status' => 'approved'])->save();

    return $user->fresh();
}

function coordEvalCriterion2(Institute $institute, string $category, string $indicator): EvaluationCriterion
{
    return EvaluationCriterion::create([
        'institute_id' => $institute->id,
        'category' => $category,
        'indicator' => $indicator,
        'type' => 'intern',
        'status' => 'active',
    ]);
}

test('coordinator can list interns with evaluation progress', function () {
    $institute = coordEvalInstitute2();
    $program = coordEvalProgram2($institute);
    $coordinator = coordEvalCoordinator2($institute);
    $hte = coordEvalHte2($institute, $program);
    $intern = coordEvalIntern2($institute, $program, $hte->hte->id);

    coordEvalCriterion2($institute, 'personal_characteristics', 'Dresses appropriately');
    coordEvalCriterion2($institute, 'work_characteristics', 'Works systematically');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-evaluations')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.evaluation.total', 2)
        ->assertJsonPath('data.0.evaluation.answered', 0)
        ->assertJsonPath('data.0.evaluation.status', 'not_evaluated');
});

test('coordinator can view intern evaluation read-only with responses', function () {
    $institute = coordEvalInstitute2();
    $program = coordEvalProgram2($institute);
    $coordinator = coordEvalCoordinator2($institute);
    $hte = coordEvalHte2($institute, $program);
    $intern = coordEvalIntern2($institute, $program, $hte->hte->id);

    $c1 = coordEvalCriterion2($institute, 'personal_characteristics', 'Personal one');
    $c2 = coordEvalCriterion2($institute, 'job_knowledge', 'Job one');

    InternEvaluation::create([
        'intern_id' => $intern->intern->id,
        'hte_id' => $hte->hte->id,
        'criterion_id' => $c1->id,
        'rating' => 5,
        'is_na' => false,
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-evaluations/{$intern->uuid}")
        ->assertOk()
        ->assertJsonCount(2, 'data.criteria')
        ->assertJsonPath('data.criteria.0.response.rating', 5)
        ->assertJsonPath('data.criteria.1.response', null)
        ->assertJsonPath('data.intern.uuid', $intern->uuid);
});

test('coordinator cannot view intern evaluation outside institute', function () {
    $institute = coordEvalInstitute2();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $otherProgram = coordEvalProgram2($otherInstitute);
    $program = coordEvalProgram2($institute);
    $coordinator = coordEvalCoordinator2($institute);
    $hte = coordEvalHte2($otherInstitute, $otherProgram);
    $intern = coordEvalIntern2($otherInstitute, $otherProgram, $hte->hte->id);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-evaluations/{$intern->uuid}")
        ->assertForbidden();
});

test('coordinator intern evaluations only includes hours_completed and completed interns', function () {
    $institute = coordEvalInstitute2();
    $program = coordEvalProgram2($institute);
    $coordinator = coordEvalCoordinator2($institute);
    $hte = coordEvalHte2($institute, $program);

    coordEvalIntern2($institute, $program, $hte->hte->id, 'hours_completed');
    coordEvalIntern2($institute, $program, $hte->hte->id, 'completed');
    coordEvalIntern2($institute, $program, $hte->hte->id, 'ongoing');
    coordEvalIntern2($institute, $program, $hte->hte->id, 'pending');
    coordEvalIntern2($institute, $program, $hte->hte->id, 'pending');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-evaluations')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 2);
});
