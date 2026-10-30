<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\EvaluationCriterion;
use App\Models\Hte;
use App\Models\HteEvaluation;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function coordHteEvalInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function coordHteEvalProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function coordHteEvalCoordinator(Institute $institute): User
{
    $user = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $user->id,
        'institute_id' => $institute->id,
        'program_id' => coordHteEvalProgram($institute)->id,
    ]);

    return $user;
}

function coordHteEvalHte(Institute $institute, Program $program, string $name): User
{
    $user = User::factory()->create(['role' => 'hte']);
    Hte::create([
        'user_id' => $user->id,
        'name' => $name,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);

    return $user;
}

function coordHteEvalIntern(Institute $institute, Program $program, int $hteId, string $ojtStatus = 'ongoing'): User
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

function coordHteEvalCriterion(Institute $institute, string $category, string $indicator): EvaluationCriterion
{
    return EvaluationCriterion::create([
        'institute_id' => $institute->id,
        'category' => $category,
        'indicator' => $indicator,
        'type' => 'hte',
        'status' => 'active',
    ]);
}

/**
 * @param  array<int, int>  $ratings  criterion id => rating
 */
function coordHteEvalAnswer(Intern $intern, int $hteId, array $ratings): void
{
    foreach ($ratings as $criterionId => $rating) {
        HteEvaluation::create([
            'intern_id' => $intern->id,
            'hte_id' => $hteId,
            'criterion_id' => $criterionId,
            'rating' => $rating,
            'is_na' => false,
        ]);
    }
}

/**
 * The intern rates the old host 5s, transfers to the new host, rates it 1s,
 * and finishes OJT — the closed placement keeps the old host's evaluation.
 *
 * @return array<string, mixed>
 */
function coordHteEvalScenario(): array
{
    $institute = coordHteEvalInstitute();
    $program = coordHteEvalProgram($institute);
    $coordinator = coordHteEvalCoordinator($institute);
    $oldHost = coordHteEvalHte($institute, $program, 'Old Host');
    $newHost = coordHteEvalHte($institute, $program, 'New Host');
    $internUser = coordHteEvalIntern($institute, $program, $oldHost->hte->id, 'ongoing');
    $intern = $internUser->intern;

    $personal = coordHteEvalCriterion($institute, 'personal_characteristics', 'Personal one');
    $work = coordHteEvalCriterion($institute, 'work_characteristics', 'Work one');
    $job = coordHteEvalCriterion($institute, 'job_knowledge', 'Job one');

    coordHteEvalAnswer($intern, $oldHost->hte->id, [$personal->id => 5, $work->id => 5, $job->id => 5]);

    $intern->forceFill(['assigned_hte' => $newHost->hte->id])->save();

    coordHteEvalAnswer($intern, $newHost->hte->id, [$personal->id => 1, $work->id => 1, $job->id => 1]);

    $intern->forceFill(['ojt_status' => 'completed'])->save();

    return compact('institute', 'program', 'coordinator', 'oldHost', 'newHost', 'internUser', 'intern');
}

test('coordinator hte intern list reflects interns transferred away from the host', function () {
    $scenario = coordHteEvalScenario();

    $this->actingAs($scenario['coordinator'], 'api')
        ->getJson("/api/coordinator/hte-evaluations/{$scenario['oldHost']->uuid}/interns")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.uuid', $scenario['internUser']->uuid)
        ->assertJsonPath('data.0.evaluation.total', 3)
        ->assertJsonPath('data.0.evaluation.answered', 3)
        ->assertJsonPath('data.0.evaluation.status', 'completed')
        ->assertJsonPath('data.0.evaluation.weighted_average', 5)
        ->assertJsonPath('summary.hte.name', 'Old Host')
        ->assertJsonPath('summary.interns_count', 1)
        ->assertJsonPath('summary.evaluated_count', 1)
        ->assertJsonPath('summary.per_category.personal_characteristics.avg', 5)
        ->assertJsonPath('summary.per_category.personal_characteristics.count', 1)
        ->assertJsonPath('summary.per_category.personal_characteristics.total', 1)
        ->assertJsonPath('summary.weighted', 5);
});

test('coordinator can view a transferred interns evaluation for the previous host', function () {
    $scenario = coordHteEvalScenario();

    $this->actingAs($scenario['coordinator'], 'api')
        ->getJson("/api/coordinator/hte-evaluations/{$scenario['oldHost']->uuid}/{$scenario['internUser']->uuid}")
        ->assertOk()
        ->assertJsonPath('data.hte.name', 'Old Host')
        ->assertJsonCount(3, 'data.criteria')
        ->assertJsonPath('data.criteria.0.category', 'personal_characteristics')
        ->assertJsonPath('data.criteria.0.response.rating', 5)
        ->assertJsonPath('data.criteria.1.category', 'work_characteristics')
        ->assertJsonPath('data.criteria.1.response.rating', 5)
        ->assertJsonPath('data.criteria.2.category', 'job_knowledge')
        ->assertJsonPath('data.criteria.2.response.rating', 5);
});

test('coordinator hte intern evaluation is hidden for hosts the intern was never deployed to', function () {
    $scenario = coordHteEvalScenario();
    $otherHost = coordHteEvalHte($scenario['institute'], $scenario['program'], 'Other Host');

    $this->actingAs($scenario['coordinator'], 'api')
        ->getJson("/api/coordinator/hte-evaluations/{$otherHost->uuid}/{$scenario['internUser']->uuid}")
        ->assertNotFound();
});

test('coordinator hte list counts include interns transferred away from the host', function () {
    $scenario = coordHteEvalScenario();

    $data = $this->actingAs($scenario['coordinator'], 'api')
        ->getJson('/api/coordinator/hte-evaluations')
        ->assertOk()
        ->json('data');

    $oldHost = collect($data)->firstWhere('name', 'Old Host');
    $newHost = collect($data)->firstWhere('name', 'New Host');

    expect($oldHost)->not->toBeNull();
    expect($newHost)->not->toBeNull();

    expect($oldHost['interns_count'])->toBe(1)
        ->and($oldHost['evaluated_count'])->toBe(1)
        ->and($newHost['interns_count'])->toBe(1)
        ->and($newHost['evaluated_count'])->toBe(1);
});
