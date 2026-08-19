<?php

use App\Models\Coordinator;
use App\Models\EvaluationCriterion;
use App\Models\Institute;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function ceInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function ceCoordinator(?Institute $institute = null): User
{
    $institute = $institute ?? ceInstitute();
    $coordinator = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $coordinator->id,
        'institute_id' => $institute->id,
        'program_id' => Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science'])->id,
    ]);

    return $coordinator;
}

function ceCriterion(int $instituteId, array $attributes = []): EvaluationCriterion
{
    return EvaluationCriterion::create([
        'institute_id' => $instituteId,
        'category' => $attributes['category'] ?? 'personal_characteristics',
        'indicator' => $attributes['indicator'] ?? 'Shows up on time',
        'type' => $attributes['type'] ?? 'intern',
        'status' => $attributes['status'] ?? 'active',
    ]);
}

test('coordinator can list evaluation criteria with pagination meta', function () {
    $institute = ceInstitute();
    $coordinator = ceCoordinator($institute);
    ceCriterion($institute->id, ['indicator' => 'Punctuality']);
    ceCriterion($institute->id, ['indicator' => 'Teamwork']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/evaluations')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'category', 'indicator', 'type', 'status']],
            'meta' => ['current_page', 'last_page', 'per_page', 'total', 'from', 'to'],
        ])
        ->assertJsonPath('meta.total', 2);
});

test('coordinator can search evaluation criteria by indicator', function () {
    $institute = ceInstitute();
    $coordinator = ceCoordinator($institute);
    ceCriterion($institute->id, ['indicator' => 'Punctuality']);
    ceCriterion($institute->id, ['indicator' => 'Teamwork']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/evaluations?search=Teamwork')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.indicator', 'Teamwork');
});

test('coordinator can filter evaluation criteria by category, type and status', function () {
    $institute = ceInstitute();
    $coordinator = ceCoordinator($institute);
    ceCriterion($institute->id, ['category' => 'personal_characteristics', 'indicator' => 'Punctuality']);
    ceCriterion($institute->id, ['category' => 'work_characteristics', 'indicator' => 'Teamwork', 'status' => 'inactive']);
    ceCriterion($institute->id, ['category' => 'job_knowledge', 'indicator' => 'Technical skill', 'type' => 'hte']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/evaluations?category=work_characteristics')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.category', 'work_characteristics');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/evaluations?status=active')
        ->assertOk()
        ->assertJsonCount(2, 'data');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/evaluations?type=hte')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.indicator', 'Technical skill')
        ->assertJsonPath('data.0.type', 'hte');
});

test('coordinator sees only own-institute criteria', function () {
    $institute = ceInstitute();
    $coordinator = ceCoordinator($institute);
    $other = Institute::create(['name' => 'Other Institute']);

    ceCriterion($institute->id, ['indicator' => 'Own institute']);
    ceCriterion($other->id, ['indicator' => 'Other institute']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/evaluations')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.indicator', 'Own institute')
        ->assertJsonPath('meta.total', 1);
});

test('coordinator can sort evaluation criteria', function () {
    $institute = ceInstitute();
    $coordinator = ceCoordinator($institute);
    ceCriterion($institute->id, ['indicator' => 'Alpha']);
    ceCriterion($institute->id, ['indicator' => 'Zulu']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/evaluations?sort=indicator&order=asc')
        ->assertOk()
        ->assertJsonPath('data.0.indicator', 'Alpha')
        ->assertJsonPath('data.1.indicator', 'Zulu');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/evaluations?sort=indicator&order=desc')
        ->assertOk()
        ->assertJsonPath('data.0.indicator', 'Zulu');
});

test('coordinator can create an evaluation criterion', function () {
    $institute = ceInstitute();
    $coordinator = ceCoordinator($institute);

    $this->actingAs($coordinator, 'api')
        ->postJson('/api/coordinator/evaluations', [
            'category' => 'job_knowledge',
            'indicator' => 'Applies technical concepts',
            'status' => 'active',
        ])
        ->assertCreated()
        ->assertJsonPath('data.category', 'job_knowledge')
        ->assertJsonPath('data.indicator', 'Applies technical concepts')
        ->assertJsonPath('data.status', 'active');

    expect(EvaluationCriterion::count())->toBe(1);
    expect(EvaluationCriterion::first()->institute_id)->toBe($institute->id);
});

test('evaluation criterion validation rejects invalid category and missing fields', function () {
    $coordinator = ceCoordinator();

    $this->actingAs($coordinator, 'api')
        ->postJson('/api/coordinator/evaluations', [
            'category' => 'not_a_category',
            'indicator' => '',
            'status' => '',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['category', 'indicator', 'status']);

    expect(EvaluationCriterion::count())->toBe(0);
});

test('coordinator can view an evaluation criterion', function () {
    $institute = ceInstitute();
    $coordinator = ceCoordinator($institute);
    $criterion = ceCriterion($institute->id);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/evaluations/{$criterion->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $criterion->id)
        ->assertJsonPath('data.indicator', $criterion->indicator);
});

test('coordinator can update an evaluation criterion', function () {
    $institute = ceInstitute();
    $coordinator = ceCoordinator($institute);
    $criterion = ceCriterion($institute->id, ['indicator' => 'Old indicator']);

    $this->actingAs($coordinator, 'api')
        ->putJson("/api/coordinator/evaluations/{$criterion->id}", [
            'category' => 'work_characteristics',
            'indicator' => 'New indicator',
            'status' => 'inactive',
        ])
        ->assertOk()
        ->assertJsonPath('data.indicator', 'New indicator')
        ->assertJsonPath('data.status', 'inactive');

    expect($criterion->refresh()->category)->toBe('work_characteristics');
});

test('coordinator can delete an evaluation criterion', function () {
    $institute = ceInstitute();
    $coordinator = ceCoordinator($institute);
    $criterion = ceCriterion($institute->id);

    $this->actingAs($coordinator, 'api')
        ->deleteJson("/api/coordinator/evaluations/{$criterion->id}")
        ->assertOk()
        ->assertJsonPath('data.message', 'Evaluation criterion deleted successfully.');

    expect(EvaluationCriterion::count())->toBe(0);
});

test('coordinator cannot modify another institute criterion', function () {
    $institute = ceInstitute();
    $coordinator = ceCoordinator($institute);
    $other = Institute::create(['name' => 'Other Institute']);
    $otherCriterion = ceCriterion($other->id, ['indicator' => 'Other institute']);

    $this->actingAs($coordinator, 'api')
        ->putJson("/api/coordinator/evaluations/{$otherCriterion->id}", [
            'category' => 'work_characteristics',
            'indicator' => 'Hacked',
            'status' => 'active',
        ])
        ->assertForbidden();

    $this->actingAs($coordinator, 'api')
        ->deleteJson("/api/coordinator/evaluations/{$otherCriterion->id}")
        ->assertForbidden();
});

test('evaluation criteria module is coordinator only', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin, 'api')
        ->getJson('/api/coordinator/evaluations')
        ->assertForbidden();

    $this->actingAs($admin, 'api')
        ->postJson('/api/coordinator/evaluations', [
            'category' => 'job_knowledge',
            'indicator' => 'Test',
            'status' => 'active',
        ])
        ->assertForbidden();
});
