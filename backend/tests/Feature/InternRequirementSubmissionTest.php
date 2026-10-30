<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Program;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function internReqInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function internReqProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function internReqHte(Institute $institute, Program $program, array $attributes = []): User
{
    $user = User::factory()->create(['role' => 'hte', ...$attributes]);
    Hte::create([
        'user_id' => $user->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'name' => $attributes['name'] ?? 'City Hall',
        'status' => $attributes['status'] ?? 'active',
    ]);

    return $user;
}

function internReqUser(Institute $institute, Program $program, array $attributes = []): User
{
    $user = User::factory()->create(['role' => 'intern', ...$attributes]);
    $record = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    $record->forceFill(['status' => 'approved'])->save();

    $record->forceFill(['assigned_hte' => internReqHte($institute, $program)->hte->id])->save();

    return $user;
}

function internReqRequirement(Institute $institute, array $attributes = []): Requirement
{
    return Requirement::create([
        'institute_id' => $institute->id,
        'name' => $attributes['name'] ?? 'Medical Certificate',
        'description' => $attributes['description'] ?? null,
        'type' => $attributes['type'] ?? 'pre_deployment',
        'is_active' => $attributes['is_active'] ?? true,
    ]);
}

test('intern sees only active requirements of their institute with submission status', function () {
    Storage::fake('public');
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);

    $active = internReqRequirement($institute, ['name' => 'Medical Certificate']);
    internReqRequirement($institute, ['name' => 'Inactive Doc', 'is_active' => false]);

    $submission = RequirementSubmission::create([
        'user_id' => $intern->id,
        'requirement_id' => $active->id,
        'file_path' => UploadedFile::fake()->create('med.pdf', 1024, 'application/pdf')->store('requirement-submissions', 'public'),
    ]);

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Medical Certificate')
        ->assertJsonStructure(['data' => [['id', 'name', 'description', 'type', 'submission']]])
        ->assertJsonPath('data.0.submission.id', $submission->id)
        ->assertJsonPath('data.0.submission.file_name', basename($submission->file_path))
        ->assertJsonPath('hte.name', 'City Hall')
        ->assertJsonPath('hte.status', 'active')
        ->assertJsonPath('hte.institute', 'Institute of Computing');
});

test('intern without an assigned hte sees no requirements and no hte info', function () {
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    internReqRequirement($institute, ['name' => 'Medical Certificate']);
    Intern::where('user_id', $intern->id)->update(['assigned_hte' => null]);

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('hte', null);
});

test('intern without an assigned hte cannot submit requirements', function () {
    Storage::fake('public');
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $requirement = internReqRequirement($institute);
    Intern::where('user_id', $intern->id)->update(['assigned_hte' => null]);

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('cert.pdf', 1024, 'application/pdf'),
        ])
        ->assertForbidden();
});

test('intern does not see requirements of other institutes', function () {
    $institute = internReqInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    internReqRequirement($otherInstitute, ['name' => 'Other Doc']);

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('intern only sees pre-deployment requirements (not yet deployed)', function () {
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    internReqRequirement($institute, ['name' => 'Med Cert', 'type' => 'pre_deployment']);
    internReqRequirement($institute, ['name' => 'Case Study', 'type' => 'post_deployment']);

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Med Cert');
});

test('intern still sees only pre-deployment requirements while hours are ongoing', function () {
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $intern->intern->forceFill(['ojt_status' => 'ongoing'])->save();
    internReqRequirement($institute, ['name' => 'Med Cert', 'type' => 'pre_deployment']);
    internReqRequirement($institute, ['name' => 'Case Study', 'type' => 'post_deployment']);

    $response = $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect(collect($response->json('data'))->pluck('type')->all())->toBe(['pre_deployment']);
});

test('intern sees post-deployment requirements once hours are completed', function () {
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $intern->intern->forceFill(['ojt_status' => 'hours_completed'])->save();
    internReqRequirement($institute, ['name' => 'Med Cert', 'type' => 'pre_deployment']);
    internReqRequirement($institute, ['name' => 'Case Study', 'type' => 'post_deployment']);

    $response = $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonCount(2, 'data');

    expect(collect($response->json('data'))->pluck('type')->sort()->values()->all())
        ->toBe(['post_deployment', 'pre_deployment']);
});

test('intern with completed status also sees post-deployment requirements', function () {
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $intern->intern->forceFill(['ojt_status' => 'completed'])->save();
    internReqRequirement($institute, ['name' => 'Med Cert', 'type' => 'pre_deployment']);
    internReqRequirement($institute, ['name' => 'Case Study', 'type' => 'post_deployment']);

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('intern can submit a pdf for an active requirement of their institute', function () {
    Storage::fake('public');
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $requirement = internReqRequirement($institute);

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('cert.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk()
        ->assertJsonPath('data.requirement_id', $requirement->id)
        ->assertJsonPath('data.file_name', basename(RequirementSubmission::first()->file_path))
        ->assertJsonPath('data.status', 'pending');

    expect(RequirementSubmission::where('user_id', $intern->id)->count())->toBe(1);
    Storage::disk('public')->assertExists(RequirementSubmission::first()->file_path);
});

test('intern can replace an existing submission', function () {
    Storage::fake('public');
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $requirement = internReqRequirement($institute);

    $old = UploadedFile::fake()->create('old.pdf', 1024, 'application/pdf')->store('requirement-submissions', 'public');
    RequirementSubmission::create([
        'user_id' => $intern->id,
        'requirement_id' => $requirement->id,
        'file_path' => $old,
    ]);

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('new.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk()
        ->assertJsonPath('data.file_name', basename(RequirementSubmission::first()->file_path));

    Storage::disk('public')->assertMissing($old);
    expect(RequirementSubmission::where('user_id', $intern->id)->count())->toBe(1);
});

test('intern cannot submit a non-pdf file', function () {
    Storage::fake('public');
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $requirement = internReqRequirement($institute);

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('doc.txt', 1024, 'text/plain'),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('file');

    expect(RequirementSubmission::count())->toBe(0);
});

test('intern cannot submit for a requirement of another institute', function () {
    Storage::fake('public');
    $institute = internReqInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $otherRequirement = internReqRequirement($otherInstitute, ['name' => 'Other Doc']);

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$otherRequirement->id}/submit", [
            'file' => UploadedFile::fake()->create('cert.pdf', 1024, 'application/pdf'),
        ])
        ->assertForbidden();

    expect(RequirementSubmission::count())->toBe(0);
});

test('intern can remove their submission', function () {
    Storage::fake('public');
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $requirement = internReqRequirement($institute);

    $path = UploadedFile::fake()->create('cert.pdf', 1024, 'application/pdf')->store('requirement-submissions', 'public');
    RequirementSubmission::create([
        'user_id' => $intern->id,
        'requirement_id' => $requirement->id,
        'file_path' => $path,
    ]);

    $this->actingAs($intern, 'api')
        ->deleteJson("/api/intern/requirements/{$requirement->id}")
        ->assertOk();

    Storage::disk('public')->assertMissing($path);
    expect(RequirementSubmission::count())->toBe(0);
});

test('intern requirements module is intern only', function () {
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    internReqRequirement($institute);

    $coordinator = User::factory()->create(['role' => 'ojt_coordinator']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/intern/requirements')
        ->assertForbidden();
});

test('submitting a requirement notifies the institute coordinators', function () {
    Storage::fake('public');
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $requirement = internReqRequirement($institute);

    $coordinator = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $coordinator->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('cert.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk();

    $notification = UserNotification::where('user_id', $coordinator->id)->first();
    expect($notification)->not->toBeNull();
    expect($notification->type)->toBe('requirement_submitted');
    expect($notification->is_read)->toBeFalse();
});

test('unapproved intern cannot list or submit requirements', function () {
    Storage::fake('public');
    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $intern->intern->forceFill(['status' => 'pending'])->save();
    $requirement = internReqRequirement($institute);

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('cert.pdf', 1024, 'application/pdf'),
        ])
        ->assertForbidden();
});

/**
 * Re-enroll an intern into a new term with its own HTE, mimicking approval.
 */
function internReqReenroll(User $intern, Institute $institute, Program $program, AcademicTerm $term, ?int $hteId = null): Intern
{
    $record = Intern::create([
        'user_id' => $intern->id,
        'academic_year_id' => $term->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    $record->forceFill([
        'status' => 'approved',
        'ojt_status' => 'pending',
        'assigned_hte' => $hteId ?? internReqHte($institute, $program)->hte->id,
    ])->save();

    return $record;
}

test('a re-enrolled intern starts the new term with a blank checklist', function () {
    Storage::fake('public');

    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $requirement = internReqRequirement($institute);
    $firstTermIntern = $intern->intern;

    // The intern satisfies the requirement in their first term.
    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('first.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk();

    $secondTerm = AcademicTerm::create(['code' => '2026-2027', 'description' => 'Second Semester']);
    internReqReenroll($intern, $institute, $program, $secondTerm);

    // The new term must show the requirement again, not the previous term's approval.
    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.submission', null);

    // And the previous term's submission is still on record against its own row.
    $firstTermSubmission = RequirementSubmission::where('intern_id', $firstTermIntern->id)
        ->where('requirement_id', $requirement->id)
        ->first();

    expect($firstTermSubmission)->not->toBeNull()
        ->and($firstTermSubmission->status)->toBe('pending')
        ->and(RequirementSubmission::where('requirement_id', $requirement->id)->count())->toBe(1);
});

test('resubmitting in a new term does not overwrite the previous term submission', function () {
    Storage::fake('public');

    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $requirement = internReqRequirement($institute);
    $firstTermIntern = $intern->intern;

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('first.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk();

    $firstPath = RequirementSubmission::where('intern_id', $firstTermIntern->id)->value('file_path');

    $secondTerm = AcademicTerm::create(['code' => '2026-2027', 'description' => 'Second Semester']);
    $secondTermIntern = internReqReenroll($intern, $institute, $program, $secondTerm);

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('second.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk();

    // Two rows now exist — one per term — and the first term's file is untouched.
    expect(RequirementSubmission::where('requirement_id', $requirement->id)->count())->toBe(2)
        ->and(RequirementSubmission::where('intern_id', $firstTermIntern->id)->value('file_path'))->toBe($firstPath)
        ->and(RequirementSubmission::where('intern_id', $secondTermIntern->id)->value('file_path'))->not->toBe($firstPath);

    Storage::disk('public')->assertExists($firstPath);
});

test('removing a submission in the new term leaves the previous term untouched', function () {
    Storage::fake('public');

    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $requirement = internReqRequirement($institute);
    $firstTermIntern = $intern->intern;

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('first.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk();

    $secondTerm = AcademicTerm::create(['code' => '2026-2027', 'description' => 'Second Semester']);
    internReqReenroll($intern, $institute, $program, $secondTerm);

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('second.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk();

    $this->actingAs($intern, 'api')
        ->deleteJson("/api/intern/requirements/{$requirement->id}")
        ->assertOk();

    // Only the current term's row is removed.
    expect(RequirementSubmission::where('intern_id', $firstTermIntern->id)->where('requirement_id', $requirement->id)->exists())->toBeTrue()
        ->and(RequirementSubmission::count())->toBe(1);
});

test('requirements are scoped per host when the intern moves to a different hte', function () {
    Storage::fake('public');

    $institute = internReqInstitute();
    $program = internReqProgram($institute);
    $intern = internReqUser($institute, $program);
    $requirement = internReqRequirement($institute);

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/requirements/{$requirement->id}/submit", [
            'file' => UploadedFile::fake()->create('first.pdf', 1024, 'application/pdf'),
        ])
        ->assertOk();

    // Same program, a different host for the new term.
    $otherHteUser = User::factory()->create(['role' => 'hte']);
    $otherHte = Hte::create([
        'user_id' => $otherHteUser->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'name' => 'City Library',
        'status' => 'active',
    ]);

    $secondTerm = AcademicTerm::create(['code' => '2026-2027', 'description' => 'Second Semester']);
    internReqReenroll($intern, $institute, $program, $secondTerm, $otherHte->id);

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/requirements')
        ->assertOk()
        ->assertJsonPath('hte.name', 'City Library')
        ->assertJsonPath('data.0.submission', null);
});
