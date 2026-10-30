<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternHteAssignment;
use App\Models\Program;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function scopeInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function scopeProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function scopeTerm(): AcademicTerm
{
    return AcademicTerm::firstOrCreate(
        ['code' => '2025-2026'],
        ['description' => 'First Semester']
    );
}

function scopeHte(Institute $institute, Program $program, string $name): User
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

function scopeCoordinator(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $user->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    return $user;
}

function scopeIntern(Institute $institute, Program $program, int $hteId): User
{
    $user = User::factory()->create(['role' => 'intern']);

    $intern = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => scopeTerm()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hteId,
        'ojt_status' => 'pending',
    ]);

    $intern->forceFill(['status' => 'approved'])->save();

    return $user;
}

function scopeRequirement(Institute $institute, string $name, array $attributes = []): Requirement
{
    return Requirement::create([
        'institute_id' => $institute->id,
        'name' => $name,
        'description' => null,
        'type' => $attributes['type'] ?? 'pre_deployment',
        'is_active' => $attributes['is_active'] ?? true,
    ]);
}

function scopeSubmit(User $intern, Requirement $requirement): void
{
    Storage::fake('public');

    RequirementSubmission::create([
        'user_id' => $intern->id,
        'requirement_id' => $requirement->id,
        'file_path' => UploadedFile::fake()->create('file.pdf', 1024, 'application/pdf')->store('requirement-submissions', 'public'),
    ]);
}

function scopeTransfer(Intern $intern, int $hteId): InternHteAssignment
{
    $intern->forceFill(['assigned_hte' => $hteId, 'ojt_status' => 'pending'])->save();

    return $intern->activePlacement();
}

test('a transferred intern starts a fresh submission cycle at the new host', function () {
    Storage::fake('public');

    $institute = scopeInstitute();
    $program = scopeProgram($institute);
    $first = scopeHte($institute, $program, 'City Hall');
    $second = scopeHte($institute, $program, 'Barangay Office');
    $intern = scopeIntern($institute, $program, $first->hte->id);
    $requirement = scopeRequirement($institute, 'Medical Certificate');

    $intern->intern->forceFill(['ojt_status' => 'ongoing'])->save();

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('medical.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk();

    $firstPlacement = $intern->intern->fresh()->activePlacement();

    // At the new host the requirement is unanswered again...
    scopeTransfer($intern->intern, $second->hte->id);

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonPath('data.0.submission', null);

    // ...and submitting it again lands on the new placement, leaving the old record.
    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('medical-again.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk();

    $submissions = RequirementSubmission::where('requirement_id', $requirement->id)
        ->orderBy('id')
        ->get();

    expect($submissions)->toHaveCount(2);
    expect($submissions[0]->placement_id)->toBe($firstPlacement->id);
    expect($submissions[0]->intern_id)->toBe($intern->intern->id);
    expect($submissions[1]->placement_id)->toBe($intern->intern->fresh()->activePlacement()->id);
});

test('the intern requirements page keeps previous placements with their submissions', function () {
    Storage::fake('public');

    $institute = scopeInstitute();
    $program = scopeProgram($institute);
    $first = scopeHte($institute, $program, 'City Hall');
    $second = scopeHte($institute, $program, 'Barangay Office');
    $intern = scopeIntern($institute, $program, $first->hte->id);
    $submitted = scopeRequirement($institute, 'Medical Certificate');
    $missed = scopeRequirement($institute, 'MOA');

    $intern->intern->forceFill(['ojt_status' => 'ongoing'])->save();

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$submitted->id}/submit", [
            'file' => UploadedFile::fake()->create('medical.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk();

    $oldPlacement = $intern->intern->fresh()->activePlacement();

    scopeTransfer($intern->intern, $second->hte->id);

    $payload = $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->json();

    // The current host starts blank...
    expect(collect($payload['data'])->firstWhere('id', $submitted->id)['submission'])->toBeNull();

    // ...while the previous host keeps its set and record.
    expect($payload['previous_placements'])->toHaveCount(1);

    $past = $payload['previous_placements'][0];

    expect($past['id'])->toBe($oldPlacement->id)
        ->and($past['hte']['name'])->toBe('City Hall')
        ->and($past['assigned_at'])->not->toBeNull()
        ->and($past['unassigned_at'])->not->toBeNull()
        ->and($past['requirements'])->toHaveCount(2);

    $rows = collect($past['requirements'])->keyBy('id');

    expect($rows[$submitted->id]['submission']['status'])->toBe('pending')
        ->and($rows[$submitted->id]['submission']['file_name'])->not->toBeNull()
        ->and($rows[$missed->id]['submission'])->toBeNull();
});

test('previous placements stay empty while the intern serves the first host', function () {
    $institute = scopeInstitute();
    $program = scopeProgram($institute);
    $first = scopeHte($institute, $program, 'City Hall');
    $intern = scopeIntern($institute, $program, $first->hte->id);
    scopeRequirement($institute, 'Medical Certificate');

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonCount(0, 'previous_placements')
        ->assertJsonCount(1, 'data');
});

test('deployment counts approvals at the current placement only', function () {
    Storage::fake('public');

    $institute = scopeInstitute();
    $program = scopeProgram($institute);
    $first = scopeHte($institute, $program, 'City Hall');
    $second = scopeHte($institute, $program, 'Barangay Office');
    $coordinator = scopeCoordinator($institute, $program);
    $intern = scopeIntern($institute, $program, $first->hte->id);
    $requirement = scopeRequirement($institute, 'Medical Certificate');

    scopeSubmit($intern, $requirement);
    RequirementSubmission::first()->forceFill(['status' => 'approved'])->save();

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/deploy")
        ->assertOk();

    // The intern is redeployed at a new host and the previous approval no longer counts.
    $intern->intern->forceFill(['assigned_hte' => $second->hte->id, 'ojt_status' => 'pending'])->save();

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/deploy")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('requirements');

    scopeSubmit($intern, $requirement);
    RequirementSubmission::orderByDesc('id')->first()->forceFill(['status' => 'approved'])->save();

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/deploy")
        ->assertOk();

    $placement = $intern->intern->fresh()->activePlacement();

    expect($placement->deployed_at)->not->toBeNull();
    expect($intern->intern->fresh()->start_date?->toDateString())->toBe(now()->toDateString());
});

test('the coordinator list counts progress at the current host', function () {
    Storage::fake('public');

    $institute = scopeInstitute();
    $program = scopeProgram($institute);
    $first = scopeHte($institute, $program, 'City Hall');
    $second = scopeHte($institute, $program, 'Barangay Office');
    $coordinator = scopeCoordinator($institute, $program);
    $intern = scopeIntern($institute, $program, $first->hte->id);
    $requirement = scopeRequirement($institute, 'Medical Certificate');

    scopeSubmit($intern, $requirement);
    RequirementSubmission::first()->forceFill(['status' => 'approved'])->save();

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-requirements')
        ->assertOk()
        ->assertJsonPath('data.0.submitted', 1)
        ->assertJsonPath('data.0.total', 1);

    scopeTransfer($intern->intern, $second->hte->id);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-requirements')
        ->assertOk()
        ->assertJsonPath('data.0.submitted', 0)
        ->assertJsonPath('data.0.total', 1);
});

test('a customised placement set restricts what the intern can submit', function () {
    Storage::fake('public');

    $institute = scopeInstitute();
    $program = scopeProgram($institute);
    $first = scopeHte($institute, $program, 'City Hall');
    $second = scopeHte($institute, $program, 'Barangay Office');
    $intern = scopeIntern($institute, $program, $first->hte->id);
    $removed = scopeRequirement($institute, 'Medical Certificate');
    $kept = scopeRequirement($institute, 'MOA');

    $placement = scopeTransfer($intern->intern, $second->hte->id);

    // The coordinator picks a different set for the new host.
    $placement->forceFill(['requirements_customized_at' => now()])->save();
    $placement->requirements()->sync([$kept->id]);

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$removed->id}/submit", [
            'file' => UploadedFile::fake()->create('medical.pdf', 1024, 'application/pdf'),
        ])
        ->assertForbidden();

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$kept->id}/submit", [
            'file' => UploadedFile::fake()->create('moa.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk();

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $kept->id);
});

test('a customised placement set drives the deployment gate', function () {
    Storage::fake('public');

    $institute = scopeInstitute();
    $program = scopeProgram($institute);
    $first = scopeHte($institute, $program, 'City Hall');
    $second = scopeHte($institute, $program, 'Barangay Office');
    $coordinator = scopeCoordinator($institute, $program);
    $intern = scopeIntern($institute, $program, $first->hte->id);
    $removed = scopeRequirement($institute, 'Medical Certificate');
    $kept = scopeRequirement($institute, 'MOA');

    scopeSubmit($intern, $removed);

    $placement = scopeTransfer($intern->intern, $second->hte->id);
    $placement->forceFill(['requirements_customized_at' => now()])->save();
    $placement->requirements()->sync([$kept->id]);

    // The old host's approved file for a cut requirement cannot deploy the new host,
    // and neither can the requirement itself any more.
    RequirementSubmission::query()->update(['status' => 'approved']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/deploy")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('requirements');

    $submission = RequirementSubmission::create([
        'user_id' => $intern->id,
        'placement_id' => $placement->id,
        'requirement_id' => $kept->id,
        'file_path' => UploadedFile::fake()->create('moa.pdf', 1024, 'application/pdf')->store('requirement-submissions', 'public'),
    ]);
    $submission->forceFill(['status' => 'approved'])->save();

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/deploy")
        ->assertOk();
});
