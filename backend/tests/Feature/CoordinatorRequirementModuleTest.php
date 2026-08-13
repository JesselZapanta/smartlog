<?php

use App\Models\Coordinator;
use App\Models\Institute;
use App\Models\Program;
use App\Models\Requirement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function coordinatorRequirementInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function coordinatorRequirementProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function coordinatorRequirementCoordinator(Institute $institute): User
{
    $coordinator = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $coordinator->id,
        'institute_id' => $institute->id,
        'program_id' => coordinatorRequirementProgram($institute)->id,
    ]);

    return $coordinator;
}

function coordinatorCreateRequirement(Institute $institute, array $attributes = []): Requirement
{
    return Requirement::create([
        'institute_id' => $institute->id,
        'name' => $attributes['name'] ?? 'Medical Certificate',
        'description' => $attributes['description'] ?? null,
        'type' => $attributes['type'] ?? 'pre_deployment',
        'is_active' => $attributes['is_active'] ?? true,
    ]);
}

test('coordinator sees only requirements of their institute', function () {
    $institute = coordinatorRequirementInstitute();
    $coordinator = coordinatorRequirementCoordinator($institute);
    coordinatorCreateRequirement($institute, ['name' => 'Medical Certificate']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/requirements')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                ['id', 'institute_id', 'name', 'description', 'type', 'is_active', 'created_at', 'updated_at'],
            ],
            'meta' => ['current_page', 'last_page', 'per_page', 'total', 'from', 'to'],
        ])
        ->assertJsonPath('meta.total', 1);
});

test('coordinator does not see requirements from other institutes', function () {
    $institute = coordinatorRequirementInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $coordinator = coordinatorRequirementCoordinator($institute);
    coordinatorCreateRequirement($otherInstitute, ['name' => 'Other Requirement']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/requirements')
        ->assertOk()
        ->assertJsonPath('meta.total', 0);
});

test('coordinator can search and filter requirements', function () {
    $institute = coordinatorRequirementInstitute();
    $coordinator = coordinatorRequirementCoordinator($institute);
    coordinatorCreateRequirement($institute, ['name' => 'Medical Certificate', 'type' => 'pre_deployment', 'is_active' => true]);
    coordinatorCreateRequirement($institute, ['name' => 'Case Study', 'type' => 'post_deployment', 'is_active' => true]);
    coordinatorCreateRequirement($institute, ['name' => 'Old Doc', 'type' => 'post_deployment', 'is_active' => false]);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/requirements?search=case')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.name', 'Case Study');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/requirements?type=post_deployment')
        ->assertOk()
        ->assertJsonPath('meta.total', 2);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/requirements?status=inactive')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.name', 'Old Doc');
});

test('coordinator can create a requirement for their institute', function () {
    $institute = coordinatorRequirementInstitute();
    $coordinator = coordinatorRequirementCoordinator($institute);

    $this->actingAs($coordinator, 'api')
        ->postJson('/api/coordinator/requirements', [
            'name' => 'Medical Certificate',
            'description' => 'Fit to work',
            'type' => 'pre_deployment',
            'is_active' => true,
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Medical Certificate')
        ->assertJsonPath('data.institute_id', $institute->id);

    expect(Requirement::where('institute_id', $institute->id)->count())->toBe(1);
});

test('coordinator cannot create a duplicate requirement name in their institute', function () {
    $institute = coordinatorRequirementInstitute();
    $coordinator = coordinatorRequirementCoordinator($institute);
    coordinatorCreateRequirement($institute, ['name' => 'Medical Certificate']);

    $this->actingAs($coordinator, 'api')
        ->postJson('/api/coordinator/requirements', [
            'name' => 'Medical Certificate',
            'type' => 'pre_deployment',
            'is_active' => true,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');
});

test('coordinator can update a requirement of their institute', function () {
    $institute = coordinatorRequirementInstitute();
    $coordinator = coordinatorRequirementCoordinator($institute);
    $requirement = coordinatorCreateRequirement($institute);

    $this->actingAs($coordinator, 'api')
        ->putJson("/api/coordinator/requirements/{$requirement->id}", [
            'name' => 'Updated Requirement',
            'description' => 'New details',
            'type' => 'post_deployment',
            'is_active' => false,
        ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Updated Requirement')
        ->assertJsonPath('data.type', 'post_deployment')
        ->assertJsonPath('data.is_active', false);
});

test('coordinator cannot update a requirement from another institute', function () {
    $institute = coordinatorRequirementInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $coordinator = coordinatorRequirementCoordinator($institute);
    $otherRequirement = coordinatorCreateRequirement($otherInstitute, ['name' => 'Other']);

    $this->actingAs($coordinator, 'api')
        ->putJson("/api/coordinator/requirements/{$otherRequirement->id}", [
            'name' => 'Hacked',
            'type' => 'pre_deployment',
            'is_active' => true,
        ])
        ->assertForbidden();
});

test('coordinator can delete a requirement of their institute', function () {
    $institute = coordinatorRequirementInstitute();
    $coordinator = coordinatorRequirementCoordinator($institute);
    $requirement = coordinatorCreateRequirement($institute);

    $this->actingAs($coordinator, 'api')
        ->deleteJson("/api/coordinator/requirements/{$requirement->id}")
        ->assertOk();

    expect(Requirement::find($requirement->id))->toBeNull();
});

test('coordinator cannot delete a requirement from another institute', function () {
    $institute = coordinatorRequirementInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $coordinator = coordinatorRequirementCoordinator($institute);
    $otherRequirement = coordinatorCreateRequirement($otherInstitute, ['name' => 'Other']);

    $this->actingAs($coordinator, 'api')
        ->deleteJson("/api/coordinator/requirements/{$otherRequirement->id}")
        ->assertForbidden();

    expect(Requirement::find($otherRequirement->id))->not->toBeNull();
});

test('coordinator requirement module is coordinator only', function () {
    $institute = coordinatorRequirementInstitute();
    coordinatorCreateRequirement($institute);

    $intern = User::factory()->create(['role' => 'intern']);

    $this->actingAs($intern, 'api')
        ->getJson('/api/coordinator/requirements')
        ->assertForbidden();
});
