<?php

use App\Models\Institute;
use App\Models\Requirement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function requirementInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function requirementAdmin(): User
{
    return User::factory()->create(['role' => 'admin']);
}

function createRequirement(Institute $institute, array $attributes = []): Requirement
{
    return Requirement::create([
        'institute_id' => $institute->id,
        'name' => $attributes['name'] ?? 'Medical Certificate',
        'description' => $attributes['description'] ?? null,
        'type' => $attributes['type'] ?? 'pre_deployment',
        'is_active' => $attributes['is_active'] ?? true,
    ]);
}

test('admin can list requirements with pagination meta', function () {
    $institute = requirementInstitute();
    createRequirement($institute);

    $this->actingAs(requirementAdmin(), 'api')
        ->getJson('/api/requirements')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                ['id', 'institute_id', 'name', 'description', 'type', 'is_active', 'created_at', 'updated_at'],
            ],
            'meta' => ['current_page', 'last_page', 'per_page', 'total', 'from', 'to'],
        ])
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.name', 'Medical Certificate')
        ->assertJsonPath('data.0.type', 'pre_deployment');
});

test('admin can search requirements by name', function () {
    $institute = requirementInstitute();
    createRequirement($institute, ['name' => 'Medical Certificate']);
    createRequirement($institute, ['name' => 'NBI Clearance']);

    $this->actingAs(requirementAdmin(), 'api')
        ->getJson('/api/requirements?search=nbi')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.name', 'NBI Clearance');
});

test('admin can filter requirements by institute, type and status', function () {
    $institute = requirementInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    createRequirement($institute, ['name' => 'Pre', 'type' => 'pre_deployment', 'is_active' => true]);
    $post = createRequirement($institute, ['name' => 'Post', 'type' => 'post_deployment', 'is_active' => true]);
    createRequirement($institute, ['name' => 'Inactive', 'type' => 'post_deployment', 'is_active' => false]);

    $this->actingAs(requirementAdmin(), 'api')
        ->getJson('/api/requirements?type=post_deployment')
        ->assertOk()
        ->assertJsonPath('meta.total', 2);

    $this->actingAs(requirementAdmin(), 'api')
        ->getJson('/api/requirements?status=inactive')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.name', 'Inactive');

    $this->actingAs(requirementAdmin(), 'api')
        ->getJson('/api/requirements?institute_id='.$otherInstitute->id)
        ->assertOk()
        ->assertJsonPath('meta.total', 0);
});

test('admin can create a requirement', function () {
    $institute = requirementInstitute();

    $this->actingAs(requirementAdmin(), 'api')
        ->postJson('/api/requirements', [
            'institute_id' => $institute->id,
            'name' => 'Medical Certificate',
            'description' => 'Fit to work',
            'type' => 'pre_deployment',
            'is_active' => true,
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Medical Certificate')
        ->assertJsonPath('data.type', 'pre_deployment')
        ->assertJsonPath('data.is_active', true);

    expect(Requirement::count())->toBe(1);
});

test('requirement name must be unique per institute', function () {
    $institute = requirementInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    createRequirement($institute, ['name' => 'Medical Certificate']);

    $this->actingAs(requirementAdmin(), 'api')
        ->postJson('/api/requirements', [
            'institute_id' => $institute->id,
            'name' => 'Medical Certificate',
            'type' => 'pre_deployment',
            'is_active' => true,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');

    // Same name in a different institute is fine.
    $this->actingAs(requirementAdmin(), 'api')
        ->postJson('/api/requirements', [
            'institute_id' => $otherInstitute->id,
            'name' => 'Medical Certificate',
            'type' => 'pre_deployment',
            'is_active' => true,
        ])
        ->assertCreated();
});

test('admin can update a requirement', function () {
    $institute = requirementInstitute();
    $requirement = createRequirement($institute);

    $this->actingAs(requirementAdmin(), 'api')
        ->putJson("/api/requirements/{$requirement->id}", [
            'institute_id' => $institute->id,
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

test('admin can delete a requirement', function () {
    $institute = requirementInstitute();
    $requirement = createRequirement($institute);

    $this->actingAs(requirementAdmin(), 'api')
        ->deleteJson("/api/requirements/{$requirement->id}")
        ->assertOk();

    expect(Requirement::count())->toBe(0);
});

test('requirements module is admin only', function () {
    $institute = requirementInstitute();
    createRequirement($institute);

    $intern = User::factory()->create(['role' => 'intern']);

    $this->actingAs($intern, 'api')
        ->getJson('/api/requirements')
        ->assertForbidden();
});
